/* VRM3D (v5_317 weapons, v5_286 He, v5_287 She, v5_291 Night Blade, v5_292 Iron Guardian, v5_293 Storm Archer, v5_294 Spirit Summoner) - the Cultivator avatars are the VRM models Cultivator_He.vrm (gender He) and Cultivator_She.vrm (gender She);
   the Night Blade avatars are NightBlade_He.vrm / NightBlade_She.vrm (v5_291), the Iron Guardian avatars IronGuardian_He.vrm / IronGuardian_She.vrm (v5_292), the Storm Archer avatars StormArcher_He.vrm / StormArcher_She.vrm (v5_293), the Spirit Summoner avatars SpiritSummoner_He.vrm / SpiritSummoner_She.vrm (v5_294).
   A small self-contained VRM 1.0 / glTF-binary loader for the game's Three.js r128 (no GLTFLoader / three-vrm needed).
   What it does:
     - loads web/Cultivator_He.vrm once (shared geometry + textures), builds one skinned copy per rig (own skeleton + materials)
     - shown for  class = Cultivator  (class bits 21-23 = 0): He (look bit 20 = 0) -> Cultivator_He.vrm, She (bit 20 = 1) -> Cultivator_She.vrm
       for  class = Night Blade  (class bits = 1): He -> NightBlade_He.vrm, She -> NightBlade_She.vrm
       for  class = Iron Guardian  (class bits = 2): He -> IronGuardian_He.vrm, She -> IronGuardian_She.vrm
       for  class = Storm Archer  (class bits = 3): He -> StormArcher_He.vrm, She -> StormArcher_She.vrm
       and for  class = Spirit Summoner  (class bits = 4): He -> SpiritSummoner_He.vrm, She -> SpiritSummoner_She.vrm; so all five classes are VRM avatars (v5_300: the old built-in bodies are deleted, there is no fallback body)
     - the existing rig keeps doing the animation (walk, attack swing, torso twist, head): pose() copies those angles onto the VRM bones,
       so every attack / move animation of the old avatar works unchanged
     - the armor fire, the aura / halo / shield / ground ring stay the game's own objects; the rig in models3d.js is now only joints (v5_300), so there is no old body mesh left to hide
     - v5_317 every class holds its weapon again (new models in web/weapons/*.glb): Cultivator = sword, Night Blade = two daggers, Iron Guardian = hammer, Storm Archer = bow (left hand, arrow nocked), Spirit Summoner = staff.
       They are mounted on the VRM hand bones, so they follow every walk / attack / cast / dodge animation. Sizes, grip points and hold angles: WSPEC below.
     - if a file cannot be loaded the character is simply not drawn (v5_300: no built-in body to fall back to); aura, shadow, armor fire still show.   ?vrm=0 hides every avatar.
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
const HB=['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
let T=null,tmp=null;const TPL={},ST={},PEND={};for(const k in MODELS){ST[k]=0;PEND[k]=[]}   /* per model: ST 0 not started, 1 loading, 2 ready, 3 failed */
const off=typeof location!=='undefined'&&/[?&]vrm=0(&|$)/.test(location.search);

/* ------------------------------------------------------------------ v5_317 WEAPONS
   One GLB per weapon (web/weapons/). Model units are metres, like the avatars, so  s  is a plain size factor (the root's SCALE then turns metres into game units).
     s      size factor        g  grip point in the weapon's own coordinates (metres, before s): this point sits in the fist
     hands  'r' = the game's right hand (+X side, the one that swings on an attack), 'l' = the left hand
     pitch  tilt of the weapon's long axis from straight up towards the front (rad), seen with the arm hanging down at rest
     spin   turn about the weapon's own long axis (rad): puts the blade's flat side to the side and the head's striking face to the front
     yaw    (optional) turn the tip outwards, away from the body (rad; mirrored for the left hand)
     back   where the weapon rides on the BACK while the character is not fighting (one entry per hand):
              bone = spine bone it hangs from,  pos = [x,y,z] metres from that bone in the character frame (+Y up, +Z front, so -Z is behind),
              rot  = [rx,ry,rz] turn (rad, applied as Rz*Ry*Rx) that puts the weapon from its model pose (long axis up, flat side to the front) into the carried pose,
              g    (optional) the point of the model that sits at pos, default = the grip point,  shoulder = pos[1] is measured up from the avatar's shoulder joint, not from the bone,  noArrow = hide the nocked arrow while carried */
const WSPEC={
  sword :{url:'weapons/Sword.glb', s:1.3, g:[0,.106,0],   hands:['r'],     pitch:1.15,spin:Math.PI/2,
    back:[{bone:'chest',pos:[.08,.03,-.15],rot:[Math.PI,0,-.6],g:[0,.106,0],shoulder:true}]},   /* diagonal across the back, the grip level with the shoulder (pos y is measured from the shoulder height), tip down at the left hip */
  dagger:{url:'weapons/Dagger.glb',s:.26, g:[0,.40,0],    hands:['r','l'], pitch:1.75,spin:Math.PI/2,yaw:.12,
    back:[{bone:'spine',pos:[0,0,-.16],rot:[0,0,Math.PI/2-.3],g:[0,1.0,0]},{bone:'spine',pos:[0,0,-.185],rot:[0,0,-(Math.PI/2-.3)],g:[0,1.0,0]}]},   /* two daggers crossed at the small of the back, hilts outside */
  hammer:{url:'weapons/Hammer.glb',s:1.25,g:[0,.22,0],    hands:['r'],     pitch:.85, spin:Math.PI/2,
    back:[{bone:'chest',pos:[0,-.25,-.2],rot:[0,0,-.35],g:[0,.45,0]}]},
  bow   :{url:'weapons/Bow.glb',   s:.9697, g:[-.10,.67,0], hands:['l'],     pitch:.08, spin:-Math.PI/2, lock:.85,
    ref:{leftHand:[-0.5583,-0.3383,-0.7346,0.1849],rightHand:[-0.5488,0.5395,0.4688,0.4335]},   /* v5_323 hand pose of Pistol_Idle_Loop (the archer's aim): the bow is upright with the arrow forward there. v5_325 s = .9697: Bow.glb is 1.3406 m tall at s = 1, so the bow is now 1.30 m tall (was s 1.1 = 1.47 m) */
    back:[{bone:'chest',pos:[0,-.2,-.17],rot:[0,Math.PI/2,-.5],noArrow:true}]},   /* the bow shoots along its +X: spin -90 deg turns that to the front */
  staff :{url:'weapons/Staff.glb', s:.95, g:[0,.80,0],    hands:['r'],     pitch:.3,  spin:0, lock:.85,
    ref:{leftHand:[-0.3184,-0.7247,0.0642,0.6078],rightHand:[-0.1681,-0.0711,0.4513,0.8735]},   /* v5_323 hand pose of Spell_Simple_Idle_Loop (the summoner's casting stance) */
    back:[{bone:'chest',pos:[0,-.2,-.16],rot:[0,0,-.35]}]}};
const WOF={he:'sword',she:'sword',nbhe:'dagger',nbshe:'dagger',ighe:'hammer',igshe:'hammer',sahe:'bow',sashe:'bow',suhe:'staff',sushe:'staff'};   /* model key -> weapon */
/* v5_323 BOW DRAW (Storm Archer). Solved offline per model (see CHANGELOG v5_323): at full draw the chest is turned th rad (side-on, the head stays on the target),
   the draw hand (game right, v.plus) holds the nock pulled back by pull metres, the bow hand (v.minus) keeps the bow where it was.
   u / l = the arm's UPPER ARM / LOWER ARM turn from the T-pose (accumulated, like D in lockWeapon) at full draw; the hand keeps the turn it has in the clip. */
const DRAW={
sahe:{th:0.7,pull:0.13,p:{u:[-0.0461,-0.8351,-0.3904,-0.3848],l:[-0.4412,-0.2007,-0.8559,0.1805]},m:{u:[0.3534,0.6214,0.1114,0.6903],l:[-0.3797,0.744,0.0732,0.545]}},
  sashe:{th:0.7,pull:0.075,p:{u:[0.1405,-0.6311,-0.5722,-0.5045],l:[-0.5051,0.1149,-0.8551,0.0227]},m:{u:[0.2589,0.6397,0.0646,0.7209],l:[-0.3708,0.7225,0.1194,0.5712]}}};
const WTPL={},WPRM={};   /* per weapon: the built template (a node tree that is cloned for every rig) and the promise of its load */

function init(THREE){
  T=THREE;if(window.ANIM3D)ANIM3D.init(THREE);
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

/* v5_310 the avatars store vertex data quantized (tools/quant_vrm.py): normalized ints are turned back into floats here; with an accessor that has min / max
   (POSITION) the unsigned 0..1 value is stretched over that box. Plain float data passes through untouched. */
function dq(a,acr){
  const o=new Float32Array(a.length),n=a.norm,mn=acr&&acr.min,mx=acr&&acr.max;
  if(mn&&mx){for(let k=0;k<a.length;k++){const c=k%3;o[k]=mn[c]+a[k]/n*(mx[c]-mn[c])}}
  else for(let k=0;k<a.length;k++)o[k]=Math.max(-1,a[k]/n);
  return o;
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
    geo.setAttribute('position',attr(at.POSITION,a=>new T.BufferAttribute(a.norm?dq(a,g.json.accessors[at.POSITION]):a,3)));
    if(at.NORMAL!==undefined)geo.setAttribute('normal',attr(at.NORMAL,a=>new T.BufferAttribute(a.norm?dq(a):a,3)));
    if(at.TEXCOORD_0!==undefined)geo.setAttribute('uv',attr(at.TEXCOORD_0,a=>new T.BufferAttribute(a.norm?dq(a):a,2)));
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

/* ------------------------------------------------------------------ weapon templates (v5_317) */
/* Weapon GLBs are plain meshes (no skin): vertex colours (COLOR_0) or, for the dagger, one palette texture. Parts whose glTF material has the clearcoat
   extension are the glowing crystals: they are drawn unlit (full colour). Vertex colours are linear in glTF; the game draws without colour management, so they are lifted to sRGB here. */
async function buildWeapon(buf){
  const g=parseGLB(buf),J=g.json,tex={};
  for(const m of J.materials||[]){
    const b=m.pbrMetallicRoughness&&m.pbrMetallicRoughness.baseColorTexture;
    if(!b||tex[b.index])continue;
    const img=await loadImage(g,b.index),tx=new T.Texture(img);
    tx.flipY=false;tx.wrapS=tx.wrapT=T.RepeatWrapping;
    tx.magFilter=tx.minFilter=T.NearestFilter;tx.generateMipmaps=false;   /* a small colour palette: no blur between swatches */
    tx.needsUpdate=true;tex[b.index]=tx;
  }
  const mats={},matOf=(mi,vc)=>{
    const k=mi+':'+vc;if(mats[k])return mats[k];
    const m=J.materials[mi]||{},p=m.pbrMetallicRoughness||{},bc=p.baseColorFactor||[1,1,1,1],crystal=!!(m.extensions&&m.extensions.KHR_materials_clearcoat);
    let mat;
    if(crystal&&vc)mat=new T.MeshBasicMaterial({vertexColors:true});
    else{
      mat=new T.MeshLambertMaterial(vc?{vertexColors:true}:{color:new T.Color(bc[0],bc[1],bc[2])});
      mat.emissive=new T.Color(.16,.16,.17);          /* keeps the art readable at night / in shade, like the avatars */
      if(p.baseColorTexture){const tx=tex[p.baseColorTexture.index];mat.map=tx;mat.emissiveMap=tx;mat.emissive.setRGB(.3,.3,.3)}
    }
    mat.side=m.doubleSided?T.DoubleSide:T.FrontSide;
    return mats[k]=mat;
  };
  const geos=J.meshes.map(me=>me.primitives.map(p=>{
    const at=p.attributes,geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(acc(g,at.POSITION),3));
    if(at.NORMAL!==undefined)geo.setAttribute('normal',new T.BufferAttribute(acc(g,at.NORMAL),3));
    if(at.TEXCOORD_0!==undefined)geo.setAttribute('uv',new T.BufferAttribute(acc(g,at.TEXCOORD_0),2));
    if(at.COLOR_0!==undefined){
      const a=acc(g,at.COLOR_0),n=NC[J.accessors[at.COLOR_0].type],c=new Float32Array(a.length/n*3);
      for(let k=0;k<a.length/n;k++)for(let m=0;m<3;m++){const v=a.norm?a[k*n+m]/a.norm:a[k*n+m];c[k*3+m]=Math.pow(Math.max(0,v),1/2.2)}
      geo.setAttribute('color',new T.BufferAttribute(c,3));
    }
    if(p.indices!==undefined){const ix=acc(g,p.indices);let mx=0;for(let k=0;k<ix.length;k++)if(ix[k]>mx)mx=ix[k];geo.setIndex(new T.BufferAttribute(mx<65535?new Uint16Array(ix):ix,1))}
    geo.computeBoundingSphere();
    return geo;
  }));
  const N=J.nodes,objs=N.map(n=>{
    const o=new T.Object3D();o.name=n.name||'';
    if(n.matrix){new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale)}
    else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}
    return o;
  });
  N.forEach((n,i)=>{
    (n.children||[]).forEach(c=>objs[i].add(objs[c]));
    if(n.mesh!==undefined)J.meshes[n.mesh].primitives.forEach((p,pi)=>{
      const m=new T.Mesh(geos[n.mesh][pi],matOf(p.material||0,p.attributes.COLOR_0!==undefined));m.frustumCulled=false;objs[i].add(m)});
  });
  const root=new T.Group();root.name='weapon';
  J.scenes[J.scene||0].nodes.forEach(i=>root.add(objs[i]));
  return root;
}
/* loads a weapon once; never rejects: if the file is missing the avatar is simply drawn without it */
function loadWeapon(name){
  if(!name||!WSPEC[name])return Promise.resolve(null);
  if(WPRM[name])return WPRM[name];
  return WPRM[name]=fetch(WSPEC[name].url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()}).then(buildWeapon).then(t=>(WTPL[name]=t)).catch(e=>{
    console.warn('VRM weapon ('+name+') not available: '+(e&&e.message||e));return null});
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
  return {key,scale:SCALE,root,bones,rest,plus,minus,mats,skels,fk:-1,hipsRest:bones.hips.position.clone()};   /* v5_322 hipsRest: the clips move the hips from here */
}

/* ------------------------------------------------------------------ mounting the weapon on the hands (v5_317)
   pose() turns an arm by d1 (upper arm) * d2 (elbow) in the "T-pose = identity" frame, so the hand's world rotation is  d1*d2*restWorld(hand).
   m0 is a child of the hand bone turned back by restWorld(hand): its axes are the T-pose axes, moved by d1*d2 only (T-frame: +X along the arm towards the fingers, +Y outwards when the arm hangs, +Z to the front).
   m1 turns the weapon so that, with the arm at its idle pose (arm swing -.15, the resting angles of pose()), the weapon has exactly the hold angle of WSPEC in the character's frame. */
function mountWeapons(v,key){
  const name=WOF[key],spec=WSPEC[name],tpl=WTPL[name];
  if(!spec||!tpl)return;
  const q=(ax,a)=>new T.Quaternion().setFromAxisAngle(ax,a),X=tmp.X,Y=tmp.Y,Z=tmp.Z;
  v.wpn=[];
  for(const hand of spec.hands){
    const sx=hand==='r'?1:-1,side=hand==='r'?v.plus:v.minus,hb=v.bones[side+'Hand'],rs=v.rest[side+'Hand'];
    if(!hb||!rs)continue;
    const rf=spec.ref&&spec.ref[side+'Hand'];
    const d=rf?new T.Quaternion(rf[0],rf[1],rf[2],rf[3]):new T.Quaternion().setFromEuler(new T.Euler(-.15,0,sx*.1)).multiply(q(Z,-sx*HANG)).multiply(q(Y,-sx*ELBOW));   /* the hand pose the hold is defined in: v5_323 the clip pose of the class (spec.ref), else the old procedural idle pose of pose() */
    const hold=q(Y,sx*(spec.yaw||0)).multiply(q(X,spec.pitch||0)).multiply(q(Y,spec.spin||0));                            /* wanted weapon orientation in the character frame */
    const m0=new T.Object3D(),m1=new T.Object3D(),w=tpl.clone(true);
    m0.name='wpnMount'+hand;m0.quaternion.copy(rs.w).invert();
    m1.quaternion.copy(d.invert().multiply(hold));
    m1.position.set(sx*.055,0,.01);                      /* the middle of the fist, a little past the wrist along the arm */
    w.scale.setScalar(spec.s);w.position.set(-spec.g[0]*spec.s,-spec.g[1]*spec.s,-spec.g[2]*spec.s);
    m1.add(w);m0.add(m1);hb.add(m0);
    let arrow=null,strs=null;
    if(name==='bow'&&DRAW[key]){   /* v5_323 the nocked arrow slides back and a V-shaped string is drawn from the limb tips to the nock while the bow is drawn */
      const fn=(o,n)=>{if(o.name===n)return o;for(const c of o.children){const r=fn(c,n);if(r)return r}return null};
      arrow=fn(w,'arrow');const base=fn(w,'bow-base')||w;
      if(!STR.geo){STR.geo=new T.BoxGeometry(1,1,1);STR.mat=new T.MeshBasicMaterial({color:0xe9e2cc});STR.up=new T.Vector3(0,1,0);STR.a=new T.Vector3();STR.b=new T.Vector3()}
      strs=[0,1].map(()=>{const m=new T.Mesh(STR.geo,STR.mat);m.frustumCulled=false;m.visible=false;base.add(m);return m});
    }
    /* the carried copy on the back: same idea, hung on a spine bone (m0 turned back by the bone's rest rotation = T-pose axes) */
    const bk=spec.back&&spec.back[v.wpn.length];
    let carry=null;
    if(bk){
      const bn=v.bones[bk.bone]?bk.bone:'spine',bb=v.bones[bn],br=v.rest[bn];
      if(bb&&br){
        const c0=new T.Object3D(),c1=new T.Object3D(),cw=tpl.clone(true),gg=bk.g||spec.g;
        c0.name='wpnCarry'+hand;c0.quaternion.copy(br.w).invert();
        c1.quaternion.copy(q(Z,bk.rot[2])).multiply(q(Y,bk.rot[1])).multiply(q(X,bk.rot[0]));
        let py=bk.pos[1];
        if(bk.shoulder&&v.bones[v.plus+'UpperArm']){   /* height of the shoulder joint above the bone, in metres (root space) */
          v.root.updateMatrixWorld(true);const a=new T.Vector3(),b=new T.Vector3();
          v.bones[v.plus+'UpperArm'].getWorldPosition(a);bb.getWorldPosition(b);v.root.worldToLocal(a);v.root.worldToLocal(b);py+=a.y-b.y}
        c1.position.set(bk.pos[0],py,bk.pos[2]);
        cw.scale.setScalar(spec.s);cw.position.set(-gg[0]*spec.s,-gg[1]*spec.s,-gg[2]*spec.s);
        if(bk.noArrow)(function f(o){if(o.name==='arrow')o.visible=false;o.children.forEach(f)})(cw);
        c1.add(cw);c0.add(c1);bb.add(c0);carry=c0;
      }
    }
    m0.visible=false;if(carry)carry.visible=true;     /* start sheathed; pose() swaps them */
    const chain=['hips','spine','chest','upperChest',side+'Shoulder',side+'UpperArm',side+'LowerArm',side+'Hand'].filter(n=>v.bones[n]&&v.rest[n]).map(n=>({b:v.bones[n],p:v.rest[n].pInv.clone().invert(),wi:v.rest[n].w.clone().invert()}));
    v.wpn.push({hand:m0,carry:carry,arrow:arrow,strs:strs,bow:w,m1:m1,hold:hold,fol:m1.quaternion.clone(),lock:spec.lock||0,chain:chain});
  }
  v.wOut=false;
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
    const v=R.vrms[key]=instance(key);(R.rollG||R.body).add(v.root);   /* v5_304 rollG = dodge roll / dive tilt group */
    try{mountWeapons(v,key)}catch(e){console.warn('VRM weapon: '+e.message)}   /* v5_317 */
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
const PRM={};   /* v5_309 per model: the promise of its load, so preloadAll can wait for it */
function load(key){
  if(ST[key])return PRM[key];ST[key]=1;
  /* v5_317 the avatar's weapon is fetched with it (preloadAll therefore waits for the weapons too); a weapon that fails to load never fails the avatar */
  return PRM[key]=Promise.all([fetch(MODELS[key].url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()}).then(build),loadWeapon(WOF[key])]).then(r=>r[0]).then(g=>{
    TPL[key]=g;ST[key]=2;const list=PEND[key];PEND[key]=[];
    for(const R of list){R.vrmPend=null;if(R.vrmWant===key&&!(R.vrmOn&&R.vrmKey===key)){try{enable(R,key)}catch(e){console.warn('VRM avatar: '+e.message)}}}
    return true;
  }).catch(e=>{ST[key]=3;PEND[key]=[];console.warn('VRM avatar ('+key+') not available, using the built-in avatar: '+(e&&e.message||e));return false});
}
/* v5_309 preloadAll(onProgress): loads every avatar (all 5 classes, He + She) and resolves with the list of keys that failed ([] = all ready).
   Failed models are retried by calling it again. onProgress(done,total) is called after each model. With ?vrm=0 nothing is loaded. */
function preloadAll(onProgress){
  const keys=Object.keys(MODELS),total=keys.length;let done=0;
  if(off||!T){if(onProgress)onProgress(total,total);return Promise.resolve([])}
  return Promise.all(keys.map(k=>{
    if(ST[k]===3){ST[k]=0;delete PRM[k]}              /* retry a model that failed before */
    return Promise.resolve(load(k)).then(ok=>{done++;if(onProgress)onProgress(done,total);return ok?null:k});
  }).concat([window.ANIM3D?Promise.resolve(ANIM3D.load()).then(()=>null):Promise.resolve(null)])).then(r=>r.filter(Boolean));   /* v5_322 + the animation pack (never fails the load: without it the built-in moves are used) */
}
/* called at the end of AL3D.setSkin: key = 'he' / 'she' (Cultivator), 'nbhe' / 'nbshe' (Night Blade), 'ighe' / 'igshe' (Iron Guardian), 'sahe' / 'sashe' (Storm Archer), 'suhe' / 'sushe' (Spirit Summoner) */
function sync(R,key){
  R.vrmWant=key||null;
  if(!key||!T||off||ST[key]===3){if(R.vrmOn)disable(R);return}
  if(ST[key]===2){try{enable(R,key)}catch(e){console.warn('VRM avatar: '+e.message);ST[key]=3;if(R.vrmOn)disable(R)}}
  else{
    if(R.vrmOn)disable(R);                           /* nothing is drawn for this rig until its model has been loaded */
    if(R.vrmPend!==key){R.vrmPend=key;PEND[key].push(R)}
    load(key);
  }
}

/* ------------------------------------------------------------------ v5_323 bow draw
   Works in the same frame as lockWeapon: d(bone) = the bone's turn from the T-pose = parentRestWorld * localRotation * restWorld^-1. */
const STR={};
function dInfo(v,n){const c=v.dinfo||(v.dinfo={});if(c[n])return c[n];const r=v.rest[n],b=v.bones[n];if(!r||!b)return null;return c[n]={b,p:r.pInv.clone().invert(),wi:r.w.clone().invert()}}
function dGet(v,n){const i=dInfo(v,n);return i?i.p.clone().multiply(i.b.quaternion).multiply(i.wi):null}
function drawPose(v,w,cfg){
  const dc={},Y=tmp.Y;
  for(const n of ['hips','spine','chest','upperChest','neck','head']){const d=dGet(v,n);if(d)dc[n]=d}
  if(!dc.hips||!dc.spine)return;
  const th=cfg.th*w,tw=['spine','chest','upperChest'].filter(n=>dc[n]),ry=a=>new T.Quaternion().setFromAxisAngle(Y,a);
  for(const n of tw){dc[n]=ry(th/tw.length).multiply(dc[n]);setB(v,n,dc[n])}                 /* chest turned side-on */
  if(dc.neck){dc.neck=ry(-.4*th).multiply(dc.neck);setB(v,'neck',dc.neck)}                   /* the head stays on the target */
  if(dc.head){dc.head=ry(-.6*th).multiply(dc.head);setB(v,'head',dc.head)}
  for(const [side,k] of [[v.plus,cfg.p],[v.minus,cfg.m]]){
    const ua=dGet(v,side+'UpperArm'),la=dGet(v,side+'LowerArm'),h=dGet(v,side+'Hand'),sh=dGet(v,side+'Shoulder');
    if(!ua||!la||!h)continue;
    const D=new T.Quaternion();for(const n of ['hips','spine','chest','upperChest'])if(dc[n])D.multiply(dc[n]);if(sh)D.multiply(sh);   /* turn of the shoulder joint */
    const Dh=D.clone().multiply(ua).multiply(la).multiply(h);                                  /* the hand's turn in the clip pose: kept */
    const Ru=new T.Quaternion().fromArray(k.u),Rl=new T.Quaternion().fromArray(k.l);
    const uaB=ua.clone().slerp(D.clone().invert().multiply(Ru),w);
    const laB=la.clone().slerp(Ru.clone().invert().multiply(Rl),w);
    const hB=D.clone().multiply(uaB).multiply(laB).invert().multiply(Dh);
    setB(v,side+'UpperArm',uaB);setB(v,side+'LowerArm',laB);setB(v,side+'Hand',hB);
  }
}
/* thin box from a to b in the bow's own coordinates */
function strSeg(m,a,b){
  if(!STR.a){STR.up=new T.Vector3(0,1,0);STR.a=new T.Vector3();STR.b=new T.Vector3()}
  STR.a.set(a[0],a[1],a[2]);STR.b.set(b[0],b[1],b[2]);
  m.position.copy(STR.a).add(STR.b).multiplyScalar(.5);
  STR.b.sub(STR.a);const len=STR.b.length()||1e-4;STR.b.divideScalar(len);
  m.quaternion.setFromUnitVectors(STR.up,STR.b);m.scale.set(.009,len,.009);m.visible=true;
}
/* v5_325 THE DRAW HAND HOLDS THE TAIL OF THE ARROW.
   NOCK = the tail of the arrow / the middle of the string at rest, in the bow's own coordinates (metres at s = 1).
   PINCH = the point of the draw hand that holds the nock (between the thumb and the fingers), in the T-pose frame of the hand bone (+X along the fingers, mirrored for the other hand).
   It is the point the DRAW arm angles were solved for (reproduces the nock of v5_323 to < 2 mm in the Pistol_Idle aim pose). While the bow is drawn the nock is put on the real position of that point,
   so the tail of the arrow stays in the hand whatever the clip does to the shoulder and torso (the clip pose differs from the solved one by up to 3 cm). */
const NOCK=[-.40,.684,.01],PINCH=[.042,-.03,-.018];
function pinchInBow(v,o){
  const side=v.plus,hb=v.bones[side+'Hand'],rs=v.rest[side+'Hand'];
  if(!hb||!rs||!o.bow)return null;
  if(!o.pin)o.pin=new T.Vector3(PINCH[0],PINCH[1],PINCH[2]).applyQuaternion(rs.w.clone().invert());   /* T-pose frame -> the hand bone's own frame */
  v.root.updateMatrixWorld(true);                                                                       /* the bones were just posed: bring the world matrices up to date */
  const p=STR.p||(STR.p=new T.Vector3());
  p.copy(o.pin);hb.localToWorld(p);o.bow.worldToLocal(p);
  return isFinite(p.x+p.y+p.z)?p:null;
}
/* arrow + string follow the draw (w 0..1): the hand reaches the nock first (w < .6), then pulls it back; the tail of the arrow is in the draw hand */
function bowDraw(v,w,gone){
  const o=v.wpn&&v.wpn[0],cfg=DRAW[v.key];if(!o||!o.arrow||!cfg)return;
  const pf=gone?0:Math.max(0,Math.min(1,(w-.6)/.4)),off=cfg.pull/WSPEC.bow.s*pf;
  let dx=-off,dy=0,dz=0;
  if(pf>.001){
    let p=null;try{p=pinchInBow(v,o)}catch(e){p=null}
    if(p){
      const hx=p.x-NOCK[0],hy=p.y-NOCK[1],hz=p.z-NOCK[2],k=Math.min(1,pf*3);   /* from the nominal pull to the real hand position over the first third of the pull */
      if(Math.abs(hx+off)<.2&&Math.abs(hy)<.1&&Math.abs(hz)<.1){dx+=(hx-dx)*k;dy=hy*k;dz=hz*k}   /* a hand that is far from the nock (bad pose) is ignored */
    }
  }
  o.arrow.visible=!gone;o.arrow.position.set(dx,dy,dz);
  if(o.strs){
    if(pf>.001){const N=[NOCK[0]+dx,NOCK[1]+dy,NOCK[2]+dz];strSeg(o.strs[0],[-.40,.033,.01],N);strSeg(o.strs[1],[-.40,1.307,.01],N)}
    else{o.strs[0].visible=o.strs[1].visible=false}
  }
}
/* ------------------------------------------------------------------ animation: copy the old rig's angles onto the VRM bones */
function setB(v,name,d){const b=v.bones[name];if(!b)return;const r=v.rest[name];b.quaternion.copy(r.pInv).multiply(d).multiply(r.w)}
/* v5_323 The clips of the Universal Animation Library swing and turn the hands far more than the old procedural arms, so a weapon fixed to the hand bone pointed the wrong way
   in casts, shots and while running. D = the hand's turn from the T-pose (the product of the bone deltas hips -> hand, the same frame the weapon mount lives in).
   The weapon turns from  "follows the hand (hold defined in the class clip pose)"  towards  "keeps the hold angle of WSPEC in the character frame"  by o.lock (0..1). */
let _D=null,_E=null;   /* created on first use: THREE is not known yet when this file loads */
function lockWeapon(o){
  if(!_D){_D=new T.Quaternion();_E=new T.Quaternion()}
  _D.set(0,0,0,1);
  for(const c of o.chain){_E.copy(c.p).multiply(c.b.quaternion).multiply(c.wi);_D.multiply(_E)}   /* d = p * q * w^-1 for each bone, parent first */
  _D.invert().multiply(o.hold);                                                                    /* the mount turn that gives the wanted hold angle with the hand as it is now */
  o.m1.quaternion.copy(o.fol).slerp(_D,o.lock);
}
/* the old procedural pose (arms / legs / torso angles of the built-in rig): the fallback while the clips load, with ?anim=0, or if a clip frame throws */
function procPose(R,v){
  const t=tmp,tr=R.torso.rotation,hd=R.head.rotation,tk=R.dgTuck||0;   /* tk = dodge tuck 0..1: knees and elbows bend */
  t.eu.set(tr.x*.4,tr.y*.4,0);setB(v,'spine',t.q1.setFromEuler(t.eu));
  t.eu.set(tr.x*.3,tr.y*.3,0);t.q1.setFromEuler(t.eu);setB(v,'chest',t.q1);setB(v,'upperChest',t.q1);
  {const mv=R.walk||0,ph=R.walkPh||0;   /* v5_301 walk: hips turn and roll a little with each small step */
   t.eu.set(0,Math.sin(ph)*.1*mv,Math.cos(ph)*.05*mv);setB(v,'hips',t.q1.setFromEuler(t.eu));
   t.eu.set(0,-Math.sin(ph)*.06*mv,0);setB(v,'neck',t.q1.setFromEuler(t.eu))}
  t.eu.set(hd.x,hd.y,0);setB(v,'head',t.q1.setFromEuler(t.eu));
  for(const [arm,sx,side] of [[R.armR,1,v.plus],[R.armL,-1,v.minus]]){
    t.q1.setFromEuler(arm.rotation);t.q2.setFromAxisAngle(t.Z,-sx*HANG);t.q1.multiply(t.q2);setB(v,side+'UpperArm',t.q1);
    t.q3.setFromAxisAngle(t.Y,-sx*(ELBOW+tk*1.4));setB(v,side+'LowerArm',t.q3);
  }
  for(const [leg,side] of [[R.legR,v.plus],[R.legL,v.minus]]){
    const a=leg.rotation.x;t.q1.setFromAxisAngle(t.X,a);setB(v,side+'UpperLeg',t.q1);
    t.q2.setFromAxisAngle(t.X,Math.max(0,a)*.9+Math.abs(a)*.15+.04+tk*1.9);setB(v,side+'LowerLeg',t.q2);   /* knee bends on the back swing */
  }
}
/* weapon shown / on the back + hurt / burning flash: cheap, runs every frame even when the pose of a distant avatar is skipped */
function poseTail(R,P,v){
  if(v.wpn&&v.wOut!==!!R.wOut){v.wOut=!!R.wOut;for(const o of v.wpn){o.hand.visible=v.wOut;if(o.carry)o.carry.visible=!v.wOut;if(!o.carry)o.hand.visible=true}}   /* v5_318 drawn only while fighting (R.wOut is set in animPlayer), otherwise on the back */
  const k=P.hurt>0?2:P.bfT>0?1:0;                    /* hurt flash (red) / burning (amber), like the old body */
  if(k!==v.fk){v.fk=k;const c=k===2?[.62,.12,.12]:k===1?[.45,.28,.1]:[.22,.22,.22];v.mats.forEach(m=>m.emissive.setRGB(c[0],c[1],c[2]))}
}
function pose(R,P){
  const v=R.vrm,A=window.ANIM3D,clips=!!(A&&A.ready());
  /* v5_331 LEVEL OF DETAIL: a distant avatar is posed only every R.lodS-th frame (ANIM3D.due; always when it is busy attacking / hit / dodging): it keeps its last pose in between */
  if(clips&&!A.due(R,P)){if(R.an)R.body.position.y=R.an.lift||0;poseTail(R,P,v);return}   /* animPlayer wrote its procedural body bob again this frame; a posed frame replaces it with the clip's height (an.lift), so a skipped frame must too or the avatar flips between two heights every frame = shivering */
  let done=false;
  if(clips){try{done=A.apply(R,P,v)}catch(e){console.warn('ANIM3D: '+e.message);R.an=null}}   /* v5_322 Universal Animation Library moves set all 20 bones */
  if(!done)procPose(R,v);   /* v5_331 the procedural pose is only the fallback now: with clips it was computed for nothing, every bone was overwritten */
  const dw=v.wpn&&DRAW[v.key]&&v.wOut?(R.drawW||0):0;
  if(dw>.001)drawPose(v,dw,DRAW[v.key]);   /* v5_323 archer: draw the bow in an attack / skill (R.drawW comes from anim3d.js) */
  if(v.wpn&&v.wOut)for(const o of v.wpn)if(o.lock>0)lockWeapon(o);   /* v5_323 bow / staff keep their hold angle while the clip moves the hand */
  if(v.wpn&&DRAW[v.key])bowDraw(v,dw,!!R.arrowGone&&v.wOut);          /* v5_325 after the lock: the arrow tail is put on the hand with the bow in its final place */
  poseTail(R,P,v);
}

window.VRM3D={init,sync,pose,setB,parseGLB,preloadAll,WSPEC,_draw:{drawPose,bowDraw,DRAW},_weapons:{load:loadWeapon,tpl:WTPL,mount:mountWeapons},isReady:k=>ST[k||'he']===2,_build:(k,b)=>build(b).then(g=>{TPL[k]=g;ST[k]=2;return g}),_instance:k=>instance(k)};
})();
