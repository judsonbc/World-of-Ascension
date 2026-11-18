package main

// Multiplayer game hub. ONE goroutine (Hub.run) owns all game state, so there are no locks in game logic.
// Connection goroutines only read frames and push them into Hub.in; a writer goroutine per player drains Player.out.
//
// What the server decides: monster spawns, AI, HP, death, respawn, who gets credit for a kill, ore cooldowns,
// and the chat. What each client still decides (and the server trusts): its own stats, damage numbers, loot and
// saves (browser localStorage). That is fine for friends on a LAN; it is NOT cheat-proof for public servers.

import (
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const (
	mapK        = 5 // map size multiplier; must equal MAP_K in web/game.js
	worldCentre = 3200.0 * mapK
	rimR        = 3080.0 * mapK
	townR       = 345.0
	monMult     = 2 // monster density multiplier; must equal MON_MULT in web/game.js
	nMons       = 5500 // total of ringMons below (monMult is no longer used for the count)
	nOre        = 80 * mapK
	tickHz      = 15
	viewR       = 1800.0
	monHpPerLv  = 0.005

	// v5_157 monster / boss LEASH (keep equal to MON_LOSE / MON_LEASH / BOSS_LOSE / BOSS_LEASH in web/game.js): a chasing monster gives up and returns home when you are
	// further than *Lose from it, or when it is further than *Leash from its home. Was 650 / 520 for every monster (the client had 2400 / 3000 for bosses in solo only).
	monLose, monLeash   = 1000.0, 800.0
	bossLose, bossLeash = 1500.0, 4500.0

	// PvP: right-clicking another player flags you for pvpFlagSecs; every PvP hit (given or taken) refreshes it.
	pvpFlagSecs = 30.0
	pvpMult     = 0.5  // player-vs-player damage multiplier (keep equal to PVP_MULT in web/game.js). v5_71: 0.4 -> 0.5 (gear was halved)
	pvpHitCap   = 0.10 // one hit can never take more than this fraction of the victim's max HP
	pvpBurstWin = 3.0  // anti burst: inside any window of this many seconds ...
	pvpBurstCap = 0.30 // ... a player cannot lose more than this fraction of max HP to PvP hits (extra hits do 1 dmg)

	// Defense curve shared by monster->player and player->player hits (keep equal to PDEF_* in web/game.js):
	//   reduction = def / (def + pDefK + attackerLevel*pDefKLv), capped at pDefCap.
	// The attacker's level is in the formula, so the same DEF protects less against a higher level attacker.
	pDefK   = 10.0
	pDefKLv = 3.0
	pDefCap = 0.75
	// v5_69: when the attacker is far above the victim the caps open up (full effect at a gap of pvpCapGap levels), so a Lv1000 can
	// kill a Lv1 in a few seconds instead of being stalled by the 10%/hit and 30%/3s caps + potions. Equal levels: unchanged.
	pvpCapGap      = 400.0
	pvpHitCapMax   = 1.00 // per-hit cap at full gap (v5_70: 0.40 -> 1.00, the cap no longer blocks a one-hit kill)
	pvpBurstCapMax = 1.00 // 3s burst cap at full gap (v5_70: 0.90 -> 1.00)
	// v5_70: gap dominance D = clamp((attackerLv - victimLv) / pvpCapGap, 0, 1). It also fades out the victim's dodge, PvP DMG reduction,
	// shield and damage-reduction buff on the client (they count x(1-D)), and removes the level-gap damage penalty of pvpGap.
	// At a lead of pvpLethalGap levels or more, any hit that lands is lethal (damage is at least the victim's max HP): Lv1000 one-shots Lv1.
	pvpLethalGap = 500
	// v5_159 PvP LEVEL COMPRESSION: a level lead counts for at most pvpMaxGap levels in every PvP formula (damage penalty, defence curve, per-hit cap, lethal check).
	// Before, a Lv1000 one-shot a Lv1 (lead >= pvpLethalGap). With the lead clamped to pvpMaxGap the per-hit cap tops out at pvpHitCap + (pvpHitCapMax-pvpHitCap)*pvpMaxGap/pvpCapGap
	// = 32.5% of max HP, so the lethal rule never fires and a low level player always gets a few hits to react. A value of 1000 or more restores the old behaviour.
	// Keep equal to PVP_MAX_GAP in web/game.js.
	pvpMaxGap = 100
	// v5_83: a PvP hit is only accepted when attacker and victim are within pvpHitRange[attacker class] + pvpHitSlack units of each other (server positions).
	// Before, any hit up to 1500 units away was accepted, so players could damage others from far away / from where they were not.
	// Ranges: Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner. Slack covers latency and the 0.12 s display delay.
	pvpHitSlack = 160.0
	pvpBountyCd = 60.0 // killing the same player again inside this window pays no bounty

	// The Arena (world 0) is the PvP arena. No monsters, small round map, PvP is always on
	// for everyone outside the safe hub. Must match ARENA / ARENA_R in web/game.js.
	arenaWi = 0 // World 0, the Arena, is the PvP arena
	arenaR  = 2250.0 // v5_177: 1500 -> 2250
	arenaLo = 1 // unused level band (the Colosseum has no monsters)

	// Random boss waves: each wave brings 1..maxBosses bosses with random type, level (any level of the world) and place.
	// At most maxBosses bosses are alive in a world at once. Must match BOSS_* in web/game.js (client solo mode).
	maxBosses   = 5
	bossWaitMin = 60.0
	bossWaitMax = 240.0
	bossLife    = 1200.0 // an unkilled boss vanishes after this many seconds
	arenaHi     = 300

	// v5_159 party roles. Iron Guardian War Cry taunts nearby monsters onto the caster (tank); heals and ATK buffs cast by a party member also reach
	// party mates in the same world (support). The server only relays the buff (clamped + rate limited); every client applies it to itself.
	tauntRadius = 320.0 // monsters this close to the Iron Guardian switch to it
	tauntCd     = 6.0   // seconds between taunts (War Cry's own cooldown is longer)
	pbuffRadius = 900.0 // party mates this close receive the shared heal / buff
	pbuffCd     = 4.0   // seconds between shared buffs from one player
	pbuffHealMax = 0.08 // shared heal: at most this fraction of the receiver's max HP
	pbuffAtkMax  = 0.15 // shared ATK buff: at most +15%
)

type worldDef struct {
	lo, hi int
	bt     [4]int
}

// Must match WORLDS in web/game.js: level range and the monster type index of each world's four bosses.
// monsters per ring, ring 1 (next to the hub) to ring 9 (rim). Keep equal to RING_MONS in web/game.js.
var ringMons = [9]int{300, 400, 500, 600, 700, 800, 900, 1000, 300}

var worldDefs = []worldDef{
	{901, 1000, [4]int{0, 1, 7, 8}}, // world 0 = Arena (placeholder, never used for monsters)
	{1, 50, [4]int{0, 1, 2, 4}},
	{51, 100, [4]int{0, 1, 2, 8}},
	{101, 150, [4]int{0, 1, 7, 8}},
	{151, 200, [4]int{0, 1, 7, 8}},
	{201, 300, [4]int{0, 1, 7, 8}},
	{301, 400, [4]int{0, 1, 7, 8}},
	{401, 500, [4]int{0, 1, 7, 8}},
	{501, 600, [4]int{0, 1, 7, 8}},
	{601, 700, [4]int{0, 1, 7, 8}},
	{701, 800, [4]int{0, 1, 7, 8}},
	{801, 900, [4]int{0, 1, 7, 8}},
	{1001, 1100, [4]int{0, 1, 7, 8}},
	{1101, 1200, [4]int{0, 1, 7, 8}},
	{1201, 1300, [4]int{0, 1, 7, 8}},
	{1301, 1400, [4]int{0, 1, 7, 8}},
}

var (
	baseR = [9]float64{13, 14, 17, 15, 15, 17, 16, 24, 21}
	baseS = [9]float64{78, 70, 66, 86, 92, 98, 96, 72, 112}
	zoneD = [8]float64{600 * mapK, 900 * mapK, 1200 * mapK, 1450 * mapK, 1800 * mapK, 2200 * mapK, 2600 * mapK, 3000 * mapK}
)

func dist(ax, ay, bx, by float64) float64 { return math.Hypot(ax-bx, ay-by) }

func clampF(v, a, b float64) float64 {
	if v < a {
		return a
	}
	if v > b {
		return b
	}
	return v
}

func clampI(v, a, b int) int {
	if v < a {
		return a
	}
	if v > b {
		return b
	}
	return v
}

// defRed: fraction of damage removed by `def` against an attacker of level atkLv.
func defRed(def float64, atkLv int) float64 {
	if def < 0 {
		def = 0
	}
	return math.Min(pDefCap, def/(def+pDefK+float64(atkLv)*pDefKLv))
}

// monGap: level-gap scaling of a monster's hit on a player. A monster above the player hits up to +60% harder,
// a monster far below hits down to 40%.
func monGap(monLv, plLv int) float64 {
	g := float64(monLv - plLv)
	if g >= 0 {
		return 1 + math.Min(.6, g*.01)
	}
	return math.Max(.4, 1+g*.01)
}

// pvpGap: level-gap scaling of a PvP hit. High level players hit low levels for less (down to 50%),
// low level players get a small bonus against higher levels (up to +25%).
func pvpGap(atkLv, vicLv int) float64 {
	g := float64(atkLv - vicLv)
	if g > 0 {
		return math.Max(.5, 1/(1+g*.01))
	}
	return math.Min(1.25, 1-g*.005)
}

// pvpHitRange: the farthest a class can hit a player from (its longest skill / normal attack reach, v5_80-v5_82 ranges).
var pvpHitRange = [5]float64{420, 440, 260, 560, 480}

func itoa(i int) string { return strconv.Itoa(i) }

func ai(b []byte, i int) []byte            { return strconv.AppendInt(b, int64(i), 10) }
func af(b []byte, f float64, p int) []byte { return strconv.AppendFloat(b, f, 'f', p, 64) }

func jsonBytes(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("null")
	}
	return b
}

/* ---------------------------------------------------------------- monsters */

type Mon struct {
	id        int
	x, y      float64
	hx, hy    float64
	r, spd    float64
	lvl       int
	boss      bool
	bi        int     // boss type index 0-3, or -1
	life      float64 // seconds a live boss has left before it vanishes
	hp, maxhp float64
	def       int
	atk       float64
	aggro     float64
	state     int // 0 idle, 1 chase, 2 return
	target    *Player
	cd, wt    float64
	wx, wy    float64
	dead      bool
	respawn   float64
	atkFlag   bool
	dmgBy     map[int]*Player
}

func newMon(wi int, id int, x, y float64, bi int, blvl int) *Mon {
	var w worldDef
	zd, rim, spdTier := zoneD, rimR, float64(wi)
	if wi == arenaWi {
		w = worldDef{lo: arenaLo, hi: arenaHi}
		zd, rim, spdTier = [8]float64{600, 900, 1200, 1450, 1800, 2200, 2600, 3000}, arenaR, 3 // same thresholds as monsterAt() in the client
	} else {
		w = worldDefs[wi]
	}
	x = math.Round(x*10) / 10
	y = math.Round(y*10) / 10
	d := dist(x, y, worldCentre, worldCentre)
	boss := bi >= 0
	var ti, lvl int
	if boss {
		ti = w.bt[bi]
		lvl = clampI(blvl, w.lo, w.hi)
	} else {
		ti = 8
		for i, z := range zd {
			if d < z {
				ti = i
				break
			}
		}
		f := clampF((d-300)/(rim-340), 0, 1)
		lvl = w.lo + int(math.Round(f*float64(w.hi-w.lo)))
	}
	k := 1.0
	if boss {
		k = 12
	}
	scale := 1.0
	if lvl > 300 {
		scale = 1 + float64(lvl-300)*.02
	}
	k *= scale
	hp := math.Round(float64(28+lvl*24) * k * (1 + float64(lvl)*monHpPerLv))
	defMul, atkMul := 1.0, 1.0
	if boss {
		defMul, atkMul = 1.5, 1.6
	}
	m := &Mon{
		id: id, x: x, y: y, hx: x, hy: y, lvl: lvl, boss: boss, bi: bi,
		hp: hp, maxhp: hp,
		def:   int(math.Round((6 + float64(lvl)*2.6) * defMul)),
		atk:   (3 + float64(lvl)*2.1) * atkMul * scale,
		aggro: 190,
		wt:    rand.Float64() * 3,
		life:  bossLife,
	}
	m.r = baseR[ti]
	m.spd = baseS[ti] * (1 + spdTier*.05)
	if boss {
		m.r = 30
		m.spd *= .8
		m.aggro = 300
	}
	return m
}

/* ---------------------------------------------------------------- players, realms */

type Player struct {
	id       int
	name     string
	conn     *wsConn
	out      chan []byte
	realm    *Realm
	joined   bool
	gone     bool
	x, y     float64
	face, hp float64
	fl       int // bit0 dead, bit1 might buff, bit2 shield
	sk, lv   int
	wl, al   int
	cls      int // class index reported by the client (info message), clamped 0..4
	pet      string // v5_201 summoned pet key 's:c' reported by the client (cosmetic, relayed so other players see it); "" = none
	mh, def  int
	eq       json.RawMessage // equipped gear as sent by the client (validated JSON, size-capped)
	tokens   float64
	lastChat time.Time
	email    string

	pvpT      float64 // seconds of PvP flag left (0 = peaceful)
	lastHitBy int     // id of the last player who hit us in PvP
	lastHitT  float64
	pvpWinT   float64 // start of the current anti-burst window
	pvpWinD   float64 // PvP damage taken inside it
	wasDead   bool
	warnAt    time.Time
	pvpLvl    int  // v5_158 PvP mode: 0 Peaceful, 1 Lawful, 2 Hostile, 3 Carnal (see pvpCanHit)
	pkAt      map[int]float64
	kills     int

	lastFr time.Time // last friend action (see friends.go)

	tauntAt float64 // v5_159 hub clock of the last taunt
	pbuffAt float64 // v5_159 hub clock of the last shared party buff

	party *Party       // nil when not in a party (see party.go)
	inv   *partyInvite // pending party invite, if any
}

func (p *Player) hunted() bool {
	return p.joined && p.fl&17 == 0 && dist(p.x, p.y, worldCentre, worldCentre) >= townR
}

func (p *Player) send(b []byte) {
	if p.gone {
		return
	}
	select {
	case p.out <- b:
	default:
		// client cannot keep up: drop the connection, the read loop will report the leave
		p.conn.close()
	}
}

func (p *Player) writer() {
	t := time.NewTicker(15 * time.Second)
	defer t.Stop()
	for {
		select {
		case b, ok := <-p.out:
			if !ok {
				p.conn.close()
				return
			}
			if err := p.conn.writeText(b); err != nil {
				p.conn.close()
				for range p.out {
				}
				return
			}
		case <-t.C:
			if err := p.conn.ping(); err != nil {
				p.conn.close()
			}
		}
	}
}

type PInfo struct {
	ID   int     `json:"id"`
	Name string  `json:"n"`
	Sk   int     `json:"sk"`
	Lv   int     `json:"lv"`
	Wl   int     `json:"wl"`
	Al   int     `json:"al"`
	Mh   int     `json:"mh"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Eq   json.RawMessage `json:"eq,omitempty"` // equipped gear, relayed so other players can inspect it
	Pt   string  `json:"pt,omitempty"` // v5_201 summoned pet 's:c' (omitted = no pet)
}

func (p *Player) info() PInfo {
	return PInfo{p.id, p.name, p.sk, p.lv, p.wl, p.al, p.mh, math.Round(p.x), math.Round(p.y), p.eq, p.pet}
}

type Realm struct {
	wi      int
	mons    []*Mon
	oreCd   []float64
	players map[int]*Player
	bossT   float64 // seconds until the next boss wave
}

func newRealm(wi int) *Realm {
	r := &Realm{wi: wi, players: map[int]*Player{}, oreCd: make([]float64, nOre)}
	if wi == arenaWi {
		// the Colosseum has no monsters: players only
		return r
	}
	// fixed monster count per ring (ring 1 = hub side ... ring 9 = rim), spread evenly per AREA inside each ring
	for k, cnt := range ringMons {
		lo, hi := 500.0, rimR-40
		if k > 0 {
			lo = zoneD[k-1]
		}
		if k < 8 {
			hi = zoneD[k]
		}
		for n := 0; n < cnt; n++ {
			a := rand.Float64() * math.Pi * 2
			d := math.Sqrt(lo*lo + rand.Float64()*(hi*hi-lo*lo))
			r.mons = append(r.mons, newMon(wi, len(r.mons), worldCentre+math.Cos(a)*d, worldCentre+math.Sin(a)*d, -1, 0))
		}
	}
	// maxBosses boss slots (ids stay fixed); they start empty and are filled by random waves
	for k := 0; k < maxBosses; k++ {
		m := newMon(wi, len(r.mons), worldCentre, worldCentre, 0, worldDefs[wi].lo)
		m.dead = true
		r.mons = append(r.mons, m)
	}
	r.bossT = 8 + rand.Float64()*20
	return r
}

func (r *Realm) bossesAlive() int {
	n := 0
	for _, m := range r.mons {
		if m.boss && !m.dead {
			n++
		}
	}
	return n
}

func (m *Mon) entry() []interface{} {
	d := 0
	if m.dead {
		d = 1
	}
	return []interface{}{m.id, m.hx, m.hy, m.bi, math.Round(m.maxhp), m.def, math.Round(m.r), math.Round(m.hp), d, m.lvl}
}

// spawnWave fills 1..maxBosses free boss slots (never more than maxBosses alive) with random type, level and place.
func (r *Realm) spawnWave() {
	w := worldDefs[r.wi]
	n := 1 + rand.Intn(maxBosses)
	var out []interface{}
	for _, m := range r.mons {
		if n == 0 {
			break
		}
		if !m.boss || !m.dead {
			continue
		}
		a := rand.Float64() * math.Pi * 2
		d := 700 + rand.Float64()*(rimR-340-700)
		id := m.id
		*m = *newMon(r.wi, id, worldCentre+math.Cos(a)*d, worldCentre+math.Sin(a)*d, rand.Intn(4), w.lo+rand.Intn(w.hi-w.lo+1))
		out = append(out, m.entry())
		n--
	}
	if len(out) > 0 {
		r.sendAll(jsonBytes(map[string]interface{}{"t": "bs", "b": out}), nil)
	}
}

func (r *Realm) despawn(m *Mon) {
	m.dead = true
	m.state = 0
	m.target = nil
	m.dmgBy = nil
	r.sendAll([]byte(`{"t":"bx","i":`+itoa(m.id)+`}`), nil)
}

func (r *Realm) sendAll(b []byte, except *Player) {
	for _, p := range r.players {
		if p != except {
			p.send(b)
		}
	}
}

func (r *Realm) sendNear(x, y, rad float64, b []byte, except *Player) {
	for _, p := range r.players {
		if p != except && dist(p.x, p.y, x, y) <= rad {
			p.send(b)
		}
	}
}

func (r *Realm) simMon(m *Mon, dt float64) {
	m.atkFlag = false
	if m.boss {
		// bosses never respawn in place: random waves bring new ones (Realm.spawnWave)
		if m.dead {
			return
		}
		if m.state != 1 { // vanish timer is paused while the boss is in attack (chase) mode
			m.life -= dt
		}
		if m.life <= 0 {
			r.despawn(m)
			return
		}
	}
	if m.dead {
		m.respawn -= dt
		if m.respawn <= 0 {
			m.dead = false
			m.hp = m.maxhp
			m.x, m.y = m.hx, m.hy
			m.state = 0
			m.target = nil
		}
		return
	}
	m.cd -= dt
	if m.state == 1 {
		t := m.target
		if t == nil || t.gone || t.realm != r || !t.hunted() ||
			dist(t.x, t.y, m.x, m.y) > leashLose(m.boss) || dist(m.x, m.y, m.hx, m.hy) > leashHome(m.boss) {
			m.state = 2
			m.target = nil
		}
	} else if m.state == 0 {
		var best *Player
		bd := m.aggro
		for _, p := range r.players {
			if !p.hunted() {
				continue
			}
			if d := dist(p.x, p.y, m.x, m.y); d < bd {
				bd = d
				best = p
			}
		}
		if best != nil {
			m.state = 1
			m.target = best
		} else {
			m.wt -= dt
			if m.wt <= 0 {
				m.wt = 2 + rand.Float64()*3
				a := rand.Float64() * 6.28
				s := 0.0
				if rand.Float64() >= .5 {
					s = 30
				}
				m.wx = math.Cos(a) * s
				m.wy = math.Sin(a) * s
			}
			nx, ny := m.x+m.wx*dt, m.y+m.wy*dt
			if dist(nx, ny, m.hx, m.hy) < 120 {
				m.x, m.y = nx, ny
			}
		}
	}
	if m.state == 2 {
		dx, dy := m.hx-m.x, m.hy-m.y
		d := math.Hypot(dx, dy)
		if d < 8 {
			m.state = 0
		} else {
			m.x += dx / d * m.spd * 1.4 * dt
			m.y += dy / d * m.spd * 1.4 * dt
		}
		m.hp = math.Min(m.maxhp, m.hp+m.maxhp*.2*dt)
	} else if m.state == 1 {
		t := m.target
		dp := dist(t.x, t.y, m.x, m.y)
		reach := m.r + 14 + 4
		if dp > reach {
			m.x += (t.x - m.x) / dp * m.spd * dt
			m.y += (t.y - m.y) / dp * m.spd * dt
		} else if m.cd <= 0 {
			if m.boss {
				m.cd = 1.4
			} else {
				m.cd = 1.2
			}
			m.atkFlag = true
			dmg := math.Max(1, math.Round(m.atk*(.85+rand.Float64()*.3)*(1-defRed(float64(t.def), m.lvl))*monGap(m.lvl, t.lv)))
			t.send([]byte(`{"t":"hurt","d":` + strconv.FormatFloat(dmg, 'f', 0, 64) + `,"i":` + itoa(m.id) + `}`))
		}
	}
}

// kill: everyone who damaged the monster gets their own XP. Boss loot goes only to the player who landed the last hit
// (killer); the others are told with "l":0 so their client skips the drops.
func (r *Realm) kill(m *Mon, killer *Player) {
	m.hp = 0
	m.dead = true
	m.state = 0
	m.target = nil
	m.respawn = 14 + rand.Float64()*8
	dm := []byte(`{"t":"d","i":` + itoa(m.id) + `}`)
	for _, p := range r.players {
		p.send(dm)
	}
	r.partyXPShare(m)
	km := []byte(`{"t":"k","i":` + itoa(m.id) + `}`)
	kmLast := []byte(`{"t":"k","i":` + itoa(m.id) + `,"l":1}`)
	kmNoLoot := []byte(`{"t":"k","i":` + itoa(m.id) + `,"l":0}`)
	for _, p := range m.dmgBy {
		if p.gone || p.realm != r {
			continue
		}
		switch {
		case !m.boss:
			p.send(km)
		case p == killer:
			p.send(kmLast)
		default:
			p.send(kmNoLoot)
		}
	}
	m.dmgBy = nil
}

// snapshot: monsters near this player, every other player in the realm. Every second it also carries the
// list of dead monster ids and the server clock.
func (r *Realm) snapshot(p *Player, extra bool, tm float64, dead []int) []byte {
	b := make([]byte, 0, 4096)
	b = append(b, `{"t":"s","m":[`...)
	first := true
	for _, m := range r.mons {
		if m.dead || math.Abs(m.x-p.x) > viewR || math.Abs(m.y-p.y) > viewR {
			continue
		}
		if !first {
			b = append(b, ',')
		}
		first = false
		fl := m.state
		if m.atkFlag {
			fl |= 8
		}
		b = append(b, '[')
		b = ai(b, m.id)
		b = append(b, ',')
		b = af(b, m.x, 1)
		b = append(b, ',')
		b = af(b, m.y, 1)
		b = append(b, ',')
		b = af(b, m.hp, 0)
		b = append(b, ',')
		b = ai(b, fl)
		b = append(b, ']')
	}
	b = append(b, `],"p":[`...)
	first = true
	for _, q := range r.players {
		if q == p || !q.joined {
			continue
		}
		if !first {
			b = append(b, ',')
		}
		first = false
		b = append(b, '[')
		b = ai(b, q.id)
		b = append(b, ',')
		b = af(b, q.x, 1)
		b = append(b, ',')
		b = af(b, q.y, 1)
		b = append(b, ',')
		b = af(b, q.face, 2)
		b = append(b, ',')
		b = af(b, q.hp, 0)
		b = append(b, ',')
		fl := q.fl | q.pvpLvl<<5 // v5_158 bits 5-6 = PvP mode (0-3), server-owned
		b = ai(b, fl)
		b = append(b, ']')
	}
	b = append(b, ']')
	if extra {
		b = append(b, `,"tm":`...)
		b = af(b, tm, 1)
		b = append(b, `,"dd":[`...)
		for i, id := range dead {
			if i > 0 {
				b = append(b, ',')
			}
			b = ai(b, id)
		}
		b = append(b, ']')
	}
	b = append(b, '}')
	return b
}

func (r *Realm) worldMsg() []byte {
	b := make([]byte, 0, 40*1024)
	b = append(b, `{"t":"world","w":`...)
	b = ai(b, r.wi)
	b = append(b, `,"mons":[`...)
	for i, m := range r.mons {
		if i > 0 {
			b = append(b, ',')
		}
		dead := 0
		if m.dead {
			dead = 1
		}
		b = append(b, '[')
		b = ai(b, m.id)
		b = append(b, ',')
		b = af(b, m.hx, 1)
		b = append(b, ',')
		b = af(b, m.hy, 1)
		b = append(b, ',')
		b = ai(b, m.bi)
		b = append(b, ',')
		b = af(b, m.maxhp, 0)
		b = append(b, ',')
		b = ai(b, m.def)
		b = append(b, ',')
		b = af(b, m.r, 0)
		b = append(b, ',')
		b = af(b, m.hp, 0)
		b = append(b, ',')
		b = ai(b, dead)
		if m.boss {
			b = append(b, ',')
			b = ai(b, m.lvl)
		}
		b = append(b, ']')
	}
	b = append(b, `],"ores":[`...)
	first := true
	for i, cd := range r.oreCd {
		if cd <= 0 {
			continue
		}
		if !first {
			b = append(b, ',')
		}
		first = false
		b = append(b, '[')
		b = ai(b, i)
		b = append(b, ',')
		b = af(b, cd, 1)
		b = append(b, ']')
	}
	b = append(b, `],"ps":`...)
	ps := []PInfo{}
	for _, q := range r.players {
		if q.joined {
			ps = append(ps, q.info())
		}
	}
	b = append(b, jsonBytes(ps)...)
	b = append(b, '}')
	return b
}

/* ---------------------------------------------------------------- hub */

const (
	evConnect = iota
	evMsg
	evLeave
	evFlush // ask this account's live session(s) to save now (msg = email); reply = whether one was found
)

type evt struct {
	kind int
	p    *Player
	msg  []byte
	reply chan bool
}

// theHub is the running hub (set in main); accounts.go uses it to ask a live session to save before a second login loads the character.
var theHub *Hub

type Hub struct {
	in      chan evt
	players map[int]*Player
	realms  map[int]*Realm
	nextID  int
	start   time.Time

	parties   map[int]*Party
	nextParty int
}

func newHub() *Hub {
	return &Hub{in: make(chan evt, 2048), players: map[int]*Player{}, realms: map[int]*Realm{}, start: time.Now(), parties: map[int]*Party{}}
}

func (h *Hub) clock() float64 { return time.Since(h.start).Seconds() }

func (h *Hub) run() {
	tk := time.NewTicker(time.Second / tickHz)
	defer tk.Stop()
	last := time.Now()
	tick := 0
	for {
		select {
		case e := <-h.in:
			switch e.kind {
			case evConnect:
				h.onConnect(e.p)
			case evMsg:
				h.onMsg(e.p, e.msg)
			case evLeave:
				h.onLeave(e.p)
			case evFlush:
				found := false
				for _, q := range h.players {
					if q.joined && !q.gone && strings.EqualFold(q.email, string(e.msg)) {
						// v5_186 a login on another device signs this session out NOW (it saves first, see the client's kick handler), so it cannot keep
						// playing on progress that the new device never sees
						q.send([]byte(`{"t":"kick","m":"This account was logged in on another device. Your progress was saved and you have been signed out."}`))
						h.onLeave(q)
						found = true
					}
				}
				if e.reply != nil {
					e.reply <- found
				}
			}
		case now := <-tk.C:
			dt := now.Sub(last).Seconds()
			last = now
			if dt > .25 {
				dt = .25
			}
			tick++
			h.step(dt, tick)
		}
	}
}

func (h *Hub) step(dt float64, tick int) {
	tm := h.clock()
	extra := tick%tickHz == 0
	for _, r := range h.realms {
		for _, p := range r.players {
			p.tokens = math.Min(60, p.tokens+40*dt)
		}
		for i := range r.oreCd {
			if r.oreCd[i] > 0 {
				r.oreCd[i] -= dt
			}
		}
		if r.wi != arenaWi {
			if r.bossT -= dt; r.bossT <= 0 {
				r.bossT = bossWaitMin + rand.Float64()*(bossWaitMax-bossWaitMin)
				r.spawnWave()
			}
		}
		for _, m := range r.mons {
			r.simMon(m, dt)
		}
		var dead []int
		if extra {
			for _, m := range r.mons {
				if m.dead {
					dead = append(dead, m.id)
				}
			}
		}
		for _, p := range r.players {
			if p.joined {
				p.send(r.snapshot(p, extra, tm, dead))
			}
		}
	}
	if tick%(tickHz/3) == 0 { // party HP/level/world refresh, ~3 times a second, only sent when something changed
		for _, pt := range h.parties {
			h.partyPush(pt, false)
		}
	}
	if tick%(tickHz*10) == 0 {
		h.broadcastOnline()
	}
}

func (h *Hub) counts() ([]int, int) {
	c := make([]int, len(worldDefs))
	n := 0
	seen := map[string]bool{}
	for _, p := range h.players {
		if !p.joined || p.realm == nil {
			continue
		}
		// one account = one adventurer, even if a stale second session has not been cleaned up yet
		if k := strings.ToLower(p.email); k != "" {
			if seen[k] {
				continue
			}
			seen[k] = true
		}
		c[p.realm.wi]++
		n++
	}
	return c, n
}

func (h *Hub) onlineMsg() []byte {
	c, n := h.counts()
	b := []byte(`{"t":"on","n":` + itoa(n) + `,"tm":` + strconv.FormatFloat(h.clock(), 'f', 1, 64) + `,"c":[`)
	for i, v := range c {
		if i > 0 {
			b = append(b, ',')
		}
		b = ai(b, v)
	}
	return append(b, `]}`...)
}

func (h *Hub) broadcastOnline() {
	b := h.onlineMsg()
	for _, p := range h.players {
		p.send(b)
	}
}

func (h *Hub) onConnect(p *Player) {
	h.nextID++
	p.id = h.nextID
	p.tokens = 60
	h.players[p.id] = p
	c, n := h.counts()
	_ = c
	p.send([]byte(`{"t":"hello","id":` + itoa(p.id) + `,"tm":` + strconv.FormatFloat(h.clock(), 'f', 1, 64) + `,"n":` + itoa(n) + `}`))
	p.send(h.onlineMsg())
}

func (h *Hub) leaveRealm(p *Player) {
	r := p.realm
	if r == nil {
		return
	}
	delete(r.players, p.id)
	p.realm = nil
	p.lastHitBy, p.wasDead = 0, false
	for _, m := range r.mons {
		if m.target == p {
			m.target = nil
			m.state = 2
		}
	}
	if p.joined {
		r.sendAll([]byte(`{"t":"pl","id":`+itoa(p.id)+`}`), nil)
	}
	if len(r.players) == 0 {
		delete(h.realms, r.wi) // empty worlds are dropped and rebuilt fresh on the next visit
	}
}

func (h *Hub) enterRealm(p *Player, wi int) {
	wi = clampI(wi, 0, len(worldDefs)-1)
	r := h.realms[wi]
	if r == nil {
		r = newRealm(wi)
		h.realms[wi] = r
	}
	p.realm = r
	p.x, p.y = worldCentre, worldCentre+110
	p.fl = 0
	r.players[p.id] = p
	p.joined = true
	p.send(r.worldMsg())
	r.sendAll(jsonBytes(map[string]interface{}{"t": "pj", "p": p.info()}), p)
}

func (h *Hub) onLeave(p *Player) {
	if p.gone {
		return
	}
	h.leaveRealm(p)
	h.partyLeave(p, "")
	p.inv = nil
	p.gone = true
	delete(h.players, p.id)
	h.friendOffline(p)
	close(p.out)
	if p.joined {
		log.Printf("%s left (%d online)", p.name, h.joinedCount())
	}
	h.broadcastOnline()
}

var (
)

// onPlayerDown runs when a player's client reports it has died. If a PvP hit landed in the last 12s, the hitter gets the kill.
func (h *Hub) onPlayerDown(p *Player) {
	r := p.realm
	if r == nil || p.lastHitBy == 0 || h.clock()-p.lastHitT > 12 {
		return
	}
	k := r.players[p.lastHitBy]
	p.lastHitBy = 0
	if k == nil || !k.joined {
		return
	}
	r.sendAll(jsonBytes(map[string]interface{}{"t": "pkf", "k": k.name, "v": p.name, "n": k.kills + 1}), nil)
	now := h.clock()
	if k.pkAt == nil {
		k.pkAt = map[int]float64{}
	}
	bounty := 1
	if t, ok := k.pkAt[p.id]; ok && now-t < pvpBountyCd {
		bounty = 0
	}
	k.pkAt[p.id] = now
	k.kills++
	k.send(jsonBytes(map[string]interface{}{"t": "pk", "n": p.name, "lv": p.lv, "b": bounty, "k": k.kills}))
}

func (h *Hub) joinedCount() int {
	_, n := h.counts()
	return n
}

type inMsg struct {
	T    string  `json:"t"`
	Name string  `json:"name"`
	W    int     `json:"w"`
	Sk   int     `json:"sk"`
	Lv   int     `json:"lv"`
	Wl   int     `json:"wl"`
	Al   int     `json:"al"`
	Mh   int     `json:"mh"`
	Df   int     `json:"df"`
	Cl   int     `json:"cl"` // class index (0 Cultivator .. 4 Spirit Summoner), used for the PvP hit range check
	Eq   json.RawMessage `json:"eq"`
	Pt   string  `json:"pt"` // v5_201 summoned pet key 's:c' (see cleanPet)
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	F    float64 `json:"f"`
	Hp   float64 `json:"hp"`
	Fl   int     `json:"fl"`
	I    int     `json:"i"`
	D    float64 `json:"d"`
	Cr   int     `json:"cr"`
	On   int     `json:"on"`
	M    string  `json:"m"`
	Tx   string  `json:"tx"`
	Tok  string  `json:"token"`
	Sid  string  `json:"sid"` // v5_186 page id (see accounts.go sidIsOwner)
}

func cleanName(s string) string {
	var b []rune
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '_' || r == '-' || r == '\'' || r == '.' {
			b = append(b, r)
		}
		if len(b) >= 16 {
			break
		}
	}
	return strings.TrimSpace(string(b))
}

func cleanChat(s string) string {
	var b []rune
	for _, r := range s {
		if unicode.IsControl(r) {
			continue
		}
		b = append(b, r)
		if len(b) >= 120 {
			break
		}
	}
	return strings.TrimSpace(string(b))
}

// cleanPet validates a summoned-pet key "s:c": species 0..5 (0 chicken, 1-5 special), class 0..6 (F..S); a chicken has no class. Anything else = no pet.
func cleanPet(s string) string {
	if len(s) != 3 || s[1] != ':' {
		return ""
	}
	a, c := int(s[0])-'0', int(s[2])-'0'
	if a < 0 || a > 5 || c < 0 || c > 6 || (a == 0 && c != 0) {
		return ""
	}
	return s
}

func (h *Hub) applyInfo(p *Player, in *inMsg) bool {
	sk, lv, wl, al := clampI(in.Sk, 0, 1<<32-1), clampI(in.Lv, 1, 1000), clampI(in.Wl, 0, 500), clampI(in.Al, 0, 500)
	// v5_159 sanity ceilings: the client reports its own max HP / DEF, so absurd values (a Lv1 claiming 100M HP) are cut to a very generous multiple of the base formulas
	// (HP 100+32/level, DEF 3/level; real gear + forge + realm bonuses stay far below 1000x). This is a plausibility check, not full server-side validation.
	mh, df := clampI(in.Mh, 1, 1000*(100+32*lv)+1000000), clampI(in.Df, 0, 1000*(10+3*lv)+100000)
	changed := sk != p.sk || lv != p.lv || wl != p.wl || al != p.al || mh != p.mh
	p.sk, p.lv, p.wl, p.al, p.mh, p.def = sk, lv, wl, al, mh, df
	p.cls = clampI(in.Cl, 0, 4)
	if pt := cleanPet(in.Pt); pt != p.pet {
		p.pet = pt
		changed = true
	}
	if n := len(in.Eq); n > 0 && n <= 3000 && string(in.Eq) != string(p.eq) {
		p.eq = append(json.RawMessage(nil), in.Eq...)
		changed = true
	}
	return changed
}

func (h *Hub) onMsg(p *Player, raw []byte) {
	if p.gone {
		return
	}
	var in inMsg
	if err := json.Unmarshal(raw, &in); err != nil {
		return
	}
	if !p.joined {
		if in.T != "join" {
			return
		}
		email, ok := accts.verify(in.Tok)
		if !ok {
			p.send([]byte(`{"t":"auth"}`))
			return
		}
		// the in-game name is chosen once on the title screen and is permanent; the client's "name" field is ignored
		ign := accts.ignOf(email)
		if ign == "" {
			p.send([]byte(`{"t":"kick","m":"Choose your in-game name on the title screen first."}`))
			return
		}
		if !accts.sidIsOwner(email, in.Sid) {
			p.send([]byte(`{"t":"kick","m":"This account is being played on another device. Log in again here to take over."}`))
			return
		}
		// one active session per account: a new login signs the older one out
		for _, q := range h.players {
			if q != p && q.joined && !q.gone && strings.EqualFold(q.email, email) {
				q.send([]byte(`{"t":"kick","m":"This account was logged in somewhere else. You have been signed out."}`))
				h.onLeave(q)
			}
		}
		p.email = email
		p.name = ign
		h.applyInfo(p, &in)
		h.enterRealm(p, in.W)
		log.Printf("%s joined %d (%d online)", p.name, p.realm.wi+1, h.joinedCount())
		h.broadcastOnline()
		if offl != nil {
			offl.claim(p.name, p.email)
			h.deliverOffline(p)
		}
		h.friendOnline(p)
		return
	}
	r := p.realm
	if r == nil {
		return
	}
	switch in.T {
	case "p":
		x := clampF(in.X, worldCentre-rimR, worldCentre+rimR)
		y := clampF(in.Y, worldCentre-rimR, worldCentre+rimR)
		if r.wi == arenaWi { // round arena: pull back inside the wall
			if d := dist(x, y, worldCentre, worldCentre); d > arenaR-20 {
				x = worldCentre + (x-worldCentre)/d*(arenaR-20)
				y = worldCentre + (y-worldCentre)/d*(arenaR-20)
			}
		}
		p.x, p.y = x, y
		p.face = clampF(in.F, -7, 7)
		p.hp = clampF(in.Hp, 0, 1e9)
		p.fl = in.Fl & 23 // 1 dead, 2 might, 4 shield, 16 tab hidden (monsters ignore AFK players); bit 8 (PvP) is server-owned
		if dead := p.fl&1 != 0; dead != p.wasDead {
			p.wasDead = dead
			if dead {
				h.onPlayerDown(p)
			}
		}
	case "i":
		if h.applyInfo(p, &in) {
			r.sendAll(jsonBytes(map[string]interface{}{"t": "pi", "p": p.info()}), p)
		}
	case "hit":
		if in.I < 0 || in.I >= len(r.mons) || p.tokens < 1 {
			return
		}
		m := r.mons[in.I]
		if m.dead || dist(p.x, p.y, m.x, m.y) > 1500 {
			return
		}
		p.tokens--
		d := in.D
		if !(d >= 1) {
			d = 1
		}
		if d > 1e12 {
			d = 1e12
		}
		m.hp -= d
		if m.dmgBy == nil {
			m.dmgBy = map[int]*Player{}
		}
		m.dmgBy[p.id] = p
		if m.state == 0 && p.hunted() {
			m.state = 1
			m.target = p
		}
		r.sendNear(m.x, m.y, 1500, []byte(`{"t":"h","i":`+itoa(m.id)+`,"d":`+strconv.FormatFloat(math.Round(d), 'f', 0, 64)+`,"c":`+itoa(clampI(in.Cr, 0, 1))+`}`), p)
		if m.hp <= 0 {
			r.kill(m, p)
		}
	case "pvpm":
		// v5_158 PvP mode: 0 Peaceful, 1 Lawful, 2 Hostile, 3 Carnal (the client sends it in "on"; see pvpCanHit). Everything is checked per hit, there is no timer.
		p.pvpLvl = clampI(in.On, 0, 3)
	case "pvp":
		// v5_158 the old right-click flag is gone (modes replace it); older clients are ignored
	case "phit":
		q := r.players[in.I]
		if q == nil || q == p || !q.joined || p.tokens < 1 || p.fl&1 != 0 || q.fl&1 != 0 || !pvpCanHit(p, q) {
			return
		}
		if dist(p.x, p.y, worldCentre, worldCentre) < townR || dist(q.x, q.y, worldCentre, worldCentre) < townR || dist(p.x, p.y, q.x, q.y) > pvpHitRange[clampI(p.cls, 0, 4)]+pvpHitSlack {
			return
		}
		p.tokens--
		d := in.D
		if !(d >= 1) {
			d = 1
		}
		if d > 1e12 {
			d = 1e12
		}
		df := float64(q.def)
		gap, effLv := p.lv-q.lv, p.lv
		if gap > pvpMaxGap { // v5_159 level compression: a bigger lead counts as pvpMaxGap
			gap, effLv = pvpMaxGap, q.lv+pvpMaxGap
		}
		cs := clampF(float64(gap)/pvpCapGap, 0, 1) // gap dominance D (0 at equal level, 1 at a lead of pvpCapGap)
		pg := pvpGap(effLv, q.lv)
		gapF := pg + (1-pg)*cs // the high-level damage penalty fades out with the gap
		fd := math.Round(d * pvpMult * (1 - defRed(df, effLv)) * gapF)
		hitCap := pvpHitCap + (pvpHitCapMax-pvpHitCap)*cs
		lethal := gap >= pvpLethalGap
		if lethal {
			// overwhelming level lead: the hit is lethal, no cap applies
			if mh := math.Round(float64(q.mh)); fd < mh {
				fd = mh
			}
			hitCap = 1e9
		}
		if cp := math.Round(float64(q.mh) * hitCap); fd > cp && !lethal {
			fd = cp
		}
		// v5_75: the 3 s anti-burst cap (extra hits dealt 1 damage) is removed; only the per-hit cap above still applies.
		if fd < 1 {
			fd = 1
		}
		cr := itoa(clampI(in.Cr, 0, 1))
		ds := strconv.FormatFloat(fd, 'f', 0, 64)
		q.lastHitBy, q.lastHitT = p.id, h.clock()
		q.send([]byte(`{"t":"phurt","d":` + ds + `,"i":` + itoa(p.id) + `,"c":` + cr + `}`))
		p.send([]byte(`{"t":"pdm","v":` + itoa(q.id) + `,"d":` + ds + `,"c":` + cr + `}`))
		ph := []byte(`{"t":"ph","v":` + itoa(q.id) + `,"d":` + ds + `,"c":` + cr + `}`)
		for _, o := range r.players {
			if o != p && o != q && dist(o.x, o.y, q.x, q.y) <= 1500 {
				o.send(ph)
			}
		}
	case "taunt":
		// v5_159 Iron Guardian War Cry: monsters near the caster switch to it (the tank role). Class 2 only, rate limited.
		if p.cls != 2 || !p.hunted() || p.tokens < 1 {
			return
		}
		if now := h.clock(); now-p.tauntAt >= tauntCd {
			p.tauntAt = now
			p.tokens--
			for _, m := range r.mons {
				if m.dead || m.state == 2 {
					continue
				}
				if dist(p.x, p.y, m.x, m.y) <= tauntRadius {
					m.state = 1
					m.target = p
				}
			}
		}
	case "pbuff":
		// v5_159 party support: relay a heal ("heal", d = fraction of the receiver's max HP) or an ATK buff ("atk", d = +fraction) to party mates nearby.
		if p.party == nil || p.fl&1 != 0 || p.tokens < 1 || (in.M != "heal" && in.M != "atk") {
			return
		}
		lim := pbuffHealMax
		if in.M == "atk" {
			lim = pbuffAtkMax
		}
		v := clampF(in.D, 0, lim)
		now := h.clock()
		if !(v > 0) || now-p.pbuffAt < pbuffCd {
			return
		}
		p.pbuffAt = now
		p.tokens--
		msg := []byte(`{"t":"pbf","k":"` + in.M + `","v":` + strconv.FormatFloat(v, 'f', 3, 64) + `,"i":` + itoa(p.id) + `}`)
		for _, q := range p.party.members {
			if q != p && q.joined && q.realm == r && q.fl&1 == 0 && dist(p.x, p.y, q.x, q.y) <= pbuffRadius {
				q.send(msg)
			}
		}
	case "party":
		h.onParty(p, &in)
	case "friend":
		h.onFriend(p, &in)
	case "pg":
		// latency probe: echo the client's timestamp straight back
		p.send([]byte(`{"t":"pg","i":` + itoa(in.I) + `}`))
	case "mine":
		if in.I < 0 || in.I >= nOre || r.oreCd[in.I] > 0 {
			return
		}
		r.oreCd[in.I] = 30
		r.sendAll([]byte(`{"t":"o","i":`+itoa(in.I)+`,"cd":30}`), p)
	case "fx":
		// cosmetic skill/swing effects: forward to nearby players with the sender id spliced in
		if len(raw) < 2 || raw[0] != '{' || len(raw) > 2048 || p.tokens < 1 {
			return
		}
		p.tokens -= .5
		fw := make([]byte, 0, len(raw)+16)
		fw = append(fw, `{"id":`...)
		fw = ai(fw, p.id)
		fw = append(fw, ',')
		fw = append(fw, raw[1:]...)
		r.sendNear(p.x, p.y, 1900, fw, p)
	case "chat":
		if line := strings.TrimSpace(in.M); strings.HasPrefix(line, "/") {
			if h.whisper(p, line) { // private messages are open to every player
				return
			}
			h.command(p, r, line)
			return
		}
		txt := cleanChat(in.M)
		now := time.Now()
		if txt == "" || now.Sub(p.lastChat) < 400*time.Millisecond {
			return
		}
		p.lastChat = now
		msg := jsonBytes(map[string]interface{}{"t": "chat", "id": p.id, "n": p.name, "m": txt, "w": r.wi})
		for _, q := range h.players {
			if q.joined {
				q.send(msg)
			}
		}
	case "world":
		wi := clampI(in.W, 0, len(worldDefs)-1)
		if wi == r.wi {
			p.send(r.worldMsg())
			return
		}
		h.leaveRealm(p)
		h.enterRealm(p, wi)
		h.broadcastOnline()
	}
}

func sameOrigin(r *http.Request) bool {
	o := r.Header.Get("Origin")
	if o == "" {
		return true
	}
	u, err := url.Parse(o)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}

func (h *Hub) serveWS(w http.ResponseWriter, r *http.Request) {
	if !sameOrigin(r) {
		http.Error(w, "bad origin", http.StatusForbidden)
		return
	}
	c, err := wsUpgrade(w, r)
	if err != nil {
		return
	}
	p := &Player{conn: c, out: make(chan []byte, 256)}
	h.in <- evt{kind: evConnect, p: p}
	go p.writer()
	for {
		msg, err := c.readMessage()
		if err != nil {
			break
		}
		h.in <- evt{kind: evMsg, p: p, msg: msg}
	}
	h.in <- evt{kind: evLeave, p: p}
	c.close()
}

/* ---------------------------------------------------------------- private messages
   /w name message   (also /pm /msg /tell /whisper; use quotes for names with spaces: /w "Wind Walker" hi)
   Delivered only to the target and echoed to the sender. Works across worlds. The client adds /r to reply. */

func (h *Hub) whisper(p *Player, line string) bool {
	f := strings.Fields(line)
	if len(f) == 0 {
		return false
	}
	switch strings.ToLower(strings.TrimPrefix(f[0], "/")) {
	case "w", "pm", "msg", "tell", "whisper":
	default:
		return false
	}
	rest := strings.TrimSpace(line[len(f[0]):])
	var name, body string
	if strings.HasPrefix(rest, "\"") {
		if j := strings.Index(rest[1:], "\""); j >= 0 {
			name, body = rest[1:1+j], rest[j+2:]
		}
	} else if i := strings.IndexAny(rest, " \t"); i >= 0 {
		name, body = rest[:i], rest[i+1:]
	} else {
		name = rest
	}
	name = strings.TrimSpace(name)
	txt := cleanChat(body)
	if name == "" || txt == "" {
		p.sysMsg("Usage: /w playername message   (quote names with spaces: /w \"Wind Walker\" hello)")
		return true
	}
	now := time.Now()
	if now.Sub(p.lastChat) < 400*time.Millisecond {
		return true
	}
	var exact, prefix []*Player
	for _, q := range h.players {
		if !q.joined || q.gone {
			continue
		}
		if strings.EqualFold(q.name, name) {
			exact = append(exact, q)
		} else if len(name) >= 2 && strings.HasPrefix(strings.ToLower(q.name), strings.ToLower(name)) {
			prefix = append(prefix, q)
		}
	}
	cand := exact
	if len(cand) == 0 {
		cand = prefix
	}
	switch {
	case len(cand) == 0:
		if h.whisperOffline(p, name, txt, now) { // known player who is offline: queued until they log in
			return true
		}
		p.sysMsg("No player named \"" + name + "\" is online or known.")
		return true
	case len(cand) > 1:
		p.sysMsg("More than one player matches \"" + name + "\". Type the full name.")
		return true
	}
	q := cand[0]
	if q == p {
		p.sysMsg("You cannot whisper to yourself.")
		return true
	}
	p.lastChat = now
	q.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "from", "id": p.id, "n": p.name, "m": txt}))
	p.send(jsonBytes(map[string]interface{}{"t": "pm", "d": "to", "n": q.name, "m": txt}))
	return true
}

/* ---------------------------------------------------------------- admin chat commands
   Chat lines that start with "/" are commands. Only accounts listed with -admin (or ALOTUS_ADMIN) may use them.
   Commands that need the server (boss, bossclear, who, announce) run here; every other command is sent back to that
   player's browser as {"t":"cmd"} and runs there (heal, lvl, coins, speed, minimap ...). */

var adminSet = map[string]bool{}

func (p *Player) sysMsg(text string) {
	p.send(jsonBytes(map[string]interface{}{"t": "sys", "m": text}))
}

func (h *Hub) command(p *Player, r *Realm, line string) {
	if len(line) > 160 {
		return
	}
	if !adminSet[strings.ToLower(p.email)] {
		p.sysMsg("Commands are for admins. Start the server with -admin your@email.com (or set ALOTUS_ADMIN).")
		return
	}
	f := strings.Fields(line)
	if len(f) == 0 {
		return
	}
	cmd := strings.ToLower(strings.TrimPrefix(f[0], "/"))
	switch cmd {
	case "boss":
		if r.wi == arenaWi {
			p.sysMsg("There are no bosses in the arena.")
			return
		}
		n := 1
		if len(f) > 1 {
			if v, err := strconv.Atoi(f[1]); err == nil {
				n = clampI(v, 1, maxBosses)
			}
		}
		lv := 0 // 0 = random level for this world
		if len(f) > 2 {
			if v, err := strconv.Atoi(f[2]); err == nil {
				lv = v
			}
		}
		w := worldDefs[r.wi]
		lim := rimR - 340
		var out []interface{}
		for _, m := range r.mons {
			if n == 0 {
				break
			}
			if !m.boss || !m.dead {
				continue
			}
			a := rand.Float64() * math.Pi * 2
			d := 350 + rand.Float64()*500 // well inside the 2000-unit minimap range
			x := p.x + math.Cos(a)*d
			y := p.y + math.Sin(a)*d
			if dc := dist(x, y, worldCentre, worldCentre); dc > lim {
				x = worldCentre + (x-worldCentre)*lim/dc
				y = worldCentre + (y-worldCentre)*lim/dc
			}
			bl := lv
			if bl <= 0 {
				bl = w.lo + rand.Intn(w.hi-w.lo+1)
			}
			id := m.id
			*m = *newMon(r.wi, id, x, y, rand.Intn(4), bl)
			out = append(out, m.entry())
			n--
		}
		if len(out) == 0 {
			p.sysMsg("All boss slots are in use (" + itoa(maxBosses) + " alive). Use /bossclear first.")
			return
		}
		r.sendAll(jsonBytes(map[string]interface{}{"t": "bs", "b": out}), nil)
		p.sysMsg("Spawned " + itoa(len(out)) + " boss(es) near you. Check the minimap.")
	case "bossclear":
		n := 0
		for _, m := range r.mons {
			if m.boss && !m.dead {
				r.despawn(m)
				n++
			}
		}
		p.sysMsg("Removed " + itoa(n) + " boss(es) from this world.")
	case "who":
		var names []string
		for _, q := range h.players {
			if q.joined {
				names = append(names, q.name+" (Lv "+itoa(q.lv)+", world "+itoa(q.realm.wi+1)+")")
			}
		}
		p.sysMsg("Online " + itoa(len(names)) + ": " + strings.Join(names, ", "))
	case "announce":
		txt := cleanChat(strings.TrimSpace(strings.TrimPrefix(line, f[0])))
		if txt == "" {
			p.sysMsg("Usage: /announce your message")
			return
		}
		msg := jsonBytes(map[string]interface{}{"t": "sys", "m": "[Announcement] " + txt})
		for _, q := range h.players {
			if q.joined {
				q.send(msg)
			}
		}
	default:
		p.send(jsonBytes(map[string]interface{}{"t": "cmd", "m": line}))
	}
}

func leashLose(boss bool) float64 {
	if boss {
		return bossLose
	}
	return monLose
}

func leashHome(boss bool) float64 {
	if boss {
		return bossLeash
	}
	return monLeash
}

// pvpCanHit is the PvP mode rule table (v5_158). a = attacker, b = victim. Keep equal to pvpRule() in web/game.js.
//
//	Peaceful (0): attacks nobody.
//	Lawful   (1): only players in Hostile / Carnal mode; never friends or party.
//	Hostile  (2): anyone except friends and party.
//	Carnal   (3): anyone except party.
//
// A Peaceful victim can be attacked by Hostile / Carnal players. No cooldowns, penalties, zones or clans yet (the safe hub is still no-PvP, checked by the caller).
func pvpCanHit(a, b *Player) bool {
	if a.pvpLvl <= 0 || sameParty(a, b) {
		return false
	}
	if a.pvpLvl >= 3 {
		return true
	}
	if areFriends(a, b) {
		return false
	}
	if a.pvpLvl == 1 {
		return b.pvpLvl >= 2
	}
	return true
}
