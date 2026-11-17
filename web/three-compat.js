/* World of Ascension - Three.js version compatibility (v5_173). Loaded right after three.js, before models3d.js and game.js.
   The game was written for Three r128. On r128 this file changes nothing (T3_LIGHT_K = 1).
   On a newer Three (r152+) it makes the picture come out the same as before:
     - r152+ : colour management is switched off and the renderer outputs linear colour, like r128 did (every colour in the game is a plain hex value)
     - r155+ : lights became physical, so every light intensity has to be multiplied by PI (game.js does that through window.T3_LIGHT_K)
   See THREE_UPGRADE.txt for the upgrade steps. */
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const rev=parseInt(T.REVISION,10)||0;
window.T3_REV=rev;window.T3_LIGHT_K=rev>=155?Math.PI:1;
if(rev>=152){
  if(T.ColorManagement)T.ColorManagement.enabled=false;
  const R0=T.WebGLRenderer;
  if(R0&&T.LinearSRGBColorSpace){
    class R extends R0{constructor(p){super(p);this.outputColorSpace=T.LinearSRGBColorSpace}}
    try{T.WebGLRenderer=R}catch(e){console.warn('three-compat: could not wrap WebGLRenderer (frozen namespace?) - use the bridge in THREE_UPGRADE.txt',e)}
  }
}
})();
