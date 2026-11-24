/* SKFX (v5_327, spell sprites replaced in v5_328) - skill cast effects in the 3D scene.
   Two art packs, both drawn on top of the existing rings / sparks (nothing of the old effects is removed):
     SPELL SPRITES  "Free RPG VFX Sprite Sheet Starter Pack" by Eric VFX Studio (replaces Astral Reliquary): 5 sheets - crescent (Magic Slash 01), spark (Magic Hit 01), blast (Explosion 01), fireball (Explosion 02), rune (Magic Circle 01);
                    web/skillfx/sp_*.png, grid / timing / anchor / cue frame in data.json. The 15 'look' ids used by TABLE / SIGT (starfire, aurora ...) are LOOK = one of the 5 sheets + a colour tint.
                    Billboards are camera-facing quads whose ANCHOR sits on the ground point of the spell; the rune is a flat circle lying on the ground. The animation is time-scaled so its cue frame (the impact) lands a moment after the cast.
     SLASHES        "Attack Slashes": a flat sword ring and a curved claw band (baked from Slash.fbx into data.json) with the slash textures (web/skillfx/sl_*.png).
                    The slash texture is scrolled along the arc (u of the mesh): its bright head leads, the soft trail follows, tinted with the colour of the skill.
   Hooks (client game): SKFX.cast({t,cls,x,y,face,tx,ty,r,col}) when YOU cast a skill (end of useSkill) and when another player's 'an' fx message arrives; SKFX.frame(ctx) once per 3D frame (next to FX3.frame).
   Self-contained like fx3d.js: if anything throws, only this layer switches off.  Off switch: ?skfx=0 in the URL or localStorage woa_skfx='0'.
   Tune: TABLE (which skill plays what), SIGT (the 40 signature skills), FAM (fallback by skill family), and the numbers in cast() / spawn*().
   Rebuild the assets: python3 tools/make_skillfx_vfx.py <Free RPG VFX ... .unitypackage> web/skillfx   (sprites);  python3 tools/make_skillfx.py <Attack Slashes folder> web/skillfx   (slash textures + meshes) */
window.SKFX=(function(){
'use strict';
const killed=()=>{try{return /[?&]skfx=0\b/.test(location.search)||localStorage.getItem('woa_skfx')==='0'}catch(e){return false}};
const clamp=(x,a,b)=>x<a?a:x>b?b:x,sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const DIR='skillfx/';
let S=null,DATA=null,DST=0;                 /* S three.js state (null not built, false off), DATA = data.json, DST 0 not requested 1 loading 2 ready 3 failed */
const TEX={};                               /* name -> THREE.Texture (userData.ok when loaded) */
const FX=[];                                /* running effects */
const PEND=[];                              /* casts that arrived before the 3D layer was ready */

/* ---------------------------------------------------------------- what plays when
   sprite:  {p:name, at:'self'|'front'|'tgt', k:size factor of the reach (sprite size = clamp(R * 2.8 * k, 150, 620)) or z:fixed size, cue:seconds until the impact frame, d:delay, o:front offset}
   slash:   {s:'sword'|'claw', at, R:outer radius, tilt:bank of the plane (0 = flat swing around the body, 1.4 = vertical chop), h:height, n:count (alternating sides), gap:s between, f:forward shift, tx:texture variant} */
/* LOOK: what each sprite id in TABLE / SIGT / FAM really plays = one of the 5 sheets (p), a colour tint (tint, tm = how strongly the sheet's own colours are replaced, 0 = native), sz = size factor of the quad,
   lift = how high a centred billboard floats (fraction of its size), T = fixed play time in s (else the impact frame is timed by the entry's cue) */
const LOOK={};   /* spell sprites removed in v5_329 (none installed): sprite entries in TABLE / SIGT / FAM are skipped, only the slash meshes play */
const SP=(p,o)=>Object.assign({p,at:'self'},o),SL=(s,o)=>Object.assign({s,at:'front'},o);
const TABLE={
  /* v5_343 NORMAL ATTACK of the melee classes (not a skill): a small sword slash, alternating sides (basic_a / basic_b); tx:1 = sword_slash_3 */
  basic_a:[SL('sword',{R:38,tilt:.5,f:.3,tx:1})],
  basic_b:[SL('sword',{R:38,tilt:-.5,f:.3,tx:1})],
  /* slashes (melee) */
  strike:[SL('sword',{R:88,tilt:.55})],
  cleave:[SL('sword',{R:104,tilt:-.5,f:.35})],
  flurry:[SL('claw',{R:80,tilt:.9,n:3,gap:.07})],
  execute:[SL('claw',{R:90,tilt:-.8,n:2,gap:.09}),SP('moonveil',{at:'tgt',z:210,cue:.16})],
  venom:[SL('claw',{R:74,tilt:.7,n:2,gap:.08})],
  siphon:[SL('claw',{R:78,tilt:-.6,n:2,gap:.08})],
  counter:[SP('mirrorglass',{at:'front',z:190,cue:.2,o:50}),SL('sword',{R:92,tilt:.35})],
  bladestorm:[SL('sword',{R:112,tilt:.08,n:2,gap:.16,at:'self',f:0}),SP('moonveil',{at:'self',z:250,cue:.2})],
  nova:[SL('sword',{R:120,tilt:.05,n:2,gap:.14,at:'self',f:0}),SP('moonveil',{at:'self',z:240,cue:.2})],
  drain:[SP('umbral',{at:'self',k:.8,cue:.25})],
  /* projectiles */
  pierce:[SL('sword',{R:84,tilt:1.15,f:.4})],                  /* Sword Wave (melee classes); for ranged classes see CLS_OVR */
  fan:[SP('moonveil',{at:'front',z:230,cue:.18,o:70})],
  kunai:[SL('claw',{R:66,tilt:.6,n:2,gap:.06})],
  arrow:[],
  volley:[SP('rimeglass',{at:'front',z:260,cue:.22,o:150})],
  eagle:[SP('aurora',{at:'self',z:210,cue:.22})],
  stormarrow:[SP('thunderloom',{at:'tgt',k:.9,cue:.2})],
  /* smash */
  bash:[SP('umbral',{at:'front',z:190,cue:.2,o:46})],
  hammer:[SP('briarheart',{at:'front',k:.9,cue:.22,o:70})],
  quake:[SP('briarheart',{at:'self',k:1.05,cue:.24})],
  shockwave:[SP('tidal',{at:'front',k:.62,cue:.22,o:110})],
  leap:[SL('sword',{R:96,tilt:1.2,f:.35}),SP('starfire',{at:'tgt',z:230,cue:.24})],
  /* dashes */
  shadowstep:[SP('mothgate',{at:'self',z:200,cue:.2}),SL('sword',{R:100,tilt:.6,at:'tgt',f:0,d:.08,tx:2})],   /* v5_343 a sword slash through the target right after you land (tx:2 = sword_slash_4) */
  rush:[SL('sword',{R:100,tilt:.25,f:.45})],
  gale:[SP('aurora',{at:'self',z:230,cue:.2})],
  charge:[SP('tidal',{at:'front',z:230,cue:.2,o:80}),SL('sword',{R:96,tilt:.2,f:.45})],
  /* heals / buffs */
  heal:[SP('aurora',{at:'self',z:220,cue:.2})],
  mend:[SP('tideglass',{at:'self',z:210,cue:.22})],
  soulheal:[SP('aurora',{at:'self',z:220,cue:.2})],
  might:[SP('runebloom',{at:'self',z:200,cue:.2})],
  ironskin:[SP('tideglass',{at:'self',z:190,cue:.2})],
  bulwark:[SP('tideglass',{at:'self',z:220,cue:.2})],
  guardian:[SP('tideglass',{at:'self',z:210,cue:.2})],
  roar:[SP('umbral',{at:'self',z:230,cue:.2})],
  smoke:[SP('mothgate',{at:'self',z:190,cue:.2})],
  wolves:[SP('mothgate',{at:'self',z:210,cue:.22})],
  /* area / explosions / lightning */
  soulburst:[SP('eventide',{at:'self',k:.95,cue:.3})],
  rain:[SP('rimeglass',{at:'tgt',k:1.05,cue:.25})],
  wail:[SP('umbral',{at:'self',k:1,cue:.25})],
  harvest:[SP('thornbound',{at:'self',k:.95,cue:.25})],
  blast:[SP('starfire',{at:'tgt',z:260,cue:.24})],
  meteor:[SP('starfire',{at:'tgt',k:1.1,cue:.26})],
  spiritbomb:[SP('eventide',{at:'tgt',k:.75,cue:.3})],
  trap:[SP('thornbound',{at:'tgt',z:260,cue:.24})],
  chain:[SP('thunderloom',{at:'tgt',z:260,cue:.2})],
  chains:[SP('thunderloom',{at:'tgt',z:260,cue:.2})]
};
/* a few skills share a type id between classes: the ranged classes' 'pierce' is a shot, not a sword wave */
const CLS_OVR={pierce:{3:[SP('rimeglass',{at:'front',z:190,cue:.2,o:90})],4:[SP('aurora',{at:'front',z:190,cue:.2,o:90})]}};
/* the 40 signature skills (SIGD in game.js) */
const SIGT={
  sg_c25:[SP('aurora',{z:240})],sg_c50:[SP('mirrorglass',{at:'front',z:230,o:40})],sg_c100:[SP('runebloom',{k:1.3})],sg_c200:[SP('rimeglass',{at:'tgt',k:1.25})],
  sg_c300:[SP('runebloom',{at:'tgt',k:1.2})],sg_c500:[SP('mothgate',{z:230})],sg_c750:[SL('sword',{R:150,tilt:1.35,f:.5,tx:2}),SP('moonveil',{at:'front',z:420,cue:.3,o:200})],
  sg_c1000:[SP('gilded',{z:330,cue:.25})],
  sg_n25:[SP('mothgate',{z:210})],sg_n50:[SP('moonveil',{z:230}),SL('claw',{R:80,tilt:.8,n:2,gap:.08})],sg_n100:[SP('umbral',{at:'tgt',z:240})],sg_n200:[SP('rimeglass',{at:'front',z:300,o:120})],
  sg_n300:[SP('thornbound',{at:'tgt',k:1.2})],sg_n500:[SP('mothgate',{at:'tgt',z:230}),SL('claw',{R:92,tilt:-.8,n:3,gap:.08,at:'tgt'})],
  sg_n750:[SP('moonveil',{at:'tgt',k:1.3,cue:.3}),SL('sword',{R:140,tilt:.75,at:'tgt',f:0}),SL('sword',{R:140,tilt:-.75,at:'tgt',f:0,d:.12,tx:1})],
  sg_n1000:[SP('eventide',{z:330,cue:.3}),SL('claw',{R:110,tilt:.5,n:4,gap:.1,at:'self',f:0})],
  sg_g25:[SP('tideglass',{z:230})],sg_g50:[SP('thornbound',{z:220})],sg_g100:[SP('tidal',{at:'front',z:300,o:130}),SL('sword',{R:110,tilt:.2,f:.5})],
  sg_g200:[SP('eventide',{z:280,cue:.3})],sg_g300:[SP('briarheart',{k:1.1})],sg_g500:[SP('briarheart',{at:'tgt',k:1.2,cue:.3}),SP('starfire',{at:'tgt',k:1.1,cue:.3,d:.1})],
  sg_g750:[SP('briarheart',{z:300})],sg_g1000:[SP('gilded',{z:340,cue:.25}),SP('briarheart',{z:300,d:.12})],
  sg_a25:[SP('aurora',{z:230})],sg_a50:[SP('starfire',{at:'front',z:280,o:200,cue:.3})],sg_a100:[SP('rimeglass',{at:'front',z:300,o:130})],sg_a200:[SP('thornbound',{at:'tgt',k:1.2})],
  sg_a300:[SP('thunderloom',{at:'tgt',z:300})],sg_a500:[SP('rimeglass',{at:'front',z:320,o:160,cue:.3})],sg_a750:[SP('starfire',{at:'tgt',k:1.2,cue:.3})],sg_a1000:[SP('thunderloom',{z:320})],
  sg_s25:[SP('aurora',{z:230})],sg_s50:[SP('runebloom',{z:230})],sg_s100:[SP('mothgate',{z:280})],sg_s200:[SP('thunderloom',{at:'tgt',z:320})],sg_s300:[SP('umbral',{z:280})],
  sg_s500:[SP('tidal',{at:'front',z:360,o:170})],sg_s750:[SP('mothgate',{z:320})],sg_s1000:[SP('eventide',{at:'tgt',k:1.1,cue:.35})]
};
/* family fallback for a type this table does not know yet (same families as SKFAM in game.js) */
const FAM={proj:[SP('rimeglass',{at:'front',z:200,o:90})],lightning:[SP('thunderloom',{at:'tgt',z:240})],slash:[SL('sword',{R:90,tilt:.5})],smash:[SP('briarheart',{at:'front',k:.9,o:60})],
  dash:[SP('mothgate',{z:190})],heal:[SP('aurora',{z:210})],buff:[SP('tideglass',{z:200})],aoe:[SP('umbral',{k:.9})],explosion:[SP('starfire',{at:'tgt',k:1})]};
const FAMOF={pierce:'proj',fan:'proj',kunai:'proj',arrow:'proj',volley:'proj',eagle:'proj',stormarrow:'lightning',strike:'slash',cleave:'slash',flurry:'slash',execute:'slash',venom:'slash',siphon:'slash',counter:'slash',bladestorm:'slash'};
const SLX={sword:['sword_slash','sword_slash_3','sword_slash_4'],claw:['claw_slash','claw_slash_2','claw_slash_3']};

/* ---------------------------------------------------------------- shaders */
const SPR_V='uniform vec2 uAnc;uniform float uSize;uniform float uPush;varying vec2 vUv;\n'+
  'void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=(position.xy-uAnc)*uSize;mv.z+=uPush;gl_Position=projectionMatrix*mv;}';
const SPR_F='uniform sampler2D map;uniform vec4 uF;uniform float uA;uniform vec3 uTint;uniform float uTm;varying vec2 vUv;\n'+
  'void main(){vec4 c=texture2D(map,uF.xy+vUv*uF.zw);float a=c.a*uA;if(a<.01)discard;\n'+
  'float l=dot(c.rgb,vec3(.299,.587,.114));vec3 t=uTint*(.12+l*1.05);t=mix(t,vec3(1.),smoothstep(.88,1.,l)*.35);\n'+
  'gl_FragColor=vec4(mix(c.rgb,t,uTm),a);}';
const GR_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';   /* the flat ground circle (rune): a plain quad lying on the ground */
const SLS_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
/* the slash texture is scrolled along the arc (uSc -0.95 -> +0.45): its bright head (small u) leads, the soft trail follows; the arc ends fade out so nothing pops at the mesh edge */
const SLS_F='uniform sampler2D map;uniform float uA;uniform vec3 uTint;uniform float uSc;varying vec2 vUv;\n'+
  'void main(){float x=vUv.x+uSc;if(x<=0.||x>=1.)discard;vec4 c=texture2D(map,vec2(x,vUv.y));\n'+
  'float em=smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x);\n'+
  'float l=dot(c.rgb,vec3(.3333));vec3 col=mix(uTint*(.4+l*1.5),vec3(1.),smoothstep(.62,.98,l));\n'+
  'float a=c.a*em*uA;if(a<.01)discard;gl_FragColor=vec4(col,a);}';

/* ---------------------------------------------------------------- data + textures */
function loadData(){
  if(DST)return;DST=1;
  fetch(DIR+'data.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(d=>{DATA=d;DST=2}).catch(e=>{DST=3;console.warn('SKFX data not available, skill effects off: '+(e&&e.message||e))});
}
function tex(name,slash){
  let t=TEX[name];if(t)return t;
  const T=S.T;t=TEX[name]=new T.Texture();t.userData={ok:false};
  const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true;t.userData.ok=true};im.onerror=()=>{t.userData.bad=true};im.src=DIR+(slash?'sl_':'sp_')+name+'.png';
  t.generateMipmaps=false;
  if(slash){t.minFilter=t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping}
  else{t.minFilter=t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping}   /* painted sprites: smooth */
  return t;
}
function build(c){
  const T=c.THREE;S={T,sc:c.T3.sc,pg:new T.PlaneGeometry(1,1),mg:{},tint:new T.Color()};
  for(const k of ['sword','claw']){
    const m=DATA.mesh[k],g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(m.p),3));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(m.uv),2));g.setIndex(m.i);
    S.mg[k]=g;
  }
  setTimeout(()=>{try{for(const k of Object.keys(DATA.spells))tex(k,false);for(const v of SLX.sword.concat(SLX.claw))tex(v,true)}catch(e){}},4000);   /* warm all sheets / slash textures 4 s after start-up (about 2 MB, cached by the service worker); a cast before its texture is there just skips that effect */
}

/* ---------------------------------------------------------------- casting */
/* o = {t: skill type, cls, x, y, face, tx, ty (target or null), r (reach), col, remote} */
function cast(o){
  if(S===false||!o||!o.t)return;
  o.ts=performance.now();
  if(S===null||DST!==2){if(PEND.length<6)PEND.push(o);if(DST===0)loadData();return}
  try{run(o)}catch(e){console.warn('SKFX cast failed:',e)}
}
const SKILL_FX_T=.9;   /* v5_349 slashes start when the hit lands (SKILL_WIND = .6 s after the press) and end with the 1.5 s lock: 1.5 - .6 */   /* v5_344 = SKILL_GCD in game.js: skill slashes stay visible (and fade out) until the global skill lock ends */
function run(o){
  let list=SIGT[o.t];
  if(!list){const ov=CLS_OVR[o.t];list=(ov&&ov[o.cls|0])||TABLE[o.t];}
  if(!list){const f=FAMOF[o.t];list=f?FAM[f]:null}
  if(!list||!list.length)return;
  if(o.t.charAt(0)==='b'&&o.t.indexOf('basic')===0&&FX.length>=(S.max||14)-4)return;   /* v5_343 normal-attack slashes never push skill effects out of the pool */
  const R=clamp(+o.r||150,60,520),f=+o.face||0,now=performance.now()/1000;
  for(const e of list){
    let px=o.x,py=o.y;
    const front=(d)=>{px=o.x+Math.cos(f)*d;py=o.y+Math.sin(f)*d};
    if(e.at==='front')front(e.o!==undefined?e.o:clamp(R*.5,40,200));
    else if(e.at==='tgt'){if(o.tx!=null&&o.ty!=null){px=o.tx;py=o.ty}else front(clamp(R*.6,60,240))}
    const ang=e.at==='tgt'&&o.tx!=null?Math.atan2(py-o.y,px-o.x):f;
    if(e.p)spawnSprite(e,px,py,R,now+(e.d||0));
    else spawnSlash(e,e.at==='tgt'?px:o.x,e.at==='tgt'?py:o.y,ang,o.col,now+(e.d||0),o.t.indexOf('basic')===0?.34:Math.max(.34,SKILL_FX_T-(e.d||0)));   /* 'front' slashes start at the caster, the arc is pushed forward by e.f */
  }
  while(FX.length>(S.max||14))kill(FX.shift());
}
function spawnSprite(e,x,y,R,t0){
  const lk=LOOK[e.p];if(!lk)return;
  const m=DATA.spells[lk.p];if(!m)return;
  const t=tex(lk.p,false);if(!t.userData.ok)return;          /* sheet still loading: skip this one rather than play it late */
  const T=S.T,size=(e.z||clamp(R*2.8*(e.k||1),150,620))*(lk.sz||1),gr=!!m.ground;
  const ms=m.ms,tot=ms.reduce((a,b)=>a+b,0);let cueMs=0;for(let i=0;i<m.cue&&i<ms.length;i++)cueMs+=ms[i];
  const pt=e.T||lk.T;
  const rate=pt?clamp(tot/1000/pt,.5,3):clamp(cueMs/1000/(e.cue||.22),.85,2.3);   /* play faster so the impact frame lands about e.cue s after the cast (or the whole sheet in T s) */
  const mat=new T.ShaderMaterial({uniforms:{map:{value:t},uF:{value:new T.Vector4(0,0,1/m.cols,1/m.rows)},uA:{value:1},uTint:{value:new T.Color(lk.tint||'#ffffff')},uTm:{value:lk.tint?(lk.tm===undefined?.8:lk.tm):0},
      uAnc:{value:new T.Vector2(m.ax-.5,.5-m.ay)},uSize:{value:size},uPush:{value:size*.28}},
    vertexShader:gr?GR_V:SPR_V,fragmentShader:SPR_F,transparent:true,depthWrite:false,depthTest:true,fog:false,polygonOffset:gr,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const mesh=new T.Mesh(S.pg,mat);mesh.frustumCulled=false;mesh.renderOrder=gr?58:60;mesh.visible=false;
  if(gr){mesh.rotation.set(-Math.PI/2,0,0);mesh.scale.set(size,size,1)}     /* lies flat on the ground, the circle is round again (un-squashed in the sheet) */
  S.sc.add(mesh);
  FX.push({k:0,mesh,mat,t0,x,y,ms,cols:m.cols,rows:m.rows,dur:tot/1000/rate,rate,h:gr?3:1+(e.y!==undefined?e.y:(lk.lift||0)*size)});
}
function spawnSlash(e,x,y,ang,col,t0,life){   /* v5_344 life = how long one slash lives (skills: until SKILL_FX_T after the cast, normal attacks: .34) */
  const T=S.T,n=e.n||1,vars=SLX[e.s];
  for(let i=0;i<n;i++){
    const name=vars[e.tx!==undefined?e.tx%vars.length:(Math.random()*vars.length)|0],t=tex(name,true);if(!t.userData.ok)continue;
    const mat=new T.ShaderMaterial({uniforms:{map:{value:t},uA:{value:1},uTint:{value:new T.Color(col||'#cfe8ff')},uSc:{value:-.95}},
      vertexShader:SLS_V,fragmentShader:SLS_F,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,fog:false});
    const root=new T.Group(),tilt=new T.Group(),mesh=new T.Mesh(S.mg[e.s],mat);
    const sgn=i&1?-1:1,sc=(e.R||90)/7.25;
    mesh.rotation.set(-Math.PI/2,0,Math.PI);mesh.scale.set(sc,sc*(i&1?-1:1),sc);   /* native ring (axis Z, opening toward +X) -> flat ring, the arc in front; every second hit is mirrored */
    tilt.rotation.x=(e.tilt||0)*sgn;tilt.add(mesh);root.add(tilt);root.rotation.y=-ang;root.visible=false;mesh.frustumCulled=false;mesh.renderOrder=61;S.sc.add(root);
    FX.push({k:1,mesh:root,mat,t0:t0+i*(e.gap||.1),x,y,ang,fwd:(e.f===undefined?.3:e.f)*(e.R||90),h:e.h||34,dur:Math.max(.2,(life||.34)-i*(e.gap||.1)),rate:1,sw:sgn,seed:0});
  }
}
function kill(f){if(!f)return;try{S.sc.remove(f.mesh);f.mat.dispose()}catch(e){}}

/* ---------------------------------------------------------------- per frame (called with the same context object as FX3.frame) */
function frame(c){
  if(S===false)return;
  if(S===null){if(killed()){S=false;return}if(DST===0)loadData();if(DST===3){S=false;return}if(DST!==2)return;build(c);S.max=c.LOW?7:14}
  const gh=c.gh3,C=c.C,now=performance.now()/1000;
  if(PEND.length){const q=PEND.splice(0),n=performance.now();for(const o of q)if(n-o.ts<800)cast(o)}   /* casts from before the layer was ready (not older than .8 s) */
  for(let i=FX.length-1;i>=0;i--){
    const f=FX[i],age=now-f.t0;
    if(age<0){f.mesh.visible=false;continue}
    if(age>=f.dur){kill(f);FX.splice(i,1);continue}
    const u=age/f.dur,m=f.mesh;m.visible=true;
    const gy=gh(f.x,f.y);
    if(f.k===0){   /* sprite: pick the frame from the (rate-scaled) frame times */
      let ta=age*f.rate*1000,fr=0;const ms=f.ms;while(fr<ms.length-1&&ta>=ms[fr]){ta-=ms[fr];fr++}
      const U=f.mat.uniforms.uF.value;U.set((fr%f.cols)/f.cols,1-(((fr/f.cols)|0)+1)/f.rows,1/f.cols,1/f.rows);f.mat.uniforms.uA.value=1-sm((u-.86)/.14);   /* last 14 %: fade out */
      m.position.set(f.x-C,gy+f.h,f.y-C);
    }else{         /* slash: the head sweeps the arc in ~75 % of the time, the trail fades after it */
      const U=f.mat.uniforms,e=1-Math.pow(1-clamp(u/.85,0,1),2.2);U.uSc.value=-.95+1.4*e;   /* fast swing that slows down at the end */
      U.uA.value=clamp(u*12,0,1)*(1-sm((u-.55)/.45));
      const s=.9+.14*sm(u);m.scale.setScalar(s);
      m.position.set(f.x-C+Math.cos(f.ang)*f.fwd,gy+f.h,f.y-C+Math.sin(f.ang)*f.fwd);
    }
  }
}
function dispose(){
  for(const f of FX)kill(f);FX.length=0;
  try{if(S){S.pg.dispose();for(const k in S.mg)S.mg[k].dispose()}for(const k in TEX)TEX[k].dispose()}catch(e){}
  S=false;
}
return {cast,frame,dispose,_fx:FX,_table:TABLE,_sig:SIGT};
})();
