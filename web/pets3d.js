/* World of Ascension - 3D pets (Three.js r128). Procedural, no external assets.
   PET3D.init(THREE, lite) once, then PET3D.make(species, cls) -> rig {root, anim(t, mv), dispose(), h, fr}.
   species 0 Chicken, 1 Dragon, 2 Fairy, 3 Phoenix, 4 Tiger, 5 Wolf (same order as PET_SP in the game).  cls 0..6 = F E D C B A S.
   Forward is +Z (same as the player rig). Painted canvas fur / scale textures, glossy eyes, animated tails / wings / heads / legs.
   Class effects (special pets only): E ground rune ring, D orbiting sparks, C rune ticks, B halo, A rising motes, S rainbow cycling.
   Geometry and textures are shared between pets; every rig owns its materials and frees them in dispose(). */
window.PET3D=(function(){
'use strict';
let T=null,LITE=false,cur=null;
const GC={},TC={},PI=Math.PI;
const FST=[[0,.16,.09,.06],[.3,.42,.22,.09],[.62,.95,.48,.1],[1,1,.86,.32]],TST=[[0,.85,.3,.06],[.55,1,.62,.12],[1,1,.9,.4]];   /* phoenix feather colour ramps (r,g,b 0..1 from root to tip) */
const CLSC=['#c4cdd2','#5aa9ff','#c07bff','#ff6a4a','#ffb02e','#4de3b0','#ff7ae0'];
function init(THREE,lite){T=THREE;LITE=!!lite}

/* ---------------------------------------------------------------- helpers */
function geo(k){
  if(GC[k])return GC[k];
  const sw=LITE?14:28,sh=LITE?10:20,cs=LITE?8:18;let g;
  switch(k){
    case 'sph':g=new T.SphereGeometry(.5,sw,sh);break;
    case 'sphL':g=new T.SphereGeometry(.5,10,7);break;
    case 'cone':g=new T.ConeGeometry(.5,1,cs);break;
    case 'cyl':g=new T.CylinderGeometry(.5,.5,1,cs);break;
    case 'leg':g=new T.CylinderGeometry(.5,.36,1,cs);break;
    case 'leg2':g=new T.CylinderGeometry(.5,.43,1,cs);break;   /* v5_200d gentler taper: two of these in a row taper like the old single leg (.72) */
    case 'tor':g=new T.TorusGeometry(.5,.07,8,LITE?22:44);break;
    case 'ring':g=new T.RingGeometry(.93,1,LITE?36:72).rotateX(-PI/2);break;
    case 'disc':g=new T.CircleGeometry(1,LITE?24:48).rotateX(-PI/2);break;
    case 'fcone':case 'tcone':{g=new T.ConeGeometry(.5,1,cs,6);const p=g.attributes.position,col=new Float32Array(p.count*3),st=k==='fcone'?FST:TST;   /* v5_203b vertex-coloured feather cone: root -> tip ramp */
      for(let i=0;i<p.count;i++){const u=Math.min(1,Math.max(0,p.getY(i)+.5));let a=0;while(a<st.length-2&&u>st[a+1][0])a++;const s0=st[a],s1=st[a+1],f=(u-s0[0])/(s1[0]-s0[0]);for(let c=0;c<3;c++)col[i*3+c]=s0[1+c]+(s1[1+c]-s0[1+c])*f}
      g.setAttribute('color',new T.BufferAttribute(col,3));break}
    case 'box':g=new T.BoxGeometry(1,1,1);break;
    case 'oct':g=new T.OctahedronGeometry(.5);break;
    case 'wingFairy':{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(3,9,14,19,23,14);s.bezierCurveTo(26,8,15,1,0,0);g=new T.ShapeGeometry(s,14);break}
    case 'wingFairyLo':{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(5,-2,15,-4,17,-11);s.bezierCurveTo(11,-15,3,-8,0,0);g=new T.ShapeGeometry(s,12);break}
    case 'wingDragon':{const s=new T.Shape();s.moveTo(0,0);s.lineTo(9,11);s.lineTo(20,15);s.lineTo(30,19);s.quadraticCurveTo(24,11,26,3);s.quadraticCurveTo(18,5,16,-4);s.quadraticCurveTo(9,1,6,-8);s.quadraticCurveTo(3,-3,0,0);g=new T.ShapeGeometry(s,8);break}
    default:throw new Error('PET3D: unknown geometry '+k);
  }
  return GC[k]=g;
}
/* v5_203d vertex-coloured body parts: the colour is a function of the position on the BODY (bronze at the head / chest -> the orange of the tail root at the rump), so the body and the tail
   read as one bird instead of a brown ball with a gold tail stuck on. Geometry is cached per key; p / s / r = the mesh's position / scale / rotation, off = the parent group's offset in body space. */
function bodyCol(x,y,z,gain){
  const sm=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
  const r=sm(5,-12,z),k=(1-.2*sm(15,28,y)*(1-r))*(gain||1),c0=[.66,.4,.19],c1=[.92,.4,.07];   /* c1 = the root colour of the tail plumes (TST[0]) */
  return[(c0[0]+(c1[0]-c0[0])*r)*k,(c0[1]+(c1[1]-c0[1])*r)*k,(c0[2]+(c1[2]-c0[2])*r)*k];
}
function bodyGeo(key,p,s,r,off,gain,mk){
  if(GC[key])return GC[key];
  const g=mk?mk():new T.SphereGeometry(.5,LITE?14:28,LITE?10:20),pos=g.attributes.position,col=new Float32Array(pos.count*3);
  const m=new T.Matrix4().compose(new T.Vector3(p[0]+off[0],p[1]+off[1],p[2]+off[2]),new T.Quaternion().setFromEuler(new T.Euler(r[0],r[1],r[2])),new T.Vector3(s[0],s[1],s[2])),v=new T.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m);const c=bodyCol(v.x,v.y,v.z,gain);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2]}
  g.setAttribute('color',new T.BufferAttribute(col,3));return GC[key]=g;
}
function A(par,g,m,p,s,r){
  const q=new T.Mesh(typeof g==='string'?geo(g):g,m);
  if(p)q.position.set(p[0],p[1],p[2]);
  if(s!==undefined){if(typeof s==='number')q.scale.set(s,s,s);else q.scale.set(s[0],s[1],s[2])}
  if(r)q.rotation.set(r[0],r[1],r[2]);
  par.add(q);return q;
}
function G(par,p){const g=new T.Group();if(p)g.position.set(p[0],p[1],p[2]);if(par)par.add(g);return g}
function lam(color,o){const m=new T.MeshLambertMaterial(Object.assign({color:color},o||{}));if(cur)cur.push(m);return m}
function phg(color,o){const m=new T.MeshPhongMaterial(Object.assign({color:color,shininess:70,specular:0x555555},o||{}));if(cur)cur.push(m);return m}
function bas(color,o){const m=new T.MeshBasicMaterial(Object.assign({color:color},o||{}));if(cur)cur.push(m);return m}
function glow(color,op){return bas(color,{transparent:true,opacity:op===undefined?.5:op,blending:T.AdditiveBlending,depthWrite:false})}
function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
function tex(k,fn){
  if(TC[k])return TC[k];
  const c=document.createElement('canvas');c.width=c.height=256;fn(c.getContext('2d'),256);
  const t=new T.CanvasTexture(c);try{t.anisotropy=4}catch(e){}return TC[k]=t;
}
/* a glossy eye: iris sphere, dark pupil bulging out the front, small white highlight (light comes from the upper right) */
function eye(par,x,y,z,r,iris,mat){
  A(par,'sph',mat.iris||(mat.iris=phg(iris,{shininess:110})),[x,y,z],r*2);
  A(par,'sph',mat.pupil||(mat.pupil=phg(0x0a0a0f,{shininess:120})),[x,y,z+r*.42],r*1.15);
  A(par,'sphL',mat.hi||(mat.hi=bas(0xffffff)),[x+r*.3,y+r*.34,z+r*.86],r*.55);
}
/* a leg (hip pivot group): tapered limb + paw / foot. Returns the pivot group. */
function limb(par,x,y,z,len,rt,mat,paw,pawMat,pawS){
  const g=G(par,[x,y,z]);
  A(g,'leg',mat,[0,-len/2,0],[rt*2,len,rt*2]);
  A(g,'sph',pawMat||mat,[0,-len,pawS?pawS[2]*.12:.4],pawS||[rt*2.4,rt*1.5,rt*2.8]);
  return g;
}
/* v5_200 jointed leg (hip pivot g > upper leg > KNEE ball > lower leg > flat paw). a1 tilts the upper leg (negative = the knee points forward), a2 tilts the lower leg
   (positive = back toward the body line), so a1 < 0 < a2 gives a bent leg with a visible knee. The lower leg length is solved so the paw sits on the ground (y = 0).
   o: hy hip height, l1 upper length, d1 / d2 upper / lower thickness, mat (+ low), kr knee radius, th [thigh sphere scale] (+ thPos, thMat), pawS, pawMat, pawZ.
   Returns {g, up, kn, foot, a2}; the walk cycle swings g and flexes kn (see walk()). */
function kneeLeg(par,hx,hy,hz,o){
  const g=G(par,[hx,hy,hz]),a1=o.a1,a2=o.a2,pS=o.pawS,l1=o.l1;
  if(o.th)A(g,o.thGeo||'sph',o.thMat||o.mat,o.thPos||[0,.6,0],o.th);
  const up=G(g);up.rotation.x=a1;
  A(up,'leg2',o.mat,[0,-l1/2,0],[o.d1,l1,o.d1*.92]);
  const l2=(hy-l1*Math.cos(a1)-pS[1]/2)/Math.cos(a2),k=[0,-l1*Math.cos(a1),-l1*Math.sin(a1)];
  A(g,'sph',o.kneeMat||o.mat,k,Math.max(.86*o.d1,o.d2)*1.02);                       /* the knee: a smooth joint, hardly wider than the leg (v5_200c: was much fatter) */
  const kn=G(g,k);kn.rotation.x=a2;
  A(kn,'leg2',o.low||o.mat,[0,-l2/2,0],[o.d2,l2,o.d2*.92]);
  const foot=G(kn,[0,-l2,0]);foot.rotation.x=-a2;                      /* counter-rotated: the paw stays flat */
  const paw=A(foot,'sph',o.pawMat||o.mat,[0,0,o.pawZ===undefined?1:o.pawZ],pS);paw.name='paw';
  return{g:g,up:up,kn:kn,foot:foot,a2:a2,l2:l2,hind:!!o.hind};
}
/* walk cycle for 4 kneeLegs [front-left, front-right, back-left, back-right]: diagonal pairs swing, the knee folds while a leg swings forward */
function walk(L,t,mv,om,amp){
  const w=Math.sin(t*om)*amp*mv,c=Math.cos(t*om)*mv;
  for(let i=0;i<4;i++){const s=(i===0||i===3)?1:-1,l=L[i];l.g.rotation.x=s*w;l.kn.rotation.x=l.a2+Math.max(0,-s*c)*(l.hind?.95:.7)}
}
/* v5_200g feather edge detail: small barbs angled out from both edges of a feather group g (cone along +z, length L, base width base), between fractions u0..u1 of its length */
function barbs(g,mat,L,base,u0,u1,n,len,th,tilt){
  for(let i=0;i<n;i++){const u=n>1?u0+(u1-u0)*i/(n-1):(u0+u1)/2;
    for(const sd of [-1,1])A(g,'cone',mat,[sd*base*(1-u)*.4,0,L*u],[1.2,len*(1-u*.4),th],[PI/2,0,-sd*(tilt||.62)])}
}
function bone(par,a,b,r,mat){
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
  return A(par,'cyl',mat,[(a[0]+b[0])/2,(a[1]+b[1])/2,0],[r*2,L,r*2],[0,0,Math.atan2(dy,dx)-PI/2]);
}
/* a feather: a flattened cone lying along +Z from the group origin. yaw / pitch aim it. */
function feather(par,mat,len,w,th,pos,yaw,pitch){
  const g=G(par,pos);g.rotation.set(pitch||0,yaw||0,0);
  A(g,'cone',mat,[0,0,len/2],[w,len,th],[PI/2,0,0]);return g;
}

/* ---------------------------------------------------------------- painted textures */
function texTiger(){return tex('tiger',(g,W)=>{
  const r=rng(11),gr=g.createLinearGradient(0,0,0,W);
  gr.addColorStop(0,'#cf6a1c');gr.addColorStop(.5,'#f29a35');gr.addColorStop(.8,'#f8cf94');gr.addColorStop(1,'#fff1da');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  for(let i=0;i<1600;i++){g.fillStyle=r()<.5?'rgba(255,238,200,.10)':'rgba(120,50,0,.10)';g.fillRect(r()*W,r()*W,1.4,5)}
  g.fillStyle='#1a0e05';
  for(let i=0;i<18;i++){
    const x=(i+.5)*W/18+(r()-.5)*6,len=W*(.4+r()*.22),w=4.5+r()*3.5,wig=(r()-.5)*16;
    for(const dx of [-W,0,W]){
      g.beginPath();g.moveTo(x+dx-w,0);g.quadraticCurveTo(x+dx+wig-w*.4,len*.55,x+dx+wig*.6,len);
      g.quadraticCurveTo(x+dx+wig+w*.5,len*.5,x+dx+w,0);g.closePath();g.fill();
      if(r()<.7){const y0=W*.2+r()*W*.12,l2=W*.18+r()*W*.1,x2=x+dx+(i%2?9:-9);
        g.beginPath();g.moveTo(x2-2.5,y0);g.quadraticCurveTo(x2+wig*.3,y0+l2*.5,x2,y0+l2);g.quadraticCurveTo(x2+3,y0+l2*.5,x2+2.5,y0);g.fill()}
    }
  }
})}
function texWolf(){return tex('wolf',(g,W)=>{
  const r=rng(23),gr=g.createLinearGradient(0,0,0,W);
  gr.addColorStop(0,'#4f5964');gr.addColorStop(.45,'#7d8895');gr.addColorStop(.75,'#b9c1ca');gr.addColorStop(1,'#e6eaee');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  for(let i=0;i<3200;i++){const y=r()*W,x=r()*W,l=4+r()*7,t=y/W;
    g.strokeStyle=r()<.5?'rgba(25,30,38,'+(.14*(1-t)+.04)+')':'rgba(240,245,250,.13)';g.lineWidth=1.1;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*2,y+l);g.stroke()}
})}
function texChicken(){return tex('chicken',(g,W)=>{
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#ffffff');gr.addColorStop(.7,'#f6f0df');gr.addColorStop(1,'#e8dfc6');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  g.strokeStyle='rgba(150,130,90,.28)';g.lineWidth=1.4;
  for(let row=0;row<18;row++)for(let i=0;i<14;i++){const x=i*W/14+(row%2?W/28:0),y=row*W/18+6;g.beginPath();g.arc(x,y,W/30,.15*PI,.85*PI);g.stroke()}
})}
/* v5_200f FIRE SPRITES. The old flames were additive spheres: round, hard-edged, so they read as bubbles. Now they are camera-facing sprites with feathered textures:
   'flame' = a white teardrop (wide soft base, thin tip) that fades to nothing at every edge, tinted per layer by the material colour; 'soft' = a plain soft glow. */
function texFlame(){return tex('flame',(g,W)=>{
  g.clearRect(0,0,W,W);g.globalCompositeOperation='lighter';
  const blob=(cx,cy,rx,ry,a)=>{g.save();g.translate(cx,cy);g.scale(rx,ry);const q=g.createRadialGradient(0,0,0,0,0,1);
    q.addColorStop(0,'rgba(255,255,255,'+a+')');q.addColorStop(.35,'rgba(255,255,255,'+a*.6+')');q.addColorStop(.7,'rgba(255,255,255,'+a*.18+')');q.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=q;g.fillRect(-1,-1,2,2);g.restore()};
  blob(128,172,92,70,.9);blob(128,128,64,88,.8);blob(128,86,38,70,.65);blob(128,46,18,44,.5);   /* wide base, narrowing up to a thin flickering tip */
})}
function texSoft(){return tex('soft',(g,W)=>{
  g.clearRect(0,0,W,W);const q=g.createRadialGradient(W/2,W/2,0,W/2,W/2,W/2);
  q.addColorStop(0,'rgba(255,255,255,1)');q.addColorStop(.3,'rgba(255,255,255,.55)');q.addColorStop(.65,'rgba(255,255,255,.14)');q.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=q;g.fillRect(0,0,W,W);
})}
function fsp(color,op,k){const m=new T.SpriteMaterial({map:k==='soft'?texSoft():texFlame(),color:color,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false});if(cur)cur.push(m);return m}
/* a sprite parked in a group; flames hang from their bottom edge (anchor .5,.1) so they rise from what they burn on */
function SP(par,mat,p,sx,sy,flame){const q=new T.Sprite(mat);q.position.set(p[0],p[1],p[2]);q.scale.set(sx,sy,1);if(flame)q.center.set(.5,.1);par.add(q);return q}
function texPhoenix(){return tex('phoenix2',(g,W)=>{   /* v5_203d light neutral plumage: the colour comes from the vertex colours (bodyCol), the texture only adds feather scallops */
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#d9c6b0');gr.addColorStop(.5,'#f2e4d0');gr.addColorStop(1,'#ffffff');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  for(let row=0;row<18;row++)for(let i=0;i<14;i++){const x=i*W/14+(row%2?W/28:0),y=row*W/18+6;
    g.strokeStyle='rgba(120,55,0,.22)';g.lineWidth=1.6;g.beginPath();g.arc(x,y,W/30,.1*PI,.9*PI);g.stroke();
    g.strokeStyle='rgba(255,225,150,.30)';g.lineWidth=1.1;g.beginPath();g.arc(x,y+2.4,W/30,.15*PI,.85*PI);g.stroke()}
})}

/* ---------------------------------------------------------------- class effects (ring, sparks, ticks, halo, motes, rainbow) */
function classFX(root,c,fr,hh){
  if(c<1)return null;
  const rainbow=c===6,col=CLSC[c],fx={c,rainbow,mats:[],orbs:[],motes:[],ticks:null,halo:null,ring:null,ring2:null};
  const gm=(o)=>{const m=glow(col,o);fx.mats.push(m);return m};
  fx.ringM=gm(.7);fx.ringM.side=T.DoubleSide;
  fx.ring=A(root,'ring',fx.ringM,[0,.5,0],fr+3);
  A(root,'disc',gm(.12),[0,.35,0],fr+2);
  if(c>=2){const n=Math.min(5,c);for(let i=0;i<n;i++){const o=A(root,'sph',gm(.9),[0,6,0],2.4-c*.12);fx.orbs.push(o)}}
  if(c>=3){fx.ticks=G(root,[0,.55,0]);const n=14;for(let i=0;i<n;i++){const a=i/n*PI*2;A(fx.ticks,'box',gm(.8),[Math.cos(a)*(fr+6),0,Math.sin(a)*(fr+6)],[.9,.25,3.2],[0,PI/2-a,0])}}
  if(c>=4){fx.halo=A(root,'tor',gm(.85),[0,hh+7,0],13,[PI/2,0,0])}
  if(c>=5){for(let i=0;i<10;i++)fx.motes.push(A(root,'sphL',gm(.9),[0,0,0],1.3))}
  fx.fr=fr;fx.hh=hh;return fx;
}
function updFX(fx,t){
  if(!fx)return;
  if(fx.rainbow)fx.mats.forEach((m,i)=>m.color.setHSL(((t*.18+i*.07)%1+1)%1,.9,.62));
  fx.ring.rotation.y=t*.5;fx.ringM.opacity=.55+.2*Math.sin(t*2.2);
  const R=fx.fr+5;
  fx.orbs.forEach((o,i)=>{const n=fx.orbs.length,a=t*(1+.12*i)+i/n*PI*2;o.position.set(Math.cos(a)*R,5+(i%3)*4.5+Math.sin(t*2+i)*2,Math.sin(a)*R)});
  if(fx.ticks)fx.ticks.rotation.y=-t*.35;
  if(fx.halo){fx.halo.rotation.z=t*.8;fx.halo.position.y=fx.hh+7+Math.sin(t*2)*1}
  fx.motes.forEach((m,i)=>{const k=((t*.22+i/fx.motes.length)%1),a=i*2.4+t*.6,rr=fx.fr*.7*(1-k*.4);m.position.set(Math.cos(a)*rr,2+k*(fx.hh+8),Math.sin(a)*rr);m.scale.setScalar(1.6*(1-k)+.2)});
}

/* ---------------------------------------------------------------- the six pets. Each builder fills body group B and returns {anim, fr, hh}. */
function mkChicken(B){
  const white=lam(0xffffff,{map:texChicken()}),pale=lam(0xfff6e2),red=lam(0xe0382a,{emissive:0x300604}),orange=phg(0xf2a431,{shininess:40}),cream=lam(0xf3ead2);
  const eyeM={},body=G(B,[0,0,0]);
  A(body,'sph',white,[0,11.5,0],[13,13.2,17],[-.12,0,0]);                 /* body */
  A(body,'sph',pale,[0,11.2,5.2],[10.6,11,8.5]);                            /* breast */
  const wl=G(body,[-6.3,13.4,.4]),wr=G(body,[6.3,13.4,.4]);               /* wings */
  A(wl,'sph',cream,[-.6,-2.4,-.5],[2.6,9.5,13],[0,0,.1]);A(wr,'sph',cream,[.6,-2.4,-.5],[2.6,9.5,13],[0,0,-.1]);
  A(wl,'sph',white,[-.9,-.8,-2],[2.3,5.5,8],[0,0,.1]);A(wr,'sph',white,[.9,-.8,-2],[2.3,5.5,8],[0,0,-.1]);
  const tail=G(body,[0,14.5,-8.2]);                                        /* tail feathers */
  [[-.5,-.7],[0,0],[.5,.7]].forEach((a,i)=>A(tail,'sph',i===1?white:cream,[a[0]*3.2,2.5+(i===1?1.5:0),-2.2-(i===1?.5:0)],[2.6,11,5.2],[-.7+a[1]*.15,0,a[0]*.7]));
  const head=G(body,[0,19.5,6.8]);
  A(head,'sph',white,[0,0,0],[9.2,9.2,9.4]);                              /* head */
  A(head,'sph',red,[0,5.2,.8],[2.8,4.6,2.4]);A(head,'sph',red,[0,5.6,2.9],[2.6,3.6,2.2]);A(head,'sph',red,[0,5.1,-1.6],[2.5,3.6,2.2]); /* comb */
  A(head,'cone',orange,[0,-.5,5.3],[3.8,5.4,2.6],[PI/2,0,0]);               /* beak (upper) */
  A(head,'cone',orange,[0,-1.6,4.6],[3,3.8,1.8],[PI/2,0,0]);                /* beak (lower) */
  A(head,'sph',red,[0,-3.2,3.6],[2.2,3.6,1.7]);                              /* wattle */
  eye(head,-3.5,1.1,3.2,1.25,0x2a1608,eyeM);eye(head,3.5,1.1,3.2,1.25,0x2a1608,eyeM);
  A(head,'sph',lam(0xffb0a0,{transparent:true,opacity:.55}),[-4.1,-1.2,2.4],[2.2,1.6,1.1]);A(head,'sph',lam(0xffb0a0,{transparent:true,opacity:.55}),[4.1,-1.2,2.4],[2.2,1.6,1.1]);
  const legs=[];
  for(const sx of [-3.1,3.1]){const lg=G(body,[sx,6.6,.8]);A(lg,'cyl',orange,[0,-3.1,0],[1.5,6.4,1.5]);
    for(const tx of [-1.5,0,1.5])A(lg,'cone',orange,[tx,-6.2,1.6+(tx===0?.6:0)],[1.3,3.4,1],[PI/2,0,tx*.18]);
    A(lg,'cone',orange,[0,-6,-1.6],[1.1,2,.9],[-PI/2,0,0]);legs.push(lg)}
  return{fr:11,hh:25,anim(t,mv){
    const peck=Math.pow(Math.max(0,Math.sin(t*1.7)),10)*(1-mv),bob=Math.abs(Math.sin(t*9))*mv;
    head.rotation.x=peck*.9+Math.sin(t*3.1)*.04;head.position.set(0,19.5-peck*2.2,6.8+peck*2.8+Math.sin(t*9)*.7*mv);
    body.position.y=bob*1.1+Math.sin(t*2.4)*.15;body.rotation.x=peck*.12;
    legs[0].rotation.x=Math.sin(t*9)*.7*mv;legs[1].rotation.x=-Math.sin(t*9)*.7*mv;
    wl.rotation.z=-Math.pow(Math.max(0,Math.sin(t*.9+1)),14)*.7;wr.rotation.z=-wl.rotation.z;tail.rotation.x=Math.sin(t*2)*.05+bob*.1;
  }};
}

/* v5_204 DRAGON redesign (matches the reference art): long S-curved neck, olive-green head with a red-orange crest, two swept-back horns + a snout tusk + a cream beard,
   gold belly plates down the throat / chest / belly, copper-bronze flanks, red-orange legs with ivory claws, big orange bat wings (red at the bones -> peach at the scalloped edge, tan finger bones with claws),
   a long tail that curls up behind with red spikes (dark brown root -> peach tip). Colours are vertex colours so the parts blend into one animal. */
function drgCol(x,y,z){   /* body-space colour for the torso / thighs: dark brown back -> copper flanks -> gold belly */
  const sm=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
  const up=sm(8,19,y),dn=1-sm(4,11,y),back=[.36,.22,.15],flank=[.86,.5,.15],belly=[.95,.76,.38];
  const c=[0,0,0];for(let i=0;i<3;i++){let v=flank[i];v+= (back[i]-flank[i])*up*.8;v+=(belly[i]-v)*dn;c[i]=v}
  return c;
}
function drgGeo(key,p,s,r){
  if(GC[key])return GC[key];
  const g=new T.SphereGeometry(.5,LITE?14:26,LITE?10:18),pos=g.attributes.position,col=new Float32Array(pos.count*3);
  const m=new T.Matrix4().compose(new T.Vector3(p[0],p[1],p[2]),new T.Quaternion().setFromEuler(new T.Euler(r?r[0]:0,r?r[1]:0,r?r[2]:0)),new T.Vector3(s[0],s[1],s[2])),v=new T.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m);const c=drgCol(v.x,v.y,v.z);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2]}
  g.setAttribute('color',new T.BufferAttribute(col,3));return GC[key]=g;
}
function texDragon(){return tex('dragon',(g,W)=>{   /* olive-green reptile scales with a lighter yellow-green sheen (head / neck / wing arms) */
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#6f8f3a');gr.addColorStop(.5,'#9cb04a');gr.addColorStop(1,'#c4c85a');
  g.fillStyle=gr;g.fillRect(0,0,W,W);g.lineWidth=1.6;
  for(let row=0;row<22;row++)for(let i=0;i<22;i++){const x=i*W/22+(row%2?W/44:0),y=row*W/22+6;
    g.strokeStyle='rgba(40,55,10,.42)';g.beginPath();g.arc(x,y,W/44+1,.05*PI,.95*PI);g.stroke();
    g.strokeStyle='rgba(235,240,150,.2)';g.beginPath();g.arc(x,y-1.6,W/44,.15*PI,.85*PI);g.stroke()}
})}
function texDragonWing(){return tex('dragonwing',(g,W)=>{   /* wing membrane: red-orange near the arm (left) fading to peach at the far edge (right), with faint streaks */
  const gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#d8381a');gr.addColorStop(.35,'#ee6a28');gr.addColorStop(.7,'#f6a46a');gr.addColorStop(1,'#fbd2ab');
  g.fillStyle=gr;g.fillRect(0,0,W,W);const r=rng(7);
  for(let i=0;i<260;i++){g.strokeStyle=r()<.5?'rgba(255,230,190,.10)':'rgba(150,30,0,.10)';g.lineWidth=1.2;const y=r()*W,x=r()*W*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+W*.2+r()*W*.2,y+(r()-.5)*20);g.stroke()}
})}
function hornChain(par,mat,pts,w){   /* v5_205: connected tapered horn; pts are joined end to end so nothing floats; w = base diameter */
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz),g=G(par,a);
    g.rotation.order='YXZ';g.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);
    A(g,'leg',mat,[0,0,L/2],[w,L*1.04,w],[-PI/2,0,0]);w*=.72}
  const e=pts[pts.length-1];A(par,'sphL',mat,e,w*.9)}
function dragonWingGeo(){   /* v5_206: wing membrane colour per vertex: deep red-orange at the arm -> orange -> peach at the far / trailing edge (as in the reference art) */
  if(GC.drg_wing)return GC.drg_wing;
  const g=geo('wingDragon').clone(),pos=g.attributes.position,col=new Float32Array(pos.count*3),
    st=[[0,.6,.3,.14],[.1,.86,.26,.11],[.3,.93,.4,.16],[.6,.96,.6,.3],[1,.99,.82,.65]];   /* v5_211: root starts in the body brown so the membrane melts into the shoulder */
  for(let i=0;i<pos.count;i++){
    let u=Math.min(1,Math.max(0,Math.hypot(pos.getX(i),pos.getY(i)*1.3)/32+Math.max(0,-pos.getY(i))*.025));
    let a=0;while(a<st.length-2&&u>st[a+1][0])a++;const f=(u-st[a][0])/(st[a+1][0]-st[a][0]);
    for(let c=0;c<3;c++)col[i*3+c]=st[a][1+c]+(st[a+1][1+c]-st[a][1+c])*Math.min(1,Math.max(0,f))}
  g.setAttribute('color',new T.BufferAttribute(col,3));return GC.drg_wing=g}
function drgBlobGeo(c,sc,fn){   /* v5_207: unique sphere whose vertex colours come from fn(body-space x,y,z) so neighbouring parts share one continuous colour field */
  const g=new T.SphereGeometry(.5,LITE?12:20,LITE?9:14),pos=g.attributes.position,col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){const x=c[0]+pos.getX(i)*sc[0],y=c[1]+pos.getY(i)*sc[1],z=c[2]+pos.getZ(i)*sc[2],k=fn(x,y,z);col[i*3]=k[0];col[i*3+1]=k[1];col[i*3+2]=k[2]}
  g.setAttribute('color',new T.BufferAttribute(col,3));return g}
const drgSm=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
function texDrgLeg(){return tex('drgleg',(g,W)=>{   /* v5_208 leg shading: copper at the top (matches the flank) -> red-orange -> slightly darker at the foot */
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#d98a3a');gr.addColorStop(.45,'#dc6a2c');gr.addColorStop(1,'#b8401a');g.fillStyle=gr;g.fillRect(0,0,W,W)})}

/* v5_211 SMOOTH WING ROOT: no more ball at the shoulder. A thin tapered arm runs from inside the torso out along the first wing bone; its vertex colours start exactly in the
   body colour field (drgCol) and fade into the wing-arm colour, with a top-lit / under-dark shading, so body -> wing is one continuous surface. a/b are wing-local points, r0/r1 radii. */
function drgWingRootGeo(side,P,a,b,r0,r1){
  const g=new T.CylinderGeometry(r1,r0,1,LITE?10:16,LITE?4:8),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)-PI/2;
  g.scale(1,L,1);g.rotateZ(ang);g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,0);
  const pos=g.attributes.position,nor=g.attributes.normal,col=new Float32Array(pos.count*3),ux=dx/L,uy=dy/L,arm=[.62,.54,.2],ws=.82,th=side*.3,ct=Math.cos(th),st=Math.sin(th);
  for(let i=0;i<pos.count;i++){
    const lx=pos.getX(i),ly=pos.getY(i),lz=pos.getZ(i),t=Math.min(1,Math.max(0,((lx-a[0])*ux+(ly-a[1])*uy)/L)),f=drgSm(.12,.8,t);
    const sx=side*ws*lx,sy=ws*ly,sz=ws*lz,bx=P[0]+sx*ct+sz*st,by=P[1]+sy,bz=P[2]-sx*st+sz*ct,c=drgCol(bx,by,bz),sh=.8+.3*Math.min(1,Math.max(-1,nor.getY(i)))*(.4+.6*f)+.06*f;   /* sh: darker underneath, lit on top */
    for(let k=0;k<3;k++)col[i*3+k]=Math.min(1,(c[k]+(arm[k]-c[k])*f)*sh)}
  g.setAttribute('color',new T.BufferAttribute(col,3));return g}
function texDrgLegUp(){return tex('drglegup',(g,W)=>{const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#d98a3a');gr.addColorStop(1,'#dc6a2c');g.fillStyle=gr;g.fillRect(0,0,W,W)})}
function texDrgLegLow(){return tex('drglegl',(g,W)=>{const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#dc6a2c');gr.addColorStop(1,'#b8401a');g.fillStyle=gr;g.fillRect(0,0,W,W)})}
const DRG_LEGTOP=[.85,.54,.23];
function drgThighCol(x,y,z){   /* v5_212: thigh = body colour field at the top, fading into the leg's top colour towards its lower half, so body -> leg has no colour step */
  const c=drgCol(x,y,z),f=drgSm(10.6,6.8,y);return[c[0]+(DRG_LEGTOP[0]-c[0])*f,c[1]+(DRG_LEGTOP[1]-c[1])*f,c[2]+(DRG_LEGTOP[2]-c[2])*f]}
function mkDragon(B){
  const skin=lam(0xffffff,{map:texDragon()}),vc=lam(0xffffff,{vertexColors:true}),
    plate=phg(0xe8bd62,{shininess:55,specular:0x665533,emissive:0x3a2606}),plateL=phg(0xf4d684,{shininess:55,specular:0x665533,emissive:0x3a2a08}),
    red=lam(0xe2501f,{emissive:0x3a0c00}),redD=lam(0xc43a14,{emissive:0x2a0600}),leg=lam(0xffffff,{map:texDrgLegUp(),emissive:0x1c0600}),legLo=lam(0xffffff,{map:texDrgLegLow(),emissive:0x1c0600}),kneeM=lam(0xdc6a2c,{emissive:0x1c0600}),pawM=lam(0xb8401a,{emissive:0x1c0600}),vcLeg=lam(0xffffff,{vertexColors:true,emissive:0x1c0600}),brown=lam(0x6a4634),
    horn=phg(0xf0cfa4,{shininess:40}),horn2=phg(0xd8d878,{shininess:40}),ivory=phg(0xf6ebc0,{shininess:60}),claw=phg(0xe6d9a2,{shininess:60}),
    fbone=lam(0xd98a3c,{emissive:0x2a1000}),beard=lam(0xf2d2b0,{side:T.DoubleSide}),
    mem=lam(0xffffff,{vertexColors:true,side:T.DoubleSide,emissive:0x2a0a00}),mem2=lam(0xf8dcc0,{side:T.DoubleSide,transparent:true,opacity:.92}),
    tailM=lam(0xffffff,{vertexColors:true});
  const armM=lam(new T.Color(1,.8,.58),{map:texDragon()}),nmat=lam(0xffffff,{map:texDragon(),vertexColors:true}),body=G(B,[0,0,0]);
  /* v5_210 flames like the phoenix: soft additive glow + flickering flame sprites (wfl list is animated in anim) */
  const R=rng(53),wfl=[],fo2=fsp(0xff3a08,.3),fm2=fsp(0xff8a1c,.34),fc2=fsp(0xffd666,.4),fsoft=fsp(0xff6a14,.3,'soft');fsoft.depthTest=false;
  const mass=(par,cx,cy,cz,sx,sz,n,w,h)=>{
    SP(par,fsoft,[cx,cy+h*.2,cz],sx*2+w*1.2+sz,h*.95);
    for(let i=0;i<n;i++){const u=(i+.5)/n,e=Math.abs(u-.5)*2,hh=h*(.55+.6*R())*(1-e*e*.55),ww=w*(.8+.5*R()),m=SP(par,[fo2,fm2,fm2,fc2][(R()*4)|0],[cx+(R()-.5)*sx,cy,cz+(u-.5)*sz],ww,hh,1);wfl.push({m:m,sx:ww,sy:hh,ph:R()*6.28})}};
  /* ---- torso: crouched, chest forward and high, hips low; vertex-coloured (brown back / copper flank / gold belly) */
  const tp=[[0,13,-2.5],[13,13,22],[0,0,0]],tp2=[[0,15.5,5.5],[11.5,12.5,12],[-.25,0,0]],tp3=[[0,11.6,-8],[11,10.5,11],[.18,0,0]];
  A(body,drgGeo('drg_t1',tp[0],tp[1]),vc,tp[0],tp[1]);
  A(body,drgGeo('drg_t2',tp2[0],tp2[1],tp2[2]),vc,tp2[0],tp2[1],tp2[2]);
  A(body,drgGeo('drg_t3',tp3[0],tp3[1],tp3[2]),vc,tp3[0],tp3[1],tp3[2]);
  for(let i=0;i<6;i++){const k=i/7,wx=i===5?.8:1;A(body,drgBlobGeo([0,7.2+k*4.6,-8+i*3.1],[(8.2-k*1.4)*wx,2.4,3.2],(x,y,z)=>{const c=drgCol(x,y,z),m=i%2?1:1.07;return[Math.min(1,c[0]*m),Math.min(1,c[1]*m),Math.min(1,c[2]*m)]}),vc,[0,7.2+k*4.6,-8+i*3.1],[(8.2-k*1.4)*wx,2.4,3.2],[ -.15-k*.35,0,0])}   /* gold belly bands (v5_213: only the 6 that lie inside the torso; the last two stuck out in front of the chest as small brown leaf-shaped lumps) */
  const fsoft2=fsp(0xff7a22,.22,'soft'),fsoft3=fsp(0xff9a3a,.14,'soft');fsoft2.depthTest=false;fsoft3.depthTest=false;
  for(const s of [-1,1]){   /* v5_212: no glow sphere any more (its rim was a visible bubble); layered soft radial sprites fade to 0 at the rim and are not clipped by the body, so no edge shows */
    SP(body,fsoft3,[s*5,19.6,1.6],24,22);
    SP(body,fsoft2,[s*4.8,19.6,1.6],15,13);
    mass(body,s*4.8,19.2,1.6,4.5,7,LITE?3:5,8,12)}
  /* ---- neck: a chain of olive scale spheres along an S path, each with a gold throat plate on the front and a red spine on the back */
  const path=[[7,15.5],[8.6,19.5],[8.6,24],[7.4,28.5],[6.2,32.4],[6.6,35.6]],pts=[];
  for(let i=0;i<path.length-1;i++)for(let j=0;j<3;j++){const f=j/3;pts.push([path[i][0]+(path[i+1][0]-path[i][0])*f,path[i][1]+(path[i+1][1]-path[i][1])*f])}
  pts.push(path[path.length-1]);
  pts.forEach((q,i)=>{
    const k=i/(pts.length-1),r=4.7-k*1.5,nx=pts[Math.min(i+1,pts.length-1)],pv=pts[Math.max(i-1,0)],dz=nx[0]-pv[0],dy=nx[1]-pv[1],phi=Math.atan2(dy,dz);
    const sz=r*1.9,ng=drgBlobGeo([0,q[1],q[0]],[sz,sz,sz],(x,y,z)=>{const t=1-drgSm(15,33,y);return[1,1-.3*t,1-.55*t]});   /* smooth copper -> green fade, per vertex */
    A(body,ng,nmat,[0,q[1],q[0]],[sz,sz,sz]);
    const f=G(body,[0,q[1],q[0]]);f.rotation.x=-phi;                                  /* local +y = back normal, local z = along the neck */
    A(f,'sph',i%2?plate:plateL,[0,-r*.86,0],[r*1.45,r*.62,r*.95]);                    /* throat plate (front) */
    if(i%2===0)A(f,'cone',red,[0,r*.95,-.4],[1.5-k*.5,4.2-k*1.2,1.5-k*.5],[-.6,0,0]);  /* back spine */
  });
  /* ---- head (olive green) at the top of the neck, looking forward */
  const head=G(body,[0,38.2,10.2]);head.rotation.x=.12;head.scale.setScalar(1.22);
  A(head,'sph',skin,[0,0,0],[9.6,8.6,10.6]);
  A(head,'sph',skin,[0,-1.2,6.6],[6.2,5,8.4]);                                         /* snout */
  A(head,'sph',skin,[0,-1.6,10.2],[4.6,3.6,3.4]);                                     /* nose */
  A(head,'sph',plateL,[0,-3.6,5],[4.6,1.8,8.2],[.1,0,0]);                              /* lower jaw (cream) */
  A(head,'sph',phg(0x7a1810),[0,-2.4,5.4],[3.8,1.1,6.6]);                              /* red mouth */
  const mouth=A(head,'sph',glow(0xff7a22,.45),[0,-2.6,8],[2.2,2.2,2.2]);
  A(head,'sph',phg(0x2a1a08),[-1.5,-.4,11.6],[.9,.7,.7]);A(head,'sph',phg(0x2a1a08),[1.5,-.4,11.6],[.9,.7,.7]);   /* nostrils */
  hornChain(head,horn2,[[0,-.6,10.6],[0,.8,12.6],[0,3.2,13.4],[0,5.2,12.6]],1.9);        /* snout tusk: starts inside the nose, curls up */
  for(const s of [-1,1]){
    for(let i=0;i<4;i++)A(head,'cone',ivory,[s*(1.6+i*1.05),-2.1,4.6+i*1.8],[.7,1.5,.7],[PI,0,0]);   /* teeth */
    A(head,'cone',ivory,[s*2.1,-3.1,9.2],[.9,2.2,.9],[PI,0,0]);                          /* front fangs */
    hornChain(head,s>0?horn2:horn,[[s*3,2.6,-1],[s*3.8,5.6,-5],[s*4.6,8,-10.5],[s*5,10.4,-16],[s*5,13.2,-19.5]],3.6);   /* long swept-back horns, one connected piece, rooted in the skull */
    A(head,'sph',skin,[s*3.9,2.5,3.4],[3.6,1.7,3.2],[0,0,s*-.3]);                       /* brow ridge */
    const iz=4.2;A(head,'sph',phg(0xe46a1c,{shininess:120,emissive:0x5a1e00}),[s*4.4,.9,iz],3.3);
    A(head,'sph',phg(0x1a0806,{shininess:120}),[s*4.7,.9,iz+1.15],[1.5,2,1.2]);A(head,'sphL',bas(0xffffff),[s*4.9,1.8,iz+1.6],.8);
    feather(head,red,6.6,3,.6,[s*5.2,-.2,-1.6],Math.atan2(s*.9,-.5),-.1);              /* cheek frills */
    feather(head,redD,5,2.4,.5,[s*5,-1.8,-.4],Math.atan2(s*.9,-.2),.15);
    A(head,'cone',beard,[s*1.6,-4.6,6.8],[.9,4,.5],[.2,0,s*.1]);A(head,'cone',beard,[s*.7,-5,4.6],[.8,3.6,.5],[.2,0,s*.05]);   /* whisker tendrils */
  }
  A(head,'cone',beard,[0,-5.2,8.2],[1,4.4,.5],[.15,0,0]);A(head,'cone',beard,[0,-5,2.8],[1,3.6,.5],[.15,0,0]);
  const crest=G(head,[0,4.6,-3.4]);   /* red-orange crest of flame-like spikes on top of the head */
  [[0,5.2,.3,-.2],[-1.9,4.6,.1,-.35],[1.9,4.6,.1,-.35],[0,4,.2,-.7],[-3.2,3.2,.2,-.7],[3.2,3.2,.2,-.7],[0,3.2,.35,-1.05],[-1.2,3.4,.1,-.5],[1.2,3.4,.1,-.5]].forEach((c,i)=>A(crest,'cone',i%2?redD:red,[c[0]*.5,0,i*-.5+1.4],[1.5,c[1]*1.5,1.3],[c[3]-.15,0,c[0]*-.12]));
  /* ---- tail: a thick curve, brown root -> peach tip, red spikes along the top, curling up behind */
  const tail=G(body,[0,9.5,-12.5]);
  const tc=(k)=>[.42+k*.5,.28+k*.38,.2+k*.28];
  const tpts=[];for(let i=0;i<11;i++){const k=i/10;tpts.push([0,-k*4.2+Math.sin(k*PI)*0+Math.pow(k,2.2)*13,-i*3.2+Math.sin(k*PI*.9)*0])}
  const tailCol=(x,y,z)=>{const k=Math.min(1,Math.max(0,-z/32)),c=tc(k),b=drgCol(x,y+9.5,z-12.5),f=drgSm(0,.4,k);return[b[0]+(c[0]-b[0])*f,b[1]+(c[1]-b[1])*f,b[2]+(c[2]-b[2])*f]};
  tpts.forEach((p,i)=>{const k=i/10,r=5.4*(1-k*.82);
    A(tail,drgBlobGeo([p[0],p[1],p[2]],[r*1.8,r*1.7,r*2.2],tailCol),vc,[p[0],p[1],p[2]],[r*1.8,r*1.7,r*2.2]);
    if(i>0&&i<10)A(tail,'cone',i%2?red:redD,[0,p[1]+r*.88,p[2]],[1.7*(1-k*.5),4.8*(1-k*.45),1.7*(1-k*.5)],[-.35,0,0])});
  A(tail,'cone',red,[0,tpts[10][1]+.4,tpts[10][2]-3.4],[2,6,1.4],[-PI/2-.4,0,0]);
  /* ---- wings: big orange bat wings with five finger bones, scalloped edge and claws */
  const wings=[];
  for(const s of [-1,1]){
    const WP=[s*3.7,17.9,1.5],w=G(body,WP);w.scale.set(s*.82,.82,.82);w.rotation.y=s*.3;
    A(w,drgWingRootGeo(s,WP,[-3.4,-4.2],[7.2,8.9],4.3,1.65),vc,[0,0,0]);                 /* v5_211 tapered shoulder arm: body colour -> wing-arm colour, embedded in the torso */
    A(w,dragonWingGeo(),mem,[0,0,0]);
    A(w,'wingDragon',mem2,[3,-1.5,-.35],[.8,.82,1]);                                    /* the paler far membrane peeking behind */
    const fingers=[[[0,0],[9,11]],[[9,11],[20,15]],[[20,15],[30,19]],[[20,15],[26,3]],[[20,15],[16,-4]],[[20,15],[6,-8]]];
    fingers.forEach((b,i)=>bone(w,b[0],b[1],i<2?1.5:.85,i<2?armM:fbone));
    [[30,19],[26,3],[16,-4],[6,-8]].forEach(q=>A(w,'cone',claw,[q[0],q[1],0],[1.3,3.4,1.3],[0,0,Math.atan2(q[1]-8,q[0]-14)-PI/2]));
    A(w,'cone',horn2,[9,11.8,0],[1.8,4.8,1.8],[0,0,.15]);                               /* yellow wrist claw */
    A(w,dragonWingGeo(),glow(0xff7a22,.2),[0,0,.08],[1.05,1.05,1]);                       /* soft glowing membrane */
    for(const q of [[10,9,5],[19,13,6],[23,7,5],[15,1,6],[8,-3,4]])mass(w,q[0],q[1],.4,q[2],1,LITE?2:3,7,11);   /* flames burning along the finger bones */
    wings.push(w);
  }
  /* ---- legs: front legs straight, hind legs bent (crouching); orange-red scales, copper thighs, ivory claws */
  const legs=[];
  [[-4.6,7.8,0],[4.6,7.8,0],[-5,-7,1],[5,-7,1]].forEach(p=>{const hind=p[2],L=kneeLeg(body,p[0],10.4,p[1],{
      hind:hind,l1:4.4,d1:6,d2:5,kr:2,a1:hind?-.55:-.15,a2:hind?.7:.2,mat:leg,low:legLo,kneeMat:kneeM,
      th:hind?[6.4,7.6,8.2]:[5.4,6.4,6.8],thPos:[0,.2,0],thMat:vcLeg,thGeo:drgBlobGeo([p[0],10.6,p[1]],hind?[6.4,7.6,8.2]:[5.4,6.4,6.8],drgThighCol),pawS:[5.6,3.2,7.4],pawMat:pawM,pawZ:1.2});
    for(const tx of [-1.9,0,1.9])A(L.foot,'cone',claw,[tx,-.2,5.2],[1.1,2.8,1.1],[PI/2,0,0]);
    legs.push(L)});
  return{fr:17,hh:48,k:.78,anim(t,mv){
    const flap=Math.sin(t*(2+mv*5))*(.13+mv*.22);
    wfl.forEach(f=>{const q=1+Math.sin(t*10+f.ph)*.2+Math.sin(t*19+f.ph*2)*.1;f.m.scale.set(f.sx*(1-(q-1)*.3),f.sy*q,1)});
    wings[0].rotation.z=-.12-flap;wings[1].rotation.z=.12+flap;
    head.rotation.y=Math.sin(t*.8)*.2;head.rotation.x=.12+Math.sin(t*1.3)*.05;
    tail.rotation.y=Math.sin(t*1.7)*.26;tail.rotation.x=Math.sin(t*1.1)*.04;
    walk(legs,t,mv,8,.6);
    body.position.y=Math.abs(Math.sin(t*8))*1.1*mv+Math.sin(t*2)*.3;
    mouth.scale.setScalar(2.2+Math.sin(t*5)*.5+Math.sin(t*11)*.25);
  }};
}

function mkFairy(B){
  const skin=phg(0xffdcc4,{shininess:35}),hair=lam(0xff8fcf),dress=lam(0xff9ad5,{emissive:0x2a0a1c}),dressL=lam(0xffc6e8),gold=phg(0xffd24a,{shininess:90,emissive:0x4a3300}),
    w1=lam(0xbfefff,{side:T.DoubleSide,transparent:true,opacity:.62,emissive:0x2a6a80,depthWrite:false}),w2=bas(0xffffff,{side:T.DoubleSide,transparent:true,opacity:.28,depthWrite:false}),
    w3=lam(0xffc8f0,{side:T.DoubleSide,transparent:true,opacity:.6,emissive:0x703a60,depthWrite:false}),eyeM={},dust=glow(0xffe9fb,.85),dust2=glow(0xbfefff,.8);
  const body=G(B,[0,8,0]);
  A(body,'cone',dress,[0,10.5,0],[9.4,11.5,9.4]);
  for(let i=0;i<8;i++){const a=i/8*PI*2;A(body,'sph',dressL,[Math.cos(a)*4.4,5.6,Math.sin(a)*4.4],[3.2,2.6,3.2])}
  A(body,'sph',dress,[0,16.6,0],[5,5.8,3.9]);
  A(body,'cyl',skin,[0,19.2,0],[1.6,1.8,1.6]);
  const head=G(body,[0,22.6,0]);
  A(head,'sph',skin,[0,0,0],[7.2,7.6,7.2]);
  A(head,'sph',hair,[0,.7,-1],[7.9,8,7.5]);A(head,'sph',hair,[0,2.6,1.2],[7.6,3.4,5.4]);
  for(const s of [-1,1]){A(head,'sph',hair,[s*3.5,-.4,1.4],[1.8,5.6,2.4],[0,0,s*.15]);A(head,'cone',skin,[s*3.8,-.2,-.4],[1.3,2.6,1.3],[0,0,s*-1.3]);
    A(head,'sph',lam(0xffa0b8,{transparent:true,opacity:.6}),[s*2.6,-1.5,3],[1.9,1.2,.8]);eye(head,s*1.75,-.1,3.1,.95,0x3a1a6a,eyeM)}
  A(head,'sph',phg(0xd0506a),[0,-2.2,3.3],[1.3,.55,.5]);
  const pony=G(head,[0,1,-3.8]);[[0,0,0,2.6],[0,-2.2,-1.4,2.3],[0,-4.4,-2,1.9],[0,-6.2,-1.6,1.5]].forEach(p=>A(pony,'sph',hair,[p[0],p[1],p[2]],p[3]*1.3));
  const fl=G(head,[3.1,3.6,1.8]);for(let i=0;i<5;i++){const a=i/5*PI*2;A(fl,'sph',lam(0xffffff),[Math.cos(a)*1.3,Math.sin(a)*1.3,0],1.5)}A(fl,'sph',gold,[0,0,.2],1.2);
  const armL=G(body,[-2.8,17.6,0]),armR=G(body,[2.8,17.6,0]);
  A(armL,'cyl',skin,[0,-2.2,0],[1.2,4.6,1.2]);A(armR,'cyl',skin,[0,-2.2,0],[1.2,4.6,1.2]);
  A(armL,'sph',skin,[0,-4.7,0],1.5);A(armR,'sph',skin,[0,-4.7,0],1.5);
  A(armR,'cyl',gold,[0,-5,2.4],[.5,9,.5],[PI/2.4,0,0]);const star=A(armR,'oct',glow(0xffee70,.95),[0,-1.6,6.2],3.6);A(armR,'sph',glow(0xffee70,.28),[0,-1.6,6.2],8);
  armL.rotation.z=.3;armR.rotation.z=-.25;
  for(const s of [-1,1]){const lg=G(body,[s*1.5,6,.4]);A(lg,'cyl',skin,[0,-2.6,0],[1.3,5.2,1.3]);A(lg,'sph',dress,[0,-5.4,.7],[2.1,1.6,3.2])}
  const wings=[];
  for(const s of [-1,1]){
    const up=G(body,[s*1.2,17.8,-2]);up.scale.set(s*.72,.72,.72);up.rotation.y=s*.25;A(up,'wingFairy',w1,[0,0,0]);A(up,'wingFairy',w2,[0,.4,.05],.86);A(up,'wingFairy',w3,[0,0,-.08],[.4,.4,.4]);
    const lo=G(body,[s*1.2,16.5,-2]);lo.scale.set(s*.72,.72,.72);lo.rotation.y=s*.2;A(lo,'wingFairyLo',w3,[0,0,0]);A(lo,'wingFairyLo',w2,[0,0,.05],.85);
    wings.push(up,lo)}
  const sp=[];for(let i=0;i<9;i++)sp.push(A(B,'sphL',i%2?dust:dust2,[0,0,0],1.2));
  return{fr:13,hh:32,k:.85,anim(t,mv){
    const f=Math.sin(t*26)*.42;
    wings[0].rotation.z=-.25-f;wings[2].rotation.z=.25+f;wings[1].rotation.z=-.15-f*.8;wings[3].rotation.z=.15+f*.8;
    body.position.y=8+Math.sin(t*2.3)*1.6+mv*.8;body.rotation.x=-.08*mv+Math.sin(t*1.6)*.03;body.rotation.z=Math.sin(t*1.4)*.05;
    head.rotation.z=Math.sin(t*1.7)*.07;pony.rotation.x=Math.sin(t*2.2)*.2;
    armR.rotation.x=Math.sin(t*2.6)*.2;star.scale.setScalar(3.4+Math.sin(t*6)*.5);star.rotation.y=t*2;
    sp.forEach((q,i)=>{const k=((t*.35+i*.11)%1),a=i*2.1+t*.9;q.position.set(Math.cos(a)*(7+k*7),6+k*22+Math.sin(t+i)*2,Math.sin(a)*(7+k*7)-2);q.scale.setScalar(1.7*(1-k)+.2)});
  }};
}

/* v5_203b PHOENIX REDESIGN after the reference picture: raised V-shaped wings of long feathers (dark bronze root -> orange -> glowing gold tips), a dark bronze body and chest,
   a hooked golden beak with a swept-back golden crest, golden talons, and ONE long sweeping tail that curls up into a spiral (a few plumes nested like the swirl in the picture)
   instead of the old flat fan of plumes. The flames that burned on the back / crest are gone: the glow now sits on the feathers (barbs, tips, halo shells) and in the wings.
   Tune: wing lift = LIFT in anim; tail = NT / NS / plume() (L0 length, cv curl per segment, x0 start droop); colours = FST / TST at the top of the file, texPhoenix. */
function mkPhoenix(B){
  const skin=lam(0xffffff,{map:texPhoenix(),vertexColors:true,emissive:0x5a2c00}),gold=phg(0xffc83a,{shininess:80,emissive:0x4a2a00}),eyeM={},aura=fsp(0xff7a22,.26,'soft'),ember=fsp(0xffb040,.9,'soft');
  const fv=lam(0xffffff,{vertexColors:true,emissive:0x3a1800,side:T.DoubleSide}),   /* wing feathers: vertex-coloured, dark bronze at the root -> orange -> gold tip */
    tv=lam(0xffffff,{vertexColors:true,emissive:0x5a2c00,side:T.DoubleSide}),       /* tail plumes: deep orange -> bright gold */
    crm=lam(0xffd24a,{emissive:0x8a5a00,side:T.DoubleSide}),
    fireM=fsp(0xff8a1c,.5),fireC=fsp(0xffd666,.55),flm=[],wfl=[],tng=[],
    eg1=bas(0xff9a28,{side:T.DoubleSide}),eg2=bas(0xffd860,{side:T.DoubleSide}),halo=glow(0xffa22a,.26);   /* unlit edge glow in the flame colours */
  const body=G(B,[0,9,0]);
  SP(body,aura,[0,18,-3],60,56);   /* soft halo, no hard edge */
  const bo=[0,0,0],sz=(k,p,sc,r,o,g)=>A(body,bodyGeo(k,p,sc,r,o||bo,g),skin,p,sc,r);
  sz('phB',[0,15,0],[11,12.4,18],[-.35,0,0]);
  sz('phC',[0,15,6],[9,10,9],[0,0,0],bo,1.12);                                  /* chest */
  sz('phN',[0,21,8.4],[6.4,8,6.6],[-.4,0,0]);
  const head=G(body,[0,25,10.4]);
  A(head,bodyGeo('phH',[0,0,0],[7.6,7.4,8.2],[0,0,0],[0,25,10.4]),skin,[0,0,0],[7.6,7.4,8.2]);
  A(head,'cone',gold,[0,-.8,6],[3.2,5.8,2.4],[PI/2,0,0]);A(head,'cone',gold,[0,-1.9,5],[2.6,4,1.6],[PI/2,0,0]);
  A(head,'cone',gold,[0,-2.3,8.3],[2.1,3.8,1.7],[PI/2+.95,0,0]);          /* the hooked tip of the beak */
  for(const s of [-1,1]){eye(head,s*2.9,.7,2.9,1.15,0xffb02e,eyeM);SP(head,fsp(0xffe080,.4,'soft'),[s*3.8,-1.2,2.2],4.2,4.2)}
  /* swept-back golden crest plumes */
  const crest=G(head,[0,3.2,-1.2]);
  for(let i=0;i<4;i++){const k=i/3;feather(crest,crm,14-Math.abs(k-.5)*6,1.5,.6,[(k-.5)*2.2,0,0],PI+(k-.5)*.7,.5+k*.12)}
  SP(crest,fsp(0xffd666,.35,'soft'),[0,2,-4],13,13);
  const R=rng(91),fo2=fsp(0xff3a08,.3),fm2=fsp(0xff8a1c,.34),fc2=fsp(0xffd666,.4),fsoft=fsp(0xff6a14,.3,'soft');
  const mass=(par,cx,cy,cz,sx,sz,n,w,h,arr)=>{
    SP(par,fsoft,[cx,cy+h*.2,cz],sx*2+w*1.2+sz,h*.95);
    for(let i=0;i<n;i++){const u=(i+.5)/n,e=Math.abs(u-.5)*2,hh=h*(.55+.6*R())*(1-e*e*.55),ww=w*(.8+.5*R()),m=SP(par,[fo2,fm2,fm2,fc2][(R()*4)|0],[cx+(R()-.5)*sx,cy,cz+(u-.5)*sz],ww,hh,1);arr.push({m:m,sx:ww,sy:hh,ph:R()*6.28})}};
  /* RAISED WINGS: long feathers fanned in the wing plane; the whole wing is lifted into a V in anim() */
  const wings=[];
  for(const s of [-1,1]){
    const w=G(body,[s*5.2,17.5,1.5]);w.scale.x=s;
    const tp=[],wf=[];w.userData.wf=wf;
    for(let i=0;i<9;i++){const a=-.2+i*.21,yaw=Math.atan2(Math.cos(a),-Math.sin(a)),L=32-Math.abs(i-2)*2.3,fg=G(w,[0,0,0]);fg.rotation.order='ZYX';fg.rotation.set(0,yaw,0);wf.push({g:fg,r:Math.cos(a)*L,yaw:yaw});
      A(fg,'fcone',fv,[0,0,L/2],[5.4,L,1],[PI/2,0,0]);
      barbs(fg,eg1,L,5.4,.3,.82,LITE?2:4,L*.24,.5);                                                     /* glowing barbs along both edges */
      for(const sd of [-1,1])A(fg,'cone',eg2,[sd*.5,0,L*.92],[1.1,L*.18,.5],[PI/2,0,-sd*.4]);          /* glowing forked tip */
      if(!LITE)A(fg,'cone',halo,[0,0,L*.5],[5.4*1.55,L*1.04,1.2],[PI/2,0,0]);                         /* soft feather-shaped glow */
      tp.push([Math.sin(yaw)*L,Math.cos(yaw)*L])}
    for(let i=0;i<6;i++){const a=.05+i*.26,yaw=Math.atan2(Math.cos(a),-Math.sin(a)),L=14-Math.abs(i-2)*.9,fg=G(w,[0,.9,.4]);fg.rotation.order='ZYX';fg.rotation.set(0,yaw,0);wf.push({g:fg,r:Math.cos(a)*L,yaw:yaw});
      A(fg,'fcone',fv,[0,0,L/2],[4.8,L,.9],[PI/2,0,0]);
      barbs(fg,eg1,L,4.8,.4,.78,LITE?1:2,L*.26,.45);if(!LITE)A(fg,'cone',halo,[0,0,L*.5],[4.8*1.55,L*1.04,1.1],[PI/2,0,0])}
    {let ax=0,az=0;tp.forEach(q=>{ax+=q[0]/tp.length;az+=q[1]/tp.length});
     mass(w,ax*.55,.2,az*.55,2.6,5,LITE?4:6,9,14,wfl);mass(w,ax*.85,.2,az*.85,2.2,4,LITE?3:4,7.5,11,wfl)}   /* the glow burns in the outer half of the wing */
    wings.push(w)}
  /* ONE LONG SPIRAL TAIL: NT plumes (nested like the swirl in the picture), each a chain of NS tapering segments. A plume starts drooping down behind the bird (x0), then each segment
     turns a little upward (cv) and gets shorter, so it sweeps down, back and curls up into a spiral. The tail group is leaned sideways (rotation.z) so the swirl is seen from the front too. */
  const NT=LITE?13:23,NS=LITE?7:9,MID=(NT-1)/2,LS=LITE?1.25:1;   /* v5_203c: a wide FAN of many separate feathers (was 5 plumes that overlapped into one rope) */
  const plume=(k,i)=>{const a=Math.abs(k);return{L0:(13-a*4.5)*LS*(i===MID?1.1:(Math.abs(i-MID)%2?.84:1)),cv:2.3/(NS-1)-a*.04,x0:.45-a*.3,w0:3.8-a*.9,yaw:k*.8}};
  const segL=(pp,j)=>pp.L0*(1-j*(.6/(NS-1)));
  /* v5_203g the tail starts ON THE BACK LINE: backY() = height of the top of the body at (x,z) (the body ellipsoid is pitched -.35), so the back runs on into the tail in an almost straight line */
  const backY=(x,z)=>{const c=Math.cos(.35),sn=Math.sin(.35);for(let y=40;y>0;y-=.1){const yc=y-15,yl=yc*c-z*sn,zl=yc*sn+z*c;if((x/5.5)*(x/5.5)+(yl/6.2)*(yl/6.2)+(zl/9)*(zl/9)<=1)return y}return 15};   /* v5_203j: the REAL radii of the body (it was given the diameters, so the tail floated ~6 units above the back) */
  const tz=-4,ty=backY(0,tz)-1.6,tf=[],flames=[],tail=G(body,[0,ty,tz]);tail.rotation.z=.1;
  const mid=plume(0,MID),cpath=[];{let up=0,bk=0;for(let j=0;j<NS;j++){const ph=mid.x0-mid.cv*j,L=segL(mid,j);cpath.push([up,bk]);up+=-Math.sin(ph)*L*.6;bk+=Math.cos(ph)*L*.6}cpath.push([up,bk])}
  for(let i=0;i<NT;i++){
    const k=(i-MID)/MID,pp=plume(k,i),root=G(tail,[k*3.4,backY(k*3.4,tz)-ty-1.4,0]);
    root.rotation.order='YXZ';root.rotation.set(pp.x0,PI+pp.yaw,0);
    let par=root;const segs=[];
    for(let j=0;j<NS;j++){
      const L=segL(pp,j),sg=G(par,[0,0,j?segL(pp,j-1)*.6:0]);sg.rotation.x=j?-pp.cv:0;
      const w=Math.max(1.3,pp.w0*(1-j/NS*.82));
      A(sg,'tcone',tv,[0,0,L*.5],[w,L,.9],[PI/2,0,0]);
      if(j>0)barbs(sg,eg1,L,w,.3,.7,1,L*.42,.45,.7);                                       /* glowing edge barbs */
      if(!LITE)A(sg,'cone',halo,[0,0,L*.5],[w*1.5,L*1.03,1.2],[PI/2,0,0]);                           /* soft glow around each segment */
      if(j===NS-1){A(sg,'cone',eg2,[0,0,L*.96],[w*.55,L*.62,.6],[PI/2,0,0]);for(const sd of [-1,1])A(sg,'cone',eg1,[sd*.6,0,L*.7],[.9,L*.4,.45],[PI/2,0,-sd*.5])}   /* long glowing tip with a fork */
      if(i===MID&&j>1&&j%2===(NS%2)){const sx=w*2.2+3,sy=L*.8+w;flames.push({m:SP(sg,j%4<2?fireM:fireC,[0,.5,L*.5],sx,sy,1),sx:sx,sy:sy,i:i,j:j})}   /* a little fire only along the middle plume */
      par=sg;segs.push({g:sg,cv:pp.cv});
    }
    tf.push(segs);
  }
  /* v5_203j NO RUMP: the cone and the bridge are gone. The tail now grows out of the BACK of the body itself (tz / ty from backY with the true body radii), and a second layer of SHORT feathers
     (NT2 plumes, NS2 segments, L0 about 7.5 -> 5) sits in front of the long fan, rooted on the back line and fanned wider, so they cover the joint like covert feathers and the long plumes come out
     of a feathered base instead of a bare seam. Same material / colours / glow as the long plumes. Tune: NT2, NS2, L0 / w0 / x0 / yaw in the loop, the root offsets (sx, z). */
  const NT2=LITE?9:15,NS2=LITE?3:4,MID2=(NT2-1)/2;
  for(let i=0;i<NT2;i++){
    const k=(i-MID2)/MID2,a=Math.abs(k),L0=(7.6-a*2.4)*(i%2?.8:1),cv=1.9/(NS2-1),x0=.42-a*.12,w0=3.5-a*.6,sx=k*4,rz=1.4-a*.5;
    const root=G(tail,[sx,backY(sx,tz+rz)-ty-1.1,rz]);
    root.rotation.order='YXZ';root.rotation.set(x0,PI+k*1.05,0);
    let par=root;const segs=[];
    for(let j=0;j<NS2;j++){
      const L=L0*(1-j*(.5/(NS2-1))),sg=G(par,[0,0,j?L0*(1-(j-1)*(.5/(NS2-1)))*.6:0]);sg.rotation.x=j?-cv:0;
      const w=Math.max(1.2,w0*(1-j/NS2*.7));
      A(sg,'tcone',tv,[0,0,L*.5],[w,L,.9],[PI/2,0,0]);
      if(j>0)barbs(sg,eg1,L,w,.3,.7,1,L*.42,.45,.7);
      if(!LITE)A(sg,'cone',halo,[0,0,L*.5],[w*1.5,L*1.03,1.2],[PI/2,0,0]);
      if(j===NS2-1)A(sg,'cone',eg2,[0,0,L*.96],[w*.55,L*.62,.6],[PI/2,0,0]);   /* glowing tip */
      par=sg;segs.push({g:sg,cv:cv});
    }
    tf.push(segs);
  }
  SP(body,fsp(0xff8a1c,.3,'soft'),[0,ty,tz-1],24,18);
  /* v5_203e the body glows like the wing roots: the same soft additive feather-glow shells (halo) around body / chest / rump, and a burning mass of flame on the back */
  A(body,'sph',halo,[0,15,0],[14,15.4,21],[-.35,0,0]);A(body,'sph',halo,[0,15,6],[11.5,12.5,11]);
  mass(body,0,19,-2,6,12,LITE?4:6,9,13,wfl);mass(body,0,17,-8,5,6,LITE?3:4,7.5,11,wfl);
  const tem=[];for(let i=0;i<(LITE?10:18);i++)tem.push(SP(tail,i%3?fireM:fireC,[0,0,0],4,4));   /* sparks drifting along the spiral */
  for(const s of [-1,1]){const g=G(body,[s*3.2,7.2,2.4]);A(g,'cyl',gold,[0,-1.6,0],[1.3,7,1.3]);
    for(const tx of [-1.3,0,1.3])A(g,'cone',gold,[tx,-5.2,1.8],[1,3.8,1],[PI/2+.15,0,tx*.2])}   /* golden talons */
  SP(body,fsp(0xff9a30,.32,'soft'),[0,24,-2],28,22);   /* a warm glow between the wings (no flames on the back any more) */
  const em=[];for(let i=0;i<12;i++)em.push(SP(B,ember,[0,0,0],3,3));
  const LIFT=1.0;
  return{fr:19,hh:44,k:.74,anim(t,mv){
    const f=Math.sin(t*(6+mv*3))*.5,lift=Math.sin(t*6.6+.5);
    wings[0].rotation.z=-(LIFT+f);wings[1].rotation.z=LIFT+f;
    /* v5_203f the wing BENDS like a real bird's: each feather follows the flap a little later the farther out it is (lag = its reach), so the tips trail the root on the way up and down and
       the feather line becomes a curve; the outer feathers also sweep back a little on the downstroke */
    {const om=6+mv*3;for(const w of wings)for(const q of w.userData.wf){const lag=q.r*.055,d=(Math.sin(t*om-lag)-Math.sin(t*om))*.5+Math.cos(t*om-lag)*.06*q.r/32;q.g.rotation.z=d;q.g.rotation.y=q.yaw+Math.cos(t*om-lag)*.05*q.r/32}}
    body.position.y=9+Math.sin(t*3.3)*1.7+mv*1.2+lift*.5;body.rotation.x=-.06*mv;
    head.rotation.y=Math.sin(t*1.1)*.22;head.rotation.x=Math.sin(t*1.9)*.05;
    tail.rotation.y=Math.sin(t*1.7)*.14;tail.rotation.x=Math.sin(t*2.4)*.04+(f>0?.03:0);
    tf.forEach((segs,i)=>segs.forEach((o,j)=>{if(j){o.g.rotation.x=-o.cv+Math.sin(t*2.6-j*.8+i*.35)*.035+mv*.02;o.g.rotation.y=Math.sin(t*1.9-j*.7+i*.5)*.07}}));
    flames.forEach(f=>{const q=1+Math.sin(t*9+f.j*1.3+f.i*2.1)*.17+Math.sin(t*17+f.i*3+f.j)*.08;f.m.scale.set(f.sx*(1+(q-1)*.5),f.sy*q,1)});
    wfl.forEach(f=>{const q=1+Math.sin(t*10+f.ph)*.2+Math.sin(t*19+f.ph*2)*.1;f.m.scale.set(f.sx*(1-(q-1)*.3),f.sy*q,1)});
    tng.forEach(f=>{const q=1+Math.sin(t*11+f.ph)*.18+Math.sin(t*23+f.ph*3)*.1;f.m.scale.set(f.sx*(1-(q-1)*.4),f.sy*q,1)});
    tem.forEach((q,i)=>{const u=((t*.28+i/tem.length)%1),a=i*2.4+t*2,x=u*(cpath.length-1),j=Math.min(cpath.length-2,x|0),fr=x-j,p0=cpath[j],p1=cpath[j+1];
      q.position.set(Math.sin(a)*(1.4+u*2.5),p0[0]+(p1[0]-p0[0])*fr+Math.sin(a*1.3)*1.2,-(p0[1]+(p1[1]-p0[1])*fr));q.scale.setScalar((2.4*(1-u*.85)+.2)*2.6)});
    em.forEach((q,i)=>{const k=((t*.45+i*.083)%1),a=i*1.9+t;q.position.set(Math.cos(a)*(5+k*9),12+k*26,Math.sin(a)*(5+k*9)-5);q.scale.setScalar((2.2*(1-k)+.1)*2.4)});
  }};
}

function mkTiger(B){
  const fur=lam(0xffffff,{map:texTiger()}),orange=lam(0xf29a35),cream=lam(0xfff0d6),dark=lam(0x1a0e05),pinkI=lam(0xf0a08a),nose=phg(0xe0707a,{shininess:80}),eyeM={},body=G(B,[0,0,0]);
  A(body,'sph',fur,[0,15,0],[14,12.8,24]);A(body,'sph',fur,[0,15.6,6.6],[15,13.8,12]);A(body,'sph',fur,[0,15,-6.8],[14,13,12]);
  A(body,'sph',cream,[0,12,8.5],[8,5,7]);
  const head=G(body,[0,19.6,15.2]);
  A(head,'sph',fur,[0,0,0],[11.6,10.6,10.8]);
  A(head,'sph',cream,[0,-2.6,5.2],[6.4,4.8,6.2]);A(head,'sph',cream,[0,-4.4,3.4],[5,2.4,5]);
  for(const s of [-1,1]){A(head,'sph',cream,[s*5,-2.2,1],[4.8,4,5]);
    A(head,'sph',orange,[s*4.8,5,-1],[3.8,3.8,1.7],[0,0,0]);A(head,'sph',pinkI,[s*4.8,5,-.1],[2.3,2.3,.8]);A(head,'sph',dark,[s*4.8,6.6,-1.2],[2.6,1.2,1.4]);
    eye(head,s*3.5,1.2,4.5,1.45,0xf0b020,eyeM);A(head,'box',dark,[s*3.7,2.9,4.7],[2.6,.5,.7],[0,0,s*-.25]);
    for(let i=0;i<3;i++)A(head,'sphL',dark,[s*(2+i*.6),-2.2-i*.4,8.6-i*.2],.55);
    A(head,'box',dark,[s*5.6,.2,2.6],[.5,.5,3.4],[0,s*.2,0]);A(head,'box',dark,[s*5.7,-1.4,2.6],[.5,.5,3],[0,s*.2,0])}
  A(head,'sph',nose,[0,-.8,8.5],[2.6,1.8,1.8]);A(head,'box',dark,[0,-2.2,8.1],[.35,2,.35]);
  A(head,'box',dark,[0,5.1,3.2],[.9,.3,3.2]);A(head,'box',dark,[-1.9,5,2.8],[.8,.3,2.6],[0,.2,0]);A(head,'box',dark,[1.9,5,2.8],[.8,.3,2.6],[0,-.2,0]);
  const tail=G(body,[0,16,-12]);
  for(let i=0;i<8;i++){const k=i/7;A(tail,'sph',i===7?dark:(i%2?dark:orange),[0,i*1.15+Math.sin(k*3)*1.6,-i*2.3],[4.4-k*1.3,4.4-k*1.3,4.2])}
  /* v5_200: legs with KNEES (front legs a slight bend, back legs a strong forward knee + hock), stripes on both leg parts */
  const legs=[];
  [[-5,7.6,0],[5,7.6,0],[-5,-8,1],[5,-8,1]].forEach(p=>{const hind=p[2],L=kneeLeg(body,p[0],12.6,p[1],{
      hind:hind,l1:5.4,d1:hind?4.8:5.4,d2:hind?4.1:4.6,kr:2,a1:hind?-.5:-.16,a2:hind?.55:.18,mat:orange,thMat:fur,th:[5.2,6.8,7.6],thPos:[0,.6,0],
      pawS:[5,3,6],pawMat:cream,pawZ:.7});
    const rs=hind?4.8:5.4;A(L.up,'tor',dark,[0,-2.4,0],[rs*.95,rs*.95,rs*.95],[PI/2,0,0]);A(L.kn,'tor',dark,[0,-L.l2*.32,0],[rs*.8,rs*.8,rs*.8],[PI/2,0,0]);A(L.kn,'tor',dark,[0,-L.l2*.62,0],[rs*.74,rs*.74,rs*.74],[PI/2,0,0]);
    for(const tx of [-1.5,0,1.5])A(L.foot,'sph',cream,[tx,-.3,3],1.6);
    legs.push(L)});
  return{fr:15,hh:26,anim(t,mv){
    walk(legs,t,mv,8.5,.65);
    body.position.y=Math.abs(Math.sin(t*8.5))*.9*mv+Math.sin(t*1.8)*.2;body.rotation.x=Math.sin(t*1.8)*.012;
    head.rotation.y=Math.sin(t*.9)*.15;head.rotation.x=Math.sin(t*1.4)*.05;
    tail.rotation.y=Math.sin(t*2.1)*.4;tail.rotation.x=Math.sin(t*1.5)*.06;
  }};
}

function mkWolf(B){
  const fur=lam(0xffffff,{map:texWolf()}),grey=lam(0x7d8895),light=lam(0xd3d9df),pale=lam(0xeef1f4),dark=lam(0x1d232b),nose=phg(0x0c0e12,{shininess:120}),inner=lam(0xc9a3a0),eyeM={},body=G(B,[0,0,0]);
  A(body,'sph',fur,[0,18,0],[11.6,12.2,22]);A(body,'sph',fur,[0,18.4,6.8],[12.6,14.4,11.4]);A(body,'sph',fur,[0,17.6,-6.4],[11.4,11.6,11]);
  A(body,'sph',pale,[0,14.4,8.6],[7,6,7]);
  for(let i=0;i<9;i++){const a=i/9*PI*2;A(body,'cone',light,[Math.cos(a)*5.2,19+Math.sin(a)*3,12.5],[3.2,5.6,2.2],[Math.sin(a)*.9-.3,0,-Math.cos(a)*.9])}   /* neck ruff */
  const head=G(body,[0,23.4,15.4]);
  A(head,'sph',fur,[0,0,0],[9.6,9.2,9.8]);
  A(head,'sph',light,[0,-1.8,6.2],[5.2,4.4,8.6]);A(head,'sph',pale,[0,-3.6,5.4],[4.2,2.2,7]);A(head,'sph',grey,[0,.8,5.2],[4.4,3.2,7.4]);
  A(head,'sph',nose,[0,-.5,10.4],[2.6,1.9,1.9]);A(head,'box',dark,[0,-2.8,9.4],[.3,1.8,.3]);
  for(const s of [-1,1]){
    A(head,'cone',grey,[s*3.4,6.2,-1.5],[4,7,2.6],[-.2,0,s*-.22]);A(head,'cone',inner,[s*3.4,5.9,-.7],[2.4,4.8,1.2],[-.2,0,s*-.22]);
    for(let i=0;i<3;i++)A(head,'cone',pale,[s*(4.8+i*.2),-1.4-i*.9,-.4-i*1.1],[2.2,4.2,1.6],[0,s*-1.2,s*-1.5+i*.15]);   /* cheek ruff */
    eye(head,s*3,1.4,4.6,1.2,0xf0a818,eyeM);A(head,'box',dark,[s*3.3,2.7,4.8],[2.6,.45,.7],[0,0,s*.32]);
    for(let i=0;i<3;i++)A(head,'sphL',dark,[s*(1.8+i*.5),-1.3-i*.35,8.9],.5);}
  const tail=G(body,[0,19,-11.5]);
  for(let i=0;i<7;i++){const k=i/6,r=5.2-k*1.4;A(tail,'sph',i>4?pale:(i>2?light:fur),[0,-i*1.3,-i*2.5-1],[r,r*1.05,r*1.7])}
  A(tail,'cone',pale,[0,-9.4,-17],[3.6,5.2,3],[-PI/2-.5,0,0]);
  /* v5_200: legs with KNEES - long front legs with a slight bend, back legs with a clear forward knee and a hock (digitigrade look) */
  const legs=[];
  [[-4.4,7.2,0],[4.4,7.2,0],[-4.6,-7.2,1],[4.6,-7.2,1]].forEach(p=>{const hind=p[2],L=kneeLeg(body,p[0],16,p[1],{
      hind:hind,l1:7,d1:hind?4.9:4.6,d2:hind?4.2:3.95,kr:2,a1:hind?-.55:-.18,a2:hind?.5:.2,mat:grey,low:grey,thMat:fur,th:hind?[4.8,8.4,8.2]:[4.4,7.4,7],thPos:[0,1,0],
      pawS:[4.6,2.8,6.1],pawMat:light,pawZ:.6});
    for(const tx of [-1.2,0,1.2])A(L.foot,'sph',dark,[tx,-.2,2.9],.9);
    legs.push(L)});
  return{fr:15,hh:30,anim(t,mv){
    walk(legs,t,mv,9,.62);
    body.position.y=Math.abs(Math.sin(t*9))*.8*mv+Math.sin(t*1.9)*.2;
    head.rotation.y=Math.sin(t*.7)*.2+Math.sin(t*2.3)*.04;head.rotation.x=Math.sin(t*1.2)*.05-.02;
    tail.rotation.y=Math.sin(t*1.6)*.32;tail.rotation.x=Math.sin(t*1.1)*.06;
  }};
}
const BUILD=[mkChicken,mkDragon,mkFairy,mkPhoenix,mkTiger,mkWolf];

/* ---------------------------------------------------------------- public: make a pet */
function make(sp,c){
  if(!T)throw new Error('PET3D not initialised');
  sp=sp|0;c=c|0;if(sp<0||sp>=BUILD.length)sp=0;if(sp===0)c=0;
  const mats=[];cur=mats;
  try{
    const root=G(null),B=G(root);
    const info=BUILD[sp](B),fx=classFX(root,c,info.fr,info.hh);
    const sh=A(root,'disc',bas(0x000000,{transparent:true,opacity:.28,depthWrite:false}),[0,.15,0],info.fr*.78);
    B.scale.setScalar((info.k||1)*(1+c*.045));
    return{root,sp,c,h:info.hh*(1+c*.045),fr:info.fr,
      anim(t,mv){info.anim(t,mv||0);updFX(fx,t)},
      dispose(){mats.forEach(m=>{try{m.dispose()}catch(e){}})}};
  }finally{cur=null}
}
return{init,make,CLSC};
})();
