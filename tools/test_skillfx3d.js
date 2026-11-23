/* headless check of web/skillfx3d.js with a minimal three.js stand-in: every skill type and all 40 signature skills are cast, frames are run, nothing may throw and every effect must finish */
const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../web/skillfx3d.js','utf8');
const data=JSON.parse(fs.readFileSync(__dirname+'/../web/skillfx/data.json','utf8'));
let live=0,made=0,disposed=0;
class V{constructor(x,y,z,w){this.x=x||0;this.y=y||0;this.z=z||0;this.w=w||0}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this}setScalar(s){this.x=this.y=this.z=s}}
class Obj{constructor(){this.position=new V();this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.scale=new V(1,1,1);this.scale.set=function(x,y,z){this.x=x;this.y=y;this.z=z};this.children=[];this.visible=true}add(c){this.children.push(c)}}
class Scene extends Obj{remove(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1)}}
const THREE={Texture:class{constructor(){this.image=null;this.userData={}}dispose(){}},Vector2:V,Vector4:V,Color:class{constructor(c){this.c=c}},
  ShaderMaterial:class{constructor(o){made++;live++;this.uniforms=o.uniforms;if(!o.vertexShader||!o.fragmentShader)throw new Error('no shader')}dispose(){disposed++;live--}},
  Mesh:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m}},Group:class extends Obj{},PlaneGeometry:class{dispose(){}},
  BufferGeometry:class{setAttribute(){}setIndex(){}dispose(){}},BufferAttribute:class{},LinearFilter:1,NearestFilter:2,ClampToEdgeWrapping:3,RepeatWrapping:4,DoubleSide:2,AdditiveBlending:2};
class Img{set src(v){this._s=v;if(!fs.existsSync(__dirname+'/../web/'+v))throw new Error('missing asset '+v);setTimeout(()=>this.onload&&this.onload(),1)}}
const win={location:{search:''},fetch:async u=>({ok:true,json:async()=>data}),Image:Img,console,performance:{now:()=>Date.now()},setTimeout};
win.window=win;vm.createContext(win);vm.runInContext(code,win);const K=win.SKFX;
(async()=>{
  const sc=new Scene(),ctx={THREE,T3:{sc},C:3000,gh3:()=>0,LOW:false};
  K.frame(ctx);await new Promise(r=>setTimeout(r,60));K.frame(ctx);await new Promise(r=>setTimeout(r,4400));   /* data loaded, layer built, 4 s warm-up of all textures */
  for(const k of Object.keys(data.spells)){const m=data.spells[k];if(m.ms.length!==m.n||m.cols*m.rows<m.n)throw new Error('frames '+k);if(!fs.existsSync(__dirname+'/../web/skillfx/sp_'+k+'.png'))throw new Error('sheet '+k)}
  for(let i=0;i<4;i++){K.frame(ctx);await new Promise(r=>setTimeout(r,100))}       /* all textures "load" (4 s warm-up is skipped: first use loads them) */
  const types=['pierce','fan','kunai','arrow','volley','eagle','stormarrow','strike','cleave','flurry','execute','venom','siphon','counter','bladestorm','nova','drain','bash','hammer','quake','shockwave','leap','shadowstep','rush','gale','charge','heal','mend','soulheal','might','ironskin','bulwark','guardian','roar','smoke','wolves','soulburst','rain','wail','harvest','blast','meteor','spiritbomb','trap','chain','chains'];
  const sig=[];for(const c of 'cnagS'.toLowerCase().split('').concat([]))for(const l of [25,50,100,200,300,500,750,1000])sig.push('sg_'+(c==='s'?'s':c)+l);
  const all=types.concat(sig),none=[];
  /* first pass loads the textures on demand (they are skipped while loading), second pass must spawn everything that has an effect */
  for(const pass of [1,2]){
    for(const t of all)for(const cls of (t==='pierce'?[0,3,4]:[0])){K.cast({t,cls,x:3000,y:3000,face:.7,tx:3100,ty:3050,r:200,col:'#ffcc88'})}
    for(let i=0;i<4;i++){K.frame(ctx);await new Promise(r=>setTimeout(r,120))}
    /* run to completion */
    for(let i=0;i<40;i++){K.frame(ctx);await new Promise(r=>setTimeout(r,60))}
  }
  /* spawn check per entry (textures are loaded now) */
  for(const t of all){const before=made;K.cast({t,cls:0,x:3000,y:3000,face:.7,tx:null,ty:null,r:200,col:'#ffcc88'});const n=made-before;if(!n&&K._table[t]&&K._table[t].length===0)continue;if(!n)none.push(t)}
  console.log('types without an effect:',none.length?none.join(' '):'(none)');
  for(let i=0;i<60;i++){K.frame(ctx);await new Promise(r=>setTimeout(r,60))}
  console.log('materials made',made,'disposed',disposed,'still live',live,'running',K._fx.length,'scene children',sc.children.length);
  if(K._fx.length||live||sc.children.length)throw new Error('effects did not clean up');
  /* stress: 60 casts at once are capped */
  for(let i=0;i<60;i++)K.cast({t:'blast',cls:0,x:3000,y:3000,face:0,tx:3000,ty:3000,r:200});
  console.log('after 60 casts running =',K._fx.length);if(K._fx.length>14)throw new Error('cap');
  console.log('OK');process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
