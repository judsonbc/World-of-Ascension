/* ---------- combat ---------- */
let lvUpT=0,lvUpT2=0;
function lvBanner(lv,gained,realm){
  const b=$('lvUp');if(!b)return;
  b.innerHTML='';b.className='';
  b.appendChild(document.createElement('b')).textContent='LEVEL UP!';
  b.appendChild(document.createElement('small')).textContent='You reached level '+lv+(gained>1?' (+'+gained+' levels)':'')+(realm?' \u00b7 Breakthrough: '+realm+' realm':'')+' \u00b7 HP & Qi restored';
  b.hidden=false;b.style.animation='none';void b.offsetWidth;b.style.animation='';
  clearTimeout(lvUpT);clearTimeout(lvUpT2);lvUpT=setTimeout(()=>{b.className='fade'},1900);lvUpT2=setTimeout(()=>{b.hidden=true;b.className=''},2450);
}
function gainExp(n){
  if(P.lvl>=MAXLV)return;
  P.exp+=n;if(SV.on)SV.exp+=n;let gained=0,bt=null;
  while(P.lvl<MAXLV&&P.exp>=expNext()){
    P.exp-=expNext();
    const before=realmIdx();P.lvl++;
    P.hp=maxHp();P.qi=maxQi();
    gained++;ring(P.x,P.y,90,'#e3b559');ring(P.x,P.y,150,'#fff3c4','whirl');ring(P.x,P.y,210,'#ffd98a');beams.push({x:P.x,y:P.y,t:0,max:1.1});beams.push({x:P.x,y:P.y,t:0,max:1.6});spark(P.x,P.y,'#ffd98a',60,260,1.1,3,120);spark(P.x,P.y,'#ffffff',24,140,.8,2.4,160);
    pop(P.x,P.y-40,'LEVEL '+P.lvl,'#e3b559',18);
    say('You reached level '+P.lvl+'.','#e3b559');SFX('levelup');fxs({k:'ri',x:P.x,y:P.y,r:90,c:'#e3b559',s:1});
    if(P.lvl%5===0){unlock(P.lvl/5);for(const ck of CLK)if(ck&&ck[P.lvl/5]!==undefined)unlockId(ck[P.lvl/5]);for(const sk of SIGK)if(sk[P.lvl]!==undefined){unlockId(sk[P.lvl]);pop(P.x,P.y-70,'SIGNATURE SKILL','#ffe27a',16)}}
    for(const id of MELEE)if(P.lvl>1&&SKILLS[id].lv===P.lvl)unlockId(id);
    if(realmIdx()>before){bt=realmName(realmIdx());say('Breakthrough! You enter the '+realmName(realmIdx())+' realm.','#5fd3a5')}
    save();
  }
  if(gained)lvBanner(P.lvl,gained,bt);
}
function hitMonster(m,dmg,crit){
  if(m.dead||m.pend||pvpOnly()||inTown())return 0; /* v5_90 no attacking inside the safe hub */
  if(rnd()>hitChance(m)){ /* missed: no damage, but the monster still notices you */
    if(m.state==='idle'&&!inTown())m.state='chase';
    pop(m.x,m.y-m.r-8,'MISS','#9aa7ad',12);SFX('miss');combatPing();return 0;
  }
  dmg=Math.max(1,Math.round(dmg*(1-monRed(m))*atkGap(m.lvl,P.lvl)*(1+(m.boss?bsaVal():mabVal())/100)));
  m.hp-=dmg;m.flash=.12;
  if(P.lsT>0||P.markT>0||P.linkT>0)sigOnHit(m,dmg); /* v5_160 lifesteal / death mark / soul web */
  spark(m.x,m.y,crit?'#ffd36b':'#ffd9a0',crit?12:6,170,.35,2.6);if(crit)shake=Math.max(shake,.5);
  if(m.state==='idle'&&!inTown())m.state='chase';
  pop(m.x,m.y-m.r-8,String(dmg)+(crit?'!':''),crit?'#ffd36b':'#fff',crit?17:13);SFX(crit?'crit':'hit');combatPing();
  if(MP){
    /* the server applies the damage and decides the kill; we only predict the health bar */
    netSend({t:'hit',i:m.id,d:dmg,cr:crit?1:0});m.predT=.35;
    if(m.hp<=0){m.hp=0;m.pend=true}
    return dmg;
  }
  if(m.hp<=0)killMonster(m);
  return dmg;
}
function killMonster(m,noReward){
  m.dead=true;m.dieT=.5;m.pend=false;m.respawn=MP?1e9:(m.boss?90:14+rnd()*8);
  if(dist(m.x,m.y,P.x,P.y)<800)SFX(m.boss?'boss':'kill');
  spark(m.x,m.y,m.col,m.boss?40:18,220,.7,3.2);if(m.boss)shake=1;
  if(P.target===m)P.target=null;
  if(P.sel===m)P.sel=null;
  if(m.boss)say(m.name+' has fallen.','#e3b559');
  if(!noReward)rewardKill(m);
}
/* experience and loot are personal: everyone who damaged the monster gets their own */
function rewardKill(m,noLoot){
  gainExp(Math.max(1,Math.round(m.exp*Math.max(.1,Math.min(1,1-(P.lvl-m.lvl)*.04)))));
  if(noLoot){say(m.name+' fell to another fighter\u2019s last hit. Its loot goes to them.','#8d9aa2');return}  /* boss loot: last hit only */
  /* every drop goes straight into the bag */
  const coin=Math.round((2+m.lvl*2)*(m.boss?15:1)*(.7+rnd()*.6));
  P.coins+=coin;lootIcon('c','&#9679;',coin,'#e3b559');pop(P.x,P.y-30,'+'+coin,'#e3b559',12);bagLog('+'+coin.toLocaleString()+' coins','#e3b559');
  if(m.boss||rnd()<.12){const o=m.boss?4+Math.floor(m.lvl/100):1;P.ore+=o;lootIcon('o','&#9670;',o,'#7fe0ee');pop(P.x+14,P.y-44,'+'+o+' ore','#7fe0ee',12);bagLog('+'+o+' darksteel ore','#7fe0ee')}
  addPot('hp',m.boss?3+Math.floor(rnd()*4):(rnd()<POT_DROP?1:0));
  addPot('qi',m.boss?3+Math.floor(rnd()*4):(rnd()<POT_DROP?1:0));
  addPot('tp',m.boss?1+Math.floor(rnd()*2):(rnd()<TP_DROP?1:0));
  if(m.boss&&rnd()<GEAR_DROP_CHANCE)dropGear(m);
  if(m.boss&&rnd()<EGG_DROP_CHANCE)giveEgg(m);
}
function dropGear(m){
  /* 1-3 random pieces per boss: random slot, random rarity, random stat rolls */
  const t=rnd(),n=t<.55?1:t<.88?2:3,w=W[curWorld],f=(m.lvl-w.lo)/Math.max(1,w.hi-w.lo);
  for(let i=0;i<n;i++){
    const miss=GEAR.filter(q=>P.gear[q.k].g===0),pool=miss.length&&rnd()<.5?miss:GEAR;
    const q=pool[Math.floor(rnd()*pool.length)],it=rollGear(q,curWorld,f,rollRarity());
    say(m.name+' dropped '+gearName(q,it)+'!',it.col);
    takeGear(it);
  }
}
const fmtSt=(k,v)=>SPECIAL[k]?Math.round(v*100)/100:Math.round(v*10)/10;
function statArr(st,lv,q){const a=[];for(const k of Object.keys(st)){const f=q&&q.st[k];if(f&&FLAT_STATS[k]){a.push('+'+fmtSt(k,st[k])+STAT_LBL[k]);const p=slotFlatPct(q,k,lv)*100;if(p>0)a.push('+'+fg2(p)+'% '+STAT_LBL[k].trim()+' (forge)')}else a.push('+'+fmtSt(k,st[k]+(f?forgeEff(lv)*f[1]:0))+STAT_LBL[k])}return a}
function statTxt(st,lv,q){return statArr(st,lv,q).join(', ')}
const BAG_CAP=50,WH_CAP=100;let bagUid=1; /* bag holds 50 slots; the hub Warehouse holds 100 spare gear pieces */
const bagArr=()=>P.bag||(P.bag=[]);
const whArr=()=>P.wh||(P.wh=[]);
const oreOf=it=>(2+it.g*2)*(1+it.r);
function bagCount(){let n=(P.coins>0)+(P.ore>0)+(P.wlv>0&&P.gear.wpn.g===0)+(P.alv>0&&P.gear.robe.g===0)+(P.eggs>0)+petStacks()+bagArr().length;for(const k of ['hp','qi','tp'])if(P.pots[k]>0)n++;for(const q of GEAR)if(P.gear[q.k].g>0)n++;return n}
/* the bag used to hold 100: anything over the cap moves to the warehouse (up to its 100 slots) */
function fixBagOverflow(){const A=bagArr(),W=whArr();let n=0;while(bagCount()>BAG_CAP&&A.length&&W.length<WH_CAP){W.push(A.pop());n++}if(n){bagLog(n+' spare piece'+(n>1?'s':'')+' moved to the Warehouse (bag is now '+BAG_CAP+' slots)','#8d9aa2');save()}}
function takeGear(it){
  const q=GEAR.find(z=>z.k===it.slot),o=P.gear[q.k],nm=gearName(q,it),A=RAR[it.r];
  if(bagCount()<BAG_CAP){
    it.u=bagUid++;bagArr().push(it);lootIcon('g'+q.k+it.r,'&#10022;',1,it.col);
    say('Stored '+nm+' in your bag ('+statTxt(it.st,0,null)+'). Open the bag to equip it.',it.col);bagLog('Stored '+nm,it.col);pop(P.x,P.y-36,nm,it.col,15);
  }else{
    const ore=oreOf(it);P.ore+=ore;lootIcon('o','&#9670;',ore,'#7fe0ee');
    say('Bag full. Sold '+nm+' for '+ore+' ore.','#7fe0ee');bagLog('Bag full: sold '+nm+' \u2192 '+ore+' ore','#7fe0ee');
  }
  save();if(!$('forge').hidden)renderForge();
}
/* Ranged balance: damage falls off with distance (RANGE_FALL = loss at max range) and one ranged hit can never take more than
   RANGED_CAP of a normal monster's max HP, so long-range skills no longer one-shot. Bosses are not capped. Tune these two numbers. */
const RANGE_FALL=.5,RANGED_CAP=.5;
/* v5_80 NORMAL ATTACK RANGE per class [Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner]: 0 = melee (body size + 30), otherwise the attack
   reaches that many units. Ranged normal attacks lose up to BASIC_FALL of their damage at full range and you stand at BASIC_STAND of the range from the target. */
const BASIC_RANGE=[0,0,0,460,380],BASIC_FALL=.25,BASIC_STAND=.75,BASIC_COL=['','','','#9fe8c8','#9fe0ff'];
function rangedDmg(m,d,fr){d=Math.round(d*(1-RANGE_FALL*clamp(fr,0,1)));if(!m.boss)d=Math.min(d,Math.max(1,Math.round(m.maxhp*RANGED_CAP)));return d}
const CRIT_MUL=1.8;
const SKILL_GCD=1; /* seconds between two skill casts (manual or auto); v5_190: 0.45 -> 1; v5_192: 2; v5_193: back to 1 */
function sd(m,x,fr){const c=rnd()<critChance();let d=Math.round(atkVal()*x*(c?critMul():1)*(.9+rnd()*.2));if(fr!==undefined)d=rangedDmg(m,d,fr);return hitMonster(m,d,c)}
/* the thing skills aim at: the attack target, else the selected monster (or selected player while PvP-flagged) */
function aimT(){const t=P.target&&!P.target.dead?P.target:null;if(t)return t;const q=P.sel;return q&&!q.dead&&(!q.isPl||pvpOk(q))?q:null}
/* v5_81 melee classes (Cultivator, Night Blade, Iron Guardian) are close-range fighters: their ranged-type skills only work on a target within MELEE_SKILL_RANGE
   (nothing is spent otherwise), and their projectiles stop there. Ranged classes (Storm Archer, Spirit Summoner) are unchanged. */
/* v5_82 Iron Guardian: all its attack skills and buffs only fire when the target is in real melee reach (body sizes + IG_PAD), the same reach as the normal attack,
   by hand and in auto-hunt. Before, Bash / Hammer reached 170-200 units and Earthquake / War Cry / Seismic Wave / the buffs triggered on enemies much farther away. */
const IG_PAD=40,IG_DMG_T={bash:1,hammer:1,quake:1,roar:1,counter:1,shockwave:1},IG_AUTO_T={bash:1,hammer:1,quake:1,roar:1,counter:1,shockwave:1,bulwark:1,ironskin:1};
const CAST_T=.3,CAST_T_LONG=.5, /* v5_155 cast pose halved (was .6 / 1.0) */ CAST_NOROOT={charge:1,shadowstep:1,rush:1,gale:1,leap:1},CAST_LONG={meteor:1,spiritbomb:1,rain:1,quake:1,hammer:1,wail:1,wolves:1,guardian:1,roar:1,eagle:1,bulwark:1,volley:1};
const BOSS_LEASH=4500,BOSS_LOSE=3600,MON_LEASH=800,MON_LOSE=1000; /* v5_157 leash enlarged (keep equal to monLeash / monLose / bossLeash / bossLose in game.go): was boss 3000 / 2400, monster 520 / 650 */
const MELEE_SKILL_RANGE=200,MELEE_RANGED_T={pierce:1,fan:1,meteor:1,chain:1,drain:1,kunai:1,venom:1};
const AIM_REACH={charge:400,shadowstep:420,rush:420,shockwave:420,execute:200,siphon:170,bash:170,hammer:200}; /* v5_122 reach used to pick a target for a skill cast with no target */
/* v5_122 manual casts never need a target in range: nothing in reach -> the skill still fires (toward where you face; dashes move you forward) and costs Qi / starts its cooldown.
   Auto-hunt (useSkill(i,true)) keeps the old range checks so it does not waste Qi on far targets. */
const WHIFF_R={shadowstep:420,execute:200,siphon:170,venom:1,bash:170,hammer:200,blast:520,stormarrow:520,chains:400,strike:170,flurry:170,cleave:200,leap:360,chain:420};
function hasFoeFor(t,tg0,mel,mr){
  const r=t==='venom'?(mel?mr:460):WHIFF_R[t],ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=r;
  if(ok(tg0)||nearest(r))return true;
  if(t==='chain'&&tg0&&!tg0.dead&&dist(tg0.x,tg0.y,P.x,P.y)<600)return true;
  if(t==='chains'&&foes().some(q=>dist(q.x,q.y,P.x,P.y)<400))return true;
  return false}
function whiffCast(t,s){
  const a=P.face,cx=Math.cos(a),cy=Math.sin(a);
  if(t==='shadowstep'||t==='leap'){const L=t==='shadowstep'?260:200,sx=P.x,sy=P.y;
    for(let j=0;j<12;j++)spark(sx+cx*L*j/12,sy+cy*L*j/12,s.col,2,60,.4,2.4);
    P.x=sx+cx*L;P.y=sy+cy*L;P.inv=Math.max(P.inv,.3);ring(P.x,P.y,50,s.col,'whirl');fxs({k:'ri',x:P.x,y:P.y,r:50,c:s.col,q:'whirl',s:1});return}
  const D=({blast:200,stormarrow:260,chain:200,chains:160})[t]||90,x=P.x+cx*D,y=P.y+cy*D;
  for(let j=1;j<=6;j++)spark(P.x+cx*D*j/6,P.y+cy*D*j/6,s.col,1,40,.35,2.4);
  ring(x,y,45,s.col);spark(x,y,s.col,14,160,.4,2.4);fxs({k:'ri',x:Math.round(x),y:Math.round(y),r:45,c:s.col})}
/* v5_130 real reach of every attack skill type = [distance from you, 1 if the target's body radius counts]. Mirrors the radius / length used by useSkill itself. */
function skillReach(t,tr,mel,mr){if(SIGR[t])return[SIGR[t],0];switch(t){
  case 'nova':return [tr<0?120:150+tr*14,1];case 'drain':return [170,1];case 'bladestorm':return [120+tr*8,1];
  case 'quake':return [160+tr*12,1];case 'roar':return [240,1];case 'counter':return [150+tr*8,1];
  case 'soulburst':return [140+tr*10,1];case 'wail':return [240,1];case 'harvest':return [200,1];
  case 'chains':return [400,0];case 'shockwave':return [420,1];case 'rush':return [280+tr*10,1];
  case 'shadowstep':return [420,0];case 'execute':return [200,0];case 'siphon':return [170,0];case 'venom':return [mel?mr:460,0];
  case 'charge':return [400,0];case 'bash':case 'strike':case 'flurry':return [170,0];case 'hammer':case 'cleave':return [200,0];case 'leap':return [360,0];
  case 'pierce':case 'fan':return [mel?mr+40:364,1];case 'kunai':return [mel?mr+40:418,1];case 'arrow':return [720,1];case 'volley':return [490,1];
  case 'blast':case 'stormarrow':case 'rain':case 'trap':case 'spiritbomb':return [520,0];case 'meteor':return [450,0];case 'chain':return [600,0];
}return null}
/* v5_189 RESERVED SKILL: a skill pressed / tapped while it (or the global lock) is not ready is RESERVED and cast the moment it is ready; pressing another skill replaces the reservation.
   With no manual reservation the HUD shows the auto-cast skill that will fire next, also labelled Reserved. A reservation expires after RSV_MAX seconds. */
const RSV_MAX=10;
function manualSkill(i){
  const id=EQ[i],old=P.rsv,oldT=P.rsvT;P.rsv=-1; /* a manual press that casts or reserves replaces the reserved skill; one that does nothing leaves it alone */
  if(id<0||useSkill(i))return;
  P.rsv=old;P.rsvT=oldT;
  if(P.dead>0||!started)return;
  /* v5_191 only a READY skill (off cooldown, Qi / HP paid) can be reserved; it then waits only for the 1 s lock between casts. A skill on cooldown or without Qi / HP cannot be clicked at all. */
  if(SCD[id]<=0&&skCanPay(SKILLS[id])&&P.skLock>0&&i<AUTO_SLOTS){P.rsv=i;P.rsvT=RSV_MAX}
}
function useSkill(i,auto){
  if(P.dead>0||!started)return false;
  const id=EQ[i];if(id<0){say('Empty slot. Press K to equip a skill.','#8d9aa2');return false}
  /* v5_84 ranged classes (Storm Archer, Spirit Summoner) cannot cast any skill inside the safe hub (manual, hotkey or auto-hunt). Nothing is spent. */
  const s=SKILLS[id],t=s.t,tr=s.tier;
  /* v5_90 no attacking in the safe hub: ranged classes cannot cast anything; every class loses its damaging skills (heals / shields / buffs still work) */
  if(inTown()&&(P.cls>=3||(s.m>0&&!HEAL_SKILL_T[t]))){if(!(P.hubSkMsg>0)){say('You cannot attack or use attack skills inside the safe hub.','#8d9aa2');P.hubSkMsg=2}return false}
  const prio=!auto&&i>=AUTO_SLOTS; /* v5_156 slots R and T (13, 14) are PRIORITY skills: pressed / clicked / tapped by hand they cast at any moment - they ignore the short global lock and interrupt a cast pose in progress */
  if(SCD[id]>0||!skCanPay(s)||(P.skLock>0&&!prio))return false;if(prio)P.cast=0; /* one skill at a time: short global lock after any cast; the basic attack is NOT blocked by it */
  const hpc=skHp(s)?skHpCost(s):0; /* v5_188b HP price fixed BEFORE the heal below */
  /* v5_122 skills work outside attack mode too: when nothing is targeted or selected and a monster is inside THIS skill's reach, the nearest one is selected
     (target frame shows it, you do not start auto-attacking) and the skill aims at it. Heals / buffs and the hub rules are unchanged. */
  if(!aimT()&&s.m>0&&!HEAL_SKILL_T[t]&&!inTown()){const e=nearest(AIM_REACH[t]||(P.cls<3?MELEE_SKILL_RANGE:520));if(e&&!e.dead&&!e.isPl)P.sel=e}
  const tg0=aimT(),a=tg0?Math.atan2(tg0.y-P.y,tg0.x-P.x):P.face,A=atkVal();
  const mel=P.cls<3,mr=MELEE_SKILL_RANGE;
  if(auto&&P.cls===2&&IG_DMG_T[t]){const e=tg0||nearest(IG_PAD+80);if(!e||dist(e.x,e.y,P.x,P.y)>P.r+e.r+IG_PAD)return false}
  if(auto&&mel&&MELEE_RANGED_T[t]){const e=tg0?(dist(tg0.x,tg0.y,P.x,P.y)<=mr+tg0.r?tg0:null):nearest(mr);if(!e)return false}
  const pr=(g,dm)=>projs.push({x:P.x,y:P.y,vx:Math.cos(g)*520,vy:Math.sin(g)*520,life:mel?Math.min(.7,(mr+40)/520):.7,l0:mel?Math.min(.7,(mr+40)/520):.7,dmg:dm,hit:new Set(),ang:g,col:s.col});
  /* v5_130 IN ATTACK MODE (auto-hunt / F / a target is set) an attack skill is NOT cast when the target is outside THAT skill's real reach: nothing is spent, no cooldown.
     Reach = the radius / length / flight distance the skill really uses below (skillReach). Outside attack mode manual casts keep the v5_122 behaviour (whiff toward where you face). */
  if((auto||P.fatk||(P.target&&!P.target.dead))&&s.m>0&&!HEAL_SKILL_T[t]){
    const rc=skillReach(t,tr,mel,mr);
    if(rc){const ok=tg0?dist(tg0.x,tg0.y,P.x,P.y)<=rc[0]+(rc[1]?tg0.r:0):!!nearest(rc[0]);
      if(!ok){if(!auto&&!(P.rngMsg>0)){say(s.n+': target is out of range.','#8d9aa2');P.rngMsg=1.5}return false}}
  }
  if(s.sig){if(sigCast(s,id,tg0,a,A,auto)===false)return false} /* v5_160 signature skills */
  else if(!auto&&WHIFF_R[t]&&!hasFoeFor(t,tg0,mel,mr))whiffCast(t,s);
  else if(t==='pierce'){P.face=a;pr(a,A*s.m);fxs({k:'pr',x:P.x,y:P.y,a:[+a.toFixed(2)],c:s.col})}
  else if(t==='fan'){const n=3+Math.floor(tr/2),an=[];P.face=a;for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.17;an.push(+g.toFixed(2));pr(g,A*s.m)}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='kunai'){
    const n=3+Math.floor(tr/3),an=[];P.face=a;
    for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.08;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:mel?Math.min(.55,(mr+40)/760):.55,l0:mel?Math.min(.55,(mr+40)/760):.55,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}
    fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='shadowstep'||t==='execute'||t==='siphon'||t==='venom'){
    /* NIGHT BLADE single-target skills: nothing is spent when there is no enemy in range */
    const rng=t==='shadowstep'?420:t==='venom'?(mel?mr:460):t==='execute'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);
    if(!c)return false;
    const hit=(q,x,f)=>q.isPl?sdp(q,x,f):sd(q,x,f),ma=Math.atan2(c.y-P.y,c.x-P.x);
    P.face=ma;P.target=c;P.task=null;P.mv=null;
    if(t==='shadowstep'){
      const gap=P.r+c.r+18;
      for(let j=0;j<12;j++)spark(P.x+(c.x-P.x)*j/12,P.y+(c.y-P.y)*j/12,s.col,2,60,.4,2.4);
      P.x=c.x+Math.cos(ma)*gap;P.y=c.y+Math.sin(ma)*gap;P.face=ma+Math.PI;P.inv=Math.max(P.inv,.3);
      hit(c,s.m*1.35);ring(c.x,c.y,60,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.4);
      fxs({k:'ri',x:c.x,y:c.y,r:60,c:s.col,q:'whirl',s:1})}
    else if(t==='execute'){
      const f=c.maxhp>0?clamp(c.hp/c.maxhp,0,1):1;
      hit(c,s.m*(1+(1-f)*1.2));ring(c.x,c.y,55,s.col);spark(c.x,c.y,s.col,22,220,.5,2.8);shake=Math.max(shake,.35);
      fxs({k:'ri',x:c.x,y:c.y,r:55,c:s.col,s:1})}
    else if(t==='siphon'){
      const dmg=hit(c,s.m)||0,h=healS(Math.round(Math.min(maxHp()*.2,dmg*.5)));
      if(h>0){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff7a9a',15)}
      ring(c.x,c.y,45,s.col);spark(c.x,c.y,'#ff5a7a',16,180,.45,2.6);fxs({k:'ri',x:c.x,y:c.y,r:45,c:s.col})}
    else{
      const vs=[c];for(const m of mons){if(vs.length>=3)break;if(m!==c&&!m.dead&&dist(m.x,m.y,c.x,c.y)<180)vs.push(m)}
      const tick=s.m*.3,pts=[];
      for(const q of vs){
        hit(q,s.m*.4,dist(q.x,q.y,P.x,P.y)/460);ring(q.x,q.y,36,s.col);
        for(let j=1;j<=5;j++)delayed.push({t:.8*j,f:()=>{if(!q.dead&&(!q.isPl||pvpOk(q))){hit(q,tick);spark(q.x,q.y,s.col,5,60,.5,2.4)}}});
        pts.push(Math.round(P.x),Math.round(P.y),Math.round(q.x),Math.round(q.y))}
      fxs({k:'ch',p:pts,c:s.col})}
  }
  else if(t==='bladestorm'){
    const r=120+tr*8;P.inv=Math.max(P.inv,1);
    for(let j=0;j<4;j++)delayed.push({t:.25*j,f:()=>{if(P.dead>0)return;
      for(const m of mons)if(!m.dead&&dist(m.x,m.y,P.x,P.y)<r+m.r)sd(m,s.m);
      for(const q of foes())if(dist(q.x,q.y,P.x,P.y)<r+q.r)sdp(q,s.m);
      ring(P.x,P.y,r*(.6+.13*j),s.col,'whirl');spark(P.x,P.y,s.col,14,r*1.6,.4,2.6);shake=Math.max(shake,.25)}});
    fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='smoke'){
    P.vlT=Math.max(P.vlT,6+tr*.5);P.bf=Math.max(P.bfT>0?P.bf:0,.2+(s.k||0)*.006);P.bfT=Math.max(P.bfT,P.vlT);P.inv=Math.max(P.inv,1.2);
    ring(P.x,P.y,100,s.col,'whirl');spark(P.x,P.y,s.col,30,200,.8,3);pop(P.x,P.y-34,'VEIL','#c7a8ff',15);fxs({k:'ri',x:P.x,y:P.y,r:100,c:s.col,q:'whirl',s:1})}
  else if(t==='rush'){
    const L=280+tr*10,sx=P.x,sy=P.y,cx=Math.cos(a),cy=Math.sin(a),ex=sx+cx*L,ey=sy+cy*L;
    const inLine=q=>{const dx=q.x-sx,dy=q.y-sy,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<45+q.r};
    for(const m of mons)if(!m.dead&&inLine(m))sd(m,s.m);
    for(const q of foes())if(inLine(q))sdp(q,s.m);
    for(let j=0;j<14;j++)spark(sx+(ex-sx)*j/14,sy+(ey-sy)*j/14,s.col,3,70,.4,2.6);
    P.face=a;P.x=ex;P.y=ey;P.inv=Math.max(P.inv,.4);shake=Math.max(shake,.4);ring(ex,ey,60,s.col,'whirl');
    fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col})}
  /* ===== IRON GUARDIAN ===== */
  else if(t==='bash'||t==='hammer'){
    const rng=t==='hammer'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);if(!c)return false;
    P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;P.task=null;P.mv=null;hitAny(c,s.m);
    if(t==='bash'){P.sh=Math.max(P.sh,Math.round(maxHp()*(.05+tr*.01)));P.shT=Math.max(P.shT||0,6);ring(c.x,c.y,50,s.col);spark(c.x,c.y,s.col,18,200,.4,2.6);shake=Math.max(shake,.3);fxs({k:'ri',x:c.x,y:c.y,r:50,c:s.col})}
    else{const r=100+tr*6;for(const q of mons)if(q!==c&&!q.dead&&dist(q.x,q.y,c.x,c.y)<r+q.r)sd(q,s.m*.5);for(const q of foes())if(q!==c&&dist(q.x,q.y,c.x,c.y)<r+q.r)sdp(q,s.m*.5);
      ring(c.x,c.y,r,s.col,'whirl');spark(c.x,c.y,s.col,30,260,.6,3);shake=Math.max(shake,.55);fxs({k:'ri',x:c.x,y:c.y,r,c:s.col,q:'whirl',s:1})}}
  else if(t==='charge'){
    /* v5_159 IRON GUARDIAN gap-closer: rush to a target up to 400 away (in front of it, not behind), hit it and gain a short shield.
       It is the answer to kiting Storm Archers / Summoners; it does nothing when no enemy is in reach (nothing is spent). */
    const rng=400,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);if(!c)return false;
    const ma=Math.atan2(c.y-P.y,c.x-P.x),gap=P.r+c.r+24;
    for(let j=0;j<12;j++)spark(P.x+(c.x-P.x)*j/12,P.y+(c.y-P.y)*j/12,s.col,2,60,.4,2.4);
    P.x=c.x-Math.cos(ma)*gap;P.y=c.y-Math.sin(ma)*gap;P.face=ma;P.target=c;P.task=null;P.mv=null;P.inv=Math.max(P.inv,.3);
    hitAny(c,s.m);
    P.sh=Math.max(P.sh,Math.round(maxHp()*(.04+tr*.008)));P.shT=Math.max(P.shT||0,5);
    ring(c.x,c.y,70,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.4);
    fxs({k:'ri',x:c.x,y:c.y,r:70,c:s.col,q:'whirl',s:1})}
  else if(t==='quake'||t==='roar'||t==='counter'){
    const r=t==='quake'?160+tr*12:t==='roar'?240:150+tr*8;
    if(auto&&!mons.some(m=>!m.dead&&dist(m.x,m.y,P.x,P.y)<r+m.r)&&!foes().some(q=>dist(q.x,q.y,P.x,P.y)<r+q.r))return false;
    const f=clamp(P.hp/maxHp(),0,1);aoeHit(P.x,P.y,r,t==='counter'?s.m*(1+(1-f)*1.5):s.m);
    ring(P.x,P.y,r,s.col,'whirl');spark(P.x,P.y,s.col,28,r*1.8,.5,2.8);shake=Math.max(shake,.45);
    if(t==='quake')for(let j=1;j<=2;j++)delayed.push({t:.3*j,f:()=>{if(P.dead>0)return;aoeHit(P.x,P.y,r,s.m*.35);ring(P.x,P.y,r*(1+.1*j),s.col)}});
    if(t==='roar'){P.bf=Math.max(P.bfT>0?P.bf:0,.15+(s.k||0)*.004);P.bfT=Math.max(P.bfT,8);pop(P.x,P.y-34,'ROAR','#ffb070',15);partyShare('atk',P.bf*.5);if(MP)netSend({t:'taunt'})}
    fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='bulwark'||t==='ironskin'){
    if(t==='bulwark'){P.sh=Math.round(maxHp()*(.2+tr*.03));P.shT=10;P.dr=Math.max(P.drT>0?P.dr:0,.2);P.drT=Math.max(P.drT,6)}
    else{P.dr=.35+Math.min(.25,tr*.02);P.drT=10;const h=healS(Math.round(maxHp()*.1));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
    ring(P.x,P.y,80,s.col);spark(P.x,P.y,s.col,24,120,.8,3);pop(P.x,P.y-44,t==='bulwark'?'BULWARK':'IRON SKIN','#ffd27a',14);fxs({k:'ri',x:P.x,y:P.y,r:80,c:s.col})}
  else if(t==='shockwave'){
    const L=420,cx=Math.cos(a),cy=Math.sin(a),inLine=q=>{const dx=q.x-P.x,dy=q.y-P.y,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<70+q.r};
    P.face=a;for(const m of mons)if(!m.dead&&inLine(m))sd(m,s.m);for(const q of foes())if(inLine(q))sdp(q,s.m);
    for(let j=0;j<16;j++)spark(P.x+cx*L*j/16,P.y+cy*L*j/16,s.col,3,90,.45,2.8);ring(P.x+cx*L*.5,P.y+cy*L*.5,70,s.col,'whirl');shake=Math.max(shake,.4);
    fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(P.x+cx*L),Math.round(P.y+cy*L)],c:s.col})}
  /* ===== STORM ARCHER ===== */
  else if(t==='arrow'){P.face=a;projs.push({x:P.x,y:P.y,vx:Math.cos(a)*900,vy:Math.sin(a)*900,life:.8,l0:.8,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:a,col:s.col});fxs({k:'pr',x:P.x,y:P.y,a:[+a.toFixed(2)],c:s.col})}
  else if(t==='volley'){const n=5+Math.floor(tr/2),an=[];P.face=a;for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.13;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*700,vy:Math.sin(g)*700,life:.7,l0:.7,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='rain'||t==='trap'){
    const n=tg0||nearest(520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,r=t==='rain'?110+tr*6:100+tr*5;
    if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
    ring(x,y,r,s.col);ring(x,y,r*.6,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    const waves=t==='rain'?3:6,iv=t==='rain'?.45:.8,per=t==='rain'?s.m:s.m*.55;
    for(let j=1;j<=waves;j++)delayed.push({t:iv*j,f:()=>{aoeHit(x,y,r,per,dist(x,y,P.x,P.y)/520);ring(x,y,r*.7,s.col,'whirl');spark(x,y,s.col,16,r*1.4,.4,2.6)}})}
  else if(t==='blast'||t==='stormarrow'){
    const rng=520,c=(tg0&&!tg0.dead&&(!tg0.isPl||pvpOk(tg0))&&dist(tg0.x,tg0.y,P.x,P.y)<=rng)?tg0:nearest(rng);if(!c)return false;
    P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;
    if(t==='blast'){const r=110+tr*5;hitAny(c,s.m,dist(c.x,c.y,P.x,P.y)/rng);
      for(const q of mons)if(q!==c&&!q.dead&&dist(q.x,q.y,c.x,c.y)<r+q.r)sd(q,s.m*.65,dist(c.x,c.y,P.x,P.y)/rng);
      for(const q of foes())if(q!==c&&dist(q.x,q.y,c.x,c.y)<r+q.r)sdp(q,s.m*.65,dist(c.x,c.y,P.x,P.y)/rng);
      ring(c.x,c.y,r,s.col,'whirl');spark(c.x,c.y,s.col,30,280,.6,3.2);shake=Math.max(shake,.45);fxs({k:'ri',x:c.x,y:c.y,r,c:s.col,q:'whirl',s:1})}
    else{const hit=new Set(),pts=[];let px=P.x,py=P.y,cc=c;
      for(let j=0;j<3+Math.ceil(tr/2)&&cc;j++){hit.add(cc);hitAny(cc,s.m*(1-j*.04),dist(cc.x,cc.y,P.x,P.y)/rng);
        for(let q=0;q<7;q++)spark(px+(cc.x-px)*q/7,py+(cc.y-py)*q/7,s.col,1,40,.35,2.4);ring(cc.x,cc.y,36,s.col);
        pts.push(Math.round(px),Math.round(py),Math.round(cc.x),Math.round(cc.y));px=cc.x;py=cc.y;
        let bb=null,bd=260;for(const m of mons){if(m.dead||hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}for(const m of foes()){if(hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}cc=bb}
      fxs({k:'ch',p:pts,c:s.col})}}
  else if(t==='eagle'){P.ceT=8+tr*.5;P.bf=Math.max(P.bfT>0?P.bf:0,.12);P.bfT=Math.max(P.bfT,P.ceT);ring(P.x,P.y,90,s.col);pop(P.x,P.y-34,'EAGLE EYE','#ffe27a',15);fxs({k:'ri',x:P.x,y:P.y,r:90,c:s.col})}
  else if(t==='gale'){
    const c=tg0||nearest(520),ba=c?Math.atan2(P.y-c.y,P.x-c.x):P.face+Math.PI,sx=P.x,sy=P.y;
    P.x+=Math.cos(ba)*240;P.y+=Math.sin(ba)*240;P.galeLock=30;P.vlT=Math.max(P.vlT,4);P.inv=Math.max(P.inv,.3);P.gsT=4;
    for(let j=0;j<12;j++)spark(sx+(P.x-sx)*j/12,sy+(P.y-sy)*j/12,s.col,2,60,.4,2.4);ring(P.x,P.y,60,s.col,'whirl');
    if(c){const fa=Math.atan2(c.y-P.y,c.x-P.x),an=[];P.face=fa;for(let j=0;j<3;j++){const g=fa+(j-1)*.1;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:.6,l0:.6,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
    else fxs({k:'ri',x:P.x,y:P.y,r:60,c:s.col,q:'whirl',s:1})}
  /* ===== SPIRIT SUMMONER ===== */
  else if(t==='wolves'||t==='guardian'){
    if(t==='guardian'){P.sh=Math.round(maxHp()*(.15+tr*.03));P.shT=10}
    const sk=t==='wolves'?1:2;P.spirits.push({k:sk,t:t==='wolves'?7+tr*.5:10,iv:t==='wolves'?.7:1,cd:0,dmg:s.m,col:s.col,r:t==='wolves'?320:260});
    {const same=P.spirits.filter(q=>q.k===sk);if(same.length>(sk===1?3:1))P.spirits.splice(P.spirits.indexOf(same[0]),1)}
    ring(P.x,P.y,70,s.col,'whirl');spark(P.x,P.y,s.col,24,140,.8,3);pop(P.x,P.y-40,t==='wolves'?'SPIRIT WOLF':'GUARDIAN','#9fe0ff',14);fxs({k:'ri',x:P.x,y:P.y,r:70,c:s.col,q:'whirl',s:1})}
  else if(t==='soulburst'||t==='wail'||t==='harvest'){
    const r=t==='soulburst'?140+tr*10:t==='wail'?240:200;
    const tot=aoeHit(P.x,P.y,r,s.m);
    if(t==='wail')delayed.push({t:.35,f:()=>{if(P.dead>0)return;aoeHit(P.x,P.y,r,s.m);ring(P.x,P.y,r*1.1,s.col,'whirl');shake=Math.max(shake,.4)}});
    if(t==='soulburst')P.qi=Math.min(maxQi(),P.qi+maxQi()*.08);
    if(t==='harvest'&&tot){const h=healS(Math.round(Math.min(maxHp()*.25,tot*.35)));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
    ring(P.x,P.y,r,s.col,'whirl');spark(P.x,P.y,s.col,28,r*1.8,.5,2.8);shake=Math.max(shake,.35);fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='chains'){
    const L=[];for(const m of mons)if(!m.dead&&!m.pend){const d=dist(m.x,m.y,P.x,P.y);if(d<400)L.push([d,m])}
    for(const q of foes()){const d=dist(q.x,q.y,P.x,P.y);if(d<400)L.push([d,q])}
    if(!L.length)return false;L.sort((x,y)=>x[0]-y[0]);const pts=[];
    for(const [d,q] of L.slice(0,4)){hitAny(q,s.m,d/400);for(let j=0;j<7;j++)spark(P.x+(q.x-P.x)*j/7,P.y+(q.y-P.y)*j/7,s.col,1,40,.35,2.4);ring(q.x,q.y,36,s.col);pts.push(Math.round(P.x),Math.round(P.y),Math.round(q.x),Math.round(q.y))}
    fxs({k:'ch',p:pts,c:s.col})}
  else if(t==='soulheal'){
    const h=healS(Math.round(maxHp()*(.25+tr*.02)));P.hp=Math.min(maxHp(),P.hp+h);P.qi=Math.min(maxQi(),P.qi+maxQi()*.1);partyShare('heal',h/maxHp()*.5);
    ring(P.x,P.y,70,s.col);spark(P.x,P.y,s.col,18,90,1,3,60);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);fxs({k:'ri',x:P.x,y:P.y,r:70,c:s.col})}
  else if(t==='spiritbomb'){
    const n=tg0||nearest(520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,r=160+tr*12;
    if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
    ring(x,y,r,s.col);ring(x,y,r*.5,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    delayed.push({t:.9,f:()=>{ring(x,y,r,s.col,'whirl');spark(x,y,s.col,44,320,.7,3.4);shake=Math.max(shake,.9);aoeHit(x,y,r,s.m,dist(x,y,P.x,P.y)/520)}})}
  else if(t==='strike'||t==='flurry'||t==='cleave'||t==='leap'){
    /* MELEE: needs an enemy close by (leap: up to 360 away). Nothing is spent when there is none. */
    const rng=t==='leap'?360:t==='cleave'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);
    if(!c)return false;
    const ma=Math.atan2(c.y-P.y,c.x-P.x),hit=(q,x)=>q.isPl?sdp(q,x):sd(q,x);
    P.face=ma;P.target=c;P.task=null;P.mv=null;
    if(t==='strike'){hit(c,s.m);ring(c.x,c.y,50,s.col);spark(c.x,c.y,s.col,18,200,.4,2.6);shake=Math.max(shake,.25);fxs({k:'ri',x:c.x,y:c.y,r:50,c:s.col})}
    else if(t==='flurry'){const n=3+Math.floor(tr/3),w=s.m*1.25/n;
      for(let j=0;j<n;j++)delayed.push({t:.11*j,f:()=>{if(!c.dead&&dist(c.x,c.y,P.x,P.y)<400){hit(c,w);spark(c.x,c.y,s.col,6,160,.3,2.2)}}});
      ring(c.x,c.y,40,s.col);fxs({k:'ri',x:c.x,y:c.y,r:40,c:s.col})}
    else if(t==='cleave'){
      const r=150+tr*10,inArc=q=>{if(dist(q.x,q.y,P.x,P.y)>r+q.r)return false;let da=Math.atan2(q.y-P.y,q.x-P.x)-ma;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<=1.25};
      for(const q of mons)if(!q.dead&&inArc(q))sd(q,s.m);
      for(const q of foes())if(inArc(q))sdp(q,s.m);
      ring(P.x+Math.cos(ma)*r*.5,P.y+Math.sin(ma)*r*.5,r*.6,s.col,'whirl');
      for(let j=-3;j<=3;j++){const g=ma+j*.38;spark(P.x+Math.cos(g)*r*.7,P.y+Math.sin(g)*r*.7,s.col,5,140,.35,2.6)}
      shake=Math.max(shake,.3);fxs({k:'ri',x:P.x,y:P.y,r:r*.8,c:s.col,q:'whirl',s:1})}
    else{
      const gap=P.r+c.r+26,d0=dist(c.x,c.y,P.x,P.y);
      if(d0>gap){const nx=c.x+(P.x-c.x)/d0*gap,ny=c.y+(P.y-c.y)/d0*gap;for(let j=0;j<10;j++)spark(P.x+(nx-P.x)*j/10,P.y+(ny-P.y)*j/10,s.col,2,60,.35,2.4);P.x=nx;P.y=ny}
      hit(c,s.m);ring(c.x,c.y,70,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.45);P.inv=Math.max(P.inv,.25);
      fxs({k:'ri',x:c.x,y:c.y,r:70,c:s.col,q:'whirl',s:1})}
  }
  else if(t==='nova'||t==='drain'){
    const r=t==='drain'?170:(tr<0?120:150+tr*14);let tot=0;
    ring(P.x,P.y,r,s.col,tr<0?'whirl':0);spark(P.x,P.y,s.col,26,260,.5,2.6);shake=Math.max(shake,.35);fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:tr<0?'whirl':'',s:1});
    for(const m of mons){if(m.dead||dist(m.x,m.y,P.x,P.y)>r+m.r)continue;tot+=sd(m,s.m)}
    for(const q of foes()){if(dist(q.x,q.y,P.x,P.y)>r+q.r)continue;tot+=sdp(q,s.m)}
    if(t==='drain'&&tot){const h=healS(Math.round(Math.min(maxHp()*.25,tot*.35)));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
  }else if(t==='meteor'){
    const n=tg0||nearest(450),x=n?n.x:P.x+Math.cos(P.face)*220,y=n?n.y:P.y+Math.sin(P.face)*220,r=110+tr*10;
    ring(x,y,r,s.col);ring(x,y,r*.6,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    delayed.push({t:.7,f:()=>{ring(x,y,r,s.col,'whirl');spark(x,y,s.col,40,300,.7,3.2);shake=1;for(const m of mons)if(!m.dead&&dist(m.x,m.y,x,y)<r+m.r)sd(m,s.m,dist(x,y,P.x,P.y)/450);for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)sdp(q,s.m,dist(x,y,P.x,P.y)/450)}});
  }else if(t==='chain'){
    let c=(tg0&&dist(tg0.x,tg0.y,P.x,P.y)<600)?tg0:nearest(420);
    if(!c)return false;
    const hit=new Set(),pts=[];let px=P.x,py=P.y;
    for(let j=0;j<4+tr&&c;j++){
      hit.add(c);if(c.isPl)sdp(c,s.m*(1-j*.03),dist(c.x,c.y,P.x,P.y)/600);else sd(c,s.m*(1-j*.03),dist(c.x,c.y,P.x,P.y)/600);
      for(let q=0;q<7;q++)spark(px+(c.x-px)*q/7,py+(c.y-py)*q/7,s.col,1,40,.35,2.4);
      ring(c.x,c.y,40,s.col);pts.push(Math.round(px),Math.round(py),Math.round(c.x),Math.round(c.y));px=c.x;py=c.y;
      let bb=null,bd=210;for(const m of mons){if(m.dead||hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}for(const m of foes()){if(hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}c=bb;
    }
    fxs({k:'ch',p:pts,c:s.col});
  }else if(t==='might'){P.bf=.25+s.k*.008;P.bfT=8+tr;partyShare('atk',P.bf*.5);ring(P.x,P.y,90,s.col);pop(P.x,P.y-34,'MIGHT','#ffd36b',15);fxs({k:'ri',x:P.x,y:P.y,r:90,c:s.col})}
  else{
    const h=healS(Math.round(maxHp()*(t==='heal'?s.m:.25+tr*.025)));
    P.hp=Math.min(maxHp(),P.hp+h);partyShare('heal',h/maxHp()*.5);
    if(t==='mend'){P.sh=Math.round(maxHp()*(.1+tr*.03));P.shT=8;P.qi=Math.min(maxQi(),P.qi+maxQi()*.1)}
    ring(P.x,P.y,70,'#5fd3a5');fxs({k:'ri',x:P.x,y:P.y,r:70,c:'#5fd3a5'});pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);spark(P.x,P.y,'#f4b3c8',14,70,1,3,60);spark(P.x,P.y,'#8ff0c4',10,60,1,2.4,50);
  }
  skPay(s,hpc);SCD[id]=s.cd;P.swing=.2;P.skLock=SKILL_GCD;sfxSkill(t);
  /* v5_109 CASTING: casting a skill stops you for a moment and plays a cast pose (arms raised). Dash skills (CAST_NOROOT) keep moving you instead. Tune CAST_T / CAST_T_LONG. */
  if(!CAST_NOROOT[t]){const ct=CAST_LONG[t]?CAST_T_LONG:CAST_T;P.cast=ct;P.castMax=ct;P.mv=null} /* v5_153 casting roots you again (v5_152 removed the root while moving); v5_154 a move input does NOT cancel it, you move when the pose ends */
  return true;
}
/* ---------- v5_160 SIGNATURE SKILL CASTING ----------
   sigCast(s,id,tg0,a,A,auto) runs the handler of a signature skill (SIGF[type]). A handler returns false when it must not be cast (no enemy in reach): nothing is spent then.
   New short-lived player states (all cleared by sigReset on death / class switch): ls/lsT lifesteal, rf/rfT reflect (monster hits), abs/absT damage vessel, mark/markT death mark, link/linkT soul web. */
const SIG_ABS_CAP=.8;let sigBusy=false;
/* v5_164 timed HUD-only buffs: ground fields and heal-over-time skills that have no player timer of their own (key -> [icon,colour,name,text,expiry]) */
const HB={};let HBCLK=0; /* v5_177 game clock (advances by the same capped dt as every other timer) so signature-buff icons stay in step with the real effect */
function fmtT(t){const r=Math.max(.1,Math.ceil(t*10)/10);return r>=10?String(Math.ceil(t)):r.toFixed(1)} /* v5_177 remaining-time label: whole seconds from 10 s up, tenths below, so the last second never reads "1" */
const SIGHUD={sg_c100:[6,'\u273f','Lotus Domain','Lotus field: damages foes and heals you while you stand in it.'],sg_g300:[10,'\u2691','Iron Banner','Banner field: 20% less damage taken and HP regen inside it, foes are taunted.'],sg_s25:[12,'\u2742','Soul Lantern','Heals you (party for half) and restores Qi every 2 s.'],sg_n300:[5,'\u2740','Nightshade Bloom','Poison cloud pulsing on the target area.'],sg_s1000:[6,'\u2742','Netherworld Gate','Gate pulses damage foes and heal you, then it collapses.']};
function sigReset(){for(const k in HB)delete HB[k];P.lsT=0;P.rfT=0;P.absT=0;P.abs=0;P.markT=0;P.mark=null;P.linkT=0;P.link=null}
const sigFoes=(x,y,r)=>{const o=[];for(const q of mons)if(!q.dead&&!q.pend&&dist(q.x,q.y,x,y)<r+q.r)o.push(q);for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)o.push(q);return o};
const sigTarget=(tg0,rng)=>{const ok=q=>q&&!q.dead&&!q.pend&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;return ok(tg0)?tg0:nearest(rng)};
const sigFixed=(q,d,crit)=>q.isPl?hitPeer(q,Math.round(d),crit):hitMonster(q,Math.round(d),crit);
const sigFx=(x,y,r,col,whirl)=>{ring(x,y,r,col,whirl?'whirl':0);fxs({k:'ri',x:Math.round(x),y:Math.round(y),r:Math.min(400,Math.round(r)),c:col,q:whirl?'whirl':'',s:1})};
const sigLine=(x1,y1,x2,y2,col,n)=>{for(let j=0;j<=(n||10);j++)spark(x1+(x2-x1)*j/(n||10),y1+(y2-y1)*j/(n||10),col,1,50,.4,2.6)};
const sigInLine=(q,sx,sy,an,L,W)=>{const cx=Math.cos(an),cy=Math.sin(an),dx=q.x-sx,dy=q.y-sy,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<W+q.r};
const sigHealSelf=(f,col)=>{const h=healS(Math.round(maxHp()*f));if(h>0){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,col||'#5fd3a5',14)}return h};
const sigBuff=(bf,T)=>{P.bf=Math.max(P.bfT>0?P.bf:0,bf);P.bfT=Math.max(P.bfT,T)};
const sigDR=(dr,T)=>{P.dr=Math.max(P.drT>0?P.dr:0,dr);P.drT=Math.max(P.drT,T)};
const sigShield=(f,T)=>{P.sh=Math.max(P.sh,Math.round(maxHp()*f));P.shT=Math.max(P.shT||0,T)};
const sigLater=(t,f)=>delayed.push({t,f:()=>{if(P.dead>0)return;f()}});
/* called from hitMonster for every point of damage the player deals to a monster: lifesteal, death mark, soul web */
function sigOnHit(m,d){
  if(sigBusy)return;
  if(P.lsT>0)sigLeech(d);
  if(P.markT>0&&P.mark&&P.mark.m===m)P.mark.acc+=d;
  if(P.linkT>0&&P.link&&P.link.has(m)){sigBusy=true;try{const sp=Math.round(d*.4);for(const q of P.link)if(q!==m&&!q.dead&&!q.pend)hitMonster(q,sp,false)}finally{sigBusy=false}}
}
function sigLeech(d){const h=healS(Math.max(1,Math.round(Math.min(maxHp()*.05,d*(P.ls||.1)))));if(h>0&&P.hp<maxHp()){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff7a9a',13)}}
/* auto-cast rules of the signature skills (called from clsAuto). Attack skills: only with the target inside their reach; buffs: only when useful and not already running. */
function sigAuto(ty,d,t,near){
  const hurt=P.hp<maxHp()*.6,boss=!!(t&&t.boss),R=SIGR[ty];
  switch(ty){
    case 'sg_c25':return hurt||P.qi<maxQi()*.35;case 'sg_c50':return near>=2&&!(P.rfT>0);case 'sg_c1000':return(boss||near>=3)&&!(P.bfT>0);
    case 'sg_n25':return P.hp<maxHp()*.5&&near>=1;case 'sg_n50':return d<=250&&!(P.lsT>0);
    case 'sg_g25':return near>=1&&!(P.shT>0);case 'sg_g50':return near>=1&&!(P.rfT>0);case 'sg_g200':return near>=2&&P.hp<maxHp()*.75&&!(P.absT>0);
    case 'sg_g300':return near>=2||boss;case 'sg_g750':return P.spirits.filter(q=>q.k===4).length<3&&d<=240;case 'sg_g1000':return(boss||near>=3)&&!(P.shT>0);
    case 'sg_a25':return d<520&&!(P.gsT>0);case 'sg_a1000':return(boss||near>=2)&&!(P.bfT>0)&&d<=700;
    case 'sg_s25':return hurt||P.qi<maxQi()*.3;case 'sg_s50':return P.spirits.length>0&&d<=480;case 'sg_s200':return !(P.linkT>0)&&d<=450&&mons.filter(q=>!q.dead&&dist(q.x,q.y,P.x,P.y)<450).length>=2;
    case 'sg_s300':return d<480&&!(P.bfT>0);case 'sg_s750':return P.spirits.filter(q=>q.k===1).length<3&&d<=480;
    case 'sg_n100':return !(P.markT>0)&&d<=460&&!!t&&!t.isPl;
    case 'sg_n500':return !!t&&d<=460&&t.maxhp>0&&t.hp<t.maxhp*.5; /* the execute: only on a wounded foe, so the cooldown reset is likely */
  }
  return d<=(R||420)}
function sigCast(s,id,tg0,a,A,auto){const f=SIGF[s.t];if(!f)return false;
  const r=f({s,id,tg0,a,A,auto,tr:s.tier});
  if(r!==false&&SIGHUD[s.t]){const h=SIGHUD[s.t];HB[s.t]=[h[1],s.col,h[2],h[3],HBCLK+h[0]]}
  if(r===false&&!auto&&!(P.rngMsg>0)){say(s.n+': no target in reach.','#8d9aa2');P.rngMsg=1.5}
  return r}
const SIGF={
/* ===== CULTIVATOR ===== */
sg_c25:({s})=>{P.qi=Math.min(maxQi(),P.qi+maxQi()*.35);const h=sigHealSelf(.3);partyShare('heal',h/maxHp()*.5);sigBuff(.12,8);sigFx(P.x,P.y,110,s.col,1);spark(P.x,P.y,s.col,30,160,.9,3,60);pop(P.x,P.y-46,'HEAVEN’S BREATH',s.col,13)},
sg_c50:({s})=>{P.rf=.5;P.rfT=8;sigDR(.2,8);sigFx(P.x,P.y,90,s.col);spark(P.x,P.y,'#ffffff',22,140,.7,2.8);pop(P.x,P.y-46,'MIRROR',s.col,14)},
sg_c100:({s})=>{const x=P.x,y=P.y,R=250;sigFx(x,y,R,s.col,1);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=1;j<=6;j++)sigLater(j,()=>{aoeHit(x,y,R,s.m);sigFx(x,y,R*(.5+.08*j),s.col,1);spark(x,y,s.col,18,R*1.4,.6,2.8);if(dist(P.x,P.y,x,y)<R){const h=sigHealSelf(.04);partyShare('heal',h/maxHp()*.5)}})},
sg_c200:({s,tg0})=>{const n=sigTarget(tg0,520),R=280,x=n?n.x:P.x+Math.cos(P.face)*260,y=n?n.y:P.y+Math.sin(P.face)*260;if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
  ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<24;j++){const an=rnd()*6.283,d=Math.sqrt(rnd())*R,sx=x+Math.cos(an)*d,sy=y+Math.sin(an)*d;
    sigLater(.1*(j+1),()=>{aoeHit(sx,sy,110,s.m,dist(sx,sy,P.x,P.y)/520);ring(sx,sy,90,s.col);spark(sx,sy,s.col,8,120,.3,2.4);sigLine(sx,sy-160,sx,sy,s.col,6)})}},
sg_c300:({s,tg0})=>{const n=sigTarget(tg0,520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,an=n?Math.atan2(n.y-P.y,n.x-P.x):P.face;P.face=an;
  const E=['#ff6a3d','#4fb3ff','#3ddc84','#dcdcdc','#c9a15a'];
  sigLater(0,()=>{aoeHit(x,y,140,s.m);sigFx(x,y,140,E[0],1);spark(x,y,E[0],26,260,.6,3);pop(x,y-30,'FIRE',E[0],13)});
  sigLater(.6,()=>{aoeHit(x,y,150,s.m*.7);sigHealSelf(.08);sigFx(x,y,150,E[1],1);spark(x,y,E[1],26,260,.6,3);pop(x,y-30,'WATER',E[1],13)});
  sigLater(1.2,()=>{sigShield(.1,8);sigFx(P.x,P.y,90,E[2],1);spark(P.x,P.y,E[2],26,140,.8,3);pop(P.x,P.y-46,'WOOD',E[2],13)});
  sigLater(1.8,()=>{const L=420,sx=P.x,sy=P.y;for(const q of sigFoes(sx,sy,L))if(sigInLine(q,sx,sy,an,L,60))hitAny(q,s.m*1.3);sigLine(sx,sy,sx+Math.cos(an)*L,sy+Math.sin(an)*L,E[3],16);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(sx+Math.cos(an)*L),Math.round(sy+Math.sin(an)*L)],c:E[3]});pop(sx,sy-40,'METAL',E[3],13)});
  sigLater(2.4,()=>{aoeHit(x,y,230,s.m*2);sigFx(x,y,230,E[4],1);spark(x,y,E[4],40,320,.7,3.4);shake=Math.max(shake,.7);pop(x,y-30,'EARTH',E[4],14)})},
sg_c500:({s})=>{P.spirits.push({k:3,t:12,iv:.55,cd:0,dmg:s.m,col:s.col,r:420});const same=P.spirits.filter(q=>q.k===3);if(same.length>1)P.spirits.splice(P.spirits.indexOf(same[0]),1);sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,28,150,.8,3);pop(P.x,P.y-46,'DAO CLONE',s.col,14)},
sg_c750:({s,tg0})=>{const n=tg0&&!tg0.dead?tg0:null,an=n?Math.atan2(n.y-P.y,n.x-P.x):P.face,L=720,W=130,sx=P.x,sy=P.y,ex=sx+Math.cos(an)*L,ey=sy+Math.sin(an)*L;P.face=an;
  for(let j=0;j<=9;j++)ring(sx+(ex-sx)*j/9,sy+(ey-sy)*j/9,W*.55,s.col);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col});
  sigLater(1.1,()=>{for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,W))hitAny(q,s.m);sigLine(sx,sy,ex,ey,'#ffffff',30);for(let j=0;j<=9;j++){const px=sx+(ex-sx)*j/9,py=sy+(ey-sy)*j/9;ring(px,py,W*.7,s.col,'whirl');spark(px,py,s.col,10,200,.5,3)}shake=Math.max(shake,1);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:'#ffffff'})})},
sg_c1000:({s})=>{const T=15;sigBuff(.4,T);P.ceT=Math.max(P.ceT,T);sigDR(.3,T);P.ls=.08;P.lsT=Math.max(P.lsT,T);partyShare('atk',.2);
  sigFx(P.x,P.y,160,s.col,1);sigFx(P.x,P.y,240,'#ffe9a8');spark(P.x,P.y,'#ffe9a8',60,300,1.2,3.4,120);pop(P.x,P.y-50,'IMMORTAL FORM',s.col,16);shake=Math.max(shake,.6);
  for(let j=1;j<=T;j++)sigLater(j,()=>{sigHealSelf(.03);spark(P.x,P.y,s.col,6,60,.8,2.6,50)})},
/* ===== NIGHT BLADE ===== */
sg_n25:({s})=>{const sx=P.x,sy=P.y;P.inv=Math.max(P.inv,1.5);P.vlT=Math.max(P.vlT,6);P.ceT=Math.max(P.ceT,6);sigBuff(.1,6);sigFx(sx,sy,70,s.col,1);spark(sx,sy,s.col,30,160,.9,3);pop(P.x,P.y-46,'AFTERIMAGE',s.col,13)},
sg_n50:({s})=>{P.ls=.2;P.lsT=8;sigBuff(.1,8);sigFx(P.x,P.y,80,'#ff5a7a');spark(P.x,P.y,'#ff5a7a',24,120,.8,3);pop(P.x,P.y-46,'VAMPIRIC',s.col,14)},
sg_n100:({s,tg0,A})=>{const c=(tg0&&!tg0.dead&&!tg0.pend&&!tg0.isPl&&dist(tg0.x,tg0.y,P.x,P.y)<=460)?tg0:nearest(460);if(!c||c.isPl)return false;
  P.mark={m:c,acc:0};P.markT=5;P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;sigFx(c.x,c.y,60,s.col);pop(c.x,c.y-c.r-30,'MARKED','#ff5a7a',14);
  for(let j=1;j<=4;j++)sigLater(j,()=>{if(!c.dead)sigFx(c.x,c.y,40+j*8,'#ff5a7a')});
  sigLater(5,()=>{const mk=P.mark;if(mk&&mk.m===c&&!c.dead&&!c.pend){const d=Math.min(mk.acc*.9,A*s.m*10)+A*s.m;sigBusy=true;try{hitMonster(c,Math.round(d),true)}finally{sigBusy=false}sigFx(c.x,c.y,110,s.col,1);spark(c.x,c.y,'#ff5a7a',40,320,.7,3.4);shake=Math.max(shake,.7);pop(c.x,c.y-c.r-44,'DETONATE','#ff5a7a',15)}P.mark=null;P.markT=0})},
sg_n200:({s})=>{const R=300;if(!sigFoes(P.x,P.y,R).length)return false;
  for(let j=0;j<30;j++)sigLater(.1*(j+1),()=>{const L=sigFoes(P.x,P.y,R);if(!L.length)return;const q=L[(rnd()*L.length)|0];hitAny(q,s.m,dist(q.x,q.y,P.x,P.y)/R);sigLine(P.x,P.y,q.x,q.y,s.col,6);spark(q.x,q.y,s.col,4,100,.25,2.2)});
  sigFx(P.x,P.y,60,s.col,1)},
sg_n300:({s,tg0})=>{const c=sigTarget(tg0,420);if(!c)return false;const x=c.x,y=c.y,R=230;P.face=Math.atan2(y-P.y,x-P.x);ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<10;j++)sigLater(.5*(j+1),()=>{aoeHit(x,y,R,s.m*(1+j*.15));ring(x,y,R*(.4+.06*j),s.col,'whirl');spark(x,y,s.col,12,R*1.2,.6,2.6)})},
sg_n500:({s,id,tg0})=>{const c=sigTarget(tg0,460);if(!c)return false;const ma=Math.atan2(c.y-P.y,c.x-P.x),gap=P.r+c.r+18;
  sigLine(P.x,P.y,c.x,c.y,s.col,12);P.x=c.x+Math.cos(ma)*gap;P.y=c.y+Math.sin(ma)*gap;P.face=ma+Math.PI;P.inv=Math.max(P.inv,.4);P.target=c;P.task=null;P.mv=null;
  const f=c.maxhp>0?clamp(c.hp/c.maxhp,0,1):1;hitAny(c,s.m*(1+(1-f)*2.5));sigFx(c.x,c.y,70,s.col,1);spark(c.x,c.y,s.col,30,260,.6,3);shake=Math.max(shake,.5);
  if(c.dead||c.pend||c.hp<=0){for(let j=0;j<SCD.length;j++)if(j!==id)SCD[j]=0;pop(P.x,P.y-50,'VERDICT: COOLDOWNS RESET','#ffe27a',14);sigFx(P.x,P.y,120,'#ffe27a',1)}},
sg_n750:({s,tg0})=>{const c=sigTarget(tg0,420),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,base=c?Math.atan2(c.y-P.y,c.x-P.x):P.face,H=330,W=55;P.face=base;
  const ang=[base+Math.PI/4,base-Math.PI/4];
  for(const an of ang){sigLine(x-Math.cos(an)*H,y-Math.sin(an)*H,x+Math.cos(an)*H,y+Math.sin(an)*H,s.col,20);for(let j=-3;j<=3;j++)ring(x+Math.cos(an)*H*j/3,y+Math.sin(an)*H*j/3,30,s.col)}
  sigLater(.7,()=>{for(const an of ang){const sx=x-Math.cos(an)*H,sy=y-Math.sin(an)*H;for(const q of sigFoes(x,y,H+60))if(sigInLine(q,sx,sy,an,H*2,W))hitAny(q,s.m*.6);
      sigLine(sx,sy,x+Math.cos(an)*H,y+Math.sin(an)*H,'#ffffff',30);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(x+Math.cos(an)*H),Math.round(y+Math.sin(an)*H)],c:s.col})}
    aoeHit(x,y,75,s.m);sigFx(x,y,90,s.col,1);spark(x,y,s.col,40,300,.7,3.2);shake=Math.max(shake,.8)})},
sg_n1000:({s})=>{const R=520;if(!sigFoes(P.x,P.y,R).length)return false;P.inv=Math.max(P.inv,3);pop(P.x,P.y-50,'SHADOWLESS',s.col,15);
  for(let j=0;j<10;j++)sigLater(.25*j,()=>{const L=sigFoes(P.x,P.y,R);if(!L.length)return;const q=L[(rnd()*L.length)|0],ma=Math.atan2(q.y-P.y,q.x-P.x),gap=P.r+q.r+16;
    sigLine(P.x,P.y,q.x,q.y,s.col,8);P.x=q.x-Math.cos(ma)*gap;P.y=q.y-Math.sin(ma)*gap;P.face=ma;P.inv=Math.max(P.inv,.4);hitAny(q,s.m);ring(q.x,q.y,50,s.col,'whirl');spark(q.x,q.y,s.col,14,220,.4,2.8);shake=Math.max(shake,.3)});
  sigLater(2.6,()=>{aoeHit(P.x,P.y,260,s.m*3.5);sigFx(P.x,P.y,260,s.col,1);spark(P.x,P.y,s.col,50,320,.8,3.4);shake=Math.max(shake,.9)})},
/* ===== IRON GUARDIAN ===== */
sg_g25:({s})=>{sigShield(.25,8);sigDR(.25,6);sigFx(P.x,P.y,90,s.col);spark(P.x,P.y,s.col,24,120,.8,3);pop(P.x,P.y-46,'STONESKIN',s.col,14)},
sg_g50:({s})=>{P.rf=.8;P.rfT=8;sigDR(.3,8);sigFx(P.x,P.y,90,s.col,1);spark(P.x,P.y,'#ffffff',22,140,.7,2.8);pop(P.x,P.y-46,'THORNS',s.col,14)},
sg_g100:({s,tg0,a})=>{const c=tg0&&!tg0.dead?tg0:null,an=c?Math.atan2(c.y-P.y,c.x-P.x):a,L=420,sx=P.x,sy=P.y,cx=Math.cos(an),cy=Math.sin(an),ex=sx+cx*L,ey=sy+cy*L;
  for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,110))hitAny(q,s.m);
  sigLine(sx,sy,ex,ey,s.col,18);P.face=an;P.x=ex;P.y=ey;P.inv=Math.max(P.inv,.5);sigShield(.1,5);shake=Math.max(shake,.5);sigFx(ex,ey,90,s.col,1);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col})},
sg_g200:({s,A})=>{const T=6;P.abs=0;P.absT=T;sigFx(P.x,P.y,90,s.col);pop(P.x,P.y-46,'VESSEL',s.col,14);
  delayed.push({t:T,f:()=>{const dm=P.abs||0;P.abs=0;P.absT=0;if(P.dead>0)return;const R=300,d=Math.min(dm*1.5,maxHp()*3)+A*s.m;
    for(const q of sigFoes(P.x,P.y,R))sigFixed(q,d,false);sigFx(P.x,P.y,R,s.col,1);sigFx(P.x,P.y,R*.6,'#ffffff');spark(P.x,P.y,s.col,44,R*1.8,.7,3.2);shake=Math.max(shake,.8);pop(P.x,P.y-50,'RELEASE','#ffd27a',15)}})},
sg_g300:({s})=>{const x=P.x,y=P.y,R=280;sigFx(x,y,R,s.col,1);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});if(MP)netSend({t:'taunt'});pop(x,y-50,'IRON BANNER',s.col,14);
  for(let j=1;j<=10;j++)sigLater(j,()=>{if(dist(P.x,P.y,x,y)<R){sigDR(.2,1.6);sigHealSelf(.02)}aoeHit(x,y,R,s.m);ring(x,y,R*.6,s.col);spark(x,y,s.col,10,R,.5,2.6);if(MP&&j%3===0)netSend({t:'taunt'})})},
sg_g500:({s})=>{P.inv=Math.max(P.inv,1.1);P.mv=null;const R=300;sigFx(P.x,P.y,R,s.col);sigFx(P.x,P.y,R*.5,s.col);pop(P.x,P.y-50,'MOUNTAIN',s.col,15);
  sigLater(1,()=>{aoeHit(P.x,P.y,R,s.m);sigShield(.2,8);sigFx(P.x,P.y,R,s.col,1);sigFx(P.x,P.y,R*.7,'#ffffff',1);spark(P.x,P.y,s.col,60,R*2,.9,3.6);shake=1})},
sg_g750:({s})=>{for(let j=0;j<4;j++)P.spirits.push({k:4,t:12,iv:.8,cd:j*.2,dmg:s.m,col:s.col,r:240});const same=P.spirits.filter(q=>q.k===4);while(same.length>4)P.spirits.splice(P.spirits.indexOf(same.shift()),1);
  sigShield(.15,10);sigFx(P.x,P.y,90,s.col,1);spark(P.x,P.y,s.col,30,150,.8,3);pop(P.x,P.y-46,'SENTINELS',s.col,14)},
sg_g1000:({s})=>{const T=15;sigShield(.5,T);sigDR(.45,T);P.rf=.5;P.rfT=Math.max(P.rfT,T);sigBuff(.3,T);partyShare('atk',.15);if(MP)netSend({t:'taunt'});
  sigFx(P.x,P.y,170,s.col,1);sigFx(P.x,P.y,260,'#ffe9a8');spark(P.x,P.y,'#ffe9a8',60,300,1.2,3.4,120);pop(P.x,P.y-50,'AVATAR',s.col,16);shake=Math.max(shake,.7);
  for(let j=1;j<=10;j++)sigLater(1.5*j,()=>{aoeHit(P.x,P.y,240,s.m);sigFx(P.x,P.y,240,s.col,1);spark(P.x,P.y,s.col,24,300,.6,3);shake=Math.max(shake,.4)})},
/* ===== STORM ARCHER ===== */
sg_a25:({s})=>{P.vlT=Math.max(P.vlT,6);P.gsT=Math.max(P.gsT||0,6);P.ceT=Math.max(P.ceT,6);sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,26,140,.8,3);pop(P.x,P.y-46,'WINDRUNNER',s.col,14)},
sg_a50:({s,tg0})=>{const c=sigTarget(tg0,720);if(!c)return false;const d0=dist(c.x,c.y,P.x,P.y),x=c.x,y=c.y;P.face=Math.atan2(y-P.y,x-P.x);P.target=c;
  hitAny(c,s.m*(P.gsT>0?1.4:1),d0/720);sigLine(P.x,P.y,x,y,'#ff9a3d',24);fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(x),Math.round(y)],c:s.col});sigFx(x,y,130,'#ff7a2d',1);spark(x,y,'#ff7a2d',34,260,.7,3.2);
  for(let j=1;j<=4;j++)sigLater(j,()=>{aoeHit(x,y,130,s.m*.3);ring(x,y,110,'#ff7a2d');spark(x,y,'#ffb347',12,90,.7,2.8,40)})},
sg_a100:({s,a,A})=>{P.face=a;for(let w=0;w<3;w++)sigLater(.25*w,()=>{const an=[];for(let j=0;j<9;j++){const g=a+(j-4)*.1;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:.75,l0:.75,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:an,c:s.col});spark(P.x,P.y,s.col,10,120,.3,2.4)})},
sg_a200:({s,tg0})=>{const c=sigTarget(tg0,520),cx=c?c.x:P.x+Math.cos(P.face)*260,cy=c?c.y:P.y+Math.sin(P.face)*260;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);
  const pos=[0,1,2].map(i=>[cx+Math.cos(i*2.094+.5)*130,cy+Math.sin(i*2.094+.5)*130]);
  for(const p of pos){ring(p[0],p[1],40,s.col);spark(p[0],p[1],s.col,8,60,.6,2.6)}fxs({k:'mt',x:Math.round(cx),y:Math.round(cy),r:150,c:s.col});
  sigLater(1,()=>{for(const p of pos){aoeHit(p[0],p[1],130,s.m,dist(p[0],p[1],P.x,P.y)/520);ring(p[0],p[1],130,s.col,'whirl');spark(p[0],p[1],s.col,24,220,.5,3)}shake=Math.max(shake,.5)});
  sigLater(1.6,()=>{aoeHit(cx,cy,200,s.m*1.5,dist(cx,cy,P.x,P.y)/520);sigFx(cx,cy,200,s.col,1);spark(cx,cy,s.col,44,320,.7,3.4);shake=Math.max(shake,.8)})},
sg_a300:({s,tg0})=>{const c=sigTarget(tg0,520);if(!c)return false;const pts=[];let px=P.x,py=P.y,cc=c;
  for(let j=0;j<8&&cc;j++){hitAny(cc,s.m*(1+j*.12),dist(cc.x,cc.y,P.x,P.y)/520);sigLine(px,py,cc.x,cc.y,s.col,7);ring(cc.x,cc.y,36,s.col);pts.push(Math.round(px),Math.round(py),Math.round(cc.x),Math.round(cc.y));px=cc.x;py=cc.y;
    let bb=null,bd=330;for(const q of sigFoes(px,py,330)){if(q===cc)continue;const d=dist(q.x,q.y,px,py);if(d<bd){bd=d;bb=q}}cc=bb}
  P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;fxs({k:'ch',p:pts.slice(0,40),c:s.col})},
sg_a500:({s,tg0,A})=>{const c=sigTarget(tg0,900);if(!c)return false;P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;P.mv=null;
  sigLine(P.x,P.y,c.x,c.y,'#ff4d4d',30);ring(c.x,c.y,50,'#ff4d4d');ring(c.x,c.y,26,'#ff4d4d');pop(c.x,c.y-c.r-30,'LOCKED','#ff4d4d',14);
  sigLater(.8,()=>{if(c.dead||c.pend)return;const fr=dist(c.x,c.y,P.x,P.y)/900,d=A*s.m*critMul()*(.9+rnd()*.2);
    if(c.isPl)hitPeer(c,Math.round(d*(1-RANGE_FALL*fr)),true);else hitMonster(c,rangedDmg(c,Math.round(d),fr),true);
    sigLine(P.x,P.y,c.x,c.y,'#ffffff',36);fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(c.x),Math.round(c.y)],c:s.col});sigFx(c.x,c.y,80,s.col,1);spark(c.x,c.y,'#ffffff',30,280,.6,3.2);shake=Math.max(shake,.7)})},
sg_a750:({s,tg0})=>{const c=sigTarget(tg0,520),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,R=330;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<16;j++){const an=rnd()*6.283,d=Math.sqrt(rnd())*R,sx=x+Math.cos(an)*d,sy=y+Math.sin(an)*d;
    sigLater(.2*(j+1),()=>{sigLine(sx-80,sy-300,sx,sy,'#fff6d6',10);aoeHit(sx,sy,100,s.m,dist(sx,sy,P.x,P.y)/520);ring(sx,sy,90,s.col,'whirl');spark(sx,sy,s.col,16,180,.5,3);shake=Math.max(shake,.25)})}},
sg_a1000:({s,A})=>{const T=12;sigBuff(.35,T);P.ceT=Math.max(P.ceT,T);P.gsT=Math.max(P.gsT||0,T);P.vlT=Math.max(P.vlT,T);partyShare('atk',.15);
  sigFx(P.x,P.y,150,s.col,1);sigFx(P.x,P.y,230,'#fff08a');spark(P.x,P.y,'#fff08a',60,300,1.2,3.4,120);pop(P.x,P.y-50,'TEMPEST',s.col,16);shake=Math.max(shake,.6);
  for(let j=1;j<=30;j++)sigLater(.4*j,()=>{const q=nearest(700);if(!q)return;const g=Math.atan2(q.y-P.y,q.x-P.x);P.face=g;projs.push({x:P.x,y:P.y,vx:Math.cos(g)*900,vy:Math.sin(g)*900,life:.85,l0:.85,dmg:atkVal()*s.m*1.4,hit:new Set(),ang:g,col:s.col});fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:[+g.toFixed(2)],c:s.col});spark(P.x,P.y,s.col,5,80,.25,2.4)})},
/* ===== SPIRIT SUMMONER ===== */
sg_s25:({s})=>{sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,24,100,1,3,60);pop(P.x,P.y-46,'SOUL LANTERN',s.col,13);
  for(let j=0;j<6;j++)sigLater(2*j,()=>{const h=sigHealSelf(.08);partyShare('heal',h/maxHp()*.5);P.qi=Math.min(maxQi(),P.qi+maxQi()*.04);sigFx(P.x,P.y,60,s.col);spark(P.x,P.y,s.col,12,70,.9,2.8,50)})},
sg_s50:({s})=>{let w=P.spirits.filter(q=>q.k===1).length;while(w<3){P.spirits.push({k:1,t:9,iv:.7,cd:0,dmg:s.m,col:s.col,r:320});w++}
  for(const sp of P.spirits)if(!sp.fz){sp.fz=1;sp.iv=Math.max(.25,sp.iv*.5);sp.dmg*=1.5;sp.t+=3}else sp.t=Math.max(sp.t,6);
  sigFx(P.x,P.y,100,s.col,1);spark(P.x,P.y,s.col,34,200,.9,3);pop(P.x,P.y-46,'PACK FRENZY',s.col,14)},
sg_s100:({s,A})=>{for(let w=0;w<2;w++)sigLater(.5*w,()=>{const an=[];for(let j=0;j<12;j++){const g=j/12*6.283+w*.26;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*440,vy:Math.sin(g)*440,life:1,l0:1,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:an.slice(0,9),c:s.col});sigFx(P.x,P.y,70,s.col,1)})},
sg_s200:({s})=>{const L=mons.filter(q=>!q.dead&&!q.pend&&dist(q.x,q.y,P.x,P.y)<450).sort((x,y)=>dist(x.x,x.y,P.x,P.y)-dist(y.x,y.y,P.x,P.y)).slice(0,6);if(L.length<2)return false;
  P.link=new Set(L);P.linkT=8;const pts=[];for(let i=0;i<L.length;i++){ring(L[i].x,L[i].y,40,s.col);const n=L[(i+1)%L.length];pts.push(Math.round(L[i].x),Math.round(L[i].y),Math.round(n.x),Math.round(n.y));sigLine(L[i].x,L[i].y,n.x,n.y,s.col,8)}
  fxs({k:'ch',p:pts.slice(0,40),c:s.col});pop(P.x,P.y-46,'SOUL WEB',s.col,14)},
sg_s300:({s})=>{sigBuff(.25,10);partyShare('atk',.125);const h=sigHealSelf(.3);partyShare('heal',h/maxHp()*.5);P.qi=Math.min(maxQi(),P.qi+maxQi()*.15);sigFx(P.x,P.y,120,s.col,1);sigFx(P.x,P.y,180,s.col);spark(P.x,P.y,s.col,40,200,1,3,80);pop(P.x,P.y-46,'CHORUS',s.col,14)},
sg_s500:({s,tg0,a})=>{const n=tg0&&!tg0.dead?tg0:null,an=n?Math.atan2(n.y-P.y,n.x-P.x):a,L=760,W=130,sx=P.x,sy=P.y,ex=sx+Math.cos(an)*L,ey=sy+Math.sin(an)*L;P.face=an;
  const pass=(fx,fy,tx,ty)=>{for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,W))hitAny(q,s.m);sigLine(fx,fy,tx,ty,s.col,30);for(let j=0;j<=8;j++){const px=fx+(tx-fx)*j/8,py=fy+(ty-fy)*j/8;ring(px,py,W*.6,s.col,'whirl');spark(px,py,s.col,8,160,.5,3)}shake=Math.max(shake,.5);fxs({k:'ch',p:[Math.round(fx),Math.round(fy),Math.round(tx),Math.round(ty)],c:s.col})};
  sigLater(.3,()=>pass(sx,sy,ex,ey));sigLater(1,()=>pass(ex,ey,P.x,P.y));pop(P.x,P.y-46,'DRAGON',s.col,14)},
sg_s750:({s})=>{for(let j=0;j<3;j++)P.spirits.push({k:1,t:12,iv:.7,cd:j*.15,dmg:s.m,col:s.col,r:320});const w=P.spirits.filter(q=>q.k===1);while(w.length>6)P.spirits.splice(P.spirits.indexOf(w.shift()),1);
  P.spirits.push({k:2,t:12,iv:1,cd:0,dmg:s.m,col:s.col,r:260});const g=P.spirits.filter(q=>q.k===2);while(g.length>1)P.spirits.splice(P.spirits.indexOf(g.shift()),1);
  sigShield(.2,12);sigFx(P.x,P.y,110,s.col,1);spark(P.x,P.y,s.col,40,200,.9,3);pop(P.x,P.y-46,'LEGION',s.col,15)},
sg_s1000:({s,tg0})=>{const c=sigTarget(tg0,520),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,R=340;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);ring(x,y,R,s.col);ring(x,y,R*.5,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});pop(x,y-50,'NETHERWORLD GATE',s.col,15);
  for(let j=1;j<=12;j++)sigLater(.5*j,()=>{const t=aoeHit(x,y,R,s.m);if(t>0)sigHealSelf(.01);ring(x,y,R*(.5+.04*j),s.col,'whirl');spark(x,y,s.col,14,R*1.2,.6,2.8)});
  sigLater(6.2,()=>{aoeHit(x,y,R*1.15,s.m*6);sigFx(x,y,R*1.15,s.col,1);sigFx(x,y,R*.6,'#ffffff');spark(x,y,s.col,70,R*2,1,3.6);shake=1})}
};
for(const c of SIGD)for(const y of c)SKFAM[y[0]]=y[7];
Object.assign(CAST_LONG,{sg_c750:1,sg_c1000:1,sg_g500:1,sg_g1000:1,sg_a500:1,sg_a1000:1,sg_s1000:1,sg_s750:1,sg_c300:1});
Object.assign(CAST_NOROOT,{sg_g100:1,sg_n500:1,sg_n1000:1});
/* older saves / characters already past a milestone: put the signature skills of the CURRENT class into EMPTY slots, once (nothing is replaced) */
function giveSig(){for(const lv of SIG_LV){const id=SIGK[P.cls][lv];if(id===undefined||P.lvl<SKILLS[id].lv||EQ.includes(id))continue;const e=EQ.indexOf(-1);if(e<0)break;EQ[e]=id;AUTOSK[e]=true}}
function unlock(k){unlockId(2+k)}
function unlockId(id){const s=SKILLS[id];if(!s||(s.c||0)!==P.cls)return;const e=EQ.indexOf(-1);if(e>=0){EQ[e]=id;buildBar()}
  say('New skill: '+s.n+(e>=0?' (slot '+(e+1)+')':'. Press K to equip')+'.',s.col)}
/* older saves have no melee skills equipped: put the best available one of each melee type into EMPTY slots (nothing is replaced), once */
function giveMelee(){
  for(const ty of ['strike','cleave','leap','flurry']){
    let b=-1;for(const id of MELEE)if(SKILLS[id].t===ty&&P.lvl>=SKILLS[id].lv)b=id;
    if(b<0||EQ.includes(b))continue;const e=EQ.indexOf(-1);if(e<0)break;EQ[e]=b;AUTOSK[e]=true;
  }
}
/* best layout for class c: pass 1 = the best unlocked skill of each type (CLS_ORDER), pass 2 = the 2nd best of each type, pass 3 = the 3rd ... until all NSLOT slots are full
   (or the class has no more unlocked skills). Higher ids of a type are always the stronger / later ones. */
function arrangeFor(c){
  const cand=CLS_ORDER[c].map(ts=>{const a=[];for(let i=SKILLS.length-1;i>=0;i--)if((SKILLS[i].c||0)===c&&P.lvl>=SKILLS[i].lv&&ts.includes(SKILLS[i].t))a.push(i);return a}),o=[];
  for(let pass=0;o.length<NSLOT;pass++){
    let any=false;
    for(const a of cand){if(pass<a.length){any=true;if(!o.includes(a[pass])){o.push(a[pass]);if(o.length>=NSLOT)break}}}
    if(!any)break;
  }
  const r=[];for(let i=0;i<NSLOT;i++)r.push(o[i]===undefined?-1:o[i]);
  /* v5_160 the two highest signature skills go to R and T (manual priority slots; the long cooldown ones suit a hand-fired button) */
  const sg=SKILLS.map((q,i)=>i).filter(i=>SKILLS[i].sig&&SKILLS[i].c===c&&P.lvl>=SKILLS[i].lv).sort((x,y)=>SKILLS[y].lv-SKILLS[x].lv).slice(0,2);
  sg.forEach((id,j)=>{const slot=NSLOT-1-j;const old=r[slot];r[slot]=id;if(old>=0&&r.indexOf(old)<0){const e=r.indexOf(-1);if(e>=0)r[e]=old}});
  return r;
}
function autoArrange(){const r=arrangeFor(P.cls);for(let i=0;i<NSLOT;i++)EQ[i]=r[i]}
/* v5_59: the skill book button arranges EVERY class: the one in use now, and the saved layouts of all the others (their auto-cast switches stay on) */
function autoArrangeAll(){
  autoArrange();
  for(let c=0;c<CLASSES.length;c++)if(c!==P.cls)CLS_STORE[c]={e:arrangeFor(c),a:new Array(NSLOT).fill(true)};
}
const hitAny=(q,x,f)=>q.isPl?sdp(q,x,f):sd(q,x,f);
/* damage everything (monsters, and flagged players in PvP) inside a circle; returns the total dealt */
function aoeHit(x,y,r,m,fr){let tot=0;for(const q of mons)if(!q.dead&&dist(q.x,q.y,x,y)<r+q.r)tot+=sd(q,m,fr)||0;for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)tot+=sdp(q,m,fr)||0;return tot}
/* auto-hunt rules of the class skills (undefined = not a class skill type) */
/* v5_123 AUTO-CAST = "cast it as soon as it is ready". The only things that hold an auto skill back now: its own range (so Qi is not wasted on far targets),
   a buff that is still running, healing skills at (almost) full HP, and Gale (it throws you back, so it stays an emergency-only escape). No more minimum
   distances, enemy counts or boss-only rules. useSkill(i,true) still checks cooldown, Qi and that a real enemy is inside the skill's reach. */
function clsAuto(ty,d,t,near){
  if(ty.startsWith('sg_'))return sigAuto(ty,d,t,near);
  if(P.cls===2&&IG_AUTO_T[ty]&&t&&d>P.r+t.r+IG_PAD)return false;
  switch(ty){
    case 'heal':case 'mend':case 'soulheal':return P.hp<maxHp()*.9;
    case 'might':return !(P.bfT>0);case 'smoke':return !(P.vlT>0);
    case 'bulwark':case 'guardian':return !(P.shT>0);case 'ironskin':return !(P.drT>0);
    case 'eagle':return !(P.ceT>0)&&d<480;
    case 'wolves':return P.spirits.filter(q=>q.k===1).length<3&&d<480;
    case 'gale':return near>=3&&P.hp<maxHp()*.3&&!(P.gsT>0)&&!(P.galeLock>0); /* emergency escape only (30% HP, 3+ enemies close): it throws you 240 back */
    case 'nova':case 'bladestorm':case 'soulburst':case 'wail':case 'drain':case 'harvest':case 'chains':return d<=300;
    case 'bash':case 'hammer':case 'quake':case 'roar':case 'counter':return true; /* useSkill checks the melee reach itself */
    case 'shockwave':return d<420;
    case 'charge':return !!t&&d>P.r+t.r+IG_PAD+40&&d<=400; /* gap-closer only: never wasted on a target that is already in melee reach */
  }
  return d<(P.cls>=3?480:420)}
/* v5_189 the auto-cast condition of one skill type (was inline in the main loop; also used to show the next auto skill as Reserved) */
function autoWants(ty,d,t,near){const cu=clsAuto(ty,d,t,near);return cu!==undefined?cu:ty==='heal'||ty==='mend'?P.hp<maxHp()*.5:ty==='nova'?near>=2||(d<=90&&t.boss):ty==='drain'?near>=2||(near&&P.hp<maxHp()*.8):ty==='might'?(t.boss||near>=3)&&P.bfT<=0:ty==='shadowstep'?d>120&&d<420:ty==='bladestorm'?near>=2||d<=130:ty==='smoke'?(t.boss||near>=3)&&P.vlT<=0:ty==='execute'?d<=200:ty==='siphon'?d<=170&&P.hp<maxHp()*.9:ty==='rush'?d>150&&d<380:ty==='strike'||ty==='flurry'?d<=170:ty==='cleave'?d<=200:ty==='leap'?d>170&&d<360:ty==='meteor'||ty==='chain'?d<420:d<420}
function switchClass(c){
  if(c===P.cls||c<0||c>=CLASSES.length)return;
  P.rsv=-1;P.rsvA=-1;CLS_STORE[P.cls]={e:EQ.slice(),a:AUTOSK.slice()};LOOKS[P.cls]=SKIN;P.cls=c;applyLook(LOOKS[c]);WD.tab=0;if(!$('wardrobe').hidden)wdRender();
  const st=CLS_STORE[c];CLS_STORE[c]=null;
  if(st){for(let i=0;i<NSLOT;i++){const q=SKILLS[st.e[i]];EQ[i]=q&&P.lvl>=q.lv&&(q.c||0)===c?st.e[i]:-1;AUTOSK[i]=st.a[i]!==false}}
  else{autoArrange();AUTOSK.fill(true)}
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());P.vlT=0;P.drT=0;P.ceT=0;P.spirits=[];sigReset();
  buildBar();renderBook();save();cloudFlush();netInfo(true);
  say('You are now a '+CLASSES[c].n+'.','#c7a8ff');
}
function nearest(maxd){
  let best=null,bd=maxd;
  if(pvpOnly()){for(const q of foes()){const d=dist(q.x,q.y,P.x,P.y);if(d<bd){bd=d;best=q}}return best}
  for(const m of mons){
    if(m.dead||m.pend)continue;
    const d=dist(m.x,m.y,P.x,P.y);
    if(d<bd){bd=d;best=m}
  }
  return best;
}
/* FIGHT BACK: when a monster hits you and you have no live target, you turn on it and attack with the normal attack (auto-hunt then uses your skills as usual).
   It never overrides a target you chose, a click-to-move destination, or joystick/keyboard movement (those win), and it is off in the hub and in PvP-only mode. Toggle: Bag > Fight back. */
function retaliate(m){
  if(!P.fightBack||!m||m.dead||m.isPl||P.dead>0||P.tp>0||inTown()||pvpOnly())return;
  if((P.target&&!P.target.dead)||P.mv)return;
  P.target=m;P.task=null;P.mine=0;
}
function hurtPlayer(dmg,byPlayer,atkLv,mon,pvpCrit){
  if(P.inv>0||P.god)return;
  if(byPlayer){P.pvHitT=performance.now()/1000;P.pvHitLv=atkLv||0} /* v5_74: remembered for healP */
  const D=byPlayer?pvpDom(atkLv):0; /* v5_70 gap dominance: a far higher level player ignores your dodge / reductions / shield */
  if(atkLv!==undefined&&rnd()<evaChance(atkLv)*(1-D)){spark(P.x,P.y,'#bfe6ff',6,120,.3,2.4);pop(P.x,P.y-24,'DODGE','#bfe6ff',14);SFX('dodge');combatPing();return}
  let tCrit=false;
  if(byPlayer){ /* player crit (the server tells us it was one): Crit EVA can turn it into a normal hit, otherwise Crit DMG reduction trims the bonus */
    if(pvpCrit){tCrit=true;if(rnd()<cevVal()/100*(1-D)){dmg=Math.max(1,Math.round(dmg/CRIT_MUL));tCrit=false}else dmg=Math.max(1,Math.round(dmg*(1-(1-1/CRIT_MUL)*cdrVal()/100*(1-D))))}
  }else if(atkLv!==undefined&&rnd()<monCritChance(atkLv,mon&&mon.boss)){tCrit=true;dmg=Math.max(1,Math.round(dmg*(1+(MON_CRIT_MUL-1)*(1-cdrVal()/100))))}
  {const MD=byPlayer?0:monDom(atkLv);dmg=Math.max(1,Math.round(dmg*(1-(byPlayer?pdrVal()*(1-D):bdrVal()*(1-MD))/100)*(byPlayer?1:1-(mon&&mon.boss?bsdVal():mdrVal())*(1-MD)/100)))} /* PvP DMG reduction vs players, Bash DMG reduction vs monsters */
  if(P.drT>0)dmg=Math.max(1,Math.round(dmg*(1-P.dr*(1-D))));
  if(P.rfT>0&&mon&&!mon.dead&&!byPlayer){const rd=Math.round(dmg*P.rf);if(rd>0){sigBusy=true;try{hitMonster(mon,rd,false)}finally{sigBusy=false}}} /* v5_160 reflect */
  if(P.sh>0&&D<1){const b=Math.min(P.sh*(1-D),dmg);P.sh-=b;dmg-=b;if(dmg<=0){spark(P.x,P.y,'#8ff0c4',6,120,.3,2.4);SFX('block');combatPing();return}}
  if(P.absT>0&&D<1){const room=Math.max(0,maxHp()*SIG_ABS_CAP-P.abs),b=Math.min(room*(1-D),dmg);if(b>0){P.abs+=b;dmg-=b;spark(P.x,P.y,'#c8d4dc',6,120,.3,2.4);if(dmg<=0){pop(P.x,P.y-24,'ABSORBED','#c8d4dc',13);SFX('block');combatPing();return}}} /* v5_160 Unyielding Vessel */
  P.hp-=dmg;P.hurt=.25;P.task=null;P.mine=0;combatPing();SFX(P.hp<=0?'die':'hurt'); /* home scroll keeps channelling when hit */
  spark(P.x,P.y,'#ff6a5a',8,150,.35,2.4);shake=Math.max(shake,.3);
  pop(P.x,P.y-24,'-'+dmg+(tCrit?'!':''),tCrit?'#ffb02e':'#ff7a6a',tCrit?17:14);
  if(P.hp<=0){
    sigReset();P.hp=0;P.dead=2.5;P.target=null;P.mv=null;P.task=null;P.tp=0;stopMine();
    if(byPlayer&&auto){auto=false;$('bAuto').classList.remove('on');say('Auto-hunt turned off: you were defeated by a player.','#d9503f')}
    const lost=curWorld===ARENA?0:Math.floor(P.coins*.1);P.coins-=lost;
    say('You fell. '+(lost?lost+' coins were lost. ':'')+'Returning to the Sanctum…','#d9503f');
  }
}

/* ---------- PvP ----------
   Right-click another player to flag yourself for PvP (the server owns the flag: 30s, refreshed by every PvP hit given or taken).
   While flagged you can attack players with the normal attack, skills and auto-skills. The safe hub is a no-PvP zone for everyone.
   The server applies defence, the PVP_MULT scaling and a per-hit cap, and credits kills. PVP_MULT must equal pvpMult in game.go. */
const PVP_MULT=.5,PVP_FLAG=30,PVP_BOUNTY=10;
const PVP_CAP_GAP=400; /* keep equal to pvpCapGap in game.go. v5_70: gap dominance D = clamp((attackerLv - yourLv)/PVP_CAP_GAP,0,1): your PvP defences count x(1-D) against a far higher level player */
const PVP_MAX_GAP=100; /* v5_159 level compression, keep equal to pvpMaxGap in game.go: a level lead counts for at most this many levels in PvP */
const pvpDom=atkLv=>clamp(Math.min((atkLv||0)-P.lvl,PVP_MAX_GAP)/PVP_CAP_GAP,0,1);
/* v5_74 PvP healing: for PVP_HEAL_WIN seconds after a player hit you, ALL your self-heals (potion, Mend, Soul Mend, Iron Skin, Drain, Harvest, Siphon)
   work at PVP_HEAL (50%) strength, and against a higher level attacker they fade out further x(1-D), so a level lead cannot be out-healed. */
const PVP_HEAL=.5,PVP_HEAL_WIN=8;
const healMul=()=>(performance.now()/1000-(P.pvHitT||-1e9)<PVP_HEAL_WIN)?PVP_HEAL*(1-pvpDom(P.pvHitLv)):1;
const healP=h=>Math.max(0,Math.round(h*healMul()));
const healS=h=>healP(h*SKILL_HEAL_MUL); /* v5_77: every self-heal SKILL heals SKILL_HEAL_MUL of its old amount (potions use healP directly) */
const inHubAt=(x,y)=>dist(x,y,C,C)<TOWN;
/* ---------- v5_158 PVP MODES (replace the old right-click flag) ----------
   Peaceful: attack no player.   Lawful: only players in Hostile / Carnal mode, never friends or party.
   Hostile: any player except friends and party.   Carnal: any player except party.   (Peaceful players CAN be attacked by Hostile / Carnal.)
   The safe hub is still no-PvP. No cooldown, penalty, zone or clan rules yet. The server checks every hit with the same table (pvpCanHit in game.go).
   'ATK Players Only' (P key): monsters are ignored and auto-target / auto-skills / area skills only pick players your mode lets you attack. When it is OFF, auto-target and area skills ignore
   players; you can still click a player to target him and attack (area skills then include players while he is your target). In the Arena (no monsters) players are always auto-targeted. */
const PVP_NAMES=['Peaceful','Lawful','Hostile','Carnal'],PVP_COL=['#6dde73','#7cc8ff','#ffa85c','#ff5a50'];
const PVP_INFO=['You cannot attack players.','You may attack only Hostile and Carnal players (never friends or party).','You may attack anyone except your friends and party.','You may attack anyone except your party. Peaceful players are fair game too.'];
const pvpOnly=()=>PVPMODE&&MP;
function pvpRule(q){ /* may I (in my mode) attack this player? keep equal to pvpCanHit() in game.go */
  if(PVPLVL<=0||PARTY.ids.has(q.id))return false;
  if(PVPLVL>=3)return true;
  if(frIs(q.name))return false;
  if(PVPLVL===1)return (q.pm|0)>=2;
  return true;
}
function pvpWhy(q){
  if(PVPLVL<=0)return 'You are in Peaceful mode — open the PvP panel and pick Lawful, Hostile or Carnal to attack players.';
  if(PARTY.ids.has(q.id))return q.name+' is in your party.';
  if(PVPLVL<3&&frIs(q.name))return q.name+' is your friend.';
  if(PVPLVL===1&&(q.pm|0)<2)return 'Lawful: you can only attack Hostile or Carnal players.';
  return 'You cannot attack '+q.name+'.';
}
function setPvpLvl(n,quiet){
  n=clamp(n|0,0,3);if(n===PVPLVL&&!quiet)return;
  PVPLVL=n;if(MP)netSend({t:'pvpm',on:PVPLVL});
  if(PVPLVL<=0&&PVPMODE)PVPMODE=false;
  if(P.target&&P.target.isPl&&!pvpOk(P.target))P.target=null;
  pvpUI(true);if(!quiet){say('PvP mode: '+PVP_NAMES[n]+' — '+PVP_INFO[n],PVP_COL[n],7000);if(!MP)say('PvP needs the multiplayer server.','#8d9aa2');save()}
}
function togglePvpMode(){ /* the 'ATK Players Only' switch (P key) */
  if(!started)return;
  if(!MP){say('PvP needs the multiplayer server.','#8d9aa2');return}
  if(!PVPMODE&&PVPLVL<=0){say('ATK Players Only needs a PvP mode — in Peaceful you cannot attack players. Pick Lawful, Hostile or Carnal.','#8d9aa2',6000);return}
  PVPMODE=!PVPMODE;pvpUI(true);
  if(PVPMODE){
    if(P.target&&!P.target.isPl)P.target=null;
    say(inTown()?'ATK Players Only ON — it works when you leave the safe hub. You only target players your mode allows.':'ATK Players Only ON — you only target players your mode allows.',PVP_COL[PVPLVL],6000);
  }else{
    if(P.target&&P.target.isPl&&!pvpOk(P.target))P.target=null;
    say('ATK Players Only OFF — you attack monsters again.','#8d9aa2');
  }
}
let pvpUIKey='',pvpPanelEl=null;
function pvpUI(force){
  const k=PVPLVL+':'+(PVPMODE?1:0);if(!force&&k===pvpUIKey)return;pvpUIKey=k;
  const b=$('bPvp');
  if(b){b.classList.toggle('on',PVPMODE);b.style.borderColor=PVPLVL>0?PVP_COL[PVPLVL]:'';b.style.boxShadow=PVPLVL>0?'0 0 6px '+PVP_COL[PVPLVL]:'';$('pvpLb').textContent=PVPMODE?'ATK':PVP_NAMES[PVPLVL].slice(0,5);b.title='PvP mode: '+PVP_NAMES[PVPLVL]+' (click to change; P toggles ATK Players Only)'}
  if(pvpPanelEl){
    pvpPanelEl.querySelectorAll('.pm').forEach((e,i)=>e.classList.toggle('sel',i===PVPLVL));
    pvpPanelEl.querySelector('.atk').classList.toggle('on',PVPMODE);
    pvpPanelEl.querySelector('.pi').textContent=PVP_INFO[PVPLVL];
  }
}
function pvpPanelBuild(){
  const el=document.createElement('div');el.id='pvpPanel';
  const h=document.createElement('div');h.className='ph';h.innerHTML='<span class="pic">i</span><span>PvP Mode</span>';el.appendChild(h);
  PVP_NAMES.forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';b.className='pm';b.style.setProperty('--c',PVP_COL[i]);
    b.innerHTML='<i></i><span>'+n+'</span>';b.title=PVP_INFO[i];
    b.addEventListener('click',()=>setPvpLvl(i));el.appendChild(b);
  });
  const pi=document.createElement('div');pi.className='pi';el.appendChild(pi);
  const ak=document.createElement('button');ak.type='button';ak.className='atk';ak.innerHTML='<span>ATK Players Only</span><b class="sw"><u></u></b>';
  ak.title='Monsters are ignored; auto-target and area skills only pick players your mode lets you attack (P key)';
  ak.addEventListener('click',togglePvpMode);el.appendChild(ak);
  ($('hud')||document.body).appendChild(el);pvpPanelEl=el; /* inside #hud so it gets the --u scale */
  document.addEventListener('pointerdown',e=>{if(pvpPanelEl.classList.contains('open')&&!pvpPanelEl.contains(e.target)&&!e.target.closest('#bPvp'))pvpPanelEl.classList.remove('open')},true);
}
function togglePvpPanel(){
  if(!started)return;
  if(!pvpPanelEl)pvpPanelBuild();
  const open=!pvpPanelEl.classList.contains('open');pvpPanelEl.classList.toggle('open',open);
  if(open){pvpUI(true);const bb=$('bPvp').getBoundingClientRect(),w=pvpPanelEl.offsetWidth,h=pvpPanelEl.offsetHeight;let x=clamp(bb.right-w,6,innerWidth-w-6),y=bb.top-h-8;if(y<6)y=Math.min(Math.max(6,innerHeight-h-6),bb.bottom+8);pvpPanelEl.style.left=x+'px';pvpPanelEl.style.top=y+'px'}
}
const pvpOk=q=>MP&&P.dead<=0&&!q.dead&&!inTown()&&!inHubAt(q.x,q.y)&&pvpRule(q);
function foes(){ /* players I may hit right now: needs ATK Players Only, the Arena, or a player I explicitly targeted */
  const a=[];if(!MP||P.dead>0||inTown()||PVPLVL<=0)return a;
  if(!(PVPMODE||curWorld===ARENA||(P.target&&P.target.isPl)))return a;
  for(const q of NET.peers.values())if(pvpOk(q))a.push(q);return a}
function hitPeer(q,dmg,crit){
  if(!pvpOk(q))return 0;
  dmg=Math.max(1,Math.round(dmg*(1+pabVal()/100)));
  netSend({t:'phit',i:q.id,d:dmg,cr:crit?1:0});
  spark(q.x,q.y,crit?'#ffd36b':'#ffb0a0',crit?10:5,160,.3,2.4);if(crit)shake=Math.max(shake,.4);SFX(crit?'crit':'hit');combatPing();
  const est=Math.max(1,Math.round(dmg*PVP_MULT));if(P.lsT>0&&!sigBusy)sigLeech(est);
  return est; /* estimate (drain heal); the real number comes back from the server */
}
function sdp(q,x,fr){
  const c=rnd()<critChance();let d=Math.round(atkVal()*x*(c?critMul():1)*(.9+rnd()*.2));
  if(fr!==undefined)d=Math.round(d*(1-RANGE_FALL*clamp(fr,0,1)));
  return hitPeer(q,d,c);
}
function startPvp(q){
  if(!MP||P.dead>0||!q)return;
  if(inTown()){say('PvP is not allowed inside the safe hub.','#8d9aa2');return}
  if(inHubAt(q.x,q.y)){say(q.name+' is standing in the safe hub.','#8d9aa2');return}
  if(q.dead)return;
  if(!pvpRule(q)){say(pvpWhy(q),'#8d9aa2');return}
  P.target=q;P.task=null;P.mv=null;
}
/* v5_109 SCREEN-SPACE PICKING: in 3D a monster / player is tall and the click lands on its body, not on the ground under its feet. Pick the candidate whose body or feet is nearest
   to the click on the SCREEN, within SCR_PICK css pixels (a generous, finger-sized radius), instead of testing a small circle on the ground. */
const SCR_PICK=PHONE?54:40;
function scrPick(e,list){
  if(!(MODE3D&&T3.r))return null;
  const r=cv.getBoundingClientRect();if(!r.width)return null;
  const k=r.width/VW,cx=e.clientX-r.left,cy=e.clientY-r.top;let best=null,bd=SCR_PICK*SCR_PICK;
  for(const o of list){
    if(dist(o.x,o.y,P.x,P.y)>1600)continue;
    const a=proj3(o.x,o.y,(o.r||20)*1.5),b=proj3(o.x,o.y,6);
    for(const sp of [a,b]){if(!sp)continue;const dx=sp.x*k-cx,dy=sp.y*k-cy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}
  }
  return best;
}
function peerAt(wx,wy,ex){
  let best=null,bd=1e9;
  for(const q of NET.peers.values()){if(q.dead)continue;const d=dist(q.x,q.y,wx,wy);if(d<q.r+60+ex&&d<bd){bd=d;best=q}} /* v5_109 bigger click area */
  return best;
}
function respawn(){
  P.dashT=0;
  P.x=C;P.y=C+110;P.hp=maxHp();P.qi=maxQi();P.dead=0;P.bfT=0;P.sh=0;
}

