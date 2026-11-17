/* ---------- update ---------- */
function moveToward(tx,ty,stop,dt,speed){
  const dx=tx-P.x,dy=ty-P.y,d=Math.hypot(dx,dy);
  if(d<=stop)return true;
  const s=Math.min(speed*dt,d-stop+.01);
  P.x+=dx/d*s;P.y+=dy/d*s;P.face=Math.atan2(dy,dx);
  return false;
}
/* ---------- v5_167 GROUND TEXTURE + SOLID STRUCTURES ----------
   groundTile(): a tileable 256 px canvas of soil patches, grass tufts, rocks and pebbles, drawn in light grey / warm tones so that it MULTIPLIES with each world's own ground colour
   (grass worlds stay green, sand worlds stay sand ...). plazaTile(): cobblestone pavers for the town. The same tiles are used by the 3D terrain (texture map) and the 2D ground (pattern, multiply). */
let GT=null,PT=null;
function groundTile(){
  if(GT)return GT;
  const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');
  let sd=20241117;const R=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
  g.fillStyle='#f1eee8';g.fillRect(0,0,S,S);
  const wrap=fn=>{for(const ox of[-S,0,S])for(const oy of[-S,0,S]){g.save();g.translate(ox,oy);fn();g.restore()}}; /* every element is drawn 9x so the tile has no seams */
  for(let i=0;i<9;i++){const x=R()*S,y=R()*S,r=26+R()*44,a=R()*3,sq=.45+R()*.4; /* soil patches: soft warm-brown blobs */
    wrap(()=>{g.save();g.translate(x,y);g.rotate(a);g.scale(1,sq);const gr=g.createRadialGradient(0,0,r*.15,0,0,r);gr.addColorStop(0,'rgba(156,112,74,.55)');gr.addColorStop(.6,'rgba(170,128,90,.32)');gr.addColorStop(1,'rgba(170,128,90,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,6.2832);g.fill();g.restore()})}
  for(let i=0;i<7;i++){const x=R()*S,y=R()*S,r=22+R()*34; /* darker damp-grass patches */
    wrap(()=>{const gr=g.createRadialGradient(x,y,2,x,y,r);gr.addColorStop(0,'rgba(120,168,96,.38)');gr.addColorStop(1,'rgba(120,168,96,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.2832);g.fill()})}
  const GC=['rgba(112,160,84,.75)','rgba(168,206,132,.7)','rgba(86,132,66,.7)','rgba(196,222,150,.6)'];
  for(let i=0;i<360;i++){const x=R()*S,y=R()*S,L=5+R()*10,a=-1.5708+(R()-.5)*.9,c=GC[(R()*4)|0],lw=1+R()*.5; /* grass blades in small tufts */
    wrap(()=>{g.strokeStyle=c;g.lineWidth=lw;g.lineCap='round';for(let b=0;b<3;b++){const bx=x+(b-1)*2.2,la=a+(b-1)*.35;g.beginPath();g.moveTo(bx,y);g.lineTo(bx+Math.cos(la)*L,y+Math.sin(la)*L);g.stroke()}})}
  for(let i=0;i<15;i++){const x=R()*S,y=R()*S,rx=5+R()*9,ry=rx*(.6+R()*.3),a=R()*3.14; /* rocks: shadow, body, outline, highlight */
    wrap(()=>{g.save();g.translate(x,y);g.rotate(a);
      g.fillStyle='rgba(60,56,50,.35)';g.beginPath();g.ellipse(2,3,rx,ry,0,0,6.2832);g.fill();
      g.fillStyle='#bcbab3';g.beginPath();g.ellipse(0,0,rx,ry,0,0,6.2832);g.fill();
      g.strokeStyle='rgba(70,68,62,.8)';g.lineWidth=1.1;g.stroke();
      g.fillStyle='#dedcd4';g.beginPath();g.ellipse(-rx*.25,-ry*.3,rx*.5,ry*.4,0,0,6.2832);g.fill();g.restore()})}
  for(let i=0;i<260;i++){const x=R()*S,y=R()*S,r=.7+R()*1.5,d=R()<.5; /* pebbles / grit */
    wrap(()=>{g.fillStyle=d?'rgba(80,72,64,.45)':'rgba(255,255,255,.5)';g.beginPath();g.arc(x,y,r,0,6.2832);g.fill()})}
  return GT=cv;
}
function plazaTile(){
  if(PT)return PT;
  const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');
  let sd=777;const R=()=>(sd=(Math.imul(sd,1664525)+1013904223)>>>0)/4294967296;
  g.fillStyle='#7d7a70';g.fillRect(0,0,S,S); /* mortar */
  const n=4,w=S/n;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const off=(r%2)*w/2,x=c*w+off,y=r*w,sh=.82+R()*.3;
    for(const ex of[-S,0,S]){g.fillStyle='rgb('+(210*sh|0)+','+(206*sh|0)+','+(192*sh|0)+')';g.fillRect(x+ex+1.5,y+1.5,w-3,w-3);
      g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+ex+1.5,y+1.5,w-3,2.5);g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x+ex+1.5,y+w-4,w-3,2.5)}}
  for(let i=0;i<70;i++){g.fillStyle='rgba(60,56,50,.2)';g.fillRect(R()*S,R()*S,1.5,1.5)}
  return PT=cv;
}
/* 2D: ground + plaza overlays (pattern, multiply), scrolled with the camera */
function pat2d(cv,k,ox,oy){
  const pt=ctx.createPattern(cv,'repeat'),w=cv.width*k,h=cv.height*k;
  try{pt.setTransform(new DOMMatrix([k,0,0,k,((ox%w)+w)%w,((oy%h)+h)%h]))}catch(e){}
  return pt;
}
/* SOLID STRUCTURES: the player cannot walk through them (and is pushed out if a dash / teleport ends inside one). Offsets are from the hub centre (C, C).
   The 3D hub (pagoda, forge, world gate, potion stall, lanterns) and the 2D hub (shrine, anvil, healer flowers, stall) are drawn differently, so each has its own list.
   rect = [cx, cy, halfW, halfH], circle = [cx, cy, r].  Monsters and other players are not affected (their own client moves them). */
/* ---------- v5_169 / v5_170 JUMP + STANDING ON STRUCTURES ----------
   Space or the JUMP button above Dodge. Real (symmetric) jump physics: up speed JUMP_V0, gravity JUMP_G, apex JUMP_H (+10% in v5_170), about JUMP_T seconds from flat ground.
   Every solid has a TOP HEIGHT H (world units). Below its top it blocks you; once you are higher than its top you pass over it, and if you come down on it you LAND and stand on it (P.jz = your height above the
   ground). Low tops (<= STEP, e.g. the pagoda's base platform) are simply walked up. Walk off an edge and you fall. Trees, tall crystals and pillars you cannot reach are always solid.
   Other players see your height: one small 'jz' effect message (rate limited, only while you are off the ground). */
const JUMP_T=.7,JUMP_H=88,JUMP_CD=.25,STEP=12,JUMP_V0=4*JUMP_H/JUMP_T,JUMP_G=8*JUMP_H/(JUMP_T*JUMP_T);
function doJump(){
  if(!started||P.dead>0||P.air||P.jcd>0)return;
  P.air=true;P.vz=JUMP_V0;
  ring(P.x,P.y,34,'#d9f2ff');spark(P.x,P.y,'#e8f6ff',8,90,.35,2.8);SFX('dodge');
}
const SOL_R=14;
/* rect = [cx, cy, halfW, halfH, H], circle = [cx, cy, r, H]; offsets from the hub centre (C, C). The 3D hub (pagoda, forge, world gate, potion stall, lanterns) and the 2D hub are drawn differently, so each has its own list. */
const SOL3={rects:[[0,0,78,78,9],[0,0,48,48,54],[225,90,39,32,42],[225,150,15,14,19],[-165,-99,36,22,21]],circ:[[-270,90,10,105],[-180,90,10,105]]};
for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=(TOWN/1.5-6)*1.5;SOL3.circ.push([Math.cos(a)*r,Math.sin(a)*r,8,39])}
const SOL2={rects:[[0,-36,69,51,60],[-169,50,26,20,22],[NPC.x-C,NPC.y-C+6,26,13,24]],circ:[[180,45,16,14]]};
/* scenery: collision radius (fraction of drawn size 28 x scale) and top height per world kit (forest, crystal, ruins, fungal, snow) and prop; null height = never standable; radius 0 = walk-through.
   2D draws every prop the same way (tree, rock, flat flowers), so it has its own numbers. */
const DECO_R3=[[.45,.7,.65],[.5,.85,.4],[.8,.8,.9],[.5,0,.8],[.4,.25,.7]];
const DECO_H3=[[null,.95,.8],[null,1.1,null],[2.7,1.3,1.5],[null,0,.6],[null,null,.8]];
function decoR(d,is3,kit){return is3?DECO_R3[kit][d.k]*28*d.s:(d.k===0?9*d.s:d.k===1?14*d.s:0)}
function decoH(d,is3,kit){if(is3){const h=DECO_H3[kit][d.k];return h==null?Infinity:h*28*d.s}return d.k===1?20*d.s:Infinity}
/* highest standable top under (x,y) that is at most `z0 + STEP` above my previous height (0 = the ground) */
function supportH(x,y,z0){
  const is3=!!(MODE3D&&T3.r),lim=z0+STEP+.01;let best=0;
  if(Math.abs(x-C)<=520&&Math.abs(y-C)<=520){
    const L=is3?SOL3:SOL2;
    for(const q of L.rects)if(q[4]<=lim&&q[4]>best&&Math.abs(x-(C+q[0]))<=q[2]+3&&Math.abs(y-(C+q[1]))<=q[3]+3)best=q[4];
    for(const q of L.circ)if(q[3]<=lim&&q[3]>best&&Math.hypot(x-(C+q[0]),y-(C+q[1]))<=q[2]+3)best=q[3];
  }
  {const a=BG.get(((x/256)|0)*512+((y/256)|0));if(a)for(const b of a)if(b.H<=lim&&b.H>best&&(b.rd?Math.hypot(x-b.x,y-b.y)<=b.hw+3:Math.abs(x-b.x)<=b.hw+3&&Math.abs(y-b.y)<=b.hh+3))best=b.H} /* v5_171 / v5_172 standable tops (watchtowers, ziggurat tiers, wells) */
  const kit=is3?(KOF[tIx(curWorld)%12]%5):0,cx=(x/256)|0,cy=(y/256)|0;
  for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){const a=DG.get(gx*512+gy);if(!a)continue;
    for(const ix of a){if(is3&&LOW&&ix%3)continue;const d=deco[ix],r=decoR(d,is3,kit);if(r<=0)continue;const h=decoH(d,is3,kit);if(h>lim||h<=best)continue;
      if(Math.hypot(x-d.x,y-d.y)<=r+3)best=h}}
  return best;
}
/* ---------- v5_172 2D drawing of one building. (x,y) = footprint centre on screen, ex = how far its top is drawn above the ground ---------- */
function drawB2(b,x,y,ex){
  const k=b.k,hw=b.hw,hh=b.hh,c=ctx,R=(a,bb,w,h,f)=>{c.fillStyle=f;c.fillRect(a,bb,w,h)},
    poly=(pts,f)=>{c.fillStyle=f;c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill()},
    circ=(a,bb,r,f)=>{c.fillStyle=f;c.beginPath();c.arc(a,bb,r,0,6.2832);c.fill()},
    dark=a=>R(x-hw,y+hh-ex,hw*2,ex,a),sh=()=>{c.fillStyle='rgba(0,0,0,.28)';if(b.rd){c.beginPath();c.arc(x+9,y+10,hw,0,6.2832);c.fill()}else c.fillRect(x-hw+9,y-hh+10,hw*2,hh*2)};
  sh();
  const lit='rgba(255,214,120,.85)',door=()=>R(x-9,y+hh-26,18,26,'#17120f');
  if(k===0){
    const wall=b.v===3?b.wh*.62:b.wh*.55;
    if(b.v===2){R(x-hw,y+hh-wall,hw*2,wall,b.wc);R(x-hw,y-hh-wall,hw*2,hh*2,b.tc);R(x-hw+4,y-hh-wall+4,hw*2-8,hh*2-8,b.rc);R(x-hw*.5,y-hh*.4-wall,hw*.5,hh*.5,b.wc)}
    else{R(x-hw,y+hh-wall,hw*2,wall,b.wc);
      if(b.v===1)poly([x-hw-8,y+hh-wall+4,x+hw+8,y+hh-wall+4,x,y-hh-wall*.95],b.rc);else poly([x-hw-8,y+hh-wall+4,x-hw*.55,y-hh-wall*.45,x+hw*.55,y-hh-wall*.45,x+hw+8,y+hh-wall+4],b.rc);
      c.fillStyle='rgba(255,255,255,.1)';c.fillRect(x-hw*.3,y-hh-wall*.3,hw*.6,hh*1.2);if(b.sd%2)R(x+hw*.3,y-hh-wall*.45-12,10,16,'#3a3532')}
    door();c.fillStyle=lit;if(hw>=60){c.fillRect(x-hw*.62,y+hh-wall*.72,11,11);c.fillRect(x+hw*.62-11,y+hh-wall*.72,11,11)}else c.fillRect(x+hw*.45-5,y+hh-wall*.72,10,10);
  }else if(k===1||k===12){
    const wall=k===1?b.wh*.6:b.wh*.7;R(x-hw,y+hh-wall,hw*2,wall,b.wc);
    if(k===1){poly([x-hw-12,y+hh-wall+5,x-hw*.6,y-hh-wall*.55,x+hw*.6,y-hh-wall*.55,x+hw+12,y+hh-wall+5],b.rc);R(x-hw*.62,y-hh-wall*.65,hw*1.24,7,b.ac);
      for(let q=-1;q<=1;q+=2)R(x+q*hw*.72-4,y+hh-wall,8,wall,b.tc);circ(x-hw*.6,y-hh-wall*.55,5,b.ac);circ(x+hw*.6,y-hh-wall*.55,5,b.ac)}
    else{poly([x-hw-8,y+hh-wall+4,x-hw+14,y-hh-wall*1.2,x+hw-14,y-hh-wall*1.2,x+hw+8,y+hh-wall+4],b.rc);R(x-hw+14,y-hh-wall*1.2,hw*2-28,4,b.ac)}
    R(x-14,y+hh-30,28,30,'#17120f');c.fillStyle=lit;for(let q=-2;q<=2;q+=1)if(q)c.fillRect(x+q*hw*.33-5,y+hh-wall*.7,10,10);
  }else if(k===2){
    R(x-hw,y-hh,hw*2,hh*2,b.wc);c.fillStyle='rgba(0,0,0,.22)';c.fillRect(x-hw,y+hh-ex*.6,hw*2,ex*.6);
    R(x-hw-4,y-hh-4,hw*2+8,hh*2-ex*.3,b.rc);const m=Math.max(3,Math.round(hw/9));for(let q=0;q<m;q++)R(x-hw+(q+.5)*(hw*2/m)-4,y-hh-10,8,8,b.wc);R(x-8,y+hh-24,16,22,'#14110f');
  }else if(k===3){
    const n=b.n,w0=hw*2;R(x-hw*1.05,y+hh-14,hw*2.1,14,'#6a625a');
    for(let t=0;t<n;t++){const wi=w0*(1-.15*t),yb=y+hh-14-t*34,tw=wi*.74,rw=wi*1.15;R(x-tw/2,yb-30,tw,30,b.wc);R(x-tw/2+4,yb-22,tw-8,6,b.ac);
      poly([x-rw/2,yb-24,x-rw*.22,yb-48,x+rw*.22,yb-48,x+rw/2,yb-24],b.rc)}
    const top=y+hh-14-n*34-36;R(x-2,top-30,4,34,b.ac);circ(x,top-32,5,b.ac);door();
  }else if(k===4){
    const tot=Math.min(b.wh*.6,300),gcl='rgba(190,230,255,.55)',win=(x0,w,yTop,h)=>{for(let r=0;r<h/14;r++)for(let q=0;q<w/12;q++){c.fillStyle=((r*7+q*13+b.sd)%5)<2?lit:gcl;c.fillRect(x0+q*12+3,yTop+r*14+3,7,8)}};
    if(b.v===0){const sec=[[1,tot*.55],[.74,tot*.28],[.5,tot*.17]];let yb=y+hh;
      for(const [f,h] of sec){const w=hw*2*f;R(x-w/2,yb-h,w,h,b.wc);win(x-w/2,w,yb-h,h);R(x-w/2-2,yb-h-4,w+4,5,b.tc);yb-=h}
      R(x-2,yb-50,4,50,'#3a3a3a');circ(x,yb-50,4,'#ff4a3a')}
    else if(b.v===1){R(x-hw,y+hh-tot,hw*2,tot,b.wc);win(x-hw,hw*2,y+hh-tot,tot);poly([x-hw-4,y+hh-tot,x-hw*.35,y+hh-tot-hw*.95,x+hw*.35,y+hh-tot-hw*.95,x+hw+4,y+hh-tot],b.rc);R(x-2,y+hh-tot-hw*.95-30,4,32,b.ac)}
    else{R(x-hw,y-tot,hw*2,tot,b.wc);circ(x,y,hw,b.wc);circ(x,y-tot,hw,b.tc);win(x-hw,hw*2,y-tot,tot);c.fillStyle=b.rc;c.beginPath();c.arc(x,y-tot,hw*.7,Math.PI,0);c.fill();R(x-2,y-tot-hw*.7-30,4,32,b.ac)}
    R(x-hw-3,y+hh-18,hw*2+6,18,b.tc);R(x-9,y+hh-18,18,18,'#17120f');
  }else if(k===5){
    const wall=b.wh*.6;R(x-hw,y+hh-wall,hw*2,wall,b.wc);R(x-hw-4,y+hh-wall-6,hw*2+8,8,b.tc);
    for(const q of[-1,1]){R(x+q*(hw-4)-6,y+hh-wall-60,12,wall+56,b.wc);poly([x+q*(hw-4)-9,y+hh-wall-60,x+q*(hw-4)+9,y+hh-wall-60,x+q*(hw-4),y+hh-wall-86],b.rc)}
    c.fillStyle=b.rc;c.beginPath();c.arc(x,y+hh-wall-6,hw*.66,Math.PI,0);c.fill();c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.arc(x-hw*.2,y+hh-wall-hw*.2,hw*.28,Math.PI,Math.PI*1.7);c.fill();R(x-2,y+hh-wall-6-hw*.66-22,4,24,b.ac);circ(x,y+hh-wall-6-hw*.66-24,4,b.ac);
    c.fillStyle='#17120f';c.beginPath();c.arc(x,y+hh,13,Math.PI,0);c.fill();
  }else if(k===6||k===13||k===10){
    const r=hw,H2=Math.min(b.wh*.62,260);circ(x,y,r,'#3a3530');
    if(k===13){const bands=4;for(let q=0;q<bands;q++){const w=r*(1-.1*q),yy=y-H2*q/bands;R(x-w,yy-H2/bands,w*2,H2/bands+1,q%2?b.rc:'#e8e4dc')}circ(x,y-H2-4,r*.5,'#ffe9a0');poly([x-r*.7,y-H2-4,x,y-H2-r*1.1,x+r*.7,y-H2-4],b.rc)}
    else if(k===10){poly([x-r,y,x-r*.68,y-H2,x+r*.68,y-H2,x+r,y],b.wc);poly([x-r*.8,y-H2+4,x,y-H2-r*.95,x+r*.8,y-H2+4],b.rc);
      const bx=x,by=y-H2*.8;c.strokeStyle='#a8895f';c.lineWidth=7;c.beginPath();c.moveTo(bx-62,by-62);c.lineTo(bx+62,by+62);c.moveTo(bx+62,by-62);c.lineTo(bx-62,by+62);c.stroke();circ(bx,by,7,b.tc)}
    else{R(x-r,y-H2,r*2,H2,b.wc);circ(x,y-H2,r,b.tc);R(x-r-5,y-H2-4,r*2+10,10,b.tc);poly([x-r-8,y-H2,x,y-H2-r*1.5,x+r+8,y-H2],b.rc);c.fillStyle=lit;for(let q=1;q<4;q++)c.fillRect(x-4+((q%2)?-r*.3:r*.3),y-H2*q/4,8,10)}
    R(x-7,y-4,14,16,'#17120f');
  }else if(k===7){
    circ(x,y,hw,b.wc);R(x-hw,y-34,hw*2,34,b.wc);c.fillStyle=b.ac;c.fillRect(x-hw,y-18,hw*2,4);circ(x,y-34,hw,b.rc);circ(x,y-44,hw*.55,'rgba(255,255,255,.12)');circ(x,y-52,5,b.tc);R(x-6,y-4,12,16,'#17120f');
  }else if(k===8){
    const H2=Math.min(b.wh*.62,270);R(x-hw*1.6,y+hh-10,hw*3.2,10,'#6a625a');poly([x-hw,y+hh-10,x-hw*.7,y+hh-H2,x+hw*.7,y+hh-H2,x+hw,y+hh-10],b.wc);
    poly([x-hw*.7,y+hh-H2,x,y+hh-H2-hw*1.4,x+hw*.7,y+hh-H2],b.ac);c.fillStyle='rgba(0,0,0,.25)';for(let q=1;q<=3;q++)c.fillRect(x-4,y+hh-10-q*H2*.22,8,12);
  }else if(k===9){
    const H2=b.H*.9;R(x-hw,y+hh-H2,hw*2,H2,b.zt?b.wc:b.tc);R(x-hw,y-hh-H2,hw*2,hh*2,b.zt===2?b.rc:b.wc);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(x-hw,y+hh-H2,hw*2,5);
    if(b.zt===0){R(x-14,y+hh-24,28,24,'#17120f')}
    if(b.zt===2){R(x-14,y-14-H2,28,22,b.tc);poly([x-20,y-14-H2,x,y-34-H2,x+20,y-14-H2],b.rc);circ(x,y-40-H2,5,b.ac)}
  }else if(k===11){
    const H2=Math.min(b.wh*.62,260);R(x-hw*1.4,y+hh-8,hw*2.8,8,b.tc);
    for(const s of[[-1,.5],[1,.42],[.0,1]]){const cx=x+s[0]*hw*.9,h=H2*s[1],w=hw*(s[1]>.9?.85:.45);const base=y+hh-6;
      poly([cx,base,cx+w,base-h*.45,cx,base-h,cx-w,base-h*.45],b.ac);poly([cx,base,cx+w,base-h*.45,cx,base-h],'rgba(255,255,255,.25)')}
  }else if(k===14){
    circ(x,y,hw,'#6a625a');circ(x,y,hw*.62,'#1d3a50');R(x-hw*.8-2,y-40,4,40,'#5a4a3a');R(x+hw*.8-2,y-40,4,40,'#5a4a3a');poly([x-hw*1.1,y-38,x,y-56,x+hw*1.1,y-38],b.rc);
  }
}
/* vertical movement of the player: jump, landing, standing on a top, stepping up, falling off an edge */
function playerVert(dt){
  const z0=P.jz||0,S=supportH(P.x,P.y,z0);
  if(P.air){
    P.vz-=JUMP_G*dt;const z1=z0+P.vz*dt;
    if(P.vz<=0&&z1<=S){P.jz=S;P.vz=0;P.air=false;P.jcd=JUMP_CD;ring(P.x,P.y,30,'#d9f2ff');spark(P.x,P.y,'#cdbfa0',6,70,.3,2.4)}
    else P.jz=Math.max(0,z1);
  }else{
    if(P.jcd>0)P.jcd-=dt;
    if(S>z0+.01)P.jz=S;                   /* walked / landed onto a low top: step up */
    else if(S<z0-.01){P.air=true;P.vz=0}  /* walked off an edge: fall */
    else P.jz=S;
  }
  /* tell the other players my height (only while off the ground, plus the final 0) */
  const now=performance.now()/1000,jz=Math.round(P.jz||0);
  if(MP&&(!P.jzT||now-P.jzT>=.1)&&(Math.abs(jz-(P.jzS||0))>=3||(jz!==(P.jzS||0)&&(jz===0||P.jzS===0))||(jz>0&&now-(P.jzT||0)>1.5))){P.jzS=jz;P.jzT=now;fxs({k:'jz',z:jz})}
}
/* push (x,y) out of every solid that is higher than me; returns true when it had to move */
function decoPush(o,is3){
  const kit=is3?(KOF[tIx(curWorld)%12]%5):0,z=o.jz||0;let hit=false;
  const cx=(o.x/256)|0,cy=(o.y/256)|0;
  for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){
    const a=DG.get(gx*512+gy);if(!a)continue;
    for(const ix of a){
      if(is3&&LOW&&ix%3)continue; /* phones draw only every 3rd prop in 3D, so only those are solid */
      const d=deco[ix],rr=decoR(d,is3,kit);if(rr<=0)continue;
      const H=decoH(d,is3,kit);if(z>=H-1||(!o.air&&H-z<=STEP))continue; /* above it, or a low step I simply walk up */
      const r=rr+SOL_R,dx=o.x-d.x,dy=o.y-d.y,d2=dx*dx+dy*dy;if(d2>=r*r)continue;
      hit=true;const dd=Math.sqrt(d2);o.x=d.x+(dd>1e-3?dx/dd:1)*r;o.y=d.y+(dd>1e-3?dy/dd:0)*r;
    }
  }
  return hit;
}
function solidPush(o){
  const is3=!!(MODE3D&&T3.r);let hit=false;
  for(let it=0;it<2;it++)if(decoPush(o,is3))hit=true;
  for(let it=0;it<2;it++){ /* v5_171 village buildings (rects, same rules as the hub structures) */
    const a=BG.get(((o.x/256)|0)*512+((o.y/256)|0));if(!a)break;const z=o.jz||0;let any=false;
    for(const b of a){
      if(z>=b.H-1||(!o.air&&b.H-z<=STEP))continue;
      if(b.rd){const dx=o.x-b.x,dy=o.y-b.y,R=b.hw+SOL_R,d2=dx*dx+dy*dy;if(d2>=R*R)continue;hit=any=true;const d=Math.sqrt(d2);o.x=b.x+(d>1e-3?dx/d:1)*R;o.y=b.y+(d>1e-3?dy/d:0)*R;continue}
      const x0=b.x-b.hw,x1=b.x+b.hw,y0=b.y-b.hh,y1=b.y+b.hh,qx=clamp(o.x,x0,x1),qy=clamp(o.y,y0,y1),dx=o.x-qx,dy=o.y-qy,d2=dx*dx+dy*dy;
      if(d2>=SOL_R*SOL_R)continue;hit=any=true;
      if(d2>1e-6){const d=Math.sqrt(d2);o.x=qx+dx/d*SOL_R;o.y=qy+dy/d*SOL_R}
      else{const l=o.x-x0,r=x1-o.x,t=o.y-y0,bt=y1-o.y,m=Math.min(l,r,t,bt);
        if(m===l)o.x=x0-SOL_R;else if(m===r)o.x=x1+SOL_R;else if(m===t)o.y=y0-SOL_R;else o.y=y1+SOL_R}
    }
    if(!any)break;
  }
  if(Math.abs(o.x-C)>520||Math.abs(o.y-C)>520)return hit;
  const L=is3?SOL3:SOL2,z=o.jz||0;
  for(let it=0;it<2;it++){
    for(const q of L.rects){
      if(z>=q[4]-1||(!o.air&&q[4]-z<=STEP))continue;
      const cx=C+q[0],cy=C+q[1],x0=cx-q[2],x1=cx+q[2],y0=cy-q[3],y1=cy+q[3],qx=clamp(o.x,x0,x1),qy=clamp(o.y,y0,y1),dx=o.x-qx,dy=o.y-qy,d2=dx*dx+dy*dy;
      if(d2>=SOL_R*SOL_R)continue;hit=true;
      if(d2>1e-6){const d=Math.sqrt(d2);o.x=qx+dx/d*SOL_R;o.y=qy+dy/d*SOL_R}
      else{const l=o.x-x0,r=x1-o.x,t=o.y-y0,b=y1-o.y,m=Math.min(l,r,t,b); /* centre is inside: leave by the nearest side */
        if(m===l)o.x=x0-SOL_R;else if(m===r)o.x=x1+SOL_R;else if(m===t)o.y=y0-SOL_R;else o.y=y1+SOL_R}
    }
    for(const q of L.circ){
      if(z>=q[3]-1||(!o.air&&q[3]-z<=STEP))continue;
      const dx=o.x-(C+q[0]),dy=o.y-(C+q[1]),R=q[2]+SOL_R,d2=dx*dx+dy*dy;
      if(d2>=R*R)continue;hit=true;const d=Math.sqrt(d2);o.x=C+q[0]+(d>1e-3?dx/d:1)*R;o.y=C+q[1]+(d>1e-3?dy/d:0)*R;
    }
  }
  return hit;
}
function updatePlayer(dt){
  if(P.dead>0){P.air=false;P.vz=0;P.jz=0;P.dead-=dt;if(P.dead<=0)respawn();return}
  P.atkCd-=dt;P.hurt-=dt;P.swing-=dt;
  P.pvpT=(MP&&PVPLVL>0&&P.dead<=0&&!inTown())?1:0; /* v5_158 legacy flag, now simply 'my mode lets me attack players' (the old 30 s flag and the always-on Arena are gone) */
  const ox0=P.x,oy0=P.y;
  pot.hp=Math.max(0,pot.hp-dt);pot.qi=Math.max(0,pot.qi-dt);pot.tp=Math.max(0,pot.tp-dt);
  if(P.tp>0){if(dist(P.x,P.y,P.tpx,P.tpy)>30)cancelTp('Teleport cancelled: you moved.');else{P.tp-=dt;tpFx(dt);if(P.tp<=0)finishTp()}}
  autoPot();for(let i=0;i<SCD.length;i++)if(SCD[i]>0)SCD[i]-=dt;P.bfT-=dt;P.vlT-=dt;P.drT-=dt;P.ceT-=dt;if(P.lsT>0)P.lsT-=dt;if(P.rfT>0)P.rfT-=dt;if(P.linkT>0)P.linkT-=dt;if(P.markT>0)P.markT-=dt;if(P.absT>0)P.absT-=dt;if(P.gsT>0)P.gsT-=dt;if(P.galeLock>0)P.galeLock-=dt;P.inv-=dt;if(P.shT>0){P.shT-=dt;if(P.shT<=0)P.sh=0}
  P.qi=Math.min(maxQi(),P.qi+dt*(3+P.lvl*.1+maxQi()*qrgVal()/100));
  if(P.hubSkMsg>0)P.hubSkMsg-=dt;
  if(P.rngMsg>0)P.rngMsg-=dt;
  if(inTown()){P.hp=Math.min(maxHp(),P.hp+maxHp()*.08*dt);P.qi=Math.min(maxQi(),P.qi+dt*8)}
  else P.hp=Math.min(maxHp(),P.hp+dt*(1+P.lvl*.15));

  if(amine&&!P.task&&!P.target&&!P.mv&&P.tp<=0&&!inTown()){
    amT-=dt;if(amT<=0){amT=.5;const o=nearestOre();if(o){P.task=o;P.mine=0;amWait=false}else if(!amWait){amWait=true;say('Auto-mine: waiting for an ore vein to respawn.','#8d9aa2')}}
  }
  const speed=P.cast>0?0:moveSpd(); /* rooted while casting */
  let ix=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0)+joy.x;
  let iy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0)+joy.y;
  if(Math.abs(ix)>.12||Math.abs(iy)>.12){
    {const r=camRot(ix,iy);ix=r[0];iy=r[1]}
    const l=Math.max(1,Math.hypot(ix,iy));
    P.x+=ix/l*speed*dt;P.y+=iy/l*speed*dt;P.face=Math.atan2(iy,ix);
    P.mv=null;P.task=null;P.mine=0;P.fatk=false;stopMine('Auto-mine off.');
  }else if(P.task){
    const o=P.task;
    if(o.cd>0){P.task=null;P.mine=0}
    else if(moveToward(o.x,o.y,46,dt,speed)){
      P.mine+=dt;
      if(P.mine>=1.6){
        const n=1+(rnd()<.4?1:0)+(P.lvl>20?1:0)+Math.floor(P.lvl/60);
        P.ore+=n;lootIcon('o','&#9670;',n,'#7fe0ee');o.cd=30;P.task=null;P.mine=0;if(MP)netSend({t:'mine',i:ores.indexOf(o)});
        pop(o.x,o.y-20,'+'+n+' ore','#7fe0ee',14);say('Mined '+n+' darksteel ore.','#7fe0ee');
      }
    }else P.mine=0;
  }else if(P.target&&!P.target.dead){
    const m=P.target,rng=BASIC_RANGE[P.cls]||0,reach=rng?rng+m.r:P.r+m.r+30;
    if(inTown())P.target=null; /* v5_90 no attacking inside the hub */
    else if(m.isPl&&(!MP||!NET.peers.has(m.id)||!pvpOk(m)))P.target=null; /* v5_158 a player target is only valid while my PvP mode allows it (outside the hub) */
    else if(dist(m.x,m.y,P.x,P.y)>(m.isPl?900:650)){P.target=null}
    else if(moveToward(m.x,m.y,rng?rng*BASIC_STAND:reach-6,dt,speed)===false){/* chasing */}
    if(P.target&&dist(m.x,m.y,P.x,P.y)<=reach&&P.atkCd<=0){
      P.face=Math.atan2(m.y-P.y,m.x-P.x);
      const c=rnd()<critChance(),dd=dist(m.x,m.y,P.x,P.y);let d=Math.round(atkVal()*(.9+rnd()*.2)*(c?critMul():1)*(1+babVal()/100));
      if(rng){d=Math.max(1,Math.round(d*(1-BASIC_FALL*clamp(dd/reach,0,1))));for(let q=1;q<=6;q++)spark(P.x+(m.x-P.x)*q/6,P.y+(m.y-P.y)*q/6,BASIC_COL[P.cls],1,30,.25,2.2)} /* ranged normal attack: damage falloff + a short bolt trail */
      if(m.isPl)hitPeer(m,d,c);else hitMonster(m,d,c);
      P.qi=Math.min(maxQi(),P.qi+3);P.atkCd=atkCd();P.swing=.18;SFX('swing');fxs({k:'sw',f:+P.face.toFixed(2)});
    }
  }else if(P.mv){
    if(moveToward(P.mv.x,P.mv.y,6,dt,speed))P.mv=null;
  }else if(auto&&P.tp<=0&&inTown()&&!pvpOnly()&&curWorld!==ARENA){
    /* v5_100 auto-hunt inside the hub: attacking is blocked there, so walk out of the hub (toward the nearest monster) and fight outside. Not used in PvP. */
    P.target=null;const m0=nearest(6000),an=m0?Math.atan2(m0.y-C,m0.x-C):Math.atan2(P.y-C,P.x-C);
    moveToward(C+Math.cos(an)*(TOWN+60),C+Math.sin(an)*(TOWN+60),4,dt,speed);
  }else if(auto&&P.tp<=0){
    P.target=nearest(1000);if(!P.target&&curWorld===ARENA){let b=null,bd=1000;for(const q of foes()){const d=dist(q.x,q.y,P.x,P.y);if(d<bd){bd=d;b=q}}P.target=b}
  }
  if(P.target&&P.target.dead)P.target=null;
  if(!P.target)P.fatk=false; /* F attack mode ends when the target is gone or you walk away */
  if(P.sel&&(P.sel.dead||(P.sel.isPl&&(!MP||!NET.peers.has(P.sel.id)))))P.sel=null;

  if((auto||P.fatk||(P.target&&!P.target.dead))&&P.tp<=0){ /* v5_111 skills with AUTO lit cast in EVERY attack mode: auto-hunt, F, Space, click / double-click attack, Attack button, PvP attack and fight-back */
    const t=P.target;
    if(t&&!t.dead){
      const d=dist(t.x,t.y,P.x,P.y);
      let near=0;for(const m of (pvpOnly()?foes():mons))if(!m.dead&&dist(m.x,m.y,P.x,P.y)<120)near++;
      if(!(P.skLock>0)&&!wantsMove())for(let i=0;i<AUTO_SLOTS;i++){ /* v5_153 AUTO skills wait while you steer (keys / joystick): stop moving and they cast again */const id=EQ[i];if(id<0||!AUTOSK[i])continue;const ty=SKILLS[id].t; /* slot 1 first, then 2, 3 ... */
        const cu=clsAuto(ty,d,t,near),u=cu!==undefined?cu:ty==='heal'||ty==='mend'?P.hp<maxHp()*.5:ty==='nova'?near>=2||(d<=90&&t.boss):ty==='drain'?near>=2||(near&&P.hp<maxHp()*.8):ty==='might'?(t.boss||near>=3)&&P.bfT<=0:ty==='shadowstep'?d>120&&d<420:ty==='bladestorm'?near>=2||d<=130:ty==='smoke'?(t.boss||near>=3)&&P.vlT<=0:ty==='execute'?d<=200:ty==='siphon'?d<=170&&P.hp<maxHp()*.9:ty==='rush'?d>150&&d<380:ty==='strike'||ty==='flurry'?d<=170:ty==='cleave'?d<=200:ty==='leap'?d>170&&d<360:ty==='meteor'||ty==='chain'?d<420:d<420;
        if(u&&useSkill(i,true))break} /* first skill that really fired wins; the rest wait for the next cast */
    }
  }
  if(P.cast>0)P.cast-=dt;
  P.dcd=Math.max(0,(P.dcd||0)-dt);P.skLock=Math.max(0,(P.skLock||0)-dt);
  if(P.dashT>0){const e0=1-P.dashT/DASH_T;P.dashT-=dt;const e1=1-Math.max(0,P.dashT)/DASH_T,st=DASH_DIST*(dashEase(e1)-dashEase(e0));P.x+=P.dvx*st;P.y+=P.dvy*st;
    /* v5_142 dash animation: ghost trail left along the path (fades behind you), streak sparks flung backwards, soft landing ring */
    spark(P.x,P.y,'#bfe9ff',3,18,.5,3.6);spark(P.x,P.y,'#ffffff',1,10,.35,2.4);spark(P.x-P.dvx*18,P.y-P.dvy*18,'#7fc4ff',2,70,.3,2.2);
    if(P.dashT<=0){ring(P.x,P.y,58,'#bfe9ff');spark(P.x,P.y,'#e8f6ff',12,110,.4,3);}}
  const d=dist(P.x,P.y,C,C);
  if(d>RIM-20){P.x=C+(P.x-C)/d*(RIM-20);P.y=C+(P.y-C)/d*(RIM-20)}
  if(solidPush(P)&&P.mv){P.mvBlk=(P.mvBlk||0)+dt;if(P.mvBlk>.35){P.mv=null;P.mvBlk=0}}else P.mvBlk=0; /* v5_167 solid structures; a click-to-move that keeps pressing into a wall is cancelled */
  playerVert(dt);
  const mvd=Math.hypot(P.x-ox0,P.y-oy0);
  P.mvAmt+=((mvd>.05?1:0)-P.mvAmt)*Math.min(1,dt*10);P.anim+=mvd*.07;
  if(Math.cos(P.face)>.1)P.dir=1;else if(Math.cos(P.face)<-.1)P.dir=-1;
}
function updateMonsters(dt){
  const town=inTown();
  if(curWorld!==ARENA){
    bossWaveT-=dt;
    if(bossWaveT<=0){bossWaveT=BOSS_WAIT_MIN+rnd()*(BOSS_WAIT_MAX-BOSS_WAIT_MIN);spawnBossWave()}
    for(let i=mons.length-1;i>=0;i--){
      const m=mons[i];if(!m.boss)continue;
      if(m.dead){if((m.dieT||0)<=0)mons.splice(i,1);continue}
      if((m.life-=dt)<=0){if(P.target===m)P.target=null;say(m.name+' (Lv '+m.lvl+') has vanished.','#8d9aa2');mons.splice(i,1)}
    }
  }
  for(const m of mons){
    if(m.flash>0)m.flash-=dt;
    if(m.dead){
      m.dieT=Math.max(0,(m.dieT||0)-dt);
      m.respawn-=dt;
      if(m.respawn<=0){m.dead=false;m.hp=m.maxhp;m.x=m.hx;m.y=m.hy;m.state='idle'}
      continue;
    }
    m.cd-=dt;m.atkT=Math.max(0,(m.atkT||0)-dt);
    const dp=dist(P.x,P.y,m.x,m.y);
    if(m.state==='chase'){
      /* v5_113 bosses have a MUCH larger leash (BOSS_LEASH from home, BOSS_LOSE from you) so they cannot be dragged out and reset easily; normal monsters unchanged */
      if(P.dead>0||town||dp>(m.boss?BOSS_LOSE:MON_LOSE)||dist(m.x,m.y,m.hx,m.hy)>(m.boss?BOSS_LEASH:MON_LEASH))m.state='return';
    }else if(m.state==='idle'){
      if(P.dead<=0&&!town&&dp<m.aggro)m.state='chase';
      else{
        m.wt-=dt;
        if(m.wt<=0){m.wt=2+rnd()*3;const a=rnd()*6.28;const s=rnd()<.5?0:30;m.wx=Math.cos(a)*s;m.wy=Math.sin(a)*s}
        const nx=m.x+m.wx*dt,ny=m.y+m.wy*dt;
        if(dist(nx,ny,m.hx,m.hy)<120){m.x=nx;m.y=ny}
      }
    }
    if(m.state==='return'){
      const dx=m.hx-m.x,dy=m.hy-m.y,d=Math.hypot(dx,dy);
      if(d<8)m.state='idle';else{m.x+=dx/d*m.spd*1.4*dt;m.y+=dy/d*m.spd*1.4*dt}
      m.hp=Math.min(m.maxhp,m.hp+m.maxhp*.2*dt);
    }else if(m.state==='chase'){
      const reach=m.r+P.r+4;
      if(dp>reach){const dx=P.x-m.x,dy=P.y-m.y;m.x+=dx/dp*m.spd*dt;m.y+=dy/dp*m.spd*dt}
      else if(m.cd<=0){
        m.cd=m.boss?1.4:1.2;m.atkT=.25;
        hurtPlayer(Math.max(1,Math.round(m.atk*MON_ATK_MUL*(.85+rnd()*.3)*(1-defRedAt(defVal(),m.lvl))*monGap(m.lvl,P.lvl))),false,m.lvl,m);retaliate(m);
      }
    }
  }
}
/* ---------- v5_165 SPIRIT VISUALS ----------
   Summons used to be one tiny orbiting spark. Now every spirit is a bright, large body (wolf = head / body / tail + glowing eyes, guardian = big orb with 4 satellites, Dao clone = a tall light figure,
   sentinel = a glowing pillar) with a ground ring that pulses beneath it, and it marks its target SPIRIT_WU seconds before it strikes (line + red ring on the target).
   Other players see them too: the owner sends ONE small 'sp' effect message when the set of spirits changes (kinds, counts, seconds left); the receivers draw them locally. Purely visual. */
const SPIRIT_WU=.35,SPV={1:{r:84,w:1.1},2:{r:104,w:.5},3:{r:66,w:0},4:{r:92,w:.4}}; /* v5_183 orbit speeds roughly halved (were 2.4 / 1.1 / 0 / .9 rad/s) */
function spiritViz(o,list,dt){
  o.spvT=(o.spvT||0)-dt;if(o.spvT>0||!list.length)return;o.spvT=LOW?.05:.033;
  const cnt={},idx={};for(const q of list)cnt[q.k]=(cnt[q.k]||0)+1;
  for(const q of list){
    const k=q.k,n=cnt[k],i=idx[k]=(idx[k]||0)+1,j=i-1,v=SPV[k]||SPV[1],col=q.col||'#9fe0ff',hot=q.fz?'#ff9a7a':col;
    let x,y,an=time*v.w*(q.fz?1.5:1)+j*6.2832/n;
    if(k===3){const f=(o.face||0)+1.5708;x=o.x+Math.cos(f)*v.r;y=o.y+Math.sin(f)*v.r}
    else{const rr=v.r+Math.sin(time*2.5+j*1.7)*7;x=o.x+Math.cos(an)*rr;y=o.y+Math.sin(an)*rr}
    q.px=x;q.py=y;
    if(k===1){const d=an+1.5708,cx=Math.cos(d),cy=Math.sin(d);
      spark(x+cx*12,y+cy*12,hot,1,6,.32,7.5);spark(x,y,hot,1,6,.34,9);spark(x-cx*14,y-cy*14,hot,1,6,.3,6.5);spark(x-cx*27,y-cy*27,hot,1,8,.28,4.5);
      spark(x+cx*15,y+cy*15,'#ffffff',1,3,.26,3.2); /* eyes / bright core */
      spark(x-cx*40,y-cy*40,hot,1,10,.4,3);}
    else if(k===2){spark(x,y,hot,1,6,.34,13);spark(x,y,'#ffffff',1,3,.28,5);for(let m=0;m<4;m++){const g=time*1.6+m*1.5708;spark(x+Math.cos(g)*20,y+Math.sin(g)*20,hot,1,4,.3,4.5)}}
    else if(k===3){for(let m=0;m<4;m++)spark(x,y-m*9,m?col:'#ffffff',1,5,.3,m?8:6);spark(x,y,'#ffffff',1,4,.3,5)}
    else{spark(x,y,hot,1,5,.34,10);for(let m=0;m<4;m++){const g=m*1.5708+.785;spark(x+Math.cos(g)*11,y+Math.sin(g)*11,col,1,3,.3,5)}spark(x,y,'#ffffff',1,3,.28,3.5)}
    if(!q.rt||time>q.rt){q.rt=time+.5+j*.07;ring(x,y,k===2?36:26,hot)} /* ground ring pulsing under every spirit */
  }
}
/* tell the other players about my spirits (only when they change) */
function spiritSync(){
  if(!MP)return;
  const sig=P.spirits.map(q=>q.k+(q.fz?'f':'')).sort().join(),now=performance.now()/1000;let mx=0;for(const q of P.spirits)mx=Math.max(mx,q.t);
  if(sig===P.spSig&&!(mx>0&&now+mx>(P.spExp||0)+1.5))return;
  P.spSig=sig;P.spExp=now+mx;const a=[0,0,0,0];let c='',f=0;for(const q of P.spirits){a[q.k-1]++;if(!c)c=q.col;if(q.fz)f=1}
  fxs({k:'sp',a,t:Math.ceil(mx),c:c||'#9fe0ff',f})
}
function updateMisc(dt){
  for(let i=delayed.length-1;i>=0;i--){const q=delayed[i];q.t-=dt;if(q.t<=0){delayed.splice(i,1);q.f()}}
  /* Spirit Summoner: spirits orbit you and strike the nearest monster */
  if(P.spirits.length){
    if(P.dead>0)P.spirits.length=0;
    else for(let i=P.spirits.length-1;i>=0;i--){const sp=P.spirits[i];sp.t-=dt;sp.cd-=dt;
      if(sp.t<=0){P.spirits.splice(i,1);continue}
      if(sp.wu>0){ /* v5_165 strike warning: the spirit marks its target SPIRIT_WU seconds before the hit lands */
        sp.wu-=dt;const b=sp.tg;
        if(!b||b.dead||b.pend){sp.wu=0;sp.tg=null}
        else{if(!sp.wr||sp.wr<=0){sp.wr=.12;ring(b.x,b.y,b.r+26,'#ff5a4a');if(sp.px!==undefined)sigLine(sp.px,sp.py,b.x,b.y,sp.col,8)}sp.wr-=dt;
          if(sp.wu<=0){sp.tg=null;sd(b,sp.dmg);spark(b.x,b.y,sp.col,14,200,.4,3.4);ring(b.x,b.y,44,sp.col);spark(sp.px||P.x,sp.py||P.y,'#ffffff',8,120,.3,4)}}
        continue}
      if(sp.cd<=0&&!pvpOnly()){let b=(P.target&&!P.target.isPl&&!P.target.dead&&!P.target.pend&&dist(P.target.x,P.target.y,P.x,P.y)<sp.r)?P.target:null,bd=sp.r;if(!b)for(const m of mons){if(m.dead||m.pend)continue;const d=dist(m.x,m.y,P.x,P.y);if(d<bd){bd=d;b=m}}
        if(b){sp.cd=sp.iv;sp.tg=b;sp.wu=Math.min(SPIRIT_WU,sp.iv*.6);sp.wr=0}}}
  }
  spiritViz(P,P.spirits,dt);spiritSync();
  if(MP)for(const q of NET.peers.values())if(q.spx){if(performance.now()/1000>q.spx.e){q.spx=null;continue}if(Math.hypot(q.x-P.x,q.y-P.y)<1100)spiritViz(q,q.spx.list,dt)}
  for(let i=projs.length-1;i>=0;i--){
    const p=projs[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    spark(p.x,p.y,'#cfe8ff',1,30,.3,2.2);
    for(const m of ((p.cos||pvpOnly())?NONE:mons)){
      if(m.dead||p.hit.has(m)||dist(m.x,m.y,p.x,p.y)>m.r+14)continue;
      p.hit.add(m);const c=rnd()<critChance();
      hitMonster(m,rangedDmg(m,Math.round(p.dmg*(c?critMul():1)*(.9+rnd()*.2)),1-p.life/p.l0),c);
    }
    if(!p.cos)for(const q of foes()){
      if(p.hit.has(q)||dist(q.x,q.y,p.x,p.y)>q.r+14)continue;
      p.hit.add(q);const c=rnd()<critChance();
      hitPeer(q,Math.round(p.dmg*(c?critMul():1)*(.9+rnd()*.2)*(1-RANGE_FALL*clamp(1-p.life/p.l0,0,1))),c);
    }
    if(p.life<=0)projs.splice(i,1);
  }
  for(let i=fx.length-1;i>=0;i--){fx[i].t+=dt;if(fx[i].t>=fx[i].max)fx.splice(i,1)}
  for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.t+=dt;t.y-=28*dt;if(t.t>1)texts.splice(i,1)}
  for(let i=items.length-1;i>=0;i--){
    const it=items[i];it.t+=dt;
    const d=dist(it.x,it.y,P.x,P.y);
    if(P.dead<=0&&d<90&&it.t>.3){
      it.x+=(P.x-it.x)/d*320*dt;it.y+=(P.y-it.y)/d*320*dt;
      if(d<18){
        if(it.k==='c'){P.coins+=it.a;lootIcon('c','&#9679;',it.a,'#e3b559');pop(P.x,P.y-30,'+'+it.a,'#e3b559',12)}
        else if(it.k==='g')takeGear(it);
        else{P.ore+=it.a;lootIcon('o','&#9670;',it.a,'#7fe0ee');pop(P.x,P.y-30,'+'+it.a+' ore','#7fe0ee',12)}
        items.splice(i,1);continue;
      }
    }
    if(it.t>(it.k==='g'?900:90))items.splice(i,1);
  }
  for(const o of ores){if(o.cd>0)o.cd-=dt;else if(rnd()<dt*.8)parts.push({x:o.x+(rnd()-.5)*18,y:o.y-8,vx:0,vy:-18,life:.9,max:.9,col:'#9aefff',size:1.8})}
  if(P.mine>0&&P.task&&rnd()<dt*30)spark(P.task.x,P.task.y,'#9aefff',1,120,.35,2);
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.life-=dt;if(q.life<=0){parts.splice(i,1);continue}q.x+=q.vx*dt;q.y+=q.vy*dt;const dr=Math.pow(.04,dt);q.vx*=dr;q.vy*=dr}
  for(let i=beams.length-1;i>=0;i--){beams[i].t+=dt;if(beams[i].t>=beams[i].max)beams.splice(i,1)}
  shake*=Math.pow(.02,dt);
}

/* ---------- draw ---------- */
function circle(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill()}
function drawWorld(){
  ctx.fillStyle='#0b0e11';ctx.fillRect(0,0,VW,VH);
  const ox=-cam.x,oy=-cam.y;
  circle(C+ox,C+oy,RIM+30,'#1b1f26');
  for(let i=ZONES.length-1;i>=0;i--)circle(C+ox,C+oy,Math.min(RIM,ZONES[i].d),ZONES[i].fill);
  {ctx.save();ctx.beginPath();ctx.arc(C+ox,C+oy,RIM,0,6.2832);ctx.clip();ctx.globalCompositeOperation='multiply';ctx.fillStyle=pat2d(groundTile(),1.5,ox,oy);ctx.fillRect(0,0,VW,VH);ctx.restore()} /* v5_167 soil / grass / rock texture */
  if(curWorld===ARENA){ctx.strokeStyle='rgba(255,90,70,.85)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(C+ox,C+oy,RIM,0,6.2832);ctx.stroke()}
  // town plaza
  circle(C+ox,C+oy,TOWN,'#41413a');
  circle(C+ox,C+oy,TOWN-14,'#4b4a41');
  {ctx.save();ctx.beginPath();ctx.arc(C+ox,C+oy,TOWN-14,0,6.2832);ctx.clip();ctx.globalCompositeOperation='multiply';ctx.fillStyle=pat2d(plazaTile(),.6,ox,oy);ctx.fillRect(C+ox-TOWN,C+oy-TOWN,TOWN*2,TOWN*2);ctx.restore()} /* cobblestones */
  ctx.strokeStyle='rgba(232,224,202,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(C+ox,C+oy,TOWN-14,0,6.2832);ctx.stroke();
  ctx.strokeStyle='rgba(227,181,89,.35)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(C+ox,C+oy,TOWN,0,6.2832);ctx.stroke();
  // decorations
  const dp=W[curWorld].dp||['#16241d','#1c2f25','#4d5258','#5d636a'];for(const d of deco){
    const x=d.x+ox,y=d.y+oy;
    if(x<-40||y<-40||x>VW+40||y>VH+40)continue;
    if(d.k===0){
      ctx.fillStyle=dp[0];
      ctx.beginPath();ctx.moveTo(x,y-34*d.s);ctx.lineTo(x+15*d.s,y);ctx.lineTo(x-15*d.s,y);ctx.fill();
      ctx.fillStyle=dp[1];
      ctx.beginPath();ctx.moveTo(x,y-48*d.s);ctx.lineTo(x+11*d.s,y-18*d.s);ctx.lineTo(x-11*d.s,y-18*d.s);ctx.fill();
    }else if(d.k===1){
      ctx.fillStyle=dp[2];ctx.beginPath();ctx.ellipse(x,y,16*d.s,10*d.s,0,0,6.2832);ctx.fill();
      ctx.fillStyle=dp[3];ctx.beginPath();ctx.ellipse(x-3*d.s,y-3*d.s,9*d.s,5*d.s,0,0,6.2832);ctx.fill();
    }else{
      ctx.fillStyle='rgba(60,110,120,.55)';ctx.beginPath();ctx.ellipse(x,y,26*d.s,14*d.s,0,0,6.2832);ctx.fill();
      ctx.fillStyle='rgba(230,150,170,.8)';ctx.beginPath();ctx.arc(x-6*d.s,y-2,4*d.s,0,6.2832);ctx.fill();
    }
  }
  // v5_172 buildings (15 kinds, drawn with an upward 'extrusion' so tall ones rise up the screen)
  for(const b of bld){
    const x=b.x+ox,y=b.y+oy,ex0=Math.min(b.wh*.62,270);
    if(x<-b.hw-80||y<-b.hh-ex0-120||x>VW+b.hw+80||y>VH+b.hh+80)continue;
    drawB2(b,x,y,ex0);
  }
  // sanctum buildings
  const px=C+ox,py=C+oy;
  ctx.save();ctx.translate(px,py);ctx.scale(1.5,1.5);ctx.translate(-px,-py);
  ctx.fillStyle='#6b2a26';ctx.fillRect(px-46,py-30,92,40);
  ctx.fillStyle='#8a352f';ctx.fillRect(px-38,py-58,76,30);
  ctx.fillStyle='#e3b559';
  ctx.beginPath();ctx.moveTo(px-60,py-30);ctx.lineTo(px,py-48);ctx.lineTo(px+60,py-30);ctx.lineTo(px+50,py-24);ctx.lineTo(px,py-40);ctx.lineTo(px-50,py-24);ctx.fill();
  ctx.beginPath();ctx.moveTo(px-50,py-58);ctx.lineTo(px,py-84);ctx.lineTo(px+50,py-58);ctx.lineTo(px+40,py-52);ctx.lineTo(px,py-72);ctx.lineTo(px-40,py-52);ctx.fill();
  // forge anvil + lotus
  ctx.fillStyle='#2a2d31';ctx.fillRect(px-130,py+20,34,14);ctx.fillRect(px-122,py+34,18,12);
  ctx.fillStyle='#d9503f';circle(px-113,py+14,4,'#d9503f');
  ctx.fillStyle='#e6a0b8';
  for(let i=0;i<6;i++){const a=i*1.047;ctx.beginPath();ctx.ellipse(px+120+Math.cos(a)*9,py+30+Math.sin(a)*9,8,4,a,0,6.2832);ctx.fill()}
  circle(px+120,py+30,5,'#e3b559');
  ctx.fillStyle='#e8e0ca';ctx.font='600 11px Figtree,system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('Lotus Forge',px-113,py+62);ctx.fillText('Lotus Healer',px+120,py+56);
  ctx.restore();
  // potion merchant stall
  {const nx=NPC.x+ox,ny=NPC.y+oy;
   ctx.fillStyle='#4a3a2e';ctx.fillRect(nx-26,ny+2,52,16);
   ctx.fillStyle='#3f5a4a';ctx.fillRect(nx-6,ny-20,12,22);circle(nx,ny-26,7,'#e9c9a4');
   ctx.fillStyle='#d9b24a';ctx.beginPath();ctx.moveTo(nx-10,ny-30);ctx.lineTo(nx,ny-44);ctx.lineTo(nx+10,ny-30);ctx.fill();
   circle(nx-14,ny+2,5,'#ff5a4a');circle(nx+14,ny+2,5,'#5aa8ff');
   ctx.fillStyle='#e3b559';ctx.fillText('Potion Merchant',nx,ny+34);ctx.fillStyle='#8d9aa2';ctx.fillText('click or press N',nx,ny+47);ctx.fillStyle='#e8e0ca'}
  // ore
  for(const o of ores){
    const x=o.x+ox,y=o.y+oy;
    if(x<-30||y<-30||x>VW+30||y>VH+30)continue;
    const live=o.cd<=0;
    ctx.fillStyle=live?'#2e6f7d':'#2b3236';
    ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+12,y-2);ctx.lineTo(x+6,y+9);ctx.lineTo(x-8,y+9);ctx.lineTo(x-13,y-4);ctx.fill();
    ctx.fillStyle=live?'#7fe0ee':'#4a545a';
    ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+5,y-4);ctx.lineTo(x-5,y-2);ctx.fill();
  }
}
function drawItems(){
  const ox=-cam.x,oy=-cam.y;
  for(const it of items){
    const x=it.x+ox,y=it.y+oy+Math.sin(it.t*5)*2;
    if(it.k==='c'){circle(x,y,5,'#e3b559');circle(x,y,2.4,'#a8812c')}
    else if(it.k==='g'){
      ctx.save();ctx.globalAlpha=.28+.14*Math.sin(it.t*4);circle(x,y,19,it.col);ctx.restore();
      ctx.save();ctx.fillStyle=it.col;ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.beginPath();
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10)}
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#10161a';ctx.font='700 11px Figtree,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(GEAR.find(q=>q.k===it.slot).ic,x,y+.5);ctx.restore()}
    else{ctx.fillStyle='#7fe0ee';ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x,y+7);ctx.lineTo(x-6,y);ctx.fill()}
  }
}
function bar(x,y,w,pct,col){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-w/2,y,w,5);ctx.fillStyle=col;ctx.fillRect(x-w/2,y,w*clamp(pct,0,1),5)}
function limb(x1,y1,x2,y2,w,col){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function drawMonster(m){
  const x=m.x-cam.x,y=m.y-cam.y;
  if(x<-100||y<-120||x>VW+100||y>VH+90)return;
  if(m.lx===undefined){m.lx=m.x;m.ly=m.y;m.ph=Math.random()*6;m.mv=0;m.dir=1}
  const dd=Math.min(6,Math.hypot(m.x-m.lx,m.y-m.ly));
  m.mv+=((dd>.1?1:0)-m.mv)*.2;m.ph+=dd*.11;
  if(Math.abs(m.x-m.lx)>.05)m.dir=m.x>m.lx?1:-1;
  else if(m.state==='chase'&&!m.dead)m.dir=P.x>=m.x?1:-1;
  m.lx=m.x;m.ly=m.y;
  const st=TYPES.indexOf(m.t),sc=m.boss?(m.lvl>60?2.3:1.9):m.r/14,col=m.flash>0?'#ffffff':m.col;
  const k=m.dead?Math.max(0,(m.dieT||0)/.5):1;
  if(m.boss&&!m.dead){
    ctx.strokeStyle='rgba(227,181,89,'+(.35+.2*Math.sin(time*3))+')';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(x,y+8*sc,30*sc*.8,10*sc*.8,0,0,6.2832);ctx.stroke();
  }
  ctx.fillStyle='rgba(0,0,0,'+(.3*k)+')';ctx.beginPath();ctx.ellipse(x,y+8*sc,(st===4?10:15)*sc,5*sc,0,0,6.2832);ctx.fill();
  const bob=(st!==3&&st!==4&&st!==6)?Math.abs(Math.sin(m.ph))*2*m.mv:0;
  const lg=m.atkT>0?Math.sin((1-m.atkT/.25)*Math.PI)*5:0;
  ctx.save();
  ctx.translate(x,y-bob*sc);ctx.scale(m.dir*sc,sc*(.45+.55*k));
  ctx.globalAlpha=k;ctx.translate(lg,0);
  const mv=m.mv;
  if(st===0||st===5){
    const sw=Math.sin(m.ph)*5*mv;
    limb(-10,3,-10-sw,10,3.2,'rgba(0,0,0,.35)');limb(8,3,8+sw,10,3.2,'rgba(0,0,0,.35)');
    ctx.strokeStyle=col;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,-4);ctx.quadraticCurveTo(-20,-8,-24,-9+Math.sin(time*6+m.ph)*3);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-2,15,8,0,0,6.2832);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(1,1,11,4,0,0,6.2832);ctx.fill();
    if(st===5){
      ctx.strokeStyle='rgba(30,10,0,.6)';ctx.lineWidth=2;
      for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*4,-9);ctx.lineTo(i*4+2,-1);ctx.stroke()}
      ctx.fillStyle='rgba(255,170,60,'+(.5+.3*Math.sin(time*8))+')';
      for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-8+i*6,-9);ctx.lineTo(-6+i*6,-15-Math.sin(time*9+i)*3);ctx.lineTo(-4+i*6,-9);ctx.fill()}
    }
    limb(-6,3,-6+sw,10,3.4,col);limb(12,3,12-sw,10,3.4,col);
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(16,-6,7,5.5,-.15,0,6.2832);ctx.fill();
    ctx.beginPath();ctx.moveTo(20,-8);ctx.lineTo(28,-4);ctx.lineTo(20,-2);ctx.fill();
    ctx.beginPath();ctx.moveTo(12,-10);ctx.lineTo(14,-17);ctx.lineTo(17,-10);ctx.fill();
    circle(19,-7,1.4,'#ffdf6b');circle(27.5,-4.2,1.3,'#111');
  }else if(st===1){
    const sw=Math.sin(m.ph)*4*mv;
    limb(-2,5,-2+sw,12,4.5,'#33261c');limb(3,5,3-sw,12,4.5,'#33261c');
    limb(-5,-10,-8,-2+Math.sin(m.ph+3)*3*mv,3.5,col);
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-7,-12);ctx.lineTo(7,-12);ctx.lineTo(9,6);ctx.lineTo(-9,6);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-8,0,16,3);
    circle(1,-17,6.5,'#e0b790');
    ctx.fillStyle='#2b2118';ctx.beginPath();ctx.arc(1,-18,7.4,3.3,6.1);ctx.fill();
    ctx.fillStyle='#a33';ctx.fillRect(-4,-14,10,3);
    circle(4,-17.5,1,'#111');
    const atk=m.atkT>0,da=atk?-.1:.9+Math.sin(m.ph)*.3*mv,hx=7+(atk?6:0),hy=-7;
    limb(5,-10,hx,hy,3.5,col);
    ctx.strokeStyle='#d5dde3';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+Math.cos(da)*12,hy+Math.sin(da)*12);ctx.stroke();
  }else if(st===2||st===8){
    const sw=Math.sin(m.ph)*4*mv;
    limb(-9,4,-9-sw,11,4.5,'rgba(0,0,0,.4)');limb(10,4,10+sw,11,4.5,'rgba(0,0,0,.4)');
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-2,18,11,0,0,6.2832);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.35)';
    for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*4-2,-10);ctx.lineTo(i*4,-16);ctx.lineTo(i*4+2,-10);ctx.fill()}
    limb(-4,4,-4+sw,11,5,col);limb(14,4,14-sw,11,5,col);
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(18,0,9,8,0,0,6.2832);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(25,2,4,3.5,0,0,6.2832);ctx.fill();
    ctx.fillStyle='#f1ead6';ctx.beginPath();ctx.moveTo(22,4);ctx.lineTo(29,0);ctx.lineTo(25,6);ctx.fill();
    if(st===8){
      ctx.fillStyle='#ffe29a';ctx.beginPath();ctx.moveTo(17,-6);ctx.lineTo(24,-18);ctx.lineTo(20,-5);ctx.fill();
      ctx.fillStyle='rgba(255,200,120,'+(.5+.3*Math.sin(time*7))+')';
      for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*4-2,-10);ctx.lineTo(i*4,-20-Math.sin(time*8+i)*3);ctx.lineTo(i*4+2,-10);ctx.fill()}
    }
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(13,-6);ctx.lineTo(15,-12);ctx.lineTo(18,-6);ctx.fill();
    circle(20,-3,1.5,'#200');
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(-19,-4,3,0,5);ctx.stroke();
  }else if(st===3){
    const w=m.ph*.9+time*2,amp=3+mv*4;
    for(let i=8;i>=1;i--){
      const px=-i*6,py=Math.sin(w-i*.8)*amp,rr=7.5-i*.55;
      circle(px,py,rr,col);
      circle(px,py+rr*.3,rr*.5,'rgba(255,240,170,.35)');
      if(i%2)circle(px,py-rr*.4,rr*.35,'rgba(0,0,0,.22)');
    }
    const hy=Math.sin(w)*amp;
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(-1,hy-1,6,10,0,0,6.2832);ctx.fill();
    circle(2,hy,7.5,col);
    circle(5,hy-2.5,1.6,'#ffe066');circle(5,hy+2.5,1.6,'#ffe066');
    if(Math.sin(time*9+m.ph)>.5){
      ctx.strokeStyle='#e0403a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(9,hy);ctx.lineTo(15,hy);ctx.lineTo(18,hy-2);ctx.moveTo(15,hy);ctx.lineTo(18,hy+2);ctx.stroke();
    }
  }else if(st===7){
    const sw=Math.sin(m.ph)*4*mv;
    limb(-5,4,-5+sw,12,7,'rgba(0,0,0,.4)');limb(6,4,6-sw,12,7,col);
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-12,-18);ctx.lineTo(12,-18);ctx.lineTo(14,2);ctx.lineTo(-14,2);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.moveTo(-12,-18);ctx.lineTo(-3,-18);ctx.lineTo(-6,2);ctx.lineTo(-14,2);ctx.fill();
    circle(0,-8,4.5,'rgba(255,110,80,'+(.6+.4*Math.sin(time*3+m.ph))+')');
    circle(-13,-17,6,col);circle(13,-17,6,col);
    ctx.fillStyle=col;ctx.fillRect(-5,-28,10,9);circle(2,-24,1.6,'#ff7a5a');
    const fa=m.atkT>0?1:0;
    limb(-13,-15,-18,-4-Math.sin(m.ph+2)*2*mv,6,'rgba(0,0,0,.35)');circle(-18,-3,5,'rgba(0,0,0,.35)');
    limb(13,-15,19+fa*8,-4+fa*2+Math.sin(m.ph+2)*2*mv,6,col);circle(20+fa*8,-3+fa*2,5,col);
  }else{
    ctx.translate(0,-9+Math.sin(time*2+m.ph)*3);
    ctx.globalAlpha=k*.92;
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-8,-14);ctx.quadraticCurveTo(-14,0,-12,10);
    for(let j=0;j<=4;j++)ctx.lineTo(-12+j*6,10+((j%2)?5:0)+Math.sin(time*5+j+m.ph)*2);
    ctx.quadraticCurveTo(14,0,8,-14);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,-4,5,10,0,0,6.2832);ctx.fill();
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,-17,8,3.1,6.3);ctx.lineTo(8,-12);ctx.lineTo(-8,-12);ctx.fill();
    ctx.fillStyle='#0b0812';ctx.beginPath();ctx.ellipse(1,-16,5,5,0,0,6.2832);ctx.fill();
    circle(0,-16.5,1.5,'#e9d6ff');circle(4,-16.5,1.5,'#e9d6ff');
    const ax=18+(m.atkT>0?8:0);
    ctx.strokeStyle='rgba(233,214,255,.6)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(6,-8);ctx.quadraticCurveTo(14,-8+Math.sin(time*4)*3,ax,-6);ctx.stroke();
    circle(ax+1,-6,3,'rgba(190,150,255,.9)');
    if(st===6){
      ctx.fillStyle='rgba(220,245,255,.9)';
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*3-1.5,-23);ctx.lineTo(i*3,-30+Math.abs(i)*2);ctx.lineTo(i*3+1.5,-23);ctx.fill()}
    }
  }
  ctx.restore();
  if(m.dead)return;
  const topY=y-(m.boss?32.6*sc:26*sc);
  if(m.state==='chase'||m.hp<m.maxhp)bar(x,topY,m.boss?56:34,m.hp/m.maxhp,m.boss?'#e3b559':'#d9503f');
  ctx.fillStyle=m.lvl>P.lvl+4?'#ff8a7a':'#e8e0ca';ctx.font='600 11px Figtree,system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('Lv'+m.lvl+' '+m.name+' \u00b7 DEF '+effMonDef(m),x,topY-5);
  if(P.target===m){ctx.strokeStyle='#e3b559';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(x,y+8*sc,m.r+8,(m.r+8)*.45,0,0,6.2832);ctx.stroke();ctx.setLineDash([])}
  else if(P.sel===m){ctx.strokeStyle='#f4efe0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+8*sc,m.r+8,(m.r+8)*.45,0,0,6.2832);ctx.stroke()}
}
/* ---------- 2D look parts (hair styles, headwear, outfit extras, aura). c = canvas context already translated to the feet/hip origin, dir = -1/1 side facing, 0 = front view (wardrobe preview) ---------- */
function hexA(h,a){const n=parseInt(h.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'}
function cDot(c,x,y,r,f){c.fillStyle=f;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill()}
function cTri(c,x1,y1,x2,y2,x3,y3,f){c.fillStyle=f;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineTo(x3,y3);c.closePath();c.fill()}
function cLine(c,x1,y1,x2,y2,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function look2Back(c,S,dir,t,mv){
  const d=dir||1,sw=Math.sin(t*2)*1.4*mv-d*mv*2.4,hood=S.ot===2;
  if(hood){cDot(c,0,-20,9.4,S.robe);cDot(c,-d*2,-12.5,6,S.robe);return}
  if(S.hs===0){c.strokeStyle=S.hair;c.lineWidth=3.2;c.lineCap='round';c.beginPath();c.moveTo(-d*3,-25);c.quadraticCurveTo(-d*10+sw,-18,-d*8+sw*1.5,-8);c.stroke();cDot(c,-d*8+sw*1.5,-7.5,2.4,S.hair)}
  else if(S.hs===2){c.fillStyle=S.hair;c.beginPath();c.moveTo(-7.4,-22);c.quadraticCurveTo(-10.6+sw,-8,-7+sw*1.4,3);c.lineTo(7+sw*1.4,3);c.quadraticCurveTo(10.6+sw,-8,7.4,-22);c.closePath();c.fill()}
  else if(S.hs===6){c.strokeStyle=S.hair;c.lineWidth=3.6;c.lineCap='round';c.setLineDash([3.4,1.1]);c.beginPath();c.moveTo(-d*4,-23);c.quadraticCurveTo(-d*10+sw,-14,-d*8+sw*1.6,-2);c.stroke();c.setLineDash([]);cDot(c,-d*8+sw*1.6,-1.6,1.8,S.trim)}
}
function look2Front(c,S,dir,t,mv){look2Hair(c,S,dir,t,mv);look2Face(c,S,dir);look2Wear(c,S,dir)}
function look2Hair(c,S,dir,t,mv){
  const d=dir||1,hood=S.ot===2,hw=S.hw,flat=hw===2||hw===7||hw===10;
  if(!hood&&S.hs!==7){c.fillStyle=S.hair;c.beginPath();c.arc(0,-22,7.5,3.14,6.28);c.fill();
    if(S.hs===5){for(let i=-3;i<=3;i++)if(!flat)cTri(c,i*2.3-1.6,-26.5,i*2.3+1.6,-26.5,i*2.8,-33-(i&1?3:0)+Math.abs(i)*.8,S.hair)}
    else if(S.hs===4){if(!flat){cDot(c,-5.4,-27,3.2,S.hair);cDot(c,5.4,-27,3.2,S.hair)}}
    else if((S.hs===0||S.hs===1)&&!flat)cDot(c,-d*1,-29,3,S.hair)}
  if(hood){c.strokeStyle=S.trim;c.lineWidth=1.6;c.beginPath();c.arc(0,-20.6,8.4,3.55,5.87);c.stroke();c.fillStyle=S.robe;c.beginPath();c.arc(0,-21,8.8,3.3,6.1);c.arc(0,-21,6.6,6.1,3.3,true);c.closePath();c.fill()}
}
function look2Face(c,S,dir){
  const d=dir||1;
  if(dir)cDot(c,d*2.5,-20,1.1,'#2a1d14');else{cDot(c,-2.6,-20,1.1,'#2a1d14');cDot(c,2.6,-20,1.1,'#2a1d14')}
  if(S.ge){if(dir){cLine(c,d*2.5,-21.4,d*4.3,-22.6,.8,'#2a1d14');cLine(c,d*3.1,-18,d*3.9,-18,1.2,'#c8566a')}else{cLine(c,-2.6,-21.4,-4.4,-22.6,.8,'#2a1d14');cLine(c,2.6,-21.4,4.4,-22.6,.8,'#2a1d14');cLine(c,-1.2,-16.6,1.2,-16.6,1.2,'#c8566a')}}
}
function look2Wear(c,S,dir){
  const d=dir||1,hw=S.hw;
  /* headwear */
  const gem=mixc(S.robe,'#ffffff',.55);
  switch(hw){
    case 1:c.fillStyle=S.trim;c.fillRect(-7.2,-25.6,14.4,1.8);cDot(c,0,-24.6,1.7,gem);break;
    case 2:cTri(c,-15,-24.5,0,-37,15,-24.5,'#caa45c');c.strokeStyle='#8a6a30';c.lineWidth=1;c.beginPath();c.moveTo(-15,-24.5);c.lineTo(15,-24.5);c.stroke();break;
    case 3:c.fillStyle=S.trim;c.beginPath();c.moveTo(-7,-25);c.lineTo(-7,-33);c.lineTo(-3.5,-28);c.lineTo(0,-34);c.lineTo(3.5,-28);c.lineTo(7,-33);c.lineTo(7,-25);c.closePath();c.fill();cDot(c,0,-26.6,1.3,gem);break;
    case 4:cTri(c,-4,-26,-10,-36,-1.5,-27,'#e8dfc6');cTri(c,4,-26,10,-36,1.5,-27,'#e8dfc6');break;
    case 5:cTri(c,-7,-25,-5,-36,-.5,-26.5,S.hair);cTri(c,7,-25,5,-36,.5,-26.5,S.hair);cTri(c,-5.6,-26,-5,-32.5,-2.4,-26.8,'#f2eee2');cTri(c,5.6,-26,5,-32.5,2.4,-26.8,'#f2eee2');break;
    case 6:c.fillStyle='#f2eee2';c.beginPath();c.ellipse(-3.6,-34,2.2,7.6,-.12,0,6.2832);c.fill();c.beginPath();c.ellipse(3.6,-34,2.2,7.6,.12,0,6.2832);c.fill();c.fillStyle='#f2a5b8';c.beginPath();c.ellipse(-3.6,-33.6,1,5.4,-.12,0,6.2832);c.fill();c.beginPath();c.ellipse(3.6,-33.6,1,5.4,.12,0,6.2832);c.fill();break;
    case 7:c.fillStyle='#23232d';c.fillRect(-6.4,-30,12.8,5.4);c.fillRect(-d*1-3,-36,6,7);c.fillStyle=S.trim;c.fillRect(-6.4,-26,12.8,1);break;
    case 8:for(let i=-2;i<=2;i++)cTri(c,i*3-2,-26,i*3.8,-34-(2-Math.abs(i))*.9,i*3+2,-26,S.sash);cDot(c,0,-27.5,1.5,gem);break;
    case 9:c.fillStyle='#1d1d27';c.beginPath();c.arc(0,-20,7.05,.18,Math.PI-.18);c.closePath();c.fill();c.fillStyle=S.trim;c.fillRect(-6.6,-19.2,13.2,.8);break;
    case 10:c.fillStyle='#59606e';c.beginPath();c.arc(0,-21.5,8,3.14,6.28);c.closePath();c.fill();c.fillStyle=S.trim;c.fillRect(-1,-31,2,9);cTri(c,-7,-26,-12,-34,-5,-28,S.trim);cTri(c,7,-26,12,-34,5,-28,S.trim);break;
    case 11:for(const sx of [-1,1]){cLine(c,sx*3.6,-25.6,sx*7.4,-35,1.6,'#e8dfc6');cLine(c,sx*5.6,-30,sx*9.4,-30.6,1.3,'#e8dfc6');cLine(c,sx*6.6,-33,sx*5,-37.6,1.3,'#e8dfc6');cLine(c,sx*7.4,-35,sx*9.6,-37.4,1.3,'#e8dfc6')}break;
    case 12:for(let i=0;i<6;i++){const a=i*1.0472;cDot(c,6.4+Math.cos(a)*2.1,-25.4+Math.sin(a)*2.1,1.5,'#f2a5b8')}cDot(c,6.4,-25.4,1.4,S.trim);break;
    case 13:cTri(c,0,-26,-1.4,-23.8,0,-21.6,gem);cTri(c,0,-26,1.4,-23.8,0,-21.6,gem);break;
  }
}
function look2Outfit(c,S,dir,sway,top){
  const ot=S.ot;if(!ot||ot===2||ot===4)return;
  const plate=mixc(S.trim,'#8d96a4',.6);
  if(!top){
    if(ot===1){c.fillStyle=plate;c.fillRect(-6.4,-13,12.8,9);c.fillStyle=S.trim;c.fillRect(-6.4,-13,12.8,1.4);c.fillRect(-2.6+sway*.3,2,5.2,7);cDot(c,-9,-13,4.2,plate);cDot(c,9,-13,4.2,plate)}
    else if(ot===3){c.fillStyle=mixc(S.robe,'#ffffff',.08);c.beginPath();c.moveTo(-12,-12);c.quadraticCurveTo(-13,-17,-5,-16);c.lineTo(5,-16);c.quadraticCurveTo(13,-17,12,-12);c.quadraticCurveTo(0,-7,-12,-12);c.closePath();c.fill();c.strokeStyle=S.trim;c.lineWidth=1.3;c.beginPath();c.moveTo(-12,-12);c.quadraticCurveTo(0,-7,12,-12);c.stroke()}
    else if(ot===5){c.strokeStyle='rgba(0,0,0,.28)';c.lineWidth=.9;for(let r=0;r<5;r++)for(let k=-2;k<=2;k++){const px=k*4+(r&1)*2+sway*.3*r/5,py=-9+r*3.6;c.beginPath();c.arc(px,py,2.2,0,Math.PI);c.stroke()}cTri(c,-10,-13,-13,-22,-5,-15,S.trim);cTri(c,10,-13,13,-22,5,-15,S.trim)}
    else if(ot===6){c.fillStyle=S.sash;c.fillRect(-3.6+sway*.2,-12,7.2,20);c.fillStyle=S.trim;c.fillRect(-3.6+sway*.2,7,7.2,1.4);c.fillRect(-.5+sway*.2,-12,1,19);c.fillRect(-10,-6,20,1.2);c.fillStyle=S.sash;c.fillRect(-6,-18,12,4);c.fillStyle=S.trim;c.fillRect(-6,-18.6,12,1.1)}
  }
}
function look2Aura(c,S,x,y,time){
  const A=window.AL3D&&AL3D.AURA_CFG[S.au];if(!A||!A.g)return;
  const N=7;c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<N;i++){
    const ang=time*A.sp+i*6.2832/N,f=((time*.35*A.sp+i/N)%1),fade=A.rise?Math.sin(f*3.1416):1;
    const px=x+Math.cos(ang)*(20+Math.sin(time*1.3+i)*2.5),py=y+(A.rise>0?10-f*52:A.rise<0?-40+f*50:-14+Math.sin(time*1.5+i*1.1)*14)+Math.sin(ang)*5;
    const r=(1.6+A.sc[1]*.28)*(.4+.6*fade);c.fillStyle=hexA(A.col,(A.op||.85)*(.4+.6*fade));
    c.beginPath();
    if(A.g==='oct'){c.moveTo(px,py-r*1.5);c.lineTo(px+r,py);c.lineTo(px,py+r*1.5);c.lineTo(px-r,py)}
    else if(A.g==='cone4'){c.moveTo(px+Math.sin(time*7+i)*r,py-r*2.4);c.lineTo(px+r*.5,py);c.lineTo(px-r*.5,py)}
    else if(A.g==='plane')c.ellipse(px,py,r*1.2,r*.7,ang,0,6.2832);
    else c.arc(px,py,r,0,6.2832);
    c.closePath();c.fill();
  }
  c.restore();
}
/* ---------- 2D CLASS LOOKS: same palettes and silhouettes as the 3D class models (models3d.js, cls 1-4) ---------- */
const CLPAL=[null,{r:'#1a1824',t:'#9a6cff',s:'#4a0f66',b:'#0c0b12'},{r:'#3b4350',t:'#e0b852',s:'#8f1d2c',b:'#2a2f38'},{r:'#2a5a6c',t:'#7fe8ff',s:'#1c3a52',b:'#2a2418'},{r:'#2c3466',t:'#7ff5d0',s:'#e8e4d0',b:'#1a1c34'}],_cpm=new WeakMap();
function clsPal(S,cl){let m=_cpm.get(S);if(!m){m=[];_cpm.set(S,m)}
  if(!m[cl]){const c=CLPAL[cl]||null,A=window.AL3D,
      sc=(S.ar>0&&A)?A.ARMOR_POOL[(S.ar-1)%A.ARMOR_POOL.length]:(c?(A?A.CLS_SCHEMES[cl][0]:{r:c.r,s:c.s,b:c.b}):null),
      ac=(S.ax>0&&A)?A.ACCENTS[S.ax%A.ACCENTS.length].c:(c?c.t:null);
    m[cl]=(sc||ac)?Object.assign({},S,{robe:sc?mixc(sc.r,S.robe,cl?.13:.12):S.robe,trim:ac||S.trim,sash:sc?sc.s:S.sash,boot:sc?sc.b:S.boot}):S}return m[cl]}
let CS={robe:'#2a5a6c',trim:'#7fe8ff',sash:'#1c3a52'}; /* colours of the class being drawn (set by drawPlayerE / the avatar painter) */
/* behind the body: cloaks, scarves, quiver, shield, spirit wolf */
function clsBack(cl,dir,mv){const d=dir||1,w=Math.sin(time*9),fl=-d*(8+mv*9);ctx.lineCap='round';
  if(cl===1){ctx.strokeStyle=CS.sash;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-d*2,-13);ctx.quadraticCurveTo(fl*.6,-9+w*2,fl*1.2,-4+Math.sin(time*9+1)*3);ctx.stroke();
    ctx.fillStyle='#14111c';ctx.beginPath();ctx.moveTo(-d*2,-14);ctx.lineTo(-d*(9+mv*5),8);ctx.lineTo(-d*3,5);ctx.lineTo(-d*5,10);ctx.lineTo(d*3,5);ctx.closePath();ctx.fill()}
  else if(cl===2){ctx.fillStyle=CS.sash;ctx.beginPath();ctx.moveTo(-8,-14);ctx.lineTo(8,-14);ctx.lineTo(10+fl*.3,11);ctx.lineTo(-10+fl*.3,11);ctx.closePath();ctx.fill();
    const sx=-d*11;ctx.fillStyle='#6b7684';ctx.fillRect(sx-5,-12,10,18);ctx.strokeStyle=CS.trim;ctx.lineWidth=1.6;ctx.strokeRect(sx-5,-12,10,18);ctx.fillStyle=CS.sash;ctx.fillRect(sx-1,-9,2,12)}
  else if(cl===3){ctx.save();ctx.translate(-d*7,-9);ctx.rotate(d*.5);ctx.fillStyle='#2a2418';ctx.fillRect(-3,-7,6,14);ctx.strokeStyle=CS.trim;ctx.lineWidth=1.3;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*1.8,-7);ctx.lineTo(i*1.8-.5,-12);ctx.stroke()}ctx.restore()}
  else if(cl===4){const ga=ctx.globalAlpha;ctx.globalAlpha=ga*.6;ctx.strokeStyle=CS.trim;ctx.lineWidth=2.4;
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(-d*3,-2+i*3);ctx.quadraticCurveTo(fl*.6,2+w*2+i*3,fl*1.4,6+Math.sin(time*7+i)*3);ctx.stroke()}
    const wx=-d*21,wy=6+Math.sin(time*3)*1.5;ctx.globalAlpha=ga*.5;ctx.fillStyle='#9fe0ff';ctx.beginPath();ctx.ellipse(wx,wy,8,4.5,0,0,6.2832);ctx.fill();
    circle(wx+d*8,wy-3,3.6,'#9fe0ff');ctx.beginPath();ctx.moveTo(wx+d*6.5,wy-6);ctx.lineTo(wx+d*8,wy-10.5);ctx.lineTo(wx+d*10,wy-6);ctx.fill();
    ctx.strokeStyle='#9fe0ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx-d*8,wy-1);ctx.quadraticCurveTo(wx-d*13,wy-3,wx-d*14,wy-7+w);ctx.stroke();
    circle(wx+d*9,wy-3.6,1,'#1a1c34');ctx.globalAlpha=ga}}
/* over the head and chest */
function clsFront(cl,dir){const d=dir||1;ctx.lineCap='round';
  if(cl===1){circle(0,-20,8.3,'#1a1824');ctx.fillStyle='#1a1824';ctx.beginPath();ctx.moveTo(-d*3,-26);ctx.lineTo(-d*12,-33);ctx.lineTo(-d*7,-20);ctx.closePath();ctx.fill();
    circle(d*1.5,-20.4,1.3,'#d9b8ff');circle(d*5,-20.4,1.3,'#d9b8ff');
    for(let i=0;i<3;i++){const a=time*2+i*2.1;circle(Math.cos(a)*15,-4+Math.sin(a)*8,1.6,hexA(CS.trim,.7))}}
  else if(cl===2){circle(6.5*-1,-12,4.4,'#7d8896');circle(6.5,-12,4.4,'#7d8896');ctx.strokeStyle=CS.trim;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(-6.5,-12,4.4,3.4,5.9);ctx.arc(6.5,-12,4.4,3.4,5.9);ctx.stroke();
    ctx.strokeStyle=CS.sash;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-28);ctx.quadraticCurveTo(-d*8,-31,-d*11,-24);ctx.stroke();
    circle(0,-20,8.2,'#7d8896');ctx.strokeStyle=CS.trim;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-20,8.2,3.5,5.9);ctx.stroke();ctx.fillStyle='#ff5a4a';ctx.fillRect(d>0?-1:-7,-21.5,8,2.2)}
  else if(cl===3){ctx.strokeStyle=CS.trim;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-6,-13);ctx.lineTo(6,-3);ctx.stroke();
    ctx.fillStyle=CS.robe;ctx.beginPath();ctx.arc(0,-21.5,8,Math.PI,6.2832);ctx.closePath();ctx.fill();ctx.fillRect(-9,-22,18,2);
    ctx.strokeStyle=CS.trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-d*4,-28);ctx.quadraticCurveTo(-d*8,-33,-d*10,-36);ctx.stroke();
    circle(d*3,-20.5,2.8,'#0d2a38');ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(d*3,-20.5,2.8,0,6.2832);ctx.stroke()}
  else if(cl===4){ctx.strokeStyle=CS.sash;ctx.lineWidth=1.4;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-5,-11+i*3.2);ctx.lineTo(5,-11+i*3.2);ctx.stroke()}
    circle(0,-27.5,5,CS.sash);ctx.fillStyle=CS.sash;ctx.fillRect(-3,-25,6,3);ctx.beginPath();ctx.ellipse(d*4,-25.5,3.5,2,0,0,6.2832);ctx.fill();
    circle(-1.8,-27.8,1.2,'#1a1c34');circle(1.8,-27.8,1.2,'#1a1c34');
    const oy=-31+Math.sin(time*2.5)*2,ox=-d*15,g=ctx.createRadialGradient(ox,oy,1,ox,oy,9);g.addColorStop(0,hexA(CS.trim,.8));g.addColorStop(1,hexA(CS.trim,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(ox,oy,9,0,6.2832);ctx.fill();circle(ox,oy,3,CS.trim)}}
/* the weapon in the hand (replaces the sword) */
function clsWeapon(cl,ex,ey,sa,bl){const c=Math.cos(sa),s=Math.sin(sa);ctx.lineCap='round';
  if(cl===1){for(const o of [0,.9]){const a=sa+o,ca=Math.cos(a),sn=Math.sin(a);ctx.strokeStyle='#d9d4ee';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(ex,ey);ctx.quadraticCurveTo(ex+ca*9-sn*3,ey+sn*9+ca*3,ex+ca*17,ey+sn*17);ctx.stroke();
      ctx.strokeStyle=CS.trim;ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(ex-ca*2,ey-sn*2);ctx.lineTo(ex+ca*2,ey+sn*2);ctx.stroke()}}
  else if(cl===2){ctx.strokeStyle='#5a4630';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(ex-c*4,ey-s*4);ctx.lineTo(ex+c*(bl-4),ey+s*(bl-4));ctx.stroke();
    ctx.save();ctx.translate(ex+c*(bl-4),ey+s*(bl-4));ctx.rotate(sa);ctx.fillStyle='#7d8896';ctx.fillRect(-3,-7,9,14);ctx.strokeStyle=CS.trim;ctx.lineWidth=1.4;ctx.strokeRect(-3,-7,9,14);ctx.restore()}
  else if(cl===3){const cx=ex-c*10,cy=ey-s*10,a0=sa-.95,a1=sa+.95;ctx.strokeStyle=CS.trim;ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,16,a0,a1);ctx.stroke();
    ctx.strokeStyle='#cfe8ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+Math.cos(a0)*16,cy+Math.sin(a0)*16);ctx.lineTo(ex-c*3,ey-s*3);ctx.lineTo(cx+Math.cos(a1)*16,cy+Math.sin(a1)*16);ctx.stroke();
    ctx.strokeStyle='#e8f6ff';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(ex-c*3,ey-s*3);ctx.lineTo(ex+c*20,ey+s*20);ctx.stroke();circle(ex+c*20,ey+s*20,1.8,CS.trim)}
  else if(cl===4){const tx=ex+c*(bl+4),ty=ey+s*(bl+4);ctx.strokeStyle='#5a4630';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ex-c*8,ey-s*8);ctx.lineTo(tx,ty);ctx.stroke();
    const g=ctx.createRadialGradient(tx,ty,1,tx,ty,11);g.addColorStop(0,hexA(CS.trim,.6));g.addColorStop(1,hexA(CS.trim,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(tx,ty,11,0,6.2832);ctx.fill();circle(tx,ty,3.6,CS.trim)}}
/* ---------- FORGE GLOW 2D (v5_54): weapon + outfit glow from forge level 10; colour and size step every 10 levels (colours: AL3D.FORGE_GLOW, same as 3D) ---------- */
const fgTier=l=>l>=10?Math.min(10,Math.floor(l/10)):0;
const fgCol=t=>(window.AL3D&&AL3D.FORGE_GLOW&&AL3D.FORGE_GLOW[t])||'#cfe8ff';
function fgBody(c,x,y,t){ /* soft ring of light on the ground around the character, drawn behind the body. (x,y) = feet origin */
  if(!t)return;const col=fgCol(t),pu=.8+.2*Math.sin(time*(2+t*.5)),rx=(14+t*.8)*1.35,ry=rx*.42;
  c.save();c.translate(x,y+12);c.scale(1,ry/rx);
  const g=c.createRadialGradient(0,0,rx*.3,0,0,rx);g.addColorStop(0,hexA(col,0));g.addColorStop(.45,hexA(col,0));g.addColorStop(.7,hexA(col,Math.min(.5,(.2+.02*t)*pu*1.6)));g.addColorStop(1,hexA(col,0));
  c.fillStyle=g;c.beginPath();c.arc(0,0,rx,0,6.2832);c.fill();c.restore();
}
function fgLine(c,x1,y1,x2,y2,t){ /* soft-fade halo: stacked wide-to-narrow low-alpha strokes, no bright core, so the weapon itself stays readable */
  const col=fgCol(t),pu=.75+.25*Math.sin(time*(3+t*.6)),w0=7+t*1.3;
  for(let i=0;i<4;i++){c.strokeStyle=hexA(col,(.035+.004*t)*pu);c.lineWidth=w0*(1-i*.22);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
}
function fgOrb(c,x,y,r,t){const col=fgCol(t),pu=.8+.2*Math.sin(time*(3+t*.6)),g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,hexA(col,.3*pu));g.addColorStop(.5,hexA(col,.12*pu));g.addColorStop(1,hexA(col,0));c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill()}
/* glow along the weapon held at (ex,ey) pointing sa; cl = class (0 = Blade) */
function fgWeapon(c,cl,ex,ey,sa,bl,t){
  if(!t)return;const cs=Math.cos(sa),sn=Math.sin(sa),k=1+(t-1)*.16;
  c.save();c.lineCap='round';
  if(cl===0){fgLine(c,ex,ey,ex+cs*bl,ey+sn*bl,t);fgOrb(c,ex+cs*bl,ey+sn*bl,5+t*1.8,t)}
  else if(cl===1){for(const o of [0,.9]){const a=sa+o,ca=Math.cos(a),sa2=Math.sin(a);fgLine(c,ex,ey,ex+ca*16,ey+sa2*16,t);fgOrb(c,ex+ca*16,ey+sa2*16,4+t*1.4,t)}}
  else if(cl===2){const hx=ex+cs*(bl-4),hy=ey+sn*(bl-4);fgLine(c,ex-cs*4,ey-sn*4,hx,hy,t);fgOrb(c,hx+cs*3,hy+sn*3,9+t*1.6,t)}
  else if(cl===3){const bx=ex-cs*10,by=ey-sn*10,a0=sa-.95,a1=sa+.95,col=fgCol(t),pu=.75+.25*Math.sin(time*(3+t*.6));
    for(let i=0;i<4;i++){c.strokeStyle=hexA(col,(.035+.004*t)*pu);c.lineWidth=(7+t*1.3)*(1-i*.22);c.beginPath();c.arc(bx,by,16,a0,a1);c.stroke()}fgOrb(c,ex+cs*20,ey+sn*20,4+t*1.4,t)}
  else if(cl===4){const tx=ex+cs*(bl+4),ty=ey+sn*(bl+4);fgLine(c,ex-cs*8,ey-sn*8,tx,ty,t);fgOrb(c,tx,ty,10+t*1.8,t)}
  c.restore();
}
function drawPlayerE(Q,S){
  const cl=Q===P?P.cls:(((Q.sk|0)>>21)&7);if(cl>0&&cl<CLPAL.length){S=clsPal(S,cl);CS=S}else S=clsPal(S,0);
  const x=Q.x-cam.x,y=Q.y-cam.y,mv=Q.mvAmt,t=Q.anim,dir=Q.dir;
  const ri=Math.floor((Q.lvl-1)/10),rl=mixc(S.robe,'#ffffff',.14);
  if(Q.bfT>0){ctx.strokeStyle='rgba(255,180,80,'+(.5+.3*Math.sin(time*8))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,26,0,6.2832);ctx.stroke()}
  if(Q.sh>0){ctx.strokeStyle='rgba(143,240,196,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,32,0,6.2832);ctx.stroke()}
  const AC=(window.AL3D&&AL3D.AURA_CFG[S.au])||{ring:'#5fd3a5'};
  if((ri>0||S.au>0)&&!(Q.jz>2)){ /* v5_170 the ground ring is hidden while jumping */
    const g=ctx.createRadialGradient(x,y,6,x,y,30+Math.min(ri,12)*4);
    g.addColorStop(0,hexA(AC.ring,0));g.addColorStop(.4,hexA(AC.ring,0));g.addColorStop(.72,hexA(AC.ring,.34));g.addColorStop(1,hexA(AC.ring,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,30+Math.min(ri,12)*4,0,6.2832);ctx.fill();
  }
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(x,y+13,15,6,0,0,6.2832);ctx.fill();
  if(!(Q.jz>2))fgBody(ctx,x,y,fgTier(Q.alv|0));
  const sw=Q.swing>0?1-Q.swing/.2:0;
  const bob=Math.abs(Math.sin(t))*3*mv+Math.sin(time*2.2)*.9*(1-mv);
  const lunge=Q.swing>0?Math.sin(sw*Math.PI)*6:0;
  const sa=Q.face+(Q.swing>0?(sw-.5)*3.2:0),bl=26+Math.min(Q.wlv,15)*1.2;
  const hx=dir*7,hy=-8;
  ctx.save();
  ctx.translate(x+Math.cos(Q.face)*lunge,y-bob-(Q.jz||0)*.75+Math.sin(Q.face)*lunge*.5);
  if(Q.dead>0){ctx.globalAlpha=.55;ctx.rotate(dir*Math.min(1.4,(2.5-Q.dead)*3));ctx.translate(0,6)}
  const stride=Math.sin(t)*5*mv;
  limb(-3,6,-3+stride,13,5,S.boot);limb(3,6,3-stride,13,5,S.boot);
  circle(-3+stride,13.5,3,mixc(S.boot,'#000000',.4));circle(3-stride,13.5,3,mixc(S.boot,'#000000',.4));
  const flow=-dir*(4+mv*7);
  ctx.strokeStyle=S.sash;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-1);
  ctx.quadraticCurveTo(flow*.5,2+Math.sin(time*9)*2,flow,6+Math.sin(time*9+1)*3);ctx.stroke();
  const sway=-dir*mv*2.5+Math.sin(t*2)*mv;
  ctx.fillStyle=Q.hurt>0?'#ff9a8a':S.robe;
  ctx.beginPath();ctx.moveTo(-8,-14);ctx.quadraticCurveTo(-9,-4,-12+sway,9);ctx.lineTo(12+sway,9);ctx.quadraticCurveTo(9,-4,8,-14);ctx.closePath();ctx.fill();
  ctx.fillStyle=rl;ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(2,-14);ctx.lineTo(3+sway,9);ctx.lineTo(-3+sway,9);ctx.fill();
  ctx.fillStyle=S.sash;ctx.fillRect(-8,-3,16,3);
  ctx.fillStyle=S.trim;ctx.fillRect(-9,-14,18,3);
  const aw=S.ot===4?8:4;
  look2Outfit(ctx,S,dir,sway,0);
  limb(-dir*7,-12,-dir*10,-4+Math.sin(t+3)*3*mv,aw,S.robe);
  if(cl)clsBack(cl,dir,mv);look2Back(ctx,S,dir,t,mv);
  circle(0,-20,7,S.skin);
  if(cl){look2Hair(ctx,S,dir,t,mv);clsFront(cl,dir);look2Wear(ctx,S,dir)}else look2Front(ctx,S,dir,t,mv);
  const ex=hx+Math.cos(sa)*7,ey=hy+Math.sin(sa)*5;
  limb(dir*5,-12,ex,ey,aw,S.robe);
  if(cl)clsWeapon(cl,ex,ey,sa,bl);else{
  ctx.strokeStyle='#cfe3f0';ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.cos(sa)*bl,ey+Math.sin(sa)*bl);ctx.stroke();
  ctx.strokeStyle=S.trim;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(ex-Math.cos(sa)*2,ey-Math.sin(sa)*2);ctx.lineTo(ex+Math.cos(sa)*3,ey+Math.sin(sa)*3);ctx.stroke()}
  circle(ex,ey,2.6,S.skin);
  fgWeapon(ctx,cl,ex,ey,sa,bl,fgTier(Q.wlv|0));
  look2Outfit(ctx,S,dir,sway,1);
  ctx.restore();
  ctx.globalAlpha=1;
  if(S.au>0)look2Aura(ctx,S,x,y,time);
  if(Q.swing>0&&cl!==3){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let i=0;i<3;i++){
      ctx.strokeStyle='rgba(190,225,255,'+((.5-i*.15)*(Q.swing/.2))+')';ctx.lineWidth=7-i*2;
      ctx.beginPath();ctx.arc(x+hx,y+hy,bl-2,sa-.9+i*.15,sa-.05);ctx.stroke();
    }
    ctx.restore();
  }
  if(Q.mine>0){
    ctx.strokeStyle='#7fe0ee';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y-42,10,-1.57,-1.57+6.2832*(Q.mine/1.6));ctx.stroke();
  }
}
/* ---------- speech bubbles above heads: public chat shows over the sender, a whisper only over the sender for the receiver (and over you for the sender) ---------- */
function setBubble(Q,txt,col,wh){const n=performance.now();Q.bub={t:txt,col:col,wh:!!wh,until:n+Math.min(9000,4000+txt.length*60),lines:null}}
function drawBubble(x,y,Q){
  const b=Q.bub;if(!b)return;const now=performance.now();if(now>=b.until){Q.bub=null;return}
  ctx.save();ctx.font='600 12px Figtree,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  if(!b.lines){const MW=150,L=[];let cur='';
    for(let w of b.t.split(/\s+/)){
      while(ctx.measureText(w).width>MW){let k=w.length;while(k>1&&ctx.measureText(w.slice(0,k)).width>MW)k--;if(cur){L.push(cur);cur=''}L.push(w.slice(0,k));w=w.slice(k)}
      const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>MW&&cur){L.push(cur);cur=w}else cur=t}
    if(cur)L.push(cur);if(L.length>4){L.length=4;L[3]=L[3].replace(/.{0,2}$/,'')+'\u2026'}b.lines=L}
  const lh=15,pw=9,ph=6,tw=Math.max(...b.lines.map(l=>ctx.measureText(l).width)),w=tw+pw*2,h=b.lines.length*lh+ph*2;
  const bx=clamp(x-w/2,4,VW-w-4),by=y-h-7,r=7;
  ctx.globalAlpha=Math.min(1,(b.until-now)/500);
  ctx.beginPath();ctx.moveTo(bx+r,by);ctx.arcTo(bx+w,by,bx+w,by+h,r);ctx.arcTo(bx+w,by+h,bx,by+h,r);ctx.arcTo(bx,by+h,bx,by,r);ctx.arcTo(bx,by,bx+w,by,r);ctx.closePath();
  ctx.fillStyle='rgba(10,14,18,.84)';ctx.fill();
  ctx.lineWidth=1.5;ctx.strokeStyle=b.col;if(b.wh)ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(x-5,by+h);ctx.lineTo(x,by+h+7);ctx.lineTo(x+5,by+h);ctx.closePath();ctx.fillStyle='rgba(10,14,18,.84)';ctx.fill();
  ctx.fillStyle=b.wh?b.col:'#f3ecd8';
  b.lines.forEach((l,i)=>ctx.fillText(l,bx+w/2,by+ph+12+i*lh));
  ctx.restore();
}
function drawPlayer(){drawPlayerE(P,SK());if(P.bub)drawBubble(P.x-cam.x,P.y-cam.y-56,P)}
function drawRemote(q){
  const x=q.x-cam.x,y=q.y-cam.y;
  if(x<-90||y<-130||x>VW+90||y>VH+90)return;
  drawPlayerE(q,skinOf(q.sk));
  const ty=y-54;
  if(q.dead<=0)bar(x,ty,34,q.hp/q.mh,q.pvp?'#ff6a5a':'#5fd3a5');
  ctx.fillStyle=q.pvp?'#ff8a7a':PARTY.ids.has(q.id)?'#8ff0b0':'#bfe3ff';ctx.font='600 11px Figtree,system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText((q.pvp?'\u2694 ':'')+'Lv'+q.lvl+' '+q.name,x,ty-4);
  if(q.bub)drawBubble(x,ty-18,q);
  if(P.target===q){ctx.strokeStyle='#ff6a5a';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(x,y+8,q.r+10,(q.r+10)*.45,0,0,6.2832);ctx.stroke();ctx.setLineDash([])}
  else if(P.sel===q){ctx.strokeStyle='#ffc2b8';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+8,q.r+10,(q.r+10)*.45,0,0,6.2832);ctx.stroke()}
}
function drawFx(){
  const ox=-cam.x,oy=-cam.y;
  for(const p of projs){
    const x=p.x+ox,y=p.y+oy;
    ctx.save();ctx.translate(x,y);ctx.rotate(p.ang);
    ctx.globalAlpha=.88;ctx.fillStyle=p.col||'#cfe3f0';
    ctx.beginPath();ctx.moveTo(18,0);ctx.quadraticCurveTo(0,-16,-10,0);ctx.quadraticCurveTo(0,-6,-10,0);ctx.quadraticCurveTo(0,16,18,0);ctx.fill();
    ctx.restore();
  }
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const b of beams){
    const k=b.t/b.max,w=34*(1-k)+6,hg=320,g=ctx.createLinearGradient(0,b.y+oy-hg,0,b.y+oy);
    g.addColorStop(0,'rgba(255,215,120,0)');g.addColorStop(1,'rgba(255,225,150,'+(.7*(1-k))+')');
    ctx.fillStyle=g;ctx.fillRect(b.x+ox-w/2,b.y+oy-hg,w,hg);
  }
  for(const f of fx){
    const k=f.t/f.max;ctx.globalAlpha=1-k;
    if(f.kind==='whirl'){
      ctx.save();ctx.translate(f.x+ox,f.y+oy);ctx.rotate(k*9);
      for(let i=0;i<3;i++){
        ctx.rotate(2.0944);const rr=f.r*(.55+.4*k);
        ctx.strokeStyle='rgba(255,140,110,.9)';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,rr,0,1.5);ctx.stroke();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,rr,.2,1.3);ctx.stroke();
      }
      ctx.restore();continue;
    }
    ctx.strokeStyle=f.col;ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x+ox,f.y+oy,f.r*(.35+.65*k),0,6.2832);ctx.stroke();
  }
  for(const q of parts){
    const k=q.life/q.max;ctx.globalAlpha=Math.min(1,k*1.2);ctx.fillStyle=q.col;
    ctx.beginPath();ctx.arc(q.x+ox,q.y+oy,q.size*(.4+k*.8),0,6.2832);ctx.fill();
  }
  ctx.restore();
  ctx.textAlign='center';
  for(const t of texts){
    ctx.globalAlpha=1-t.t;ctx.font='700 '+t.size+'px Figtree,system-ui,sans-serif';
    ctx.fillStyle='#000';ctx.fillText(t.txt,t.x+ox+1,t.y+oy+1);
    ctx.fillStyle=t.col;ctx.fillText(t.txt,t.x+ox,t.y+oy);
  }
  ctx.globalAlpha=1;
  if(P.dead>0){
    ctx.fillStyle='rgba(120,20,15,.35)';ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='#e8e0ca';ctx.font='400 34px "Marcellus SC",Georgia,serif';ctx.fillText('YOU HAVE FALLEN',VW/2,VH/2);
  }
}
/* minimap: centred on you, shows a 2000-unit radius. Light blue = monsters, light red = bosses (same size as players), red = other players, gold = ore, white = you */
let MINI_R=2000,MINI_MAX=false; /* MINI_MAX: radar radius follows the current map radius (RIM) */
function drawMini(){
  const S=mm.width;mctx.clearRect(0,0,S,S);
  const MR=MINI_MAX?RIM:MINI_R,k=(S/2)/MR,cx=S/2,cy=S/2,ox=cx-P.x*k,oy=cy-P.y*k,wx=x=>ox+x*k,wy=y=>oy+y*k,R2=MR*MR;
  mctx.save();mctx.beginPath();mctx.arc(cx,cy,S/2-2,0,6.2832);mctx.clip();
  mctx.fillStyle='#12161b';mctx.fillRect(0,0,S,S);
  mctx.fillStyle='#1b1f26';mctx.beginPath();mctx.arc(wx(C),wy(C),(RIM+30)*k,0,6.2832);mctx.fill();
  ZONES.map(z=>[Math.min(RIM,z.d),z.fill]).reverse().concat([[TOWN,'#6b6a58']]).forEach(([r,c])=>{mctx.fillStyle=c;mctx.beginPath();mctx.arc(wx(C),wy(C),r*k,0,6.2832);mctx.fill()});
  const near=(x,y)=>{const dx=x-P.x,dy=y-P.y;return dx*dx+dy*dy<=R2};
  for(const o of ores)if(o.cd<=0&&near(o.x,o.y)){mctx.fillStyle='#e3b559';mctx.fillRect(wx(o.x)-2,wy(o.y)-2,4,4)}
  for(const m of mons){if(m.dead||!near(m.x,m.y))continue;if(m.boss){mctx.fillStyle='#ff9a9a';mctx.beginPath();mctx.arc(wx(m.x),wy(m.y),4.5,0,6.2832);mctx.fill()}else{mctx.fillStyle='#8fd8ff';mctx.fillRect(wx(m.x)-1.5,wy(m.y)-1.5,3,3)}}
  if(MP)for(const q of NET.peers.values()){if(!near(q.x,q.y))continue;mctx.fillStyle=PARTY.ids.has(q.id)?'#5fa8ff':'#ff3b3b';mctx.beginPath();mctx.arc(wx(q.x),wy(q.y),4.5,0,6.2832);mctx.fill()}
  mctx.save();mctx.translate(cx,cy);mctx.rotate(MODE3D&&window.THREE?Math.atan2(-Math.cos(camView.yaw),-Math.sin(camView.yaw)):P.face); /* v5_182 arrow = where the 3D camera looks (the camera orbits at (sin yaw, cos yaw) from you, so it looks along (-sin yaw, -cos yaw)); 2D mode keeps your facing */
  mctx.beginPath();mctx.moveTo(11,0);mctx.lineTo(-7,-7);mctx.lineTo(-3,0);mctx.lineTo(-7,7);mctx.closePath();
  mctx.fillStyle='#ffe9a8';mctx.fill();mctx.lineWidth=2;mctx.strokeStyle='#1a1408';mctx.stroke();mctx.restore();
  mctx.restore();
}
function drawFrame(){
  if(SV.on)return; /* v5_109 screen saver: the world is not drawn while it covers the screen (saves battery and lag); the game keeps running */
  if(MODE3D&&window.THREE&&render3D())return;
  cam.x=clamp(P.x-VW/2,C-RIM-80,C+RIM+80-VW);cam.y=clamp(P.y-VH/2,C-RIM-80,C+RIM+80-VH);
  if(VW>RIM*2+160)cam.x=C-VW/2;if(VH>RIM*2+160)cam.y=C-VH/2;
  cam.x+=(Math.random()-.5)*shake*14;cam.y+=(Math.random()-.5)*shake*14;
  drawWorld();drawItems();
  const list=mons.filter(m=>!m.dead||m.dieT>0);
  if(MP)for(const q of NET.peers.values())if(q.x>cam.x-120&&q.x<cam.x+VW+120&&q.y>cam.y-160&&q.y<cam.y+VH+120)list.push(q);
  list.sort((a,b)=>a.y-b.y);
  let drewP=false;
  for(const m of list){if(!drewP&&m.y>P.y){drawPlayer();drewP=true}if(m.isPl)drawRemote(m);else drawMonster(m)}
  if(!drewP)drawPlayer();
  if(P.mv){const x=P.mv.x-cam.x,y=P.mv.y-cam.y;ctx.strokeStyle='rgba(232,224,202,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,0,6.2832);ctx.stroke()}
  drawMist();drawLighting();drawFx();drawMotes();drawVitals();drawMini();
}


