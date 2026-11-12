package main

// Party system. A party holds up to partyMax players (any world) and has one leader (whoever formed it).
//  - invite / accept / decline / leave; the leader can kick, hand over leadership (promote) or disband.
//  - party chat (/p text) reaches members in any world.
//  - EXP sharing: when a normal monster dies, party members in the same world within partyXPRange of it who did NOT
//    damage it receive a share. Limits: no shared EXP from bosses; the member must be within partyShareGap levels of the
//    party's top damager; the share shrinks if the monster is much higher level than the member; dead or AFK (tab hidden)
//    members get nothing. Members who did damage it get full EXP as usual.
//  - PvP: party members can never flag or hit each other (see game.go "pvp"/"phit").
// When the leader leaves, leadership passes to the next member. With one member left the party disbands.
//
// Client -> server:  {"t":"party","m":"invite","name":"Player"} | "accept" | "decline" | "leave" | "disband"
//                    {"t":"party","m":"kick"|"leader","name":"Player"} | {"t":"party","m":"chat","tx":"hello"}
// Server -> client:  {"t":"party","l":leaderId,"m":[[id,name,lv,hp,maxhp,world,dead],...]}   (empty list = not in a party)
//                    {"t":"pchat","n":"Name","m":"text"}  and  {"t":"kp","i":monsterId,"f":factor} (EXP share; client multiplies the kill's EXP by f)
//                    {"t":"pinv","n":"Inviter","s":30}                          (you were invited)
// Feedback text goes through the normal {"t":"sys"} message.

import (
	"bytes"
	"strings"
	"time"
)

const (
	partyMax     = 4
	partyInvSecs = 30
	partyXPRange = 2500.0

	// EXP-sharing limits (anti power-levelling). All enforced here on the server.
	partyXPBase   = 0.5  // share of the kill's EXP before the limits below
	partyShareGap = 10   // a member gets nothing if the party's best damager is more than this many levels above them
	partyMonSlack = 5    // monsters up to member level + this give the full share...
	partyMonFall  = 0.10 // ...then the share drops by this much per extra level (0 at slack + 1/fall = +15 levels)
)

type Party struct {
	id      int
	leader  *Player
	members []*Player
	last    []byte // last update sent, so unchanged parties cost nothing
}

type partyInvite struct {
	from *Player
	at   time.Time
}

func (pt *Party) has(p *Player) bool {
	for _, m := range pt.members {
		if m == p {
			return true
		}
	}
	return false
}

// findOnline resolves a name to exactly one joined player: exact match first, then a unique prefix.
func (h *Hub) findOnline(name string) (*Player, string) {
	var exact, prefix []*Player
	ln := strings.ToLower(name)
	for _, q := range h.players {
		if !q.joined || q.gone {
			continue
		}
		if strings.EqualFold(q.name, name) {
			exact = append(exact, q)
		} else if len(ln) >= 2 && strings.HasPrefix(strings.ToLower(q.name), ln) {
			prefix = append(prefix, q)
		}
	}
	c := exact
	if len(c) == 0 {
		c = prefix
	}
	switch len(c) {
	case 0:
		return nil, "No player named \"" + name + "\" is online."
	case 1:
		return c[0], ""
	}
	return nil, "More than one player matches \"" + name + "\". Type the full name."
}

func (h *Hub) partyMsg(pt *Party) []byte {
	lid := 0
	if pt.leader != nil {
		lid = pt.leader.id
	}
	b := []byte(`{"t":"party","l":` + itoa(lid) + `,"m":[`)
	for i, m := range pt.members {
		if i > 0 {
			b = append(b, ',')
		}
		w := 0
		if m.realm != nil {
			w = m.realm.wi
		}
		dead := 0
		if m.fl&1 != 0 {
			dead = 1
		}
		b = append(b, '[')
		b = ai(b, m.id)
		b = append(b, ',')
		b = append(b, jsonBytes(m.name)...)
		b = append(b, ',')
		b = ai(b, m.lv)
		b = append(b, ',')
		b = af(b, m.hp, 0)
		b = append(b, ',')
		b = ai(b, m.mh)
		b = append(b, ',')
		b = ai(b, w)
		b = append(b, ',')
		b = ai(b, dead)
		b = append(b, ']')
	}
	return append(b, "]}"...)
}

// partyPush sends the member list to everyone in the party; force resends even if nothing changed.
func (h *Hub) partyPush(pt *Party, force bool) {
	msg := h.partyMsg(pt)
	if !force && bytes.Equal(msg, pt.last) {
		return
	}
	pt.last = msg
	for _, m := range pt.members {
		m.send(msg)
	}
}

var partyNone = []byte(`{"t":"party","m":[]}`)

func (h *Hub) partyLeave(p *Player, reason string) {
	h.partyRemove(p, reason, p.name+" left the party.")
}

// partyRemove takes p out of its party: reason is shown to p, others is shown to the remaining members.
// The party is dissolved when fewer than two members remain; if p led it, the next member becomes leader.
func (h *Hub) partyRemove(p *Player, reason, others string) {
	pt := p.party
	if pt == nil {
		return
	}
	p.party = nil
	for i, m := range pt.members {
		if m == p {
			pt.members = append(pt.members[:i], pt.members[i+1:]...)
			break
		}
	}
	p.send(partyNone)
	if reason != "" {
		p.sysMsg(reason)
	}
	if len(pt.members) < 2 {
		for _, m := range pt.members {
			m.party = nil
			m.send(partyNone)
			m.sysMsg("The party was disbanded.")
		}
		delete(h.parties, pt.id)
		return
	}
	for _, m := range pt.members {
		m.sysMsg(others)
	}
	if pt.leader == p {
		pt.leader = pt.members[0]
		for _, m := range pt.members {
			m.sysMsg(pt.leader.name + " is now the party leader.")
		}
	}
	h.partyPush(pt, true)
}

func (h *Hub) partyInvite(p *Player, name string) {
	q, err := h.findOnline(strings.TrimSpace(name))
	if q == nil {
		if strings.TrimSpace(name) == "" {
			err = "Usage: /invite playername"
		}
		p.sysMsg(err)
		return
	}
	switch {
	case q == p:
		p.sysMsg("You cannot invite yourself.")
		return
	case q.party != nil && q.party == p.party:
		p.sysMsg(q.name + " is already in your party.")
		return
	case q.party != nil:
		p.sysMsg(q.name + " is already in a party.")
		return
	case p.party != nil && len(p.party.members) >= partyMax:
		p.sysMsg("Your party is full (" + itoa(partyMax) + " players).")
		return
	}
	if q.inv != nil && q.inv.from == p && time.Since(q.inv.at) < 3*time.Second {
		return // spam guard
	}
	q.inv = &partyInvite{from: p, at: time.Now()}
	q.send(jsonBytes(map[string]interface{}{"t": "pinv", "n": p.name, "s": partyInvSecs}))
	p.sysMsg("Party invite sent to " + q.name + ".")
}

func (h *Hub) partyAccept(p *Player) {
	inv := p.inv
	p.inv = nil
	if inv == nil || time.Since(inv.at) > (partyInvSecs+5)*time.Second {
		p.sysMsg("You have no pending party invite.")
		return
	}
	f := inv.from
	switch {
	case p.party != nil:
		p.sysMsg("You are already in a party. Use /leave first.")
		return
	case f.gone || !f.joined:
		p.sysMsg(f.name + " is no longer online.")
		return
	case f.party != nil && len(f.party.members) >= partyMax:
		p.sysMsg(f.name + "'s party is full.")
		return
	}
	pt := f.party
	if pt == nil {
		h.nextParty++
		pt = &Party{id: h.nextParty, leader: f, members: []*Player{f}}
		f.party = pt
		h.parties[pt.id] = pt
	}
	pt.members = append(pt.members, p)
	p.party = pt
	for _, m := range pt.members {
		if m != p {
			m.sysMsg(p.name + " joined the party.")
		}
	}
	p.sysMsg("You joined " + f.name + "'s party.")
	h.partyPush(pt, true)
}

func (h *Hub) partyDecline(p *Player) {
	inv := p.inv
	p.inv = nil
	if inv == nil {
		return
	}
	if f := inv.from; !f.gone && f.joined {
		f.sysMsg(p.name + " declined your party invite.")
	}
}

func (h *Hub) onParty(p *Player, in *inMsg) {
	switch in.M {
	case "invite":
		h.partyInvite(p, in.Name)
	case "accept":
		h.partyAccept(p)
	case "decline":
		h.partyDecline(p)
	case "leave":
		if p.party == nil {
			p.sysMsg("You are not in a party.")
			return
		}
		h.partyLeave(p, "You left the party.")
	case "kick", "leader":
		h.partyLeaderAct(p, in.M, in.Name)
	case "disband":
		pt := p.party
		if pt == nil || pt.leader != p {
			p.sysMsg("Only the party leader can disband the party.")
			return
		}
		for _, m := range pt.members {
			m.party = nil
			m.send(partyNone)
			m.sysMsg("The party was disbanded by " + p.name + ".")
		}
		delete(h.parties, pt.id)
	case "chat":
		pt := p.party
		txt := cleanChat(in.Tx)
		now := time.Now()
		if pt == nil {
			p.sysMsg("You are not in a party.")
			return
		}
		if txt == "" || now.Sub(p.lastChat) < 400*time.Millisecond {
			return
		}
		p.lastChat = now
		msg := jsonBytes(map[string]interface{}{"t": "pchat", "id": p.id, "n": p.name, "m": txt})
		for _, m := range pt.members {
			m.send(msg)
		}
	}
}

// partyLeaderAct: kick / hand over leadership. Leader only; the target must be in the same party.
func (h *Hub) partyLeaderAct(p *Player, act, name string) {
	pt := p.party
	if pt == nil {
		p.sysMsg("You are not in a party.")
		return
	}
	if pt.leader != p {
		p.sysMsg("Only the party leader can do that.")
		return
	}
	name = strings.TrimSpace(name)
	if name == "" {
		p.sysMsg("Usage: /" + act + " playername")
		return
	}
	var q *Player
	for _, m := range pt.members {
		if strings.EqualFold(m.name, name) {
			q = m
		}
	}
	if q == nil { // allow a unique prefix among members
		for _, m := range pt.members {
			if len(name) >= 2 && strings.HasPrefix(strings.ToLower(m.name), strings.ToLower(name)) {
				if q != nil {
					p.sysMsg("More than one member matches \"" + name + "\". Type the full name.")
					return
				}
				q = m
			}
		}
	}
	if q == nil {
		p.sysMsg("\"" + name + "\" is not in your party.")
		return
	}
	if q == p {
		p.sysMsg("You cannot do that to yourself.")
		return
	}
	if act == "kick" {
		h.partyRemove(q, "You were removed from the party by "+p.name+".", q.name+" was removed from the party.")
		return
	}
	pt.leader = q
	for _, m := range pt.members {
		m.sysMsg(q.name + " is now the party leader.")
	}
	h.partyPush(pt, true)
}

func sameParty(a, b *Player) bool { return a.party != nil && a.party == b.party }

// partyXPShare tells party members of everyone who damaged monster m that they earned a share of its EXP.
func (r *Realm) partyXPShare(m *Mon) {
	if m.boss || len(m.dmgBy) == 0 {
		return
	}
	done := map[int]bool{}
	for _, p := range m.dmgBy {
		done[p.id] = true
	}
	for _, p := range m.dmgBy {
		if p.party == nil {
			continue
		}
		top := 0 // highest level among this party's members who damaged the monster
		for _, d := range m.dmgBy {
			if d.party == p.party && d.lv > top {
				top = d.lv
			}
		}
		for _, q := range p.party.members {
			if done[q.id] || q.gone || !q.joined || q.realm != r || q.fl&(1|16) != 0 || dist(q.x, q.y, m.x, m.y) > partyXPRange {
				continue
			}
			if top-q.lv > partyShareGap {
				continue
			}
			f := partyXPBase * clampF(1-float64(m.lvl-(q.lv+partyMonSlack))*partyMonFall, 0, 1)
			if f < 0.02 {
				continue
			}
			done[q.id] = true
			q.send([]byte(`{"t":"kp","i":` + itoa(m.id) + `,"f":` + string(af(nil, f, 3)) + `}`))
		}
	}
}
