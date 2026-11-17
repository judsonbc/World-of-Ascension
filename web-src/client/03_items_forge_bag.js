/* ---------- forge ---------- */
/* success chance: -9% per level down to 30% at +8, then a gradual linear decline to 5% at +75 (floor 5%) */
function forgeChance(lv){
  if(lv<8)return 100-lv*9;
  if(lv>=75)return 5;
  return Math.round((30-(lv-8)*25/67)*10)/10;
}
function forgeCost(lv,armor){
  return {ore:2+lv*2+(armor?1:0),coins:Math.round(40*Math.pow(lv+1,1.4)*(armor?1.2:1)),chance:forgeChance(lv)};
}
function gearDesc(q,o){
  const ks=Object.keys(q.st);
  return RAR[o.r].n+' \u00b7 Grade '+o.g+' \u00b7 now '+statTxt(o.st,o.lv,q)+' \u00b7 forge at +'+FORGE_MAX+': '+ks.map(k=>FLAT_STATS[k]?'+'+fg2(slotFlatPctF(q,k,1)*100)+'% '+STAT_LBL[k].trim():'+'+fg2(q.st[k][1]*FORGE_PCT_REF)+STAT_LBL[k]).join(', ');
}
let frT=0;
function forgePop(ok,nm,lv){ /* big SUCCESS / FAILED popup over the forge window; does not block clicks and fades after ~1.7 s */
  const e=$('forgeRes');if(!e)return;
  e.className=ok?'ok':'bad';e.firstChild.textContent=ok?'SUCCESS':'FAILED';
  e.lastChild.textContent=ok?nm+' tempered to +'+lv:nm+' stays +'+lv+' \u00b7 materials lost';
  e.hidden=false;e.style.animation='none';void e.offsetWidth;e.style.animation='';
  clearTimeout(frT);frT=setTimeout(()=>{e.hidden=true},1700);
}
/* v5_131 Forge window = bag layout: the avatar with the equipped gear around it; tap a piece and its stats + Forge button show on the right. */
let fgSel='wpn';
const FG_L=['wpn','wpn2','glove','brace','ring','belt'],FG_R=['ear','neck','robe','legs','boot'];
function fgTarget(k){ /* what the forge levels for this slot, or null when the slot is empty */
  const q=GEAR.find(z=>z.k===k),o=P.gear[k];if(!q)return null;
  if(o.g>0)return {k,q,o,nm:gearName(q,o),obj:o,key:'lv',armor:k!=='wpn',r:RAR[o.r].cls||'rare',ic:ICONS[k](RAR[o.r].c),gear:1};
  if(k==='wpn')return {k,q,o,nm:'Blade',title:'Primary Weapon (Blade)',obj:P,key:'wlv',armor:false,r:'epic',ic:ICONS.blade('#e3b559')};
  if(k==='robe')return {k,q,o,nm:'Robe',title:'Robe',obj:P,key:'alv',armor:true,r:'epic',ic:ICONS.robe(skinOf(SKIN).robe)};
  return null;
}
let fgBusy=null; /* {k,t0}: a strike in progress (1 s bar); the result is rolled and the materials are spent when the bar is full */
const FG_TIME=1000;
function fgDo(t){
  if(fgBusy)return;
  const lv=t.obj[t.key];if(lv>=FORGE_MAX)return;
  const c=forgeCost(lv,t.armor);if(P.ore<c.ore||P.coins<c.coins)return;
  fgBusy={k:t.k,t0:performance.now()};renderForge();
  setTimeout(()=>{
    const k=fgBusy&&fgBusy.k;fgBusy=null;
    const t2=k&&fgTarget(k);if(!t2){renderForge();return}
    const lv2=t2.obj[t2.key];if(lv2>=FORGE_MAX){renderForge();return}
    const c2=forgeCost(lv2,t2.armor);if(P.ore<c2.ore||P.coins<c2.coins){renderForge();return}
    P.ore-=c2.ore;P.coins-=c2.coins;
    if(rnd()*100<c2.chance){t2.obj[t2.key]++;say(t2.nm+' tempered to +'+t2.obj[t2.key]+'.','#e3b559');forgePop(true,t2.nm,t2.obj[t2.key])}
    else{say('The strike failed. Materials lost.','#d9503f');forgePop(false,t2.nm,t2.obj[t2.key])}
    P.hp=Math.min(P.hp,maxHp());save();renderForge();
  },FG_TIME);
}
function renderForge(){
  $('fgLv').textContent='Lv. '+P.lvl;
  $('fgCoins').textContent=P.coins.toLocaleString();$('fgOre').textContent=P.ore.toLocaleString();
  const fill=(el,keys)=>{
    el.innerHTML='';
    for(const k of keys){
      const t=fgTarget(k),q=GEAR.find(z=>z.k===k),b=document.createElement('button');b.type='button';
      if(t){
        b.className='bslot '+t.r+(fgSel===k?' sel':'');b.title=t.nm;b.innerHTML=t.ic;
        const l=document.createElement('span');l.className='q';l.textContent='+'+t.obj[t.key];b.appendChild(l);
      }else{
        b.className='bslot empty'+(fgSel===k?' sel':'');b.title=q.n+' (not found)';b.style.cursor='pointer';
        const sl=document.createElement('span');sl.className='sl';sl.textContent=q.ic;b.appendChild(sl);
      }
      b.addEventListener('click',()=>{if(fgBusy)return;fgSel=k;renderForge()});el.appendChild(b);
    }
  };
  fill($('fgEqL'),FG_L);fill($('fgEqR'),FG_R);
  const info=$('fgInfo');info.innerHTML='';
  const add=(cls,html)=>{const d=document.createElement('div');d.className=cls;d.innerHTML=html;info.appendChild(d);return d};
  const t=fgTarget(fgSel);
  if(!GEAR.some(z=>z.k===fgSel)){add('fgs','Tap a piece of gear to see its stats and forge it.')}
  else if(!t){
    const q=GEAR.find(z=>z.k===fgSel);
    add('fgn',q.n);add('fgs','<b>Not found.</b> Random world boss drop \u00b7 '+Object.keys(q.st).map(k=>STAT_LBL[k].replace(/^[% ]+/,'')).join(' &amp; '));
  }else{
    const lv=t.obj[t.key],q=t.q,o=t.o;
    const bar=()=>{if(lv>=FORGE_MAX)return;const busy=fgBusy&&fgBusy.k===t.k,el=busy?Math.min(FG_TIME,performance.now()-fgBusy.t0)/1000:0;
      add('fgbr','<span>+'+lv+'</span><div class="fgbar'+(busy?' go':'')+'"><i style="animation-delay:-'+el.toFixed(3)+'s"></i></div><span>+'+(lv+1)+'</span>')};
    const nmEl=add('fgn',t.title||t.nm);nmEl.style.color=t.gear?RAR[o.r].c:'#e8e0ca';
    if(t.gear){
      add('fgs',RAR[o.r].n+' \u00b7 Grade '+o.g);
      add('fgl','+'+lv+(lv<FORGE_MAX?' \u2192 +'+(lv+1):' MAX'));
      bar();
      add('fgs','<b>Now:</b> '+statTxt(o.st,lv,q));
      if(lv<FORGE_MAX)add('fgs','<b>Next level:</b> '+statTxt(o.st,lv+1,q));
      if(lv<FORGE_MAX){const d=forgeGain(lv);add('fgs','<b>Forge gain:</b> <span class="fgg">'+Object.keys(q.st).map(k=>FLAT_STATS[k]?'+'+fg2(slotFlatPctF(q,k,d)*100)+'% '+STAT_LBL[k].trim():'+'+fg2(d*FORGE_PCT_REF*q.st[k][1])+STAT_LBL[k]).join(', ')+'</span>');if(lv>=10)add('fgs','Higher forge levels give more than lower ones.')}
    }else{
      const lvTxt=add('fgl','+'+lv+(lv<FORGE_MAX?' \u2192 +'+(lv+1):' MAX'));
      bar();
      const now=corePctArr(q,forgeFrac(lv)).join(', ');
      const nxt=corePctArr(q,forgeFrac(lv+1)).join(', ');
      add('fgs','Your starting '+(t.k==='wpn'?'Blade':'Robe')+'. A boss drop can replace it.');
      add('fgs','<b>Now:</b> '+now);if(lv<FORGE_MAX)add('fgs','<b>Next level:</b> '+nxt);
      if(lv<FORGE_MAX){const d=forgeGain(lv);add('fgs','<b>Forge gain:</b> <span class="fgg">'+corePctArr(q,d).join(', ')+'</span>');if(lv>=10)add('fgs','Higher forge levels give more than lower ones.')}
    }
    if(lv<FORGE_MAX){
      const c=forgeCost(lv,t.armor),okO=P.ore>=c.ore,okC=P.coins>=c.coins;
      add('fgc','<span class="'+(okO?'':'no')+'">'+c.ore.toLocaleString()+' ore</span><span class="'+(okC?'':'no')+'">'+c.coins.toLocaleString()+' coins</span><span>'+c.chance+'% success</span>');
      add('fgs','A failed strike burns the materials but keeps your level.');
      const b=document.createElement('button');b.type='button';b.className='btn pri fgb';b.textContent='Forge '+c.chance+'%';
      b.disabled=!!fgBusy||!(okO&&okC);if(fgBusy&&fgBusy.k===t.k)b.textContent='Forging...';b.addEventListener('click',()=>fgDo(t));info.appendChild(b);
    }
  }
  if(!FGV.raf)FGV.raf=requestAnimationFrame(fgPreview);
}
function enterWorld(i){
  if(MP){NET.pendingEnter=i;netSend({t:'world',w:i});$('worlds').hidden=true;return} /* the server answers with the shared world */
  arriveWorld(i);
}
function arriveWorld(i,spawn){
  buildWorld(i,spawn);
  P.x=C;P.y=C+110;P.hp=maxHp();P.qi=maxQi();P.target=null;P.mv=null;P.task=null;P.mine=0;P.pvpT=0;stopMine();
  $('worlds').hidden=true;
  say(i===ARENA?'You enter the Arena. Pick a PvP mode (PvP button) to fight \u2014 Peaceful players cannot attack.':'Entered '+W[i].n+' (monsters Lv '+W[i].lo+'-'+W[i].hi+').',W[i].acc);save();
}
function renderWorlds(){
  const rows=$('worldRows');rows.innerHTML='';
  W.forEach((w,i)=>{
    const row=document.createElement('div');row.className='row';
    const nm=document.createElement('b');nm.textContent='World '+i+' \u00b7 '+w.n;nm.style.color=w.acc;row.appendChild(nm);
    const btn=document.createElement('button');btn.type='button';btn.className='btn'+(i===curWorld?'':' pri');
    btn.textContent=i===curWorld?'You are here':(w.arena?'Enter the arena':P.lvl<w.lo-5?'Enter (dangerous)':'Enter');
    btn.disabled=i===curWorld;
    btn.addEventListener('click',()=>enterWorld(i));row.appendChild(btn);
    const sm=document.createElement('small');sm.textContent=(w.arena?'PvP':'Monsters Lv '+w.lo+'-'+w.hi)+' \u00b7 '+w.blurb+(MP&&NET.counts[i]?' \u00b7 '+NET.counts[i]+' online':'');row.appendChild(sm);
    rows.appendChild(row);
  });
}
function openWorlds(){
  if(!started)return;
  if(!inTown()){say('Return to this world\u2019s hub to use the World Gate.','#8d9aa2');return}
  renderWorlds();$('worlds').hidden=false;
}
$('worldClose').addEventListener('click',()=>{$('worlds').hidden=true});
$('bWorld').addEventListener('click',openWorlds);
function openForge(){
  if(!started)return;
  if(!inTown()){say('Return to the Lotus Sanctum to use the forge.','#8d9aa2');return}
  if(!fgTarget(fgSel))fgSel='wpn';renderForge();$('forgeRes').hidden=true;$('forge').hidden=false;
}
$('forgeClose').addEventListener('click',()=>{$('forge').hidden=true;$('forgeRes').hidden=true});
/* tapping the dark area outside the window also closes it */
$('forge').addEventListener('click',e=>{if(e.target===$('forge')){$('forge').hidden=true;$('forgeRes').hidden=true}});
$('worlds').addEventListener('click',e=>{if(e.target===$('worlds'))$('worlds').hidden=true});

/* ---------- bag, potions and the Potion Merchant ---------- */
const POTS={hp:{n:'Health Potion',c:'#ff8a80',d:'Restores 5% of your max HP (5 s cooldown)'},qi:{n:'Mana Potion',c:'#8fd0ff',d:'Restores 10% of your max mana'},tp:{n:'Home Scroll',c:'#d2b4ff',d:'Teleports you to your hub after a 3s channel (moving or taking damage cancels it)'}};
const POT_SH={hp:'HP potion',qi:'MP potion',tp:'Home Scroll'};
const TP_DROP=.03,TP_CHANNEL=3,TP_CD=10,tpPrice=()=>Math.max(50,Math.round(P.lvl*8)),priceOf=k=>k==='tp'?tpPrice():potPrice();
const MP_POT_PCT=.1; /* v5_139 Mana Potion restores 10% of max Qi (v5_138: 5%, originally 40%) */
const HP_POT_PCT=.05,POT_CD=5; /* v5_72: Health Potion heals 5% of max HP (was 35%), shared 5 s cooldown */
const POT_MAX=9999,POT_DROP=.1,potPrice=()=>Math.max(10,Math.round(P.lvl*4));
const NPC={x:C-165,y:C-105}; /* behind the pagoda (hub is 1.5x) */
/* loot feed: small icon chips above the joystick (same item within 4s stacks) */
const lootChips=new Map();
function lootIcon(key,icon,n,col){
  const box=$('loot');if(!box)return;
  let c=lootChips.get(key);
  if(c){c.n+=n;c.el.lastChild.textContent='+'+c.n.toLocaleString();clearTimeout(c.tm)}
  else{
    const el=document.createElement('div');el.className='lc';el.style.borderColor=col;
    el.innerHTML='<b style="color:'+col+'">'+icon+'</b><span></span>';el.lastChild.textContent='+'+n.toLocaleString();
    box.appendChild(el);c={el,n,tm:0};lootChips.set(key,c);
    while(box.children.length>6){const f=box.firstChild;for(const [k,v] of lootChips)if(v.el===f){lootChips.delete(k);clearTimeout(v.tm)}f.remove()}
  }
  c.tm=setTimeout(()=>{c.el.remove();if(lootChips.get(key)===c)lootChips.delete(key)},4000);
}
function bagLog(t,c){P.recent.unshift({t,c});if(P.recent.length>20)P.recent.pop();saveSoon();if(!$('bag').hidden)renderBag()}
function addPot(k,n){if(n<=0)return;lootIcon('p'+k,k==='tp'?'&#10162;':'&#9879;',n,POTS[k].c);P.pots[k]=Math.min(POT_MAX,P.pots[k]+n);pop(P.x-14,P.y-58,'+'+n+' '+POT_SH[k],POTS[k].c,12);bagLog('+'+n+' '+POTS[k].n+(n>1?'s':''),POTS[k].c)}
/* ---------- dodge: quick dash with a brief invulnerable window, aimed by dragging the small pad ---------- */
const DASH_DIST=210,DASH_T=.34,DASH_CD=1.6,DODGE_INV=.35; /* v5_142 DASH_T .2 -> .34 s and the dash now eases out (fast launch, soft landing) with a ghost trail, so it no longer looks like a blink */ /* v5_78: DODGE_INV = invulnerability time, and for that time you cannot cast skills or basic attack */
function doDodge(dx,dy){
  if(!started||P.dead>0||P.dcd>0)return;
  P.cast=0; /* dodging cancels a cast */
  let l=Math.hypot(dx,dy);
  if(l<.01){dx=Math.cos(P.face);dy=Math.sin(P.face);l=1}
  P.dvx=dx/l;P.dvy=dy/l;P.dashT=DASH_T;P.dcd=DASH_CD;P.inv=Math.max(P.inv>0?P.inv:0,DODGE_INV);P.skLock=Math.max(P.skLock||0,DODGE_INV);P.atkCd=Math.max(P.atkCd||0,DODGE_INV);
  P.face=Math.atan2(P.dvy,P.dvx);P.mv=null;P.task=null;P.mine=0;
  ring(P.x,P.y,48,'#bfe9ff');ring(P.x,P.y,80,'#ffffff');
  spark(P.x,P.y,'#e8f6ff',14,150,.45,3.4);spark(P.x,P.y,'#9fd8ff',10,90,.55,4.2); /* v5_142 launch burst */
}
const dashEase=u=>1-Math.pow(1-Math.min(1,Math.max(0,u)),3);
/* v5_99 ROTATABLE / TILTABLE CAMERA (3D mode). yaw rotates the view around the player, tilt is the camera pitch (radians above the ground; below CAM_TILT_MIN the camera looks up at the sky, v5_174).
   Controls: hold RIGHT or MIDDLE mouse and drag (left/right = rotate, up/down = tilt), or [ and ] to rotate, PageUp / PageDown to tilt, Home to reset;
   phone: drag with TWO fingers (sideways = rotate, up/down = tilt, pinch = zoom). Movement, joystick, dodge and the hub arrow follow the view. */
const CAM_TILT0=Math.atan2(380,320),CAM_TILT_MIN=.3, /* v5_105 wider tilt range (about 17 to 87 degrees) */ CAM_TILT_MAX=1.52,
  CAM_LOOK_MAX=1.0, CAM_TILT_LOW=CAM_TILT_MIN-CAM_LOOK_MAX; /* v5_174 LOOK UP: tilt keeps going below CAM_TILT_MIN; the camera then stays at its lowest orbit and pitches up by the difference (up to 1.0 rad = 57 degrees) to show the sky */
const camView={yaw:0,tilt:CAM_TILT0};
function camRot(ix,iy){if(!MODE3D||!camView.yaw)return [ix,iy];const c=Math.cos(camView.yaw),sn=Math.sin(camView.yaw);return [ix*c+iy*sn,-ix*sn+iy*c]} /* screen direction -> world direction */
function camUnrot(wx,wy){if(!MODE3D||!camView.yaw)return [wx,wy];const c=Math.cos(camView.yaw),sn=Math.sin(camView.yaw);return [wx*c-wy*sn,wx*sn+wy*c]} /* world direction -> screen direction */
function camAdj(dyaw,dtilt){camView.yaw=(camView.yaw+dyaw)%(Math.PI*2);camView.tilt=clamp(camView.tilt+dtilt,CAM_TILT_LOW,CAM_TILT_MAX)}
/* true while you are steering (keys / joystick): auto skills do not cast while it is true (v5_153). v5_154: a move input no longer cancels the cast pose */
function wantsMove(){const ix=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0)+joy.x,iy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0)+joy.y;return Math.abs(ix)>.12||Math.abs(iy)>.12}
function moveDir(){const ix=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0)+joy.x,iy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0)+joy.y;return Math.hypot(ix,iy)>.3?camRot(ix,iy):[0,0]}
const jumpEl=$('jump');jumpEl.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doJump()});jumpEl.addEventListener('contextmenu',e=>e.preventDefault());
const dodgeEl=$('dodge'),dodgeKnob=dodgeEl.querySelector('i'),dg={id:null,x:0,y:0};
function dgMove(e){
  const r=dodgeEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy),m=Math.max(1,l/(R*.6));
  dg.x=l>R*.2?(e.clientX-cx)/l:0;dg.y=l>R*.2?(e.clientY-cy)/l:0;
  dodgeKnob.style.transform='translate('+(dx/m)+'px,'+(dy/m)+'px)';
}
dodgeEl.addEventListener('pointerdown',e=>{e.preventDefault();dg.id=e.pointerId;dodgeEl.setPointerCapture(e.pointerId);dgMove(e)});
dodgeEl.addEventListener('pointermove',e=>{if(e.pointerId===dg.id)dgMove(e)});
function dgEnd(e){
  if(e.pointerId!==dg.id)return;dg.id=null;dodgeKnob.style.transform='';
  if(e.type==='pointercancel')return;
  if(dg.x||dg.y)doDodge(...camRot(dg.x,dg.y));else{const [mx,my]=moveDir();doDodge(mx,my)}
  dg.x=dg.y=0;
}
dodgeEl.addEventListener('pointerup',dgEnd);dodgeEl.addEventListener('pointercancel',dgEnd);
addEventListener('keydown',e=>{if(e.key==='Shift'&&!e.repeat&&started&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){const [mx,my]=moveDir();doDodge(mx,my)}});
function cancelTp(why){if(P.tp>0){P.tp=0;if(why)say(why,'#d9503f')}}
function useTp(){
  if(!started||P.dead>0)return;
  if(P.tp>0)return;
  if(pot.tp>0){say('Home Scroll is recharging ('+Math.ceil(pot.tp)+'s).','#8d9aa2');return}
  if(P.pots.tp<=0){say('No Home Scrolls left. Buy some from the Potion Merchant (N in your hub).','#8d9aa2');return}
  if(inTown()){say('You are already in the hub.','#8d9aa2');return}
  P.tp=TP_CHANNEL;P.tpx=P.x;P.tpy=P.y;P.target=null;P.task=null;P.mine=0;
  say('Teleporting home in '+TP_CHANNEL+'s… stay still.','#d2b4ff');
}
let tpAcc=0,tpRing=0;
/* channel animation: violet motes spiral in and rise around you, a ring pulses out every half second, both get faster as the channel ends */
function tpFx(dt){
  const pr=1-Math.max(0,P.tp)/TP_CHANNEL;
  tpAcc+=dt*(40+pr*70);
  while(tpAcc>=1&&parts.length<520){
    tpAcc--;const a=rnd()*6.2832,r=44-pr*14;
    parts.push({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r*.7+10,vx:-Math.sin(a)*70-Math.cos(a)*40,vy:Math.cos(a)*45-Math.sin(a)*28-150-pr*90,life:.55+rnd()*.35,max:.9,col:rnd()<.35?'#ffffff':(rnd()<.5?'#d2b4ff':'#9a6bff'),size:1.6+rnd()*2.2});
  }
  tpRing-=dt;if(tpRing<=0){tpRing=.5-pr*.25;ring(P.x,P.y,54,'#b794f4');}
  shake=Math.max(shake,pr*.08);
}
function finishTp(){
  P.tp=0;if(P.pots.tp<=0)return;
  P.pots.tp--;pot.tp=TP_CD;
  spark(P.x,P.y,'#ffffff',30,260,.9,3.4,120);ring(P.x,P.y,90,'#ffffff');ring(P.x,P.y,60,'#b794f4');
  P.x=C;P.y=C+110;P.target=null;P.mv=null;P.task=null;P.mine=0;stopMine();
  if(auto){auto=false;$('bAuto').classList.remove('on');say('Auto-hunt turned off after teleporting.','#8d9aa2')}
  spark(P.x,P.y,'#ffffff',30,260,1,3.4,120);spark(P.x,P.y,'#9a6bff',24,180,1,3,90);ring(P.x,P.y,100,'#ffffff');ring(P.x,P.y,70,'#b794f4');shake=Math.max(shake,.25);pop(P.x,P.y-40,'Home','#d2b4ff',16);
  bagLog('Used a Home Scroll','#d2b4ff');save();if(!$('bag').hidden)renderBag();
}
function usePot(k,auto){
  if(k==='tp'){useTp();return}
  if(!started||P.dead>0||pot[k]>0)return;
  if(P.pots[k]<=0){if(!auto)say('No '+POTS[k].n+'s left. Buy some from the Potion Merchant (N in your hub).','#8d9aa2');return}
  if(k==='hp'){if(P.hp>=maxHp())return;const h=healP(Math.round(maxHp()*HP_POT_PCT));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff8a80',15);spark(P.x,P.y,'#ff9a8a',10,70,.8,2.6,50)}
  else{if(P.qi>=maxQi())return;const q=Math.round(maxQi()*MP_POT_PCT);P.qi=Math.min(maxQi(),P.qi+q);pop(P.x,P.y-30,'+'+q+' MP','#8fd0ff',14);spark(P.x,P.y,'#8fd0ff',10,70,.8,2.6,50)}
  P.pots[k]--;pot[k]=POT_CD;SFX('potion');save();if(!$('bag').hidden)renderBag();
}
function autoPot(){if(!P.autoPot||!started||P.dead>0)return;if(P.hp<maxHp()*(P.apHp||35)/100)usePot('hp',true);if(P.qi<maxQi()*(P.apQi||20)/100)usePot('qi',true)}
function bagRow(label,val,col){const d=document.createElement('div');d.className='row';const b=document.createElement('b');b.textContent=label;if(col)b.style.color=col;const v=document.createElement('span');v.textContent=val;d.appendChild(b);d.appendChild(v);return d}
/* bag: Mir4-style slot grid. Slot colour = rarity, bottom-right = amount, orange ribbon = gained since you last closed the bag */
let bagSel=null,bagSeen=null,bagConfirm=null,bagMulti=false,bagPick=new Set();
const fmtQ=n=>n>=1e7?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n.toLocaleString();
const svgW=(inner,c)=>'<svg viewBox="0 0 64 64">'+inner.replace(/\{c\}/g,c||'#fff')+'</svg>';
function flaskSvg(a,b){const id='fg'+a.slice(1);return '<svg viewBox="0 0 64 64"><defs><radialGradient id="'+id+'" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></radialGradient></defs><rect x="28" y="5" width="8" height="8" rx="2" fill="#8a5a2b"/><rect x="25" y="12" width="14" height="5" rx="2" fill="#d9a441"/><rect x="26" y="16" width="12" height="12" fill="#cfe3f0" fill-opacity=".55"/><ellipse cx="32" cy="43" rx="21" ry="17" fill="url(#'+id+')" stroke="#d9a441" stroke-width="2"/><ellipse cx="24" cy="36" rx="6" ry="3.5" fill="#fff" fill-opacity=".4" transform="rotate(-25 24 36)"/></svg>'}
const ICONS={
  hp:()=>flaskSvg('#ff5a5a','#7a0b12'),qi:()=>flaskSvg('#4aa0ff','#12348a'),
  tp:()=>svgW('<rect x="14" y="8" width="36" height="48" rx="4" fill="#f1e4c3" stroke="#8a5a2b" stroke-width="2"/><rect x="10" y="5" width="44" height="7" rx="3" fill="#b3302c"/><rect x="10" y="52" width="44" height="7" rx="3" fill="#b3302c"/><path d="M32 20l10 8h-4v12H26V28h-4z" fill="#7a4fd0"/><circle cx="32" cy="46" r="3" fill="#7a4fd0"/>'),
  coin:()=>svgW('<g fill="#e3b559" stroke="#7a5a10" stroke-width="2"><ellipse cx="32" cy="46" rx="20" ry="8"/><rect x="12" y="38" width="40" height="8" stroke="none"/><ellipse cx="32" cy="38" rx="20" ry="8"/><rect x="12" y="30" width="40" height="8" stroke="none"/><ellipse cx="32" cy="30" rx="20" ry="8" fill="#f6d27a"/></g>'),
  ore:()=>svgW('<polygon points="32,6 44,26 38,56 24,56 18,26" fill="#4fc3d9"/><polygon points="32,6 44,26 32,30" fill="#a8f0ff"/><polygon points="32,30 44,26 38,56" fill="#2a8aa0"/><polygon points="12,34 20,30 24,56 8,56" fill="#3aa8bf"/><polygon points="52,38 58,56 42,56" fill="#2a8aa0"/>'),
  ear:c=>svgW('<circle cx="32" cy="16" r="7" fill="none" stroke="{c}" stroke-width="4"/><path d="M32 26 L41 44 L32 58 L23 44Z" fill="{c}" stroke="#fff" stroke-width="1.5"/>',c),
  ring:c=>svgW('<ellipse cx="32" cy="42" rx="18" ry="15" fill="none" stroke="{c}" stroke-width="6"/><polygon points="32,6 43,17 32,28 21,17" fill="#ff6a6a" stroke="#fff" stroke-width="1.5"/>',c),
  neck:c=>svgW('<path d="M10 8 Q32 58 54 8" fill="none" stroke="{c}" stroke-width="4"/><circle cx="32" cy="46" r="9" fill="{c}" stroke="#fff" stroke-width="1.5"/>',c),
  glove:c=>svgW('<path d="M18 58V34l-6-10 5-3 6 8V10h5v22V8h5v24V12h5v22V18h5v24l-5 16z" fill="{c}" stroke="#222" stroke-width="1.5"/>',c),
  legs:c=>svgW('<path d="M16 6h32l4 24-8 28H34l-2-26-2 26H20l-8-28z" fill="{c}" stroke="#222" stroke-width="2"/><rect x="16" y="6" width="32" height="7" fill="#e3b559" stroke="#222" stroke-width="1.5"/><circle cx="23" cy="34" r="4" fill="#fff" opacity=".55"/><circle cx="41" cy="34" r="4" fill="#fff" opacity=".55"/>',c),
  brace:c=>svgW('<ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="{c}" stroke-width="8"/><ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="#222" stroke-width="1.5"/><polygon points="32,6 41,15 32,24 23,15" fill="#7fe8ff" stroke="#fff" stroke-width="1.5"/>',c),
  belt:c=>svgW('<rect x="4" y="22" width="56" height="18" rx="3" fill="{c}" stroke="#222" stroke-width="2"/><rect x="24" y="18" width="16" height="26" rx="3" fill="#e3b559" stroke="#222" stroke-width="2"/><rect x="29" y="25" width="6" height="12" fill="#222"/><path d="M40 40l6 18h-8z" fill="{c}" stroke="#222" stroke-width="1.5"/>',c),
  boot:c=>svgW('<path d="M22 6h18v26l16 9v17H12V40l10-4z" fill="{c}" stroke="#222" stroke-width="2"/>',c),
  wpn:c=>ICONS.blade(c),
  wpn2:c=>svgW('<path d="M32 4l5 6-3 26H30L27 10z" fill="#dfe8f0" stroke="#6b7a88" stroke-width="1.5"/><path d="M20 38h24l-3 6H23z" fill="{c}" stroke="#222" stroke-width="1.5"/><rect x="29" y="44" width="6" height="14" fill="#6b4a2a"/><circle cx="32" cy="60" r="3" fill="{c}"/>',c),
  blade:c=>svgW('<path d="M32 3l6 7v31H26V10z" fill="#dfe8f0" stroke="#6b7a88" stroke-width="1.5"/><rect x="19" y="41" width="26" height="6" rx="2" fill="{c}"/><rect x="29" y="47" width="6" height="13" fill="#6b4a2a"/>',c),
  robe:c=>svgW('<path d="M22 6h20l11 14-9 6v32H20V26l-9-6z" fill="{c}" stroke="#e3b559" stroke-width="2"/>',c)
};
function bagItems(){
  const a=[];
  if(P.coins>0)a.push({id:'coins',n:'Coins',v:P.coins,t:fmtQ(P.coins),r:'leg',ic:ICONS.coin(),d:'Spend them at the Potion Merchant.'});
  if(P.ore>0)a.push({id:'ore',n:'Darksteel Ore',v:P.ore,t:fmtQ(P.ore),r:'leg',ic:ICONS.ore(),d:'Temper your gear at the Lotus Forge (O in a hub).'});
  for(const k of ['hp','qi','tp'])if(P.pots[k]>0)a.push({id:k,n:POTS[k].n,v:P.pots[k],t:fmtQ(P.pots[k]),r:k==='hp'?'epic':(k==='tp'?'leg':''),ic:ICONS[k](),d:POTS[k].d+'.',pot:k});
  if(P.wlv>0&&P.gear.wpn.g===0)a.push({id:'blade',n:'Primary Weapon (Blade)',v:P.wlv,t:'+'+P.wlv,r:'epic',eq:1,ic:ICONS.blade('#e3b559'),d:'Your starting Blade, forge level +'+P.wlv+'. A boss-dropped Primary Weapon can replace it. Temper it at the Lotus Forge.'});
  if(P.alv>0&&P.gear.robe.g===0)a.push({id:'robe',n:'Robe',v:P.alv,t:'+'+P.alv,r:'epic',eq:1,ic:ICONS.robe(skinOf(SKIN).robe),d:'Your starting Robe, forge level +'+P.alv+'. A boss-dropped Robe can replace it. Temper it at the Lotus Forge.'});
  for(const q of GEAR){const o=P.gear[q.k];if(o.g>0)a.push({id:'g_'+q.k,n:gearName(q,o),v:o.r*1e6+Math.round(gearScore(o)*100)+o.lv,t:'+'+o.lv,r:RAR[o.r].cls||'rare',eq:1,ic:ICONS[q.k](RAR[o.r].c),d:gearDesc(q,o)})}
  for(const it of bagArr()){const q=GEAR.find(z=>z.k===it.slot);a.push({id:'s_'+it.u,n:gearName(q,it),v:1,t:'G'+it.g,r:RAR[it.r].cls||'rare',ic:ICONS[q.k](RAR[it.r].c),d:statTxt(it.st,0,null)+'. Sells for '+oreOf(it)+' ore.',stored:it})}
  return a;
}
function sellStored(u){const A=bagArr(),i=A.findIndex(x=>x.u===u);if(i<0)return;const it=A[i],q=GEAR.find(z=>z.k===it.slot),ore=oreOf(it);A.splice(i,1);P.ore+=ore;bagLog('Sold '+gearName(q,it)+' \u2192 '+ore+' ore','#7fe0ee');bagSel=null;bagConfirm=null;save();renderBag()}
function sellMany(){const A=bagArr();let n=0,ore=0;
  for(let i=A.length-1;i>=0;i--){const it=A[i];if(bagPick.has(it.u)){ore+=oreOf(it);n++;A.splice(i,1)}}
  if(n){P.ore+=ore;bagLog('Sold '+n+' piece'+(n>1?'s':'')+' \u2192 '+ore.toLocaleString()+' ore','#7fe0ee');say('Sold '+n+' piece'+(n>1?'s':'')+' for '+ore.toLocaleString()+' ore.','#7fe0ee',5000);save()}
  bagPick.clear();bagConfirm=null;bagSel=null;renderBag()}
function equipStored(u){const A=bagArr(),i=A.findIndex(x=>x.u===u);if(i<0)return;const it=A[i],o=P.gear[it.slot];
  const q=GEAR.find(z=>z.k===it.slot),oldName=o.g>0?gearName(q,o):'';
  if(o.g>0)A[i]={slot:it.slot,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:it.u};else A.splice(i,1);
  o.g=it.g;o.r=it.r;o.st=it.st;bagSel=o.g>0&&oldName?'s_'+it.u:null;bagConfirm=null;
  say('Equipped '+gearName(q,it)+(oldName?'. '+oldName+' is in your bag (selected). Tap Equip to wear it again.':'.'),it.col,7000);bagLog('Equipped '+gearName(q,it)+(oldName?'; '+oldName+' \u2192 bag':''),it.col);
  save();renderBag();if(!$('forge').hidden)renderForge()}
/* v5_76 Unequip: the worn piece goes back to the bag (selected), the slot keeps its forge level. A weapon / robe slot falls back to the plain Blade / Robe.
   Wearing a piece never changes the bag count (it moves from 'worn' to 'bag'), so there is always room. */
function unequipGear(k){
  const q=GEAR.find(z=>z.k===k),o=q&&P.gear[k];if(!o||o.g<=0)return;
  const nm=gearName(q,o),it={slot:k,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:bagUid++};
  bagArr().push(it);o.g=0;o.r=0;o.st={};
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());
  bagSel='s_'+it.u;bagConfirm=null;
  say('Unequipped '+nm+'. It is in your bag (selected).',it.col,5000);bagLog('Unequipped '+nm,it.col);
  save();renderBag();if(!$('forge').hidden)renderForge();
}
/* Auto-equip best: for every gear slot, wear the bag piece with the highest stat score (the same score the game already uses for drops);
   a tie goes to the higher grade. The piece you were wearing goes to the bag. Forge level stays with the slot, so it is not part of the comparison. */
function autoEquipBest(){
  const A=bagArr(),done=[];
  for(const q of GEAR){
    const o=P.gear[q.k];let bi=-1,bs=o.g>0?gearScore(o):-1,bg=o.g>0?o.g:0;
    for(let i=0;i<A.length;i++){const it=A[i];if(it.slot!==q.k)continue;const sc=gearScore(it);
      if(sc>bs+1e-9||(Math.abs(sc-bs)<=1e-9&&it.g>bg)){bi=i;bs=sc;bg=it.g}}
    if(bi<0)continue;
    const it=A[bi],had=o.g>0;
    if(had)A[bi]={slot:q.k,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:it.u};else A.splice(bi,1);
    o.g=it.g;o.r=it.r;o.st=it.st;done.push(gearName(q,it));
  }
  bagSel=null;bagConfirm=null;
  if(done.length){say('Auto-equipped: '+done.join(', ')+'.','#e3b559',7000);bagLog('Auto-equipped '+done.length+' piece'+(done.length>1?'s':''),'#e3b559');save()}
  else say('You are already wearing your best gear.','#8d9aa2',4000);
  renderBag();if(!$('forge').hidden)renderForge();
}
function snapSeen(){bagSeen={};for(const it of bagItems())bagSeen[it.id]=it.v}
function renderBag(){
  const items=bagItems(),total=BAG_CAP;
  if(!bagSeen)snapSeen();
  if(bagSel&&!items.some(i=>i.id===bagSel))bagSel=null;
  $('bagCnt').textContent=items.length+' / '+BAG_CAP;
  $('bagLv').textContent='Lv. '+P.lvl;
  const pick=it=>{
    if(bagMulti){if(!it.stored){say('Only spare gear in your bag can be sold.','#8d9aa2',2500);return}const u=it.stored.u;bagPick.has(u)?bagPick.delete(u):bagPick.add(u);bagConfirm=null;renderBag();return}
    if(bagSel!==it.id)bagConfirm=null;bagSel=it.id;renderBag()};
  const mkSlot=it=>{
    const b=document.createElement('button');b.type='button';
    b.className='bslot '+it.r+(bagMulti?(it.stored&&bagPick.has(it.stored.u)?' msel':''):(bagSel===it.id?' sel':''));b.title=it.n;b.innerHTML=it.ic;
    if(!it.eq&&it.v>(bagSeen[it.id]||0)){const ad=document.createElement('span');ad.className='ad';ad.textContent='NEW';b.appendChild(ad)}
    const q=document.createElement('span');q.className='q';q.textContent=it.t;b.appendChild(q);
    b.addEventListener('click',()=>pick(it));return b};
  /* equipped gear around the avatar: left and right columns */
  const SIDE_L=['wpn','wpn2','glove','brace','ring','belt'],SIDE_R=['ear','neck','robe','legs','boot'];
  const fillSide=(el,keys)=>{
    el.innerHTML='';
    for(const k of keys){
      const q=GEAR.find(z=>z.k===k),o=P.gear[k];
      const id=o.g>0?'g_'+k:(k==='wpn'?'blade':k==='robe'?'robe':null);
      const it=id&&items.find(x=>x.id===id);
      if(it){el.appendChild(mkSlot(it));continue}
      const b=document.createElement('div');b.className='bslot empty';b.title=q.n+' (empty)';
      const sl=document.createElement('span');sl.className='sl';sl.textContent=q.ic;b.appendChild(sl);el.appendChild(b);
    }
  };
  fillSide($('bagEqL'),SIDE_L);fillSide($('bagEqR'),SIDE_R);
  /* spare items (not equipped) on the right */
  const g=$('bagItems');g.innerHTML='';
  const spare=items.filter(i=>!i.eq),eqN=items.length-spare.length,slots=Math.max(spare.length,BAG_CAP-eqN);
  for(let i=0;i<slots;i++){
    const it=spare[i];
    if(!it){const b=document.createElement('button');b.type='button';b.className='bslot empty';b.disabled=true;g.appendChild(b);continue}
    g.appendChild(mkSlot(it));
  }
  if(!BAGV.raf)BAGV.raf=requestAnimationFrame(bagPreview);
  const info=$('bagInfo');info.innerHTML='';
  const sel=items.find(i=>i.id===bagSel);
  $('bagMulti').classList.toggle('on',bagMulti);$('bagMulti').textContent=bagMulti?'Done selecting':'Sell multiple';
  if(bagMulti){
    const A=bagArr();for(const u of [...bagPick])if(!A.some(x=>x.u===u))bagPick.delete(u);
    let ore=0;for(const it of A)if(bagPick.has(it.u))ore+=oreOf(it);const n=bagPick.size;
    const d=document.createElement('div'),sm=document.createElement('small');
    sm.textContent=bagConfirm==='multi'?'Sell '+n+' piece'+(n>1?'s':'')+'? You get +'+ore.toLocaleString()+' ore ('+P.ore.toLocaleString()+' \u2192 '+(P.ore+ore).toLocaleString()+'). This cannot be undone.'
      :(n?n+' selected \u00b7 '+ore.toLocaleString()+' ore':'Tap spare gear to tick it. Equipped gear and potions cannot be selected.');
    d.appendChild(sm);info.appendChild(d);
    const w=document.createElement('div');w.className='bagact wrap';
    const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
    if(bagConfirm==='multi'){mk('Confirm sell','pri',sellMany);mk('Cancel','',()=>{bagConfirm=null;renderBag()})}
    else{mk('Select all','',()=>{for(const it of A)bagPick.add(it.u);renderBag()},!A.length);mk('Clear','',()=>{bagPick.clear();renderBag()},!n);mk('Sell selected ('+n+')','pri',()=>{bagConfirm='multi';renderBag()},!n)}
    info.appendChild(w);
  }else
  if(!sel){const e=document.createElement('span');e.style.color='#8d9aa2';e.textContent='Tap an item to see what it does.';info.appendChild(e)}
  else{
    const d=document.createElement('div'),nm=document.createElement('b');nm.textContent=sel.n+(sel.pot?' \u00d7 '+sel.v:'');
    nm.style.color=sel.pot?POTS[sel.pot].c:'#e8e0ca';d.appendChild(nm);
    const sm=document.createElement('small');sm.textContent=sel.d;d.appendChild(sm);info.appendChild(d);
    if(sel.stored){const u=sel.stored.u,w=document.createElement('div');w.className='bagact';
      if(bagConfirm===u){
        const it=sel.stored,q=GEAR.find(z=>z.k===it.slot),o=P.gear[it.slot];
        sm.innerHTML='';sm.appendChild(document.createTextNode('Sell '+sel.n+' (grade '+it.g+', '+RAR[it.r].n+')? You get +'+oreOf(it)+' ore ('+P.ore.toLocaleString()+' \u2192 '+(P.ore+oreOf(it)).toLocaleString()+'). This cannot be undone.'));
        const c=document.createElement('button'),x=document.createElement('button');c.type=x.type='button';
        c.className='btn pri';c.textContent='Confirm sell';c.addEventListener('click',()=>sellStored(u));
        x.className='btn';x.textContent='Cancel';x.addEventListener('click',()=>{bagConfirm=null;renderBag()});
        w.appendChild(c);w.appendChild(x);
      }else{
        const e=document.createElement('button'),b=document.createElement('button');e.type=b.type='button';
        e.className='btn';e.textContent='Equip';e.addEventListener('click',()=>equipStored(u));
        b.className='btn pri';b.textContent='Sell to ore';b.addEventListener('click',()=>{bagConfirm=u;renderBag()});
        w.appendChild(e);w.appendChild(b);
      }
      info.appendChild(w)}
    if(sel.eq&&sel.id.slice(0,2)==='g_'){const k=sel.id.slice(2),w=document.createElement('div'),b=document.createElement('button');w.className='bagact';b.type='button';b.className='btn';b.textContent='Unequip';b.addEventListener('click',()=>unequipGear(k));w.appendChild(b);info.appendChild(w)}
    if(sel.pot){const k=sel.pot,b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent=pot[k]>0?Math.ceil(pot[k])+'s':(k==='tp'&&P.tp>0?'...':'Use');b.disabled=pot[k]>0;b.addEventListener('click',()=>{usePot(k);renderBag()});info.appendChild(b)}
  }
}
/* ---------- Warehouse: private storage in the hub (100 slots, spare gear only; saved with your character) ---------- */
let whSel=null;
function openWh(){
  if(!started)return;
  if(!inTown()){say('Return to your hub to use the Warehouse.','#8d9aa2');return}
  whSel=null;renderWh();$('wh').hidden=false;
}
function closeWh(){$('wh').hidden=true;whSel=null}
function whMove(u,toWh){
  const A=bagArr(),W=whArr(),src=toWh?A:W,dst=toWh?W:A,i=src.findIndex(x=>x.u===u);if(i<0)return;
  if(toWh&&W.length>=WH_CAP){say('The Warehouse is full ('+WH_CAP+').','#8d9aa2');return}
  if(!toWh&&bagCount()>=BAG_CAP){say('Your bag is full.','#8d9aa2');return}
  dst.push(src.splice(i,1)[0]);whSel=null;save();renderWh();if(!$('bag').hidden)renderBag();
}
function whStoreAll(){
  const A=bagArr(),W=whArr();let n=0;
  while(A.length&&W.length<WH_CAP){W.push(A.shift());n++}
  if(n)say('Stored '+n+' piece'+(n>1?'s':'')+' in the Warehouse.','#e3b559',4000);
  else say(A.length?'The Warehouse is full.':'No spare gear in your bag.','#8d9aa2',3000);
  whSel=null;save();renderWh();if(!$('bag').hidden)renderBag();
}
function renderWh(){
  const W=whArr(),A=bagArr();
  if(whSel&&!W.some(x=>x.u===whSel)&&!A.some(x=>x.u===whSel))whSel=null;
  $('whCnt').textContent=W.length+' / '+WH_CAP;$('whBagCnt').textContent=bagCount()+' / '+BAG_CAP+' slots';
  const fill=(el,arr,min)=>{
    el.innerHTML='';
    for(let i=0;i<Math.max(min,arr.length);i++){
      const it=arr[i],b=document.createElement('button');b.type='button';
      if(!it){b.className='bslot empty';b.disabled=true;el.appendChild(b);continue}
      const q=GEAR.find(z=>z.k===it.slot);
      b.className='bslot '+(RAR[it.r].cls||'rare')+(whSel===it.u?' sel':'');b.title=gearName(q,it);b.innerHTML=ICONS[q.k](RAR[it.r].c);
      const t=document.createElement('span');t.className='q';t.textContent='G'+it.g;b.appendChild(t);
      b.addEventListener('click',()=>{whSel=it.u;renderWh()});el.appendChild(b);
    }
  };
  fill($('whGrid'),W,WH_CAP);fill($('whBag'),A,12);
  const info=$('whInfo');info.innerHTML='';
  const inW=W.find(x=>x.u===whSel),it=inW||A.find(x=>x.u===whSel);
  if(!it){const e=document.createElement('span');e.style.color='#8d9aa2';e.textContent='Tap a piece to move it between the bag and the Warehouse.';info.appendChild(e);return}
  const q=GEAR.find(z=>z.k===it.slot),d=document.createElement('div'),nm=document.createElement('b');
  nm.textContent=gearName(q,it);nm.style.color=RAR[it.r].c;d.appendChild(nm);
  const sm=document.createElement('small');sm.textContent=statTxt(it.st,0,null);d.appendChild(sm);info.appendChild(d);
  const b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent=inW?'Withdraw to bag':'Store in Warehouse';
  b.addEventListener('click',()=>whMove(it.u,!inW));info.appendChild(b);
}
$('bWare').addEventListener('click',openWh);$('whClose').addEventListener('click',closeWh);$('whAll').addEventListener('click',whStoreAll);
$('wh').addEventListener('pointerdown',e=>{if(e.target===$('wh'))closeWh()});
function closeBag(){$('bag').hidden=true;bagConfirm=null;bagMulti=false;bagPick.clear();snapSeen()}
function toggleBag(){if(!started)return;const b=$('bag');if(b.hidden){b.hidden=false;renderBag()}else closeBag()}
$('bBag').addEventListener('click',toggleBag);$('bagAuto').addEventListener('click',autoEquipBest);$('bagMulti').addEventListener('click',()=>{bagMulti=!bagMulti;bagPick.clear();bagConfirm=null;renderBag()});$('bagClose').addEventListener('click',closeBag);
$('autoPot').addEventListener('change',e=>{P.autoPot=e.target.checked;save()});
$('apHp').addEventListener('input',e=>{P.apHp=clamp(+e.target.value||35,5,95);$('apHpV').textContent=P.apHp+'%'});$('apHp').addEventListener('change',()=>save());
$('apQi').addEventListener('input',e=>{P.apQi=clamp(+e.target.value||20,5,95);$('apQiV').textContent=P.apQi+'%'});$('apQi').addEventListener('change',()=>save());
$('fightBack').addEventListener('change',e=>{P.fightBack=e.target.checked;save()});
$('tapMove').addEventListener('change',e=>{P.tapMove=e.target.checked;if(!P.tapMove)P.mv=null;save()}); /* v5_134 phone: tapping the ground only walks when this is on */
$('perfSel').value=PERF;
$('perfSel').addEventListener('change',e=>{const v=e.target.value;try{localStorage.setItem('alperf',v)}catch(_){}say('Performance mode: '+v+' \u2014 reloading\u2026','#e3b559');try{saveNow()}catch(_){}setTimeout(()=>location.reload(),700)});
/* ---------- GOLD: premium currency, kept ON THE SERVER (coupons.go) ----------
   The balance lives in the account on the server, never in the browser save, so it cannot be edited. You get gold by redeeming a coupon code
   (codes are generated by the server owner, see README); here it is exchanged for coins or ore. P.gold is only a display copy of the server balance. */
const WALLET={coin:5000,ore:100};
function walletLoad(){return api('/api/wallet').then(r=>{P.gold=Math.max(0,+r.gold||0);WALLET.coin=+r.coinRate||5000;WALLET.ore=+r.oreRate||100;if(!$('shop').hidden)renderShop()}).catch(()=>{})}
function buyWithGold(kind,n){
  n=Math.min(n,P.gold);if(n<=0){say('Not enough gold.','#8d9aa2');return}
  api('/api/exchange',{kind,n}).then(r=>{
    P.gold=Math.max(0,+r.gold||0);
    if(r.kind==='coins'){P.coins=Math.min(2e9,P.coins+r.grant);bagLog('Exchanged '+r.n+' gold for '+r.grant.toLocaleString()+' coins','#e3b559')}
    else{P.ore=Math.min(2e9,P.ore+r.grant);bagLog('Exchanged '+r.n+' gold for '+r.grant.toLocaleString()+' darksteel ore','#7fe0ee')}
    save();renderShop();
  }).catch(e=>{say(e.message||'Exchange failed.','#d9503f');walletLoad()});
}
/* confirmation before spending gold on coins or ore */
let xcPend=null;
function confirmExchange(kind,n){
  n=Math.min(n,P.gold);if(n<=0){say('Not enough gold.','#8d9aa2');return}
  const per=kind==='coins'?WALLET.coin:WALLET.ore,what=kind==='coins'?'coins':'darksteel ore';
  xcPend={kind,n};
  $('xcText').textContent='Spend '+n.toLocaleString()+' gold to get '+(n*per).toLocaleString()+' '+what+'? (1 gold = '+per.toLocaleString()+' '+what+')';
  $('xcDlg').hidden=false;
}
function closeXc(){$('xcDlg').hidden=true;xcPend=null}
$('xcCancel').addEventListener('click',closeXc);
$('xcDlg').addEventListener('pointerdown',e=>{if(e.target===$('xcDlg'))closeXc()});
$('xcGo').addEventListener('click',()=>{if(!xcPend)return;const {kind,n}=xcPend;closeXc();buyWithGold(kind,n)});
function redeemCoupon(code){
  code=String(code||'').trim();if(!code){say('Enter a coupon code.','#8d9aa2');return}
  api('/api/redeem',{code}).then(r=>{
    P.gold=Math.max(0,+r.balance||0);
    say('Coupon accepted: +'+(r.gold|0).toLocaleString()+' gold.','#ffc94d',7000);bagLog('+'+(r.gold|0).toLocaleString()+' gold (coupon)','#ffc94d');
    const i=$('cpnIn');if(i)i.value='';renderShop();
  }).catch(e=>say(e.message||'Could not redeem the coupon.','#d9503f'));
}
function renderGoldBox(){
  const bx=$('goldBox');bx.innerHTML='';
  const h=document.createElement('div');h.style.cssText='margin:6px 0 2px;font-size:12px;color:#ffc94d;font-weight:700';h.textContent='Gold Exchange \u00b7 you have '+P.gold.toLocaleString()+' gold';bx.appendChild(h);
  const cr=document.createElement('div');cr.style.cssText='display:flex;gap:6px;margin:4px 0';
  const inp=document.createElement('input');inp.id='cpnIn';inp.type='text';inp.placeholder='Coupon code  XXXX-XXXX-XXXX-XXXX';inp.maxLength=32;inp.autocomplete='off';inp.spellcheck=false;
  inp.style.cssText='flex:1;min-width:0;padding:6px 8px;background:#0a1019;border:1px solid #2d4262;color:#e8edf4;font:inherit;font-size:12px;text-transform:uppercase';
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')redeemCoupon(inp.value)});inp.addEventListener('keyup',e=>e.stopPropagation());
  const rb=document.createElement('button');rb.type='button';rb.className='btn pri';rb.textContent='Redeem';rb.addEventListener('click',()=>redeemCoupon(inp.value));
  cr.appendChild(inp);cr.appendChild(rb);bx.appendChild(cr);
  for(const [kind,lb,per,col] of [['coins','Coins',WALLET.coin,'#e3b559'],['ore','Darksteel Ore',WALLET.ore,'#7fe0ee']]){
    const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;justify-content:space-between;margin:3px 0;flex-wrap:wrap';
    const t=document.createElement('span');t.style.cssText='font-size:12px;color:'+col;t.textContent='1 gold = '+per.toLocaleString()+' '+lb.toLowerCase();row.appendChild(t);
    const w=document.createElement('span');w.className='bagact';
    for(const [lb2,n] of [['1',1],['10',10],['100',100],['Max',1e9]]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Buy '+lb2;b.disabled=P.gold<1;b.addEventListener('click',()=>confirmExchange(kind,n));w.appendChild(b)}
    row.appendChild(w);bx.appendChild(row);
  }
}
/* purchase dialog: pick a quantity, then pay the total in coins */
let buyK=null,buyN=1,buyPadVal='';
function buyMaxN(k){const pr=priceOf(k);return Math.max(0,Math.min(Math.floor(P.coins/pr),POT_MAX-P.pots[k]))}
function renderBuy(){
  const k=buyK,pr=priceOf(k),mx=buyMaxN(k);
  buyN=Math.max(mx>0?1:0,Math.min(buyN,mx));
  $('buyIco').innerHTML=ICONS[k]();$('buyName').textContent=POTS[k].n;$('buyOwned').textContent='Owned: '+P.pots[k].toLocaleString();
  $('buyQty').textContent=buyN.toLocaleString();$('buyMax').textContent=mx.toLocaleString();
  $('buyCoin').innerHTML=ICONS.coin();$('buyTotal').textContent=(buyN*pr).toLocaleString();
  $('buyMinus').disabled=buyN<=1;$('buyPlus').disabled=buyN>=mx;$('buyMax').disabled=mx<1;$('buyGo').disabled=buyN<1;
}
function openBuy(k){
  if(buyMaxN(k)<1){say(P.pots[k]>=POT_MAX?'Your bag cannot hold more.':'Not enough coins.','#8d9aa2');return}
  buyK=k;buyN=1;$('buyPadBox').hidden=true;$('buyDlg').hidden=false;renderBuy();
}
function closeBuy(){$('buyDlg').hidden=true;buyK=null;$('buyPadBox').hidden=true;buyPadVal=''}
function buyPot(k,n){
  const pr=priceOf(k);n=Math.min(n,buyMaxN(k));
  if(n<=0){say(P.pots[k]>=POT_MAX?'Your bag cannot hold more.':'Not enough coins.','#8d9aa2');return}
  P.coins-=n*pr;P.pots[k]+=n;bagLog('Bought '+n+' '+POTS[k].n+(n>1?'s':'')+' (-'+(n*pr).toLocaleString()+' coins)',POTS[k].c);save();renderShop();
}
$('buyMinus').addEventListener('click',()=>{buyN--;renderBuy()});
$('buyPlus').addEventListener('click',()=>{buyN++;renderBuy()});
$('buyReset').addEventListener('click',()=>{buyN=1;renderBuy()});
$('buyMax').addEventListener('click',()=>{buyN=buyMaxN(buyK);renderBuy()});
$('buyCancel').addEventListener('click',closeBuy);
$('buyDlg').addEventListener('pointerdown',e=>{if(e.target===$('buyDlg'))closeBuy()});
$('buyGo').addEventListener('click',()=>{if(!buyK)return;const k=buyK,n=buyN;closeBuy();buyPot(k,n)});
$('buyPad').addEventListener('click',()=>{
  const b=$('buyPadBox');if(!b.hidden){b.hidden=true;return}
  buyPadVal='';b.innerHTML='';
  for(const t of ['1','2','3','4','5','6','7','8','9','C','0','OK']){
    const x=document.createElement('button');x.type='button';x.className='qbtn';x.textContent=t;
    x.addEventListener('click',()=>{
      if(t==='C')buyPadVal='';else if(t==='OK'){if(buyPadVal)buyN=+buyPadVal;b.hidden=true;renderBuy();return}
      else if(buyPadVal.length<5)buyPadVal=(buyPadVal+t).replace(/^0+/,'');
      if(buyPadVal)buyN=+buyPadVal;renderBuy();
    });b.appendChild(x);
  }
  b.hidden=false;
});
let shopSel='hp';
function renderShop(){
  $('shopCoins').textContent='Coins: '+P.coins.toLocaleString()+' \u00b7 Gold: '+P.gold.toLocaleString();renderGoldBox();
  $('shopInfo').textContent=potPrice().toLocaleString()+' coins per potion \u00b7 '+tpPrice().toLocaleString()+' per Home Scroll';
  const g=$('shopGrid');g.innerHTML='';
  for(const k of ['hp','qi','tp']){
    const b=document.createElement('button');b.type='button';b.className='bslot '+(k==='hp'?'epic':(k==='tp'?'leg':''))+(shopSel===k?' sel':'');b.title=POTS[k].n;b.innerHTML=ICONS[k]();
    const q=document.createElement('span');q.className='q';q.textContent=fmtQ(P.pots[k]);b.appendChild(q);
    b.addEventListener('click',()=>{shopSel=k;renderShop()});g.appendChild(b);
  }
  const k=shopSel,info=$('shopSel');info.innerHTML='';
  const d=document.createElement('div'),nm=document.createElement('b');nm.textContent=POTS[k].n+' \u00b7 '+priceOf(k).toLocaleString()+' coins';nm.style.color=POTS[k].c;d.appendChild(nm);
  const sm=document.createElement('small');sm.textContent=POTS[k].d+' \u00b7 you own '+P.pots[k];d.appendChild(sm);info.appendChild(d);
  const w=document.createElement('div');w.className='bagact';
  {const b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent='Buy';b.disabled=buyMaxN(k)<1;b.addEventListener('click',()=>openBuy(k));w.appendChild(b)}
  info.appendChild(w);
}
function openShop(){
  if(!started)return;
  if(!inTown()||dist(P.x,P.y,NPC.x,NPC.y)>190){say('Walk up to the Potion Merchant in your hub to shop.','#8d9aa2');return}
  renderShop();$('shop').hidden=false;walletLoad();
}
$('shopClose').addEventListener('click',()=>{closeBuy();closeXc();$('shop').hidden=true});
setInterval(()=>{if(started)save()},8000); /* v5_186 20 s -> 8 s */

