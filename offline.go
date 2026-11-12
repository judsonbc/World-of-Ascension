package main

// Offline whispers.
//   /w name message  to a player who is not online is queued on the server and delivered the next time that
//   player's ACCOUNT logs in (whichever character name they use then).
// How the recipient is found: every time a player joins, the server remembers "character name -> account email"
// (first account to use a name keeps it). A whisper to a name that nobody online has is looked up in that list.
// Queued messages are keyed by the recipient's account email, so they can only be read by that account.
// Everything is stored in whispers.json next to the program (back it up together with users.json).
// Limits: 50 queued messages per account (oldest dropped), messages older than 30 days are discarded on delivery.

import (
	"encoding/json"
	"log"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	offlineFile   = "whispers.json"
	offlineMax    = 50
	offlineMaxAge = 30 * 24 * time.Hour
)

type offMsg struct {
	From string `json:"from"`
	M    string `json:"m"`
	T    int64  `json:"t"`
}

type offName struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type offDisk struct {
	Names map[string]offName  `json:"names"`
	Inbox map[string][]offMsg `json:"inbox"`
}

type Offline struct {
	mu    sync.Mutex
	names map[string]offName  // lower-case character name -> owner account
	inbox map[string][]offMsg // owner email -> queued whispers
	dirty bool
}

var offl *Offline

func loadOffline() *Offline {
	o := &Offline{names: map[string]offName{}, inbox: map[string][]offMsg{}}
	if b, err := os.ReadFile(offlineFile); err == nil {
		var d offDisk
		if json.Unmarshal(b, &d) == nil {
			if d.Names != nil {
				o.names = d.Names
			}
			if d.Inbox != nil {
				o.inbox = d.Inbox
			}
		}
	}
	go func() {
		for range time.Tick(5 * time.Second) {
			o.flush()
		}
	}()
	return o
}

func (o *Offline) flush() {
	o.mu.Lock()
	if !o.dirty {
		o.mu.Unlock()
		return
	}
	b, err := json.Marshal(offDisk{Names: o.names, Inbox: o.inbox})
	o.dirty = false
	o.mu.Unlock()
	if err != nil {
		return
	}
	tmp := offlineFile + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("cannot save %s: %v", offlineFile, err)
		return
	}
	if err := os.Rename(tmp, offlineFile); err != nil {
		log.Printf("cannot save %s: %v", offlineFile, err)
	}
}

// claim remembers that this account plays a character called name. The first account to use a name keeps it.
func (o *Offline) claim(name, email string) {
	k := strings.ToLower(strings.TrimSpace(name))
	email = strings.ToLower(email)
	if k == "" || email == "" {
		return
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	if cur, ok := o.names[k]; ok {
		if cur.Email == email && cur.Name != name {
			cur.Name = name // keep the owner's latest capitalisation
			o.names[k] = cur
			o.dirty = true
		}
		return
	}
	o.names[k] = offName{Name: name, Email: email}
	o.dirty = true
}

// ownedByOther reports whether the exact name is already tied to a different account.
func (o *Offline) ownedByOther(name, email string) bool {
	k := strings.ToLower(strings.TrimSpace(name))
	o.mu.Lock()
	defer o.mu.Unlock()
	r, ok := o.names[k]
	return ok && !strings.EqualFold(r.Email, email)
}

// find looks a name up: exact match first, then a unique prefix of at least 2 letters (same rule as online whispers).
func (o *Offline) find(name string) (offName, bool) {
	k := strings.ToLower(strings.TrimSpace(name))
	if k == "" {
		return offName{}, false
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	if r, ok := o.names[k]; ok {
		return r, true
	}
	if len(k) >= 2 {
		var hit offName
		n := 0
		for key, r := range o.names {
			if strings.HasPrefix(key, k) {
				hit = r
				n++
			}
		}
		if n == 1 {
			return hit, true
		}
	}
	return offName{}, false
}

func (o *Offline) queue(email, from, text string) {
	email = strings.ToLower(email)
	o.mu.Lock()
	defer o.mu.Unlock()
	l := append(o.inbox[email], offMsg{From: from, M: text, T: time.Now().Unix()})
	if len(l) > offlineMax {
		l = l[len(l)-offlineMax:]
	}
	o.inbox[email] = l
	o.dirty = true
}

// take removes and returns everything queued for this account (messages older than offlineMaxAge are dropped).
func (o *Offline) take(email string) []offMsg {
	email = strings.ToLower(email)
	o.mu.Lock()
	defer o.mu.Unlock()
	l := o.inbox[email]
	if len(l) == 0 {
		return nil
	}
	delete(o.inbox, email)
	o.dirty = true
	cut := time.Now().Add(-offlineMaxAge).Unix()
	var out []offMsg
	for _, m := range l {
		if m.T >= cut {
			out = append(out, m)
		}
	}
	return out
}

// whisperOffline is called by whisper() when nobody online matches the name. It returns false if the name is
// unknown too (the caller then says "no such player"). Runs on the hub goroutine.
func (h *Hub) whisperOffline(p *Player, name, txt string, now time.Time) bool {
	if offl == nil {
		return false
	}
	rec, ok := offl.find(name)
	if !ok {
		return false
	}
	if strings.EqualFold(rec.Email, p.email) {
		p.sysMsg("You cannot whisper to yourself.")
		return true
	}
	p.lastChat = now
	// the owner may be online under another character name: deliver live
	for _, q := range h.players {
		if q != p && q.joined && !q.gone && strings.EqualFold(q.email, rec.Email) {
			q.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "from", "id": p.id, "n": p.name, "m": txt}))
			p.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "to", "n": q.name, "m": txt}))
			return true
		}
	}
	offl.queue(rec.Email, p.name, txt)
	p.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "to", "n": rec.Name, "m": txt, "off": 1}))
	return true
}

// deliverOffline hands a player the whispers that arrived while their account was offline. Called right after join.
func (h *Hub) deliverOffline(p *Player) {
	if offl == nil {
		return
	}
	list := offl.take(p.email)
	if len(list) == 0 {
		return
	}
	for _, m := range list {
		p.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "from", "id": 0, "n": m.From, "m": m.M, "off": 1, "ts": m.T}))
	}
	p.sysMsg("You have " + itoa(len(list)) + " whisper(s) that arrived while you were offline. Open the Chat window.")
}
