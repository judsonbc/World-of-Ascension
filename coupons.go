package main

// Coupons + Gold wallet (standard library only).
//
// Gold lives on the SERVER, in the account (users.json, field "gold"), never in the browser save, so players cannot edit it.
// You sell coupon codes outside the game; a player types one into the Gold Exchange in the Potion Merchant window and the server adds the
// gold to their account. Every code works exactly once.
//
//   Create codes (run on the server computer, the game server may keep running):
//     WorldOfEly.exe -coupon-new 50 -coupon-gold 100 -coupon-note "shop batch 1"      prints 50 codes worth 100 gold each
//     WorldOfEly.exe -coupon-list                                                     shows every code and whether it was used (and by whom)
//   Codes are kept in coupons.json next to the program (keep it private, back it up: it is your list of sellable codes).
//
//   GET  /api/wallet    (Bearer) -> {"gold","coinRate","oreRate"}
//   POST /api/redeem    (Bearer) {"code"}            -> {"gold","balance"}
//   POST /api/exchange  (Bearer) {"kind":"coins"|"ore","n"} -> {"kind","n","grant","gold"}   spends n gold, the client adds `grant`

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	couponsFile = "coupons.json"
	couponAlpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // 31 symbols: no 0 O 1 I L, so codes are easy to read out
	couponLen   = 16                                 // 31^16 is about 2^79 possibilities: cannot be guessed
	couponMaxN  = 10000                              // most codes per -coupon-new run
	goldMax     = int64(2000000000)

	// Exchange rates (fixed; keep these in mind when pricing your coupons): 1 gold = 5000 coins = 100 darksteel ore.
	goldOre  = 100
	goldCoin = 5000

	redeemFailMax    = 8
	redeemFailWindow = 15 * time.Minute
)

type Coupon struct {
	Code    string `json:"code"` // 16 characters, no dashes
	Gold    int64  `json:"gold"`
	Note    string `json:"note,omitempty"`
	Created int64  `json:"created"`
	UsedBy  string `json:"usedBy,omitempty"` // account email, empty = still valid
	UsedAt  int64  `json:"usedAt,omitempty"`
}

// couponMu guards coupons.json. The file is re-read on every operation so codes made by the command line while the server is running are seen.
var couponMu sync.Mutex

func normCode(s string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(s) {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func fmtCode(c string) string {
	var parts []string
	for len(c) > 4 {
		parts = append(parts, c[:4])
		c = c[4:]
	}
	parts = append(parts, c)
	return strings.Join(parts, "-")
}

func readCoupons() (map[string]*Coupon, error) {
	m := map[string]*Coupon{}
	b, err := os.ReadFile(couponsFile)
	if err != nil {
		if os.IsNotExist(err) {
			return m, nil
		}
		return nil, err
	}
	var list []*Coupon
	if err := json.Unmarshal(b, &list); err != nil {
		return nil, err
	}
	for _, c := range list {
		m[c.Code] = c
	}
	return m, nil
}

func writeCoupons(m map[string]*Coupon) error {
	list := make([]*Coupon, 0, len(m))
	for _, c := range m {
		list = append(list, c)
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Created != list[j].Created {
			return list[i].Created < list[j].Created
		}
		return list[i].Code < list[j].Code
	})
	b, err := json.MarshalIndent(list, "", " ")
	if err != nil {
		return err
	}
	tmp := couponsFile + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, couponsFile)
}

func randomCode() (string, error) {
	out := make([]byte, 0, couponLen)
	buf := make([]byte, 1)
	for len(out) < couponLen {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		if buf[0] < 248 { // 248 = 31*8: no modulo bias
			out = append(out, couponAlpha[int(buf[0])%len(couponAlpha)])
		}
	}
	return string(out), nil
}

// genCoupons makes n new codes worth gold each and returns them formatted XXXX-XXXX-XXXX-XXXX.
func genCoupons(n int, gold int64, note string) ([]string, error) {
	couponMu.Lock()
	defer couponMu.Unlock()
	m, err := readCoupons()
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	var out []string
	for len(out) < n {
		c, err := randomCode()
		if err != nil {
			return nil, err
		}
		if _, dup := m[c]; dup {
			continue
		}
		m[c] = &Coupon{Code: c, Gold: gold, Note: note, Created: now}
		out = append(out, fmtCode(c))
	}
	if err := writeCoupons(m); err != nil {
		return nil, err
	}
	return out, nil
}

func listCoupons() error {
	couponMu.Lock()
	defer couponMu.Unlock()
	m, err := readCoupons()
	if err != nil {
		return err
	}
	list := make([]*Coupon, 0, len(m))
	for _, c := range m {
		list = append(list, c)
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Created != list[j].Created {
			return list[i].Created < list[j].Created
		}
		return list[i].Code < list[j].Code
	})
	unused := 0
	for _, c := range list {
		state := "UNUSED"
		if c.UsedBy != "" {
			state = "used by " + c.UsedBy + " on " + time.Unix(c.UsedAt, 0).Format("2006-01-02 15:04")
		} else {
			unused++
		}
		fmt.Printf("%s  %6d gold  %-8s  %s\n", fmtCode(c.Code), c.Gold, state, c.Note)
	}
	fmt.Printf("%d codes, %d unused\n", len(list), unused)
	return nil
}

/* ---------------------------------------------------------------- brute-force protection */

var (
	failMu sync.Mutex
	fails  = map[string][]time.Time{}
)

func failCount(key string) int {
	now := time.Now()
	keep := fails[key][:0]
	for _, t := range fails[key] {
		if now.Sub(t) < redeemFailWindow {
			keep = append(keep, t)
		}
	}
	fails[key] = keep
	return len(keep)
}

// blocked reports whether this account or address already failed too many times recently.
func redeemBlocked(email, ip string) bool {
	failMu.Lock()
	defer failMu.Unlock()
	return failCount("e:"+email) >= redeemFailMax || failCount("i:"+ip) >= redeemFailMax*3
}

func redeemFailed(email, ip string) {
	failMu.Lock()
	defer failMu.Unlock()
	fails["e:"+email] = append(fails["e:"+email], time.Now())
	fails["i:"+ip] = append(fails["i:"+ip], time.Now())
}

/* ---------------------------------------------------------------- wallet endpoints */

func saveLevel(raw json.RawMessage) int {
	var s struct {
		Lvl int `json:"lvl"`
	}
	_ = json.Unmarshal(raw, &s)
	if s.Lvl < 1 {
		return 1
	}
	if s.Lvl > 1000 {
		return 1000
	}
	return s.Lvl
}

func coinRate(lv int) int64 {
	return goldCoin
}

func (a *Accounts) handleWallet(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	a.mu.Lock()
	u := a.users[email]
	gold, lv := u.Gold, saveLevel(u.Save)
	a.mu.Unlock()
	writeJSON(w, 200, map[string]interface{}{"gold": gold, "coinRate": coinRate(lv), "oreRate": goldOre})
}

func (a *Accounts) handleRedeem(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	var in struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&in); err != nil {
		fail(w, http.StatusBadRequest, "Bad request.")
		return
	}
	ip := clientIP(r)
	if redeemBlocked(email, ip) {
		fail(w, http.StatusTooManyRequests, "Too many wrong codes. Try again in a few minutes.")
		return
	}
	code := normCode(in.Code)
	if len(code) != couponLen {
		redeemFailed(email, ip)
		fail(w, http.StatusBadRequest, "That code is not valid or was already used.")
		return
	}

	couponMu.Lock()
	m, err := readCoupons()
	if err != nil {
		couponMu.Unlock()
		fail(w, http.StatusInternalServerError, "Coupons are unavailable right now.")
		return
	}
	c := m[code]
	if c == nil || c.UsedBy != "" {
		couponMu.Unlock()
		redeemFailed(email, ip)
		fail(w, http.StatusBadRequest, "That code is not valid or was already used.")
		return
	}
	c.UsedBy, c.UsedAt = email, time.Now().Unix()
	if err := writeCoupons(m); err != nil { // mark it used BEFORE paying out, so a crash can never hand out gold twice
		couponMu.Unlock()
		fail(w, http.StatusInternalServerError, "Coupons are unavailable right now.")
		return
	}
	granted := c.Gold
	couponMu.Unlock()

	a.mu.Lock()
	u := a.users[email]
	u.Gold += granted
	if u.Gold > goldMax {
		u.Gold = goldMax
	}
	bal := u.Gold
	a.dirty = true
	a.mu.Unlock()
	a.flush() // write the account to disk right away
	log.Printf("coupon %s redeemed by %s (+%d gold)", fmtCode(code), email, granted)
	writeJSON(w, 200, map[string]int64{"gold": granted, "balance": bal})
}

func (a *Accounts) handleExchange(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	var in struct {
		Kind string `json:"kind"`
		N    int64  `json:"n"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&in); err != nil || (in.Kind != "coins" && in.Kind != "ore") || in.N < 1 {
		fail(w, http.StatusBadRequest, "Bad request.")
		return
	}
	a.mu.Lock()
	u := a.users[email]
	n := in.N
	if n > u.Gold {
		n = u.Gold
	}
	if n < 1 {
		a.mu.Unlock()
		fail(w, http.StatusBadRequest, "Not enough gold.")
		return
	}
	var grant int64
	if in.Kind == "coins" {
		grant = n * coinRate(saveLevel(u.Save))
	} else {
		grant = n * goldOre
	}
	u.Gold -= n
	bal := u.Gold
	a.dirty = true
	a.mu.Unlock()
	a.flush()
	writeJSON(w, 200, map[string]interface{}{"kind": in.Kind, "n": n, "grant": grant, "gold": bal})
}
