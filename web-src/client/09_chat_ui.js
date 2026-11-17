/* ---------- chat commands: type /help in chat. On the server only -admin accounts may use them; boss/bossclear/who/announce run on the server, the rest run here. ---------- */
const CMDHELP=[
 'Spawn:  /boss [1-5] [level]  \u00b7 /bossclear  \u00b7 /bosses (list + distance)  \u00b7 /gotoboss',
 'Me:  /heal  \u00b7 /god (invincible on/off)  \u00b7 /speed 0.5-5  \u00b7 /home  \u00b7 /where',
 'Stats:  /lvl N  \u00b7 /exp N  \u00b7 /coins N  \u00b7 /ore N  \u00b7 /pots N  \u00b7 /gear [grade] [common|rare|epic|legendary] [count]',
 'Reset:  /coinsreset (coins to 0)  \u00b7 /orereset (ore to 0)  \u00b7 /walletreset (both)   also /coins reset  \u00b7 /ore reset',
 'Pets:  /pet [species] [class] [count] (species: chicken dragon fairy phoenix tiger wolf random \u00b7 class: F E D C B A S)  \u00b7 /egg [count]  \u00b7 /petreset (remove every pet and egg)',
 'Forge:  /forge (show levels)  \u00b7 /forge [slot|all] 0-'+FORGE_MAX+' (set forge level)  \u00b7 /forgereset [slot|all] (back to 0)  \u00b7 slots: wpn wpn2 robe ear neck ring brace glove belt legs boot',
 'View:  /minimap 500-'+3080*MAP_K+' | max | min (radar range, default 2000; max = full map radius)',
 'Party:  /invite name  \u00b7 /accept  \u00b7 /decline  \u00b7 /leave  \u00b7 /p message or the Party chat tab  \u00b7 leader: /kick name  \u00b7 /leader name  \u00b7 /disband',
 'Friends:  /friend name (send a request)  \u00b7 /friend accept [name]  \u00b7 /friend decline [name]  \u00b7 /unfriend name  \u00b7 /friends (open the window)',
 'Private:  /w name message  \u00b7 /r message (reply)  \u00b7 or tap a name in the Here list',
 'Fun:  /fireworks  \u00b7 /roll [sides]  \u00b7 /flip',
 'Server:  /who  \u00b7 /announce message'];
const CMDNUM=(v,d)=>{const n=parseFloat(v);return isFinite(n)?n:d};
function refreshCurrencyUi(){if($('bag')&&!$('bag').hidden)renderBag();if($('forge')&&!$('forge').hidden)renderForge();if($('shop')&&!$('shop').hidden&&typeof renderShop==='function')renderShop()}
const isReset=v=>v!==undefined&&/^(reset|zero|clear|none)$/i.test(String(v));
function bossNear(n,lv){
  const alive=mons.filter(m=>m.boss&&!m.dead).length,w=W[curWorld],out=[];n=Math.min(n,BOSS_MAX-alive);
  if(curWorld===ARENA){say('There are no bosses in the arena.','#8d9aa2');return}
  if(n<=0){say('Already '+BOSS_MAX+' bosses alive. Use /bossclear.','#8d9aa2');return}
  for(let k=0;k<n;k++){
    const a=rnd()*Math.PI*2,d=350+rnd()*500,l=lv>0?clamp(lv,w.lo,w.hi):w.lo+Math.floor(rnd()*(w.hi-w.lo+1));
    let x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d;const dc=dist(x,y,C,C),lim=RIM-340;if(dc>lim){x=C+(x-C)*lim/dc;y=C+(y-C)*lim/dc}
    const m=monsterAt(x,y,BOSSES[Math.floor(rnd()*BOSSES.length)],l);m.life=BOSS_LIFE;mons.push(m);out.push(m);
  }
  announceBosses(out);
}
const RARNAME={common:0,rare:1,epic:2,legendary:3};
/* slot name (or alias) -> list of slot keys; 'all' = every slot; null = unknown */
function forgeSlots(w){
  if(w===undefined)return null;w=String(w).toLowerCase();
  if(w==='all')return GEAR.map(q=>q.k);
  const al={weapon:'wpn',blade:'wpn',primary:'wpn',secondary:'wpn2',offhand:'wpn2',earrings:'ear',earring:'ear',necklace:'neck',gloves:'glove',bracelet:'brace',boots:'boot',legguards:'legs',armor:'robe'};
  w=al[w]||w;return GEAR.some(q=>q.k===w)?[w]:null}
function forgeApply(keys,n){
  for(const k of keys)P.gear[k].lv=n; /* wpn / robe write through to P.wlv / P.alv */
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());
  save();if(!$('forge').hidden)renderForge();if(!$('bag').hidden)renderBag()}
const CMDS={
  help(){for(const l of CMDHELP)say(l,'#e3b559',14000)},
  heal(){P.hp=maxHp();P.qi=maxQi();say('Fully healed.','#8ff0c4')},
  god(){P.god=!P.god;say('Invincible: '+(P.god?'ON':'OFF'),'#e3b559')},
  speed(a){const v=clamp(CMDNUM(a[0],1),.5,5);P.spdMul=v;say('Move speed x'+v,'#e3b559')},
  home(){P.x=C;P.y=C+110;P.target=null;P.mv=null;P.task=null;say('Teleported to the hub.','#d2b4ff')},
  where(){say(W[curWorld].n+' \u00b7 x '+Math.round(P.x)+', y '+Math.round(P.y)+' \u00b7 '+Math.round(dist(P.x,P.y,C,C))+' from the hub \u00b7 Lv '+P.lvl,'#8d9aa2',9000)},
  lvl(a){const n=clamp(CMDNUM(a[0],P.lvl)|0,1,MAXLV);P.lvl=n;P.exp=0;P.hp=maxHp();P.qi=maxQi();buildBar();save();say('Level set to '+n+'.','#e3b559')},
  exp(a){const n=Math.max(0,CMDNUM(a[0],0)|0);if(n)gainExp(n);say('+'+n.toLocaleString()+' EXP','#e3b559')},
  coins(a){if(isReset(a[0])){CMDS.coinsreset();return}const n=CMDNUM(a[0],1000)|0;P.coins=clamp(P.coins+n,0,2e9);save();say('Coins: '+P.coins.toLocaleString(),'#e3b559')},
  ore(a){if(isReset(a[0])){CMDS.orereset();return}const n=CMDNUM(a[0],100)|0;P.ore=clamp(P.ore+n,0,2e9);save();say('Ore: '+P.ore.toLocaleString(),'#7fe0ee')},
  /* v5_200 admin: set coins / ore back to zero (also /coins reset, /ore reset, /coins zero ...) */
  coinsreset(){P.coins=0;save();refreshCurrencyUi();say('Coins reset to 0.','#e3b559')},
  orereset(){P.ore=0;save();refreshCurrencyUi();say('Ore reset to 0.','#7fe0ee')},
  walletreset(){P.coins=0;P.ore=0;save();refreshCurrencyUi();say('Coins and ore reset to 0.','#e3b559')},
  resetcoins(){CMDS.coinsreset()},resetore(){CMDS.orereset()},resetwallet(){CMDS.walletreset()},
  /* v5_200 admin: /pet [species] [class] [count]  -> gives pets straight into the bag (no egg needed). Chicken has no class. Every argument is optional and may come in any order. */
  pet(a){
    let s=-1,c=0,n=1,rs=false;
    for(const w0 of a){const w=String(w0).toLowerCase();
      if(w==='random'||w==='any'||w==='r'){rs=true;continue}
      const si=PET_SP.findIndex(q=>q.n.toLowerCase()===w||(w.length>=3&&q.n.toLowerCase().startsWith(w)));if(si>=0){s=si;continue}
      const ci=PET_CLS.indexOf(w.toUpperCase());if(ci>=0&&w.length===1){c=ci;continue}
      if(/^x?\d+$/.test(w)){n=clamp(parseInt(w.replace('x',''),10)||1,1,999);continue}
      say('Usage: /pet [species] [class] [count]   species: '+PET_SP.map(q=>q.n.toLowerCase()).join(' ')+' random   class: '+PET_CLS.join(' ')+'   e.g. /pet dragon S 2','#d9503f');return}
    const given=[];
    for(let i=0;i<n;i++){
      const sp=s>=0&&!rs?s:1+Math.floor(rnd()*(PET_SP.length-1)),cl=sp===0?0:c;
      const k=petKey(sp,cl);if(!(petsObj()[k]>0)&&!given.includes(k)&&bagCount()+given.length>=BAG_CAP){say('Bag full - '+i+' of '+n+' pets given. Make room first.','#8d9aa2');break}
      petAdd(sp,cl,1);if(!given.includes(k))given.push(k)}
    if(!given.length)return;
    save();if(!$('bag').hidden)renderBag();
    say('Added '+(n>1?n+' pets: ':'a pet: ')+given.map(k=>{const p=petParse(k);return petName(p.s,p.c)}).join(', ')+'.','#ffe14a',6000)},
  egg(a){const n=clamp(CMDNUM(a[0],1)|0,1,9999);P.eggs=clamp((P.eggs|0)+n,0,99999);save();if(!$('bag').hidden)renderBag();say('Pet Eggs: '+P.eggs.toLocaleString(),'#f4ecd8')},
  petreset(){P.pets={};P.eggs=0;P.pet=null;P.pf=null;petComb=null;if(typeof bagSel==='string'&&(bagSel==='egg'||bagSel.indexOf('pet_')===0))bagSel=null;save();if(!$('bag').hidden)renderBag();say('All pets and eggs removed.','#e3b559')},
  pots(a){const n=CMDNUM(a[0],10)|0;for(const k of ['hp','ck','qi','tp'])P.pots[k]=clamp(P.pots[k]+n,0,POT_MAX);save();say('Potions and scrolls '+(n>=0?'+':'')+n+' each.','#e3b559')},
  minimap(a){const w=String(a[0]||'').toLowerCase();MINI_MAX=w==='max';if(!MINI_MAX)MINI_R=w==='min'?500:clamp(CMDNUM(a[0],2000),500,3080*MAP_K);say('Minimap range: '+(MINI_MAX?RIM+' units (maximum radius = whole map)':MINI_R+' units.'),'#e3b559')},
  boss(a){bossNear(clamp(CMDNUM(a[0],1)|0,1,BOSS_MAX),CMDNUM(a[1],0)|0)},
  bossclear(){let n=0;for(const m of mons)if(m.boss&&!m.dead){m.dead=true;m.dieT=0;m.respawn=1e9;n++}say('Removed '+n+' boss(es).','#e3b559')},
  bosses(){
    const L=mons.filter(m=>m.boss&&!m.dead).sort((p,q)=>dist(p.x,p.y,P.x,P.y)-dist(q.x,q.y,P.x,P.y));
    if(!L.length){say('No bosses alive. Try /boss','#8d9aa2');return}
    const dirs=['E','SE','S','SW','W','NW','N','NE'];
    for(const m of L)say(m.name+' Lv '+m.lvl+' \u00b7 '+Math.round(dist(m.x,m.y,P.x,P.y))+' away to the '+dirs[Math.round(((Math.atan2(m.y-P.y,m.x-P.x)+6.2832)%6.2832)/.7854)%8],'#ff9a6a',12000)},
  gotoboss(){
    const L=mons.filter(m=>m.boss&&!m.dead).sort((p,q)=>dist(p.x,p.y,P.x,P.y)-dist(q.x,q.y,P.x,P.y));
    if(!L.length){say('No bosses alive. Try /boss','#8d9aa2');return}
    const m=L[0];P.x=m.x-160;P.y=m.y;P.target=null;P.mv=null;P.task=null;say('Teleported next to '+m.name+'. Good luck!','#ff9a6a')},
  fireworks(){
    const cols=['#ff6a6a','#ffd36b','#8ff0c4','#6ab8ff','#d2b4ff','#ff9ad5'];
    for(let i=0;i<16;i++)setTimeout(()=>{const x=P.x+(rnd()-.5)*520,y=P.y+(rnd()-.5)*340,c=cols[i%cols.length];ring(x,y,70+rnd()*60,c);spark(x,y,c,28,280,.9,3);pop(x,y,'\u2726',c,26)},i*150);
    say('Celebrate!','#ffd36b')},
  roll(a){const n=clamp(CMDNUM(a[0],100)|0,2,1e6);say('You rolled '+(1+Math.floor(Math.random()*n))+' (1-'+n+')','#e8e0ca')},
  flip(){say(Math.random()<.5?'Heads!':'Tails!','#e8e0ca')},
  gear(a){
    const g=clamp(CMDNUM(a[0],Math.max(1,curWorld))|0,1,NW),rr=a[1]===undefined||a[1]==='random'?-1:(a[1] in RARNAME?RARNAME[a[1]]:clamp(CMDNUM(a[1],0)|0,0,RAR.length-1)),n=clamp(CMDNUM(a[2],1)|0,1,20);
    for(let i=0;i<n;i++){const q=GEAR[Math.floor(rnd()*GEAR.length)];takeGear(rollGear(q,g,.5,rr<0?rollRarity():rr))}
    renderBag&&!$('bag').hidden&&renderBag()},
  /* v5_143 admin: set / reset forge level. The level belongs to the SLOT (wpn / robe use the Blade / Robe level), so it works with or without an item worn. */
  forge(a){
    const sl=forgeSlots(a[0]);
    if(a.length===0){say('Forge levels: '+GEAR.map(q=>q.k+' +'+P.gear[q.k].lv).join(' \u00b7 '),'#e3b559');return}
    let keys=sl,val=a.length>1?a[1]:a[0];
    if(a.length===1&&!isNaN(parseFloat(a[0]))){keys=GEAR.map(q=>q.k);val=a[0]} /* "/forge 50" = every slot */
    if(!keys||keys.length===0||isNaN(parseFloat(val))){say('Usage: /forge [slot|all] 0-'+FORGE_MAX+'   slots: '+GEAR.map(q=>q.k).join(' '),'#d9503f');return}
    const n=clamp(parseFloat(val)|0,0,FORGE_MAX);
    forgeApply(keys,n);say('Forge level set to +'+n+' on '+(keys.length===GEAR.length?'all slots':keys.join(', '))+'.','#e3b559')},
  forgereset(a){
    const keys=a.length?forgeSlots(a[0]):GEAR.map(q=>q.k);
    if(!keys||keys.length===0){say('Usage: /forgereset [slot|all]   slots: '+GEAR.map(q=>q.k).join(' '),'#d9503f');return}
    forgeApply(keys,0);say('Forge level reset to +0 on '+(keys.length===GEAR.length?'all slots':keys.join(', '))+'.','#e3b559')},
  who(){say('/who needs the multiplayer server.','#8d9aa2')},
  announce(){say('/announce needs the multiplayer server.','#8d9aa2')}
};
function runCmd(line){
  if(!started)return;
  const f=line.trim().split(/\s+/),c=f[0].replace(/^\//,'').toLowerCase();
  if(CMDS[c]&&Object.prototype.hasOwnProperty.call(CMDS,c)){try{CMDS[c](f.slice(1))}catch(e){say('Command failed: '+e.message,'#d9503f')}}
  else say('Unknown command "/'+c+'". Type /help','#8d9aa2');
}
let PM_LAST=''; /* name of the last player who whispered to you (for /r) */
/* ---------- CHAT WINDOW ----------
   Tabs: All (world chat + system + whispers), World (player chat), System (kills, drops, announcements), and one tab per whisper partner.
   Enter / Chat button opens it; Enter sends. History is kept while the page is open. State object CP is declared next to say(). */
const CPREF=(()=>{const d={sys:true,pm:true,ts:true,feed:true};try{return Object.assign(d,JSON.parse(localStorage.getItem('wl_chatpref')||'{}'))}catch(e){return d}})();
function cpSavePref(){try{localStorage.setItem('wl_chatpref',JSON.stringify(CPREF))}catch(e){}$('hud').classList.toggle('nofeed',!CPREF.feed)}
function cpOpen(){const e=$('cp');return !!e&&!e.hidden}
function cpFmt(u){const d=new Date(u*1000),n=new Date(),t=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');return d.toDateString()===n.toDateString()?t:(d.getMonth()+1)+'/'+d.getDate()+' '+t}
function cpTime(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
const pcKey=n=>String(n).toLowerCase();
function cpMatch(m){
  const c=CP.cur;
  if(c==='all')return m.k==='chat'||m.k==='pty'||(m.k==='sys'&&CPREF.sys)||(m.k==='pm'&&CPREF.pm);
  if(c==='party')return m.k==='pty';
  if(c==='world')return m.k==='chat';
  if(c==='sys')return m.k==='sys';
  return m.k==='pm'&&'pm:'+m.th===c;
}
function cpPush(m){
  if(!m.ts)m.ts=cpTime();CP.log.push(m);
  if(CP.log.length>300){const i=CP.log.findIndex(x=>x.k!=='pm');CP.log.splice(i<0?0:i,1)} /* trim old world/system lines first: private messages are kept until the player deletes them */
  if(m.k==='pm')pmSaveSoon();
  const open=cpOpen(),c=CP.cur;
  if(m.k==='chat'){if(!m.me&&!(open&&(c==='all'||c==='world')))CP.un.world=Math.min(99,CP.un.world+1)}
  else if(m.k==='sys'){if(!(open&&(c==='sys'||(c==='all'&&CPREF.sys))))CP.un.sys=Math.min(99,CP.un.sys+1)}
  else if(m.k==='pty'){if(!m.me&&!(open&&(c==='party'||c==='all')))CP.un.party=Math.min(99,CP.un.party+1)}
  else if(m.k==='pm'&&!m.me){const t=CP.th.get(m.th);if(t&&!(open&&c==='pm:'+m.th))t.un=Math.min(99,t.un+1)}
  cpSched();
}
function cpSched(){if(CP.raf)return;CP.raf=requestAnimationFrame(()=>{CP.raf=0;cpRender()})}
function cpClearUn(){
  const c=CP.cur;
  if(c==='all'){CP.un.world=0;CP.un.party=0;if(CPREF.sys)CP.un.sys=0}
  else if(c==='party')CP.un.party=0;
  else if(c==='world')CP.un.world=0;
  else if(c==='sys')CP.un.sys=0;
  else{const t=CP.th.get(c.slice(3));if(t)t.un=0}
}
function cpBadges(){
  let pm=0;CP.th.forEach(t=>pm+=t.un);
  const tot=CP.un.world+CP.un.party+pm,txt=tot>99?'99+':String(tot);
  for(const id of ['cpDoorN','chN']){const b=$(id);if(b){b.textContent=txt;b.style.display=tot?'':'none'}}
  const pn=$('pcN');if(pn){pn.textContent=pm>99?'99+':String(pm);pn.style.display=pm?'':'none'}
}
function cpAvatar(sk){
  const s=skinOf(sk|0),a=document.createElement('span');a.className='av';
  a.style.background='linear-gradient(#25324a,'+s.sash+')';
  const b=document.createElement('i');b.className='bd2';b.style.background=s.robe;b.style.borderTopColor=s.trim;
  const h=document.createElement('i');h.className='hd2';h.style.background='linear-gradient('+s.hair+' 0 40%,'+s.skin+' 40%)';
  a.appendChild(b);a.appendChild(h);return a;
}
function cpEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function cpRow(m){
  if(m.k==='sys'){
    const d=cpEl('div','cs',m.m);if(m.col)d.style.color=m.col;
    if(CPREF.ts)d.appendChild(cpEl('span','tm',' ('+m.ts+')'));
    return d;
  }
  const pm=m.k==='pm',d=cpEl('div','cm'+(m.me?' me':'')+(pm?' pm':''));
  d.appendChild(cpAvatar(m.sk));
  const body=cpEl('div','cb'),h=cpEl('div','ch');
  if(pm){const t=CP.th.get(m.th);const w=cpEl('span','wh','[Whisper'+(m.me&&CP.cur==='all'&&t?' \u2192 '+t.name:'')+(m.off?' \u00b7 offline':'')+']');if(m.off)w.title=m.me?'They were offline. They will get this when they log in.':'Sent while you were offline.';h.appendChild(w)}
  else if(m.k==='pty'){const w=cpEl('span','wh','[Party]');w.style.color='#8ff0b0';h.appendChild(w);if(m.lv)h.appendChild(cpEl('span','tg','[Lv '+m.lv+']'))}
  else if(m.lv)h.appendChild(cpEl('span','tg','[Lv '+m.lv+']'));
  if(m.wt)h.appendChild(cpEl('span','wt','['+m.wt+']'));
  h.appendChild(cpEl('span','nm',m.me?'You':m.n));
  if(CPREF.ts)h.appendChild(cpEl('span','tm','('+m.ts+')'));
  body.appendChild(h);
  const bb=cpEl('div','bb',m.m),lm=String(m.m).match(CP_LOC_RE);
  if(lm){bb.classList.add('loc');bb.title='Click to walk to this location';bb.addEventListener('click',()=>cpGoLoc(lm[1],+lm[2],+lm[3]))}
  body.appendChild(bb);d.appendChild(body);return d;
}
function cpTabsRender(){
  const box=$('cpTabs'),sc=box.scrollTop,defs=[{id:'all',ic:'\u{1F310}',lb:'All',un:0},{id:'world',ic:'\u{1F3EF}',lb:'World',un:CP.un.world},{id:'sys',ic:'\u{1F4E2}',lb:'System',un:CP.un.sys}];
  if(PARTY.m.length>1)defs.splice(2,0,{id:'party',ic:'\u{1F6E1}',lb:'Party',un:CP.un.party});
  CP.th.forEach((t,k)=>defs.push({id:'pm:'+k,ic:'\u{1F91D}',lb:t.name,un:t.un,pm:k}));
  box.innerHTML='';
  for(const d of defs){
    const b=cpEl('div','ct'+(d.id===CP.cur?' on':''));b.title=d.lb;
    b.appendChild(cpEl('span','ic2',d.ic));b.appendChild(cpEl('span','lb2',d.lb));
    if(d.un&&d.id!==CP.cur)b.appendChild(cpEl('span','bdg',d.un>99?'99+':String(d.un)));
    if(d.pm){const x=cpEl('span','cx','\u00d7');x.title='Close this chat';x.addEventListener('click',e=>{e.stopPropagation();cpCloseThread(d.pm)});b.appendChild(x)}
    b.addEventListener('click',()=>cpSwitch(d.id));
    box.appendChild(b);
  }
  box.scrollTop=sc;
}
function cpLogRender(){
  const log=$('cpLog'),stick=CP.stick||log.scrollHeight-log.scrollTop-log.clientHeight<48,list=CP.log.filter(cpMatch).slice(-150),fr=document.createDocumentFragment();
  if(!list.length){
    const c=CP.cur;
    fr.appendChild(cpEl('div','hint',c.startsWith('pm:')?'Say something to '+CP.th.get(c.slice(3)).name+'. Only they can see it. If they are offline they get it when they log in.':c==='sys'?'Kills, drops and announcements show up here.':c==='party'?'Only your party can see messages here. Press Enter and type. (/p message works from any tab.)':(NET.on&&NET.joined)?'No messages yet. Press Enter and say hello.':'Chat needs the multiplayer server.'));
  }
  for(const m of list)fr.appendChild(cpRow(m));
  log.innerHTML='';log.appendChild(fr);
  if(stick)log.scrollTop=log.scrollHeight;CP.stick=false;
}
function cpRender(){
  cpBadges();
  if(!cpOpen())return;
  cpTabsRender();cpLogRender();
  const inp=$('cpIn'),ro=CP.cur==='sys';
  inp.disabled=ro;inp.placeholder=ro?'System messages are read-only.':CP.cur==='party'?'Party chat':CP.cur.startsWith('pm:')?'Whisper to '+CP.th.get(CP.cur.slice(3)).name:'Enter text.';
}
function cpSwitch(id){
  if(id.startsWith('pm:')&&!CP.th.has(id.slice(3)))id='all';
  if(id==='party'&&PARTY.m.length<2)id='all';
  CP.cur=id;CP.stick=true;cpClearUn();cpPopHide();cpRender();
  if(!$('cpIn').disabled&&!PHONE)$('cpIn').focus();
}
function cpShow(ch,focus){
  $('cp').hidden=false;$('hud').classList.add('cpOpen');
  if(ch)CP.cur=ch;
  if(CP.cur.startsWith('pm:')&&!CP.th.has(CP.cur.slice(3)))CP.cur='all';
  if(CP.cur==='party'&&PARTY.m.length<2)CP.cur='all';
  CP.stick=true;cpClearUn();cpPopHide();cpRender();
  if(focus!==false&&!$('cpIn').disabled){for(const k in keys)keys[k]=false;setTimeout(()=>$('cpIn').focus(),0)}
}
function cpHide(){if(!cpOpen())return;$('cp').hidden=true;$('hud').classList.remove('cpOpen');$('cpIn').blur();cpPopHide()}
function openChat(){
  if(!started)return;
  if(cpOpen()){if(document.activeElement!==$('cpIn')&&!$('cpIn').disabled){for(const k in keys)keys[k]=false;$('cpIn').focus()}return}
  cpShow(null,true);
}
function toggleChat(){if(!started)return;if(cpOpen())cpHide();else cpShow(null,!PHONE)}
/* ----- private chat is kept per account in this browser until the player deletes it (tab X = delete conversation, menu "Clear this tab" = clear its messages) ----- */
let PM_LOADED=false,PM_T=0;
const pmKey=()=>'al_pm_'+String(AUTH.email||'').toLowerCase();
function pmSaveNow(){
  clearTimeout(PM_T);PM_T=0;
  if(!PM_LOADED||!AUTH.email)return;   /* never overwrite the stored chat before it has been loaded */
  try{
    const th=[],msgs=[],per={};
    CP.th.forEach((t,k)=>th.push({k:k,n:t.name,u:t.un||0}));
    for(let i=CP.log.length-1;i>=0;i--){const m=CP.log[i];if(m.k!=='pm')continue;
      per[m.th]=(per[m.th]||0)+1;if(per[m.th]>200)continue;   /* newest 200 messages per conversation */
      msgs.push({th:m.th,n:m.n,m:m.m,me:m.me?1:0,sk:m.sk||0,lv:m.lv||0,off:m.off?1:0,ts:m.ts||''})}
    msgs.reverse();
    localStorage.setItem(pmKey(),JSON.stringify({v:1,th:th,msgs:msgs}));
  }catch(e){}
}
function pmSaveSoon(){if(!PM_LOADED)return;clearTimeout(PM_T);PM_T=setTimeout(pmSaveNow,400)}
function pmLoad(){
  PM_LOADED=false;
  CP.th.clear();CP.log=CP.log.filter(m=>m.k!=='pm');
  try{
    const d=JSON.parse(localStorage.getItem(pmKey())||'null');
    if(d&&Array.isArray(d.th)){
      for(const t of d.th)if(t&&t.k&&t.n)CP.th.set(String(t.k),{name:String(t.n),un:Math.min(99,t.u|0)});
      const old=[];
      for(const x of (d.msgs||[]))if(x&&CP.th.has(String(x.th)))old.push({k:'pm',th:String(x.th),n:String(x.n),m:String(x.m),me:!!x.me,sk:x.sk|0,lv:x.lv|0,off:!!x.off,ts:String(x.ts||'')});
      CP.log=old.concat(CP.log);
    }
  }catch(e){}
  PM_LOADED=true;cpSched();
}
window.addEventListener('pagehide',pmSaveNow);
window.addEventListener('beforeunload',pmSaveNow);
/* ----- whisper threads (messages live in CP.log; a thread is just a tab + unread count) ----- */
function pcThread(name,mk){const k=pcKey(name);let t=CP.th.get(k);if(!t&&mk){t={name:String(name),un:0};CP.th.set(k,t);pmSaveSoon()}return t}
function cpCloseThread(k){
  CP.th.delete(k);CP.log=CP.log.filter(m=>!(m.k==='pm'&&m.th===k));
  if(CP.cur==='pm:'+k)CP.cur='all';CP.stick=true;cpRender();pmSaveSoon();
}
function pcAdd(name,text,me,id,x){
  let t=pcThread(name,false);
  /* a tab opened with a typed name that is still empty takes the real name the server resolved (e.g. "Win" -> "Wind Walker") */
  if(me&&!t&&CP.cur.startsWith('pm:')){
    const ck=CP.cur.slice(3),ct=CP.th.get(ck);
    if(ct&&!CP.log.some(x=>x.k==='pm'&&x.th===ck)&&pcKey(ct.name)!==pcKey(name)){CP.th.delete(ck);ct.name=String(name);CP.th.set(pcKey(name),ct);CP.cur='pm:'+pcKey(name);t=ct}
  }
  if(!t)t=pcThread(name,true);
  const k=pcKey(t.name),q=me?null:NET.peers.get(id),info=me?{sk:SKIN,lv:P.lvl}:q?{sk:q.sk,lv:q.lvl}:CP.who.get(k);
  if(info&&!me)CP.who.set(k,info);
  cpPush({k:'pm',th:k,n:me?'You':String(name),m:String(text),me:!!me,sk:info?info.sk:0,lv:info?info.lv:0,off:!!(x&&x.off),ts:(x&&x.ts)?cpFmt(x.ts):''});
}
function openPrivate(name,focus){
  if(!started)return;
  if(!(NET.on&&NET.joined)){say('Private chat needs the multiplayer server.','#8d9aa2');return}
  const t=pcThread(name,true);t.un=0;cpShow('pm:'+pcKey(t.name),focus!==false);
}
function whisperTo(name){openPrivate(name,true)}
function togglePchat(){
  if(!started)return;
  if(cpOpen()){cpHide();return}
  const u=[...CP.th.entries()].find(e=>e[1].un);
  cpShow(u?'pm:'+u[0]:null,!PHONE);
}
/* ----- sending ----- */
function cpSend(){
  const inp=$('cpIn');let t=inp.value.trim();if(!t||CP.cur==='sys')return;
  const online=NET.on&&NET.joined,c=CP.cur,done=()=>{inp.value='';CP.stick=true;if(PHONE)inp.blur()};
  if(c==='party'&&t[0]!=='/'){
    if(!online||PARTY.m.length<2){say('You are not in a party.','#8d9aa2');return}
    netSend({t:'party',m:'chat',tx:t});done();return;
  }
  if(c.startsWith('pm:')&&t[0]!=='/'){
    const th=CP.th.get(c.slice(3));
    if(!online){say('Private messages need the multiplayer server.','#8d9aa2');return}
    netSend({t:'chat',m:'/w "'+th.name+'" '+t});done();return;
  }
  const rm=t.match(/^\/r\s+(.+)/i);
  if(rm){if(!PM_LAST){say('Nobody has whispered to you yet.','#8d9aa2');inp.value='';return}t='/w "'+PM_LAST+'" '+rm[1]}
  const wm=t.match(/^\/(?:w|pm|msg|tell|whisper)\s+(?:"([^"]+)"|(\S+))\s*$/i);
  if(wm){inp.value='';openPrivate(wm[1]||wm[2],true);return}
  if(/^\/r\s*$/i.test(t)){inp.value='';if(PM_LAST)openPrivate(PM_LAST,true);else say('Nobody has whispered to you yet.','#8d9aa2');return}
  if(/^\/(w|pm|msg|tell|whisper)(\s|$)/i.test(t)&&!online){say('Private messages need the multiplayer server.','#8d9aa2');inp.value='';return}
  const fc=t.match(/^\/(friend|friends|unfriend|addfriend)(?:\s+(.*))?$/i);
  if(fc){inp.value='';frCmd(fc[1].toLowerCase()==='addfriend'?'friend':fc[1].toLowerCase(),fc[2]);return}
  const pc=t.match(/^\/(invite|accept|decline|leave|kick|leader|promote|disband|party|p)(?:\s+(.*))?$/i);
  if(pc){inp.value='';partyCmd(pc[1].toLowerCase(),(pc[2]||'').trim().replace(/^"(.*)"$/,'$1'));return}
  if(t[0]==='/'){if(online)netSend({t:'chat',m:t});else runCmd(t)}
  else if(NET.on)netSend({t:'chat',m:t});else say('Chat needs the multiplayer server.','#8d9aa2');
  done();
}
/* ----- pop-ups: settings, new whisper, help, quick phrases ----- */
function cpPopHide(){const p=$('cpPop');if(p){p.hidden=true;p.innerHTML=''}CP.pop=''}
function cpPopOpen(kind,top){
  const p=$('cpPop');if(!p.hidden&&CP.pop===kind){cpPopHide();return null}
  p.innerHTML='';p.hidden=false;CP.pop=kind;p.classList.toggle('top',!!top);return p;
}
function cpItem(p,a,b,fn){const it=cpEl('button','it');it.type='button';it.appendChild(cpEl('span','',a));if(b!==undefined)it.appendChild(cpEl('span','',b));it.addEventListener('click',fn);p.appendChild(it);return it}
function cpSettings(){
  const p=cpPopOpen('set',true);if(!p)return;
  p.appendChild(cpEl('h5','','Chat settings'));
  for(const [k,lb] of [['sys','Show system messages in All'],['pm','Show whispers in All'],['ts','Show times'],['feed','Floating messages over the game']]){
    const l=cpEl('label'),c=document.createElement('input');c.type='checkbox';c.checked=!!CPREF[k];
    c.addEventListener('change',()=>{CPREF[k]=c.checked;cpSavePref();CP.stick=true;cpRender()});
    l.appendChild(c);l.appendChild(cpEl('span','',lb));p.appendChild(l);
  }
  cpItem(p,'Clear this tab',undefined,()=>{CP.log=CP.log.filter(m=>!cpMatch(m));CP.stick=true;cpPopHide();cpRender();pmSaveSoon()});
}
function cpNewChat(){
  const p=cpPopOpen('new',true);if(!p)return;
  p.appendChild(cpEl('h5','','New private chat'));
  if(!(NET.on&&NET.joined)){p.appendChild(cpEl('p','','Private chat needs the multiplayer server.'));return}
  const list=[...NET.peers.values()].sort((a,b)=>b.lvl-a.lvl).slice(0,8);
  if(list.length){for(const q of list)cpItem(p,q.name,'Lv '+q.lvl,()=>openPrivate(q.name,true))}
  else p.appendChild(cpEl('p','','Nobody else is in this world. Type a name to whisper anyone, even if they are offline.'));
  p.appendChild(cpEl('p','','Offline players get your message when they next log in.'));
  const r=cpEl('div','rw'),i=document.createElement('input');i.type='text';i.placeholder='Player name';i.maxLength=16;
  const go=cpEl('button','it','Start');go.type='button';go.style.width='auto';
  const run=()=>{const v=i.value.trim();if(v)openPrivate(v,true)};
  go.addEventListener('click',run);
  i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')run();else if(e.key==='Escape')cpPopHide()});i.addEventListener('keyup',e=>e.stopPropagation());
  r.appendChild(i);r.appendChild(go);p.appendChild(r);
}
function cpHelp(){
  const p=cpPopOpen('help',true);if(!p)return;
  p.appendChild(cpEl('h5','','Chat help'));
  for(const t of ['Enter opens chat, Enter sends, Esc closes.','All = everything. World = player chat. System = kills, drops, announcements.','Whisper: /w name message, or tap a name in the Here list or the + button. Works even if they are offline (they get it when they log in). Reply with /r message.','Tap the door button to jump to unread messages, the pin to share where you are.'])p.appendChild(cpEl('p','',t));
  cpItem(p,'Show all commands',undefined,()=>{cpPopHide();$('cpIn').value='/help';cpSend()});
}
function cpQuick(){
  const p=cpPopOpen('list',false);if(!p)return;
  p.appendChild(cpEl('h5','','Quick phrases'));
  for(const t of ['Anyone want to party?','Boss spotted!','Help, I need backup!','Thanks!','GG','Brb'])cpItem(p,t,undefined,()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');$('cpIn').value=t;cpSend()});
  p.appendChild(cpEl('h5','','Commands'));
  cpItem(p,'/w name message','Whisper',()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');const i=$('cpIn');i.value='/w ';i.focus()});
  cpItem(p,'/r message','Reply',()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');const i=$('cpIn');i.value='/r ';i.focus()});
}
/* clicking a shared "[Location] World (x, y)" message walks the character there (same world only) */
const CP_LOC_RE=/^\[Location\]\s+(.+?)\s+\((-?\d+),\s*(-?\d+)\)\s*$/;
function cpGoLoc(wn,x,y){
  if(!started||P.dead>0)return;
  const wi=W.findIndex(w=>w.n===wn);
  if(wi<0){say('Unknown location.','#8d9aa2');return}
  if(wi!==curWorld){say('That location is in '+wn+'. Travel to that world first.','#8d9aa2');return}
  const d=dist(x,y,C,C);if(d>RIM-20){x=C+(x-C)/d*(RIM-20);y=C+(y-C)/d*(RIM-20)} /* keep the destination inside the map edge */
  P.mv={x:x,y:y};P.target=null;P.task=null;P.mine=0;stopMine('Auto-mine off.');
  say('Heading to ('+Math.round(x)+', '+Math.round(y)+').','#8d9aa2');
}
function cpShareLoc(){
  if(!(NET.on&&NET.joined)){say('Chat needs the multiplayer server.','#8d9aa2');return}
  const loc='[Location] '+W[curWorld].n+' ('+Math.round(P.x)+', '+Math.round(P.y)+')';
  /* send only to the selected tab: a whisper tab gets a private whisper to that player, otherwise world chat */
  const th=CP.cur.startsWith('pm:')?CP.th.get(CP.cur.slice(3)):null;
  if(th){netSend({t:'chat',m:'/w \"'+th.name+'\" '+loc});CP.stick=true;return}
  netSend({t:'chat',m:loc});
  if(CP.cur==='sys')cpSwitch('world');
}
function cpJump(){
  const u=[...CP.th.entries()].find(e=>e[1].un);
  if(u)cpSwitch('pm:'+u[0]);else if(CP.un.world)cpSwitch('world');else if(CP.un.sys)cpSwitch('sys');
  else{CP.stick=true;cpLogRender()}
}
{
  const inp=$('cpIn');
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();cpSend()}else if(e.key==='Escape'){if(!$('cpPop').hidden)cpPopHide();else cpHide()}});
  inp.addEventListener('keyup',e=>e.stopPropagation());
  $('cpSet').addEventListener('click',cpSettings);$('cpNew').addEventListener('click',cpNewChat);$('cpHelp').addEventListener('click',cpHelp);
  $('cpPin').addEventListener('click',cpShareLoc);$('cpDoor').addEventListener('click',cpJump);$('cpList').addEventListener('click',cpQuick);
  $('cpX').addEventListener('click',cpHide);{const bp=$('bPchat');if(bp)bp.addEventListener('click',togglePchat)} /* v5_151 the top-bar Msg button was removed; private chat still opens with I or /w */
  $('cpLog').addEventListener('click',()=>{if(!$('cpPop').hidden)cpPopHide()});
  $('hud').classList.toggle('nofeed',!CPREF.feed);
  /* drag the window by its title bar */
  const box=$('cp'),hd=$('cpHead');let dg=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=box.getBoundingClientRect(),h=$('hud').getBoundingClientRect();dg={id:e.pointerId,ox:e.clientX-r.left,oy:e.clientY-r.top,hx:h.left,hy:h.top,hw:h.width,hh:h.height};try{hd.setPointerCapture(e.pointerId)}catch(_){}});
  hd.addEventListener('pointermove',e=>{if(!dg||e.pointerId!==dg.id)return;const w=box.offsetWidth,hh=box.offsetHeight;box.style.left=clamp(e.clientX-dg.hx-dg.ox,0,Math.max(0,dg.hw-w))+'px';box.style.top=clamp(e.clientY-dg.hy-dg.oy,0,Math.max(0,dg.hh-Math.min(hh,40)))+'px'});
  const end=e=>{if(dg&&e.pointerId===dg.id)dg=null};hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
}
$('nameIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('bStart').click()});
$('nameIn').addEventListener('input',ignCheck);

/* ---------- landscape mode (phones): full screen + rotation lock. Not every browser allows it (iPhone Safari does not), then we say so. ---------- */
const LAND={on:false,hinted:false};
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),STANDALONE=!!navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
function landPref(v){try{if(v===undefined)return localStorage.getItem('wl_land')==='1';localStorage.setItem('wl_land',v?'1':'0')}catch(e){return false}}
async function landOn(quiet){
  let ok=false;
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(e){}
  try{if(screen.orientation&&screen.orientation.lock){await screen.orientation.lock('landscape');ok=true}}catch(e){}
  LAND.on=ok||innerWidth>innerHeight;$('bLand').classList.toggle('on',LAND.on);
  if(ok)say('Landscape mode on.','#5fd3a5');
  else if(!quiet&&IOS&&!STANDALONE)say('iPhone Safari cannot hide its tabs or lock rotation. Tap Share, then Add to Home Screen, and open World of Ascension from your home screen for full screen. Turn off Portrait Orientation Lock and hold the phone sideways.','#e3b559',14000);
  else if(!quiet)say('This browser cannot lock rotation. Turn off your phone\u2019s rotation lock and hold it sideways.','#e3b559',9000);
}
function landOff(){
  try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch(e){}
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  LAND.on=false;$('bLand').classList.remove('on');say('Landscape mode off.','#8d9aa2');
}
$('bLand').addEventListener('click',()=>{if(LAND.on&&screen.orientation&&screen.orientation.type&&screen.orientation.type.startsWith('landscape')){landPref(false);landOff()}else{landPref(true);landOn(false)}});
/* remembered preference is re-applied on the first touch (browsers need a tap for fullscreen); portrait gets a one-time hint */
window.addEventListener('pointerdown',()=>{if(started&&PHONE&&landPref()&&!LAND.on&&innerHeight>innerWidth)landOn(true)},{passive:true});
setInterval(()=>{if(started&&PHONE&&IOS&&!STANDALONE&&!LAND.hinted){LAND.hinted=true;say('Tip for iPhone: Share > Add to Home Screen, then open from your home screen to play full screen without Safari tabs.','#e3b559',12000);return}if(started&&PHONE&&!LAND.hinted&&innerHeight>innerWidth*1.1){LAND.hinted=true;say('Tip: tap the Land button (left side) to play in landscape.','#e3b559',9000)}},3000);

/* ---------- keep the screen awake while playing ----------
   Screen Wake Lock API where available (needs https or localhost). Over plain http on a LAN address browsers hide that API,
   so we fall back to the NoSleep trick: a tiny muted video playing from a canvas stream keeps the phone from dimming. */
const AWAKE={lock:null,vid:null,want:false};
async function keepAwake(){
  AWAKE.want=true;
  try{
    if(navigator.wakeLock&&!AWAKE.lock){
      AWAKE.lock=await navigator.wakeLock.request('screen');
      AWAKE.lock.addEventListener('release',()=>{AWAKE.lock=null});
      return;
    }
  }catch(e){}
  if(AWAKE.lock||(AWAKE.vid&&!AWAKE.vid.paused))return;
  try{
    if(!AWAKE.vid){
      const c=document.createElement('canvas');c.width=c.height=16;
      const g=c.getContext('2d'),v=document.createElement('video');
      v.setAttribute('playsinline','');v.muted=true;v.loop=true;
      v.style.cssText='position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;left:0;top:0';
      v.srcObject=c.captureStream(5);
      document.body.appendChild(v);AWAKE.vid=v;
      let f=0;setInterval(()=>{g.fillStyle=(f++&1)?'#000':'#010101';g.fillRect(0,0,16,16)},200); /* keep the stream producing frames */
    }
    await AWAKE.vid.play();
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AWAKE.want)keepAwake()});
window.addEventListener('pointerdown',()=>{if(started&&AWAKE.want&&!AWAKE.lock&&(!AWAKE.vid||AWAKE.vid.paused))keepAwake()},{passive:true});

