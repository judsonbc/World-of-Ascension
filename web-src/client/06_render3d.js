/* ---------- 3D renderer (Three.js): same game state, new view; every world gets its own terrain, props and sky ---------- */
let MODE3D=true;try{MODE3D=localStorage.getItem('al3d')!=='0'}catch(e){}
const PRS=[1,1.15,1.3,1.5]; /* phone render scale steps (was a fixed 0.85); auto-lowered if the phone cannot hold ~45 fps */
const prWant=()=>LOW?Math.min(PRS[T3.lv],Math.max(1,window.devicePixelRatio||1))*(PQ.lock&&PQ.rs?PQ.rs:1):T3.pr0; /* very low: render at 0.5x resolution */
const T3={r:null,fr:0,zoom:1,mp:new Map(),rp:new Map(),it:new Map(),or:new Map(),pj:new Map(),built:-1,cc:{}};let G3,hfn=()=>0;
const WMAP=[['hills',40,.0017],['mesas',60,.0013],['ridged',55,.0021],['spires',90,.0011],['isles',50,.0012],['isles',60,.0019],['hills',55,.0015],['spires',100,.0013],['crater',70,.0014],['dunes',45,.0018],['mesas',70,.0017],['ridged',80,.0013]];
const KITS=[[['Cone',1,3.2,1,1.6,0],['Dodeca',1.2,.8,1.2,.4,2],['Sphere',.9,.6,.9,.3,1]],[['Octa',.8,3,.8,1.5,1],['Octa',1.2,1,1.2,.5,0],['Dodeca',.6,.5,.6,.2,3]],[['Box',.8,3.4,.8,1.7,2],['Box',1.4,.7,1.4,.35,3],['Cyl',.5,1.2,.5,.6,0]],[['Cyl',.35,1.8,.35,.9,3],['Sphere',1.4,.9,1.4,1.6,0],['Sphere',.7,.5,.7,.25,1]],[['Cone',.5,3.8,.5,1.9,0],['Cyl',.45,2.2,.45,1.1,1],['Dodeca',1,.6,1,.3,2]]];
const KOF=[0,2,4,1,3,3,0,1,4,2,3,1];
/* v5_107 gh3 = the height of the DRAWN terrain mesh (triangle interpolation of its vertex grid), not the smooth height function. The mesh cells are 90-200 units wide, so on
   narrow hills the true function and the mesh disagreed and a character / monster could sink into the hill (and be hidden). Same triangles as THREE.PlaneGeometry. */
const gh3=(x,y)=>{const g=T3.hg;if(!g)return hfn(x-C,y-C);
  const u=(x-C+g.S)/g.c,v=(y-C+g.S)/g.c,N=g.N;let ix=Math.floor(u),iz=Math.floor(v);
  if(ix<0)ix=0;else if(ix>N-1)ix=N-1;if(iz<0)iz=0;else if(iz>N-1)iz=N-1;
  let fx=u-ix,fz=v-iz;if(fx<0)fx=0;else if(fx>1)fx=1;if(fz<0)fz=0;else if(fz>1)fz=1;
  const W1=N+1,H=g.h,ha=H[iz*W1+ix],hb=H[(iz+1)*W1+ix],hc=H[(iz+1)*W1+ix+1],hd=H[iz*W1+ix+1];
  return fx+fz<=1?ha+fx*(hd-ha)+fz*(hb-ha):hc+(1-fx)*(hb-hc)+(1-fz)*(hd-hc)};
const tIx=i=>i===0?11:i<=11?i-1:i; /* keeps each world's terrain look from before the Arena moved to World 0 */
function mkH(i){const [t,a,sc]=WMAP[tIx(i)%12],ph=tIx(i)*1.37;
  return (x,z)=>{const u=x*sc+ph,v=z*sc*1.1+ph*1.7,n=Math.sin(u)*Math.cos(v*1.3)+.5*Math.sin(u*2.3+v*1.9)+.25*Math.sin(v*4.1-u*3.3);let h;
    if(t==='hills')h=a*n*.5;else if(t==='dunes')h=a*(1-Math.abs(Math.sin(u*1.2+v*.6+n*.5)))*1.2-a*.4;
    else if(t==='mesas'){const q=n*1.6,f=Math.floor(q),tt=Math.min(1,Math.max(0,(q-f-.25)/.5));h=a*(f+tt*tt*(3-2*tt)+.0)*.45;} /* v5_184 terraces with sloped (not vertical) steps */else if(t==='crater')h=Math.abs(n)<.35?-a:a*.3*n;
    else if(t==='spires'){const ns=Math.sin(u)*Math.cos(v*1.3)+.35*Math.sin(u*1.7+v*1.3),m=Math.max(0,ns);h=a*m*m*1.4;} /* v5_184 broad rounded mountains: was a*n^3*1.6 (needle-thin, slopes up to 4+, peaks ~800); now peaks ~230-250 with slopes under ~0.5 (the fine-detail terms are dropped so there are no spikes) */
    else if(t==='isles')h=n>.25?a*.4*n:-a*.5;else h=a*(1-Math.abs(n));
    /* v5_108 EXTRA HILLS AND VALLEYS on every world: broad rolling relief (wavelength ~9000 units, +-75) plus medium hills and hollows (~2800 units, +-32) on top of the world's own terrain */
    const bx=x*.0007+ph*2.1,bz=z*.00077+ph*.8,mx=x*.0023+ph*3.3,mz=z*.0021+ph*1.1;
    h+=75*(Math.sin(bx)*Math.cos(bz*1.2)+.45*Math.sin(bx*2.1+bz*1.7))/1.45+32*(Math.sin(mx*1.1+Math.cos(mz))*Math.cos(mz*.9-Math.sin(mx*.7)));
    const d=Math.hypot(x,z),f=Math.min(1,Math.max(0,(d-TOWN)/220));return h*f*f*(3-2*f)}}
function init3(){
  const r=new THREE.WebGLRenderer({canvas:$('g3'),antialias:LOW&&PQ.lock?PQ.aa:true,stencil:false,powerPreference:'high-performance'});T3.lv=LOW&&PQ.lock?PQ.lv:PRS.length-1;T3.pr0=Math.min(window.devicePixelRatio||1,2);r.setPixelRatio(prWant());T3.cpr=prWant();
  T3.r=r;T3.sc=new THREE.Scene();T3.sc.matrixAutoUpdate=false;T3.frus=new THREE.Frustum();T3.pm=new THREE.Matrix4();T3.sph=new THREE.Sphere();T3.skyC=new THREE.Color();T3.skyB=new THREE.Color('#8fa6b8');T3.cam=new THREE.PerspectiveCamera(50,1,10,9000);T3.v=new THREE.Vector3();
  T3.amb=new THREE.AmbientLight(0xffffff,.7*LK);T3.sun=new THREE.DirectionalLight(0xffffff,.8*LK);T3.sun.position.set(300,700,250);
  T3.sc.add(T3.amb,T3.sun);T3.sc.fog=new THREE.FogExp2(0x000000,.0007);
  G3={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,8),cone:new THREE.ConeGeometry(.5,1,7),sph:new THREE.SphereGeometry(.5,10,8),dod:new THREE.DodecahedronGeometry(.5),oct:new THREE.OctahedronGeometry(.5),tor:new THREE.TorusGeometry(.8,.08,6,18),ring:new THREE.RingGeometry(.9,1,40).rotateX(-Math.PI/2)};
  AL3D.init(THREE,LOW);T3.rig=AL3D.makePlayer(SKW());T3.pl=T3.rig.root;T3.sc.add(T3.pl);
  const bm=()=>new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide});
  T3.rings=[];for(let i=0;i<40;i++){const m=new THREE.Mesh(G3.ring,bm());m.visible=false;T3.sc.add(m);T3.rings.push(m)}
  T3.dest=new THREE.Mesh(G3.ring,bm());T3.dest.material.color.set('#8fffd0');T3.dest.visible=false;T3.sc.add(T3.dest);
  T3.sel=new THREE.Mesh(G3.ring,bm());T3.sel.material.color.set('#e3b559');T3.sc.add(T3.sel);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3600),3));geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(3600),3));
  T3.pp=new THREE.Points(geo,new THREE.PointsMaterial({size:13,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,map:T3.dotTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(24,24,2,32,32,31);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.55,'rgba(255,255,255,.95)');r.addColorStop(.85,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t})()}) /* v5_183 round, softly shaded sprite instead of the default square point */);T3.pp.frustumCulled=false;T3.sc.add(T3.pp);
}
function rebuild3(){
  T3.hg=null;
  if(T3.world){T3.sc.remove(T3.world);T3.world.traverse(o=>{if(o.geometry&&o.geometry.dispose&&!Object.values(G3).includes(o.geometry))o.geometry.dispose()})}
  const wg=new THREE.Group(),i=curWorld,w=W[i];hfn=mkH(i);T3.world=wg;
  const S=RIM+120,N=LOW?(PQ.lock?PQ.terr:150):360,geo=new THREE.PlaneGeometry(S*2,S*2,N,N).rotateX(-Math.PI/2),pos=geo.attributes.position,col=new Float32Array(pos.count*3),zc=ZONES.map(z=>new THREE.Color(z.fill)),tc=new THREE.Color();
  const rockC=new THREE.Color('#9d9b94'),soilC=new THREE.Color('#9a7650'),dryC=new THREE.Color('#b9a074');
  for(let k=0;k<pos.count;k++){const x=pos.getX(k),z=pos.getZ(k),d=Math.hypot(x,z);let h=hfn(x,z);if(d>RIM+40)h=-70;pos.setY(k,h);
    let c=zc[zc.length-1];for(let q=0;q<ZONES.length;q++)if(d<=ZONES[q].d){c=zc[q];break}
    tc.copy(c).multiplyScalar(Math.max(.4,.85+h*.004+Math.sin(x*.05)*Math.cos(z*.05)*.05)*1.7);
    if(d>TOWN+60&&d<=RIM+40){ /* v5_167 terrain mix: steep slopes turn to bare rock, flat noisy patches to soil, a few dry-grass patches; partial blends keep each world's own colour */
      const sx=(hfn(x+45,z)-h)/45,sz=(hfn(x,z+45)-h)/45,sl=Math.hypot(sx,sz),n2=Math.sin(x*.0113+1.3)*Math.cos(z*.0131)+.5*Math.sin(x*.0311-z*.0273+.7),rk=clamp((sl-.22)/.4,0,1);
      tc.lerp(rockC,rk*.62);tc.lerp(soilC,clamp((n2-.45)/.5,0,1)*.5*(1-rk));tc.lerp(dryC,clamp((-n2-.8)/.5,0,1)*.28)}
    if(d<TOWN)tc.set('#6b6a58');if(d>RIM+40)tc.set('#05070a');
    col[k*3]=tc.r;col[k*3+1]=tc.g;col[k*3+2]=tc.b}
  {const hh=new Float32Array(pos.count);for(let k=0;k<pos.count;k++)hh[k]=pos.getY(k);T3.hg={S,N,c:2*S/N,h:hh}}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
  {const mk=cv=>{const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;try{t.anisotropy=Math.min(LOW?2:8,T3.r.capabilities.getMaxAnisotropy())}catch(e){}return t};
   if(!T3.gt)T3.gt=mk(groundTile());if(!T3.pz)T3.pz=mk(plazaTile());
   T3.gt.repeat.set(2*S/380,2*S/380); /* one ground tile = 380 world units */
   wg.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,map:T3.gt})));
   T3.pz.repeat.set(1,1);
   const pg=new THREE.CircleGeometry(TOWN-1,72).rotateX(-Math.PI/2),pu=pg.attributes.uv,pp=pg.attributes.position;for(let k=0;k<pu.count;k++)pu.setXY(k,pp.getX(k)/150,pp.getZ(k)/150); /* cobble = 150 world units */
   const pl=new THREE.Mesh(pg,new THREE.MeshLambertMaterial({color:'#b7b3a3',map:T3.pz,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
   pl.position.y=.7;wg.add(pl)} /* v5_167 cobblestone plaza */
  if(WMAP[i%12][0]==='isles'){const wt=new THREE.Mesh(new THREE.CircleGeometry(RIM+40,160).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x2a6f9a,transparent:true,opacity:.75}));wt.position.y=-8;wg.add(wt)}
  T3.hub=AL3D.buildHub(w.acc,TOWN/1.5);T3.hub.scale.set(1.5,1.5,1.5);wg.add(T3.hub);
  if(i===ARENA){const bg=new THREE.BoxGeometry(12,70,12),bm=new THREE.MeshBasicMaterial({color:0xff5a4a});for(let k=0;k<96;k++){const a=k/96*6.2832,x=Math.cos(a)*(RIM+10),z=Math.sin(a)*(RIM+10),pl=new THREE.Mesh(bg,bm);pl.position.set(x,hfn(x,z)+30,z);wg.add(pl)}}
  const dp=w.dp||['#16241d','#1c2f25','#4d5258','#5d636a'],kp=AL3D.kit(KOF[tIx(i)%12],dp,w.acc),dm=new THREE.MeshLambertMaterial({vertexColors:true});
  for(let k=0;k<3;k++){const list=deco.filter((d,ix)=>d.k===k&&(!LOW||ix%3===0)),im=new THREE.InstancedMesh(kp[k],dm,list.length),du=new THREE.Object3D(),c=new THREE.Color();
    list.forEach((d,n)=>{const q=d.s*28;du.position.set(d.x-C,gh3(d.x,d.y)-q*.05,d.y-C);du.scale.set(q,q,q);du.rotation.y=n;du.updateMatrix();im.setMatrixAt(n,du.matrix);c.setScalar(.8+((n*37)%10)/22);im.setColorAt(n,c)});
    im.frustumCulled=false;wg.add(im)}
  if(bld.length){ /* v5_172 buildings: every part is an instance of one of 9 shared shapes -> 9 draw calls for the whole building layer */
    const wcol=g=>{g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));return g},
      prism=()=>{const v=[],p=(a,b,c)=>v.push(...a,...b,...c),A=[-.5,0,-.5],B=[-.5,0,.5],Cc=[-.5,1,0],D=[.5,0,-.5],E=[.5,0,.5],F=[.5,1,0];
        p(A,Cc,B);p(D,E,F);p(A,D,F);p(A,F,Cc);p(B,Cc,F);p(B,F,E);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(v),3));g.computeVertexNormals();return g},
      GE={b:new THREE.BoxGeometry(1,1,1).translate(0,.5,0),p:new THREE.ConeGeometry(.5,1,4).rotateY(Math.PI/4).scale(1.4142,1,1.4142).translate(0,.5,0),y:new THREE.CylinderGeometry(.5,.5,1,14).translate(0,.5,0),
        c:new THREE.ConeGeometry(.5,1,14).translate(0,.5,0),d:new THREE.SphereGeometry(.5,14,8,0,Math.PI*2,0,Math.PI/2).scale(1,2,1),g:prism(),o:new THREE.OctahedronGeometry(.5).translate(0,.5,0),
        f:new THREE.CylinderGeometry(.35,.5,1,4).rotateY(Math.PI/4).scale(1.4142,1,1.4142).translate(0,.5,0),h:new THREE.CylinderGeometry(.34,.5,1,14).translate(0,.5,0)},
      PA={},bl=[];for(const k in GE)PA[k]=[];
    const STONE='#76706a',DARKC='#1d150f',LITC='#ffd78a';
    bld.forEach((b,idx)=>{
      const hw=b.hw,hh=b.hh,wh=b.wh,k=b.k,rd=b.rd,W=hw*2,D=hh*2,fx=b.fx,fy=b.fy,hr=q=>{const t=Math.sin(b.sd*12.9898+q*78.233)*43758.5453;return t-Math.floor(t)};
      let by=-1e9;const pts=rd?[[0,0],[1,0],[-1,0],[0,1],[0,-1]]:[[-1,-1],[1,-1],[-1,1],[1,1],[0,0]];let bmin=1e9;for(const[dx,dy]of pts){const gy2=gh3(b.x+dx*hw,b.y+dy*hh);by=Math.max(by,gy2);bmin=Math.min(bmin,gy2)}const fd=Math.max(41,Math.min(220,by-bmin+16)); /* v5_184 foundation reaches down to the lowest corner */
      const X=b.x-C,Z=b.y-C,out=[],A=(g,ox,oy,oz,sx,sy,sz,c,ry)=>out.push([g,ox,oy,oz,sx,sy,sz,c,ry||0]);
      /* a flat panel on the front face (door / window): t = offset along the face */
      const F=(t,oy,w,h,c)=>{if(fx)A('b',fx*(hw+.8),oy,t,3,h,w,c);else A('b',t,oy,fy*(hh+.8),w,h,3,c)};
      const door=(w,h)=>F(0,0,w||26,h||40,DARKC),wins=(oy,n,c)=>{for(let q=0;q<n;q++)F((q-(n-1)/2)*((fx?hh:hw)*1.1/Math.max(1,n-1+.4)),oy,11,13,c||LITC)};
      const found=()=>{if(k!==14)rd?A('y',0,1-fd,0,W+6,fd,D+6,STONE):A('b',0,1-fd,0,W+6,fd,D+6,STONE)};
      const bands=(w,d,h,y0,gap,c,rnd)=>{for(let y=y0;y<y0+h-14;y+=gap)rnd?A('y',0,y,0,w+3,8,d+3,c):A('b',0,y,0,w+3,8,d+3,c)};
      found();
      if(k===0){
        const v=b.v;
        if(v===2){A('b',0,0,0,W,wh*.85,D,b.wc);A('b',0,wh*.85,0,W+8,8,D+8,b.tc);A('b',-hw*.3,wh*.85+8,hh*.2,hw*.9,24,hh*.9,b.wc);A('b',-hw*.3,wh*.85+32,hh*.2,hw*.9+6,5,hh*.9+6,b.rc)}
        else if(v===1){A('b',0,0,0,W,wh,D,b.wc);const al=hw>=hh;A('g',0,wh,0,al?W*1.12:D*1.12,wh*.72,al?D*1.25:W*1.25,b.rc,al?0:Math.PI/2)}
        else if(v===3){A('b',0,0,0,W,wh,D,b.wc);A('b',0,wh*.5,0,W+4,6,D+4,b.tc);A('p',0,wh,0,W*1.2,wh*.8,D*1.2,b.rc)}
        else{A('b',0,0,0,W,wh,D,b.wc);A('p',0,wh,0,W*1.22,wh*.75,D*1.22,b.rc)}
        door();wins(wh*.55,hw>=60?2:1);if(v===3)wins(wh*.9,2);
        if(v!==2)A('b',hw*.45,wh+wh*.35,-hh*.2,14,36,14,'#4a4440')
      }else if(k===1||k===12){
        const al=hw>=hh;
        A('b',0,0,0,W,wh,D,b.wc);
        A('g',0,wh,0,al?W*1.1:D*1.1,wh*(k===1?.62:.95),al?D*1.2:W*1.2,b.rc,al?0:Math.PI/2);
        if(k===1){A('b',0,wh*.55,0,W+6,6,D+6,b.tc);for(const q of[-1.4,-.47,.47,1.4])A('y',fx?fx*(hw+14):q*hw*.55,0,fx?q*hh*.55:fy*(hh+14),12,wh,12,b.tc);
          A('c',al?-hw*.98:0,wh+wh*.5,al?0:-hh*.98,12,22,12,b.ac);A('c',al?hw*.98:0,wh+wh*.5,al?0:hh*.98,12,22,12,b.ac)}
        else{A('c',al?-hw*1.05:0,wh*1.5,al?0:-hh*1.05,10,26,10,b.ac);A('c',al?hw*1.05:0,wh*1.5,al?0:hh*1.05,10,26,10,b.ac)}
        door(34,46);wins(wh*.6,4)
      }else if(k===2){
        A('b',0,0,0,W,wh,D,b.wc);A('b',0,wh,0,W+10,8,D+10,b.rc);
        for(const sx of[-1,1])for(const sz of[-1,1])A('b',sx*(hw+1),wh+8,sz*(hh+1),12,12,12,b.wc);
        door(22,34);F(0,wh*.62,8,16,DARKC)
      }else if(k===3){
        const n=b.n,w0=W;A('b',0,0,0,w0*1.1,12,w0*1.1,STONE);let y=12;
        for(let t=0;t<n;t++){const wi=w0*(1-.15*t);A('b',0,y,0,wi*.74,40,wi*.74,b.wc);A('b',0,y+30,0,wi*.78,6,wi*.78,b.ac);A('p',0,y+38,0,wi*1.18,26,wi*1.18,b.rc);y+=48}
        A('y',0,y+10,0,6,46,6,b.ac);A('c',0,y+50,0,16,22,16,b.ac);door(28,42);F(0,40,12,16,LITC)
      }else if(k===4){
        const v=b.v,gl=b.gc;
        if(v===0){const sec=[[1,.52],[.74,.3],[.5,.18]];let y=0;const body=wh-70;
          for(const[f,h]of sec){const hh2=h*body;A('b',0,y,0,W*f,hh2,D*f,b.wc);for(let q=y+14;q<y+hh2-12;q+=26)A('b',0,q,0,W*f+3,8,D*f+3,gl);A('b',0,y+hh2,0,W*f+8,6,D*f+8,b.tc);y+=hh2}
          A('y',0,y,0,5,70,5,STONE);A('c',0,y+66,0,9,10,9,'#ff4a3a')}
        else if(v===1){A('b',0,0,0,W,wh,D,b.wc);for(let q=26;q<wh-20;q+=26)A('b',0,q,0,W+3,8,D+3,gl);A('b',0,wh,0,W+8,8,D+8,b.tc);A('p',0,wh+8,0,W*.9,hw*1.2,D*.9,b.rc);A('y',0,wh+8+hw*1.2-4,0,4,36,4,b.ac)}
        else{A('y',0,0,0,W,wh,W,b.wc);for(let q=26;q<wh-20;q+=26)A('y',0,q,0,W+3,8,W+3,gl);A('y',0,wh,0,W+8,6,W+8,b.tc);A('d',0,wh+6,0,W*.78,hw*.8,W*.78,b.rc);A('y',0,wh+6+hw*.8-2,0,4,40,4,b.ac)}
        A('b',0,0,0,W+10,26,D+10,b.tc);door(34,26)
      }else if(k===5){
        const body=wh-hw*.9;A('b',0,0,0,W,body,D,b.wc);A('b',0,body,0,W+8,8,D+8,b.tc);A('y',0,body+8,0,hw*1.3,24,hw*1.3,b.wc);A('d',0,body+32,0,hw*1.4,hw*.85,hw*1.4,b.rc);
        A('y',0,body+32+hw*.85-3,0,5,26,5,b.ac);A('c',0,body+32+hw*.85+20,0,14,18,14,b.ac);
        for(const sx of[-1,1])for(const sz of[-1,1]){const mx=sx*(hw-6),mz=sz*(hh-6);A('y',mx,0,mz,15,body+70,15,b.wc);A('b',mx,body+30,mz,20,5,20,b.ac);A('c',mx,body+70,mz,19,34,19,b.rc)}
        door(36,44);wins(body*.6,3)
      }else if(k===6){
        A('y',0,0,0,W,wh,W,b.wc);A('y',0,wh-14,0,W+12,14,W+12,b.tc);A('c',0,wh,0,W+22,hw*1.6,W+22,b.rc);A('y',0,wh+hw*1.6-4,0,3,34,3,STONE);A('b',hw*.6,wh+hw*1.6+8,0,26,14,2,b.ac);
        for(const f of[.3,.55,.78])F(0,wh*f,9,16,LITC);door(24,40)
      }else if(k===7){
        A('y',0,0,0,W,36,W,b.wc);A('y',0,28,0,W+2,6,W+2,b.ac);A('c',0,36,0,W*1.3,46,W*1.3,b.rc);A('y',0,78,0,10,8,10,b.tc);door(18,28)
      }else if(k===8){
        const sh=wh*.86;A('b',0,0,0,W*1.9,10,W*1.9,STONE);A('b',0,10,0,W*1.55,12,W*1.55,STONE);A('f',0,22,0,W*1.2,sh,W*1.2,b.wc);
        A('p',0,22+sh,0,W*.84,W*1.4,W*.84,b.ac);for(const q of[.2,.45,.7])F(0,22+sh*q,10,24,b.tc);door(20,30)
      }else if(k===9){
        const t=b.zt;A('b',0,0,0,W,wh,D,t?b.wc:b.tc);A('b',0,wh-5,0,W+6,5,D+6,b.tc);
        if(t===0)door(36,46);
        if(t===2){A('b',0,wh,0,38,28,38,b.tc);A('p',0,wh+28,0,50,24,50,b.rc);A('c',0,wh+50,0,10,20,10,b.ac);for(const sx of[-1,1])A('b',sx*34,wh,0,6,22,6,b.ac)}
      }else if(k===10){
        A('h',0,0,0,W,wh,W,b.wc);A('y',0,wh*.55,0,W*.92,6,W*.92,b.tc);A('c',0,wh-2,0,W*.92,hw*1.2,W*.92,b.rc);
        const bx=fx*(hw*.62+16),bz=fy*(hw*.62+16),oy=wh*.8;A('b',bx,oy-5,bz,fx?10:12,12,fx?12:10,STONE);
        if(fx){A('b',bx+fx*4,oy-62,bz,3,124,12,'#a8895f');A('b',bx+fx*4,oy-6,bz,3,12,124,'#a8895f')}else{A('b',bx,oy-62,bz+fy*4,12,124,3,'#a8895f');A('b',bx,oy-6,bz+fy*4,124,12,3,'#a8895f')}
        door(22,34);F(0,wh*.4,8,14,LITC)
      }else if(k===11){
        const g=b.ac.replace(/(\d+)%\)$/,'72%)'),g2=b.rc.replace(/(\d+)%\)$/,'66%)');A('y',0,0,0,W*1.9,8,W*1.9,b.tc);A('o',0,6,0,W*.9,wh,W*.9,g);
        for(let q=0;q<4;q++){const a=q*1.5708+hr(q)*.6,r=hw*1.05;A('o',Math.cos(a)*r,4,Math.sin(a)*r,W*.4,wh*(.28+hr(q+9)*.2),W*.4,q%2?g2:g)}
      }else if(k===13){
        const sec=4,hs=wh*.72/sec;for(let q=0;q<sec;q++)A('y',0,q*hs,0,W*(1-.09*q),hs+.5,W*(1-.09*q),q%2?b.rc:'#e8e4dc');
        const top=wh*.72;A('y',0,top,0,W*.9,8,W*.9,b.tc);A('y',0,top+8,0,W*.52,26,W*.52,'#ffe9a0');A('c',0,top+34,0,W*.7,hw*.9,W*.7,b.rc);A('y',0,top+34+hw*.9-2,0,3,18,3,STONE);door(20,34)
      }else if(k===14){
        A('y',0,0,0,W,20,W,STONE);A('y',0,19,0,W*.7,2,W*.7,'#1d3a50');for(const sx of[-1,1])A('b',sx*hw*.8,20,0,4,40,4,'#5a4a3a');A('p',0,58,0,W*1.4,16,W*1.4,b.rc)
      }
      for(const q of out){const a=q[0];bl.push([a,X+q[1],by+q[2],Z+q[3],q[4],q[5],q[6],q[7],q[8]]);}
    });
    const cnt={};for(const q of bl)cnt[q[0]]=(cnt[q[0]]||0)+1;
    const IM={},du=new THREE.Object3D(),col=new THREE.Color(),idx={};
    for(const g in cnt){IM[g]=new THREE.InstancedMesh(wcol(GE[g]),new THREE.MeshLambertMaterial({vertexColors:true,side:g==='g'?THREE.DoubleSide:THREE.FrontSide}),cnt[g]);idx[g]=0}
    for(const q of bl){const im=IM[q[0]],n=idx[q[0]]++;du.position.set(q[1],q[2],q[3]);du.scale.set(q[4],q[5],q[6]);du.rotation.set(0,q[8],0);du.updateMatrix();im.setMatrixAt(n,du.matrix);col.set(q[7]);im.setColorAt(n,col)}
    for(const g in IM){const im=IM[g];im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;wg.add(im)}
  }
  T3.sc.add(wg);T3.fog=new THREE.Color(w.f[4]).multiplyScalar(.9);
  wg.traverse(o=>{if(o.parent===T3.hub)return;o.matrixAutoUpdate=false;o.updateMatrix()}); /* static: skip per-frame matrix work (hub animated parts stay live) */
}
function mkMon(m){
  const ti=Math.max(0,TYPES.indexOf(m.t)),g=AL3D.makeMonster(ti,m.col,m.boss,curWorld),by=g.userData.h+(m.boss?1.3:.8);
  const sp=c=>{const q=new THREE.Sprite(new THREE.SpriteMaterial({color:c,depthTest:false}));q.center.set(0,.5);g.add(q);return q},bg=sp('#000'),fg=sp('#d9503f');
  bg.position.set(-1.2,by,0);bg.scale.set(2.4,.28,1);fg.position.set(-1.2,by,0);fg.scale.set(2.4,.2,1);
  const dm=g.userData.mat;g.userData.fg=fg;g.userData.bar=[bg,fg];g.userData.mat={dispose(){dm.dispose();bg.material.dispose();fg.material.dispose()}};
  return g}
function updMon(g,m){const u=g.userData,k=m.dead?Math.max(0,Math.min(1,m.dieT*2.5)):1,s=m.r*(m.boss?1.15:1)*k+.01;
  g.scale.set(s,s*(m.dead?.4:1),s);g.position.set(m.x-C,gh3(m.x,m.y),m.y-C);
  const dx=P.x-m.x,dy=P.y-m.y;
  /* facing: a monster looks where it is walking (chasing, wandering or heading home), so it never walks backwards.
     Heading is sampled every few units of travel (smooth for server-interpolated monsters too); while standing next to
     the player in a fight it turns to face them. Models face +Z, so yaw = atan2(dx,dz). */
  if(!m.dead){
    if(u.px===undefined){u.px=m.x;u.py=m.y;u.hd=u.seed;u.lt=time;g.rotation.y=u.hd}
    const mx=m.x-u.px,my=m.y-u.py;
    if(mx*mx+my*my>=9){u.hd=Math.atan2(mx,my);u.px=m.x;u.py=m.y}
    let want=u.hd;
    if(m.state==='chase'&&Math.hypot(dx,dy)<m.r+P.r+40)want=Math.atan2(dx,dy);
    const dt=Math.max(0,Math.min(.1,time-u.lt));u.lt=time;
    let da=want-g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));
    g.rotation.y+=da*Math.min(1,dt*10);
  }else u.px=undefined;
  /* tight test: really off-screen -> hide the whole monster (zero draw calls, no per-mesh culling work) */
  const sc=Math.max(u.h,u.rig.sw||0)*s,gy=gh3(m.x,m.y);T3.sph.center.set(m.x-C,gy+u.h*s*.5,m.y-C);T3.sph.radius=sc*1.25+30;
  const inV=T3.frus.intersectsSphere(T3.sph);if(g.visible!==inV)g.visible=inV;
  /* wide test: also keep animating just outside the screen so nothing pops in mid-pose */
  if(!inV){T3.sph.radius=sc*1.25+30+150;if(!T3.frus.intersectsSphere(T3.sph))return}
  AL3D.animMonster(g,m,time,Math.hypot(dx,dy));
  const f=m.hp/m.maxhp,v=!m.dead&&f<.999;u.bar.forEach(b=>b.visible=v);u.fg.scale.x=2.4*Math.max(.001,f)}
/* v5_170 hide the ground rings (level aura + forge ring/band) of a 3D character while it is off the ground; restores them on landing */
function jumpRings(R,jz){
  if(jz>2){if(!R.jh){R.jh=1;R.jv=[R.ogl.visible,R.ogb.visible]}R.aura.visible=false;R.ogl.visible=false;R.ogb.visible=false}
  else if(R.jh){R.jh=0;R.ogl.visible=R.jv[0];R.ogb.visible=R.jv[1]}
}
function sync3(map,list,make,upd,vis){const fr=T3.fr;
  for(const o of list){if(vis&&!vis(o))continue;let m=map.get(o);if(!m){m=make(o);map.set(o,m);T3.sc.add(m)}m.userData.f=fr;upd(m,o)}
  for(const [o,m] of map)if(m.userData.f!==fr){T3.sc.remove(m);if(m.userData.mat)m.userData.mat.dispose();map.delete(o)}}
function proj3(x,y,h){const v=T3.v.set(x-C,gh3(x,y)+h,y-C).project(T3.cam);return v.z>1?null:{x:(v.x+1)/2*VW,y:(1-v.y)/2*VH}}
function pick3(e){const r=cv.getBoundingClientRect(),v=T3.v.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1,.5).unproject(T3.cam),o=T3.cam.position;v.sub(o).normalize();
  if(v.y>=-.01)return null;const t=(gh3(P.x,P.y)-o.y)/v.y;return {x:o.x+v.x*t+C,y:o.z+v.z*t+C}}
/* v5_173 extra 3D effects (web/fx3d.js): sky gradient dome, additive glow sprites, light pillars (the 2D 'beams' were missing in 3D mode).
   Self-contained: if anything in it throws, only this layer switches off (the game keeps running). Off switch: ?fx3=0 in the URL or localStorage woa_fx3='0'. */
const FXC={};
function fx3dFrame(dl){
  if(FXC.off||!window.FX3)return;
  try{FXC.T3=T3;FXC.THREE=THREE;FXC.P=P;FXC.C=C;FXC.gh3=gh3;FXC.dl=dl;FXC.time=time;FXC.projs=projs;FXC.mons=mons;FXC.items=items;FXC.ores=ores;FXC.beams=beams;FXC.fx=fx;FXC.LOW=LOW;FXC.PQ=PQ;FXC.world=curWorld;FXC.LK=LK;FX3.frame(FXC)}
  catch(e){FXC.off=true;console.warn('FX3 off:',e);try{FX3.dispose(FXC)}catch(_){}}
}
function render3D(){
  try{
    if(!T3.r)init3();
    {const nt=performance.now();if(T3.t0){const d=nt-T3.t0;if(d<250)T3.ft=T3.ft?T3.ft+(d-T3.ft)*.04:d}T3.t0=nt;
      if(LOW&&started&&nt>(T3.nx||0)){ /* adaptive resolution: step down when slow, step back up after 30 s without trouble */
        if(T3.ft>23&&T3.lv>0){T3.lv--;T3.nx=nt+3000;T3.bad=nt;T3.ft=16.7}
        else if(T3.ft<19&&T3.lv<(PQ.lock?PQ.lv:PRS.length-1)&&nt-(T3.bad||0)>30000){T3.lv++;T3.nx=nt+8000}
        else T3.nx=nt+1000}}
    const want=prWant();
    if(T3.w!==VW||T3.h!==VH||T3.cpr!==want){T3.r.setPixelRatio(want);T3.cpr=want;T3.r.setSize(VW,VH,false);T3.cam.aspect=VW/VH;T3.cam.updateProjectionMatrix();T3.w=VW;T3.h=VH;$('g3').style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block'}
    $('g3').style.display='block';
    if(T3.built!==curWorld){rebuild3();T3.built=curWorld}
    T3.fr++;const dl=daylight(),gy=gh3(P.x,P.y),tx=P.x-C,tz=P.y-C,z=T3.zoom,sh=shake*8;
    const sky=T3.skyC.copy(T3.fog).lerp(T3.skyB,dl*.35).multiplyScalar(.45+.55*dl);
    T3.sc.background=sky;T3.sc.fog.color.copy(sky);T3.amb.intensity=(.45+.4*dl)*LK;T3.sun.intensity=(.35+.75*dl)*LK;
    {const D=Math.hypot(380,320)*z,et=Math.max(camView.tilt,CAM_TILT_MIN),ct=Math.cos(et),st=Math.sin(et),ox=Math.sin(camView.yaw)*ct*D,oz=Math.cos(camView.yaw)*ct*D,ty=gy+24+(T3.cz=(T3.cz||0)+((P.jz||0)*.7-(T3.cz||0))*.12);
      /* v5_106 keep hills from hiding the character: lift the camera until the line from it to the player clears the terrain (rises at once, settles back slowly) */
      let lift=0;for(let k=1;k<=10;k++){const f=k/10,h=gh3(tx+ox*f+C,tz+oz*f+C)+22,ly=ty+st*D*f;if(h>ly){const need=(h-ly)/f;if(need>lift)lift=need}}
      const cl=gh3(tx+ox+C,tz+oz+C)+30-(ty+st*D);if(cl>lift)lift=cl;
      T3.lift=lift>(T3.lift||0)?lift:(T3.lift||0)+(lift-(T3.lift||0))*.06;
      T3.cam.position.set(tx+ox+(Math.random()-.5)*sh,ty+st*D+T3.lift,tz+oz)}T3.cam.lookAt(tx,gy+24+(T3.cz||0),tz);if(camView.tilt<CAM_TILT_MIN)T3.cam.rotateX(CAM_TILT_MIN-camView.tilt);T3.cam.updateMatrixWorld();T3.pm.multiplyMatrices(T3.cam.projectionMatrix,T3.cam.matrixWorldInverse);T3.frus.setFromProjectionMatrix(T3.pm);
    const pl=T3.pl;pl.position.set(tx,gy+(P.jz||0),tz);pl.rotation.y=Math.PI/2-P.face;pl.rotation.x=P.dead>0?-1.4:0;if(T3.rig.skin!==SKW())AL3D.setSkin(T3.rig,SKW());AL3D.animPlayer(T3.rig,P,time,realmIdx());jumpRings(T3.rig,P.jz||0);AL3D.hubUpdate(T3.hub,time);petRender3();
    let rpl=NONE;
    if(MP&&NET.peers.size){const prg=LOW?800:1200,PMAX=LOW?PQ.peers:14;let nw=0;rpl=[];
      for(const q of NET.peers.values()){const had=T3.rp.has(q),e=prg+(had?150:0);if(Math.abs(q.x-P.x)>e||Math.abs(q.y-P.y)>e)continue;
        if(!had){if(nw>=1)continue;nw++}rpl.push(q)}
      if(rpl.length>PMAX){rpl.sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y));rpl.length=PMAX}}
    sync3(T3.rp,rpl,q=>{const R=AL3D.makePlayer(q.sk),g=R.root;g.userData.rig=R;g.userData.mat={dispose(){try{Object.values(R.m).forEach(x=>x.dispose&&x.dispose())}catch(e){}}};return g},
      (g,q)=>{const R=g.userData.rig;if(R.skin!==q.sk)AL3D.setSkin(R,q.sk);g.position.set(q.x-C,gh3(q.x,q.y)+(q.jz||0),q.y-C);g.rotation.y=Math.PI/2-q.face;g.rotation.x=q.dead>0?-1.4:0;AL3D.animPlayer(R,q,time,Math.floor((q.lvl-1)/10));jumpRings(R,q.jz||0)},
      null);
    peerPets3(rpl===NONE?NONE:rpl); /* v5_201 other players' pets */
    {const rg=((LOW?650:900)+(LOW?200:300)*T3.zoom)*(PQ.lock?PQ.mon:1);sync3(T3.mp,mons,mkMon,updMon,m=>(!m.dead||m.dieT>0)&&Math.abs(m.x-P.x)<rg+(T3.mp.has(m)?150:0)&&Math.abs(m.y-P.y)<rg-100+(T3.mp.has(m)?150:0))}
    sync3(T3.or,ores,()=>AL3D.makeOre(),(q,o)=>q.position.set(o.x-C,gh3(o.x,o.y),o.y-C),o=>o.cd<=0&&Math.abs(o.x-P.x)<(LOW?900:1400)+(T3.or.has(o)?150:0)&&Math.abs(o.y-P.y)<(LOW?850:1300)+(T3.or.has(o)?150:0));
    sync3(T3.it,items,it=>AL3D.makeItem(it.k,it.slot,it.col),(q,it)=>{q.position.set(it.x-C,gh3(it.x,it.y)+14+Math.sin(it.t*5)*3,it.y-C);AL3D.animItem(q,it,time)});
    sync3(T3.pj,projs,p=>AL3D.makeProj(p.col),(q,p)=>{q.position.set(p.x-C,gh3(p.x,p.y)+22,p.y-C);q.rotation.y=Math.atan2(p.vx,p.vy)});
    let n=0;for(const f of fx){if(n>=T3.rings.length||(PQ.lock&&n>=PQ.rings))break;const m=T3.rings[n++],k=Math.min(1,f.t/f.max);m.visible=true;m.position.set(f.x-C,gh3(f.x,f.y)+4,f.y-C);m.scale.setScalar(Math.max(1,f.r*(.3+.7*Math.min(1,k*1.4))));m.material.color.set(f.col);m.material.opacity=1-k}
    for(;n<T3.rings.length;n++)T3.rings[n].visible=false;
    if(P.mv&&P.dead<=0){const d=T3.dest,k=(time*1.6)%1;d.visible=true;d.position.set(P.mv.x-C,gh3(P.mv.x,P.mv.y)+5,P.mv.y-C);d.scale.setScalar(16+k*22);d.material.opacity=.95-k*.7} else T3.dest.visible=false; /* v5_110 where you are walking to */
    const tg=P.target||P.sel;T3.sel.visible=!!(tg&&!tg.dead);if(T3.sel.visible){T3.sel.position.set(tg.x-C,gh3(tg.x,tg.y)+5,tg.y-C);T3.sel.scale.setScalar(tg.r+12);T3.sel.material.opacity=.8;const atk=!!(P.target&&!P.target.dead);if(T3.selAtk!==atk){T3.selAtk=atk;T3.sel.material.color.set(atk?'#ff3a2a':'#e3b559')}} /* v5_112 red ring while attacking, gold while only selected */
    const pa=T3.pp.geometry.attributes,np=Math.min(parts.length,LOW?(PQ.lock?PQ.parts:350):1200);
    for(let i=0;i<np;i++){const q=parts[i],k=1-q.life/q.max;pa.position.setXYZ(i,q.x-C,gh3(q.x,q.y)+14+k*26,q.y-C);let c=T3.cc[q.col];if(!c)c=T3.cc[q.col]=new THREE.Color(q.col);pa.color.setXYZ(i,c.r,c.g,c.b)}
    pa.position.needsUpdate=pa.color.needsUpdate=true;T3.pp.geometry.setDrawRange(0,np);
    fx3dFrame(dl);
    T3.r.render(T3.sc,T3.cam);
    ctx.clearRect(-9,-9,VW+18,VH+18);ctx.textAlign='center';ctx.font='600 11px Figtree,system-ui,sans-serif';
    for(const m of mons){if(m.dead||!(m.boss||m===P.target||m===P.sel)||Math.hypot(m.x-P.x,m.y-P.y)>900)continue;const s=proj3(m.x,m.y,m.r*(m.boss?4.8:3.9)),t='Lv '+m.lvl+' '+m.name+' \u00b7 DEF '+effMonDef(m);if(!s)continue;ctx.fillStyle='#000';ctx.fillText(t,s.x+1,s.y+1);ctx.fillStyle=m.boss?'#e3b559':'#e8e0ca';ctx.fillText(t,s.x,s.y)}
    if(inTown()){const s=proj3(NPC.x,NPC.y,56);if(s){ctx.fillStyle='#000';ctx.fillText('Potion Merchant \u00b7 N',s.x+1,s.y+1);ctx.fillStyle='#e3b559';ctx.fillText('Potion Merchant \u00b7 N',s.x,s.y)}}
    if(MP)for(const q of NET.peers.values()){if(Math.hypot(q.x-P.x,q.y-P.y)>1400)continue;const s=proj3(q.x,q.y,60);if(!s)continue;
      if(q.dead<=0){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(s.x-17,s.y+2,34,5);ctx.fillStyle=q.pvp?'#ff6a5a':'#5fd3a5';ctx.fillRect(s.x-17,s.y+2,34*clamp(q.hp/q.mh,0,1),5)}
      ctx.font='600 11px Figtree,system-ui,sans-serif';ctx.fillStyle=q.pvp?'#ff8a7a':PARTY.ids.has(q.id)?'#8ff0b0':'#bfe3ff';ctx.fillText((q.pvp?'\u2694 ':'')+'Lv'+q.lvl+' '+q.name,s.x,s.y-3);if(q.bub)drawBubble(s.x,s.y-18,q)}
    if(P.bub){const s=proj3(P.x,P.y,60);if(s)drawBubble(s.x,s.y-6,P)}
    let lf='';for(const t of texts){const s=proj3(t.x,t.y,30);if(!s)continue;ctx.globalAlpha=Math.max(0,1-t.t);const nf='700 '+t.size+'px Figtree,system-ui,sans-serif';if(nf!==lf){ctx.font=nf;lf=nf}ctx.fillStyle='#000';ctx.fillText(t.txt,s.x+1,s.y+1);ctx.fillStyle=t.col;ctx.fillText(t.txt,s.x,s.y)}
    ctx.globalAlpha=1;
    if(P.dead>0){ctx.fillStyle='rgba(120,20,15,.35)';ctx.fillRect(0,0,VW,VH);ctx.fillStyle='#e8e0ca';ctx.font='400 34px "Marcellus SC",Georgia,serif';ctx.fillText('YOU HAVE FALLEN',VW/2,VH/2)}
    drawVitals();if(!LOW||T3.fr%(PQ.lock?PQ.mini:4)===0)drawMini();return true;
  }catch(e){console.error(e);MODE3D=false;$('g3').style.display='none';return false}
}
function toggle3D(){MODE3D=!MODE3D;try{localStorage.setItem('al3d',MODE3D?'1':'0')}catch(e){}if(!MODE3D)$('g3').style.display='none'}
$('bPvp').addEventListener('click',togglePvpPanel);$('bView').addEventListener('click',toggle3D);$('bSkin').addEventListener('click',cycleSkin);
cv.addEventListener('wheel',e=>{T3.zoom=clamp(T3.zoom*(e.deltaY>0?1.1:.9),.55,2.2)},{passive:true});

/* ---------- lighting & atmosphere ---------- */
function drawMist(){
  const L=daylight();ctx.save();
  for(const m of mist){
    const wx=((m.x+time*m.sp)%(WORLD+800))-400,sx=wx-cam.x,sy=m.y-cam.y,w=m.s,h=m.s*.6;
    if(sx<-w||sy<-h||sx>VW+w||sy>VH+h)continue;
    ctx.globalAlpha=m.a*(.6+.4*L);ctx.drawImage(mistSpr,sx-w/2,sy-h/2,w,h);
  }
  ctx.restore();
}
function collectLights(){
  const out=[],ox=cam.x,oy=cam.y;
  const add=(x,y,r,col,s)=>{const sx=x-ox,sy=y-oy;if(sx<-r||sy<-r||sx>VW+r||sy>VH+r)return;out.push([sx,sy,r,col,s])};
  add(P.x,P.y,P.dead>0?40:190,'255,190,110',1);
  add(C,C,480,'255,170,90',.9);
  add(C-170,C+21,105,'255,120,50',.9);
  add(C+180,C+45,90,'255,170,200',.6);
  for(const o of ores)if(o.cd<=0)add(o.x,o.y,70,'110,230,245',.7);
  for(const m of mons){
    if(m.dead)continue;
    if(m.boss)add(m.x,m.y,130,'255,90,60',.7);
    else if(m.t===TYPES[4])add(m.x,m.y,60,'160,120,240',.6);
    else if(m.t===TYPES[3])add(m.x,m.y,50,'80,220,150',.5);
    else if(m.t===TYPES[5])add(m.x,m.y,70,'255,140,60',.6);
    else if(m.t===TYPES[6])add(m.x,m.y,60,'140,210,255',.6);
    else if(m.t===TYPES[7])add(m.x,m.y,80,'255,90,70',.6);
    else if(m.t===TYPES[8])add(m.x,m.y,80,'200,160,255',.7);
  }
  for(const p of projs)add(p.x,p.y,110,'180,220,255',.9);
  for(const f of fx)add(f.x,f.y,f.r*1.4,hexRgb(f.col),Math.max(0,1-f.t/f.max));
  for(const b of beams)add(b.x,b.y,200,'255,220,140',1-b.t/b.max);
  for(const it of items)it.k==='g'?add(it.x,it.y,70,'255,235,170',.8):add(it.x,it.y,34,it.k==='c'?'255,210,90':'120,230,245',.6);
  return out;
}
function drawLighting(){
  const L=daylight(),dark=1-L,a=.74*Math.pow(dark,1.15),ls=collectLights();
  if(a>.01){
    const w=Math.ceil(VW/2),h=Math.ceil(VH/2);
    if(lm.width!==w||lm.height!==h){lm.width=w;lm.height=h}
    lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,w,h);
    lctx.fillStyle='rgba(8,16,42,'+a+')';lctx.fillRect(0,0,w,h);
    lctx.globalCompositeOperation='destination-out';
    for(const l of ls){
      const x=l[0]/2,y=l[1]/2,r=l[2]/2,g=lctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(0,0,0,'+Math.min(1,l[4])+')');g.addColorStop(.55,'rgba(0,0,0,'+(l[4]*.4)+')');g.addColorStop(1,'rgba(0,0,0,0)');
      lctx.fillStyle=g;lctx.fillRect(x-r,y-r,r*2,r*2);
    }
    ctx.drawImage(lm,0,0,w,h,0,0,VW,VH);
  }
  const warm=Math.max(0,1-Math.abs(L-.5)*3.2)*.2;
  if(warm>.01){ctx.fillStyle='rgba(255,120,50,'+warm+')';ctx.fillRect(0,0,VW,VH)}
  ctx.save();ctx.globalCompositeOperation='lighter';const k=.3+.7*dark;
  for(const l of ls){
    const g=ctx.createRadialGradient(l[0],l[1],0,l[0],l[1],l[2]);
    g.addColorStop(0,'rgba('+l[3]+','+(.28*l[4]*k)+')');g.addColorStop(1,'rgba('+l[3]+',0)');
    ctx.fillStyle=g;ctx.fillRect(l[0]-l[2],l[1]-l[2],l[2]*2,l[2]*2);
  }
  ctx.restore();
}
function drawMotes(){
  const dark=1-daylight();ctx.save();ctx.globalCompositeOperation='lighter';
  for(const m of motes){
    const sx=((m.x*VW-cam.x*.35+Math.sin(time*m.sp+m.ph)*18)%VW+VW)%VW,sy=((m.y*VH-cam.y*.35+Math.cos(time*m.sp*.8+m.ph)*14)%VH+VH)%VH;
    const al=(.12+.75*dark)*(.5+.5*Math.sin(time*2+m.ph));
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,7);
    g.addColorStop(0,'rgba(220,245,140,'+al+')');g.addColorStop(1,'rgba(220,245,140,0)');
    ctx.fillStyle=g;ctx.fillRect(sx-7,sy-7,14,14);
  }
  ctx.restore();
}
function drawVitals(){
  const f=P.hp/maxHp();
  if(f<.35&&P.dead<=0){
    const a=(.35-f)/.35*(.35+.15*Math.sin(time*6));
    const g=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.35,VW/2,VH/2,Math.max(VW,VH)*.7);
    g.addColorStop(0,'rgba(160,20,15,0)');g.addColorStop(1,'rgba(160,20,15,'+a+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
  }
}

