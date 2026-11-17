#!/usr/bin/env node
// Builds web/game.js from the parts in web-src/client/ (v5_173).
//   node tools/build_client.js          write web/game.js
//   node tools/build_client.js --check  exit 1 if web/game.js is not what the parts produce (nothing is written)
// The game is ONE closure on purpose (shared state), so the parts are plain slices of that closure body, stitched in file-name
// order between _head.txt and _tail.txt. Edit the parts, never web/game.js directly (build.bat runs this for you).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'web-src', 'client'), out = path.join(__dirname, '..', 'web', 'game.js');
const parts = fs.readdirSync(dir).filter(f => /^\d+_.*\.js$/.test(f)).sort();
const text = fs.readFileSync(path.join(dir, '_head.txt'), 'utf8') + parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('') + fs.readFileSync(path.join(dir, '_tail.txt'), 'utf8');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== text) { console.error('web/game.js is out of date with web-src/client/. Run: node tools/build_client.js'); process.exit(1); }
  console.log('web/game.js matches web-src/client/ (' + parts.length + ' parts)'); process.exit(0);
}
fs.writeFileSync(out, text);
console.log('web/game.js built from ' + parts.length + ' parts (' + text.length + ' bytes)');
