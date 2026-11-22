/* World of Ely - 3D models (Three.js r128).
   Procedural, no external assets: painted canvas textures, an articulated skinned cultivator,
   nine distinct monster models, a pagoda hub, crystal ore, coins, spell projectiles and scenery kits.
   index.html calls AL3D.init(THREE) once, then the make and anim functions below. */
window.AL3D=(function(){
'use strict';
let T=null;
const GC={},TC={};
let cur=null;               /* collects materials while a monster is being built */
const PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ------------------------------------------------------------------ player skins */
const SKINS=[
 {n:'Wanderer',      skin:'#f0d2b4',hair:'#1b1d22',robe:'#d8d2bf',trim:'#e3b559',sash:'#a8483c',boot:'#1d2830'},
 {n:'Jade Disciple', skin:'#e8c39e',hair:'#2a1f1a',robe:'#2f8f72',trim:'#d9f0b0',sash:'#1c4a3c',boot:'#14231d'},
 {n:'Crimson Sect',  skin:'#c98f66',hair:'#3a1210',robe:'#a8362a',trim:'#ffd27a',sash:'#2b1210',boot:'#1a0e0c'},
 {n:'Moonlit Sage',  skin:'#f6e3d0',hair:'#e8ecf2',robe:'#3b4a8a',trim:'#bcd0ff',sash:'#1b2145',boot:'#10142a'},
 {n:'Ashen Blade',   skin:'#8a5a3c',hair:'#0e0e12',robe:'#35353d',trim:'#b8bfcc',sash:'#7a1f1f',boot:'#0c0c10'},
 {n:'Azure Dragon',  skin:'#f0d2b4',hair:'#10243a',robe:'#1f6f9a',trim:'#9fe3ff',sash:'#0f3a56',boot:'#0b1c2a'},
 {n:'Violet Lotus',  skin:'#f3dcc8',hair:'#2a1840',robe:'#7a45b5',trim:'#e6c9ff',sash:'#3b1f63',boot:'#1c1030'},
 {n:'Solar Monarch', skin:'#d9a577',hair:'#2a1a0a',robe:'#e0a82e',trim:'#fff2b8',sash:'#8a2a14',boot:'#3a2410'},
 {n:'Frost Maiden',  skin:'#d4e6f2',hair:'#eaf6ff',robe:'#cfe6f5',trim:'#7fd0ff',sash:'#4a7fb0',boot:'#2a4660'},
 {n:'Night Assassin',skin:'#e8c39e',hair:'#0b0b10',robe:'#1a1a24',trim:'#6a4bd0',sash:'#4a1f6a',boot:'#08080c'},
 {n:'Sakura Spirit', skin:'#f8e0d4',hair:'#e58aa8',robe:'#f2b6c8',trim:'#ffffff',sash:'#c8456d',boot:'#5a2a3c'},
 {n:'Ember Warlord', skin:'#b87a52',hair:'#3a0e08',robe:'#2a1a16',trim:'#ff8a2a',sash:'#c8321a',boot:'#140a08'},
 {n:'Verdant Hermit',skin:'#d4a87a',hair:'#6a7a52',robe:'#5a7a3a',trim:'#d8e8a0',sash:'#8a5a2a',boot:'#2e2412'},
 {n:'Obsidian Monk', skin:'#c98f66',hair:'#0a0a0a',robe:'#2a2a2e',trim:'#ff9a2a',sash:'#e07a14',boot:'#101012'},
 {n:'Sandstorm Nomad',skin:'#c08a5a',hair:'#4a3220',robe:'#d6b98a',trim:'#8a5a2a',sash:'#a8482a',boot:'#5a4028'},
 {n:'Midnight Oracle',skin:'#e8d2bc',hair:'#c8d4ff',robe:'#161c46',trim:'#ffd86b',sash:'#2a3480',boot:'#0a0e26'},
 {n:'Rose Gold Empress',skin:'#f4d8c4',hair:'#6a2a2a',robe:'#d98a8a',trim:'#ffe0a8',sash:'#8a3a4a',boot:'#4a2228'},
 {n:'Storm Caller',  skin:'#e0bfa0',hair:'#d8dee8',robe:'#4a5a72',trim:'#ffe45a',sash:'#2a3446',boot:'#1a2230'},
 {n:'Bamboo Scholar',skin:'#ecd2b0',hair:'#2a2a1a',robe:'#d6e8c0',trim:'#4a8a52',sash:'#2a6a4a',boot:'#3a4a2a'},
 {n:'Blood Moon',    skin:'#f0cfc0',hair:'#2a0608',robe:'#6a0e1a',trim:'#ff4a5a',sash:'#1a0408',boot:'#120406'},
 {n:'Celestial Silk',skin:'#f6e8d8',hair:'#f4efe0',robe:'#f4f0e6',trim:'#e8c860',sash:'#8a9ad0',boot:'#a8a090'},
 {n:'Twilight Fox',  skin:'#f0d2b4',hair:'#d8782a',robe:'#e8924a',trim:'#fff4e0',sash:'#6a3a1a',boot:'#3a2010'},
 {n:'Abyss Walker',  skin:'#9ac0c0',hair:'#0a2a30',robe:'#0e3a46',trim:'#3affd0',sash:'#06181e',boot:'#051014'},
 {n:'Sunset Blade',  skin:'#d49a70',hair:'#5a1a1a',robe:'#e0603a',trim:'#ffd08a',sash:'#8a2a5a',boot:'#3a1418'},
 {n:'Iron Mountain', skin:'#a87a58',hair:'#2a2420',robe:'#6a6258',trim:'#c8b890',sash:'#3a342c',boot:'#201c18'},
 {n:'Ivory Immortal',skin:'#f2e2d0',hair:'#ffffff',robe:'#e8efe6',trim:'#3fb58a',sash:'#2f8f72',boot:'#2a3a34'},
 {n:'Phoenix Reborn',skin:'#e0a878',hair:'#ff6a2a',robe:'#c82a1a',trim:'#ffcf4a',sash:'#ff8a1a',boot:'#3a0e08'},
 {n:'Mist Willow',   skin:'#ead2b8',hair:'#5a6a62',robe:'#9ab0a4',trim:'#e0f0e6',sash:'#506a60',boot:'#2a3a34'},
 {n:'Panda Master',  skin:'#f4e8dc',hair:'#101010',robe:'#f2f2f2',trim:'#101010',sash:'#101010',boot:'#101010'},
 {n:'Demon Lord',    skin:'#c5553f',hair:'#14080a',robe:'#1c1014',trim:'#ffc84a',sash:'#7a1020',boot:'#0c0608'},
 {n:'Jade Spirit',   skin:'#a9dcc0',hair:'#1f4a3a',robe:'#3fa88a',trim:'#eafff4',sash:'#1c5a48',boot:'#12302a'},
 {n:'Deep Earth Sage',skin:'#6b4328',hair:'#1a120c',robe:'#8a6a3a',trim:'#f0d890',sash:'#4a3018',boot:'#24180c'},
 {n:'Ebony Sovereign',skin:'#4a2f20',hair:'#0a0806',robe:'#3a1a5a',trim:'#f4c84a',sash:'#1a0a2a',boot:'#0e0818'},
 {n:'Starlit Prince',skin:'#e8c8a8',hair:'#eadfff',robe:'#2a2a5a',trim:'#c8e0ff',sash:'#6a5ab0',boot:'#14143a'},
 {n:'Copper Duelist',skin:'#d09a78',hair:'#7a3a1a',robe:'#9a4a22',trim:'#e8c07a',sash:'#2a3a4a',boot:'#2a1a10'},
 {n:'Silver Wolf',   skin:'#dccab8',hair:'#b8c0c8',robe:'#8a94a2',trim:'#f0f4f8',sash:'#3a4452',boot:'#20262e'}
];
/* A look is ONE integer so it saves, syncs to other players and fits the old "sk" field:
   bits 0-5 palette (SKINS index), 6-9 hair style, 10-12 outfit, 13-16 headwear, 17-19 aura.
   Old saves (0..4) are simply palette 0..4 with the default styles. */
const HAIRS=['Ponytail','Topknot','Long Flow','Short Crop','Twin Buns','Spiky','Braid','Shaven'];
const OUTFITS=['Classic Robe','Battle Plate','Hooded Robe','Shoulder Mantle','Wide Sleeves','Dragon Scale','Royal Court'];
const HEADS=['None','Circlet','Bamboo Hat','Crown','Horns','Fox Ears','Bunny Ears','Scholar Cap','Lotus Crown','Shadow Mask','Warlord Helm','Antlers','Lotus Pin','Spirit Gem'];
const AURAS=['Jade Ring','Ember Flame','Frost Shards','Thunder Sparks','Blossom Petals','Shadow Wisps','Golden Motes','Starlight'];
const AURA_CFG=[
 {ring:'#5fd3a5'},
 {ring:'#ff7a2a',col:'#ff8a3a',g:'sph',sc:[3.2,5.5,3.2],rise:1,sp:1.1},
 {ring:'#8fe6ff',col:'#bff2ff',g:'oct',sc:[3,7,3],rise:0,sp:.9},
 {ring:'#ffe45a',col:'#fff08a',g:'cone4',sc:[2,10,2],rise:0,sp:2.2},
 {ring:'#ff9ac0',col:'#ffc0d8',g:'plane',sc:[5,5,1],rise:-1,sp:.7},
 {ring:'#8a4ad8',col:'#7a3ab8',g:'sph',sc:[5.5,5.5,5.5],rise:1,sp:.8,op:.5},
 {ring:'#ffcf4a',col:'#ffe08a',g:'oct',sc:[3,3,3],rise:1,sp:1.3},
 {ring:'#b8d0ff',col:'#ffffff',g:'oct',sc:[2.6,2.6,2.6],rise:0,sp:1.6}
];
const GENDERS=['He','She'];
/* per-class wardrobe: 7 armor colour schemes per class (index 0 = the original look) + 8 accent colours (index 0 = class default trim/glow) */
const CLS_SCHEMES=[null,
 [{n:'Shadow',r:'#1a1824',s:'#4a0f66',b:'#0c0b12'},{n:'Crimson Night',r:'#2a1018',s:'#a01830',b:'#14080c'},{n:'Midnight Blue',r:'#101a34',s:'#2450a0',b:'#080c18'},{n:'Ghost White',r:'#8a90a4',s:'#cfd6e6',b:'#3a3f50'},{n:'Emerald Dusk',r:'#0f2a22',s:'#1f7a5a',b:'#08140f'},{n:'Ash Gray',r:'#2c2f36',s:'#6a7080',b:'#16181c'},{n:'Bloodmoon',r:'#3a0c0c',s:'#d83a2a',b:'#1a0606'}],
 [{n:'Steel',r:'#3b4350',s:'#8f1d2c',b:'#2a2f38'},{n:'Gilded',r:'#5a4a22',s:'#b8902c',b:'#2e2410'},{n:'Obsidian',r:'#1c1e26',s:'#5a2a8a',b:'#101116'},{n:'Frost Steel',r:'#4a6078',s:'#3a8ac8',b:'#26323f'},{n:'Verdant Plate',r:'#2e4a36',s:'#6aa844',b:'#1a2a20'},{n:'Royal Violet',r:'#403060',s:'#c8a0ff',b:'#221a38'},{n:'Bronze War',r:'#5a3a24',s:'#d86a2a',b:'#2a1a10'}],
 [{n:'Stormteal',r:'#2a5a6c',s:'#1c3a52',b:'#2a2418'},{n:'Forest Ranger',r:'#2c5a34',s:'#1c3a22',b:'#2a2418'},{n:'Sunset',r:'#8a4a24',s:'#a8342a',b:'#2a1a10'},{n:'Snowfall',r:'#8a9eb0',s:'#506a84',b:'#3a4048'},{n:'Shadow Hunter',r:'#1c2028',s:'#2c3a4a',b:'#101418'},{n:'Royal Blue',r:'#24408a',s:'#1c2a5a',b:'#141a30'},{n:'Autumn',r:'#6a3a1c',s:'#9a2a1c',b:'#241408'}],
 [{n:'Spirit Indigo',r:'#2c3466',s:'#e8e4d0',b:'#1a1c34'},{n:'Ember Shaman',r:'#6a2a1c',s:'#f0d8b0',b:'#2a1410'},{n:'Bone Priest',r:'#8a8678',s:'#4a4638',b:'#3a362c'},{n:'Grove Caller',r:'#2a5a3a',s:'#e0f0c8',b:'#142a1c'},{n:'Violet Medium',r:'#4a2c6a',s:'#f0c8ff',b:'#241438'},{n:'Ocean Oracle',r:'#1c4a6a',s:'#d0f0ff',b:'#102838'},{n:'Golden Sage',r:'#6a5420',s:'#fff0c0',b:'#2a2210'}]];
const ACCENTS=[{n:'Class default'},{n:'Crimson',c:'#ff4a5a'},{n:'Azure',c:'#4aa8ff'},{n:'Jade',c:'#4af0a8'},{n:'Gold',c:'#ffd24a'},{n:'Violet',c:'#b07aff'},{n:'Rose',c:'#ff8ac0'},{n:'Ivory',c:'#f4efe0'}];
const CLS_TRIM=[null,'#9a6cff','#e0b852','#7fe8ff','#7ff5d0'],CLS_MIX=[0,.15,.12,.12,.12];
/* shared wardrobe (v5_53): EVERY class (Cultivator included) offers the same options: Gender, Skin, Hair, Outfit, Headwear, Armor, Accent, Aura.
   Armor = all 28 class colour schemes pooled (index 0 = "Class default": the class's own first scheme, or the Skin palette for the Cultivator). */
const ARMOR_POOL=[].concat(CLS_SCHEMES[1],CLS_SCHEMES[2],CLS_SCHEMES[3],CLS_SCHEMES[4]);
const ARMORS=['Class default'].concat(ARMOR_POOL.map(a=>a.n));

const clsOf=sk=>((sk|0)>>21)&7;
/* look integer: bits 0-5 skin, 6-9 hair, 10-12 outfit, 13-16 headwear, 17-19 aura, 20 gender, (21-23 = class, added at run time), 24-28 armor, 29-31 accent. Treated as unsigned 32-bit. */
const look=sk=>{sk=sk|0;return{p:sk&63,h:(sk>>6)&15,o:(sk>>10)&7,w:(sk>>13)&15,a:(sk>>17)&7,g:(sk>>20)&1,r:(sk>>24)&31,x:(sk>>29)&7}};
const packLook=l=>(((l.p&63)|((l.h&15)<<6)|((l.o&7)<<10)|((l.w&15)<<13)|((l.a&7)<<17)|((l.g&1)<<20)|(((l.r|0)&31)<<24)|(((l.x|0)&7)<<29))>>>0);

/* ------------------------------------------------------------------ helpers */
let LITE=false;
let FLT=null;
function init(THREE,lite){T=THREE;LITE=!!lite;if(window.VRM3D)VRM3D.init(THREE)}
function geo(k){
  if(GC[k])return GC[k];
  let g;
  switch(k){
    case 'box':g=new T.BoxGeometry(1,1,1);break;
    case 'cyl':g=new T.CylinderGeometry(.5,.5,1,10);break;
    case 'cyl6':g=new T.CylinderGeometry(.5,.5,1,6);break;
    case 'taper':g=new T.CylinderGeometry(.3,.5,1,10);break;      /* narrow top, wide bottom */
    case 'tube':g=new T.CylinderGeometry(.5,.5,1,22,1,true);break;
    case 'cone':g=new T.ConeGeometry(.5,1,8);break;
    case 'cone4':g=new T.ConeGeometry(.5,1,4);break;
    case 'cone6':g=new T.ConeGeometry(.5,1,6);break;
    case 'sph':g=new T.SphereGeometry(.5,14,10);break;
    case 'sphL':g=new T.SphereGeometry(.5,8,6);break;
    case 'hemi':g=new T.SphereGeometry(.5,14,8,0,PI*2,0,PI/2);break;
    case 'dod':g=new T.DodecahedronGeometry(.5);break;
    case 'oct':g=new T.OctahedronGeometry(.5);break;
    case 'tor':g=new T.TorusGeometry(.5,.08,6,22);break;
    case 'plane':g=new T.PlaneGeometry(1,1);break;
    case 'fplane':g=new T.PlaneGeometry(1,1).rotateX(-PI/2);break;   /* flat on the ground, UVs kept (forge ring) */
    case 'disc':g=new T.CircleGeometry(.5,24).rotateX(-PI/2);break;
    case 'circle':g=new T.CircleGeometry(.5,32);break;
    case 'ring':g=new T.RingGeometry(.9,1,48).rotateX(-PI/2);break;
    case 'aura':g=new T.RingGeometry(.55,1,48).rotateX(-PI/2);break;
    case 'coin':g=new T.CylinderGeometry(.5,.5,.14,18).rotateX(PI/2);break;
    case 'robe':{
      const pts=[[11.5,9],[11,13],[9.6,19],[8,24],[7.6,28],[8.4,32],[8.9,35.5],[6.5,37.5],[4.6,38.2],[3.9,38.8]].map(a=>new T.Vector2(a[0],a[1]));
      g=new T.LatheGeometry(pts,22,-PI,PI*2);break}
    case 'cloak':{
      const pts=[[.05,.05],[.95,.15],[.8,.8],[.6,1.5],[.62,1.9],[.45,2.15],[.05,2.25]].map(a=>new T.Vector2(a[0],a[1]));
      g=new T.LatheGeometry(pts,16);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){if(p.getY(i)<.4){const a=Math.atan2(p.getX(i),p.getZ(i));p.setY(i,p.getY(i)+(Math.sin(a*5)*.5+.5)*.55)}}
      g.computeVertexNormals();break}
    default:throw new Error('unknown geometry '+k);
  }
  return GC[k]=g;
}
/* add a mesh: parent, geometry (name or object), material, [x,y,z], scale (number or [x,y,z]), [rx,ry,rz] */
function A(par,g,m,p,s,r){
  const q=new T.Mesh(typeof g==='string'?geo(g):g,m);
  if(p)q.position.set(p[0],p[1],p[2]);
  if(s!==undefined){if(typeof s==='number')q.scale.set(s,s,s);else q.scale.set(s[0],s[1],s[2])}
  if(r)q.rotation.set(r[0],r[1],r[2]);
  par.add(q);return q;
}
function G(par,p){const g=new T.Group();if(p)g.position.set(p[0],p[1],p[2]);par.add(g);return g}
function tn(c,f){return new T.Color(c).multiplyScalar(f)}
function lc(c,hex,f){return new T.Color(c).lerp(new T.Color(hex),f)}
function lam(color,o){
  const m=new T.MeshLambertMaterial(Object.assign({color:color},o||{}));
  m.userData.base=m.emissive.getHex();
  if(cur){cur.flash.push(m);cur.all.push(m)}
  return m;
}
function bas(color,o){const m=new T.MeshBasicMaterial(Object.assign({color:color},o||{}));if(cur)cur.all.push(m);return m}
/* SOFT FORGE GLOW materials (v5_55): transparent, normal-blended, soft-faded shader materials.
   .color (THREE.Color) and .opacity behave like a normal material so setGear/animPlayer can drive them. */
function softMat(kind,color,opacity){
  const u={uC:{value:new T.Color(color)},uO:{value:opacity}};
  const vs=kind==='halo'
    ?'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}'
    :'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  /* halo: transparent in the middle (the weapon stays readable) AND transparent at the silhouette (no hard edge), strongest in between */
  const fs=kind==='halo'
    ?'uniform vec3 uC;uniform float uO;varying vec3 vN;varying vec3 vV;void main(){float f=abs(dot(normalize(vN),normalize(vV)));float a=pow(4.*f*(1.-f),1.6);gl_FragColor=vec4(uC,a*uO);}'
    :kind==='aura'
    ?'uniform vec3 uC;uniform float uO;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=smoothstep(.36,.74,r)*smoothstep(1.,.8,r);gl_FragColor=vec4(uC,a*uO);}'
    /* ground ring: gaussian ring profile, soft on both sides, fades to nothing at the plane edge */
    :kind==='ring'
    ?'uniform vec3 uC;uniform float uO;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float d=(r-.6)/.2;float a=exp(-d*d)*smoothstep(1.,.82,r);gl_FragColor=vec4(uC,a*uO);}'
    /* rising ring band: soft fade top and bottom */
    :'uniform vec3 uC;uniform float uO;varying vec2 vUv;void main(){float a=pow(sin(3.14159*clamp(vUv.y,0.,1.)),2.);gl_FragColor=vec4(uC,a*uO);}';
  const m=new T.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:kind==='ring'||kind==='band'||kind==='aura'?T.DoubleSide:T.FrontSide});
  m.color=u.uC.value;
  Object.defineProperty(m,'opacity',{get(){return u.uO.value},set(v){u.uO.value=v}});
  m.opacity=opacity;
  return m;
}
const addMat=o=>Object.assign({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide},o||{});

/* ------------------------------------------------------------------ textures (grayscale, tinted by material colour) */
function rs(seed){let a=seed>>>0;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296}}
const TEX={
  fur(x,w,h,r){x.fillStyle='#d2d2d2';x.fillRect(0,0,w,h);
    for(let i=0;i<1500;i++){const g=140+r()*115|0;x.strokeStyle='rgba('+g+','+g+','+g+',.55)';x.lineWidth=1+r()*1.4;const px=r()*w,py=r()*h;x.beginPath();x.moveTo(px,py);x.lineTo(px+(r()-.5)*4,py+5+r()*9);x.stroke()}},
  stripe(x,w,h,r){TEX.fur(x,w,h,r);
    for(let i=0;i<9;i++){const px=i*w/9+r()*8;x.fillStyle='rgba(15,15,15,.6)';x.beginPath();x.moveTo(px,0);x.quadraticCurveTo(px+16*(r()-.5),h*.5,px+5,h);x.lineTo(px+11,h);x.quadraticCurveTo(px+14+10*(r()-.5),h*.5,px+5,0);x.closePath();x.fill()}},
  scale(x,w,h,r){x.fillStyle='#b4b4b4';x.fillRect(0,0,w,h);
    for(let row=-1;row<h/9+1;row++)for(let col=-1;col<w/12+1;col++){const cx=col*12+(row&1)*6,cy=row*9,g=180+r()*70|0;x.fillStyle='rgb('+g+','+g+','+g+')';x.beginPath();x.arc(cx,cy,7,0,PI);x.fill();x.strokeStyle='rgba(0,0,0,.32)';x.lineWidth=1;x.stroke()}},
  rock(x,w,h,r){x.fillStyle='#bcbcbc';x.fillRect(0,0,w,h);
    for(let i=0;i<260;i++){const g=120+r()*130|0;x.fillStyle='rgba('+g+','+g+','+g+',.35)';x.beginPath();x.arc(r()*w,r()*h,2+r()*9,0,7);x.fill()}
    x.strokeStyle='rgba(20,20,20,.35)';x.lineWidth=1.2;
    for(let i=0;i<9;i++){let px=r()*w,py=r()*h;x.beginPath();x.moveTo(px,py);for(let k=0;k<5;k++){px+=(r()-.5)*22;py+=(r()-.3)*18;x.lineTo(px,py)}x.stroke()}},
  cloth(x,w,h,r){x.fillStyle='#e6e6e6';x.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=3){x.fillStyle='rgba(0,0,0,'+(.04+r()*.06)+')';x.fillRect(i,0,1,h)}
    for(let j=0;j<h;j+=3){x.fillStyle='rgba(0,0,0,'+(.03+r()*.05)+')';x.fillRect(0,j,w,1)}},
  robe(x,w,h,r){TEX.cloth(x,w,h,r);
    x.fillStyle='rgba(0,0,0,.09)';
    for(let gy=0;gy<4;gy++)for(let gx=0;gx<6;gx++){const cx=gx*w/6+(gy&1)*w/12+w/12,cy=gy*h/4+h/8;
      for(let p=0;p<5;p++){x.beginPath();x.ellipse(cx+Math.sin(p*1.256-1.57)*0+0,cy,3,7,(p-2)*.55,0,7);x.fill()}}},
  bone(x,w,h,r){x.fillStyle='#ece6d2';x.fillRect(0,0,w,h);
    for(let i=0;i<220;i++){const g=150+r()*80|0;x.fillStyle='rgba('+g+','+(g-10)+','+(g-30)+',.35)';x.fillRect(r()*w,r()*h,1+r()*3,1+r()*6)}},
  wood(x,w,h,r){x.fillStyle='#c4c4c4';x.fillRect(0,0,w,h);
    for(let i=0;i<70;i++){const g=100+r()*120|0;x.strokeStyle='rgba('+g+','+g+','+g+',.5)';x.lineWidth=1+r()*2;const px=r()*w;x.beginPath();x.moveTo(px,0);x.lineTo(px+(r()-.5)*6,h);x.stroke()}},
  lotus(x,w,h){x.clearRect(0,0,w,h);x.translate(w/2,h*.62);x.fillStyle='#fff';
    for(let p=-2;p<=2;p++){x.save();x.rotate(p*.5);x.beginPath();x.ellipse(0,-h*.22,w*.09,h*.3,0,0,7);x.fill();x.restore()}
    x.beginPath();x.arc(0,h*.1,w*.16,0,7);x.fill()},
  swirl(x,w,h){x.clearRect(0,0,w,h);const c=w/2;const gr=x.createRadialGradient(c,c,2,c,c,c);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.6,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,h);
    x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=4;
    for(let a=0;a<3;a++){x.beginPath();for(let t=0;t<60;t++){const ang=t*.16+a*2.094,rad=3+t*(c-8)/60;x[t?'lineTo':'moveTo'](c+Math.cos(ang)*rad,c+Math.sin(ang)*rad)}x.stroke()}}
};
function tex(k){
  if(TC[k])return TC[k];
  const sz=(k==='lotus'||k==='swirl')?128:128,c=document.createElement('canvas');c.width=c.height=sz;
  TEX[k](c.getContext('2d'),sz,sz,rs(k.length*977+k.charCodeAt(0)*131));
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return TC[k]=t;
}

/* ------------------------------------------------------------------ merged static geometry (one draw call per prop) */
function merge(parts,dp,acc){
  const pos=[],nor=[],col=[],m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),c=new T.Color();
  for(const pt of parts){
    let g=geo(pt.g);g=g.index?g.toNonIndexed():g.clone();
    const s=pt.s||[1,1,1],r=pt.r||[0,0,0],p=pt.p||[0,0,0];
    e.set(r[0],r[1],r[2]);q.setFromEuler(e);v.set(p[0],p[1],p[2]);sc.set(s[0],s[1],s[2]);
    m4.compose(v,q,sc);g.applyMatrix4(m4);
    const cc=typeof pt.c==='number'?dp[pt.c]:pt.c==='acc'?acc:pt.c;
    c.set(cc).multiplyScalar((pt.k||1)*(typeof pt.c==='number'?1.9:1));
    const pa=g.attributes.position.array,na=g.attributes.normal.array;
    for(let i=0;i<pa.length;i++){pos.push(pa[i]);nor.push(na[i])}
    for(let i=0;i<pa.length/3;i++)col.push(c.r,c.g,c.b);
    g.dispose();
  }
  const out=new T.BufferGeometry();
  out.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));
  out.setAttribute('normal',new T.BufferAttribute(new Float32Array(nor),3));
  out.setAttribute('color',new T.BufferAttribute(new Float32Array(col),3));
  return out;
}

/* ================================================================== PLAYER */
const BLADE=['#cfe8ff','#7fe0ee','#ffd36b','#c9a6ff','#ff9a8a'];
const bladeTier=w=>w>=75?4:w>=50?3:w>=25?2:w>=10?1:0; /* (old steel-tint tiers, no longer used) */
/* FORGE GLOW (v5_54): from forge level 10 the primary weapon and the outfit glow. Colour AND size step up every 10 levels (tier 1 = +10 ... tier 10 = +100):
   cold white-blue > aqua > jade > lime > gold > orange > red > magenta > violet > white-gold. Weapon glow follows P.wlv, outfit glow follows P.alv. */
const FORGE_GLOW=[null,'#bfeaff','#5fe8ff','#5fffb0','#c8ff5a','#ffd24a','#ff9a3a','#ff5a4a','#ff5ac8','#a86bff','#fff4c8'];
/* v5_194 REALISTIC CHARACTER: the head is drawn smaller (adult proportions) and has a real face (eyes with iris, brows, nose, lips, chin, ears) */
const forgeTier=l=>l>=10?Math.min(10,Math.floor(l/10)):0;

function makePlayer(skinIdx){
  /* v5_300 the OLD BUILT-IN AVATAR IS DELETED: no body, head, hair, outfit, headwear, class kit, cape or scarf meshes any more.
     What is left is the bare rig that animPlayer drives and VRM3D copies onto the VRM bones (root > body > torso / legs, torso > head / arms),
     plus the things that are not part of the body: level aura ring, shadow, shield bubble, armor fire, aura particles,
     Night Blade wisps, Storm Archer sparks and the Spirit Summoner's wolf. The visible character is the VRM model (web/vrm3d.js). */
  const root=new T.Group(),body=G(root),torso=G(body);
  const R={root,body,torso,skin:-1,gear:'',lt:0,aR:-.5,aL:0,m:{},sm:0,pa:0};
  R.rollG=G(body);   /* v5_304 the VRM avatar is added to this group: dodge rolls / dives tilt it around the hips (armor fire, aura and shadow stay upright) */
  R.legL=G(body,[-3.6,15,0]);R.legR=G(body,[3.6,15,0]);       /* hip pivots */
  R.head=G(torso,[0,44.6,0]);
  R.armR=G(torso,[8.4,34.5,0]);R.armL=G(torso,[-8.4,34.5,0]);  /* shoulder pivots, +x is the right arm */
  /* status effects */
  R.shield=A(root,'sph',new T.MeshBasicMaterial(addMat({color:'#8ff0c4',opacity:.18})),[0,26,0],[50,56,50]);
  R.aura=A(root,'fplane',softMat('aura','#5fd3a5',.4),[0,1.2,0],[60,1,60]);R.aura.renderOrder=1; /* level ring: soft fade on both the inner and outer edge */
  R.shadow=A(root,'disc',new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),[0,.5,0],[30,1,30]);

  /* NIGHT BLADE shadow wisps, STORM ARCHER crackling sparks, SPIRIT SUMMONER spirit wolf (shown by setSkin for that class only) */
  const nWisp=new T.MeshBasicMaterial(addMat({color:'#8a5cff',opacity:.32}));
  R.nbWispG=G(root);R.nbWispG.visible=false;R.nbWp=[];for(let i=0;i<6;i++)R.nbWp.push(A(R.nbWispG,'sph',nWisp,[0,0,0],[4,6,4]));
  const aSpk=new T.MeshBasicMaterial(addMat({color:'#bff8ff',opacity:.9}));
  R.saSpk=G(root);R.saSpk.visible=false;R.saSp=[];for(let i=0;i<6;i++)R.saSp.push(A(R.saSpk,'oct',aSpk,[0,0,0],[2,5,2]));
  const sGl=new T.MeshBasicMaterial({color:'#7ff5d0'}),sRb=new T.MeshBasicMaterial(addMat({color:'#7ff5d0',opacity:.5})),
        sGh=new T.MeshBasicMaterial(addMat({color:'#8af0ff',opacity:.38}));
  R.m.suGlow=sGl;R.m.suGh=sGh;
  const wf=R.suWolf=G(root,[-26,14,6]);wf.visible=false;
  A(wf,'sph',sGh,[0,0,0],[8,7,17]);A(wf,'sph',sGh,[0,2,10.5],[7,6.4,7]);A(wf,'box',sGh,[0,.6,15.4],[3.4,3,5]);
  for(const sx of [-1,1]){A(wf,'cone4',sGh,[sx*2.4,6.4,9.6],[2.2,4.4,1.4]);A(wf,'sph',sGl,[sx*1.8,3.2,13],[1.1,1.1,.8])}
  A(wf,'cone',sGh,[0,1.4,-12],[3.4,13,3.4],[-1.15,0,0]);A(wf,'cone',sGh,[0,-4.6,-3],[5,9,5],[PI,0,0]);
  R.suWp=[];for(let i=0;i<5;i++)R.suWp.push(A(wf,'sph',sRb,[0,0,-12-i*3.4],[3,3,3]));

  /* ---- forge glow meshes: outer weapon glow per class + a glow shell around the outfit/body (shown by setGear) ---- */
  R.m.oglow=softMat('ring','#cfe8ff',.3);   /* ring glow on the ground around the character */
  R.m.oband=softMat('band','#cfe8ff',.3);   /* thin ring of light that rises up the body and fades out */
  R.ogl=A(body,'fplane',R.m.oglow,[0,1.9,0],[44,1,44]);R.ogl.visible=false;R.ogl.renderOrder=2;
  R.ogb=A(body,'tube',R.m.oband,[0,2,0],[26,7,26]);R.ogb.visible=false;R.ogb.renderOrder=2;   /* v5_225 the rising band is no longer shown (fire replaces it) */
  /* v5_225 ARMOR FORGE FIRE: the armor glow is now a ring of flame tongues around the feet (class-tier colour, tall tongues + lighter hot cores) that flicker and sway; more and taller flames every forge tier.
     White teardrop sprite texture, tinted by the tier colour (same idea as the pet fire in pets3d.js). Built once, shown by setGear, animated in animPlayer. */
  {const flameTex=()=>{if(FLT)return FLT;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.globalCompositeOperation='lighter';
      const blob=(cx,cy,rx,ry,a)=>{g.save();g.translate(cx,cy);g.scale(rx,ry);const q=g.createRadialGradient(0,0,0,0,0,1);q.addColorStop(0,'rgba(255,255,255,'+a+')');q.addColorStop(.35,'rgba(255,255,255,'+a*.6+')');q.addColorStop(.7,'rgba(255,255,255,'+a*.18+')');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(-1,-1,2,2);g.restore()};
      blob(128,172,92,70,.9);blob(128,128,64,88,.8);blob(128,86,38,70,.65);blob(128,46,18,44,.5);return FLT=new T.CanvasTexture(c)};
    const mk=()=>new T.SpriteMaterial({map:flameTex(),transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    R.ofire=G(body,[0,1.5,0]);R.ofire.visible=false;R.ofl=[];
    const NO=LITE?10:18,NC=LITE?3:6;
    for(let i=0;i<NO+NC;i++){const core=i>=NO,fm=mk(),q=new T.Sprite(fm);q.center.set(.5,.1);q.renderOrder=3;R.ofire.add(q);R.ofl.push({q:q,m:fm,core:core,i:core?i-NO:i,n:core?NC:NO,ph:i*1.7+.3,k:core?.7:(.62+.38*(((i*37)%10)/10))})}}

  /* ---- aura particles (aura style > 0) ---- */
  R.orb=G(root,[0,0,0]);R.orb.visible=false;R.orbM=new T.MeshBasicMaterial(addMat({color:'#ffffff',opacity:.85}));R.orbP=[];
  for(let i=0;i<8;i++){const q=A(R.orb,'sph',R.orbM,[0,0,0],3);R.orbP.push(q)}
  setSkin(R,skinIdx||0);setGear(R,0,0);
  return R;
}
function setSkin(R,sk){
  const l=look(sk),cls=clsOf(sk),fem=l.g===1;
  /* v5_300 the look (skin, hair, outfit, armor colours) no longer dresses a built-in body; only the aura and the class extras remain here */
  const ac=AURA_CFG[l.a]||AURA_CFG[0];R.aura.material.color.set(ac.ring);
  R.orb.visible=l.a>0;
  if(l.a>0){R.orbM.color.set(ac.col);R.orbM.opacity=ac.op||.85;R.orbG=ac;
    R.orbP.forEach(q=>{q.geometry=geo(ac.g);q.scale.set(ac.sc[0],ac.sc[1],ac.sc[2])})}
  R.cls=cls;R.gear='';
  R.nbWispG.visible=cls===1;R.saSpk.visible=cls===3;R.suWolf.visible=cls===4;
  R.lk=l;R.skin=sk;
  /* v5_286 / v5_287 the Cultivator is a VRM avatar (web/vrm3d.js): He -> Cultivator_He.vrm, She -> Cultivator_She.vrm; v5_291 the Night Blade too: NightBlade_He.vrm / NightBlade_She.vrm; v5_292 the Iron Guardian: IronGuardian_He.vrm / IronGuardian_She.vrm; v5_293 the Storm Archer: StormArcher_He.vrm / StormArcher_She.vrm; v5_294 the Spirit Summoner: SpiritSummoner_He.vrm / SpiritSummoner_She.vrm;  */
  if(window.VRM3D)VRM3D.sync(R,cls===0?(fem?'she':'he'):cls===1?(fem?'nbshe':'nbhe'):cls===2?(fem?'igshe':'ighe'):cls===3?(fem?'sashe':'sahe'):cls===4?(fem?'sushe':'suhe'):null);
}
function setGear(R,wlv,alv,ft){
  const k=wlv+','+alv+','+ft;if(R.gear===k)return;R.gear=k;
  const gt=forgeTier(wlv),at=ft===undefined?forgeTier(alv):ft|0,gc=gt>0?FORGE_GLOW[gt]:null,ac=at>0?(at>=10?'#ff6aa0':FORGE_GLOW[at]):null,L=30+Math.min(wlv,40)*.35,w=gt>0?1+(gt-1)*.16:1;
  R.gt=gt;R.at=at;
  /* armor fire + ground glow: colour and size by forge tier */
  R.ogl.visible=at>0;R.ogb.visible=false;R.ofire.visible=at>0;
  if(at>0){const FE=at+2,rad=11+.5*FE,S=2*rad/.6,   /* v5_228 FE = 'fire size step': every tier looks like the tier two above it (tier 1 = the old tier 3 ...) so low tiers are clearly visible */
    bd=2*(12+.4*at);R.m.oglow.color.set(ac);R.m.oband.color.set(ac);R.ogl.scale.set(S,1,S);R.ogb.scale.set(bd,7,bd);for(const f of R.ofl)f.m.color.set(f.core?lc(ac,'#ffffff',.6):ac);R.frad=rad;R.fh=24+FE*4.5;R.fn=FE}
  R.m.suGlow.color.set(gc||'#7ff5d0');
}
/* P = game player state, ri = realm index */
function animPlayer(R,P,time,ri){
  const dt=clamp(time-R.lt,0,.05);R.lt=time;
  const mv=P.mvAmt;
  /* v5_302 two walk paces. Normal (PC, tap-to-move, joystick fully pushed) = the old pace. Small steps only while P.walkSm is set (phone joystick pushed part way):
     shorter stride, a little arm swing, hip sway; R.sm blends between the two so nothing jumps, and the step phase is accumulated so it never jumps either. */
  R.sm+=((P.walkSm?1:0)-R.sm)*Math.min(1,dt*8);const sm=R.sm;
  R.pa+=(P.anim-(R.la===undefined?P.anim:R.la))*(.9+.3*sm);R.la=P.anim;   /* v5_303 small steps are stepped a little faster (animation only, the move speed is unchanged) */
  const ph=R.pa,st=Math.sin(ph),legK=.9-.48*sm,armK=.8-.25*sm,bobK=1.7-.8*sm;
  setGear(R,P.wlv|0,P.alv|0,P.ft);   /* v5_227 P.ft = the armor fire tier computed from ALL gear slots (see armorFireTier in the game code) */
  R.body.position.y=Math.abs(Math.cos(ph))*bobK*mv+Math.sin(time*2.2)*.5*(1-mv);
  R.torso.rotation.x=.07*mv;
  const cl=R.cls|0,lk=cl===2?.72:cl===1?1.1:1;
  R.legL.rotation.x=st*legK*mv*lk;R.legR.rotation.x=-st*legK*mv*lk;
  const sw=P.swing>0?1-clamp(P.swing/.2,0,1):-1,sl=sw>=0;
  const eo=1-(1-clamp(sw,0,1))*(1-clamp(sw,0,1));
  const tR=sl?-2.7+3*eo:-.15+st*armK*mv,tL=-.15-st*armK*mv;   /* v5_303 each arm swings OPPOSITE to the leg on its own side (right leg back = right arm forward); before they moved the same way */   /* v5_297 both arms swing freely (the right arm used to hang nearly still for the sword) */
  R.aR+=(tR-R.aR)*Math.min(1,dt*(sl?45:14));R.aL+=(tL-R.aL)*Math.min(1,dt*14);
  R.armR.rotation.x=R.aR;R.armR.rotation.z=.1;R.armL.rotation.x=R.aL;R.armL.rotation.z=-.1;
  R.torso.rotation.y=sl?Math.sin(sw*PI)*.55:-st*.1*mv*sm;   /* shoulders counter-twist against the small steps */
  R.walk=mv*sm;R.walkPh=ph;
  if(!cl)R.head.rotation.x=0;
  if(cl===1){
    R.torso.rotation.x=.16*mv+.05;R.head.rotation.x=-.1*mv;
    const W=R.nbWp;for(let i=0;i<W.length;i++){const f=((time*.5+i/W.length)%1),a=time*1.6+i*1.05,r=13+f*5;
      W[i].position.set(Math.cos(a)*r,3+f*38,Math.sin(a)*r);const sc=Math.sin(f*PI)*(.6+mv*.5);W[i].scale.set(4*sc+.1,7*sc+.1,4*sc+.1)}
  }else if(cl===2){
    R.torso.rotation.x=.02*mv;R.body.position.y*=.6;R.head.rotation.x=0;
  }else if(cl===3){
    R.torso.rotation.x=.05*mv;R.head.rotation.x=0;   /* v5_297 no bow stance any more: arms swing like the other classes */
    const W=R.saSp;for(let i=0;i<W.length;i++){const f=((time*.7+i/W.length)%1),a=time*2.2+i*1.05,r=15+Math.sin(time*9+i*3)*3,k=Math.sin(time*14+i*5)>.2?1:.2;
      W[i].position.set(Math.cos(a)*r,6+f*44,Math.sin(a)*r);W[i].rotation.set(time*3+i,i,time*2);const sc=Math.sin(f*PI)*k;W[i].scale.set(2*sc+.1,5*sc+.1,2*sc+.1)}
  }else if(cl===4){
    R.torso.rotation.x=.04*mv;R.head.rotation.x=0;
    R.suWolf.position.set(-26+Math.sin(time*1.4)*3,14+Math.sin(time*2.2)*2.4,6+Math.cos(time*1.1)*3);R.suWolf.rotation.y=.4+Math.sin(time*1.4)*.2;
    R.suWp.forEach((q,i)=>{const k=.5+.5*Math.sin(time*5-i*.9);q.scale.set(3*k+.4,3*k+.4,3*k+.4)})
  }
  R.shield.visible=P.sh>0;if(R.shield.visible)R.shield.material.opacity=.14+.06*Math.sin(time*6);
  const ao=R.lk&&R.lk.a>0;
  if(ao){const c=R.orbG,N=R.orbP.length;R.orbP.forEach((q,i)=>{const ang=time*c.sp+i*6.2832/N,rad=19+Math.sin(time*1.3+i*1.7)*3;
      const f=((time*.35*c.sp+i/N)%1);const y=c.rise>0?4+f*58:c.rise<0?62-f*58:28+Math.sin(time*1.5+i*1.1)*20;
      q.position.set(Math.cos(ang)*rad,y,Math.sin(ang)*rad);q.rotation.y=time*2+i;q.rotation.z=c.g==='cone4'?Math.sin(time*7+i)*.6:0;
      const fade=c.rise?Math.sin(f*3.1416):1;q.scale.set(c.sc[0]*(.35+.65*fade),c.sc[1]*(.35+.65*fade),c.sc[2]*(.35+.65*fade))})}
  R.aura.visible=ri>0||ao;if(R.aura.visible){const s=26+Math.min(ri,12)*3;R.aura.scale.set(s*2,1,s*2);R.aura.material.opacity=.5+.12*Math.sin(time*2)}
  {const gt=R.gt|0,at=R.at|0; /* forge glow pulse: faster and stronger every tier */
   R.m.oglow.opacity=at?(.2+.02*at+.06*Math.sin(time*(2+at*.5))):0;   /* the ground glow stays as a dimmer base under the fire */
   if(at){   /* v5_225 armor fire: 6 + 1.2 x tier tongues (max all), tier 3+ adds hot cores; each flickers (two sine layers) and sways, the ring turns slowly */
     for(const f of R.ofl){f.m.opacity=f.core?.4:.42+.03*(at+2)+(at<=2?.1:0)}   /* v5_228 tiers 1-2 a little brighter */
     if(at>=10){   /* v5_227 tier 10 = RAINBOW: every flame has its own hue running around the colour wheel, the ground glow and the trim / sash glow follow */
       const h=(time*.2)%1;R.ofl.forEach((f,i)=>f.m.color.setHSL((h+i*.043)%1,.95,f.core?.82:.58));
       R.m.oglow.color.setHSL(h,.9,.6)}
     const rad=R.frad||14,H=R.fh||30,FE=at+2,no=Math.min(R.ofl.length-(LITE?3:6),6+Math.round(FE*1.2)),nc=LITE?3:Math.min(6,FE-1);
     let oi=0,ci=0;
     for(const f of R.ofl){
       if(f.core?ci>=nc:oi>=no){f.q.visible=false;continue}
       const idx=f.core?ci++:oi++,n=f.core?nc:no;f.q.visible=true;
       const a=idx/n*6.2832+time*(f.core?-.35:.35),r=f.core?rad*.45:rad,fl=1+Math.sin(time*9+f.ph)*.17+Math.sin(time*17+f.ph*3)*.09;
       f.q.position.set(Math.cos(a)*r+Math.sin(time*2.3+f.ph)*(f.core?1:1.8),0,Math.sin(a)*r);
       f.q.scale.set((f.core?5.5:8+FE*.35)*(1+(fl-1)*.5),H*f.k*fl*(f.core?1:1),1)}}}
  /* v5_109 casting pose: both arms rise over the head, body leans back and glows while a skill is being cast */
  if(P.cast>0){const cm=P.castMax||.6,k=clamp(1-P.cast/cm,0,1),up=Math.sin(Math.min(1,k*3.2)*PI/2),pu=1-clamp((k-.8)/.2,0,1)*.5;
    R.armR.rotation.x=-2.55*up-.12*Math.sin(time*20)*up;R.armL.rotation.x=-2.55*up+.12*Math.sin(time*20)*up;
    R.armR.rotation.z=.5*up;R.armL.rotation.z=-.5*up;R.torso.rotation.x=-.2*up;R.torso.rotation.y=0;
    R.body.position.y+=2.5*up*pu;R.aR=R.armR.rotation.x;R.aL=R.armL.rotation.x}
  /* v5_304 DODGE ANIMATION. P.dg: 1 = forward (a forward roll, then a run), 2 = left / right (the character already faces the way it goes: short crouch, then a roll),
     3 = back (back dive, then a backward roll; keeps facing the front). P.dgU = progress 0..1 of the dash (the game sets it; other players' come from the 'dg' fx message).
     Roll / dive = R.rollG turned around the hips; R.dgTuck bends knees and elbows on the VRM bones (vrm3d.js pose). Everything resets when P.dg is 0. */
  if(P.dg>0&&P.dgU>=0){
    const u=clamp(P.dgU,0,1),dg=P.dg|0,SS=(a,b,x)=>{const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q)};
    let ang=0,tuck=0,lift=0,lean=0;
    if(dg===3){   /* v5_308 BACK DIVE AND ROLL: dive back first (leap, lean back, arms up), then a full backward roll, then stand up; keeps facing the front */
      const d1=.35,a1=.9;
      if(u<d1){const p=Math.sin(u/d1*PI/2);
        ang=-1.1*p;lift=9*p;tuck=.2*p;lean=-.2*p;
        R.legL.rotation.x=R.legR.rotation.x=-.5*p;R.armR.rotation.x=R.armL.rotation.x=-2.3*p;R.armR.rotation.z=.45*p;R.armL.rotation.z=-.45*p;R.head.rotation.x=.4*p}
      else if(u<a1){const rk=(u-d1)/(a1-d1),w=SS(0,.25,rk),e=rk<.5?2*rk*rk:1-2*(1-rk)*(1-rk),tk2=Math.min(1,Math.sin(rk*PI)*2.4);
        ang=-1.1-(2*PI-1.1)*e;tuck=Math.max(.2*(1-w),tk2);lift=9*(1-w)+13*Math.sin(rk*PI)*w;lean=-.2*(1-w)+tk2*w;   /* from the dive pose into the tucked roll */
        R.legL.rotation.x=R.legR.rotation.x=-.5*(1-w)-1.4*tk2*w;R.armR.rotation.x=R.armL.rotation.x=-2.3*(1-w)-1.7*tk2*w;
        R.armR.rotation.z=.45*(1-w);R.armL.rotation.z=-.45*(1-w);R.head.rotation.x=.4*(1-w)+.5*tk2*w}
      else{const e=1-SS(a1,1,u);tuck=.7*e;lean=.3*e;R.legL.rotation.x=R.legR.rotation.x=-.4*e}   /* stand up (the roll has turned a full -2 PI = upright again) */
    }else{
      const a0=dg===1?0:.1,a1=dg===1?.54:.9;   /* forward: ROLL first (0 - .54), then RUN; side: crouch (0 - .1), roll (.1 - .9), stand up */
      if(u<a0){const w=SS(0,a0,u);tuck=.6*w;lean=.35*w;R.legL.rotation.x=R.legR.rotation.x=-.45*w}   /* side dodge: crouch before the roll */
      else if(u<a1){
        const rk=(u-a0)/(a1-a0);ang=(rk<.5?2*rk*rk:1-2*(1-rk)*(1-rk))*2*PI;   /* one full forward turn */
        tuck=Math.min(1,Math.sin(rk*PI)*2.4);lift=13*Math.sin(rk*PI);lean=tuck;
        R.legL.rotation.x=R.legR.rotation.x=-1.4*tuck;R.armR.rotation.x=R.armL.rotation.x=-1.7*tuck;R.head.rotation.x=.5*tuck;
      }else if(dg===1){const c=Math.sin((u-a1)*PI*2*3.2),w=SS(a1,a1+.1,u);   /* forward: after the roll, RUN with fast opposite arm / leg swing, leaning forward */
        R.legL.rotation.x=c*1.15*w;R.legR.rotation.x=-c*1.15*w;R.armR.rotation.x=-.15+c*.95*w;R.armL.rotation.x=-.15-c*.95*w;lean=.4*w;lift=Math.abs(c)*1.2*w}
      else{const e=1-SS(a1,1,u);tuck=.7*e;lean=.3*e;R.legL.rotation.x=R.legR.rotation.x=-.4*e}   /* side dodge: stand up */
    }
    R.torso.rotation.x=lean;R.torso.rotation.y=0;
    {const py=24,c=Math.cos(ang),s=Math.sin(ang);R.rollG.rotation.x=ang;R.rollG.position.set(0,py-py*c,-py*s)}   /* turn around the hips */
    R.body.position.y+=lift;R.dgTuck=tuck;R.walk=0;R.dgOn=true;
    R.aR=R.armR.rotation.x;R.aL=R.armL.rotation.x;
  }else if(R.dgOn){R.dgOn=false;R.dgTuck=0;R.rollG.rotation.x=0;R.rollG.position.set(0,0,0)}
  if(R.vrmOn)VRM3D.pose(R,P);   /* v5_286 VRM avatar: copy this rig's arm / leg / torso / head angles onto the VRM bones */
}

/* ================================================================== MONSTERS (unit space, facing +Z) */
function quad(g,c,o){
  const tx=o.tex,fur=lam(c,{map:tex(tx)}),dk=lam(tn(c,.55),{map:tex(tx)}),eye=bas(o.eye||'#ff3b2f'),pale=bas('#f2ecd8'),blk=bas('#16161a');
  const ly=o.legH,bw=o.bw,bh=o.bh,bl=o.bl,by=ly+bh*.45,hw=o.hw,hh=o.hh,hl=o.hl,sn=o.sn;
  const body=G(g);
  A(body,'sph',fur,[0,by,0],[bw,bh,bl]);
  A(body,'sph',fur,[0,by+.06,bl*.26],[bw*1.06,bh*1.1,bl*.52]);
  A(body,'sph',fur,[0,by-.02,-bl*.28],[bw*.96,bh*.98,bl*.5]);
  A(body,'sph',dk,[0,by-bh*.28,0],[bw*.8,bh*.5,bl*.8]);
  const head=G(body,[0,by+bh*.28,bl*.5]);
  A(head,'sph',fur,[0,0,hl*.2],[hw,hh,hl]);
  A(head,'box',fur,[0,-hh*.12,hl*.7+sn[2]*.3],sn);
  A(head,'sphL',blk,[0,-hh*.02,hl*.7+sn[2]*.8],[.2,.14,.14]);
  const jaw=G(head,[0,-hh*.28,hl*.45]);A(jaw,'box',dk,[0,-.04,sn[2]*.4],[sn[0]*.9,.1,sn[2]]);
  for(const sx of [-1,1]){
    A(head,'sphL',eye,[sx*hw*.38,hh*.2,hl*.55],[.14,.1,.1]);
    A(head,'cone',fur,[sx*hw*.32,hh*.52,hl*.05],[hw*.28,hh*.55,hw*.2],[-.2,0,-sx*.25]);
    if(o.fangs)A(head,'cone',pale,[sx*sn[0]*.35,-hh*.3,hl*.7+sn[2]*.65],[.07,.22,.07],[PI,0,0]);
    if(o.tusks)A(head,'cone',pale,[sx*hw*.42,-hh*.18,hl*.72],[.15,.6,.15],[1.0,0,-sx*.35]);
    if(o.whisk)A(head,'cone',pale,[sx*.28,-hh*.1,hl*.78],[.035,.95,.035],[-1.3,0,-sx*.55]);
  }
  const gold=lam('#f3d27a',{emissive:'#6a4a10'}),flame=[];
  if(o.horn)A(head,'cone',gold,[0,hh*.55,hl*.25],[.13,.9,.13],[.45,0,0]);
  if(o.mane){const fm=bas(lc(c,'#ffd27a',.55));for(let i=0;i<6;i++)flame.push(A(body,'cone',fm,[0,by+bh*.5+.03,bl*.42-i*bl*.17],[.38,.75,.28],[-.5,0,0]))}
  if(o.ridge)for(let i=0;i<o.ridge;i++)A(body,'cone',dk,[0,by+bh*.5-.02,bl*.38-i*(bl*.75/(o.ridge-1))],[.12,.3,.14],[-.35,0,0]);
  const legs=[];
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(a=>{
    const L=G(g,[a[0]*bw*.36,ly+.05,a[1]*bl*.3]);
    A(L,'cyl',fur,[0,-ly*.5,0],[.3,ly,.3]);
    A(L,o.hooves?'cyl':'sphL',o.hooves?blk:dk,[0,-ly+.05,.05],o.hooves?[.34,.18,.34]:[.38,.2,.5]);
    legs.push(L)});
  const tail=G(body,[0,by+bh*.1,-bl*.5]);
  if(o.tail==='wolf')A(tail,'cone',fur,[0,-.1,-.4],[.24,.95,.24],[-1.9,0,0]);
  else if(o.tail==='thick'){A(tail,'cyl',fur,[0,.15,-.55],[.2,1.1,.2],[PI/2+.35,0,0]);A(tail,'sphL',dk,[0,.38,-1.04],[.26,.26,.3])}
  else if(o.tail==='curl')A(tail,'sph',fur,[0,.05,-.12],[.15,.15,.3]);
  else{A(tail,'cone',fur,[0,-.15,-.8],[.3,1.8,.3],[-1.75,0,0]);flame.push(A(tail,'cone',bas(lc(c,'#ffd27a',.55)),[0,-.45,-1.75],[.4,.8,.4],[-1.75,0,0]))}
  const top=Math.max(by+bh*.5,by+bh*.28+hh*.7+(o.horn?.7:0));
  return {h:top,sw:o.sw||2,sp:o.sp||1,
    anim(t,mv,atk,ph){
      for(let i=0;i<4;i++)legs[i].rotation.x=Math.sin(ph+(i===1||i===2?PI:0))*.75*mv;
      body.position.y=Math.abs(Math.sin(ph))*.08*mv+Math.sin(t*2)*.015;
      body.position.z=atk*.3;
      head.rotation.x=atk*.5+Math.sin(t*1.7)*.05*(1-mv)+Math.sin(ph*2)*.04*mv;
      jaw.rotation.x=atk*.75;
      tail.rotation.y=Math.sin(t*3)*.4;tail.rotation.x=Math.sin(t*2.3)*.12;
      for(let i=0;i<flame.length;i++){flame[i].scale.y=(flame[i].userData.s||(flame[i].userData.s=flame[i].scale.y))*(1+.22*Math.sin(t*9+i*1.7))}
    }};
}
const WOLF=g=>c=>quad(g,c,{tex:'fur',bw:.8,bh:.8,bl:1.7,legH:.8,hw:.62,hh:.55,hl:.7,sn:[.32,.28,.55],fangs:1,tail:'wolf',ridge:5,sp:1.2});
const TIGER=g=>c=>quad(g,c,{tex:'stripe',bw:1.05,bh:.95,bl:1.9,legH:.75,hw:.82,hh:.72,hl:.72,sn:[.52,.38,.42],fangs:1,tail:'thick',eye:'#ffd23a',sp:1.1});
const BOAR=g=>c=>quad(g,c,{tex:'fur',bw:1.25,bh:1.1,bl:1.55,legH:.55,hw:.82,hh:.76,hl:.8,sn:[.58,.46,.5],tusks:1,tail:'curl',ridge:7,sp:1.3});
const QILIN=g=>c=>quad(g,c,{tex:'scale',bw:.9,bh:.9,bl:1.8,legH:.95,hw:.6,hh:.6,hl:.75,sn:[.4,.35,.55],horn:1,mane:1,whisk:1,hooves:1,tail:'drag',eye:'#fff0a0',sp:1});

function bandit(g,c){
  const cloth=lam(c,{map:tex('cloth')}),dk=lam(tn(c,.5),{map:tex('cloth')}),skin=lam('#d9b08c'),leather=lam('#4a3626',{map:tex('wood')}),
        steel=lam('#c9d0d6',{emissive:'#20262c'}),eye=bas('#ff3b2f'),mask=lam('#2a2a30'),band=lam('#a8362a'),gold=lam('#e3b559',{emissive:'#3a2a08'});
  const body=G(g);
  const legs=[-1,1].map(sx=>{const L=G(g,[sx*.25,1.0,0]);A(L,'cyl',dk,[0,-.45,0],[.3,.9,.3]);A(L,'box',leather,[0,-.95,.08],[.34,.2,.55]);return L});
  A(body,'box',cloth,[0,1.45,0],[.95,.95,.55]);A(body,'box',leather,[0,1.05,0],[.99,.16,.58]);A(body,'box',gold,[0,1.05,.3],[.18,.14,.05]);
  A(body,'box',dk,[0,.82,.04],[.9,.5,.5]);
  for(const sx of [-1,1])A(body,'sph',leather,[sx*.58,1.9,0],[.42,.3,.42]);
  const H=G(body,[0,2.2,0]);
  A(H,'sph',skin,[0,0,0],[.5,.55,.5]);A(H,'cyl',band,[0,.14,0],[.54,.16,.54]);A(H,'box',mask,[0,-.14,.2],[.42,.26,.2]);
  A(H,'sph',dk,[0,.2,-.1],[.46,.3,.46]);A(H,'box',band,[0,.08,-.3],[.12,.4,.05],[.3,0,0]);
  for(const sx of [-1,1])A(H,'sphL',eye,[sx*.14,.06,.23],[.09,.06,.06]);
  const mkArm=sx=>{const a=G(body,[sx*.62,1.85,0]);A(a,'cyl',cloth,[0,-.4,0],[.24,.8,.24]);A(a,'sph',skin,[0,-.85,0],.22);return a};
  const aR=mkArm(1),aL=mkArm(-1);
  const W=G(aR,[0,-.85,0]);W.rotation.x=PI/2;
  A(W,'cyl',leather,[0,0,0],[.07,.3,.07]);A(W,'box',steel,[0,.17,0],[.3,.05,.09]);A(W,'box',steel,[0,.62,0],[.1,.85,.03]);A(W,'box',steel,[0,1.1,.06],[.1,.2,.03],[.4,0,0]);
  A(aL,'cyl',leather,[0,-.8,.26],[.55,.06,.55],[PI/2,0,0]);A(aL,'sphL',gold,[0,-.8,.31],[.18,.18,.1]);
  return {h:2.75,sw:1.6,sp:1,anim(t,mv,atk,ph){
    const s=Math.sin(ph);legs[0].rotation.x=s*.8*mv;legs[1].rotation.x=-s*.8*mv;
    body.position.y=Math.abs(Math.cos(ph))*.06*mv+Math.sin(t*2)*.01;body.rotation.y=atk*.4;
    aR.rotation.x=-.3-1.9*atk-s*.25*mv;aL.rotation.x=s*.6*mv-.1;aR.rotation.z=.12;aL.rotation.z=-.12;
    H.rotation.x=atk*.2}};
}

function revenant(g,c){
  const bone=lam('#e8e2cc',{map:tex('bone')}),armor=lam(tn(c,.6),{map:tex('rock')}),steel=lam('#aeb6c0',{emissive:'#1c2026'}),
        glow=bas(lc(c,'#ffffff',.5)),hollow=bas('#08080a'),cape=lam(tn(c,.4),{side:T.DoubleSide,map:tex('cloth')}),wood=lam('#5a4636',{map:tex('wood')});
  const body=G(g),flames=[];
  const legs=[-1,1].map(sx=>{const L=G(g,[sx*.22,1.0,0]);A(L,'cyl',bone,[0,-.25,0],[.12,.5,.12]);A(L,'sphL',bone,[0,-.5,0],.18);A(L,'cyl',bone,[0,-.74,0],[.1,.45,.1]);A(L,'box',armor,[0,-.98,.1],[.26,.14,.5]);return L});
  A(body,'box',bone,[0,1.05,0],[.55,.2,.3]);A(body,'cyl',bone,[0,1.45,-.08],[.1,.8,.1]);
  for(let i=0;i<4;i++)A(body,'box',bone,[0,1.3+i*.15,.02],[.72-i*.05,.06,.42]);
  A(body,'box',bone,[0,1.55,.22],[.08,.55,.05]);
  for(const sx of [-1,1]){A(body,'sph',armor,[sx*.52,1.88,0],[.52,.36,.52]);A(body,'cone',steel,[sx*.6,2.1,0],[.14,.36,.14],[0,0,-sx*.4])}
  const H=G(body,[0,2.17,0]);
  A(H,'sph',bone,[0,0,0],[.48,.52,.5]);A(H,'box',bone,[0,-.27,.12],[.3,.14,.28]);A(H,'cone',armor,[0,.36,-.05],[.22,.5,.5],[-.3,0,0]);
  for(const sx of [-1,1]){A(H,'sphL',hollow,[sx*.13,.04,.21],.17);A(H,'sphL',glow,[sx*.13,.04,.26],.08)}
  const mkArm=sx=>{const a=G(body,[sx*.62,1.85,0]);A(a,'cyl',bone,[0,-.3,0],[.1,.6,.1]);A(a,'sphL',bone,[0,-.6,0],.16);A(a,'cyl',bone,[0,-.85,0],[.09,.5,.09]);return a};
  const aR=mkArm(1),aL=mkArm(-1);
  const sp=G(aR,[0,-1.1,0]);sp.rotation.x=PI/2;
  A(sp,'cyl',wood,[0,.25,0],[.06,2.7,.06]);A(sp,'cone',steel,[0,1.75,0],[.17,.42,.07]);
  A(aL,'cyl',armor,[0,-.9,.3],[.72,.07,.72],[PI/2,0,0]);A(aL,'tor',glow,[0,-.9,.34],[1.44,1.44,1.44]);
  const cp=G(body,[0,1.9,-.28]);A(cp,'box',cape,[0,-.6,-.04],[.9,1.4,.04]);A(cp,'box',cape,[0,-1.38,-.04],[.9,.1,.04]);
  for(const sx of [-1,1])flames.push(A(body,'cone',glow,[sx*.52,2.45,0],[.14,.34,.14]));
  return {h:2.75,sw:1.7,sp:.9,anim(t,mv,atk,ph){
    const s=Math.sin(ph);legs[0].rotation.x=s*.7*mv;legs[1].rotation.x=-s*.7*mv;
    body.position.y=Math.abs(Math.cos(ph))*.05*mv+Math.sin(t*1.6)*.02;
    aR.rotation.x=-.35-1.6*atk-s*.2*mv;aL.rotation.x=s*.5*mv;aR.rotation.z=.1;aL.rotation.z=-.1;
    H.rotation.y=Math.sin(t*.9)*.25*(1-mv);cp.rotation.x=.1+mv*.5+Math.sin(t*3)*.07;
    flames.forEach((f,i)=>{f.scale.y=.34*(1+.4*Math.sin(t*10+i*2))})}};
}

function serpent(g,c){
  const sk=lam(c,{map:tex('scale')}),dk=lam(tn(c,.55),{map:tex('scale')}),eye=bas('#ffe04a'),tongue=bas('#d9303a'),pale=bas('#f2ecd8');
  const body=G(g),segs=[],N=10;
  for(let i=1;i<N;i++){const r=.55-i*.03;segs.push({m:A(body,'sph',i%2?sk:dk,[0,Math.max(.4,1.3-i*.3),.9-i*.5],[r*2,r*2,r*2.2]),i,z:.9-i*.5})}
  const head=G(body,[0,1.35,1.0]);
  A(head,'sph',sk,[0,0,.1],[.9,.7,1.2]);A(head,'sph',sk,[0,.05,-.45],[1.7,1.3,.28]);   /* hood */
  for(const sx of [-1,1]){A(head,'sphL',eye,[sx*.27,.14,.45],[.16,.14,.1]);A(head,'cone',pale,[sx*.14,-.2,.55],[.06,.24,.06],[PI,0,0])}
  const tg=G(head,[0,-.12,.68]);A(tg,'box',tongue,[0,0,.22],[.05,.03,.5]);A(tg,'box',tongue,[-.05,0,.5],[.03,.03,.16],[0,.5,0]);A(tg,'box',tongue,[.05,0,.5],[.03,.03,.16],[0,-.5,0]);
  return {h:1.9,sw:2.6,sp:.9,anim(t,mv,atk,ph){
    const amp=.18+mv*.22;
    segs.forEach(s=>{s.m.position.x=Math.sin(t*3.2*(.5+mv*.6)-s.i*.75)*amp*(.3+s.i/N)});
    head.position.x=Math.sin(t*3.2*(.5+mv*.6)+.5)*amp*.2;
    head.position.z=1.0+atk*.75;head.position.y=1.35-atk*.35+Math.sin(t*1.8)*.04;head.rotation.x=atk*.5;
    tg.scale.z=.6+Math.abs(Math.sin(t*12))*.6;}};
}

function wraith(g,c){
  const cloak=lam(c,{transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false,emissive:tn(c,.28),map:tex('cloth')}),
        hood=lam(tn(c,.7),{transparent:true,opacity:.92,emissive:tn(c,.2)}),
        hollow=bas('#05050a'),glow=bas(lc(c,'#ffffff',.65)),claw=bas('#e8e4f0'),wisp=bas(lc(c,'#ffffff',.4),addMat({opacity:.7}));
  const body=G(g,[0,.5,0]),rib=[];
  A(body,'cloak',cloak,[0,0,0],1);
  A(body,'sph',hood,[0,2.08,0],[.95,1.05,.95]);A(body,'cone',hood,[0,2.7,-.28],[.8,.95,.8],[-.55,0,0]);
  A(body,'sph',hollow,[0,2.02,.36],[.64,.72,.42]);
  for(const sx of [-1,1])A(body,'sphL',glow,[sx*.2,2.1,.6],[.2,.09,.1],[0,0,-sx*.3]);
  const arms=[-1,1].map(sx=>{const a=G(body,[sx*.72,1.6,.1]);A(a,'taper',cloak,[0,-.2,.3],[.34,1.3,.34],[-1.2,0,0]);
    for(let k=-1;k<=1;k++)A(a,'cone',claw,[k*.1,-.5,.95],[.05,.3,.05],[-1.5,0,0]);return a});
  for(let i=0;i<4;i++){const r=G(body,[Math.cos(i*1.57)*.5,.15,Math.sin(i*1.57)*.5]);A(r,'cone',cloak,[0,-.45,0],[.2,.9,.2],[PI,0,0]);rib.push(r)}
  const orbs=[0,1,2].map(i=>A(g,'sphL',wisp,[0,1.5,0],.14));
  return {h:3.0,sw:1.9,sp:.8,anim(t,mv,atk,ph){
    body.position.y=.5+Math.sin(t*2)*.18;body.rotation.x=.25*mv+atk*.3;body.rotation.z=Math.sin(t*1.4)*.06;
    arms.forEach((a,i)=>{a.rotation.x=-.2-atk*1.1+Math.sin(t*2.2+i*2)*.15});
    rib.forEach((r,i)=>{r.rotation.x=Math.sin(t*3+i*1.5)*.3;r.rotation.z=Math.cos(t*2.5+i)*.25});
    orbs.forEach((o,i)=>{const a=t*1.6+i*2.094;o.position.set(Math.cos(a)*1.05,1.3+Math.sin(t*2+i)*.5,Math.sin(a)*1.05)})}};
}

function colossus(g,c){
  const rock=lam(c,{map:tex('rock')}),dk=lam(tn(c,.55),{map:tex('rock')}),core=bas(lc(c,'#ffffff',.55)),crys=lam(lc(c,'#ffffff',.3),{emissive:tn(c,.6)});
  const body=G(g);
  const legs=[-1,1].map(sx=>{const L=G(g,[sx*.55,1.35,0]);A(L,'taper',dk,[0,-.65,0],[.85,1.3,.85],[PI,0,0]);A(L,'box',rock,[0,-1.28,.15],[.95,.2,1.2]);return L});
  A(body,'box',dk,[0,1.55,0],[1.3,.5,.9]);
  A(body,'dod',rock,[0,2.3,0],[1.9,1.6,1.4]);
  for(const sx of [-1,1]){A(body,'dod',rock,[sx*1.2,2.8,0],[1,.85,1]);A(body,'cone',crys,[sx*1.3,3.35,-.1],[.3,.9,.3],[0,0,-sx*.25])}
  for(let i=0;i<3;i++)A(body,'cone',crys,[(i-1)*.55,3.0,-.62],[.3,.9+i%2*.4,.3],[-.35,0,0]);
  const H=G(body,[0,3.4,.1]);A(H,'dod',rock,[0,0,0],[.78,.62,.72]);A(H,'box',core,[0,.04,.36],[.55,.1,.1]);A(H,'cone',dk,[0,.4,-.05],[.35,.35,.35]);
  A(body,'box',core,[0,2.35,.62],[.08,.7,.05],[0,0,.3]);A(body,'box',core,[-.3,2.1,.64],[.35,.05,.04],[0,0,-.5]);A(body,'box',core,[.35,2.55,.62],[.3,.05,.04],[0,0,.6]);
  const mkArm=sx=>{const a=G(body,[sx*1.25,2.8,0]);A(a,'cyl',dk,[0,-.6,0],[.55,1.2,.55]);A(a,'dod',rock,[0,-1.45,.05],[.95,.95,.95]);A(a,'box',core,[0,-1.4,.5],[.5,.05,.05]);return a};
  const aR=mkArm(1),aL=mkArm(-1);
  return {h:4.1,sw:3,sp:.55,anim(t,mv,atk,ph){
    const s=Math.sin(ph);legs[0].rotation.x=s*.4*mv;legs[1].rotation.x=-s*.4*mv;
    body.position.y=Math.abs(Math.cos(ph))*.08*mv+Math.sin(t*1.3)*.02;body.rotation.x=atk*.18;
    aR.rotation.x=-s*.35*mv-atk*2.3;aL.rotation.x=s*.35*mv-atk*2.3;aR.rotation.z=.12;aL.rotation.z=-.12;
    H.rotation.x=atk*.3}};
}

/* extra pomp for bosses */
function bossDeco(g,c,h){
  const gold=bas('#e3b559'),aura=bas(c,addMat({opacity:.4}));
  const crown=G(g,[0,h+.4,0]);A(crown,'tor',gold,[0,0,0],1.15,[PI/2,0,0]);
  for(let i=0;i<6;i++){const a=i*PI/3;A(crown,'cone',gold,[Math.cos(a)*.57,.18,Math.sin(a)*.57],[.13,.45,.13])}
  const r1=A(g,'aura',aura,[0,.08,0],2.6),r2=A(g,'ring',aura,[0,.08,0],3.4);
  const orb=G(g,[0,h*.55,0]),sh=bas(lc(c,'#ffffff',.5),addMat({opacity:.85}));
  for(let i=0;i<4;i++){const a=i*PI/2;A(orb,'oct',sh,[Math.cos(a)*1.9,Math.sin(i*1.7)*.4,Math.sin(a)*1.9],[.24,.6,.24])}
  return t=>{orb.rotation.y=t*1.1;crown.rotation.y=-t*.7;const s=2.6+Math.sin(t*2)*.18;r1.scale.set(s,s,s);r2.scale.set(3.4+Math.sin(t*2+1)*.2,1,3.4+Math.sin(t*2+1)*.2)}
}

const SHADOW=()=>SHADOW.m||(SHADOW.m=new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.34,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));

/* ------------------------------------------------------------------ per-world monster looks
   Every world dresses the same nine body plans differently: its own proportions, a body glow and a signature
   decoration (spikes, orbiting stars, flames, halo, fins, leaves, bolts, bones, sun disc, crystal shards).
   Index = world index in WORLDS (index.html). The arena (11) has no monsters. */
const THEMES=[
 null, /* 0 Arena */
 null, /* 1 Ashen Reach: the original models */
 {sc:[1.12,1,1.08],glow:'#4a0a0a',k:'spikes',c1:'#2b2226',c2:'#d83a2a'},
 {sc:[.92,1.05,.94],glow:'#16245a',k:'stars',c1:'#bcd8ff',c2:'#ffe9a8'},
 {sc:[1.04,1.06,1.04],glow:'#7a2a00',k:'flames',c1:'#ff7a1a',c2:'#ffd24a'},
 {sc:[1,1.08,1],glow:'#3a3550',k:'halo',c1:'#ffe9a8',c2:'#ffffff'},
 {sc:[.9,.96,1.14],glow:'#06323a',k:'fins',c1:'#3fd0d8',c2:'#f4f0e0'},
 {sc:[1.06,.98,1.06],glow:'#0a2a0a',k:'leaves',c1:'#4fae3a',c2:'#ff8ab8'},
 {sc:[1,1.05,1],glow:'#3a3a00',k:'bolts',c1:'#fff25a',c2:'#9fd8ff'},
 {sc:[1.02,1.03,1.02],glow:'#3a0008',k:'bones',c1:'#efe6d0',c2:'#ff2a3a'},
 {sc:[1.08,1,1.1],glow:'#5a4200',k:'sun',c1:'#f3c65a',c2:'#fff2b8'},
 {sc:[.95,1.06,.95],glow:'#202a3a',k:'shards',c1:'#e8f4ff',c2:'#c9a8ff'},
 {sc:[1.1,1.04,1.1],glow:'#1a0030',k:'shards',c1:'#6a3fd0',c2:'#d8a8ff'},
 {sc:[1.14,1.06,1.14],glow:'#5a1a00',k:'spikes',c1:'#e8dcc0',c2:'#ff7a2a'},
 {sc:[1.06,1.1,1.06],glow:'#3a3000',k:'halo',c1:'#ffd86a',c2:'#8affea'},
 {sc:[1.16,1.1,1.16],glow:'#4a0030',k:'flames',c1:'#ffffff',c2:'#ff5a9a'}
];
function themeMonster(g,rig,wi){
  const th=THEMES[wi];if(!th)return rig;
  const kids=g.children.slice(),V=G(g);kids.forEach(k=>V.add(k));
  V.scale.set(th.sc[0],th.sc[1],th.sc[2]);
  for(const m of cur.flash){m.emissive.set(th.glow);m.userData.base=m.emissive.getHex()}
  const H=rig.h,S=rig.sw,fx=[],lt=LITE,c1=th.c1,c2=th.c2;
  const gl1=bas(c1,addMat({opacity:.8})),gl2=bas(c2,addMat({opacity:.85})),sol=lam(c1,{emissive:th.glow});
  const keep=m=>{m.userData.keep=1;return m};
  const ring=(n,y,r,f)=>{for(let i=0;i<n;i++){const a=i/n*PI*2;f(Math.cos(a)*r,y,Math.sin(a)*r,a,i)}};
  const out=(m,a,t)=>{m.rotation.set(Math.sin(a)*t,0,-Math.cos(a)*t)};
  const orbit=(list,r,y,sp,bob)=>fx.push(t=>{list.forEach((m,i)=>{const a=t*sp+i/list.length*PI*2;m.position.set(Math.cos(a)*r,y+Math.sin(t*2+i*1.9)*bob,Math.sin(a)*r);m.rotation.y=t*2+i})});
  let extra=0,wide=1;
  switch(th.k){
    case 'spikes':{
      ring(lt?5:8,H*.6,S*.34,(x,y,z,a)=>{out(keep(A(V,'cone',sol,[x,y,z],[S*.09,S*.3,S*.09])),a,.8)});
      keep(A(V,'cone',gl2,[0,H+S*.1,S*.1],[S*.1,S*.36,S*.1]));extra=S*.3;break}
    case 'stars':{
      const o=[];for(let i=0;i<(lt?2:4);i++)o.push(A(V,'oct',i%2?gl2:gl1,null,[S*.12,S*.2,S*.12]));
      orbit(o,S*.62,H*.62,1.2,S*.05);
      const st=keep(A(V,'oct',gl2,[0,H+S*.18,0],[S*.14,S*.26,S*.14]));fx.push(t=>{st.rotation.y=t*2});extra=S*.3;wide=1.3;break}
    case 'flames':{
      const n=lt?3:5,f=[];ring(n,H*.95,S*.12,(x,y,z,a,i)=>{f.push(keep(A(V,'cone',i%2?gl2:gl1,[x,y,z],[S*.1,S*.4,S*.1])))});
      fx.push(t=>{f.forEach((m,i)=>{m.scale.y=S*.4*(1+.25*Math.sin(t*9+i*1.7))})});extra=S*.35;break}
    case 'halo':{
      const h=keep(A(V,'tor',gl1,[0,H+S*.22,0],S*.5,[PI/2,0,0]));fx.push(t=>{h.rotation.z=t*.8});
      if(!lt){const o=[];for(let i=0;i<3;i++)o.push(A(V,'sphL',gl2,null,S*.08));orbit(o,S*.55,H*.55,1,S*.04)}
      extra=S*.35;break}
    case 'fins':{
      const n=lt?3:5,f=[];for(let i=0;i<n;i++){const z=(i/(n-1)-.5)*S*.7,y=H*.58+(1-Math.abs(i-(n-1)/2)/(n/2))*S*.06;f.push(keep(A(V,'cone4',gl1,[0,y,z],[S*.03,S*.34,S*.2],[-.4,0,0])))}
      fx.push(t=>{f.forEach((m,i)=>{m.rotation.x=-.4+Math.sin(t*3+i)*.15})});break}
    case 'leaves':{
      ring(lt?5:7,H*.62,S*.3,(x,y,z,a)=>{out(keep(A(V,'cone6',sol,[x,y,z],[S*.12,S*.3,S*.04])),a,.9)});
      keep(A(V,'sph',lam(c2,{emissive:th.glow}),[0,H+S*.05,S*.08],S*.14));extra=S*.15;break}
    case 'bolts':{
      const o=[];for(let i=0;i<(lt?2:4);i++)o.push(A(V,'cone4',i%2?gl2:gl1,null,[S*.07,S*.4,S*.07]));
      orbit(o,S*.55,H*.55,3,S*.06);fx.push(t=>{o.forEach((m,i)=>{m.visible=Math.sin(t*20+i*3)>-.4})});wide=1.2;break}
    case 'bones':{
      const bone=lam(c1,{emissive:'#2a2418'});
      for(const sx of [-1,1])keep(A(V,'cone',bone,[sx*S*.14,H*.98,S*.12],[S*.08,S*.5,S*.08],[0,0,-sx*.55]));
      keep(A(V,'tor',bone,[0,H*.45,0],S*.62,[PI/2,0,0]));keep(A(V,'tor',bone,[0,H*.6,0],S*.54,[PI/2,0,0]));extra=S*.2;break}
    case 'sun':{
      keep(A(V,'tor',sol,[0,H*.55,0],S*.75,[PI/2,0,0]));
      const d=keep(A(V,'circle',gl1,[0,H*.7,-S*.35],S*1.1)),r=keep(A(V,'tor',sol,[0,H*.7,-S*.35],S*1.1));
      fx.push(t=>{r.rotation.z=t*.8;d.rotation.z=-t*.4});break}
    case 'shards':{
      const o=[];for(let i=0;i<(lt?3:7);i++)o.push(A(V,'oct',i%2?gl2:gl1,null,[S*.1,S*.34,S*.1]));
      orbit(o,S*.7,H*.55,.9,S*.12);wide=1.35;break}
  }
  const base=rig.anim;
  return Object.assign({},rig,{h:H*th.sc[1]+extra,sw:S*Math.max(th.sc[0],th.sc[2])*wide,
    anim(t,mv,atk,ph){base(t,mv,atk,ph);for(const f of fx)f(t)}});
}

/* ti: monster type index 0..8; col: tint colour. Returns a Group with userData {rig,flash,mat,h,seed}. */
function makeMonster(ti,col,boss,wi){
  const g=new T.Group(),L={flash:[],all:[]};cur=L;
  const c=new T.Color(col);let rig;
  try{
    switch(ti){
      case 0:rig=WOLF(g)(c);break;
      case 1:rig=bandit(g,c);break;
      case 2:rig=BOAR(g)(c);break;
      case 3:rig=serpent(g,c);break;
      case 4:rig=wraith(g,c);break;
      case 5:rig=TIGER(g)(c);break;
      case 6:rig=revenant(g,c);break;
      case 7:rig=colossus(g,c);break;
      default:rig=QILIN(g)(c);
    }
    rig=themeMonster(g,rig,wi);
    if(ti!==4)A(g,'disc',SHADOW(),[0,.05,0],[rig.sw,1,rig.sw]);
    if(boss)rig.boss=bossDeco(g,c,rig.h);
  }finally{cur=null}
  /* level of detail: small parts (eyes, ears, claws, fangs...) are hidden on far monsters to save draw calls */
  const small=[];g.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.keep){const s=o.scale;if(Math.max(s.x,s.y,s.z)<.65)small.push(o)}});
  g.userData={rig,flash:L.flash,h:rig.h,seed:Math.random()*100,fl:false,far:false,small:small,boss:!!boss,mat:{dispose(){L.all.forEach(m=>m.dispose())}}};
  return g;
}
function animMonster(g,m,time,dist){
  const u=g.userData,R=u.rig;
  const far=!u.boss&&(LITE||dist>(u.far?600:700)); /* phone: small parts (eyes, ears, claws, fangs) are never drawn on regular monsters */
  if(far!==u.far){u.far=far;for(const o of u.small)o.visible=!far}
  const mv=(m.state==='chase'||m.state==='return')?1:((m.wx||m.wy)?.35:0);
  const atk=clamp((m.atkT||0)/.25,0,1),t=time+u.seed,ph=t*8*R.sp;
  R.anim(t,mv,atk,ph);if(R.boss)R.boss(t);
  const f=m.flash>0;
  if(f!==u.fl){u.fl=f;for(const mm of u.flash)mm.emissive.setHex(f?0x999999:(mm.userData.base|0))}
}

/* ================================================================== PROPS */
let ORE=null;
function makeOre(){
  if(!ORE){
    const rock=merge([{g:'dod',c:'#2c343b',p:[0,3,0],s:[24,11,22]},{g:'dod',c:'#3a444c',p:[8,2,6],s:[12,8,11]},{g:'dod',c:'#232a30',p:[-9,2,-5],s:[13,7,12]}]);
    const cr=[[0,0,0,34,5,0,0],[10,0,5,24,4.4,.35,.2],[-9,0,3,26,4.4,-.3,-.15],[5,0,-9,18,4,.25,-.3],[-4,0,-10,14,3.6,-.2,.25],[14,0,-5,12,3.2,.4,.4]],parts=[];
    for(const a of cr){const h=a[3],w=a[4],k=.85+((a[3]*7)%5)/20;
      parts.push({g:'cyl6',c:'#9fe9f4',k:k,p:[a[0],h*.33+3,a[2]],s:[w,h*.66,w],r:[a[5],0,a[6]]});
      parts.push({g:'cone6',c:'#d6fbff',k:k,p:[a[0],h*.66+3+h*.17,a[2]],s:[w,h*.34,w],r:[a[5],0,a[6]]})}
    ORE={rock:rock,cr:merge(parts),
      mRock:new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,map:tex('rock')}),
      mCr:new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,emissive:'#1b6a78'})};
  }
  const g=new T.Group();g.add(new T.Mesh(ORE.rock,ORE.mRock),new T.Mesh(ORE.cr,ORE.mCr));return g;
}
let ITM=null;
const GM={};
function gearMats(col){
  return GM[col]||(GM[col]={m:new T.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:.45}),
    gem:new T.MeshLambertMaterial({color:'#ffffff',emissive:'#bfe9ff',emissiveIntensity:.6}),
    halo:new T.MeshBasicMaterial(addMat({color:col,opacity:.22}))});
}
function makeGear(slot,col){
  const k=gearMats(col||'#ffe9a8'),g=new T.Group();
  A(g,'sphL',k.halo,[0,0,0],34);
  if(slot==='ring'){A(g,'tor',k.m,[0,-2,0],[15,15,15],[PI/2,0,0]);A(g,'oct',k.gem,[0,5,0],[6,8,6])}
  else if(slot==='ear'){for(const sx of [-1,1]){A(g,'tor',k.m,[sx*6,3,0],[8,8,8]);A(g,'oct',k.gem,[sx*6,-4,0],[4,7,4])}}
  else if(slot==='neck'){A(g,'tor',k.m,[0,4,0],[17,17,17]);A(g,'oct',k.gem,[0,-6,0],[6,10,6])}
  else if(slot==='glove'){A(g,'box',k.m,[0,-1,0],[10,9,5]);A(g,'box',k.m,[0,6,0],[10,4,5.5]);for(let i=0;i<4;i++)A(g,'cyl',k.m,[-3.6+i*2.4,9,0],[2.1,6,2.1]);A(g,'cyl',k.m,[6.5,0,0],[2.6,6,2.6],[0,0,-.9])}
  else if(slot==='legs'){A(g,'box',k.m,[0,7,0],[16,5,8]);for(const sx of [-1,1]){A(g,'box',k.m,[sx*4.2,-1,0],[6.5,14,7]);A(g,'oct',k.gem,[sx*4.2,0,4],[3,4,3])}}
  else if(slot==='brace'){A(g,'tor',k.m,[0,0,0],[13,13,13],[PI/2,0,0]);A(g,'tor',k.m,[0,3,0],[13,13,13],[PI/2,0,0]);A(g,'oct',k.gem,[0,0,13],[4,6,4])}
  else if(slot==='belt'){A(g,'tor',k.m,[0,0,0],[15,15,9],[PI/2,0,0]);A(g,'box',k.m,[0,0,14],[9,9,3]);A(g,'oct',k.gem,[0,0,16],[3,4,3])}
  else{A(g,'cyl',k.m,[0,4,0],[7,12,7]);A(g,'box',k.m,[0,-3,3],[8,5,13]);A(g,'oct',k.gem,[0,6,4],[3,4,3])}
  return g;
}
function makeItem(kind,slot,col){
  if(kind==='g')return makeGear(slot,col);
  if(!ITM)ITM={coin:new T.MeshLambertMaterial({color:'#f3c65a',emissive:'#7a5410'}),gem:new T.MeshLambertMaterial({color:'#9fe9f4',emissive:'#2a8a9a'})};
  if(kind==='c'){const g=new T.Group();A(g,'coin',ITM.coin,[0,0,0],[11,11,11]);A(g,'tor',ITM.coin,[0,0,0],[11,11,11]);return g}
  const g=new T.Group();A(g,'oct',ITM.gem,[0,0,0],[11,17,11]);return g;
}
function animItem(g,it,time){g.rotation.y=time*3+it.t*2}
const PJ={};
function makeProj(col){
  const c=col||'#cfe8ff',g=new T.Group();
  const k=PJ[c]||(PJ[c]={core:new T.MeshBasicMaterial({color:'#ffffff'}),halo:new T.MeshBasicMaterial(addMat({color:c,opacity:.55})),trail:new T.MeshBasicMaterial(addMat({color:c,opacity:.5}))});
  A(g,'sphL',k.core,[0,0,0],7);A(g,'sphL',k.halo,[0,0,0],17);
  const tr=A(g,'cone',k.trail,[0,0,-20],[12,40,12],[-PI/2,0,0]);
  return g;
}

/* scenery: 54 merged props per kit (3 originals + 21 added in v5_254 + 30 in v5_255), built for the world's palette */
/* v5_254 MORE SCENERY: 21 extra props per kit (24 per kit, 120 in all). Props 0-2 of every kit are the originals; 3-23 are new.
   Colour indexes 0-3 are the world palette dp[] (0/1 = vegetation dark/light, 2/3 = stone dark/light), 'acc' = the world accent.
   The collision radius / standable top of every prop is in DECO_R3 / DECO_H3 (05_render2d.js) and must keep the same order. */
const KX=(()=>{
  const B=(g,c,x,y,z,w,h,d,r,k)=>{const o={g,c,p:[x,y,z],s:[w,h,d]};if(r)o.r=r;if(k)o.k=k;return o};
  const RG=(n,rad,f)=>Array.from({length:n},(_,q)=>{const a=q/n*6.2832;return f(Math.cos(a)*rad,Math.sin(a)*rad,a,q)});
  const WOOD='#4a3a2c',WHITE='#f2f6fb',ICE='#bfe3f5',H=1.5708;
  return [
  /* ---- kit 0 FOREST ---- */
  [ [B('cyl',WOOD,0,.35,0,.7,2.2,.7,[0,0,H]),B('cyl','#b08a5a',1.11,.35,0,.6,.04,.6,[0,0,H]),B('sphL',1,-.3,.72,.1,.6,.3,.5)], /* 3 fallen log */
    [B('cyl',WOOD,0,.5,0,.25,1,.25),B('cone4',0,0,1.2,0,1.3,1.1,1.3),B('cone4',1,0,1.9,0,1,1.1,1),B('cone4',0,0,2.5,0,.7,1,.7),B('cone4',1,0,3,0,.4,.8,.4)], /* 4 tall pine */
    [B('cyl',WOOD,0,.25,0,.9,.5,.9),B('cyl','#b08a5a',0,.51,0,.78,.03,.78),B('sphL',1,.5,.1,.3,.4,.25,.4)], /* 5 stump */
    [B('disc',1,0,.04,0,1.8,1,1.8),B('sphL','acc',-.4,.14,.1,.26,.26,.26),B('sphL','#fff2a8',.1,.16,-.3,.26,.26,.26),B('sphL','acc',.5,.14,.4,.24,.24,.24),B('sphL','#f5a0c0',-.1,.15,.5,.24,.24,.24),B('sphL','#fff2a8',.55,.13,-.2,.22,.22,.22)], /* 6 flower patch */
    [B('cone',1,0,.4,0,.12,.8,.12),B('cone',0,.2,.35,.1,.1,.7,.1,[0,0,-.3]),B('cone',1,-.2,.35,.05,.1,.7,.1,[0,0,.3]),B('cone',0,.05,.3,-.2,.1,.6,.1,[.3,0,0]),B('cone',1,-.1,.3,.2,.1,.6,.1,[-.3,0,.1]),B('cone',0,.3,.25,-.15,.08,.5,.08,[0,0,-.4])], /* 7 grass tuft */
    [B('dod',2,0,.6,0,1.8,1.3,1.6),B('dod',3,.9,.4,.5,1.1,.8,1),B('dod',2,-.9,.3,-.3,.9,.6,.9),B('sphL',1,0,1.15,0,1,.3,.9)], /* 8 mossy boulders */
    [B('cyl',WOOD,0,.55,0,.35,1.1,.35),B('sph',0,0,1.8,0,1.9,1.5,1.9),B('sph',1,.5,2.1,.3,1.2,1,1.2)], /* 9 round oak */
    [B('cyl','#e8e4d8',-.4,.9,0,.14,1.8,.14),B('cyl','#e8e4d8',.35,1,.2,.14,2,.14),B('cyl','#e8e4d8',0,.8,-.4,.12,1.6,.12),B('sph',1,-.4,2,0,.9,.8,.9),B('sph',0,.35,2.2,.2,.9,.8,.9),B('sph',1,0,1.8,-.4,.8,.7,.8)], /* 10 birch grove */
    [...RG(5,.7,(x,z,a,q)=>[B('taper','#efe6d2',x,.18,z,.16,.36,.16),B('hemi',q%2?'acc':'#d96a5a',x,.34,z,.5,.28,.5)]).flat()], /* 11 mushroom ring */
    [B('sph',1,0,.5,0,1.5,1,1.5),B('sph',0,.3,.65,.2,1,.8,1),B('sphL','#d6405a',.4,.9,.5,.2,.2,.2),B('sphL','#d6405a',-.3,.85,.5,.2,.2,.2),B('sphL','#d6405a',.1,1.1,-.3,.2,.2,.2),B('sphL','#d6405a',-.5,.7,-.2,.2,.2,.2)], /* 12 berry bush */
    [B('cone6',2,0,1.3,0,.9,2.6,.9),B('cone6',3,.6,.5,.2,.6,1,.6),B('dod',2,-.5,.25,.2,.8,.5,.7)], /* 13 rock spire */
    [B('dod',2,0,.3,0,1.1,.6,1),B('dod',3,.05,.8,0,.8,.45,.75),B('dod',2,0,1.15,0,.5,.3,.5)], /* 14 cairn */
    [B('cyl',WOOD,0,.8,0,.15,1.6,.15),B('box','#8a6a4a',.25,1.35,0,.9,.4,.1,[0,.3,0]),B('box','#8a6a4a',-.2,1.05,0,.6,.28,.1,[0,-.25,0])], /* 15 signpost */
    [B('cyl',WOOD,0,1.1,0,1.1,2.2,1.1),B('sph',0,0,3,0,3,2,3),B('sph',1,.8,3.3,.4,1.8,1.4,1.8),B('sph',1,-.9,2.8,-.3,1.6,1.2,1.6)], /* 16 ancient tree */
    [...RG(7,.35,(x,z,a)=>B('cone',q=>1,x,.5,z,.2,1.3,.2,[Math.sin(a)*1.0,0,-Math.cos(a)*1.0])).map((o,q)=>{o.c=q%2;return o})], /* 17 fern */
    [B('disc','#2d6a7a',0,.03,0,2.2,1,2.2),B('disc',1,.4,.05,.2,.6,1,.6),B('disc',1,-.5,.05,-.3,.5,1,.5),B('sphL','acc',.4,.1,.2,.2,.2,.2)], /* 18 lily pond */
    [...RG(6,.5,(x,z)=>B('dod',2,x,.15,z,.4,.3,.4)),B('sphL','acc',0,.25,0,.4,.4,.4),B('cone','#ffb04a',0,.35,0,.35,.6,.35)], /* 19 campfire */
    [B('cone4',0,0,.6,0,.5,1.2,.5,[.2,0,.1]),B('cone4',0,.4,.5,.2,.4,1,.4,[0,0,-.5]),B('cone4',0,-.4,.5,-.1,.4,1,.4,[0,0,.5]),B('cone4',0,.1,.45,-.4,.4,.9,.4,[-.5,0,0]),B('sphL','acc',.2,.9,.2,.2,.2,.2)], /* 20 bramble */
    [B('cyl6',3,0,.03,0,.8,.08,.8),B('cyl6',2,.8,.03,.3,.7,.08,.7),B('cyl6',3,1.4,.03,-.3,.6,.08,.6),B('cyl6',2,-.7,.03,-.3,.7,.08,.7)], /* 21 stepping stones */
    [B('cyl',WOOD,-.9,.45,0,.12,.9,.12),B('cyl',WOOD,.9,.45,0,.12,.9,.12),B('box',WOOD,0,.7,0,1.9,.1,.08),B('box',WOOD,0,.4,0,1.9,.1,.08)], /* 22 fence */
    [B('cyl',WOOD,0,.7,0,.3,1.4,.3),B('sph','#f5b8c8',0,1.9,0,1.9,1.4,1.9),B('sph','#ffd6e0',.5,2.1,.3,1.2,1,1.2),B('sph','#f5a0b8',-.5,1.8,-.3,1.1,.9,1.1)] /* 23 blossom tree */
  ],
  /* ---- kit 1 CRYSTAL ---- */
  [ [B('oct',3,0,1,0,.7,2,.7),B('oct','acc',.5,.7,.2,.5,1.4,.5,[.3,0,-.3],.7),B('oct',3,-.5,.6,.2,.45,1.2,.45,[0,0,.35]),B('oct','acc',.1,.5,-.5,.4,1,.4,[-.3,0,0],.8),B('oct',3,.1,.45,.55,.35,.9,.35,[.4,0,0])], /* 3 crystal cluster */
    [B('oct',3,0,.25,0,1.8,.5,1.6),B('oct','acc',.3,.4,.1,.9,.3,.8,null,.7)], /* 4 crystal slab */
    [...RG(5,.5,(x,z,a,q)=>B('oct',q%2?3:'acc',x,.2,z,.15,.45,.15,[.3,a,.2],q%2?1:.7))], /* 5 shard patch */
    [B('oct',3,0,1.8,0,.5,3.6,.5),B('dod',2,0,.2,0,.9,.4,.9)], /* 6 needle */
    [B('hemi',2,0,0,0,1.5,1.1,1.5),B('hemi','acc',0,.05,0,1,.8,1,null,.8),B('sphL',3,.2,.55,.1,.3,.3,.3)], /* 7 geode */
    [B('cyl',2,0,.3,0,.6,.6,.6),B('cyl',3,0,.65,0,.45,.1,.45),B('sphL','acc',0,1,0,.5,.5,.5)], /* 8 orb pedestal */
    [B('oct',3,-.55,1.2,0,.5,2.4,.5,[0,0,.08]),B('oct',3,.55,1.1,0,.5,2.2,.5,[0,0,-.08]),B('oct','acc',0,.5,0,.4,1,.4,null,.7)], /* 9 twin spires */
    [B('dod',2,0,.4,0,1.5,.9,1.3),B('oct',3,.3,.9,.1,.4,1.1,.4,[0,0,-.3]),B('oct','acc',-.3,.8,0,.3,.9,.3,[0,0,.3],.8),B('oct',3,0,.8,.4,.3,.8,.3,[.4,0,0])], /* 10 rock with crystals */
    [B('dod',3,0,.55,0,1.7,1.1,1.5),B('dod',2,.5,.35,.3,.9,.7,.9)], /* 11 faceted boulder */
    [...RG(5,.4,(x,z,a,q)=>[B('taper',2,x,.3,z,.08,.6,.08),B('sphL','acc',x,.65,z,.22,.22,.22)]).flat()], /* 12 crystal flowers */
    [B('oct','acc',0,1.4,0,.7,1.6,.7,[0,.5,.2],.9),B('disc',2,0,.03,0,.9,1,.9)], /* 13 floating crystal */
    [B('cyl6',2,0,.12,0,2,.25,2),B('cyl6',3,0,.34,0,1.5,.2,1.5),B('cyl6','acc',0,.52,0,1,.16,1,null,.7)], /* 14 crystal tiers */
    [B('cone4',2,0,1.2,0,.6,2.4,.6),B('cone4',2,.5,.5,.2,.4,1,.4,[0,0,-.3])], /* 15 obsidian spike */
    [B('cyl',2,0,.6,0,.3,1.2,.3),B('oct',3,0,1.6,0,1.2,1.1,1.2),B('oct','acc',.5,1.4,.2,.6,.7,.6,null,.8),B('oct',3,-.5,1.5,-.2,.6,.8,.6)], /* 16 crystal tree */
    [...RG(6,.8,(x,z,a)=>B('dod',2,x,.15,z,.5,.3,.5,[0,a,0]))], /* 17 rubble ring */
    [...RG(7,.6,(x,z,a,q)=>B('oct',q%2?3:'acc',x*(1+q%3*.3),.1,z*(1+q%3*.3),.4,.2,.4,[0,a,.3],q%2?1:.7))], /* 18 crystal bed */
    [B('box',2,0,1.5,0,.7,3,.35),B('box','acc',0,1.5,.19,.4,2.2,.02,null,.8)], /* 19 monolith */
    [B('oct',3,0,.8,0,.5,1.6,.5,[.25,0,.25]),B('oct',3,.4,.6,.1,.4,1.2,.4,[-.2,0,-.35]),B('oct','acc',-.4,.6,0,.4,1.2,.4,[0,.3,.4],.8)], /* 20 prism cluster */
    [B('taper',2,0,.5,0,.16,1,.16),B('sphL','acc',0,1.1,0,.5,.6,.5,null,.9),B('cyl',3,0,.03,0,.5,.06,.5)], /* 21 glow lantern */
    [B('cyl6',2,0,.35,0,1.2,.7,1.2),B('oct','acc',0,.85,0,.7,.6,.7,null,.8)], /* 22 crystal stump */
    [...RG(7,.1,(x,z,a,q)=>B('oct',q%2?3:'acc',(q-3)*.28,.6+(3-Math.abs(q-3))*.2,0,.22,1+(3-Math.abs(q-3))*.4,.22,[0,0,(q-3)*.22],q%2?1:.8))] /* 23 shard fan */
  ],
  /* ---- kit 2 RUINS ---- */
  [ [B('cyl',2,0,.6,0,.8,1.2,.8),B('cyl',3,0,1.25,0,.9,.1,.9,[.15,0,.1]),B('box',2,.7,.2,.3,.5,.4,.5,[0,.5,0])], /* 3 broken column */
    [B('cyl',2,0,.4,0,.8,2.4,.8,[0,0,H]),B('cyl',3,1.21,.4,0,.9,.1,.9,[0,0,H])], /* 4 fallen column */
    [B('box',2,-.9,1.1,0,.5,2.2,.5),B('box',2,.9,1.1,0,.5,2.2,.5),B('box',3,0,2.35,0,2.4,.4,.55)], /* 5 arch ruin */
    [B('box',2,0,.3,0,.9,.6,.9),B('taper',3,0,1.1,0,.7,1.1,.5),B('sph',3,0,1.85,0,.45,.45,.45)], /* 6 statue */
    [B('dod',2,0,.3,0,1.2,.6,1.1),B('box',3,.5,.2,.3,.6,.4,.5,[0,.6,0]),B('box',2,-.5,.25,-.2,.5,.5,.5,[.2,.3,0]),B('dod',3,.1,.55,-.3,.6,.4,.6)], /* 7 rubble */
    [B('box',2,0,.55,0,2.4,1.1,.5),B('box',3,-.6,1.15,0,.9,.3,.5)], /* 8 crumbled wall */
    [B('box',2,0,.15,0,2,.3,1.6),B('box',3,.2,.45,0,1.6,.3,1.3),B('box',2,.4,.75,0,1.2,.3,1)], /* 9 stairs */
    [B('box',2,0,1.2,0,.5,2.4,.5),B('cone4',3,0,2.65,0,.5,.5,.5,[0,.78,0]),B('box',3,0,.1,0,.8,.2,.8)], /* 10 small obelisk */
    [B('box',2,0,.3,0,1.8,.6,.9),B('box',3,0,.7,0,1.9,.25,1,[0,.05,0]),B('sphL','acc',0,.9,0,.3,.2,.3)], /* 11 sarcophagus */
    [B('cyl',2,0,.4,0,.25,.8,.25),B('hemi',3,0,.8,0,.8,.4,.8),B('sphL','acc',0,1,0,.4,.5,.4)], /* 12 brazier */
    [B('cyl',2,0,.3,0,1.4,.6,1.4),B('cyl',3,0,.31,0,1,.6,1)], /* 13 ring well */
    [B('box',3,0,1,0,.9,2,.22),B('box','acc',0,1,.12,.5,1.2,.02,null,.8)], /* 14 stele */
    [B('box',3,0,.04,0,2.2,.08,2.2),B('box',2,0,.06,0,1.6,.08,1.6),B('box','acc',0,.08,0,.8,.06,.8,null,.8)], /* 15 mosaic floor */
    [B('hemi',2,0,0,0,2.2,1.3,2.2),B('hemi',3,.3,.05,.2,1.2,.7,1.2)], /* 16 broken dome */
    [...RG(3,.7,(x,z,a,q)=>B('cyl',q%2?3:2,x,.4+q*.08,z,.5,.8+q*.16,.5))], /* 17 pillar stumps */
    [B('cyl',2,0,.8,0,.25,1.6,.25),B('sph',3,0,1.8,0,.55,.55,.55),B('sphL','acc',-.12,1.85,.2,.12,.12,.12),B('sphL','acc',.12,1.85,.2,.12,.12,.12),B('box',2,0,.1,0,.7,.2,.7)], /* 18 skull totem */
    [B('box',2,0,.3,0,1.5,.6,.9),B('box',3,0,.7,0,1.7,.2,1.1),B('sphL','acc',-.5,.9,0,.25,.25,.25),B('sphL','acc',.5,.9,0,.25,.25,.25)], /* 19 altar */
    [B('box',2,0,.5,-.5,2,1,.4),B('box',3,-.8,.5,.1,.4,1,1.2)], /* 20 wall corner */
    [B('box',2,-.7,1,0,.45,2,.45),B('box',2,.7,.6,0,.45,1.2,.45,[0,0,.1]),B('box',3,-.4,2.15,0,.9,.3,.5,[0,0,-.2])], /* 21 gate posts */
    [B('box',3,0,.3,0,1.2,.6,.9,[.2,.4,.1]),B('tor',2,0,.62,0,1,1,1,[H,0,0])], /* 22 capital block */
    [B('sph',3,0,0,0,2.4,.9,2.4),B('sph',2,.6,.1,.3,1.2,.5,1.2)] /* 23 sand mound */
  ],
  /* ---- kit 3 FUNGAL ---- */
  [ [B('taper',3,0,1.2,0,.55,2.4,.55),B('hemi','acc',0,2.3,0,2.8,1.4,2.8,null,.8),B('sphL',3,.8,2.6,.3,.3,.3,.3)], /* 3 giant mushroom */
    [...RG(3,.4,(x,z,a,q)=>[B('taper',3,x,.2+q*.05,z,.14,.4+q*.1,.14),B('hemi','acc',x,.4+q*.1,z,.5+q*.12,.3,.5+q*.12,null,.7+q*.1)]).flat()], /* 4 mushroom trio */
    [...RG(5,.5,(x,z,a,q)=>[B('cone',1,x,.4,z,.05,.8+(q%2)*.4,.05),B('sphL','acc',x,.85+(q%2)*.4,z,.2,.2,.2,null,.9)]).flat()], /* 5 spore pods */
    [B('cyl',3,0,.9,0,.5,1.8,.5),B('hemi',1,.1,.7,0,1.4,.4,1.4),B('hemi','acc',-.1,1.2,.1,1.1,.35,1.1,null,.7),B('hemi',1,0,1.7,0,.8,.3,.8)], /* 6 bracket fungus */
    [B('sph',3,0,.6,0,1.2,1.2,1.2),B('sphL','acc',0,1.1,0,.3,.2,.3,null,.8)], /* 7 puffball */
    [B('taper',3,0,.5,0,.3,1,.3),B('cone',1,-.35,1,0,.2,.9,.2,[0,0,.5]),B('cone','acc',.35,1.1,0,.2,1,.2,[0,0,-.5],.8),B('cone',3,0,1.3,.2,.2,.8,.2,[.4,0,0])], /* 8 coral fungus */
    [B('cone',1,0,.5,0,.07,1,.07),...RG(6,.18,(x,z,a)=>B('sphL','acc',x,1.05,z,.22,.1,.22,[0,a,0],.9))], /* 9 spore flower */
    [B('cyl',3,0,.3,0,.6,2.2,.6,[0,0,H]),B('hemi','acc',.2,.62,0,.5,.25,.5,null,.8),B('hemi',1,-.5,.62,.1,.4,.2,.4)], /* 10 fungal log */
    [...RG(5,.5,(x,z,a,q)=>[B('cyl',3,x,.7+q*.15,z,.1,1.4+q*.3,.1),B('hemi',q%2?'acc':1,x,1.4+q*.3,z,.5,.25,.5)]).flat()], /* 11 thin mushrooms */
    [B('taper','#efe6d2',0,.45,0,.4,.9,.4),B('hemi','#d9405a',0,.9,0,1.5,.8,1.5),B('sphL',WHITE,.4,1.25,.2,.22,.15,.22),B('sphL',WHITE,-.3,1.3,.1,.2,.15,.2),B('sphL',WHITE,0,1.4,-.4,.2,.15,.2)], /* 12 spotted mushroom */
    [B('sph',1,0,0,0,2.2,1,2.2),B('sph',0,.5,.15,.2,1,.6,1)], /* 13 moss mound */
    [B('taper',3,0,1.3,0,.4,2.6,.4,[0,0,.08]),B('cone',1,.2,2.5,0,.3,.8,.3,[0,0,-.6]),B('sphL','acc',.5,2.8,0,.25,.25,.25)], /* 14 vine pillar */
    [...RG(6,.25,(x,z,a)=>B('cone',1,x,.3,z,.1,.7,.1,[Math.sin(a)*.8,0,-Math.cos(a)*.8]))], /* 15 root tendrils */
    [B('taper',3,0,.6,0,.14,1.2,.14),B('sph','acc',0,1.35,0,.6,.7,.6,null,.9),B('hemi',1,0,1.6,0,.8,.3,.8)], /* 16 lantern mushroom */
    [B('disc','acc',0,.03,0,2,1,2,null,.55),B('disc',1,0,.04,0,1.2,1,1.2,null,.8)], /* 17 mycelium mat */
    [B('cyl',3,0,.4,0,1,.8,1),B('hemi',1,.3,.8,0,.5,.3,.5),B('hemi','acc',-.3,.8,.2,.4,.25,.4,null,.8)], /* 18 mossy stump */
    [B('cyl',3,0,.3,0,.5,.6,.5),B('hemi','acc',0,.5,0,2.6,.8,2.6,null,.75)], /* 19 cap platform */
    [...RG(6,.35,(x,z,a,q)=>B('cone4',q%2?1:3,x,.4,z,.2,.8+(q%3)*.3,.2,[Math.sin(a)*.2,0,-Math.cos(a)*.2]))], /* 20 spiky fungus */
    [B('sph',1,0,.3,0,.7,.8,.7),B('sph','acc',.5,.25,.3,.6,.7,.6,null,.8),B('sph',3,-.4,.25,.35,.55,.65,.55),B('sph',1,.1,.25,-.45,.6,.7,.6)], /* 21 egg cluster */
    [B('dod',2,0,.4,0,1.6,.9,1.4),B('sph',1,0,.85,0,1.4,.5,1.2),B('taper',3,.3,1.1,0,.12,.5,.12),B('hemi','acc',.3,1.35,0,.4,.2,.4)], /* 22 mossy boulder */
    [B('sph',3,0,1,0,1.6,2.2,1.6),B('sphL','acc',0,1.2,.7,.5,.6,.3,null,.9),B('cyl',2,0,.1,0,.9,.2,.9)] /* 23 giant bulb */
  ],
  /* ---- kit 4 SNOW ---- */
  [ [B('cyl',WOOD,0,.4,0,.25,.8,.25),B('cone4',WHITE,0,1.3,0,1.4,1,1.4),B('cone4',3,0,1.9,0,1.1,1,1.1),B('cone4',WHITE,0,2.5,0,.8,1,.8),B('cone4',3,0,3.1,0,.45,.9,.45)], /* 3 snowy pine */
    [B('dod',ICE,0,.5,0,1.6,1,1.4),B('dod',WHITE,.4,.3,.4,.8,.6,.8)], /* 4 ice boulder */
    [B('sph',WHITE,0,0,0,2.4,.7,1.8),B('sph',WHITE,.6,.05,.3,1.2,.5,1)], /* 5 snowdrift */
    [...RG(5,.35,(x,z,a,q)=>B('cone4',ICE,x,.5,z,.2,1+(q%3)*.4,.2,[Math.sin(a)*.15,0,-Math.cos(a)*.15]))], /* 6 icicles */
    [B('cyl','#3a2f28',0,1,0,.22,2,.22),B('cone','#3a2f28',.4,1.6,0,.1,.9,.1,[0,0,-.9]),B('cone','#3a2f28',-.4,1.3,0,.1,.8,.1,[0,0,.9]),B('sphL',WHITE,.1,2.05,0,.25,.15,.25)], /* 7 frozen dead tree */
    [B('sph',WHITE,0,.45,0,.9,.9,.9),B('sph',WHITE,0,1.15,0,.65,.65,.65),B('sph',WHITE,0,1.7,0,.45,.45,.45),B('cone','#ff9a3c',0,1.7,.28,.1,.3,.1,[H,0,0]),B('sphL','#222',-.1,1.78,.2,.07,.07,.07),B('sphL','#222',.1,1.78,.2,.07,.07,.07)], /* 8 snowman */
    [B('cyl',ICE,0,1.2,0,.7,2.4,.7),B('cone4',WHITE,0,2.6,0,.7,.5,.7,[0,.78,0]),B('cyl',3,0,.1,0,1,.2,1)], /* 9 ice pillar */
    [B('dod',2,0,.4,0,1.5,.9,1.3),B('sph',WHITE,0,.85,0,1.3,.5,1.1)], /* 10 snowcapped rock */
    [B('disc',ICE,0,.03,0,2.4,1,2.4),B('disc','#dff3fb',.3,.04,.2,1.4,1,1.2)], /* 11 frozen pond */
    [B('dod',3,0,.25,0,1.1,.5,1),B('dod',2,0,.65,0,.8,.4,.75),B('dod',3,0,.95,0,.5,.3,.5),B('sphL',WHITE,0,1.15,0,.4,.15,.4)], /* 12 snow cairn */
    [B('oct',ICE,-.6,1.1,0,.5,2.2,.5,[0,0,.1]),B('oct',ICE,.6,1.3,0,.5,2.6,.5,[0,0,-.1]),B('oct',WHITE,0,.4,0,.5,.8,.5)], /* 13 ice spires */
    [B('sph',WHITE,0,.5,0,1.5,1,1.5),B('sph',0,.4,.6,.3,.7,.6,.7),B('sphL','acc',-.3,.9,.4,.2,.2,.2)], /* 14 snowy bush */
    [B('cyl',WOOD,0,.2,0,.4,1.6,.4,[0,0,H]),B('cyl',WOOD,.1,.55,.1,.4,1.5,.4,[0,.4,H]),B('cyl',WOOD,-.1,.35,-.3,.35,1.4,.35,[0,-.3,H]),B('sph',WHITE,0,.8,0,1.4,.3,.9)], /* 15 log pile */
    [...RG(5,.3,(x,z,a,q)=>[B('cone',2,x,.25,z,.04,.5,.04),B('sphL','acc',x,.55,z,.2,.2,.2,null,.9)]).flat()], /* 16 frost flowers */
    [B('oct',ICE,0,1,0,.5,2,.5),B('oct',WHITE,.4,.6,.1,.35,1.2,.35,[0,0,-.3]),B('oct',ICE,-.4,.5,0,.3,1,.3,[0,0,.3])], /* 17 frost spire */
    [B('hemi',WHITE,0,0,0,2.4,1.3,2.4),B('box',3,0,.3,1.1,.7,.6,.5),B('hemi',ICE,.5,.1,.3,.7,.4,.7)], /* 18 igloo */
    [B('cone4',3,0,1.1,0,1,2.2,1),B('cone4',WHITE,.8,.8,.3,.8,1.6,.8),B('cyl',WOOD,0,.3,0,.2,.6,.2)], /* 19 pine pair */
    [B('box',ICE,0,.6,0,1.5,1.2,.5,[0,.4,.15]),B('box',WHITE,0,1.25,0,1.3,.1,.45,[0,.4,.15])], /* 20 ice slab */
    [B('cyl',WOOD,0,.25,0,.9,.5,.9),B('sph',WHITE,0,.55,0,.9,.2,.9)], /* 21 snowy stump */
    [B('cyl','#3a2f28',0,.8,0,.12,1.6,.12),B('box','#3a2f28',0,1.7,0,.4,.4,.4),B('sphL','acc',0,1.7,0,.28,.28,.28,null,.95),B('cone4','#3a2f28',0,2,0,.5,.3,.5,[0,.78,0])], /* 22 lantern post */
    [B('cone',WHITE,-.4,.9,0,.4,1.8,.3,[0,0,.5]),B('cone',WHITE,.4,.9,0,.4,1.8,.3,[0,0,-.5]),B('dod',3,0,.2,0,.8,.4,.7)] /* 23 tusks */
  ]];
})();
/* v5_255 EVEN MORE SCENERY: 30 more props per kit (54 per kit, 270 in all), at least 18 of them PLANTS per kit so every world has living flora.
   Each entry = [parts, collision radius (fraction of drawn size 28 x scale, 0 = walk-through), standable top height (null = never)].
   Props 0-2 original, 3-23 (KX), 24-53 (KY). The radius / height of every prop is copied into DECO_R3 / DECO_H3 (05_render2d.js) in the same order. */
const KY=(()=>{
  const B=(g,c,x,y,z,w,h,d,r,k)=>{const o={g,c,p:[x,y,z],s:[w,h,d]};if(r)o.r=r;if(k)o.k=k;return o};
  const RG=(n,rad,f)=>Array.from({length:n},(_,q)=>{const a=q/n*6.2832;return f(Math.cos(a)*rad,Math.sin(a)*rad,a,q)});
  const WOOD='#4a3a2c',WHITE='#f2f6fb',ICE='#bfe3f5',H=1.5708,N=null,E=(p,r,h)=>[p,r,h];
  const tilt=(a,t)=>[Math.sin(a)*t,0,-Math.cos(a)*t];
  /* aim(u): Euler [rx,0,rz] that turns the +Y axis of a part to the unit vector u (the game's Euler order is XYZ) */
  const aim=(u)=>[Math.atan2(u[2],u[1]),0,-Math.asin(Math.max(-1,Math.min(1,u[0])))];
  /* limb(): a cylinder that really runs from point a to point b (trunks, branches, legs: no gaps between segments) */
  const limb=(c,a,b,w,w2)=>{const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d),u=d.map(v=>v/L);return B(w2!=null?'taper':'cyl',c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,L,w,aim(u))};
  /* frond(): a flat leaf (cone) that starts at point p and points outward at angle a, tilted th from vertical, length len */
  const frond=(c,p,a,th,len,w)=>{const u=[Math.cos(a)*Math.sin(th),Math.cos(th),Math.sin(a)*Math.sin(th)];return B('cone',c,p[0]+u[0]*len/2,p[1]+u[1]*len/2,p[2]+u[2]*len/2,w,len,w*.45,aim(u))};
  /* ---- plant builders (c = palette index or colour) ---- */
  const shrub=(c1,c2,fl)=>[B('sph',c1,0,.5,0,1.4,1,1.4),B('sph',c2,.35,.65,.2,.9,.8,.9),...(fl?[B('sphL',fl,.45,.95,.4,.2,.2,.2),B('sphL',fl,-.3,.85,.45,.2,.2,.2),B('sphL',fl,.1,1.1,-.3,.2,.2,.2)]:[])];
  const bed=(c,f1,f2)=>[B('disc',c,0,.04,0,2,1,2),...RG(6,.55,(x,z,a,q)=>[B('cone',c,x,.25,z,.06,.5,.06),B('sphL',q%2?f1:f2,x,.55,z,.22,.22,.22)]).flat()];
  const grass=(c1,c2)=>RG(9,.3,(x,z,a,q)=>B('cone',q%2?c1:c2,x,.5,z,.1,1+(q%3)*.25,.1,tilt(a,.25)));
  const reeds=(c,tip)=>RG(6,.35,(x,z,a,q)=>[B('cyl',c,x,.8+q%3*.15,z,.06,1.6+q%3*.3,.06,tilt(a,.06)),B('sphL',tip,x,1.7+q%3*.3,z,.14,.35,.14)]).flat();
  const palm=(tc,lc)=>{const P=[[0,0,0],[.12,1.1,0],[.38,2.1,0],[.75,3,0]];return [...[0,1,2].map(k=>limb(tc,P[k],P[k+1],.32-k*.04)),B('sphL','#7a5a2a',.78,2.9,.1,.3,.3,.3),B('sphL','#7a5a2a',.68,2.9,-.1,.3,.3,.3),...RG(8,1,(x,z,a,q)=>frond(lc,P[3],a,1.05+(q%2)*.3,1.7,.34))]};
  const bamboo=(c,t)=>RG(5,.35,(x,z,a,q)=>[B('cyl',c,x,1.2+q*.15,z,.1,2.4+q*.3,.1),B('cyl',t,x,1.2+q*.15,z,.13,.05,.13),B('cone',c,x,2.5+q*.3,z,.5,.5,.5,tilt(a,.3))]).flat();
  const cactus=(c,fl)=>[B('cyl',c,0,1,0,.55,2,.55),B('sph',c,0,2,0,.55,.4,.55),B('cyl',c,.5,1.1,0,.4,.3,.3,[0,0,H]),B('cyl',c,.7,1.5,0,.28,.8,.28),B('sph',c,.7,1.9,0,.28,.25,.28),B('cyl',c,-.45,.9,0,.4,.3,.3,[0,0,H]),B('cyl',c,-.65,1.25,0,.26,.7,.26),B('sphL',fl,0,2.2,0,.25,.2,.25)];
  const willow=(tc,lc,l2)=>[B('cyl',tc,0,.9,0,.5,1.8,.5),B('sph',lc,0,2.1,0,2.2,1.1,2.2),...RG(9,.95,(x,z,a,q)=>B('cone',q%2?lc:l2,x,1.4,z,.16,1.7,.16,[Math.PI,0,0]))];
  const spruce=(c1,c2)=>[B('cyl',WOOD,0,.3,0,.25,.6,.25),B('cone6',c1,0,1.1,0,1.5,1.2,1.5),B('cone6',c2,0,1.9,0,1.1,1.1,1.1),B('cone6',c1,0,2.6,0,.75,1,.75),B('cone6',c2,0,3.2,0,.4,.8,.4)];
  const agave=(c,t)=>RG(9,1,(x,z,a,q)=>frond(q%2?c:t,[0,.05,0],a,.55+(q%3)*.25,1.2+(q%2)*.2,.3));
  const bigleaf=(c,st)=>[limb(st,[0,0,0],[.1,1.35,0],.09),B('sph',c,.45,1.45,0,1.9,.1,1.1,[0,.2,.3]),limb(st,[0,0,0],[-.45,.9,.3],.08),B('sph',c,-.8,.95,.3,1.4,.1,.9,[0,-.4,.35])];
  const fern=(c1,c2)=>RG(10,1,(x,z,a,q)=>frond(q%2?c1:c2,[0,.05,0],a,.8+(q%3)*.2,1.3+(q%2)*.3,.22));
  const lotus=(c,f)=>[B('disc',c,0,.03,0,1.6,1,1.6),B('disc',c,.7,.04,.3,.8,1,.8),B('disc',c,-.6,.04,-.4,.7,1,.7),B('sphL',f,.1,.2,0,.4,.35,.4),B('sphL',WHITE,.1,.3,0,.2,.2,.2)];
  const moss=(c1,c2)=>[B('disc',c1,0,.03,0,2.4,1,2.4),B('disc',c2,.4,.05,.2,1.4,1,1.2),B('sph',c2,-.5,.1,-.3,.7,.3,.6)];
  const vinepost=(c,v)=>[B('cyl',c,0,.9,0,.3,1.8,.3),...RG(6,.2,(x,z,a,q)=>B('sphL',v,x,.3+q*.28,z,.35,.3,.35))];
  const hedge=(c1,c2)=>[B('box',c1,0,.5,0,2.2,1,.8),B('sph',c2,-.6,1.05,0,.9,.5,.7),B('sph',c2,.5,1.05,0,.9,.5,.7),B('sph',c1,0,1.1,0,.8,.4,.6)];
  const spire=(c,t)=>[B('cone6',c,0,1.6,0,.9,3.2,.9),B('cone6',t,.4,.9,.2,.6,1.8,.6)];
  const thorn=(c,t)=>[B('cone4',c,0,.6,0,.5,1.2,.5,[.2,0,.1]),B('cone4',c,.4,.5,.2,.4,1,.4,[0,0,-.5]),B('cone4',c,-.4,.5,-.1,.4,1,.4,[0,0,.5]),B('cone4',c,.1,.45,-.4,.4,.9,.4,[-.5,0,0]),B('cone4',c,-.1,.4,.4,.35,.8,.35,[.5,0,0]),B('sphL',t,.2,.9,.2,.2,.2,.2)];
  const mv=(L,dx,dz)=>L.map(o=>Object.assign({},o,{p:[o.p[0]+dx,o.p[1],o.p[2]+dz]}));
  const tuft=(c,t)=>[...RG(7,.3,(x,z,a,q)=>B('cone',q%2?c:t,x,.35,z,.08,.7,.08,tilt(a,.3)))];
  const crown=(tc,c1,c2)=>[B('cyl',tc,0,.8,0,.32,1.6,.32),B('sph',c1,0,2.1,0,2.1,1.5,2.1),B('sph',c2,.6,2.4,.3,1.3,1,1.3),B('sph',c1,-.6,2.2,-.2,1.2,1,1.2)];
  const bare=(tc,tw)=>[limb(tc,[0,0,0],[0,2.1,0],.22,1),limb(tc,[0,1.4,0],[.7,2.2,0],.1),limb(tc,[0,1.2,0],[-.7,1.9,.1],.1),limb(tc,[0,1.8,0],[.2,2.6,.5],.08),B('sphL',tw,.7,2.25,0,.2,.12,.2)];
  const dwarf=(c1,c2)=>[B('sph',c1,0,.35,0,1.6,.7,1.6),B('sph',c2,.3,.5,.2,.9,.5,.9)];
  /* ---- non-plant props ---- */
  const bench=(c)=>[B('box',c,-.6,.25,0,.3,.5,.5),B('box',c,.6,.25,0,.3,.5,.5),B('box',c,0,.55,0,1.7,.12,.55)];
  const crates=(c,d)=>[B('box',c,0,.3,0,.8,.6,.8),B('box',d,.7,.25,.2,.6,.5,.6,[0,.4,0]),B('box',c,.1,.85,0,.6,.5,.6,[0,.3,0])];
  const tent=(c,t)=>[B('cone4',c,0,.7,0,1.8,1.4,1.8,[0,.78,0]),B('box',t,0,.25,.6,.5,.5,.1)];
  const pile=(c,d)=>[B('dod',c,0,.3,0,1.2,.6,1),B('dod',d,.5,.2,.3,.7,.4,.7),B('dod',c,-.5,.2,-.2,.6,.4,.6)];
  const pot=(c,a)=>[B('cyl',c,0,.3,0,.6,.6,.6),B('cyl',a,0,.6,0,.5,.1,.5)];
  const KY0=[ /* ---- FOREST: 18 plants ---- */
    E(willow(WOOD,0,1),.5,N),E(palm('#7a5a3a',0),.4,N),E(bamboo('#7ab05a','#5a8a3a'),.5,N),E(reeds('#8aa05a','#6a4a2a'),0,N),
    E([B('disc',0,0,.03,0,1.8,1,1.8),...RG(5,.4,(x,z,a,q)=>[B('cyl',0,x,.7,z,.07,1.4,.07),B('cyl','#ffd23a',x,1.4+q%2*.1,z,.5,.08,.5,[H,0,0]),B('sphL','#5a3a1a',x,1.4+q%2*.1,z,.22,.12,.22)]).flat()],.45,N),
    E(bed(0,'#ff6a7a','#ffd23a'),0,N),E(moss(0,1),0,N),E(grass(0,1),0,N),E(spruce(0,1).map((o,i)=>(o.s=o.s.map(v=>v*.55),o.p=o.p.map(v=>v*.55),o)),.2,N),
    E(crown('#6b4a36','#e0762a','#c94a2a'),.4,N),E(hedge(0,1),.8,N),E(shrub(1,0,WHITE),.65,.8),
    E([B('disc',0,0,.03,0,2,1,2),...RG(5,.5,(x,z,a,q)=>B('sph',q%2?'#e8862a':'#7ab04a',x,.3,z,.55,.5,.55)),B('sph','#e8862a',0,.35,0,.7,.6,.7)],.9,.5),
    E(RG(9,.35,(x,z,a,q)=>B('cone','#d8b85a',x,.7,z,.07,1.4,.07,tilt(a,.12))),0,N),E(fern(0,1),0,N),
    E([B('cyl',WOOD,0,1.1,0,.35,2.2,.35),B('sph',0,0,2.3,0,1.9,1,1.9),...RG(8,.8,(x,z,a,q)=>B('cone',q%2?1:0,x,1.5,z,.1,1.5,.1,[Math.PI,0,0]))],.35,N),
    E(bigleaf(1,'#5a8a3a'),.2,N),E(bed(1,'#9a7ae0','#c8a8ff'),0,N),
    /* ---- FOREST: 12 other ---- */
    E(bench('#6b5646'),.7,.55),E([B('cone','#d8b85a',0,.7,0,1.8,1.4,1.5),B('sph','#d8b85a',0,.15,0,1.8,.5,1.5)],.8,1.0),
    E([B('box','#7a5a3a',0,.55,0,1.4,.5,.8),B('cyl',WOOD,-.55,.3,.45,.6,.1,.6,[H,0,0]),B('cyl',WOOD,-.55,.3,-.45,.6,.1,.6,[H,0,0]),B('box','#9a7a5a',.2,.9,0,.7,.4,.6)],.8,.6),
    E([B('cyl',WOOD,0,.8,0,.12,1.6,.12),B('box',WOOD,0,1.25,0,1.3,.1,.1),B('sph','#d8b85a',0,1.75,0,.45,.45,.45),B('cone','#6b4a36',0,2.1,0,.7,.4,.7)],.3,N),
    E([B('box','#c89a4a',0,.3,0,.6,.6,.6),B('cone4','#8a5a2a',0,.75,0,.8,.3,.8,[0,.78,0]),B('box',WOOD,-.4,.2,0,.1,.4,.1),B('box',WOOD,.4,.2,0,.1,.4,.1)],.4,N),
    E([B('box',2,0,1.2,0,.55,2.4,.4),B('dod',3,.2,.15,.1,.9,.3,.7)],.4,N),
    E([B('cyl',2,0,.2,0,1.5,.4,1.5),B('disc','#3a8ab0',0,.41,0,1.1,1,1.1)],.75,.4),
    E([B('cyl',3,0,.45,0,.3,.9,.3),B('cyl',3,0,.9,0,.9,.1,.9),B('disc','#5aa0c0',0,.96,0,.7,1,.7)],.45,N),
    E(tent('#c8b08a','#3a2f28'),.9,N),E(crates('#8a6a4a','#6b5646').concat([B('box','#6b5646',-.8,.2,0,1.2,.4,.3,[0,0,H])]),.9,.8),
    E([B('cyl','#8a5a2a',0,.3,0,.5,.6,.5),B('cyl','#8a5a2a',.7,.3,0,.5,.6,.5),B('cyl','#9a6a3a',.35,.8,0,.5,.6,.5),B('cyl','#8a5a2a',-.7,.3,.2,.5,.6,.5)],.9,.75),
    E([B('dod',2,0,.45,0,1.5,.9,1.3),B('sph',1,0,.85,0,1.2,.4,1),B('dod',3,1.1,.3,.2,.9,.6,.8),B('sph',0,1.1,.55,.2,.7,.3,.6)],1.0,.9)
  ];
  const KY1=[ /* ---- CRYSTAL: 18 plants (glass-leaf, glow and living flora) ---- */
    E(fern(1,'acc'),0,N),E(palm(2,3).map(o=>(typeof o.c==='number'&&o.g==='cone'&&(o.c='acc'),o)),.4,N),E(reeds(3,'acc'),0,N),
    E(RG(5,.4,(x,z,a,q)=>[B('taper',1,x,.4,z,.08,.8,.08),B('sph','acc',x,.95,z,.4,.45,.4,null,.9)]).flat().concat([B('disc',1,0,.03,0,1.8,1,1.8)]),0,N),
    E(moss(1,'acc'),0,N),E(bamboo(3,'acc'),.5,N),E(lotus(1,'acc'),0,N),E(shrub(1,3,'acc'),.65,.8),E(grass('acc',3),0,N),
    E(willow(2,3,'acc'),.5,N),E(lotus(3,'#ff9ae0'),0,N),E(thorn(3,'acc'),.55,N),E(bigleaf('acc',3),.2,N),
    E([B('cyl',WOOD,0,.4,0,.2,.8,.2),B('sph',1,0,1.1,0,1.1,.9,1.1),B('oct','acc',.3,1,.3,.2,.35,.2,null,.9),B('oct','acc',-.3,1.2,.1,.2,.35,.2,null,.9),B('oct','acc',0,.95,-.4,.2,.35,.2,null,.9)],.4,N),
    E(RG(9,.35,(x,z,a,q)=>B('cone',q%2?3:1,x,.8,z,.07,1.6,.07,tilt(a,.14))),0,N),E(bed(1,'acc','#ff9ae0'),0,N),
    E([limb(3,[0,0,0],[.4,1.1,0],.3),limb(3,[.4,1.1,0],[0,2,0],.24),B('sph',1,0,2.3,0,1.5,.9,1.5),B('oct','acc',.4,2.2,.1,.25,.4,.25,null,.9)],.4,N),E(agave(1,'acc'),0,N),
    /* ---- CRYSTAL: 12 other ---- */
    E([B('dod',2,0,.5,0,1.1,1,1.1),B('box','acc',0,.5,.58,.5,.7,.03,null,.8)],.6,N),
    E([B('box',3,0,.15,0,2.2,.3,1.1),B('box','acc',0,.32,0,1.8,.05,.9,null,.7)],1.1,.3),
    E([B('disc',2,0,.03,0,2.2,1,2.2),B('disc','acc',0,.05,0,1.7,1,1.7,null,.8)],0,N),
    E([B('oct',3,-.5,.8,0,.4,1.6,.4),B('oct',3,.5,.8,0,.4,1.6,.4)],.8,N),
    E(RG(6,.7,(x,z,a,q)=>B('oct',q%2?3:'acc',x,.7+q%2*.3,z,.25,.6,.25,[0,a,0],q%2?1:.8)),.9,N),
    E([B('dod',2,0,.5,0,2,1,1.5),B('dod',1,0,.55,.6,1.1,.8,.5)],1.0,1.0),
    E([...RG(5,.2,(x,z,a,q)=>B('oct',q%2?3:'acc',x,.25,z,.4,.5,.4,[0,a,0],q%2?1:.8))],.5,.5),
    E([B('disc',3,0,.03,0,2,1,2),B('disc','#bfe8ff',0,.05,0,1.5,1,1.5)],0,N),
    E([B('cyl',2,0,.2,0,.7,.4,.7),B('cyl',3,0,.45,0,.9,.06,.9),B('cone4',2,0,.65,0,.1,.5,.1)],.45,.4),
    E([B('taper',2,0,.9,0,.5,1.8,.5),B('oct','acc',0,1.9,0,.6,.7,.6,null,.9),B('box',3,0,.1,0,.9,.2,.9)],.4,N),
    E([B('sph',3,0,.7,0,.5,1.1,.5),B('tor',2,0,.7,0,1.4,1.4,1.4,[H,0,0])],.5,N),
    E([B('disc',2,0,.03,0,1.8,1,1.8),B('sph',1,0,.25,0,.9,.5,.9),B('sph','acc',0,.4,0,.4,.5,.4,null,.9)],.8,.4)
  ];
  const KY2=[ /* ---- RUINS: 18 plants (overgrowth, dry-land flora) ---- */
    E([B('cyl',2,0,.8,0,.8,1.6,.8),B('sph',1,0,1.4,0,1.1,.9,1.1),B('sph',0,.2,.6,.45,.9,.8,.5)],.55,N),E(cactus(1,'#ff6a9a'),.4,N),
    E([...cactus(0,'#ffd23a'),B('cyl',0,-.25,.5,.5,.35,1,.35),B('sphL','#ff6a9a',-.25,1.05,.5,.2,.2,.2)],.5,N),E(agave(0,1),0,N),
    E(dwarf('#8a7a4a','#a89a5a'),.7,.5),E(crown('#6b5646','#7a8a5a','#98a870'),.4,N),E(palm('#8a6a4a','#5a8a3a'),.4,N),
    E([B('box',2,0,.8,0,2,1.6,.4),...RG(8,.8,(x,z,a,q)=>B('sph',q%2?1:0,x*1.1,.3+q*.2,.3,.4,.5,.4))],.9,N),
    E(bed(0,'#ffa03a','#ff6a5a'),0,N),E(grass('#c8b25a','#a8944a'),0,N),
    E([...mv(palm('#8a6a4a',1),-.9,-.2),...mv(palm('#7a5a3a',0).map(o=>(o.s=o.s.map(v=>v*.8),o.p=o.p.map(v=>v*.8),o)),.8,.4)],.9,N),
    E([B('cyl','#6a5a46',0,.3,0,.3,.6,.3),B('cone6',0,0,2,0,1,3.2,1),B('cone6',1,.15,1.5,.1,.7,2.2,.7)],.35,N),E(thorn('#6a5a46','#d6405a'),.55,N),E(reeds('#8aa05a','#6a4a2a'),0,N),
    E([B('dod',2,0,.3,0,1.5,.6,1.2),B('sph',0,0,.55,0,1.2,.35,1),B('sph',1,.4,.5,.2,.6,.3,.5)],.8,.55),
    E([B('cyl','#b8643a',0,.35,0,.7,.7,.7),B('cyl','#b8643a',0,.75,0,.9,.1,.9),...fern(0,1).map(o=>(o.p[1]+=.6,o))],.4,N),
    E([B('cyl',2,0,.15,0,.9,.3,.9),B('cyl','#6a5a3a',0,.5,0,.12,.7,.12),...RG(5,.1,(x,z,a)=>B('cone',0,x,1,z,.2,.6,.2,tilt(a,.7)))],.4,.3),
    E(shrub('#8a2a3a','#a8444a','#ffd23a'),.65,.8),
    /* ---- RUINS: 12 other ---- */
    E([B('sph',3,0,.5,0,1,1,1),B('box',2,0,.1,0,1.2,.2,1.2)],.5,N),
    E([B('cyl','#b8643a',-.5,.4,0,.5,.8,.5),B('cyl','#a8542a',.4,.35,.2,.45,.7,.45),B('cyl','#b8643a',0,.3,-.5,.4,.6,.4,[.8,0,0])],.8,.7),
    E(tent('#d8c8a0','#3a2f28'),.9,N),
    E([B('cyl',3,0,.25,0,1.6,.5,1.6),B('cyl',2,0,.55,0,.3,.7,.3),B('cyl',3,0,.9,0,.9,.1,.9)],.8,.5),
    E([B('box',3,0,.06,0,1.8,.12,1.2,[0,.3,0]),B('box',2,0,.12,.2,1,.04,.04,[0,.6,0])],0,N),
    E([B('box',2,0,.8,0,.8,1.6,.8,[.4,.3,0])],.5,N),
    E([B('box',3,0,.35,0,1.8,.7,.8),B('sph',3,.9,.8,0,.6,.7,.6),B('box',2,-.5,.1,.5,.7,.2,.4)],1.0,.7),
    E([B('cyl',WOOD,0,.8,0,.12,1.6,.12),B('box','#d8c8a0',0,1.3,0,.7,.5,.1),B('box',WOOD,.35,1.3,0,.08,.6,.12)],.3,N),
    E([B('box',WOOD,-.8,.7,0,.12,1.4,.12),B('box',WOOD,.8,.7,0,.12,1.4,.12),B('box','#b8643a',0,1.4,0,2,.1,1,[0,0,.1]),B('box',WOOD,0,.8,0,1.6,.1,.6)],.9,N),
    E([B('cyl',3,0,.5,0,.2,1,.2),B('tor',2,0,.8,0,.6,.6,.6,[H,0,0])],.3,N),
    E([B('cyl','#4a3a2c',-.4,.2,0,.35,.4,.35,[0,0,H]),B('cyl','#4a3a2c',.1,.2,.3,.35,.4,.35,[0,.3,H]),B('sphL','acc',0,.2,0,.4,.3,.4)],.7,.35),
    E([B('sph','#e8e0c8',0,.2,0,.9,.4,.8),B('sph','#e8e0c8',.5,.35,.2,.4,.4,.4),B('cyl','#e8e0c8',-.5,.15,.4,.12,.9,.12,[0,0,H]),B('cyl','#e8e0c8',-.2,.15,-.4,.12,.8,.12,[0,.5,H])],.7,.4)
  ];
  const KY3=[ /* ---- FUNGAL: 18 plants (ferns, vines, swamp flora) ---- */
    E(fern(1,3),0,N),E(willow(3,1,'acc'),.5,N),E(reeds(1,'acc'),0,N),E(lotus(1,'acc'),0,N),E(moss(1,'acc'),0,N),E(bed(1,'acc','#ff9ae0'),0,N),
    E([B('taper',1,0,.7,0,.5,1.4,.5),B('cone',1,0,1.7,0,.9,.9,.9,[0,0,0]),B('hemi','acc',0,1.9,0,.5,.3,.5,[.6,0,0],.7),B('cyl',3,0,.03,0,.9,.06,.9)],.4,N),
    E(willow(3,3,1),.5,N),
    E([limb(3,[-.9,0,0],[0,1.3,0],.2),limb(3,[.9,0,.2],[0,1.3,0],.2),limb(3,[0,0,-.9],[0,1.3,0],.2),limb(3,[0,0,0],[0,1.6,0],.35),B('sph',1,0,1.9,0,2.2,1.1,2.2),B('sph',0,.5,2.1,.3,1.2,.8,1.2)],.4,N),
    E(grass(1,0).map(o=>(o.s[1]*=1.3,o.p[1]*=1.3,o)),0,N),
    E([...RG(14,.12,(x,z,a,q)=>B('sphL',q%2?1:'acc',x*(1+q*.15),.15+q*.14,z*(1+q*.15),.3,.28,.3))],.4,N),
    E(bigleaf(1,3),.2,N),
    E([B('disc',1,0,.03,0,1.6,1,1.6),...RG(4,.4,(x,z,a,q)=>[B('cyl',3,x,.4,z,.05,.8,.05),B('sph','#ff9ae0',x,.85,z,.35,.3,.3),B('sph','acc',x,.7,z,.2,.25,.2)]).flat()],0,N),
    E(RG(6,.4,(x,z,a,q)=>[B('cyl',3,x,.35,z,.05,.7,.05),B('sph','acc',x,.8,z,.3,.4,.3,null,.9)]).flat(),0,N),
    E(thorn(3,'acc').map(o=>(o.c===3&&(o.c=1),o)),.55,N),E(palm(3,1),.4,N),E(reeds('#8a6a4a','#5a3a2a'),0,N),E(shrub(1,3,'#c878ff'),.65,.8),
    /* ---- FUNGAL: 12 other ---- */
    E([B('dod',2,0,.45,0,1.5,.9,1.3),B('sph',1,0,.85,0,1.4,.5,1.2),B('hemi','acc',.5,.9,0,.4,.25,.4)],.8,.9),
    E([B('sph','#e8e0c8',0,.2,0,.9,.4,.8),B('sph','#e8e0c8',.4,.3,.2,.4,.4,.4),B('sph',1,-.3,.3,.3,.7,.35,.6)],.7,.4),
    E([B('sph','#efe6d2',0,.7,0,1.1,1.4,1.1),B('sphL',1,.2,1,.3,.6,.4,.5)],.6,N),
    E([B('cyl',3,0,.45,0,1,.9,1),B('disc',2,0,.9,0,.7,1,.7),B('hemi','acc',0,.85,0,.4,.2,.4,null,.7)],.6,.9),
    E([B('cyl',3,-.5,.5,0,.1,1,.1,[0,0,.3]),B('cyl',3,.5,.5,0,.1,1,.1,[0,0,-.3]),B('cyl',3,0,1.1,0,.1,1.2,.1,[0,0,H]),B('sph','#e8f0f8',0,.8,0,.9,.4,.2)],.9,N),
    E([B('disc','acc',0,.03,0,1.8,1,1.8,null,.7),B('sph','acc',.2,.08,0,.6,.2,.5,null,.9)],0,N),
    E([B('cyl',3,0,2,0,.04,1.2,.04),B('sph','#d8d2c0',0,1.1,0,.7,1.1,.7)],.3,N),
    E([B('cyl',3,-.8,.6,0,.3,1.2,.3,[0,0,-.3]),B('cyl',3,.8,.6,0,.3,1.2,.3,[0,0,.3]),B('tor',3,0,1.1,0,1.8,1.8,1.8,[0,0,0])],.9,N),
    E([B('cyl',3,0,.7,0,.3,1.4,.3),B('hemi','acc',0,1.4,0,1.2,.6,1.2,null,.8),B('hemi',1,0,1.1,0,1.8,.5,1.8)],.4,N),
    E([B('oct',3,0,.5,0,.4,1,.4),B('sph',1,0,.1,0,1.2,.3,1.2)],.45,N),
    E([B('sph','#6b5646',0,.3,0,1,.6,.9),B('sph','#8a7a5a',.3,.4,.2,.6,.5,.6),B('sphL','#d8d2c0',-.3,.4,.3,.3,.2,.3)],.6,.5),
    E([B('sph','#e8e0c8',0,.45,0,.7,.7,.6),B('sphL',2,-.12,.5,.25,.2,.2,.1),B('sphL',2,.12,.5,.25,.2,.2,.1),B('sph',1,0,.1,0,1,.3,.9)],.5,.6)
  ];
  const KY4=[ /* ---- SNOW: 18 plants (hardy, frost and winter flora) ---- */
    E(fern(1,ICE),0,N),E([...shrub(0,1,'#d6405a'),B('sph',WHITE,0,.98,0,1.1,.22,1.1)],.65,.8),E(spruce(0,WHITE).map(o=>(o.s=o.s.map(v=>v*.6),o.p=o.p.map(v=>v*.6),o)),.2,N),
    E(spruce(0,WHITE),.4,N),E([B('sph',0,0,.55,0,1.4,1,1.4),...RG(8,.45,(x,z,a,q)=>B('cone4',1,x,1.0,z,.3,.55,.3,[.3,a,.3])),B('sphL','#d6405a',.2,.9,.5,.16,.16,.16),B('sphL','#d6405a',-.3,.85,.45,.16,.16,.16),B('sphL','#d6405a',.45,.8,-.1,.16,.16,.16)],.65,.8),E(grass(ICE,'#c8d8a8'),0,N),
    E([B('disc',WHITE,0,.03,0,1.8,1,1.8),...RG(6,.5,(x,z,a,q)=>[B('cone',1,x,.25,z,.05,.5,.05),B('sphL',WHITE,x,.55,z,.2,.25,.2)]).flat()],0,N),
    E(bare('#e8e4d8',WHITE),.3,N),E(dwarf(0,WHITE),.7,.5),
    E([limb(WOOD,[0,0,0],[.5,1.2,0],.3),limb(WOOD,[.5,1.2,0],[.3,2,0],.25),B('cone6',0,.3,2.4,0,1.7,1.1,1.7),B('cone6',WHITE,.3,2.8,0,1.1,.8,1.1)],.4,N),
    E(RG(8,.3,(x,z,a,q)=>[B('cyl',WHITE,x,.4,z,.04,.8,.04,tilt(a,.2)),B('sphL',WHITE,x,.85,z,.22,.22,.22)]).flat(),0,N),
    E(reeds(ICE,WHITE),0,N),E([B('dod',2,0,.4,0,1.3,.8,1.1),B('sph','#a8c878',.1,.75,.1,.9,.3,.8),B('sph','#d8c870',-.3,.7,.2,.4,.2,.4)],.7,.8),
    E(crown('#e8e4d8','#c8a050','#a8844a').map(o=>(o.g==='sph'&&(o.s=o.s.map(v=>v*.7)),o)),.3,N),
    E([B('disc','#f2f6fb',0,.03,0,1.8,1,1.8),...RG(7,.45,(x,z,a,q)=>[B('cone','#9aa890',x,.2,z,.06,.4,.06),B('sphL',WHITE,x,.45,z,.2,.2,.2)]).flat()],0,N),
    E([...RG(3,.5,(x,z,a,q)=>spruce(0,WHITE).map(o=>(o.s=o.s.map(v=>v*.8),o.p=[o.p[0]*.8+x,o.p[1]*.8,o.p[2]*.8+z],o))).flat()],.9,N),
    E(vinepost(WOOD,ICE),.3,N),E([B('sph',1,0,.3,0,1.9,.6,1.9),...RG(9,.65,(x,z,a,q)=>B('sphL','#a8284a',x,.62,z,.2,.2,.2)),B('sphL','#a8284a',0,.7,0,.2,.2,.2)],.8,.5),
    /* ---- SNOW: 12 other ---- */
    E([B('box',WHITE,0,.5,0,2.4,1,.6),B('sph',WHITE,-.8,1.1,0,.7,.4,.5),B('sph',WHITE,.5,1.1,0,.8,.4,.5)],1.0,1.0),
    E([B('box',WOOD,0,.2,0,1.4,.12,.5),B('box',WOOD,-.6,.1,.25,.1,.2,1.2,[0,0,H]),B('cyl',3,.8,.2,0,.1,.4,.1)],.7,.3),
    E([B('disc',ICE,0,.03,0,1.2,1,1.2),B('disc','#3a6a8a',0,.05,0,.7,1,.7)],0,N),
    E([B('cyl',WHITE,0,.4,0,.9,.8,.9),B('sphL','acc',0,.8,0,.4,.4,.4,null,.9),B('hemi',WHITE,0,.7,0,1,.4,1)],.5,.8),
    E([B('oct',ICE,0,1,0,.9,2,.5,[0,.4,0]),B('cyl',ICE,0,.1,0,1,.2,.8)],.5,N),
    E([B('cyl','#4a3a2c',0,1.2,0,.4,2.4,.4),B('box','#d6405a',0,2,.22,.4,.3,.05),B('box','#3a8ab0',0,1.5,.22,.4,.3,.05),B('box','#e8c050',0,.9,.22,.4,.3,.05)],.3,N),
    E([...RG(6,.4,(x,z)=>B('dod',2,x,.15,z,.4,.3,.4)),B('sphL','acc',0,.25,0,.4,.4,.4),B('cone','#ffb04a',0,.35,0,.35,.6,.35),B('sph',WHITE,0,.04,0,1.4,.2,1.4)],.6,.3),
    E([B('box','#8a5a2a',0,.3,0,1.3,.6,.7),B('cyl','#9a6a3a',0,.65,0,.25,1.2,.25,[0,0,H]),B('sph',WHITE,0,.65,0,1.4,.2,.8)],.7,.65),
    E([B('cone4',WHITE,0,.7,0,1.9,1.4,1.9,[0,.78,0]),B('box','#3a2f28',0,.3,.7,.5,.5,.1)],.9,N),
    E([B('dod',3,0,.3,0,1.2,.6,1),B('dod',2,0,.8,0,.9,.5,.8),B('dod',3,0,1.2,0,.6,.4,.6),B('dod',2,0,1.5,0,.4,.3,.4),B('sphL',WHITE,0,1.7,0,.4,.15,.4),B('sph',WHITE,0,.04,0,1.8,.2,1.8)],.6,1.4),
    E([B('box',ICE,0,.9,0,1.6,1.8,.3,[0,.2,0]),...RG(5,.5,(x,z,a,q)=>B('cone4',WHITE,(q-2)*.35,1.9,0,.18,.5,.18,[0,0,0]))],.8,N),
    E([B('cyl','#4a3a2c',0,.6,0,.1,1.2,.1),B('box','#8a6a4a',.3,1,0,.8,.4,.06),B('sph',WHITE,.3,1.22,0,.8,.1,.3),B('cyl','#3a3028',0,.03,0,.7,.08,.7)],.2,N)
  ];
  /* the first 18 props of every kit are plants: palette index 0/1 (and 2/3 where marked) become real greens, so flora never turns stone-grey or blood-red with a world's tint */
  const rc=(L,m)=>{for(let i=0;i<18;i++)for(const o of L[i][0])if(typeof o.c==='number'&&m[o.c]!=null)o.c=m[o.c]};
  rc(KY0,{0:'#3f7a3a',1:'#5a9a4a'});rc(KY1,{0:'#2f8a7a',1:'#4fc9a8',2:'#3a6a78',3:'#8ad8d0'});rc(KY2,{0:'#6a7a3a',1:'#8a9a50'});
  rc(KY3,{0:'#2f7a5a',1:'#4aa07a',2:'#4a6a60',3:'#7ab0a0'});rc(KY4,{0:'#2a5a45',1:'#3f7a5a'});
  return [KY0,KY1,KY2,KY3,KY4];
})();

function kit(i,dp,acc){
  const K=[
   [[{g:'cyl',c:'#4a3a2c',p:[0,.45,0],s:[.3,.9,.3]},{g:'cone',c:0,p:[0,1.25,0],s:[1.6,1.4,1.6]},{g:'cone',c:1,p:[0,1.95,0],s:[1.25,1.25,1.25]},{g:'cone',c:0,p:[0,2.6,0],s:[.85,1.15,.85]}],
    [{g:'dod',c:2,p:[0,.45,0],s:[1.5,.95,1.3]},{g:'dod',c:3,p:[.7,.3,.4],s:[.9,.65,.8]},{g:'dod',c:2,p:[-.6,.25,.5],s:[.7,.5,.7]}],
    [{g:'sph',c:1,p:[0,.4,0],s:[1.4,.8,1.4]},{g:'sph',c:0,p:[.5,.55,.3],s:[.9,.7,.9]},{g:'sphL',c:'acc',p:[.2,.85,.5],s:[.28,.28,.28]},{g:'sphL',c:'acc',p:[-.4,.75,.2],s:[.24,.24,.24]},{g:'sphL',c:'acc',p:[.6,.9,-.1],s:[.22,.22,.22]}]],
   [[{g:'oct',c:3,p:[0,.95,0],s:[.55,1.9,.55]},{g:'oct',c:'acc',k:.7,p:[.5,.65,.2],s:[.4,1.3,.4],r:[.3,0,-.35]},{g:'oct',c:3,p:[-.45,.55,.1],s:[.36,1.1,.36],r:[0,0,.4]},{g:'dod',c:2,p:[0,.2,0],s:[1.3,.4,1.3]}],
    [{g:'box',c:2,p:[0,.45,0],s:[1.8,.9,1.2],r:[0,.4,.08]},{g:'box',c:3,p:[.3,.95,.1],s:[1,.35,.8],r:[0,-.3,0]}],
    [{g:'oct',c:3,p:[0,.45,0],s:[.35,.95,.35]},{g:'oct',c:'acc',k:.65,p:[.35,.3,.1],s:[.25,.6,.25],r:[0,0,-.3]},{g:'dod',c:2,p:[-.3,.15,.1],s:[.7,.35,.7]}]],
   [[{g:'box',c:3,p:[0,.2,0],s:[1.5,.4,1.5]},{g:'cyl',c:2,p:[0,1.5,0],s:[.9,2.2,.9]},{g:'box',c:3,p:[0,2.7,0],s:[1.3,.35,1.3],r:[.1,0,.08]}],
    [{g:'box',c:2,p:[0,.4,0],s:[1.5,.8,1.2]},{g:'box',c:3,p:[.1,1.05,0],s:[1.1,.5,.9],r:[0,.5,0]},{g:'box',c:2,p:[1,.25,.4],s:[.7,.5,.7],r:[0,.3,0]}],
    [{g:'box',c:2,p:[0,.5,0],s:[2.4,1,.6]},{g:'box',c:3,p:[-.7,1.2,0],s:[1,.6,.6]},{g:'box',c:'acc',k:.5,p:[.5,.2,.35],s:[.5,.4,.12]}]],
   [[{g:'taper',c:3,p:[0,.8,0],s:[.5,1.6,.5]},{g:'hemi',c:'acc',k:.8,p:[0,1.6,0],s:[2,1.1,2]},{g:'sphL',c:3,p:[.5,1.9,.3],s:[.3,.3,.3]}],
    [{g:'cone',c:1,p:[0,.8,0],s:[.1,1.6,.1],r:[0,0,.1]},{g:'cone',c:1,p:[.3,.7,0],s:[.1,1.4,.1],r:[0,0,-.12]},{g:'cone',c:0,p:[-.25,.6,.2],s:[.1,1.2,.1],r:[.1,0,.2]},{g:'cone',c:1,p:[.1,.7,-.3],s:[.1,1.4,.1]}],
    [{g:'sph',c:1,p:[0,.2,0],s:[1.8,.9,1.8]},{g:'taper',c:3,p:[.5,.55,.3],s:[.2,.5,.2]},{g:'hemi',c:'acc',k:.7,p:[.5,.8,.3],s:[.6,.4,.6]}]],
   [[{g:'cone',c:3,p:[0,1.3,0],s:[.7,2.6,.7]},{g:'cone',c:2,p:[.7,.8,.3],s:[.5,1.6,.5],r:[0,0,-.15]},{g:'cone',c:3,p:[-.6,.7,.2],s:[.45,1.4,.45],r:[0,0,.15]}],
    [{g:'cyl',c:'#3a2f28',p:[0,1,0],s:[.22,2,.22]},{g:'box',c:'#3a2f28',p:[.4,1.6,0],s:[.9,.14,.14],r:[0,0,.5]},{g:'box',c:'#3a2f28',p:[-.35,1.3,0],s:[.7,.12,.12],r:[0,0,-.6]},{g:'box',c:'#3a2f28',p:[.2,2.0,.2],s:[.6,.1,.1],r:[0,.6,.7]}],
    [{g:'dod',c:2,p:[0,.45,0],s:[1.5,.9,1.4]},{g:'sph',c:'#e8f0f8',k:.9,p:[0,.8,0],s:[1.2,.5,1.1]}]]
  ][i%5].concat(KX[i%5],KY[i%5].map(e=>e[0]));
  return K.map(parts=>merge(parts,dp,acc));
}

/* the hub: pagoda, forge, world gate, lantern ring */
/* PERF: merge every static hub mesh that shares a material into one mesh (about 110 draw calls -> about 15). Animated parts in `keep` stay separate. */
function bake(g,keep){
  const by=new Map();
  for(const o of g.children.slice()){
    if(!o.isMesh||keep.has(o)||Array.isArray(o.material))continue;
    const src=o.geometry;if(!src.attributes.normal||!src.attributes.uv)continue;
    o.updateMatrix();
    const gm=src.clone().applyMatrix4(o.matrix);
    let e=by.get(o.material);if(!e){e={p:[],n:[],u:[],i:[],v:0};by.set(o.material,e)}
    const pa=gm.attributes.position.array,na=gm.attributes.normal.array,ua=gm.attributes.uv.array,ix=gm.index;
    for(let k=0;k<pa.length;k++){e.p.push(pa[k]);e.n.push(na[k])}
    for(let k=0;k<ua.length;k++)e.u.push(ua[k]);
    if(ix)for(let k=0;k<ix.count;k++)e.i.push(ix.getX(k)+e.v);else for(let k=0;k<pa.length/3;k++)e.i.push(k+e.v);
    e.v+=pa.length/3;gm.dispose();g.remove(o);
  }
  for(const [mat,e] of by){
    const bg=new T.BufferGeometry();
    bg.setAttribute('position',new T.BufferAttribute(new Float32Array(e.p),3));
    bg.setAttribute('normal',new T.BufferAttribute(new Float32Array(e.n),3));
    bg.setAttribute('uv',new T.BufferAttribute(new Float32Array(e.u),2));
    bg.setIndex(new T.BufferAttribute(e.v>65535?new Uint32Array(e.i):new Uint16Array(e.i),1));
    const q=new T.Mesh(bg,mat);q.matrixAutoUpdate=false;g.add(q);
  }
}
function buildHub(acc,TOWN){
  const g=new T.Group(),up=[];
  const L=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
  const stone=L('#9a9886',{map:tex('rock')}),stone2=L('#6f6d62',{map:tex('rock')}),red=L('#8a3a30',{map:tex('wood')}),wood=L('#4a3a2e',{map:tex('wood')}),
        roof=L('#2c3b42',{map:tex('rock')}),gold=L('#e3b559',{emissive:'#4a3408'}),iron=L('#3a3f45'),
        win=new T.MeshBasicMaterial({color:'#ffd98a'}),fire=new T.MeshBasicMaterial({color:'#ff8a2a'}),lamp=new T.MeshBasicMaterial({color:acc});
  const bx=(m,x,y,z,sx,sy,sz)=>A(g,'box',m,[x,y+sy/2,z],[sx,sy,sz]);
  const rf=(m,x,y,z,side,h)=>A(g,'cone4',m,[x,y+h/2,z],[side*1.414,h,side*1.414],[0,PI/4,0]);
  /* ring wall + lanterns */
  A(g,new T.TorusGeometry(TOWN-2,3.6,6,72).rotateX(PI/2),stone2,[0,3.4,0],1);
  for(let i=0;i<12;i++){const a=i/12*PI*2,x=Math.cos(a)*(TOWN-6),z=Math.sin(a)*(TOWN-6);
    A(g,'cyl',stone,[x,13,z],[5,26,5]);const l=A(g,'box',lamp,[x,30,z],[9,11,9]);A(g,'cone4',roof,[x,40,z],[16,8,16],[0,PI/4,0]);up.push(l)}
  /* pagoda */
  bx(stone,0,0,0,104,6,104);bx(stone,0,0,58,40,3,10);bx(stone,0,0,64,34,1.5,8);
  const tier=(y,w,h,rs,rh)=>{bx(red,0,y,0,w,h,w);
    for(const sx of [-1,1])for(const sz of [-1,1])A(g,'cyl',wood,[sx*w/2,y+h/2,sz*w/2],[w*.1,h,w*.1]);
    rf(roof,0,y+h,0,rs,rh);
    for(const sx of [-1,1])for(const sz of [-1,1])A(g,'cone',gold,[sx*rs*.5,y+h+3,sz*rs*.5],[5,10,5],[sz*.35,0,-sx*.35])};
  tier(6,64,30,98,20);
  bx(wood,0,6,32.6,14,22,1.4);for(const sx of [-1,1])bx(win,sx*21,17,32.6,8,10,1);
  tier(40,42,22,68,16);for(const sx of [-1,1])bx(win,sx*12,46,21.6,7,9,1);
  tier(68,26,16,48,16);
  A(g,'cyl',gold,[0,98,0],[2.4,22,2.4]);for(let i=0;i<3;i++)A(g,'sph',gold,[0,92+i*6,0],6-i);A(g,'cone',gold,[0,114,0],[3.4,10,3.4]);
  /* forge */
  bx(stone2,150,0,60,52,28,42);rf(roof,150,28,60,66,16);bx(stone,166,22,48,9,34,9);
  const fl=bx(fire,150,5,81.2,18,14,1);up.push(fl);bx(wood,150,0,81,24,22,1);fl.position.z=81.8;
  bx(iron,150,0,100,14,6,9);bx(iron,150,6,100,10,4,18);bx(iron,150,10,100,6,3,12);
  /* world gate */
  for(const sx of [-1,1]){A(g,'cyl',red,[-150+sx*30,35,60],[9,70,9]);bx(stone,-150+sx*30,0,60,16,5,16)}
  bx(red,-150,64,60,88,6,9);bx(wood,-150,72,60,104,5,11);
  for(const sx of [-1,1])A(g,'box',wood,[-150+sx*54,78,60],[16,4,10],[0,0,sx*.4]);
  const portal=A(g,'circle',new T.MeshBasicMaterial(addMat({color:acc,map:tex('swirl'),opacity:.85})),[-150,36,60],[56,56,1]);
  const ring=A(g,'tor',new T.MeshBasicMaterial({color:acc}),[-150,36,60.5],[58,58,58]);
  up.push(portal);
  /* potion merchant stall: back-left, between the pagoda and the world gate (hub centre -110, -70), counter faces away from the pagoda */
  {const mx=-110,mz=-70,potR=new T.MeshBasicMaterial({color:'#ff5a4a'}),potB=new T.MeshBasicMaterial({color:'#5aa8ff'});
   bx(wood,mx,0,mz,46,14,18);
   for(const sx of [-1,1])A(g,'cyl',wood,[mx+sx*23,22,mz+8],[3,44,3]);
   bx(red,mx,42,mz+8,56,3,26);
   A(g,'sph',potR,[mx-10,19,mz],7);A(g,'sph',potB,[mx+10,19,mz],7);
   A(g,'cyl',L('#3f5a4a'),[mx,16,mz+14],[10,26,10]);A(g,'sph',L('#e9c9a4'),[mx,34,mz+14],8);A(g,'cone',L('#d9b24a'),[mx,42,mz+14],[16,8,16])}
  /* KABANKALAN CITY PYLON (v5_263c): a true tripod on a TRIANGULAR RAMP. Three identical poles 120 degrees apart, base radius PR, with a gap between the tips at the top (no apex).
     Straight white railings run along each side of the triangle between the poles (parallel to the base edges). Each side has one plain red beam at mid height, one red crown panel
     near the top and one street lamp on an arm, so all three sides look the same from bottom to top. Back of the hub, local (0,-170). Height / base-width ~3.2. */
  {const PX=0,PZ=-170,PR=24,PA=10,Y0=8.3,PH=140,pole=L('#7d6a58',{map:tex('wood')}),pRed=L('#b3342a'),pRed2=L('#8f2820'),white=L('#e8e4d8'),lampB=new T.MeshBasicMaterial({color:'#ffffff'});
   const glowM=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,1,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,244,200,.75)');gr.addColorStop(.6,'rgba(255,225,150,.22)');gr.addColorStop(1,'rgba(255,210,120,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);
     return new T.SpriteMaterial({map:new T.CanvasTexture(c),blending:T.AdditiveBlending,transparent:true,depthWrite:false,fog:false})})();
   const n0=g.children.length,PS=1.25; /* PS: whole pylon enlarged 25% about its centre (applied to every part at the end of this block) */
   const rad=y=>PR-(PR-PA)*(y-Y0)/(PH-Y0); /* pole axis radius at height y (PA at the top: the poles stay apart, as in the photo) */
   const tri=(rT,rB,h)=>{const q=new T.CylinderGeometry(rT,rB,h,3,1).toNonIndexed();q.computeVertexNormals();return q}; /* 3 segments = triangle, corners at the pole angles, flat-shaded */
   const rod=(m,x0,y0,z0,x1,y1,z1,d0,gk)=>{const dx=x1-x0,dy=y1-y0,dz=z1-z0,len=Math.hypot(dx,dy,dz),q=A(g,gk||'taper',m,[PX+(x0+x1)/2,(y0+y1)/2,PZ+(z0+z1)/2],[d0,len,d0]);
     q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx/len,dy/len,dz/len));return q};
   const PT=(k,y)=>{const th=PI/2+k*PI*2/3,r=rad(y);return [Math.cos(th)*r,Math.sin(th)*r]}; /* pole k axis point at height y */
   /* triangular ramp (sloping sides, not a step) + red triangular inlay on top */
   A(g,tri(38,66,Y0),stone2,[PX,Y0/2,PZ],1);A(g,tri(33,33,.7),red,[PX,Y0+.1,PZ],1);
   /* railings: two rails + balusters along each side, ending on the poles */
   for(let k=0;k<3;k++){const k2=(k+1)%3;
     for(const y of [Y0+3.2,Y0+7]){const a=PT(k,y),b=PT(k2,y);rod(white,a[0],y,a[1],b[0],y,b[1],.8,'cyl')} /* half-height rails (v5_263e) */
     const ym=Y0+4,a=PT(k,ym),b=PT(k2,ym);
     for(let q=1;q<18;q++){const t=q/18;A(g,'cyl',white,[PX+a[0]+(b[0]-a[0])*t,Y0+3.8,PZ+a[1]+(b[1]-a[1])*t],[.6,7.6,.6])}} /* thin balusters, 17 per side, close together */
   for(let k=0;k<3;k++){
     const th=PI/2+k*PI*2/3,c=Math.cos(th),s=Math.sin(th);
     rod(pole,c*PR,Y0,s*PR,c*PA,PH,s*PA,6.4); /* the pole: base on the ramp, free tip at radius PA (gap between the three tips) */
     /* the side between pole k and the next one: faces outward along phi */
     const phi=th+PI/3,pc=Math.cos(phi),ps=Math.sin(phi),psi=PI/2-phi;
     const my=PH*.265,mr=rad(my);   /* plain red beam low on the tripod (photo: ~0.27 of the height), spanning pole to pole; its top edge is the deck level */
     A(g,'box',pRed,[PX+pc*mr/2,my,PZ+ps*mr/2],[mr*1.732+2,12,2.8],[0,psi,0]);
     A(g,'box',pRed2,[PX+pc*(mr/2-1.2),my,PZ+ps*(mr/2-1.2)],[mr*1.732+2.6,14,1.6],[0,psi,0]);
     const ty=PH*.86,tr=rad(ty);   /* red crown panel near the top */
     A(g,'box',pRed,[PX+pc*tr/2,ty,PZ+ps*tr/2],[tr*1.732+2,15,2.6],[0,psi,0]);
     A(g,'box',pRed2,[PX+pc*(tr/2-1.1),ty,PZ+ps*(tr/2-1.1)],[tr*1.732+2.6,17,1.5],[0,psi,0]);
     { /* street lamp: the arm starts INSIDE its pole (pole axis point near the tip) and reaches outward along the pole's own direction; bright fixture + additive glow */
       const ys=PH*.93,rs=rad(ys),re=rs+13,ye=PH*1.04,rh=re+2.5,ps2=PI/2-th;
       rod(iron,c*rs,ys,s*rs,c*re,ye,s*re,1.5);
       A(g,'box',lampB,[PX+c*rh,ye+.4,PZ+s*rh],[4.2,2.4,8.5],[0,ps2,0]);
       const gl=new T.Sprite(glowM);gl.position.set(PX+c*rh,ye-1,PZ+s*rh);gl.scale.set(34,34,1);g.add(gl)}
   }
   /* standable triangular deck inside the middle beams, flush with their top edge (collision: SOL3 / SOL2 disc, top ~81 world, reachable by a jump from the ramp) */
   {const my=PH*.265,mr=rad(my);A(g,tri(mr+2,mr+2,2.4),L('#6b5440',{map:tex('wood')}),[PX,my+6.3-1.2,PZ],1)}
   for(let i=n0;i<g.children.length;i++){const o=g.children[i];o.position.set(PX+(o.position.x-PX)*PS,o.position.y*PS,PZ+(o.position.z-PZ)*PS);o.scale.multiplyScalar(PS)}
  }
  bake(g,new Set([portal,ring,fl,...up]));
  g.userData.upd=t=>{
    portal.rotation.z=-t*.9;ring.rotation.z=t*.3;ring.scale.set(58+Math.sin(t*2)*1.5,58+Math.sin(t*2)*1.5,58);
    fl.scale.set(1+Math.sin(t*11)*.06,1+Math.sin(t*7)*.12,1);
    for(let i=0;i<12;i++)up[i].scale.y=1+Math.sin(t*4+i)*.06;
  };
  return g;
}
function hubUpdate(g,t){if(g&&g.userData.upd)g.userData.upd(t)}

return {init,FORGE_GLOW,forgeTier,CLS_SCHEMES,ARMOR_POOL,ARMORS,ACCENTS,SKINS,GENDERS,HAIRS,OUTFITS,HEADS,AURAS,AURA_CFG,look,packLook,makePlayer,setSkin,animPlayer,makeMonster,animMonster,makeOre,makeItem,animItem,makeProj,kit,buildHub,hubUpdate};
})();
