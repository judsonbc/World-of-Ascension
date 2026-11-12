package main

// Message inbox. Every whisper (/w) is also stored in the receiver's inbox, so it can be read later and
// messages sent to a player who is offline are waiting for them when they log in.
//
// Storage: inbox.json next to the program (written a few seconds after a change).
//   names: lower-case character name -> {account email, display name}. Filled in whenever a player joins, so the
//          server can find the account behind a name even while that player is offline.
//   msgs:  account email (lower case) -> messages, oldest first.

import (
	"encoding/json"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	inboxFile      = "inbox.json"
	inboxMax       = 100 // messages kept per account (oldest dropped first)
	inboxPerSender = 20  // messages kept per sender per account (stops one person flooding an inbox)
)

type InboxMsg struct {
	ID   int64  `json:"i"`
	From string `json:"f"`
	Text string `json:"m"`
	TS   int64  `json:"ts"`
	Read bool   `json:"r"`
}

type nameRec struct {
	Email string `json:"e"`
	Name  string `json:"n"`
}

type Inbox struct {
	mu    sync.Mutex
	dirty bool
	Names map[string]nameRec    `json:"names"`
	Msgs  map[string][]InboxMsg `json:"msgs"`
	Next  int64                 `json:"next"`
}

var inbox = loadInbox()

func loadInbox() *Inbox {
	b := &Inbox{Names: map[string]nameRec{}, Msgs: map[string][]InboxMsg{}, Next: 1}
	if data, err := os.ReadFile(inboxFile); err == nil {
		json.Unmarshal(data, b)
	}
	if b.Names == nil {
		b.Names = map[string]nameRec{}
	}
	if b.Msgs == nil {
		b.Msgs = map[string][]InboxMsg{}
	}
	if b.Next < 1 {
		b.Next = 1
	}
	go b.flusher()
	return b
}

func (b *Inbox) flusher() {
	t := time.NewTicker(3 * time.Second)
	defer t.Stop()
	for range t.C {
		b.flush()
	}
}

func (b *Inbox) flush() {
	b.mu.Lock()
	if !b.dirty {
		b.mu.Unlock()
		return
	}
	data, err := json.Marshal(b)
	b.dirty = false
	b.mu.Unlock()
	if err != nil {
		return
	}
	tmp := inboxFile + ".tmp"
	if os.WriteFile(tmp, data, 0o600) == nil {
		os.Rename(tmp, inboxFile)
	}
}

// setName remembers which account a character name belongs to (called when a player joins).
func (b *Inbox) setName(name, email string) {
	key := strings.ToLower(strings.TrimSpace(name))
	email = strings.ToLower(email)
	if key == "" || email == "" {
		return
	}
	b.mu.Lock()
	if cur, ok := b.Names[key]; !ok || cur.Email != email || cur.Name != name {
		b.Names[key] = nameRec{Email: email, Name: name}
		b.dirty = true
	}
	b.mu.Unlock()
}

// emailOf finds the account behind a character name (exact, case-insensitive).
func (b *Inbox) emailOf(name string) (email, display string, ok bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	r, found := b.Names[strings.ToLower(strings.TrimSpace(name))]
	if !found {
		return "", "", false
	}
	return r.Email, r.Name, true
}

// add stores a new unread message for an account and returns it.
func (b *Inbox) add(email, from, text string) InboxMsg {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	m := InboxMsg{ID: b.Next, From: from, Text: text, TS: time.Now().Unix()}
	b.Next++
	list := append(b.Msgs[email], m)
	// per-sender cap: drop that sender's oldest messages beyond inboxPerSender
	n := 0
	for _, x := range list {
		if x.From == from {
			n++
		}
	}
	if n > inboxPerSender {
		drop := n - inboxPerSender
		kept := list[:0:0]
		for _, x := range list {
			if x.From == from && drop > 0 {
				drop--
				continue
			}
			kept = append(kept, x)
		}
		list = kept
	}
	if len(list) > inboxMax {
		list = list[len(list)-inboxMax:]
	}
	b.Msgs[email] = list
	b.dirty = true
	return m
}

func (b *Inbox) list(email string) []InboxMsg {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	src := b.Msgs[email]
	out := make([]InboxMsg, len(src))
	copy(out, src)
	return out
}

func (b *Inbox) unread(email string) int {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	n := 0
	for _, m := range b.Msgs[email] {
		if !m.Read {
			n++
		}
	}
	return n
}

func (b *Inbox) markRead(email string) {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	list := b.Msgs[email]
	for i := range list {
		if !list[i].Read {
			list[i].Read = true
			b.dirty = true
		}
	}
}

func (b *Inbox) del(email string, id int64) {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	list := b.Msgs[email]
	for i := range list {
		if list[i].ID == id {
			b.Msgs[email] = append(list[:i:i], list[i+1:]...)
			b.dirty = true
			return
		}
	}
}

func (b *Inbox) clear(email string) {
	email = strings.ToLower(email)
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.Msgs[email]) > 0 {
		delete(b.Msgs, email)
		b.dirty = true
	}
}
