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
function init(THREE,lite){T=THREE;LITE=!!lite}
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
      const pts=[[11.5,9],[11,13],[9.6,19],[8,24],[7.6,28],[8.4,32],[8.9,35.5],[6.5,37.5],[4.2,38.6],[3.8,40.5]].map(a=>new T.Vector2(a[0],a[1]));
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
const forgeTier=l=>l>=10?Math.min(10,Math.floor(l/10)):0;

function makePlayer(skinIdx){
  const root=new T.Group(),body=G(root),torso=G(body);
  const R={root,body,torso,skin:-1,gear:'',lt:0,aR:-.5,aL:0};
  const mSkin=new T.MeshLambertMaterial({color:'#f0d2b4'}),
        mHair=new T.MeshLambertMaterial({color:'#1b1d22'}),
        mRobe=new T.MeshLambertMaterial({color:'#d8d2bf',map:tex('robe'),side:T.DoubleSide}),
        mRobe2=new T.MeshLambertMaterial({color:'#d8d2bf',map:tex('cloth'),side:T.DoubleSide}),
        mTrim=new T.MeshLambertMaterial({color:'#e3b559',emissive:'#3a2a08',side:T.DoubleSide}),
        mSash=new T.MeshLambertMaterial({color:'#a8483c',side:T.DoubleSide}),
        mBoot=new T.MeshLambertMaterial({color:'#1d2830'}),
        mDark=new T.MeshBasicMaterial({color:'#14181c'}),
        mMouth=new T.MeshBasicMaterial({color:'#9a4a44'}),
        mEmb=new T.MeshBasicMaterial({color:'#e3b559',map:tex('lotus'),transparent:true,depthWrite:false}),
        mSteel=new T.MeshLambertMaterial({color:'#cfe8ff',emissive:'#4a6a80'}),
        mGlow=new T.MeshBasicMaterial(addMat({color:'#cfe8ff',opacity:.35}));
  R.m={skin:mSkin,hair:mHair,robe:mRobe,robe2:mRobe2,trim:mTrim,sash:mSash,boot:mBoot,steel:mSteel,glow:mGlow,emb:mEmb};

  /* legs (pivot at the hip) */
  const mkLeg=sx=>{const L=G(body,[sx*3.6,15,0]);
    A(L,'cyl',mBoot,[0,-6.5,0],[4.6,13,4.6]);A(L,'box',mBoot,[0,-13.2,1.2],[5.4,4,8.6]);return L};
  R.legL=mkLeg(-1);R.legR=mkLeg(1);

  /* robe, hem, collar, sash */
  R.robeMesh=A(torso,'robe',mRobe,[0,0,0],1);
  A(torso,'tube',mTrim,[0,9.7,0],[23.6,2.2,23.6]);
  A(torso,'tor',mTrim,[0,38.2,0],[11.2,11.2,11.2],[PI/2,0,0]);
  A(torso,'tube',mSash,[0,24,0],[17,4.6,17]);
  A(torso,'box',mTrim,[3.4,24,8.6],[2.8,3.2,1.4]);
  R.embMesh=A(torso,'plane',mEmb,[0,31.5,8.6],[6.2,6.2,1]);
  R.sashTails=[];
  for(const sx of [1,-1]){const t=G(torso,[sx*3.6,23,-8.2]);A(t,'box',mSash,[0,-4.5,0],[2.6,9,.7]);R.sashTails.push(t)}

  /* head */
  const head=G(torso,[0,44,0]);R.head=head;
  A(head,'sph',mSkin,[0,0,0],14.4);
  for(const sx of [-1,1]){
    A(head,'sphL',mDark,[sx*2.7,.6,6.55],[1.5,2.3,1]);
    A(head,'box',mHair,[sx*2.8,3.3,6.4],[3.2,.7,.7],[0,0,sx*.14]);
    A(head,'sph',mSkin,[sx*7.1,0,0],[1.5,2.6,1.7]);
  }
  A(head,'sphL',mSkin,[0,-.7,7.2],1.4);
  A(head,'box',mMouth,[0,-3.1,6.4],[2.2,.4,.4]);R.m.mouth=mMouth;
  R.lashes=G(head);for(const sx of [-1,1]){A(R.lashes,'box',mDark,[sx*2.9,2.1,6.7],[3.6,.55,.6],[0,0,sx*.4]);A(R.lashes,'box',mDark,[sx*4.6,.9,6.2],[1.4,.5,.6],[0,0,sx*.9])}R.lashes.visible=false;
  const HS={};R.hs=HS;
  const cap=A(head,'hemi',mHair,[0,.6,-.9],15.4,[-.28,0,0]);cap.material=new T.MeshLambertMaterial({color:'#1b1d22',side:T.DoubleSide});R.m.hairCap=cap.material;HS.cap=cap;
  HS.back=A(head,'sph',mHair,[0,-2.2,-3.6],[13.6,14,10.5]);
  HS.knot=A(head,'sph',mHair,[0,8.4,-2.6],7.2);
  HS.knotBand=A(head,'box',mTrim,[0,8.6,-2.6],[11,.9,.9]);
  R.headband=A(head,'tor',mTrim,[0,2.6,0],[14.6,14.6,14.6],[PI/2,0,0]);
  R.pony=G(head,[0,2,-7.2]);A(R.pony,'taper',mHair,[0,-8.5,-1.2],[3.4,18,3.4],[.18,0,0]);A(R.pony,'sphL',mHair,[0,-17.8,-2],3.4);HS.pony=R.pony;
  R.ties=[];for(const sx of [-1,1]){const t=G(head,[sx*1.2,2.6,-7.6]);A(t,'box',mTrim,[0,-3.2,0],[1.6,6.4,.5]);R.ties.push(t)}
  HS.ties=R.ties;
  /* extra hair styles (hidden until chosen) */
  HS.long=G(head,[0,2,-7.2]);A(HS.long,'taper',mHair,[0,-14,-1.4],[12,30,5],[.08,0,0]);A(HS.long,'sphL',mHair,[0,-29,-1.6],[11,4,5]);
  HS.buns=G(head);for(const sx of [-1,1]){A(HS.buns,'sph',mHair,[sx*6.8,8.4,-1.6],6.4);A(HS.buns,'box',mTrim,[sx*6.8,5.6,-1.6],[3.4,.8,3.4])}
  HS.spikes=G(head);for(let i=0;i<9;i++){const a=i/9*PI*2,cx=Math.cos(a),sz=Math.sin(a),r=i===8?0:1;
    A(HS.spikes,'cone6',mHair,[cx*5.2*r,8+(i%2)*1.6,sz*5.2*r-1.6],[3.6,9+(i%3)*2.4,3.6],[sz*.7*r,0,-cx*.7*r])}
  HS.braid=G(head,[0,0,-7.4]);for(let k=0;k<5;k++)A(HS.braid,'sph',mHair,[0,-3-k*4.6,-1.4-k*.3],[4.8-k*.35,6,4.8-k*.35]);A(HS.braid,'box',mTrim,[0,-26.5,-3],[3.2,1.6,3.2]);

  /* ---- headwear (one group per option, shown by setSkin) ---- */
  const mStraw=new T.MeshLambertMaterial({color:'#caa45c',side:T.DoubleSide}),mMetal=new T.MeshLambertMaterial({color:'#59606e',emissive:'#14161a'}),
        mWhite=new T.MeshLambertMaterial({color:'#f2eee2',side:T.DoubleSide}),mPink=new T.MeshBasicMaterial({color:'#f2a5b8',side:T.DoubleSide}),
        mBoneH=new T.MeshLambertMaterial({color:'#e8dfc6'}),mMask=new T.MeshLambertMaterial({color:'#1d1d27'}),mDkc=new T.MeshLambertMaterial({color:'#23232d',side:T.DoubleSide}),
        mGem=new T.MeshBasicMaterial({color:'#8ff0ff'}),mPlate=new T.MeshLambertMaterial({color:'#8d96a4',emissive:'#101216',side:T.DoubleSide});
  R.m.gem=mGem;R.m.plate=mPlate;
  const hw=R.hwv=[null];
  const H=()=>{const g=G(head);g.visible=false;hw.push(g);return g};
  let g=H();/*1 circlet*/A(g,'tube',mTrim,[0,4.6,0],[15.2,2.4,15.2]);A(g,'oct',mGem,[0,4.8,7.9],[2.8,3.8,2.2]);A(g,'cone4',mTrim,[0,7.6,7],[2.4,3.6,1],[0,0,0]);
  g=H();/*2 bamboo hat*/A(g,'cyl',mStraw,[0,5.8,0],[34,.8,34]);A(g,'cone',mStraw,[0,9.6,0],[17,8,17]);A(g,'tube',mDkc,[0,5.2,0],[15.4,1.4,15.4]);
  g=H();/*3 crown*/A(g,'tube',mTrim,[0,6.8,0],[14.8,3.2,14.8]);for(let i=0;i<6;i++){const a=i/6*PI*2;A(g,'cone4',mTrim,[Math.cos(a)*7,10.6,Math.sin(a)*7],[2.8,5.4,2.8])}A(g,'oct',mGem,[0,7,7.6],[2.6,3.2,2])
  g=H();/*4 horns*/for(const sx of [-1,1]){A(g,'cone',mBoneH,[sx*5.6,8.6,.6],[3.8,11,3.8],[0,0,-sx*.5]);A(g,'cone',mBoneH,[sx*9.6,14.6,.6],[2.2,6,2.2],[0,0,-sx*1.1])}
  g=H();/*5 fox ears*/for(const sx of [-1,1]){A(g,'cone4',mHair,[sx*5,10.6,-.6],[5.4,9.6,3.4],[-.15,0,-sx*.22]);A(g,'cone4',mWhite,[sx*5,10.2,.4],[3,6.2,1.6],[-.15,0,-sx*.22])}
  g=H();/*6 bunny ears*/for(const sx of [-1,1]){A(g,'taper',mWhite,[sx*3.6,16,-1],[3.8,17,2.4],[-.08,0,-sx*.16]);A(g,'taper',mPink,[sx*3.6,16,-.1],[1.8,13,1],[-.08,0,-sx*.16])}
  g=H();/*7 scholar cap*/A(g,'cyl',mDkc,[0,7.4,0],[12.4,4.4,12.4]);A(g,'box',mDkc,[0,11.6,-4.2],[10.6,8,2.6],[-.1,0,0]);A(g,'tube',mTrim,[0,5.6,0],[12.6,.8,12.6]);A(g,'box',mTrim,[0,12,-5.6],[7,.8,.5]);
  g=H();/*8 lotus crown*/for(let i=0;i<8;i++){const pg=G(g,[0,6,0]);pg.rotation.y=i/8*PI*2;A(pg,'cone4',mSash,[0,4.6,5.6],[3.6,9,1.4],[.35,0,0])}A(g,'oct',mGem,[0,8.2,0],[2.8,3.4,2.8]);
  g=H();/*9 shadow mask*/A(g,'sph',mMask,[0,-3.6,1.6],[13.2,8.4,13.4]);A(g,'box',mTrim,[0,-.2,7],[10,.5,1]);
  g=H();/*10 warlord helm*/A(g,'hemi',mMetal,[0,.8,-.4],[16.8,16.8,16.8],[-.12,0,0]);A(g,'box',mMetal,[0,4.6,7.2],[13,1.8,3]);A(g,'box',mMetal,[0,-1.8,-8],[14.6,8,2]);
    for(const sx of [-1,1])A(g,'cone4',mTrim,[sx*8,10.4,2],[3,12,1.2],[0,0,-sx*.85]);A(g,'box',mTrim,[0,11.5,0],[1.4,5,10]);
  g=H();/*11 antlers*/for(const sx of [-1,1]){const a=G(g,[sx*3.8,6.6,-.6]);a.rotation.z=-sx*.38;A(a,'taper',mBoneH,[0,6.4,0],[2.2,13,2.2]);
    A(a,'taper',mBoneH,[sx*2.8,8,0],[1.6,8,1.6],[0,0,-sx*.9]);A(a,'taper',mBoneH,[sx*-2.4,11.2,0],[1.4,6,1.4],[0,0,sx*.8]);A(a,'taper',mBoneH,[sx*2.6,13.6,0],[1.4,6,1.4],[0,0,-sx*.8])}
  g=H();/*12 lotus pin*/for(let i=0;i<6;i++){const a=i/6*PI*2;A(g,'sphL',mPink,[7.2+Math.cos(a)*2.4,6.4+Math.sin(a)*2.4,1.4],[3,3,1.6])}A(g,'sph',mTrim,[7.2,6.4,1.9],2.2);A(g,'box',mTrim,[3,5.4,1.2],[8,.6,.6],[0,0,.3]);
  g=H();/*13 spirit gem*/A(g,'oct',mGem,[0,3.9,7.3],[2.4,4,1.4]);A(g,'tor',mGem,[0,3.9,7.2],[5,5,5]);

  /* arms (pivot at the shoulder). +x is the sword arm. */
  const mkArm=sx=>{const a=G(torso,[sx*8.4,34.5,0]);
    A(a,'sph',mRobe2,[0,0,0],6.6);A(a,'taper',mRobe2,[0,-7.5,0],[9,15,9]);A(a,'tube',mTrim,[0,-14.8,0],[9.2,1.6,9.2]);A(a,'sph',mSkin,[0,-16.8,0],4);return a};
  R.armR=mkArm(1);R.armL=mkArm(-1);

  /* sword in the sword hand */
  const sw=G(R.armR,[0,-16.8,0]);sw.rotation.x=PI/2;R.sword=sw;
  A(sw,'cyl',mBoot,[0,0,0],[1.7,6.5,1.7]);A(sw,'sph',mTrim,[0,-3.6,0],2.4);A(sw,'box',mTrim,[0,3.4,0],[7.6,1.3,2.2]);
  R.blade=A(sw,'box',mSteel,[0,19,0],[2.4,30,.7]);R.tip=A(sw,'cone4',mSteel,[0,36,0],[2.4,5,.9],[0,PI/4,0]);
  R.bglow=A(sw,'box',mGlow,[0,20,0],[4.6,32,2.4]);
  /* forge-level extras */
  R.paul=G(torso);for(const sx of [-1,1])A(R.paul,'hemi',mTrim,[sx*10.4,36,0],[8,6,8],[0,0,-sx*.45]);
  R.cape=G(torso,[0,36,-8.4]);A(R.cape,'box',mSash,[0,-11,-.6],[15,24,.9],[.08,0,0]);A(R.cape,'box',mTrim,[0,-22.6,-.6],[15,1.4,1],[.08,0,0]);
  R.halo=A(root,'tor',mTrim,[0,59,0],[17,17,17],[PI/2,0,0]);
  /* status effects */
  R.shield=A(root,'sph',new T.MeshBasicMaterial(addMat({color:'#8ff0c4',opacity:.18})),[0,26,0],[50,56,50]);
  R.aura=A(root,'fplane',softMat('aura','#5fd3a5',.4),[0,1.2,0],[60,1,60]);R.aura.renderOrder=1; /* level ring: soft fade on both the inner and outer edge */
  R.shadow=A(root,'disc',new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),[0,.5,0],[30,1,30]);
  /* ---- outfit styles (index = OUTFITS) ---- */
  const ov=R.ov=[null];const O=p=>{const g=G(p||torso);g.visible=false;ov.push(g);return g};
  let o=O();/*1 battle plate*/A(o,'box',mPlate,[0,29.6,8.5],[15.4,12,3.2]);A(o,'box',mTrim,[0,35.5,8.4],[15.8,1.4,3.4]);
    for(const sx of [-1,1]){A(o,'hemi',mPlate,[sx*11,36.6,0],[12,9,12],[0,0,-sx*.5]);A(o,'box',mPlate,[sx*5.2,12.2,11.8],[5.4,10,1.2]);A(o,'box',mPlate,[sx*5.4,12.6,-11.6],[5.4,10,1.2])}
    A(o,'box',mPlate,[0,12.6,12.2],[5,10.4,1.2]);A(o,'box',mTrim,[0,24,8.9],[6,3,1.2]);
  o=O(head);/*2 hood*/{const hd=A(o,'hemi',R.m.robe,[0,.2,-.9],[18.6,18.6,18.6],[-.95,0,0]);A(o,'sph',R.m.robe,[0,-6.6,-4.8],[15,10,10]);A(o,'tor',mTrim,[0,.2,0],[1,1,1]).visible=false}
  o=O();/*3 shoulder mantle*/A(o,'cloak',R.m.robe2,[0,25.2,0],[13.2,5.2,13.2]);
    for(const sx of [-1,1])A(o,'sph',mTrim,[sx*6,34.4,5.6],1.8);A(o,'tube',mTrim,[0,35.2,0],[10.6,1,10.6]);
  o=O(torso);/*4 wide sleeves*/for(const a of [R.armR,R.armL]){const sl=G(a);sl.userData.sleeve=1;A(sl,'taper',R.m.robe2,[0,-13.2,0],[16,22,16]);A(sl,'tube',mTrim,[0,-24,0],[16.6,1.8,16.6]);sl.visible=false;(R.sleeves=R.sleeves||[]).push(sl)}
  o=O();/*5 dragon scale*/for(const sx of [-1,1]){A(o,'cone6',mTrim,[sx*12,40,0],[4.4,11,4.4],[0,0,-sx*.55]);A(o,'cone6',mTrim,[sx*13.6,35.4,0],[3.2,8,3.2],[0,0,-sx*1.05])}
    for(let i=0;i<4;i++)A(o,'cone6',mTrim,[0,26+i*4.4,-9.2],[3.2,7-i,3.2],[-1.2,0,0]);
  o=O();/*6 royal court*/A(o,'box',mSash,[0,18,10.5],[7.6,21,.9]);A(o,'box',mTrim,[0,7.6,10.7],[7.8,1.2,1.1]);A(o,'box',mTrim,[0,18,10.9],[1.2,19,.4]);
    A(o,'tube',mTrim,[0,15,0],[22.4,1.2,22.4]);A(o,'tube',mTrim,[0,21,0],[19.6,1,19.6]);
    A(o,'box',mSash,[0,42,-5.4],[15,9,1.2],[-.22,0,0]);A(o,'box',mTrim,[0,46.6,-6.2],[15,.9,1.3],[-.22,0,0]);

  /* ---- CLASS KITS: Night Blade (1) and Iron Guardian (2) get their own silhouette, gear and weapons ---- */
  R.cv=[[],[],[]];R.cls=0;
  const mk=(c,e)=>new T.MeshLambertMaterial({color:c,emissive:e||'#000000',side:T.DoubleSide});
  const KN=(par,g,m,p,sc,r)=>{const q=A(par,g,m,p,sc,r);q.visible=false;R.cv[1].push(q);return q};
  const KG=(par,p)=>{const q=G(par,p);q.visible=false;R.cv[1].push(q);return q};
  const KI=(par,g,m,p,sc,r)=>{const q=A(par,g,m,p,sc,r);q.visible=false;R.cv[2].push(q);return q};
  const KJ=(par,p)=>{const q=G(par,p);q.visible=false;R.cv[2].push(q);return q};

  /* NIGHT BLADE: slim hooded shadow, masked face, glowing eyes, scarf, tattered cloak, twin curved daggers, wisps */
  const nCl=mk('#17151f','#08060e'),nCl2=mk('#2c2a3a','#0c0a14'),nSt=new T.MeshLambertMaterial({color:'#3a3a4c',emissive:'#14102a'}),
        nEdge=new T.MeshBasicMaterial(addMat({color:'#a070ff',opacity:.9})),nEye=new T.MeshBasicMaterial({color:'#e0b0ff'}),
        nRed=mk('#5b1678','#16041f'),nWisp=new T.MeshBasicMaterial(addMat({color:'#8a5cff',opacity:.32}));
  R.m.nbEdge=nEdge;R.m.nbWisp=nWisp;
  KN(head,'hemi',nCl,[0,.2,-.9],[18.6,18.6,18.6],[-.95,0,0]);
  KN(head,'sph',nCl,[0,-6.6,-4.8],[15,10,10]);
  KN(head,'cone',nCl,[0,7.6,-8.4],[6.4,15,6.4],[-1.15,0,0]);          /* pointed hood tail */
  KN(head,'sph',nCl2,[0,-3.5,1.5],[13.6,8,13.2]);                      /* face wrap */
  KN(head,'box',nCl,[0,2.8,6.9],[12.8,2.4,1.6]);                       /* brow shadow */
  for(const sx of [-1,1])KN(head,'box',nEye,[sx*2.8,.7,7.2],[2.8,.9,.5],[0,0,sx*.28]);
  KN(torso,'tube',nRed,[0,37.4,0],[11.6,3.6,11.6]);
  R.nbScarf=[];[1,-1].forEach((sx,k)=>{const t=KG(torso,[sx*2.6,37,-6.4]);A(t,'box',nRed,[0,-9.5-k*2,-.4],[3.8,19+k*5,.7]);A(t,'box',nEdge,[0,-18.4-k*4.6,-.4],[3.9,.7,.8]);R.nbScarf.push(t)});
  KN(torso,'box',nCl2,[0,29,8.7],[2.8,24,1.1],[0,0,.62]);KN(torso,'box',nCl2,[0,29,8.7],[2.8,24,1.1],[0,0,-.62]);
  KN(torso,'oct',nEdge,[0,29,9.4],[3,3.8,1.6]);
  KN(torso,'tube',nCl2,[0,22.2,0],[17.4,3.4,17.4]);
  for(const sx of [-1,1])KN(torso,'box',nSt,[sx*6.4,21.4,8.8],[3.6,4.2,2.2]);
  KN(torso,'hemi',nSt,[10.8,36.6,0],[10.5,7.5,10.5],[0,0,-.5]);        /* asymmetric spiked pauldron */
  for(let i=0;i<3;i++)KN(torso,'cone4',nSt,[10.6+i*.5,40.6-i*.4,-3.6+i*3.6],[2.2,6.8-i,2.2],[0,0,-.5]);
  KN(torso,'hemi',nCl2,[-10.4,36,0],[7,5,7],[0,0,.45]);
  KN(torso,'box',nCl,[0,12,10.2],[9,21,.9],[.12,0,0]);KN(torso,'box',nEdge,[0,2.2,10.9],[9,.5,.8]);
  for(const sx of [-1,1])KN(torso,'box',nCl,[sx*3.8,10,-10.4],[6,20,.9],[-.1,0,0]);
  R.nbCape=KG(torso,[0,36,-8.8]);
  [[-5,26,.06],[0,31,0],[5,22,-.06]].forEach(a=>A(R.nbCape,'box',nCl,[a[0],-a[1]*.42,-.6],[5.2,a[1],.8],[.08,0,a[2]]));
  const dagger=(g,len)=>{A(g,'cyl',nCl,[0,0,0],[1.6,6,1.6]);A(g,'sph',nEdge,[0,-3.4,0],2.2);A(g,'box',nSt,[0,3.2,0],[5.4,1.1,2]);
    A(g,'box',nSt,[0,3.8+len*.5,0],[2.2,len,.6]);A(g,'box',nSt,[0,3.8+len+3.4,1.3],[2,7.4,.6],[-.28,0,0]);
    A(g,'cone4',nSt,[0,3.8+len+8.6,2.4],[2,4.4,.7],[-.5,PI/4,0]);A(g,'box',nEdge,[0,3.8+len*.5,-.35],[2.5,len,.25])};
  const dR=KG(R.armR,[0,-16.8,0]);dR.rotation.x=PI/2;dagger(dR,15);
  const dL=KG(R.armL,[0,-16.8,0]);dL.rotation.x=2.3;dagger(dL,12);
  R.nbWispG=KG(root,[0,0,0]);R.nbWp=[];for(let i=0;i<6;i++)R.nbWp.push(A(R.nbWispG,'sph',nWisp,[0,0,0],[4,6,4]));

  /* IRON GUARDIAN: broad full plate, great helm with plume, layered pauldrons, tower shield, war hammer, heavy cape */
  const iSt=new T.MeshLambertMaterial({color:'#a9b3c2',emissive:'#12161c'}),iDk=new T.MeshLambertMaterial({color:'#59616f',emissive:'#0c0e12'}),
        iGd=new T.MeshLambertMaterial({color:'#e0b852',emissive:'#3a2a08'}),iRd=mk('#8f1d2c','#240508'),iWd=new T.MeshLambertMaterial({color:'#6a4426'}),
        iVis=new T.MeshBasicMaterial({color:'#ffae4a'}),iGl=new T.MeshBasicMaterial(addMat({color:'#ffb35a',opacity:.0}));
  R.m.igVis=iVis;R.m.igGlow=iGl;
  KI(head,'cyl',iSt,[0,-.6,0],[16.6,13.6,16.6]);KI(head,'hemi',iSt,[0,6,0],[16.6,16.6,16.6]);
  KI(head,'box',iVis,[0,1.4,8.35],[11.4,1.3,.7]);KI(head,'box',iDk,[0,-2,8.5],[1.8,10.4,1.1]);
  for(const sx of [-1,1])for(let k=0;k<2;k++)KI(head,'box',iDk,[sx*(3+k*1.8),-3.6,8.4],[.8,3.6,.6]);
  KI(head,'tube',iDk,[0,-7.2,0],[15.8,2.6,15.8]);KI(head,'tube',iGd,[0,6.1,0],[17.2,1.2,17.2]);KI(head,'tube',iGd,[0,-6.2,0],[17,1,17]);
  KI(head,'box',iDk,[0,14.8,-.5],[1.8,2,15]);
  for(let i=0;i<7;i++)KI(head,'sph',iRd,[0,15.8-i*.55,6.4-i*2.3],[3.2,5.8-i*.3,4.2]);
  for(const sx of [-1,1])KI(head,'cone4',iGd,[sx*9.2,5,-.5],[2.6,10,1.4],[0,0,-sx*1.15]);
  KI(torso,'sph',iSt,[0,29.4,1.6],[18.4,15.5,14.5]);KI(torso,'box',iGd,[0,29.4,9.8],[1.3,13,1]);KI(torso,'oct',iGd,[0,31,10.2],[5,5.4,1.6]);
  KI(torso,'tube',iDk,[0,21,0],[17.2,5,17.2]);KI(torso,'tube',iGd,[0,23.6,0],[17.8,1.6,17.8]);KI(torso,'tube',iSt,[0,37.6,0],[13.4,4.4,13.4]);
  for(let i=0;i<8;i++){const a=i/8*PI*2,sn=Math.sin(a),cs=Math.cos(a);
    KI(torso,'box',iSt,[sn*10.4,11.8,cs*10.4],[6.4,12.5,1.1],[0,a,0]);KI(torso,'box',iGd,[sn*10.5,5.8,cs*10.5],[6.5,1,1.3],[0,a,0])}
  for(const sx of [-1,1]){
    KI(torso,'hemi',iSt,[sx*9.6,37.4,0],[15,10.5,15],[0,0,-sx*.3]);KI(torso,'hemi',iSt,[sx*10.4,34.8,0],[13.4,9,13.4],[0,0,-sx*.4]);
    KI(torso,'tube',iGd,[sx*9.6,36.8,0],[14,1,14],[0,0,-sx*.3]);KI(torso,'cone6',iGd,[sx*10,43,0],[3.4,7,3.4],[0,0,-sx*.3])}
  for(const a of [R.armR,R.armL]){KI(a,'taper',iSt,[0,-4.6,0],[9.8,7,9.8]);KI(a,'cyl',iSt,[0,-12.2,0],[10.4,8,10.4]);KI(a,'tube',iGd,[0,-8.4,0],[10.8,1,10.8]);KI(a,'sph',iSt,[0,-16.8,0],6.2)}
  for(const L of [R.legL,R.legR]){KI(L,'cyl',iSt,[0,-7.4,0],[6.4,10.6,6.4]);KI(L,'sph',iSt,[0,-1.2,1.6],5.4);KI(L,'box',iDk,[0,-13.2,1.6],[6.4,4.2,9]);KI(L,'tube',iGd,[0,-11,0],[6.6,.8,6.6])}
  const sh=KJ(R.armL,[-4.4,-9.5,3.2]);
  A(sh,'box',iSt,[0,0,0],[2.2,27,18]);A(sh,'box',iGd,[0,13.5,0],[2.8,1.6,18.6]);A(sh,'box',iGd,[0,-13.5,0],[2.8,1.6,18.6]);
  for(const sz of [-1,1])A(sh,'box',iGd,[0,0,sz*9.2],[2.8,27.6,1.6]);
  A(sh,'box',iRd,[-1.25,0,0],[.9,22,3.4]);A(sh,'box',iRd,[-1.25,3,0],[.9,3.4,14]);A(sh,'sph',iGd,[-1.8,0,0],5.2);
  const hm=KJ(R.armR,[0,-16.8,0]);hm.rotation.x=PI/2;
  A(hm,'cyl',iWd,[0,10,0],[2.4,36,2.4]);A(hm,'cyl',iDk,[0,0,0],[2.8,7,2.8]);A(hm,'sph',iGd,[0,-4,0],3.4);
  A(hm,'box',iSt,[0,29,0],[15,8.5,8.5]);for(const sx of [-1,1]){A(hm,'box',iGd,[sx*7.8,29,0],[1.6,9.6,9.6]);A(hm,'cone4',iDk,[sx*10.5,29,0],[5,5.5,5],[0,0,-sx*PI/2])}
  A(hm,'cone4',iGd,[0,35,0],[4,6,4]);R.igHead=A(hm,'box',iGl,[0,29,0],[16.4,10,10]);
  R.igCape=KJ(torso,[0,37,-9.2]);A(R.igCape,'box',iRd,[0,-15,-.6],[19,32,1.2],[.06,0,0]);A(R.igCape,'box',iGd,[0,-30.6,-.6],[19.4,1.4,1.4],[.06,0,0]);
  /* STORM ARCHER (3): windswept ranger cap with feather plume and storm goggles, slate-teal coat, lightning chest harness,
     feathered half-cape, back quiver of cyan-fletched arrows, glowing recurve bow with a nocked lightning arrow, crackling sparks */
  R.cv[3]=[];
  const KA=(par,g,m,p,sc,r)=>{const q=A(par,g,m,p,sc,r);q.visible=false;R.cv[3].push(q);return q};
  const KB=(par,p)=>{const q=G(par,p);q.visible=false;R.cv[3].push(q);return q};
  const aLe=mk('#4a3626','#120c08'),aGd=new T.MeshLambertMaterial({color:'#e0c04a',emissive:'#3a2c08'}),aFl=mk('#eef8ff','#2a3a44'),
        aWd=new T.MeshLambertMaterial({color:'#2f5a58',emissive:'#0a1a1a'}),aSt=new T.MeshLambertMaterial({color:'#aab6c4',emissive:'#10161c'}),
        aGlow=new T.MeshBasicMaterial({color:'#6af0ff'}),aSpk=new T.MeshBasicMaterial(addMat({color:'#bff8ff',opacity:.9}));
  R.m.saGlow=aGlow;
  /* head: leather cap, brim, goggles pushed up, tall double feather */
  KA(head,'hemi',aLe,[0,.8,-.6],[18.2,12.6,18.2],[-.25,0,0]);
  KA(head,'tube',aGd,[0,5.4,0],[17.6,1,17.6]);
  KA(head,'box',aLe,[0,4.4,8.2],[14,1.4,5],[.45,0,0]);
  for(const sx of [-1,1]){KA(head,'tor',aSt,[sx*3.7,6.4,8.6],[4.8,4.8,4.8]);KA(head,'circle',aGlow,[sx*3.7,6.4,8.5],[3.8,3.8,3.8])}
  R.saFeather=KB(head,[8,7,-3]);R.saFeather.rotation.z=-.5;
  A(R.saFeather,'cone4',aFl,[0,8,0],[3.2,17,.9],[0,PI/4,0]);A(R.saFeather,'cone4',aGlow,[1.2,6,-.4],[2.2,12,.7],[0,PI/4,-.18]);A(R.saFeather,'cyl',aGd,[0,-.5,0],[1.8,2.4,1.8]);
  /* torso: coat, harness, lightning emblem, belt, pouches */
  KA(torso,'tube',aLe,[0,22.2,0],[17.4,3.2,17.4]);KA(torso,'box',aGd,[0,22.2,8.8],[3.2,3.4,1]);
  KA(torso,'box',aLe,[0,29,8.8],[2.6,27,1],[0,0,.55]);KA(torso,'box',aLe,[0,29,-8.8],[2.6,27,1],[0,0,.55]);
  KA(torso,'oct',aGd,[0,30,9.6],[5.2,6.8,2]);KA(torso,'oct',aGlow,[0,30,10.3],[2.4,3.8,1]);
  KA(torso,'box',R.m.robe,[0,11.4,10.2],[8.4,20,.9]);KA(torso,'box',aGlow,[0,1.4,10.8],[8.6,.6,.8]);
  for(const sx of [-1,1]){KA(torso,'box',R.m.robe,[sx*9.4,12,0],[1,18,12],[0,0,sx*.12]);KA(torso,'box',aLe,[sx*8,22,5.6],[3.6,4.6,3],[0,sx*.4,0])}
  KA(torso,'box',R.m.robe,[0,11,-10.4],[10,21,.9],[-.1,0,0]);
  /* left (bow) shoulder: layered feather mantle; right: small leather pad */
  KA(torso,'hemi',R.m.robe,[-10.4,36.4,0],[11,7.6,11],[0,0,.4]);
  for(let i=0;i<4;i++)KA(torso,'cone4',aFl,[-11.6-i*.3,35.4-i*2.6,-2+i*1.6],[3,9+i,.8],[0,PI/4,.5+i*.12]);
  KA(torso,'hemi',aLe,[10.4,36,0],[8,5.6,8],[0,0,-.4]);KA(torso,'tube',aGd,[10.2,35.6,0],[8.4,.8,8.4],[0,0,-.4]);
  KA(torso,'tube',R.m.robe,[0,37.4,0],[11.6,3.4,11.6]);
  R.saCape=KB(torso,[0,36,-8.8]);
  [[-5.5,22,.08],[0,27,0],[5.5,19,-.08]].forEach(a=>{A(R.saCape,'box',R.m.robe,[a[0],-a[1]*.42,-.6],[5.4,a[1],.8],[.08,0,a[2]]);A(R.saCape,'box',aGlow,[a[0],-a[1]*.84,-.7],[5.5,.6,.9],[.08,0,a[2]])});
  /* quiver */
  const Q=KB(torso,[-4.6,28,-10.8]);Q.rotation.z=.4;
  A(Q,'cyl',aLe,[0,0,0],[6.2,22,6.2]);A(Q,'tube',aGd,[0,10.6,0],[6.6,1.2,6.6]);A(Q,'tube',aGd,[0,-10.4,0],[6.4,1,6.4]);
  for(let i=0;i<5;i++){const x=(i-2)*1.1,z=(i%2)*1.6-.8;A(Q,'cyl',aWd,[x,15,z],[.5,10,.5]);A(Q,'cone4',i%2?aGlow:aFl,[x,19.8,z],[1.7,4,.4],[0,PI/4,0])}
  /* bracers and boot cuffs */
  for(const a of [R.armR,R.armL]){KA(a,'cyl',aLe,[0,-12.6,0],[6.4,7.4,6.4]);KA(a,'tube',aGlow,[0,-9.2,0],[6.8,.8,6.8])}
  for(const L of [R.legL,R.legR]){KA(L,'cyl',aLe,[0,-9.6,0],[6.4,6.4,6.4]);KA(L,'tube',aGlow,[0,-6.6,0],[6.8,.7,6.8])}
  /* recurve bow in the left hand: limbs run along the arm's local Z, the belly faces local -Y */
  const bow=KB(R.armL,[0,-16.8,0]);bow.rotation.y=0;
  A(bow,'cyl',aGd,[0,0,0],[2.6,6,2.6],[PI/2,0,0]);
  for(const sz of [-1,1]){
    [[4.8,.6,9,.12],[12.4,2.6,8,.42],[18.4,5.6,6,.8]].forEach((s,i)=>{A(bow,'box',aWd,[0,s[1],sz*s[0]],[1.7,1.7,s[2]],[-sz*s[3],0,0]);if(i<2)A(bow,'box',aGlow,[0,s[1]-.95,sz*s[0]],[.5,.5,s[2]*.9],[-sz*s[3],0,0])});
    A(bow,'cone4',aGlow,[0,6.6,sz*21.2],[1.8,3,1.8],[sz*PI/2,0,0])}
  A(bow,'box',aGlow,[0,6.2,0],[.35,.35,41]);
  R.saArrow=KB(bow,[0,0,0]);
  A(R.saArrow,'box',aFl,[0,-3.2,0],[.6,18.6,.6]);A(R.saArrow,'cone4',aGlow,[0,-13.8,0],[2.2,4.4,.9],[PI,PI/4,0]);
  A(R.saArrow,'cone4',aGlow,[0,5.6,0],[1.8,3.6,.4],[0,PI/4,0]);
  R.saSpk=KB(root,[0,0,0]);R.saSp=[];for(let i=0;i<6;i++)R.saSp.push(A(R.saSpk,'oct',aSpk,[0,0,0],[2,5,2]));

  /* SPIRIT SUMMONER (4): wolf-skull headdress, indigo shaman robe, bone-rib chest, skull pauldron, ghost sash ribbons,
     soul-lantern staff, floating soul orb in the off hand, and a translucent spirit wolf companion */
  R.cv[4]=[];
  const KS=(par,g,m,p,sc,r)=>{const q=A(par,g,m,p,sc,r);q.visible=false;R.cv[4].push(q);return q};
  const KT=(par,p)=>{const q=G(par,p);q.visible=false;R.cv[4].push(q);return q};
  const sBn=new T.MeshLambertMaterial({color:'#e8e2cc',emissive:'#2a2820'}),sFr=mk('#d8dce8','#20242c'),sWd=new T.MeshLambertMaterial({color:'#4a3a30',emissive:'#100c0a'}),
        sGl=new T.MeshBasicMaterial({color:'#7ff5d0'}),sRb=new T.MeshBasicMaterial(addMat({color:'#7ff5d0',opacity:.5})),
        sGh=new T.MeshBasicMaterial(addMat({color:'#8af0ff',opacity:.38})),sOr=new T.MeshBasicMaterial(addMat({color:'#aaffe8',opacity:.8}));
  R.m.suGlow=sGl;R.m.suOrb=sOr;R.m.suGh=sGh;
  /* head: hood under a wolf skull, horns, glowing sockets, fang row */
  KS(head,'hemi',R.m.robe,[0,.4,-.8],[18.6,17,18.6],[-.5,0,0]);KS(head,'sph',R.m.robe,[0,-6.4,-4.8],[15,10,10]);
  KS(head,'sph',sBn,[0,8.6,1.4],[12.6,7,12],[-.2,0,0]);KS(head,'box',sBn,[0,8.2,9.6],[6,3.4,8],[.12,0,0]);
  for(const sx of [-1,1]){KS(head,'cone4',sBn,[sx*5.2,13,-1.4],[3.6,7,2.4],[.2,0,-sx*.3]);KS(head,'cone',sBn,[sx*9.2,8.6,.6],[2.4,9,2.4],[0,0,-sx*1.1]);
    KS(head,'sph',sGl,[sx*3,9.6,6.8],[2.4,2.4,1.4]);KS(head,'cone4',sBn,[sx*2.2,5.8,12.4],[1,2.6,1],[PI,0,0])}
  KS(head,'tube',sRb,[0,5,0],[17.2,1,17.2]);
  /* chest: bone ribs, bead necklace, belt, talismans */
  for(let i=0;i<4;i++)KS(torso,'box',sBn,[0,33.6-i*2.8,9],[11-i*1.4,1.1,1.2]);
  KS(torso,'tube',sBn,[0,37.4,0],[11.8,3.2,11.8]);
  for(let i=0;i<9;i++){const a=PI*(.2+i*.075);KS(torso,'sph',i%3?sBn:sGl,[Math.cos(a)*7.8,33.2-Math.sin(a)*4.4+4,8.4+Math.sin(a)*.4],i%3?1.8:2.2)}
  KS(torso,'tube',sWd,[0,22.2,0],[17.4,3.4,17.4]);KS(torso,'oct',sGl,[0,22.2,9],[3.6,4.4,1.4]);
  for(const sx of [-1,1])for(let k=0;k<2;k++)KS(torso,'box',sFr,[sx*(5+k*3.4),17-k*1.6,9.4],[2.6,7.6,.5],[0,0,sx*(.1+k*.1)]);
  /* left pauldron: skull and spikes; right: pale fur mantle */
  KS(torso,'hemi',sBn,[-10.8,36.6,0],[11,7.6,11],[0,0,.45]);KS(torso,'sph',sBn,[-12.6,39.6,1.6],[5.4,5,5.6]);
  KS(torso,'sph',sGl,[-14.6,40,3.6],[1.5,1.5,1]);KS(torso,'sph',sGl,[-11.6,40.4,4.4],[1.5,1.5,1]);
  for(let i=0;i<3;i++)KS(torso,'cone4',sBn,[-12.4+i*.4,37+i*1.6,-3.2+i*3.2],[2.2,6.4,2.2],[0,0,.5]);
  KS(torso,'hemi',sFr,[10.6,36.4,0],[12.4,8.6,12.4],[0,0,-.45]);KS(torso,'hemi',sFr,[10.8,34.4,0],[13.4,7.6,13.4],[0,0,-.45]);
  /* ghost ribbons off the belt */
  R.suRib=[];[[-1,24],[0,30],[1,22]].forEach((a,k)=>{const t=KT(torso,[a[0]*5.6,22,-8.6]);A(t,'box',sGh,[0,-a[1]*.5,0],[3.8,a[1],.4]);A(t,'box',sGl,[0,-a[1],0],[4,.6,.6]);R.suRib.push(t)});
  /* spirit-ward bracers */
  for(const a of [R.armR,R.armL]){KS(a,'cyl',sWd,[0,-12.6,0],[6.3,7,6.3]);KS(a,'tube',sGl,[0,-9.4,0],[6.7,.8,6.7])}
  /* soul-lantern staff (right hand, held upright) */
  const stf=KT(R.armR,[0,-16.8,0]);stf.rotation.x=.55;R.suStaff=stf;
  A(stf,'cyl',sWd,[0,10,0],[2,48,2]);A(stf,'cyl',sBn,[0,0,0],[2.8,6,2.8]);
  A(stf,'tor',sBn,[0,35,0],[9,9,9],[0,0,0]);A(stf,'cone4',sBn,[0,35,5.4],[2,5,2]);A(stf,'cone4',sBn,[0,35,-5.4],[2,5,2],[PI,0,0]);
  R.suLamp=A(stf,'sph',sOr,[0,35,0],[5,5,5]);A(stf,'sph',sGl,[0,35,0],[2.4,2.4,2.4]);
  A(stf,'sph',sGl,[0,26,0],1.8);A(stf,'tube',sRb,[0,26,0],[3.4,.6,3.4]);
  /* off hand: floating soul orb */
  R.suHand=KT(R.armL,[0,-16.8,0]);R.suHandOrb=A(R.suHand,'sph',sOr,[0,-5,0],[6,6,6]);A(R.suHand,'sph',sGl,[0,-5,0],[2.6,2.6,2.6]);R.suHandRing=A(R.suHand,'tor',sGl,[0,-5,0],[10,10,10]);
  /* spirit wolf companion: ghostly body, head, ears, tail, glowing eyes, wisp trail */
  const wf=R.suWolf=KT(root,[-26,14,6]);
  A(wf,'sph',sGh,[0,0,0],[8,7,17]);A(wf,'sph',sGh,[0,2,10.5],[7,6.4,7]);A(wf,'box',sGh,[0,.6,15.4],[3.4,3,5]);
  for(const sx of [-1,1]){A(wf,'cone4',sGh,[sx*2.4,6.4,9.6],[2.2,4.4,1.4]);A(wf,'sph',sGl,[sx*1.8,3.2,13],[1.1,1.1,.8])}
  A(wf,'cone',sGh,[0,1.4,-12],[3.4,13,3.4],[-1.15,0,0]);A(wf,'cone',sGh,[0,-4.6,-3],[5,9,5],[PI,0,0]);
  R.suWp=[];for(let i=0;i<5;i++)R.suWp.push(A(wf,'sph',sRb,[0,0,-12-i*3.4],[3,3,3]));

  /* ---- forge glow meshes: outer weapon glow per class + a glow shell around the outfit/body (shown by setGear) ---- */
  R.m.glow2=softMat('halo','#cfe8ff',.3);
  R.m.oglow=softMat('ring','#cfe8ff',.3);   /* ring glow on the ground around the character */
  R.m.oband=softMat('band','#cfe8ff',.3);   /* thin ring of light that rises up the body and fades out */
  R.ogl=A(body,'fplane',R.m.oglow,[0,1.9,0],[44,1,44]);R.ogl.visible=false;R.ogl.renderOrder=2;
  R.ogb=A(body,'tube',R.m.oband,[0,2,0],[26,7,26]);R.ogb.visible=false;R.ogb.renderOrder=2;
  R.wg=[[],[],[],[],[]];
  const WG=(c,par,p,s)=>{const q=A(par,'sph',R.m.glow2,p,s);q.visible=false;q.userData.b=s.slice();R.wg[c].push(q);return q};
  WG(0,sw,[0,20,0],[9,34,6]).userData.sword=1;           /* Cultivator blade */
  WG(1,dR,[0,3.8+15*.5+2,0],[6,24,6]);WG(1,dL,[0,3.8+12*.5+2,0],[6,21,6]); /* Night Blade daggers */
  WG(2,hm,[0,29,0],[22,16,16]);                            /* Iron Guardian hammer head */
  WG(3,bow,[0,3,0],[8,8,44]);                              /* Storm Archer bow */
  WG(4,stf,[0,35,0],[12,12,12]);                           /* Spirit Summoner lantern staff */

  /* ---- aura particles (aura style > 0) ---- */
  R.orb=G(root,[0,0,0]);R.orb.visible=false;R.orbM=new T.MeshBasicMaterial(addMat({color:'#ffffff',opacity:.85}));R.orbP=[];
  for(let i=0;i<8;i++){const q=A(R.orb,'sph',R.orbM,[0,0,0],3);R.orbP.push(q)}
  setSkin(R,skinIdx||0);setGear(R,0,0);
  return R;
}
function setSkin(R,sk){
  const l=look(sk),cls=clsOf(sk),s=SKINS[l.p%SKINS.length],m=R.m,HS=R.hs;
  m.skin.color.set(s.skin);m.hair.color.set(s.hair);m.hairCap.color.set(s.hair);
  m.robe.color.set(s.robe);m.robe2.color.set(s.robe);m.trim.color.set(s.trim);m.sash.color.set(s.sash);m.boot.color.set(s.boot);
  m.emb.color.set(s.trim);
  {const kc=cls>=1&&cls<=4,
     sc=l.r>0?ARMOR_POOL[(l.r-1)%ARMOR_POOL.length]:(kc?CLS_SCHEMES[cls][0]:null),
     ac=l.x>0?ACCENTS[l.x%ACCENTS.length].c:(kc?CLS_TRIM[cls]:null);
    if(sc){m.robe.color.copy(lc(sc.r,s.robe,kc?CLS_MIX[cls]:.12));m.robe2.color.copy(m.robe.color);m.sash.color.set(sc.s);m.boot.color.set(sc.b)}
    if(ac){m.trim.color.set(ac);m.emb.color.copy(m.trim.color)}}
  m.gem.color.copy(lc(s.robe,'#ffffff',.55));m.plate.color.copy(lc(s.trim,'#8d96a4',.6));
  /* outfit */
  const scale=l.o===5&&!cls;m.robe.map=tex(scale?'scale':'robe');m.robe2.map=tex(scale?'scale':'cloth');m.robe.needsUpdate=m.robe2.needsUpdate=true;
  for(let i=1;i<R.ov.length;i++)R.ov[i].visible=(l.o===i&&i!==4);
  if(R.sleeves)for(const sl of R.sleeves)sl.visible=(l.o===4);
  /* hair: which parts show for the style, then hats / hood hide what they cover */
  const hs=l.h,hood=l.o===2,flat=l.w===2||l.w===7||l.w===10;
  HS.cap.visible=!hood&&hs!==7;
  HS.back.visible=!hood&&[0,1,2,3,4,6].includes(hs);
  HS.knot.visible=HS.knotBand.visible=!hood&&!flat&&(hs===0||hs===1);
  HS.pony.visible=!hood&&hs===0;HS.ties.forEach(t=>t.visible=!hood&&hs===0);
  HS.long.visible=!hood&&hs===2;HS.buns.visible=!hood&&!flat&&hs===4;HS.spikes.visible=!hood&&!flat&&hs===5;HS.braid.visible=!hood&&hs===6;
  R.headband.visible=!hood&&!flat;
  for(let i=1;i<R.hwv.length;i++)R.hwv[i].visible=(l.w===i);
  /* aura */
  const ac=AURA_CFG[l.a]||AURA_CFG[0];R.aura.material.color.set(ac.ring);
  R.orb.visible=l.a>0;
  if(l.a>0){R.orbM.color.set(ac.col);R.orbM.opacity=ac.op||.85;R.orbG=ac;
    R.orbP.forEach(q=>{q.geometry=geo(ac.g);q.scale.set(ac.sc[0],ac.sc[1],ac.sc[2])})}
  const fem=l.g===1;R.lashes.visible=fem;m.mouth.color.set(fem?'#c8566a':'#9a4a44');
  R.robeMesh.scale.set(fem?.95:1,1,fem?.95:1);
  /* class kits replace hair, headwear and outfit pieces */
  R.cls=cls;R.gear='';
  for(let c=1;c<R.cv.length;c++)for(const o of R.cv[c])o.visible=(cls===c);
  R.sword.visible=!cls;R.embMesh.visible=!cls;
  /* hair, outfit and headwear now work on every class (drawn with the class kit); Shaven (the class default) keeps the original class silhouette */
  if(cls){if(hs===7)R.headband.visible=false;R.lashes.visible=fem&&(cls===1||cls===3||cls===4)}
  const ts=cls===1?.9:cls===2?1.18:cls===3?.96:1,ls=cls===1?.92:cls===2?1.15:1;
  R.torso.scale.set(ts,1,ts);R.legL.scale.set(ls,1,ls);R.legR.scale.set(ls,1,ls);
  R.head.scale.set((fem?.94:1)/ts,fem?.94:1,(fem?.94:1)/ts);
  R.lk=l;R.skin=sk;
}
function setGear(R,wlv,alv){
  const k=wlv+','+alv;if(R.gear===k)return;R.gear=k;
  const gt=forgeTier(wlv),at=forgeTier(alv),gc=gt>0?FORGE_GLOW[gt]:null,ac=at>0?FORGE_GLOW[at]:null,L=30+Math.min(wlv,40)*.35,w=gt>0?1+(gt-1)*.16:1;
  R.gt=gt;R.at=at;
  /* primary weapon: blade tint + inner glow + outer glow, colour and size by forge tier */
  R.m.steel.color.set(gc?lc('#cfe8ff',gc,.4):'#cfe8ff');R.m.steel.emissive.set(tn(gc||'#cfe8ff',.35));R.m.glow.color.set(gc||'#cfe8ff');
  R.m.glow2.color.set(gc||'#cfe8ff'); /* pure tier colour (no white mix) so the halo never reads as the blade */
  R.blade.scale.y=L;R.blade.position.y=4+L/2;R.tip.position.y=4+L+2.5;R.bglow.scale.set(4.6*w,L+2,2.4*w);R.bglow.position.y=5+L/2;
  R.bglow.visible=false; /* old additive slab hid the blade; the soft halo (glow2) replaces it */
  const cl=R.cls|0;
  R.wg.forEach((arr,c)=>arr.forEach(q=>{q.visible=gt>0&&cl===c;if(!q.visible)return;
    if(q.userData.sword){q.scale.set(9*w,L+8+gt,6*w);q.position.y=5+L/2}else{const b=q.userData.b;q.scale.set(b[0]*w,b[1]*w,b[2]*w)}}));
  /* outfit: glow shell around the body, emissive trim and sash, colour and size by forge tier */
  R.ogl.visible=at>0;R.ogb.visible=at>0;
  if(at>0){const rad=11+.5*at,S=2*rad/.6,bd=2*(12+.4*at);R.m.oglow.color.set(ac);R.m.oband.color.set(ac);R.ogl.scale.set(S,1,S);R.ogb.scale.set(bd,7,bd)}
  R.m.trim.emissive.set(ac?tn(ac,.18+.02*at):'#3a2a08');R.m.sash.emissive.set(ac?tn(ac,.12+.015*at):'#000000');
  R.paul.visible=alv>=5&&!cl;R.cape.visible=alv>=20&&!cl;R.halo.visible=alv>=50;
  R.m.nbEdge.color.set(gc||'#a070ff');
  R.m.suGlow.color.set(gc||'#7ff5d0');
  R.m.saGlow.color.set(gc||'#6af0ff');
  R.m.igGlow.color.set(gc||'#ffb35a');R.igHead.visible=wlv>=10;R.m.igVis.color.set(gc||'#ffae4a');
}
/* P = game player state, ri = realm index */
function animPlayer(R,P,time,ri){
  const dt=clamp(time-R.lt,0,.05);R.lt=time;
  const mv=P.mvAmt,ph=P.anim*.9,st=Math.sin(ph);
  setGear(R,P.wlv|0,P.alv|0);
  R.body.position.y=Math.abs(Math.cos(ph))*1.7*mv+Math.sin(time*2.2)*.5*(1-mv);
  R.torso.rotation.x=.07*mv;
  const cl=R.cls|0,lk=cl===2?.72:cl===1?1.1:1;
  R.legL.rotation.x=st*.9*mv*lk;R.legR.rotation.x=-st*.9*mv*lk;
  const sw=P.swing>0?1-clamp(P.swing/.2,0,1):-1,sl=sw>=0;
  const eo=1-(1-clamp(sw,0,1))*(1-clamp(sw,0,1));
  const tR=sl?-2.7+3*eo:-.5-st*.25*mv,tL=-.15+st*.8*mv;
  R.aR+=(tR-R.aR)*Math.min(1,dt*(sl?45:14));R.aL+=(tL-R.aL)*Math.min(1,dt*14);
  R.armR.rotation.x=R.aR;R.armR.rotation.z=.1;R.armL.rotation.x=R.aL;R.armL.rotation.z=-.1;
  R.torso.rotation.y=sl?Math.sin(sw*PI)*.55:0;
  R.pony.rotation.x=.3+Math.sin(time*3)*.12+mv*.45;R.pony.rotation.z=Math.sin(time*2.1)*.12;
  if(R.hs.long.visible){R.hs.long.rotation.x=.12+Math.sin(time*2.4)*.06+mv*.3;R.hs.long.rotation.z=Math.sin(time*1.7)*.07}
  if(R.hs.braid.visible){R.hs.braid.rotation.x=.1+mv*.35+Math.sin(time*3)*.1;R.hs.braid.rotation.z=Math.sin(time*2.3)*.1}
  R.ties.forEach((t,i)=>{t.rotation.x=.5+mv*.6+Math.sin(time*5+i)*.2});
  R.sashTails.forEach((t,i)=>{t.rotation.x=.25+mv*.5+Math.sin(time*4+i*2)*.12});
  if(R.cape.visible)R.cape.rotation.x=.12+mv*.5+Math.sin(time*3)*.06;
  if(!cl)R.head.rotation.x=0;
  if(cl===1){
    R.torso.rotation.x=.16*mv+.05;R.head.rotation.x=-.1*mv;
    R.nbScarf.forEach((t,i)=>{t.rotation.x=.45+mv*.9+Math.sin(time*5+i*1.7)*.2;t.rotation.z=Math.sin(time*3+i)*.18});
    R.nbCape.rotation.x=.2+mv*.75+Math.sin(time*3.4)*.09;
    const W=R.nbWp;for(let i=0;i<W.length;i++){const f=((time*.5+i/W.length)%1),a=time*1.6+i*1.05,r=13+f*5;
      W[i].position.set(Math.cos(a)*r,3+f*38,Math.sin(a)*r);const sc=Math.sin(f*PI)*(.6+mv*.5);W[i].scale.set(4*sc+.1,7*sc+.1,4*sc+.1)}
  }else if(cl===2){
    R.torso.rotation.x=.02*mv;R.body.position.y*=.6;R.head.rotation.x=0;
    R.igCape.rotation.x=.06+mv*.28+Math.sin(time*2.2)*.03;
    R.m.igVis.opacity=1;R.m.igGlow.opacity=(R.igHead.visible?.22+.1*Math.sin(time*4)+(sl?.35:0):0);
  }else if(cl===3){
    R.torso.rotation.x=.05*mv;R.torso.rotation.y=-.22+(sl?Math.sin(sw*PI)*.16:0);R.head.rotation.x=0;R.head.rotation.y=.22;
    R.armL.rotation.x=-1.38;R.armL.rotation.z=.08;
    R.armR.rotation.x=-1.25+(sl?Math.sin(sw*PI)*.5:0);R.armR.rotation.z=-.45;
    R.saFeather.rotation.x=.2+mv*.55+Math.sin(time*4)*.1;R.saFeather.rotation.y=Math.sin(time*2.6)*.15;
    R.saCape.rotation.x=.18+mv*.7+Math.sin(time*3.1)*.08;
    R.m.saGlow.opacity=1;R.saArrow.visible=!(sl&&sw>.05&&sw<.5);
    const W=R.saSp;for(let i=0;i<W.length;i++){const f=((time*.7+i/W.length)%1),a=time*2.2+i*1.05,r=15+Math.sin(time*9+i*3)*3,k=Math.sin(time*14+i*5)>.2?1:.2;
      W[i].position.set(Math.cos(a)*r,6+f*44,Math.sin(a)*r);W[i].rotation.set(time*3+i,i,time*2);const sc=Math.sin(f*PI)*k;W[i].scale.set(2*sc+.1,5*sc+.1,2*sc+.1)}
  }else if(cl===4){
    R.torso.rotation.x=.04*mv;R.head.rotation.x=0;
    R.armR.rotation.x=-.55+(sl?-Math.sin(sw*PI)*.95:0);R.armR.rotation.z=.12;
    R.armL.rotation.x=-.95+Math.sin(time*2)*.07;R.armL.rotation.z=.2;
    R.suRib.forEach((t,i)=>{t.rotation.x=.4+mv*.8+Math.sin(time*4+i*1.9)*.18;t.rotation.z=Math.sin(time*2.6+i)*.15});
    const pl=.75+.25*Math.sin(time*5)+(sl?.5:0);R.suLamp.scale.set(5*pl,5*pl,5*pl);R.suHandOrb.position.y=-6+Math.sin(time*3)*1.2;R.suHandRing.rotation.set(time*2,time*1.3,0);
    R.suWolf.position.set(-26+Math.sin(time*1.4)*3,14+Math.sin(time*2.2)*2.4,6+Math.cos(time*1.1)*3);R.suWolf.rotation.y=.4+Math.sin(time*1.4)*.2;
    R.suWp.forEach((q,i)=>{const k=.5+.5*Math.sin(time*5-i*.9);q.scale.set(3*k+.4,3*k+.4,3*k+.4)})
  }
  const h=P.hurt>0,b=P.bfT>0;
  const em=h?0x882222:b?0x4a2a0e:0;
  R.m.robe.emissive.setHex(em);R.m.robe2.emissive.setHex(em);R.m.skin.emissive.setHex(h?0x662222:0);
  R.shield.visible=P.sh>0;if(R.shield.visible)R.shield.material.opacity=.14+.06*Math.sin(time*6);
  const ao=R.lk&&R.lk.a>0;
  if(ao){const c=R.orbG,N=R.orbP.length;R.orbP.forEach((q,i)=>{const ang=time*c.sp+i*6.2832/N,rad=19+Math.sin(time*1.3+i*1.7)*3;
      const f=((time*.35*c.sp+i/N)%1);const y=c.rise>0?4+f*58:c.rise<0?62-f*58:28+Math.sin(time*1.5+i*1.1)*20;
      q.position.set(Math.cos(ang)*rad,y,Math.sin(ang)*rad);q.rotation.y=time*2+i;q.rotation.z=c.g==='cone4'?Math.sin(time*7+i)*.6:0;
      const fade=c.rise?Math.sin(f*3.1416):1;q.scale.set(c.sc[0]*(.35+.65*fade),c.sc[1]*(.35+.65*fade),c.sc[2]*(.35+.65*fade))})}
  R.aura.visible=ri>0||ao;if(R.aura.visible){const s=26+Math.min(ri,12)*3;R.aura.scale.set(s*2,1,s*2);R.aura.material.opacity=.5+.12*Math.sin(time*2)}
  if(R.halo.visible){R.halo.rotation.z=time*.8;R.halo.position.y=59+Math.sin(time*2)*1.2}
  R.m.glow.opacity=.28+.1*Math.sin(time*5)+(sl?.3:0);
  {const gt=R.gt|0,at=R.at|0; /* forge glow pulse: faster and stronger every tier */
   R.m.glow2.opacity=gt?(.22+.02*gt+.06*Math.sin(time*(3+gt*.6))+(sl?.12:0)):0;
   R.m.oglow.opacity=at?(.34+.03*at+.10*Math.sin(time*(2+at*.5))):0;
   if(at){const f=(time*(.28+.02*at))%1;R.ogb.position.y=3+f*52;R.m.oband.opacity=(.18+.015*at)*Math.sin(f*3.1416)}}
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

/* scenery: three merged props per kit, built for the world's palette */
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
  ][i%5];
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
