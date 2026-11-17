/* ---------- loop ---------- */
let last=performance.now(),hudT=0,saveT=0,rafPrev=0,rafAvg=16.7;
function stepGame(dt){
  if(started&&$('title').hidden){
    time+=dt;HBCLK+=dt;
    updatePlayer(dt);if(MP){updateMonstersMP(dt);updatePeers(dt)}else updateMonsters(dt);updateMisc(dt);
    hudT+=dt;if(hudT>.08){hud();hudT=0}
    saveT+=dt;if(saveT>8){save();saveT=0}
    if(window.SND)SND.tick(dt,true,combatNow(dt));
  }else if(window.SND)SND.tick(dt,false,false);
}
function frame(now){
  if(rafPrev){const d=now-rafPrev;if(d>0&&d<100)rafAvg+=(d-rafAvg)*.05}rafPrev=now;
  if(PHONE&&rafAvg<9.6&&now-last<14.5){requestAnimationFrame(frame);return} /* display runs at 120Hz+: render every other refresh (~60 fps) */
  const dt=Math.min(.05,(now-last)/1000);last=now;
  stepGame(dt);
  drawFrame();
  requestAnimationFrame(frame);
}
/* ---------- background play ----------
   Browsers stop requestAnimationFrame (and throttle page timers) in a hidden tab. A Web Worker timer is not throttled that way, so while
   the tab is hidden the worker drives the game logic (auto-hunt, auto-mine, regen, combat) in small fixed steps; drawing is skipped. */
(function(){
  let w=null;
  try{
    const src='setInterval(function(){postMessage(0)},50)';
    w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  }catch(e){return}
  w.onmessage=()=>{
    if(!document.hidden)return;
    const now=performance.now();let el=Math.min(120,(now-last)/1000);last=now;
    while(el>0){const dt=Math.min(.05,el);el-=dt;try{stepGame(dt)}catch(e){console.error(e);break}}
  };
  document.addEventListener('visibilitychange',()=>{last=performance.now()});
})();

/* ---------- start ---------- */
/* ----- permanent in-game name (IGN): checked for availability, then claimed once; the server refuses any later change ----- */
let ignT=0,ignSeq=0,ignBusy=false;
function ignMsg(t,good){const m=$('ignMsg');m.textContent=t||'';m.style.color=good?'#5fd3a5':'#d9503f'}
function applyIgnUI(){
  const i=$('nameIn'),l=document.querySelector('label[for=nameIn]');
  if(AUTH.ign){i.value=AUTH.ign;i.readOnly=true;i.title='Your in-game name is permanent.';if(l)l.textContent='Your name (permanent)';ignMsg('')}
  else{i.readOnly=false;i.title='';i.placeholder='Choose your name';if(l)l.textContent='Choose your name (permanent)';ignCheck()}
}
function ignCheck(){
  if(AUTH.ign||!AUTH.ok)return;
  clearTimeout(ignT);const v=$('nameIn').value.trim();
  if(!v){ignSeq++;ignMsg('');return}
  ignMsg('Checking\u2026',true);const seq=++ignSeq;
  ignT=setTimeout(async()=>{
    try{const r=await api('/api/ign/check?name='+encodeURIComponent(v));if(seq!==ignSeq)return;
      ignMsg(r.ok?'\u2713 "'+r.name+'" is available. It becomes permanent once you begin.':r.error,r.ok)}
    catch(e){if(seq===ignSeq)ignMsg(e.status?e.message:'Cannot check the name: server unreachable.')}
  },350);
}
/* resolves true when the account has its IGN (already set, or just claimed); false if the player must pick another */
async function ensureIgn(){
  if(AUTH.ign)return true;
  if(ignBusy)return false;
  const v=$('nameIn').value.trim();
  if(!v){ignMsg('Enter a name for your character.');$('nameIn').focus();return false}
  ignBusy=true;
  try{
    const c=await api('/api/ign/check?name='+encodeURIComponent(v));          /* 1) is it available? */
    if(!c.ok){ignMsg(c.error);return false}
    if(!confirm('Your in-game name will be "'+c.name+'".\n\nIt is permanent and cannot be changed later. Continue?'))return false;
    const r=await api('/api/ign',{name:c.name});                              /* 2) claim it (the server re-checks atomically) */
    AUTH.ign=r.ign;applyIgnUI();return true;
  }catch(e){ignMsg(e.status?e.message:'Cannot reach the server to save your name.');return false}
  finally{ignBusy=false}
}
/* v5_88 HP persistence: phone browsers often unload / reload a background tab, which used to restart the game with FULL HP (load + begin refilled it).
   The current HP/Qi is now stashed every second and restored on start (alive only, plus the natural out-of-hub regen for the time away, capped at 10 min). */
const hpKey=()=>saveKey()+'_hp';
function hpStash(){if(!started||!AUTH.ok||P.dead>0||P.hp<=0)return;try{localStorage.setItem(hpKey(),JSON.stringify({h:Math.round(P.hp),q:Math.round(P.qi),t:Date.now(),w:P.lvl}))}catch(e){}}
function hpRestore(){try{const o=JSON.parse(localStorage.getItem(hpKey())||'null');if(!o||!(o.h>0)||o.w!==P.lvl)return;const el=Math.min(600,Math.max(0,(Date.now()-o.t)/1000));
  P.hp=Math.min(maxHp(),Math.max(1,o.h+el*(1+P.lvl*.15)));P.qi=Math.min(maxQi(),Math.max(0,o.q+el*(3+P.lvl*.1+maxQi()*qrgVal()/100)))}catch(e){}}
setInterval(hpStash,4000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hpStash()});window.addEventListener('pagehide',hpStash);
async function begin(){
  if(!AUTH.ok)return;
  if(!(await ensureIgn()))return;
  applyLook(SKIN);started=true;$('title').hidden=true;
  NET.name=AUTH.ign;authSet('al_name',NET.name);
  if(NET.on&&!NET.joined)netJoin();
  keepAwake();
  fixBagOverflow();P.hp=maxHp();P.qi=maxQi();hpRestore();snapSeen();hud();
  say('Welcome to the Lotus Sanctum. Step outside and hunt.','#e8e0ca');
}
$('bStart').addEventListener('click',begin);

/* ---------- accounts (register / log in) ---------- */
function api(path,body){
  const o={method:body?'POST':'GET',headers:{}};
  if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}
  if(AUTH.token)o.headers.Authorization='Bearer '+AUTH.token;
  return fetch(path,o).then(r=>r.text().then(t=>{
    let j=null;try{j=JSON.parse(t)}catch(e){}
    if(!r.ok)throw Object.assign(new Error((j&&j.error)||'Server error'),{status:r.status});
    return j;
  }));
}
function authMsg(msg,good){const m=$('authMsg');m.textContent=msg||'';m.style.color=good?'#5fd3a5':'#d9503f'}
function setAuthUI(){
  $('authBox').hidden=AUTH.ok;$('whoBox').hidden=!AUTH.ok;$('playBox').hidden=!AUTH.ok;
  $('whoEmail').textContent=AUTH.email;
}
function logout(){
  cloudFlush();pmSaveNow();
  authForget();
  location.reload();
}
async function enterAccount(){
  let server=null,got=false,newerLocal=false;
  try{server=await api('/api/load');got=true}catch(e){if(e.status===401){authForget();AUTH.token='';setAuthUI();authMsg('Session expired. Please log in again.');return}}
  try{
    const key=saveKey(),local=localStorage.getItem(key);
    let l=null;try{l=JSON.parse(local||'null')}catch(_){}
    if(got&&server&&l&&(+l.ts||0)>(+server.ts||0))newerLocal=true;   /* this account's last cloud push never made it: keep its newer browser copy and push it now */
    if(got&&server&&!newerLocal){localStorage.setItem(key,JSON.stringify(server));if(server.sk!==undefined)localStorage.setItem('al_look_'+AUTH.email,String(server.sk|0))}
    localStorage.removeItem('ashenlotus');localStorage.removeItem('al_acct');   /* old shared slot from earlier versions: never trusted again */
  }catch(e){}
  AUTH.ok=true;pmLoad();
  let has=false;try{has=!!localStorage.getItem(saveKey())}catch(e){}
  if(has){load();$('bStart').textContent='Continue';if(!(got&&server)||newerLocal)save()}
  else{$('bStart').textContent='Begin ascension'}
  try{const me=await api('/api/me');AUTH.ign=me.ign||''}catch(e){AUTH.ign=''}
  walletLoad();
  setAuthUI();applyIgnUI();hud();
}
async function doAuth(kind){
  const email=$('emailIn').value.trim(),password=$('passIn').value;
  if(!email||!password){authMsg('Enter your email and password.');return}
  const body={email,password};
  if(kind==='register'){
    const confirm=$('pass2In').value;
    if(password.length<8){authMsg('Password must be at least 8 characters.');return}
    if(!confirm){authMsg('Please confirm your password.');$('pass2In').focus();return}
    if(confirm!==password){authMsg('Passwords do not match. Please retype them.');$('pass2In').value='';$('pass2In').focus();return}
    body.confirm=confirm;
  }
  $('bLogin').disabled=$('bRegister').disabled=true;authMsg('Please wait\u2026',true);
  try{
    const r=await api('/api/'+kind,body);
    AUTH.token=r.token;AUTH.email=r.email;
    authSet('al_token',AUTH.token);authSet('al_email',AUTH.email);
    $('passIn').value=$('pass2In').value='';authMsg('');
    await enterAccount();
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server. Logging in needs the server to be running.')}
  $('bLogin').disabled=$('bRegister').disabled=false;
}
$('bLogin').addEventListener('click',()=>doAuth('login'));
$('bRegister').addEventListener('click',()=>doAuth('register'));
$('bLogout').addEventListener('click',logout);
async function forgotSend(){
  const email=$('emailIn').value.trim();
  if(!email){authMsg('Type your account email above first.');return}
  authMsg('Sending\u2026',true);
  try{
    await api('/api/forgot',{email,password:''});
    $('resetBox').hidden=false;$('codeIn').focus();
    authMsg('If that email is registered, a 6-digit code was sent to it (valid 15 minutes). Enter it below with a new password.',true);
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server.')}
}
$('bForgot').addEventListener('click',e=>{e.preventDefault();forgotSend()});
$('bResend').addEventListener('click',forgotSend);
$('bReset').addEventListener('click',async()=>{
  const email=$('emailIn').value.trim(),code=$('codeIn').value.trim(),password=$('newPassIn').value;
  if(!email||!code||!password){authMsg('Enter your email, the 6-digit code and a new password.');return}
  $('bReset').disabled=true;authMsg('Please wait\u2026',true);
  try{
    const r=await api('/api/reset',{email,code,password});
    AUTH.token=r.token;AUTH.email=r.email;
    authSet('al_token',AUTH.token);authSet('al_email',AUTH.email);
    $('codeIn').value=$('newPassIn').value=$('passIn').value='';$('resetBox').hidden=true;authMsg('');
    await enterAccount();
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server.')}
  $('bReset').disabled=false;
});
$('passIn').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth('login')});
$('pass2In').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth('register')});
$('emailIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('passIn').focus()});
$('emailIn').value=AUTH.email;
if(AUTH.token)api('/api/me').then(enterAccount).catch(e=>{
  if(e.status===401){authForget();AUTH.token='';authMsg('Session expired. Please log in again.')}
  else authMsg('Cannot reach the game server. Logging in needs the server to be running.');
});
hud();
try{$('nameIn').value=authGet('al_name')||''}catch(e){}
netConnect();
/* v5_120 read-only bridge for tutorial.js (the guided tutorial). It only exposes state for reading; nothing here changes the game. */
window.WOA_API={get P(){return P},get SCD(){return SCD},get EQ(){return EQ},get AUTH(){return AUTH},get started(){return started},get MP(){return MP},PHONE:PHONE,
  inTown:()=>inTown(),pvpOnly:()=>pvpOnly(),say:(t,c)=>say(t,c)};
requestAnimationFrame(frame);
