/* World of Ascension - guided in-game tutorial (v5_121).
   Loaded AFTER the main game script. It reads the game's state through the read-only bridge window.WOA_API (P, started, MP, inTown, EQ, SCD ...).
   It never changes game state: it only watches what the player does and moves to the next step when the player has really done it.
   - Offered once per account to new players (below Lv 10); replay any time from Menu > "How to play (tutorial)".
   - Every step has "Skip step", and "End tutorial" is always visible. The card can be minimised with the "-" button.
   - A pulsing gold ring highlights the part of the screen a step is about. */
(function(){
'use strict';
if(window.__woaTut)return;window.__woaTut=true;

const $=id=>document.getElementById(id);
const G=(f,d)=>{try{const v=f();return v===undefined?d:v}catch(e){return d}};   /* safe read of a game global */
const phone=()=>!!G(()=>W().PHONE,false);
const kb=t=>'<kbd>'+t+'</kbd>';
const hpC=t=>'<b style="color:#ff7a72">'+t+'</b>',qiC=t=>'<b style="color:#6fb2ff">'+t+'</b>';
const px=()=>G(()=>W().P.x,0),py=()=>G(()=>W().P.y,0);
const monSel=()=>{const s=G(()=>W().P.sel,null),t=G(()=>W().P.target,null);
  if(s&&!s.dead&&!s.isPl)return s;if(t&&!t.dead&&!t.isPl)return t;return null};

/* The game's main script keeps its state private; it publishes a read-only window.WOA_API (see the end of index.html). */
const W=()=>window.WOA_API||{};

/* ---------------------------------------------------------------- steps */
const STEPS=[
 {id:'hud',title:'Your hero',target:['#pl'],kind:'info',
  text:()=>'Top-left is your hero. The '+hpC('red bar is HP')+' (keep it above zero) and the '+qiC('blue bar is Qi')+', the energy your skills spend. '
   +'You start in the <b>Lotus Sanctum</b>, a safe hub: fighting is switched off inside it.'},

 {id:'move',title:'Move around',kind:'task',target:()=>phone()?['#joy']:[],
  text:()=>phone()
   ?'Use the on-screen <b>joystick</b>, or <b>tap the ground</b> and your hero walks there. Drag with <b>two fingers</b> to turn the camera and pinch to zoom.'
   :'Press '+kb('W')+kb('A')+kb('S')+kb('D')+' (or the arrow keys), or <b>left-click the ground</b> and your hero walks there. Hold the <b>right mouse button</b> and drag to turn the camera; the wheel zooms.',
  task:'Walk around a little',
  enter:c=>{c.trav=0;c.lx=px();c.ly=py()},
  tick:c=>{const d=Math.hypot(px()-c.lx,py()-c.ly);if(d<400)c.trav+=d;c.lx=px();c.ly=py()},
  check:c=>c.trav>=220},

 {id:'leave',title:'Leave the hub',kind:'task',target:[],
  text:()=>'Monsters roam <b>outside</b> the hub. Walk out past the edge of the hub area. Once you are outside, a green <b>Hub</b> arrow appears and always points the way back.',
  task:'Step outside the hub',
  check:()=>!G(()=>W().inTown(),false)},

 {id:'select',title:'Select a monster',kind:'task',target:[],
  text:()=>(phone()?'<b>Tap a monster once</b>':'<b>Click a monster once</b>')+' to select it. A target frame appears at the top of the screen with its name, level, rank and HP bar.',
  task:'Select a monster',
  check:c=>{const m=monSel();if(m){c.ref=m;return true}return false},
  hint:(c,s)=>{
   if(G(()=>W().pvpOnly(),false))return 'PvP mode is ON, so monsters are ignored. Press '+kb('P')+' (skull button) to turn it off.';
   if(G(()=>W().inTown(),false))return 'You are back inside the hub. Walk outside to find monsters.';
   return s>15?'No monster in sight? Keep exploring outside the hub; they wander the wild.':''}},

 {id:'attack',title:'Fight it',kind:'task',target:['#skills .sk.atk','#tg'],
  text:()=>(phone()
    ?'<b>Tap the same monster again</b> to attack, or press the big <b>sword button</b> (bottom-right) to hit the nearest one.'
    :'<b>Click the same monster again</b> to attack. '+kb('F')+' (or the big sword button, bottom-right) attacks the nearest one. '+kb('Space')+' jumps.')
   +' Your hero walks up and fights on its own until the monster falls.',
  task:'Defeat a monster',
  enter:c=>{c.ref=monSel();c.e0=G(()=>W().P.exp,0);c.l0=G(()=>W().P.lvl,1)},
  tick:c=>{if(!c.ref)c.ref=monSel()},
  check:c=>G(()=>W().P.lvl,1)>c.l0||G(()=>W().P.exp,0)>c.e0||!!(c.ref&&c.ref.dead),
  hint:(c,s)=>{
   if(G(()=>W().P.dead,0)>0)return 'You fell! You will wake up in the hub. Walk back out when you are ready.';
   if(G(()=>W().inTown(),false))return 'You cannot attack inside the hub. Walk outside first.';
   if(G(()=>W().pvpOnly(),false))return 'PvP mode is ON, so monsters are ignored. Press '+kb('P')+' to turn it off.';
   return ''}},

 {id:'rewards',title:'Rewards and levels',kind:'info',target:['#xp'],
  text:()=>'Every kill gives <b>EXP</b> (the cyan bar along the bottom edge), <b>coins</b> and sometimes <b>gear or ore</b>. '
   +'Walk over the drops to pick them up. Fill the EXP bar to <b>level up</b>: you get stronger and unlock new skills.'},

 {id:'skills',title:'Use skills',kind:'task',target:['#skills'],
  text:()=>(phone()
    ?'Skill buttons are at the bottom-right: <b>tap</b> one to cast it.'
    :'Skill buttons are at the bottom-right. Press '+kb('1')+kb('2')+kb('3')+kb('4')+' (more on '+kb('5')+'-'+kb('0')+kb('-')+kb('=')+kb('R')+kb('T')+') or click them.')
   +' Skills cost '+qiC('Qi')+' and have a cooldown. A monster close by is targeted for you, and a skill still fires when none is near. Skills also <b>auto-cast</b> while you fight; drag a button upward to switch that off or on. Open the Skill Book ('+(phone()?'<b>Skills</b> icon':kb('K'))+') to equip more.',
  task:'Cast a skill at a monster',
  enter:c=>{c.prev=G(()=>W().SCD.slice(),[])},
  tick:c=>{c.hit=false;const cur=G(()=>W().SCD,[]),eq=G(()=>W().EQ,[]);
   for(const id of eq){if(id>=0&&(cur[id]||0)>(c.prev[id]||0)+.05){c.hit=true;break}}
   c.prev=G(()=>W().SCD.slice(),[])},
  check:c=>!!c.hit,
  hint:(c,s)=>{
   if(G(()=>W().inTown(),false))return 'Attack skills do not work inside the hub. Walk outside near a monster.';
   return s>12?'Nothing happened? Check that you have enough Qi and that the skill is not on cooldown.':''}},

 {id:'dodge',title:'Dodge',kind:'task',target:['#dodge'],
  text:()=>(phone()
    ?'Put a finger on the <b>DODGE</b> pad, <b>drag in a direction</b> and release to dash that way.'
    :'Hold a direction ('+kb('W')+kb('A')+kb('S')+kb('D')+') and press '+kb('Shift')+' to dash that way.')
   +' You are briefly untouchable during the dash, so use it to slip out of enemy attacks. It has a short cooldown, and you cannot attack or cast while dashing.',
  task:'Do a dodge',
  enter:c=>{c.pd=G(()=>W().P.dcd,0)},
  tick:c=>{const d=G(()=>W().P.dcd,0);if(d>c.pd+.05||G(()=>W().P.dashT,0)>0)c.hit=true;c.pd=d},
  check:c=>!!c.hit},

 {id:'potions',title:'Potions and Home Scroll',kind:'info',target:['#qb'],
  text:()=>'Top-left under the hero:<br>'
   +'&bull; '+kb('Q')+' <b>Health Potion</b> heals 5% HP (5 s cooldown).<br>'
   +'&bull; '+kb('Y')+' <b>Fried Chicken</b> instantly heals 50% HP (60 s cooldown). Fry a Chicken pet in the bag to make it.<br>'
   +'&bull; '+kb('Z')+' <b>Mana Potion</b> restores 10% Qi.<br>'
   +'&bull; '+kb('X')+' <b>Home Scroll</b> teleports you back to the hub.<br>'
   +'Buy them from the <b>Potion Merchant</b> in the hub (walk up to him and '+(phone()?'tap':'click')+' him'+(phone()?'':' or press '+kb('N'))+'). '
   +'Turn on <b>Auto-use potions</b> in the Menu to drink them for you when you run low.'},

 {id:'pvp',title:'Fighting other players (PvP)',kind:'info',target:['#bPvp'],
  text:()=>{
   if(!G(()=>W().MP,false))return 'PvP needs the <b>multiplayer server</b>, and you are playing solo right now, so there is nobody to fight. When you play online, this is how it works:<br>'+pvpHow();
   return pvpHow()},
 }
 ,
 {id:'done',title:'You are ready!',kind:'info',last:true,target:['#tr'],
  text:()=>'Handy buttons (top-right): <b>Bag</b> '+(phone()?'':kb('B'))+', <b>Skills</b> '+(phone()?'':kb('K'))+', <b>World Gate</b> '+(phone()?'':kb('G'))+' (other worlds and the Arena), <b>Forge</b> '+(phone()?'':kb('O'))+' (upgrade gear), and <b>Chat</b> '+(phone()?'':kb('Enter'))+'.<br>'
   +'<b>Auto-hunt</b> ('+(phone()?'HUNT button':kb('A'))+') fights for you. '
   +'Replay this tutorial any time: <b>Menu &gt; How to play</b>. Good luck, cultivator!'}
];
function pvpHow(){
  return (phone()
   ?'&bull; <b>Tap another player</b> to select them, then <b>double-tap</b> to attack (or use the buttons under the target frame).<br>'
   :'&bull; <b>Right-click another player</b> to select them, <b>right-click again</b> to attack.<br>')
  +'&bull; The skull button ('+(phone()?'':kb('P')+' ')+'<b>PvP mode</b>) makes you attack <b>only players</b> and ignore monsters. Leave it off for normal hunting.<br>'
  +'&bull; The hub is safe, and party members cannot hurt each other.<br>'
  +'&bull; The <b>Arena</b> (World 0, open the World Gate) is the dedicated PvP world.<br>'
  +'You do not need to turn anything on now.';
}
const N=STEPS.length;

/* ---------------------------------------------------------------- UI */
const css=document.createElement('style');
css.textContent=`
#tut{position:fixed;left:126px;bottom:calc(36px + env(safe-area-inset-bottom,0px));z-index:200;width:min(420px,calc(100vw - 620px));min-width:320px;box-sizing:border-box;
  background:rgba(13,17,20,.92);border:1px solid rgba(227,181,89,.55);border-radius:12px;padding:10px 14px 12px;color:var(--paper,#e8e0ca);
  font:13px/1.45 var(--body,system-ui,sans-serif);box-shadow:0 8px 30px rgba(0,0,0,.55);user-select:none;-webkit-user-select:none;max-height:70vh;overflow:auto;overscroll-behavior:contain}
#tut[hidden]{display:none}
@media (max-width:1000px){#tut{left:50%;transform:translateX(-50%);width:min(440px,92vw);min-width:0;bottom:calc(112px + env(safe-area-inset-bottom,0px))}}
/* phones, portrait: under the top bars, right of the left icon column, above the hero */
html.phone #tut{left:auto;right:calc(8px + env(safe-area-inset-right,0px));transform:none;top:calc(150px + env(safe-area-inset-top,0px));bottom:auto;width:min(calc(100vw - 84px),360px);min-width:0;font-size:12px;line-height:1.4;padding:8px 11px 10px;max-height:46vh}
/* phones, landscape: compact card in the free strip on the left, clear of the hero, the skill cluster and the minimap.
   Always short enough to sit fully inside the screen, so its Next / End buttons can never be cut off. */
@media (orientation:landscape){html.phone #tut{left:calc(160px + env(safe-area-inset-left,0px));right:auto;top:calc(52px + env(safe-area-inset-top,0px));width:min(300px,40vw);
  max-height:calc(100vh - 64px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));max-height:calc(100dvh - 64px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
  font-size:11.5px;line-height:1.35;padding:5px 10px 7px}
 html.phone #tut h3{font-size:14px;margin-bottom:2px}html.phone #tut .tbar{margin:4px 0 5px}html.phone #tut .tk{margin-top:5px}
 html.phone #tut .tr{margin-top:6px}html.phone #tut .tnext{padding:4px 12px}html.phone #tut .tend{font-size:11px}}
#tut .tt{cursor:grab;touch-action:none;display:flex;align-items:center;justify-content:space-between;gap:8px;font:600 11px var(--body,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--gold,#e3b559)}
#tut .tmin{width:26px;height:22px;border:1px solid rgba(232,224,202,.25);background:transparent;border-radius:6px;line-height:1;padding:0;font-size:15px}
#tut .tbar{height:3px;background:rgba(255,255,255,.12);border-radius:2px;margin:6px 0 8px;overflow:hidden}
#tut .tbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c9962f,#f0d27a);transition:width .35s}
#tut h3{margin:0 0 4px;font:400 18px var(--display,Georgia,serif);letter-spacing:.03em;color:#f4ecd2}
html.phone #tut h3{font-size:16px}
#tut .tb{color:#d6d0bc}
#tut .tb b{color:#fff}
#tut kbd{display:inline-block;min-width:16px;padding:0 5px;margin:0 1px;border:1px solid rgba(232,224,202,.4);border-bottom-width:2px;border-radius:5px;background:rgba(255,255,255,.08);font:600 11px/17px var(--body,sans-serif);text-align:center;color:#fff}
#tut .tk{margin-top:8px;font-weight:600;color:var(--gold,#e3b559)}
#tut .tk.ok{color:var(--jade,#5fd3a5)}
#tut .th{margin-top:5px;font-style:italic;color:#f0c98a;min-height:0}
#tut .tr{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
#tut button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}
#tut .tnext{padding:6px 16px;border-radius:8px;border:1px solid var(--gold,#e3b559);background:rgba(227,181,89,.16);font-weight:700}
#tut .tnext.go{background:var(--jade,#5fd3a5);border-color:var(--jade,#5fd3a5);color:#07140e}
#tut .tnext.alt{border-color:rgba(232,224,202,.3);background:transparent;font-weight:600}
#tut .tend{padding:4px 6px;border:0;background:transparent;color:var(--mist,#8d9aa2);text-decoration:underline;font-size:12px}
#tut.min .tbar,#tut.min h3,#tut.min .tb,#tut.min .tk,#tut.min .th,#tut.min .tr{display:none}
.tutRing{position:fixed;z-index:49;pointer-events:none;border:2px solid var(--gold,#e3b559);border-radius:10px;box-shadow:0 0 12px rgba(227,181,89,.8);animation:tutPulse 1.3s ease-in-out infinite}
.tutRing[hidden]{display:none}
@keyframes tutPulse{0%,100%{box-shadow:0 0 0 0 rgba(227,181,89,.75),0 0 10px rgba(227,181,89,.6)}50%{box-shadow:0 0 0 9px rgba(227,181,89,0),0 0 16px rgba(227,181,89,.9)}}
@media (prefers-reduced-motion:reduce){.tutRing{animation:none}}
`;
document.head.appendChild(css);

const card=document.createElement('div');card.id='tut';card.hidden=true;
card.innerHTML='<div class="tt" title="Drag to move"><span class="tn"></span><button type="button" class="tmin" title="Minimise / expand" aria-label="Minimise or expand the tutorial">&minus;</button></div>'
 +'<div class="tbar"><i></i></div><h3></h3><div class="tb"></div><div class="tk"></div><div class="th"></div>'
 +'<div class="tr"><button type="button" class="tend">End tutorial</button><button type="button" class="tnext">Next</button></div>';
document.body.appendChild(card);
const el={n:card.querySelector('.tn'),bar:card.querySelector('.tbar i'),h:card.querySelector('h3'),b:card.querySelector('.tb'),
  k:card.querySelector('.tk'),th:card.querySelector('.th'),next:card.querySelector('.tnext'),end:card.querySelector('.tend'),min:card.querySelector('.tmin')};
/* buttons must not keep keyboard focus: otherwise Space / Enter would press them again while the player is fighting */
card.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
card.addEventListener('click',e=>{const b=e.target.closest('button');if(b)b.blur()});


/* the card can be dragged by its header (handy on small phone screens) */
(function(){
  const hd=card.querySelector('.tt');let dr=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=card.getBoundingClientRect();dr={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};try{hd.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  hd.addEventListener('pointermove',e=>{
    if(!dr||e.pointerId!==dr.id)return;
    const x=Math.max(4,Math.min(innerWidth-card.offsetWidth-4,e.clientX-dr.dx)),y=Math.max(4,Math.min(innerHeight-card.offsetHeight-4,e.clientY-dr.dy));
    card.style.left=x+'px';card.style.top=y+'px';card.style.right='auto';card.style.bottom='auto';card.style.transform='none';card.dataset.o=innerHeight>innerWidth?'p':'l';
  });
  const up=e=>{if(dr&&e.pointerId===dr.id)dr=null};
  hd.addEventListener('pointerup',up);hd.addEventListener('pointercancel',up);
})();


/* v5_121: a card the player dragged keeps its inline left/top. After turning the phone (portrait <-> landscape) or resizing, that old spot can be
   off the screen, so the card seemed to disappear. Rotating puts it back in its stylesheet spot; otherwise it is clamped inside the screen. */
function fitCard(){
  if(card.hidden)return;
  if(card.style.left||card.style.top){
    const o=innerHeight>innerWidth?'p':'l';
    if(card.dataset.o&&card.dataset.o!==o){card.style.left=card.style.top=card.style.right=card.style.bottom=card.style.transform='';delete card.dataset.o;return}
    const w=card.offsetWidth,h=card.offsetHeight;
    card.style.left=Math.max(4,Math.min(innerWidth-w-4,parseFloat(card.style.left)||0))+'px';
    card.style.top=Math.max(4,Math.min(innerHeight-h-4,parseFloat(card.style.top)||0))+'px';
  }
}
addEventListener('resize',fitCard);addEventListener('orientationchange',()=>setTimeout(fitCard,250));
try{window.visualViewport&&window.visualViewport.addEventListener('resize',fitCard)}catch(e){}

/* ---------------------------------------------------------------- state */
let idx=-1,active=false,offered=false,S=null,ctx={},t0=0,advT=0,mode='idle'; /* mode: idle | intro | step */
const doneKey=()=>'woa_tut1_'+String(G(()=>W().AUTH.email,'')||'').toLowerCase();
const isDone=()=>{try{return localStorage.getItem(doneKey())==='1'}catch(e){return false}};
const markDone=()=>{try{localStorage.setItem(doneKey(),'1')}catch(e){}};
const sysSay=(t,c)=>G(()=>W().say(t,c||'#8d9aa2'));

function setNext(label,cls){el.next.textContent=label;el.next.className='tnext'+(cls?' '+cls:'')}
function showIntro(){
  mode='intro';active=false;S=null;clearTimeout(advT);
  el.n.textContent='Welcome';el.bar.style.width='0%';el.h.textContent='New to World of Ascension?';
  el.b.innerHTML='Take a quick guided tour (about 2 minutes): <b>moving</b>, <b>fighting monsters</b>, <b>skills</b>, <b>dodging</b>, <b>potions</b> and <b>fighting other players</b>. You can skip any step, and replay it later from <b>Menu &gt; How to play</b>.';
  el.k.textContent='';el.k.className='tk';el.th.textContent='';
  setNext('Start tutorial','go');el.end.textContent='No thanks';
  card.classList.remove('min');card.hidden=false;fitCard();
}
function enter(i){
  clearTimeout(advT);idx=i;S=STEPS[i];mode='step';active=true;t0=performance.now();
  ctx={ok:false};if(S.enter)S.enter(ctx);
  el.n.textContent='Step '+(i+1)+' of '+N;el.bar.style.width=Math.round((i+1)/N*100)+'%';el.h.textContent=S.title;
  el.b.innerHTML=S.text();el.th.textContent='';
  if(S.kind==='task'){el.k.className='tk';el.k.textContent='\u25CB '+S.task;setNext('Skip step','alt')}
  else{el.k.textContent='';el.k.className='tk';setNext(S.last?'Finish':'Next','')}
  el.end.textContent=S.last?'':'End tutorial';
  card.hidden=false;fitCard();
}
function start(){
  if(!G(()=>W().started,false))return;
  const m=$('menu');if(m)m.hidden=true;
  enter(0);raf();
}
function next(){
  clearTimeout(advT);
  if(mode==='intro'){start();return}
  if(idx>=N-1){finish(true);return}
  enter(idx+1);
}
function finish(completed){
  clearTimeout(advT);active=false;mode='idle';card.hidden=true;hideRings();markDone();
  sysSay(completed?'Tutorial complete. Replay it any time from Menu > How to play.':'Tutorial closed. You can replay it any time from Menu > How to play.',completed?'#5fd3a5':'#8d9aa2');
}
el.next.addEventListener('click',next);
el.end.addEventListener('click',()=>{if(mode==='intro'){markDone();mode='idle';card.hidden=true;sysSay('No problem. You can open the tutorial any time from Menu > How to play.')}else finish(false)});
el.min.addEventListener('click',()=>{card.classList.toggle('min');el.min.innerHTML=card.classList.contains('min')?'+':'&minus;'});

/* ---------------------------------------------------------------- highlight rings */
const rings=[];
function hideRings(){for(const r of rings)r.hidden=true}
function placeRings(){
  let sels=active&&S?S.target:[];if(typeof sels==='function')sels=sels();sels=sels||[];
  for(let i=0;i<Math.max(sels.length,rings.length);i++){
    if(!rings[i]){const d=document.createElement('div');d.className='tutRing';d.hidden=true;document.body.appendChild(d);rings[i]=d}
    const r=rings[i],e=sels[i]?document.querySelector(sels[i]):null;
    if(!e||e.hidden){r.hidden=true;continue}
    const b=e.getBoundingClientRect();
    if(b.width<3||b.height<1){r.hidden=true;continue}
    const pad=6;
    r.style.left=(b.left-pad)+'px';r.style.top=(b.top-pad)+'px';r.style.width=(b.width+pad*2)+'px';r.style.height=(b.height+pad*2)+'px';r.hidden=false;
  }
}
let rafOn=false;
function raf(){if(rafOn)return;rafOn=true;(function f(){if(!active){rafOn=false;hideRings();return}placeRings();requestAnimationFrame(f)})()}

/* ---------------------------------------------------------------- watcher (every 150 ms) */
setInterval(()=>{
  if(!G(()=>W().started,false)){if(active||mode==='intro'){/* logged out / back at title */active=false;mode='idle';card.hidden=true;hideRings()}return}
  /* one-time offer for new players */
  if(!offered&&mode==='idle'&&!isDone()&&G(()=>W().P.lvl,1)<10){offered=true;setTimeout(()=>{if(mode==='idle'&&G(()=>W().started,false))showIntro()},1800)}
  fitCard();
  if(!active||!S)return;
  if(S.tick)S.tick(ctx);
  if(S.kind!=='task')return;
  const secs=(performance.now()-t0)/1000;
  if(!ctx.ok){
    if(S.check(ctx)){
      ctx.ok=true;el.k.className='tk ok';el.k.textContent='\u2713 Nice!';el.th.textContent='';
      setNext(idx>=N-1?'Finish':'Next','go');
      advT=setTimeout(()=>{if(active&&S&&S.id===STEPS[idx].id&&ctx.ok)next()},1400);
    }else if(S.hint){const h=S.hint(ctx,secs);el.th.innerHTML=h||''}
  }
},150);

/* ---------------------------------------------------------------- menu entry */
(function addMenuButton(){
  const m=$('menu'),lo=$('bLogoutGame');if(!m)return;
  const b=document.createElement('button');b.type='button';b.className='btn';b.id='bTut';b.textContent='How to play';
    b.addEventListener('click',()=>{if(!G(()=>W().started,false))return;start()});
  if(lo&&lo.parentNode)lo.parentNode.insertBefore(b,lo);else m.appendChild(b);
})();

window.WOA_TUTORIAL={start:start,stop:()=>finish(false),reset:()=>{try{localStorage.removeItem(doneKey())}catch(e){}}};
})();
