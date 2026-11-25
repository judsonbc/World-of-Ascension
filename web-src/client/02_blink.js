/* v5_363 FLASH BLINK: every blink skill (Shadow Step, Leaping Slash, Umbral Rush, Iron Charge, Gale Step, Reaper's Verdict, Shadowless Massacre, Juggernaut Rush) no longer pops you to the new spot.
   The skill code still decides the destination and the hit at once; blinkStart(sx,sy,col) is then called at the END of the skill: it puts you back on the start point and glides you to the destination in ~.13-.22 s
   (ease in / out, so it reads as one smooth streak), and leaves a trail behind: a glowing streak, forking lightning, speed lines, smeared afterimages, a flash at both ends and a spray of sparks.
   The same trail is drawn for other players (net message 'bk') and in 3D mode (glow sprites, see fx3d.js: FXC.blk). BLK_TR = the live trails. */
const BLK_TR=[],BLK_MAX=.62;
const blkEase=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;                  /* easeInOutCubic */
function blkInv(f){let a=0,b=1;for(let i=0;i<14;i++){const m=(a+b)/2;if(blkEase(m)<f)a=m;else b=m}return(a+b)/2}
const blkDur=d=>clamp(.11+d/2300,.13,.22);
function blkMake(sx,sy,ex,ey,col,own){
  const d=Math.hypot(ex-sx,ey-sy);if(!(d>=20)||!isFinite(d))return null;
  while(BLK_TR.length>=10)BLK_TR.shift();
  const dur=blkDur(d),gh=[];for(let i=1;i<=6;i++){const f=i/7;gh.push({f,tr:blkInv(f)*dur})}
  const tr={sx,sy,ex,ey,col,own:!!own,t:0,dur,max:BLK_MAX+dur,sd:(rnd()*9999)|0,gh,ang:Math.atan2(ey-sy,ex-sx),d,hp:0,tp:0,al:1};
  BLK_TR.push(tr);
  ring(sx,sy,46,col);ring(sx,sy,84,'#ffffff');spark(sx,sy,col,16,230,.45,3);spark(sx,sy,'#ffffff',8,160,.3,2.4);spark(sx,sy,'#ffe27a',8,200,.35,2.4);
  return tr}
/* called by a blink skill AFTER it moved you to the destination (P.x / P.y) and did everything that needs the destination */
function blinkStart(sx,sy,col){
  col=/^#[0-9a-f]{6}$/i.test(col)?col:'#cfe8ff';
  const ex=P.x,ey=P.y,tr=blkMake(sx,sy,ex,ey,col,true);if(!tr)return;
  P.x=sx;P.y=sy;P.bk={sx,sy,ex,ey,t:0,dur:tr.dur,tr};
  shake=Math.max(shake,.15);
  try{fxs({k:'bk',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:col})}catch(e){}
}
let blkNetT=-9; /* time of the last 'bk' message from another player: peerBlinkFx stays quiet then (one trail, not two) */
function blinkRemote(p,col){
  if(!Array.isArray(p)||p.length<4)return;const v=p.slice(0,4).map(Number);if(v.some(q=>!isFinite(q)))return;
  col=/^#[0-9a-f]{6}$/i.test(col)?col:'#cfe8ff';blkNetT=time;blkMake(v[0],v[1],v[2],v[3],col,false)}
function blinkTick(dt){
  const b=P.bk;
  if(b){
    if(P.dead>0){P.bk=null}
    else{
      b.t+=dt;const u=Math.min(1,b.t/b.dur),p=blkEase(u),tr=b.tr,dx=Math.cos(tr.ang),dy=Math.sin(tr.ang);
      P.x=b.sx+(b.ex-b.sx)*p;P.y=b.sy+(b.ey-b.sy)*p;
      spark(P.x,P.y,tr.col,4,60,.35,3.4);spark(P.x,P.y,'#ffffff',2,40,.25,2.6);spark(P.x,P.y,'#ffe27a',2,130,.3,2.2);spark(P.x-dx*30,P.y-dy*30,tr.col,3,90,.4,2.6);
      if(u>=1){P.bk=null;P.x=b.ex;P.y=b.ey;ring(P.x,P.y,62,tr.col,'whirl');ring(P.x,P.y,104,'#ffffff');spark(P.x,P.y,tr.col,20,260,.5,3.2);spark(P.x,P.y,'#ffffff',10,200,.35,2.6);spark(P.x,P.y,'#ffe27a',10,240,.4,2.6);shake=Math.max(shake,.25)}
    }
  }
  for(let i=BLK_TR.length-1;i>=0;i--){
    const t=BLK_TR[i];t.t+=dt;if(t.t>=t.max){BLK_TR.splice(i,1);continue}
    const u=Math.min(1,t.t/t.dur);t.hp=blkEase(u);
    const tf=clamp((t.t-t.dur*.45)/(t.max-t.dur*.45),0,1);t.tp=Math.min(t.hp,Math.pow(tf,1.6));      /* the tail of the streak catches up with the head */
    t.al=1-Math.max(0,(t.t-t.dur)/(t.max-t.dur));
    if(!t.own&&u<1){const hx=t.sx+(t.ex-t.sx)*t.hp,hy=t.sy+(t.ey-t.sy)*t.hp;spark(hx,hy,t.col,3,60,.35,3.2);spark(hx,hy,'#ffffff',1,40,.25,2.4)}
  }
}
/* 2D drawing (called inside drawFx, additive blending is already on) */
function drawBlink(ox,oy){
  for(const t of BLK_TR){
    const a=t.al;if(a<=.02)continue;
    const dxp=t.ex-t.sx,dyp=t.ey-t.sy,hx=t.sx+dxp*t.hp+ox,hy=t.sy+dyp*t.hp+oy-20,tx=t.sx+dxp*t.tp+ox,ty=t.sy+dyp*t.tp+oy-20;
    const L=Math.hypot(hx-tx,hy-ty),ux=Math.cos(t.ang),uy=Math.sin(t.ang),nx=-uy,ny=ux,rg=hexRgb(t.col);
    const rr=n=>{const q=Math.sin(n*127.1+t.sd*.37)*43758.5453;return q-Math.floor(q)};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    /* smeared afterimages left on the path */
    for(const g of t.gh){
      if(t.t<g.tr)continue;const age=(t.t-g.tr)/Math.max(.05,t.max-g.tr),ga=Math.max(0,1-age*1.5)*.6;if(ga<=.02)continue;
      const gx=t.sx+dxp*g.f+ox,gy=t.sy+dyp*g.f+oy;
      for(let s=0;s<3;s++){const k=s/3,px=gx-ux*k*28,py=gy-uy*k*28;ctx.globalAlpha=ga*(1-k*.55);ctx.strokeStyle='rgba('+rg+',1)';ctx.fillStyle='rgba('+rg+',1)';
        ctx.lineWidth=16-k*5;ctx.beginPath();ctx.moveTo(px,py-8);ctx.lineTo(px,py-30);ctx.stroke();ctx.beginPath();ctx.arc(px,py-43,7.5-k*2,0,6.2832);ctx.fill()}
      ctx.globalAlpha=ga*.85;ctx.strokeStyle='#ffffff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(gx,gy-10);ctx.lineTo(gx,gy-30);ctx.stroke();
    }
    if(L>2){
      /* the streak: wide soft glow, bright body, white core */
      ctx.strokeStyle='rgba('+rg+',1)';ctx.globalAlpha=a*.28;ctx.lineWidth=36*a+8;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(hx,hy);ctx.stroke();
      ctx.globalAlpha=a*.6;ctx.lineWidth=16*a+4;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(hx,hy);ctx.stroke();
      ctx.strokeStyle='#ffffff';ctx.globalAlpha=a*.95;ctx.lineWidth=5*a+1.5;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(hx,hy);ctx.stroke();
      /* speed lines */
      for(let i=0;i<8;i++){
        const off=(rr(i*7.3+1)-.5)*70,ln=L*(.3+.55*rr(i*3.1+2)),f0=rr(i*5.7+3)*Math.max(0,1-ln/L);
        const x0=tx+(hx-tx)*f0+nx*off,y0=ty+(hy-ty)*f0+ny*off,x1=x0+(hx-tx)/L*ln,y1=y0+(hy-ty)/L*ln;
        ctx.globalAlpha=a*.7;ctx.strokeStyle=i&1?'#ffffff':'rgba('+rg+',1)';ctx.lineWidth=1.4+rr(i+9)*1.4;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
      }
      /* forking lightning around the streak: re-rolled ~30 times a second so it crackles */
      const fr=Math.floor(t.t*30),N=Math.max(4,Math.round(L/20));
      for(let b=0;b<4;b++){
        const sd=fr*97+b*31,amp=11+b*5,pts=[];
        for(let i=0;i<=N;i++){const f=i/N,env=Math.sin(f*Math.PI)*.85+.15,off=(rr(sd+i*1.7)-.5)*2*amp*env;pts.push([tx+(hx-tx)*f+nx*off,ty+(hy-ty)*f+ny*off])}
        ctx.globalAlpha=a*.85;ctx.strokeStyle='#ffe27a';ctx.lineWidth=3.2;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();
        ctx.globalAlpha=a;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.3;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();
        for(let k=0;k<2;k++){const j=1+((rr(sd+k*5.3)*(N-1))|0),q=pts[Math.min(N,j)],an=t.ang+(rr(sd+k*2.9)<.5?-1:1)*(.6+rr(sd+k)*.7),ln=18+rr(sd+k*8.1)*26;
          ctx.globalAlpha=a*.8;ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[0]+Math.cos(an)*ln*.55+(rr(sd+k*4.4)-.5)*8,q[1]+Math.sin(an)*ln*.55);ctx.lineTo(q[0]+Math.cos(an)*ln,q[1]+Math.sin(an)*ln);ctx.stroke()}
      }
    }
    /* flash at the head while it travels, and at the start point right after the cast */
    if(t.t<t.dur+.12){const k=Math.max(0,1-Math.max(0,t.t-t.dur)/.12),g=ctx.createRadialGradient(hx,hy,0,hx,hy,58);g.addColorStop(0,'rgba(255,255,255,'+(.85*k)+')');g.addColorStop(.4,'rgba('+rg+','+(.45*k)+')');g.addColorStop(1,'rgba('+rg+',0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.arc(hx,hy,58,0,6.2832);ctx.fill()}
    if(t.t<.2){const k=1-t.t/.2,sx=t.sx+ox,sy=t.sy+oy-20,g=ctx.createRadialGradient(sx,sy,0,sx,sy,50+30*(1-k));g.addColorStop(0,'rgba(255,255,255,'+(.8*k)+')');g.addColorStop(1,'rgba('+rg+',0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,80,0,6.2832);ctx.fill()}
    ctx.restore();
  }
}
