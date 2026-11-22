/* World of Ascension - extra 3D effects (v5_175). Works on Three r128 and newer.
   1) sky: shader dome (zenith / horizon gradient, sun glow, dawn+dusk colours, Milky Way band), twinkling stars, drifting clouds,
      auroras, shooting stars, lightning, and CELESTIAL BODIES THAT DIFFER ON EVERY WORLD (suns, moons, ringed planets, a black hole, a dragon's eye, a clock, a sundered sun ...)
   2) fog: per-world fog density + tint (thicker at dawn / dusk, slowly breathing) and drifting ground-mist banks
   3) glow: additive soft sprites on spells, bosses, drops, ore veins, spell rings and (at night) your hero
   4) light pillars: the level-up 'beams' that were only drawn by the 2D renderer
   No assets, no dependencies. game.js calls FX3.frame(ctx) once per frame just before rendering; if it throws, game.js switches only this layer off.
   Off switch: open the page with ?fx3=0, or run localStorage.setItem('woa_fx3','0') in the console (use '1' to turn it back on).
   Sky tuning: the per-world table WP below (index = world number, 0 = Arena, 1-15 hunting worlds). */
window.FX3=(function(){
'use strict';
let S=null;
const killed=()=>{try{return /[?&]fx3=0\b/.test(location.search)||localStorage.getItem('woa_fx3')==='0'}catch(e){return false}};
const TAU=6.2832,PI=3.14159;
const sstep=(a,b,x)=>{const t=x<a?0:x>b?1:(x-a)/(b-a);return t*t*(3-2*t)};
const clamp=(x,a,b)=>x<a?a:x>b?b:x;

/* ---------------- per-world sky profiles ---------------- */
const SUN=o=>Object.assign({k:1,sun:1,sz:.055,col:'#fff4d8',glow:'#ffd890',ext:9,gk:2.4,seed:1},o);
const MOON=o=>Object.assign({k:0,sz:.06,col:'#e8ecf4',col2:'#9aa4b4',glow:'#c8d8ff',ext:2.6,gk:4,per:240,ph:PI,em:1,z0:.3,night:1,dv:.12,seed:1},o);
const PLAN=o=>Object.assign({k:2,sz:.06,col:'#c8a878',col2:'#8a6a48',glow:'#ffe0b0',ext:2.9,gk:5,static:1,az:0,el:.5,ring:0,tilt:.3,rot:.35,seed:2},o);
const D={zen:'#2f6fc0',nzen:'#050a1c',sunCol:'#fff2d0',sunK:1,twi:'#ff8a4a',cloud:.35,cc:'#ffffff',ncc:'#242c48',gal:.8,galC:'#6a78c0',aur:0,aurA:'#38ff9a',aurB:'#8a5cff',
  stars:'#ffffff',starK:1,fogT:'#9fb0c0',fogA:.15,fogD:1,mist:.6,met:0,metC:'#ffffff',flash:0,tintS:'#ffffff',tintA:'#ffffff',bodies:[]};
const WP=[
 /* 0 Arena (Genesis Gate): the first dawn - a white-gold sun, a creation ring, golden shooting stars */
 {zen:'#5a6fb8',nzen:'#0a0820',sunCol:'#fff0c8',twi:'#ffb070',cloud:.3,cc:'#fff4e8',fogT:'#c0b8d0',fogA:.2,mist:.5,gal:1.1,galC:'#b89cff',aur:.5,aurA:'#ffd890',aurB:'#c8a0ff',met:14,metC:'#fff0c0',
  bodies:[SUN({sz:.05,col:'#fffaf0',glow:'#ffe8a0'}),PLAN({az:2.3,el:.5,sz:.075,col:'#fff0d0',col2:'#e8c890',glow:'#ffe8b0',ring:1,tilt:.26,rot:.4}),MOON({sz:.05})]},
 /* 1 Ashen Reach: mist-veiled pale sun, grey moon, small ash moon */
 {zen:'#5f7f9f',nzen:'#07101a',sunCol:'#ffe8c0',twi:'#ffa060',cloud:.65,cc:'#d9e2ea',fogT:'#a9b4bb',fogA:.35,fogD:1.2,mist:1.3,gal:.5,
  bodies:[SUN({sz:.05,op:.75}),MOON({sz:.065,col:'#d6dde6',col2:'#8c97a3'}),MOON({sz:.02,per:150,ph:1.2,col:'#b8b0a8',col2:'#706860',seed:5})]},
 /* 2 Crimson Dominion: a bloated red sun, two rust moons */
 {zen:'#5a2a38',nzen:'#14060c',sunCol:'#ff9a70',twi:'#ff5a3c',cloud:.5,cc:'#c07a70',ncc:'#3a1c28',fogT:'#8a4a44',fogA:.45,fogD:1.15,mist:.8,gal:.4,galC:'#a05070',tintS:'#ffd0b0',
  bodies:[SUN({sz:.09,col:'#ff9a78',glow:'#ff5030',gk:1.8}),MOON({sz:.04,per:190,col:'#c89070',col2:'#7a4a3a',glow:'#ff9a70',seed:3}),MOON({sz:.018,per:115,ph:2.2,col:'#d8a080',col2:'#8a5a4a',seed:8})]},
 /* 3 Starfall Expanse: silver moon, blue moon, auroras, many shooting stars */
 {zen:'#233f7a',nzen:'#030818',sunCol:'#e0e8ff',twi:'#ff9ad0',cloud:.2,cc:'#cfd8ff',fogT:'#6a7fb8',fogA:.3,fogD:.9,mist:.5,gal:1.6,galC:'#7a8cff',aur:.9,aurA:'#4affc0',aurB:'#a07aff',met:5,metC:'#cfe0ff',stars:'#d8e4ff',starK:1.8,
  bodies:[SUN({sz:.035,col:'#eef4ff',glow:'#9ab8ff'}),MOON({sz:.1,col:'#f2f5ff',col2:'#9aa8c8',glow:'#a8c0ff'}),MOON({sz:.032,per:140,ph:.4,col:'#9ac4ff',col2:'#4a6ab8',glow:'#6aa0ff',seed:4})]},
 /* 4 Ember Throne: dim orange sun, ember-ringed planet */
 {zen:'#3a1a14',nzen:'#100604',sunCol:'#ff8a3a',twi:'#ff6020',cloud:.55,cc:'#7a4a3a',ncc:'#2a1612',fogT:'#7a3a22',fogA:.5,fogD:1.2,mist:.9,gal:.3,galC:'#a05030',stars:'#ffd0a0',starK:.6,tintS:'#ffc090',
  bodies:[SUN({sz:.078,col:'#ff9048',glow:'#ff5a20',gk:1.8}),PLAN({az:3.6,el:.42,sz:.07,col:'#c0502a',col2:'#ffb060',glow:'#ff7a30',ring:.9,tilt:.3,rot:-.3})]},
 /* 5 Heavenfall Sanctum: above the clouds, golden sun, pale moon, pastel ringed world, gold auroras */
 {zen:'#5aa0e8',nzen:'#101a48',sunCol:'#fff0b0',twi:'#ffc0e0',cloud:.8,cc:'#fff8ff',ncc:'#4a4a78',fogT:'#e8dcff',fogA:.45,fogD:1.1,mist:1.5,gal:1.2,galC:'#ffe8c0',aur:.6,aurA:'#ffe08a',aurB:'#ff9ad0',
  bodies:[SUN({sz:.06,col:'#fffbe0',glow:'#ffe070'}),MOON({sz:.085,col:'#fffaf0',col2:'#d8d0e8',glow:'#fff0d0'}),PLAN({az:.8,el:.55,sz:.06,col:'#e8c8ff',col2:'#a0e0ff',glow:'#d8c8ff',ring:1,tilt:.28,rot:.5,seed:6})]},
 /* 6 Tideglass: two tide moons (pearl + coral) */
 {zen:'#1f7fb0',nzen:'#04101f',sunCol:'#fff4d0',twi:'#ff9a80',cloud:.5,cc:'#f0f8ff',fogT:'#7fb8c8',fogA:.4,fogD:1.1,mist:1.1,gal:1,galC:'#80c8ff',
  bodies:[SUN({sz:.055}),MOON({sz:.09,col:'#f6f2ff',col2:'#b8c8e8',glow:'#a0d8ff'}),MOON({sz:.03,per:130,ph:.6,col:'#ffb8c8',col2:'#d88aa0',glow:'#ff9ab8',seed:7})]},
 /* 7 Verdant Eternity: green-gold sun, a living marble moon, the World Tree's star */
 {zen:'#3a8a5a',nzen:'#04120c',sunCol:'#f0ffb0',twi:'#ffc060',cloud:.55,cc:'#eefae6',ncc:'#1c3a2c',fogT:'#6a9a6a',fogA:.45,fogD:1.15,mist:1.4,gal:.9,galC:'#70e0a0',stars:'#e0ffe8',tintS:'#f4ffd0',
  bodies:[SUN({sz:.055,col:'#f8ffc8',glow:'#d8ff80'}),MOON({sz:.1,col:'#a8e8a8',col2:'#3a8a68',glow:'#80ffb0',seed:9}),SUN({sun:0,static:1,az:1.2,el:.6,sz:.012,ext:12,col:'#e8fff0',glow:'#80ffc0',gk:2.6,seed:3})]},
 /* 8 Stormcrown: heavy overcast, a dim sun behind the cloud deck, lightning */
 {zen:'#2a3446',nzen:'#04060c',sunCol:'#c8d0e0',twi:'#9aa0c0',cloud:1,cc:'#8f98a8',ncc:'#1a2030',fogT:'#6a7486',fogA:.55,fogD:1.2,mist:1.2,flash:1,gal:.2,
  bodies:[SUN({sz:.05,op:.6,col:'#e8eef8',glow:'#b8c8e8'}),MOON({sz:.06,col:'#cfd8e8',col2:'#8a94a8',dv:.05})]},
 /* 9 Bloodmoon Necropolis: a giant blood moon that never sets */
 {zen:'#240a14',nzen:'#080208',sunCol:'#a03030',sunK:.3,twi:'#c01820',cloud:.45,cc:'#7a3040',ncc:'#2a0c18',fogT:'#6a1a24',fogA:.55,fogD:1.2,mist:1.3,gal:.6,galC:'#a02848',stars:'#ffc0c0',tintS:'#ffb0a0',tintA:'#ffd0d0',
  bodies:[SUN({sz:.03,op:.5,col:'#ff7050',glow:'#a02010'}),MOON({static:1,az:.9,el:.36,sz:.15,col:'#e84848',col2:'#8a1020',glow:'#ff2030',gk:3,lit:[.5,.35,.8],dv:1,ext:3,seed:11})]},
 /* 10 Sunforged Wastes: twin suns, no moon */
 {zen:'#4f8fd8',nzen:'#0a1028',sunCol:'#fff0b0',sunK:1.3,twi:'#ffb040',cloud:.06,cc:'#fff8e8',fogT:'#e8c88a',fogA:.5,fogD:1.05,mist:.3,gal:1.3,galC:'#ffd890',tintS:'#fff0c8',
  bodies:[SUN({sz:.075,col:'#fff6c8',glow:'#ffc040'}),SUN({da:.5,dz:-.25,sz:.03,col:'#ffffff',glow:'#a0d0ff',seed:4})]},
 /* 11 Mirrorveil Labyrinth: two mirrored moons (one upside-down) and loose shards, prism auroras */
 {zen:'#6a5aa8',nzen:'#0a0820',sunCol:'#f0e0ff',twi:'#ff98e0',cloud:.35,cc:'#f8e8ff',fogT:'#b8a8d8',fogA:.4,fogD:1,mist:.8,gal:1.1,aur:.8,aurA:'#40e0ff',aurB:'#ff50d0',
  bodies:[SUN({sz:.05}),MOON({sz:.085,col:'#f4eaff',col2:'#b0a0d8',glow:'#d0b8ff',seed:12}),MOON({sz:.085,z0:-.3,rot:PI,col:'#f4eaff',col2:'#b0a0d8',glow:'#d0b8ff',seed:12}),
   MOON({sz:.014,static:1,az:.5,el:.6,col:'#e8e0ff',col2:'#a0a0d0',seed:13,dv:1}),MOON({sz:.01,static:1,az:.62,el:.67,col:'#e8e0ff',col2:'#a0a0d0',seed:14,dv:1}),MOON({sz:.012,static:1,az:.42,el:.69,col:'#e8e0ff',col2:'#a0a0d0',seed:15,dv:1})]},
 /* 12 Voidmaw Frontier: a black hole with an accretion disk and an eclipsed star, no sun */
 {zen:'#0a0414',nzen:'#020106',sunCol:'#a060ff',sunK:0,twi:'#6a30a0',cloud:.15,cc:'#3a2458',ncc:'#140a24',fogT:'#2a1840',fogA:.6,fogD:1.2,mist:.9,gal:1.6,galC:'#8040c0',stars:'#c8b0ff',starK:.55,
  bodies:[{k:3,static:1,az:.9,el:.4,sz:.085,ext:4.2,col:'#000000',glow:'#ffa050',gk:1.4,seed:1,dv:1},{k:4,static:1,az:3.8,el:.5,sz:.035,ext:7,col:'#000000',glow:'#ff7040',gk:3,seed:2,dv:1}]},
 /* 13 Dragonbone Summit: a dragon's eye moon, a bone-white moon, ember sun */
 {zen:'#5a4a52',nzen:'#0e0a0c',sunCol:'#ffc080',twi:'#ff7030',cloud:.6,cc:'#a89890',ncc:'#2a2024',fogT:'#9a8478',fogA:.45,fogD:1.15,mist:1,gal:.7,galC:'#ff9060',tintS:'#ffd8b0',
  bodies:[SUN({sz:.06,col:'#ffd090',glow:'#ff9040'}),{k:5,static:1,az:4.4,el:.42,sz:.1,ext:3,col:'#ffb030',col2:'#ff5a10',glow:'#ff9020',gk:3.5,seed:3,dv:1},MOON({sz:.025,per:200,col:'#efe6d6',col2:'#b0a490',seed:16})]},
 /* 14 Chronos Spiral: a great broken clock, a small reversed clock, falling sand-stars */
 {zen:'#4a3f7a',nzen:'#0a0820',sunCol:'#ffe0a0',twi:'#ffb060',cloud:.4,cc:'#e8d8ff',fogT:'#9a90c0',fogA:.35,fogD:1,mist:.8,gal:1.2,galC:'#ffd890',met:12,metC:'#ffe0a0',stars:'#fff0d0',
  bodies:[SUN({sz:.045}),{k:6,static:1,az:2.2,el:.5,sz:.11,ext:2.8,col:'#ffd890',col2:'#fff4d0',glow:'#ffc060',gk:3,seed:1,dv:1},{k:6,static:1,az:.7,el:.72,sz:.04,ext:2.8,col:'#c0a0ff',col2:'#f0e0ff',glow:'#a080ff',gk:3,seed:7,dv:1,rev:1}]},
 /* 15 Heaven-Sundering Throne: one great sun split by a blazing crack, golden auroras, falling sparks */
 {zen:'#2a1a5a',nzen:'#08041c',sunCol:'#fff0c0',sunK:.5,twi:'#ff90b0',cloud:.55,cc:'#e8d0ff',ncc:'#2a1a48',fogT:'#8a70c0',fogA:.4,fogD:1.1,mist:1.1,flash:.35,gal:1.5,galC:'#c0a0ff',aur:1,aurA:'#ffd870',aurB:'#ff70c0',met:4,metC:'#ffe8a0',
  bodies:[{k:7,static:1,az:2.9,el:.55,sz:.085,ext:10,col:'#fff0c0',glow:'#ffc060',gk:2.2,seed:1,dv:1},MOON({sz:.05,col:'#e8e0ff',col2:'#a090d0',glow:'#c0b0ff'})]}
].map(p=>Object.assign({},D,p));

/* ---------------- shaders ---------------- */
const NOISE='float h2(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}\n'+ /* v5_273 sin-free hash: the old fract(sin()*43758) hash showed streaks / grid lines on phone GPUs */
 
 'float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}\n'+
 'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<OCT;i++){s+=a*vn2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}\n';
const DOME_V='varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const DOME_F=oct=>'#define OCT '+oct+'\nvarying vec3 vd;uniform vec3 top,mid,hor,sunDir,sunCol,twiCol,galC;uniform float sunK,twi,gal,night,flash;\n'+NOISE+
 'void main(){vec3 v=normalize(vd);float h=v.y;\n'+
 ' vec3 c=mix(hor,mid,smoothstep(-.02,.22,h));c=mix(c,top,smoothstep(.15,.9,h));\n'+
 ' float sd=max(dot(v,sunDir),0.);float up=smoothstep(-.14,.06,sunDir.y);\n'+
 ' c+=sunCol*(pow(sd,5.)*.16+pow(sd,40.)*.3)*sunK*up;\n'+
 ' vec2 hv=normalize(v.xz+vec2(1e-4)),sv=normalize(sunDir.xz+vec2(1e-4));\n'+
 ' float tw=twi*pow(max(dot(hv,sv),0.),2.5)*(1.-smoothstep(0.,.5,h));\n'+
 ' c=mix(c,twiCol,clamp(tw*.7,0.,1.));c+=twiCol*twi*.07*(1.-smoothstep(0.,.6,h));\n'+
 ' if(night>.05&&gal>0.){vec3 gn=normalize(vec3(.35,.85,.4));float gd=dot(v,gn);float band=exp(-gd*gd*14.);float dust=fbm(hv*1.5+vec2(v.y*6.,v.y*3.));\n'+
 '  c+=galC*band*(.15+1.1*dust*dust)*gal*night*smoothstep(.02,.25,h);}\n'+
 ' c+=vec3(.55,.65,1.)*flash*.3*smoothstep(-.1,.6,h);\n'+
 ' c+=(h2(gl_FragCoord.xy)+h2(gl_FragCoord.yx+17.3)-1.)/255.;gl_FragColor=vec4(c,1.);}'; /* v5_273 dither: no colour banding */
const CLOUD_F=oct=>'#define OCT '+oct+'\nvarying vec3 vd;uniform vec3 cc,horC,sunDir,sunCol,twiCol,aurA,aurB;uniform float cloud,t,flash,aur,night,twi;\n'+NOISE+
 'void main(){vec3 v=normalize(vd);float h=v.y;if(h<.005){gl_FragColor=vec4(0.);return;}\n'+
 ' float mA=0.;vec3 mc=cc;\n'+
 ' if(cloud>.01){vec2 q=v.xz/(h+.34)*1.5+vec2(t*.006,t*.0025);float dn=fbm(q)*.65+fbm(q*2.4+vec2(t*.012,3.1))*.35;\n'+
 '  float thr=.74-cloud*.42;mA=smoothstep(thr,thr+.17,dn);float dark=smoothstep(thr,thr+.4,dn);\n'+
 '  float sd=max(dot(v,sunDir),0.);mc=cc*(1.-.4*dark)+sunCol*pow(sd,3.)*.35*(1.-dark*.5);\n'+
 '  mc+=vec3(.6,.7,1.)*flash*(.5+.5*dn);\n'+
 '  vec2 hv=normalize(v.xz+vec2(1e-4)),sv=normalize(sunDir.xz+vec2(1e-4));\n'+
 '  mc=mix(mc,twiCol,twi*.55*pow(max(dot(hv,sv),0.),2.)*(1.-dark*.3));\n'+
 '  mc=mix(horC,mc,smoothstep(.01,.28,h));mA*=smoothstep(.005,.16,h);}\n'+
 ' float aA=0.;vec3 ac=aurA;\n'+
 ' if(aur>.01&&night>.05){float u=atan(v.z,v.x);float ah=.3+.1*sin(u*2.+t*.07)+.05*sin(u*5.-t*.11);float y=h-ah;\n'+
 '  float band=exp(-max(y,0.)*5.)*smoothstep(-.12,0.,y);float cur=.62+.38*sin(u*9.+fbm(normalize(v.xz+vec2(1e-4))*1.5+vec2(t*.1,0.))*5.+t*.4)*(.65+.35*sin(u*5.-t*.2));\n'+
 '  float fd=smoothstep(.04,.2,h)*(1.-smoothstep(.55,.85,h));aA=clamp(band*cur*fd*aur*night*1.1,0.,1.)*.75;ac=mix(aurA,aurB,smoothstep(-.15,.3,y))*(1.+.5*band);}\n'+
 ' float m=mA*.93;float a=m+aA*(1.-m);vec3 col=(mc*m+ac*aA*(1.-m))/max(a,.001);gl_FragColor=vec4(col,a);}';
const STAR_V='attribute float aS;attribute float aP;attribute vec3 aC;uniform float t,vis,pr;uniform vec3 tint;varying vec3 vc;varying float va;\n'+
 'void main(){vc=aC*tint;va=vis*(.65+.35*sin(t*(1.5+aP)+aP*40.));gl_PointSize=aS*pr;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const STAR_F='varying vec3 vc;varying float va;void main(){float d=length(gl_PointCoord-vec2(.5));float a=smoothstep(.5,.08,d);gl_FragColor=vec4(vc,a*va);}';
const BODY_V='varying vec2 vU;varying vec3 vDir;void main(){vU=uv*2.-1.;vDir=(modelMatrix*vec4(position,1.0)).xyz-cameraPosition;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
/* kinds: 0 moon  1 sun  2 planet (+rings)  3 black hole  4 eclipsed star  5 dragon eye  6 clock  7 sundered sun */
const BODY_F='varying vec2 vU;varying vec3 vDir;uniform vec3 col,col2,glow,L,horC;uniform float ext,kind,ring,tilt,op,t,seed,gk,hk,rot;\n'+
 'float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\n'+
 'float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n'+
 ' return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),\n'+
 '            mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}\n'+
 'float fb(vec3 p){return vn(p)*.55+vn(p*2.1)*.3+vn(p*4.3)*.15;}\n'+
 'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}\n'+
 'void main(){\n'+
 ' vec2 p=vU*ext;float cr=cos(rot),sr=sin(rot);p=mat2(cr,-sr,sr,cr)*p;float r=length(p);\n'+
 ' float edge=1.-smoothstep(.95,1.,r);float halo=exp(-max(r-1.,0.)*gk);float fade=1.-smoothstep(ext*.6,ext,r);\n'+
 ' vec3 oc=vec3(0.);float a=0.;\n'+
 ' if(kind<.5||(kind>1.5&&kind<2.5)||(kind>4.5&&kind<5.5)){\n'+
 '  vec3 n=vec3(p,sqrt(max(1.-r*r,0.)));float lit=smoothstep(-.08,.3,dot(n,L));vec3 sf;\n'+
 '  if(kind<.5){float f=fb(n*2.5+seed);float f2=fb(n*7.+seed*1.7);float mare=smoothstep(.45,.62,f);sf=mix(col,col2,mare*.85)*(.8+.35*f2);sf*=(pow(n.z,.25)*.3+.7)*(lit+.05);}\n'+
 '  else if(kind<2.5){float w=fb(vec3(n.x*1.5,n.y*6.,n.z)+seed)*2.5;float band=.5+.5*sin(n.y*14.+w*3.);sf=mix(col,col2,band)*(lit*.95+.06)*(.75+.25*n.z);}\n'+
 '  else{float ang=atan(p.y,p.x);float st=fb(vec3(normalize(p+vec2(1e-4))*1.5,r*6.+seed));vec3 base=mix(col,col2,clamp(r*r*.8+st*.45,0.,1.));\n'+
 '   float e=p.x*p.x/.022+p.y*p.y/.62;base=mix(base,vec3(0.),1.-smoothstep(.9,1.1,e));sf=base*(.55+.45*n.z)+glow*.1;}\n'+
 '  float ha=(1.-edge)*halo*(kind>4.5?.55:.4);oc=sf*edge+glow*(1.-edge);a=edge+(1.-edge)*ha;\n'+
 '  if(kind>1.5&&kind<2.5&&ring>.01){vec2 q=vec2(p.x,p.y/tilt);float rr=length(q);float rm=smoothstep(1.35,1.42,rr)*(1.-smoothstep(2.1,2.18,rr));\n'+
 '   float vis=(r>1.||p.y<0.)?1.:0.;float bd=.55+.45*sin(rr*38.+seed);float ra=rm*vis*.88*ring*(.7+.3*bd);oc=mix(oc,mix(col2,col,bd)*1.05,ra);a=max(a,ra);}\n'+
 ' }else if(kind<1.5||kind>6.5){\n'+ /* sun / sundered sun (additive) */
 '  float d=1.-smoothstep(.97,1.,r);vec3 core=mix(col,vec3(1.),.5)*(1.1+.5*sqrt(max(1.-r*r,0.)));float ang=atan(p.y,p.x);\n'+
 '  float rays=(pow(abs(cos(ang*5.+t*.05+seed)),24.)*.18+pow(abs(cos(ang*9.-t*.04)),40.)*.1)*exp(-(r-1.)*1.1)*step(1.,r);\n'+
 '  vec3 g=glow*(.6*halo+.12/(1.+r*r*.12)+rays);oc=core*d+g;\n'+
 '  if(kind>6.5){vec2 nr=vec2(cos(.6),sin(.6));float pe=dot(p,nr),al=dot(p,vec2(-nr.y,nr.x));\n'+
 '   oc=core*d*(.45+.55*smoothstep(.03,.08,abs(pe)))+g;oc+=vec3(1.,.9,.6)*exp(-pe*pe*256.)*exp(-abs(al)*.3)*2.2*(1.+.3*sin(t*.8+al*3.));}\n'+
 '  oc*=fade;\n'+
 ' }else if(kind<3.5){\n'+ /* black hole */
 '  float d=1.-smoothstep(.98,1.,r);vec2 q=vec2(p.x,p.y/.22);float rr=length(q);\n'+
 '  float dm=smoothstep(1.3,1.55,rr)*(1.-smoothstep(3.2,3.6,rr));float dop=.55+.45*clamp(-q.x/max(rr,.001),-1.,1.);\n'+
 '  vec3 dc=mix(vec3(1.,.95,.8),glow,smoothstep(1.4,3.4,rr))*dop*(1.9-rr*.35);float vis=(r>1.||p.y<0.)?1.:0.;\n'+
 '  float arc=smoothstep(1.02,1.12,r)*(1.-smoothstep(1.35,1.8,r))*step(0.,p.y)*.7;\n'+
 '  float pr=exp(-(r-1.04)*(r-1.04)*324.)*1.6;\n'+
 '  oc=vec3(0.);a=d;float dA=dm*vis;oc=mix(oc,dc,dA);a=max(a,dA);\n'+
 '  oc+=glow*(pr+arc*dop);a=max(a,clamp(pr+arc*.8,0.,1.));\n'+
 '  float ha=(1.-d)*.18*exp(-max(r-1.,0.)*1.2);oc=mix(glow,oc,clamp(a*2.,0.,1.));a=max(a,ha);a*=fade;\n'+
 ' }else if(kind<4.5){\n'+ /* eclipsed star */
 '  float d=1.-smoothstep(.97,1.,r);float ang=atan(p.y,p.x);\n'+
 '  float cor=exp(-max(r-1.,0.)*gk)*1.2+pow(abs(cos(ang*4.+seed)),6.)*exp(-max(r-1.,0.)*1.1)*.5+exp(-(r-1.02)*(r-1.02)*1600.)*1.5;\n'+
 '  cor*=step(.99,r);oc=mix(glow*(1.+cor*.5),vec3(0.),d);a=clamp(d+(1.-d)*cor,0.,1.)*fade;\n'+
 ' }else{\n'+ /* clock */
 '  float d=1.-smoothstep(.97,1.,r);float ang=atan(p.y,p.x);float rim=exp(-(r-.93)*(r-.93)*900.);\n'+
 '  float tk=abs(fract(ang/(6.2832/12.))-.5)*2.;float ticks=smoothstep(.9,.97,tk)*smoothstep(.72,.78,r)*(1.-smoothstep(.88,.9,r));\n'+
 '  float sg=ring>.5?-1.:1.;float ah=sg*(t*.012+seed),am=sg*(-t*.09+sin(t*.5)*.6+seed*2.);\n'+
 '  float hh=1.-smoothstep(.02,.045,seg(p,vec2(0.),vec2(sin(ah),cos(ah))*.5));float mh=1.-smoothstep(.012,.03,seg(p,vec2(0.),vec2(sin(am),cos(am))*.8));\n'+
 '  float ctr=1.-smoothstep(.04,.06,r);float mk=clamp(rim+ticks+hh+mh+ctr,0.,1.);\n'+
 '  vec3 face=col*(.45+.2*fb(vec3(p*2.,seed)));oc=mix(face,col2,mk);a=d*(.32+.68*mk)+(1.-d)*halo*.3;a*=fade;oc=mix(glow,oc,d);\n'+
 ' }\n'+
 ' if(kind<1.5&&kind>.5||kind>6.5){float lm=max(oc.r,max(oc.g,oc.b));vec3 hn=horC/max(max(horC.r,max(horC.g,horC.b)),.001);oc=mix(oc,hn*lm,hk);}else oc=mix(oc,horC,hk);\n'+
 ' float hzc=smoothstep(-.006,.012,normalize(vDir).y); /* v5_177 clip at the sky horizon: bodies set and rise AT the horizon, never sink into the ground */\n'+
 ' if(kind<1.5&&kind>.5||kind>6.5)gl_FragColor=vec4(oc*op*hzc,1.);else gl_FragColor=vec4(oc,a*op*hzc*(1.-hk*.4)*(1.-smoothstep(ext*.8,ext,r)));}';
const MET_V='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const MET_F='varying vec2 vU;uniform vec3 col;uniform float op;void main(){float a=pow(vU.x,2.5)*(1.-abs(vU.y*2.-1.));gl_FragColor=vec4(col,a*op);}';

/* ---------------- textures ---------------- */
function glowTex(T){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
function beamTex(T){const c=document.createElement('canvas');c.width=16;c.height=128;const g=c.getContext('2d');
  let v=g.createLinearGradient(0,0,0,128);v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=v;g.fillRect(0,0,16,128);
  g.globalCompositeOperation='destination-in';let h=g.createLinearGradient(0,0,16,0);h.addColorStop(0,'rgba(0,0,0,0)');h.addColorStop(.5,'rgba(0,0,0,1)');h.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=h;g.fillRect(0,0,16,128);return new T.CanvasTexture(c)}
function mistTex(T){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<9;i++){const x=34+rnd()*60,y=40+rnd()*48,r=22+rnd()*26,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(255,255,255,.42)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,128,128)}
  g.globalCompositeOperation='destination-in';const m=g.createRadialGradient(64,64,0,64,64,64);m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(.7,'rgba(0,0,0,.8)');m.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=m;g.fillRect(0,0,128,128);return new T.CanvasTexture(c)}

/* ---------------- build ---------------- */
function C3(hex){let c=S.cc[hex];if(!c)c=S.cc[hex]=new S.T.Color(hex);return c}
function uc(v){return {value:v}}
function build(c){
  const T=c.THREE,sc=c.T3.sc,LOW=c.LOW,oct=LOW?3:4;
  S={T,sc,n:LOW?10:36,pool:[],bm:[],cc:{},world:-1,bodies:[],mist:[],met:[],hor:new T.Color(),top:new T.Color(),mid:new T.Color(),tmp:new T.Color(),tmp2:new T.Color(),ccol:new T.Color(),
     sunDir:new T.Vector3(0,1,0),dirV:new T.Vector3(),nV:new T.Vector3(),rV:new T.Vector3(),uV:new T.Vector3(),mat:new T.Matrix4(),UP:new T.Vector3(0,1,0),
     lastT:0,nf:5,fl:0,fq:[],white:new T.Color(1,1,1),mr:7};
  const sky=new T.Group();sky.renderOrder=-1000;
  const U={top:uc(S.top),mid:uc(S.mid),hor:uc(S.hor),sunDir:uc(S.sunDir),sunCol:uc(new T.Color()),twiCol:uc(new T.Color()),galC:uc(new T.Color()),sunK:uc(1),twi:uc(0),gal:uc(.8),night:uc(0),flash:uc(0)};
  const dome=new T.Mesh(new T.SphereGeometry(1,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,fog:false,uniforms:U,vertexShader:DOME_V,fragmentShader:DOME_F(oct)}));
  dome.renderOrder=-1000;dome.frustumCulled=false;sky.add(dome);S.dome=dome;S.U=U;
  /* stars: sizes, twinkle phase and colour tints vary */
  const N=LOW?110:260,pa=new Float32Array(N*3),sa=new Float32Array(N),ph=new Float32Array(N),ca=new Float32Array(N*3);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<N;i++){const a=rnd()*TAU,y=.03+Math.pow(rnd(),.8)*.95,r=Math.sqrt(1-y*y)*.98;pa[i*3]=Math.cos(a)*r;pa[i*3+1]=y*.98;pa[i*3+2]=Math.sin(a)*r;
    sa[i]=rnd()<.1?3.4:rnd()<.35?2.4:1.5;ph[i]=rnd();const w=rnd();ca[i*3]=.8+.2*w;ca[i*3+1]=.85+.1*w;ca[i*3+2]=1-.25*w*(rnd()<.3?1:0)}
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(pa,3));sg.setAttribute('aS',new T.BufferAttribute(sa,1));sg.setAttribute('aP',new T.BufferAttribute(ph,1));sg.setAttribute('aC',new T.BufferAttribute(ca,3));
  S.SU={t:uc(0),vis:uc(0),pr:uc(1),tint:uc(new T.Color())};
  S.starM=new T.ShaderMaterial({uniforms:S.SU,vertexShader:STAR_V,fragmentShader:STAR_F,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,fog:false});
  const stars=new T.Points(sg,S.starM);stars.renderOrder=-999;stars.frustumCulled=false;sky.add(stars);S.stars=stars;
  /* clouds + aurora layer (drawn after the celestial bodies so clouds pass in front of them) */
  const CU={cc:uc(S.ccol),horC:uc(S.hor),sunDir:uc(S.sunDir),sunCol:U.sunCol,twiCol:U.twiCol,aurA:uc(new T.Color()),aurB:uc(new T.Color()),cloud:uc(.3),t:uc(0),flash:uc(0),aur:uc(0),night:uc(0),twi:uc(0)};
  const cl=new T.Mesh(new T.SphereGeometry(.97,32,16),new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,depthTest:true,fog:false,uniforms:CU,vertexShader:DOME_V,fragmentShader:CLOUD_F(oct)}));
  cl.renderOrder=-900;cl.frustumCulled=false;sky.add(cl);S.cl=cl;S.CU=CU;
  sky.scale.setScalar(6000);sc.add(sky);S.sky=sky;
  S.pg=new T.PlaneGeometry(2,2);
  /* shooting stars */
  S.mg=new T.PlaneGeometry(2,2);
  for(let i=0;i<3;i++){const m=new T.Mesh(S.mg,new T.ShaderMaterial({uniforms:{col:uc(new T.Color()),op:uc(0)},vertexShader:MET_V,fragmentShader:MET_F,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,fog:false}));
    m.visible=false;m.frustumCulled=false;m.renderOrder=-950;m.userData={on:false,t0:0,dur:1,d0:new T.Vector3(),tg:new T.Vector3()};sky.add(m);S.met.push(m)}
  /* ground mist */
  S.mt=mistTex(T);
  for(let i=0;i<(LOW?8:18);i++){const m=new T.Sprite(new T.SpriteMaterial({map:S.mt,transparent:true,depthWrite:false,fog:false,opacity:0}));m.visible=false;m.frustumCulled=false;
    m.userData={x:0,z:0,s:500+rnd()*600,sp:.6+rnd()*.8,o:.5+rnd()*.5,init:false};sc.add(m);S.mist.push(m)}
  /* glow sprites + light pillars */
  S.gt=glowTex(T);S.bt=beamTex(T);
  const bg=new T.PlaneGeometry(1,1).translate(0,.5,0);S.bg=bg;
  for(let i=0;i<4;i++){const m=new T.Mesh(bg,new T.MeshBasicMaterial({map:S.bt,color:0xffe19a,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));m.visible=false;m.frustumCulled=false;sc.add(m);S.bm.push(m)}
}
function sprite(){const T=S.T,m=new T.Sprite(new T.SpriteMaterial({map:S.gt,color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.visible=false;m.userData.c='';S.sc.add(m);S.pool.push(m);return m}

/* (re)create the celestial bodies for a world */
function setWorld(wi){
  const T=S.T;for(const m of S.bodies){S.sky.remove(m);m.material.dispose()}S.bodies=[];S.world=wi;
  const P=WP[wi]||WP[1];
  P.bodies.forEach((b,i)=>{b=Object.assign({k:0,ext:2.6,gk:4,seed:1,op:1,em:1,z0:.3,per:240,ph:PI,dv:1,ring:0,tilt:.3,rot:0},b);
    const u={col:uc(C3(b.col)),col2:uc(C3(b.col2||b.col)),glow:uc(C3(b.glow||b.col)),L:uc(new T.Vector3(.6,.3,.7)),horC:uc(S.hor),ext:uc(b.ext),kind:uc(b.k),ring:uc(b.k===6?(b.rev?1:0):b.ring),tilt:uc(b.tilt),
      op:uc(1),t:uc(0),seed:uc(b.seed),gk:uc(b.gk),hk:uc(0),rot:uc(b.rot)};
    const add=b.k===1||b.k===7;
    const m=new T.Mesh(S.pg,new T.ShaderMaterial({uniforms:u,vertexShader:BODY_V,fragmentShader:BODY_F,transparent:true,depthWrite:false,depthTest:true,fog:false,blending:add?T.AdditiveBlending:T.NormalBlending}));
    m.renderOrder=-990+i;m.frustumCulled=false;m.userData={b,u};S.sky.add(m);S.bodies.push(m)});
  for(const m of S.mist)m.userData.init=false;
  for(const m of S.met)m.visible=false,m.userData.on=false;
  S.nm=2+Math.random()*(P.met||5);
}

function sunAngle(time){return ((time/240+.5)%1)*TAU-1.5708}

function frame(c){
  if(S===null){if(killed()){S=false;return}build(c)}
  if(S===false)return;
  const T=S.T,sc=S.sc,T3=c.T3,P=c.P,C=c.C,gh=c.gh3,dl=c.dl,night=1-dl,cam=T3.cam,time=c.time||0,LOW=c.LOW;
  const wi=(c.world>=0&&c.world<WP.length)?c.world:1;if(S.world!==wi)setWorld(wi);
  const W=WP[wi];
  const now=performance.now(),dt=S.lastT?Math.min(.1,(now-S.lastT)/1000):.016;S.lastT=now;
  if(S.sky.parent!==sc)sc.add(S.sky);
  S.sky.position.copy(cam.position);
  /* lightning (and the sundered throne's flickers) */
  if(W.flash>0){if(now>S.nf){S.fl=1;S.fq=[now+130+Math.random()*120];S.nf=now+(3000+Math.random()*7000)/W.flash}
    if(S.fq.length&&now>S.fq[0]){S.fl=.75;S.fq.length=0}}
  S.fl=Math.max(0,S.fl-dt*3.4);const fl=S.fl*(W.flash>0?1:0);
  /* sun direction + twilight */
  const sa=sunAngle(time),sy=Math.sin(sa);S.sunDir.set(Math.cos(sa),sy,.3).normalize();
  const twi=clamp(1-Math.abs(S.sunDir.y+.03)*3.3,0,1);
  /* fog: per-world tint, density breathes slowly and thickens at dawn / dusk; fog colour (= the horizon colour the sky dome ends in) */
  const lum=.45+.55*dl,fg=sc.fog,f=S.tmp;f.copy(fg.color);
  f.lerp(S.tmp2.copy(C3(W.fogT)).multiplyScalar(lum),W.fogA);
  f.lerp(S.tmp2.copy(C3(W.twi)).multiplyScalar(.7*lum),twi*.18);f.lerp(S.white,fl*.4);
  fg.color.copy(f);S.hor.copy(f);
  fg.density=.0007*W.fogD*(1+.35*twi)*(1+.1*Math.sin(time*.07)+.05*Math.sin(time*.19+1.3));
  /* scene light tint + lightning light */
  T3.sun.color.set(0xffffff).lerp(C3(W.tintS),.45).lerp(C3(W.twi),twi*.3);T3.amb.color.set(0xffffff).lerp(C3(W.tintA),.35);
  if(fl>0){const k=c.LK||1;T3.amb.intensity+=fl*.9*k;T3.sun.intensity+=fl*.5*k}
  /* sky dome colours */
  S.top.copy(C3(W.nzen)).lerp(C3(W.zen),dl);S.mid.copy(S.hor).lerp(S.top,.55);
  const U=S.U;U.sunCol.value.copy(C3(W.sunCol));U.twiCol.value.copy(C3(W.twi));U.galC.value.copy(C3(W.galC));
  U.sunK.value=W.sunK;U.twi.value=twi*(W.sunK>.05?1:.35);U.gal.value=W.gal;const nG=sstep(.3,.9,night);U.night.value=nG;U.flash.value=fl;
  const CU=S.CU;S.ccol.copy(C3(W.ncc)).lerp(C3(W.cc),dl);CU.cloud.value=W.cloud;CU.t.value=time;CU.flash.value=fl;CU.aur.value=W.aur;CU.night.value=nG;CU.twi.value=U.twi.value;
  CU.aurA.value.copy(C3(W.aurA));CU.aurB.value.copy(C3(W.aurB));
  /* stars */
  const SU=S.SU;SU.t.value=time;SU.vis.value=Math.min(1,Math.max(0,night-.3)*1.5)*Math.min(1.4,W.starK);SU.pr.value=T3.r&&T3.r.getPixelRatio?T3.r.getPixelRatio():1;SU.tint.value.copy(C3(W.stars));
  /* celestial bodies */
  const dv=S.dirV,nV=S.nV,rV=S.rV,uV=S.uV,mat=S.mat;
  for(const m of S.bodies){
    const b=m.userData.b,u=m.userData.u;
    if(b.sun){const a2=sa+(b.da||0);dv.set(Math.cos(a2),Math.sin(a2),.3+(b.dz||0)).normalize()}
    else if(b.static){const ce=Math.cos(b.el);dv.set(ce*Math.cos(b.az),Math.sin(b.el),ce*Math.sin(b.az))}
    else{const am=time/b.per*TAU+b.ph;dv.set(Math.cos(am),Math.sin(am)*b.em,b.z0).normalize()}
    if(dv.y<-(b.sun&&!b.static?.125:b.sz*1.4)){m.visible=false;continue}
    m.visible=true;m.position.copy(dv).multiplyScalar(.87);
    nV.copy(dv).negate();rV.crossVectors(S.UP,nV);if(rV.lengthSq()<1e-4)rV.set(1,0,0);rV.normalize();uV.crossVectors(nV,rV);
    mat.makeBasis(rV,uV,nV);m.quaternion.setFromRotationMatrix(mat);m.scale.setScalar(.87*b.sz*b.ext);
    if(b.lit)u.L.value.set(b.lit[0],b.lit[1],b.lit[2]).normalize();else u.L.value.set(S.sunDir.dot(rV),S.sunDir.dot(uV),S.sunDir.dot(nV)).normalize();
    let v=1;if(b.sun&&!b.static)v=sstep(-.12,.04,dv.y);else if(b.night){const nn=clamp((night-.1)/.6,0,1);v=b.dv+(1-b.dv)*nn}
    const sunK=b.k===1||b.k===7,hz=sunK?1:sstep(-b.sz*.6,.1,dv.y);
    u.op.value=b.op*v*hz;u.hk.value=(1-sstep(0,.32,dv.y))*(sunK?.45:.75);u.t.value=time;
  }
  /* shooting stars */
  if(W.met>0){S.nm-=dt;if(S.nm<=0&&night>.25){const m=S.met.find(q=>!q.userData.on);if(m){const d=m.userData;d.on=true;d.t0=time;d.dur=.7+Math.random()*.6;
      const az=Math.random()*TAU,el=.35+Math.random()*.6,ce=Math.cos(el);d.d0.set(ce*Math.cos(az),Math.sin(el),ce*Math.sin(az));
      d.tg.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).cross(d.d0);if(d.tg.y>0)d.tg.negate();d.tg.normalize();m.material.uniforms.col.value.copy(C3(W.metC))}
    S.nm=(W.met*(.5+Math.random())) }}
  for(const m of S.met){const d=m.userData;if(!d.on){m.visible=false;continue}
    const age=(time-d.t0)/d.dur;if(age>=1||age<0){d.on=false;m.visible=false;continue}
    const sp=.55*age*d.dur,len=.11;dv.copy(d.d0).addScaledVector(d.tg,sp).normalize();
    rV.copy(d.tg).addScaledVector(dv,-d.tg.dot(dv)).normalize();nV.copy(dv).negate();uV.crossVectors(nV,rV);mat.makeBasis(rV,uV,nV);m.quaternion.setFromRotationMatrix(mat);
    m.position.copy(dv).multiplyScalar(.9).addScaledVector(rV,-len*.45);m.scale.set(.9*len*.5,.9*.0035,1);m.visible=true;m.material.uniforms.op.value=Math.sin(Math.PI*age)}
  /* ground mist banks: big soft low sprites drifting with the wind, fading out near the camera and at the edge of the ring */
  {const MR=LOW?1500:2300,act=Math.round(S.mist.length*clamp(W.mist/1.1+.2,0,1)),wx=Math.cos(time*.003+1)*14,wz=Math.sin(time*.003+1)*9;
    S.tmp2.copy(S.hor).multiplyScalar(1.12).lerp(S.white,.1);
    for(let i=0;i<S.mist.length;i++){const m=S.mist[i],d=m.userData;if(i>=act){m.visible=false;continue}
      const px=P.x-C,pz=P.y-C;
      if(!d.init){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*MR;d.x=px+Math.cos(a)*r;d.z=pz+Math.sin(a)*r;d.init=true}
      d.x+=wx*dt*d.sp;d.z+=wz*dt*d.sp;let dd=Math.hypot(d.x-px,d.z-pz);
      if(dd>MR){const a=Math.random()*TAU,r=MR*(.4+.55*Math.random());d.x=px+Math.cos(a)*r;d.z=pz+Math.sin(a)*r;dd=r;m.visible=false;continue}
      const cd=Math.hypot(d.x-cam.position.x,d.z-cam.position.z),op=d.o*clamp(W.mist,0,1.6)*.2*(1-sstep(MR*.65,MR,dd))*sstep(300,700,cd)*(.6+.4*dl);
      if(op<.01){m.visible=false;continue}
      const h=d.s*.3;m.visible=true;m.scale.set(d.s,h,1);m.position.set(d.x,gh(d.x+C,d.z+C)+h*.4+8,d.z);m.material.opacity=op;m.material.color.copy(S.tmp2)}}
  /* glows */
  let n=0;const lim=S.n,R=LOW?700:1100;
  const put=(x,y,z,size,col,op)=>{if(n>=lim||op<.03)return;const s=S.pool[n]||sprite();n++;s.visible=true;s.position.set(x,y,z);s.scale.set(size,size,1);
    if(s.userData.c!==col){s.userData.c=col;s.material.color.set(col)}s.material.opacity=op>1?1:op};
  const near=(o)=>Math.abs(o.x-P.x)<R&&Math.abs(o.y-P.y)<R;
  for(const p of c.projs){if(near(p))put(p.x-C,gh(p.x,p.y)+22,p.y-C,90,p.col||'#b4dcff',.6)}
  for(const m of c.mons){if(m.boss&&!m.dead&&near(m))put(m.x-C,gh(m.x,m.y)+(m.r||30)*1.1,m.y-C,(m.r||30)*6,'#ff5a3c',.22+.18*night)}
  if(!LOW){
    for(const it of c.items){if(near(it)){const g=it.k==='g';put(it.x-C,gh(it.x,it.y)+14,it.y-C,g?64:38,g?'#ffeaaa':it.k==='c'?'#ffd25a':'#78e6f5',(g?.55:.4)+.25*night)}}
    for(const o of c.ores){if(o.cd<=0&&near(o))put(o.x-C,gh(o.x,o.y)+20,o.y-C,80,'#6ee6f5',.18+.4*night)}
    let k=0;for(const f of c.fx){if(k++>=4)break;const q=Math.min(1,f.t/f.max);put(f.x-C,gh(f.x,f.y)+10,f.y-C,Math.max(40,f.r*1.3),f.col||'#fff',(1-q)*.4)}
  }
  put(P.x-C,gh(P.x,P.y)+30+(P.jz||0),P.y-C,170,'#ffbe6e',.35*night);
  for(let i=n;i<S.pool.length;i++)S.pool[i].visible=false;
  /* light pillars (level-up 'beams'), turned to face the camera */
  let b=0;
  for(const q of c.beams){if(b>=S.bm.length)break;const m=S.bm[b++],k=Math.min(1,q.t/q.max);
    m.visible=true;m.position.set(q.x-C,gh(q.x,q.y),q.y-C);m.rotation.y=Math.atan2(cam.position.x-m.position.x,cam.position.z-m.position.z);
    m.scale.set((34*(1-k)+6)*1.4,320,1);m.material.opacity=.7*(1-k)}
  for(;b<S.bm.length;b++)S.bm[b].visible=false;
}
function dispose(c){
  if(!S)return;try{const sc=S.sc;sc.remove(S.sky);for(const s of S.pool){sc.remove(s);s.material.dispose()}for(const m of S.bm){sc.remove(m);m.material.dispose()}
    for(const m of S.mist){sc.remove(m);m.material.dispose()}for(const m of S.bodies)m.material.dispose();for(const m of S.met)m.material.dispose();
    S.dome.geometry.dispose();S.dome.material.dispose();S.cl.geometry.dispose();S.cl.material.dispose();S.stars.geometry.dispose();S.starM.dispose();
    S.pg.dispose();S.mg.dispose();S.gt.dispose();S.bt.dispose();S.mt.dispose();S.bg.dispose()}catch(e){}
  S=false;
}
return {frame:frame,dispose:dispose};
})();
