/* ---------- HUD ---------- */
const el={hp:$('hp'),qi:$('qi'),xp:$('xp'),tg:$('tg'),tgHp:$('tgHp')};
const power=()=>Math.round(atkVal()*6+defVal()*4+maxHp()*.25);
const kfmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':String(n);
const pad2=n=>(n<10?'0':'')+n;
/* v5_143 buff tooltip: hover (PC) or tap (phone) a buff icon to see its name, description and time left. The panel follows the live buff data, so the numbers
   keep counting down while you hold the mouse still. */
let bfTipName='',bfTipEl=null,bfTipHide=0;
function bfTipBox(){if(!bfTipEl){bfTipEl=document.createElement('div');bfTipEl.id='bftip';bfTipEl.hidden=true;($('hud')||document.body).appendChild(bfTipEl)}return bfTipEl}
function bfTipFill(b){const e=bfTipBox();e.innerHTML='';const n=document.createElement('b');n.textContent=b[3];e.appendChild(n);const d=document.createElement('small');d.textContent=b[4];e.appendChild(d);if(b[5]>0){const t=document.createElement('small');t.textContent=b[5]+' s left';e.appendChild(t)}}
function bfTipPlace(x,y){const e=bfTipBox(),w=e.offsetWidth,h=e.offsetHeight;e.style.left=Math.max(4,Math.min(innerWidth-w-4,x+14))+'px';e.style.top=Math.max(4,Math.min(innerHeight-h-4,y+18))+'px'}
function bfTipShow(name,x,y){bfTipName=name;const b=(window.BUFF_NOW||[]).find(z=>z[3]===name);if(!b)return bfTipOff();bfTipFill(b);bfTipBox().hidden=false;bfTipPlace(x,y)}
function bfTipOff(){bfTipName='';clearTimeout(bfTipHide);if(bfTipEl)bfTipEl.hidden=true}
function bfTipRefresh(bs){window.BUFF_NOW=bs;if(!bfTipName)return;const b=bs.find(z=>z[3]===bfTipName);if(!b)return bfTipOff();bfTipFill(b)}
(function(){const bx=$('buffs');if(!bx)return;
  /* v5_164 pointer events only: mouse = hover as before; touch / pen = tap a buff to open its tooltip, tap it again or anywhere else to close. (The old mouseover + click pair fired together on phones: the emulated mouseover opened the tip and the click closed it at once.) */
  const at=e=>{const t=e.target.closest&&e.target.closest('.bf');return t&&bx.contains(t)?t:null};
  const near=t=>{const r=t.getBoundingClientRect();bfTipBox().hidden=false;bfTipPlace(r.left,r.bottom)};
  bx.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const t=at(e);if(t)bfTipShow(t.dataset.n,e.clientX,e.clientY)});
  bx.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&bfTipName&&at(e))bfTipPlace(e.clientX,e.clientY)});
  bx.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const r=e.relatedTarget;if(!at(e)||!bx.contains(r)||!(r.closest&&r.closest('.bf')))bfTipOff()});
  bx.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')return;const t=at(e);if(!t)return;e.stopPropagation();
    if(bfTipName===t.dataset.n){bfTipOff();return}
    bfTipShow(t.dataset.n,0,0);if(bfTipName){near(t);clearTimeout(bfTipHide);bfTipHide=setTimeout(bfTipOff,4000)}});
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&bfTipName&&!(e.target.closest&&e.target.closest('#buffs')))bfTipOff()},true);
})();
let buffKey='',zoneKey='',lastPing='';
const st=(e,t)=>{t=''+t;if(e.textContent!==t)e.textContent=t},sw=(e,v)=>{v=''+v;if(e.style.width!==v)e.style.width=v},sh=(e,v)=>{v=''+v;if(e.style.height!==v)e.style.height=v};
function hud(){
  const mh=maxHp(),mq=maxQi();
  sw(el.hp.firstElementChild,(P.hp/mh*100)+'%');st(el.hp.lastElementChild,Math.ceil(P.hp).toLocaleString()+' / '+mh.toLocaleString());
  sw(el.qi.firstElementChild,(P.qi/mq*100)+'%');st(el.qi.lastElementChild,Math.floor(P.qi).toLocaleString()+' / '+mq.toLocaleString());
  const xpp=P.lvl>=MAXLV?100:P.exp/expNext()*100;
  sw(el.xp.firstElementChild,xpp+'%');
  st($('xpt'),'EXP '+(P.lvl>=MAXLV?'MAX':xpp.toFixed(4)+'%'));
  st($('lv'),'Lv. '+P.lvl);st($('realm'),realmName(realmIdx()));st($('pw'),power().toLocaleString());
  st($('sAtk'),atkVal());st($('sDef'),defVal());st($('sCrit'),Math.round(critChance()*100)+'%');
  statsUpdate();
  st($('coins'),P.coins.toLocaleString());st($('gold'),P.gold.toLocaleString());st($('ore'),P.ore);st($('oreN'),P.ore);
  st($('partyN'),MP?NET.peers.size+1:1);
  const d=new Date();st($('clk'),pad2(d.getHours())+':'+pad2(d.getMinutes()));
  /* connection / ping */
  let nt='solo',nc='net off';
  if(NET.joined){if(NET.ping===undefined){nt='online';nc='net'}else{nt=NET.ping+' ms';nc='net'+(NET.ping>250?' bad':NET.ping>100?' mid':'')}}
  if(nt!==lastPing){lastPing=nt;st($('ping'),nt);$('net').className=nc}
  /* target frame */
  const t=started?(P.target&&!P.target.dead?P.target:(P.sel&&!P.sel.dead?P.sel:null)):null;
  el.tg.hidden=!t;
  if(t){
    const tmx=t.isPl?t.mh:t.maxhp;
    st($('tgLv'),'Lv. '+t.lvl);st($('tgNm'),t.name);st($('tgDef'),t.isPl?'':'DEF '+effMonDef(t));
    st($('tgRank'),t.isPl?'Player':t.boss?'Boss':'Common');$('tgRank').className=t.isPl?'pvp':t.boss?'boss mon':'mon';$('tgRank').title=t.isPl?'Click to view '+t.name+'\u2019s equipment':'Click to view monster stats';
    sw(el.tgHp.firstElementChild,Math.max(0,t.hp/tmx*100)+'%');st(el.tgHp.lastElementChild,Math.max(0,Math.ceil(t.hp)).toLocaleString()+' / '+tmx.toLocaleString());
  }
  tgActRender(t&&t.isPl&&NET.peers.has(t.id)?t:null);
  if(MG.m)mgRender();
  /* zone strip + banner */
  const full=zoneName(),base=full.split(' \u00b7 ')[0],safe=inTown();
  {const pv=!safe&&(PVPLVL>0||curWorld===ARENA);st($('znTag'),safe?'Safe':pv?'PvP \u00b7 '+PVP_NAMES[PVPLVL]:'Danger');$('znTag').className=safe?'safe':pv?'pvp':'';pvpUI()}
  st($('znTxt'),base);st($('znCh'),'World '+curWorld);$('znCh').title=W[curWorld].n;
  const zk=curWorld+':'+base;
  if(zk!==zoneKey){const first=!zoneKey;zoneKey=zk;if(started&&!first){const b=$('banner');b.innerHTML='';b.appendChild(document.createTextNode(base));const sm=document.createElement('small');sm.textContent=W[curWorld].n;b.appendChild(sm);b.style.animation='none';void b.offsetWidth;b.style.animation=''}}
  /* buffs */
  const bs=[];
  if(P.bfT>0)bs.push(['\u25b2',fmtT(P.bfT),'#ffd36b','ATK Boost','+'+Math.round(P.bf*100)+'% ATK.',fmtT(P.bfT)]);
  if(P.vlT>0)bs.push(['\u2601',fmtT(P.vlT),'#b79cff','Haste','+35% move speed (Smoke Veil also adds an ATK boost).',fmtT(P.vlT)]);
  if(P.drT>0)bs.push(['\u26e8',fmtT(P.drT),'#ffb070','Damage Reduction','Takes '+Math.round(P.dr*100)+'% less damage from hits.',fmtT(P.drT)]);
  if(P.ceT>0)bs.push(['\u25ce',fmtT(P.ceT),'#ffe27a','Eagle Eye','+25% crit chance.',fmtT(P.ceT)]);
  if(P.lsT>0)bs.push(['\u2665',fmtT(P.lsT),'#ff7a9a','Lifesteal','Heals you for '+Math.round((P.ls||.1)*100)+'% of the damage you deal (max 5% HP per hit).',fmtT(P.lsT)]);
  if(P.rfT>0)bs.push(['\u21b6',fmtT(P.rfT),'#ffd27a','Reflect','Monsters that hit you take '+Math.round((P.rf||.5)*100)+'% of the damage back.',fmtT(P.rfT)]);
  if(P.absT>0)bs.push(['\u25ce',fmtT(P.absT),'#c8d4dc','Vessel','Absorbing damage ('+Math.round(P.abs||0).toLocaleString()+' stored); it is released as a shockwave.',fmtT(P.absT)]);
  if(P.markT>0)bs.push(['\u2620',fmtT(P.markT),'#ff5a7a','Death Mark','Your mark detonates when this ends.',fmtT(P.markT)]);
  if(P.linkT>0)bs.push(['\u26d3',fmtT(P.linkT),'#80e8ff','Soul Web','Damage to a linked monster is shared (40%) with the others.',fmtT(P.linkT)]);
  {const SPN={1:['\u2658','Spirit Wolves','Wolves that focus your target.'],2:['\u2656','Guardian Spirit','A guardian spirit that fights beside you.'],3:['\u2687','Dao Clone','A clone of yourself strikes your target.'],4:['\u265c','Stone Sentinels','Stone sentinels fight beside you.']}; /* v5_164 one icon per kind of summon */
   for(const kd of [1,2,3,4]){const L=P.spirits.filter(q=>q.k===kd);if(!L.length)continue;const n=SPN[kd],fz=kd===1&&L.some(q=>q.fz);bs.push([n[0],fmtT(Math.max(...L.map(q=>q.t))),L[0].col||'#9fe0ff',n[1],'x'+L.length+' active. '+n[2]+(fz?' Pack Frenzy: they strike twice as fast and 50% harder.':''),fmtT(Math.max(...L.map(q=>q.t)))])}}
  if(P.gsT>0)bs.push(['\u21e0',fmtT(P.gsT),'#9fe8c8','Gale Step','Your Piercing / Volley arrows hit harder (+40%).',fmtT(P.gsT)]);
  if(P.inv>.5)bs.push(['\u2727',fmtT(P.inv),'#ffffff','Untouchable','You cannot take damage.',fmtT(P.inv)]);
  for(const k in HB){const h=HB[k],l=h[4]-HBCLK;if(l<=0){delete HB[k];continue}bs.push([h[0],fmtT(l),h[1],h[2],h[3],fmtT(l)])}
  if(P.sh>0&&P.shT>0)bs.push(['\u25c8',fmtT(P.shT),'#8ff0c4','Shield','Absorbs '+Math.round(P.sh).toLocaleString()+' damage.',fmtT(P.shT)]);
  const bk=bs.map(x=>x[0]+x[3]).join('|'); /* v5_164 rebuilt only when the SET of buffs changes (a rebuild every second swallowed phone taps); the numbers update in place */
  if(bk===buffKey){const ch=$('buffs').children;for(let i=0;i<bs.length&&i<ch.length;i++){const em=ch[i].firstElementChild;if(em&&em.textContent!==String(bs[i][1]))em.textContent=bs[i][1]}}
  if(bk!==buffKey){buffKey=bk;const bx=$('buffs');bx.innerHTML='';for(const x of bs){const e=document.createElement('div');e.className='bf';e.dataset.n=x[3];e.style.color=x[2];e.textContent=x[0];const em=document.createElement('em');em.textContent=x[1];e.appendChild(em);bx.appendChild(e)}}
  bfTipRefresh(bs);
  /* potions */
  st($('potN'),kfmt(P.pots.hp));st($('ckN'),kfmt(P.pots.ck));$('ckCd').hidden=pot.ck<=0;st($('ckCd'),fmtT(pot.ck)+'s');$('bCk').style.opacity=P.pots.ck>0?1:.5;st($('potQN'),kfmt(P.pots.qi));
  $('potCd').hidden=pot.hp<=0;st($('potCd'),fmtT(pot.hp)+'s');$('potQCd').hidden=pot.qi<=0;st($('potQCd'),fmtT(pot.qi)+'s');
  {const tb=$('tpBar');tb.hidden=!(P.tp>0);if(P.tp>0)sw($('tpFill'),Math.round((1-P.tp/TP_CHANNEL)*100)+'%')}
  st($('tpN'),kfmt(P.pots.tp));$('tpCd').hidden=!(pot.tp>0||P.tp>0);st($('tpCd'),P.tp>0?fmtT(P.tp)+'s':fmtT(pot.tp)+'s');$('bTp').style.opacity=P.pots.tp>0?1:.5;
  $('bPot').style.opacity=P.pots.hp>0?1:.5;$('bPotQ').style.opacity=P.pots.qi>0?1:.5;
  st($('viewLb'),MODE3D?'3D':'2D');
  renderOnline();
  if(rsvEl){const ri=P.rsv>=0?P.rsv:P.rsvA,rk=ri>=0?SKILLS[EQ[ri]]:null,key=rk?EQ[ri]+(P.rsv>=0?'m':'a'):'';
    if(key!==rsvKey){rsvKey=key;rsvEl.hidden=!rk;if(rk){rsvEl.style.borderColor=rk.col;rsvEl.classList.toggle('man',P.rsv>=0);rsvEl.innerHTML='<b style="color:'+rk.col+'">'+(GLYPH[rk.t]||'\u2726')+'</b><u>Reserved</u>'}}} /* v5_189 */
  skBtns.forEach((b,i)=>{const id=EQ[i],k=SKILLS[id],cd=k?Math.max(0,SCD[id]):0;
    sh(b.lastElementChild,k?(cd/k.cd*100)+'%':'0');
    st(b.children[2],cd>0?fmtT(cd):'');
    b.classList.toggle('nq',!k||!skCanPay(k));b.classList.toggle('auto',!!k&&i<AUTO_SLOTS&&AUTOSK[i]);
  });
  $('bForge').style.opacity=inTown()?1:.55;$('bWare').style.opacity=inTown()?1:.55;
  {const ha=$('hubArr'),show=started&&P.dead<=0&&!inTown();ha.hidden=!show;
   if(show){const dx0=C-P.x,dy0=C-P.y,d=Math.hypot(dx0,dy0),[dx,dy]=camUnrot(dx0,dy0),an=Math.atan2(dy,dx),hd=$('hud'),R=Math.max(70,Math.min(hd.clientWidth,hd.clientHeight)*.2);
     ha.firstElementChild.style.transform='rotate('+an+'rad) translateX('+R+'px)';
     const lb=ha.lastElementChild;lb.style.transform='translate('+(Math.cos(an)*(R+28))+'px,'+(Math.sin(an)*(R+28))+'px) translate(-50%,-50%)';
     lb.textContent='Hub '+(d>=1000?(d/1000).toFixed(1)+'k':Math.round(d))}}
  jumpEl.classList.toggle('cd',!!P.air||P.jcd>0);
  dodgeEl.classList.toggle('cd',P.dcd>0);{const t=P.dcd>0?P.dcd.toFixed(1)+'s':'DODGE';if(dodgeEl.lastElementChild.textContent!==t)dodgeEl.lastElementChild.textContent=t}
}
function toggleMap(){const w=$('mmw');w.classList.toggle('off');$('bMap').classList.toggle('on',!w.classList.contains('off'))}
$('bMap').classList.add('on');
/* v5_59 Who's online: the button is the ONLY thing that shows / hides the list (moving, clicking the map or the joystick no longer closes it).
   The choice is remembered (al_online); the button lights up while the list is on. Default = shown. */
let ONL_OPEN=true;try{ONL_OPEN=localStorage.getItem('al_online')!=='0'}catch(e){}
function onlineApply(){$('online').classList.toggle('off',!ONL_OPEN);$('bParty').classList.toggle('on',ONL_OPEN)}
$('bParty').addEventListener('click',()=>{
  ONL_OPEN=!ONL_OPEN;try{localStorage.setItem('al_online',ONL_OPEN?'1':'0')}catch(e){}
  onlineApply();NET.olKey='';renderOnline();
  if(ONL_OPEN&&!MP)say('The Online list needs the multiplayer server (you are playing solo).','#8d9aa2');
});
onlineApply();
$('bMap').addEventListener('click',toggleMap);
$('bBell').classList.add('on');
$('bBell').addEventListener('click',()=>{const l=$('log');l.hidden=!l.hidden;$('bBell').classList.toggle('on',!l.hidden)});
function syncMenuOpts(){$('autoPot').checked=!!P.autoPot;$('apHp').value=P.apHp||35;$('apHpV').textContent=(P.apHp||35)+'%';$('apQi').value=P.apQi||20;$('apQiV').textContent=(P.apQi||20)+'%';$('fightBack').checked=!!P.fightBack;$('tapMove').checked=P.tapMove!==false;$('perfSel').value=PERF}
$('bGear').addEventListener('click',()=>{const m=$('menu');m.hidden=!m.hidden;if(!m.hidden)syncMenuOpts()});
$('bSaver').addEventListener('click',()=>{if(!started)return;$('menu').hidden=true;saverOn(true)});
/* volume sliders (menu): music and sound effects are separate and remembered */
(function(){
  const mv=$('volMusic'),sv=$('volSfx');if(!mv||!sv||!window.SND)return;
  const show=()=>{$('volMusicV').textContent=Math.round(SND.music()*100)+'%';$('volSfxV').textContent=Math.round(SND.sfx()*100)+'%'};
  mv.value=Math.round(SND.music()*100);sv.value=Math.round(SND.sfx()*100);show();
  mv.addEventListener('input',()=>{SND.unlock();SND.music(mv.value/100);show()});
  sv.addEventListener('input',()=>{SND.unlock();SND.sfx(sv.value/100);show()});
  sv.addEventListener('change',()=>{SND.play('crit')}); /* let go of the slider = hear the new level */
  for(const el of [mv,sv])el.addEventListener('change',()=>el.blur()); /* give the keyboard back to the game */
})();
/* ---------- stats window + click-outside-to-close ---------- */
function statsUpdate(){
  const w=$('statsWin');if(w.hidden)return;
  st($('swCls'),CLASSES[P.cls].n);st($('swLv'),P.lvl);st($('swRealm'),realmName(realmIdx()));st($('swPw'),power().toLocaleString());
  st($('swHp'),maxHp().toLocaleString());st($('swQi'),maxQi().toLocaleString());st($('swQrg'),'+'+(Math.round(qrgVal()*100)/100)+'%/s');
  st($('swAtk'),atkVal().toLocaleString());st($('swDef'),defVal().toLocaleString());
  st($('swRed'),Math.round(defRedAt(defVal(),P.lvl)*100)+'%');
  st($('swCrit'),Math.round(critChance()*100)+'%');st($('swCd'),Math.round(critMul()*100)+'%');st($('swCdb'),Math.round(cdbVal()*10)/10+'%');st($('swCev'),Math.round(cevVal()*10)/10+'%');st($('swCdr'),Math.round(cdrVal()*10)/10+'%');
  st($('swBab'),Math.round(babVal()*10)/10+'%');st($('swBdr'),Math.round(bdrVal()*10)/10+'%');st($('swPab'),Math.round(pabVal()*10)/10+'%');st($('swPdr'),Math.round(pdrVal()*10)/10+'%');
  st($('swMab'),Math.round(mabVal()*10)/10+'%');st($('swMdr'),Math.round(mdrVal()*10)/10+'%');st($('swBsa'),Math.round(bsaVal()*10)/10+'%');st($('swBsd'),Math.round(bsdVal()*10)/10+'%');
  st($('swAs'),(1/atkCd()).toFixed(2)+'/s');st($('swMs'),Math.round(moveSpd()));
  st($('swAcc'),Math.round(accVal()*10)/10);st($('swEva'),Math.round(evaVal()*10)/10+'%');
  st($('swWl'),P.wlv);st($('swAl'),P.alv);st($('swPk'),P.pvpKills||0);
}
function statsToggle(on){
  const w=$('statsWin');w.hidden=on===undefined?!w.hidden:!on;
  $('bStats').classList.toggle('on',!w.hidden);$('bStats').setAttribute('aria-expanded',String(!w.hidden));
  statsUpdate();
}
$('bStats').addEventListener('click',e=>{e.stopPropagation();statsToggle()});
/* Clicking anywhere outside the pop-up windows closes them. The chat window is left alone, and a click inside the chat never closes anything. */
document.addEventListener('pointerdown',e=>{
  if(!started)return;
  const t=e.target;if(!(t instanceof Element))return;
  if(t.closest('#cp'))return;
  const inside=(win,btn)=>t.closest(win)||(btn&&t.closest(btn));
  if(!$('statsWin').hidden&&!inside('#statsWin','#bStats'))statsToggle(false);
  if(!$('menu').hidden&&!inside('#menu','#bGear'))$('menu').hidden=true;
  /* full-screen pop-ups: the dimmed backdrop counts as outside */
  if(t.classList.contains('modal')&&t.id!=='title'&&!t.hidden){
    if(t.id==='bag')closeBag();else t.hidden=true;
  }
},true);
$('bLogoutGame').addEventListener('click',()=>{if(!confirm('Log out? Your progress is saved to your account.'))return;try{save()}catch(e){}logout()});
$('bOre').addEventListener('click',()=>{if(started)openForge()});
$('bPot').addEventListener('pointerdown',e=>{e.preventDefault();usePot('hp')});
$('bPotQ').addEventListener('pointerdown',e=>{e.preventDefault();usePot('qi')});
$('bCk').addEventListener('pointerdown',e=>{e.preventDefault();usePot('ck')});
$('bTp').addEventListener('pointerdown',e=>{e.preventDefault();useTp()});
/* the HUD is laid out on a 1000x534 canvas and scaled to fit the window */
function fitHud(){if(!$('hud'))return;$('hud').style.setProperty('--u',Math.max(.55,Math.min(innerWidth/1000,innerHeight/534,2.6))+'px')}
window.addEventListener('resize',fitHud);fitHud();

