/* World of Ascension - real tree models (v5_321). Loaded after fx3d.js, before game.js.
   The "Textured Stylized Trees" pack (converted by tools/make_trees.py into web/trees/: trees.json + trees.bin + tex/*) replaces the
   primitive-shape tree props of the 3D scenery. Nothing about the world changes: a replaced prop keeps its index, position, size and
   collision radius (DECO_R3 / DECO_H3), only the picture is different.
   How it plugs in (06_render3d.js, rebuild3): the scenery of a world is one InstancedMesh per prop kind. For a kind that has a recipe below,
   rebuild3 calls TREES3D.attach({...}) with the instance matrices. The old primitive mesh stays on screen until the models and textures
   have loaded, then it is swapped for the real trees (one InstancedMesh per tree model x leaf texture x part). If anything fails to
   load, the old primitive trees simply stay.
   Switch off:  ?trees=0     Tune: RECIPES below (m = model names, leaf / bark = texture keys, h = height in prop units, 1 unit = 28 world units * prop size). */
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const OFF=/[?&]trees=0/.test(location.search);
const BASE='trees/';

/* recipe(models, leaf texture(s), bark texture, height). Several models / leaf textures are mixed per instance. A recipe without leaf is a dead tree. */
const R=(m,leaf,bark,h)=>({m,leaf:leaf==null?[]:[].concat(leaf),bark,h});
const BK='bark',BKD='barkDead',BB='birchBark',BBD='birchBarkDead';
/* RECIPES[kit][prop index]. Prop indices: 0-2 originals, 3-23 KX, 24-53 KY (see models3d.js), the same numbering as deco[].k */
const RECIPES=[
  { /* kit 0 FOREST: lush green, birch gold, a blossom tree, autumn crowns */
    0:R(['Pine_1','Pine_2'],'pine',BK,3.2),
    4:R(['Pine_4','Pine_5','Pine_2'],['pine','pineLight'],BK,3.9),
    9:R(['Tree_1','Tree_2','Tree_9'],['leaf','leafLight'],BK,2.9),
    10:R(['Birch_1','Birch_5','Birch_8'],'birchLeaf',BB,3.3),
    16:R(['Tree_6','Tree_5'],'leaf',BK,4.8),
    23:R(['Tree_3','Tree_8'],['leafPink','leafPink','leaf'],BK,3.0),
    24:R(['Tree_8','Tree_2'],'leafLight',BK,3.0),
    32:R(['Pine_4','Pine_1'],'pineLight',BK,2.5),
    33:R(['Tree_5','Tree_9'],['leafOrange','leafRed'],BK,3.2),
    39:R(['Birch_3','Birch_8'],'birchLeafYellow',BB,3.5)
  },
  { /* kit 1 CRYSTAL: glass-leaf trees */
    16:R(['Tree_3','Tree_6'],'leafCyan',BK,3.4),
    33:R(['Tree_8','Tree_2'],'leafBlue',BK,3.0),
    37:R(['Tree_1','Tree_9'],['leafPink','leafPurple'],BK,2.3),
    40:R(['Tree_5','Tree_2'],'leafPurple',BK,3.1)
  },
  { /* kit 2 RUINS: dry land, dead trees, a few sage and autumn crowns */
    24:R(['DeadTree_1','DeadTree_7','DeadTree_9'],null,BKD,2.4),
    29:R(['Tree_1','Tree_9','Tree_2'],['leafLight','leafOrange'],BK,3.0),
    35:R(['Pine_4','Pine_2'],'pineLight',BK,3.6)
  },
  { /* kit 3 FUNGAL: swamp trees in violet / teal, dead mangroves */
    25:R(['Tree_8','Tree_3'],'leafPurple',BK,3.0),
    31:R(['Tree_2','Tree_5'],'leafCyan',BK,3.0),
    32:R(['DeadTree_3','DeadTree_5'],null,BKD,2.8)
  },
  { /* kit 4 SNOW: frosted pines, white bare birches, dead trees */
    1:R(['DeadTree_7','DeadTree_1'],null,BKD,2.5),
    3:R(['Pine_5','Pine_2','Pine_4'],'pineSnow',BK,3.9),
    7:R(['DeadTree_3','DeadTree_9'],null,BKD,2.5),
    19:R(['Pine_1','Pine_4'],'pineSnow',BK,2.6),
    26:R(['Pine_4'],'pineSnow',BK,2.4),
    27:R(['Pine_2','Pine_1'],'pineSnow',BK,3.4),
    31:R(['DeadBirch_1','DeadBirch_4','DeadBirch_7'],null,BBD,3.2),
    33:R(['DeadTree_5'],null,BKD,2.9),
    37:R(['Birch_1','Birch_5'],'birchLeafYellow',BB,3.0),
    39:R(['Pine_5','Pine_2'],'pineSnow',BK,3.7)
  }
];

let DP=null;
function loadData(){
  if(DP)return DP;
  DP=Promise.all([fetch(BASE+'trees.json').then(r=>{if(!r.ok)throw new Error('trees.json '+r.status);return r.json()}),fetch(BASE+'trees.bin').then(r=>{if(!r.ok)throw new Error('trees.bin '+r.status);return r.arrayBuffer()})])
    .then(([man,buf])=>({man,buf}));
  DP.catch(()=>{});
  return DP;
}

const GEO={};
function geoOf(D,name,pi){
  const key=name+'#'+pi;if(GEO[key])return GEO[key];
  const p=D.man.models[name].parts[pi],g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(D.buf,p.p,p.n*3),3));
  const i8=new Int8Array(D.buf,p.nrm,p.n*4),nr=new Float32Array(p.n*3);
  for(let k=0;k<p.n;k++){nr[k*3]=i8[k*4]/127;nr[k*3+1]=i8[k*4+1]/127;nr[k*3+2]=i8[k*4+2]/127}
  g.setAttribute('normal',new T.BufferAttribute(nr,3));
  g.setAttribute('uv',new T.BufferAttribute(new Float32Array(D.buf,p.uv,p.n*2),2));
  g.setIndex(new T.BufferAttribute(new Uint16Array(D.buf,p.i,p.ni),1));
  g.userData.keep=true; /* shared by every world: rebuild3 must not dispose it */
  return GEO[key]=g;
}

const TEXP={};
function texOf(D,key){
  if(TEXP[key])return TEXP[key];
  const file=D.man.tex[key];
  return TEXP[key]=new Promise((res,rej)=>{
    new T.TextureLoader().load(BASE+'tex/'+file,t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;res(t)},undefined,()=>rej(new Error('texture '+key)));
  });
}

/* wind: the tips of the trees sway a little (quadratic in height, phase from the instance position) */
const WIND={value:0};let windOn=false;
function startWind(){
  if(windOn)return;windOn=true;const t0=performance.now();
  (function tick(){WIND.value=(performance.now()-t0)/1000;requestAnimationFrame(tick)})();
}
const SWAY_VS='#include <begin_vertex>\n'+
  '#ifdef USE_INSTANCING\nfloat swPh=instanceMatrix[3].x*.011+instanceMatrix[3].z*.017;\n#else\nfloat swPh=0.;\n#endif\n'+
  'float swH=max(position.y,0.);\n'+
  'float swA=(sin(uTreeT*1.15+swPh)+.55*sin(uTreeT*2.3+swPh*1.9))*.002*swH*swH;\n'+
  'transformed.x+=swA;transformed.z+=swA*.6;';
const MATS={};
function matOf(tex,key,leaf,sway){
  const mk=key+(leaf?'L':'B')+(sway?'S':'');if(MATS[mk])return MATS[mk];
  const m=new T.MeshLambertMaterial({map:tex,side:leaf?T.DoubleSide:T.FrontSide,alphaTest:leaf?.42:0});
  if(sway){
    m.onBeforeCompile=sh=>{sh.uniforms.uTreeT=WIND;sh.vertexShader='uniform float uTreeT;\n'+sh.vertexShader.replace('#include <begin_vertex>',SWAY_VS)};
    m.customProgramCacheKey=()=>'woaTreeSway';
  }
  return MATS[mk]=m;
}

function hash(n,k){let h=Math.imul(n+1,2654435761)^Math.imul(k+7,40503);h^=h>>>15;h=Math.imul(h,2246822519);h^=h>>>13;return h>>>0}

/* o: {kit, k, wg (world group), old (the primitive InstancedMesh to replace), mats (instance matrices), tints (brightness per instance), alive(), low} */
function attach(o){
  const rc=!OFF&&RECIPES[o.kit]&&RECIPES[o.kit][o.k];if(!rc||!o.mats.length)return false;
  loadData().then(D=>{
    const need=new Set([rc.bark].concat(rc.leaf));
    return Promise.all([...need].map(k=>texOf(D,k).then(t=>[k,t]))).then(tl=>({D,tx:Object.fromEntries(tl)}));
  }).then(({D,tx})=>{
    if(!o.alive())return;
    const groups=new Map(),sway=!o.low,nm=o.low?Math.min(2,rc.m.length):rc.m.length; /* low quality: at most 2 models per prop kind */
    o.mats.forEach((m,n)=>{
      const h=hash(n,o.k),mi=h%nm,mdl=rc.m[mi],lf=rc.leaf.length?rc.leaf[mi%rc.leaf.length]:'',key=mdl; /* the leaf texture follows the model, so the number of draw calls stays = models x 2 */
      let g=groups.get(key);if(!g){g={mdl,lf,idx:[]};groups.set(key,g)}g.idx.push(n);
    });
    const col=new T.Color(),sc=new T.Vector3(),mm=new T.Matrix4(),made=[];
    for(const g of groups.values()){
      const md=D.man.models[g.mdl],f=rc.h/md.h;sc.set(f,f,f);
      md.parts.forEach((p,pi)=>{
        const leaf=p.k==='leaf',tk=leaf?g.lf:rc.bark;if(!tk||!tx[tk])return;
        const im=new T.InstancedMesh(geoOf(D,g.mdl,pi),matOf(tx[tk],tk,leaf,sway),g.idx.length);
        g.idx.forEach((n,j)=>{mm.copy(o.mats[n]).scale(sc);im.setMatrixAt(j,mm);col.setScalar(o.tints[n]);im.setColorAt(j,col)});
        im.frustumCulled=false;made.push(im);
      });
    }
    for(const im of made)o.wg.add(im);
    o.wg.remove(o.old);o.old.geometry.dispose();
    if(sway)startWind();
  }).catch(e=>console.warn('trees3d: keeping the primitive trees for kit '+o.kit+' prop '+o.k,e));
  return true;
}

window.TREES3D={attach,recipes:RECIPES,off:OFF};
})();
