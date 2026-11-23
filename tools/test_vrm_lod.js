// v5_331 VRM3D.pose() with the animation level of detail, using the real vrm3d.js + anim3d.js and a bare three.js stand-in.   node tools/test_vrm_lod.js
// checks: (1) with clips, the old procedural pose is NOT computed (it was overwritten anyway) (2) without clips (?anim=0 / still loading) it is the fallback
//         (3) a skipped frame (R.lodS) writes no bone but still does the cheap tail: hurt flash + weapon on the back / in hand (4) a busy rig is never skipped
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Quat{constructor(){this.x=0;this.y=0;this.z=0;this.w=1}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}
  copy(q){this.x=q.x;this.y=q.y;this.z=q.z;this.w=q.w;return this}multiply(){return this}invert(){return this}slerp(){return this}clone(){return new Quat().copy(this)}
  setFromEuler(){return this}setFromAxisAngle(){return this}fromArray(){return this}}
class Vec{constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0}}
const TH={Quaternion:Quat,Euler:class{set(){return this}},Vector3:Vec};
const W=__dirname+'/../web/';
function env(noAnim){
  const win={THREE:TH,location:{search:noAnim?'?anim=0':''},console,fetch:async(u)=>{const b=fs.readFileSync(W+u);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}};
  win.window=win;vm.createContext(win);
  vm.runInContext(fs.readFileSync(W+'anim3d.js','utf8'),win);vm.runInContext(fs.readFileSync(W+'vrm3d.js','utf8'),win);
  win.VRM3D.init(TH);return win;
}
const BN=['hips','spine','chest','upperChest','neck','head','leftShoulder','leftUpperArm','leftLowerArm','leftHand','rightShoulder','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
function rig(){
  const writes={};let n=0;
  const mkb=name=>({quaternion:{copy(){writes[name]=(writes[name]|0)+1;n++;return this},multiply(){return this}},position:{set(){}}});
  const rest=Object.fromEntries(BN.map(k=>[k,{pInv:new Quat(),w:new Quat()}]));
  const v={bones:Object.fromEntries(BN.map(k=>[k,mkb(k)])),rest,plus:'right',minus:'left',scale:31,hipsRest:{x:0,y:1,z:0},mats:[{emissive:{r:0,setRGB(a,b,c){this.r=a}}}],fk:0,key:'x',wpn:[{hand:{visible:false},carry:{visible:true}}],wOut:false};
  const eul=()=>({x:0,y:0,z:0}),R={vrm:v,cls:0,lt:0,dtA:1/60,body:{position:{y:0}},torso:{rotation:eul()},head:{rotation:eul()},armR:{rotation:eul()},armL:{rotation:eul()},legR:{rotation:eul()},legL:{rotation:eul()}};
  return {R,v,writes,count:()=>n,reset:()=>{n=0;for(const k in writes)delete writes[k]}};
}
(async()=>{
  // 1 + 3 + 4: clips ready
  let w=env(false);await w.ANIM3D.load();assert(w.ANIM3D.ready());
  let r=rig(),P={mvAmt:1,anim:0,swing:0,hurt:0};
  w.VRM3D.pose(r.R,P);
  assert.strictEqual(r.count(),20,'with clips every bone is written exactly once (was 20 + 14 procedural writes before v5_331), got '+r.count());
  console.log('ok 1: clips ready -> 20 bone writes per pose (no procedural pass)');
  r.R.lodS=3;r.R.lodO=0;let posed=0,t=0;P.mvAmt=1;
  const ys=new Set();
  for(let f=0;f<30;f++){t+=1/60;r.R.lt=t;r.reset();P.anim+=3.3*.07;r.R.body.position.y=.7;   // animPlayer writes its procedural bob every frame
    w.VRM3D.pose(r.R,P);if(r.count())posed++;ys.add(r.R.body.position.y)}
  assert.strictEqual(ys.size,1,'body height must be the same on posed and skipped frames (else the avatar shivers), got '+[...ys]);
  console.log('ok 3c: body height identical on posed and skipped frames');
  assert(posed>=9&&posed<=12,'stride 3 poses every 3rd frame, got '+posed+'/30');
  console.log('ok 3a: stride 3 -> posed '+posed+' of 30 frames');
  // skipped frame still flashes on a hit? a hit is busy -> posed at once; check the tail on a quiet skipped frame: weapon state change
  r.reset();r.R.wOut=true;let sk=0;for(let f=0;f<3&&!sk;f++){t+=1/60;r.R.lt=t;r.reset();w.VRM3D.pose(r.R,P);if(!r.count())sk=1}
  assert(r.v.wpn[0].hand.visible===true,'weapon drawn on a skipped frame (tail runs every frame)');
  console.log('ok 3b: weapon drawn on a frame whose pose was skipped');
  P.hurt=.2;t+=1/60;r.R.lt=t;r.reset();w.VRM3D.pose(r.R,P);
  assert(r.count()===20&&r.v.mats[0].emissive.r>.5,'a hit is never skipped and flashes red');
  console.log('ok 4: hit frame is posed at once (busy), flash on');
  // 2: no clips
  w=env(true);await w.ANIM3D.load();assert(!w.ANIM3D.ready());
  r=rig();w.VRM3D.pose(r.R,{mvAmt:0,anim:0});
  assert(r.count()===14,'fallback: procedural pose writes 14 bones, got '+r.count());
  console.log('ok 2: ?anim=0 -> procedural fallback writes its 14 bones');
  console.log('VRM LOD test passed');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
