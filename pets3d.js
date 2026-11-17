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
    case 'box':g=new T.BoxGeometry(1,1,1);break;
    case 'oct':g=new T.OctahedronGeometry(.5);break;
    case 'wingFairy':{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(3,9,14,19,23,14);s.bezierCurveTo(26,8,15,1,0,0);g=new T.ShapeGeometry(s,14);break}
    case 'wingFairyLo':{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(5,-2,15,-4,17,-11);s.bezierCurveTo(11,-15,3,-8,0,0);g=new T.ShapeGeometry(s,12);break}
    case 'wingDragon':{const s=new T.Shape();s.moveTo(0,0);s.lineTo(9,11);s.lineTo(20,15);s.lineTo(30,19);s.quadraticCurveTo(24,11,26,3);s.quadraticCurveTo(18,5,16,-4);s.quadraticCurveTo(9,1,6,-8);s.quadraticCurveTo(3,-3,0,0);g=new T.ShapeGeometry(s,8);break}
    default:throw new Error('PET3D: unknown geometry '+k);
  }
  return GC[k]=g;
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
  if(o.th)A(g,'sph',o.thMat||o.mat,o.thPos||[0,.6,0],o.th);
  const up=G(g);up.rotation.x=a1;
  A(up,'leg2',o.mat,[0,-l1/2,0],[o.d1,l1,o.d1*.92]);
  const l2=(hy-l1*Math.cos(a1)-pS[1]/2)/Math.cos(a2),k=[0,-l1*Math.cos(a1),-l1*Math.sin(a1)];
  A(g,'sph',o.mat,k,Math.max(.86*o.d1,o.d2)*1.02);                       /* the knee: a smooth joint, hardly wider than the leg (v5_200c: was much fatter) */
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
function texDragon(){return tex('dragon',(g,W)=>{
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#1f7d3a');gr.addColorStop(.5,'#3fb455');gr.addColorStop(.8,'#8fdc7a');gr.addColorStop(1,'#d8f2a0');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  g.lineWidth=1.8;
  for(let row=0;row<16;row++)for(let i=0;i<16;i++){const x=i*W/16+(row%2?W/32:0),y=row*W/16+8;
    g.strokeStyle='rgba(0,50,15,.38)';g.beginPath();g.arc(x,y,W/32+1,.05*PI,.95*PI);g.stroke();
    g.strokeStyle='rgba(220,255,190,.18)';g.beginPath();g.arc(x,y-2,W/32,.15*PI,.85*PI);g.stroke()}
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
function texPhoenix(){return tex('phoenix',(g,W)=>{
  const gr=g.createLinearGradient(0,0,0,W);gr.addColorStop(0,'#a8160a');gr.addColorStop(.45,'#ee4a14');gr.addColorStop(.8,'#ff9a26');gr.addColorStop(1,'#ffd25a');
  g.fillStyle=gr;g.fillRect(0,0,W,W);
  for(let row=0;row<18;row++)for(let i=0;i<14;i++){const x=i*W/14+(row%2?W/28:0),y=row*W/18+6;
    g.strokeStyle='rgba(255,230,120,.30)';g.lineWidth=1.6;g.beginPath();g.arc(x,y,W/30,.1*PI,.9*PI);g.stroke()}
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

function mkDragon(B){
  const skin=lam(0xffffff,{map:texDragon()}),dark=lam(0x2a8a46),belly=lam(0xd9f0a0),gold=lam(0xffb347,{emissive:0x3a1c00}),ivory=phg(0xf6ebc0,{shininess:60}),
    mem=lam(0x2f9d7a,{side:T.DoubleSide,transparent:true,opacity:.9,emissive:0x082a1c}),bn=lam(0x1f7a3c),eyeM={};
  const body=G(B,[0,0,0]);
  A(body,'sph',skin,[0,13.2,0],[13,12,20]);
  for(let i=0;i<7;i++)A(body,'sph',belly,[0,8.4,-7+i*2.4],[8.4,2.8,2.8]);      /* belly plates */
  A(body,'sph',skin,[0,16.5,8],[9,9.5,9]);A(body,'sph',skin,[0,19.8,10.8],[7.6,8.4,7.6]);   /* neck */
  const head=G(body,[0,23,13]);
  A(head,'sph',skin,[0,0,0],[10,9,10.4]);
  A(head,'sph',skin,[0,-1.5,6.2],[6.6,5.2,7.4]);                              /* snout */
  A(head,'sph',belly,[0,-3.4,5.6],[5.4,2.2,6.2]);                             /* jaw */
  A(head,'sph',phg(0x103a1c),[-1.7,-.6,9.6],[1,.8,.8]);A(head,'sph',phg(0x103a1c),[1.7,-.6,9.6],[1,.8,.8]);   /* nostrils */
  A(head,'cone',ivory,[-1.8,-2.6,8.6],[.9,1.6,.9],[PI,0,0]);A(head,'cone',ivory,[1.8,-2.6,8.6],[.9,1.6,.9],[PI,0,0]); /* fangs */
  for(const s of [-1,1]){
    A(head,'cone',ivory,[s*3.2,4.6,-2.2],[2.6,6.2,2.6],[-.95,0,s*.35]);A(head,'cone',ivory,[s*4.4,6.8,-6],[1.6,4.6,1.6],[-1.35,0,s*.3]);  /* horns */
    feather(head,mem,7,3.6,.6,[s*4.6,-.4,-2.4],Math.atan2(s*.6,-.8),0);                                                          /* cheek frills */
    A(head,'sph',skin,[s*3.5,2.6,3.6],[3.4,1.7,2.4],[0,0,s*-.3]);                                                                /* brow */
    const iz=3.9;A(head,'sph',phg(0xffc21a,{shininess:120,emissive:0x5a3a00}),[s*4,1.1,iz],3.1);
    A(head,'sph',phg(0x120808,{shininess:120}),[s*4.2,1.1,iz+1.1],[.8,2.6,.8]);A(head,'sphL',bas(0xffffff),[s*4.4,2,iz+1.5],.9);}
  const mouth=A(head,'sph',glow(0xff8a2a,.5),[0,-2,9.4],[2.4,2.4,2.4]);
  [[0,22.8,8.8],[0,21,6.4],[0,19.9,3.2],[0,19.5,-.4],[0,19.1,-4],[0,17.7,-7.4],[0,15.8,-11],[0,14.4,-14.5]].forEach((p,i)=>{const k=i/7;A(body,'cone',gold,p,[2.4-k*1,4.8-k*1.9,2.4-k*1],[-.45-k*.1,0,0])});   /* back spines */
  const tail=G(body,[0,12,-9.5]);
  for(let i=0;i<8;i++){const k=i/7;A(tail,'sph',i%2?dark:skin,[0,-k*1.2+Math.sin(k*2.4)*1.4,-i*2.8],[7*(1-k*.78),6.4*(1-k*.78),6.5*(1-k*.7)])}
  A(tail,'sph',gold,[0,-.6,-22.4],[3.6,.9,5.6],[0,0,0]);A(tail,'cone',gold,[0,-.6,-25.8],[3.6,4.4,.9],[-PI/2,0,0]);
  const wings=[];
  for(const s of [-1,1]){
    const w=G(body,[s*5,17.5,1.5]);w.scale.set(s*.58,.58,.58);w.rotation.y=s*.25;
    A(w,'wingDragon',mem,[0,0,0]);
    [[[0,0],[9,11]],[[9,11],[20,15]],[[20,15],[30,19]],[[20,15],[26,3]],[[20,15],[16,-4]],[[20,15],[6,-8]]].forEach((b,i)=>bone(w,b[0],b[1],i<2?1.3:.8,bn));
    wings.push(w);
  }
  /* v5_200: the hips used to sit OUTSIDE the body ellipsoid, so the legs floated beside it. Now each hip is inside the flank, with a big thigh / shoulder mass buried in the body, then upper leg, knee, lower leg, paw. */
  const legs=[];
  [[-4.2,7.2,0],[4.2,7.2,0],[-4.2,-6.6,1],[4.2,-6.6,1]].forEach(p=>{const hind=p[2],L=kneeLeg(body,p[0],10.6,p[1],{
      hind:hind,l1:4.4,d1:6.2,d2:5.3,kr:2,a1:hind?-.5:-.2,a2:hind?.62:.25,mat:skin,low:dark,
      th:hind?[5.4,6.6,7.2]:[5,6,6.4],thPos:[0,-.2,0],pawS:[5.8,3.2,7.2],pawMat:skin,pawZ:1});
    for(const tx of [-1.8,0,1.8])A(L.foot,'cone',ivory,[tx,-.3,4.7],[1.1,2.6,1.1],[PI/2,0,0]);
    legs.push(L)});
  return{fr:15,hh:30,anim(t,mv){
    const flap=Math.sin(t*(2.2+mv*5))*(.16+mv*.22);
    wings[0].rotation.z=-.15-flap;wings[1].rotation.z=.15+flap;
    head.rotation.y=Math.sin(t*.8)*.18;head.rotation.x=Math.sin(t*1.3)*.05;
    tail.rotation.y=Math.sin(t*1.9)*.28;tail.rotation.x=Math.sin(t*1.2)*.05;
    walk(legs,t,mv,8,.6);
    body.position.y=Math.abs(Math.sin(t*8))*1.2*mv+Math.sin(t*2)*.25;
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

function mkPhoenix(B){
  const skin=lam(0xffffff,{map:texPhoenix(),emissive:0x2a0800}),gold=phg(0xffc83a,{shininess:80,emissive:0x4a2a00}),eyeM={},aura=fsp(0xff7a22,.3,'soft'),ember=fsp(0xffb040,.9,'soft');
  const fcol=[0xb81408,0xd9300e,0xee5a14,0xff8a1e,0xffb02e,0xffd24a],fm=fcol.map(c=>lam(c,{emissive:0x7a2a00,side:T.DoubleSide})),
    fireO=fsp(0xff3a08,.5),fireM=fsp(0xff8a1c,.55),fireC=fsp(0xffd666,.6),flm=[],wfl=[],tng=[],
    eg1=bas(0xff9a28,{side:T.DoubleSide}),eg2=bas(0xffd860,{side:T.DoubleSide}),halo=glow(0xff8a1c,.2); /* v5_200h edge glow = flame colours (orange / yellow), unlit so they glow */ /* v5_200 fire layers: outer red-orange, middle orange, hot yellow core */
  const body=G(B,[0,9,0]);
  SP(body,aura,[0,15,-3],54,50);   /* soft halo, no hard edge */
  A(body,'sph',skin,[0,15,0],[11,12.4,18],[-.35,0,0]);
  A(body,'sph',lam(0xffb23a,{emissive:0x3a1e00}),[0,15,6],[9,10,9]);
  A(body,'sph',skin,[0,21,8.4],[6.4,8,6.6],[-.4,0,0]);
  const head=G(body,[0,25,10.4]);
  A(head,'sph',skin,[0,0,0],[7.6,7.4,8.2]);
  A(head,'cone',gold,[0,-.8,6],[3.2,5.8,2.4],[PI/2,0,0]);A(head,'cone',gold,[0,-1.9,5],[2.6,4,1.6],[PI/2,0,0]);
  for(const s of [-1,1]){eye(head,s*2.9,.7,2.9,1.15,0xffb02e,eyeM);SP(head,fsp(0xffe080,.5,'soft'),[s*3.8,-1.2,2.2],4.4,4.4)}
  const crest=G(head,[0,3.2,-1.2]);
  for(let i=0;i<5;i++){const k=i/4;feather(crest,fm[4-Math.round(k*2)],10-Math.abs(k-.5)*5,1.7,.7,[(k-.5)*2.6,0,0],PI+(k-.5)*.6,.55)}
  /* v5_200g ONE merged flame instead of separate tongues: many wide flames of random size / offset that overlap heavily, over a soft base glow, so the outline is ragged and joined */
  const R=rng(91),fo2=fsp(0xff3a08,.3),fm2=fsp(0xff8a1c,.34),fc2=fsp(0xffd666,.4),fsoft=fsp(0xff6a14,.3,'soft');
  const mass=(par,cx,cy,cz,sx,sz,n,w,h,arr)=>{
    SP(par,fsoft,[cx,cy+h*.2,cz],sx*2+w*1.2+sz,h*.95);
    for(let i=0;i<n;i++){const u=(i+.5)/n,e=Math.abs(u-.5)*2,hh=h*(.55+.6*R())*(1-e*e*.55),ww=w*(.8+.5*R()),m=SP(par,[fo2,fm2,fm2,fc2][(R()*4)|0],[cx+(R()-.5)*sx,cy,cz+(u-.5)*sz],ww,hh,1);arr.push({m:m,sx:ww,sy:hh,ph:R()*6.28})}};
  mass(crest,0,2.2,-.6,2.4,2.4,5,5.5,12,tng);
  const wings=[];
  for(const s of [-1,1]){
    const w=G(body,[s*5.2,17.5,1.5]);w.scale.x=s;
    const tp=[];
    for(let i=0;i<8;i++){const a=-.15+i*.23,yaw=Math.atan2(Math.cos(a),-Math.sin(a)),L=24-Math.abs(i-1.5)*1.7,mi=Math.min(5,1+((i*5/7)|0)),fg=feather(w,fm[mi],L,5.2,1,[0,0,0],yaw,0);
      barbs(fg,eg1,L,5.2,.3,.82,LITE?2:4,L*.24,.5);                                                     /* glowing barbs along both edges */
      for(const sd of [-1,1])A(fg,'cone',eg2,[sd*.5,0,L*.92],[1.1,L*.18,.5],[PI/2,0,-sd*.4]);          /* glowing forked tip */
      if(!LITE)A(fg,'cone',halo,[0,0,L*.5],[5.2*1.55,L*1.04,1.2],[PI/2,0,0]);                         /* soft feather-shaped glow around the whole feather */
      tp.push([Math.sin(yaw)*L,Math.cos(yaw)*L])}
    for(let i=0;i<6;i++){const a=.05+i*.26,yaw=Math.atan2(Math.cos(a),-Math.sin(a)),L=12-Math.abs(i-2)*.8,mi=Math.min(5,2+((i*3/5)|0)),fg=feather(w,fm[mi],L,4.6,.9,[0,.9,.4],yaw,0);
      barbs(fg,eg1,L,4.6,.4,.78,LITE?1:2,L*.26,.45);if(!LITE)A(fg,'cone',halo,[0,0,L*.5],[4.6*1.55,L*1.04,1.1],[PI/2,0,0])}
    /* v5_200h the wing fire starts in the MIDDLE of the wing and stays concentrated there (no flames at the feather edges); the edges only glow in the flame colours */
    {let ax=0,az=0;tp.forEach(q=>{ax+=q[0]/tp.length;az+=q[1]/tp.length});
     mass(w,ax*.24,.2,az*.24,2.6,5,LITE?5:7,9.5,16,wfl);mass(w,ax*.5,.2,az*.5,2.2,4,LITE?3:5,7.5,12,wfl)}
    wings.push(w)}
  /* v5_200 LONG FIERY TAIL: 9 plumes (7 on low quality), each a chain of 6 tapering segments (about 4x the old length) that droop, wave along their length and burn with
     additive flame layers. Plumes 0..NT-1 fan out behind the body. */
  const tail=G(body,[0,12,-9]),tf=[],flames=[],NT=LITE?7:9,NS=LITE?5:6,MID=(NT-1)/2;
  for(let i=0;i<NT;i++){
    const k=(i-MID)/MID,L0=(15.5-Math.abs(k)*5)+(i===MID?2:0),root=G(tail,[k*1.6,0,0]);
    root.rotation.order='YXZ';root.rotation.set(-.2+Math.abs(k)*.1,PI+k*.46,0);
    const mi=Math.min(5,i<2||i>NT-3?1:(i===MID?5:(Math.abs(k)>.5?2:3))),mat=fm[mi];let par=root;const segs=[];
    for(let j=0;j<NS;j++){
      const sg=G(par,[0,0,j?L0*.6:0]);sg.rotation.x=j?.08:0;
      const w=Math.max(1.5,(5.4-j*.78)*(1-Math.abs(k)*.1));
      A(sg,'cone',mat,[0,0,L0*.5],[w,L0,.9],[PI/2,0,0]);
      if(j>0)barbs(sg,eg1,L0,w,.28,.74,LITE?1:2,L0*.42,.45,.7);                                     /* glowing edge barbs on every tail segment */
      if(!LITE)A(sg,'cone',halo,[0,0,L0*.5],[w*1.5,L0*1.03,1.2],[PI/2,0,0]);                         /* soft glow around each segment */
      if(j===NS-1){A(sg,'cone',eg2,[0,0,L0*.96],[w*.55,L0*.62,.6],[PI/2,0,0]);for(const sd of [-1,1])A(sg,'cone',eg1,[sd*.6,0,L0*.7],[.9,L0*.4,.45],[PI/2,0,-sd*.5])}   /* long glowing tip with a fork */
      if(j>0&&Math.abs(k)<.55&&(!LITE||j%2===1)){   /* flames only on the centre plumes: the tail burns in the middle, the outer plumes just glow */
        const sx=w*2.8+4,sy=L0*.85+w*1.5;
        flames.push({m:SP(sg,j%2?fireM:fireO,[0,.5,L0*.5],sx,sy,1),sx:sx,sy:sy,i:i,j:j});
        if(j%2===0&&Math.abs(k)<.6){const cx=sx*.5,cy=sy*.55;flames.push({m:SP(sg,fireC,[0,.5,L0*.5],cx,cy,1),sx:cx,sy:cy,i:i,j:j+3})}
      }
      par=sg;segs.push(sg);
    }
    tf.push(segs);
  }
  const tem=[];for(let i=0;i<(LITE?10:18);i++)tem.push(SP(tail,i%3?fireM:fireC,[0,0,0],4,4));   /* sparks drifting off the tail */
  for(const s of [-1,1]){const g=G(body,[s*3.2,7.2,2.4]);A(g,'cyl',gold,[0,-1.4,0],[1.3,6.4,1.3]);
    for(const tx of [-1.3,0,1.3])A(g,'cone',gold,[tx,-4.6,1.6],[1,3.2,1],[PI/2,0,tx*.2])}
  mass(body,0,23.2,0,2.4,9,12,11,18,tng);mass(body,0,24,-1,1.4,4,4,6.5,25,tng);   /* one big flame along the back, with a few tall licks in it */
  const em=[];for(let i=0;i<12;i++)em.push(SP(B,ember,[0,0,0],3,3));
  return{fr:19,hh:36,k:.78,anim(t,mv){
    const f=Math.sin(t*(6+mv*3))*.5,lift=Math.sin(t*6.6+.5);
    wings[0].rotation.z=-.1-f;wings[1].rotation.z=.1+f;
    body.position.y=9+Math.sin(t*3.3)*1.7+mv*1.2+lift*.5;body.rotation.x=-.06*mv;
    head.rotation.y=Math.sin(t*1.1)*.22;head.rotation.x=Math.sin(t*1.9)*.05;
    tail.rotation.y=Math.sin(t*1.7)*.18;tail.rotation.x=Math.sin(t*2.4)*.05+(f>0?.04:0);
    tf.forEach((segs,i)=>segs.forEach((sg,j)=>{if(j){sg.rotation.x=.08+Math.sin(t*2.6-j*.8+i*.35)*.07+mv*.05;sg.rotation.y=Math.sin(t*1.9-j*.7+i*.5)*.09}}));
    flames.forEach(f=>{const q=1+Math.sin(t*9+f.j*1.3+f.i*2.1)*.17+Math.sin(t*17+f.i*3+f.j)*.08;f.m.scale.set(f.sx*(1+(q-1)*.5),f.sy*q,1)});
    wfl.forEach(f=>{const q=1+Math.sin(t*10+f.ph)*.2+Math.sin(t*19+f.ph*2)*.1;f.m.scale.set(f.sx*(1-(q-1)*.3),f.sy*q,1)});
    tng.forEach(f=>{const q=1+Math.sin(t*11+f.ph)*.18+Math.sin(t*23+f.ph*3)*.1;f.m.scale.set(f.sx*(1-(q-1)*.4),f.sy*q,1)});
    tem.forEach((q,i)=>{const u=((t*.32+i/tem.length)%1),a=i*2.4+t*2;q.position.set(Math.sin(a)*(1.5+u*5),2+u*9+Math.sin(a*1.3)*1.2,-4-u*50);q.scale.setScalar((2.4*(1-u*.85)+.2)*2.6)});
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
