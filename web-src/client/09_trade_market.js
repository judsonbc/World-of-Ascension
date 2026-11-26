/* v5_364 TRADING (server: trade.go).
   Tradable: spare gear in the bag, coins, ore, pet eggs, pets. Not tradable: equipped gear, potions, the warehouse, premium gold, anything flagged bound (it.bd).
   The server never opens the character save, so the things that are "in flight" sit in the server's escrow and arrive through the DELIVERY BOX:
   boxApply() adds what the box holds to the character, saves, and only then tells the server what it took ("ack"), so nothing is lost if the page closes in between. */
const TRS={peer:'',a:null,b:null,ra:false,rb:false,ph:0,stage:0,pick:false,inv:'',invTimer:0};
const trNew=()=>({u:[],c:0,o:0,e:0,pt:{}});
const MK={lastAck:null,ackN:0,ackWait:false,ackT:0,seen:new Set(),tab:'b',list:[],t0:0,q:'',rar:'',sort:'new',pend:null,sellU:null,price:'',hrs:24,box:null,claiming:false,warned:0};
const trFmt=n=>(+n||0).toLocaleString();
const trQ=(u)=>bagArr().find(x=>x.u===u);
const trOut=it=>({slot:it.slot,g:it.g,r:it.r,st:it.st});
function trSan(o){ /* an item that came from another player / the server: rebuilt field by field, exactly like a save is loaded */
  if(!o||typeof o!=='object')return null;const q=GEAR.find(z=>z.k===o.slot);if(!q)return null;
  const it={slot:q.k,g:clamp(o.g|0,1,NW),r:clamp(o.r|0,0,RAR.length-1),st:{}};
  if(o.st&&typeof o.st==='object')for(const k in o.st)if(k in STATBASE||k in SPECIAL){const v=+o.st[k];if(v>=0&&v<1e6)it.st[k]=r2(v)}
  addQrg(it,q);it.col=RAR[it.r].c;return it}
const trName=it=>{const q=GEAR.find(z=>z.k===it.slot);return gearName(q,it)};
function trItemRow(it,right){
  const d=document.createElement('div');d.className='trit';
  const a=document.createElement('div');a.className='trin';const b=document.createElement('b');b.textContent=trName(it)+' (G'+it.g+')';b.style.color=it.col;
  const s=document.createElement('small');s.textContent=statTxt(it.st,0,null);a.appendChild(b);a.appendChild(s);d.appendChild(a);if(right)d.appendChild(right);return d}
function trBtn(txt,fn,cls){const b=document.createElement('button');b.type='button';b.className='btn'+(cls?' '+cls:'');b.textContent=txt;b.addEventListener('click',e=>{e.stopPropagation();fn()});return b}
const trOnline=()=>NET.on&&NET.joined;
/* ---------------- the offer of this player ---------------- */
function trMine(){ /* the offer as it would be sent now; null when the character no longer owns something in it */
  const m=TRS.a,out={it:[],c:m.c|0,o:m.o|0,e:m.e|0,pt:{}};
  for(const u of m.u){const it=trQ(u);if(!it||it.bd)return null;out.it.push(trOut(it))}
  if(out.c>P.coins||out.o>P.ore||out.e>(P.eggs|0)||out.c<0||out.o<0||out.e<0)return null;
  for(const k in m.pt){const n=m.pt[k]|0;if(n<=0)continue;if(n>(petsObj()[k]||0))return null;out.pt[k]=n}
  return out}
function trSend(m,tr){netSend(tr===undefined?{t:'trade',m:m}:{t:'trade',m:m,tr:tr})}
function trSendOffer(){const o=trMine();if(!o){say('Something in your offer is no longer yours. Offer cleared.','#d9503f');TRS.a=trNew();TRS.ra=false;trSend('off',{o:{}});return}trSend('off',{o:o})}
function trTakeOut(o){ /* the offer leaves the character (it is now held by the server) */
  const A=bagArr();
  for(const u of TRS.a.u){const i=A.findIndex(x=>x.u===u);if(i>=0)A.splice(i,1)}
  P.coins-=o.c;P.ore-=o.o;P.eggs=(P.eggs|0)-o.e;
  for(const k in o.pt){const p=petParse(k);petTake(p.s,p.c,o.pt[k])}
  if(typeof nestRender==='function')try{nestRender()}catch(e){}
  if(!$('bag').hidden)try{renderBag()}catch(e){}}
function trOpenUi(){const m=$('trade');if(m)m.hidden=false;trRender()}
function trCloseUi(){const m=$('trade');if(m)m.hidden=true}
function tradeRequest(name){
  if(!trOnline()){say('Trading needs the multiplayer server.','#8d9aa2');return}
  name=String(name||'').trim();if(!name){say('Usage: /trade playername  (or tap a player and choose Trade)','#8d9aa2');return}
  netSend({t:'trade',m:'req',name:name})}
/* ---------------- messages from the server ---------------- */
function tradeNet(m){
  switch(m.m){
    case 'sent':say('Trade request sent to '+m.n+'.','#e3b559');break;
    case 'declined':say(m.n+' declined the trade.','#8d9aa2');break;
    case 'err':say(String(m.x||'Trade error'),'#d9503f',6000);break;
    case 'inv':trInvShow(String(m.n));break;
    case 'st':{
      TRS.peer=String(m.n);TRS.ra=!!m.ra;TRS.rb=!!m.rb;TRS.ph=m.ph|0;
      /* my side keeps its own uid list; only the amounts echoed by the server are used to check it is in sync */
      if(!TRS.a)TRS.a=trNew();
      const b=m.b||{};TRS.b={it:(b.it||[]).map(trSan).filter(Boolean),c:+b.c||0,o:+b.o||0,e:+b.e||0,pt:b.pt&&typeof b.pt==='object'?b.pt:{}};
      trInvHide();if($('trade').hidden){TRS.stage=0;TRS.pick=false}trOpenUi();break}
    case 'go':{
      const o=trMine();
      if(!o){say('Your offer changed, so the trade was cancelled.','#d9503f');trSend('can');return}
      trTakeOut(o);TRS.stage=1;save();trSend('put',{o:o});trRender();break}
    case 'done':say('Trade complete. Collecting your items...','#8ff0b0',6000);trFinish();break;
    case 'end':say('Trade ended: '+String(m.x||''),'#e3b559',6000);trFinish();break;
  }}
function trFinish(){TRS.a=null;TRS.b=null;TRS.stage=0;TRS.ph=0;TRS.ra=TRS.rb=false;trCloseUi();setTimeout(mktBoxPoll,250);setTimeout(mktBoxPoll,2500)}
function trInvShow(n){
  trInvHide();TRS.inv=n;const t=$('trInvT');t.innerHTML='<b></b> wants to trade with you.';t.firstChild.textContent=n;
  $('trInv').hidden=false;TRS.invTimer=setTimeout(trInvHide,30000);say(n+' wants to trade. Accept or decline at the top of the screen.','#e3b559',8000)}
function trInvHide(){clearTimeout(TRS.invTimer);TRS.inv='';const e=$('trInv');if(e)e.hidden=true}
/* ---------------- the trade window ---------------- */
function trAddPet(k,n){const have=petsObj()[k]||0,cur=TRS.a.pt[k]||0;n=Math.max(0,Math.min(n|0,have-cur));if(n<=0)return;TRS.a.pt[k]=cur+n;trSendOffer()}
function trAmtRow(lbl,key,max){
  const w=document.createElement('label');w.className='tram';w.appendChild(document.createTextNode(lbl+' '));
  const i=document.createElement('input');i.type='number';i.min=0;i.max=max;i.value=TRS.a[key]||0;i.disabled=TRS.stage>0||TRS.ra;
  i.addEventListener('change',()=>{TRS.a[key]=clamp(Math.floor(+i.value||0),0,max);trSendOffer()});w.appendChild(i);
  const s=document.createElement('small');s.textContent=' / '+trFmt(max);w.appendChild(s);return w}
function trSide(body,off,mine){
  const col=document.createElement('div');col.className='trcol'+(mine?' me':'');
  const h=document.createElement('h3');h.textContent=mine?'You offer':(TRS.peer||'?')+' offers';col.appendChild(h);
  const ok=mine?!(TRS.stage>0||TRS.ra):false;
  const items=mine?off.u.map(trQ).filter(Boolean):off.it;
  if(!items.length&&!off.c&&!off.o&&!off.e&&!Object.keys(off.pt).length){const e=document.createElement('div');e.className='trempty';e.textContent='Nothing yet';col.appendChild(e)}
  for(const it of items){const x=ok?trBtn('\u2715',()=>{TRS.a.u=TRS.a.u.filter(u=>u!==it.u);trSendOffer()},'sm'):null;col.appendChild(trItemRow(it,x))}
  const line=(t)=>{const d=document.createElement('div');d.className='trline';d.textContent=t;col.appendChild(d)};
  if(!mine){if(off.c)line('Coins: '+trFmt(off.c));if(off.o)line('Ore: '+trFmt(off.o));if(off.e)line('Pet Eggs: '+trFmt(off.e))}
  for(const k in off.pt){if(!(off.pt[k]>0))continue;const p=petParse(k);if(p.s<0||p.s>=PET_SP.length)continue;
    const d=document.createElement('div');d.className='trline';d.textContent=petName(p.s,p.c)+' x'+off.pt[k];
    if(ok){d.appendChild(trBtn('\u2715',()=>{delete TRS.a.pt[k];trSendOffer()},'sm'))}col.appendChild(d)}
  if(mine&&ok){
    col.appendChild(trAmtRow('Coins','c',P.coins));col.appendChild(trAmtRow('Ore','o',P.ore));col.appendChild(trAmtRow('Pet Eggs','e',P.eggs|0));
    const stacks=Object.keys(petsObj()).filter(k=>(petsObj()[k]||0)-(TRS.a.pt[k]||0)>0);
    if(stacks.length){
      const w=document.createElement('div');w.className='tram';const s=document.createElement('select');
      for(const k of stacks){const p=petParse(k),o=document.createElement('option');o.value=k;o.textContent=petName(p.s,p.c)+' (have '+((petsObj()[k]||0)-(TRS.a.pt[k]||0))+')';s.appendChild(o)}
      const n=document.createElement('input');n.type='number';n.min=1;n.value=1;n.style.width='52px';
      w.appendChild(s);w.appendChild(n);w.appendChild(trBtn('Add pet',()=>trAddPet(s.value,+n.value||1),'sm'));col.appendChild(w)}
    col.appendChild(trBtn(TRS.pick?'Hide gear list':'Add gear from bag',()=>{TRS.pick=!TRS.pick;trRender()},'sm'));
    if(TRS.pick){
      const box=document.createElement('div');box.className='trpick';
      const spare=bagArr().filter(it=>!it.bd&&!TRS.a.u.includes(it.u));
      if(!spare.length){const e=document.createElement('div');e.className='trempty';e.textContent='No spare gear in the bag.';box.appendChild(e)}
      for(const it of spare){const r=trItemRow(it,null);r.classList.add('click');r.addEventListener('click',()=>{if(TRS.a.u.length>=12){say('You can offer 12 gear pieces at most.','#8d9aa2');return}TRS.a.u.push(it.u);trSendOffer()});box.appendChild(r)}
      col.appendChild(box)}
  }
  body.appendChild(col)}
function trRender(){
  const body=$('trBody');if(!body||$('trade').hidden)return;body.innerHTML='';
  if(!TRS.a){const m=document.createElement('div');m.className='trempty';m.textContent='No trade open. Tap a player and choose Trade, or type /trade name.';body.appendChild(m);return}
  const wrap=document.createElement('div');wrap.className='trwrap';
  trSide(wrap,TRS.a,true);trSide(wrap,TRS.b,false);body.appendChild(wrap);
  const st=document.createElement('div');st.className='trstat';
  st.textContent=TRS.stage>0?'Handing over... please wait.':TRS.ra&&TRS.rb?'Both ready':TRS.ra?'You are ready. Waiting for '+TRS.peer+'...':TRS.rb?TRS.peer+' is ready. Check their offer, then press Ready.':'Build your offer, check theirs, then press Ready. Any change cancels both Ready marks.';
  body.appendChild(st);
  const bt=document.createElement('div');bt.className='bagbtns';
  if(TRS.stage===0){bt.appendChild(trBtn(TRS.ra?'Not ready':'Ready',()=>{if(!TRS.ra&&!trMine()){say('Something in your offer is no longer yours.','#d9503f');return}trSend('rdy',{r:TRS.ra?0:1})},'pri'));bt.appendChild(trBtn('Cancel trade',()=>trSend('can')))}
  body.appendChild(bt)}
/* ---------------- delivery box ---------------- */
function mktBoxPoll(){if(trOnline()&&started)netSend({t:'mkt',m:'box'})}
function boxHas(b){return !!(b&&((b.it&&b.it.length)||(b.cr&&b.cr.length)||b.c||b.o||b.e||(b.pt&&Object.keys(b.pt).length)))}
function boxSum(b){const s={c:+b.c||0,o:+b.o||0,e:+b.e||0,pt:Object.assign({},b.pt||{})};for(const r of b.cr||[]){s.c+=+r.c||0;s.o+=+r.o||0;s.e+=+r.e||0;for(const k in (r.pt||{}))s.pt[k]=(s.pt[k]||0)+(r.pt[k]|0)}return s}
function boxApply(b){
  if(MK.claiming||!boxHas(b))return;MK.claiming=true;
  try{
    const ids=[],ack={ids:ids,c:0,o:0,e:0,pt:{}};let nItems=0,full=false;
    for(const bi of b.it||[]){
      if(MK.seen.has(bi.id)){ids.push(bi.id);continue} /* v5_365 already collected (an older box reply arrived late): never add it twice, just tell the server again */
      const it=trSan(bi.it);
      if(!it){ids.push(bi.id);continue} /* not a valid item for this game: drop it from the box */
      if(bagCount()>=BAG_CAP){full=true;continue}
      it.u=bagUid++;bagArr().push(it);ids.push(bi.id);MK.seen.add(bi.id);nItems++}
    if(MK.seen.size>2000)MK.seen=new Set([...MK.seen].slice(-500));
    let gc=0,go=0,ge=0,gp=0; /* v5_367 numbered payouts (b.cr): collected once, remembered by id, so a repeated or late box reply can never pay twice */
    for(const cr of b.cr||[]){
      if(MK.seen.has(cr.id)){ids.push(cr.id);continue}
      const c1=Math.max(0,+cr.c||0),o1=Math.max(0,+cr.o||0),e1=Math.max(0,+cr.e||0);
      if(P.coins+c1>2000000000||P.ore+o1>2000000000||(P.eggs|0)+e1>99999){full=true;continue} /* would overflow the save: stays in the box */
      P.coins+=c1;P.ore+=o1;P.eggs=(P.eggs|0)+e1;gc+=c1;go+=o1;ge+=e1;
      for(const k in (cr.pt||{})){const n=Math.max(0,Math.min(cr.pt[k]|0,99999));if(n<=0||!petKeyClean(k))continue;const p=petParse(k);if(p.s<0||p.s>=PET_SP.length)continue;petAdd(p.s,p.c,n);gp+=n}
      ids.push(cr.id);MK.seen.add(cr.id)}
    const c=Math.max(0,Math.min(+b.c||0,2000000000-P.coins)),o=Math.max(0,Math.min(+b.o||0,2000000000-P.ore)),e=Math.max(0,Math.min(+b.e||0,99999-(P.eggs|0)));
    P.coins+=c;P.ore+=o;P.eggs=(P.eggs|0)+e;ack.c=c;ack.o=o;ack.e=e;
    for(const k in (b.pt||{})){
      const n=Math.max(0,Math.min(b.pt[k]|0,99999));if(n<=0)continue;
      if(!petKeyClean(k)){ack.pt[k]=n;continue} /* not a pet this game knows: clear it from the box */
      const p=petParse(k);if(p.s<0||p.s>=PET_SP.length){ack.pt[k]=n;continue}petAdd(p.s,p.c,n);ack.pt[k]=n}
    if(!ids.length&&!c&&!o&&!e&&!Object.keys(ack.pt).length){if(full&&Date.now()-MK.warned>60000){MK.warned=Date.now();say('Your delivery box has items waiting, but your bag is full.','#e3b559',7000)}return}
    try{save()}catch(x){console.error(x)}
    MK.ackWait=true;MK.ackT=Date.now();MK.lastAck=ack;MK.ackN=0; /* v5_365 box replies that were already on their way are ignored until the server answers this ack */
    netSend({t:'mkt',m:'ack',tr:ack});
    const tc=c+gc,to=o+go,te=e+ge,bits=[];if(nItems)bits.push(nItems+' item'+(nItems>1?'s':''));if(tc)bits.push(trFmt(tc)+' coins');if(to)bits.push(trFmt(to)+' ore');if(te)bits.push(te+' pet egg'+(te>1?'s':''));if(Object.keys(ack.pt).length||gp)bits.push('pets');
    if(bits.length)say('Delivery box: received '+bits.join(', ')+'.','#8ff0b0',7000);
    if(full&&Date.now()-MK.warned>60000){MK.warned=Date.now();say('Some items stay in your delivery box until you free bag space.','#e3b559',7000)}
    if(typeof nestRender==='function')try{nestRender()}catch(x){}
    if(!$('bag').hidden)try{renderBag()}catch(x){}
  }finally{MK.claiming=false}}
/* ---------------- market board ---------------- */
function mktNet(m){
  switch(m.m){
    case 'l':MK.list=Array.isArray(m.l)?m.l:[];MK.t0=Date.now()-0;MK.now=+m.now||0;mkRender();break;
    case 'box':{
      MK.box=m.b||null;if(m.ak)MK.ackWait=false;
      if(MK.ackWait&&!m.ak&&Date.now()-MK.ackT>5000&&MK.lastAck){ /* v5_366 no answer yet: say it again (the server clamps to what is there) instead of collecting the same box a second time */
        if(MK.ackN<4){MK.ackN++;MK.ackT=Date.now();netSend({t:'mkt',m:'ack',tr:MK.lastAck})}else MK.ackWait=false}
      if(!MK.ackWait)boxApply(MK.box);mkRender();break}
    case 'ok':if(m.k==='sell'){say('Item listed on the market.','#8ff0b0');MK.pend=null;MK.sellU=null;MK.tab='m'}else if(m.k==='buy'){say('Purchased! The item is on its way to your bag.','#8ff0b0');MK.pend=null}else if(m.k==='cancel')say('Listing cancelled. The item is in your delivery box.','#e3b559');mkRender();break;
    case 'err':{
      say(String(m.x||'Market error'),'#d9503f',6000);
      if(MK.pend&&MK.pend.k==='buy'&&m.k==='buy'){P.coins=Math.min(2000000000,P.coins+MK.pend.price);save()} /* the purchase did not happen: the coins come back */
      if(m.k==='sell'||m.k==='buy')MK.pend=null;mkRender();break}
    case 'sale':say(String(m.n)+' bought your item for '+trFmt(m.p)+' coins. The coins are in your delivery box.','#ffd27a',8000);mktBoxPoll();break;
  }}
function mkLeft(l){const s=Math.max(0,(l.e||0)-(MK.now||0)-Math.floor((Date.now()-MK.t0)/1000));return s>=3600?Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m':Math.max(1,Math.floor(s/60))+'m'}
function mkOpen(tab){if(!trOnline()){say('The market needs the multiplayer server.','#8d9aa2');return}if(tab)MK.tab=tab;$('mkt').hidden=false;netSend({t:'mkt',m:'list'});mkRender()}
function mkClose(){$('mkt').hidden=true}
function mkBuy(l){
  if(MK.pend)return;if(P.coins<l.p){say('Not enough coins.','#d9503f');return}
  P.coins-=l.p;MK.pend={k:'buy',price:l.p};save();netSend({t:'mkt',m:'buy',tr:{id:l.id,p:l.p}});mkRender()}
function mkSell(){
  const it=trQ(MK.sellU);if(!it||MK.pend)return;const p=Math.floor(+MK.price||0);
  if(p<1||p>1000000000){say('Enter a price from 1 to 1,000,000,000 coins.','#d9503f');return}
  const A=bagArr(),i=A.indexOf(it);A.splice(i,1);MK.pend={k:'sell'};save();
  netSend({t:'mkt',m:'sell',tr:{it:trOut(it),p:p,h:MK.hrs}});if(!$('bag').hidden)try{renderBag()}catch(e){}mkRender()}
function mkRender(){
  const body=$('mkBody');if(!body||$('mkt').hidden)return;body.innerHTML='';
  const tabs=document.createElement('div');tabs.className='nesttabs';
  const boxN=MK.box?(MK.box.it||[]).length:0;
  for(const [k,t] of [['b','Browse'],['s','Sell'],['m','My listings'],['x','Delivery box'+(boxHas(MK.box)?' *':'')]]){const b=trBtn(t,()=>{MK.tab=k;mkRender()},MK.tab===k?'pri':'');tabs.appendChild(b)}
  body.appendChild(tabs);
  const cn=document.createElement('div');cn.className='trline';cn.textContent='Your coins: '+trFmt(P.coins);body.appendChild(cn);
  const list=document.createElement('div');list.className='mklist';
  if(MK.tab==='b'){
    const f=document.createElement('div');f.className='mkfilter';
    const q=document.createElement('input');q.type='text';q.placeholder='Search...';q.value=MK.q;q.addEventListener('change',()=>{MK.q=q.value;mkRender()});f.appendChild(q);
    const r=document.createElement('select');for(const [v,t] of [['','All rarities']].concat(RAR.map((x,i)=>[String(i),x.n]))){const o=document.createElement('option');o.value=v;o.textContent=t;r.appendChild(o)}r.value=MK.rar;r.addEventListener('change',()=>{MK.rar=r.value;mkRender()});f.appendChild(r);
    const s=document.createElement('select');for(const [v,t] of [['new','Newest'],['lo','Price: low'],['hi','Price: high']]){const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o)}s.value=MK.sort;s.addEventListener('change',()=>{MK.sort=s.value;mkRender()});f.appendChild(s);
    f.appendChild(trBtn('Refresh',()=>netSend({t:'mkt',m:'list'}),'sm'));body.appendChild(f);
    let rows=MK.list.map(l=>({l:l,it:trSan(l.it)})).filter(x=>x.it&&!x.l.o);
    const qq=MK.q.trim().toLowerCase();if(qq)rows=rows.filter(x=>(trName(x.it)+' '+statTxt(x.it.st,0,null)).toLowerCase().includes(qq));
    if(MK.rar!=='')rows=rows.filter(x=>String(x.it.r)===MK.rar);
    if(MK.sort==='lo')rows.sort((a,b)=>a.l.p-b.l.p);else if(MK.sort==='hi')rows.sort((a,b)=>b.l.p-a.l.p);
    if(!rows.length){const e=document.createElement('div');e.className='trempty';e.textContent='Nothing for sale.';list.appendChild(e)}
    for(const x of rows){
      const btn=trBtn(trFmt(x.l.p)+' coins',()=>mkBuy(x.l),'pri sm');btn.disabled=!!MK.pend||P.coins<x.l.p;
      const row=trItemRow(x.it,btn);const sm=document.createElement('small');sm.className='trsub';sm.textContent='Seller: '+x.l.n+' - '+mkLeft(x.l)+' left';row.firstChild.appendChild(sm);list.appendChild(row)}
  }else if(MK.tab==='s'){
    const spare=bagArr().filter(it=>!it.bd);
    if(!spare.length){const e=document.createElement('div');e.className='trempty';e.textContent='No spare gear in the bag to sell.';list.appendChild(e)}
    for(const it of spare){const r=trItemRow(it,null);r.classList.add('click');if(MK.sellU===it.u)r.classList.add('sel');r.addEventListener('click',()=>{MK.sellU=it.u;mkRender()});list.appendChild(r)}
    const f=document.createElement('div');f.className='mkfilter';
    const p=document.createElement('input');p.type='number';p.min=1;p.placeholder='Price in coins';p.value=MK.price;p.addEventListener('input',()=>{MK.price=p.value});f.appendChild(p);
    const h=document.createElement('select');for(const v of [6,24,72]){const o=document.createElement('option');o.value=v;o.textContent=v+' hours';h.appendChild(o)}h.value=MK.hrs;h.addEventListener('change',()=>{MK.hrs=+h.value});f.appendChild(h);
    const go=trBtn('List item',mkSell,'pri');go.disabled=!MK.sellU||!!MK.pend;f.appendChild(go);body.appendChild(list);body.appendChild(f);return
  }else if(MK.tab==='m'){
    const rows=MK.list.filter(l=>l.o).map(l=>({l:l,it:trSan(l.it)})).filter(x=>x.it);
    if(!rows.length){const e=document.createElement('div');e.className='trempty';e.textContent='You have nothing listed.';list.appendChild(e)}
    for(const x of rows){const row=trItemRow(x.it,trBtn('Cancel',()=>netSend({t:'mkt',m:'cancel',tr:{id:x.l.id}}),'sm'));const sm=document.createElement('small');sm.className='trsub';sm.textContent=trFmt(x.l.p)+' coins - '+mkLeft(x.l)+' left';row.firstChild.appendChild(sm);list.appendChild(row)}
  }else{
    const b=MK.box||{};
    if(!boxHas(b)){const e=document.createElement('div');e.className='trempty';e.textContent='Your delivery box is empty. Sales, returned items and trades arrive here and are collected automatically.';list.appendChild(e)}
    for(const bi of b.it||[]){const it=trSan(bi.it);if(it)list.appendChild(trItemRow(it,null))}
    const sm=boxSum(b);
    for(const [t,v] of [['Coins',sm.c],['Ore',sm.o],['Pet Eggs',sm.e]])if(v){const d=document.createElement('div');d.className='trline';d.textContent=t+': '+trFmt(v);list.appendChild(d)}
    for(const k in sm.pt){const p=petParse(k);if(p.s>=0&&p.s<PET_SP.length){const d=document.createElement('div');d.className='trline';d.textContent=petName(p.s,p.c)+' x'+sm.pt[k];list.appendChild(d)}}
    body.appendChild(list);if(boxHas(b)){const bt=document.createElement('div');bt.className='bagbtns';bt.appendChild(trBtn('Collect now',()=>boxApply(MK.box),'pri'));body.appendChild(bt)}return
  }
  body.appendChild(list)}
/* ---------------- wiring ---------------- */
$('trInvY').addEventListener('click',()=>{if(TRS.a===null)TRS.a=trNew();trSend('acc');trInvHide()});
$('trInvN').addEventListener('click',()=>{trSend('dec');trInvHide()});
$('trClose').addEventListener('click',()=>{if(TRS.stage>0){say('Hand-over in progress, please wait a moment.','#8d9aa2');return}if(TRS.a)trSend('can');trCloseUi()});
$('mkClose').addEventListener('click',mkClose);
$('trade').addEventListener('click',e=>{if(e.target===$('trade')&&TRS.stage===0&&!TRS.a)trCloseUi()});
$('mkt').addEventListener('click',e=>{if(e.target===$('mkt'))mkClose()});
$('bMkt').addEventListener('click',()=>{if(started){$('menu').hidden=true;$('mkt').hidden?mkOpen():mkClose()}});
$('bTrade').addEventListener('click',()=>{if(!started)return;$('menu').hidden=true;
  if(TRS.a){trOpenUi();return}
  const n=window.prompt('Trade with which player? (type their in-game name)','');if(n)tradeRequest(n)});
setInterval(()=>{if(started&&trOnline())mktBoxPoll()},45000);
setTimeout(()=>{if(started&&trOnline())mktBoxPoll()},4000);
