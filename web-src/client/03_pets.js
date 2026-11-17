/* ---------- PETS (v5_195): eggs drop from bosses, hatch in the bag, combine F > E > D > C > B > A > S. No pet stats yet. ----------
   P.eggs  = number of eggs (one stacked bag slot).
   P.pets  = { 's:c': count } stacks, s = species index (0 chicken, 1-5 special), c = class index (0 F ... 6 S). One bag slot per stack.
   Chicken is the common pet: it has no class and cannot be combined. */
const EGG_DROP_CHANCE=1,EGG_DROP_N=1,EGG_ORE=10;                /* boss egg drop (bag full: the egg is sold for ore) */
const EGG_SPECIAL_CHANCE=5;                                     /* % chance a hatched egg is a special pet (else a chicken) */
const PET_CLS=['F','E','D','C','B','A','S'],PET_CLS_COL=['#c4cdd2','#5aa9ff','#c07bff','#ff6a4a','#ffb02e','#4de3b0','#ff7ae0'],PET_CLS_SLOT=['cm','','pu','epic','leg','pa','ps'];
const PET_UP=[5,4,3,2,1,.5];                                    /* % chance to combine class i + class i into class i+1 (F>E 5, E>D 4, D>C 3, C>B 2, B>A 1, A>S .5) */
const PET_SP=[{n:'Chicken',col:'#f3e6c4'},{n:'Dragon',col:'#5cd36a'},{n:'Fairy',col:'#ff9ad5'},{n:'Phoenix',col:'#ff7a2a'},{n:'Tiger',col:'#ffb347'},{n:'Wolf',col:'#aab7c4'}];
P.eggs=0;P.pets={};P.pet=null;P.pf=null; /* P.pet = key of the summoned pet ('s:c') or null; P.pf = where it is (follows you) */
let petComb=null; /* combine mode: {a:'s:c' first pet, b:'s:c' second pet or null} */
const petKey=(s,c)=>s+':'+c,petParse=k=>{const a=k.split(':');return{s:a[0]|0,c:a[1]|0}};
const petsObj=()=>P.pets||(P.pets={});
/* v5_201: validate a pet key received from another player ("s:c"); returns '' for anything invalid */
function petKeyClean(k){if(typeof k!=='string'||!/^[0-5]:[0-6]$/.test(k))return '';return k[0]==='0'&&k[2]!=='0'?'':k}
const petStacks=()=>Object.keys(petsObj()).filter(k=>petsObj()[k]>0).length;
const petName=(s,c)=>s===0?'Chicken':PET_SP[s].n+' [Class '+PET_CLS[c]+']';
const petCol=(s,c)=>s===0?PET_SP[0].col:PET_CLS_COL[c];
function petAdd(s,c,n){const o=petsObj(),k=petKey(s,c);o[k]=(o[k]||0)+n}
function petTake(s,c,n){const o=petsObj(),k=petKey(s,c);o[k]=(o[k]||0)-n;if(o[k]<=0)delete o[k]}
function parsePets(o){const out={};if(o&&typeof o==='object')for(const k in o){const p=petParse(k);if(p.s<0||p.s>=PET_SP.length||p.c<0||p.c>=PET_CLS.length)continue;if(p.s===0&&p.c!==0)continue;const n=Math.min(99999,o[k]|0);if(n>0)out[petKey(p.s,p.c)]=n}return out}
/* ---- icons ---- */
ICONS.egg=()=>svgW('<path d="M32 5C20 5 11 28 11 40c0 12 9 19 21 19s21-7 21-19C53 28 44 5 32 5z" fill="#f4ecd8" stroke="#8a7a56" stroke-width="2"/><circle cx="24" cy="38" r="4" fill="#e3b559"/><circle cx="39" cy="30" r="3.5" fill="#7fb0e8"/><circle cx="36" cy="47" r="4" fill="#e88aa8"/><path d="M20 22q4-9 10-12" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>');
ICONS.pet=[
 c=>svgW('<ellipse cx="30" cy="40" rx="18" ry="15" fill="#f6efd8" stroke="#8a7a56" stroke-width="2"/><circle cx="44" cy="25" r="10" fill="#f6efd8" stroke="#8a7a56" stroke-width="2"/><path d="M40 11q4-6 8 0q4-5 6 2z" fill="#e0412f" stroke="#7a1c14" stroke-width="1.5"/><path d="M53 26l8 3-8 3z" fill="#f0a030" stroke="#8a5a10" stroke-width="1.5"/><circle cx="46" cy="23" r="2" fill="#222"/><path d="M13 36q-6 2-6 10 8-2 10-6z" fill="#e9dfbf" stroke="#8a7a56" stroke-width="1.5"/><path d="M26 54v6M34 54v6" stroke="#f0a030" stroke-width="3"/>'),
 c=>svgW('<path d="M6 30l16-16 6 14-10 8z" fill="#3aa84d" stroke="#14451d" stroke-width="2"/><path d="M58 30L42 14l-6 14 10 8z" fill="#3aa84d" stroke="#14451d" stroke-width="2"/><ellipse cx="32" cy="38" rx="12" ry="14" fill="#5cd36a" stroke="#14451d" stroke-width="2"/><path d="M24 14l4 10M40 14l-4 10" stroke="#e3b559" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="7" ry="5" fill="#a8f0a0"/><circle cx="26" cy="34" r="2.5" fill="#ffe14a" stroke="#222"/><circle cx="38" cy="34" r="2.5" fill="#ffe14a" stroke="#222"/><circle cx="29" cy="44" r="1.2" fill="#14451d"/><circle cx="35" cy="44" r="1.2" fill="#14451d"/>'),
 c=>svgW('<path d="M30 30L8 12q-2 18 12 26z" fill="#bfe8ff" stroke="#6aa8d8" stroke-width="1.5" opacity=".9"/><path d="M34 30l22-18q2 18-12 26z" fill="#bfe8ff" stroke="#6aa8d8" stroke-width="1.5" opacity=".9"/><circle cx="32" cy="18" r="8" fill="#ffd9c0" stroke="#8a5a40" stroke-width="1.5"/><path d="M23 16q4-12 18 0q-2-4-9-4t-9 4z" fill="#ff9ad5" stroke="#a04070" stroke-width="1.5"/><path d="M26 26h12l5 22H21z" fill="#ff9ad5" stroke="#a04070" stroke-width="2"/><path d="M28 48v10M36 48v10" stroke="#ffd9c0" stroke-width="3"/><path d="M50 40l2 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" fill="#ffe14a" stroke="#a07a10" stroke-width="1"/>'),
 c=>svgW('<path d="M32 36L4 18q4 24 28 28z" fill="#ff7a2a" stroke="#7a2a08" stroke-width="2"/><path d="M32 36l28-18q-4 24-28 28z" fill="#ff7a2a" stroke="#7a2a08" stroke-width="2"/><path d="M32 40q-12 6-6 22 6-8 6-12 0 4 6 12 6-16-6-22z" fill="#ffd23a" stroke="#c0500a" stroke-width="1.5"/><ellipse cx="32" cy="32" rx="9" ry="12" fill="#ff9a3a" stroke="#7a2a08" stroke-width="2"/><circle cx="32" cy="16" r="8" fill="#ffb347" stroke="#7a2a08" stroke-width="2"/><path d="M26 10q2-8 6-8-1 4 2 6 2-4 6-4-2 6-4 8z" fill="#e0412f"/><path d="M30 18l-2 6 4-2 4 2-2-6z" fill="#ffe14a" stroke="#8a5a10" stroke-width="1"/><circle cx="29" cy="15" r="1.6" fill="#222"/><circle cx="35" cy="15" r="1.6" fill="#222"/>'),
 c=>svgW('<path d="M12 22L9 6l14 8zM52 22l3-16-14 8z" fill="#ffb347" stroke="#7a4a08" stroke-width="2"/><ellipse cx="32" cy="34" rx="22" ry="21" fill="#ffb347" stroke="#7a4a08" stroke-width="2"/><path d="M32 13v9M22 15l3 8M42 15l-3 8M10 32h8M54 32h-8M12 42l7-2M52 42l-7-2" stroke="#2a1a08" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="11" ry="8" fill="#fff4dc"/><circle cx="23" cy="31" r="3" fill="#ffe14a" stroke="#222" stroke-width="1.5"/><circle cx="41" cy="31" r="3" fill="#ffe14a" stroke="#222" stroke-width="1.5"/><path d="M29 40h6l-3 4z" fill="#e0707a" stroke="#222" stroke-width="1"/><path d="M32 44v4M26 48q6 4 12 0" stroke="#222" stroke-width="1.5" fill="none"/>'),
 c=>svgW('<path d="M12 28L8 4l16 12zM52 28l4-24-16 12z" fill="#aab7c4" stroke="#33414f" stroke-width="2"/><path d="M12 28q-4 18 12 28h16q16-10 12-28-8-10-20-10t-20 10z" fill="#aab7c4" stroke="#33414f" stroke-width="2"/><path d="M24 40q8-6 16 0l-4 16H28z" fill="#e8eef4" stroke="#33414f" stroke-width="1.5"/><path d="M28 44h8l-4 7z" fill="#222"/><circle cx="23" cy="32" r="2.8" fill="#ffd23a" stroke="#222"/><circle cx="41" cy="32" r="2.8" fill="#ffd23a" stroke="#222"/><path d="M20 22l3 5M44 22l-3 5" stroke="#6b7a88" stroke-width="2"/>')];
const petIcon=(s,c)=>ICONS.pet[s](petCol(s,c));
/* ---- boss drop ---- */
function giveEgg(m){
  const n=EGG_DROP_N;
  if(P.eggs===0&&bagCount()>=BAG_CAP){
    P.ore+=EGG_ORE;lootIcon('o','&#9670;',EGG_ORE,'#7fe0ee');
    say('Bag full. Sold a Pet Egg for '+EGG_ORE+' ore.','#7fe0ee');bagLog('Bag full: sold Pet Egg \u2192 '+EGG_ORE+' ore','#7fe0ee');save();return}
  P.eggs+=n;lootIcon('egg','&#9711;',n,'#f4ecd8');pop(P.x+28,P.y-52,'+'+n+' Pet Egg','#f4ecd8',13);
  say((m?m.name+' dropped a Pet Egg! ':'')+'Open your bag and tap it to hatch.','#f4ecd8',6000);bagLog('+'+n+' Pet Egg'+(n>1?'s':''),'#f4ecd8');save();
}
/* ---- hatching ---- */
function hatchRoll(){return rnd()*100<EGG_SPECIAL_CHANCE?1+Math.floor(rnd()*5):0}
function hatchEggs(n){
  n=Math.min(n,P.eggs);if(n<=0)return;
  const got={};let done=0,first=null;
  for(let i=0;i<n;i++){
    const s=hatchRoll(),k=petKey(s,0),isNew=!(petsObj()[k]>0),freed=P.eggs===1;
    if(isNew&&!got[k]&&bagCount()>=BAG_CAP&&!freed){if(!done)say('Your bag is full. Make room to hatch this egg.','#8d9aa2',4000);break}
    P.eggs--;petAdd(s,0,1);got[k]=(got[k]||0)+1;done++;if(!first)first=k;
  }
  if(!done){renderBag();return}
  const sp=Object.keys(got).filter(k=>petParse(k).s>0);
  if(done===1){const p=petParse(first);
    if(p.s>0){say('The egg hatched a '+PET_SP[p.s].n+'! (Class F)','#ffe14a',8000);pop(P.x,P.y-60,'\u2605 '+PET_SP[p.s].n+'!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
    else say('The egg hatched a Chicken.','#c4cdd2',4000);
    lootIcon('pet'+first,'&#9733;',1,petCol(p.s,0));
  }else{
    const parts=Object.keys(got).sort().map(k=>got[k]+' '+PET_SP[petParse(k).s].n+(got[k]>1?'s':''));
    say('Hatched '+done+' eggs: '+parts.join(', ')+'.',sp.length?'#ffe14a':'#c4cdd2',8000);
    if(sp.length){pop(P.x,P.y-60,'\u2605 Special pet!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
  }
  bagLog('Hatched '+done+' egg'+(done>1?'s':'')+(sp.length?' \u2014 special pet!':''),sp.length?'#ffe14a':'#c4cdd2');
  const pick=sp.length?sp[0]:first;bagSel='pet_'+pick;bagConfirm=null;
  save();renderBag();
}
/* ---- combining: two pets of the same class (any species) -> one pet of the next class, or a failure that destroys 1 of the two ---- */
function petCanCombine(p){return p.s>0&&p.c<PET_CLS.length-1}
function petCombineReady(){
  if(!petComb||!petComb.b)return false;
  const A=petParse(petComb.a),B=petParse(petComb.b),o=petsObj();
  if(A.c!==B.c||!petCanCombine(A)||!petCanCombine(B))return false;
  return petComb.a===petComb.b?(o[petComb.a]|0)>=2:(o[petComb.a]|0)>=1&&(o[petComb.b]|0)>=1;
}
function doCombine(){
  if(!petCombineReady())return;
  const A=petParse(petComb.a),B=petParse(petComb.b),c=A.c,ch=PET_UP[c];
  if(rnd()*100<ch){
    const s=rnd()<.5?A.s:B.s;
    petTake(A.s,c,1);petTake(B.s,c,1);petAdd(s,c+1,1);
    const msg='Combine success! '+PET_SP[A.s].n+' + '+PET_SP[B.s].n+' became a '+PET_SP[s].n+' [Class '+PET_CLS[c+1]+']!';
    say(msg,PET_CLS_COL[c+1],9000);pop(P.x,P.y-60,'\u2605 Class '+PET_CLS[c+1]+' '+PET_SP[s].n,PET_CLS_COL[c+1],18);spark(P.x,P.y-20,PET_CLS_COL[c+1],34,220,.9,3.2);
    bagLog('Combined \u2192 '+PET_SP[s].n+' Class '+PET_CLS[c+1],PET_CLS_COL[c+1]);
    petComb=null;bagSel='pet_'+petKey(s,c+1);
  }else{
    const lose=rnd()<.5?A:B;
    petTake(lose.s,c,1);
    say('Combine failed (' + ch + '% chance). A '+PET_SP[lose.s].n+' [Class '+PET_CLS[c]+'] was destroyed.','#ff8a7a',8000);
    bagLog('Combine failed: lost '+PET_SP[lose.s].n+' Class '+PET_CLS[c],'#ff8a7a');
    /* back to the pick screen with the first pet kept selected if it is still there */
    petComb=(petsObj()[petComb.a]>0)?{a:petComb.a,b:null}:null;
    if(!petComb)bagSel=null;
  }
  save();renderBag();
}
/* bag integration: items, tap handling, info panel */
function petBagItems(a){
  if(P.eggs>0)a.push({id:'egg',n:'Pet Egg',v:P.eggs,t:fmtQ(P.eggs),r:'pu',ic:ICONS.egg(),d:'Dropped by world bosses. Hatch it for a pet: '+EGG_SPECIAL_CHANCE+'% a special pet (Dragon, Fairy, Phoenix, Tiger or Wolf, Class F), '+(100-EGG_SPECIAL_CHANCE)+'% a Chicken.',egg:1});
  const o=petsObj(),ks=Object.keys(o).filter(k=>o[k]>0).sort((x,y)=>{const a=petParse(x),b=petParse(y);return b.c-a.c||a.s-b.s});
  for(const k of ks){const p=petParse(k),n=o[k];
    a.push({id:'pet_'+k,n:p.s===0?'Chicken':PET_SP[p.s].n+' (Class '+PET_CLS[p.c]+')',v:n,t:p.s===0?'\u00d7'+fmtQ(n):PET_CLS[p.c]+(n>1?' \u00d7'+n:''),r:p.s===0?'cm':PET_CLS_SLOT[p.c],ic:petIcon(p.s,p.c),
      d:p.s===0?'A common pet. It cannot be combined.':'Class '+PET_CLS[p.c]+' pet.'+(petCanCombine(p)?' Combine two Class '+PET_CLS[p.c]+' pets for a '+PET_UP[p.c]+'% chance of a Class '+PET_CLS[p.c+1]+' pet; on failure 1 of the 2 is destroyed.':' The highest class.'),pet:{key:k,s:p.s,c:p.c,n:n}})}
  return a;
}
/* returns true when the tap was a combine-mode tap (and was handled) */
function petCombTap(it){
  if(!petComb)return false;
  if(!it.pet){petComb=null;return false}
  const A=petParse(petComb.a);
  if(it.pet.c!==A.c||!petCanCombine(it.pet)){say('Pick a special pet of the same class (Class '+PET_CLS[A.c]+').','#8d9aa2',3000);return true}
  if(it.pet.key===petComb.a&&!petComb.b&&it.pet.n<2){return true}
  if(petComb.b===it.pet.key){petComb.b=null;renderBag();return true}
  if(it.pet.key===petComb.a&&!petComb.b&&it.pet.n>=2){petComb.b=it.pet.key;renderBag();return true}
  if(it.pet.key!==petComb.a){petComb.b=it.pet.key;renderBag();return true}
  return true;
}
function petCombPanel(info){
  const A=petParse(petComb.a),d=document.createElement('div'),sm=document.createElement('small'),nm=document.createElement('b');
  nm.textContent='Combine pets \u2014 Class '+PET_CLS[A.c];nm.style.color=PET_CLS_COL[A.c];d.appendChild(nm);
  const ch=PET_UP[A.c],ready=petCombineReady();
  sm.textContent=ready?(PET_SP[A.s].n+' + '+PET_SP[petParse(petComb.b).s].n+': '+ch+'% chance of a Class '+PET_CLS[A.c+1]+' pet (species of one of the two). On failure 1 of the 2 is destroyed. Cannot be undone.')
    :(PET_SP[A.s].n+' selected. Tap a second Class '+PET_CLS[A.c]+' pet'+((petsObj()[petComb.a]|0)>=2?' (or the same stack again)':'')+'. '+ch+'% chance of Class '+PET_CLS[A.c+1]+'.');
  d.appendChild(sm);info.appendChild(d);
  const w=document.createElement('div');w.className='bagact';
  const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
  mk('Combine','pri',doCombine,!ready);mk('Cancel','',()=>{petComb=null;renderBag()});info.appendChild(w);
}
function petBagActions(sel,info){
  const w=document.createElement('div');w.className='bagact';
  const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
  if(sel.egg){mk('Hatch','pri',()=>hatchEggs(1));if(P.eggs>1)mk('Hatch all ('+P.eggs+')','',()=>hatchEggs(P.eggs))}
  else if(sel.pet){
    const on=P.pet===sel.pet.key;
    mk(on?'Dismiss':'Summon',on?'':'pri',()=>on?petDismiss():petSummon(sel.pet.key));
    if(petCanCombine(sel.pet))mk('Combine','',()=>{petComb={a:sel.pet.key,b:null};renderBag()},sel.pet.n<2&&petPartners(sel.pet)<1);
  }
  if(w.children.length)info.appendChild(w);
}
/* how many OTHER special pets of the same class exist (so Combine is only enabled when a partner exists) */
function petPartners(p){let n=0;const o=petsObj();for(const k in o){if(k===p.key)continue;const q=petParse(k);if(q.s>0&&q.c===p.c)n+=o[k]}return n}
function petCombValidate(){if(!petComb)return;const o=petsObj();if(!(o[petComb.a]>0))petComb=null;else if(petComb.b&&!(o[petComb.b]>0))petComb.b=null}

/* ---------- summon: ONE pet follows beside you (any pet, common or special). Summoning another replaces it. Summoning does not use the pet up. ---------- */
function petValidate(){if(P.pet&&!(petsObj()[P.pet]>0)){P.pet=null;P.pf=null}}
function petLoad(k){return typeof k==='string'&&petsObj()[k]>0?k:null}
function petSummon(k){
  if(!(petsObj()[k]>0))return;const p=petParse(k),old=P.pet;
  P.pet=k;P.pf=null;
  say((old&&old!==k?'You swapped your pet. ':'')+(p.s===0?'Chicken':PET_SP[p.s].n+' (Class '+PET_CLS[p.c]+')')+' is now by your side.',petCol(p.s,p.c),5000);
  bagLog('Summoned '+petName(p.s,p.c).replace(/ \[Class (.)\]/,' (Class $1)'),petCol(p.s,p.c));save();netInfo(true);renderBag();
}
function petDismiss(){if(!P.pet)return;const p=petParse(P.pet);P.pet=null;P.pf=null;say('Pet dismissed.','#8d9aa2',3000);bagLog('Dismissed pet','#8d9aa2');save();netInfo(true);renderBag()}
/* sprite: the pet's icon on a canvas (class-coloured glow behind special pets). Used by the 2D view directly and by the 3D view as a billboard sprite. */
const PET_SPR={};
function petSprite(k){
  let e=PET_SPR[k];if(e)return e;
  const p=petParse(k),cv=document.createElement('canvas');cv.width=cv.height=128;
  e=PET_SPR[k]={cv,tex:null,ok:false};
  const g=cv.getContext('2d');
  if(p.s>0){const gr=g.createRadialGradient(64,70,8,64,70,62);gr.addColorStop(0,PET_CLS_COL[p.c]+'aa');gr.addColorStop(1,PET_CLS_COL[p.c]+'00');g.fillStyle=gr;g.fillRect(0,0,128,128)}
  const im=new Image();
  im.onload=()=>{g.drawImage(im,14,14,100,100);e.ok=true;if(e.tex)e.tex.needsUpdate=true};
  im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(petIcon(p.s,p.c).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" '));
  return e;
}
let petT=0;
/* follower position: eases toward a spot to the right of you (screen-right in 3D, from the camera yaw), snaps if you teleport. Returns the hop height. */
function petStep(is3){
  petValidate();if(!P.pet)return 0;
  const now=performance.now(),dt=Math.min(.1,petT?(now-petT)/1000:.016);petT=now;
  const yaw=is3&&typeof camView!=='undefined'?camView.yaw:0,rx=Math.cos(yaw),ry=-Math.sin(yaw);
  const tx=P.x+rx*54,ty=P.y+ry*54;
  if(!P.pf||Math.hypot(tx-P.pf.x,ty-P.pf.y)>700)P.pf={x:tx,y:ty,mv:0};
  const f=P.pf,k=1-Math.exp(-7*dt),ox=f.x,oy=f.y;f.x+=(tx-f.x)*k;f.y+=(ty-f.y)*k;
  f.vx=f.x-ox;f.vy=f.y-oy;f.dt=dt;const sp=Math.hypot(f.x-ox,f.y-oy)/Math.max(dt,.001);f.mv+=((sp>40?1:0)-f.mv)*Math.min(1,dt*10);
  f.ph=(f.ph||0)+dt*(2.5+f.mv*7);
  return f.mv>.05?Math.abs(Math.sin(f.ph))*7*f.mv+2:Math.sin(f.ph)*1.6+2.5;
}
/* ---- 3D pet models (web/pets3d.js). Each view (world, bag, forge) owns its own rig; the model is rebuilt only when the summoned pet changes. ---- */
const PET_WORLD_K=1.15;
function petRigFor(h,sc,key){
  if(window.PET3D&&window.THREE&&!petRigFor.ok){try{PET3D.init(THREE,LOW);petRigFor.ok=1}catch(e){petRigFor.ok=-1}}
  if(h.pk!==key){
    if(h.pr){sc.remove(h.pr.root);try{h.pr.dispose()}catch(e){}h.pr=null}
    h.pk=key;
    if(key&&petRigFor.ok===1){try{const p=petParse(key);h.pr=PET3D.make(p.s,p.c);sc.add(h.pr.root)}catch(e){console.error('pet model',e);h.pr=null}}
  }
  return h.pr||null;
}
/* the summoned pet standing beside the avatar in the Bag / Forge preview (the avatar moves a little to the left to make room). Returns true if shown. */
function petPreview(V,t){
  petValidate();
  const rig=petRigFor(V,V.sc,P.pet);
  if(!rig)return false;
  rig.root.position.set(26,0,12);rig.root.rotation.y=-.6+Math.sin(t*.5)*.08;rig.root.scale.setScalar(1.25);
  rig.anim(t,0);return true;
}
function petRender3(){
  const hop=petStep(true),T=T3;
  if(!P.pet){if(T.petSp)T.petSp.visible=false;if(T.pr)T.pr.root.visible=false;return}
  const rig=petRigFor(T,T.sc,P.pet),f=P.pf;
  if(rig){
    if(T.petSp)T.petSp.visible=false;
    const want=f.mv>.3&&Math.hypot(f.vx||0,f.vy||0)>.05?Math.atan2(f.vx,f.vy):Math.PI/2-P.face;
    if(f.yaw===undefined)f.yaw=want;
    let d=want-f.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw+=d*Math.min(1,(f.dt||.016)*7);
    rig.root.visible=true;rig.root.scale.setScalar(PET_WORLD_K);
    rig.root.position.set(f.x-C,gh3(f.x,f.y),f.y-C);rig.root.rotation.y=f.yaw;
    rig.anim(time,f.mv);return;
  }
  /* fallback (pets3d.js missing or the model failed): billboard sprite of the icon */
  if(T.petKey!==P.pet||!T.petSp){
    if(T.petSp){T.sc.remove(T.petSp);T.petSp.material.dispose()}
    const e=petSprite(P.pet);if(!e.tex)e.tex=new THREE.CanvasTexture(e.cv);
    const m=new THREE.SpriteMaterial({map:e.tex,transparent:true,depthWrite:false});
    T.petSp=new THREE.Sprite(m);T.sc.add(T.petSp);T.petKey=P.pet;
  }
  const sp=T.petSp,sz=petParse(P.pet).s===0?38:50;
  sp.visible=true;sp.scale.set(sz,sz,1);sp.position.set(f.x-C,gh3(f.x,f.y)+sz*.46+hop,f.y-C);
}
function petDraw2D(){
  const hop=petStep(false);if(!P.pet||!P.pf)return;
  const e=petSprite(P.pet);if(!e.ok&&petParse(P.pet).s===0)return;
  const f=P.pf,x=f.x-cam.x,y=f.y-cam.y,sz=petParse(P.pet).s===0?36:46;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+2,sz*.3,sz*.11,0,0,6.2832);ctx.fill();
  ctx.drawImage(e.cv,x-sz/2,y-sz*.9-hop,sz,sz);
}

/* ---------- OTHER PLAYERS' PETS (v5_201): each peer reports its summoned pet key (q.pet, from the server 'pt' field); it is drawn following that player. ---------- */
/* follower position for a peer (same easing / offset as your own pet, see petStep) */
function peerPetStep(q,is3){
  if(!q.pet)return 0;
  const now=performance.now(),dt=Math.min(.1,q.pfT?(now-q.pfT)/1000:.016);q.pfT=now;
  const yaw=is3&&typeof camView!=='undefined'?camView.yaw:0,rx=Math.cos(yaw),ry=-Math.sin(yaw);
  const tx=q.x+rx*54,ty=q.y+ry*54;
  if(!q.pf||Math.hypot(tx-q.pf.x,ty-q.pf.y)>700)q.pf={x:tx,y:ty,mv:0};
  const f=q.pf,k=1-Math.exp(-7*dt),ox=f.x,oy=f.y;f.x+=(tx-f.x)*k;f.y+=(ty-f.y)*k;
  f.vx=f.x-ox;f.vy=f.y-oy;f.dt=dt;const sp=Math.hypot(f.x-ox,f.y-oy)/Math.max(dt,.001);f.mv+=((sp>40?1:0)-f.mv)*Math.min(1,dt*10);
  f.ph=(f.ph||0)+dt*(2.5+f.mv*7);
  return f.mv>.05?Math.abs(Math.sin(f.ph))*7*f.mv+2:Math.sin(f.ph)*1.6+2.5;
}
/* 3D: list = the peers drawn this frame (rpl). Pets of peers that left, were dismissed or are out of range are removed. */
function peerPets3(list){
  const T=T3,map=T.rpt||(T.rpt=new Map()),seen=new Set();
  for(const q of list){
    if(!q.pet)continue;
    peerPetStep(q,true);
    let h=map.get(q);if(!h){h={};map.set(q,h)}
    const rig=petRigFor(h,T.sc,q.pet),f=q.pf;
    if(!rig||!f)continue;
    seen.add(q);
    const want=f.mv>.3&&Math.hypot(f.vx||0,f.vy||0)>.05?Math.atan2(f.vx,f.vy):Math.PI/2-q.face;
    if(f.yaw===undefined)f.yaw=want;
    let d=want-f.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw+=d*Math.min(1,(f.dt||.016)*7);
    rig.root.visible=true;rig.root.scale.setScalar(PET_WORLD_K);
    rig.root.position.set(f.x-C,gh3(f.x,f.y),f.y-C);rig.root.rotation.y=f.yaw;
    rig.anim(time,f.mv);
  }
  for(const [q,h] of map)if(!seen.has(q)){
    if(h.pr){T.sc.remove(h.pr.root);try{h.pr.dispose()}catch(e){}h.pr=null}
    map.delete(q);
  }
}
/* 2D: draw a peer's pet (called from drawRemote) */
function peerPetDraw2D(q){
  const hop=peerPetStep(q,false);if(!q.pet||!q.pf)return;
  const e=petSprite(q.pet);if(!e.ok&&petParse(q.pet).s===0)return;
  const f=q.pf,x=f.x-cam.x,y=f.y-cam.y,sz=petParse(q.pet).s===0?36:46;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+2,sz*.3,sz*.11,0,0,6.2832);ctx.fill();
  ctx.drawImage(e.cv,x-sz/2,y-sz*.9-hop,sz,sz);
}
