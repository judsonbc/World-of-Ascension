/* ---------- PET NEST (v5_237, v5_239 multi-combine): one window for hatching eggs and combining pets (10 combines at once). Key U, Menu > Pet Nest, or the Pet Nest button in the bag. ----------
   Same rules as the bag (hatchRoll / EGG_SPECIAL_CHANCE / PET_UP / petAdd / petTake in 03_pets.js); the roll is made at once and saved, the animation only reveals it,
   so closing the window during the animation loses nothing. */
const NEST_ROWS=10;
let nestTab='hatch',nestBusy=false,nestRes=null,nestT=0,nestRows=[],nestOut=[],nestSnap=null;
const nestEl=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const nestBtn=(t,c,f,dis)=>{const b=nestEl('button','btn'+(c?' '+c:''),t);b.type='button';b.disabled=!!dis;b.addEventListener('click',f);return b};
function nestInit(){nestRows=[];for(let i=0;i<NEST_ROWS;i++)nestRows.push({a:null,b:null});nestOut=[];nestSnap=null}
nestInit();
function nestOpen(tab,key){
  if(!started)return;
  clearTimeout(nestT);nestBusy=false;nestRes=null;nestInit();
  if(tab)nestTab=tab;
  $('nest').hidden=false;
  if(key&&nestTab==='combine'&&petsObj()[key]>0&&petCanCombine(petParse(key)))nestPick(key);
  nestRender();
}
function nestClose(){clearTimeout(nestT);nestBusy=false;nestRes=null;nestInit();const n=$('nest');if(n)n.hidden=true}
function nestRender(){
  const w=$('nest');if(!w||w.hidden)return;
  if(nestTab==='combine')nestValidate();
  w.classList.toggle('wide',nestTab==='combine');
  w.classList.toggle('hatchtab',nestTab==='hatch');   /* v5_272: hook for the compact landscape-phone hatch layout */
  $('nTabH').classList.toggle('on',nestTab==='hatch');$('nTabC').classList.toggle('on',nestTab==='combine');
  $('nestCnt').textContent='Eggs: '+P.eggs;
  const b=$('nestBody');b.textContent='';
  if(nestTab==='hatch')nestHatchUi(b);else nestCombUi(b);
}
/* ---- hatch tab ---- */
function nestHatchUi(b){
  /* v5_271: a special pet is shown IN the egg area: the egg glows gold while it shakes, then it bursts and the pet(s) pop out with rays + a pulsing glow */
  const spk=(nestRes&&nestRes.kind==='hatch'&&nestRes.got)?Object.keys(nestRes.got).filter(k=>petParse(k).s>0).sort():[];
  const rev=!nestBusy&&spk.length>0;
  const st=nestEl('div','nstage'+(rev?' spk':'')),eg=nestEl('div','negg'+(nestBusy?' shake':'')+(nestBusy&&spk.length?' spec':'')+(rev?' nrev':''));
  if(rev){
    eg.appendChild(nestEl('i','nrays'));
    for(const k of spk){const p=petParse(k),pe=nestEl('div','nrvp');pe.title=PET_SP[p.s].n;pe.innerHTML=petIcon(p.s,0);eg.appendChild(pe)}
    for(let i=0;i<6;i++){const d=nestEl('u','nspk');d.style.setProperty('--a',(i*60+20)+'deg');eg.appendChild(d)}
  }else eg.innerHTML=ICONS.egg();
  st.appendChild(eg);
  if(rev){const t=nestEl('b','ncount nspt','\u2605 '+spk.map(k=>PET_SP[petParse(k).s].n+(nestRes.got[k]>1?' \u00d7'+nestRes.got[k]:'')).join(', ')+' hatched! \u2605');st.appendChild(t)}
  else st.appendChild(nestEl('b','ncount',P.eggs>0?'Pet Egg \u00d7'+P.eggs:'No Pet Eggs'));
  st.appendChild(nestEl('small','',P.eggs>0?EGG_SPECIAL_CHANCE+'% special pet (Dragon, Fairy, Phoenix, Tiger or Wolf, Class F) \u00b7 '+(100-EGG_SPECIAL_CHANCE)+'% Chicken':'World bosses drop Pet Eggs.'));
  b.appendChild(st);
  /* v5_250: one permanent slot per species (Chicken + 5 specials), each showing how many the last hatch gave (0 when none) */
  const r=nestEl('div','nres'),R=(nestRes&&nestRes.kind==='hatch'&&!nestBusy)?nestRes:null;
  if(R&&!R.done)r.appendChild(nestEl('div','nline bad','Your bag is full. Make room to hatch this egg.'));
  else r.appendChild(nestEl('div','nline',R?'Hatched '+R.done+' egg'+(R.done>1?'s':'')+':':'\u00a0'));
  const row=nestEl('div','nlist n6');
  for(let s=0;s<PET_SP.length;s++){
    const n=R&&R.got?(R.got[petKey(s,0)]|0):0,it=nestEl('div','nit n6i'+(s>0?' sp':'')+(n?' on':'')+(n&&s>0?' hot':'')),sl=nestEl('div','bslot nsl '+PET_CLS_SLOT[0]);
    sl.innerHTML=petIcon(s,0);it.appendChild(sl);
    const nm=nestEl('span','nnm',s===0?'Chicken':PET_SP[s].n);nm.style.color=s===0?'#c4cdd2':'#ffe14a';it.appendChild(nm);
    it.appendChild(nestEl('b','ncn','\u00d7'+n));row.appendChild(it);
  }
  r.appendChild(row);
  if(R&&R.done&&R.full)r.appendChild(nestEl('div','nline bad','Your bag is full: the other eggs were kept. Make room to hatch them.'));
  b.appendChild(r);
  const bt=nestEl('div','nbtns');
  bt.appendChild(nestBtn('Hatch','pri',()=>nestHatch(1),P.eggs<1||nestBusy));
  if(P.eggs>1)bt.appendChild(nestBtn('Hatch all ('+P.eggs+')','',()=>nestHatch(P.eggs),nestBusy));
  b.appendChild(bt);
}
function nestHatch(n){
  if(nestBusy)return;
  n=Math.min(n|0,P.eggs);if(n<=0)return;
  const got={};let done=0,full=false;
  for(let i=0;i<n;i++){
    const s=hatchRoll(),k=petKey(s,0),isNew=!(petsObj()[k]>0),freed=P.eggs===1;
    if(isNew&&!got[k]&&bagCount()>=BAG_CAP&&!freed){full=true;break}
    P.eggs--;petAdd(s,0,1);got[k]=(got[k]||0)+1;done++;
  }
  nestRes={kind:'hatch',done,got,full};
  if(!done){nestRender();return}
  const keys=Object.keys(got),sp=keys.filter(k=>petParse(k).s>0);
  if(done===1){const p=petParse(keys[0]);
    if(p.s>0){say('The egg hatched a '+PET_SP[p.s].n+'! (Class F)','#ffe14a',8000);pop(P.x,P.y-60,'\u2605 '+PET_SP[p.s].n+'!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
    else say('The egg hatched a Chicken.','#c4cdd2',4000);
  }else{
    const parts=keys.sort().map(k=>got[k]+' '+PET_SP[petParse(k).s].n+(got[k]>1?'s':''));
    say('Hatched '+done+' eggs: '+parts.join(', ')+'.',sp.length?'#ffe14a':'#c4cdd2',8000);
    if(sp.length){pop(P.x,P.y-60,'\u2605 Special pet!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
  }
  bagLog('Hatched '+done+' egg'+(done>1?'s':'')+(sp.length?' \u2014 special pet!':''),sp.length?'#ffe14a':'#c4cdd2');
  save();if(!$('bag').hidden)renderBag();
  nestBusy=true;nestRender();
  clearTimeout(nestT);nestT=setTimeout(()=>{nestBusy=false;if(sp.length)SFX('levelup');nestRender()},950);
}
/* ---- combine tab: up to 10 combines at once. Left = your pets, right = 10 slots (pet + pet -> next class). Tap a pet to put it in the first slot that fits. ---- */
const nestUsed=rows=>{const u={};for(const r of rows){if(r.a)u[r.a]=(u[r.a]||0)+1;if(r.b)u[r.b]=(u[r.b]||0)+1}return u};
const nestAvail=k=>(petsObj()[k]|0)-(nestUsed(nestRows)[k]|0);
const nestSame=(x,y)=>{const A=petParse(x),B=petParse(y);return A.s===B.s&&A.c===B.c};
const nestRowReady=r=>!!(r.a&&r.b&&nestSame(r.a,r.b)&&petCanCombine(petParse(r.a)));
function nestValidate(){ /* pets that are gone (or used up elsewhere) leave their slots */
  const o=petsObj();
  for(const r of nestRows){if(r.b&&!(o[r.b]>0))r.b=null;if(r.a&&!(o[r.a]>0)){r.a=r.b;r.b=null}}
  const u=nestUsed(nestRows);
  for(let i=NEST_ROWS-1;i>=0;i--){const r=nestRows[i];
    if(r.b&&u[r.b]>(o[r.b]|0)){u[r.b]--;r.b=null}
    if(r.a&&u[r.a]>(o[r.a]|0)){u[r.a]--;r.a=r.b;r.b=null}}
}
function nestPick(k){
  if(nestBusy||nestAvail(k)<=0)return;
  nestOut=[];
  let r=nestRows.find(x=>x.a&&!x.b&&nestSame(x.a,k));   /* finish a half-filled slot of the same pet class first */
  if(r)r.b=k;
  else{r=nestRows.find(x=>!x.a);if(r)r.a=k;else say('All '+NEST_ROWS+' combine slots are full.','#8d9aa2',3000)}
  nestRender();
}
function nestUnpick(i,which){
  if(nestBusy)return;nestOut=[];
  const r=nestRows[i];if(which==='b')r.b=null;else{r.a=r.b;r.b=null}
  nestRender();
}
const nestSorted=asc=>{const o=petsObj();return Object.keys(o).filter(k=>o[k]>0&&petCanCombine(petParse(k))).sort((x,y)=>{const a=petParse(x),c=petParse(y);return (asc?a.c-c.c:c.c-a.c)||a.s-c.s})};
function nestAuto(){ /* fill the free slots with pairs, lowest class first */
  if(nestBusy)return;nestOut=[];
  const o=petsObj(),u=nestUsed(nestRows);
  for(const k of nestSorted(true)){
    let av=(o[k]|0)-(u[k]||0);
    /* v5_244: only complete pairs go into the slots (a single pet is never placed alone) */
    const half=nestRows.find(x=>x.a&&!x.b&&nestSame(x.a,k));
    if(half&&av>=1){half.b=k;av--;u[k]=(u[k]||0)+1}   /* finish a half-filled slot the player started */
    while(av>=2){
      const free=nestRows.find(x=>!x.a);if(!free)break;
      free.a=k;free.b=k;av-=2;u[k]=(u[k]||0)+2;
    }
  }
  nestRender();
}
function nestCombUi(b){
  const o=petsObj(),rows=nestBusy&&nestSnap?nestSnap:nestRows,busy=nestBusy,ready=rows.filter(nestRowReady).length;
  const wrap=nestEl('div','ncomb'),L=nestEl('div','nleft'),R=nestEl('div','nright');
  /* left: all combinable pets */
  L.appendChild(nestEl('div','nhd','Your pets'));
  const ks=nestSorted(false);
  if(!ks.length)L.appendChild(nestEl('div','nline','No pets to combine yet. Hatch eggs to get special pets (Class F). Chickens cannot be combined.'));
  else{
    const g=nestEl('div','ngrid');
    for(const k of ks){
      const p=petParse(k),av=nestAvail(k),s=nestEl('button','bslot '+PET_CLS_SLOT[p.c]+(av<=0?' dim':''));
      s.type='button';s.title=petName(p.s,p.c)+' \u00d7'+av;s.innerHTML=petIcon(p.s,p.c);
      s.appendChild(nestEl('span','q',PET_CLS[p.c]+(av>1?' \u00d7'+av:'')));
      s.addEventListener('click',()=>nestPick(k));g.appendChild(s);
    }
    L.appendChild(g);
  }
  /* right: 10 combine slots */
  R.appendChild(nestEl('div','nhd','Combine slots ('+ready+' ready)'));
  const list=nestEl('div','nrows');
  for(let i=0;i<NEST_ROWS;i++){
    const r=rows[i],rd=nestRowReady(r),res=!busy?nestOut[i]:null;
    const d=nestEl('div','nrw'+(rd?' rdy':'')+(busy&&rd?' merge':''));
    d.appendChild(nestEl('span','nno',String(i+1)));
    const slot=(k,cls,fn)=>{
      const e=nestEl('button','bslot nslot '+cls);e.type='button';
      if(k){const p=petParse(k);e.className+=' '+PET_CLS_SLOT[p.c];e.innerHTML=petIcon(p.s,p.c);e.title=petName(p.s,p.c)+' (tap to remove)';e.addEventListener('click',fn)}
      else{e.className+=' empty';e.disabled=true}
      return e};
    d.appendChild(slot(r.a,'a',()=>nestUnpick(i,'a')));d.appendChild(nestEl('span','nop','+'));
    d.appendChild(slot(r.b,'b',()=>nestUnpick(i,'b')));d.appendChild(nestEl('span','nop','\u2192'));
    const out=nestEl('div','bslot nslot nout');
    if(res&&res.ok){out.className+=' '+PET_CLS_SLOT[res.c]+' won';out.innerHTML=petIcon(res.s,res.c);out.title='Success: '+petName(res.s,res.c)}
    else if(res){out.className+=' lost';out.textContent='\u2717';out.title='Failed: a '+petName(res.s,res.c)+' was destroyed'}
    else if(r.a){const A=petParse(r.a);out.className+=' '+PET_CLS_SLOT[A.c+1]+' ghost';out.innerHTML=petIcon(A.s,A.c+1)}
    else{out.className+=' empty'}
    d.appendChild(out);
    const lb=nestEl('span','nch',res?(res.ok?'OK':'Lost'):(r.a?PET_UP[petParse(r.a).c]+'%':''));
    if(res)lb.style.color=res.ok?PET_CLS_COL[res.c]:'#ff8a7a';
    d.appendChild(lb);list.appendChild(d);
  }
  R.appendChild(list);
  const done=!busy?nestOut.filter(Boolean):[];
  if(done.length){const w=done.filter(x=>x.ok).length;R.appendChild(nestEl('div','nline '+(w?'good':'bad'),w+' success'+(w===1?'':'es')+', '+(done.length-w)+' failed ('+(done.length-w)+' pet'+(done.length-w===1?'':'s')+' lost)'))}
  wrap.appendChild(L);wrap.appendChild(R);b.appendChild(wrap);
  const bt=nestEl('div','nbtns');
  bt.appendChild(nestBtn('Combine all ('+ready+')','pri',nestCombineAll,!ready||busy));
  bt.appendChild(nestBtn('Auto fill','',nestAuto,busy||!ks.length));
  bt.appendChild(nestBtn('Clear all','',()=>{nestOut=[];nestRows.forEach(r=>{r.a=r.b=null});nestRender()},busy||(!nestRows.some(r=>r.a)&&!nestOut.length)));
  b.appendChild(bt);
}
function nestCombineAll(){
  if(nestBusy)return;
  const rows=nestRows.map(r=>({a:r.a,b:r.b}));
  if(!rows.some(nestRowReady))return;
  const o=petsObj(),out=[],names={};let ok=0,bad=0,top=-1,topS=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];if(!nestRowReady(r))continue;
    const A=petParse(r.a),B=petParse(r.b),c=A.c,ch=PET_UP[c],s=A.s;
    if(r.a===r.b?(o[r.a]|0)<2:!(o[r.a]>0&&o[r.b]>0))continue;   /* safety: the pets are no longer there */
    if(rnd()*100<ch){
      petTake(A.s,c,1);petTake(B.s,c,1);petAdd(s,c+1,1);ok++;
      out[i]={ok:1,s,c:c+1,ch};const nm=PET_SP[s].n+' [Class '+PET_CLS[c+1]+']';names[nm]=(names[nm]||0)+1;
      if(c+1>top){top=c+1;topS=s}
      bagLog('Combined \u2192 '+PET_SP[s].n+' Class '+PET_CLS[c+1],PET_CLS_COL[c+1]);
    }else{
      const lose=rnd()<.5?A:B;petTake(lose.s,c,1);bad++;
      out[i]={ok:0,s:lose.s,c,ch};
      bagLog('Combine failed: lost '+PET_SP[lose.s].n+' Class '+PET_CLS[c],'#ff8a7a');
    }
  }
  if(ok+bad===0)return;
  const got=Object.keys(names).map(n=>n+(names[n]>1?' \u00d7'+names[n]:'')).join(', ');
  say((ok+bad===1?(ok?'Combine success! ':'Combine failed. '):'Combined '+(ok+bad)+' pairs: '+ok+' success'+(ok===1?'':'es')+', '+bad+' failed. ')+(ok?'You got '+got+'.':'')+(bad?(ok?' ':'')+bad+' pet'+(bad>1?'s were':' was')+' destroyed.':''),ok?PET_CLS_COL[top]:'#ff8a7a',9000);
  if(ok){pop(P.x,P.y-60,'\u2605 Class '+PET_CLS[top]+' '+PET_SP[topS].n,PET_CLS_COL[top],18);spark(P.x,P.y-20,PET_CLS_COL[top],34,220,.9,3.2)}
  nestSnap=rows;                                   /* what the slots looked like, for the merge animation */
  for(let i=0;i<rows.length;i++)if(out[i]){nestRows[i]={a:null,b:null}}
  nestOut=out;petValidate();save();if(!$('bag').hidden)renderBag();
  nestBusy=true;nestRender();
  clearTimeout(nestT);nestT=setTimeout(()=>{nestBusy=false;nestSnap=null;if(ok)SFX('levelup');nestRender()},1000);
}
$('nTabH').addEventListener('click',()=>{if(nestBusy)return;nestTab='hatch';nestRes=null;nestRender()});
$('nTabC').addEventListener('click',()=>{if(nestBusy)return;nestTab='combine';nestRes=null;nestOut=[];nestRender()});
$('nestClose').addEventListener('click',nestClose);
$('nest').addEventListener('click',e=>{if(e.target===$('nest'))nestClose()});
$('bNest').addEventListener('click',()=>{if(started){$('menu').hidden=true;nestOpen()}});
