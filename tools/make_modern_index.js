#!/usr/bin/env node
// Generates web/modern.html: the same page as web/index.html, but loading a CURRENT Three.js from your own copy instead of r128 from the CDN.
//   1. download a Three.js release (https://github.com/mrdoob/three.js/releases) and copy build/three.module.min.js  (r171+: ALSO build/three.core.min.js)
//      into web/
//   2. node tools/make_modern_index.js
//   3. rebuild the server (build.bat) and open  /modern.html   - the normal page (/) keeps using r128, so you can compare the two side by side.
// Why a separate page: modern Three.js is only shipped as an ES module (it cannot be a plain <script> any more), and modules load asynchronously,
// so the game scripts must be started after it. Doing that in index.html itself would change how the default page starts.
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'web');
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const a = html.indexOf('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/');
const endTag = '<script src="tutorial.js"></script>';
const b = html.indexOf(endTag);
if (a < 0 || b < 0 || b < a) { console.error('Could not find the script block in web/index.html (changed layout?).'); process.exit(1); }
const files = [...html.slice(a, b + endTag.length).matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
if (!files.includes('game.js')) { console.error('game.js not found in the script block.'); process.exit(1); }
if (!fs.readdirSync(web).some(f => /^three\.module(\.min)?\.js$/.test(f))) console.warn('WARNING: web/three.module.min.js (or three.module.js) is missing - copy it there before opening /modern.html');
const mod = fs.existsSync(path.join(web, 'three.module.min.js')) ? 'three.module.min.js' : 'three.module.js';
const boot = `<script type="module">
import * as NS from './${mod}';
window.THREE = Object.assign({}, NS);            /* plain, writable copy: the game and three-compat.js expect a global THREE */
for (const f of ${JSON.stringify(files)})
  await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = f; s.onload = ok; s.onerror = () => bad(new Error('failed to load ' + f)); document.head.appendChild(s); });
</script>`;
fs.writeFileSync(path.join(web, 'modern.html'), html.slice(0, a) + boot + html.slice(b + endTag.length));
console.log('web/modern.html written (scripts: ' + files.join(', ') + ')');
