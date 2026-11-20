/* ---------- v5_261 REALISTIC 3D GROUND: several real surfaces blended over the whole map (no single repeating tile) ----------
   gtTex(name): tileable procedural textures drawn once on a canvas: grass, soil, rock, sand, snow, gravel, cracked (dried earth), water, lava, void.
   GKIT[world]: which surface goes where in that world: [flat lowland, soil patches, steep rock, high ground, shore/beach] + its liquid (water / lava / void).
   groundMat(): one MeshLambertMaterial whose fragment shader blends the 5 surfaces by SLOPE (cliffs = rock), HEIGHT (peaks = snow / pale stone), NOISE (soil patches),
   WATERLINE (wet beach, lake bed) and distance from the town (packed gravel). Every texture is sampled twice at different scale + rotation and faded by world-space noise, and the
   result is multiplied by a slow large-scale colour variation, so no tile repetition can be seen. */
const GTCV={},GTTX={};
function gtNoise(seed){
  const h=(ix,iy)=>{let n=Math.imul(ix,374761393)+Math.imul(iy,668265263)+Math.imul(seed|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296};
  return(x,y,per)=>{const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),m=v=>((v%per)+per)%per,
    a=h(m(x0),m(y0)),b=h(m(x0+1),m(y0)),c=h(m(x0),m(y0+1)),d=h(m(x0+1),m(y0+1));return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy}}
function gtFbm(nz,u,v,p,oct){let s=0,a=.5,t=0;for(let o=0;o<oct;o++){s+=a*nz(u*p,v*p,p);t+=a;a*=.5;p*=2}return s/t}
const gtSm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)},gtMx=(a,b,t)=>a+(b-a)*t;
const GVR=[0,0,0];
function gtVor(n,seed){ /* tileable cellular noise -> GVR = [distance to nearest point, to second nearest, cell id] */
  let sd=seed|0;const R=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296,pts=new Float32Array(n*n*2);for(let k=0;k<pts.length;k++)pts[k]=.12+R()*.76;
  return(u,v)=>{const x=u*n,y=v*n,cx=Math.floor(x),cy=Math.floor(y);let f1=9,f2=9,id=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const gx=cx+dx,gy=cy+dy,wx=((gx%n)+n)%n,wy=((gy%n)+n)%n,k=(wy*n+wx)*2,d=Math.hypot(gx+pts[k]-x,gy+pts[k+1]-y);if(d<f1){f2=f1;f1=d;id=wy*n+wx}else if(d<f2)f2=d}
    GVR[0]=f1;GVR[1]=f2;GVR[2]=id;return GVR}}
const gtHash=n=>{n=Math.imul(n^(n>>>15),2246822519);n=Math.imul(n^(n>>>13),3266489917);return((n^(n>>>16))>>>0)/4294967296};
function gtCanvas(name){
  if(GTCV[name])return GTCV[name];
  const S=LOW?256:512,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),im=g.createImageData(S,S),D=im.data;
  let seed=0;for(let k=0;k<name.length;k++)seed=(seed*31+name.charCodeAt(k))|0;
  const nz=gtNoise(seed),vor=name==='rock'?gtVor(5,seed):name==='gravel'?gtVor(S>256?26:18,seed):name==='cracked'?gtVor(7,seed):name==='lava'||name==='void'?gtVor(7,seed):null,k2=S/512;
  let sd=seed*7+1;const R=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
  const palettes={lava:[[28,16,14],[255,120,26],[255,225,110]],void:[[14,8,26],[140,64,250],[235,200,255]]};
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const u=x/S,v=y/S;let r,gg,b;
    if(name==='grass'){const t=gtFbm(nz,u,v,5,4)*.7+gtFbm(nz,u+.31,v+.17,12,3)*.3,dry=gtSm(.62,.8,gtFbm(nz,u+.5,v+.5,3,3)),n=(nz(u*128,v*128,128)-.5)*22;
      r=gtMx(44,92,t);gg=gtMx(72,130,t);b=gtMx(26,52,t);r=gtMx(r,128,dry*.5)+n*.8;gg=gtMx(gg,120,dry*.4)+n;b=gtMx(b,58,dry*.3)+n*.5}
    else if(name==='soil'){const t=gtFbm(nz,u,v,4,4),moist=gtSm(.5,.75,gtFbm(nz,u+.2,v+.6,3,3)),n=(nz(u*160,v*160,160)-.5)*30,m=1-.3*moist;
      r=gtMx(84,138,t)*m+n;gg=gtMx(58,100,t)*m+n*.8;b=gtMx(38,70,t)*m+n*.6}
    else if(name==='rock'){const wu=u+(gtFbm(nz,u,v,4,3)-.5)*.1,wv=v+(gtFbm(nz,u+.5,v+.3,4,3)-.5)*.1,q=vor(wu,wv),edge=q[1]-q[0],cr=1-gtSm(0,.06,edge),pl=(gtHash(q[2]+seed)-.5)*44,mot=(gtFbm(nz,u,v,10,4)-.5)*46,str=Math.sin((v*14+gtFbm(nz,u,v,3,3)*2.2)*6.2832)*5,n=(nz(u*128,v*128,128)-.5)*20;
      let c=128+pl+mot+str+n;c*=(1-.12*q[0])*(1-.5*cr);r=c;gg=c-3;b=c-9}
    else if(name==='sand'){const t=gtFbm(nz,u,v,4,4),w=gtFbm(nz,u+.3,v+.7,3,3),rp=Math.sin((v+w*.14)*6.2832*16)*.5+.5,n=(nz(u*192,v*192,192)-.5)*20,m=1-.09*rp;
      r=gtMx(194,228,t)*m+n;gg=gtMx(168,204,t)*m+n;b=gtMx(120,152,t)*m+n*.8}
    else if(name==='snow'){const t=gtFbm(nz,u,v,5,4),sp=gtHash(x*7919+y*104729+seed)>.9975?26:0;r=240-t*26+sp;gg=244-t*17+sp;b=250-t*7+sp}
    else if(name==='gravel'){const q=vor(u,v),edge=q[1]-q[0],gap=1-gtSm(0,.16,edge),c0=(gtHash(q[2]*3+seed)-.5)*70,warm=(gtHash(q[2]*5+seed)-.5)*26,mot=(gtFbm(nz,u,v,16,3)-.5)*24;
      let c=132+c0+mot;c*=(1-.5*q[0])*(1-.7*gap);r=c+warm;gg=c+warm*.3;b=c-warm*.35-2}
    else if(name==='cracked'){const wu=u+(gtFbm(nz,u,v,4,3)-.5)*.08,wv=v+(gtFbm(nz,u+.5,v+.3,4,3)-.5)*.08,q=vor(wu,wv),edge=q[1]-q[0],cr=1-gtSm(0,.05,edge),pl=(gtHash(q[2]+seed)-.5)*30,mot=(gtFbm(nz,u,v,9,4)-.5)*30,n=(nz(u*128,v*128,128)-.5)*16,sh=1.07-q[0]*.22;
      r=(172+pl+mot+n)*sh;gg=(140+pl*.9+mot*.9+n)*sh;b=(104+pl*.7+mot*.7+n)*sh;const k=1-.74*cr;r*=k;gg*=k;b*=k}
    else if(name==='water'){const a=gtFbm(nz,u,v,6,4),rr=1-Math.abs(2*a-1),w2=1-Math.abs(2*gtFbm(nz,u+.4,v+.2,11,3)-1),L=.6+.26*Math.pow(rr,3)+.14*Math.pow(w2,4);r=gg=b=Math.min(255,L*255)}
    else{const P=palettes[name],wu=u+(gtFbm(nz,u,v,4,3)-.5)*.12,wv=v+(gtFbm(nz,u+.5,v+.3,4,3)-.5)*.12,q=vor(wu,wv),edge=q[1]-q[0],glow=1-gtSm(0,.17,edge),mot=gtFbm(nz,u,v,8,4),gl=Math.pow(glow,1.6)*(.65+.5*gtFbm(nz,u+.3,v,5,3)),hot=Math.pow(glow,4);
      r=gtMx(P[0][0],P[0][0]*2.2,mot);gg=gtMx(P[0][1],P[0][1]*2.2,mot);b=gtMx(P[0][2],P[0][2]*2.2,mot);
      r=gtMx(r,P[1][0],gl)+P[2][0]*hot*.35;gg=gtMx(gg,P[1][1],gl)+P[2][1]*hot*.35;b=gtMx(b,P[1][2],gl)+P[2][2]*hot*.35}
    const o=(y*S+x)*4;D[o]=r<0?0:r>255?255:r;D[o+1]=gg<0?0:gg>255?255:gg;D[o+2]=b<0?0:b>255?255:b;D[o+3]=255}
  g.putImageData(im,0,0);
  const wrap=fn=>{for(const ox of[-S,0,S])for(const oy of[-S,0,S]){g.save();g.translate(ox,oy);fn();g.restore()}};
  if(name==='grass'){ /* individual blades, drawn with wrap-around so the edges stay seamless */
    const cols=['rgba(38,76,24,.6)','rgba(70,120,38,.6)','rgba(104,150,52,.55)','rgba(150,170,70,.45)','rgba(54,92,30,.6)'],n=Math.round(4200*k2*k2);
    g.lineCap='round';for(let i=0;i<n;i++){const x=R()*S,y=R()*S,L=(5+R()*9)*k2,a=-1.5708+(R()-.5)*1.1,c=cols[(R()*cols.length)|0];wrap(()=>{g.strokeStyle=c;g.lineWidth=Math.max(.8,1.1*k2);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*L*.5+2*k2,y+Math.sin(a)*L*.5,x+Math.cos(a)*L,y+Math.sin(a)*L);g.stroke()})}}
  else if(name==='soil'||name==='sand'){ /* small stones and shadows */
    const n=Math.round((name==='soil'?320:90)*k2*k2);for(let i=0;i<n;i++){const x=R()*S,y=R()*S,rx=(1.2+R()*3.2)*k2,ry=rx*(.6+R()*.3),a=R()*3.14,c=name==='soil'?(R()<.5?'rgba(150,132,112,.9)':'rgba(70,52,38,.9)'):'rgba(150,128,96,.8)';
      wrap(()=>{g.save();g.translate(x,y);g.rotate(a);g.fillStyle='rgba(30,22,16,.28)';g.beginPath();g.ellipse(.8,1.1,rx,ry,0,0,6.2832);g.fill();g.fillStyle=c;g.beginPath();g.ellipse(0,0,rx,ry,0,0,6.2832);g.fill();g.restore()})}}
  return GTCV[name]=cv}
function gtTex(name,fresh){
  if(!fresh&&GTTX[name])return GTTX[name];
  const t=new THREE.CanvasTexture(gtCanvas(name));t.wrapS=t.wrapT=THREE.RepeatWrapping;try{t.anisotropy=Math.min(LOW?2:8,T3.r.capabilities.getMaxAnisotropy())}catch(e){}
  if(!fresh)GTTX[name]=t;return t}
/* per-world surface kit. l = [flat lowland, soil patches, steep rock, high ground, shore / town margin] as [texture, tint]; liq = what fills the low basins (null = dry world); wc = liquid colour */
const GKIT=[
 {l:[['sand','#ffffff'],['soil','#d8c0a0'],['rock','#e8dcc8'],['sand','#fff0d8'],['gravel','#e0d0b8']],liq:null,wc:'#4a7a90'}, /* 0 Arena: packed sand */
 {l:[['grass','#e2e8d0'],['soil','#ffffff'],['rock','#ffffff'],['gravel','#e8e8e8'],['gravel','#ffffff']],liq:'water',wc:'#3d7a96'}, /* 1 Ashen Reach: meadows, earth, grey stone, lakes */
 {l:[['cracked','#e0a088'],['soil','#d08068'],['rock','#c89080'],['gravel','#d8a898'],['sand','#e8b090']],liq:'water',wc:'#8a4a40'}, /* 2 Crimson Dominion: red baked earth, iron-rich lakes */
 {l:[['grass','#a8c4e0'],['soil','#8a96b0'],['rock','#a8b4d0'],['snow','#e0eaff'],['gravel','#c0cce0']],liq:'water',wc:'#2e5aa8'}, /* 3 Starfall: silver-blue steppe */
 {l:[['rock','#5a5450'],['gravel','#6a605a'],['rock','#3e3a38'],['cracked','#7a6254'],['gravel','#2e2a28']],liq:'lava',wc:'#a04820'}, /* 4 Ember Throne: basalt + lava */
 {l:[['grass','#d4ecc0'],['soil','#e8d8c0'],['rock','#f0eef4'],['snow','#ffffff'],['sand','#f4ecd8']],liq:'water',wc:'#5aa8d8'}, /* 5 Heavenfall: bright highland */
 {l:[['sand','#e0ecec'],['gravel','#d0d8d4'],['rock','#c8d0d0'],['sand','#fff8e8'],['gravel','#e8e4d8']],liq:'water',wc:'#2fa0b8'}, /* 6 Tideglass: beaches + turquoise sea */
 {l:[['grass','#a8e090'],['soil','#a88868'],['rock','#b4bca0'],['grass','#c8f0a0'],['soil','#7a6048']],liq:'water',wc:'#2f7a58'}, /* 7 Verdant Eternity: lush forest floor */
 {l:[['gravel','#788090'],['soil','#6a707c'],['rock','#8a94a4'],['snow','#e4eaf2'],['gravel','#60687a']],liq:'water',wc:'#2a3a52'}, /* 8 Stormcrown: wet slate */
 {l:[['cracked','#9a5a60'],['soil','#7a3a40'],['rock','#7a5a60'],['gravel','#90606a'],['soil','#5a2a30']],liq:'water',wc:'#6a1020'}, /* 9 Bloodmoon: dark red earth, blood-red pools */
 {l:[['sand','#f4d890'],['cracked','#f0e0c0'],['rock','#d8bc90'],['sand','#fff0c8'],['gravel','#e8d8b0']],liq:'water',wc:'#38a8a0'}, /* 10 Sunforged Wastes: desert + oases */
 {l:[['snow','#e4dcf6'],['gravel','#c8bce0'],['rock','#c0b8dc'],['snow','#ffffff'],['gravel','#b8c4e8']],liq:'water',wc:'#7aa8e0'}, /* 11 Mirrorveil: pale frost + glass lakes */
 {l:[['rock','#4a3e60'],['gravel','#5a4a78'],['rock','#2e2640'],['cracked','#5c4a7a'],['gravel','#3a2e50']],liq:'void',wc:'#6a30c0'}, /* 12 Voidmaw: dark stone + void pools */
 {l:[['sand','#f0e8d0'],['cracked','#ece0c4'],['rock','#ece4cc'],['gravel','#f0e8d8'],['sand','#e8dcc0']],liq:'water',wc:'#5a8a8a'}, /* 13 Dragonbone: bleached bone-dust earth */
 {l:[['sand','#e8c878'],['soil','#c8a468'],['rock','#b8a070'],['gravel','#d8b878'],['sand','#f0d890']],liq:'water',wc:'#4a8aa0'}, /* 14 Chronos Spiral: golden dust */
 {l:[['cracked','#f0d8a0'],['sand','#f8e4a8'],['rock','#e0c888'],['snow','#fff4d8'],['sand','#f8ecc0']],liq:'water',wc:'#c8a050'}]; /* 15 Heaven-Sundering: gilded earth */
/* height statistics of the world's terrain function: the water level (lowest ~4.5 %, capped below the town's ground), where the high-ground surface starts, and the lake-bed clamp */
function gStats(i){
  const isl=WMAP[tIx(i)%12][0]==='isles',K=GKIT[i%16]||GKIT[1],hs=[],R=RIM-60,n=90;
  for(let a=0;a<n;a++)for(let b=0;b<n;b++){const x=(a/(n-1)*2-1)*R,z=(b/(n-1)*2-1)*R,d=Math.hypot(x,z);if(d>TOWN+160&&d<R)hs.push(hfn(x,z))}
  hs.sort((p,q)=>p-q);const pc=f=>hs[Math.min(hs.length-1,Math.floor(f*hs.length))]||0;
  return{wl:!K.liq?-1e5:isl?-8:Math.min(pc(.045),-4),hi0:pc(.82),hi1:Math.max(pc(.82)+30,pc(.96)),K}}
const GLSL_HEAD=`
varying vec3 vWP;varying vec3 vWN;
uniform sampler2D uL0;uniform sampler2D uL1;uniform sampler2D uL2;uniform sampler2D uL3;uniform sampler2D uL4;
uniform vec3 uC0;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform vec3 uC4;uniform vec3 uWC;
uniform float uSc;uniform float uTime;uniform float uWL;uniform float uHi0;uniform float uHi1;uniform float uSeed;uniform float uGain;uniform float uFoam;uniform float uTown;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm3(vec2 p){return(vn(p)*.5+vn(p*2.03+7.1)*.25+vn(p*4.01+3.7)*.125)/.875;}
vec3 lay(sampler2D t,vec2 p,float k){
  vec2 uv=p/uSc;vec3 a=texture2D(t,uv).rgb;
  #ifdef T3L_HQ
  vec2 uv2=vec2(uv.x*.34-uv.y*.19,uv.x*.19+uv.y*.34)+vec2(.37+k,.11);
  vec3 b=texture2D(t,uv2).rgb;
  a=mix(a,b,smoothstep(.25,.75,vn(p*.00055+k*5.))*.7);
  #endif
  return a;}
`;
const GLSL_BODY=`
vec2 p=vWP.xz;vec3 N=normalize(vWN);float hh=vWP.y,slope=1.-N.y;
float n1=fbm3(p*.0011+uSeed),n2=fbm3(p*.0047+9.1),n3=vn(p*.018+4.);
float wRock=smoothstep(.13,.30,slope+(n3-.5)*.09);
float wHigh=smoothstep(uHi0,uHi1,hh+(n2-.5)*26.)*(1.-wRock*.55);
float wSoil=smoothstep(.5,.66,n1+(n2-.5)*.22)*(1.-wRock);
float dT=length(p),wTown=1.-smoothstep(uTown+10.,uTown+110.,dT+(n2-.5)*60.);
float bn=abs(sin(p.x*.0021+sin(p.y*.0017+uSeed)*2.4+uSeed*1.7))+(n2-.5)*.06,wTrail=smoothstep(.17,.08,bn)*(1.-wRock),gm=smoothstep(.55,.8,vn(p*.025+8.))*.7;
float has=step(-1e4,uWL);
float beach=has*(1.-smoothstep(1.5,10.,hh-uWL+(n2-.5)*6.));
float under=has*smoothstep(0.,5.,uWL-hh);
float wet=has*(1.-smoothstep(0.,4.,hh-uWL));
vec3 col=lay(uL0,p,.0)*uC0;
vec3 s1=lay(uL1,p,1.)*uC1,s4=lay(uL4,p,4.)*uC4;
col=mix(col,s1,wSoil*.85);
col=mix(col,mix(s1,s4,smoothstep(.5,.72,vn(p*.05+3.))*.8),wTrail*(1.-gm)*.92); /* the trail: packed soil with patches of small stones, grass growing back in tufts */
col=mix(col,lay(uL3,p,3.)*uC3,wHigh);
col=mix(col,lay(uL2,p,2.)*uC2,wRock);
col=mix(col,s4,max(beach*(1.-wRock*.8),wTown*.9));
col*=vec3(1.+.07*(n1-.5),1.,1.-.07*(n1-.5))*(.82+.36*fbm3(p*.00028+uSeed*2.));
col*=1.-.38*wet*(1.-under);
col*=mix(vec3(1.),uWC*1.7,under*.7)*(1.-.45*under);
float fm=uFoam*has*(1.-smoothstep(0.,3.2,abs(hh-uWL+.8)))*(.5+.5*sin(uTime*1.7+n2*9.));
col+=vec3(.55,.6,.62)*fm*.35;
diffuseColor.rgb=col*vColor.rgb*uGain;
`;
function groundMat(i,st){
  const K=st.K,hq=!LOW,U={uSc:{value:300},uTime:{value:0},uWL:{value:st.wl},uHi0:{value:st.hi0},uHi1:{value:st.hi1},uSeed:{value:i*1.7+.3},uGain:{value:1.32},uFoam:{value:K.liq==='water'?1:0},uTown:{value:TOWN},uWC:{value:new THREE.Color(K.wc)}};
  K.l.forEach((l,k)=>{U['uL'+k]={value:gtTex(l[0])};U['uC'+k]={value:new THREE.Color(l[1])}});
  const m=new THREE.MeshLambertMaterial({vertexColors:true});
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=position;vWN=normal;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+(hq?'#define T3L_HQ\n':'')+GLSL_HEAD).replace('#include <color_fragment>','').replace('#include <map_fragment>',GLSL_BODY)};
  m.customProgramCacheKey=()=>'groundsplat'+(hq?1:0);
  T3.gu=U;return m}
/* liquid in the basins: animated translucent water (two drifting ripple layers + a daylight glitter layer), or opaque lava / void with a glowing crust */
function addLiquid(wg,K,wl){
  T3.liq=null;if(!K.liq||wl<-1e4)return;
  const R=RIM+40,mkG=sc=>{const g=new THREE.CircleGeometry(R,96).rotateX(-Math.PI/2),u=g.attributes.uv,p=g.attributes.position;for(let k=0;k<u.count;k++)u.setXY(k,p.getX(k)/sc,p.getZ(k)/sc);return g};
  if(K.liq==='water'){
    const t1=gtTex('water',true),t2=gtTex('water',true);t1.repeat.set(1,1);t2.repeat.set(1,1);
    const m1=new THREE.MeshLambertMaterial({color:K.wc,map:t1,transparent:true,opacity:.8,depthWrite:false}),
      m2=new THREE.MeshBasicMaterial({color:'#dff0ff',map:t2,transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending}),
      a=new THREE.Mesh(mkG(640),m1),b=new THREE.Mesh(mkG(310),m2);a.position.y=wl;b.position.y=wl+.35;a.renderOrder=1;b.renderOrder=2;wg.add(a,b);
    T3.liq={k:'water',m1,m2,t1,t2}}
  else{
    const t=gtTex(K.liq,true),m=new THREE.MeshBasicMaterial({map:t,color:'#ffffff'}),a=new THREE.Mesh(mkG(900),m);a.position.y=wl;wg.add(a);T3.liq={k:K.liq,m1:m,t1:t}}}
function liquidFrame(dl){
  const L=T3.liq;if(T3.gu)T3.gu.uTime.value=time;if(!L)return;
  if(L.k==='water'){L.t1.offset.set(time*.0045,time*.0021);L.t2.offset.set(-time*.0038,time*.0052);L.m2.opacity=.04+.15*dl;L.m1.opacity=.74+.08*dl}
  else L.t1.offset.set(time*.0012,-time*.0007)}

/* v5_261b the wide winding trail also gets real 3D small stones and grass tufts. Same band formula as the shader (bn), so props sit exactly on the trail. */
function addTrailProps(wg,i,wl){
  const seed=i*1.7+.3,bnf=(x,z)=>Math.abs(Math.sin(x*.0021+Math.sin(z*.0017+seed)*2.4+seed*1.7)),R=RIM-80;
  let sd=i*7919+13;const rnd=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
  const NS=LOW?700:2600,NT=LOW?900:3200,st=[],tf=[];
  for(let n=0;n<400000&&(st.length<NS||tf.length<NT);n++){
    const x=(rnd()*2-1)*R,z=(rnd()*2-1)*R,d=Math.hypot(x,z);if(d<TOWN+110||d>R)continue;
    const b=bnf(x,z);if(b>.1)continue;
    const y=gh3(x+C,z+C);if(wl>-1e4&&y<wl+2)continue;
    if(Math.hypot(gh3(x+C+30,z+C)-y,gh3(x+C,z+C+30)-y)/30>.3)continue;
    if(rnd()<.5){if(st.length<NS)st.push([x,y,z,rnd()])}else if(tf.length<NT)tf.push([x,y,z,rnd()])}
  const mkI=(geo,mat,list,fn)=>{if(!list.length)return;const im=new THREE.InstancedMesh(geo,mat,list.length),du=new THREE.Object3D(),c=new THREE.Color();
    list.forEach((q,k)=>{fn(du,c,q,k);du.updateMatrix();im.setMatrixAt(k,du.matrix);im.setColorAt(k,c)});im.frustumCulled=false;wg.add(im)};
  const sm=new THREE.MeshLambertMaterial({color:'#ffffff'}),tm=new THREE.MeshLambertMaterial({color:'#ffffff'});
  mkI(new THREE.DodecahedronGeometry(1,0),sm,st,(du,c,q,k)=>{const r=2.5+q[3]*q[3]*8;du.position.set(q[0],q[1]+r*.2,q[2]);du.scale.set(r,r*.6,r*(.7+((k*37)%10)/20));du.rotation.set(0,k*2.399,0);const g=.46+((k*53)%10)/30;c.setRGB(g,g*.96,g*.9)});
  mkI(new THREE.ConeGeometry(1.6,1,5).translate(0,.5,0),tm,tf,(du,c,q,k)=>{const h=9+q[3]*14;du.position.set(q[0],q[1]-.5,q[2]);du.scale.set(1+q[3]*.8,h,1+q[3]*.8);du.rotation.set((q[3]-.5)*.5,k*2.399,(((k*17)%10)/10-.5)*.5);c.setRGB(.22+((k*29)%10)/50,.42+((k*41)%10)/30,.12+((k*13)%10)/60)});
  mkI(new THREE.ConeGeometry(1.4,1,5).translate(0,.5,0),tm,tf,(du,c,q,k)=>{const h=7+q[3]*10;du.position.set(q[0]+3,q[1]-.5,q[2]+2);du.scale.set(1,h,1);du.rotation.set(.35,k*1.3,-.3);c.setRGB(.3+((k*23)%10)/50,.5+((k*31)%10)/30,.16)});
}
