/* ---------- multiplayer client ----------
   Server -> client: hello, on, world, s (snapshot), h (someone hit a monster), d (monster died), k (you get credit: XP and loot),
   hurt (a monster hit you), o (ore taken), pj/pl/pi (player joined/left/changed), fx (their skill effects), chat.
   Client -> server: join, p (my position ~15/s), i (my stats), hit, mine, fx, chat, world. */
const NONE=[];
function netSend(o){const w=NET.ws;if(w&&w.readyState===1)w.send(JSON.stringify(o))}
/* v5_159 party support: share a heal / ATK buff with party mates nearby (server relays it, clamped). Only when you are in a party in a multiplayer world. */
function partyShare(kind,v){if(typeof MP!=='undefined'&&MP&&typeof PARTY!=='undefined'&&PARTY.m.length>1&&v>0)netSend({t:'pbuff',m:kind,d:+v.toFixed(3)})}
function fxs(o){if(MP){o.t='fx';netSend(o)}}
/* equipped gear shared with other players (so they can inspect you): slot -> [grade, rarity, forge level, stat rolls] */
function eqPack(){const o={};for(const q of GEAR){const g=P.gear[q.k];if(g&&g.g>0){const st={};for(const k in g.st){const v=+g.st[k];if(isFinite(v))st[k]=Math.round(v*100)/100}o[q.k]=[g.g|0,g.r|0,g.lv|0,st]}}return o}
function eqClean(raw){const o={};if(!raw||typeof raw!=='object')return o;
  for(const q of GEAR){const a=raw[q.k];if(!Array.isArray(a))continue;
    const g=clamp(a[0]|0,1,TIER.length),r=clamp(a[1]|0,0,RAR.length-1),lv=clamp(a[2]|0,0,500),st={};
    if(a[3]&&typeof a[3]==='object')for(const k in a[3]){if(Object.prototype.hasOwnProperty.call(STAT_LBL,k)){const v=+a[3][k];if(isFinite(v))st[k]=v}}
    o[q.k]={g,r,lv,st}}
  return o}
function mkPeer(i){
  return {isPl:true,eq:eqClean(i.eq),id:i.id,name:String(i.n||'?').slice(0,16),sk:i.sk|0,lvl:clamp(i.lv|0,1,MAXLV),wlv:i.wl|0,alv:i.al|0,mh:Math.max(1,i.mh|0),hp:Math.max(1,i.mh|0),
    x:+i.x||C,y:+i.y||C,tx:+i.x||C,ty:+i.y||C,face:0,dir:1,mvAmt:0,anim:0,swing:0,hurt:0,bfT:0,sh:0,dead:0,r:14,mine:0,pvp:false,pm:0,pet:petKeyClean(i.pt),pf:null,seen:performance.now()};
}
function netInfo(force){
  if(!NET.joined)return;
  const o={t:'i',cl:P.cls,sk:SKW(),lv:P.lvl,wl:P.wlv,al:P.alv,mh:maxHp(),df:defVal(),eq:eqPack(),pt:P.pet||''},k=JSON.stringify(o);
  if(!force&&k===NET.infoKey)return;
  NET.infoKey=k;netSend(o);
}
function netJoin(){
  NET.joined=true;NET.infoKey='';
  netSend({t:'join',token:AUTH.token,sid:SID,name:NET.name,w:curWorld,cl:P.cls,sk:SKW(),lv:P.lvl,wl:P.wlv,al:P.alv,mh:maxHp(),df:defVal()});
  netSend({t:'pvpm',on:PVPLVL}); /* v5_158 tell the server my PvP mode */
}
function setNetStatus(){
  const s=$('netStat');if(!s)return;
  if(NET.on){const on=Math.max(NET.online|0,NET.joined?1:0);s.textContent='Online \u00b7 '+on+' adventurer'+(on===1?'':'s')+' in the world';s.style.color='#5fd3a5'}
  else{s.textContent=NET.giveUp?'No server found \u00b7 playing solo':(NET.fails>=3?'Server unreachable \u00b7 playing solo, retrying\u2026':'Connecting to server\u2026');s.style.color='#8d9aa2'}
}
function netConnect(){
  if(NET.rt){clearTimeout(NET.rt);NET.rt=0}
  if(NET.giveUp)return;
  if(NET.ws&&NET.ws.readyState<=1)return; /* already connecting / connected */
  if(!/^https?:$/.test(location.protocol)){NET.giveUp=true;setNetStatus();return} /* opened as a file: solo only */
  let ws;
  try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws')}catch(e){netRetry();return}
  NET.ws=ws;NET.lastMsg=Date.now();
  ws.onopen=()=>{NET.on=true;NET.fails=0;NET.lastMsg=Date.now();setNetStatus()};
  ws.onmessage=e=>{NET.lastMsg=Date.now();let m;try{m=JSON.parse(e.data)}catch(_){return}try{netMsg(m)}catch(err){console.error(err)}};
  ws.onclose=()=>{
    if(NET.ws!==ws)return; /* an old socket: already handled */
    const was=NET.on;NET.on=false;NET.joined=false;NET.ws=null;
    setParty([]);pinvHide();
    if(MP){MP=false;NET.peers.clear();buildWorld(curWorld);P.target=null;P.pvpT=0;say('Connection lost \u2014 playing solo while reconnecting\u2026','#d9503f')}
    if(!was)NET.fails++;
    setNetStatus();
    netRetry();
  };
  ws.onerror=()=>{};
}
/* v5_233 never give up: keep retrying with a growing pause (2.5 s, 5 s ... max 15 s) so the game goes back online by itself when the internet / server is back.
   Also retries at once when the browser reports it is online again or the tab becomes visible. Only a deliberate stop (opened as a file, kicked / logged in elsewhere) sets NET.giveUp. */
function netRetry(){
  if(NET.giveUp||NET.rt)return;
  NET.rt=setTimeout(()=>{NET.rt=0;netConnect()},Math.min(15000,2500*(1+Math.min(NET.fails,5))));
}
function netNudge(){if(!NET.giveUp&&!NET.on&&!(NET.ws&&NET.ws.readyState<=1)){NET.fails=0;netConnect()}}
window.addEventListener('online',netNudge);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)netNudge()});
/* watchdog: a dead connection (internet lost but the socket never closed) sends nothing back; the server answers our 2 s ping, so 20 s of silence means it is dead */
setInterval(()=>{
  const w=NET.ws;if(!w||!NET.joined||Date.now()-(NET.lastMsg||0)<20000)return;
  try{w.close()}catch(e){}
  setTimeout(()=>{if(NET.ws===w&&w.onclose)w.onclose()},3000);
},5000);
/* network ticks run on a timer, not requestAnimationFrame, so a backgrounded tab keeps reporting its position */
/* v5_251 the position sender now ticks from a Worker: main-thread timers of a hidden tab are slowed to ~1 per second (or 1 per minute after a while), which made other players look frozen / stuck on everybody else's screen */
(function(){
  const sendPos=()=>{
    if(!NET.joined)return;
    netSend({t:'p',x:+P.x.toFixed(1),y:+P.y.toFixed(1),f:+P.face.toFixed(2),hp:Math.round(P.hp),
      fl:(P.dead>0?1:0)|(P.bfT>0?2:0)|(P.sh>0?4:0)|(document.hidden?16:0)});
  };
  let w=null;
  try{w=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},66)'],{type:'text/javascript'})));w.onmessage=sendPos}catch(e){w=null}
  if(!w)setInterval(sendPos,66);
  else setInterval(()=>{if(document.hidden)return;sendPos()},1000); /* spare: keeps reporting if the worker is ever suspended */
})();
setInterval(()=>netInfo(),2000);
setInterval(()=>{if(NET.joined)netSend({t:'pg',i:Date.now()%1000000000})},2000);

/* ---------- parties: invite / accept / decline / leave (server: party.go). Chat: /invite name, /accept, /decline, /leave ---------- */
const PARTY={m:[],ids:new Set(),key:'',lead:0};
/* party window preferences: hidden flag + dragged position (fractions of the screen), remembered per browser */
const PUI=(()=>{let o={};try{o=JSON.parse(localStorage.getItem('al_partyui')||'{}')||{}}catch(e){}return{hidden:!!o.hidden,x:typeof o.x==='number'?o.x:null,y:typeof o.y==='number'?o.y:null}})();
function partyUiSave(){try{localStorage.setItem('al_partyui',JSON.stringify(PUI))}catch(e){}}
function partyPlace(){
  const b=$('party');
  if(PUI.x===null){b.style.left=b.style.top='';return}
  const r=$('hud').getBoundingClientRect(),w=b.offsetWidth||180,h=b.offsetHeight||60;
  b.style.left=clamp(PUI.x*r.width,0,Math.max(0,r.width-w))+'px';b.style.top=clamp(PUI.y*r.height,0,Math.max(0,r.height-h))+'px';
}
function partyHide(v){PUI.hidden=v;partyUiSave();PARTY.key='';renderParty()}
(function(){ /* drag the window by its title; double-click the title to put it back */
  const b=$('party');let d=null;
  b.addEventListener('pointerdown',e=>{
    if((e.target.closest&&e.target.closest('button'))||e.button>0)return; /* drag from anywhere on the window except its buttons */
    const r=b.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};b.classList.add('drag');e.preventDefault()});
  window.addEventListener('pointermove',e=>{
    if(!d||e.pointerId!==d.id)return;
    const hr=$('hud').getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight;
    const x=clamp(e.clientX-d.dx-hr.left,0,Math.max(0,hr.width-w)),y=clamp(e.clientY-d.dy-hr.top,0,Math.max(0,hr.height-h));
    b.style.left=x+'px';b.style.top=y+'px';PUI.x=x/hr.width;PUI.y=y/hr.height});
  const end=e=>{if(!d||(e&&e.pointerId!==d.id))return;d=null;b.classList.remove('drag');partyUiSave()};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  b.addEventListener('dblclick',e=>{if(!(e.target.closest&&e.target.closest('button'))){PUI.x=PUI.y=null;partyUiSave();partyPlace()}});
  window.addEventListener('resize',partyPlace);
})();
$('bPty').addEventListener('click',()=>{
  if(PARTY.m.length<2){say('You are not in a party. Tap + next to a name in the Online list, or type /invite name.','#8d9aa2');return}
  partyHide(!PUI.hidden);
}); /* EXP-share rules (factor, level gap, no bosses) live on the server: see party.go */
const isLeader=()=>PARTY.m.length>1&&PARTY.lead===NET.id;
let pinvTimer=0;
function partySend(m,name){netSend(name===undefined?{t:'party',m:m}:{t:'party',m:m,name:name})}
function partyCmd(c,arg){
  if(!(NET.on&&NET.joined)){say('Parties need the multiplayer server.','#8d9aa2');return}
  if(c==='invite'){if(!arg){say('Usage: /invite playername  (or tap + next to a name in the Party list)','#8d9aa2');return}partySend('invite',arg)}
  else if(c==='accept'||c==='decline'||c==='leave'||c==='disband'){partySend(c);if(c==='accept'||c==='decline')pinvHide()}
  else if(c==='kick'||c==='leader'||c==='promote'){if(!arg){say('Usage: /'+c+' playername','#8d9aa2');return}partySend(c==='promote'?'leader':c,arg)}
  else if((c==='p'||c==='party')&&arg){if(!PARTY.m.length){say('You are not in a party.','#8d9aa2');return}netSend({t:'party',m:'chat',tx:arg})}
  else say('Party: /invite name \u00b7 /accept \u00b7 /decline \u00b7 /leave \u00b7 /p message (party chat)'+(isLeader()?' \u00b7 /kick name \u00b7 /leader name \u00b7 /disband':''),'#e3b559',9000);
}
function pinvHide(){if(pinvTimer){clearTimeout(pinvTimer);pinvTimer=0}$('pinv').hidden=true}
function pinvShow(name,secs){
  pinvHide();
  $('pinvT').innerHTML='<b></b> invited you to a party.';$('pinvT').firstChild.textContent=String(name);
  $('pinv').hidden=false;pinvTimer=setTimeout(pinvHide,(+secs||30)*1000);
  say(String(name)+' invited you to a party. Type /accept or /decline.','#e3b559',10000);
}
function setParty(list,lead){
  const was=PARTY.m.length>1;PARTY.lead=lead|0;
  PARTY.m=list.map(e=>({id:e[0]|0,n:String(e[1]),lv:e[2]|0,hp:+e[3]||0,mh:Math.max(1,e[4]|0),w:e[5]|0,dead:!!e[6]}));
  PARTY.ids=new Set(PARTY.m.map(x=>x.id));
  if(!was&&PARTY.m.length>1&&PUI.hidden){PUI.hidden=false;partyUiSave()} /* a new party shows the window again */
  if(was!==(PARTY.m.length>1)){if(PARTY.m.length<2&&CP.cur==='party')CP.cur='all';cpSched()}
  renderParty();NET.olKey='';
}
function renderParty(){
  const box=$('party'),inP=PARTY.m.length>1,btn=$('bPty'),bn=$('ptyN');
  btn.classList.toggle('on',inP&&!PUI.hidden);bn.style.display=inP?'':'none';if(inP)bn.textContent=PARTY.m.length;
  if(!inP||PUI.hidden){box.hidden=true;box.innerHTML='';PARTY.key='';return}
  const key=PARTY.m.map(x=>x.id+':'+x.n+':'+x.lv+':'+Math.round(x.hp/x.mh*50)+':'+x.w+':'+x.dead).join('|')+'@'+curWorld+'#'+PARTY.lead;
  if(key===PARTY.key)return;
  PARTY.key=key;box.hidden=false;box.innerHTML='';
  const h=document.createElement('h4'),t=document.createElement('span'),lv=document.createElement('button'),hd=document.createElement('button'),bt=document.createElement('span');
  t.className='phd';t.title='Drag the window to move it \u00b7 double-click to reset';t.textContent='Party \u00b7 '+PARTY.m.length+'/4';
  lv.type='button';lv.textContent='Leave';lv.title='Leave the party';lv.addEventListener('click',()=>partyCmd('leave'));
  hd.type='button';hd.textContent='\u2715';hd.title='Hide (use the Party button on the left to show it again)';hd.addEventListener('click',()=>partyHide(true));
  const ch=document.createElement('button');ch.type='button';ch.textContent='\u{1F4AC}';ch.title='Party chat';ch.addEventListener('click',()=>{if(cpOpen()&&CP.cur==='party')cpHide();else cpShow('party',!PHONE)});
  bt.className='pbt';bt.appendChild(ch);bt.appendChild(lv);bt.appendChild(hd);h.appendChild(t);h.appendChild(bt);box.appendChild(h);
  for(const x of PARTY.m){
    const me=x.id===NET.id,r=document.createElement('div'),a=document.createElement('div'),n=document.createElement('span'),l=document.createElement('span'),b=document.createElement('div'),f=document.createElement('i');
    r.className='pmr'+(me?' me':'')+(x.dead?' dead':'');
    n.textContent=(x.id===PARTY.lead?'\u2605 ':'')+x.n;l.textContent='Lv '+x.lv+(x.w!==curWorld&&W[x.w]?' \u00b7 W'+x.w:'');
    a.appendChild(n);a.appendChild(l);
    if(isLeader()&&!me){
      const k=document.createElement('span');k.className='pact';
      for(const [txt,tt,fn] of [['\u2605','Make '+x.n+' the leader',()=>partyCmd('leader',x.n)],['\u2715','Remove '+x.n+' from the party',()=>partyCmd('kick',x.n)]]){
        const bt=document.createElement('button');bt.type='button';bt.textContent=txt;bt.title=tt;bt.addEventListener('click',fn);k.appendChild(bt)}
      a.insertBefore(k,l);
    }b.className='pb';f.style.width=clamp(x.hp/x.mh,0,1)*100+'%';b.appendChild(f);
    r.appendChild(a);r.appendChild(b);box.appendChild(r);
  }
  partyPlace();
}
$('pinvY').addEventListener('click',()=>partyCmd('accept'));
$('pinvN').addEventListener('click',()=>partyCmd('decline'));
/* ---------- friends: requests that are saved on the server (friends.go). Chat: /friend name \u00b7 /friend accept [name] \u00b7 /friend decline [name] \u00b7 /unfriend name \u00b7 /friends ---------- */
const FR={f:[],inn:[],out:[],open:false,timer:0,key:'',pend:'',finvT:0};
function frSend(m,name){netSend(name===undefined||name===''?{t:'friend',m:m}:{t:'friend',m:m,name:name})}
const frIs=n=>FR.f.some(x=>x.n.toLowerCase()===String(n).toLowerCase());
function frCmd(c,arg){
  if(!(NET.on&&NET.joined)){say('Friends need the multiplayer server.','#8d9aa2');return}
  arg=(arg||'').trim();
  if(c==='friends'&&!arg){frToggle(true);return}
  const sub=arg.match(/^(add|accept|decline|deny|cancel|remove|delete|list)(?:\s+(.*))?$/i);
  if(c==='unfriend'){if(!arg){say('Usage: /unfriend playername','#8d9aa2');return}frSend('remove',arg);return}
  if(sub){
    const a=sub[1].toLowerCase(),n=(sub[2]||'').trim().replace(/^"(.*)"$/,'$1');
    if(a==='list'){frToggle(true);return}
    if(a==='add'){if(!n){say('Usage: /friend playername','#8d9aa2');return}frSend('add',n);return}
    frSend(a==='deny'?'decline':a==='delete'?'remove':a,n);if(a==='accept'||a==='decline'||a==='deny')finvHide();return}
  if(arg){frSend('add',arg.replace(/^"(.*)"$/,'$1'));return}
  say('Friends: /friend name (send a request) \u00b7 /friend accept [name] \u00b7 /friend decline [name] \u00b7 /unfriend name \u00b7 /friends (open the window)','#e3b559',9000);
}
function finvHide(){if(FR.finvT){clearTimeout(FR.finvT);FR.finvT=0}$('finv').hidden=true}
function finvShow(name){
  finvHide();FR.pend=String(name);
  $('finvT').innerHTML='<b></b> sent you a friend request.';$('finvT').firstChild.textContent=FR.pend;
  $('finv').hidden=false;FR.finvT=setTimeout(finvHide,25000);
}
$('finvY').addEventListener('click',()=>{frSend('accept',FR.pend);finvHide()});
$('finvN').addEventListener('click',()=>{frSend('decline',FR.pend);finvHide()});
function setFriends(m){
  FR.f=(m.f||[]).map(e=>({n:String(e[0]),on:!!e[1],lv:e[2]|0,w:e[3]|0}));
  FR.inn=(m.in||[]).map(String);FR.out=(m.o||[]).map(String);
  const bn=$('frN');bn.style.display=FR.inn.length?'':'none';bn.textContent=FR.inn.length;
  if(!FR.inn.some(n=>n===FR.pend))finvHide();
  NET.olKey='';renderFriends();
}
function frToggle(v){
  FR.open=v===undefined?!FR.open:!!v;$('bFr').classList.toggle('on',FR.open);
  if(FR.timer){clearInterval(FR.timer);FR.timer=0}
  if(FR.open){frSend('list');FR.timer=setInterval(()=>{if(NET.joined)frSend('list')},10000)}
  FR.key='';renderFriends();
}
/* drag any floating window by its heading (h4): converts the centred layout to left/top px and keeps it inside the screen */
function makeDrag(box,hs){
  box.addEventListener('pointerdown',e=>{
    const h=e.target.closest(hs);if(!h||e.target.closest('button,input')||(e.button||0)>0)return;
    const par=box.offsetParent||box.parentElement,pr=par.getBoundingClientRect(),br=box.getBoundingClientRect(),sx=(pr.width/par.offsetWidth)||1,ox=e.clientX-br.left,oy=e.clientY-br.top;
    box.style.transform='none';box.style.left=((br.left-pr.left)/sx)+'px';box.style.top=((br.top-pr.top)/sx)+'px';e.preventDefault();
    const mv=ev=>{let l=(ev.clientX-ox-pr.left)/sx,t=(ev.clientY-oy-pr.top)/sx;
      l=Math.max(0,Math.min(par.offsetWidth-box.offsetWidth,l));t=Math.max(0,Math.min(par.offsetHeight-box.offsetHeight,t));
      box.style.left=l+'px';box.style.top=t+'px'};
    const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up)};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  });
}
makeDrag($('frwin'),'h4');
/* inspect another player: click the "Player" tag on the target frame */
const PG={id:-1};
const PG_ORDER=['wpn','wpn2','robe','ear','neck','ring','brace','glove','belt','legs','boot'];
const pgStats=statArr;
/* another player's POWER: same formula as the Power on your own HUD (ATK*6 + DEF*4 + max HP*0.25), worked out from the gear and levels they share.
   Max HP is the value their own client reports. Temporary buffs are not counted. */
function peerStat(q,key){let v=0;for(const s of GEAR){const o=q.eq&&q.eq[s.k];if(o&&o.g>0){v+=o.st[key]||0;const a=s.st[key];if(a&&!FLAT_STATS[key])v+=forgeEff(o.lv)*a[1]}}return v}
const peerForgePct=(q,k)=>flatForgePct(k,s=>{const o=q.eq&&q.eq[s.k];return s.core?{g:o&&o.g>0?o.g:0,lv:s.core==='wlv'?q.wlv:q.alv}:(o||{g:0,lv:0})});
function peerPower(q){
  const ri=Math.floor((q.lvl-1)/10),cb=CLB[(q.sk>>>21)&7]||{};
  const atk=Math.round((10+q.lvl*3.5+peerStat(q,'atk'))*(1+peerForgePct(q,'atk'))*(1+ri*.12));
  const def=Math.round((q.lvl*3+peerStat(q,'def'))*(1+peerForgePct(q,'def'))*(1+ri*.04)*(cb.def||1));
  return Math.round(atk*6+def*4+q.mh*.25)}
function pgRender(){
  const box=$('pgear'),q=NET.peers.get(PG.id);
  if(PG.id<0||!q){box.hidden=true;box.innerHTML='';PG.id=-1;return}
  const keep=box.querySelector('.pgb'),scr=keep?keep.scrollTop:0;
  box.hidden=false;box.innerHTML='';
  const h=frEl('h4'),x=frBtn('\u2715','','Close',pgClose);x.className='';h.appendChild(frEl('span','',q.name));h.appendChild(x);box.appendChild(h);
  const cls=CLASSES[(q.sk>>>21)&7],pw=frEl('div','pgp'),sub=frEl('div','pgs');box.appendChild(pw);box.appendChild(sub);
  const body=frEl('div','pgb');box.appendChild(body);let n=0;
  const add=(o)=>{ /* o: {ic, slotLetter, name, lv, sub, stats[], col, cls} */
    const d=frEl('div','pgi'+(o.ic?'':' em')),s=frEl('div','bslot '+(o.ic?o.cls:'empty'));
    if(o.col)d.style.setProperty('--rc',o.col);
    if(o.ic)s.innerHTML=o.ic;else s.appendChild(frEl('span','sl',o.slotLetter));
    d.appendChild(s);
    const t=frEl('div','pgt'),nm=frEl('div','pgn'),a=frEl('span','',o.name);if(o.col)a.style.color=o.col;nm.appendChild(a);
    if(o.ic)nm.appendChild(frEl('span','pgl','+'+o.lv));t.appendChild(nm);
    t.appendChild(frEl('div','pgr',o.sub));
    if(o.stats&&o.stats.length){const ul=frEl('ul','pgst');for(const z of o.stats)ul.appendChild(frEl('li','',z));t.appendChild(ul)}
    d.appendChild(t);body.appendChild(d)};
  for(const k of PG_ORDER){
    const g=GEAR.find(z=>z.k===k),o=q.eq&&q.eq[k];
    if(o){n++;add({ic:ICONS[k](RAR[o.r].c),cls:RAR[o.r].cls||'rare',name:gearName(g,o),lv:o.lv,col:RAR[o.r].c,sub:RAR[o.r].n+' \u00b7 Grade '+o.g+' \u00b7 '+g.n,stats:pgStats(o.st,o.lv,g)})}
    else if(k==='wpn'&&q.wlv>0){n++;add({ic:ICONS.blade('#e3b559'),cls:'epic',name:'Primary Weapon (Blade)',lv:q.wlv,col:'#e3b559',sub:'Starting blade \u00b7 forge level +'+q.wlv,stats:corePctArr(GQ.wpn,forgeFrac(q.wlv))})}
    else if(k==='robe'&&q.alv>0){n++;add({ic:ICONS.robe('#e3b559'),cls:'epic',name:'Robe',lv:q.alv,col:'#e3b559',sub:'Starting robe \u00b7 forge level +'+q.alv,stats:corePctArr(GQ.robe,forgeFrac(q.alv))})}
    else add({slotLetter:g.ic,name:g.n,sub:'Empty'});
  }
  pw.textContent='\u26A1 Power '+peerPower(q).toLocaleString();
  sub.textContent='Lv. '+q.lvl+(cls?' \u00b7 '+cls.n:'')+' \u00b7 HP '+q.mh.toLocaleString()+' \u00b7 '+n+'/'+PG_ORDER.length+' equipped';
  body.scrollTop=scr;
}
window.addEventListener('resize',()=>{const b=$('pgear');if(b&&!b.hidden){b.style.left='';b.style.top='';b.style.transform=''}});
function pgClose(){PG.id=-1;pgRender()}
function pgOpen(t){if(!t||!t.isPl||!NET.peers.has(t.id))return;PG.id=t.id;pgRender()}
$('tgRank').addEventListener('click',e=>{e.stopPropagation();const t=P.target&&!P.target.dead?P.target:P.sel;if(t&&t.isPl)pgOpen(t);else if(t)mgOpen(t)});
$('tgRank').addEventListener('pointerdown',e=>e.stopPropagation());
makeDrag($('pgear'),'h4');
/* v5_91 monster stats window: click the "Common" / "Boss" tag on the target frame while a monster is selected */
var MG={m:null,key:""};
function mgOpen(m){MG.m=m;MG.key='';mgRender()}
function mgClose(){MG.m=null;MG.key='';const b=$('mgear');b.hidden=true;b.innerHTML=''}
function mgRender(){
  const b=$('mgear'),m=MG.m;
  if(!m||m.dead||m.isPl||!started||!mons.includes(m)){if(!b.hidden)mgClose();MG.m=null;return}
  const gap=monGap(m.lvl,P.lvl),hitDmg=Math.max(1,Math.round(m.atk*MON_ATK_MUL*(1-defRedAt(defVal(),m.lvl))*gap*(1-bdrVal()*(1-monDom(m.lvl))/100)*(1-(m.boss?bsdVal():mdrVal())*(1-monDom(m.lvl))/100))),hc=Math.round(hitChance(m)*100);
  const rows=[['Type',m.boss?'Boss':'Common'],['Level',m.lvl+(m.lvl>P.lvl?' (+'+(m.lvl-P.lvl)+' above you)':m.lvl<P.lvl?' ('+(P.lvl-m.lvl)+' below you)':'')],
    ['HP',Math.max(0,Math.ceil(m.hp)).toLocaleString()+' / '+m.maxhp.toLocaleString()],['ATK',Math.round(m.atk*MON_ATK_MUL).toLocaleString()],
    ['Hits you for','~'+hitDmg.toLocaleString()+' (x'+gap.toFixed(2)+' level gap)'],['DEF',effMonDef(m).toLocaleString()],['Your hit chance',hc+'%'],['EXP',m.exp.toLocaleString()]];
  const key=m.name+'|'+rows.map(r=>r[1]).join('|');
  if(key===MG.key&&!b.hidden)return;MG.key=key;b.hidden=false;b.innerHTML='';
  const h=frEl('h4'),x=frBtn('\u2715','','Close',mgClose);x.className='';h.appendChild(frEl('span','',m.name));h.appendChild(x);b.appendChild(h);
  for(const r of rows){const d=frEl('div','mr');d.appendChild(frEl('span','',r[0]));d.appendChild(frEl('span','',r[1]));b.appendChild(d)}
}
makeDrag($('mgear'),'h4');
/* action bar under the target frame when a PLAYER is selected (phone has no right click) */
let tgActKey='';
function tgActRender(t){
  const box=$('tgAct');
  if(!t){if(tgActKey){tgActKey='';box.classList.remove('on');box.innerHTML=''}return}
  const inP=PARTY.ids.has(t.id),isF=frIs(t.name),sent=FR.out.some(n=>n.toLowerCase()===t.name.toLowerCase());
  const key=[t.id,inP,isF,sent,PARTY.m.length,PVPLVL,inTown()].join('|');
  if(key===tgActKey)return;
  tgActKey=key;box.innerHTML='';box.classList.add('on');
  const mk=(txt,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=txt;b.addEventListener('click',e=>{e.stopPropagation();fn()});b.addEventListener('pointerdown',e=>e.stopPropagation());box.appendChild(b)};
  mk('\u{1F50D} Inspect','',()=>pgOpen(t));
  if(!inP)mk('\u2694 Attack','atk',()=>startPvp(t));
  if(!inP&&PARTY.m.length<4)mk('\uFF0B Party','',()=>partyCmd('invite',t.name));
  if(!isF&&!sent)mk('\u2665 Friend','',()=>frCmd('friend',t.name));
  mk('\u{1F4AC} Whisper','',()=>whisperTo(t.name));
  mk('\u2715','x',()=>{P.sel=null;P.target=null});
}
function frEl(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
function frBtn(txt,cls,tt,fn){const b=frEl('button','fb '+cls,txt);b.type='button';if(tt)b.title=tt;b.addEventListener('click',fn);return b}
function renderFriends(){
  const box=$('frwin');
  if(!FR.open){box.hidden=true;box.innerHTML='';FR.key='';return}
  const key=JSON.stringify([FR.f,FR.inn,FR.out,curWorld]);
  if(key===FR.key&&!box.hidden)return;
  let draft='',hadFocus=false;const old=box.querySelector('input');if(old){draft=old.value;hadFocus=document.activeElement===old}
  FR.key=key;box.hidden=false;box.innerHTML='';
  const h=frEl('h4'),t=frEl('span','',' Friends \u00b7 '+FR.f.length+'/50'),x=frBtn('\u2715','','Close',()=>frToggle(false));x.className='';
  h.appendChild(t);h.appendChild(x);box.appendChild(h);
  const add=frEl('div','fadd'),inp=document.createElement('input');inp.type='text';inp.maxLength=16;inp.placeholder='Player name';inp.value=draft;
  const go=frBtn('Add','','Send a friend request',()=>{const v=inp.value.trim();if(v){frSend('add',v);inp.value=''}});
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go.click();else if(e.key==='Escape')frToggle(false)});inp.addEventListener('keyup',e=>e.stopPropagation());
  add.appendChild(inp);add.appendChild(go);box.appendChild(add);
  const body=frEl('div','fbody');box.appendChild(body);
  if(FR.inn.length){
    body.appendChild(frEl('h5','','Requests for you'));
    for(const n of FR.inn){const r=frEl('div','fr');r.appendChild(frEl('span','nm',n));
      r.appendChild(frBtn('Accept','','Become friends with '+n,()=>frSend('accept',n)));r.appendChild(frBtn('\u2715','no sm','Decline',()=>frSend('decline',n)));body.appendChild(r)}
  }
  body.appendChild(frEl('h5','','Friends'));
  if(!FR.f.length)body.appendChild(frEl('div','fe','No friends yet. Type a name above, or tap the heart next to a name in the Online list.'));
  for(const f of FR.f){
    const r=frEl('div','fr '+(f.on?'on':'off'));r.appendChild(frEl('i'));r.appendChild(frEl('span','nm',f.n));
    r.appendChild(frEl('span','sub',f.on?'Lv '+f.lv+(f.w!==curWorld&&W[f.w]?' \u00b7 W'+f.w:''):'offline'));
    r.appendChild(frBtn('\u{1F4AC}','sm','Whisper '+f.n+(f.on?'':' (they get it when they log in)'),()=>whisperTo(f.n)));
    if(f.on&&PARTY.m.length<4&&!PARTY.m.some(x=>x.n===f.n))r.appendChild(frBtn('+','sm','Invite '+f.n+' to your party',()=>partyCmd('invite',f.n)));
    r.appendChild(frBtn('\u2715','no sm','Remove '+f.n+' from your friends',()=>{if(confirm('Remove '+f.n+' from your friends?'))frSend('remove',f.n)}));
    body.appendChild(r);
  }
  if(FR.out.length){
    body.appendChild(frEl('h5','','Requests you sent'));
    for(const n of FR.out){const r=frEl('div','fr');r.appendChild(frEl('span','nm',n));r.appendChild(frEl('span','sub','waiting'));
      r.appendChild(frBtn('Cancel','no sm','Take the request back',()=>frSend('cancel',n)));body.appendChild(r)}
  }
  if(hadFocus)inp.focus();
}
$('bFr').addEventListener('click',()=>{if(!(NET.on&&NET.joined)){say('Friends need the multiplayer server.','#8d9aa2');return}frToggle()});
function monAt(i){const m=mons[i];return m&&m.id===i?m:null}
function netMsg(m){
  switch(m.t){
    case 'kick':{
      /* signed out because the account logged in elsewhere: SAVE FIRST (browser + account), only then drop the session */
      try{if(started&&AUTH.ok)save()}catch(e){}
      try{cloudFlush(true)}catch(e){}try{pmSaveNow()}catch(e){}
      AUTH.ok=false;NET.giveUp=true;if(cloudT){clearTimeout(cloudT);cloudT=0}cloudStr=null;
      authForget();
      try{if(NET.ws)NET.ws.close()}catch(e){}
      setTimeout(()=>{alert(String(m.m||'This account was logged in somewhere else.'));location.reload()},50);break}
    case 'auth':logout();break;
    case 'flush':saveNow();break; /* the server asks us to save right now because this account is logging in on another device */
    case 'pg':NET.ping=(Date.now()%1000000000-(m.i|0)+1000000000)%1000000000;break;
    case 'hello':
      NET.id=m.id;NET.online=m.n|0;time=+m.tm||0;
      if(started&&!NET.joined)netJoin();
      setNetStatus();break;
    case 'on':
      NET.online=m.n|0;NET.counts=m.c||[];
      if(MP&&Math.abs(time-m.tm)>3)time=m.tm;
      setNetStatus();break;
    case 'world':{
      const entering=NET.pendingEnter===m.w;NET.pendingEnter=-1;
      NET.peers.clear();
      for(const i of (m.ps||[]))if(i.id!==NET.id)NET.peers.set(i.id,mkPeer(i));
      MP=true;
      if(entering)arriveWorld(m.w,m.mons);else buildWorld(m.w,m.mons);
      for(const e of (m.ores||[]))if(ores[e[0]])ores[e[0]].cd=e[1];
      if(!entering)say('Joined the shared world of '+W[m.w].n+' \u00b7 '+(NET.peers.size+1)+' here.',W[m.w].acc);
      break}
    case 's':onSnap(m);break;
    case 'wl':{if(!MP)break;for(const i of (m.ps||[]))if(i&&i.id!==NET.id&&!NET.peers.has(i.id))NET.peers.set(i.id,mkPeer(i));break}
    case 'h':{
      const o=monAt(m.i);if(!o||o.dead)break;
      o.flash=.1;spark(o.x,o.y,m.c?'#ffd36b':'#ffd9a0',m.c?8:4,150,.3,2.4);
      pop(o.x,o.y-o.r-8,String(m.d)+(m.c?'!':''),'#c8d6e5',m.c?15:12);break}
    case 'd':{const o=monAt(m.i);if(o&&!o.dead)killMonster(o,true);break}
    case 'k':{const o=monAt(m.i);if(o)rewardKill(o,m.l===0);break}  /* l:0 = you hit this boss but someone else landed the last hit */
    case 'bs':{ /* boss wave: [id,x,y,bossIdx,maxHp,def,radius,hp,dead,level] */
      if(!MP)break;const out=[];
      for(const e of (m.b||[])){
        const b=BOSSES[e[3]];if(!b||!mons[e[0]])continue;
        const o=monsterAt(e[1],e[2],b,e[9]);
        o.id=e[0];o.maxhp=e[4];o.hp=e[7];o.def=e[5];o.r=e[6];o.tx=o.x;o.ty=o.y;
        mons[e[0]]=o;out.push(o);
      }
      announceBosses(out);break}
    case 'bx':{const o=monAt(m.i);if(o&&!o.dead){o.dead=true;o.dieT=0;o.respawn=1e9;o.pend=false;if(P.target===o)P.target=null;say(o.name+' (Lv '+o.lvl+') has vanished.','#8d9aa2')}break}
    case 'hurt':if(MP&&P.dead<=0){const o=monAt(m.i);if(o)o.atkT=.25;hurtPlayer(Math.max(1,m.d|0),false,o?o.lvl:P.lvl,o);retaliate(o)}break;
    case 'o':if(ores[m.i])ores[m.i].cd=+m.cd||30;break;
    case 'pj':{const i=m.p;if(i&&i.id!==NET.id&&MP){NET.peers.set(i.id,mkPeer(i));say(String(i.n)+' entered the world.','#5fd3a5')}break}
    case 'pl':{const q=NET.peers.get(m.id);if(q){NET.peers.delete(m.id);say(q.name+' left.','#8d9aa2');if(PG.id===m.id)pgClose()}break}
    case 'pi':{const i=m.p,q=i&&NET.peers.get(i.id);if(q){q.sk=i.sk|0;q.lvl=clamp(i.lv|0,1,MAXLV);q.wlv=i.wl|0;q.alv=i.al|0;q.mh=Math.max(1,i.mh|0);{const pk=petKeyClean(i.pt);if(pk!==q.pet){q.pet=pk;q.pf=null}}if(i.eq!==undefined){q.eq=eqClean(i.eq);if(PG.id===q.id)pgRender()}}break}
    case 'fx':if(MP)playFx(m);break;
    case 'pvp':break; /* v5_158 the 30 s flag is gone (PvP modes) */
    case 'pvpno':say(String(m.r||'PvP not allowed here.'),'#8d9aa2');break;
    case 'pvpw':break;
    case 'pbf':if(MP&&P.dead<=0){ /* v5_159 shared party heal / ATK buff from a nearby party mate (server clamps the values) */
      const a=NET.peers.get(m.i|0),v=+m.v||0,who=a?a.name:'Ally';
      if(m.k==='heal'&&v>0){const h=Math.min(maxHp()-P.hp,Math.round(maxHp()*Math.min(.08,v)));if(h>0){P.hp+=h;pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);say(who+' healed you for '+h+'.','#5fd3a5')}}
      else if(m.k==='atk'&&v>0){P.bf=Math.max(P.bfT>0?P.bf:0,Math.min(.15,v));P.bfT=Math.max(P.bfT,8);pop(P.x,P.y-34,'ATK +'+Math.round(Math.min(.15,v)*100)+'%','#ffd36b',14);say(who+' boosted your attack.','#ffd36b')}
    }break;
    case 'phurt':if(MP&&P.dead<=0){
      const a=NET.peers.get(m.i|0);if(a){a.swing=.2}
      let pd=Math.max(1,m.d|0);
      if(P.cls===2&&a&&dist(a.x,a.y,P.x,P.y)<=IG_GUARD_R)pd=Math.max(1,Math.round(pd*(1-IG_GUARD*(1-pvpDom(a.lv))))); /* v5_87 Iron Guardian: melee-range guard */
      hurtPlayer(pd,true,(a&&a.lv)||P.lvl,null,!!m.c);
      if(a&&(!P.target||P.target.dead)&&!inTown()&&P.tp<=0)P.target=a; /* fight back: auto-target whoever hit you */
    }break;
    case 'pdm':{const q=NET.peers.get(m.v|0);if(q){const c=m.c;q.hp=Math.max(0,q.hp-(m.d|0));pop(q.x,q.y-q.r-30,String(m.d|0)+(c?'!':''),c?'#ffd36b':'#ff9a8a',c?17:13)}break}
    case 'ph':{const q=NET.peers.get(m.v|0);if(q){q.hurt=.2;spark(q.x,q.y,'#ffb0a0',5,150,.3,2.4);pop(q.x,q.y-q.r-30,String(m.d|0)+(m.c?'!':''),'#c8d6e5',m.c?15:12)}break}
    case 'pk':{
      P.pvpKills++;
      if(m.b){const g=Math.max(1,(m.lv|0))*PVP_BOUNTY;P.coins+=g;lootIcon('c','&#9679;',g,'#e3b559');pop(P.x,P.y-30,'+'+g,'#e3b559',13);bagLog('+'+g.toLocaleString()+' coins (PvP bounty)','#e3b559');save()}
      say('You defeated '+String(m.n)+(m.b?'.':' (no bounty: killed again too soon).')+' PvP kills: '+(m.k||P.pvpKills),'#ff9a8a',8000);
      if(P.target&&P.target.isPl)P.target=null;break}
    case 'pkf':say(String(m.k)+' defeated '+String(m.v)+' in PvP'+(m.n>1?' (kill #'+m.n+')':'')+'.','#ff8a7a',8000);break;
    case 'sys':say(String(m.m),'#e3b559',12000);break;
    case 'pm':{const out=m.d==='to',nm=String(m.n);
      if(!out)PM_LAST=nm;
      {const Q=out?P:NET.peers.get(m.id);if(Q)setBubble(Q,String(m.m),out?'#d9b8ff':'#ff9ee8',true)}
      if(!out){const k=pcKey(nm),showing=cpOpen()&&CP.cur==='pm:'+k;if(!showing)feed('[Whisper] '+nm+': '+String(m.m),'#ff9ee8',12000)}
      pcAdd(nm,String(m.m),out,m.id,{off:!!m.off,ts:m.ts|0});break}
    case 'party':setParty(m.m||[],m.l);break;
    case 'kp':{const o=monAt(m.i);if(o){const x=Math.max(1,Math.round(o.exp*Math.max(.1,Math.min(1,1-(P.lvl-o.lvl)*.04))*clamp(+m.f||0,0,1)));gainExp(x);feed('Party share: +'+x+' EXP ('+o.name+')','#8ff0b0')}break}
    case 'pchat':{
      const mine=m.id===NET.id,nm=String(m.n),txt=String(m.m),q=mine?P:NET.peers.get(m.id),pm=PARTY.m.find(x=>x.id===m.id),wi=CP.who.get(nm.toLowerCase());
      const sk=mine?SKIN:q?q.sk:wi?wi.sk:0,lv=mine?P.lvl:pm?pm.lv:q?q.lvl:0;
      if(!mine&&q)CP.who.set(nm.toLowerCase(),{sk:sk,lv:lv});
      const showing=cpOpen()&&(CP.cur==='party'||CP.cur==='all');
      if(!showing)feed('[Party] '+nm+': '+txt,'#8ff0b0',16000);
      cpPush({k:'pty',n:nm,m:txt,me:mine,sk:sk,lv:lv});
      if(q)setBubble(q,txt,'#8ff0b0',false);break}
    case 'pinv':pinvShow(m.n,m.s);break;
    case 'fl':setFriends(m);break;
    case 'freq':finvShow(m.n);break;
    case 'cmd':runCmd(String(m.m));break;
    case 'chat':{
      const mine=m.id===NET.id,wt=(MP&&m.w!==curWorld)?(W[m.w]?W[m.w].n:'?'):'',tag=wt?' ['+wt+']':'';
      const nm=String(m.n),txt=String(m.m),q=mine?P:NET.peers.get(m.id);
      let info=CP.who.get(nm.toLowerCase());
      if(mine)info={sk:SKIN,lv:P.lvl};else if(q)info={sk:q.sk,lv:q.lvl};
      if(info)CP.who.set(nm.toLowerCase(),info);
      feed(nm+tag+': '+txt,mine?'#e8e0ca':'#bfe3ff',16000);
      cpPush({k:'chat',n:nm,m:txt,me:mine,sk:info?info.sk:0,lv:info?info.lv:0,wt:wt});
      if(q)setBubble(q,txt,mine?'#e3b559':'#bfe3ff',false);break}
  }
}
function onSnap(m){
  if(!MP)return;
  const L=m.m||NONE;
  for(let k=0;k<L.length;k++){
    const e=L[k],o=mons[e[0]];
    if(!o||o.id!==e[0])continue;
    if(o.dead){o.dead=false;o.pend=false;o.dieT=0;o.x=e[1];o.y=e[2];o.lx=undefined} /* respawned */
    o.tx=e[1];o.ty=e[2];
    if(!(o.predT>0&&e[3]>o.hp))o.hp=e[3];
    o.hpAuth=e[3]; /* v5_315 the server's own health value (o.hp also holds the predicted one) */
    if(e[3]>0)o.pend=false;
    const st=e[4]&3;o.state=st===1?'chase':st===2?'return':'idle';
    if((e[4]&8)&&!(o.atkT>0))o.atkT=.25;
    o.wx=(Math.abs(o.tx-o.x)>.4||Math.abs(o.ty-o.y)>.4)?1:0;
  }
  let unk=false;const snow=performance.now();
  for(const e of (m.p||NONE)){
    const q=NET.peers.get(e[0]);if(!q){unk=true;continue}
    q.seen=snow;
    q.tx=e[1];q.ty=e[2];q.face=e[3];q.hp=e[4];peerSample(q,e[1],e[2]);
    const f=e[5];q.dead=(f&1)?1.5:0;q.bfT=(f&2)?1:0;q.sh=(f&4)?1:0;q.pm=(f>>5)&3;q.pvp=q.pm>=2; /* v5_158 bits 5-6 = PvP mode; red name + swords for Hostile / Carnal */
  }
  /* v5_251 a player the server reports but I do not have (a missed 'joined' message) -> ask for the list; a player I have but the server no longer reports for 4 s is a ghost -> remove */
  if(unk&&snow-(NET.whoT||0)>2500){NET.whoT=snow;netSend({t:'who'})}
  for(const [id,q] of NET.peers){if(snow-(q.seen||snow)>4000){NET.peers.delete(id);if(PG.id===id)pgClose()}}
  if(m.dd)for(const id of m.dd){const o=monAt(id);if(o&&!o.dead)killMonster(o,true)}
  if(m.tm!==undefined)time+=(m.tm-time)*.2;
}
/* other players: positions arrive ~15x/s with network jitter. They are buffered and shown PEER_DELAY seconds late, interpolated linearly
   between the two samples around that moment, so they glide at their real speed instead of chasing the latest packet. */
const PEER_DELAY=.2; /* v5_166 was .12 (< 2 updates): any late packet ran the buffer dry and the player froze, then jumped */
/* v5_163 remote players: (1) a dash / teleport skill (one update that jumps > PEER_BLINK units) now draws a trail + rings at both ends, so it reads as a skill and not as a glitch;
   (2) after a lag spike (> .25 s without an update) the player no longer freezes and then zips: the catch-up slide lasts as long as running that distance really takes (PEER_RUN units/s),
   and only a huge jump (respawn, Home Scroll, world change: > PEER_SNAP) snaps. A standing player that starts moving (first step is short) still does not slide from the old spot. */
const PEER_BLINK=110,PEER_SNAP=900,PEER_RUN=450,PEER_STILL=70;
function peerBlinkFx(ox,oy,nx,ny){
  const d=Math.hypot(nx-ox,ny-oy),col='#c7b8ff';
  if(d<=700)for(let j=0;j<=10;j++)spark(ox+(nx-ox)*j/10,oy+(ny-oy)*j/10,col,2,60,.4,2.4);
  ring(ox,oy,36,col);ring(nx,ny,50,col,'whirl');spark(nx,ny,col,10,200,.4,2.6);
}
function peerSample(q,x,y){
  const t=performance.now()/1000,b=q.buf||(q.buf=[]),l=b[b.length-1];let tt=t;
  if(l&&l.x===x&&l.y===y)return;                                  /* repeated position: keep the longer segment, no stutter */
  if(l){
    const d=Math.hypot(x-l.x,y-l.y),gap=t-l.t;
    if(gap<=.25){ /* regular update */
      tt=Math.min(Math.max(t,l.t+.045),l.t+.09);if(Math.abs(tt-t)>.15)tt=t; /* v5_166 even out arrival jitter: stamps stay 45-90 ms apart (updates are really 66 ms apart) */
      if(d>PEER_BLINK){peerBlinkFx(l.x,l.y,x,y);if(d>400){b.length=0;q.x=x;q.y=y}} /* dash / teleport skill */
    }else if(d>PEER_SNAP){peerBlinkFx(l.x,l.y,x,y);b.length=0;q.x=x;q.y=y}  /* respawn / Home Scroll / world change */
    else if(d>=PEER_STILL){b.push({t:Math.max(l.t+.02,t-Math.min(.6,Math.max(.066,d/PEER_RUN))),x:l.x,y:l.y})} /* lag catch-up: slide at running speed instead of a freeze + zip */
    else b.push({t:t-.066,x:l.x,y:l.y});                            /* was standing still: do not slide during the pause */
  }
  b.push({t:tt,x,y});if(b.length>16)b.shift();
}
function updatePeers(dt){
  const k=Math.min(1,dt*12),rt=performance.now()/1000-PEER_DELAY;
  for(const q of NET.peers.values()){
    if(!(isFinite(q.x)&&isFinite(q.y))){q.x=q.tx;q.y=q.ty;q.buf=[]}
    const ox=q.x,oy=q.y,b=q.buf;
    if(b&&b.length){
      while(b.length>2&&b[1].t<=rt)b.shift();
      const a=b[0],c=b[1];let tx,ty;
      if(!c||rt>=(c.t)){const l=b[b.length-1];tx=l.x;ty=l.y}
      else if(rt<=a.t){tx=a.x;ty=a.y}
      else{const f=(rt-a.t)/(c.t-a.t);tx=a.x+(c.x-a.x)*f;ty=a.y+(c.y-a.y)*f}
      const dd=Math.hypot(tx-q.x,ty-q.y); /* v5_166 ease the last few units so small timing hiccups do not show; real dashes / teleports (> 150) still go straight there */
      if(dd>150)(q.x=tx,q.y=ty);else{const e=1-Math.exp(-dt*30);q.x+=(tx-q.x)*e;q.y+=(ty-q.y)*e}
    }else{const dx=q.tx-q.x,dy=q.ty-q.y;
      if(dx*dx+dy*dy>160000){q.x=q.tx;q.y=q.ty}else{q.x+=dx*k;q.y+=dy*k}}
    const mvd=Math.hypot(q.x-ox,q.y-oy);
    q.mvAmt+=((mvd>.05?1:0)-q.mvAmt)*Math.min(1,dt*10);q.anim+=mvd*.07;
    if(q.dg){const u=(performance.now()/1000-q.dgS)/DASH_T;if(u>=1||q.dead)q.dg=0;else q.dgU=u}   /* v5_304 another player's dodge animation */
    q.swing-=dt;q.hurt-=dt;
    {if(q.jzAt&&performance.now()/1000-q.jzAt>5)q.jzT=0;q.jz=(q.jz||0)+((q.jzT||0)-(q.jz||0))*Math.min(1,dt*18)} /* v5_170 their height, from 'jz' messages */
    if(Math.cos(q.face)>.1)q.dir=1;else if(Math.cos(q.face)<-.1)q.dir=-1;
  }
}
function updateMonstersMP(dt){
  const k=Math.min(1,dt*12);
  for(const m of mons){
    if(m.flash>0)m.flash-=dt;
    if(m.predT>0)m.predT-=dt;
    if(m.dead){m.dieT=Math.max(0,(m.dieT||0)-dt);continue}
    m.atkT=Math.max(0,(m.atkT||0)-dt);
    if(m.tx!==undefined){const dx=m.tx-m.x,dy=m.ty-m.y;if(dx*dx+dy*dy>90000){m.x=m.tx;m.y=m.ty}else{m.x+=dx*k;m.y+=dy*k}}
  }
}
/* other players' skill effects: purely visual, they never deal damage here (their own client reports that to the server) */
function playFx(m){
  const q=NET.peers.get(m.id),col=/^#[0-9a-f]{6}$/i.test(m.c)?m.c:'#cfe8ff',x=+m.x||0,y=+m.y||0;
  switch(m.k){
    case 'pr':{
      const an=Array.isArray(m.a)?m.a.slice(0,9):[];
      for(const g of an)if(typeof g==='number')projs.push({x,y,vx:Math.cos(g)*520,vy:Math.sin(g)*520,life:.7,l0:.7,dmg:0,hit:new Set(),ang:g,col,cos:true});
      if(q&&typeof an[0]==='number'){q.face=an[0];q.swing=.2}
      break}
    case 'ri':ring(x,y,clamp(+m.r||100,20,400),col,m.q==='whirl'?'whirl':0);if(m.s)spark(x,y,col,18,240,.5,2.6);break;
    case 'mt':{const r=clamp(+m.r||110,20,400);ring(x,y,r,col);ring(x,y,r*.6,col);delayed.push({t:.7,f:()=>{ring(x,y,r,col,'whirl');spark(x,y,col,30,300,.7,3.2)}});break}
    case 'ch':{
      const p=Array.isArray(m.p)?m.p.slice(0,40):[];
      for(let i=0;i+3<p.length;i+=4){
        for(let k=0;k<7;k++)spark(p[i]+(p[i+2]-p[i])*k/7,p[i+1]+(p[i+3]-p[i+1])*k/7,col,1,40,.35,2.4);
        ring(p[i+2],p[i+3],40,col);
      }
      break}
    case 'sw':if(q){q.swing=.18;q.skT='';q.face=+m.f||0}break;
    case 'an':if(q){q.skT=String(m.s||'').slice(0,14);q.skTi=(q.skTi|0)+1;q.swing=.2;if(dist(q.x,q.y,P.x,P.y)<1600)skfxCast({t:q.skT,cls:(q.sk>>>21)&7,x:q.x,y:q.y,face:q.face,r:150,col:col})}break;   /* v5_322 another player's skill: its move (anim3d.js) */
    case 'em':if(q){q.emo={n:String(m.e||'').slice(0,12)||null,id:(q.emo?q.emo.id:0)+1}}break;   /* v5_322 another player's emote (/dance ...) */
    case 'ac':if(q){q.act={n:String(m.e||'').slice(0,12),id:(q.act?q.act.id:0)+1}}break;   /* v5_322 another player's one-shot move (drinking ...) */
    case 'dg':if(q){q.dg=clamp(m.d|0,1,3);q.dgS=performance.now()/1000;q.dgU=0;q.face=+m.f||0}break; /* v5_304 dodge: 1 forward roll, 2 side roll, 3 back dive */
    case 'jz':if(q){q.jzT=clamp(+m.z||0,0,400);q.jzAt=performance.now()/1000}break; /* v5_170 another player's height above the ground (jumping / standing on a structure) */
    case 'sp':{ /* v5_165 another player's spirits (visual only) */
      if(!q)break;const a=Array.isArray(m.a)?m.a:[],list=[];
      for(let kd=1;kd<=4;kd++){const n=clamp(a[kd-1]|0,0,6);for(let j=0;j<n;j++)list.push({k:kd,col,fz:m.f?1:0})}
      q.spx=list.length?{e:performance.now()/1000+clamp(+m.t||0,0,20),list}:null;break}
  }
}
/* v5_248 the Here / Online window can be dragged by its title bar (position remembered) and collapsed to just the title bar */
const OLUI=(()=>{let o={};try{o=JSON.parse(localStorage.getItem('al_onlineui')||'{}')||{}}catch(e){}return{c:!!o.c,x:typeof o.x==='number'?o.x:null,y:typeof o.y==='number'?o.y:null}})();
function onlUiSave(){try{localStorage.setItem('al_onlineui',JSON.stringify(OLUI))}catch(e){}}
function onlPlace(){
  const b=$('online');
  b.classList.toggle('olc',OLUI.c);
  if(OLUI.x===null){b.style.left=b.style.top=b.style.right=b.style.maxHeight='';return}
  const r=$('hud').getBoundingClientRect(),w=b.offsetWidth||170,h=b.offsetHeight||60;
  const x=clamp(OLUI.x*r.width,0,Math.max(0,r.width-w)),y=clamp(OLUI.y*r.height,0,Math.max(0,r.height-h));
  b.style.right='auto';b.style.left=x+'px';b.style.top=y+'px';b.style.maxHeight=Math.max(56,r.height-y-8)+'px';
}
(function(){
  const b=$('online');let d=null;
  b.addEventListener('pointerdown',e=>{
    const h=e.target.closest&&e.target.closest('h4');
    if(!h||e.target.closest('button')||e.button>0)return;
    const r=b.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};b.classList.add('drag');e.preventDefault()});
  window.addEventListener('pointermove',e=>{
    if(!d||e.pointerId!==d.id)return;
    const hr=$('hud').getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight;
    OLUI.x=clamp(e.clientX-d.dx-hr.left,0,Math.max(0,hr.width-w))/hr.width;OLUI.y=clamp(e.clientY-d.dy-hr.top,0,Math.max(0,hr.height-h))/hr.height;onlPlace()});
  const end=e=>{if(!d||(e&&e.pointerId!==d.id))return;d=null;b.classList.remove('drag');onlUiSave()};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  b.addEventListener('dblclick',e=>{if(e.target.closest&&e.target.closest('h4')&&!e.target.closest('button')){OLUI.x=OLUI.y=null;onlUiSave();onlPlace()}});
  window.addEventListener('resize',onlPlace);
})();
function renderOnline(){
  const box=$('online');
  if(!MP){if(!box.hidden){box.hidden=true;NET.olKey=''}return}
  /* v5_247: nearest player first (order refreshed at most every 1.5 s so rows do not jump under a tap); every player is listed, the list scrolls */
  const list=[...NET.peers.values()],now=performance.now();
  if(!NET.olOrd||now-NET.olOrdT>1500){list.sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y));NET.olOrd=list.map(q=>q.id);NET.olOrdT=now}
  else{const ix=new Map(NET.olOrd.map((id,i)=>[id,i]));list.sort((a,b)=>(ix.has(a.id)?ix.get(a.id):1e9)-(ix.has(b.id)?ix.get(b.id):1e9))}
  const key=list.length+':'+NET.online+':'+PARTY.m.length+':'+FR.f.length+':'+FR.out.length+':'+list.map(q=>q.id+q.name+q.lvl+(q.pvp?'!':'')+(PARTY.ids.has(q.id)?'p':'')).join('|');
  if(key===NET.olKey)return;
  const oldL=box.querySelector('.olist'),st=oldL?oldL.scrollTop:0;
  NET.olKey=key;box.hidden=false;box.innerHTML='';
  const h=document.createElement('h4'),ht=document.createElement('span'),hx=document.createElement('button');ht.textContent='Here \u00b7 '+(list.length+1)+'  \u00b7  Online \u00b7 '+NET.online;h.appendChild(ht);
  const hc=document.createElement('button');hc.type='button';hc.className='wx2';hc.textContent=OLUI.c?'+':'\u2013';hc.title=OLUI.c?'Expand the list':'Collapse the list';hc.setAttribute('aria-label',hc.title);
  hc.addEventListener('click',e=>{e.stopPropagation();OLUI.c=!OLUI.c;onlUiSave();NET.olKey='';renderOnline()});
  const hb=document.createElement('span');hb.className='ohb';hb.appendChild(hc);
  hx.type='button';hx.className='wx2';hx.textContent='\u2715';hx.title='Close';hx.setAttribute('aria-label','Close');hx.addEventListener('click',e=>{e.stopPropagation();if(ONL_OPEN)$('bParty').click()});hb.appendChild(hx);h.appendChild(hb);box.appendChild(h);
  onlPlace();
  const ol=document.createElement('div');ol.className='olist';box.appendChild(ol);
  for(const q of list){
    const r=document.createElement('div');const inP=PARTY.ids.has(q.id);r.className='pn'+(q.pvp?' pvp':'')+(inP?' pty':'');r.title='Tap to whisper';r.addEventListener('click',()=>whisperTo(q.name));
    const a=document.createElement('span'),b=document.createElement('span');a.textContent=(q.pvp?'\u2694 ':'')+q.name;b.textContent='Lv '+q.lvl;r.appendChild(a);r.appendChild(b);
    if(frIs(q.name))r.classList.add('fr');
    else{const hv=document.createElement('span');hv.className='fadd2';hv.textContent='\u2665';hv.title=FR.out.some(n=>n.toLowerCase()===q.name.toLowerCase())?'Friend request already sent to '+q.name:'Send '+q.name+' a friend request';hv.addEventListener('click',e=>{e.stopPropagation();frCmd('friend',q.name)});r.appendChild(hv)}
    if(!inP&&PARTY.m.length<4){const v=document.createElement('span');v.className='inv';v.textContent='+';v.title='Invite '+q.name+' to your party';v.addEventListener('click',e=>{e.stopPropagation();partyCmd('invite',q.name)});r.appendChild(v)}
    ol.appendChild(r);
  }
  ol.scrollTop=st;
}
