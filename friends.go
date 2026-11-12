package main

// Friends. Friend requests are stored per ACCOUNT (email) in friends.json, so they work while the other player is
// offline and survive restarts. In-game names (IGN) are permanent, so a request always reaches the right person.
//
// Client -> server: {"t":"friend","m":"add","name":"Player"}      send a request (if they already asked you, you become friends)
//                   {"t":"friend","m":"accept"|"decline"|"cancel"|"remove","name":"Player"}
//                       accept / decline = a request you received (empty name works when exactly one is pending)
//                       cancel = take back a request you sent;  remove = unfriend
//                   {"t":"friend","m":"list"}                      refresh the list (the client does this while the window is open)
// Server -> client: {"t":"fl","f":[[name,online,level,world],...],"in":[names],"o":[names]}   friends / requests received / requests sent
//                   {"t":"freq","n":"Name"}                        a request just arrived (shows the Accept / Decline pop-up)
// Feedback text goes through the normal {"t":"sys"} message.
// Limits: 50 friends, 30 pending requests each way. Declining is silent, so nobody can be pestered about it.

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
	friendsFile   = "friends.json"
	friendMax     = 50
	friendPendMax = 30
)

type frRec struct {
	Friends []string `json:"f,omitempty"`   // account emails
	In      []string `json:"in,omitempty"`  // requests received
	Out     []string `json:"out,omitempty"` // requests sent
}

type Friends struct {
	mu    sync.Mutex
	m     map[string]*frRec
	dirty bool
}

var frs *Friends

func loadFriends() *Friends {
	f := &Friends{m: map[string]*frRec{}}
	if b, err := os.ReadFile(friendsFile); err == nil {
		var d map[string]*frRec
		if json.Unmarshal(b, &d) == nil && d != nil {
			f.m = d
		}
	}
	go func() {
		for range time.Tick(5 * time.Second) {
			f.flush()
		}
	}()
	return f
}

func (f *Friends) flush() {
	f.mu.Lock()
	if !f.dirty {
		f.mu.Unlock()
		return
	}
	b, err := json.Marshal(f.m)
	f.dirty = false
	f.mu.Unlock()
	if err != nil {
		return
	}
	tmp := friendsFile + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("cannot save %s: %v", friendsFile, err)
		return
	}
	if err := os.Rename(tmp, friendsFile); err != nil {
		log.Printf("cannot save %s: %v", friendsFile, err)
	}
}

func frIdx(l []string, s string) int {
	for i, v := range l {
		if v == s {
			return i
		}
	}
	return -1
}

func frDel(l []string, s string) []string {
	if i := frIdx(l, s); i >= 0 {
		return append(l[:i:i], l[i+1:]...)
	}
	return l
}

// rec returns the record for an account, creating it if needed (f.mu must be held).
func (f *Friends) rec(email string) *frRec {
	r := f.m[email]
	if r == nil {
		r = &frRec{}
		f.m[email] = r
	}
	return r
}

// snapshot copies the three lists of an account.
func (f *Friends) snapshot(email string) (fr, in, out []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	r := f.m[email]
	if r == nil {
		return
	}
	return append([]string(nil), r.Friends...), append([]string(nil), r.In...), append([]string(nil), r.Out...)
}

// emailOfIGN finds the account that owns an in-game name (exact match, case-insensitive).
func (a *Accounts) emailOfIGN(name string) (email, ign string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, u := range a.users {
		if u.IGN != "" && strings.EqualFold(u.IGN, name) {
			return u.Email, u.IGN
		}
	}
	return "", ""
}

// byEmail returns the joined player logged in with this account, if any.
func (h *Hub) byEmail(email string) *Player {
	for _, q := range h.players {
		if q.joined && !q.gone && strings.EqualFold(q.email, email) {
			return q
		}
	}
	return nil
}

// frPick chooses one email out of list by name: exact in-game name first, then a unique prefix (2+ letters).
// An empty name picks the only entry. Returns "" and a message when it cannot decide.
func frPick(list []string, name string) (string, string) {
	name = strings.TrimSpace(name)
	if name == "" {
		if len(list) == 1 {
			return list[0], ""
		}
		if len(list) == 0 {
			return "", "There is nobody in that list."
		}
		return "", "Type the player's name."
	}
	ln := strings.ToLower(name)
	var pre []string
	for _, e := range list {
		n := strings.ToLower(accts.ignOf(e))
		if n == ln {
			return e, ""
		}
		if len(ln) >= 2 && strings.HasPrefix(n, ln) {
			pre = append(pre, e)
		}
	}
	switch len(pre) {
	case 1:
		return pre[0], ""
	case 0:
		return "", "\"" + name + "\" is not in that list."
	}
	return "", "More than one name matches \"" + name + "\". Type the full name."
}

// friendsListMsg builds the list message for one account. Online friends come first.
func (h *Hub) friendsListMsg(email string) []byte {
	fr, in, out := frs.snapshot(email)
	type row struct {
		n      string
		on, lv int
		w      int
	}
	var rows []row
	for _, e := range fr {
		n := accts.ignOf(e)
		if n == "" {
			continue
		}
		r := row{n: n}
		if q := h.byEmail(e); q != nil {
			r.on, r.lv = 1, q.lv
			if q.realm != nil {
				r.w = q.realm.wi
			}
		}
		rows = append(rows, r)
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].on != rows[j].on {
			return rows[i].on > rows[j].on
		}
		return strings.ToLower(rows[i].n) < strings.ToLower(rows[j].n)
	})
	f := make([][]interface{}, 0, len(rows))
	for _, r := range rows {
		f = append(f, []interface{}{r.n, r.on, r.lv, r.w})
	}
	names := func(l []string) []string {
		o := []string{}
		for _, e := range l {
			if n := accts.ignOf(e); n != "" {
				o = append(o, n)
			}
		}
		return o
	}
	return jsonBytes(map[string]interface{}{"t": "fl", "f": f, "in": names(in), "o": names(out)})
}

func (h *Hub) friendPush(p *Player) {
	if frs == nil || p == nil || p.gone || !p.joined {
		return
	}
	p.send(h.friendsListMsg(strings.ToLower(p.email)))
}

func (h *Hub) friendPushEmail(email string) {
	if q := h.byEmail(email); q != nil {
		h.friendPush(q)
	}
}

// friendOnline runs right after a player joins: shows their lists, and tells their online friends they arrived.
func (h *Hub) friendOnline(p *Player) {
	if frs == nil {
		return
	}
	me := strings.ToLower(p.email)
	h.friendPush(p)
	fr, in, _ := frs.snapshot(me)
	if len(in) > 0 {
		p.sysMsg("You have " + itoa(len(in)) + " friend request(s). Open the Friends window to answer.")
	}
	for _, e := range fr {
		if q := h.byEmail(e); q != nil {
			q.sysMsg(p.name + " is now online.")
			h.friendPush(q)
		}
	}
}

// friendOffline runs when a player leaves, so their friends see them go offline.
func (h *Hub) friendOffline(p *Player) {
	if frs == nil || !p.joined {
		return
	}
	fr, _, _ := frs.snapshot(strings.ToLower(p.email))
	for _, e := range fr {
		h.friendPushEmail(e)
	}
}

func (h *Hub) onFriend(p *Player, in *inMsg) {
	if frs == nil {
		return
	}
	now := time.Now()
	if in.M == "list" {
		h.friendPush(p)
		return
	}
	if now.Sub(p.lastFr) < 400*time.Millisecond {
		return
	}
	p.lastFr = now
	name := strings.TrimSpace(in.Name)
	if len([]rune(name)) > 40 {
		return
	}
	switch in.M {
	case "add":
		h.friendAdd(p, name)
	case "accept", "decline", "cancel", "remove":
		h.friendAct(p, in.M, name)
	}
}

func (h *Hub) friendAdd(p *Player, name string) {
	if name == "" {
		p.sysMsg("Usage: /friend playername")
		return
	}
	te, tn := accts.emailOfIGN(name)
	if te == "" { // not an exact name: allow a unique prefix of someone who is online
		q, msg := h.findOnline(name)
		if q == nil {
			if strings.HasPrefix(msg, "More than") {
				p.sysMsg(msg)
			} else {
				p.sysMsg("No player named \"" + name + "\" exists. Check the spelling.")
			}
			return
		}
		te, tn = strings.ToLower(q.email), q.name
	}
	te = strings.ToLower(te)
	me := strings.ToLower(p.email)
	if te == me {
		p.sysMsg("You cannot add yourself.")
		return
	}
	var res string
	frs.mu.Lock()
	a, b := frs.rec(me), frs.rec(te)
	switch {
	case frIdx(a.Friends, te) >= 0:
		res = "already"
	case frIdx(a.Out, te) >= 0:
		res = "pending"
	case frIdx(a.In, te) >= 0: // they already asked us: that settles it
		if len(a.Friends) >= friendMax {
			res = "mefull"
		} else if len(b.Friends) >= friendMax {
			res = "themfull"
		} else {
			a.In, b.Out = frDel(a.In, te), frDel(b.Out, me)
			a.Friends, b.Friends = append(a.Friends, te), append(b.Friends, me)
			res = "made"
		}
	case len(a.Friends) >= friendMax:
		res = "mefull"
	case len(b.Friends) >= friendMax:
		res = "themfull"
	case len(a.Out) >= friendPendMax:
		res = "toomany"
	case len(b.In) >= friendPendMax:
		res = "theminbox"
	default:
		a.Out, b.In = append(a.Out, te), append(b.In, me)
		res = "sent"
	}
	if res == "made" || res == "sent" {
		frs.dirty = true
	}
	frs.mu.Unlock()
	switch res {
	case "already":
		p.sysMsg(tn + " is already your friend.")
	case "pending":
		p.sysMsg("You already sent " + tn + " a friend request.")
	case "mefull":
		p.sysMsg("Your friend list is full (" + itoa(friendMax) + ").")
	case "themfull":
		p.sysMsg(tn + "'s friend list is full.")
	case "toomany":
		p.sysMsg("You have too many pending requests. Cancel some first.")
	case "theminbox":
		p.sysMsg(tn + " has too many pending requests right now.")
	case "made":
		p.sysMsg("You and " + tn + " are now friends.")
		if q := h.byEmail(te); q != nil {
			q.sysMsg("You and " + p.name + " are now friends.")
		}
	case "sent":
		p.sysMsg("Friend request sent to " + tn + ".")
		if q := h.byEmail(te); q != nil {
			q.send(jsonBytes(map[string]interface{}{"t": "freq", "n": p.name}))
			q.sysMsg(p.name + " sent you a friend request.")
		}
	}
	if res == "made" || res == "sent" {
		h.friendPush(p)
		h.friendPushEmail(te)
	}
}

func (h *Hub) friendAct(p *Player, act, name string) {
	me := strings.ToLower(p.email)
	frs.mu.Lock()
	a := frs.rec(me)
	var list []string
	switch act {
	case "accept", "decline":
		list = append(list, a.In...)
	case "cancel":
		list = append(list, a.Out...)
	case "remove":
		list = append(list, a.Friends...)
	}
	frs.mu.Unlock()
	te, msg := frPick(list, name)
	if te == "" {
		switch act {
		case "accept", "decline":
			msg = "You have no matching friend request. " + msg
		case "cancel":
			msg = "You have no matching request you sent. " + msg
		case "remove":
			msg = "That player is not on your friend list. " + msg
		}
		p.sysMsg(strings.TrimSpace(msg))
		return
	}
	tn := accts.ignOf(te)
	var res string
	frs.mu.Lock()
	a, b := frs.rec(me), frs.rec(te)
	switch act {
	case "accept":
		if frIdx(a.In, te) < 0 {
			res = "gone"
		} else if len(a.Friends) >= friendMax {
			res = "mefull"
		} else if len(b.Friends) >= friendMax {
			res = "themfull"
		} else {
			a.In, b.Out = frDel(a.In, te), frDel(b.Out, me)
			if frIdx(a.Friends, te) < 0 {
				a.Friends = append(a.Friends, te)
			}
			if frIdx(b.Friends, me) < 0 {
				b.Friends = append(b.Friends, me)
			}
			res = "accepted"
		}
	case "decline":
		a.In, b.Out = frDel(a.In, te), frDel(b.Out, me)
		res = "declined"
	case "cancel":
		a.Out, b.In = frDel(a.Out, te), frDel(b.In, me)
		res = "cancelled"
	case "remove":
		a.Friends, b.Friends = frDel(a.Friends, te), frDel(b.Friends, me)
		res = "removed"
	}
	if res != "gone" && res != "mefull" && res != "themfull" {
		frs.dirty = true
	}
	frs.mu.Unlock()
	switch res {
	case "gone":
		p.sysMsg("That request is no longer there.")
	case "mefull":
		p.sysMsg("Your friend list is full (" + itoa(friendMax) + ").")
	case "themfull":
		p.sysMsg(tn + "'s friend list is full.")
	case "accepted":
		p.sysMsg("You and " + tn + " are now friends.")
		if q := h.byEmail(te); q != nil {
			q.sysMsg(p.name + " accepted your friend request.")
		}
	case "declined":
		p.sysMsg("Friend request from " + tn + " declined.")
	case "cancelled":
		p.sysMsg("Friend request to " + tn + " cancelled.")
	case "removed":
		p.sysMsg(tn + " was removed from your friends.")
	}
	h.friendPush(p)
	h.friendPushEmail(te)
}
