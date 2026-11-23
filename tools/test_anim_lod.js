// v5_331 checks for the animation level of detail (ANIM3D.due + R.lodS) and the cheaper blend maths.   node tools/test_anim_lod.js
// 1  a throttled rig (stride 2, 3, 4) starts every attack / skill / hit / dodge / emote on the SAME frame as an un-throttled one
// 2  a throttled rig's pose stays close to the full-rate pose while walking / idling (max angle error reported)
// 3  nothing goes NaN, quaternions stay unit length
const fs=require('fs'),vm=require('vm');
const file=process.argv[2]||__dirname+'/../web/anim3d.js';
class Quat{constructor(){this.x=0;this.y=0;this.z=0;this.w=1}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}}
function load(){
  const code=fs.readFileSync(file,'utf8'),pose={};
  const win={THREE:null,location:{search:''},fetch:async(u)=>{const b=fs.readFileSync(__dirname+'/../web/'+u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}},console};
  win.window=win;win.VRM3D={setB:(v,n,q)=>{if(![q.x,q.y,q.z,q.w].every(Number.isFinite))throw new Error('NaN in '+n);if(Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)>1e-3)throw new Error('not unit '+n);pose[n]=[q.x,q.y,q.z,q.w]}};
  vm.createContext(win);vm.runInContext(code,win);win.ANIM3D.init({Quaternion:Quat});return {A:win.ANIM3D,pose};
}
const BN=['hips','spine','chest','upperChest','neck','head','leftShoulder','leftUpperArm','leftLowerArm','leftHand','rightShoulder','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
const mkv=()=>({scale:31,hipsRest:{x:0,y:1,z:0},bones:Object.fromEntries(BN.map(n=>[n,{position:{set(){}}}]))});
const ang=(a,b)=>{const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))*57.2958};
(async()=>{
  const L=load();const A=L.A;await A.load();
  // script: jog 0-2, stop, attack pulses, skill, hit, dodge, idle
  const script=(P,t)=>{
    P.swing=0;P.hurt=0;P.dg=0;P.dgU=0;
    if(t<2){P.mvAmt=1;P.anim+=200/60*.07}else P.mvAmt=Math.max(0,P.mvAmt-.2);
    if(t>2.5&&t<2.68)P.swing=.2;                                   // basic attack pulse (.18 s like the game's remote swing)
    if(t>3.4&&t<3.6){P.swing=.2;P.skT='strike';P.skTi=1}           // skill
    if(t>4.2&&t<4.4)P.hurt=.2;                                     // hit
    if(t>5&&t<5.45){P.dg=1;P.dgU=(t-5)/.45}                        // dodge
    if(t>6.1&&t<6.2)P.emo={n:'dance',id:7};
  };
  const run=(stride,fps)=>{
    const R={cls:2,lt:0,body:{position:{y:0}},wOut:true,lodS:stride,lodO:0},P={mvAmt:0,anim:0,swing:0,hurt:0,dead:0,cast:0,dg:0,dgU:0,jz:0,mine:0,tp:0},v=mkv(),dt=1/fps;
    const ev=[],frames=[];let posed=0,last='';
    for(let f=0,t=0;t<8;f++){
      t+=dt;R.lt=t;R.dtA=dt;R.lodS=t<1?1:stride;script(P,t);   // the stride starts after 1 s, when the gait has settled: two runs that start differently only differ in gait phase, which is not an error
      let did=false;if(A.due(R,P)){A.apply(R,P,v);did=true;posed++}
      const an=R.an;if(an){const k=(an.act?'+'+an.act.segs[an.act.i][0]:'')+' '+an.key;if(k!==last){ev.push([t,k]);last=k}}
      frames.push({t,pose:JSON.parse(JSON.stringify(L.pose))});
    }
    return {ev,posed,frames};
  };
  for(const fps of [60,30]){
    const base=run(1,fps);
    console.log('== '+fps+' fps  full rate: '+base.posed+' poses');
    for(const s of [2,3,4]){
      const r=run(s,fps);
      // 1: action start time vs full rate
      const starts=e=>e.filter(x=>x[1].startsWith('+')||/em:|roll|hop/.test(x[1])).map(x=>x);
      const a=starts(base.ev),b=starts(r.ev);let worst=0;
      for(const x of a){const y=b.find(z=>z[1]===x[1]&&Math.abs(z[0]-x[0])<.3);if(!y){console.log('  stride',s,': MISSING move',x[1],'at',x[0].toFixed(2));process.exitCode=1}else worst=Math.max(worst,Math.abs(y[0]-x[0]))}
      // 2: pose error while jogging steadily (t 1.1 - 1.9 s, stride on from 1.0 s): mean / 95th percentile / max over all frames of the largest bone error
      const er=[];
      for(let i=0;i<base.frames.length;i++){const t=base.frames[i].t;if(t<1.1||t>1.9)continue;let m=0;for(const n of BN){if(!base.frames[i].pose[n]||!r.frames[i].pose[n])continue;m=Math.max(m,ang(base.frames[i].pose[n],r.frames[i].pose[n]))}er.push(m)}
      er.sort((x,y)=>x-y);const mean=er.reduce((x,y)=>x+y,0)/er.length;
      console.log('  stride '+s+': poses '+r.posed+' ('+(100*r.posed/base.posed).toFixed(0)+'%), moves '+a.length+'/'+b.length+' start delay max '+(worst*1000).toFixed(0)+' ms, jog: worst-bone error mean '+mean.toFixed(1)+' / p95 '+er[Math.floor(er.length*.95)].toFixed(1)+' / max '+er[er.length-1].toFixed(1)+' deg');
      if(worst>.034){console.log('  FAIL: an action started late');process.exitCode=1}
    }
  }
  console.log(process.exitCode?'LOD TEST FAILED':'LOD test passed');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
