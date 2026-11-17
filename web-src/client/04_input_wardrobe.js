/* ---------- input ---------- */
const keys={};
window.addEventListener('keydown',e=>{
  if(!started)return;
  if(e.target&&e.target.tagName==='INPUT')return;
  const k=e.key.toLowerCase();
  if(k==='enter'){e.preventDefault();openChat();return}
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  keys[k]=true;
  if(e.repeat)return;
  if(SLOTKEYS.includes(k))useSkill(SLOTKEYS.indexOf(k));else if(k==='q')usePot('hp');else if(k==='z')usePot('qi');else if(k==='x')useTp();else if(k==='b')toggleBag();else if(k==='n')openShop();else if(k==='m')toggleMap();else if(k==='k')toggleBook();else if(k==='i')togglePchat();else if(k==='v')toggle3D();else if(k==='p')togglePvpMode();else if(k==='c')cycleSkin();
  else if(k===' ')doJump(); /* v5_169 Space = jump (attack nearest is F) */
  else if(k==='e')startMine();
  else if(k==='f'){const m=(P.sel&&!P.sel.dead&&!P.sel.isPl)?P.sel:nearest(320);if(m){P.target=m;P.task=null;P.mv=null;P.fatk=true}} /* F = attack nearest */
  else if(k==='o')openForge();else if(k==='g')openWorlds();else if(k==='h')openWh();
  else if(k==='escape'){cpHide();$('forge').hidden=true;$('worlds').hidden=true;$('book').hidden=true;$('wardrobe').hidden=true;$('menu').hidden=true;statsToggle(false);if(!$('bag').hidden)closeBag();$('shop').hidden=true;closeWh()}
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
$('bChat').addEventListener('click',toggleChat);
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false});

let cam={x:0,y:0};
const camDrag={on:false,x:0,y:0,moved:0,t:-1e9};
cv.style.touchAction='none';
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&(e.button===2||e.button===1)){camDrag.on=true;camDrag.x=e.clientX;camDrag.y=e.clientY;camDrag.moved=0}});
window.addEventListener('pointermove',e=>{
  if(!camDrag.on||e.pointerType!=='mouse'||!(e.buttons&6)){if(camDrag.on&&!(e.buttons&6))camDrag.on=false;return}
  const dx=e.clientX-camDrag.x,dy=e.clientY-camDrag.y;camDrag.x=e.clientX;camDrag.y=e.clientY;camDrag.moved+=Math.abs(dx)+Math.abs(dy);
  if(camDrag.moved>6){camDrag.t=performance.now();camAdj(-dx*.006,dy*.004)}
});
window.addEventListener('pointerup',e=>{if(camDrag.on&&e.pointerType==='mouse'){camDrag.on=false;if(camDrag.moved>6)camDrag.t=performance.now()}});
/* two-finger camera on touch screens: sideways = rotate, up/down = tilt, pinch = zoom */
const camTouch=new Map();let camMid=null,camDist=0;
function camTouchInfo(){const a=[...camTouch.values()];if(a.length<2)return null;return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}}
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;camTouch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(camTouch.size===2){P.mv=null;const i=camTouchInfo();camMid={x:i.x,y:i.y};camDist=i.d}});
window.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||!camTouch.has(e.pointerId))return;
  camTouch.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const i=camTouchInfo();if(!i||!camMid)return;
  if(camDist>20&&i.d>20&&MODE3D)T3.zoom=clamp(T3.zoom*camDist/i.d,.55,2.2);
  camMid={x:i.x,y:i.y};camDist=i.d;P.mv=null;
});
/* v5_110 CONTROLS. PC: left click = move (marker shows where) / select / attack, right-drag or middle-drag = rotate + tilt, wheel = zoom, plain right click on a player = PvP.
   Phone: one tap = move (or select a monster / player / ore), touch and drag = rotate + tilt, pinch = zoom, double tap on a monster or player = attack. */
const lc={id:null,x:0,y:0,moved:0,ev:null};
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0){lc.id=null;return}
  if(e.pointerType==='touch'&&camTouch.size>=2){lc.id=null;return} /* second finger: two-finger camera takes over */
  lc.id=e.pointerId;lc.x=e.clientX;lc.y=e.clientY;lc.moved=0;lc.ev={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType,button:0};
});
window.addEventListener('pointermove',e=>{
  if(lc.id===null||e.pointerId!==lc.id)return;
  if(e.pointerType==='touch'&&camTouch.size>=2){lc.id=null;return}
  const dx=e.clientX-lc.x,dy=e.clientY-lc.y;lc.x=e.clientX;lc.y=e.clientY;lc.moved+=Math.abs(dx)+Math.abs(dy);
  if(lc.moved>10&&e.pointerType!=='mouse'){camAdj(-dx*.006,dy*.004)}
});
const lcEnd=e=>{if(lc.id===null||e.pointerId!==lc.id)return;const was=e.type==='pointerup'&&lc.moved<=(e.pointerType==='mouse'?8:10);lc.id=null;if(was)cvClick(lc.ev)};
window.addEventListener('pointerup',lcEnd);window.addEventListener('pointercancel',lcEnd);
const camTouchEnd=e=>{if(e.pointerType!=='touch')return;camTouch.delete(e.pointerId);camMid=null};
window.addEventListener('pointerup',camTouchEnd);window.addEventListener('pointercancel',camTouchEnd);
addEventListener('keydown',e=>{
  if(!started||/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||''))return;
  if(e.key==='['){camAdj(-.12,0)}else if(e.key===']'){camAdj(.12,0)}else if(e.key==='PageUp'){camAdj(0,.06)}else if(e.key==='PageDown'){camAdj(0,-.06)}else if(e.key==='Home'){camView.yaw=0;camView.tilt=CAM_TILT0}
});
cv.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(e.pointerType==='touch')return; /* a long press on a phone is not a click */
  if(performance.now()-camDrag.t<450)return; /* a right-drag rotated the camera */
  if(!started||P.dead>0||!$('forge').hidden)return;
  const r=cv.getBoundingClientRect(),w3=(MODE3D&&T3.r)?pick3(e):null,wx=w3?w3.x:e.clientX-r.left+cam.x,wy=w3?w3.y:e.clientY-r.top+cam.y;
  const q=MP?(scrPick(e,[...NET.peers.values()].filter(o=>!o.dead))||peerAt(wx,wy,w3?20:0)):null;
  /* v5_110 right button: drag = rotate the camera; a plain right click on a player = PvP select / attack. (Moving is the LEFT click again.) */
  if(!q)return;
  if(P.sel===q)startPvp(q);   /* 2nd right click on the selected player: attack */
  else P.sel=q;               /* 1st right click: select only */
});
let tapO=null,tapT=0;
function cvClick(e){
  if(!started||P.dead>0||!$('forge').hidden)return;
  const r=cv.getBoundingClientRect();
  const w3=(MODE3D&&T3.r)?pick3(e):null,wx=w3?w3.x:e.clientX-r.left+cam.x,wy=w3?w3.y:e.clientY-r.top+cam.y,ex=w3?20:0;
  if(inTown()&&dist(NPC.x,NPC.y,wx,wy)<46+ex){openShop();return}
  /* touch: tapping another player SELECTS them (no right-click on a phone); the action bar under the target frame offers Inspect / Attack / Party / Friend / Whisper */
  if(MP&&(PHONE||e.pointerType==='touch'||e.pointerType==='pen')){
    const q=scrPick(e,[...NET.peers.values()].filter(o=>!o.dead))||peerAt(wx,wy,ex+14);
    if(q){
      const now=performance.now();
      if(P.sel===q&&tapO===q&&now-tapT<450){tapT=0;startPvp(q);return} /* v5_110 double tap on a player = attack (PvP) */
      P.sel=q;if(P.target&&P.target!==q)P.target=null;tapO=q;tapT=now;return}
  }
  /* monsters: 1st left click SELECTS (nothing attacks yet), 2nd left click on the same monster ATTACKS it */
  if(!pvpOnly()){
    let m=scrPick(e,mons.filter(o=>!o.dead&&!o.pend));
    if(!m){let bd=1e9;for(const o of mons){if(o.dead)continue;const d=dist(o.x,o.y,wx,wy);if(d<o.r+50+ex&&d<bd){bd=d;m=o}}} /* v5_109 bigger click area */
    if(m){
      const now=performance.now(),touch=e.pointerType==='touch'||e.pointerType==='pen';
      /* mouse: 2nd click on the selected monster attacks; touch: DOUBLE TAP (within 0.45 s) attacks, a single tap only selects */
      if(P.sel===m&&(!touch||(tapO===m&&now-tapT<450))){P.target=m;P.task=null;P.mv=null;tapT=0}
      else{P.sel=m;tapO=m;tapT=now}
      return}
  }
  /* players are NOT targeted with the left button: PvP is right click only (contextmenu handler above) */
  for(const o of ores){
    if(o.cd<=0&&dist(o.x,o.y,wx,wy)<50+ex){P.sel=null;P.task=o;P.target=null;P.mv=null;P.mine=0;return}
  }
  /* v5_110 left click / single tap on the ground = move there. A ripple + a marker on the ground show the destination. */
  if(MODE3D&&T3.r&&!w3)return; /* clicked the sky / above the horizon: no ground point */
  if(PHONE&&P.tapMove===false)return; /* v5_134 phone option 'Tap to move' is off: the joystick is the only way to walk (monsters, ore and the shop can still be tapped) */
  P.sel=null;P.mv={x:wx,y:wy};P.target=null;P.task=null;stopMine('Auto-mine off.');
  ring(wx,wy,46,'#8ff0c4');ring(wx,wy,26,'#ffffff');
}

const joy={x:0,y:0,id:null};
const joyEl=$('joy'),joyKnob=joyEl.firstElementChild;
function joyMove(e){
  const r=joyEl.getBoundingClientRect();
  let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const l=Math.hypot(dx,dy),m=r.width/2;
  if(l>m){dx=dx/l*m;dy=dy/l*m}
  joy.x=dx/m;joy.y=dy/m;
  joyKnob.style.transform='translate('+dx+'px,'+dy+'px)';
}
joyEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)joyMove(e)});
function joyEnd(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;joyKnob.style.transform=''}
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
/* v5_117 TAPS WHILE THE JOYSTICK IS HELD: phones often do not send a 'click' for a tap made while another finger is already down (the joystick finger),
   so every button that listens for 'click' (Auto, Mine, Land, menu and bag icons, ...) looked dead while walking. Here a tap on such a control made during a
   multi-finger touch fires the click itself on release, and the browser's own (late or duplicate) click for that tap is swallowed so it never runs twice.
   Skill slots, Attack, Dodge and the potion buttons already react on pointerdown and are left alone. A single-finger tap is untouched. */
(function(){
  const SEL='button,[role="button"],.ic,label,a[href],input[type="checkbox"],input[type="radio"]';
  const act=new Set(),tap=new Map();let blockEl=null,blockUntil=0,synth=false;
  const skip=el=>el.disabled||(el.closest&&el.closest('.sk,#dodge,#joy,#saver,#bPot,#bPotQ,#bTp'));
  window.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    const other=act.size>0;act.add(e.pointerId);
    const el=e.target&&e.target.closest?e.target.closest(SEL):null;
    if(el&&!skip(el))tap.set(e.pointerId,{el,x:e.clientX,y:e.clientY,multi:other});
  },true);
  window.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch')return;
    const rec=tap.get(e.pointerId),multi=act.size>1;act.delete(e.pointerId);tap.delete(e.pointerId);
    if(!rec||!(rec.multi||multi))return;                              /* single-finger tap: the browser handles it */
    if(Math.hypot(e.clientX-rec.x,e.clientY-rec.y)>14)return;         /* it was a drag, not a tap */
    const t=document.elementFromPoint(e.clientX,e.clientY);
    if(!t||!(t===rec.el||rec.el.contains(t)))return;                  /* released off the button */
    blockEl=rec.el;blockUntil=performance.now()+600;synth=true;
    try{rec.el.click()}catch(_){}finally{synth=false}
  },true);
  window.addEventListener('pointercancel',e=>{act.delete(e.pointerId);tap.delete(e.pointerId)},true);
  window.addEventListener('click',e=>{                                /* swallow the browser's own click for a tap we already handled */
    if(synth||!blockEl||performance.now()>blockUntil)return;
    if(e.target===blockEl||blockEl.contains(e.target)){e.stopPropagation();e.preventDefault();blockEl=null}
  },true);
})();

/* v5_109 SCREEN SAVER / LOCK: while auto-hunt or auto-mine is on and nobody touched the screen for SAVER_IDLE seconds (v5_123: 300 = 5 minutes; any click / tap / key / wheel / drag resets it, plain mouse-cursor movement does not), a dark screen covers the game so a stray touch cannot do anything.
   Slide the handle to the right to unlock. The game keeps running underneath; the 3D world is not drawn meanwhile. */
const SAVER_IDLE=300,SV={on:false,last:performance.now(),t0:0,exp:0,coins:0,lvl:0,el:null,ex:0};
function saverTouch(){if(!SV.on)SV.last=performance.now()}
for(const ev of ['pointerdown','keydown','wheel'])window.addEventListener(ev,saverTouch,{capture:true,passive:true});
window.addEventListener('pointermove',e=>{if(e.buttons>0||e.pointerType==='touch')saverTouch()},{capture:true,passive:true}); /* v5_123: dragging (joystick, camera) is activity; a mouse cursor that just moves is not */
function saverBuild(){
  const d=document.createElement('div');d.id='saver';
  d.innerHTML='<div class="svbox"><div class="svt">World of Ascension</div><div class="svm" id="svMode"></div><div class="svs" id="svStat"></div><div class="svh" id="svHp"><i></i></div></div><div class="svsl" id="svSl"><div class="svk" id="svK">&#10095;&#10095;</div><span>Slide to unlock</span></div>';
  document.body.appendChild(d);SV.el=d;
  const k=d.querySelector('#svK'),sl=d.querySelector('#svSl');let drag=null;
  const max=()=>sl.clientWidth-k.offsetWidth-8;
  k.addEventListener('pointerdown',e=>{e.preventDefault();k.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,o:SV.ex}});
  k.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;SV.ex=clamp(drag.o+e.clientX-drag.x,0,max());k.style.transform='translateX('+SV.ex+'px)'});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;if(SV.ex>=max()*.85)saverOff();else{SV.ex=0;k.style.transition='transform .2s';k.style.transform='';setTimeout(()=>k.style.transition='',220)}};
  k.addEventListener('pointerup',end);k.addEventListener('pointercancel',end);
  /* swallow everything else so nothing reaches the game */
  for(const ev of ['pointerdown','pointerup','click','touchstart','touchend','contextmenu','wheel'])d.addEventListener(ev,e=>{if(e.target!==k)e.stopPropagation();if(ev==='contextmenu'||ev==='wheel')e.preventDefault()},{passive:false});
}
function saverOn(manual){
  if(SV.on)return;if(!SV.el)saverBuild();
  SV.manual=!!manual;SV.on=true;SV.t0=performance.now();SV.exp=0;SV.coins=P.coins;SV.lvl=P.lvl;SV.ex=0;$('svK').style.transform='';
  SV.el.classList.add('on');saverUpdate();
  try{if(window.SND)SND.hush(true)}catch(e){} /* v5_116: no sound at all while the saver covers the screen */
}
function saverOff(){if(!SV.on)return;SV.on=false;SV.last=performance.now();SV.ex=0;SV.el.classList.remove('on');try{if(window.SND)SND.hush(false)}catch(e){}}
function saverUpdate(){
  if(!SV.on)return;
  const m=Math.floor((performance.now()-SV.t0)/60000),h=Math.floor(m/60),f=n=>Math.round(n).toLocaleString();
  $('svMode').textContent=(auto||amine)?(auto?'Auto-hunt':'')+(auto&&amine?' + ':'')+(amine?'Auto-mine':'')+' running':'Screen locked';
  $('svStat').textContent='Lv. '+P.lvl+(P.lvl>SV.lvl?' (+'+(P.lvl-SV.lvl)+')':'')+'  \u00b7  EXP +'+f(SV.exp)+'  \u00b7  Coins '+(P.coins-SV.coins>=0?'+':'')+f(P.coins-SV.coins)+'  \u00b7  '+(h?h+'h ':'')+(m%60)+'m';
  $('svHp').firstChild.style.width=clamp(P.hp/maxHp()*100,0,100)+'%';
  const b=SV.el.querySelector('.svbox');b.style.transform='translate('+(Math.sin(performance.now()/9000)*18)+'vw,'+(Math.cos(performance.now()/7000)*14)+'vh)'; /* slow drift: no burn-in */
}
setInterval(()=>{
  const act=started&&P.dead<=0&&(auto||amine);
  if(SV.on){if(!act&&!SV.manual)saverOff();else saverUpdate();return}
  if(act&&performance.now()-SV.last>SAVER_IDLE*1000)saverOn();
},1000);
function toggleAuto(){auto=!auto;if(auto)stopMine();$('bAuto').classList.toggle('on',auto);say(auto?'Auto-hunt on.':'Auto-hunt off.','#8d9aa2')}
let amine=false,amT=0,amWait=false;
function nearestOre(){let best=null,bd=1e9;for(const o of ores){if(o.cd>0)continue;const d=dist(o.x,o.y,P.x,P.y);if(d<bd){bd=d;best=o}}return best}
function stopMine(msg){if(!amine)return;amine=false;amWait=false;$('bMine').classList.remove('on');if(msg)say(msg,'#8d9aa2')}
function startMine(){ /* toggle: keeps walking to the next ready ore vein after each one is mined */
  if(amine){stopMine('Auto-mine off.');P.task=null;P.mine=0;return}
  amine=true;amWait=false;amT=0;$('bMine').classList.add('on');
  if(auto){auto=false;$('bAuto').classList.remove('on')}
  const best=nearestOre();
  if(best){P.task=best;P.target=null;P.mv=null;P.mine=0;say('Auto-mine on. Heading to the nearest ore vein.','#8d9aa2')}
  else{amWait=true;say('Auto-mine on. No ore nodes are ready yet \u2014 waiting for one.','#8d9aa2')}
}
$('bAuto').addEventListener('click',()=>{if(started)toggleAuto()});
$('bMine').addEventListener('click',()=>{if(started)startMine()});
$('bForge').addEventListener('click',openForge);

const skWrap=$('skills');let skBtns=[],armed=3;
const GLYPH={pierce:'\u2197',fan:'\u224b',nova:'\u2738',meteor:'\u2604',chain:'\u26a1',drain:'\u263e',might:'\u25b2',mend:'\u271a',heal:'\u271a',strike:'\u2694',cleave:'\u263d',leap:'\u27a4',flurry:'\u2736',kunai:'\u2734',shadowstep:'\u21af',venom:'\u2623',bladestorm:'\u274b',smoke:'\u2601',execute:'\u2620',siphon:'\u2665',rush:'\u21d2',bash:'\u25a3',charge:'\u27a4',quake:'\u2301',bulwark:'\u26e8',roar:'\u2742',counter:'\u21ba',hammer:'\u2692',ironskin:'\u25c6',shockwave:'\u224b',arrow:'\u27b6',volley:'\u2917',rain:'\u2602',blast:'\u2739',eagle:'\u25ce',gale:'\u21e0',trap:'\u26a1',stormarrow:'\u21af',wolves:'\u2658',soulburst:'\u2735',wail:'\u224b',chains:'\u26d3',soulheal:'\u271a',harvest:'\u2766',guardian:'\u2656',spiritbomb:'\u2600'};
for(const c of SIGD)for(const y of c)GLYPH[y[0]]=y[6]; /* v5_160 signature skill icons */
/* [right, bottom] of each button's centre, in HUD units, measured from the bottom-right corner (round slots 1-12, then the two large ones) */
const SLOTPOS=[[105,42],[154,42],[202,42],[250,42],[297,42],[345,42],[105,99],[154,99],[202,99],[250,99],[297,99],[345,99],[106,152],[34,148]];
function buildBar(){
  skWrap.innerHTML='';skBtns=[];
  const U=n=>'calc('+n+'*var(--u))',place=(el,rc,bc,sz)=>{el.style.right=U(rc-sz/2);el.style.bottom=U(bc-sz/2)};
  const atk=document.createElement('button');atk.type='button';atk.className='sk atk';atk.title='Attack nearest (F)';
  atk.innerHTML='<b>\u2694</b>';place(atk,52,67,64);
  atk.addEventListener('pointerdown',e=>{e.preventDefault();if(!started)return;if(P.sel&&!P.sel.dead&&P.sel.isPl){startPvp(P.sel);return}const m=(P.sel&&!P.sel.dead&&!P.sel.isPl)?P.sel:nearest(320);if(m){P.target=m;P.task=null;P.mv=null}});
  skWrap.appendChild(atk);
  for(let i=0;i<NSLOT;i++){const s=SKILLS[EQ[i]],b=document.createElement('button');b.type='button';b.className='sk'+(i>=12?' big':'');
    if(i<12)place(b,SLOTPOS[i][0],SLOTPOS[i][1],40); /* R (12) and T (13) are positioned in CSS, left of the dodge pad */
    if(s)b.style.borderColor=s.col;b.title=(s?s.n:'Empty slot (K to equip)')+' ['+SLOTKEYS[i].toUpperCase()+']';
    b.innerHTML='<b'+(s?' style="color:'+s.col+'"':'')+'>'+(s?GLYPH[s.t]||'\u2726':'')+'</b><span class="kn">'+SLOTKEYS[i].toUpperCase()+'</span><em class="cdn"></em><i class="cdv"></i>';
    /* tap = cast, drag upward = toggle auto-cast for this slot */
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();const sy=e.clientY,u=parseFloat(getComputedStyle($('hud')).getPropertyValue('--u'))||1,thr=Math.max(14,14*u);let flipped=false;
      try{b.setPointerCapture(e.pointerId)}catch(_){}
      const mv=ev=>{if(!flipped&&sy-ev.clientY>thr){flipped=true;toggleAutoSkill(i)}};
      const end=ev=>{b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',end);if(!flipped&&ev.type==='pointerup')useSkill(i)};
      b.addEventListener('pointermove',mv);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
    });
    skWrap.appendChild(b);skBtns.push(b)}
}
function toggleAutoSkill(i){
  if(i>=AUTO_SLOTS){say('Slots R and T have no auto-cast.','#8d9aa2');return}
  const id=EQ[i];if(id<0||!SKILLS[id])return;
  AUTOSK[i]=!AUTOSK[i];say(SKILLS[id].n+': auto-cast '+(AUTOSK[i]?'ON':'OFF'),AUTOSK[i]?'#5fd3a5':'#8d9aa2');save();
}
buildBar();
function equip(id){if((SKILLS[id].c||0)!==P.cls)return;const j=EQ.indexOf(id),o=EQ[armed];if(j>=0)EQ[j]=o;EQ[armed]=id;buildBar();renderBook();save()}
function renderBook(){
  const cb=$('bookCls');cb.innerHTML='';
  CLASSES.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===P.cls?' on':'');b.textContent=c.n;b.addEventListener('click',()=>switchClass(i));cb.appendChild(b)});
  $('bookClsD').textContent=CLASSES[P.cls].d;
  const sl=$('bookSlots');sl.innerHTML='';
  EQ.forEach((id,i)=>{const b=document.createElement('button');b.type='button';b.className='btn bk'+(i===armed?' on':'');b.textContent=(i+1)+(id>=0?' '+SKILLS[id].n:' -');b.title=id>=0?SKILLS[id].n:'empty';b.addEventListener('click',()=>{armed=i;renderBook()});sl.appendChild(b)});
  const rows=$('bookRows');rows.innerHTML='';
  SKILLS.map((s,id)=>[s,id]).filter(x=>(x[0].c||0)===P.cls).sort((a,b)=>(P.lvl>=b[0].lv)-(P.lvl>=a[0].lv)||a[1]-b[1]).forEach(([s,id])=>{const ok=P.lvl>=s.lv,row=document.createElement('div');row.className='row'+(ok?'':' lock');
    if(s.sig)row.classList.add('sig');
    const nm=document.createElement('b');nm.style.color=s.col;const ic=document.createElement('span');ic.className='sic';ic.textContent=GLYPH[s.t]||'\u2726';ic.style.color=s.col;ic.style.borderColor=s.col;nm.appendChild(ic);nm.appendChild(document.createTextNode(s.n));if(s.sig){const u=document.createElement('i');u.className='uq';u.textContent='\u2605 UNIQUE';nm.appendChild(u);row.title=(SIGD[s.c].find(y=>y[0]===s.t)||[])[5]||s.n}row.appendChild(nm);
    const b=document.createElement('button');b.type='button';const sl=EQ.indexOf(id);b.className='btn'+(sl>=0?' on':'');b.textContent=!ok?'Lv '+s.lv:(sl>=0?String(sl+1):'Equip');if(sl>=0)b.title='Equipped in slot '+(sl+1)+' (click to move to the selected slot)';b.disabled=!ok;b.addEventListener('click',()=>equip(id));row.appendChild(b);
    const sm=document.createElement('small');sm.textContent=TL[s.t]+(s.m?' · '+s.m.toFixed(1)+'x ATK':'')+' · '+skCostLbl(s)+' · '+s.cd+'s cooldown';row.appendChild(sm);rows.appendChild(row)});
}
function toggleBook(){if(!started)return;const b=$('book');b.hidden=!b.hidden;if(!b.hidden)renderBook()}
$('bBook').addEventListener('click',toggleBook);$('bookClose').addEventListener('click',()=>{$('book').hidden=true});
$('bookAuto').addEventListener('click',()=>{autoArrangeAll();buildBar();renderBook();save()});

/* ---------- wardrobe: skin / hair / outfit / headwear / aura ---------- */
const WD={tab:0,cls:0,raf:0,t:0};
/* tab = [label, option names, look field]. v5_53: every class (Cultivator included) has the SAME tabs and the SAME options. Armor = all class colour schemes pooled. */
function wdTabs(cl){
  if(!window.AL3D)return [];const A=AL3D;
  return [['Gender',A.GENDERS,'g'],['Skin',A.SKINS.map(x=>x.n),'p'],['Hair',A.HAIRS,'h'],['Outfit',A.OUTFITS,'o'],['Headwear',A.HEADS,'w'],['Armor',A.ARMORS,'r'],['Accent',A.ACCENTS.map(x=>x.n),'x'],['Aura',A.AURAS,'a']];
}
/* the class tab being edited (WD.cls) is independent of the class you are playing (P.cls); each class has its own saved look */
const wdLookOf=c=>c===P.cls?SKIN:normLook(LOOKS[c]|0);
function wdApply(v){
  if(WD.cls===P.cls){setLook(v);return}
  LOOKS[WD.cls]=normLook(v);save();cloudFlush();wdRender();
}
function wdSet(k,v){const l=AL3D.look(wdLookOf(WD.cls));l[k]=v;wdApply(AL3D.packLook(l))}
function wdRender(){
  const W=$('wardrobe');if(!W||W.hidden||!window.AL3D)return;
  if(WD.cls===undefined||WD.cls<0||WD.cls>=CLASSES.length)WD.cls=P.cls;
  const cl=WD.cls,lk=wdLookOf(cl),tabs=wdTabs(cl),T=$('wdTabs'),G=$('wdGrid'),l=AL3D.look(lk);if(WD.tab>=tabs.length)WD.tab=0;
  $('wdTitle').textContent='Wardrobe';$('wdClsName').textContent=CLASSES[cl].n;
  const CT=$('wdClassTabs');CT.innerHTML='';
  CLASSES.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===cl?' on':'')+(i===P.cls?' cur':'');b.textContent=c.n;b.title=i===P.cls?c.n+' (your current class)':c.n;
    b.addEventListener('click',()=>{WD.cls=i;WD.tab=0;wdRender()});CT.appendChild(b)});
  T.innerHTML='';tabs.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===WD.tab?' on':'');b.textContent=t[0];b.addEventListener('click',()=>{WD.tab=i;wdRender()});T.appendChild(b)});
  G.innerHTML='';const names=tabs[WD.tab][1],fk=tabs[WD.tab][2],cur=l[fk];
  names.forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';if(i===cur)b.className='on';
    if(fk==='p'){const p=AL3D.SKINS[i],sw=document.createElement('span');sw.className='sw';
      for(const c of (cl>0?[p.skin,p.hair]:[p.robe,p.trim,p.sash])){const e=document.createElement('i');e.style.background=c;sw.appendChild(e)}
      const u=document.createElement('u');u.style.background=p.skin;sw.appendChild(u);b.appendChild(sw)}
    if(fk==='r'){const p=i>0?AL3D.ARMOR_POOL[i-1]:cl>0?AL3D.CLS_SCHEMES[cl][0]:null,sw=document.createElement('span');sw.className='sw';
      const q=AL3D.SKINS[l.p%AL3D.SKINS.length];
      for(const c of (p?[p.r,p.s,p.b]:[q.robe,q.sash,q.boot])){const e=document.createElement('i');e.style.background=c;sw.appendChild(e)}b.appendChild(sw)}
    if(fk==='x'){const sw=document.createElement('span');sw.className='sw';sw.style.background=AL3D.ACCENTS[i].c||'#9aa5ab';b.appendChild(sw)}
    if(fk==='a'){const sw=document.createElement('span');sw.className='sw';const c=AL3D.AURA_CFG[i];sw.style.background='radial-gradient(circle,'+(c.col||c.ring)+','+c.ring+' 55%,#10161a)';b.appendChild(sw)}
    b.appendChild(document.createTextNode(n));
    b.addEventListener('click',()=>wdSet(fk,i));G.appendChild(b)});
  const cur2=G.querySelector('.on');if(cur2&&cur2.scrollIntoView)try{cur2.scrollIntoView({block:'nearest'})}catch(e){}
  const S=skinOf(lk);
  $('wdName').innerHTML='<b>'+AL3D.SKINS[S.pi].n+'</b> ('+AL3D.GENDERS[S.ge]+')<br>'+AL3D.HAIRS[S.hs]+' / '+AL3D.OUTFITS[S.ot]+' / '+AL3D.HEADS[S.hw]+'<br>'+AL3D.ARMORS[S.ar]+' / '+AL3D.ACCENTS[S.ax].n+' / '+AL3D.AURAS[S.au];
}
/* wardrobe preview: the same rotatable Three.js character the bag shows (drag to spin, double-click to face front), for the class tab being edited.
   It has its own WebGL view; if 3D is off or unavailable the flat 2D avatar is painted instead. */
const WDV={r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
const wdWord=()=>(wdLookOf(WD.cls)|((WD.cls&7)<<21))>>>0;
function wdInit3(){
  if(WDV.r)return true;if(WDV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('wdCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();WDV.fail=1;WDV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(wdWord());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(WDV,{r,sc,cam,rig});
  }catch(e){console.error(e);WDV.fail=1;WDV.r=null;return false}
  return true;
}
function paintWd3(){
  if(!wdInit3())return false;
  const {r,sc,cam,rig}=WDV,t=performance.now()/1000,w=wdWord();
  if(rig.skin!==w)AL3D.setSkin(rig,w); /* switching class tab / changing an option re-dresses the model */
  if(WDV.drag)WDV.vel*=.7;else{WDV.yaw+=WDV.vel;WDV.vel*=.94;if(Math.abs(WDV.vel)<.0004)WDV.vel=0}
  rig.root.rotation.y=WDV.yaw;
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function wdPreview(){
  WD.raf=0;const W=$('wardrobe');if(!W||W.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintWd3());
    if(WDV.mode!==(ok?1:0)){WDV.mode=ok?1:0;$('wdCv3').hidden=!ok;$('wdCv').hidden=ok;$('wdHint').hidden=!ok;$('wdStage').classList.toggle('rot3',ok);if(!ok){WDV.drag=0;$('wdStage').classList.remove('drag')}}
    if(!ok){
      const kS=SKIN,kC=P.cls;
      try{SKIN=wdLookOf(WD.cls);P.cls=WD.cls;paintAvatar($('wdCv'))}finally{SKIN=kS;P.cls=kC}
    }
  }
  WD.raf=requestAnimationFrame(wdPreview);
}
(function(){
  const st=$('wdStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||(e.pointerType==='mouse'&&e.button!==0))return;
    WDV.drag=1;WDV.lx=e.clientX;WDV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!WDV.drag)return;const dx=e.clientX-WDV.lx;WDV.lx=e.clientX;WDV.yaw+=dx*.012;WDV.vel=dx*.012});
  const end=()=>{WDV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',()=>{WDV.yaw=0;WDV.vel=0});
})();
function paintClassAvatar(cv,cl){
  const c=cv.getContext('2d'),S0=skinOf(SKIN),S=clsPal(S0,cl),t=performance.now()/1000,k=cv.width/220,keep=ctx,keepCS=CS;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
  const AC=(AL3D.AURA_CFG[S.au])||{ring:'#5fd3a5'};
  ctx=c;CS=S;
  try{
    c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);
    const g=c.createRadialGradient(0,0,4,0,0,34);g.addColorStop(0,hexA(AC.ring,0));g.addColorStop(.4,hexA(AC.ring,0));g.addColorStop(.72,hexA(AC.ring,.34));g.addColorStop(1,hexA(AC.ring,0));c.fillStyle=g;c.beginPath();c.arc(0,0,34,0,6.2832);c.fill();
    c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,13,15,5,0,0,6.2832);c.fill();
    fgBody(c,0,0,fgTier(P.alv));
    c.translate(0,Math.sin(t*2.2)*.7);
    cLine(c,-3,6,-3,13,5,S.boot);cLine(c,3,6,3,13,5,S.boot);cDot(c,-3,13.5,3,mixc(S.boot,'#000000',.4));cDot(c,3,13.5,3,mixc(S.boot,'#000000',.4));
    c.fillStyle=S.robe;c.beginPath();c.moveTo(-8,-14);c.quadraticCurveTo(-9,-4,-12,9);c.lineTo(12,9);c.quadraticCurveTo(9,-4,8,-14);c.closePath();c.fill();
    c.fillStyle=mixc(S.robe,'#ffffff',.14);c.beginPath();c.moveTo(-2,-14);c.lineTo(2,-14);c.lineTo(3,9);c.lineTo(-3,9);c.fill();
    c.fillStyle=S.sash;c.fillRect(-8,-3,16,3);c.fillStyle=S.trim;c.fillRect(-9,-14,18,3);
    look2Outfit(c,S,0,0,0);
    cLine(c,-7,-12,-10,-4,S.ot===4?8:4,S.robe);cDot(c,-10,-3.6,2.4,S.skin);
    clsBack(cl,1,0);look2Back(c,S,0,t,0);
    cDot(c,0,-20,7,S.skin);
    look2Hair(c,S,0,t,0);
    clsFront(cl,1);look2Wear(c,S,0,t,0);
    const ex=10,ey=-5,sa=-1.35;
    cLine(c,5,-12,ex,ey,4,S.robe);
    clsWeapon(cl,ex,ey,sa,26);
    fgWeapon(c,cl,ex,ey,sa,26,fgTier(P.wlv));
    cDot(c,ex,ey,2.6,S.skin);
    c.restore();
    if(S.au>0){c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);look2Aura(c,S,0,0,t);c.restore()}
  }finally{ctx=keep;CS=keepCS}
}
function paintAvatar(cv){
  if(P.cls>0&&P.cls<CLPAL.length){paintClassAvatar(cv,P.cls);return}
  const c=cv.getContext('2d'),S=clsPal(skinOf(SKIN),0),t=performance.now()/1000;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
  const k=cv.width/220;
  const AC=(AL3D.AURA_CFG[S.au])||{ring:'#5fd3a5'};
  c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);
  const g=c.createRadialGradient(0,0,4,0,0,34);g.addColorStop(0,hexA(AC.ring,0));g.addColorStop(.4,hexA(AC.ring,0));g.addColorStop(.72,hexA(AC.ring,.34));g.addColorStop(1,hexA(AC.ring,0));c.fillStyle=g;c.beginPath();c.arc(0,0,34,0,6.2832);c.fill();
  c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,13,15,5,0,0,6.2832);c.fill();
  fgBody(c,0,0,fgTier(P.alv));
  const bob=Math.sin(t*2.2)*.7;c.translate(0,bob);
  cLine(c,-3,6,-3,13,5,S.boot);cLine(c,3,6,3,13,5,S.boot);cDot(c,-3,13.5,3,mixc(S.boot,'#000000',.4));cDot(c,3,13.5,3,mixc(S.boot,'#000000',.4));
  const sway=Math.sin(t*1.6)*.6;
  c.fillStyle=S.robe;c.beginPath();c.moveTo(-8,-14);c.quadraticCurveTo(-9,-4,-12,9);c.lineTo(12,9);c.quadraticCurveTo(9,-4,8,-14);c.closePath();c.fill();
  c.fillStyle=mixc(S.robe,'#ffffff',.14);c.beginPath();c.moveTo(-2,-14);c.lineTo(2,-14);c.lineTo(3,9);c.lineTo(-3,9);c.fill();
  c.fillStyle=S.sash;c.fillRect(-8,-3,16,3);c.fillStyle=S.trim;c.fillRect(-9,-14,18,3);
  look2Outfit(c,S,0,sway,0);
  const aw=S.ot===4?8:4;
  cLine(c,-7,-12,-10,-4,aw,S.robe);cLine(c,7,-12,10,-4,aw,S.robe);cDot(c,-10,-3.6,2.4,S.skin);cDot(c,10,-3.6,2.4,S.skin);
  cLine(c,10,-4,10,-30,2.4,'#cfe3f0');cLine(c,8,-4,12,-4,3.4,S.trim);
  fgWeapon(c,0,10,-4,-Math.PI/2,26,fgTier(P.wlv));
  look2Back(c,S,0,t,0);cDot(c,0,-20,7,S.skin);look2Front(c,S,0,t,0);
  c.restore();
  if(S.au>0){c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);look2Aura(c,S,0,0,t);c.restore()}
}
/* bag avatar: in 3D mode a second small WebGL view shows the same Three.js character rig the game uses (all gear, look, aura),
   and you can drag it left/right to spin it (double-click resets to the front). In 2D mode, or if WebGL is unavailable, the 2D avatar is painted as before. */
const BAGV={raf:0,r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
function bagInit3(){
  if(BAGV.r)return true;if(BAGV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('bagCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();BAGV.fail=1;BAGV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(SKW());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(BAGV,{r,sc,cam,rig});
  }catch(e){console.error(e);BAGV.fail=1;BAGV.r=null;return false}
  return true;
}
function paintBag3(){
  if(!bagInit3())return false;
  const {r,sc,cam,rig}=BAGV,t=performance.now()/1000;
  if(rig.skin!==SKW())AL3D.setSkin(rig,SKW());
  if(BAGV.drag)BAGV.vel*=.7;else{BAGV.yaw+=BAGV.vel;BAGV.vel*=.94;if(Math.abs(BAGV.vel)<.0004)BAGV.vel=0}
  rig.root.rotation.y=BAGV.yaw;
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function bagPreview(){
  BAGV.raf=0;const B=$('bag');if(!B||B.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintBag3());
    if(BAGV.mode!==(ok?1:0)){BAGV.mode=ok?1:0;$('bagCv3').hidden=!ok;$('bagCv').hidden=ok;$('bagHint').hidden=!ok;$('bagStage').classList.toggle('rot3',ok);if(!ok){BAGV.drag=0;$('bagStage').classList.remove('drag')}}
    if(!ok)paintAvatar($('bagCv'));
  }
  BAGV.raf=requestAnimationFrame(bagPreview);
}
(function(){
  const st=$('bagStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||e.target.closest('.bslot')||(e.pointerType==='mouse'&&e.button!==0))return;
    BAGV.drag=1;BAGV.lx=e.clientX;BAGV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!BAGV.drag)return;const dx=e.clientX-BAGV.lx;BAGV.lx=e.clientX;BAGV.yaw+=dx*.012;BAGV.vel=dx*.012});
  const end=()=>{BAGV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',e=>{if(e.target.closest('.bslot'))return;BAGV.yaw=0;BAGV.vel=0});
})();
/* v5_131 Forge window avatar: same 3D / 2D preview as the bag, with its own canvases and renderer */
const FGV={raf:0,r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
function fgInit3(){
  if(FGV.r)return true;if(FGV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('fgCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();FGV.fail=1;FGV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(SKW());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(FGV,{r,sc,cam,rig});
  }catch(e){console.error(e);FGV.fail=1;FGV.r=null;return false}
  return true;
}
function paintFg3(){
  if(!fgInit3())return false;
  const {r,sc,cam,rig}=FGV,t=performance.now()/1000;
  if(rig.skin!==SKW())AL3D.setSkin(rig,SKW());
  if(FGV.drag)FGV.vel*=.7;else{FGV.yaw+=FGV.vel;FGV.vel*=.94;if(Math.abs(FGV.vel)<.0004)FGV.vel=0}
  rig.root.rotation.y=FGV.yaw;
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function fgPreview(){
  FGV.raf=0;const B=$('forge');if(!B||B.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintFg3());
    if(FGV.mode!==(ok?1:0)){FGV.mode=ok?1:0;$('fgCv3').hidden=!ok;$('fgCv').hidden=ok;$('fgHint').hidden=!ok;$('fgStage').classList.toggle('rot3',ok);if(!ok){FGV.drag=0;$('fgStage').classList.remove('drag')}}
    if(!ok)paintAvatar($('fgCv'));
  }
  FGV.raf=requestAnimationFrame(fgPreview);
}
(function(){
  const st=$('fgStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||e.target.closest('.bslot')||(e.pointerType==='mouse'&&e.button!==0))return;
    FGV.drag=1;FGV.lx=e.clientX;FGV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!FGV.drag)return;const dx=e.clientX-FGV.lx;FGV.lx=e.clientX;FGV.yaw+=dx*.012;FGV.vel=dx*.012});
  const end=()=>{FGV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',e=>{if(e.target.closest('.bslot'))return;FGV.yaw=0;FGV.vel=0});
})();
function toggleWardrobe(){
  const W=$('wardrobe');if(!W||!window.AL3D)return;
  if(W.hidden){if(!started)return;WD.cls=P.cls;WD.tab=0;W.hidden=false;wdRender();if(!WD.raf)WD.raf=requestAnimationFrame(wdPreview)}else W.hidden=true;
}
$('wdClose').addEventListener('click',()=>{$('wardrobe').hidden=true});
$('wdReset').addEventListener('click',()=>wdApply(AL3D.packLook({p:0,h:WD.cls>0?7:0,o:0,w:0,a:0,g:AL3D.look(wdLookOf(WD.cls)).g,r:0,x:0})));
$('wdRand').addEventListener('click',()=>{const A=AL3D,c=WD.cls,R=n=>Math.random()*n|0,l={p:R(A.SKINS.length),h:R(A.HAIRS.length),o:R(A.OUTFITS.length),w:R(A.HEADS.length),a:R(A.AURAS.length),g:A.look(wdLookOf(c)).g,r:R(A.ARMORS.length),x:R(A.ACCENTS.length)};wdApply(A.packLook(l))});
$('wardrobe').addEventListener('mousedown',e=>{if(e.target.id==='wardrobe')$('wardrobe').hidden=true});

