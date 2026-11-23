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
function run(name,cls,own,script,secs){
  const R={cls,lt:0,body:{position:{y:0}},wOut:false},v=mkv(),P={mvAmt:0,anim:0,swing:0,hurt:0,dead:0,cast:0,dg:0,dgU:0,jz:0,sprT:own?0:undefined,air:own?false:undefined,mine:0,tp:0};
  const log=[];let last='',t=0;const dt=1/60;
  for(let f=0;f<secs*60;f++){
    t+=dt;R.lt=t;R.dtA=dt;script(P,R,t,f);
    A.apply(R,P,v);const an=R.an;const k=(an.act?'+'+an.act.segs[an.act.i][0]:'')+' '+an.key;
    if(k!==last){log.push(t.toFixed(2)+': base='+an.key+(an.act?'  act='+an.act.segs[an.act.i][0]:''));last=k}
    if(!Number.isFinite(R.body.position.y))throw new Error('y NaN');
  }
  console.log('--',name);console.log(log.join('\n'));
}
const walk=(P,t,f,spd)=>{P.mvAmt=Math.min(1,P.mvAmt+.2);P.anim+=spd/60*.07};
run('idle then jog then sprint then stop (own)',0,true,(P,R,t)=>{if(t>3&&t<6){P.mvAmt=Math.min(1,P.mvAmt+.2);P.anim+=200/60*.07}else if(t>=6&&t<8){P.sprT=1;P.mvAmt=1;P.anim+=260/60*.07}else{P.sprT=0;P.mvAmt=Math.max(0,P.mvAmt-.2)}},10);
run('remote player gaits (no sprT)',2,false,(P,R,t)=>{const s=t<2?60:t<4?200:t<6?300:0;if(s){P.mvAmt=1;P.anim+=s/60*.07}else P.mvAmt=Math.max(0,P.mvAmt-.2)},7);
run('jump + land standing',1,true,(P,R,t)=>{P.air=t>1&&t<1.7;P.jz=P.air?60*Math.sin((t-1)/.7*Math.PI):0},3);
run('attacks per class',3,true,(P,R,t)=>{R.wOut=t>.3;const k=Math.floor(t/.6);P.swing=(t%.6)<.18?.18:0;P.skT=''},4);
run('skill charge + hit + cast',2,true,(P,R,t)=>{if(Math.abs(t-.5)<.01){P.skT='charge';P.skTi=1;P.swing=.2}else if(Math.abs(t-1.2)<.01){P.hurt=.25}else if(t>1.3&&t<1.8){P.hurt=0;if(t<1.31){P.cast=.5;P.skT='quake';P.skTi=2;P.swing=.2}}else{P.swing=0}},3);
run('dodges',0,true,(P,R,t)=>{const d=t<1?1:t<2?2:3;P.dg=d;P.dgU=(t%1)/.45>1?-1:(t%1)/.45;if(P.dgU<0)P.dg=0},3.2);
run('death + respawn',4,true,(P,R,t)=>{P.dead=t>1&&t<3.5?3.5-t:0},6);
run('emotes + drink + mining + tp',0,true,(P,R,t)=>{if(Math.abs(t-.5)<.01)P.emo={n:'dance',id:1};if(Math.abs(t-2)<.01)P.emo={n:'sit',id:2};if(Math.abs(t-4)<.01)P.act={n:'drink',id:1};if(Math.abs(t-4.5)<.01)P.emo={n:'yes',id:3};if(t>6&&t<7)P.mine=t-6;else P.mine=0;if(t>7&&t<8)P.tp=1;else P.tp=0;if(Math.abs(t-9)<.01)P.emo={n:'constructor',id:4}},10);
console.log('hips written',written.hips,'ok');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
