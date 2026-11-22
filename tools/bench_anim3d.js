// Headless cost of ANIM3D.apply() per rig per frame (v5_331).   node tools/bench_anim3d.js [rigs] [seconds]
// 4th argument 'quiet' = a crowd that only walks and stands (no fights), the usual state of the other players in a town.
// Optional 3rd argument = animation stride (R.lodS) of the rigs, to see what the level of detail saves.
// Uses a stand-in for VRM3D.setB, so it measures the animation maths (sampling, blending, state) and not three.js / the GPU.
const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../web/anim3d.js','utf8');
class Quat{constructor(){this.x=0;this.y=0;this.z=0;this.w=1}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
let sink=0;
const win={THREE:null,location:{search:''},fetch:async(u)=>{const b=fs.readFileSync(__dirname+'/../web/'+u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}},console};
win.window=win;win.VRM3D={setB:(v,n,q)=>{sink+=q.x+q.w}};
vm.createContext(win);vm.runInContext(code,win);
const A=win.ANIM3D;A.init({Quaternion:Quat});
const NR=+process.argv[2]||8,SECS=+process.argv[3]||20,STR=+process.argv[4]||1,QUIET=process.argv[5]==='quiet',BN=['hips','spine','chest','upperChest','neck','head','leftShoulder','leftUpperArm','leftLowerArm','leftHand','rightShoulder','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
(async()=>{
  await A.load();
  const mkv=()=>({scale:31,hipsRest:{x:0,y:1,z:0},bones:Object.fromEntries(BN.map(n=>[n,{position:{set(){}}}]))});
  const rigs=[];
  for(let i=0;i<NR;i++)rigs.push({R:{cls:i%5,lt:0,body:{position:{y:0}},wOut:false,vrm:null,lodS:STR,lodO:i},v:mkv(),P:{mvAmt:0,anim:0,swing:0,hurt:0,dead:0,cast:0,dg:0,dgU:0,jz:0,mine:0,tp:0},seed:i});
  const FR=SECS*60,dt=1/60,SK=['strike','cleave','heal','arrow','bash','wolves'];
  const t0=process.hrtime.bigint();let t=0,calls=0;
  for(let f=0;f<FR;f++){
    t+=dt;
    for(const r of rigs){
      const{R,P,seed}=r;R.lt=t;R.dtA=dt;
      const ph=QUIET?((t+seed*1.7)%8<4?0:6):(t+seed*1.7)%8;                      // 0-3 jog, 3-5 attack combo, 5-6 skill, 6-8 idle
      if(ph<3){P.mvAmt=1;P.anim+=200/60*.07;P.swing=0;P.skT=''}
      else if(ph<5){P.mvAmt=Math.max(0,P.mvAmt-.2);R.wOut=true;P.swing=((ph*100|0)%45)<10?.2:0;P.skT=''}
      else if(ph<5.02){P.swing=.2;P.skT=SK[seed%SK.length];P.skTi=(P.skTi|0)+1}
      else{P.swing=0;P.mvAmt=0}
      if(A.due?A.due(R,P):true)A.apply(R,P,r.v);calls++;
    }
  }
  const ms=Number(process.hrtime.bigint()-t0)/1e6;
  console.log('rigs',NR,'stride',STR,QUIET?'(quiet crowd)':'(mixed)','frames',FR,'apply calls',calls,'total',ms.toFixed(0)+' ms','=',(ms*1000/calls).toFixed(2)+' us per rig-frame   (checksum '+sink.toFixed(3)+')');
})();
