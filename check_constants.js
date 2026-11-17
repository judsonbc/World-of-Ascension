#!/usr/bin/env node
// Checks that the constants that must be equal in the Go server and the web client really are equal.
// Run before every build:  node tools/check_constants.js      (exit code 1 on a mismatch)
const fs = require('fs');
const root = __dirname + '/..';
const go = fs.readFileSync(root + '/game.go', 'utf8');
const js = fs.readFileSync(root + '/web/game.js', 'utf8');

const goConst = n => { const m = go.match(new RegExp('^\\s*' + n + '\\s*=\\s*([-0-9.e+]+)', 'm')); return m ? Number(m[1]) : NaN; }; // anchored to a declaration line, so comments are ignored
const goPair = (a, b) => { const m = go.match(new RegExp('\\b' + a + ',\\s*' + b + '\\s*=\\s*([-0-9.]+),\\s*([-0-9.]+)')); return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN]; };
const jsConst = n => { const m = js.match(new RegExp('\\b' + n + '\\s*=\\s*([-0-9.e+]+)')); return m ? Number(m[1]) : NaN; };

const rows = [
  ['PvP damage multiplier', 'pvpMult', goConst('pvpMult'), 'PVP_MULT', jsConst('PVP_MULT')],
  ['PvP gap dominance span', 'pvpCapGap', goConst('pvpCapGap'), 'PVP_CAP_GAP', jsConst('PVP_CAP_GAP')],
  ['PvP level compression', 'pvpMaxGap', goConst('pvpMaxGap'), 'PVP_MAX_GAP', jsConst('PVP_MAX_GAP')],
  ['Defence curve K', 'pDefK', goConst('pDefK'), 'PDEF_K', jsConst('PDEF_K')],
  ['Defence curve K per level', 'pDefKLv', goConst('pDefKLv'), 'PDEF_K_LV', jsConst('PDEF_K_LV')],
  ['Defence cap', 'pDefCap', goConst('pDefCap'), 'PDEF_CAP', jsConst('PDEF_CAP')],
  ['Arena radius', 'arenaR', goConst('arenaR'), 'ARENA_R', jsConst('ARENA_R')],
  ['Monster lose distance', 'monLose', goPair('monLose', 'monLeash')[0], 'MON_LOSE', jsConst('MON_LOSE')],
  ['Monster leash', 'monLeash', goPair('monLose', 'monLeash')[1], 'MON_LEASH', jsConst('MON_LEASH')],
  ['Boss lose distance', 'bossLose', goPair('bossLose', 'bossLeash')[0], 'BOSS_LOSE', jsConst('BOSS_LOSE')],
  ['Boss leash', 'bossLeash', goPair('bossLose', 'bossLeash')[1], 'BOSS_LEASH', jsConst('BOSS_LEASH')],
];

// pvpHitRange per class vs the ranges the client documents (class order: Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner)
const hr = go.match(/var pvpHitRange = \[5\]float64\{([^}]*)\}/);
const ranges = hr ? hr[1].split(',').map(x => Number(x.trim())) : [];

let bad = 0;
for (const [label, gn, gv, jn, jv] of rows) {
  const ok = gv === jv;
  if (!ok) bad++;
  console.log((ok ? 'OK       ' : 'MISMATCH ') + label.padEnd(28) + gn + '=' + gv + '   ' + jn + '=' + jv);
}
console.log('pvpHitRange per class: ' + (ranges.length === 5 ? ranges.join(', ') : 'NOT FOUND'));
if (ranges.length !== 5) bad++;
if (bad) { console.error('\n' + bad + ' problem(s): fix the constants so the server and the client agree.'); process.exit(1); }
console.log('\nAll shared constants agree.');
