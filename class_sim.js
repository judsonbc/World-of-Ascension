#!/usr/bin/env node
// Rough class comparison, computed from the real skill tables in web/game.js (no hand-copied numbers).
//   node tools/class_sim.js            -> table for levels 1 / 100 / 300 / 600 / 1000
//   node tools/class_sim.js 250        -> a single level
//
// MODEL (gearless, equal-level opponent; it is a balance COMPASS, not a prediction):
//   sustained damage = (10 + 3.5*level) ATK  x  sum over the best 12 attack skills of (damage multiplier / cooldown)  x  crit factor  x  Qi factor
//   Qi factor        = min(1, Qi supply per second over a 60 s fight / Qi demand per second of those skills)
//   burst            = the strongest single skill hit x ATK x crit factor
//   effective HP     = max HP / (1 - defence reduction)        (defence curve of game.go: def / (def + 10 + 3*level), capped at 75%)
// NOT modelled: area damage and multi-hit skills (counted as one hit), poison / pets / traps, shields and heals, mobility, range.
// So the Spirit Summoner (wolves) and Storm Archer (area skills) are UNDER-counted, the Iron Guardian's shields are not in "effective HP".
const vm = require('vm'), fs = require('fs');
const js = fs.readFileSync(__dirname + '/../web/game.js', 'utf8');
const L = js.split('\n');
const a = L.findIndex(l => l.startsWith('const TIER='));
const b = L.findIndex(l => l.includes('if(q.c===4)q.cd='));
const ctx = { Math, console }; vm.createContext(ctx);
vm.runInContext(L.slice(a, b + 1).join('\n') + '\n;globalThis.SK=SKILLS;globalThis.CB=CLB;globalThis.CN=CLASSES.map(c=>c.n);globalThis.HEAL=HEAL_SKILL_T;', ctx);
const SK = ctx.SK, CB = ctx.CB, CN = ctx.CN;
const num = (re, d) => { const m = js.match(re); return m ? Number(m[1]) : d; };
const CRIT_MUL = num(/CRIT_MUL\s*=\s*([\d.]+)/, 2), QI_MUL = num(/const QI_MUL\s*=\s*([\d.]+)/, 1.5);
const PK = 10, PKL = 3, PCAP = 0.75, SLOTS = 12;
const hitRange = [420, 440, 260, 560, 480]; // game.go pvpHitRange

function row(cls, lv) {
  const cb = CB[cls] || {};
  const known = SK.filter(s => (s.c || 0) === cls && s.lv <= lv);
  const best = new Map(); // best (highest multiplier) skill per type
  for (const s of known) if (s.m >= 1 && (!best.has(s.t) || s.m > best.get(s.t).m)) best.set(s.t, s);
  const pick = [...best.values()].sort((x, y) => y.m / y.cd - x.m / x.cd).slice(0, SLOTS);
  const atk = 10 + 3.5 * lv;
  const crit = Math.min(.75, .15 + lv * .0001 + (cb.crit || 0));
  const cf = 1 + crit * (CRIT_MUL - 1);
  const rate = pick.reduce((t, s) => t + s.m / s.cd, 0);
  const demand = pick.reduce((t, s) => t + s.cost / s.cd, 0);
  const pool = (60 + 4 * lv) * (cb.qi || 1) * QI_MUL;
  const supply = 3 + lv * .1 + pool / 60;
  const qf = demand > 0 ? Math.min(1, supply / demand) : 1;
  const dps = atk * rate * cf * qf;
  const burst = atk * Math.max(0, ...pick.map(s => s.m)) * cf;
  const hp = (100 + lv * 32) * (cb.hp || 1);
  const def = lv * 3 * (cb.def || 1);
  const red = Math.min(PCAP, def / (def + PK + lv * PKL));
  const ehp = hp / (1 - red);
  return { cls, lv, dps, burst, ehp, qf, n: pick.length, spd: cb.spd || 1 };
}

const levels = process.argv[2] ? [Number(process.argv[2])] : [1, 100, 300, 600, 1000];
const f = x => x >= 1e6 ? (x / 1e6).toFixed(2) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'k' : x.toFixed(0);
for (const lv of levels) {
  const rs = [0, 1, 2, 3, 4].map(c => row(c, lv));
  const mean = k => rs.reduce((t, r) => t + r[k], 0) / rs.length;
  console.log('\n=== Level ' + lv + ' (gearless) ===');
  console.log('Class            Sustained  vs avg   Burst    vs avg   Eff.HP   vs avg   Qi ok  Move   PvP reach');
  for (const r of rs) {
    console.log(CN[r.cls].padEnd(16) + f(r.dps).padStart(9) + ('x' + (r.dps / mean('dps')).toFixed(2)).padStart(8) + f(r.burst).padStart(9) + ('x' + (r.burst / mean('burst')).toFixed(2)).padStart(8) +
      f(r.ehp).padStart(9) + ('x' + (r.ehp / mean('ehp')).toFixed(2)).padStart(8) + (Math.round(r.qf * 100) + '%').padStart(7) + ('x' + r.spd.toFixed(2)).padStart(7) + String(hitRange[r.cls]).padStart(9));
  }
}
console.log('\nSee the header comment of this file for what the model leaves out.');
