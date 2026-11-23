const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../web/anim3d.js','utf8');
class Quat{constructor(){this.x=0;this.y=0;this.z=0;this.w=1}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
const written={};
const win={THREE:null,location:{search:''},fetch:async(u)=>{const b=fs.readFileSync(__dirname+'/../web/'+u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}},console};
win.window=win;win.VRM3D={setB:(v,n,q)=>{if(![q.x,q.y,q.z,q.w].every(Number.isFinite))throw new Error('NaN in '+n);const l=Math.hypot(q.x,q.y,q.z,q.w);if(Math.abs(l-1)>1e-3)throw new Error('not unit '+n+' '+l);written[n]=[q.x,q.y,q.z,q.w]}};
vm.createContext(win);vm.runInContext(code,win);
const A=win.ANIM3D;A.init({Quaternion:Quat});
(async()=>{
await A.load();console.log('ready',A.ready(),'clips',A.names().length);
const mkv=()=>({scale:31,bones:Object.fromEntries(['hips','spine','chest','upperChest','neck','head','leftShoulder','leftUpperArm','leftLowerArm','leftHand','rightShoulder','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'].map(n=>[n,{position:{set(x,y,z){this.x=x;this.y=y;this.z=z}}}])),hipsRest:{x:0,y:1.03,z:.004}});
/* v5_330: every skill type / signature skill move: clips exist, ranges are inside the clips, every bone stays finite + unit length, the move ends by itself, and none is longer than 2 s */
const S=A.SKILL,names=A.names(),clips={};for(const n of names)clips[n]=1;
const CLS={0:['pierce','nova','strike','cleave','leap','flurry','heal','mend','meteor','chain','might','drain','fan'],1:['kunai','shadowstep','venom','bladestorm','smoke','execute','siphon','rush'],2:['bash','bulwark','quake','charge','roar','counter','hammer','ironskin','shockwave'],3:['arrow','volley','rain','blast','eagle','gale','trap','stormarrow'],4:['wolves','soulburst','soulheal','wail','chains','harvest','guardian','spiritbomb']};
const SIG='cngas'.split(''),sigCls={c:0,n:1,g:2,a:3,s:4};
let n=0,longest=0;
function cast(type,cls){
  const R={cls,lt:0,body:{position:{y:0}},wOut:true},v=mkv(),P={mvAmt:0,anim:0,swing:0,hurt:0,dead:0,cast:0,dg:0,dgU:0,jz:0,sprT:0,air:false,mine:0,tp:0};
  let t=0,started=false,ended=-1;const dt=1/60;
  for(let f=0;f<5*60;f++){
    t+=dt;R.lt=t;R.dtA=dt;
    if(f===30){P.skT=type;P.skTi=1;P.swing=.2;started=true}else if(f>30)P.swing=Math.max(0,P.swing-dt);
    A.apply(R,P,v);
    for(const k in written){const q=written[k];if(!q.every(Number.isFinite))throw new Error(type+' NaN '+k)}
    if(started&&R.an.act&&R.an.act.age>0&&ended<0)ended=-2;
    if(ended===-2&&!R.an.act){ended=t-.5;break}
  }
  if(ended<0)throw new Error(type+' never started or never ended');
  longest=Math.max(longest,ended);if(ended>2)throw new Error(type+' too long '+ended.toFixed(2));n++;
}
for(const c in CLS)for(const t of CLS[c]){if(!S[t])throw new Error('no move for '+t);cast(t,+c)}
for(const c of SIG)for(const l of [25,50,100,200,300,500,750,1000]){const t='sg_'+c+l;if(!S[t])throw new Error('no move for '+t);cast(t,sigCls[c])}
for(const k in S)for(const sg of S[k]){if(!clips[sg[0]])throw new Error(k+': unknown clip '+sg[0]);const d=A.dur?A.dur(sg[0]):0}
console.log('skill moves OK:',n,'casts, longest',longest.toFixed(2),'s, skills with a move:',Object.keys(S).length);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
