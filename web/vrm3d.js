/* VRM3D (v5_286 He, v5_287 She, v5_291 Night Blade, v5_292 Iron Guardian, v5_293 Storm Archer, v5_294 Spirit Summoner) - the Cultivator avatars are the VRM models Cultivator_He.vrm (gender He) and Cultivator_She.vrm (gender She);
   the Night Blade avatars are NightBlade_He.vrm / NightBlade_She.vrm (v5_291), the Iron Guardian avatars IronGuardian_He.vrm / IronGuardian_She.vrm (v5_292), the Storm Archer avatars StormArcher_He.vrm / StormArcher_She.vrm (v5_293), the Spirit Summoner avatars SpiritSummoner_He.vrm / SpiritSummoner_She.vrm (v5_294).
   A small self-contained VRM 1.0 / glTF-binary loader for the game's Three.js r128 (no GLTFLoader / three-vrm needed).
   What it does:
     - loads web/Cultivator_He.vrm once (shared geometry + textures), builds one skinned copy per rig (own skeleton + materials)
     - shown for  class = Cultivator  (class bits 21-23 = 0): He (look bit 20 = 0) -> Cultivator_He.vrm, She (bit 20 = 1) -> Cultivator_She.vrm
       for  class = Night Blade  (class bits = 1): He -> NightBlade_He.vrm, She -> NightBlade_She.vrm
       for  class = Iron Guardian  (class bits = 2): He -> IronGuardian_He.vrm, She -> IronGuardian_She.vrm
       for  class = Storm Archer  (class bits = 3): He -> StormArcher_He.vrm, She -> StormArcher_She.vrm
       and for  class = Spirit Summoner  (class bits = 4): He -> SpiritSummoner_He.vrm, She -> SpiritSummoner_She.vrm; so all five classes are VRM avatars now (the built-in bodies stay as the fallback)
     - the existing rig keeps doing the animation (walk, attack swing, torso twist, head): pose() copies those angles onto the VRM bones,
       so every attack / move animation of the old avatar works unchanged
     - the armor fire, the aura / halo / shield / ground ring stay the game's own objects; the old body meshes are only taken off the camera layer (not deleted)
     - the avatars hold nothing: the old weapons (sword, daggers, hammer, shield, bow, staff, soul orb) were deleted in v5_296, new ones will be added later
     - if the file cannot be loaded the old procedural avatar simply stays (nothing breaks).   Off switch: add ?vrm=0 to the page address.
   Not used from the VRM: MToon outlines / toon shading (drawn as a lit texture), blend-shape expressions, spring bones, eye look-at. */
(function(){
'use strict';
/* game units per metre: He is 1.77 m with hair -> ~55 units (the old avatar was ~52); She is 1.57 m -> ~48 units, so she is shorter than he by the same ratio as the models */
const MODELS={he:{url:'Cultivator_He.vrm',scale:31},she:{url:'Cultivator_She.vrm',scale:30.5},
  nbhe:{url:'NightBlade_He.vrm',scale:31},nbshe:{url:'NightBlade_She.vrm',scale:30.5},   /* He 1.69 m -> ~52 units, She 1.61 m -> ~49 */
  ighe:{url:'IronGuardian_He.vrm',scale:31},igshe:{url:'IronGuardian_She.vrm',scale:36},   /* Iron Guardian He 1.80 m -> ~56 units; She is a small model (1.31 m) -> 36 units per metre = ~47 tall */
  sahe:{url:'StormArcher_He.vrm',scale:30},sashe:{url:'StormArcher_She.vrm',scale:33.5},   /* Storm Archer He 1.86 m -> ~56 units, She 1.43 m -> ~48 */
  suhe:{url:'SpiritSummoner_He.vrm',scale:31},sushe:{url:'SpiritSummoner_She.vrm',scale:30.5}};   /* Spirit Summoner He 1.80 m -> ~56 units, She 1.61 m -> ~49 */
const HANG=Math.PI/2-.12; /* arms: T-pose -> hanging down (the game's own arm angles are applied on top of this) */
const ELBOW=.3;           /* slight elbow bend (radians) */
const HB=['hips','spine','chest','upperChest','neck','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
let T=null,tmp=null;const TPL={},ST={},PEND={};for(const k in MODELS){ST[k]=0;PEND[k]=[]}   /* per model: ST 0 not started, 1 loading, 2 ready, 3 failed */
const off=typeof location!=='undefined'&&/[?&]vrm=0(&|$)/.test(location.search);

function init(THREE){
  T=THREE;
  tmp={q1:new T.Quaternion(),q2:new T.Quaternion(),q3:new T.Quaternion(),eu:new T.Euler(),X:new T.Vector3(1,0,0),Y:new T.Vector3(0,1,0),Z:new T.Vector3(0,0,1),v:new T.Vector3()};
}

/* ------------------------------------------------------------------ glTF binary parsing */
function parseGLB(buf){
  const dv=new DataView(buf);
  if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not a GLB file');
  let o=12,json=null,bin=null;
  while(o+8<=buf.byteLength){
    const len=dv.getUint32(o,true),typ=dv.getUint32(o+4,true);o+=8;
    if(typ===0x4E4F534A)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,o,len)));
    else if(typ===0x004E4942&&!bin)bin=new Uint8Array(buf,o,len);
    o+=len;
  }
  if(!json||!bin)throw new Error('GLB without JSON / BIN chunk');
  return {json,bin};
}
const CT={5120:[Int8Array,1,'getInt8',127],5121:[Uint8Array,1,'getUint8',255],5122:[Int16Array,2,'getInt16',32767],5123:[Uint16Array,2,'getUint16',65535],5125:[Uint32Array,4,'getUint32',0],5126:[Float32Array,4,'getFloat32',0]};
const NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
/* read accessor i into a tightly packed typed array (handles byteStride and unaligned views) */
function acc(g,i){
  const a=g.json.accessors[i],bv=g.json.bufferViews[a.bufferView],c=CT[a.componentType],n=NC[a.type];
  const dv=new DataView(g.bin.buffer,g.bin.byteOffset,g.bin.byteLength),base=(bv.byteOffset||0)+(a.byteOffset||0),stride=bv.byteStride||c[1]*n,out=new c[0](a.count*n),fn=c[2],norm=a.normalized&&a.componentType!==5126;
  for(let k=0;k<a.count;k++)for(let m=0;m<n;m++){const v=dv[fn](base+k*stride+m*c[1],true);out[k*n+m]=v}
  out.norm=norm?c[3]:0;
  return out;
}

/* ------------------------------------------------------------------ template (shared by all rigs) */
function loadImage(g,texIdx){
  const t=g.json.textures[texIdx],im=g.json.images[t.source],bv=g.json.bufferViews[im.bufferView],s=(bv.byteOffset||0);
  const blob=new Blob([g.bin.subarray(s,s+bv.byteLength)],{type:im.mimeType||'image/png'}),url=URL.createObjectURL(blob);
  return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);res(img)};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('texture decode failed'))};img.src=url});
}
async function build(buf){
  const g=parseGLB(buf),J=g.json;
  /* textures: only the base colour maps are used (the other MToon maps - shade, matcap, rim, outline - are not drawn) */
  const need=new Set();J.materials.forEach(m=>{const b=m.pbrMetallicRoughness&&m.pbrMetallicRoughness.baseColorTexture;if(b)need.add(b.index)});
  g.tex={};
  for(const ti of need){
    const img=await loadImage(g,ti),tx=new T.Texture(img),sp=(J.samplers||[])[J.textures[ti].sampler||0]||{};
    tx.flipY=false;                                   /* glTF UV origin is top-left */
    tx.wrapS=sp.wrapS===33071?T.ClampToEdgeWrapping:sp.wrapS===33648?T.MirroredRepeatWrapping:T.RepeatWrapping;
    tx.wrapT=sp.wrapT===33071?T.ClampToEdgeWrapping:sp.wrapT===33648?T.MirroredRepeatWrapping:T.RepeatWrapping;
    tx.anisotropy=4;tx.needsUpdate=true;g.tex[ti]=tx;
  }
  /* materials (MToon approximated by a lit, textured material; KHR alpha modes kept) */
  g.mats=J.materials.map(m=>{
    const p=m.pbrMetallicRoughness||{},bc=p.baseColorFactor||[1,1,1,1],mat=new T.MeshLambertMaterial({color:new T.Color(bc[0],bc[1],bc[2])});
    if(p.baseColorTexture){const tx=g.tex[p.baseColorTexture.index];mat.map=tx;mat.emissiveMap=tx}
    mat.emissive=new T.Color(.22,.22,.22);            /* keeps the toon-style art readable at night / in shade */
    if(m.alphaMode==='MASK')mat.alphaTest=m.alphaCutoff===undefined?.5:m.alphaCutoff;
    else if(m.alphaMode==='BLEND'){mat.transparent=true;mat.depthWrite=false}
    mat.side=m.doubleSided?T.DoubleSide:T.FrontSide;
    mat.skinning=true;mat.userData.blend=m.alphaMode==='BLEND';
    return mat;
  });
  /* geometry: one BufferGeometry per primitive, vertex attributes shared between primitives that use the same accessor */
  const ac={};
  const attr=(i,mk)=>ac[i]||(ac[i]=mk(acc(g,i)));
  g.geos=J.meshes.map(me=>me.primitives.map(p=>{
    const at=p.attributes,geo=new T.BufferGeometry();
    geo.setAttribute('position',attr(at.POSITION,a=>new T.BufferAttribute(a,3)));
    if(at.NORMAL!==undefined)geo.setAttribute('normal',attr(at.NORMAL,a=>new T.BufferAttribute(a,3)));
    if(at.TEXCOORD_0!==undefined)geo.setAttribute('uv',attr(at.TEXCOORD_0,a=>new T.BufferAttribute(a,2)));
    if(at.JOINTS_0!==undefined)geo.setAttribute('skinIndex',attr(at.JOINTS_0,a=>new T.BufferAttribute(new Uint16Array(a),4)));
    if(at.WEIGHTS_0!==undefined)geo.setAttribute('skinWeight',attr(at.WEIGHTS_0,a=>{
      const w=new Float32Array(a.length);
      for(let k=0;k<a.length;k+=4){let s=0;for(let m=0;m<4;m++){w[k+m]=a.norm?a[k+m]/a.norm:a[k+m];s+=w[k+m]}if(s>0)for(let m=0;m<4;m++)w[k+m]/=s;else w[k]=1}
      return new T.BufferAttribute(w,4)}));
    if(p.indices!==undefined){const ix=acc(g,p.indices);let mx=0;for(let k=0;k<ix.length;k++)if(ix[k]>mx)mx=ix[k];geo.setIndex(new T.BufferAttribute(mx<65535?new Uint16Array(ix):ix,1))}
    geo.computeBoundingSphere();
    return geo;
  }));
  g.ibm=J.skins.map(s=>s.inverseBindMatrices===undefined?null:acc(g,s.inverseBindMatrices));
  g.joint=new Set();J.skins.forEach(s=>s.joints.forEach(j=>g.joint.add(j)));
  return g;
}

/* ------------------------------------------------------------------ one skinned copy per rig */
function instance(key){
  const g=TPL[key],SCALE=MODELS[key].scale,J=g.json,N=J.nodes;
  const objs=N.map((n,i)=>{
    const o=g.joint.has(i)?new T.Bone():new T.Object3D();o.name=n.name||('n'+i);
    if(n.matrix){new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale)}
    else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}
    return o;
  });
  N.forEach((n,i)=>(n.children||[]).forEach(c=>objs[i].add(objs[c])));
  const root=new T.Group();root.name='vrm';
  J.scenes[J.scene||0].nodes.forEach(i=>root.add(objs[i]));
  root.updateMatrixWorld(true);
  const skels=J.skins.map((s,k)=>{
    const bones=s.joints.map(j=>objs[j]),inv=g.ibm[k]?bones.map((b,m)=>new T.Matrix4().fromArray(g.ibm[k],16*m)):undefined;
    return new T.Skeleton(bones,inv);
  });
  const mats=[],meshes=[];
  N.forEach((n,i)=>{
    if(n.mesh===undefined)return;
    J.meshes[n.mesh].primitives.forEach((p,pi)=>{
      const mat=g.mats[p.material||0].clone();mat.skinning=true;mat.userData={blend:g.mats[p.material||0].userData.blend};mats.push(mat);
      const sk=n.skin!==undefined,m=sk?new T.SkinnedMesh(g.geos[n.mesh][pi],mat):new T.Mesh(g.geos[n.mesh][pi],mat);
      m.name=(N[i].name||'mesh')+'_'+pi;m.frustumCulled=false;if(mat.userData.blend)m.renderOrder=2;
      objs[i].add(m);meshes.push([m,sk?n.skin:-1]);
    });
  });
  root.updateMatrixWorld(true);
  for(const [m,s] of meshes)if(s>=0)m.bind(skels[s],m.matrixWorld);
  /* humanoid bones: rest world rotation of the node and of its parent. A bone's local rotation for a pose delta d (given in the
     "T-pose = identity" frame, like VRM normalized bones) is   local = parentRestWorld^-1 * d * restWorld   (works for any rest rotations) */
  const hum=J.extensions.VRMC_vrm.humanoid.humanBones,bones={},rest={},wq=new T.Quaternion(),wp=new T.Vector3();
  for(const k of HB){
    const h=hum[k];if(!h)continue;const o=objs[h.node];bones[k]=o;
    const w=o.getWorldQuaternion(new T.Quaternion()),pw=o.parent?o.parent.getWorldQuaternion(new T.Quaternion()):new T.Quaternion();
    rest[k]={w,pInv:pw.invert()};
  }
  /* which side is +X? (the game's right arm / right leg are on +X; in VRM 1.0 the character's left is +X) */
  bones.leftUpperArm.getWorldPosition(wp);
  const plus=wp.x>=0?'left':'right',minus=plus==='left'?'right':'left';
  root.scale.setScalar(SCALE);
  return {key,scale:SCALE,root,bones,rest,plus,minus,mats,skels,fk:-1};
}

/* ------------------------------------------------------------------ attach / detach on a rig */
function procList(R){
  if(R.vrmHid)return R.vrmHid;                       /* built before the first VRM root is added to R.body */
  const keep=new Set([R.ogl,R.ogb,R.ofire]),list=[];   /* v5_288 the armor-level cape (and shoulder pads) are hidden on the VRM */
  (function w(o){if(keep.has(o))return;if(o.isMesh||o.isSprite||o.isPoints||o.isLine)list.push(o);for(const c of o.children)w(c)})(R.body);
  return R.vrmHid=list;
}
function enable(R,key){
  if(R.vrmOn&&R.vrmKey===key)return;
  if(R.vrmOn)disable(R);                             /* He <-> She switch: hide the other model */
  const hid=procList(R);
  R.vrms=R.vrms||{};
  if(!R.vrms[key]){
    const v=R.vrms[key]=instance(key);R.body.add(v.root);
    v.mats.forEach((m,i)=>{R.m['vrm'+key+i]=m});
    R.m['vrmSkel'+key]={dispose(){try{v.skels.forEach(s=>s.dispose&&s.dispose())}catch(e){}}};
  }
  const v=R.vrm=R.vrms[key];R.vrmKey=key;
  hid.forEach(o=>o.layers.set(1));                   /* layer 1 is never drawn: the old body is hidden, not destroyed */
  v.root.visible=true;
  R.vrmOn=true;
}
function disable(R){
  if(R.vrmHid)R.vrmHid.forEach(o=>o.layers.set(0));
  if(R.vrm){
    R.vrm.root.visible=false;
  }
  R.vrmOn=false;
}
function load(key){
  if(ST[key])return;ST[key]=1;
  fetch(MODELS[key].url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()}).then(build).then(g=>{
    TPL[key]=g;ST[key]=2;const list=PEND[key];PEND[key]=[];
    for(const R of list){R.vrmPend=null;if(R.vrmWant===key&&!(R.vrmOn&&R.vrmKey===key)){try{enable(R,key)}catch(e){console.warn('VRM avatar: '+e.message)}}}
  }).catch(e=>{ST[key]=3;PEND[key]=[];console.warn('VRM avatar ('+key+') not available, using the built-in avatar: '+(e&&e.message||e))});
}
/* called at the end of AL3D.setSkin: key = 'he' / 'she' (Cultivator), 'nbhe' / 'nbshe' (Night Blade), 'ighe' / 'igshe' (Iron Guardian), 'sahe' / 'sashe' (Storm Archer), 'suhe' / 'sushe' (Spirit Summoner) */
function sync(R,key){
  R.vrmWant=key||null;
  if(!key||!T||off||ST[key]===3){if(R.vrmOn)disable(R);return}
  if(ST[key]===2){try{enable(R,key)}catch(e){console.warn('VRM avatar: '+e.message);ST[key]=3;if(R.vrmOn)disable(R)}}
  else{
    if(R.vrmOn)disable(R);                           /* show the built-in body until the model has been loaded */
    if(R.vrmPend!==key){R.vrmPend=key;PEND[key].push(R)}
    load(key);
  }
}

/* ------------------------------------------------------------------ animation: copy the old rig's angles onto the VRM bones */
function setB(v,name,d){const b=v.bones[name];if(!b)return;const r=v.rest[name];b.quaternion.copy(r.pInv).multiply(d).multiply(r.w)}
function pose(R,P){
  const v=R.vrm,t=tmp,tr=R.torso.rotation,hd=R.head.rotation;
  t.eu.set(tr.x*.4,tr.y*.4,0);setB(v,'spine',t.q1.setFromEuler(t.eu));
  t.eu.set(tr.x*.3,tr.y*.3,0);t.q1.setFromEuler(t.eu);setB(v,'chest',t.q1);setB(v,'upperChest',t.q1);
  t.eu.set(hd.x,hd.y,0);setB(v,'head',t.q1.setFromEuler(t.eu));
  for(const [arm,sx,side] of [[R.armR,1,v.plus],[R.armL,-1,v.minus]]){
    t.q1.setFromEuler(arm.rotation);t.q2.setFromAxisAngle(t.Z,-sx*HANG);t.q1.multiply(t.q2);setB(v,side+'UpperArm',t.q1);
    t.q3.setFromAxisAngle(t.Y,-sx*ELBOW);setB(v,side+'LowerArm',t.q3);
  }
  for(const [leg,side] of [[R.legR,v.plus],[R.legL,v.minus]]){
    const a=leg.rotation.x;t.q1.setFromAxisAngle(t.X,a);setB(v,side+'UpperLeg',t.q1);
    t.q2.setFromAxisAngle(t.X,Math.max(0,a)*.9+Math.abs(a)*.15+.04);setB(v,side+'LowerLeg',t.q2);   /* knee bends on the back swing */
  }
  const k=P.hurt>0?2:P.bfT>0?1:0;                    /* hurt flash (red) / burning (amber), like the old body */
  if(k!==v.fk){v.fk=k;const c=k===2?[.62,.12,.12]:k===1?[.45,.28,.1]:[.22,.22,.22];v.mats.forEach(m=>m.emissive.setRGB(c[0],c[1],c[2]))}
}

window.VRM3D={init,sync,pose,parseGLB,isReady:k=>ST[k||'he']===2,_build:(k,b)=>build(b).then(g=>{TPL[k]=g;ST[k]=2;return g}),_instance:k=>instance(k)};
})();
