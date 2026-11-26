package main

// v5_364 TRADING.
//
// The character (bag, coins, ore, pets ...) lives in the player's own save, which the server stores but never opens. So the server cannot
// move items between two saves. Instead it holds the things that are "in flight" itself (escrow) and hands them over through a per-account
// DELIVERY BOX that is stored in data/market.json:
//   - direct trade window: both players press Ready -> both clients take their offer out of the bag (and save) -> both send "put" ->
//     the server moves each offer into the OTHER player's box. Anything not finished (cancel, disconnect, timeout) goes back into the
//     owner's own box. Nothing is ever dropped.
//   - market board: a listing takes the item out of the seller's bag; a sale puts the item in the buyer's box and the coins in the
//     seller's box; a cancelled / expired listing puts the item in the seller's box.
//   - the client collects the box ("box" -> adds everything to the character -> saves -> "ack" with what it took).
// Items are opaque JSON objects to the server (size-capped, must be an object, must not be flagged bound with "bd").
// Premium gold is NOT tradable (it is stored with the account, see coupons.go).

import (
	"encoding/json"
	"log"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	tradeMaxItems   = 12
	tradeMaxPets    = 8
	tradeAmtMax     = 1000000000
	tradeItemMax    = 2048
	tradeReqTTL     = 30.0 // seconds an invitation stays open
	tradePutTTL     = 20.0 // seconds both players have to hand their offer in after both pressed Ready
	mktMaxPerSeller = 20
	mktMaxList      = 200
	mktMaxHours     = 72
	mktPriceMax     = 1000000000
)

// ---------------------------------------------------------------- offers / box

type tOffer struct {
	It []json.RawMessage `json:"it,omitempty"`
	C  int64             `json:"c,omitempty"` // coins
	O  int64             `json:"o,omitempty"` // ore
	E  int64             `json:"e,omitempty"` // pet eggs
	Pt map[string]int64  `json:"pt,omitempty"`
}

func trItemOK(raw json.RawMessage) bool {
	if len(raw) == 0 || len(raw) > tradeItemMax {
		return false
	}
	var m map[string]json.RawMessage
	if json.Unmarshal(raw, &m) != nil || m == nil {
		return false
	}
	if v, ok := m["bd"]; ok {
		s := strings.TrimSpace(string(v))
		if s != "0" && s != "false" && s != "null" && s != "" {
			return false // bound item
		}
	}
	return true
}

func trAmt(v int64) bool { return v >= 0 && v <= tradeAmtMax }

// cleanOffer checks an offer received from a client; false = reject. It also drops empty pet entries.
func cleanOffer(o *tOffer) bool {
	if len(o.It) > tradeMaxItems || len(o.Pt) > tradeMaxPets {
		return false
	}
	for _, it := range o.It {
		if !trItemOK(it) {
			return false
		}
	}
	if !trAmt(o.C) || !trAmt(o.O) || !trAmt(o.E) {
		return false
	}
	for k, n := range o.Pt {
		if len(k) != 3 || k[1] != ':' || n < 0 || n > 99999 {
			return false
		}
		if n == 0 {
			delete(o.Pt, k)
		}
	}
	return true
}

func offerEmpty(o *tOffer) bool {
	return len(o.It) == 0 && o.C == 0 && o.O == 0 && o.E == 0 && len(o.Pt) == 0
}

func offerSame(a, b *tOffer) bool {
	x, e1 := json.Marshal(a)
	y, e2 := json.Marshal(b)
	return e1 == nil && e2 == nil && string(x) == string(y)
}

type boxItem struct {
	ID int64           `json:"id"`
	It json.RawMessage `json:"it"`
}

// boxCr is ONE payout (coins / ore / eggs / pets) with its own id, exactly like an item, so the client can never collect the same payout twice
// (v5_367). The plain C / O / E / Pt totals below only hold what older versions of this file stored.
type boxCr struct {
	ID int64            `json:"id"`
	C  int64            `json:"c,omitempty"`
	O  int64            `json:"o,omitempty"`
	E  int64            `json:"e,omitempty"`
	Pt map[string]int64 `json:"pt,omitempty"`
}

type mBox struct {
	Cr []boxCr          `json:"cr,omitempty"`
	It []boxItem        `json:"it,omitempty"`
	C  int64            `json:"c,omitempty"`
	O  int64            `json:"o,omitempty"`
	E  int64            `json:"e,omitempty"`
	Pt map[string]int64 `json:"pt,omitempty"`
}

type mListing struct {
	ID     int64           `json:"id"`
	Seller string          `json:"s"` // account email, never sent to clients
	Name   string          `json:"n"`
	It     json.RawMessage `json:"it"`
	Price  int64           `json:"p"`
	Exp    int64           `json:"e"` // unix seconds
}

type Market struct {
	mu       sync.Mutex
	Listings []*mListing
	Box      map[string]*mBox
	Next     int64
	dirty    bool
}

var mkt *Market

func loadMarket() *Market {
	m := &Market{Box: map[string]*mBox{}, Next: 1}
	if b, err := os.ReadFile(marketFile); err == nil {
		var d Market
		if json.Unmarshal(b, &d) == nil {
			m.Listings = d.Listings
			if d.Box != nil {
				m.Box = d.Box
			}
			if d.Next > 0 {
				m.Next = d.Next
			}
		}
	}
	go func() {
		for range time.Tick(5 * time.Second) {
			m.flush()
		}
	}()
	return m
}

func (m *Market) flush() {
	m.mu.Lock()
	if !m.dirty {
		m.mu.Unlock()
		return
	}
	b, err := json.Marshal(m)
	m.dirty = false
	m.mu.Unlock()
	if err != nil {
		return
	}
	tmp := marketFile + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("cannot save %s: %v", marketFile, err)
		return
	}
	if err := os.Rename(tmp, marketFile); err != nil {
		log.Printf("cannot save %s: %v", marketFile, err)
	}
}

// boxOf returns (and creates) the box of an account. The caller holds m.mu.
func (m *Market) boxOf(email string) *mBox {
	k := strings.ToLower(email)
	b := m.Box[k]
	if b == nil {
		b = &mBox{}
		m.Box[k] = b
	}
	return b
}

// credit puts an offer into an account's box. The caller holds m.mu.
func (m *Market) credit(email string, o *tOffer) {
	if o == nil || offerEmpty(o) {
		return
	}
	b := m.boxOf(email)
	for _, it := range o.It {
		b.It = append(b.It, boxItem{ID: m.Next, It: it})
		m.Next++
	}
	if o.C != 0 || o.O != 0 || o.E != 0 || len(o.Pt) > 0 {
		cr := boxCr{ID: m.Next, C: o.C, O: o.O, E: o.E}
		m.Next++
		if len(o.Pt) > 0 {
			cr.Pt = map[string]int64{}
			for k, n := range o.Pt {
				cr.Pt[k] = n
			}
		}
		b.Cr = append(b.Cr, cr)
	}
	m.dirty = true
}

// sweep moves expired listings into their seller's box. The caller holds m.mu.
func (m *Market) sweep() {
	now := time.Now().Unix()
	keep := m.Listings[:0]
	for _, l := range m.Listings {
		if l.Exp <= now {
			m.credit(l.Seller, &tOffer{It: []json.RawMessage{l.It}})
			m.dirty = true
			continue
		}
		keep = append(keep, l)
	}
	m.Listings = keep
}

// ---------------------------------------------------------------- direct trade

type Trade struct {
	a, b       *Player
	offA, offB tOffer
	rdyA, rdyB bool
	putA, putB bool
	phase      int // 0 = editing, 1 = both Ready: handing the offers in
	t0         float64
}

func tmsg(m string, kv map[string]interface{}) []byte {
	if kv == nil {
		kv = map[string]interface{}{}
	}
	kv["t"] = "trade"
	kv["m"] = m
	b, err := json.Marshal(kv)
	if err != nil {
		return []byte(`{"t":"trade","m":"err","x":"internal error"}`)
	}
	return b
}

func (h *Hub) tradeErr(p *Player, x string) { p.send(tmsg("err", map[string]interface{}{"x": x})) }

func (t *Trade) other(p *Player) *Player {
	if p == t.a {
		return t.b
	}
	return t.a
}

func (h *Hub) tradeState(t *Trade) {
	for _, p := range []*Player{t.a, t.b} {
		o := t.other(p)
		mine, theirs, rm, rt := &t.offA, &t.offB, t.rdyA, t.rdyB
		if p == t.b {
			mine, theirs, rm, rt = &t.offB, &t.offA, t.rdyB, t.rdyA
		}
		p.send(tmsg("st", map[string]interface{}{"n": o.name, "a": mine, "b": theirs, "ra": rm, "rb": rt, "ph": t.phase}))
	}
}

// tradeEnd closes a trade. Everything that was already handed in goes back to its owner's box.
func (h *Hub) tradeEnd(t *Trade, why string) {
	if t.a == nil || t.b == nil {
		return
	}
	if mkt != nil {
		mkt.mu.Lock()
		if t.putA {
			mkt.credit(t.a.email, &t.offA)
		}
		if t.putB {
			mkt.credit(t.b.email, &t.offB)
		}
		mkt.mu.Unlock()
	}
	for _, p := range []*Player{t.a, t.b} {
		if p.trade == t {
			p.trade = nil
		}
		p.send(tmsg("end", map[string]interface{}{"x": why}))
	}
}

func (h *Hub) tradeLeave(p *Player) {
	if p.trade != nil {
		h.tradeEnd(p.trade, "the other player left")
	}
	p.tinvFrom = nil
}

// tradeTick runs once a second from the hub loop.
func (h *Hub) tradeTick(tm float64) {
	seen := map[*Trade]bool{}
	for _, p := range h.players {
		t := p.trade
		if t == nil || seen[t] {
			continue
		}
		seen[t] = true
		if t.phase == 1 && tm-t.t0 > tradePutTTL {
			h.tradeEnd(t, "timed out")
		}
	}
}

func (h *Hub) playerByName(name string) *Player {
	for _, q := range h.players {
		if q.joined && !q.gone && strings.EqualFold(q.name, name) {
			return q
		}
	}
	return nil
}

type trIn struct {
	Offer tOffer `json:"o"`
	R     int    `json:"r"`
}

func (h *Hub) onTrade(p *Player, in *inMsg) {
	if mkt == nil || !p.joined {
		return
	}
	// v5_366 only invitations are rate limited: dropping an offer / ready / put message silently would desync the two windows or stall a hand-over
	now := time.Now()
	if in.M == "req" {
		if now.Sub(p.lastTr) < 400*time.Millisecond {
			return
		}
		p.lastTr = now
	}
	tm := h.clock()
	switch in.M {
	case "req":
		name := strings.TrimSpace(in.Name)
		if len([]rune(name)) > 40 || name == "" {
			return
		}
		q := h.playerByName(name)
		if q == nil || q == p {
			h.tradeErr(p, "That player is not online.")
			return
		}
		if p.trade != nil || q.trade != nil {
			h.tradeErr(p, "One of you is already trading.")
			return
		}
		if q.tinvFrom != nil && !q.tinvFrom.gone && q.tinvFrom != p && tm-q.tinvT < tradeReqTTL {
			h.tradeErr(p, q.name+" has another trade request open.")
			return
		}
		q.tinvFrom = p
		q.tinvT = tm
		q.send(tmsg("inv", map[string]interface{}{"n": p.name}))
		p.send(tmsg("sent", map[string]interface{}{"n": q.name}))
	case "acc":
		f := p.tinvFrom
		p.tinvFrom = nil
		if f == nil || f.gone || tm-p.tinvT > tradeReqTTL || p.trade != nil || f.trade != nil {
			h.tradeErr(p, "That trade request is no longer open.")
			return
		}
		t := &Trade{a: f, b: p, t0: tm}
		f.trade = t
		p.trade = t
		h.tradeState(t)
	case "dec":
		f := p.tinvFrom
		p.tinvFrom = nil
		if f != nil && !f.gone {
			f.send(tmsg("declined", map[string]interface{}{"n": p.name}))
		}
	case "can":
		if p.trade != nil {
			h.tradeEnd(p.trade, p.name+" cancelled the trade.")
		}
	case "off", "rdy", "put":
		t := p.trade
		if t == nil {
			return
		}
		var x trIn
		if len(in.Tr) > 0 {
			if len(in.Tr) > 64*1024 || json.Unmarshal(in.Tr, &x) != nil {
				h.tradeErr(p, "Bad trade message.")
				return
			}
		}
		isA := p == t.a
		switch in.M {
		case "off":
			if t.phase != 0 {
				return
			}
			if !cleanOffer(&x.Offer) {
				h.tradeErr(p, "That offer is not allowed (bound item, too many things, or a wrong amount).")
				h.tradeState(t)
				return
			}
			if isA {
				t.offA = x.Offer
			} else {
				t.offB = x.Offer
			}
			t.rdyA, t.rdyB = false, false
			h.tradeState(t)
		case "rdy":
			if t.phase != 0 {
				return
			}
			on := x.R == 1
			if on && offerEmpty(&t.offA) && offerEmpty(&t.offB) {
				h.tradeErr(p, "Nothing is offered yet.")
				return
			}
			if isA {
				t.rdyA = on
			} else {
				t.rdyB = on
			}
			if t.rdyA && t.rdyB {
				t.phase = 1
				t.t0 = tm
				h.tradeState(t)
				t.a.send(tmsg("go", nil))
				t.b.send(tmsg("go", nil))
				return
			}
			h.tradeState(t)
		case "put":
			if t.phase != 1 {
				return
			}
			if !cleanOffer(&x.Offer) {
				h.tradeEnd(t, "invalid offer")
				return
			}
			snap := &t.offB
			if isA {
				snap = &t.offA
			}
			if !offerSame(&x.Offer, snap) {
				// the client handed in something else than what the other player agreed to: hand it back and stop
				if isA {
					t.offA = x.Offer
					t.putA = true
				} else {
					t.offB = x.Offer
					t.putB = true
				}
				h.tradeEnd(t, "the offer changed - trade stopped")
				return
			}
			if isA {
				t.putA = true
			} else {
				t.putB = true
			}
			if t.putA && t.putB {
				mkt.mu.Lock()
				mkt.credit(t.b.email, &t.offA)
				mkt.credit(t.a.email, &t.offB)
				mkt.mu.Unlock()
				t.a.trade, t.b.trade = nil, nil
				t.a.send(tmsg("done", nil))
				t.b.send(tmsg("done", nil))
			}
		}
	}
}

// ---------------------------------------------------------------- market

type mkIn struct {
	ID    int64           `json:"id"`
	It    json.RawMessage `json:"it"`
	Price int64           `json:"p"`
	Hours int             `json:"h"`
	Ids   []int64         `json:"ids"`
	C     int64           `json:"c"`
	O     int64           `json:"o"`
	E     int64           `json:"e"`
	Pt    map[string]int64 `json:"pt"`
}

func mmsg(m string, kv map[string]interface{}) []byte {
	if kv == nil {
		kv = map[string]interface{}{}
	}
	kv["t"] = "mkt"
	kv["m"] = m
	b, err := json.Marshal(kv)
	if err != nil {
		return []byte(`{"t":"mkt","m":"err","x":"internal error"}`)
	}
	return b
}

func (h *Hub) mktErr(p *Player, k, x string) {
	p.send(mmsg("err", map[string]interface{}{"k": k, "x": x}))
}

// mktSendBox sends the delivery box. ak=true marks the reply to an "ack": every older box message of this player was sent before it,
// so the client knows that anything newer than it is up to date (see MK.ackWait in 09_trade_market.js).
func (h *Hub) mktSendBox(p *Player, ak ...bool) {
	mkt.mu.Lock()
	mkt.sweep()
	b := *mkt.boxOf(p.email)
	mkt.mu.Unlock()
	kv := map[string]interface{}{"b": b}
	if len(ak) > 0 && ak[0] {
		kv["ak"] = 1
	}
	p.send(mmsg("box", kv))
}

func (h *Hub) mktSendList(p *Player) {
	type row struct {
		ID    int64           `json:"id"`
		Name  string          `json:"n"`
		It    json.RawMessage `json:"it"`
		Price int64           `json:"p"`
		Exp   int64           `json:"e"`
		Own   int             `json:"o,omitempty"`
	}
	mkt.mu.Lock()
	mkt.sweep()
	rows := make([]row, 0, len(mkt.Listings))
	for _, l := range mkt.Listings {
		r := row{ID: l.ID, Name: l.Name, It: l.It, Price: l.Price, Exp: l.Exp}
		if strings.EqualFold(l.Seller, p.email) {
			r.Own = 1
		}
		rows = append(rows, r)
	}
	mkt.mu.Unlock()
	sort.Slice(rows, func(i, j int) bool { return rows[i].ID > rows[j].ID })
	if len(rows) > mktMaxList {
		rows = rows[:mktMaxList]
	}
	p.send(mmsg("l", map[string]interface{}{"l": rows, "now": time.Now().Unix()}))
}

func (h *Hub) onMarket(p *Player, in *inMsg) {
	if mkt == nil || !p.joined {
		return
	}
	var x mkIn
	if len(in.Tr) > 0 {
		if len(in.Tr) > 64*1024 || json.Unmarshal(in.Tr, &x) != nil {
			h.mktErr(p, in.M, "Bad market message.")
			return
		}
	}
	// v5_366 rate limit. "ack" is NEVER dropped (a lost ack leaves collected coins in the box and they are paid out twice).
	// buy / sell are answered with an error (the client refunds the coins / the item goes back to the box) instead of being ignored.
	now := time.Now()
	if in.M != "ack" && now.Sub(p.lastTr) < 150*time.Millisecond {
		switch in.M {
		case "buy":
			h.mktErr(p, "buy", "Too fast - try again.")
		case "sell":
			if trItemOK(x.It) {
				mkt.mu.Lock()
				mkt.credit(p.email, &tOffer{It: []json.RawMessage{x.It}})
				mkt.mu.Unlock()
			}
			h.mktErr(p, "sell", "Too fast - the item is in your delivery box.")
			h.mktSendBox(p)
		}
		return
	}
	if in.M != "ack" {
		p.lastTr = now
	}
	switch in.M {
	case "list":
		h.mktSendList(p)
		h.mktSendBox(p)
	case "box":
		h.mktSendBox(p)
	case "sell":
		// the client already took the item out of its bag: whatever goes wrong, the item goes back into the seller's box
		back := func(why string) {
			if trItemOK(x.It) {
				mkt.mu.Lock()
				mkt.credit(p.email, &tOffer{It: []json.RawMessage{x.It}})
				mkt.mu.Unlock()
			}
			h.mktErr(p, "sell", why+" The item is in your delivery box.")
			h.mktSendBox(p)
		}
		if !trItemOK(x.It) {
			h.mktErr(p, "sell", "That item cannot be sold (bound or invalid).")
			return
		}
		if x.Price < 1 || x.Price > mktPriceMax {
			back("The price must be between 1 and 1,000,000,000 coins.")
			return
		}
		hrs := x.Hours
		if hrs < 1 || hrs > mktMaxHours {
			hrs = 24
		}
		mkt.mu.Lock()
		mkt.sweep()
		own := 0
		for _, l := range mkt.Listings {
			if strings.EqualFold(l.Seller, p.email) {
				own++
			}
		}
		if own >= mktMaxPerSeller {
			mkt.mu.Unlock()
			back("You already have 20 listings.")
			return
		}
		l := &mListing{ID: mkt.Next, Seller: strings.ToLower(p.email), Name: p.name, It: x.It, Price: x.Price, Exp: time.Now().Unix() + int64(hrs)*3600}
		mkt.Next++
		mkt.Listings = append(mkt.Listings, l)
		mkt.dirty = true
		mkt.mu.Unlock()
		p.send(mmsg("ok", map[string]interface{}{"k": "sell"}))
		h.mktSendList(p)
	case "buy":
		mkt.mu.Lock()
		mkt.sweep()
		var hit *mListing
		idx := -1
		for i, l := range mkt.Listings {
			if l.ID == x.ID {
				hit, idx = l, i
				break
			}
		}
		if hit == nil {
			mkt.mu.Unlock()
			h.mktErr(p, "buy", "That item is gone (sold, cancelled or expired).")
			h.mktSendList(p)
			return
		}
		if strings.EqualFold(hit.Seller, p.email) {
			mkt.mu.Unlock()
			h.mktErr(p, "buy", "That is your own listing.")
			return
		}
		if hit.Price != x.Price {
			mkt.mu.Unlock()
			h.mktErr(p, "buy", "The price changed. Refresh the list.")
			h.mktSendList(p)
			return
		}
		mkt.Listings = append(mkt.Listings[:idx], mkt.Listings[idx+1:]...)
		mkt.credit(p.email, &tOffer{It: []json.RawMessage{hit.It}})
		mkt.credit(hit.Seller, &tOffer{C: hit.Price})
		seller := hit.Seller
		price := hit.Price
		mkt.mu.Unlock()
		p.send(mmsg("ok", map[string]interface{}{"k": "buy"}))
		h.mktSendList(p)
		h.mktSendBox(p)
		if q := h.byEmail(seller); q != nil {
			q.send(mmsg("sale", map[string]interface{}{"p": price, "n": p.name}))
		}
	case "cancel":
		mkt.mu.Lock()
		mkt.sweep()
		done := false
		for i, l := range mkt.Listings {
			if l.ID == x.ID && strings.EqualFold(l.Seller, p.email) {
				mkt.Listings = append(mkt.Listings[:i], mkt.Listings[i+1:]...)
				mkt.credit(p.email, &tOffer{It: []json.RawMessage{l.It}})
				done = true
				break
			}
		}
		mkt.mu.Unlock()
		if !done {
			h.mktErr(p, "cancel", "That listing is not yours or is already gone.")
		} else {
			p.send(mmsg("ok", map[string]interface{}{"k": "cancel"}))
		}
		h.mktSendList(p)
		h.mktSendBox(p)
	case "ack":
		// the client added these things to the character and saved: remove exactly them from the box
		mkt.mu.Lock()
		b := mkt.boxOf(p.email)
		if len(x.Ids) > 0 {
			gone := map[int64]bool{}
			for _, id := range x.Ids {
				gone[id] = true
			}
			keep := b.It[:0]
			for _, bi := range b.It {
				if !gone[bi.ID] {
					keep = append(keep, bi)
				}
			}
			b.It = keep
			keepCr := b.Cr[:0]
			for _, cr := range b.Cr {
				if !gone[cr.ID] {
					keepCr = append(keepCr, cr)
				}
			}
			b.Cr = keepCr
		}
		sub := func(have *int64, n int64) {
			if n < 0 {
				n = 0
			}
			if n > *have {
				n = *have
			}
			*have -= n
		}
		sub(&b.C, x.C)
		sub(&b.O, x.O)
		sub(&b.E, x.E)
		for k, n := range x.Pt {
			if have, ok := b.Pt[k]; ok {
				if n > have {
					n = have
				}
				if n > 0 {
					b.Pt[k] = have - n
				}
				if b.Pt[k] <= 0 {
					delete(b.Pt, k)
				}
			}
		}
		mkt.dirty = true
		mkt.mu.Unlock()
		h.mktSendBox(p, true)
	}
}
