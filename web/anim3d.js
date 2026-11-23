/* ANIM3D (v5_322) - the moves of the Quaternius Universal Animation Library 1 + 2 (CC0) on the VRM avatars.
   Only the ANIMATION changes: the avatars (models, hair, outfits, weapons, armor fire, aura ...) are untouched.
   Data: web/anims/ual.json + ual.bin, baked by tools/bake_anims.py (82 clips, 30 fps, already retargeted to the VRM humanoid bones:
   per frame 20 bone rotations in the "T-pose = identity" frame that VRM3D.setB() expects, plus the hips translation).
   How it works
     - VRM3D.pose(R,P) first does the old procedural pose (still the fallback while the pack loads or with ?anim=0), then calls ANIM3D.apply(R,P,v), which overwrites the bones.
     - BASE layer (one clip, cross-faded when the state changes):  idle (combat idle when the weapon is drawn) | walk / jog / sprint (clip phase follows the DISTANCE moved, so feet do not slide)
       | jump (start -> loop -> land) | roll / back hop (dodge, locked to the dodge progress P.dgU) | death + get-up | mining | teleport channel | emotes (/emote)
     - ACTION layer (upper body while you move, whole body when you stand): basic attacks (per class, combos), skills / casts, being hit, potion, one-shot emotes.
       A clip starts a little before its strike moment (the moment the hand is fastest, baked as "hits"), so the hit lands when the game applies it.
   v5_330: every skill type and all 40 signature skills have their own move (SKILL), using clips that were never played before (Sword_Attack, Spell_Simple_Exit, Pistol_Aim_*, Slide_Exit, Melee_Hook_Rec,
           Sword_Regular_A_Rec / B_Rec) and clips that only the /emote command used (OverhandThrow, Zombie_Scratch, Farm_*, Consume, Idle_Rail_Call, Push_Loop, Idle_Shield_Loop, Idle_Lantern_Loop ...).
   v5_331: cheaper maths (sqrt, nlerp for small turns, no blend maths for fully weighted bones) + level of detail: ANIM3D.due(R,P) lets the game thin out the poses of OTHER players (R.lodS = stride,
           distance / device / frame-time dependent; busy rigs are never skipped). VRM3D.pose no longer computes the procedural pose when the clips drive the rig. node tools/test_anim_lod.js, test_vrm_lod.js, bench_anim3d.js.
   v5_326: attack moves are eased (smoothstep in/out, blends between the parts of a move and between combo hits).
   Off switch: ?anim=0 in the URL.   Tune: CLASS, SKILL, EMOTES and the constants below. */
(function(){
'use strict';
const off=typeof location!=='undefined'&&/[?&]anim=0(&|$)/.test(location.search);
let T=null,D=null,FR=null,ST=0,PRM=null;   /* ST 0 not started, 1 loading, 2 ready, 3 failed */
const NB=20,SF=83,Q4=NB*4;
const SCR=new Float32Array(SF),SEGFADE=.09,XFADE=.15,NLERP=.98;   /* v5_326 scratch pose, fade between the parts of one move, fade from one move to the next */                  /* bones, floats per frame (80 rotation + 3 hips position) */
let BN=[],tq=null;
const clamp=(x,a,b)=>x<a?a:x>b?b:x,sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};

/* ---------------------------------------------------------------- what plays when */
/* basic attack combos per class: [clip, strike time (s)] - cycled, reset after 1.4 s without an attack */
const CLASS=[
  /* Cultivator  (sword)   */{atk:[['Sword_Regular_A',.233],['Sword_Regular_B',.233],['Sword_Regular_Combo',.7],['Sword_Regular_C',.633]],idle:'Sword_Idle',cast:[['Spell_Simple_Enter',0,.45,1.7],['Spell_Simple_Shoot',0,.38,1.2]]},
  /* Night Blade (daggers) */{atk:[['Punch_Jab',.167],['Punch_Cross',.2],['Melee_Hook',.233],['Punch_Jab',.167]],idle:'Sword_Idle',cast:[['Sword_Dash',0,.55,1.6]]},
  /* Iron Guardian (hammer)*/{atk:[['Sword_Heavy_Combo',.433],['Melee_Hook',.233],['Sword_Heavy_Combo',1.167],['Shield_OneShot',.067],['Sword_Heavy_Combo',1.8],['Sword_Heavy_Combo',2.567]],idle:'Sword_Idle',cast:[['Shield_OneShot',0,.6,1.3]]},
  /* Storm Archer (bow)    */{atk:[['Pistol_Shoot',.033],['Pistol_Shoot',.033],['Pistol_Shoot',.033]],idle:'Pistol_Idle_Loop',cast:[['Pistol_Shoot',0,.5,1.2]]},
  /* Spirit Summoner (staff)*/{atk:[['Spell_Simple_Shoot',.033],['Spell_Simple_Shoot',.033],['Melee_Hook',.233]],idle:'Spell_Simple_Idle_Loop',cast:[['Spell_Simple_Enter',0,.45,1.7],['Spell_Simple_Shoot',0,.38,1.2]]}];
/* skills with their own move: type id (P.skT) -> [[clip, from, to, rate] ...]  (v5_330: every skill and all 40 signature skills have one; before only 18 skill types did, the rest played the class cast move)
   segments play one after the other (blended). from / to / rate are in the clip's own seconds; the clip's strike moment ("hits" in ual.json) should land .15-.3 s after the start. */
const SPELL=[['Spell_Simple_Enter',0,.45,1.7],['Spell_Simple_Shoot',0,.38,1.2]];
const BLESS=[['Spell_Simple_Enter',0,.45,1.5],['Spell_Simple_Exit',0,.43,1.2]];                       /* both hands up, then let them sink: heals, blessings */
const CALL=[['Idle_Rail_Call',0,.95,1.3]];                                                            /* arm raised, calling: war cry, summons, rallying */
const THROW=[['OverhandThrow',.1,.8,1.3]];
const PLANT=[['Farm_PlantSeed',.9,1.9,1.5]];                                                          /* bend and plant: lotus field, banner, bloom, traps in the ground */
const SLIDE=[['Slide_Start',0,.45,1.6],['Slide_Exit',0,.4,1.4]];                                      /* low slide and recover: shadow step, gale step, windrunner */
const CLAW=[['Zombie_Scratch',.25,1.1,1.4]];                                                          /* clawing swipe: venom, blood fang, vampiric edge */
const SWORDS3=[['Sword_Regular_A',0,.43,1.6],['Sword_Regular_B',0,.53,1.6],['Sword_Regular_A',0,.43,1.7]];
const BLOCK=[['Sword_Block',0,.7,1.4]];
/* v5_342 more moves from the clips that only /emote used */
const KNEEL=[['Fixing_Kneeling',0,1.1,1.5]];                                                         /* down on one knee, a hand to the ground: summoning from the earth */
const TORCH=[['Idle_Torch_Loop',0,1.0,1.1],['Idle_Rail_Call',0,.9,1.3]];                              /* raise a hand / torch, then call */
const PULL=[['Spell_Simple_Enter',0,.4,1.7],['PickUp_Table',.3,.87,1.3]];                             /* reach out, then pull back: chains, binding */
const LSLIDE=[['Slide_Start',0,.4,1.7],['Slide_Loop',.2,.9,1.5]];                                     /* a longer slide: gale step, windrunner, afterimage */
const AIMUP=[['Pistol_Aim_Up',0,.17,1],['Pistol_Shoot',0,.55,1.1]],AIMDN=[['Pistol_Aim_Down',0,.17,1],['Pistol_Shoot',0,.55,1.1]],AIMNE=[['Pistol_Aim_Neutral',0,.17,1],['Pistol_Shoot',0,.55,1.1]];   /* archer: the bow stays aimed (up = rain / sky, down = traps, level = shots) */
const SKILL={
  /* Cultivator */
  pierce:[['Sword_Regular_A',0,.43,1.3],['Sword_Regular_A_Rec',0,.55,1.4]],nova:[['Sword_Regular_Combo',1.0,2.0,1.4]],strike:[['Sword_Attack',.05,.95,1.3]],
  cleave:[['Sword_Regular_B',0,.53,1.3],['Sword_Regular_B_Rec',.3,.85,1.3]],leap:[['NinjaJump_Start',0,.4,1.4],['Sword_Attack',.15,.9,1.4]],flurry:SWORDS3,
  heal:BLESS,mend:[['Farm_Watering',.2,1.6,1.4]],meteor:[['Spell_Simple_Enter',0,.45,1.6],['OverhandThrow',.1,.8,1.3]],chain:SPELL,might:[['Idle_Shield_Break',0,.6,1.5]],
  drain:[['Consume',.15,1.3,1.3]],fan:[['Melee_Hook',0,.47,1.3],['Melee_Hook_Rec',.05,.5,1.3]],
  /* Night Blade */
  kunai:THROW,shadowstep:SLIDE,venom:CLAW,bladestorm:[['Sword_Regular_Combo',1.0,2.1,1.5]],smoke:[['Crouch_Idle_Loop',.2,.9,1.3]],
  execute:[['Sword_Attack',.05,.95,1.3]],siphon:CLAW,rush:[['Sword_Dash',0,.55,1.6]],
  /* Iron Guardian */
  bash:[['Shield_OneShot',0,.6,1.3]],bulwark:[['Idle_Shield_Loop',0,.9,1.5]],quake:[['Sword_Heavy_Combo',2.3,3.2,1.2]],charge:[['Shield_Dash',0,.55,1.4]],roar:[['Idle_Shield_Break',0,.6,1.5],['Idle_Rail_Call',0,.9,1.4]],
  counter:[['Sword_Block',0,.4,1.6],['Melee_Hook',0,.47,1.3]],hammer:[['Sword_Heavy_Combo',1.55,2.35,1.2]],ironskin:BLOCK,shockwave:[['Sword_Heavy_Combo',.2,1.0,1.2]],
  /* Storm Archer */
  arrow:AIMNE,volley:[['Pistol_Aim_Neutral',0,.17,1],['Pistol_Shoot',0,.4,1.4],['Pistol_Shoot',0,.4,1.5]],rain:AIMUP,blast:AIMNE,eagle:[['Pistol_Aim_Up',0,.17,1],['Pistol_Idle_Loop',.3,.9,1]],gale:LSLIDE,trap:[['PickUp_Table',0,.87,1.3]],stormarrow:AIMUP,
  /* Spirit Summoner */
  wolves:KNEEL,soulburst:[['Spell_Simple_Enter',0,.45,1.6],['Interact',.25,1.0,1.4]],soulheal:BLESS,wail:[['Idle_Shield_Break',0,.6,1.5],['Spell_Simple_Shoot',0,.4,1.2]],chains:PULL,harvest:[['Farm_Harvest',.15,1.6,1.4]],guardian:TORCH,
  spiritbomb:[['Spell_Simple_Enter',0,.5,1.4],['OverhandThrow',.1,.8,1.3]],
  /* signature skills (SIGD in game.js) */
  sg_c25:BLESS,sg_c50:BLOCK,sg_c100:PLANT,sg_c200:[['Spell_Simple_Enter',0,.5,1.4],['Sword_Attack',.1,.9,1.3]],sg_c300:[['Sword_Regular_Combo',0,1.4,1.5]],sg_c500:TORCH,
  sg_c750:[['Sword_Heavy_Combo',0,.9,1]],sg_c1000:[['Spell_Simple_Enter',0,.5,1.2],['Idle_Rail_Call',0,1.1,1.1]],
  sg_n25:LSLIDE,sg_n50:CLAW,sg_n100:[['Punch_Cross',0,.5,1.3]],sg_n200:[['OverhandThrow',.1,.8,1.6],['OverhandThrow',.1,.8,1.7]],sg_n300:[['Crouch_Idle_Loop',.1,.5,1.3],['Farm_PlantSeed',.9,1.9,1.5]],
  sg_n500:[['Slide_Start',0,.3,1.8],['Melee_Hook',0,.47,1.3],['Melee_Hook_Rec',.1,.5,1.3]],sg_n750:[['Melee_Hook',0,.47,1.3],['Sword_Regular_B',0,.53,1.5]],
  sg_n1000:[['Punch_Jab',0,.4,1.7],['Punch_Cross',0,.42,1.7],['Melee_Hook',0,.47,1.6],['Sword_Attack',.1,.8,1.4]],
  sg_g25:[['Idle_Shield_Loop',0,.9,1.4]],sg_g50:BLOCK,sg_g100:[['Shield_Dash',0,.55,1.4]],sg_g200:[['Idle_Shield_Loop',0,.6,1.4],['Sword_Heavy_Combo',1.55,2.35,1.2]],sg_g300:[['PickUp_Table',0,.87,1.2],['Farm_PlantSeed',.9,1.9,1.5]],
  sg_g500:[['Sword_Heavy_Combo',1.4,2.4,1]],sg_g750:[['Fixing_Kneeling',0,1.0,1.5],['Idle_Rail_Call',0,.9,1.4]],sg_g1000:[['Idle_Shield_Break',0,.6,1.4],['Idle_Rail_Call',0,.9,1.3]],
  sg_a25:LSLIDE,sg_a50:AIMUP,sg_a100:AIMUP,sg_a200:[['PickUp_Table',0,.87,1.3],['Pistol_Aim_Down',0,.17,1],['Pistol_Shoot',0,.55,1.1]],sg_a300:AIMNE,sg_a500:[['Pistol_Aim_Neutral',0,.17,1],['Pistol_Idle_Loop',.3,1,1],['Pistol_Shoot',0,.55,1]],sg_a750:AIMUP,sg_a1000:AIMUP,
  sg_s25:[['Idle_Lantern_Loop',.3,1.3,1.3]],sg_s50:[['Fixing_Kneeling',0,.9,1.6],['Zombie_Scratch',.3,1.2,1.5]],sg_s100:[['Idle_Torch_Loop',0,1.0,1.2],['Spell_Simple_Shoot',0,.4,1]],sg_s200:[['Spell_Simple_Enter',0,.5,1.4],['Zombie_Scratch',.3,1.1,1.5],['Spell_Simple_Shoot',0,.38,1.2]],
  sg_s300:[['Idle_Lantern_Loop',.3,1.3,1.2],['Idle_Rail_Call',0,1,1.2]],sg_s500:[['Spell_Simple_Enter',0,.5,1.3],['Sword_Attack',.05,.95,1.2]],sg_s750:[['Fixing_Kneeling',0,.9,1.4],['Idle_Rail_Call',0,1.1,1.2]],
  sg_s1000:[['Spell_Simple_Enter',0,.5,1.4],['Spell_Simple_Shoot',0,.4,1],['Spell_Simple_Exit',0,.43,1.2]]};
/* named moves for /emote and for the game's one-shot events: key -> [clip, loop, upper-body-only one-shot] */
const EMOTES={
  dance:['Dance_Loop',1],sit:['Sitting_Idle_Loop',1],talk:['Idle_Talking_Loop',1],phone:['Idle_TalkingPhone_Loop',1],yes:['Yes',0],no:['Idle_No_Loop',1],fold:['Idle_FoldArms_Loop',1],
  kneel:['Fixing_Kneeling',1],torch:['Idle_Torch_Loop',1],lantern:['Idle_Lantern_Loop',1],rail:['Idle_Rail_Loop',1],call:['Idle_Rail_Call',0],shield:['Idle_Shield_Loop',1],
  crouch:['Crouch_Idle_Loop',1],zombie:['Zombie_Idle_Loop',1],swim:['Swim_Idle_Loop',1],harvest:['Farm_Harvest',0],plant:['Farm_PlantSeed',0],water:['Farm_Watering',0],
  chop:['TreeChopping_Loop',1],scratch:['Zombie_Scratch',0],pickup:['PickUp_Table',0],interact:['Interact',0],open:['Chest_Open',0],drink:['Consume',0],throw:['OverhandThrow',0],
  push:['Push_Loop',1],block:['Sword_Block',0],punch:['Punch_Cross',0],aim:['Pistol_Idle_Loop',1],lay:['LayToIdle',0],climb:['ClimbUp_1m',0],
  /* v5_330 the last clips that nothing played: */
  crouchwalk:['Crouch_Fwd_Loop',1],swimfwd:['Swim_Fwd_Loop',1],formal:['Walk_Formal_Loop',1],carry:['Walk_Carry_Loop',1],zombiewalk:['Zombie_Walk_Fwd_Loop',1],sittalk:['Sitting_Talking_Loop',1],
  standup:['Sitting_Exit',0],knockback:['Hit_Knockback',0],slash:['Sword_Attack',0],slide:['Slide_Loop',1],ninja:['NinjaJump_Idle_Loop',1],aimup:['Pistol_Aim_Up',1],aimdown:['Pistol_Aim_Down',1],aimlevel:['Pistol_Aim_Neutral',1]};
const ONESHOT={drink:1,pickup:1,interact:1,open:1,throw:1,punch:1,climb:0};   /* these play as an upper-body action while you move */
const own=Object.prototype.hasOwnProperty,emo=n=>own.call(EMOTES,n)?EMOTES[n]:null;
const FLAVOR=['Idle_FoldArms_Loop','Idle_No_Loop','Idle_Talking_Loop'];   /* the occasional idle fidget */

/* ---------------------------------------------------------------- data */
function load(){
  if(off||!T)return Promise.resolve(false);
  if(PRM)return PRM;ST=1;
  PRM=Promise.all([fetch('anims/ual.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}),fetch('anims/ual.bin').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()})]).then(r=>{
    D=r[0];FR=new Int16Array(r[1]);BN=D.bones;ST=2;return true;
  }).catch(e=>{ST=3;console.warn('ANIM3D clips not available, using the built-in moves: '+(e&&e.message||e));return false});
  return PRM;
}
function init(THREE){T=THREE;tq=new T.Quaternion()}
const ready=()=>ST===2&&!off;
const clip=n=>D.clips[n];
/* sample clip n at time t (s) into out[83]; loops wrap, one-shots clamp */
function sample(n,t,out){
  const c=D.clips[n];if(!c){out.fill(0);for(let k=0;k<NB;k++)out[k*4+3]=1;return}
  const fps=D.fps,N=c.n;let ft;
  if(c.loop){const L=N-1;ft=((t*fps)%L+L)%L}else ft=clamp(t*fps,0,N-1);
  const i0=Math.floor(ft),i1=Math.min(i0+1,N-1),f=ft-i0,a=(c.off+i0)*SF,b=(c.off+i1)*SF;
  for(let k=0;k<NB;k++){
    const o=k*4;let x0=FR[a+o],y0=FR[a+o+1],z0=FR[a+o+2],w0=FR[a+o+3],x1=FR[b+o],y1=FR[b+o+1],z1=FR[b+o+2],w1=FR[b+o+3];
    if(x0*x1+y0*y1+z0*z1+w0*w1<0){x1=-x1;y1=-y1;z1=-z1;w1=-w1}
    const x=x0+(x1-x0)*f,y=y0+(y1-y0)*f,z=z0+(z1-z0)*f,w=w0+(w1-w0)*f,l=1/(Math.sqrt(x*x+y*y+z*z+w*w)||1);   /* v5_331 sqrt, not Math.hypot (hypot is several times slower) */
    out[o]=x*l;out[o+1]=y*l;out[o+2]=z*l;out[o+3]=w*l;
  }
  for(let m=0;m<3;m++)out[Q4+m]=(FR[a+Q4+m]+(FR[b+Q4+m]-FR[a+Q4+m])*f)/8192;
}
/* v5_326 constant-speed spherical blend of one bone (a, b at offset o) into d; plain nlerp whips through the middle when the two poses are far apart (hips 170 deg apart between combo hits) */
function slerpB(d,a,b,o,w,xl){
  let ax=a[o],ay=a[o+1],az=a[o+2],aw=a[o+3],bx=b[o],by=b[o+1],bz=b[o+2],bw=b[o+3],c=ax*bx+ay*by+az*bz+aw*bw;
  if(xl){   /* locked direction: two poses almost opposite flip their shortest path from frame to frame, so the path chosen at the start of the blend is kept */
    const k=o>>2;if(!xl[k])xl[k]=c<0?-1:1;
    if(xl[k]<0){bx=-bx;by=-by;bz=-bz;bw=-bw;c=-c}
    if(c<-.9995){c=-.9995}
  }else if(c<0){bx=-bx;by=-by;bz=-bz;bw=-bw;c=-c}
  let k0,k1;
  if(c>NLERP){k0=1-w;k1=w}else{const th=Math.acos(c),sn=Math.sin(th);k0=Math.sin((1-w)*th)/sn;k1=Math.sin(w*th)/sn}   /* v5_331 plain nlerp up to 23 degrees apart (speed error < .5 %), acos / sin only for the big turns */
  const x=ax*k0+bx*k1,y=ay*k0+by*k1,z=az*k0+bz*k1,q=aw*k0+bw*k1,l=1/(Math.sqrt(x*x+y*y+z*z+q*q)||1);
  d[o]=x*l;d[o+1]=y*l;d[o+2]=z*l;d[o+3]=q*l;
}
/* dst = a -> b by w (per bone slerp); dst may be a or b */
function mix(dst,a,b,w,xl){
  if(w<=0){if(dst!==a)dst.set(a);return}if(w>=1){if(dst!==b)dst.set(b);return}
  for(let k=0;k<NB;k++)slerpB(dst,a,b,k*4,w,xl);
  for(let m=0;m<3;m++)dst[Q4+m]=a[Q4+m]+(b[Q4+m]-a[Q4+m])*w;
}
/* the action layer on top of the base: upper-body bones (index 1-13) with weight wu, hips + legs (0, 14-19) with weight wl */
function mixAct(dst,base,act,wu,wl){
  for(let k=0;k<NB;k++){
    const w=(k===0||k>=14)?wl:wu,o=k*4;
    if(w<=.001){dst[o]=base[o];dst[o+1]=base[o+1];dst[o+2]=base[o+2];dst[o+3]=base[o+3];continue}
    if(w>=.999){dst[o]=act[o];dst[o+1]=act[o+1];dst[o+2]=act[o+2];dst[o+3]=act[o+3];continue}   /* v5_331 fully weighted bone: no blend maths */
    slerpB(dst,base,act,o,w);
  }
  for(let m=0;m<3;m++)dst[Q4+m]=base[Q4+m]+(act[Q4+m]-base[Q4+m])*wl;
}

/* ---------------------------------------------------------------- per-rig state */
const mk=()=>({base:null,key:'',prev:null,fd:1,fdur:.2,act:null,ao:null,af:1,
  pb:new Float32Array(SF),pp:new Float32Array(SF),pa:new Float32Array(SF),pq:new Float32Array(SF),out:new Float32Array(SF),
  sw:0,xl:null,xd:XFADE,la:undefined,spd:0,moving:false,jz:undefined,vzs:0,air:false,airT:0,landT:0,gait:'jog',idleT:0,nextFid:8+Math.random()*8,fid:null,
  dr:0,drT:-1,swp:false,cp:false,hp:false,cn:0,ct:-9,hn:0,emId:-1,em:null,emT:0,actId:-1,dead:false,deadT:0,getup:0,lift:0,tm:0});
function setBase(an,key,name,o){
  if(an.key===key)return;
  o=o||{};const c=D.clips[name];if(!c)return;
  const old=an.base;an.prev=old;an.fd=old?0:1;an.fdur=o.fade===undefined?.2:o.fade;
  let t0=o.t0||0;
  if(old&&old.loco&&o.loco){t0=(old.t/Math.max(.01,clip(old.name).dur))*c.dur}   /* keep the step phase when the gait changes */
  an.base={name,t:t0,rate:o.rate||1,loco:o.loco||0,drv:false,dur:c.dur};an.key=key;
}
function startAct(an,segs,o){
  o=o||{};
  if(an.act){an.ao=an.act;an.af=0;an.xl=null}
  an.act={segs,i:0,lt:0,age:0,sf:1,pi:0,pt:0,fin:o.fin===undefined?.06:o.fin,fout:o.fout===undefined?.14:o.fout,lower:o.lower===undefined?1:o.lower,w:0};
}
function stepAct(a,dt){   /* advance the action layer; returns false when it is finished */
  a.age+=dt;const s=a.segs[a.i];a.lt+=dt*s[3];
  if(a.sf<1)a.sf=Math.min(1,a.sf+dt/SEGFADE);
  if(s[1]+a.lt>=s[2]){
    if(a.i+1<a.segs.length){a.pi=a.i;a.pt=s[2];a.i++;a.lt=0;a.sf=0}   /* v5_326 keep the last pose of the part that ended and fade from it (no pop between parts of a move) */
    else return false}
  return true;
}
function evalAct(a,out){   /* samples the action layer into out, returns its weight 0..1 */
  const s=a.segs[a.i];sample(s[0],s[1]+a.lt,out);
  if(a.sf<1){const p=a.segs[a.pi];sample(p[0],a.pt,SCR);mix(out,SCR,out,sm(a.sf))}
  let w=a.fin>0?sm(a.age/a.fin):1;                                     /* v5_326 smoothstep in / out (was linear: a visible kink at both ends) */
  if(a.i===a.segs.length-1&&a.fout>0)w=Math.min(w,sm((s[2]-(s[1]+a.lt))/(a.fout*s[3])));
  return w;
}

/* ---------------------------------------------------------------- v5_331 level of detail: should this rig be posed this frame?
   The game sets R.lodS (animation stride) on OTHER players only: 1 / undefined = every frame, 2 = every 2nd frame, ... Rigs are staggered (R.lodO) so the work is spread over the frames.
   A rig that is busy (swing, cast, hit, dodge, one-shot, emote change, bow draw, death / revive, an action still blending) is ALWAYS posed, so no attack or hit is ever missed or delayed;
   the stride only thins out walking, standing and idling, which look the same at 30 or 20 poses per second. R.dtQ carries the skipped time so the clip phase stays right. */
function busy(an,P){
  return P.swing>0||P.cast>0||P.hurt>0||an.swp||an.cp||an.hp||an.act||an.ao||(P.dg|0)>0||an.drT>=0||an.dr>0||(P.dead>0)!==an.dead||
    (P.emo&&P.emo.id!==an.emId)||(P.act&&P.act.id!==an.actId);
}
function due(R,P){
  R.dtQ=(R.dtQ||0)+(R.dtA||0);
  const s=R.lodS|0;if(s<2||ST!==2||off)return true;
  const an=R.an;if(!an)return true;
  if(R.lodO===undefined)R.lodO=Math.floor(Math.random()*12);
  R.lodK=(R.lodK|0)+1;
  if((R.lodK+R.lodO)%s===0||R.dtQ>.1)return true;   /* .1 s cap: even a very slow phone poses a rig at least 10 times a second */
  return busy(an,P);
}
/* ---------------------------------------------------------------- one frame for one avatar */
function apply(R,P,v){
  if(ST!==2||!v)return false;
  const an=R.an||(R.an=mk());an.R=R;
  /* v5_331 R.dtQ = time since this rig was last posed (due() adds up the frames it skipped); a rig that is not throttled gets the plain frame time as before */
  const thr=R.lodS>1,dt=clamp(R.dtQ>0?R.dtQ:(R.dtA||.016),.001,.15);R.dtQ=0;   /* v5_331 .05 -> .15 s: a slow phone's frame (or a thinned rig's step) is longer than .05 s and the moves would play in slow motion */const time=R.lt||0,cl=R.cls|0,CF=CLASS[cl]||CLASS[0];
  an.tm+=dt;
  const mv=P.mvAmt||0,dead=P.dead>0;
  /* ---- movement: distance moved this frame (the game adds .07 per unit to P.anim), smoothed speed in units per second */
  const pa=P.anim||0;if(an.la===undefined)an.la=pa;
  const dist=Math.min(Math.max(0,(pa-an.la)/.07),900*dt);an.la=pa;   /* v5_331 capped at a sane speed: a rig that was not updated while far away / off screen must not read its whole walk as one sprint step */
  an.spd+=(dist/dt-an.spd)*Math.min(1,dt*6);
  an.moving=mv>.4?true:mv<.12?false:an.moving;
  /* ---- height above the ground: jumping (own player: P.air; others: from the height change) */
  const jz=P.jz||0;if(an.jz===undefined)an.jz=jz;
  an.vzs+=((jz-an.jz)/dt-an.vzs)*Math.min(1,dt*18);an.jz=jz;
  const air=typeof P.air==='boolean'?P.air:(Math.abs(an.vzs)>70&&jz>8);
  const sc=v.scale||31;
  /* ---- emote / one-shot requests from the game (P.emo = {n,id}, P.act = {n,id}) */
  if(P.emo&&P.emo.id!==an.emId){an.emId=P.emo.id;an.em=P.emo.n?startEmote(an,P.emo.n):null}
  if(P.act&&P.act.id!==an.actId){an.actId=P.act.id;oneShot(an,P.act.n)}
  const dg=(P.dg|0)>0&&P.dgU>=0,u=clamp(P.dgU||0,0,1);
  /* ---- edges: attack / skill, cast, hit */
  const swing=P.swing>0,hurt=P.hurt>0;
  const swEdge=swing&&(!an.swp||P.swing>an.sw+.04);                    /* v5_326 a new swing also counts while the last swing timer still runs (fast attack speed, skill right after an attack) */
  an.sw=P.swing>0?P.swing:0;
  if(swEdge&&!dead&&!dg){
    an.em=null;
    const newSk=P.skT&&P.skTi!==an.skI;an.skI=P.skTi;
    if(newSk)startAct(an,(own.call(SKILL,P.skT)?SKILL[P.skT]:null)||CF.cast,{lower:1,fin:.09,fout:.24});   /* a skill: its own move, else the class cast move */
    else attack(an,CF,time);                                          /* basic attack: next move of the combo */
    if(cl===3)an.drT=0;                                               /* v5_323 archer: draw the bow, release, nock the next arrow */
  }
  if(P.cast>0&&!an.cp&&!dead&&!dg&&!swEdge){startAct(an,CF.cast,{lower:1,fin:.09,fout:.24});an.em=null;if(cl===3)an.drT=0}
  if(hurt&&!an.hp&&!dead&&!dg){an.hn++;an.em=null;startAct(an,[[an.hn&1?'Hit_Chest':'Hit_Head',0,an.hn&1?.33:.43,1.15]],{fin:.04,fout:.16,lower:1})}
  an.swp=swing;an.cp=P.cast>0;an.hp=hurt;
  /* ---- death / get up */
  if(dead&&!an.dead){an.dead=true;an.act=null;an.ao=null;an.em=null;an.key='';setBase(an,'dead','Death01',{fade:.08,rate:1})}
  else if(!dead&&an.dead){an.dead=false;an.key='';setBase(an,'getup','LayToIdle',{fade:.12,rate:1.9});an.getup=.8}
  /* ---- base clip */
  an.lift=0;
  if(an.dead){/* stays on the Death01 pose */}
  else if(dg){
    const dgn=P.dg|0;
    if(dgn===3){   /* back dodge: a hop with the legs tucked, keeps facing the front */
      if(u<.72){setBase(an,'hop1','NinjaJump_Start',{fade:.06});an.base.drv=true;an.base.t=clamp(u/.3,0,1)*.45}
      else{setBase(an,'hop2','NinjaJump_Land',{fade:.1});an.base.drv=true;an.base.t=clamp((u-.72)/.28,0,1)*.62}
      an.lift=9*Math.sin(Math.PI*clamp(u/.72,0,1));
    }else{
      const e=dgn===1?.54:.95;
      if(u<e){setBase(an,'roll','Roll',{fade:.05});an.base.drv=true;an.base.t=dgn===1?u/.54*.92:u/.95*1.35}
      else base2(an,P,mv,air,dt,CF,sc,time)
    }
    an.act=null;an.ao=null;
  }else base2(an,P,mv,air,dt,CF,sc,time);
  an.wasAir=air;
  /* ---- advance + evaluate */
  const b=an.base;
  if(b&&!b.drv){
    if(b.loco){const c=clip(b.name),rm=(c.rm&&c.rm[2])||1.3;b.t+=dist/sc/rm*c.dur;b.t=b.t%c.dur}   /* phase follows the distance walked */
    else b.t+=dt*b.rate;
  }
  if(an.prev&&an.fd<1){const p=an.prev;if(!p.drv){if(p.loco){}else p.t+=dt*p.rate}an.fd=Math.min(1,an.fd+dt/Math.max(.03,an.fdur));if(an.fd>=1)an.prev=null}
  sample(b.name,b.t,an.pb);
  if(an.prev&&an.fd<1){sample(an.prev.name,an.prev.t,an.pp);mix(an.pb,an.pp,an.pb,sm(an.fd))}
  let out=an.pb;
  /* action layer */
  let wu=0;
  if(an.act){
    if(!stepAct(an.act,dt)){an.act=null}
    else{
      wu=evalAct(an.act,an.pa);
      if(an.ao&&an.af<1){
        if(!stepAct(an.ao,dt)){const o=an.ao,sg=o.segs[o.i];o.lt=(sg[2]-sg[1])/sg[3]}   /* v5_326 an old move that ends mid-blend holds its last pose until the blend is done (it used to be dropped = a pop) */
        {
          const w0=evalAct(an.ao,an.pq);
          if(!an.xl){   /* start of the blend: lock the blend direction per bone; a big turn of the hips (180 deg between two combo hits) gets a longer fade */
            an.xl=new Int8Array(NB);const h=an.pq[0]*an.pa[0]+an.pq[1]*an.pa[1]+an.pq[2]*an.pa[2]+an.pq[3]*an.pa[3];
            an.xd=XFADE+.12*clamp((2*Math.acos(Math.min(1,Math.abs(h)))*57.2958-80)/100,0,1)}
          an.af=Math.min(1,an.af+dt/an.xd);const sf=sm(an.af);
          mix(an.pa,an.pq,an.pa,sf,an.xl);wu=w0+(wu-w0)*sf;
          if(an.af>=1)an.ao=null;
        }
      }
    }
  }
  if(an.act&&wu>0){
    const lk=an.act.lower*(1-clamp(mv*1.8,0,1));
    mixAct(an.out,an.pb,an.pa,wu,wu*lk);out=an.out;
  }
  /* v5_323 bow draw (archer): pull in .11 s, release at .16 s (the arrow is gone), the hands come back, the next arrow is nocked at .42 s. R.drawW / R.arrowGone are read by VRM3D.pose */
  if(cl===3&&an.drT>=0&&!dead){an.drT+=dt;if(an.drT<.16)an.dr=Math.min(1,an.dr+dt/.11);else an.dr=Math.max(0,an.dr-dt/.15);if(an.drT>.42)an.drT=-1}
  else{an.drT=-1;an.dr=Math.max(0,an.dr-dt/.15)}
  R.drawW=sm(an.dr);R.arrowGone=an.drT>=.16;
  write(R,v,out,sc);
  /* the old procedural bob / cast lift would double up with the clips */
  R.body.position.y=an.lift;
  return true;
}

/* attack: next move of the class combo */
function attack(an,CF,time){
  if(time-an.ct>1.4)an.cn=0;
  const m=CF.atk[an.cn%CF.atk.length];an.cn++;an.ct=time;
  const c=clip(m[0]);if(!c)return;
  const hv=m[0].indexOf('Heavy')>=0,h=m[1],t0=Math.max(0,h-(hv?.2:.16)),end=Math.min(c.dur,h+(hv?.6:.5));
  /* v5_326 starts a little earlier (more wind-up to blend in over, the strike still lands about .13 s after the swing starts), slower rate = softer motion, eases back out over .22 s */
  startAct(an,[[m[0],t0,end,hv?1:1.12]],{fin:.1,fout:.22,lower:1});
}
/* everything that is not a dodge / death */
function base2(an,P,mv,air,dt,CF,sc,time){
  const cl=an.moving;
  if(an.dead)return;
  if(an.getup>0){an.getup-=dt;if(cl||air||an.em){an.getup=0}else return}
  if(air){
    an.em=null;an.airT+=dt;
    if(an.airT>.5&&an.key==='jump')setBase(an,'jump2','Jump_Loop',{fade:.2});
    if(!an.wasAir){an.airT=0;an.key='';setBase(an,'jump','Jump_Start',{fade:.08,t0:.1,rate:2.0})}
    return;
  }
  if(an.wasAir){   /* landing */
    an.airT=0;an.key='';
    if(cl){setBase(an,'landrun','Jog_Fwd_Loop',{fade:.1,loco:1});an.gait='jog'}else{setBase(an,'land','Jump_Land',{fade:.06,t0:.1,rate:2.3});an.getup=.45}
    return;
  }
  if(cl){
    an.em=null;an.fid=null;an.idleT=0;
    const sp=an.spd;let g;
    if(P.walkSm)g='walk';
    else if(P.sprT>0)g='sprint';
    else if(P.sprT===undefined)g=sp>235?'sprint':sp<95?'walk':'jog';
    else g='jog';
    an.gait=g;
    setBase(an,'loco:'+g,g==='walk'?'Walk_Loop':g==='sprint'?'Sprint_Loop':'Jog_Fwd_Loop',{loco:1,fade:.18});
    return;
  }
  /* standing */
  if(P.mine>0||P.tp>0)an.em=null;   /* mining / channelling a scroll ends an emote */
  if(an.em){
    const e=an.em;
    if(e.enter){   /* sit: enter clip, then the loop */
      setBase(an,'em:'+e.n+':a',e.enter,{fade:.2});
      if(an.base&&an.base.t>=an.base.dur-.05){e.enter=null}
      return}
    setBase(an,'em:'+e.n,e.clip,{fade:.2});
    if(!e.loop&&an.base&&an.base.t>=an.base.dur){an.em=null}
    return;
  }
  if(P.tp>0){setBase(an,'tp','Spell_Simple_Idle_Loop',{fade:.25});return}
  if(P.mine>0){setBase(an,'chop','TreeChopping_Loop',{fade:.2});return}
  const combat=!!(an.R&&an.R.wOut);
  an.idleT+=dt;
  if(an.fid){
    setBase(an,'fid:'+an.fid,an.fid,{fade:.3});
    if(an.base&&an.base.t>=an.base.dur-.05){an.fid=null;an.idleT=0;an.nextFid=9+Math.random()*9}
    return;
  }
  if(!combat&&an.idleT>an.nextFid){an.fid=FLAVOR[Math.floor(Math.random()*FLAVOR.length)];return}
  setBase(an,combat?'cidle':'idle',combat?CF.idle:'Idle_Loop',{fade:.25});
}
function startEmote(an,name){
  const e=emo(name);if(!e)return null;
  if(ONESHOT[name]){oneShot(an,name);return null}
  const o={n:name,clip:e[0],loop:!!e[1]};
  if(name==='sit')o.enter='Sitting_Enter';
  return o;
}
function oneShot(an,name){
  const e=emo(name);if(!e||!D)return;
  const c=clip(e[0]);if(!c)return;
  startAct(an,[[e[0],0,c.dur,1]],{fin:.12,fout:.2,lower:0});
}
/* write the pose onto the VRM bones */
function write(R,v,q,sc){
  const setB=VRM3D.setB;
  for(let k=0;k<NB;k++){
    const n=BN[k];if(!v.bones[n])continue;
    tq.set(q[k*4],q[k*4+1],q[k*4+2],q[k*4+3]);setB(v,n,tq);
  }
  const h=v.bones.hips;
  if(h&&v.hipsRest){const r=v.hipsRest.y/D.pelvisH;h.position.set(v.hipsRest.x+q[Q4]*r,v.hipsRest.y+q[Q4+1]*r,v.hipsRest.z+q[Q4+2]*r)}
}
window.ANIM3D={init,load,ready,apply,due,EMOTES,SKILL,names:()=>D?Object.keys(D.clips):[],
  _clip:n=>D&&D.clips[n]};
})();
