(function(){
'use strict';
/* v5_217: the browser's right-click menu is disabled everywhere on the page (capture phase, so it also covers overlays, chat, and the login screen). It only cancels the default menu: the game's own right-click handlers (PvP select/attack, camera drag) still run. To allow the menu again, delete this line. */
document.addEventListener('contextmenu',e=>e.preventDefault(),true);
const $=id=>document.getElementById(id);
const LK=window.T3_LIGHT_K||1; /* v5_173 light-intensity factor: 1 on Three r128 (default), PI on r155+ (set by three-compat.js) so a newer Three.js looks the same */
const stage=$('stage'),cv=$('game'),mm=$('mm'),mctx=mm.getContext('2d');let ctx=cv.getContext('2d');
let VW=800,VH=600;
/* PHONE PERFORMANCE MODE: auto-on for touch devices. Override: open the page with ?hq=1 (full quality) or ?lq=1 (force low). */
const PHONE=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);if(PHONE)document.documentElement.classList.add('phone');
/* v5_103 PERFORMANCE MODE (Bag > Options): auto = decide by device (as before), low / medium = lightweight 3D on any device, high = full quality. Saved in this browser; changing it reloads the page. */
const PERF=(()=>{try{const v=localStorage.getItem('alperf');return v==='vlow'||v==='low'||v==='med'||v==='high'?v:'auto'}catch(e){return 'auto'}})();
const LOW=(()=>{const q=location.search;if(/[?&]hq=1/.test(q))return false;if(/[?&]lq=1/.test(q))return true;if(PERF==='high')return false;if(PERF==='vlow'||PERF==='low'||PERF==='med')return true;return matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)})();
/* quality knobs: lv = starting / maximum render-scale step (index into PRS), parts = max spark particles, rings = max effect rings, mon = monster draw-range factor,
   mini = minimap redraw every N frames, peers = max other players drawn, aa = antialiasing, terr = terrain mesh detail. 'auto' / 'high' keep the previous values. */
const PQ=PERF==='vlow'?{lv:0,rs:.5,parts:60,rings:6,mon:.55,mini:12,peers:2,aa:false,terr:70,lock:true}:PERF==='low'?{lv:0,parts:150,rings:12,mon:.75,mini:6,peers:4,aa:false,terr:100,lock:true}:PERF==='med'?{lv:1,parts:300,rings:24,mon:.9,mini:4,peers:6,aa:false,terr:130,lock:true}:{lv:3,parts:350,rings:40,mon:1,mini:4,peers:6,aa:true,terr:150,lock:false};
function resize(){
  const d=LOW?Math.min(1.5,Math.max(1,window.devicePixelRatio||1)):Math.min(2,window.devicePixelRatio||1);
  VW=stage.clientWidth;VH=stage.clientHeight;
  cv.width=Math.round(VW*d);cv.height=Math.round(VH*d);
  cv.style.width='100%';cv.style.height='100%';
  ctx.setTransform(d,0,0,d,0,0);
}
window.addEventListener('resize',resize);resize();
/* iOS Safari reports stale sizes right after rotating (the resize event fires before layout settles), which left the canvas at the old aspect and squashed the picture. Re-measure on every signal that can follow a rotation. */
function resizeSoon(){resize();if(window.fitHud)fitHud();[60,200,500,1000].forEach(t=>setTimeout(()=>{resize();if(window.fitHud)fitHud()},t))}
window.addEventListener('orientationchange',resizeSoon);
try{screen.orientation&&screen.orientation.addEventListener('change',resizeSoon)}catch(e){}
try{window.visualViewport&&window.visualViewport.addEventListener('resize',()=>{resize();if(window.fitHud)fitHud()})}catch(e){}
try{if(window.ResizeObserver)new ResizeObserver(()=>{if(stage.clientWidth!==VW||stage.clientHeight!==VH)resize()}).observe(stage)}catch(e){}

/* ---------- constants ---------- */
/* MAP_K = map size multiplier (linear). Must equal mapK in game.go. Monsters, ore and scenery scale with it too. */
const RING_MONS=[300,400,500,600,700,800,900,1000,300]; /* monsters per ring 1-9; must equal ringMons in game.go */
const MAP_K=5,WORLD=6400*MAP_K,C=WORLD/2,TOWN=345,MAXLV=1000,FORGE_MAX=100;
let RIM=3080*MAP_K; /* current map radius: the Colosseum swaps in ARENA_R */
const NW=16,ARENA=0,ARENA_R=2250; /* World 0 (Arena) is the PvP arena, worlds 1-15 are the hunting worlds; keep equal to arenaWi / arenaR in game.go */
const WORLDS=[
 {n:'Ashen Reach',hub:'Lotus Sanctum',lo:1,hi:50,acc:'#e3b559',blurb:'Mist, bandits and the first rim.',
  z:['Mistfall Meadow','Hollow Pass','Stoneback Ridge','Jadewater Marsh','The Ashen Rim','Cinderfall Dunes','Frostveil Peaks','Obsidian Abyss','Celestial Ruin'],
  f:['#2f3d2e','#35382a','#3a3629','#233a35','#2a2638','#4a2c22','#2a3d4d','#1d1b25','#3a2f4a'],
  m:['Mist Wolf','Hill Bandit','Stone Boar','Jade Serpent','Ashen Wraith','Flame Tiger','Frost Revenant','Abyss Titan','Void Qilin'],
  c:['#8fa3b3','#b5835a','#a89a7c','#3fae7a','#8a6fc4','#e0742f','#9fd4f2','#6a5f78','#c9a8ff'],
  b:[['Mist Matriarch','#cfe3f0'],['Bandit King Rho','#d08a4a'],['Stonebreaker Gor','#c9b78a'],['The Hollow Emperor','#a98cf0']],bt:[0,1,2,4]},
 {n:'Crimson Dominion',hub:'Jade Citadel',lo:51,hi:100,acc:'#ff7a5a',blurb:'Warlords and blood-soaked marshes.',
  z:['Rustleaf Gorge','Bloodmoss Hollow','Warlord Road','Scarlet Marsh','Ironbone Fields','Smoldering Plain','Ashen Glacier','Ruin of Kings','Throne of Embers'],
  f:['#3d2a2a','#432d27','#46352a','#3a2a32','#342a2a','#4f2a1f','#3a3440','#241c22','#4a2630'],
  m:['Rust Wolf','Crimson Raider','Ironhide Boar','Blood Serpent','Grave Specter','Magma Tiger','Rime Wraith','Siege Golem','Dread Qilin'],
  c:['#b3705a','#c4503c','#8e6a52','#b8362f','#b07acb','#ff6a2a','#8fb6d6','#7a5a5a','#e08aa8'],
  b:[['Rustfang Alpha','#d9835e'],['Warlord Vask','#e0553c'],['Ironhide Matriarch','#a07a5a'],['The Crimson Regent','#ff7a8a']],bt:[0,1,2,8]},
 {n:'Starfall Expanse',hub:'Skyfall Bastion',lo:101,hi:150,acc:'#7fb6ff',blurb:'Moonlit plains under a falling sky.',
  z:['Moonlit Reach','Silvergrass Vale','Dreaming Lake','Starlit Cairns','Comet Barrens','Aurora Steppe','Nebula Cliffs','Voidglass Desert','Heart of Stars'],
  f:['#1f2f45','#223a4a','#1e3b45','#26304f','#2b2c4f','#1f4a4a','#33305a','#17142a','#3a3a66'],
  m:['Star Wolf','Night Assassin','Cairn Boar','Comet Serpent','Dream Wraith','Aurora Tiger','Glass Revenant','Cosmic Titan','Starborn Qilin'],
  c:['#9fc4ff','#6a7fb8','#8aa0c0','#6fe0ff','#b79cff','#6ff0c0','#c0d8ff','#7a78b0','#ffe9a8'],
  b:[['Moonfang','#cfe0ff'],['Silent Lotus Blade','#8a9cff'],['Cairn-Eater','#9ab4d6'],['The Starfall Empress','#fff0b0']],bt:[0,1,7,8]},
 {n:'Ember Throne',hub:'Starforge Haven',lo:151,hi:200,acc:'#ff9a3c',blurb:'Lava deltas and the molten crater.',
  z:['Cooling Shore','Slagfield','Lava Delta','Brimstone Wood','Cinder Highlands','Molten Crater','Black Glass Lake','Ashfall Citadel','The Ember Throne'],
  f:['#3a2a22','#4a2a1c','#5a2a18','#3a2a1f','#46301f','#602512','#221a1a','#2c1f24','#5a1f1a'],
  m:['Ash Hound','Slag Brigand','Basalt Boar','Magma Serpent','Cinder Specter','Inferno Tiger','Obsidian Revenant','Forge Colossus','Phoenix Qilin'],
  c:['#9a8a80','#c0763a','#6b5a52','#ff6a2a','#d9a07a','#ff8a2a','#4a4658','#8a4a3a','#ffb04a'],
  b:[['Hellhound Prime','#ff9a5a'],['Slagmaster Orrin','#e0762a'],['Basalt Behemoth','#8a6a5a'],['The Ember Sovereign','#ffb04a']],bt:[0,1,7,8]},
 {n:'Heavenfall Sanctum',hub:'Eternity Gate',lo:201,hi:300,acc:'#e8d9ff',blurb:'The summit realm above the clouds.',
  z:['Cloudstep Garden','Jade Terraces','Sunlit Colonnade','Gilded Lake','Moonwell Plateau','Thunder Spire','Dao Library Ruins','Rift of Ages','The Eternal Throne'],
  f:['#3a4a5a','#3a5a52','#5a5a46','#3a4a66','#44445f','#4a3a66','#2f2a44','#1a1426','#5a4a70'],
  m:['Cloud Wolf','Heaven Warden','Gilded Boar','Dao Serpent','Karma Wraith','Thunder Tiger','Time Revenant','Celestial Titan','Eternal Qilin'],
  c:['#dfe9f5','#e0c068','#d8c48a','#8ae0d0','#c8b0f0','#ffe05a','#a0a8ff','#e8e0ff','#ffffff'],
  b:[['Cloudfang Sovereign','#eaf2ff'],['Warden of Nine Heavens','#ffe08a'],['Celestial Colossus','#d6c8ff'],['The Eternal Emperor','#ffffff']],bt:[0,1,7,8]}];
const W=WORLDS;let curWorld=1;
{const hs=(h,s,l)=>'hsl('+((h+360)%360)+','+s+'%,'+l+'%)',N=['Wolf','Raider','Boar','Serpent','Wraith','Tiger','Revenant','Colossus','Qilin'],sp=t=>t.split(',');
[['Tideglass Archipelago','Pearlspire Port',301,190,'Brine and drowned temples.','Shellglass Shore,Kelp Maze,Coral Citadel,Stormwake Strait,Drowned Temple,Leviathan Trench,Abyssal Garden,Sunken Hall,The Tidal Heart','Brine,Corsair,Reef,Kelp,Drowned,Stormray,Pearl,Leviathan,Tideborn','Brinefang Alpha,Admiral Vael,Reef Behemoth,The Tidal Sovereign'],
['Verdant Eternity','Rootheart Grove',401,125,'Primeval forest and the World Tree.','Seedling Glade,Mossback Hollow,Canopy Bridges,Venom Bloom Fen,Elder Root Maze,Spore Cathedral,Heartwood Citadel,Withering Gate,World Tree Crown','Thorn,Woodland,Rootback,Vine,Blight,Bloom,Heartwood,Elder,Worldtree','Thornfang Prime,Warden Sylvara,Elder Rootmother,The Worldtree Avatar'],
['Stormcrown Dominion','Tempest Keep',501,255,'Thunder peaks above the clouds.','Thunderhead Moor,Static Plains,Rumbling Tors,Lightning Fields,Cyclone Ridge,Tempest Citadel,Skyforge Peaks,Eye of the Storm,Crown of Thunder','Gale,Storm,Thunderhide,Bolt,Static,Tempest,Cloudsplit,Skyforge,Stormborn','Galefang Prime,Stormlord Aeran,Thunderhide Titan,The Stormcrown Emperor'],
['Bloodmoon Necropolis','Crimson Vigil',601,350,'Crypts under a red moon.','Ashen Cemetery,Weeping Crypts,Bone Orchard,Bloodmoon Lake,Ossuary Fields,Wailing Cathedral,Coffin Citadel,Hollow Throne,Heart of the Bloodmoon','Grave,Crypt,Bonetusk,Gravewyrm,Banshee,Nightmare,Lich,Ossuary,Bloodmoon','Gravefang Prime,Crypt King Mortrex,Ossuary Behemoth,The Bloodmoon Sovereign'],
['Sunforged Wastes','Golden Bastion',701,42,'Endless gilded dunes.','Gilded Dunes,Brass Canyons,Mirage Flats,Sunken Oasis,Glass Dune Sea,Solar Obelisks,Pharaoh Rise,Sunscar Citadel,The Sun Throne','Dune,Sandstorm,Sunhide,Sand,Mirage,Solar,Mummified,Obelisk,Sunborn','Duneripper Prime,Sultan Khaldar,Obelisk Behemoth,The Sun Emperor'],
['Mirrorveil Labyrinth','Looking-Glass Haven',801,310,'Shards, echoes and false skies.','Shardlight Court,Reflecting Pools,Echo Corridors,Glass Orchard,Illusion Steppe,Prism Cathedral,Hall of Selves,Shattered Sky,The Mirror Throne','Shard,Mirage,Prism,Glass,Echo,Kaleido,Reflection,Prism,Mirrorborn','Shardfang Prime,The Hundred-Faced Blade,Prism Behemoth,The Mirror Emperor'],
['Arena','Genesis Gate',901,215,'Where all cultivation began.','First Dawn Shore,Primordial Mist,Chaos Meadows,Creation Forge,Rift of Origin,Pillars of Law,Library of Fates,Edge of Nothing,The Dao Origin','Chaos,Fate,Primordial,Law,Fate,Origin,Eon,Genesis,Dao','Chaosfang Prime,Fatebreaker Zhen,Primordial Behemoth,The Dao Origin'],
['Voidmaw Frontier','Hollowstar Bastion',1001,275,'The edge where the world is eaten.','Fraying Shore,Hollow Fields,Maw Gate,Starless Marsh,Gravity Wells,Eclipse Citadel,Devoured Spire,Event Horizon,The Voidmaw','Void,Hollow,Maw,Null,Eclipse,Gravity,Devourer,Horizon,Voidborn','Voidfang Prime,Maw Warden Kael,Hollow Behemoth,The Voidmaw Sovereign'],
['Dragonbone Summit','Wyrmrest Keep',1101,8,'Peaks built from the bones of elder dragons.','Scaleglade Foothills,Wyrmbone Pass,Fangtooth Ridge,Cinderwing Vale,Skull Terraces,Dragonfire Spine,Roost of Ages,Ashen Maw,The Dragon Throne','Wyrm,Drake,Fangtusk,Basilisk,Dragonshade,Pyrefang,Scaleguard,Elder,Draconic','Wyrmfang Prime,Dragonlord Ashkar,Elder Bone Behemoth,The Dragon Emperor'],
['Chronos Spiral','Hourglass Citadel',1201,50,'Broken time folds over itself.','Ticking Meadow,Sandfall Steps,Clockwork Bazaar,Paradox Garden,Echo of Hours,Gear Cathedral,Fractured Epoch,Stillness Gate,The Final Hour','Epoch,Clockwork,Paradox,Sandfall,Chrono,Temporal,Aeon,Hourglass,Timeborn','Epochfang Prime,Timeweaver Ixen,Clockwork Behemoth,The Chronos Sovereign'],
['Heaven-Sundering Throne','Apex Ascendancy',1301,340,'Beyond the summit, where gods are tested.','Gate of Trials,Shattered Clouds,Godfall Steps,Judgement Plain,Sundered Pillars,Tribulation Core,Throne Approach,Heavenfall Rift,The Sundering Throne','Tribulation,Judge,Godhide,Sunder,Wrath,Ascendant,Heavensplit,Empyrean,Godborn','Sunderfang Prime,Tribulation Lord Zeph,Godhide Behemoth,The Heaven Sundering Emperor']
].forEach(([n,hub,lo,h,blurb,z,pr,b])=>{pr=sp(pr);WORLDS.push({n,hub,lo,hi:lo+99,acc:hs(h,70,70),blurb,z:sp(z),
 f:pr.map((_,k)=>hs(h+k*5-20,30,[19,20,21,18,17,16,16,10,14][k])),m:pr.map((p,k)=>p+' '+N[k]),
 c:pr.map((_,k)=>hs(h+[0,25,-20,40,-40,15,60,-60,30][k],55,[66,60,58,62,72,60,76,64,80][k])),
 b:sp(b).map((nm,k)=>[nm,hs(h+[0,20,-15,10][k],65,[72,66,64,84][k])]),bt:[0,1,7,8],dp:[hs(h,30,13),hs(h,30,18),hs(h,10,30),hs(h,10,38)]})})}
Object.assign(WORLDS[11],{arena:true,blurb:'THE PvP ARENA: players only, no monsters. Your PvP mode decides who you can attack (open the PvP panel: Lawful, Hostile or Carnal). Death costs nothing.'});
WORLDS.unshift(WORLDS.splice(11,1)[0]); /* the Arena is World 0, the hunting worlds are Worlds 1-15 */
const REALMS=['Mortal Body','Qi Gathering','Foundation','Golden Core','Nascent Soul','Soul Severing','Void Walker','Dao Seeker','Immortal Ascendant','Celestial Sovereign','Heavenly Monarch','Primordial Lord','Eon Walker','Chaos Sage','Karma Emperor','Samsara Breaker','Origin Seeker','Dao Paragon','Genesis Ascendant','Eternal Emperor'];
const ZD=[600,900,1200,1450,1800,2200,2600,3000,9999].map(d=>d<9999?d*MAP_K:d);
let ZONES=[];
const BASE=[{r:13,s:78},{r:14,s:70},{r:17,s:66},{r:15,s:86},{r:15,s:92},{r:17,s:98},{r:16,s:96},{r:24,s:72},{r:21,s:112}];
let TYPES=[];
let BOSSES=[];
const TIER=['Jade','Azure','Golden','Crimson','Violet','Frost','Thunder','Void','Celestial','Starfall','Primal','Eternal','Dao','Ashen','Lotus','Phantom','Sovereign','Immortal','Mythic','Boundless','Heavenly','Radiant','Abyssal','Astral','Supreme'];
const STY=[['pierce','Piercing Ray',3.4,16,2],['fan','Blossom Volley',1.5,20,3],['nova','Qi Burst',3,26,5],['meteor','Falling Star',4.5,32,7],['chain','Storm Chain',2.2,24,4],['drain','Soul Siphon',2.4,28,8],['might','Titan Might',0,30,22],['mend','Lotus Ward',0,36,14]];
const TCOL=['#9fe8c8','#8fd0ff','#ffd27a','#ff8a6a','#c9a6ff','#9fe0ff','#fff08a','#b08aff','#ffe9a8','#ffb0e0','#ff9a6a','#fff6d6','#ffffff','#c8c8c8','#ff7fa8','#7fffd4','#ffc04d','#a0b8ff','#ff6f61','#d4ff7a','#f0a0ff','#80e8ff','#ff8f40','#b5a0ff','#ffffff'];
const TL={pierce:'Piercing bolt',fan:'Bolt volley',nova:'Burst',meteor:'Meteor',chain:'Chain lightning',drain:'Life drain',might:'ATK buff (half shared with nearby party)',mend:'Heal + ward (heals nearby party for half)',heal:'Heal (heals nearby party for half)',strike:'Melee strike',cleave:'Melee arc cleave',leap:'Melee leap strike',flurry:'Melee flurry',kunai:'Dagger volley',shadowstep:'Teleport behind + backstab',venom:'Poison (damage over time)',bladestorm:'Spinning blades',smoke:'Speed + ATK buff, brief invulnerability',execute:'Bonus damage on wounded foes',siphon:'Melee strike that heals you',rush:'Dash that cuts through everything',
 charge:'Rush to a target up to 400 away, hit it + short shield',bash:'Melee hit + small shield',quake:'Ground slam with aftershocks',bulwark:'Big shield + damage reduction',roar:'Shout: area damage, ATK buff (shared with party) + taunts nearby monsters',counter:'Area hit, stronger when wounded',hammer:'Heavy smash with splash',ironskin:'Heavy damage reduction + heal',shockwave:'Wide shockwave in a line',
 arrow:'Long-range piercing arrow',volley:'Wide arrow volley',rain:'Arrow rain (3 waves)',blast:'Explosive arrow with splash',eagle:'+25% crit chance + ATK buff',gale:'Leap back + speed + arrows',trap:'Thunder zone (6 pulses)',stormarrow:'Arrow that jumps between foes',
 wolves:'Summon spirit wolves that fight for you',soulburst:'Soul blast, restores Qi',wail:'Double area wail',chains:'Chains hit up to 4 nearby foes',soulheal:'Heal + Qi (heals nearby party for half)',harvest:'Area damage that heals you',guardian:'Shield + a guardian spirit',spiritbomb:'Delayed huge blast'};
/* v5_136 Qi cost of every level-unlocked skill = old cost + 25% of its unlock level (starters at level 1 unchanged) */
const QI_LV_ADD=.25;
/* v5_137 every cast costs an extra 10% of the player's current level in Qi, on top of the skill's own cost (read everywhere through skCost) */
const QI_PLVL_ADD=.1;
const QI_COST_MUL=.891; /* v5_188 another -10% (.99 x .9) */
/* history: v5_140 final Qi cost reduced by 10% (x.9); v5_162 then +10% on every skill of every class (x.9 x1.1 = x.99) */
const skCostAt=(s,l)=>Math.max(1,Math.round((s.cost+Math.round(l*QI_PLVL_ADD))*QI_COST_MUL));
const skCost=s=>skCostAt(s,typeof P!=='undefined'&&P&&P.lvl?P.lvl:1);
/* v5_188 Qi-REGEN skills (they give Qi back: soulburst, soulheal, mend + signature sg_c25 / sg_s25 / sg_s300) are paid with HP instead of Qi.
   v5_188e HP price = a FIXED % of your MAX HP per skill (it does not change as you level). The % is the skill's Qi cost as a share of the class's max Qi, both taken at the skill's own unlock level (skHpPct, cached in s._hp).
   A cast needs remaining HP >= QI_REGEN_SAFE (2) x the HP price, otherwise it does not cast. */
const QI_REGEN_T={soulburst:1,soulheal:1,mend:1,sg_c25:1,sg_s25:1,sg_s300:1};
const QI_REGEN_SAFE=2;
const skHp=s=>!!QI_REGEN_T[s.t];
const skHpPct=s=>{if(s._hp==null){const l=Math.max(1,s.lv|0),c=s.c||0;s._hp=skCostAt(s,l)/Math.round((60+l*4)*(CLB[c].qi||1)*QI_MUL)}return s._hp};
const skHpCost=s=>Math.max(1,Math.round(maxHp()*skHpPct(s)));
const skCanPay=s=>skHp(s)?P.hp>=skHpCost(s)*QI_REGEN_SAFE:P.qi>=skCost(s);
const skPay=(s,hpc)=>{if(skHp(s))P.hp=Math.max(1,P.hp-(hpc==null?skHpCost(s):hpc));else P.qi-=skCost(s)};
const skCostLbl=s=>skHp(s)?(Math.round(skHpPct(s)*1000)/10)+'% of max HP (needs HP \u2265 2x cost)':skCost(s)+' Qi';
const SKILLS=[{n:'Sword Wave',t:'pierce',m:2.2,cost:10,cd:1.2,lv:1,col:'#cfe8ff',tier:0},{n:'Whirling Blade',t:'nova',m:2.6,cost:22,cd:4,lv:1,col:'#ff8c6e',tier:-1},{n:'Lotus Mend',t:'heal',m:.35,cost:30,cd:10,lv:1,col:'#5fd3a5',tier:0}];
/* a new skill every 5 levels (k = 1..200 -> level k*5). kk keeps each skill as strong as the old every-10-levels skill of the same level */
for(let k=1;k<=200;k++){const y=STY[(k-1)%8],tr=Math.floor((k-1)/8),kk=k/2;SKILLS.push({n:TIER[tr]+' '+y[1],t:y[0],m:y[2]*(1+kk*.06),cost:Math.round(y[3]*(1+kk*.05))+Math.round(k*5*QI_LV_ADD),cd:y[4],lv:k*5,col:TCOL[tr],tier:tr>>1,k:kk})}
/* MELEE skills (strike / cleave / leap / flurry): appended after the ranged ones so saved skill ids stay valid. A starter at level 1, then one every 10 levels
   (level 10..1000), cycling the 4 types through the 25 tiers. They need an enemy within ~170 (leap: 360) and spend nothing when there is none. */
const MST=[['strike','Heavy Strike',4.4,16,2.5],['cleave','Crescent Cleave',3.4,24,4],['leap','Leaping Slash',5.2,30,6],['flurry','Hundred Cuts',4.0,26,4]],MELEE=[SKILLS.length];
SKILLS.push({n:'Heavy Strike',t:'strike',m:3.4,cost:14,cd:2.5,lv:1,col:'#ffb37a',tier:0});
for(let k=1;k<=100;k++){const y=MST[(k-1)%4],tr=Math.floor((k-1)/4);MELEE.push(SKILLS.length);SKILLS.push({n:TIER[tr]+' '+y[1],t:y[0],m:y[2]*(1+k*.06),cost:Math.round(y[3]*(1+k*.05))+Math.round(k*10*QI_LV_ADD),cd:y[4],lv:k*10,col:TCOL[tr],tier:tr>>1,k:k})}
/* ---------- CLASSES ----------
   Class 0 = Cultivator (every skill above; they have no .c field). Class 1 = Night Blade: its own skills, marked c:1, appended here so old
   saved skill ids stay valid. Night Blade: +10% crit chance, -10% max HP. A new Night Blade skill every 5 levels (200), cycling the 8 types
   through the tiers like the Cultivator; three starters at level 1. Switch class in the Skill Book (K); each class keeps its own slot layout. */
const CLASSES=[
 {n:'Cultivator',d:'Ranged qi spells, heals and melee strikes. The all-rounder: +5% crit chance, +20% max Qi, +10% DEF.'},
 {n:'Night Blade',d:'Shadow assassin: teleport strikes, poison, blade storms and speed. +10% crit chance, -10% max HP.'},
 {n:'Iron Guardian',d:'Armored bruiser: shields, damage reduction and ground-shaking slams. +25% max HP, +40% DEF, +10% move speed, -35% PvP damage from enemies in melee range. Iron Charge closes the gap on enemies that run away.'},
 {n:'Storm Archer',d:'Long-range marksman: piercing arrows, volleys, traps and speed. Gale Step empowers your next arrows (+40%). +15% crit chance, +10% move speed.'},
 {n:'Spirit Summoner',d:'Spirit caller: wolves (up to 3) and a guardian spirit that focus your target, soul blasts and soul healing. +62.5% max Qi, -5% max HP.'}];
/* passive class bonuses: crit = extra crit chance, hp / def / qi / spd = multipliers */
const CLB=[{crit:.05,qi:1.2,def:1.1},{crit:.10,hp:.9},{hp:1.25,def:1.4,spd:1.1},{crit:.15,spd:1.1},{qi:1.625,hp:.95}];

/* ---------- PET STATS FOR THE OWNER (v5_219, per species since v5_220) ----------
   The summoned pet gives its owner TWO stats, fixed by the pet's SPECIES (PET_PAIR, indexed by species: 0 Chicken, 1 Dragon, 2 Fairy, 3 Phoenix, 4 Tiger, 5 Wolf), whatever class the owner is:
   Dragon ATK + DEF (powerful, armoured) | Fairy DEF + accuracy (protective, precise magic) | Phoenix HP + evasion (rebirth, hard to catch) | Tiger ATK + evasion (fierce, agile) | Wolf HP + accuracy (tireless hunter) |
   Chicken HP + evasion (it runs away; it is weak anyway). Each of ATK / HP / DEF / accuracy / evasion is given by exactly two of the five special pets.
   The size comes from the pet's class F..S (PET_GF = fraction of the S value). A Chicken counts as a Class F pet at half strength.
   PET_STAT_S = value at class S: ATK / HP / DEF in % of the owner's own value, ACC in points, EVA in %-points. Tune here. */
const PET_GF=[.2,.3,.42,.56,.72,.88,1],PET_CHICKEN_K=.5;
const PET_STAT_S={atk:10,hp:12,def:12,acc:8,eva:4};
const PET_PAIR=[['hp','eva'],['atk','def'],['def','acc'],['hp','eva'],['atk','eva'],['hp','acc']];
const PET_FLAT={acc:1,eva:1}; /* these two are added as points; ATK / HP / DEF are multipliers (1 + pct/100) */
let _pcK='',_pcV={};
/* the owner's bonus from the summoned pet for one stat: a fraction for atk / hp / def (0.1 = +10%), points for acc / eva; 0 when no pet or the stat is not in the pet's pair */
function petPct(k){
  const pk=P.pet;if(!pk)return 0;
  if(pk!==_pcK){
    _pcK=pk;_pcV={};const a=pk.split(':'),s=a[0]|0,c=a[1]|0,g=PET_GF[Math.max(0,Math.min(6,c))]*(s===0?PET_CHICKEN_K:1);
    for(const st of (PET_PAIR[s]||[]))_pcV[st]=PET_STAT_S[st]*g*(PET_FLAT[st]?1:.01);
  }
  return _pcV[k]||0;
}
const CLS_ORDER=[[['pierce'],['nova'],['mend','heal'],['meteor'],['chain'],['might'],['drain'],['fan'],['strike'],['cleave'],['leap'],['flurry']],
 [['kunai'],['shadowstep'],['venom'],['bladestorm'],['smoke'],['execute'],['siphon'],['rush']],
 [['bash'],['bulwark'],['quake'],['charge'],['roar'],['counter'],['hammer'],['ironskin'],['shockwave']],
 [['arrow'],['volley'],['eagle'],['rain'],['blast'],['stormarrow'],['trap'],['gale']],
 [['wolves'],['soulburst'],['soulheal'],['wail'],['chains'],['harvest'],['guardian'],['spiritbomb']]];
const NB_T=[['kunai','Phantom Kunai',1.7,14,1.6],['shadowstep','Shadow Step',4.6,22,5],['venom','Venom Needle',1.3,20,3.5],['bladestorm','Blade Dance',1.1,34,6],['smoke','Smoke Veil',0,28,14],['execute',"Reaper's Mark",4.0,26,5],['siphon','Blood Fang',3.6,24,4],['rush','Umbral Rush',3.2,28,5]],NBK=[];
const hsl2hex=(h,s,l)=>{s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};return '#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('')};
SKILLS.push({n:'Phantom Kunai',t:'kunai',m:1.5,cost:12,cd:1.4,lv:1,col:'#c7a8ff',tier:0,c:1},{n:'Shadow Step',t:'shadowstep',m:3.6,cost:20,cd:5,lv:1,col:'#a98cf0',tier:0,c:1},{n:'Smoke Veil',t:'smoke',m:0,cost:26,cd:14,lv:1,col:'#9aa6c8',tier:0,c:1});
for(let k=1;k<=200;k++){const y=NB_T[(k-1)%8],tr=Math.floor((k-1)/8),kk=k/2;NBK[k]=SKILLS.length;SKILLS.push({n:TIER[tr]+' '+y[1],t:y[0],m:y[2]*(1+kk*.06),cost:Math.round(y[3]*(1+kk*.05))+Math.round(k*5*QI_LV_ADD),cd:y[4],lv:k*5,col:hsl2hex((262+tr*11)%360,75,70),tier:tr>>1,k:kk,c:1})}
const CLS_STORE=new Array(CLASSES.length).fill(null); /* saved slot layouts of the classes that are NOT in use */
/* classes 2-4: same scheme as the Night Blade (3 starters at level 1, then 200 skills, one every 5 levels, 8 types cycling through the tiers).
   Rows: [type, name, damage x ATK, Qi cost, cooldown]. Starters: [type, name, damage, cost, cooldown, colour]. */
/* v5_86 Iron Guardian attack skills hit 60% harder: DEF/HP raise its power rating but it could not out-damage the Night Blade's burst + mobility */
const IG_DMG_MUL=1.6;
/* v5_87 Iron Guardian melee guard: PvP hits from an attacker within IG_GUARD_R units are reduced by IG_GUARD (fades against a much higher level attacker) */
const IG_GUARD=.35,IG_GUARD_R=300;
const CLS_GEN=[
 {c:2,hue:28,t:[['bash','Shield Bash',3.2,14,2.5],['quake','Earthquake',2.4,26,5],['bulwark','Bulwark',0,28,12],['roar','War Cry',1.6,30,10],['counter','Retaliation',2.2,24,6],['hammer','Hammer Smash',4.4,26,5],['ironskin','Iron Skin',0,26,16],['shockwave','Seismic Wave',2.6,28,5]],
  st:[['bash','Shield Bash',3.0,12,2.5,'#ffcf8a'],['bulwark','Bulwark',0,26,12,'#e3b559'],['quake','Earthquake',2.2,24,5,'#d9a066'],['charge','Iron Charge',1.6,18,7,'#ffb36b']]},
 {c:3,hue:135,t:[['arrow','Piercing Arrow',3.0,14,1.8],['volley','Arrow Volley',1.4,24,4],['rain','Arrow Rain',1.4,32,8],['blast','Explosive Arrow',3.4,24,4],['eagle','Eagle Eye',0,26,16],['gale','Gale Step',1.2,22,8],['trap','Thunder Trap',1.3,28,10],['stormarrow','Storm Arrow',2.4,28,5]],
  st:[['arrow','Piercing Arrow',2.6,12,1.8,'#9fe8c8'],['volley','Arrow Volley',1.2,22,4,'#7fe0b0'],['eagle','Eagle Eye',0,24,16,'#ffe27a']]},
 {c:4,hue:190,t:[['wolves','Spirit Wolves',1.6,30,12],['soulburst','Soul Burst',2.6,24,4],['wail','Wraith Wail',2.0,32,7],['chains','Ghost Chains',2.0,26,5],['soulheal','Soul Mend',.25,28,10],['harvest','Soul Harvest',2.4,30,6],['guardian','Phantom Guardian',.8,28,14],['spiritbomb','Spirit Bomb',5.0,36,8]],
  st:[['wolves','Spirit Wolves',1.4,28,12,'#9fe0ff'],['soulburst','Soul Burst',2.3,22,4,'#80e8ff'],['soulheal','Soul Mend',.25,26,10,'#8ff0c4']]}];
const CLK=[null,NBK,[],[],[]]; /* CLK[class][k] = skill id learned at level k*5 */
for(const g of CLS_GEN){
  const gm=g.c===2?IG_DMG_MUL:1;
  for(const y of g.st)SKILLS.push({n:y[1],t:y[0],m:y[2]*gm,cost:y[3],cd:y[4],lv:1,col:y[5],tier:0,c:g.c});
  for(let k=1;k<=200;k++){const y=g.t[(k-1)%8],tr=Math.floor((k-1)/8),kk=k/2;CLK[g.c][k]=SKILLS.length;
    SKILLS.push({n:TIER[tr]+' '+y[1],t:y[0],m:y[2]*gm*(1+kk*.06),cost:Math.round(y[3]*(1+kk*.05))+Math.round(k*5*QI_LV_ADD),cd:y[4],lv:k*5,col:hsl2hex((g.hue+tr*11)%360,75,70),tier:tr>>1,k:kk,c:g.c})}
}
/* ---------- v5_160 SIGNATURE SKILLS ----------
   One UNIQUE skill per class at each milestone level (Lv 25 / 50 / 100 / 200 / 300 / 500 / 750 / 1000), 40 in all. They are extra: the normal skill of that level is still learned.
   Appended after every older skill so saved skill ids stay valid. Each has its own type (sg_*), handled by SIGF (after useSkill).
   Row = [type, name, damage x ATK (base, grows with level like every skill), Qi cost, cooldown, description, glyph, sound family]. m = 0 -> a buff / utility skill (no reach check). */
const SIG_LV=[25,50,100,200,300,500,750,1000],SIG_HUE=[150,262,28,135,190];
const SIGD=[
 [['sg_c25','Heaven’s Breath',0,30,22,'Restores 35% Qi, heals you (nearby party for half) and +12% ATK for 8 s','❀','heal'],
  ['sg_c50','Mirror of the Dao',0,36,28,'8 s: reflects 50% of damage taken back to the attacker, plus 20% less damage taken','⬡','buff'],
  ['sg_c100','Lotus Domain',2.2,48,34,'Blooms a 250 radius lotus field: 6 pulses (1 s apart) that damage foes and heal you while you stand in it (per pulse)','✿','aoe'],
  ['sg_c200','Ten Thousand Swords',2.2,60,42,'24 spirit swords rain on the target area over 2.4 s, each one a small blast (per sword)','†','aoe'],
  ['sg_c300','Five Elements Cycle',2.4,70,46,'Five strikes, 0.6 s apart: Fire burst, Water burst + heal, Wood shield, Metal line, Earth quake (per strike base)','✵','explosion'],
  ['sg_c500','Dao Clone',2.2,80,52,'A clone of yourself fights for 12 s, striking your target every 0.55 s (per strike)','⚇','buff'],
  ['sg_c750','Heaven-Splitting Blade',16,95,58,'Marks a 720 long line, 1.1 s later a sword of light splits it for huge damage to everything inside','⚔','explosion'],
  ['sg_c1000','Immortal Ascension',0,120,76,'15 s Immortal Form: +40% ATK (half shared with party), +25% crit, -30% damage taken, 8% lifesteal and 3% HP regeneration every second','☀','buff']],
 [['sg_n25','Afterimage',0,28,20,'1.5 s untouchable, then 6 s of speed, +25% crit and +10% ATK','✵','dash'],
  ['sg_n50','Vampiric Edge',0,34,28,'8 s: every hit you land heals you for 20% of the damage (max 5% HP per hit), +10% ATK','♥','buff'],
  ['sg_n100','Death Mark',4,46,32,'Marks a foe for 5 s; all damage you deal to it is stored and released as a detonation (90% of it, capped) when the mark ends','☠','slash'],
  ['sg_n200','Thousand Needles',0.9,58,40,'30 needles in 3 s, each at a random enemy within 300 (per needle)','✴','proj'],
  ['sg_n300','Nightshade Bloom',0.7,68,44,'A poison cloud (230 radius) at the target: 10 pulses 0.5 s apart, each 15% stronger than the last (per pulse base)','❀','aoe'],
  ['sg_n500','Reaper’s Verdict',10,78,50,'Teleport behind a foe and execute it: more damage the lower its HP. If it dies, EVERY other cooldown resets','⚔','dash'],
  ['sg_n750','Eclipse Cross',6,92,56,'Two crossing blade lines (660 long) carve an X at the target after 0.7 s; the centre is hit by both plus a blast','✖','slash'],
  ['sg_n1000','Shadowless Massacre',3,110,72,'3 s untouchable: 10 teleport strikes on random enemies within 520, then a 260 radius finale (per strike; finale 3.5x)','❂','dash']],
 [['sg_g25','Stoneskin Oath',0,32,24,'Shield worth 25% max HP for 8 s and 25% less damage taken for 6 s','◆','buff'],
  ['sg_g50','Thorned Bulwark',0,38,30,'8 s: reflects 80% of the damage monsters deal to you and 30% less damage taken','⬢','buff'],
  ['sg_g100','Juggernaut Rush',5,50,32,'Barrel 420 forward in a crushing line (110 wide), damaging everything in it and gaining a 10% max HP shield','⇒','dash'],
  ['sg_g200','Unyielding Vessel',2.5,62,42,'6 s: absorbs all damage taken (up to 80% of max HP), then releases 150% of it as a 300 radius shockwave plus a hit','◎','smash'],
  ['sg_g300','Iron Banner',1,72,48,'Plants a 280 radius banner for 10 s: you take 20% less damage and regain HP inside it, monsters are taunted and it pulses damage (per pulse)','⚑','buff'],
  ['sg_g500','Mountain Crash',11,84,54,'1 s untouchable wind-up, then slams down in a 300 radius crater for huge damage and a 20% max HP shield','⛰','smash'],
  ['sg_g750','Stone Sentinels',1,94,58,'Four stone sentinels fight beside you for 12 s (per strike) and you gain a 15% max HP shield','♖','buff'],
  ['sg_g1000','Avatar of the Mountain',1.8,115,78,'15 s: 50% max HP shield, -45% damage taken, reflect 50%, +30% ATK, and a ground pulse every 1.5 s (per pulse)','♔','buff']],
 [['sg_a25','Windrunner',0,26,20,'6 s: +35% speed, +25% crit and +40% damage on Piercing / Volley arrows','⇠','dash'],
  ['sg_a50','Phoenix Arrow',5,38,30,'A flaming arrow (720 range) that leaves burning ground for 4 s (burn = 30% per second)','✹','explosion'],
  ['sg_a100','Skyfall Volley',0.5,50,34,'Three waves of nine arrows, 0.25 s apart (per arrow)','⤗','proj'],
  ['sg_a200','Trap Field',3,60,40,'Three hidden traps around the target blast together after 1 s, then a big centre blast (traps 1x, centre 1.5x)','⌖','lightning'],
  ['sg_a300','Ricochet Frenzy',3.2,70,44,'An arrow ricochets up to 8 times between nearby foes, hitting 12% harder with every bounce','↻','lightning'],
  ['sg_a500','Dragon Sniper',18,82,52,'0.8 s aim, then one guaranteed-crit shot (900 range) of huge damage','⌖','proj'],
  ['sg_a750','Starfall Barrage',1.8,94,58,'16 falling stars over 3.2 s crash around the target area (per star)','★','explosion'],
  ['sg_a1000','Tempest Ascendant',0.4,112,76,'12 s: +35% ATK, +25% crit, speed, and a piercing arrow flies at the nearest enemy every 0.4 s (per arrow)','⚝','lightning']],
 [['sg_s25','Soul Lantern',0,30,22,'A lantern heals you (nearby party for half) and restores Qi every 2 s for 12 s','❂','heal'],
  ['sg_s50','Pack Frenzy',0.8,40,28,'Fills your wolf pack to 3 and makes every spirit strike twice as fast and 50% harder, +3 s','♘','buff'],
  ['sg_s100','Phantom Procession',1.4,52,34,'Two waves of 12 ghosts fly outward in a ring (per ghost)','✵','proj'],
  ['sg_s200','Soul Web',0,62,40,'Links up to 6 nearby monsters for 8 s: 40% of the damage dealt to one is shared with the others','⛓','lightning'],
  ['sg_s300','Ancestral Chorus',0,72,44,'You and your party: +25% ATK for 10 s (party gets half), heals 15% and restores Qi','♪','buff'],
  ['sg_s500','Spectral Dragon',4.5,84,50,'A dragon sweeps a 760 long line out and back (two hits, per pass)','❧','aoe'],
  ['sg_s750','Phantom Legion',.9,96,56,'Calls three extra wolves (up to 6) and a guardian spirit with a 20% max HP shield, for 12 s (per strike)','♘','buff'],
  ['sg_s1000','Netherworld Gate',0.9,116,72,'Opens a 340 radius gate for 6 s: 12 pulses that damage foes and heal you, then a huge collapse (per pulse; collapse 6x)','❂','explosion']]];
const SIGK=[{},{},{},{},{}]; /* SIGK[class][level] = skill id */
const SIGR={sg_c100:260,sg_c200:520,sg_c300:520,sg_c500:420,sg_c750:700,sg_n100:460,sg_n200:300,sg_n300:420,sg_n500:460,sg_n750:420,sg_n1000:520,
 sg_g100:420,sg_g200:300,sg_g300:280,sg_g500:300,sg_g750:240,sg_g1000:240,sg_a50:720,sg_a100:600,sg_a200:520,sg_a300:520,sg_a500:900,sg_a750:520,sg_a1000:700,
 sg_s50:480,sg_s100:440,sg_s500:700,sg_s750:480,sg_s1000:520}; /* reach of every attack-type signature skill (attack mode and auto-cast only fire with a target inside it) */
for(let c=0;c<SIGD.length;c++)SIGD[c].forEach((y,i)=>{const lv=SIG_LV[i],kk=lv/10;SIGK[c][lv]=SKILLS.length;TL[y[0]]=y[5];
  SKILLS.push({n:y[1],t:y[0],m:y[2]*(1+kk*.06),cost:Math.round(y[3]*(1+kk*.05))+Math.round(lv*QI_LV_ADD),cd:y[4],lv,col:hsl2hex((SIG_HUE[c]+i*14)%360,80,68),tier:Math.floor(lv/80),k:kk,c,sig:1})});
/* v5_77: skills that heal you (all classes: Lotus Mend, Lotus Ward, Soul Siphon, Iron Skin, Soul Mend, Soul Harvest, Blood Fang) heal HEAL 50% less and have a 2x cooldown */
const SKILL_HEAL_MUL=.5,HEAL_CD_MUL=2,HEAL_SKILL_T={heal:1,mend:1,drain:1,siphon:1,ironskin:1,soulheal:1,harvest:1};
for(const q of SKILLS)if(HEAL_SKILL_T[q.t])q.cd*=HEAL_CD_MUL;
const SKILL_CD_ADD=6; /* v5_123 +3 s, v5_133 +3 s more (total +6 s): every skill of every class has this much extra cooldown (skill book, cooldown overlay and casting all read q.cd) */
for(const q of SKILLS)q.cd+=SKILL_CD_ADD;
/* v5_149 Spirit Summoner (class 4): every skill (attack, heal, summon) has half the final cooldown, so it is the fastest class (avg ~8.2 s; others 12-15.6 s). 1 = same as the other classes. */
const SUMMONER_CD_MUL=.5;
for(const q of SKILLS)if(q.c===4)q.cd=Math.round(q.cd*SUMMONER_CD_MUL*10)/10;
const NSLOT=14,AUTO_SLOTS=12, /* slots 1-12 can auto-cast; R and T (13, 14) never do */
  SCD=new Array(SKILLS.length).fill(0),EQ=[0,1,2,MELEE[0],-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
/* per-slot auto-cast switch (used while auto-hunting). Drag a skill slot upward to flip it. */
const AUTOSK=new Array(NSLOT).fill(true);
/* slot hotkeys: 12 round slots, then the two large ones */
const SLOTKEYS=['1','2','3','4','5','6','7','8','9','0','-','=','r','t'];
/* potion cooldowns (5s) */
const pot={hp:0,qi:0,tp:0,ck:0};


function rngSeed(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rngSeed(20261101);
const rnd=()=>Math.random();
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- accessory gear: dropped by bosses, tempered at the forge ----------
   Each boss kill drops one piece. Its GRADE is the world it came from (1-12): higher grade = bigger base stats.
   Drops go into the bag; equip them yourself (the old piece goes to the bag and the slot keeps its forge level).
   st = { stat: [bonus per grade, bonus per forge level] }. Tune freely. */
const GEAR_DROP_CHANCE=1;
const GEAR=[
 {k:'ear',n:'Earrings',ic:'E',st:{crit:[1,.4],cdb:[2,.3],pab:[1.5,.25],bsa:[1.5,.25]}},
 {k:'ring',n:'Ring',ic:'R',st:{atk:[8,5],acc:[.8,.25],bab:[2,.3],mab:[1.5,.25],qrg:[.05,.01]}},
 {k:'neck',n:'Necklace',ic:'N',st:{hp:[50,30],cdr:[1,.3],bdr:[1,.3],mdr:[.8,.25],qrg:[.05,.01]}},
 {k:'glove',n:'Gloves',ic:'G',st:{aspd:[.5,.5],acc:[1,.4],bab:[1.5,.3],bsd:[.8,.25]}},
 {k:'boot',n:'Boots',ic:'B',st:{def:[3,2],spd:[.1,.15],eva:[.6,.2],pdr:[.8,.25]}},
 {k:'legs',n:'Legguards',ic:'L',st:{def:[4,2.5],hp:[20,12],eva:[.5,.15],mdr:[.8,.25]}},
 {k:'brace',n:'Bracelet',ic:'W',st:{atk:[4,3],crit:[.5,.25],cdb:[1.5,.25],bsa:[1.2,.2]}},
 {k:'belt',n:'Belt',ic:'T',st:{hp:[35,20],def:[1.5,1],cev:[.8,.25],pdr:[.8,.25],bsd:[.8,.25]}},
 /* Primary weapon and robe replace the old fixed Blade / Robe. core = the forge level lives in P.wlv / P.alv (so old saves keep their level and the
    forge bonus is applied in atkVal / maxHp / defVal). With nothing equipped you still wield the plain Blade / Robe and can forge it. */
 {k:'wpn',n:'Primary Weapon',ic:'P',st:{atk:[12,7],acc:[.8,.25],cdb:[1.5,.25],mab:[1.2,.2]},core:'wlv'},
 {k:'wpn2',n:'Secondary Weapon',ic:'S',st:{atk:[5,3],aspd:[.3,.25],cev:[.6,.2],pab:[1.5,.25]}},
 {k:'robe',n:'Robe',ic:'O',st:{def:[5,6],hp:[40,40],cdr:[1,.3],bdr:[1,.3]},core:'alv'}];
const STAT_LBL={crit:'% crit chance',atk:' ATK',hp:' HP',aspd:'% attack speed',def:' DEF',spd:'% move speed',eva:'% evasion',acc:' accuracy',cev:'% crit EVA',cdb:'% crit ATK DMG',cdr:'% crit DMG reduction',bab:'% bash ATK DMG',bdr:'% bash DMG reduction',pab:'% PvP ATK DMG',pdr:'% PvP DMG reduction',mab:'% monster ATK DMG',mdr:'% monster DMG reduction',bsa:'% boss ATK DMG',bsd:'% boss DMG reduction',qrg:'% Qi regen / sec'};
/* Boss gear is RANDOM. Rarity decides how many stats an item has and how strong the rolls are:
   Common = slot stat only, low roll | Rare = +1 random stat | Epic = +2 | Legendary = +3 and the best rolls.
   lo/hi = roll multiplier range, ex = extra random stats, w = drop weight (%), cls = bag colour class.
   Every stat is  grade x per-grade value x roll  (x a small boss-level bonus). Tune freely. */
const RAR=[
 {n:'Common',c:'#c4cdd2',cls:'cm',lo:.6,hi:.9,ex:0,w:55},
 {n:'Rare',c:'#5aa9ff',cls:'',lo:.9,hi:1.2,ex:1,w:28},
 {n:'Epic',c:'#c07bff',cls:'pu',lo:1.2,hi:1.6,ex:2,w:13},
 {n:'Legendary',c:'#ffb02e',cls:'leg',lo:1.6,hi:2.2,ex:3,w:4}];
/* v5_143 SPECIAL stat: Qi regen (% of max Qi per second), Ring + Necklace only. Value per grade; not in STATBASE so it never rolls as a random extra on other gear.
   Not touched by the global gear / forge multipliers (the numbers in GEAR are the real ones). Total from gear is capped at QRG_CAP. */
const SPECIAL={qrg:.05},QRG_CAP=6;
const STATBASE={crit:1,atk:8,hp:50,aspd:.5,def:3,spd:.1,eva:.8,acc:1.2,cev:.8,cdb:2,cdr:1,bab:2,bdr:1,pab:1.5,pdr:1,mab:1.5,mdr:.8,bsa:1.2,bsd:.8}; /* value per grade of an extra stat (before the .7 extra-stat factor) */
/* ---------- STAT BALANCE (tune here) ----------
   Power now comes from three sources that should stay in proportion at any stage: LEVEL ~55%, GEAR ~25%, FORGE ~20%
   (measured for ATK / HP / DEF with forge level ~ level/8). Before this pass gear was only ~9% and forge ~35%.
   GEAR_MULT_FLAT  scales the per-grade base of flat stats (ATK, HP, DEF) so a better-grade drop really matters.
   GEAR_MULT_PCT   same for % stats (milder: they hit caps).
   FORGE_MULT      scales every forge-per-level bonus (gear, Blade and Robe). */
const GEAR_MULT_FLAT=.5,GEAR_MULT_PCT=.2,FORGE_MULT=.18,FORGE_MULT_PCT=.08,FLAT_STATS={atk:1,hp:1,def:1},GEAR_VER=5; /* v5_73: lowered again (flat .8->.5, % .35->.2, flat forge .3->.18, % forge .15->.08). v5_71: gear roughly halved (flat 1.6->.8, % 0.7->.35, flat forge .6->.3, % forge .3->.15). v5_69: 2.8->1.6, 1.8->.7 */
const GEAR_OLD={3:[1.6,.7],4:[.8,.35]}; /* [flat, %] item scale of each earlier gear version: a save with that gv holds rolled stats on it and is scaled by new/old */
const gearMul=k=>SPECIAL[k]?1:FLAT_STATS[k]?GEAR_MULT_FLAT:GEAR_MULT_PCT;
const gearMulFrom=v=>k=>SPECIAL[k]?1:FLAT_STATS[k]?GEAR_MULT_FLAT/GEAR_OLD[v][0]:GEAR_MULT_PCT/GEAR_OLD[v][1];
const r2=v=>Math.round(v*100)/100;
for(const q of GEAR)for(const k in q.st)q.st[k]=[r2(q.st[k][0]*gearMul(k)),r2(q.st[k][1]*(SPECIAL[k]?1:FLAT_STATS[k]?FORGE_MULT:FORGE_MULT_PCT))];
for(const k in STATBASE)STATBASE[k]=r2(STATBASE[k]*gearMul(k));
const BLADE_ATK=7*FORGE_MULT,ROBE_DEF=6*FORGE_MULT,ROBE_HP=40*FORGE_MULT; /* Blade / Robe forge bonus per level */
const rd1=v=>Math.max(.1,Math.round(v*10)/10);
function rollRarity(){let t=rnd()*100;for(let i=0;i<RAR.length;i++){t-=RAR[i].w;if(t<0)return i}return 0}
function rollGear(q,g,f,r){
  const A=RAR[r],st={},lf=.85+.3*clamp(f,0,1),roll=()=>(A.lo+rnd()*(A.hi-A.lo))*lf;
  for(const k of Object.keys(q.st))st[k]=SPECIAL[k]?r2(Math.max(.01,g*q.st[k][0]*roll())):rd1(g*q.st[k][0]*roll());
  const pool=Object.keys(STATBASE).filter(k=>!(k in st));
  for(let i=0;i<A.ex&&pool.length;i++){const k=pool.splice(Math.floor(rnd()*pool.length),1)[0];st[k]=rd1(g*STATBASE[k]*.7*roll())}
  return {slot:q.k,g,r,st,col:A.c};
}
const gearScore=o=>{let v=0;for(const k in o.st)v+=o.st[k]/(STATBASE[k]||SPECIAL[k]||1);return v};
/* old saves have no rolled stats: they become Common items with the old fixed stats */
function fixGear(o,q){if(o.g>0&&(!o.st||typeof o.st!=='object')){o.r=0;o.st={};for(const k of Object.keys(q.st))o.st[k]=o.g*q.st[k][0]}if(!(o.r>=0&&o.r<RAR.length))o.r=0;if(!o.st)o.st={};addQrg(o,q)}
/* v5_143 old rings / necklaces have no Qi regen: give them the mid roll of their rarity for their grade (forge level adds on top by itself) */
function addQrg(o,q){if(o.g>0&&q&&q.st.qrg&&!('qrg' in o.st)){const A=RAR[o.r|0];o.st.qrg=r2(Math.max(.01,o.g*q.st.qrg[0]*(A.lo+A.hi)/2))}}

/* ---------- player ---------- */
const P={x:C,y:C+110,r:14,lvl:1,exp:0,hp:100,qi:60,coins:0,gold:0,ore:0,wlv:0,alv:0,
  face:0,anim:0,mvAmt:0,dir:1,atkCd:0,bf:0,bfT:0,sh:0,shT:0,inv:0,hurt:0,dead:0,swing:0,target:null,mv:null,task:null,mine:0,qiT:0,pvpT:0,pvpKills:0};
let PVPLVL=0,PVPMODE=false; /* v5_158 PvP mode 0 Peaceful / 1 Lawful / 2 Hostile / 3 Carnal (saved, sent to the server), and the 'ATK Players Only' toggle */
P.gear={};for(const g of GEAR){P.gear[g.k]={g:0,lv:0,r:0,st:{}};if(g.core)Object.defineProperty(P.gear[g.k],'lv',{enumerable:true,get:()=>P[g.core],set:v=>{P[g.core]=v}})}
P.cls=0;P.rsv=-1;P.rsvT=0;P.rsvA=-1;P.vlT=0;P.drT=0;P.dr=0;P.ceT=0;P.spirits=[];P.dcd=0;P.dashT=0;P.dvx=0;P.dvy=0;P.pots={hp:0,qi:0,tp:0,ck:0};P.tp=0;P.tpx=0;P.tpy=0;P.autoPot=true;P.apHp=35;P.apQi=20;P.fightBack=true;P.tapMove=true;P.recent=[];
/* the core slots (weapon / robe) already add their ATK / DEF / HP forge bonus in atkVal / defVal / maxHp; every other stat gets it here */
const CORE_FORGED={atk:1,def:1,hp:1};
/* v5_148 PERCENT FORGE (replaces the v5_143 exponential flat forge). The forge no longer adds a flat amount of ATK / HP / DEF: that was huge at level 1 (+100 gave x200 power)
   and still too strong at level 1000. Now the bonus is a PERCENTAGE of the character's level + gear stats, so it is the same at any character level, and it follows a curve:
   fraction(forge) = (forge / 100) ^ FORGE_CURVE.  A full set at +100 gives +FORGE_MAX_PCT (40%) ATK, DEF and HP; the Blade / Robe / each slot gets its share (its old per-level weight).
   Example (curve 2, 40% for a full set): +10 = 0.4% | +30 = 3.6% | +50 = 10% | +70 = 19.6% | +90 = 32.4% | +100 = 40%. Low forge adds little, high forge adds more.
   % stats (crit, attack speed, damage boosts ...) use the same curve: forgeEff(lv) = fraction x FORGE_PCT_REF 'steps' of their per-level value (+100 = FORGE_PCT_REF steps; was 871).
   Tune FORGE_MAX_PCT, FORGE_CURVE (1 = linear, higher = more back-loaded) and FORGE_PCT_REF here. */
const fg2=v=>Math.round(v*100)/100;
const FORGE_MAX_PCT=.40,FORGE_CURVE=2,FORGE_PCT_REF=140;
const forgeFrac=lv=>Math.pow(clamp(lv|0,0,FORGE_MAX)/FORGE_MAX,FORGE_CURVE); /* 0..1 along the forge curve */
const forgeEff=lv=>forgeFrac(lv)*FORGE_PCT_REF; /* 'steps' of per-level bonus for the % stats */
const forgeGain=lv=>forgeFrac(lv+1)-forgeFrac(lv); /* fraction of the curve the NEXT forge level adds */
const FLAT_W={};for(const k in FLAT_STATS){FLAT_W[k]=0;for(const q of GEAR)if(q.st[k])FLAT_W[k]+=q.st[k][1]} /* total per-level weight of every slot for ATK / HP / DEF */
const slotFlatPctF=(q,k,fr)=>q.st[k]?FORGE_MAX_PCT*q.st[k][1]/FLAT_W[k]*fr:0; /* this slot's share of the % bonus for a curve fraction */
const slotFlatPct=(q,k,lv)=>slotFlatPctF(q,k,forgeFrac(lv));
function flatForgePct(k,slot){let t=0;for(const q of GEAR){const o=slot(q);if(o&&(q.core||o.g>0))t+=slotFlatPct(q,k,o.lv)}return t} /* total % bonus (0.4 = +40%) of ATK / HP / DEF; the Blade / Robe slots always count */
const forgeP=k=>flatForgePct(k,q=>P.gear[q.k]);
const GQ={};for(const q of GEAR)GQ[q.k]=q;
/* forge % text of the Blade / Robe (core slots) for a curve fraction */
const corePctArr=(q,fr)=>q.k==='wpn'?['+'+fg2(slotFlatPctF(q,'atk',fr)*100)+'% ATK']:['+'+fg2(slotFlatPctF(q,'def',fr)*100)+'% DEF','+'+fg2(slotFlatPctF(q,'hp',fr)*100)+'% HP'];
function gearStat(key){let v=0;for(const q of GEAR){const o=P.gear[q.k],a=q.st[key];if(o.g>0){v+=o.st[key]||0;if(a&&!FLAT_STATS[key])v+=forgeEff(o.lv)*a[1]}}return v} /* v5_148 ATK / HP / DEF forge is a % (forgeP), the other stats keep a per-level add */
const gearName=(q,o)=>RAR[o.r|0].n+' '+TIER[o.g-1]+' '+q.n;
const critChance=()=>Math.min(.75,.15+P.lvl*.0001+gearStat('crit')/100+(CLB[P.cls].crit||0)+(P.ceT>0?.25:0));
const atkCd=()=>.55/(1+Math.min(60,gearStat('aspd'))/100);
const moveSpd=()=>200*(1+Math.min(25,gearStat('spd'))/100)*(P.spdMul||1)*(P.vlT>0?1.35:1)*(CLB[P.cls].spd||1);
const realmIdx=()=>Math.floor((P.lvl-1)/10);
const realmName=i=>i<REALMS.length?REALMS[i]:'Sovereign Tier '+(i-REALMS.length+1);
const maxHp=()=>Math.round((100+P.lvl*32+gearStat('hp'))*(1+forgeP('hp'))*(1+realmIdx()*.1)*(CLB[P.cls].hp||1)*(1+petPct('hp')));
const qrgVal=()=>Math.min(QRG_CAP,gearStat('qrg')); /* v5_143 gear Qi regen, % of max Qi per second */
const QI_MUL=1.5; /* v5_143: max Qi reduced by 25% (was 2 since v5_123 = 2x max Qi). 1 = base pool, 2 = the old doubled pool */
const maxQi=()=>Math.round((60+P.lvl*4)*(CLB[P.cls].qi||1)*QI_MUL);
const atkVal=()=>Math.round((10+P.lvl*3.5+gearStat('atk'))*(1+forgeP('atk'))*(1+realmIdx()*.12)*(1+(P.bfT>0?P.bf:0))*(1+petPct('atk')));
/* DEF now grows with level (3 per level, +4% per realm) and armor level. Shared defense curve (keep equal to pDef* in game.go):
   reduction = def / (def + PDEF_K + attackerLevel*PDEF_K_LV), capped at PDEF_CAP. The ATTACKER's level is in the formula, so
   the same DEF protects less against a higher-level monster or player. */
const PDEF_K=10,PDEF_K_LV=3,PDEF_CAP=.75;
const defRedAt=(def,atkLv)=>Math.min(PDEF_CAP,Math.max(0,def)/(Math.max(0,def)+PDEF_K+atkLv*PDEF_K_LV));
/* level gap, monster hitting a player: monster above you hits up to +60% harder, far below you hits down to 40% */
/* v5_91 monster attack: x3 base (MON_ATK_MUL), and a monster above your level hits harder the bigger the gap: +3% per level, up to +300% (was +1%/level, max +60%). Below you: unchanged (down to x0.4) */
const MON_ATK_MUL=3;
const monGap=(mLv,pLv)=>{const g=mLv-pLv;return g>=0?1+Math.min(3,g*.03):Math.max(.4,1+g*.01)};
/* level gap, you hitting a monster: monsters above your level shrug off more damage (x1/(1+0.03*gap), down to x0.2) */
const atkGap=(mLv,pLv)=>{const g=mLv-pLv;return g>0?Math.max(.2,1/(1+g*.03)):1};
const defVal=()=>Math.round((P.lvl*3+gearStat('def'))*(1+forgeP('def'))*(1+realmIdx()*.04)*(CLB[P.cls].def||1)*(1+petPct('def')));
/* ---------- EVASION + ACCURACY ----------
   Evasion: % chance to dodge a monster / player hit completely (base 5% + gear, capped at EVA_CAP). An attacker above your level pierces it:
   -EVA_LV_PEN %-points of dodge per level above you.
   Accuracy: base 100 + gear. Your hit chance on a monster = (Accuracy - monster evasion) / 100, never below ACC_MIN_HIT, never above 100%.
   Monster evasion = 4% (8% for bosses) + 1.5% per level the monster is above you (max +30%). A miss deals no damage but still pulls aggro.
   Equipment: Gloves roll accuracy, Boots roll evasion, and any Rare+ piece can roll either as an extra stat. Tune the constants below. */
const EVA_BASE=5,EVA_CAP=50,EVA_LV_PEN=.4,ACC_BASE=100,ACC_MIN_HIT=.2;
const EVA_PER_LV=.02,ACC_PER_LV=.04; /* level scaling: +0.02% evasion, +0.04 accuracy per level */
const evaVal=()=>Math.min(EVA_CAP,EVA_BASE+P.lvl*EVA_PER_LV+gearStat('eva')+petPct('eva'));
const accVal=()=>ACC_BASE+P.lvl*ACC_PER_LV+gearStat('acc')+petPct('acc');
/* ---------- CRIT STATS (all in %, each = level part + gear + forge) ----------
   Crit chance      15% base +0.01% per level + gear (cap 75%).
   Crit ATK DMG boost  added to the 180% crit multiplier: +0.05% per level + gear.   crit multiplier = 180% + boost.
   Crit EVA         lowers the chance that a monster's hit is a crit: monster crit chance = MON_CRIT (12%, +8% bosses, +0.5% per level it is above you, max +15%) - Crit EVA.
                    +0.03% per level + gear, capped at CEV_CAP. Also gives a chance to turn a crit from another player into a normal hit.
   Crit DMG reduction  cuts the extra damage of a crit you take (a monster crit is x1.5, a player crit loses part of its bonus): +0.03% per level + gear, capped at CDR_CAP. */
const CDB_PER_LV=.05,CEV_PER_LV=.03,CDR_PER_LV=.03,CEV_CAP=75,CDR_CAP=90,MON_CRIT=12,MON_CRIT_MUL=1.5;
const cdbVal=()=>P.lvl*CDB_PER_LV+gearStat('cdb');
const cevVal=()=>Math.min(CEV_CAP,P.lvl*CEV_PER_LV+gearStat('cev'));
const cdrVal=()=>Math.min(CDR_CAP,P.lvl*CDR_PER_LV+gearStat('cdr'));
const critMul=()=>CRIT_MUL+cdbVal()/100;
/* ---------- BASH + PVP STATS (all in %, level part + gear + forge) ----------
   Bash = your basic attack (the auto-attack swing, not skills).
   Bash ATK DMG boost  +% damage on basic attacks (+0.05% per level).
   Bash DMG reduction  -% damage from monster hits - monsters strike with basic attacks (+0.03% per level, cap BDR_CAP).
   PvP ATK DMG boost   +% damage you deal to players, basic attacks and skills (+0.03% per level).
   PvP DMG reduction   -% damage you take from players (+0.03% per level, cap PDR_CAP). The server still caps a single PvP hit at 10% of max HP. */
const BAB_PER_LV=.05,BDR_PER_LV=.03,PAB_PER_LV=.03,PDR_PER_LV=.03,BDR_CAP=75,PDR_CAP=75; /* v5_96 BDR_CAP 75 */
const babVal=()=>P.lvl*BAB_PER_LV+gearStat('bab');
const bdrVal=()=>Math.min(BDR_CAP,P.lvl*BDR_PER_LV+gearStat('bdr'));
const pabVal=()=>P.lvl*PAB_PER_LV+gearStat('pab');
const pdrVal=()=>Math.min(PDR_CAP,P.lvl*PDR_PER_LV+gearStat('pdr'));
/* ---------- MONSTER + BOSS STATS (all in %, level part + gear + forge) ----------
   Monster ATK DMG boost  +% damage to normal monsters (+0.04% per level).   Boss ATK DMG boost  +% damage to bosses (+0.04% per level).
   Monster DMG reduction  -% damage from normal monsters (+0.03% per level, cap MDR_CAP).   Boss DMG reduction  -% damage from bosses (+0.03% per level, cap BSD_CAP).
   They stack (multiplied) with Bash DMG reduction on monster hits. */
const MAB_PER_LV=.04,BSA_PER_LV=.04,MDR_PER_LV=.03,BSD_PER_LV=.03,MDR_CAP=75,BSD_CAP=75; /* v5_96 MDR_CAP 75 */
/* v5_93 level-gap dominance for monster hits: Bash / Monster / Boss DMG reduction count x(1-D), D=clamp((monsterLv-yourLv)/MON_DOM_GAP,0,1) - a monster far above you ignores them (same idea as PvP) */
const MON_DOM_GAP=400,monDom=lv=>clamp(((lv||0)-P.lvl)/MON_DOM_GAP,0,1);
const mabVal=()=>P.lvl*MAB_PER_LV+gearStat('mab');
const bsaVal=()=>P.lvl*BSA_PER_LV+gearStat('bsa');
const mdrVal=()=>Math.min(MDR_CAP,P.lvl*MDR_PER_LV+gearStat('mdr'));
const bsdVal=()=>Math.min(BSD_CAP,P.lvl*BSD_PER_LV+gearStat('bsd'));
const monCritChance=(lv,boss)=>Math.max(0,MON_CRIT+(boss?8:0)+Math.min(15,Math.max(0,(lv||0)-P.lvl)*.5)-cevVal())/100;
const evaChance=atkLv=>Math.max(0,evaVal()-Math.max(0,(atkLv||0)-P.lvl)*EVA_LV_PEN)/100;
const monEva=m=>(m.boss?8:4)+Math.min(30,Math.max(0,m.lvl-P.lvl)*1.5);
const hitChance=m=>clamp((accVal()-monEva(m))/100,ACC_MIN_HIT,1);
const EXP_LV_MULT=2; /* base EXP is multiplied by level x this value (set to 0 for the original curve) */
const EXP_NEED_K=.5; /* EXP needed per level is multiplied by this (1 = previous curve, .5 = half) */
const expNext=()=>Math.max(1,Math.round(EXP_NEED_K*(EXP_LV_MULT?P.lvl*EXP_LV_MULT:1)*40*Math.pow(P.lvl,1.45)*(1+Math.max(0,P.lvl-100)/150)));
P.hp=maxHp();

let auto=false,started=false,time=0;
/* ---------- multiplayer state (see the multiplayer client section further down) ---------- */
const NET={ws:null,on:false,joined:false,id:0,name:'Wanderer',peers:new Map(),online:0,counts:[],pendingEnter:-1,sendT:0,infoT:0,infoKey:'',fails:0,giveUp:false,olKey:''};
let MP=false; /* true while the shared server world is loaded; false = classic solo simulation */
/* character LOOK: one integer (see AL3D.look in models3d.js) = palette + hair + outfit + headwear + aura.
   It is saved with the character (browser + account) and in its own backup key, so it survives logout, and it is
   re-applied to the 3D model every frame if the model ever disagrees (the model is built before you log in). */
let SKIN=0;const LOOKS=[0,0,0,0,0]; /* one wardrobe look per class (LOOKS[P.cls] is kept in SKIN while that class is active) */
const DEFSKIN={n:'Wanderer',skin:'#e9c9a4',hair:'#14181c',robe:'#2f4a5a',trim:'#e3b559',sash:'#e3b559',boot:'#1d2830',hs:0,ot:0,hw:0,au:0,pi:0,ge:0};
const _skc=new Map();
function skinOf(i){
  i=i|0;if(!window.AL3D)return DEFSKIN;
  let r=_skc.get(i);
  if(!r){const A=AL3D,l=A.look(i),pal=A.SKINS[l.p%A.SKINS.length];
    r=Object.assign({},pal,{pi:l.p%A.SKINS.length,hs:l.h%A.HAIRS.length,ot:l.o%A.OUTFITS.length,hw:l.w%A.HEADS.length,au:l.a%A.AURAS.length,ge:l.g&1,ar:l.r%A.ARMORS.length,ax:l.x%A.ACCENTS.length});_skc.set(i,r)}
  return r;
}
const SK=()=>skinOf(SKIN);
/* look value + class bits (21-23): this is what the 3D rig and other players receive, so class gear shows for everyone */
const SKW=()=>(SKIN|((P.cls&7)<<21))>>>0;
function mixc(a,b,f){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),m=(x,y)=>Math.round(x+(y-x)*f);return '#'+((1<<24)|(m(A>>16,B>>16)<<16)|(m((A>>8)&255,(B>>8)&255)<<8)|m(A&255,B&255)).toString(16).slice(1)}
function normLook(v){
  v=v|0;if(!window.AL3D)return v>>>0;
  const A=AL3D,l=A.look(v);l.p%=A.SKINS.length;l.h%=A.HAIRS.length;l.o%=A.OUTFITS.length;l.w%=A.HEADS.length;l.a%=A.AURAS.length;l.g&=1;l.r%=A.ARMORS.length;l.x%=A.ACCENTS.length;return A.packLook(l);
}
const lookKey=()=>'al_look_'+(AUTH.email||'');
function applyLook(sk){
  SKIN=normLook(sk);
  if(window.AL3D&&T3.rig&&T3.rig.skin!==SKW())AL3D.setSkin(T3.rig,SKW());
  try{localStorage.setItem(lookKey(),String(SKIN))}catch(e){}
}
/* a change from the wardrobe: apply, save to browser + account right now (not after the 4 s delay) and tell other players */
function setLook(sk){applyLook(sk);save();cloudFlush();netInfo(true);wdRender()}
function cycleSkin(){toggleWardrobe()}
/* a class starts from the cultivator's skin tone, gender and aura with default armor colours (hair Shaven = the original class silhouette) */
function classBase(sk){if(!window.AL3D)return sk|0;const l=AL3D.look(sk|0);return AL3D.packLook({p:l.p,h:7,o:0,w:0,a:l.a,g:l.g,r:0,x:0})}
/* saves before v5_53 (no "lkv") stored a class look with hair = accent colour and outfit = armor scheme of that class: convert them to the shared layout */
function migrateLook(v,c){
  if(!window.AL3D||c<1)return v|0;const l=AL3D.look(v|0);
  return AL3D.packLook({p:l.p,h:7,o:0,w:0,a:l.a,g:l.g,r:l.o>0?(c-1)*7+l.o+1:0,x:l.h&7});
}
function loadLooks(s){
  const cur=SKIN,has=Array.isArray(s.lk)&&s.lk.length>=CLASSES.length;
  if(has)for(let c=0;c<CLASSES.length;c++)LOOKS[c]=normLook(s.lkv>=2?(s.lk[c]|0):migrateLook(s.lk[c]|0,c));
  else for(let c=0;c<CLASSES.length;c++)LOOKS[c]=c===0?cur:classBase(cur); /* old saves: the stored look was the cultivator's */
  applyLook(LOOKS[P.cls]);
}

/* ---------- world ---------- */
const mons=[],ores=[],items=[],projs=[],fx=[],texts=[],deco=[],delayed=[],bld=[];
/* v5_168 spatial grid of the scenery (trees, rocks, crystals, ruin blocks ...) so the player can collide with it: cell -> list of indexes into deco */
let DG=new Map();
/* v5_171 VILLAGES: every world has villages of houses, halls and watchtowers (bld). b = {x,y,hw,hh (half sizes), t (0 house, 1 hall, 2 watchtower), wh (wall height drawn),
   H (top height for collision / standing: Infinity = a pitched roof you cannot stand on; a watchtower has a flat top you can jump onto), wc / rc (wall / roof colour), fx,fy (door side)}.
   BG = grid cell -> buildings covering that cell (a building is listed in every 256-unit cell its footprint touches). */
let BG=new Map();
function buildBldGrid(){BG=new Map();for(const b of bld){const x0=((b.x-b.hw-14)/256)|0,x1=((b.x+b.hw+14)/256)|0,y0=((b.y-b.hh-14)/256)|0,y1=((b.y+b.hh+14)/256)|0;
  for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const k=gx*512+gy;let a=BG.get(k);if(!a)BG.set(k,a=[]);a.push(b)}}}
function bldWet(i,x,y){try{return WMAP[tIx(i)%12][0]==='isles'&&mkH(i)(x-C,y-C)<2}catch(e){return false}} /* no houses in the water of the island worlds (WMAP does not exist yet while World 1 is built at start-up: that world is dry) */
/* v5_172 CULTURES: every world has its own architecture. Kinds: 0 cottage, 1 hall, 2 watchtower (flat top, standable), 3 pagoda, 4 skyscraper, 5 domed temple, 6 round tower, 7 yurt,
   8 obelisk, 9 ziggurat (3 standable tiers), 10 windmill, 11 crystal spire, 12 longhouse, 13 lighthouse, 14 well.
   home = [kind, weight] used for ordinary village buildings, land = tall / grand landmarks (lone, or the centre of a village, or a 'downtown' cluster).
   pal = [wallH,wallS,wallL, roofH,roofS,roofL, accentH,accentS,accentL]. */
const CUL=[
 {home:[[2,3],[0,2],[14,1]],land:[[9,3],[8,3],[6,2]],pal:[35,12,48,20,20,30,45,70,60]},                                   /* 0 Arena: ruined sandstone */
 {home:[[0,6],[1,2],[7,1],[2,1],[14,1]],land:[[3,5],[6,1],[2,2],[10,1]],pal:[40,25,70,5,55,32,45,80,58]},                  /* 1 Ashen Reach: lacquered pagodas */
 {home:[[0,4],[12,3],[1,2],[2,2],[14,1]],land:[[6,4],[9,2],[2,3],[4,1]],pal:[10,18,42,0,60,28,40,70,55]},                  /* 2 Crimson Dominion: war forts */
 {home:[[0,3],[5,3],[7,2],[14,1]],land:[[8,4],[11,4],[4,3],[5,2]],pal:[225,25,66,250,35,40,190,80,75]},                    /* 3 Starfall: observatories and crystals */
 {home:[[0,3],[12,3],[1,2],[2,2]],land:[[9,5],[6,3],[4,2],[8,1]],pal:[15,15,28,10,70,34,28,100,55]},                        /* 4 Ember Throne: forge ziggurats */
 {home:[[0,3],[5,3],[1,2],[7,1],[14,1]],land:[[3,4],[4,4],[5,3],[8,2],[11,1]],pal:[50,20,82,195,45,48,48,90,62]},          /* 5 Heavenfall: celestial spires */
 {home:[[0,5],[12,2],[7,2],[1,1],[14,2]],land:[[13,5],[6,2],[5,2],[10,1],[3,1]],pal:[190,30,72,205,50,35,15,70,58]},       /* 6 Tideglass: harbour */
 {home:[[7,4],[0,4],[12,2],[10,1],[14,1]],land:[[10,3],[3,2],[6,2],[11,1],[2,2]],pal:[30,32,45,110,40,30,85,60,55]},        /* 7 Verdant: wood and windmills */
 {home:[[2,3],[0,3],[1,2],[12,1]],land:[[4,4],[6,3],[8,3],[2,2],[13,1]],pal:[215,12,54,225,25,28,55,95,60]},                /* 8 Stormcrown: sky fortresses */
 {home:[[0,4],[1,2],[6,2],[14,1]],land:[[8,4],[6,4],[4,2],[9,1],[5,1]],pal:[340,10,30,350,50,22,355,80,50]},                /* 9 Bloodmoon: gothic spires */
 {home:[[0,5],[5,2],[7,2],[14,2],[1,1]],land:[[9,4],[8,4],[5,3],[10,1],[4,1]],pal:[38,50,66,30,60,45,45,95,58]},            /* 10 Sunforged: sandstone domes */
 {home:[[0,3],[5,2],[1,2],[7,2]],land:[[4,5],[11,5],[8,2],[5,2]],pal:[290,20,76,270,30,44,180,70,70]},                      /* 11 Mirrorveil: glass towers */
 {home:[[2,3],[0,3],[6,2],[14,1]],land:[[8,4],[11,3],[4,3],[6,2],[9,1]],pal:[265,15,24,275,35,20,285,80,58]},               /* 12 Voidmaw: obsidian */
 {home:[[12,3],[0,3],[1,3],[2,2]],land:[[6,4],[9,3],[8,2],[2,2],[4,1]],pal:[45,22,74,20,40,36,10,80,52]},                   /* 13 Dragonbone: bone halls */
 {home:[[0,3],[1,2],[7,1],[10,2],[14,1]],land:[[4,4],[6,4],[10,3],[8,2],[5,1]],pal:[30,28,50,35,60,36,45,90,60]},           /* 14 Chronos: clockwork */
 {home:[[1,3],[0,2],[5,2],[2,2]],land:[[4,5],[3,3],[8,3],[9,2],[5,1]],pal:[55,10,84,45,40,40,48,100,64]}];                   /* 15 Heaven-Sundering: monuments */
const KROUND=[6,7,10,13,14]; /* kinds with a circular footprint (hw = radius) */
function genVillages(i,R2){
  bld.length=0;
  const arena=i===ARENA,cu=CUL[arena?0:Math.min(i,15)],P9=cu.pal,rr=(a,b)=>a+R2()*(b-a),pick=l=>{let t=0;for(const e of l)t+=e[1];let r=R2()*t;for(const e of l){r-=e[1];if(r<=0)return e[0]}return l[0][0]};
  const H=(h,sa,l)=>'hsl('+(((Math.round(h)%360)+360)%360)+','+Math.round(Math.max(0,Math.min(100,sa)))+'%,'+Math.round(Math.max(4,Math.min(96,l)))+'%)'; /* whole numbers only: three.js r128 cannot parse decimals in hsl() */
  const hm=()=>{let k=pick(cu.home);if(k===14&&R2()<.8)k=pick(cu.home.filter(e=>e[0]!==14));return k}; /* wells are rare */
  const sites=[],lo=arena?Math.round(RIM*.6):TOWN+700,hi=arena?RIM-200:RIM-380; /* arena: landmarks only in the outer ring (60%-RIM-200 of the radius), the middle stays open */
  /* v5_184 FLAT GROUND ONLY: a building site must be on gentle, even ground. relief = highest minus lowest terrain height over the site (centre + 2 rings of 8 points); sites on mountain flanks are rejected, so nothing hangs on a slope or sits on a peak */
  let hf=null;try{hf=mkH(i)}catch(e){} /* WMAP does not exist yet while World 1 is built at start-up: that world is plain low hills, no check */
  const relief=(x,y,r)=>{if(!hf)return 0;let lo2=1e9,hi2=-1e9;const s=(dx,dy)=>{const h=hf(x-C+dx,y-C+dy);if(h<lo2)lo2=h;if(h>hi2)hi2=h};s(0,0);for(let q=0;q<8;q++){const a=q*.7854;for(const f of[.5,1])s(Math.cos(a)*r*f,Math.sin(a)*r*f)}return hi2-lo2};
  const findSite=(r,fa,fd)=>{let best=null,bestR=1e9;const rr2=Math.min(r,230),lim=22+rr2*.12; /* allowed relief: ~35-50 units over the footprint */
    for(let t=0;t<110;t++){const a=fa!=null?fa+(R2()-.5)*.3:R2()*Math.PI*2,d=fa!=null?Math.max(lo,Math.min(hi,fd+(R2()-.5)*160)):lo+Math.sqrt(R2())*(hi-lo),x=C+Math.cos(a)*d,y=C+Math.sin(a)*d;
      if(sites.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+r+130)||bldWet(i,x,y))continue;
      const rl=relief(x,y,rr2);if(rl<bestR){bestR=rl;best={x,y}}if(rl>lim)continue;const q={x,y,r};sites.push(q);return q}
    if(best&&bestR<=lim*1.6){const q={x:best.x,y:best.y,r};sites.push(q);return q}return null};
  let placed=[];
  const dims=(k)=>{ /* [hw, hh, wh, extra] */
    switch(k){
      case 0:return [rr(46,72),rr(40,62),rr(54,84)];case 1:return [rr(85,120),rr(56,78),rr(78,100)];case 2:{const w=rr(38,50);return [w,w,64]}
      case 3:{const w=rr(54,80),n=3+Math.floor(R2()*3);return [w,w,12+n*48+70,n]}
      case 4:{const v=Math.floor(R2()*3);if(v===2){const r=rr(48,66);return [r,r,rr(250,480),v]}return [rr(44,72),rr(44,72),rr(250,520),v]}
      case 5:{const w=rr(58,80);return [w,w*rr(.8,1.1),rr(70,90)+w*.9]}
      case 6:{const r=rr(36,52);return [r,r,rr(170,300)]}case 7:{const r=rr(34,46);return [r,r,78]}
      case 8:{const w=rr(22,30);return [w,w,rr(280,440)]}case 9:{const w=rr(110,150);return [w,w,78]}
      case 10:{const r=rr(34,44);return [r,r,rr(150,210)]}case 11:{const w=rr(30,44);return [w,w,rr(140,320)]}
      case 12:return [rr(100,140),rr(44,58),rr(52,70)];case 13:{const r=rr(34,46);return [r,r,rr(220,330)]}
      default:return [17,17,22]}};
  const colors=()=>{const rh=P9[3]+(R2()<.4?(R2()<.5?36:-36):0);return {wc:H(P9[0]+rr(-9,9),P9[1],P9[2]+rr(-8,8)),rc:H(rh,P9[4],P9[5]+rr(-6,6)),ac:H(P9[6],P9[7],P9[8]),tc:H(P9[0]+rr(-6,6),P9[1]*.7,P9[2]*.55),gc:H(P9[6]+rr(-10,10),55,76)}};
  /* put one building (a ziggurat adds 3 nested records). (tx,ty) = the point its door faces. Returns the record or null. */
  const put=(k,x,y,tx,ty,site,keepList)=>{
    const d=dims(k),hw=d[0],hh=d[1],wh=d[2],rd=KROUND.includes(k),m=Math.max(hw,hh);
    if(Math.hypot(x-C,y-C)>RIM-70-m||Math.hypot(x-C,y-C)<TOWN+140+m)return null;
    for(const q of keepList)if(Math.abs(q.x-x)<q.hw+hw+(k===14?24:46)&&Math.abs(q.y-y)<q.hh+hh+(k===14?24:46))return null;
    if(bldWet(i,x,y))return null;
    const dx=tx-x,dy=ty-y,sd=Math.abs(dx)>Math.abs(dy)?[dx>0?1:-1,0]:[0,dy>0?1:-1],col=colors();
    const mk=(extra)=>{const b=Object.assign({x,y,hw,hh,sy:y+hh,k,rd,wh,H:Infinity,fx:sd[0],fy:sd[1],sd:Math.floor(R2()*1e6),v:0,n:d[3]||0},col,extra);bld.push(b);return b};
    let b;
    if(k===9){ /* three nested tiers you can climb with jumps */
      const hs=[26,52,78],ws=[1,.7,.42];let top=null;
      for(let t=0;t<3;t++){const w=hw*ws[t];top=mk({hw:w,hh:w,wh:hs[t],H:hs[t],zt:t,sy:y+hw})}
      b=top;
    }else{
      b=mk(k===2?{H:72}:k===14?{H:22}:k===4?{v:d[3]}:{});
      if(k===4&&d[3]===2)b.rd=true;
      if(k===0)b.v=Math.floor(R2()*4);
      if(k===0&&b.v===3)b.wh=wh*1.45;
    }
    keepList.push({x,y,hw:Math.max(hw,k===9?hw:0),hh:Math.max(hh,k===9?hh:0)});
    if(site)site.r=Math.max(site.r,Math.hypot(x-site.x,y-site.y)+m);
    return b};
  const nSet=arena?0:8*MAP_K,nHam=arena?0:10*MAP_K,nLand=arena?6:14*MAP_K; /* v5_175 the PvP arena keeps a few lone landmarks near the rim: open ground to fight and run. v5_177: 3 -> 6, spaced evenly around the ring */
  /* ---- villages: ring, street, grid, scatter; with a landmark or a well in the middle ---- */
  for(let n=0;n<nSet;n++){
    const lay=Math.floor(R2()*4),cnt=lay===3?5+Math.floor(R2()*5):4+Math.floor(R2()*6),site=findSite(150+cnt*34);if(!site)continue;
    const kl=[],vx=site.x,vy=site.y;site.r=60;
    const centre=R2()<.55?pick(cu.land.filter(e=>e[0]!==9)):14;
    put(centre,vx,vy,vx,vy+1,site,kl);
    const homes=hm;
    if(lay===0||lay===3){ /* ring (all doors face the middle) / scatter */
      const base=Math.max(210,110+cnt*30);
      for(let q=0;q<cnt;q++){for(let t=0;t<10;t++){const a=(lay===0?q/cnt*Math.PI*2+rr(-.12,.12):R2()*Math.PI*2),r=lay===0?base+rr(-20,30):rr(180,420);put(homes(),vx+Math.cos(a)*r,vy+Math.sin(a)*r,vx,vy,site,kl)&&(t=99)}}
    }else if(lay===1){ /* street: two rows along an axis-aligned road, doors face the road */
      const horiz=R2()<.5,m=Math.ceil(cnt/2)+1;
      for(let q=0;q<m;q++)for(const sg of[-1,1]){if(R2()<.15)continue;const off=(q-(m-1)/2)*rr(150,175),side=rr(105,125)*sg;
        const x=horiz?vx+off:vx+side,y=horiz?vy+side:vy+off,tx=horiz?x:vx,ty=horiz?vy:y;put(homes(),x,y,tx,ty,site,kl)}
    }else{ /* grid of blocks around a plaza */
      const g=2+Math.floor(R2()*2);
      for(let a=-g;a<=g;a++)for(let b=-g;b<=g;b++){if(!a&&!b)continue;if(R2()<.45||Math.max(Math.abs(a),Math.abs(b))<1)continue;put(homes(),vx+a*rr(165,190),vy+b*rr(165,190),vx,vy,site,kl)}
    }
    placed=placed.concat(kl);
  }
  /* ---- hamlets and farmsteads: 2-3 buildings (windmills, longhouses, yurts ...) ---- */
  for(let n=0;n<nHam;n++){
    const site=findSite(210);if(!site)continue;const kl=[];site.r=60;
    const cnt=2+Math.floor(R2()*2),first=pick(R2()<.35?cu.land.filter(e=>![9,4].includes(e[0])):cu.home);
    put(first,site.x,site.y,site.x,site.y+1,site,kl);
    for(let q=0;q<cnt;q++){for(let t=0;t<8;t++){const a=R2()*Math.PI*2,r=rr(130,230);put(hm(),site.x+Math.cos(a)*r,site.y+Math.sin(a)*r,site.x,site.y,site,kl)&&(t=99)}}
  }
  /* ---- lone landmarks: tall and grand buildings scattered over the whole map, some as twins, some as a 'downtown' ---- */
  for(let n=0;n<nLand;n++){
    const k=pick(cu.land),dt=!arena&&(k===4||k===11||k===3)&&R2()<.45,site=arena?findSite(140,n/nLand*Math.PI*2+Math.PI/6,n%2?lo+(hi-lo)*.8:lo+(hi-lo)*.25):findSite(dt?480:140);if(!site)continue; /* arena: 6 landmarks 60 degrees apart, alternating inner and outer ring */const kl=[];site.r=60;
    if(dt){ /* downtown: a cluster of tall towers of one kind with different heights */
      const m=4+Math.floor(R2()*4);
      for(let q=0;q<m;q++){for(let t=0;t<10;t++){const a=R2()*Math.PI*2,r=q?rr(110,300):0;put(R2()<.8?k:pick(cu.land.filter(e=>e[0]!==9)),site.x+Math.cos(a)*r,site.y+Math.sin(a)*r,site.x,site.y,site,kl)&&(t=99)}}
    }else{
      put(k,site.x,site.y,site.x+rr(-1,1),site.y+(R2()<.5?1:-1)*rr(.3,1),site,kl);
      if(!arena&&R2()<.3&&k!==9)put(k,site.x+(R2()<.5?-1:1)*rr(190,260),site.y+rr(-60,60),site.x,site.y,site,kl); /* twin */
      if(!arena&&R2()<.35)for(let q=0;q<2;q++)for(let t=0;t<8;t++){const a=R2()*Math.PI*2,r=rr(170,260);put(hm(),site.x+Math.cos(a)*r,site.y+Math.sin(a)*r,site.x,site.y,site,kl)&&(t=99)} /* a few homes around it */
    }
  }
  /* clear scenery under the buildings */
  const keep=deco.filter(d=>{for(const b of bld){const m=Math.max(b.hw,b.hh)+55;if(Math.abs(d.x-b.x)<m&&Math.abs(d.y-b.y)<m)return false}return true});
  deco.length=0;for(const d of keep)deco.push(d);
  bld.sort((a,b)=>a.sy-b.sy||a.H-b.H);
}
function buildDecoGrid(){DG=new Map();for(let i=0;i<deco.length;i++){const d=deco[i],key=((d.x/256)|0)*512+((d.y/256)|0);let a=DG.get(key);if(!a)DG.set(key,a=[]);a.push(i)}}
const parts=[],beams=[],motes=[],mist=[];let shake=0;
const lm=document.createElement('canvas'),lctx=lm.getContext('2d');
const mistSpr=document.createElement('canvas');mistSpr.width=mistSpr.height=256;
{const g=mistSpr.getContext('2d'),gr=g.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256)}
for(let i=0;i<30*MAP_K;i++)mist.push({x:Math.random()*WORLD,y:Math.random()*WORLD,s:260+Math.random()*300,sp:6+Math.random()*10,a:.08+Math.random()*.1});
for(let i=0;i<64;i++)motes.push({x:Math.random(),y:Math.random(),ph:Math.random()*6.28,sp:.4+Math.random()*.8});

/* Monster scaling per level (all tunable):
   HP  : old base (28+24*lvl) is multiplied by (1 + lvl*MON_HP_PER_LV)  -> +0.5% per level
   DEF : (MON_DEF_BASE + lvl*MON_DEF_PER_LV), bosses x BOSS_DEF_MUL. Damage taken = dmg * (1 - def/(def + MON_DEF_K + YOUR level*MON_DEF_K_PER_LV)) * level-gap factor */
const MON_HP_PER_LV=.005,MON_DEF_BASE=6,MON_DEF_PER_LV=2.6,BOSS_DEF_MUL=1.5,MON_DEF_K=150,MON_DEF_K_PER_LV=3;
/* monster DEF vs YOUR level (stronger monsters resist more, weaker players pierce less) x level-gap penalty when the monster is above you */
/* LEVEL GAP DEFENSE: a monster above your level gets +5% DEF per level of gap (up to x4); one below you loses 1% per level (down to x0.6).
   effMonDef() is also what the DEF label above monsters shows. */
const monGapDef=g=>g>0?1+Math.min(3,g*.05):Math.max(.6,1+g*.01);
const effMonDef=m=>Math.round(m.def*monGapDef(m.lvl-P.lvl));
const monRed=m=>{const d=effMonDef(m);return d/(d+MON_DEF_K+P.lvl*MON_DEF_K_PER_LV)};
function monsterAt(x,y,boss,blv){
  const d=dist(x,y,C,C);
  const z=d<600?0:d<900?1:d<1200?2:d<1450?3:d<1800?4:d<2200?5:d<2600?6:d<3000?7:8;
  const t=TYPES[boss?(boss.ti!==undefined?boss.ti:BOSSES.indexOf(boss)):z];
  const lvl=boss?(blv||boss.lvl):levelAt(d);
  const k=(boss?12:1)*(lvl>300?1+(lvl-300)*.02:1);
  return {x,y,hx:x,hy:y,t,lvl,boss:!!boss,name:boss?boss.n:t.n,col:boss?boss.c:t.c,
    r:boss?30:t.r,spd:boss?t.s*.8:t.s,
    hp:Math.round((28+lvl*24)*k*(1+lvl*MON_HP_PER_LV)),maxhp:Math.round((28+lvl*24)*k*(1+lvl*MON_HP_PER_LV)),def:Math.round((MON_DEF_BASE+lvl*MON_DEF_PER_LV)*(boss?BOSS_DEF_MUL:1)),
    atk:(3+lvl*2.1)*(boss?1.6:1)*(lvl>300?1+(lvl-300)*.02:1),exp:Math.round((8+lvl*5)*(1+Math.max(0,lvl-30)*.08)*(boss?12:1)),
    aggro:boss?300:190,dead:false,respawn:0,cd:0,state:'idle',wt:rnd()*3,wx:0,wy:0,flash:0};
}
function levelAt(d){const w=W[curWorld],f=clamp((d-300)/(RIM-340),0,1);return w.lo+Math.round(f*(w.hi-w.lo))}
function setWorld(i){
  const w=W[i];curWorld=i;RIM=i===ARENA?ARENA_R:3080*MAP_K;
  TYPES=BASE.map((t,k)=>({n:w.m[k],c:w.c[k],r:t.r,s:t.s*(1+i*.05)}));
  ZONES=ZD.map((d,k)=>({n:w.z[k],d,lv:levelAt(k?ZD[k-1]:300),fill:w.f[k]}));
  const fr=[.3,.5,.75,.98],bd=[1300,1900,2500,3000].map(d=>d*MAP_K),ba=[-2.36,-.78,.78,2.36];
  BOSSES=w.b.map((b,k)=>({n:b[0],c:b[1],a:ba[k],d:bd[k],lvl:(i===NW-1&&k===3)?w.hi:w.lo+Math.round((w.hi-w.lo)*fr[k]),ti:w.bt[k]}));
}
/* ---------- random boss waves: random time, level, location. At most BOSS_MAX per wave (and alive at once). The server runs the same rules in shared worlds. ---------- */
const BOSS_MAX=5,BOSS_WAIT_MIN=60,BOSS_WAIT_MAX=240,BOSS_LIFE=1200;
let bossWaveT=0;
function announceBosses(list){
  if(!list.length)return;
  say((list.length>1?list.length+' bosses have':'A boss has')+' appeared in '+W[curWorld].n+'! Watch the minimap (red dots).','#ff9a6a',9000);
  for(const m of list)say('  '+m.name+' \u00b7 Lv '+m.lvl,'#e3b559',9000);
}
function spawnBossWave(){
  const alive=mons.filter(m=>m.boss&&!m.dead).length,n=Math.min(1+Math.floor(rnd()*BOSS_MAX),BOSS_MAX-alive),w=W[curWorld],out=[];
  for(let k=0;k<n;k++){
    const a=rnd()*Math.PI*2,d=700+rnd()*(RIM-340-700),lv=w.lo+Math.floor(rnd()*(w.hi-w.lo+1));
    const m=monsterAt(C+Math.cos(a)*d,C+Math.sin(a)*d,BOSSES[Math.floor(rnd()*BOSSES.length)],lv);
    m.life=BOSS_LIFE;mons.push(m);out.push(m);
  }
  announceBosses(out);
}
function buildWorld(i,spawn){
  P.sel=null;
  setWorld(i);
  mons.length=0;ores.length=0;items.length=0;projs.length=0;fx.length=0;texts.length=0;deco.length=0;parts.length=0;beams.length=0;delayed.length=0;
  const R2=rngSeed(20261101+i*7919);
  for(let k=0;k<9;k++){ /* fixed monster count per ring, even per AREA inside each ring (keep equal to ringMons in game.go) */
    const lo=k?ZD[k-1]:500,hi=k<8?ZD[k]:RIM-40;
    for(let n=0;n<RING_MONS[k];n++){
      const a=R2()*Math.PI*2,d=Math.sqrt(lo*lo+R2()*Math.max(0,hi*hi-lo*lo));
      if(!spawn&&i!==ARENA)mons.push(monsterAt(C+Math.cos(a)*d,C+Math.sin(a)*d,null)); /* still draws the same random numbers so ore and scenery stay identical */
    }
  }
  if(spawn){
    /* shared world: the server owns every monster. [id, x, y, bossIdx, maxHp, def, radius, hp, dead] */
    for(const e of (i===ARENA?[]:spawn)){ /* the Colosseum is players-only: ignore any monster a server sends for it */
      const b=e[3]>=0?BOSSES[e[3]]:null,m=monsterAt(e[1],e[2],b,e[9]);
      m.id=e[0];m.maxhp=e[4];m.hp=e[7];m.def=e[5];m.r=e[6];m.tx=m.x;m.ty=m.y;
      if(e[8]){m.dead=true;m.dieT=0;m.respawn=1e9}
      mons.push(m);
    }
  }else if(i!==ARENA)bossWaveT=4+rnd()*16; /* solo: bosses arrive in random waves (see spawnBossWave) */
  for(let n=0;n<80*MAP_K;n++){
    const a=R2()*Math.PI*2,d=400+R2()*(RIM-500);
    if(i!==ARENA)ores.push({x:C+Math.cos(a)*d,y:C+Math.sin(a)*d,cd:0});
  }
  for(let n=0;n<1500*MAP_K;n++){
    const a=R2()*Math.PI*2,d=Math.sqrt(R2())*RIM;
    if(d<TOWN+40||(i===ARENA&&n%4))continue;
    deco.push({k:Math.floor(R2()*3),x:C+Math.cos(a)*d,y:C+Math.sin(a)*d,s:.7+R2()*.8});
  }
  genVillages(i,rngSeed(55555+i*104729));
  buildDecoGrid();buildBldGrid();
}
buildWorld(1);

/* ---------- helpers ---------- */
var CP={log:[],cur:'all',th:new Map(),un:{world:0,sys:0,party:0},who:new Map(),raf:0,stick:true};
/* feed(): the floating text over the game. say(): feed + a line in the chat window's System tab. */
function feed(t,col,ms){
  ms=ms||6000;
  const el=document.createElement('div');el.textContent=t;if(col)el.style.color=col;
  if(ms!==6000)el.style.animationDuration=(ms/1000)+'s';
  const log=$('log');log.appendChild(el);
  while(log.children.length>6)log.removeChild(log.firstChild);
  setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el)},ms);
}
function say(t,col,ms){feed(t,col,ms);cpPush({k:'sys',m:String(t),col:col||''})}
function pop(x,y,txt,col,size){texts.push({x,y,txt,col:col||'#fff',size:size||13,t:0})}
function ring(x,y,r,col,kind){fx.push({x,y,r,col,kind,t:0,max:kind==='whirl'?.5:.35})}
let SPK_T=0; /* v5_185 3D mode draws HALF the sprites (every other spawn is skipped, also for single-sprite calls) and each one is bigger (point size 9 -> 13) */
function spark(x,y,col,n,spd,life,size,up){
  if(parts.length>600)parts.splice(0,120);
  let half=false;try{half=MODE3D}catch(e){}
  for(let i=0;i<n;i++){if(half){SPK_T^=1;if(SPK_T)continue}const a=rnd()*6.2832,s=spd*(.3+rnd()*.7);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(up||0),life:life*(.6+rnd()*.4),max:life,col,size:size*(.6+rnd()*.8)})}
}
function hexRgb(h){const n=parseInt(h.slice(1),16);return (n>>16)+','+((n>>8)&255)+','+(n&255)}
function daylight(){const ph=((time/240)+.5)%1;return .5+.5*Math.sin(ph*6.2832-1.5708)}
function phaseName(){const ph=((time/240)+.5)%1,L=daylight();return L>.72?'Day':L<.28?'Night':(ph<.5?'Dawn':'Dusk')}
const inTown=()=>dist(P.x,P.y,C,C)<TOWN;
/* ---------- sound: combat state + effect helpers (the synth engine itself is web/audio.js) ---------- */
let combatT=0; /* seconds of "in combat" left; refreshed by hits given/taken and by monsters chasing you */
const SFX=n=>{try{if(window.SND)SND.play(n)}catch(e){}};
const combatPing=s=>{combatT=Math.max(combatT,s||6)};
const SKFAM={pierce:'proj',fan:'proj',kunai:'proj',arrow:'proj',volley:'proj',stormarrow:'lightning',eagle:'proj',
  strike:'slash',cleave:'slash',flurry:'slash',execute:'slash',venom:'slash',siphon:'slash',counter:'slash',bladestorm:'slash',
  bash:'smash',hammer:'smash',quake:'smash',shockwave:'smash',leap:'smash',
  shadowstep:'dash',rush:'dash',gale:'dash',charge:'dash',
  heal:'heal',mend:'heal',soulheal:'heal',
  might:'buff',ironskin:'buff',bulwark:'buff',guardian:'buff',roar:'buff',smoke:'buff',
  nova:'aoe',blast:'explosion',meteor:'explosion',soulburst:'aoe',spiritbomb:'explosion',rain:'aoe',wail:'aoe',harvest:'aoe',trap:'lightning',chain:'lightning',chains:'lightning'};
const sfxSkill=t=>SFX('cast_'+(SKFAM[t]||'magic'));
function combatNow(dt){
  if(inTown()||P.dead>0){combatT=0;return false}
  for(const m of mons){if(m&&!m.dead&&m.state==='chase'&&Math.abs(m.x-P.x)<520&&Math.abs(m.y-P.y)<520){combatT=Math.max(combatT,5);break}}
  combatT-=dt;return combatT>0;
}
function zoneName(){
  if(inTown())return W[curWorld].hub+' · safe';
  if(curWorld===ARENA)return 'Arena Grounds \u00b7 PvP';
  const d=dist(P.x,P.y,C,C);
  for(const z of ZONES)if(d<z.d)return z.n+' \u00b7 Lv '+z.lv+'+';
  return ZONES[8].n;
}

/* ---------- save ---------- */
const AUTH={token:'',email:'',ign:'',ok:false,ver:null}; /* ver = the server save version this page is based on (null = not loaded yet) */
const SID=Math.random().toString(36).slice(2)+Date.now().toString(36); /* v5_186 one id per page load: lets the server tell a stale device from the live one */
/* v5_79 two accounts in one browser: the login (token + email + name) is kept PER TAB in sessionStorage (survives a refresh of that tab) and
   also in localStorage as 'last login', which only a NEW tab uses. Before, every tab shared one localStorage slot, so logging in with a second account
   in another tab replaced the first tab's login and a refresh there showed the other account. */
const authGet=k=>{try{const v=sessionStorage.getItem(k);if(v!==null)return v}catch(e){}try{return localStorage.getItem(k)}catch(e){return null}};
const authSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){}try{localStorage.setItem(k,v)}catch(e){}};
const authForget=()=>{const t=AUTH.token; /* this tab's login is dropped; the shared 'last login' only if it is still ours */
  try{sessionStorage.removeItem('al_token');sessionStorage.removeItem('al_email')}catch(e){}
  try{if(!t||localStorage.getItem('al_token')===t){localStorage.removeItem('al_token');localStorage.removeItem('al_email')}}catch(e){}};
try{AUTH.token=authGet('al_token')||'';AUTH.email=authGet('al_email')||''}catch(e){}
const saveKey=()=>'ashenlotus_'+String(AUTH.email||'').toLowerCase();   /* one local save slot PER account, so two accounts in the same browser can never overwrite each other */
let cloudT=0,cloudStr=null,cloudBusy=false,cloudRetryT=0,cloudWarnAt=0;
function cloudPush(str){if(!AUTH.ok)return;cloudStr=str;if(!cloudT)cloudT=setTimeout(cloudFlush,2000)}
/* v5_186 CLOUD SAVE: one request in flight at a time (its completion sends the newest state), a failed save is KEPT and retried every 5 s (it used to be dropped),
   a refused save (another device holds newer progress) reloads this page from the account instead of overwriting it. force = closing / being signed out: send now even if one is in flight. */
function cloudFlush(force){
  if(cloudT){clearTimeout(cloudT);cloudT=0}
  if(!AUTH.ok||cloudStr===null)return;
  if(cloudBusy&&!force)return;
  const b=cloudStr;cloudStr=null;cloudBusy=true;
  const h={'Content-Type':'application/json',Authorization:'Bearer '+AUTH.token,'X-Sid':SID};if(AUTH.ver!==null)h['X-Base-Ver']=String(AUTH.ver);
  fetch('/api/save',{method:'POST',keepalive:b.length<60000,headers:h,body:b}).then(r=>r.json().catch(()=>({})).then(j=>{
    cloudBusy=false;
    if(r.ok){if(j&&j.ver!==undefined)AUTH.ver=j.ver|0;cloudWarnAt=0;if(cloudStr!==null)cloudFlush();return}
    if(r.status===409){cloudConflict();return}
    if(r.status===401){if(!cloudWarnAt){cloudWarnAt=Date.now();try{say('Your login expired: the progress is kept in this browser. Log out and log in again to sync it.','#ff9a6a',12000)}catch(e){}}return}
    cloudRetry(b)})).catch(()=>{cloudBusy=false;cloudRetry(b)});
}
function cloudRetry(b){
  if(cloudStr===null)cloudStr=b; /* a newer state may already be waiting: keep that one */
  if(!cloudWarnAt||Date.now()-cloudWarnAt>60000){cloudWarnAt=Date.now();try{say('Could not reach the server to save your progress: retrying (it is also stored in this browser).','#ff9a6a',8000)}catch(e){}}
  if(!cloudRetryT)cloudRetryT=setTimeout(()=>{cloudRetryT=0;cloudFlush()},5000);
}
/* the account is now played on ANOTHER device (this page is stale: it was signed out, or woke up from sleep): never overwrite that progress. The server keeps this page's save as a backup;
   this page signs out (it must not log in again by itself: that would sign the live device out). The browser copy is kept: on the next login the newer account save wins over it (its 'sv' is older). */
function cloudConflict(){
  if(!AUTH.ok)return; /* already signed out / being kicked: that path handles it */
  AUTH.ok=false;try{NET.giveUp=true}catch(e){}
  if(cloudT){clearTimeout(cloudT);cloudT=0}if(cloudRetryT){clearTimeout(cloudRetryT);cloudRetryT=0}cloudStr=null;
  authForget();
  try{if(NET.ws)NET.ws.close()}catch(e){}
  setTimeout(()=>{alert('This account is now being played on another device, so this page was signed out. Log in again to continue with the latest save.');location.reload()},50);
}
/* closing the tab / browser without Logout: write the CURRENT state (not the last timer save) to the browser and the account */
function saveNow(){if(started&&AUTH.ok){try{save()}catch(e){}}cloudFlush(true)}
let saveSoonT=0;function saveSoon(){if(saveSoonT||!started)return;saveSoonT=setTimeout(()=>{saveSoonT=0;try{save()}catch(e){}},1200)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});
window.addEventListener('pagehide',saveNow);window.addEventListener('beforeunload',saveNow);
function save(){
  if(!AUTH.ok)return;
  const str=JSON.stringify({v:2,pm:PVPLVL,ts:Date.now(),gv:GEAR_VER,sv:AUTH.ver===null?undefined:AUTH.ver,lvl:P.lvl,exp:P.exp,coins:P.coins,ore:P.ore,wlv:P.wlv,alv:P.alv,wv:2,wi:curWorld===ARENA?1:curWorld,eq:EQ,as:AUTOSK.map(x=>x?1:0),sk:SKIN,lkv:2,lk:LOOKS.map((v,i)=>i===P.cls?SKIN:v),gear:P.gear,bag:bagArr(),pots:P.pots,wh:whArr(),eg:P.eggs|0,pt:P.pets,sp:P.pet||'',fb:P.fightBack?1:0,tm:P.tapMove?1:0,mk:1,sg:1,cl:P.cls,cs:CLS_STORE.map(x=>x?{e:x.e,a:x.a.map(y=>y?1:0)}:null),ap:P.autoPot?1:0,ah:P.apHp,aq:P.apQi});
  try{localStorage.setItem(saveKey(),str)}catch(e){}
  cloudPush(str);
  netInfo();
}
function load(){
  try{
    const s=JSON.parse(localStorage.getItem(saveKey())||'null');
    if(!s)return false;
    P.lvl=Math.min(MAXLV,Math.max(1,s.lvl|0));P.exp=s.exp|0;P.coins=s.coins|0;P.ore=s.ore|0;P.wlv=s.wlv|0;P.alv=s.alv|0;applyLook(s.sk===undefined?(parseInt(localStorage.getItem(lookKey())||'0',10)||0):s.sk);
    const gm=s.gv===GEAR_VER?()=>1:GEAR_OLD[s.gv]?gearMulFrom(s.gv):gearMul; /* older saves: rolled stats were on the old scale, bring them to the new one (v3 saves are already scaled, so only the ratio is applied) */
    if(s.gear&&typeof s.gear==='object')for(const q of GEAR){const o=s.gear[q.k];if(o){const t=P.gear[q.k];t.g=clamp(o.g|0,0,NW);t.lv=clamp(o.lv|0,0,FORGE_MAX);t.r=clamp(o.r|0,0,RAR.length-1);t.st={};if(o.st&&typeof o.st==='object')for(const k in o.st)if(k in STATBASE||k in SPECIAL){const v=+o.st[k];if(v>=0&&v<1e6)t.st[k]=r2(v*gm(k))}fixGear(t,q)}}
    const parseGear=(arr,cap)=>{const out=[];if(Array.isArray(arr))for(const o of arr.slice(0,cap)){const q=o&&GEAR.find(z=>z.k===o.slot);if(!q)continue;const it={slot:q.k,g:clamp(o.g|0,1,NW),r:clamp(o.r|0,0,RAR.length-1),st:{}};if(o.st&&typeof o.st==='object')for(const k in o.st)if(k in STATBASE||k in SPECIAL){const v=+o.st[k];if(v>=0&&v<1e6)it.st[k]=r2(v*gm(k))}addQrg(it,q);it.col=RAR[it.r].c;it.u=bagUid++;out.push(it)}return out};
    P.bag=parseGear(s.bag,200);P.wh=parseGear(s.wh,WH_CAP);P.eggs=clamp(s.eg|0,0,99999);P.pets=parsePets(s.pt);P.pet=petLoad(s.sp);P.pf=null;
    PVPLVL=clamp(s.pm|0,0,3);
    if(s.pots)P.pots={hp:clamp(s.pots.hp|0,0,9999),qi:clamp(s.pots.qi|0,0,9999),tp:clamp(s.pots.tp|0,0,9999),ck:clamp(s.pots.ck|0,0,9999)};P.autoPot=s.ap!==0;P.apHp=clamp((s.ah|0)||35,5,95);P.apQi=clamp((s.aq|0)||20,5,95);P.fightBack=s.fb!==0;P.tapMove=s.tm!==0;
    let wi=s.wi|0;if(s.wv!==2&&wi<=10)wi++; /* older saves: world numbers started at 0 for Ashen Reach */
    wi=clamp(wi,0,NW-1);if(wi===ARENA)wi=1;if(wi!==curWorld)buildWorld(wi);
    P.cls=clamp(s.cl|0,0,CLASSES.length-1);loadLooks(s);CLS_STORE.fill(null);
    if(Array.isArray(s.cs))for(let c=0;c<CLASSES.length;c++){const o=s.cs[c];if(o&&Array.isArray(o.e)&&c!==P.cls)CLS_STORE[c]={e:o.e.slice(0,NSLOT).map(v=>v|0),a:o.e.slice(0,NSLOT).map((_,i)=>!Array.isArray(o.a)||o.a[i]!==0)}}
    if(s.v===2&&Array.isArray(s.eq)&&s.eq.length<=NSLOT){for(let i=0;i<NSLOT;i++){const q=SKILLS[s.eq[i]];EQ[i]=q&&P.lvl>=q.lv&&(q.c||0)===P.cls?s.eq[i]:-1}}else autoArrange();
    for(let i=0;i<NSLOT;i++)AUTOSK[i]=!Array.isArray(s.as)||s.as[i]!==0;
    if(s.mk!==1&&P.cls===0)giveMelee();
    if(s.sg!==1)giveSig();
    buildBar();
    P.hp=maxHp();P.qi=maxQi();return true;
  }catch(e){return false}
}

/* ---------- combat ---------- */
let lvUpT=0,lvUpT2=0;
function lvBanner(lv,gained,realm){
  const b=$('lvUp');if(!b)return;
  b.innerHTML='';b.className='';
  b.appendChild(document.createElement('b')).textContent='LEVEL UP!';
  b.appendChild(document.createElement('small')).textContent='You reached level '+lv+(gained>1?' (+'+gained+' levels)':'')+(realm?' \u00b7 Breakthrough: '+realm+' realm':'')+' \u00b7 HP & Qi restored';
  b.hidden=false;b.style.animation='none';void b.offsetWidth;b.style.animation='';
  clearTimeout(lvUpT);clearTimeout(lvUpT2);lvUpT=setTimeout(()=>{b.className='fade'},1900);lvUpT2=setTimeout(()=>{b.hidden=true;b.className=''},2450);
}
function gainExp(n){
  if(P.lvl>=MAXLV)return;
  P.exp+=n;if(SV.on)SV.exp+=n;let gained=0,bt=null;
  while(P.lvl<MAXLV&&P.exp>=expNext()){
    P.exp-=expNext();
    const before=realmIdx();P.lvl++;
    P.hp=maxHp();P.qi=maxQi();
    gained++;ring(P.x,P.y,90,'#e3b559');ring(P.x,P.y,150,'#fff3c4','whirl');ring(P.x,P.y,210,'#ffd98a');beams.push({x:P.x,y:P.y,t:0,max:1.1});beams.push({x:P.x,y:P.y,t:0,max:1.6});spark(P.x,P.y,'#ffd98a',60,260,1.1,3,120);spark(P.x,P.y,'#ffffff',24,140,.8,2.4,160);
    pop(P.x,P.y-40,'LEVEL '+P.lvl,'#e3b559',18);
    say('You reached level '+P.lvl+'.','#e3b559');SFX('levelup');fxs({k:'ri',x:P.x,y:P.y,r:90,c:'#e3b559',s:1});
    if(P.lvl%5===0){unlock(P.lvl/5);for(const ck of CLK)if(ck&&ck[P.lvl/5]!==undefined)unlockId(ck[P.lvl/5]);for(const sk of SIGK)if(sk[P.lvl]!==undefined){unlockId(sk[P.lvl]);pop(P.x,P.y-70,'SIGNATURE SKILL','#ffe27a',16)}}
    for(const id of MELEE)if(P.lvl>1&&SKILLS[id].lv===P.lvl)unlockId(id);
    if(realmIdx()>before){bt=realmName(realmIdx());say('Breakthrough! You enter the '+realmName(realmIdx())+' realm.','#5fd3a5')}
    save();
  }
  if(gained)lvBanner(P.lvl,gained,bt);
}
function hitMonster(m,dmg,crit,sure){ /* sure (v5_219): skip the accuracy roll, used for pet burn ticks */
  if(m.dead||m.pend||pvpOnly()||inTown())return 0; /* v5_90 no attacking inside the safe hub */
  if(!sure&&rnd()>hitChance(m)){ /* missed: no damage, but the monster still notices you */
    if(m.state==='idle'&&!inTown())m.state='chase';
    pop(m.x,m.y-m.r-8,'MISS','#9aa7ad',12);SFX('miss');combatPing();return 0;
  }
  dmg=Math.max(1,Math.round(dmg*(1-monRed(m))*atkGap(m.lvl,P.lvl)*(1+(m.boss?bsaVal():mabVal())/100)));
  m.hp-=dmg;m.flash=.12;
  if(P.lsT>0||P.markT>0||P.linkT>0)sigOnHit(m,dmg); /* v5_160 lifesteal / death mark / soul web */
  spark(m.x,m.y,crit?'#ffd36b':'#ffd9a0',crit?12:6,170,.35,2.6);if(crit)shake=Math.max(shake,.5);
  if(m.state==='idle'&&!inTown())m.state='chase';
  pop(m.x,m.y-m.r-8,String(dmg)+(crit?'!':''),crit?'#ffd36b':'#fff',crit?17:13);SFX(crit?'crit':'hit');combatPing();
  if(MP){
    /* the server applies the damage and decides the kill; we only predict the health bar */
    netSend({t:'hit',i:m.id,d:dmg,cr:crit?1:0});m.predT=.35;
    if(m.hp<=0){m.hp=0;m.pend=true}
    return dmg;
  }
  if(m.hp<=0)killMonster(m);
  return dmg;
}
function killMonster(m,noReward){
  m.dead=true;m.dieT=.5;m.pend=false;m.respawn=MP?1e9:(m.boss?90:14+rnd()*8);
  if(dist(m.x,m.y,P.x,P.y)<800)SFX(m.boss?'boss':'kill');
  spark(m.x,m.y,m.col,m.boss?40:18,220,.7,3.2);if(m.boss)shake=1;
  if(P.target===m)P.target=null;
  if(P.sel===m)P.sel=null;
  if(m.boss)say(m.name+' has fallen.','#e3b559');
  if(!noReward)rewardKill(m);
}
/* experience and loot are personal: everyone who damaged the monster gets their own */
function rewardKill(m,noLoot){
  gainExp(Math.max(1,Math.round(m.exp*Math.max(.1,Math.min(1,1-(P.lvl-m.lvl)*.04)))));
  if(noLoot){say(m.name+' fell to another fighter\u2019s last hit. Its loot goes to them.','#8d9aa2');return}  /* boss loot: last hit only */
  /* every drop goes straight into the bag */
  const coin=Math.round((2+m.lvl*2)*(m.boss?15:1)*(.7+rnd()*.6));
  P.coins+=coin;lootIcon('c','&#9679;',coin,'#e3b559');pop(P.x,P.y-30,'+'+coin,'#e3b559',12);bagLog('+'+coin.toLocaleString()+' coins','#e3b559');
  if(m.boss||rnd()<.12){const o=m.boss?4+Math.floor(m.lvl/100):1;P.ore+=o;lootIcon('o','&#9670;',o,'#7fe0ee');pop(P.x+14,P.y-44,'+'+o+' ore','#7fe0ee',12);bagLog('+'+o+' darksteel ore','#7fe0ee')}
  addPot('hp',m.boss?3+Math.floor(rnd()*4):(rnd()<POT_DROP?1:0));
  addPot('qi',m.boss?3+Math.floor(rnd()*4):(rnd()<POT_DROP?1:0));
  addPot('tp',m.boss?1+Math.floor(rnd()*2):(rnd()<TP_DROP?1:0));
  if(m.boss&&rnd()<GEAR_DROP_CHANCE)dropGear(m);
  if(m.boss&&rnd()<EGG_DROP_CHANCE)giveEgg(m);
}
function dropGear(m){
  /* 1-3 random pieces per boss: random slot, random rarity, random stat rolls */
  const t=rnd(),n=t<.55?1:t<.88?2:3,w=W[curWorld],f=(m.lvl-w.lo)/Math.max(1,w.hi-w.lo);
  for(let i=0;i<n;i++){
    const miss=GEAR.filter(q=>P.gear[q.k].g===0),pool=miss.length&&rnd()<.5?miss:GEAR;
    const q=pool[Math.floor(rnd()*pool.length)],it=rollGear(q,curWorld,f,rollRarity());
    say(m.name+' dropped '+gearName(q,it)+'!',it.col);
    takeGear(it);
  }
}
const fmtSt=(k,v)=>SPECIAL[k]?Math.round(v*100)/100:Math.round(v*10)/10;
function statArr(st,lv,q){const a=[];for(const k of Object.keys(st)){const f=q&&q.st[k];if(f&&FLAT_STATS[k]){a.push('+'+fmtSt(k,st[k])+STAT_LBL[k]);const p=slotFlatPct(q,k,lv)*100;if(p>0)a.push('+'+fg2(p)+'% '+STAT_LBL[k].trim()+' (forge)')}else a.push('+'+fmtSt(k,st[k]+(f?forgeEff(lv)*f[1]:0))+STAT_LBL[k])}return a}
function statTxt(st,lv,q){return statArr(st,lv,q).join(', ')}
const BAG_CAP=50,WH_CAP=100;let bagUid=1; /* bag holds 50 slots; the hub Warehouse holds 100 spare gear pieces */
const bagArr=()=>P.bag||(P.bag=[]);
const whArr=()=>P.wh||(P.wh=[]);
const oreOf=it=>(2+it.g*2)*(1+it.r);
function bagCount(){let n=(P.coins>0)+(P.ore>0)+(P.wlv>0&&P.gear.wpn.g===0)+(P.alv>0&&P.gear.robe.g===0)+(P.eggs>0)+petStacks()+bagArr().length;for(const k of ['hp','ck','qi','tp'])if(P.pots[k]>0)n++;for(const q of GEAR)if(P.gear[q.k].g>0)n++;return n}
/* the bag used to hold 100: anything over the cap moves to the warehouse (up to its 100 slots) */
function fixBagOverflow(){const A=bagArr(),W=whArr();let n=0;while(bagCount()>BAG_CAP&&A.length&&W.length<WH_CAP){W.push(A.pop());n++}if(n){bagLog(n+' spare piece'+(n>1?'s':'')+' moved to the Warehouse (bag is now '+BAG_CAP+' slots)','#8d9aa2');save()}}
function takeGear(it){
  const q=GEAR.find(z=>z.k===it.slot),o=P.gear[q.k],nm=gearName(q,it),A=RAR[it.r];
  if(bagCount()<BAG_CAP){
    it.u=bagUid++;bagArr().push(it);lootIcon('g'+q.k+it.r,'&#10022;',1,it.col);
    say('Stored '+nm+' in your bag ('+statTxt(it.st,0,null)+'). Open the bag to equip it.',it.col);bagLog('Stored '+nm,it.col);pop(P.x,P.y-36,nm,it.col,15);
  }else{
    const ore=oreOf(it);P.ore+=ore;lootIcon('o','&#9670;',ore,'#7fe0ee');
    say('Bag full. Sold '+nm+' for '+ore+' ore.','#7fe0ee');bagLog('Bag full: sold '+nm+' \u2192 '+ore+' ore','#7fe0ee');
  }
  save();if(!$('forge').hidden)renderForge();
}
/* Ranged balance: damage falls off with distance (RANGE_FALL = loss at max range) and one ranged hit can never take more than
   RANGED_CAP of a normal monster's max HP, so long-range skills no longer one-shot. Bosses are not capped. Tune these two numbers. */
const RANGE_FALL=.5,RANGED_CAP=.5;
/* v5_80 NORMAL ATTACK RANGE per class [Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner]: 0 = melee (body size + 30), otherwise the attack
   reaches that many units. Ranged normal attacks lose up to BASIC_FALL of their damage at full range and you stand at BASIC_STAND of the range from the target. */
const BASIC_RANGE=[0,0,0,460,380],BASIC_FALL=.25,BASIC_STAND=.75,BASIC_COL=['','','','#9fe8c8','#9fe0ff'];
function rangedDmg(m,d,fr){d=Math.round(d*(1-RANGE_FALL*clamp(fr,0,1)));if(!m.boss)d=Math.min(d,Math.max(1,Math.round(m.maxhp*RANGED_CAP)));return d}
const CRIT_MUL=1.8;
const SKILL_GCD=1; /* seconds between two skill casts (manual or auto); v5_190: 0.45 -> 1; v5_192: 2; v5_193: back to 1 */
function sd(m,x,fr){const c=rnd()<critChance();let d=Math.round(atkVal()*x*(c?critMul():1)*(.9+rnd()*.2));if(fr!==undefined)d=rangedDmg(m,d,fr);return hitMonster(m,d,c)}
/* the thing skills aim at: the attack target, else the selected monster (or selected player while PvP-flagged) */
function aimT(){const t=P.target&&!P.target.dead?P.target:null;if(t)return t;const q=P.sel;return q&&!q.dead&&(!q.isPl||pvpOk(q))?q:null}
/* v5_81 melee classes (Cultivator, Night Blade, Iron Guardian) are close-range fighters: their ranged-type skills only work on a target within MELEE_SKILL_RANGE
   (nothing is spent otherwise), and their projectiles stop there. Ranged classes (Storm Archer, Spirit Summoner) are unchanged. */
/* v5_82 Iron Guardian: all its attack skills and buffs only fire when the target is in real melee reach (body sizes + IG_PAD), the same reach as the normal attack,
   by hand and in auto-hunt. Before, Bash / Hammer reached 170-200 units and Earthquake / War Cry / Seismic Wave / the buffs triggered on enemies much farther away. */
const IG_PAD=40,IG_DMG_T={bash:1,hammer:1,quake:1,roar:1,counter:1,shockwave:1},IG_AUTO_T={bash:1,hammer:1,quake:1,roar:1,counter:1,shockwave:1,bulwark:1,ironskin:1};
const CAST_T=.3,CAST_T_LONG=.5, /* v5_155 cast pose halved (was .6 / 1.0) */ CAST_NOROOT={charge:1,shadowstep:1,rush:1,gale:1,leap:1},CAST_LONG={meteor:1,spiritbomb:1,rain:1,quake:1,hammer:1,wail:1,wolves:1,guardian:1,roar:1,eagle:1,bulwark:1,volley:1};
const BOSS_LEASH=4500,BOSS_LOSE=3600,MON_LEASH=800,MON_LOSE=1000; /* v5_157 leash enlarged (keep equal to monLeash / monLose / bossLeash / bossLose in game.go): was boss 3000 / 2400, monster 520 / 650 */
const MELEE_SKILL_RANGE=200,MELEE_RANGED_T={pierce:1,fan:1,meteor:1,chain:1,drain:1,kunai:1,venom:1};
const AIM_REACH={charge:400,shadowstep:420,rush:420,shockwave:420,execute:200,siphon:170,bash:170,hammer:200}; /* v5_122 reach used to pick a target for a skill cast with no target */
/* v5_122 manual casts never need a target in range: nothing in reach -> the skill still fires (toward where you face; dashes move you forward) and costs Qi / starts its cooldown.
   Auto-hunt (useSkill(i,true)) keeps the old range checks so it does not waste Qi on far targets. */
const WHIFF_R={shadowstep:420,execute:200,siphon:170,venom:1,bash:170,hammer:200,blast:520,stormarrow:520,chains:400,strike:170,flurry:170,cleave:200,leap:360,chain:420};
function hasFoeFor(t,tg0,mel,mr){
  const r=t==='venom'?(mel?mr:460):WHIFF_R[t],ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=r;
  if(ok(tg0)||nearest(r))return true;
  if(t==='chain'&&tg0&&!tg0.dead&&dist(tg0.x,tg0.y,P.x,P.y)<600)return true;
  if(t==='chains'&&foes().some(q=>dist(q.x,q.y,P.x,P.y)<400))return true;
  return false}
function whiffCast(t,s){
  const a=P.face,cx=Math.cos(a),cy=Math.sin(a);
  if(t==='shadowstep'||t==='leap'){const L=t==='shadowstep'?260:200,sx=P.x,sy=P.y;
    for(let j=0;j<12;j++)spark(sx+cx*L*j/12,sy+cy*L*j/12,s.col,2,60,.4,2.4);
    P.x=sx+cx*L;P.y=sy+cy*L;P.inv=Math.max(P.inv,.3);ring(P.x,P.y,50,s.col,'whirl');fxs({k:'ri',x:P.x,y:P.y,r:50,c:s.col,q:'whirl',s:1});return}
  const D=({blast:200,stormarrow:260,chain:200,chains:160})[t]||90,x=P.x+cx*D,y=P.y+cy*D;
  for(let j=1;j<=6;j++)spark(P.x+cx*D*j/6,P.y+cy*D*j/6,s.col,1,40,.35,2.4);
  ring(x,y,45,s.col);spark(x,y,s.col,14,160,.4,2.4);fxs({k:'ri',x:Math.round(x),y:Math.round(y),r:45,c:s.col})}
/* v5_130 real reach of every attack skill type = [distance from you, 1 if the target's body radius counts]. Mirrors the radius / length used by useSkill itself. */
function skillReach(t,tr,mel,mr){if(SIGR[t])return[SIGR[t],0];switch(t){
  case 'nova':return [tr<0?120:150+tr*14,1];case 'drain':return [170,1];case 'bladestorm':return [120+tr*8,1];
  case 'quake':return [160+tr*12,1];case 'roar':return [240,1];case 'counter':return [150+tr*8,1];
  case 'soulburst':return [140+tr*10,1];case 'wail':return [240,1];case 'harvest':return [200,1];
  case 'chains':return [400,0];case 'shockwave':return [420,1];case 'rush':return [280+tr*10,1];
  case 'shadowstep':return [420,0];case 'execute':return [200,0];case 'siphon':return [170,0];case 'venom':return [mel?mr:460,0];
  case 'charge':return [400,0];case 'bash':case 'strike':case 'flurry':return [170,0];case 'hammer':case 'cleave':return [200,0];case 'leap':return [360,0];
  case 'pierce':case 'fan':return [mel?mr+40:364,1];case 'kunai':return [mel?mr+40:418,1];case 'arrow':return [720,1];case 'volley':return [490,1];
  case 'blast':case 'stormarrow':case 'rain':case 'trap':case 'spiritbomb':return [520,0];case 'meteor':return [450,0];case 'chain':return [600,0];
}return null}
/* v5_189 RESERVED SKILL: a skill pressed / tapped while it (or the global lock) is not ready is RESERVED and cast the moment it is ready; pressing another skill replaces the reservation.
   With no manual reservation the HUD shows the auto-cast skill that will fire next, also labelled Reserved. A reservation expires after RSV_MAX seconds. */
const RSV_MAX=10;
function manualSkill(i){
  const id=EQ[i],old=P.rsv,oldT=P.rsvT;P.rsv=-1; /* a manual press that casts or reserves replaces the reserved skill; one that does nothing leaves it alone */
  if(id<0||useSkill(i))return;
  P.rsv=old;P.rsvT=oldT;
  if(P.dead>0||!started)return;
  /* v5_191 only a READY skill (off cooldown, Qi / HP paid) can be reserved; it then waits only for the 1 s lock between casts. A skill on cooldown or without Qi / HP cannot be clicked at all. */
  if(SCD[id]<=0&&skCanPay(SKILLS[id])&&P.skLock>0&&i<AUTO_SLOTS){P.rsv=i;P.rsvT=RSV_MAX}
}
function useSkill(i,auto){
  if(P.dead>0||!started)return false;
  const id=EQ[i];if(id<0){say('Empty slot. Press K to equip a skill.','#8d9aa2');return false}
  /* v5_84 ranged classes (Storm Archer, Spirit Summoner) cannot cast any skill inside the safe hub (manual, hotkey or auto-hunt). Nothing is spent. */
  const s=SKILLS[id],t=s.t,tr=s.tier;
  /* v5_90 no attacking in the safe hub: ranged classes cannot cast anything; every class loses its damaging skills (heals / shields / buffs still work) */
  if(inTown()&&(P.cls>=3||(s.m>0&&!HEAL_SKILL_T[t]))){if(!(P.hubSkMsg>0)){say('You cannot attack or use attack skills inside the safe hub.','#8d9aa2');P.hubSkMsg=2}return false}
  const prio=!auto&&i>=AUTO_SLOTS; /* v5_156 slots R and T (13, 14) are PRIORITY skills: pressed / clicked / tapped by hand they cast at any moment - they ignore the short global lock and interrupt a cast pose in progress */
  if(SCD[id]>0||!skCanPay(s)||(P.skLock>0&&!prio))return false;if(prio)P.cast=0; /* one skill at a time: short global lock after any cast; the basic attack is NOT blocked by it */
  const hpc=skHp(s)?skHpCost(s):0; /* v5_188b HP price fixed BEFORE the heal below */
  /* v5_122 skills work outside attack mode too: when nothing is targeted or selected and a monster is inside THIS skill's reach, the nearest one is selected
     (target frame shows it, you do not start auto-attacking) and the skill aims at it. Heals / buffs and the hub rules are unchanged. */
  if(!aimT()&&s.m>0&&!HEAL_SKILL_T[t]&&!inTown()){const e=nearest(AIM_REACH[t]||(P.cls<3?MELEE_SKILL_RANGE:520));if(e&&!e.dead&&!e.isPl)P.sel=e}
  const tg0=aimT(),a=tg0?Math.atan2(tg0.y-P.y,tg0.x-P.x):P.face,A=atkVal();
  const mel=P.cls<3,mr=MELEE_SKILL_RANGE;
  if(auto&&P.cls===2&&IG_DMG_T[t]){const e=tg0||nearest(IG_PAD+80);if(!e||dist(e.x,e.y,P.x,P.y)>P.r+e.r+IG_PAD)return false}
  if(auto&&mel&&MELEE_RANGED_T[t]){const e=tg0?(dist(tg0.x,tg0.y,P.x,P.y)<=mr+tg0.r?tg0:null):nearest(mr);if(!e)return false}
  const pr=(g,dm)=>projs.push({x:P.x,y:P.y,vx:Math.cos(g)*520,vy:Math.sin(g)*520,life:mel?Math.min(.7,(mr+40)/520):.7,l0:mel?Math.min(.7,(mr+40)/520):.7,dmg:dm,hit:new Set(),ang:g,col:s.col});
  /* v5_130 IN ATTACK MODE (auto-hunt / F / a target is set) an attack skill is NOT cast when the target is outside THAT skill's real reach: nothing is spent, no cooldown.
     Reach = the radius / length / flight distance the skill really uses below (skillReach). Outside attack mode manual casts keep the v5_122 behaviour (whiff toward where you face). */
  if((auto||P.fatk||(P.target&&!P.target.dead))&&s.m>0&&!HEAL_SKILL_T[t]){
    const rc=skillReach(t,tr,mel,mr);
    if(rc){const ok=tg0?dist(tg0.x,tg0.y,P.x,P.y)<=rc[0]+(rc[1]?tg0.r:0):!!nearest(rc[0]);
      if(!ok){if(!auto&&!(P.rngMsg>0)){say(s.n+': target is out of range.','#8d9aa2');P.rngMsg=1.5}return false}}
  }
  if(s.sig){if(sigCast(s,id,tg0,a,A,auto)===false)return false} /* v5_160 signature skills */
  else if(!auto&&WHIFF_R[t]&&!hasFoeFor(t,tg0,mel,mr))whiffCast(t,s);
  else if(t==='pierce'){P.face=a;pr(a,A*s.m);fxs({k:'pr',x:P.x,y:P.y,a:[+a.toFixed(2)],c:s.col})}
  else if(t==='fan'){const n=3+Math.floor(tr/2),an=[];P.face=a;for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.17;an.push(+g.toFixed(2));pr(g,A*s.m)}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='kunai'){
    const n=3+Math.floor(tr/3),an=[];P.face=a;
    for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.08;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:mel?Math.min(.55,(mr+40)/760):.55,l0:mel?Math.min(.55,(mr+40)/760):.55,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}
    fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='shadowstep'||t==='execute'||t==='siphon'||t==='venom'){
    /* NIGHT BLADE single-target skills: nothing is spent when there is no enemy in range */
    const rng=t==='shadowstep'?420:t==='venom'?(mel?mr:460):t==='execute'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);
    if(!c)return false;
    const hit=(q,x,f)=>q.isPl?sdp(q,x,f):sd(q,x,f),ma=Math.atan2(c.y-P.y,c.x-P.x);
    P.face=ma;P.target=c;P.task=null;P.mv=null;
    if(t==='shadowstep'){
      const gap=P.r+c.r+18;
      for(let j=0;j<12;j++)spark(P.x+(c.x-P.x)*j/12,P.y+(c.y-P.y)*j/12,s.col,2,60,.4,2.4);
      P.x=c.x+Math.cos(ma)*gap;P.y=c.y+Math.sin(ma)*gap;P.face=ma+Math.PI;P.inv=Math.max(P.inv,.3);
      hit(c,s.m*1.35);ring(c.x,c.y,60,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.4);
      fxs({k:'ri',x:c.x,y:c.y,r:60,c:s.col,q:'whirl',s:1})}
    else if(t==='execute'){
      const f=c.maxhp>0?clamp(c.hp/c.maxhp,0,1):1;
      hit(c,s.m*(1+(1-f)*1.2));ring(c.x,c.y,55,s.col);spark(c.x,c.y,s.col,22,220,.5,2.8);shake=Math.max(shake,.35);
      fxs({k:'ri',x:c.x,y:c.y,r:55,c:s.col,s:1})}
    else if(t==='siphon'){
      const dmg=hit(c,s.m)||0,h=healS(Math.round(Math.min(maxHp()*.2,dmg*.5)));
      if(h>0){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff7a9a',15)}
      ring(c.x,c.y,45,s.col);spark(c.x,c.y,'#ff5a7a',16,180,.45,2.6);fxs({k:'ri',x:c.x,y:c.y,r:45,c:s.col})}
    else{
      const vs=[c];for(const m of mons){if(vs.length>=3)break;if(m!==c&&!m.dead&&dist(m.x,m.y,c.x,c.y)<180)vs.push(m)}
      const tick=s.m*.3,pts=[];
      for(const q of vs){
        hit(q,s.m*.4,dist(q.x,q.y,P.x,P.y)/460);ring(q.x,q.y,36,s.col);
        for(let j=1;j<=5;j++)delayed.push({t:.8*j,f:()=>{if(!q.dead&&(!q.isPl||pvpOk(q))){hit(q,tick);spark(q.x,q.y,s.col,5,60,.5,2.4)}}});
        pts.push(Math.round(P.x),Math.round(P.y),Math.round(q.x),Math.round(q.y))}
      fxs({k:'ch',p:pts,c:s.col})}
  }
  else if(t==='bladestorm'){
    const r=120+tr*8;P.inv=Math.max(P.inv,1);
    for(let j=0;j<4;j++)delayed.push({t:.25*j,f:()=>{if(P.dead>0)return;
      for(const m of mons)if(!m.dead&&dist(m.x,m.y,P.x,P.y)<r+m.r)sd(m,s.m);
      for(const q of foes())if(dist(q.x,q.y,P.x,P.y)<r+q.r)sdp(q,s.m);
      ring(P.x,P.y,r*(.6+.13*j),s.col,'whirl');spark(P.x,P.y,s.col,14,r*1.6,.4,2.6);shake=Math.max(shake,.25)}});
    fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='smoke'){
    P.vlT=Math.max(P.vlT,6+tr*.5);P.bf=Math.max(P.bfT>0?P.bf:0,.2+(s.k||0)*.006);P.bfT=Math.max(P.bfT,P.vlT);P.inv=Math.max(P.inv,1.2);
    ring(P.x,P.y,100,s.col,'whirl');spark(P.x,P.y,s.col,30,200,.8,3);pop(P.x,P.y-34,'VEIL','#c7a8ff',15);fxs({k:'ri',x:P.x,y:P.y,r:100,c:s.col,q:'whirl',s:1})}
  else if(t==='rush'){
    const L=280+tr*10,sx=P.x,sy=P.y,cx=Math.cos(a),cy=Math.sin(a),ex=sx+cx*L,ey=sy+cy*L;
    const inLine=q=>{const dx=q.x-sx,dy=q.y-sy,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<45+q.r};
    for(const m of mons)if(!m.dead&&inLine(m))sd(m,s.m);
    for(const q of foes())if(inLine(q))sdp(q,s.m);
    for(let j=0;j<14;j++)spark(sx+(ex-sx)*j/14,sy+(ey-sy)*j/14,s.col,3,70,.4,2.6);
    P.face=a;P.x=ex;P.y=ey;P.inv=Math.max(P.inv,.4);shake=Math.max(shake,.4);ring(ex,ey,60,s.col,'whirl');
    fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col})}
  /* ===== IRON GUARDIAN ===== */
  else if(t==='bash'||t==='hammer'){
    const rng=t==='hammer'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);if(!c)return false;
    P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;P.task=null;P.mv=null;hitAny(c,s.m);
    if(t==='bash'){P.sh=Math.max(P.sh,Math.round(maxHp()*(.05+tr*.01)));P.shT=Math.max(P.shT||0,6);ring(c.x,c.y,50,s.col);spark(c.x,c.y,s.col,18,200,.4,2.6);shake=Math.max(shake,.3);fxs({k:'ri',x:c.x,y:c.y,r:50,c:s.col})}
    else{const r=100+tr*6;for(const q of mons)if(q!==c&&!q.dead&&dist(q.x,q.y,c.x,c.y)<r+q.r)sd(q,s.m*.5);for(const q of foes())if(q!==c&&dist(q.x,q.y,c.x,c.y)<r+q.r)sdp(q,s.m*.5);
      ring(c.x,c.y,r,s.col,'whirl');spark(c.x,c.y,s.col,30,260,.6,3);shake=Math.max(shake,.55);fxs({k:'ri',x:c.x,y:c.y,r,c:s.col,q:'whirl',s:1})}}
  else if(t==='charge'){
    /* v5_159 IRON GUARDIAN gap-closer: rush to a target up to 400 away (in front of it, not behind), hit it and gain a short shield.
       It is the answer to kiting Storm Archers / Summoners; it does nothing when no enemy is in reach (nothing is spent). */
    const rng=400,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);if(!c)return false;
    const ma=Math.atan2(c.y-P.y,c.x-P.x),gap=P.r+c.r+24;
    for(let j=0;j<12;j++)spark(P.x+(c.x-P.x)*j/12,P.y+(c.y-P.y)*j/12,s.col,2,60,.4,2.4);
    P.x=c.x-Math.cos(ma)*gap;P.y=c.y-Math.sin(ma)*gap;P.face=ma;P.target=c;P.task=null;P.mv=null;P.inv=Math.max(P.inv,.3);
    hitAny(c,s.m);
    P.sh=Math.max(P.sh,Math.round(maxHp()*(.04+tr*.008)));P.shT=Math.max(P.shT||0,5);
    ring(c.x,c.y,70,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.4);
    fxs({k:'ri',x:c.x,y:c.y,r:70,c:s.col,q:'whirl',s:1})}
  else if(t==='quake'||t==='roar'||t==='counter'){
    const r=t==='quake'?160+tr*12:t==='roar'?240:150+tr*8;
    if(auto&&!mons.some(m=>!m.dead&&dist(m.x,m.y,P.x,P.y)<r+m.r)&&!foes().some(q=>dist(q.x,q.y,P.x,P.y)<r+q.r))return false;
    const f=clamp(P.hp/maxHp(),0,1);aoeHit(P.x,P.y,r,t==='counter'?s.m*(1+(1-f)*1.5):s.m);
    ring(P.x,P.y,r,s.col,'whirl');spark(P.x,P.y,s.col,28,r*1.8,.5,2.8);shake=Math.max(shake,.45);
    if(t==='quake')for(let j=1;j<=2;j++)delayed.push({t:.3*j,f:()=>{if(P.dead>0)return;aoeHit(P.x,P.y,r,s.m*.35);ring(P.x,P.y,r*(1+.1*j),s.col)}});
    if(t==='roar'){P.bf=Math.max(P.bfT>0?P.bf:0,.15+(s.k||0)*.004);P.bfT=Math.max(P.bfT,8);pop(P.x,P.y-34,'ROAR','#ffb070',15);partyShare('atk',P.bf*.5);if(MP)netSend({t:'taunt'})}
    fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='bulwark'||t==='ironskin'){
    if(t==='bulwark'){P.sh=Math.round(maxHp()*(.2+tr*.03));P.shT=10;P.dr=Math.max(P.drT>0?P.dr:0,.2);P.drT=Math.max(P.drT,6)}
    else{P.dr=.35+Math.min(.25,tr*.02);P.drT=10;const h=healS(Math.round(maxHp()*.1));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
    ring(P.x,P.y,80,s.col);spark(P.x,P.y,s.col,24,120,.8,3);pop(P.x,P.y-44,t==='bulwark'?'BULWARK':'IRON SKIN','#ffd27a',14);fxs({k:'ri',x:P.x,y:P.y,r:80,c:s.col})}
  else if(t==='shockwave'){
    const L=420,cx=Math.cos(a),cy=Math.sin(a),inLine=q=>{const dx=q.x-P.x,dy=q.y-P.y,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<70+q.r};
    P.face=a;for(const m of mons)if(!m.dead&&inLine(m))sd(m,s.m);for(const q of foes())if(inLine(q))sdp(q,s.m);
    for(let j=0;j<16;j++)spark(P.x+cx*L*j/16,P.y+cy*L*j/16,s.col,3,90,.45,2.8);ring(P.x+cx*L*.5,P.y+cy*L*.5,70,s.col,'whirl');shake=Math.max(shake,.4);
    fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(P.x+cx*L),Math.round(P.y+cy*L)],c:s.col})}
  /* ===== STORM ARCHER ===== */
  else if(t==='arrow'){P.face=a;projs.push({x:P.x,y:P.y,vx:Math.cos(a)*900,vy:Math.sin(a)*900,life:.8,l0:.8,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:a,col:s.col});fxs({k:'pr',x:P.x,y:P.y,a:[+a.toFixed(2)],c:s.col})}
  else if(t==='volley'){const n=5+Math.floor(tr/2),an=[];P.face=a;for(let j=0;j<n;j++){const g=a+(j-(n-1)/2)*.13;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*700,vy:Math.sin(g)*700,life:.7,l0:.7,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
  else if(t==='rain'||t==='trap'){
    const n=tg0||nearest(520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,r=t==='rain'?110+tr*6:100+tr*5;
    if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
    ring(x,y,r,s.col);ring(x,y,r*.6,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    const waves=t==='rain'?3:6,iv=t==='rain'?.45:.8,per=t==='rain'?s.m:s.m*.55;
    for(let j=1;j<=waves;j++)delayed.push({t:iv*j,f:()=>{aoeHit(x,y,r,per,dist(x,y,P.x,P.y)/520);ring(x,y,r*.7,s.col,'whirl');spark(x,y,s.col,16,r*1.4,.4,2.6)}})}
  else if(t==='blast'||t==='stormarrow'){
    const rng=520,c=(tg0&&!tg0.dead&&(!tg0.isPl||pvpOk(tg0))&&dist(tg0.x,tg0.y,P.x,P.y)<=rng)?tg0:nearest(rng);if(!c)return false;
    P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;
    if(t==='blast'){const r=110+tr*5;hitAny(c,s.m,dist(c.x,c.y,P.x,P.y)/rng);
      for(const q of mons)if(q!==c&&!q.dead&&dist(q.x,q.y,c.x,c.y)<r+q.r)sd(q,s.m*.65,dist(c.x,c.y,P.x,P.y)/rng);
      for(const q of foes())if(q!==c&&dist(q.x,q.y,c.x,c.y)<r+q.r)sdp(q,s.m*.65,dist(c.x,c.y,P.x,P.y)/rng);
      ring(c.x,c.y,r,s.col,'whirl');spark(c.x,c.y,s.col,30,280,.6,3.2);shake=Math.max(shake,.45);fxs({k:'ri',x:c.x,y:c.y,r,c:s.col,q:'whirl',s:1})}
    else{const hit=new Set(),pts=[];let px=P.x,py=P.y,cc=c;
      for(let j=0;j<3+Math.ceil(tr/2)&&cc;j++){hit.add(cc);hitAny(cc,s.m*(1-j*.04),dist(cc.x,cc.y,P.x,P.y)/rng);
        for(let q=0;q<7;q++)spark(px+(cc.x-px)*q/7,py+(cc.y-py)*q/7,s.col,1,40,.35,2.4);ring(cc.x,cc.y,36,s.col);
        pts.push(Math.round(px),Math.round(py),Math.round(cc.x),Math.round(cc.y));px=cc.x;py=cc.y;
        let bb=null,bd=260;for(const m of mons){if(m.dead||hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}for(const m of foes()){if(hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}cc=bb}
      fxs({k:'ch',p:pts,c:s.col})}}
  else if(t==='eagle'){P.ceT=8+tr*.5;P.bf=Math.max(P.bfT>0?P.bf:0,.12);P.bfT=Math.max(P.bfT,P.ceT);ring(P.x,P.y,90,s.col);pop(P.x,P.y-34,'EAGLE EYE','#ffe27a',15);fxs({k:'ri',x:P.x,y:P.y,r:90,c:s.col})}
  else if(t==='gale'){
    const c=tg0||nearest(520),ba=c?Math.atan2(P.y-c.y,P.x-c.x):P.face+Math.PI,sx=P.x,sy=P.y;
    P.x+=Math.cos(ba)*240;P.y+=Math.sin(ba)*240;P.galeLock=30;P.vlT=Math.max(P.vlT,4);P.inv=Math.max(P.inv,.3);P.gsT=4;
    for(let j=0;j<12;j++)spark(sx+(P.x-sx)*j/12,sy+(P.y-sy)*j/12,s.col,2,60,.4,2.4);ring(P.x,P.y,60,s.col,'whirl');
    if(c){const fa=Math.atan2(c.y-P.y,c.x-P.x),an=[];P.face=fa;for(let j=0;j<3;j++){const g=fa+(j-1)*.1;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:.6,l0:.6,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:P.x,y:P.y,a:an,c:s.col})}
    else fxs({k:'ri',x:P.x,y:P.y,r:60,c:s.col,q:'whirl',s:1})}
  /* ===== SPIRIT SUMMONER ===== */
  else if(t==='wolves'||t==='guardian'){
    if(t==='guardian'){P.sh=Math.round(maxHp()*(.15+tr*.03));P.shT=10}
    const sk=t==='wolves'?1:2;P.spirits.push({k:sk,t:t==='wolves'?7+tr*.5:10,iv:t==='wolves'?.7:1,cd:0,dmg:s.m,col:s.col,r:t==='wolves'?320:260});
    {const same=P.spirits.filter(q=>q.k===sk);if(same.length>(sk===1?3:1))P.spirits.splice(P.spirits.indexOf(same[0]),1)}
    ring(P.x,P.y,70,s.col,'whirl');spark(P.x,P.y,s.col,24,140,.8,3);pop(P.x,P.y-40,t==='wolves'?'SPIRIT WOLF':'GUARDIAN','#9fe0ff',14);fxs({k:'ri',x:P.x,y:P.y,r:70,c:s.col,q:'whirl',s:1})}
  else if(t==='soulburst'||t==='wail'||t==='harvest'){
    const r=t==='soulburst'?140+tr*10:t==='wail'?240:200;
    const tot=aoeHit(P.x,P.y,r,s.m);
    if(t==='wail')delayed.push({t:.35,f:()=>{if(P.dead>0)return;aoeHit(P.x,P.y,r,s.m);ring(P.x,P.y,r*1.1,s.col,'whirl');shake=Math.max(shake,.4)}});
    if(t==='soulburst')P.qi=Math.min(maxQi(),P.qi+maxQi()*.08);
    if(t==='harvest'&&tot){const h=healS(Math.round(Math.min(maxHp()*.25,tot*.35)));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
    ring(P.x,P.y,r,s.col,'whirl');spark(P.x,P.y,s.col,28,r*1.8,.5,2.8);shake=Math.max(shake,.35);fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:'whirl',s:1})}
  else if(t==='chains'){
    const L=[];for(const m of mons)if(!m.dead&&!m.pend){const d=dist(m.x,m.y,P.x,P.y);if(d<400)L.push([d,m])}
    for(const q of foes()){const d=dist(q.x,q.y,P.x,P.y);if(d<400)L.push([d,q])}
    if(!L.length)return false;L.sort((x,y)=>x[0]-y[0]);const pts=[];
    for(const [d,q] of L.slice(0,4)){hitAny(q,s.m,d/400);for(let j=0;j<7;j++)spark(P.x+(q.x-P.x)*j/7,P.y+(q.y-P.y)*j/7,s.col,1,40,.35,2.4);ring(q.x,q.y,36,s.col);pts.push(Math.round(P.x),Math.round(P.y),Math.round(q.x),Math.round(q.y))}
    fxs({k:'ch',p:pts,c:s.col})}
  else if(t==='soulheal'){
    const h=healS(Math.round(maxHp()*(.25+tr*.02)));P.hp=Math.min(maxHp(),P.hp+h);P.qi=Math.min(maxQi(),P.qi+maxQi()*.1);partyShare('heal',h/maxHp()*.5);
    ring(P.x,P.y,70,s.col);spark(P.x,P.y,s.col,18,90,1,3,60);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);fxs({k:'ri',x:P.x,y:P.y,r:70,c:s.col})}
  else if(t==='spiritbomb'){
    const n=tg0||nearest(520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,r=160+tr*12;
    if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
    ring(x,y,r,s.col);ring(x,y,r*.5,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    delayed.push({t:.9,f:()=>{ring(x,y,r,s.col,'whirl');spark(x,y,s.col,44,320,.7,3.4);shake=Math.max(shake,.9);aoeHit(x,y,r,s.m,dist(x,y,P.x,P.y)/520)}})}
  else if(t==='strike'||t==='flurry'||t==='cleave'||t==='leap'){
    /* MELEE: needs an enemy close by (leap: up to 360 away). Nothing is spent when there is none. */
    const rng=t==='leap'?360:t==='cleave'?200:170,ok=q=>q&&!q.dead&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;
    const c=ok(tg0)?tg0:nearest(rng);
    if(!c)return false;
    const ma=Math.atan2(c.y-P.y,c.x-P.x),hit=(q,x)=>q.isPl?sdp(q,x):sd(q,x);
    P.face=ma;P.target=c;P.task=null;P.mv=null;
    if(t==='strike'){hit(c,s.m);ring(c.x,c.y,50,s.col);spark(c.x,c.y,s.col,18,200,.4,2.6);shake=Math.max(shake,.25);fxs({k:'ri',x:c.x,y:c.y,r:50,c:s.col})}
    else if(t==='flurry'){const n=3+Math.floor(tr/3),w=s.m*1.25/n;
      for(let j=0;j<n;j++)delayed.push({t:.11*j,f:()=>{if(!c.dead&&dist(c.x,c.y,P.x,P.y)<400){hit(c,w);spark(c.x,c.y,s.col,6,160,.3,2.2)}}});
      ring(c.x,c.y,40,s.col);fxs({k:'ri',x:c.x,y:c.y,r:40,c:s.col})}
    else if(t==='cleave'){
      const r=150+tr*10,inArc=q=>{if(dist(q.x,q.y,P.x,P.y)>r+q.r)return false;let da=Math.atan2(q.y-P.y,q.x-P.x)-ma;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<=1.25};
      for(const q of mons)if(!q.dead&&inArc(q))sd(q,s.m);
      for(const q of foes())if(inArc(q))sdp(q,s.m);
      ring(P.x+Math.cos(ma)*r*.5,P.y+Math.sin(ma)*r*.5,r*.6,s.col,'whirl');
      for(let j=-3;j<=3;j++){const g=ma+j*.38;spark(P.x+Math.cos(g)*r*.7,P.y+Math.sin(g)*r*.7,s.col,5,140,.35,2.6)}
      shake=Math.max(shake,.3);fxs({k:'ri',x:P.x,y:P.y,r:r*.8,c:s.col,q:'whirl',s:1})}
    else{
      const gap=P.r+c.r+26,d0=dist(c.x,c.y,P.x,P.y);
      if(d0>gap){const nx=c.x+(P.x-c.x)/d0*gap,ny=c.y+(P.y-c.y)/d0*gap;for(let j=0;j<10;j++)spark(P.x+(nx-P.x)*j/10,P.y+(ny-P.y)*j/10,s.col,2,60,.35,2.4);P.x=nx;P.y=ny}
      hit(c,s.m);ring(c.x,c.y,70,s.col,'whirl');spark(c.x,c.y,s.col,24,240,.5,2.8);shake=Math.max(shake,.45);P.inv=Math.max(P.inv,.25);
      fxs({k:'ri',x:c.x,y:c.y,r:70,c:s.col,q:'whirl',s:1})}
  }
  else if(t==='nova'||t==='drain'){
    const r=t==='drain'?170:(tr<0?120:150+tr*14);let tot=0;
    ring(P.x,P.y,r,s.col,tr<0?'whirl':0);spark(P.x,P.y,s.col,26,260,.5,2.6);shake=Math.max(shake,.35);fxs({k:'ri',x:P.x,y:P.y,r,c:s.col,q:tr<0?'whirl':'',s:1});
    for(const m of mons){if(m.dead||dist(m.x,m.y,P.x,P.y)>r+m.r)continue;tot+=sd(m,s.m)}
    for(const q of foes()){if(dist(q.x,q.y,P.x,P.y)>r+q.r)continue;tot+=sdp(q,s.m)}
    if(t==='drain'&&tot){const h=healS(Math.round(Math.min(maxHp()*.25,tot*.35)));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#5fd3a5',15)}
  }else if(t==='meteor'){
    const n=tg0||nearest(450),x=n?n.x:P.x+Math.cos(P.face)*220,y=n?n.y:P.y+Math.sin(P.face)*220,r=110+tr*10;
    ring(x,y,r,s.col);ring(x,y,r*.6,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r,c:s.col});
    delayed.push({t:.7,f:()=>{ring(x,y,r,s.col,'whirl');spark(x,y,s.col,40,300,.7,3.2);shake=1;for(const m of mons)if(!m.dead&&dist(m.x,m.y,x,y)<r+m.r)sd(m,s.m,dist(x,y,P.x,P.y)/450);for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)sdp(q,s.m,dist(x,y,P.x,P.y)/450)}});
  }else if(t==='chain'){
    let c=(tg0&&dist(tg0.x,tg0.y,P.x,P.y)<600)?tg0:nearest(420);
    if(!c)return false;
    const hit=new Set(),pts=[];let px=P.x,py=P.y;
    for(let j=0;j<4+tr&&c;j++){
      hit.add(c);if(c.isPl)sdp(c,s.m*(1-j*.03),dist(c.x,c.y,P.x,P.y)/600);else sd(c,s.m*(1-j*.03),dist(c.x,c.y,P.x,P.y)/600);
      for(let q=0;q<7;q++)spark(px+(c.x-px)*q/7,py+(c.y-py)*q/7,s.col,1,40,.35,2.4);
      ring(c.x,c.y,40,s.col);pts.push(Math.round(px),Math.round(py),Math.round(c.x),Math.round(c.y));px=c.x;py=c.y;
      let bb=null,bd=210;for(const m of mons){if(m.dead||hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}for(const m of foes()){if(hit.has(m))continue;const d=dist(m.x,m.y,px,py);if(d<bd){bd=d;bb=m}}c=bb;
    }
    fxs({k:'ch',p:pts,c:s.col});
  }else if(t==='might'){P.bf=.25+s.k*.008;P.bfT=8+tr;partyShare('atk',P.bf*.5);ring(P.x,P.y,90,s.col);pop(P.x,P.y-34,'MIGHT','#ffd36b',15);fxs({k:'ri',x:P.x,y:P.y,r:90,c:s.col})}
  else{
    const h=healS(Math.round(maxHp()*(t==='heal'?s.m:.25+tr*.025)));
    P.hp=Math.min(maxHp(),P.hp+h);partyShare('heal',h/maxHp()*.5);
    if(t==='mend'){P.sh=Math.round(maxHp()*(.1+tr*.03));P.shT=8;P.qi=Math.min(maxQi(),P.qi+maxQi()*.1)}
    ring(P.x,P.y,70,'#5fd3a5');fxs({k:'ri',x:P.x,y:P.y,r:70,c:'#5fd3a5'});pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);spark(P.x,P.y,'#f4b3c8',14,70,1,3,60);spark(P.x,P.y,'#8ff0c4',10,60,1,2.4,50);
  }
  skPay(s,hpc);SCD[id]=s.cd;P.swing=.2;P.skLock=SKILL_GCD;sfxSkill(t);
  /* v5_109 CASTING: casting a skill stops you for a moment and plays a cast pose (arms raised). Dash skills (CAST_NOROOT) keep moving you instead. Tune CAST_T / CAST_T_LONG. */
  if(!CAST_NOROOT[t]){const ct=CAST_LONG[t]?CAST_T_LONG:CAST_T;P.cast=ct;P.castMax=ct;P.mv=null} /* v5_153 casting roots you again (v5_152 removed the root while moving); v5_154 a move input does NOT cancel it, you move when the pose ends */
  return true;
}
/* ---------- v5_160 SIGNATURE SKILL CASTING ----------
   sigCast(s,id,tg0,a,A,auto) runs the handler of a signature skill (SIGF[type]). A handler returns false when it must not be cast (no enemy in reach): nothing is spent then.
   New short-lived player states (all cleared by sigReset on death / class switch): ls/lsT lifesteal, rf/rfT reflect (monster hits), abs/absT damage vessel, mark/markT death mark, link/linkT soul web. */
const SIG_ABS_CAP=.8;let sigBusy=false;
/* v5_164 timed HUD-only buffs: ground fields and heal-over-time skills that have no player timer of their own (key -> [icon,colour,name,text,expiry]) */
const HB={};let HBCLK=0; /* v5_177 game clock (advances by the same capped dt as every other timer) so signature-buff icons stay in step with the real effect */
function fmtT(t){const r=Math.max(.1,Math.ceil(t*10)/10);return r>=10?String(Math.ceil(t)):r.toFixed(1)} /* v5_177 remaining-time label: whole seconds from 10 s up, tenths below, so the last second never reads "1" */
const SIGHUD={sg_c100:[6,'\u273f','Lotus Domain','Lotus field: damages foes and heals you while you stand in it.'],sg_g300:[10,'\u2691','Iron Banner','Banner field: 20% less damage taken and HP regen inside it, foes are taunted.'],sg_s25:[12,'\u2742','Soul Lantern','Heals you (party for half) and restores Qi every 2 s.'],sg_n300:[5,'\u2740','Nightshade Bloom','Poison cloud pulsing on the target area.'],sg_s1000:[6,'\u2742','Netherworld Gate','Gate pulses damage foes and heal you, then it collapses.']};
function sigReset(){for(const k in HB)delete HB[k];P.lsT=0;P.rfT=0;P.absT=0;P.abs=0;P.markT=0;P.mark=null;P.linkT=0;P.link=null}
const sigFoes=(x,y,r)=>{const o=[];for(const q of mons)if(!q.dead&&!q.pend&&dist(q.x,q.y,x,y)<r+q.r)o.push(q);for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)o.push(q);return o};
const sigTarget=(tg0,rng)=>{const ok=q=>q&&!q.dead&&!q.pend&&(!q.isPl||pvpOk(q))&&dist(q.x,q.y,P.x,P.y)<=rng;return ok(tg0)?tg0:nearest(rng)};
const sigFixed=(q,d,crit)=>q.isPl?hitPeer(q,Math.round(d),crit):hitMonster(q,Math.round(d),crit);
const sigFx=(x,y,r,col,whirl)=>{ring(x,y,r,col,whirl?'whirl':0);fxs({k:'ri',x:Math.round(x),y:Math.round(y),r:Math.min(400,Math.round(r)),c:col,q:whirl?'whirl':'',s:1})};
const sigLine=(x1,y1,x2,y2,col,n)=>{for(let j=0;j<=(n||10);j++)spark(x1+(x2-x1)*j/(n||10),y1+(y2-y1)*j/(n||10),col,1,50,.4,2.6)};
const sigInLine=(q,sx,sy,an,L,W)=>{const cx=Math.cos(an),cy=Math.sin(an),dx=q.x-sx,dy=q.y-sy,u=dx*cx+dy*cy,v=Math.abs(-dx*cy+dy*cx);return u>-q.r&&u<L+q.r&&v<W+q.r};
const sigHealSelf=(f,col)=>{const h=healS(Math.round(maxHp()*f));if(h>0){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,col||'#5fd3a5',14)}return h};
const sigBuff=(bf,T)=>{P.bf=Math.max(P.bfT>0?P.bf:0,bf);P.bfT=Math.max(P.bfT,T)};
const sigDR=(dr,T)=>{P.dr=Math.max(P.drT>0?P.dr:0,dr);P.drT=Math.max(P.drT,T)};
const sigShield=(f,T)=>{P.sh=Math.max(P.sh,Math.round(maxHp()*f));P.shT=Math.max(P.shT||0,T)};
const sigLater=(t,f)=>delayed.push({t,f:()=>{if(P.dead>0)return;f()}});
/* called from hitMonster for every point of damage the player deals to a monster: lifesteal, death mark, soul web */
function sigOnHit(m,d){
  if(sigBusy)return;
  if(P.lsT>0)sigLeech(d);
  if(P.markT>0&&P.mark&&P.mark.m===m)P.mark.acc+=d;
  if(P.linkT>0&&P.link&&P.link.has(m)){sigBusy=true;try{const sp=Math.round(d*.4);for(const q of P.link)if(q!==m&&!q.dead&&!q.pend)hitMonster(q,sp,false)}finally{sigBusy=false}}
}
function sigLeech(d){const h=healS(Math.max(1,Math.round(Math.min(maxHp()*.05,d*(P.ls||.1)))));if(h>0&&P.hp<maxHp()){P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff7a9a',13)}}
/* auto-cast rules of the signature skills (called from clsAuto). Attack skills: only with the target inside their reach; buffs: only when useful and not already running. */
function sigAuto(ty,d,t,near){
  const hurt=P.hp<maxHp()*.6,boss=!!(t&&t.boss),R=SIGR[ty];
  switch(ty){
    case 'sg_c25':return hurt||P.qi<maxQi()*.35;case 'sg_c50':return near>=2&&!(P.rfT>0);case 'sg_c1000':return(boss||near>=3)&&!(P.bfT>0);
    case 'sg_n25':return P.hp<maxHp()*.5&&near>=1;case 'sg_n50':return d<=250&&!(P.lsT>0);
    case 'sg_g25':return near>=1&&!(P.shT>0);case 'sg_g50':return near>=1&&!(P.rfT>0);case 'sg_g200':return near>=2&&P.hp<maxHp()*.75&&!(P.absT>0);
    case 'sg_g300':return near>=2||boss;case 'sg_g750':return P.spirits.filter(q=>q.k===4).length<3&&d<=240;case 'sg_g1000':return(boss||near>=3)&&!(P.shT>0);
    case 'sg_a25':return d<520&&!(P.gsT>0);case 'sg_a1000':return(boss||near>=2)&&!(P.bfT>0)&&d<=700;
    case 'sg_s25':return hurt||P.qi<maxQi()*.3;case 'sg_s50':return P.spirits.length>0&&d<=480;case 'sg_s200':return !(P.linkT>0)&&d<=450&&mons.filter(q=>!q.dead&&dist(q.x,q.y,P.x,P.y)<450).length>=2;
    case 'sg_s300':return d<480&&!(P.bfT>0);case 'sg_s750':return P.spirits.filter(q=>q.k===1).length<3&&d<=480;
    case 'sg_n100':return !(P.markT>0)&&d<=460&&!!t&&!t.isPl;
    case 'sg_n500':return !!t&&d<=460&&t.maxhp>0&&t.hp<t.maxhp*.5; /* the execute: only on a wounded foe, so the cooldown reset is likely */
  }
  return d<=(R||420)}
function sigCast(s,id,tg0,a,A,auto){const f=SIGF[s.t];if(!f)return false;
  const r=f({s,id,tg0,a,A,auto,tr:s.tier});
  if(r!==false&&SIGHUD[s.t]){const h=SIGHUD[s.t];HB[s.t]=[h[1],s.col,h[2],h[3],HBCLK+h[0]]}
  if(r===false&&!auto&&!(P.rngMsg>0)){say(s.n+': no target in reach.','#8d9aa2');P.rngMsg=1.5}
  return r}
const SIGF={
/* ===== CULTIVATOR ===== */
sg_c25:({s})=>{P.qi=Math.min(maxQi(),P.qi+maxQi()*.35);const h=sigHealSelf(.3);partyShare('heal',h/maxHp()*.5);sigBuff(.12,8);sigFx(P.x,P.y,110,s.col,1);spark(P.x,P.y,s.col,30,160,.9,3,60);pop(P.x,P.y-46,'HEAVEN’S BREATH',s.col,13)},
sg_c50:({s})=>{P.rf=.5;P.rfT=8;sigDR(.2,8);sigFx(P.x,P.y,90,s.col);spark(P.x,P.y,'#ffffff',22,140,.7,2.8);pop(P.x,P.y-46,'MIRROR',s.col,14)},
sg_c100:({s})=>{const x=P.x,y=P.y,R=250;sigFx(x,y,R,s.col,1);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=1;j<=6;j++)sigLater(j,()=>{aoeHit(x,y,R,s.m);sigFx(x,y,R*(.5+.08*j),s.col,1);spark(x,y,s.col,18,R*1.4,.6,2.8);if(dist(P.x,P.y,x,y)<R){const h=sigHealSelf(.04);partyShare('heal',h/maxHp()*.5)}})},
sg_c200:({s,tg0})=>{const n=sigTarget(tg0,520),R=280,x=n?n.x:P.x+Math.cos(P.face)*260,y=n?n.y:P.y+Math.sin(P.face)*260;if(n)P.face=Math.atan2(n.y-P.y,n.x-P.x);
  ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<24;j++){const an=rnd()*6.283,d=Math.sqrt(rnd())*R,sx=x+Math.cos(an)*d,sy=y+Math.sin(an)*d;
    sigLater(.1*(j+1),()=>{aoeHit(sx,sy,110,s.m,dist(sx,sy,P.x,P.y)/520);ring(sx,sy,90,s.col);spark(sx,sy,s.col,8,120,.3,2.4);sigLine(sx,sy-160,sx,sy,s.col,6)})}},
sg_c300:({s,tg0})=>{const n=sigTarget(tg0,520),x=n?n.x:P.x+Math.cos(P.face)*240,y=n?n.y:P.y+Math.sin(P.face)*240,an=n?Math.atan2(n.y-P.y,n.x-P.x):P.face;P.face=an;
  const E=['#ff6a3d','#4fb3ff','#3ddc84','#dcdcdc','#c9a15a'];
  sigLater(0,()=>{aoeHit(x,y,140,s.m);sigFx(x,y,140,E[0],1);spark(x,y,E[0],26,260,.6,3);pop(x,y-30,'FIRE',E[0],13)});
  sigLater(.6,()=>{aoeHit(x,y,150,s.m*.7);sigHealSelf(.08);sigFx(x,y,150,E[1],1);spark(x,y,E[1],26,260,.6,3);pop(x,y-30,'WATER',E[1],13)});
  sigLater(1.2,()=>{sigShield(.1,8);sigFx(P.x,P.y,90,E[2],1);spark(P.x,P.y,E[2],26,140,.8,3);pop(P.x,P.y-46,'WOOD',E[2],13)});
  sigLater(1.8,()=>{const L=420,sx=P.x,sy=P.y;for(const q of sigFoes(sx,sy,L))if(sigInLine(q,sx,sy,an,L,60))hitAny(q,s.m*1.3);sigLine(sx,sy,sx+Math.cos(an)*L,sy+Math.sin(an)*L,E[3],16);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(sx+Math.cos(an)*L),Math.round(sy+Math.sin(an)*L)],c:E[3]});pop(sx,sy-40,'METAL',E[3],13)});
  sigLater(2.4,()=>{aoeHit(x,y,230,s.m*2);sigFx(x,y,230,E[4],1);spark(x,y,E[4],40,320,.7,3.4);shake=Math.max(shake,.7);pop(x,y-30,'EARTH',E[4],14)})},
sg_c500:({s})=>{P.spirits.push({k:3,t:12,iv:.55,cd:0,dmg:s.m,col:s.col,r:420});const same=P.spirits.filter(q=>q.k===3);if(same.length>1)P.spirits.splice(P.spirits.indexOf(same[0]),1);sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,28,150,.8,3);pop(P.x,P.y-46,'DAO CLONE',s.col,14)},
sg_c750:({s,tg0})=>{const n=tg0&&!tg0.dead?tg0:null,an=n?Math.atan2(n.y-P.y,n.x-P.x):P.face,L=720,W=130,sx=P.x,sy=P.y,ex=sx+Math.cos(an)*L,ey=sy+Math.sin(an)*L;P.face=an;
  for(let j=0;j<=9;j++)ring(sx+(ex-sx)*j/9,sy+(ey-sy)*j/9,W*.55,s.col);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col});
  sigLater(1.1,()=>{for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,W))hitAny(q,s.m);sigLine(sx,sy,ex,ey,'#ffffff',30);for(let j=0;j<=9;j++){const px=sx+(ex-sx)*j/9,py=sy+(ey-sy)*j/9;ring(px,py,W*.7,s.col,'whirl');spark(px,py,s.col,10,200,.5,3)}shake=Math.max(shake,1);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:'#ffffff'})})},
sg_c1000:({s})=>{const T=15;sigBuff(.4,T);P.ceT=Math.max(P.ceT,T);sigDR(.3,T);P.ls=.08;P.lsT=Math.max(P.lsT,T);partyShare('atk',.2);
  sigFx(P.x,P.y,160,s.col,1);sigFx(P.x,P.y,240,'#ffe9a8');spark(P.x,P.y,'#ffe9a8',60,300,1.2,3.4,120);pop(P.x,P.y-50,'IMMORTAL FORM',s.col,16);shake=Math.max(shake,.6);
  for(let j=1;j<=T;j++)sigLater(j,()=>{sigHealSelf(.03);spark(P.x,P.y,s.col,6,60,.8,2.6,50)})},
/* ===== NIGHT BLADE ===== */
sg_n25:({s})=>{const sx=P.x,sy=P.y;P.inv=Math.max(P.inv,1.5);P.vlT=Math.max(P.vlT,6);P.ceT=Math.max(P.ceT,6);sigBuff(.1,6);sigFx(sx,sy,70,s.col,1);spark(sx,sy,s.col,30,160,.9,3);pop(P.x,P.y-46,'AFTERIMAGE',s.col,13)},
sg_n50:({s})=>{P.ls=.2;P.lsT=8;sigBuff(.1,8);sigFx(P.x,P.y,80,'#ff5a7a');spark(P.x,P.y,'#ff5a7a',24,120,.8,3);pop(P.x,P.y-46,'VAMPIRIC',s.col,14)},
sg_n100:({s,tg0,A})=>{const c=(tg0&&!tg0.dead&&!tg0.pend&&!tg0.isPl&&dist(tg0.x,tg0.y,P.x,P.y)<=460)?tg0:nearest(460);if(!c||c.isPl)return false;
  P.mark={m:c,acc:0};P.markT=5;P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;sigFx(c.x,c.y,60,s.col);pop(c.x,c.y-c.r-30,'MARKED','#ff5a7a',14);
  for(let j=1;j<=4;j++)sigLater(j,()=>{if(!c.dead)sigFx(c.x,c.y,40+j*8,'#ff5a7a')});
  sigLater(5,()=>{const mk=P.mark;if(mk&&mk.m===c&&!c.dead&&!c.pend){const d=Math.min(mk.acc*.9,A*s.m*10)+A*s.m;sigBusy=true;try{hitMonster(c,Math.round(d),true)}finally{sigBusy=false}sigFx(c.x,c.y,110,s.col,1);spark(c.x,c.y,'#ff5a7a',40,320,.7,3.4);shake=Math.max(shake,.7);pop(c.x,c.y-c.r-44,'DETONATE','#ff5a7a',15)}P.mark=null;P.markT=0})},
sg_n200:({s})=>{const R=300;if(!sigFoes(P.x,P.y,R).length)return false;
  for(let j=0;j<30;j++)sigLater(.1*(j+1),()=>{const L=sigFoes(P.x,P.y,R);if(!L.length)return;const q=L[(rnd()*L.length)|0];hitAny(q,s.m,dist(q.x,q.y,P.x,P.y)/R);sigLine(P.x,P.y,q.x,q.y,s.col,6);spark(q.x,q.y,s.col,4,100,.25,2.2)});
  sigFx(P.x,P.y,60,s.col,1)},
sg_n300:({s,tg0})=>{const c=sigTarget(tg0,420);if(!c)return false;const x=c.x,y=c.y,R=230;P.face=Math.atan2(y-P.y,x-P.x);ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<10;j++)sigLater(.5*(j+1),()=>{aoeHit(x,y,R,s.m*(1+j*.15));ring(x,y,R*(.4+.06*j),s.col,'whirl');spark(x,y,s.col,12,R*1.2,.6,2.6)})},
sg_n500:({s,id,tg0})=>{const c=sigTarget(tg0,460);if(!c)return false;const ma=Math.atan2(c.y-P.y,c.x-P.x),gap=P.r+c.r+18;
  sigLine(P.x,P.y,c.x,c.y,s.col,12);P.x=c.x+Math.cos(ma)*gap;P.y=c.y+Math.sin(ma)*gap;P.face=ma+Math.PI;P.inv=Math.max(P.inv,.4);P.target=c;P.task=null;P.mv=null;
  const f=c.maxhp>0?clamp(c.hp/c.maxhp,0,1):1;hitAny(c,s.m*(1+(1-f)*2.5));sigFx(c.x,c.y,70,s.col,1);spark(c.x,c.y,s.col,30,260,.6,3);shake=Math.max(shake,.5);
  if(c.dead||c.pend||c.hp<=0){for(let j=0;j<SCD.length;j++)if(j!==id)SCD[j]=0;pop(P.x,P.y-50,'VERDICT: COOLDOWNS RESET','#ffe27a',14);sigFx(P.x,P.y,120,'#ffe27a',1)}},
sg_n750:({s,tg0})=>{const c=sigTarget(tg0,420),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,base=c?Math.atan2(c.y-P.y,c.x-P.x):P.face,H=330,W=55;P.face=base;
  const ang=[base+Math.PI/4,base-Math.PI/4];
  for(const an of ang){sigLine(x-Math.cos(an)*H,y-Math.sin(an)*H,x+Math.cos(an)*H,y+Math.sin(an)*H,s.col,20);for(let j=-3;j<=3;j++)ring(x+Math.cos(an)*H*j/3,y+Math.sin(an)*H*j/3,30,s.col)}
  sigLater(.7,()=>{for(const an of ang){const sx=x-Math.cos(an)*H,sy=y-Math.sin(an)*H;for(const q of sigFoes(x,y,H+60))if(sigInLine(q,sx,sy,an,H*2,W))hitAny(q,s.m*.6);
      sigLine(sx,sy,x+Math.cos(an)*H,y+Math.sin(an)*H,'#ffffff',30);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(x+Math.cos(an)*H),Math.round(y+Math.sin(an)*H)],c:s.col})}
    aoeHit(x,y,75,s.m);sigFx(x,y,90,s.col,1);spark(x,y,s.col,40,300,.7,3.2);shake=Math.max(shake,.8)})},
sg_n1000:({s})=>{const R=520;if(!sigFoes(P.x,P.y,R).length)return false;P.inv=Math.max(P.inv,3);pop(P.x,P.y-50,'SHADOWLESS',s.col,15);
  for(let j=0;j<10;j++)sigLater(.25*j,()=>{const L=sigFoes(P.x,P.y,R);if(!L.length)return;const q=L[(rnd()*L.length)|0],ma=Math.atan2(q.y-P.y,q.x-P.x),gap=P.r+q.r+16;
    sigLine(P.x,P.y,q.x,q.y,s.col,8);P.x=q.x-Math.cos(ma)*gap;P.y=q.y-Math.sin(ma)*gap;P.face=ma;P.inv=Math.max(P.inv,.4);hitAny(q,s.m);ring(q.x,q.y,50,s.col,'whirl');spark(q.x,q.y,s.col,14,220,.4,2.8);shake=Math.max(shake,.3)});
  sigLater(2.6,()=>{aoeHit(P.x,P.y,260,s.m*3.5);sigFx(P.x,P.y,260,s.col,1);spark(P.x,P.y,s.col,50,320,.8,3.4);shake=Math.max(shake,.9)})},
/* ===== IRON GUARDIAN ===== */
sg_g25:({s})=>{sigShield(.25,8);sigDR(.25,6);sigFx(P.x,P.y,90,s.col);spark(P.x,P.y,s.col,24,120,.8,3);pop(P.x,P.y-46,'STONESKIN',s.col,14)},
sg_g50:({s})=>{P.rf=.8;P.rfT=8;sigDR(.3,8);sigFx(P.x,P.y,90,s.col,1);spark(P.x,P.y,'#ffffff',22,140,.7,2.8);pop(P.x,P.y-46,'THORNS',s.col,14)},
sg_g100:({s,tg0,a})=>{const c=tg0&&!tg0.dead?tg0:null,an=c?Math.atan2(c.y-P.y,c.x-P.x):a,L=420,sx=P.x,sy=P.y,cx=Math.cos(an),cy=Math.sin(an),ex=sx+cx*L,ey=sy+cy*L;
  for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,110))hitAny(q,s.m);
  sigLine(sx,sy,ex,ey,s.col,18);P.face=an;P.x=ex;P.y=ey;P.inv=Math.max(P.inv,.5);sigShield(.1,5);shake=Math.max(shake,.5);sigFx(ex,ey,90,s.col,1);fxs({k:'ch',p:[Math.round(sx),Math.round(sy),Math.round(ex),Math.round(ey)],c:s.col})},
sg_g200:({s,A})=>{const T=6;P.abs=0;P.absT=T;sigFx(P.x,P.y,90,s.col);pop(P.x,P.y-46,'VESSEL',s.col,14);
  delayed.push({t:T,f:()=>{const dm=P.abs||0;P.abs=0;P.absT=0;if(P.dead>0)return;const R=300,d=Math.min(dm*1.5,maxHp()*3)+A*s.m;
    for(const q of sigFoes(P.x,P.y,R))sigFixed(q,d,false);sigFx(P.x,P.y,R,s.col,1);sigFx(P.x,P.y,R*.6,'#ffffff');spark(P.x,P.y,s.col,44,R*1.8,.7,3.2);shake=Math.max(shake,.8);pop(P.x,P.y-50,'RELEASE','#ffd27a',15)}})},
sg_g300:({s})=>{const x=P.x,y=P.y,R=280;sigFx(x,y,R,s.col,1);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});if(MP)netSend({t:'taunt'});pop(x,y-50,'IRON BANNER',s.col,14);
  for(let j=1;j<=10;j++)sigLater(j,()=>{if(dist(P.x,P.y,x,y)<R){sigDR(.2,1.6);sigHealSelf(.02)}aoeHit(x,y,R,s.m);ring(x,y,R*.6,s.col);spark(x,y,s.col,10,R,.5,2.6);if(MP&&j%3===0)netSend({t:'taunt'})})},
sg_g500:({s})=>{P.inv=Math.max(P.inv,1.1);P.mv=null;const R=300;sigFx(P.x,P.y,R,s.col);sigFx(P.x,P.y,R*.5,s.col);pop(P.x,P.y-50,'MOUNTAIN',s.col,15);
  sigLater(1,()=>{aoeHit(P.x,P.y,R,s.m);sigShield(.2,8);sigFx(P.x,P.y,R,s.col,1);sigFx(P.x,P.y,R*.7,'#ffffff',1);spark(P.x,P.y,s.col,60,R*2,.9,3.6);shake=1})},
sg_g750:({s})=>{for(let j=0;j<4;j++)P.spirits.push({k:4,t:12,iv:.8,cd:j*.2,dmg:s.m,col:s.col,r:240});const same=P.spirits.filter(q=>q.k===4);while(same.length>4)P.spirits.splice(P.spirits.indexOf(same.shift()),1);
  sigShield(.15,10);sigFx(P.x,P.y,90,s.col,1);spark(P.x,P.y,s.col,30,150,.8,3);pop(P.x,P.y-46,'SENTINELS',s.col,14)},
sg_g1000:({s})=>{const T=15;sigShield(.5,T);sigDR(.45,T);P.rf=.5;P.rfT=Math.max(P.rfT,T);sigBuff(.3,T);partyShare('atk',.15);if(MP)netSend({t:'taunt'});
  sigFx(P.x,P.y,170,s.col,1);sigFx(P.x,P.y,260,'#ffe9a8');spark(P.x,P.y,'#ffe9a8',60,300,1.2,3.4,120);pop(P.x,P.y-50,'AVATAR',s.col,16);shake=Math.max(shake,.7);
  for(let j=1;j<=10;j++)sigLater(1.5*j,()=>{aoeHit(P.x,P.y,240,s.m);sigFx(P.x,P.y,240,s.col,1);spark(P.x,P.y,s.col,24,300,.6,3);shake=Math.max(shake,.4)})},
/* ===== STORM ARCHER ===== */
sg_a25:({s})=>{P.vlT=Math.max(P.vlT,6);P.gsT=Math.max(P.gsT||0,6);P.ceT=Math.max(P.ceT,6);sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,26,140,.8,3);pop(P.x,P.y-46,'WINDRUNNER',s.col,14)},
sg_a50:({s,tg0})=>{const c=sigTarget(tg0,720);if(!c)return false;const d0=dist(c.x,c.y,P.x,P.y),x=c.x,y=c.y;P.face=Math.atan2(y-P.y,x-P.x);P.target=c;
  hitAny(c,s.m*(P.gsT>0?1.4:1),d0/720);sigLine(P.x,P.y,x,y,'#ff9a3d',24);fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(x),Math.round(y)],c:s.col});sigFx(x,y,130,'#ff7a2d',1);spark(x,y,'#ff7a2d',34,260,.7,3.2);
  for(let j=1;j<=4;j++)sigLater(j,()=>{aoeHit(x,y,130,s.m*.3);ring(x,y,110,'#ff7a2d');spark(x,y,'#ffb347',12,90,.7,2.8,40)})},
sg_a100:({s,a,A})=>{P.face=a;for(let w=0;w<3;w++)sigLater(.25*w,()=>{const an=[];for(let j=0;j<9;j++){const g=a+(j-4)*.1;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*760,vy:Math.sin(g)*760,life:.75,l0:.75,dmg:A*s.m*(P.gsT>0?1.4:1),hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:an,c:s.col});spark(P.x,P.y,s.col,10,120,.3,2.4)})},
sg_a200:({s,tg0})=>{const c=sigTarget(tg0,520),cx=c?c.x:P.x+Math.cos(P.face)*260,cy=c?c.y:P.y+Math.sin(P.face)*260;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);
  const pos=[0,1,2].map(i=>[cx+Math.cos(i*2.094+.5)*130,cy+Math.sin(i*2.094+.5)*130]);
  for(const p of pos){ring(p[0],p[1],40,s.col);spark(p[0],p[1],s.col,8,60,.6,2.6)}fxs({k:'mt',x:Math.round(cx),y:Math.round(cy),r:150,c:s.col});
  sigLater(1,()=>{for(const p of pos){aoeHit(p[0],p[1],130,s.m,dist(p[0],p[1],P.x,P.y)/520);ring(p[0],p[1],130,s.col,'whirl');spark(p[0],p[1],s.col,24,220,.5,3)}shake=Math.max(shake,.5)});
  sigLater(1.6,()=>{aoeHit(cx,cy,200,s.m*1.5,dist(cx,cy,P.x,P.y)/520);sigFx(cx,cy,200,s.col,1);spark(cx,cy,s.col,44,320,.7,3.4);shake=Math.max(shake,.8)})},
sg_a300:({s,tg0})=>{const c=sigTarget(tg0,520);if(!c)return false;const pts=[];let px=P.x,py=P.y,cc=c;
  for(let j=0;j<8&&cc;j++){hitAny(cc,s.m*(1+j*.12),dist(cc.x,cc.y,P.x,P.y)/520);sigLine(px,py,cc.x,cc.y,s.col,7);ring(cc.x,cc.y,36,s.col);pts.push(Math.round(px),Math.round(py),Math.round(cc.x),Math.round(cc.y));px=cc.x;py=cc.y;
    let bb=null,bd=330;for(const q of sigFoes(px,py,330)){if(q===cc)continue;const d=dist(q.x,q.y,px,py);if(d<bd){bd=d;bb=q}}cc=bb}
  P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;fxs({k:'ch',p:pts.slice(0,40),c:s.col})},
sg_a500:({s,tg0,A})=>{const c=sigTarget(tg0,900);if(!c)return false;P.face=Math.atan2(c.y-P.y,c.x-P.x);P.target=c;P.mv=null;
  sigLine(P.x,P.y,c.x,c.y,'#ff4d4d',30);ring(c.x,c.y,50,'#ff4d4d');ring(c.x,c.y,26,'#ff4d4d');pop(c.x,c.y-c.r-30,'LOCKED','#ff4d4d',14);
  sigLater(.8,()=>{if(c.dead||c.pend)return;const fr=dist(c.x,c.y,P.x,P.y)/900,d=A*s.m*critMul()*(.9+rnd()*.2);
    if(c.isPl)hitPeer(c,Math.round(d*(1-RANGE_FALL*fr)),true);else hitMonster(c,rangedDmg(c,Math.round(d),fr),true);
    sigLine(P.x,P.y,c.x,c.y,'#ffffff',36);fxs({k:'ch',p:[Math.round(P.x),Math.round(P.y),Math.round(c.x),Math.round(c.y)],c:s.col});sigFx(c.x,c.y,80,s.col,1);spark(c.x,c.y,'#ffffff',30,280,.6,3.2);shake=Math.max(shake,.7)})},
sg_a750:({s,tg0})=>{const c=sigTarget(tg0,520),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,R=330;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);ring(x,y,R,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});
  for(let j=0;j<16;j++){const an=rnd()*6.283,d=Math.sqrt(rnd())*R,sx=x+Math.cos(an)*d,sy=y+Math.sin(an)*d;
    sigLater(.2*(j+1),()=>{sigLine(sx-80,sy-300,sx,sy,'#fff6d6',10);aoeHit(sx,sy,100,s.m,dist(sx,sy,P.x,P.y)/520);ring(sx,sy,90,s.col,'whirl');spark(sx,sy,s.col,16,180,.5,3);shake=Math.max(shake,.25)})}},
sg_a1000:({s,A})=>{const T=12;sigBuff(.35,T);P.ceT=Math.max(P.ceT,T);P.gsT=Math.max(P.gsT||0,T);P.vlT=Math.max(P.vlT,T);partyShare('atk',.15);
  sigFx(P.x,P.y,150,s.col,1);sigFx(P.x,P.y,230,'#fff08a');spark(P.x,P.y,'#fff08a',60,300,1.2,3.4,120);pop(P.x,P.y-50,'TEMPEST',s.col,16);shake=Math.max(shake,.6);
  for(let j=1;j<=30;j++)sigLater(.4*j,()=>{const q=nearest(700);if(!q)return;const g=Math.atan2(q.y-P.y,q.x-P.x);P.face=g;projs.push({x:P.x,y:P.y,vx:Math.cos(g)*900,vy:Math.sin(g)*900,life:.85,l0:.85,dmg:atkVal()*s.m*1.4,hit:new Set(),ang:g,col:s.col});fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:[+g.toFixed(2)],c:s.col});spark(P.x,P.y,s.col,5,80,.25,2.4)})},
/* ===== SPIRIT SUMMONER ===== */
sg_s25:({s})=>{sigFx(P.x,P.y,80,s.col,1);spark(P.x,P.y,s.col,24,100,1,3,60);pop(P.x,P.y-46,'SOUL LANTERN',s.col,13);
  for(let j=0;j<6;j++)sigLater(2*j,()=>{const h=sigHealSelf(.08);partyShare('heal',h/maxHp()*.5);P.qi=Math.min(maxQi(),P.qi+maxQi()*.04);sigFx(P.x,P.y,60,s.col);spark(P.x,P.y,s.col,12,70,.9,2.8,50)})},
sg_s50:({s})=>{let w=P.spirits.filter(q=>q.k===1).length;while(w<3){P.spirits.push({k:1,t:9,iv:.7,cd:0,dmg:s.m,col:s.col,r:320});w++}
  for(const sp of P.spirits)if(!sp.fz){sp.fz=1;sp.iv=Math.max(.25,sp.iv*.5);sp.dmg*=1.5;sp.t+=3}else sp.t=Math.max(sp.t,6);
  sigFx(P.x,P.y,100,s.col,1);spark(P.x,P.y,s.col,34,200,.9,3);pop(P.x,P.y-46,'PACK FRENZY',s.col,14)},
sg_s100:({s,A})=>{for(let w=0;w<2;w++)sigLater(.5*w,()=>{const an=[];for(let j=0;j<12;j++){const g=j/12*6.283+w*.26;an.push(+g.toFixed(2));projs.push({x:P.x,y:P.y,vx:Math.cos(g)*440,vy:Math.sin(g)*440,life:1,l0:1,dmg:A*s.m,hit:new Set(),ang:g,col:s.col})}fxs({k:'pr',x:Math.round(P.x),y:Math.round(P.y),a:an.slice(0,9),c:s.col});sigFx(P.x,P.y,70,s.col,1)})},
sg_s200:({s})=>{const L=mons.filter(q=>!q.dead&&!q.pend&&dist(q.x,q.y,P.x,P.y)<450).sort((x,y)=>dist(x.x,x.y,P.x,P.y)-dist(y.x,y.y,P.x,P.y)).slice(0,6);if(L.length<2)return false;
  P.link=new Set(L);P.linkT=8;const pts=[];for(let i=0;i<L.length;i++){ring(L[i].x,L[i].y,40,s.col);const n=L[(i+1)%L.length];pts.push(Math.round(L[i].x),Math.round(L[i].y),Math.round(n.x),Math.round(n.y));sigLine(L[i].x,L[i].y,n.x,n.y,s.col,8)}
  fxs({k:'ch',p:pts.slice(0,40),c:s.col});pop(P.x,P.y-46,'SOUL WEB',s.col,14)},
sg_s300:({s})=>{sigBuff(.25,10);partyShare('atk',.125);const h=sigHealSelf(.3);partyShare('heal',h/maxHp()*.5);P.qi=Math.min(maxQi(),P.qi+maxQi()*.15);sigFx(P.x,P.y,120,s.col,1);sigFx(P.x,P.y,180,s.col);spark(P.x,P.y,s.col,40,200,1,3,80);pop(P.x,P.y-46,'CHORUS',s.col,14)},
sg_s500:({s,tg0,a})=>{const n=tg0&&!tg0.dead?tg0:null,an=n?Math.atan2(n.y-P.y,n.x-P.x):a,L=760,W=130,sx=P.x,sy=P.y,ex=sx+Math.cos(an)*L,ey=sy+Math.sin(an)*L;P.face=an;
  const pass=(fx,fy,tx,ty)=>{for(const q of sigFoes((sx+ex)/2,(sy+ey)/2,L*.6))if(sigInLine(q,sx,sy,an,L,W))hitAny(q,s.m);sigLine(fx,fy,tx,ty,s.col,30);for(let j=0;j<=8;j++){const px=fx+(tx-fx)*j/8,py=fy+(ty-fy)*j/8;ring(px,py,W*.6,s.col,'whirl');spark(px,py,s.col,8,160,.5,3)}shake=Math.max(shake,.5);fxs({k:'ch',p:[Math.round(fx),Math.round(fy),Math.round(tx),Math.round(ty)],c:s.col})};
  sigLater(.3,()=>pass(sx,sy,ex,ey));sigLater(1,()=>pass(ex,ey,P.x,P.y));pop(P.x,P.y-46,'DRAGON',s.col,14)},
sg_s750:({s})=>{for(let j=0;j<3;j++)P.spirits.push({k:1,t:12,iv:.7,cd:j*.15,dmg:s.m,col:s.col,r:320});const w=P.spirits.filter(q=>q.k===1);while(w.length>6)P.spirits.splice(P.spirits.indexOf(w.shift()),1);
  P.spirits.push({k:2,t:12,iv:1,cd:0,dmg:s.m,col:s.col,r:260});const g=P.spirits.filter(q=>q.k===2);while(g.length>1)P.spirits.splice(P.spirits.indexOf(g.shift()),1);
  sigShield(.2,12);sigFx(P.x,P.y,110,s.col,1);spark(P.x,P.y,s.col,40,200,.9,3);pop(P.x,P.y-46,'LEGION',s.col,15)},
sg_s1000:({s,tg0})=>{const c=sigTarget(tg0,520),x=c?c.x:P.x+Math.cos(P.face)*260,y=c?c.y:P.y+Math.sin(P.face)*260,R=340;if(c)P.face=Math.atan2(c.y-P.y,c.x-P.x);ring(x,y,R,s.col);ring(x,y,R*.5,s.col);fxs({k:'mt',x:Math.round(x),y:Math.round(y),r:R,c:s.col});pop(x,y-50,'NETHERWORLD GATE',s.col,15);
  for(let j=1;j<=12;j++)sigLater(.5*j,()=>{const t=aoeHit(x,y,R,s.m);if(t>0)sigHealSelf(.01);ring(x,y,R*(.5+.04*j),s.col,'whirl');spark(x,y,s.col,14,R*1.2,.6,2.8)});
  sigLater(6.2,()=>{aoeHit(x,y,R*1.15,s.m*6);sigFx(x,y,R*1.15,s.col,1);sigFx(x,y,R*.6,'#ffffff');spark(x,y,s.col,70,R*2,1,3.6);shake=1})}
};
for(const c of SIGD)for(const y of c)SKFAM[y[0]]=y[7];
Object.assign(CAST_LONG,{sg_c750:1,sg_c1000:1,sg_g500:1,sg_g1000:1,sg_a500:1,sg_a1000:1,sg_s1000:1,sg_s750:1,sg_c300:1});
Object.assign(CAST_NOROOT,{sg_g100:1,sg_n500:1,sg_n1000:1});
/* older saves / characters already past a milestone: put the signature skills of the CURRENT class into EMPTY slots, once (nothing is replaced) */
function giveSig(){for(const lv of SIG_LV){const id=SIGK[P.cls][lv];if(id===undefined||P.lvl<SKILLS[id].lv||EQ.includes(id))continue;const e=EQ.indexOf(-1);if(e<0)break;EQ[e]=id;AUTOSK[e]=true}}
function unlock(k){unlockId(2+k)}
function unlockId(id){const s=SKILLS[id];if(!s||(s.c||0)!==P.cls)return;const e=EQ.indexOf(-1);if(e>=0){EQ[e]=id;buildBar()}
  say('New skill: '+s.n+(e>=0?' (slot '+(e+1)+')':'. Press K to equip')+'.',s.col)}
/* older saves have no melee skills equipped: put the best available one of each melee type into EMPTY slots (nothing is replaced), once */
function giveMelee(){
  for(const ty of ['strike','cleave','leap','flurry']){
    let b=-1;for(const id of MELEE)if(SKILLS[id].t===ty&&P.lvl>=SKILLS[id].lv)b=id;
    if(b<0||EQ.includes(b))continue;const e=EQ.indexOf(-1);if(e<0)break;EQ[e]=b;AUTOSK[e]=true;
  }
}
/* best layout for class c: pass 1 = the best unlocked skill of each type (CLS_ORDER), pass 2 = the 2nd best of each type, pass 3 = the 3rd ... until all NSLOT slots are full
   (or the class has no more unlocked skills). Higher ids of a type are always the stronger / later ones. */
function arrangeFor(c){
  const cand=CLS_ORDER[c].map(ts=>{const a=[];for(let i=SKILLS.length-1;i>=0;i--)if((SKILLS[i].c||0)===c&&P.lvl>=SKILLS[i].lv&&ts.includes(SKILLS[i].t))a.push(i);return a}),o=[];
  for(let pass=0;o.length<NSLOT;pass++){
    let any=false;
    for(const a of cand){if(pass<a.length){any=true;if(!o.includes(a[pass])){o.push(a[pass]);if(o.length>=NSLOT)break}}}
    if(!any)break;
  }
  const r=[];for(let i=0;i<NSLOT;i++)r.push(o[i]===undefined?-1:o[i]);
  /* v5_160 the two highest signature skills go to R and T (manual priority slots; the long cooldown ones suit a hand-fired button) */
  const sg=SKILLS.map((q,i)=>i).filter(i=>SKILLS[i].sig&&SKILLS[i].c===c&&P.lvl>=SKILLS[i].lv).sort((x,y)=>SKILLS[y].lv-SKILLS[x].lv).slice(0,2);
  sg.forEach((id,j)=>{const slot=NSLOT-1-j;const old=r[slot];r[slot]=id;if(old>=0&&r.indexOf(old)<0){const e=r.indexOf(-1);if(e>=0)r[e]=old}});
  return r;
}
function autoArrange(){const r=arrangeFor(P.cls);for(let i=0;i<NSLOT;i++)EQ[i]=r[i]}
/* v5_59: the skill book button arranges EVERY class: the one in use now, and the saved layouts of all the others (their auto-cast switches stay on) */
function autoArrangeAll(){
  autoArrange();
  for(let c=0;c<CLASSES.length;c++)if(c!==P.cls)CLS_STORE[c]={e:arrangeFor(c),a:new Array(NSLOT).fill(true)};
}
const hitAny=(q,x,f)=>q.isPl?sdp(q,x,f):sd(q,x,f);
/* damage everything (monsters, and flagged players in PvP) inside a circle; returns the total dealt */
function aoeHit(x,y,r,m,fr){let tot=0;for(const q of mons)if(!q.dead&&dist(q.x,q.y,x,y)<r+q.r)tot+=sd(q,m,fr)||0;for(const q of foes())if(dist(q.x,q.y,x,y)<r+q.r)tot+=sdp(q,m,fr)||0;return tot}
/* auto-hunt rules of the class skills (undefined = not a class skill type) */
/* v5_123 AUTO-CAST = "cast it as soon as it is ready". The only things that hold an auto skill back now: its own range (so Qi is not wasted on far targets),
   a buff that is still running, healing skills at (almost) full HP, and Gale (it throws you back, so it stays an emergency-only escape). No more minimum
   distances, enemy counts or boss-only rules. useSkill(i,true) still checks cooldown, Qi and that a real enemy is inside the skill's reach. */
function clsAuto(ty,d,t,near){
  if(ty.startsWith('sg_'))return sigAuto(ty,d,t,near);
  if(P.cls===2&&IG_AUTO_T[ty]&&t&&d>P.r+t.r+IG_PAD)return false;
  switch(ty){
    case 'heal':case 'mend':case 'soulheal':return P.hp<maxHp()*.9;
    case 'might':return !(P.bfT>0);case 'smoke':return !(P.vlT>0);
    case 'bulwark':case 'guardian':return !(P.shT>0);case 'ironskin':return !(P.drT>0);
    case 'eagle':return !(P.ceT>0)&&d<480;
    case 'wolves':return P.spirits.filter(q=>q.k===1).length<3&&d<480;
    case 'gale':return near>=3&&P.hp<maxHp()*.3&&!(P.gsT>0)&&!(P.galeLock>0); /* emergency escape only (30% HP, 3+ enemies close): it throws you 240 back */
    case 'nova':case 'bladestorm':case 'soulburst':case 'wail':case 'drain':case 'harvest':case 'chains':return d<=300;
    case 'bash':case 'hammer':case 'quake':case 'roar':case 'counter':return true; /* useSkill checks the melee reach itself */
    case 'shockwave':return d<420;
    case 'charge':return !!t&&d>P.r+t.r+IG_PAD+40&&d<=400; /* gap-closer only: never wasted on a target that is already in melee reach */
  }
  return d<(P.cls>=3?480:420)}
/* v5_189 the auto-cast condition of one skill type (was inline in the main loop; also used to show the next auto skill as Reserved) */
function autoWants(ty,d,t,near){const cu=clsAuto(ty,d,t,near);return cu!==undefined?cu:ty==='heal'||ty==='mend'?P.hp<maxHp()*.5:ty==='nova'?near>=2||(d<=90&&t.boss):ty==='drain'?near>=2||(near&&P.hp<maxHp()*.8):ty==='might'?(t.boss||near>=3)&&P.bfT<=0:ty==='shadowstep'?d>120&&d<420:ty==='bladestorm'?near>=2||d<=130:ty==='smoke'?(t.boss||near>=3)&&P.vlT<=0:ty==='execute'?d<=200:ty==='siphon'?d<=170&&P.hp<maxHp()*.9:ty==='rush'?d>150&&d<380:ty==='strike'||ty==='flurry'?d<=170:ty==='cleave'?d<=200:ty==='leap'?d>170&&d<360:ty==='meteor'||ty==='chain'?d<420:d<420}
function switchClass(c){
  if(c===P.cls||c<0||c>=CLASSES.length)return;
  P.rsv=-1;P.rsvA=-1;CLS_STORE[P.cls]={e:EQ.slice(),a:AUTOSK.slice()};LOOKS[P.cls]=SKIN;P.cls=c;applyLook(LOOKS[c]);WD.tab=0;if(!$('wardrobe').hidden)wdRender();
  const st=CLS_STORE[c];CLS_STORE[c]=null;
  if(st){for(let i=0;i<NSLOT;i++){const q=SKILLS[st.e[i]];EQ[i]=q&&P.lvl>=q.lv&&(q.c||0)===c?st.e[i]:-1;AUTOSK[i]=st.a[i]!==false}}
  else{autoArrange();AUTOSK.fill(true)}
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());P.vlT=0;P.drT=0;P.ceT=0;P.spirits=[];sigReset();
  buildBar();renderBook();save();cloudFlush();netInfo(true);
  say('You are now a '+CLASSES[c].n+'.','#c7a8ff');
}
function nearest(maxd){
  let best=null,bd=maxd;
  if(pvpOnly()){for(const q of foes()){const d=dist(q.x,q.y,P.x,P.y);if(d<bd){bd=d;best=q}}return best}
  for(const m of mons){
    if(m.dead||m.pend)continue;
    const d=dist(m.x,m.y,P.x,P.y);
    if(d<bd){bd=d;best=m}
  }
  return best;
}
/* FIGHT BACK: when a monster hits you and you have no live target, you turn on it and attack with the normal attack (auto-hunt then uses your skills as usual).
   It never overrides a target you chose, a click-to-move destination, or joystick/keyboard movement (those win), and it is off in the hub and in PvP-only mode. Toggle: Bag > Fight back. */
function retaliate(m){
  if(!P.fightBack||!m||m.dead||m.isPl||P.dead>0||P.tp>0||inTown()||pvpOnly())return;
  if((P.target&&!P.target.dead)||P.mv)return;
  P.target=m;P.task=null;P.mine=0;
}
function hurtPlayer(dmg,byPlayer,atkLv,mon,pvpCrit){
  if(P.inv>0||P.god)return;
  if(byPlayer){P.pvHitT=performance.now()/1000;P.pvHitLv=atkLv||0} /* v5_74: remembered for healP */
  const D=byPlayer?pvpDom(atkLv):0; /* v5_70 gap dominance: a far higher level player ignores your dodge / reductions / shield */
  if(atkLv!==undefined&&rnd()<evaChance(atkLv)*(1-D)){spark(P.x,P.y,'#bfe6ff',6,120,.3,2.4);pop(P.x,P.y-24,'DODGE','#bfe6ff',14);SFX('dodge');combatPing();return}
  let tCrit=false;
  if(byPlayer){ /* player crit (the server tells us it was one): Crit EVA can turn it into a normal hit, otherwise Crit DMG reduction trims the bonus */
    if(pvpCrit){tCrit=true;if(rnd()<cevVal()/100*(1-D)){dmg=Math.max(1,Math.round(dmg/CRIT_MUL));tCrit=false}else dmg=Math.max(1,Math.round(dmg*(1-(1-1/CRIT_MUL)*cdrVal()/100*(1-D))))}
  }else if(atkLv!==undefined&&rnd()<monCritChance(atkLv,mon&&mon.boss)){tCrit=true;dmg=Math.max(1,Math.round(dmg*(1+(MON_CRIT_MUL-1)*(1-cdrVal()/100))))}
  {const MD=byPlayer?0:monDom(atkLv);dmg=Math.max(1,Math.round(dmg*(1-(byPlayer?pdrVal()*(1-D):bdrVal()*(1-MD))/100)*(byPlayer?1:1-(mon&&mon.boss?bsdVal():mdrVal())*(1-MD)/100)))} /* PvP DMG reduction vs players, Bash DMG reduction vs monsters */
  if(P.drT>0)dmg=Math.max(1,Math.round(dmg*(1-P.dr*(1-D))));
  if(P.rfT>0&&mon&&!mon.dead&&!byPlayer){const rd=Math.round(dmg*P.rf);if(rd>0){sigBusy=true;try{hitMonster(mon,rd,false)}finally{sigBusy=false}}} /* v5_160 reflect */
  if(P.sh>0&&D<1){const b=Math.min(P.sh*(1-D),dmg);P.sh-=b;dmg-=b;if(dmg<=0){spark(P.x,P.y,'#8ff0c4',6,120,.3,2.4);SFX('block');combatPing();return}}
  if(P.absT>0&&D<1){const room=Math.max(0,maxHp()*SIG_ABS_CAP-P.abs),b=Math.min(room*(1-D),dmg);if(b>0){P.abs+=b;dmg-=b;spark(P.x,P.y,'#c8d4dc',6,120,.3,2.4);if(dmg<=0){pop(P.x,P.y-24,'ABSORBED','#c8d4dc',13);SFX('block');combatPing();return}}} /* v5_160 Unyielding Vessel */
  P.hp-=dmg;P.hurt=.25;P.task=null;P.mine=0;combatPing();SFX(P.hp<=0?'die':'hurt'); /* home scroll keeps channelling when hit */
  spark(P.x,P.y,'#ff6a5a',8,150,.35,2.4);shake=Math.max(shake,.3);
  pop(P.x,P.y-24,'-'+dmg+(tCrit?'!':''),tCrit?'#ffb02e':'#ff7a6a',tCrit?17:14);
  if(P.hp<=0){
    sigReset();P.hp=0;P.dead=2.5;P.target=null;P.mv=null;P.task=null;P.tp=0;stopMine();
    if(byPlayer&&auto){auto=false;$('bAuto').classList.remove('on');say('Auto-hunt turned off: you were defeated by a player.','#d9503f')}
    const lost=curWorld===ARENA?0:Math.floor(P.coins*.1);P.coins-=lost;
    say('You fell. '+(lost?lost+' coins were lost. ':'')+'Returning to the Sanctum…','#d9503f');
  }
}

/* ---------- PvP ----------
   Right-click another player to flag yourself for PvP (the server owns the flag: 30s, refreshed by every PvP hit given or taken).
   While flagged you can attack players with the normal attack, skills and auto-skills. The safe hub is a no-PvP zone for everyone.
   The server applies defence, the PVP_MULT scaling and a per-hit cap, and credits kills. PVP_MULT must equal pvpMult in game.go. */
const PVP_MULT=.5,PVP_FLAG=30,PVP_BOUNTY=10;
const PVP_CAP_GAP=400; /* keep equal to pvpCapGap in game.go. v5_70: gap dominance D = clamp((attackerLv - yourLv)/PVP_CAP_GAP,0,1): your PvP defences count x(1-D) against a far higher level player */
const PVP_MAX_GAP=100; /* v5_159 level compression, keep equal to pvpMaxGap in game.go: a level lead counts for at most this many levels in PvP */
const pvpDom=atkLv=>clamp(Math.min((atkLv||0)-P.lvl,PVP_MAX_GAP)/PVP_CAP_GAP,0,1);
/* v5_74 PvP healing: for PVP_HEAL_WIN seconds after a player hit you, ALL your self-heals (potion, Mend, Soul Mend, Iron Skin, Drain, Harvest, Siphon)
   work at PVP_HEAL (50%) strength, and against a higher level attacker they fade out further x(1-D), so a level lead cannot be out-healed. */
const PVP_HEAL=.5,PVP_HEAL_WIN=8;
const healMul=()=>(performance.now()/1000-(P.pvHitT||-1e9)<PVP_HEAL_WIN)?PVP_HEAL*(1-pvpDom(P.pvHitLv)):1;
const healP=h=>Math.max(0,Math.round(h*healMul()));
const healS=h=>healP(h*SKILL_HEAL_MUL); /* v5_77: every self-heal SKILL heals SKILL_HEAL_MUL of its old amount (potions use healP directly) */
const inHubAt=(x,y)=>dist(x,y,C,C)<TOWN;
/* ---------- v5_158 PVP MODES (replace the old right-click flag) ----------
   Peaceful: attack no player.   Lawful: only players in Hostile / Carnal mode, never friends or party.
   Hostile: any player except friends and party.   Carnal: any player except party.   (Peaceful players CAN be attacked by Hostile / Carnal.)
   The safe hub is still no-PvP. No cooldown, penalty, zone or clan rules yet. The server checks every hit with the same table (pvpCanHit in game.go).
   'ATK Players Only' (P key): monsters are ignored and auto-target / auto-skills / area skills only pick players your mode lets you attack. When it is OFF, auto-target and area skills ignore
   players; you can still click a player to target him and attack (area skills then include players while he is your target). In the Arena (no monsters) players are always auto-targeted. */
const PVP_NAMES=['Peaceful','Lawful','Hostile','Carnal'],PVP_COL=['#6dde73','#7cc8ff','#ffa85c','#ff5a50'];
const PVP_INFO=['You cannot attack players.','You may attack only Hostile and Carnal players (never friends or party).','You may attack anyone except your friends and party.','You may attack anyone except your party. Peaceful players are fair game too.'];
const pvpOnly=()=>PVPMODE&&MP;
function pvpRule(q){ /* may I (in my mode) attack this player? keep equal to pvpCanHit() in game.go */
  if(PVPLVL<=0||PARTY.ids.has(q.id))return false;
  if(PVPLVL>=3)return true;
  if(frIs(q.name))return false;
  if(PVPLVL===1)return (q.pm|0)>=2;
  return true;
}
function pvpWhy(q){
  if(PVPLVL<=0)return 'You are in Peaceful mode — open the PvP panel and pick Lawful, Hostile or Carnal to attack players.';
  if(PARTY.ids.has(q.id))return q.name+' is in your party.';
  if(PVPLVL<3&&frIs(q.name))return q.name+' is your friend.';
  if(PVPLVL===1&&(q.pm|0)<2)return 'Lawful: you can only attack Hostile or Carnal players.';
  return 'You cannot attack '+q.name+'.';
}
function setPvpLvl(n,quiet){
  n=clamp(n|0,0,3);if(n===PVPLVL&&!quiet)return;
  PVPLVL=n;if(MP)netSend({t:'pvpm',on:PVPLVL});
  if(PVPLVL<=0&&PVPMODE)PVPMODE=false;
  if(P.target&&P.target.isPl&&!pvpOk(P.target))P.target=null;
  pvpUI(true);if(!quiet){say('PvP mode: '+PVP_NAMES[n]+' — '+PVP_INFO[n],PVP_COL[n],7000);if(!MP)say('PvP needs the multiplayer server.','#8d9aa2');save()}
}
function togglePvpMode(){ /* the 'ATK Players Only' switch (P key) */
  if(!started)return;
  if(!MP){say('PvP needs the multiplayer server.','#8d9aa2');return}
  if(!PVPMODE&&PVPLVL<=0){say('ATK Players Only needs a PvP mode — in Peaceful you cannot attack players. Pick Lawful, Hostile or Carnal.','#8d9aa2',6000);return}
  PVPMODE=!PVPMODE;pvpUI(true);
  if(PVPMODE){
    if(P.target&&!P.target.isPl)P.target=null;
    say(inTown()?'ATK Players Only ON — it works when you leave the safe hub. You only target players your mode allows.':'ATK Players Only ON — you only target players your mode allows.',PVP_COL[PVPLVL],6000);
  }else{
    if(P.target&&P.target.isPl&&!pvpOk(P.target))P.target=null;
    say('ATK Players Only OFF — you attack monsters again.','#8d9aa2');
  }
}
let pvpUIKey='',pvpPanelEl=null;
function pvpUI(force){
  const k=PVPLVL+':'+(PVPMODE?1:0);if(!force&&k===pvpUIKey)return;pvpUIKey=k;
  const b=$('bPvp');
  if(b){b.classList.toggle('on',PVPMODE);b.style.borderColor=PVPLVL>0?PVP_COL[PVPLVL]:'';b.style.boxShadow=PVPLVL>0?'0 0 6px '+PVP_COL[PVPLVL]:'';$('pvpLb').textContent=PVPMODE?'ATK':PVP_NAMES[PVPLVL].slice(0,5);b.title='PvP mode: '+PVP_NAMES[PVPLVL]+' (click to change; P toggles ATK Players Only)'}
  if(pvpPanelEl){
    pvpPanelEl.querySelectorAll('.pm').forEach((e,i)=>e.classList.toggle('sel',i===PVPLVL));
    pvpPanelEl.querySelector('.atk').classList.toggle('on',PVPMODE);
    pvpPanelEl.querySelector('.pi').textContent=PVP_INFO[PVPLVL];
  }
}
function pvpPanelBuild(){
  const el=document.createElement('div');el.id='pvpPanel';
  const h=document.createElement('div');h.className='ph';h.innerHTML='<span class="pic">i</span><span>PvP Mode</span>';el.appendChild(h);
  PVP_NAMES.forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';b.className='pm';b.style.setProperty('--c',PVP_COL[i]);
    b.innerHTML='<i></i><span>'+n+'</span>';b.title=PVP_INFO[i];
    b.addEventListener('click',()=>setPvpLvl(i));el.appendChild(b);
  });
  const pi=document.createElement('div');pi.className='pi';el.appendChild(pi);
  const ak=document.createElement('button');ak.type='button';ak.className='atk';ak.innerHTML='<span>ATK Players Only</span><b class="sw"><u></u></b>';
  ak.title='Monsters are ignored; auto-target and area skills only pick players your mode lets you attack (P key)';
  ak.addEventListener('click',togglePvpMode);el.appendChild(ak);
  ($('hud')||document.body).appendChild(el);pvpPanelEl=el; /* inside #hud so it gets the --u scale */
  document.addEventListener('pointerdown',e=>{if(pvpPanelEl.classList.contains('open')&&!pvpPanelEl.contains(e.target)&&!e.target.closest('#bPvp'))pvpPanelEl.classList.remove('open')},true);
}
function togglePvpPanel(){
  if(!started)return;
  if(!pvpPanelEl)pvpPanelBuild();
  const open=!pvpPanelEl.classList.contains('open');pvpPanelEl.classList.toggle('open',open);
  if(open){pvpUI(true);const bb=$('bPvp').getBoundingClientRect(),w=pvpPanelEl.offsetWidth,h=pvpPanelEl.offsetHeight;let x=clamp(bb.right-w,6,innerWidth-w-6),y=bb.top-h-8;if(y<6)y=Math.min(Math.max(6,innerHeight-h-6),bb.bottom+8);pvpPanelEl.style.left=x+'px';pvpPanelEl.style.top=y+'px'}
}
const pvpOk=q=>MP&&P.dead<=0&&!q.dead&&!inTown()&&!inHubAt(q.x,q.y)&&pvpRule(q);
function foes(){ /* players I may hit right now: needs ATK Players Only, the Arena, or a player I explicitly targeted */
  const a=[];if(!MP||P.dead>0||inTown()||PVPLVL<=0)return a;
  if(!(PVPMODE||curWorld===ARENA||(P.target&&P.target.isPl)))return a;
  for(const q of NET.peers.values())if(pvpOk(q))a.push(q);return a}
function hitPeer(q,dmg,crit){
  if(!pvpOk(q))return 0;
  dmg=Math.max(1,Math.round(dmg*(1+pabVal()/100)));
  netSend({t:'phit',i:q.id,d:dmg,cr:crit?1:0});
  spark(q.x,q.y,crit?'#ffd36b':'#ffb0a0',crit?10:5,160,.3,2.4);if(crit)shake=Math.max(shake,.4);SFX(crit?'crit':'hit');combatPing();
  const est=Math.max(1,Math.round(dmg*PVP_MULT));if(P.lsT>0&&!sigBusy)sigLeech(est);
  return est; /* estimate (drain heal); the real number comes back from the server */
}
function sdp(q,x,fr){
  const c=rnd()<critChance();let d=Math.round(atkVal()*x*(c?critMul():1)*(.9+rnd()*.2));
  if(fr!==undefined)d=Math.round(d*(1-RANGE_FALL*clamp(fr,0,1)));
  return hitPeer(q,d,c);
}
function startPvp(q){
  if(!MP||P.dead>0||!q)return;
  if(inTown()){say('PvP is not allowed inside the safe hub.','#8d9aa2');return}
  if(inHubAt(q.x,q.y)){say(q.name+' is standing in the safe hub.','#8d9aa2');return}
  if(q.dead)return;
  if(!pvpRule(q)){say(pvpWhy(q),'#8d9aa2');return}
  P.target=q;P.task=null;P.mv=null;
}
/* v5_109 SCREEN-SPACE PICKING: in 3D a monster / player is tall and the click lands on its body, not on the ground under its feet. Pick the candidate whose body or feet is nearest
   to the click on the SCREEN, within SCR_PICK css pixels (a generous, finger-sized radius), instead of testing a small circle on the ground. */
const SCR_PICK=PHONE?54:40;
function scrPick(e,list){
  if(!(MODE3D&&T3.r))return null;
  const r=cv.getBoundingClientRect();if(!r.width)return null;
  const k=r.width/VW,cx=e.clientX-r.left,cy=e.clientY-r.top;let best=null,bd=SCR_PICK*SCR_PICK;
  for(const o of list){
    if(dist(o.x,o.y,P.x,P.y)>1600)continue;
    const a=proj3(o.x,o.y,(o.r||20)*1.5),b=proj3(o.x,o.y,6);
    for(const sp of [a,b]){if(!sp)continue;const dx=sp.x*k-cx,dy=sp.y*k-cy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}
  }
  return best;
}
function peerAt(wx,wy,ex){
  let best=null,bd=1e9;
  for(const q of NET.peers.values()){if(q.dead)continue;const d=dist(q.x,q.y,wx,wy);if(d<q.r+60+ex&&d<bd){bd=d;best=q}} /* v5_109 bigger click area */
  return best;
}
function respawn(){
  P.dashT=0;
  P.x=C;P.y=C+110;P.hp=maxHp();P.qi=maxQi();P.dead=0;P.bfT=0;P.sh=0;
}

/* ---------- forge ---------- */
/* success chance: -9% per level down to 30% at +8, then a gradual linear decline to 5% at +75 (floor 5%) */
function forgeChance(lv){
  if(lv<8)return 100-lv*9;
  if(lv>=75)return 5;
  return Math.round((30-(lv-8)*25/67)*10)/10;
}
function forgeCost(lv,armor){
  return {ore:2+lv*2+(armor?1:0),coins:Math.round(40*Math.pow(lv+1,1.4)*(armor?1.2:1)),chance:forgeChance(lv)};
}
function gearDesc(q,o){
  const ks=Object.keys(q.st);
  return RAR[o.r].n+' \u00b7 Grade '+o.g+' \u00b7 now '+statTxt(o.st,o.lv,q)+' \u00b7 forge at +'+FORGE_MAX+': '+ks.map(k=>FLAT_STATS[k]?'+'+fg2(slotFlatPctF(q,k,1)*100)+'% '+STAT_LBL[k].trim():'+'+fg2(q.st[k][1]*FORGE_PCT_REF)+STAT_LBL[k]).join(', ');
}
let frT=0;
function forgePop(ok,nm,lv){ /* big SUCCESS / FAILED popup over the forge window; does not block clicks and fades after ~1.7 s */
  const e=$('forgeRes');if(!e)return;
  e.className=ok?'ok':'bad';e.firstChild.textContent=ok?'SUCCESS':'FAILED';
  e.lastChild.textContent=ok?nm+' tempered to +'+lv:nm+' stays +'+lv+' \u00b7 materials lost';
  e.hidden=false;e.style.animation='none';void e.offsetWidth;e.style.animation='';
  clearTimeout(frT);frT=setTimeout(()=>{e.hidden=true},1700);
}
/* v5_131 Forge window = bag layout: the avatar with the equipped gear around it; tap a piece and its stats + Forge button show on the right. */
let fgSel='wpn';
/* v5_227 ARMOR FIRE TIER = the LOWEST forge tier of ALL gear slots (weapon, secondary weapon, gloves, bracelet, ring, belt, earrings, necklace, robe, legguards, boots).
   tier = floor(forge level / 10), 1..10 (tier 10 = rainbow fire). An empty slot (nothing equipped) counts as tier 0, so every slot must hold a piece at that level.
   The starting weapon / robe count with their core forge level (wlv / alv). src = P (yours) or a peer (its equipment comes from the network, q.eq). */
function armorFireTier(src){
  let m=10;
  for(const s of GEAR){
    let lv=0;
    if(s.core)lv=s.core==='wlv'?src.wlv:src.alv;
    else{const o=src===P?P.gear[s.k]:(src.eq&&src.eq[s.k]);if(o&&o.g>0)lv=o.lv}
    lv|=0;m=Math.min(m,lv>=10?Math.min(10,Math.floor(lv/10)):0);
    if(!m)return 0}
  return m}
const FG_L=['wpn','wpn2','glove','brace','ring','belt'],FG_R=['ear','neck','robe','legs','boot'];
function fgTarget(k){ /* what the forge levels for this slot, or null when the slot is empty */
  const q=GEAR.find(z=>z.k===k),o=P.gear[k];if(!q)return null;
  if(o.g>0)return {k,q,o,nm:gearName(q,o),obj:o,key:'lv',armor:k!=='wpn',r:RAR[o.r].cls||'rare',ic:ICONS[k](RAR[o.r].c),gear:1};
  if(k==='wpn')return {k,q,o,nm:'Blade',title:'Primary Weapon (Blade)',obj:P,key:'wlv',armor:false,r:'epic',ic:ICONS.blade('#e3b559')};
  if(k==='robe')return {k,q,o,nm:'Robe',title:'Robe',obj:P,key:'alv',armor:true,r:'epic',ic:ICONS.robe(skinOf(SKIN).robe)};
  return null;
}
let fgBusy=null; /* {k,t0}: a strike in progress (1 s bar); the result is rolled and the materials are spent when the bar is full */
const FG_TIME=1000;
function fgDo(t){
  if(fgBusy)return;
  const lv=t.obj[t.key];if(lv>=FORGE_MAX)return;
  const c=forgeCost(lv,t.armor);if(P.ore<c.ore||P.coins<c.coins)return;
  fgBusy={k:t.k,t0:performance.now()};renderForge();
  setTimeout(()=>{
    const k=fgBusy&&fgBusy.k;fgBusy=null;
    const t2=k&&fgTarget(k);if(!t2){renderForge();return}
    const lv2=t2.obj[t2.key];if(lv2>=FORGE_MAX){renderForge();return}
    const c2=forgeCost(lv2,t2.armor);if(P.ore<c2.ore||P.coins<c2.coins){renderForge();return}
    P.ore-=c2.ore;P.coins-=c2.coins;
    if(rnd()*100<c2.chance){t2.obj[t2.key]++;say(t2.nm+' tempered to +'+t2.obj[t2.key]+'.','#e3b559');forgePop(true,t2.nm,t2.obj[t2.key])}
    else{say('The strike failed. Materials lost.','#d9503f');forgePop(false,t2.nm,t2.obj[t2.key])}
    P.hp=Math.min(P.hp,maxHp());save();renderForge();
  },FG_TIME);
}
function renderForge(){
  $('fgLv').textContent='Lv. '+P.lvl;
  $('fgCoins').textContent=P.coins.toLocaleString();$('fgOre').textContent=P.ore.toLocaleString();
  const fill=(el,keys)=>{
    el.innerHTML='';
    for(const k of keys){
      const t=fgTarget(k),q=GEAR.find(z=>z.k===k),b=document.createElement('button');b.type='button';
      if(t){
        b.className='bslot '+t.r+(fgSel===k?' sel':'');b.title=t.nm;b.innerHTML=t.ic;
        const l=document.createElement('span');l.className='q';l.textContent='+'+t.obj[t.key];b.appendChild(l);
      }else{
        b.className='bslot empty'+(fgSel===k?' sel':'');b.title=q.n+' (not found)';b.style.cursor='pointer';
        const sl=document.createElement('span');sl.className='sl';sl.textContent=q.ic;b.appendChild(sl);
      }
      b.addEventListener('click',()=>{if(fgBusy)return;fgSel=k;renderForge()});el.appendChild(b);
    }
  };
  fill($('fgEqL'),FG_L);fill($('fgEqR'),FG_R);
  const info=$('fgInfo');info.innerHTML='';
  const add=(cls,html)=>{const d=document.createElement('div');d.className=cls;d.innerHTML=html;info.appendChild(d);return d};
  const t=fgTarget(fgSel);
  if(!GEAR.some(z=>z.k===fgSel)){add('fgs','Tap a piece of gear to see its stats and forge it.')}
  else if(!t){
    const q=GEAR.find(z=>z.k===fgSel);
    add('fgn',q.n);add('fgs','<b>Not found.</b> Random world boss drop \u00b7 '+Object.keys(q.st).map(k=>STAT_LBL[k].replace(/^[% ]+/,'')).join(' &amp; '));
  }else{
    const lv=t.obj[t.key],q=t.q,o=t.o;
    const bar=()=>{if(lv>=FORGE_MAX)return;const busy=fgBusy&&fgBusy.k===t.k,el=busy?Math.min(FG_TIME,performance.now()-fgBusy.t0)/1000:0;
      add('fgbr','<span>+'+lv+'</span><div class="fgbar'+(busy?' go':'')+'"><i style="animation-delay:-'+el.toFixed(3)+'s"></i></div><span>+'+(lv+1)+'</span>')};
    const nmEl=add('fgn',t.title||t.nm);nmEl.style.color=t.gear?RAR[o.r].c:'#e8e0ca';
    if(t.gear){
      add('fgs',RAR[o.r].n+' \u00b7 Grade '+o.g);
      add('fgl','+'+lv+(lv<FORGE_MAX?' \u2192 +'+(lv+1):' MAX'));
      bar();
      add('fgs','<b>Now:</b> '+statTxt(o.st,lv,q));
      if(lv<FORGE_MAX)add('fgs','<b>Next level:</b> '+statTxt(o.st,lv+1,q));
      if(lv<FORGE_MAX){const d=forgeGain(lv);add('fgs','<b>Forge gain:</b> <span class="fgg">'+Object.keys(q.st).map(k=>FLAT_STATS[k]?'+'+fg2(slotFlatPctF(q,k,d)*100)+'% '+STAT_LBL[k].trim():'+'+fg2(d*FORGE_PCT_REF*q.st[k][1])+STAT_LBL[k]).join(', ')+'</span>');if(lv>=10)add('fgs','Higher forge levels give more than lower ones.')}
    }else{
      const lvTxt=add('fgl','+'+lv+(lv<FORGE_MAX?' \u2192 +'+(lv+1):' MAX'));
      bar();
      const now=corePctArr(q,forgeFrac(lv)).join(', ');
      const nxt=corePctArr(q,forgeFrac(lv+1)).join(', ');
      add('fgs','Your starting '+(t.k==='wpn'?'Blade':'Robe')+'. A boss drop can replace it.');
      add('fgs','<b>Now:</b> '+now);if(lv<FORGE_MAX)add('fgs','<b>Next level:</b> '+nxt);
      if(lv<FORGE_MAX){const d=forgeGain(lv);add('fgs','<b>Forge gain:</b> <span class="fgg">'+corePctArr(q,d).join(', ')+'</span>');if(lv>=10)add('fgs','Higher forge levels give more than lower ones.')}
    }
    if(lv<FORGE_MAX){
      const c=forgeCost(lv,t.armor),okO=P.ore>=c.ore,okC=P.coins>=c.coins;
      add('fgc','<span class="'+(okO?'':'no')+'">'+c.ore.toLocaleString()+' ore</span><span class="'+(okC?'':'no')+'">'+c.coins.toLocaleString()+' coins</span><span>'+c.chance+'% success</span>');
      add('fgs','A failed strike burns the materials but keeps your level.');
      const b=document.createElement('button');b.type='button';b.className='btn pri fgb';b.textContent='Forge '+c.chance+'%';
      b.disabled=!!fgBusy||!(okO&&okC);if(fgBusy&&fgBusy.k===t.k)b.textContent='Forging...';b.addEventListener('click',()=>fgDo(t));info.appendChild(b);
    }
  }
  if(!FGV.raf)FGV.raf=requestAnimationFrame(fgPreview);
}
function enterWorld(i){
  if(MP){NET.pendingEnter=i;netSend({t:'world',w:i});$('worlds').hidden=true;return} /* the server answers with the shared world */
  arriveWorld(i);
}
function arriveWorld(i,spawn){
  buildWorld(i,spawn);
  P.x=C;P.y=C+110;P.hp=maxHp();P.qi=maxQi();P.target=null;P.mv=null;P.task=null;P.mine=0;P.pvpT=0;stopMine();
  $('worlds').hidden=true;
  say(i===ARENA?'You enter the Arena. Pick a PvP mode (PvP button) to fight \u2014 Peaceful players cannot attack.':'Entered '+W[i].n+' (monsters Lv '+W[i].lo+'-'+W[i].hi+').',W[i].acc);save();
}
function renderWorlds(){
  const rows=$('worldRows');rows.innerHTML='';
  W.forEach((w,i)=>{
    const row=document.createElement('div');row.className='row';
    const nm=document.createElement('b');nm.textContent='World '+i+' \u00b7 '+w.n;nm.style.color=w.acc;row.appendChild(nm);
    const btn=document.createElement('button');btn.type='button';btn.className='btn'+(i===curWorld?'':' pri');
    btn.textContent=i===curWorld?'You are here':(w.arena?'Enter the arena':P.lvl<w.lo-5?'Enter (dangerous)':'Enter');
    btn.disabled=i===curWorld;
    btn.addEventListener('click',()=>enterWorld(i));row.appendChild(btn);
    const sm=document.createElement('small');sm.textContent=(w.arena?'PvP':'Monsters Lv '+w.lo+'-'+w.hi)+' \u00b7 '+w.blurb+(MP&&NET.counts[i]?' \u00b7 '+NET.counts[i]+' online':'');row.appendChild(sm);
    rows.appendChild(row);
  });
}
function openWorlds(){
  if(!started)return;
  if(!inTown()){say('Return to this world\u2019s hub to use the World Gate.','#8d9aa2');return}
  renderWorlds();$('worlds').hidden=false;
}
$('worldClose').addEventListener('click',()=>{$('worlds').hidden=true});
$('bWorld').addEventListener('click',openWorlds);
function openForge(){
  if(!started)return;
  if(!inTown()){say('Return to the Lotus Sanctum to use the forge.','#8d9aa2');return}
  if(!fgTarget(fgSel))fgSel='wpn';renderForge();$('forgeRes').hidden=true;$('forge').hidden=false;
}
$('forgeClose').addEventListener('click',()=>{$('forge').hidden=true;$('forgeRes').hidden=true});
/* tapping the dark area outside the window also closes it */
$('forge').addEventListener('click',e=>{if(e.target===$('forge')){$('forge').hidden=true;$('forgeRes').hidden=true}});
$('worlds').addEventListener('click',e=>{if(e.target===$('worlds'))$('worlds').hidden=true});

/* ---------- bag, potions and the Potion Merchant ---------- */
const POTS={hp:{n:'Health Potion',c:'#ff8a80',d:'Restores 5% of your max HP (5 s cooldown)'},qi:{n:'Mana Potion',c:'#8fd0ff',d:'Restores 10% of your max mana'},tp:{n:'Home Scroll',c:'#d2b4ff',d:'Teleports you to your hub after a 3s channel (moving or taking damage cancels it)'},ck:{n:'Fried Chicken',c:'#f0b25a',d:'Instantly restores 50% of your max HP (60 s cooldown). Made by frying a Chicken pet in the bag'}};
const POT_SH={hp:'HP potion',qi:'MP potion',tp:'Home Scroll',ck:'Fried Chicken'};
const TP_DROP=.03,TP_CHANNEL=3,TP_CD=10,tpPrice=()=>Math.max(50,Math.round(P.lvl*8)),priceOf=k=>k==='tp'?tpPrice():potPrice();
const MP_POT_PCT=.1; /* v5_139 Mana Potion restores 10% of max Qi (v5_138: 5%, originally 40%) */
const CK_PCT=.5,CK_CD=60; /* Fried Chicken: instant 50% max HP, own 60 s cooldown (separate from the HP potion's 5 s). Made from a Chicken pet (fryChicken in 03_pets.js) */
const HP_POT_PCT=.05,POT_CD=5; /* v5_72: Health Potion heals 5% of max HP (was 35%), shared 5 s cooldown */
const POT_MAX=9999,POT_DROP=.1,potPrice=()=>Math.max(10,Math.round(P.lvl*4));
const NPC={x:C-165,y:C-105}; /* behind the pagoda (hub is 1.5x) */
/* loot feed: small icon chips above the joystick (same item within 4s stacks) */
const lootChips=new Map();
function lootIcon(key,icon,n,col){
  const box=$('loot');if(!box)return;
  let c=lootChips.get(key);
  if(c){c.n+=n;c.el.lastChild.textContent='+'+c.n.toLocaleString();clearTimeout(c.tm)}
  else{
    const el=document.createElement('div');el.className='lc';el.style.borderColor=col;
    el.innerHTML='<b style="color:'+col+'">'+icon+'</b><span></span>';el.lastChild.textContent='+'+n.toLocaleString();
    box.appendChild(el);c={el,n,tm:0};lootChips.set(key,c);
    while(box.children.length>6){const f=box.firstChild;for(const [k,v] of lootChips)if(v.el===f){lootChips.delete(k);clearTimeout(v.tm)}f.remove()}
  }
  c.tm=setTimeout(()=>{c.el.remove();if(lootChips.get(key)===c)lootChips.delete(key)},4000);
}
function bagLog(t,c){P.recent.unshift({t,c});if(P.recent.length>20)P.recent.pop();saveSoon();if(!$('bag').hidden)renderBag()}
function addPot(k,n){if(n<=0)return;lootIcon('p'+k,k==='tp'?'&#10162;':'&#9879;',n,POTS[k].c);P.pots[k]=Math.min(POT_MAX,P.pots[k]+n);pop(P.x-14,P.y-58,'+'+n+' '+POT_SH[k],POTS[k].c,12);bagLog('+'+n+' '+POTS[k].n+(n>1?'s':''),POTS[k].c)}
/* ---------- dodge: quick dash with a brief invulnerable window, aimed by dragging the small pad ---------- */
const DASH_DIST=210,DASH_T=.34,DASH_CD=1.6,DODGE_INV=.35; /* v5_142 DASH_T .2 -> .34 s and the dash now eases out (fast launch, soft landing) with a ghost trail, so it no longer looks like a blink */ /* v5_78: DODGE_INV = invulnerability time, and for that time you cannot cast skills or basic attack */
function doDodge(dx,dy){
  if(!started||P.dead>0||P.dcd>0)return;
  P.cast=0; /* dodging cancels a cast */
  let l=Math.hypot(dx,dy);
  if(l<.01){dx=Math.cos(P.face);dy=Math.sin(P.face);l=1}
  P.dvx=dx/l;P.dvy=dy/l;P.dashT=DASH_T;P.dcd=DASH_CD;P.inv=Math.max(P.inv>0?P.inv:0,DODGE_INV);P.skLock=Math.max(P.skLock||0,DODGE_INV);P.atkCd=Math.max(P.atkCd||0,DODGE_INV);
  P.face=Math.atan2(P.dvy,P.dvx);P.mv=null;P.task=null;P.mine=0;
  ring(P.x,P.y,48,'#bfe9ff');ring(P.x,P.y,80,'#ffffff');
  spark(P.x,P.y,'#e8f6ff',14,150,.45,3.4);spark(P.x,P.y,'#9fd8ff',10,90,.55,4.2); /* v5_142 launch burst */
}
const dashEase=u=>1-Math.pow(1-Math.min(1,Math.max(0,u)),3);
/* v5_99 ROTATABLE / TILTABLE CAMERA (3D mode). yaw rotates the view around the player, tilt is the camera pitch (radians above the ground; below CAM_TILT_MIN the camera looks up at the sky, v5_174).
   Controls: hold RIGHT or MIDDLE mouse and drag (left/right = rotate, up/down = tilt), or [ and ] to rotate, PageUp / PageDown to tilt, Home to reset;
   phone: drag with TWO fingers (sideways = rotate, up/down = tilt, pinch = zoom). Movement, joystick, dodge and the hub arrow follow the view. */
const CAM_TILT0=Math.atan2(380,320),CAM_TILT_MIN=.3, /* v5_105 wider tilt range (about 17 to 87 degrees) */ CAM_TILT_MAX=1.52,
  CAM_LOOK_MAX=1.0, CAM_TILT_LOW=CAM_TILT_MIN-CAM_LOOK_MAX; /* v5_174 LOOK UP: tilt keeps going below CAM_TILT_MIN; the camera then stays at its lowest orbit and pitches up by the difference (up to 1.0 rad = 57 degrees) to show the sky */
const camView={yaw:0,tilt:CAM_TILT0};
function camRot(ix,iy){if(!MODE3D||!camView.yaw)return [ix,iy];const c=Math.cos(camView.yaw),sn=Math.sin(camView.yaw);return [ix*c+iy*sn,-ix*sn+iy*c]} /* screen direction -> world direction */
function camUnrot(wx,wy){if(!MODE3D||!camView.yaw)return [wx,wy];const c=Math.cos(camView.yaw),sn=Math.sin(camView.yaw);return [wx*c-wy*sn,wx*sn+wy*c]} /* world direction -> screen direction */
function camAdj(dyaw,dtilt){camView.yaw=(camView.yaw+dyaw)%(Math.PI*2);camView.tilt=clamp(camView.tilt+dtilt,CAM_TILT_LOW,CAM_TILT_MAX)}
/* true while you are steering (keys / joystick): auto skills do not cast while it is true (v5_153). v5_154: a move input no longer cancels the cast pose */
function wantsMove(){const ix=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0)+joy.x,iy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0)+joy.y;return Math.abs(ix)>.12||Math.abs(iy)>.12}
function moveDir(){const ix=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0)+joy.x,iy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0)+joy.y;return Math.hypot(ix,iy)>.3?camRot(ix,iy):[0,0]}
const jumpEl=$('jump');jumpEl.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doJump()});jumpEl.addEventListener('contextmenu',e=>e.preventDefault());
const dodgeEl=$('dodge'),dodgeKnob=dodgeEl.querySelector('i'),dg={id:null,x:0,y:0};
function dgMove(e){
  const r=dodgeEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy),m=Math.max(1,l/(R*.6));
  dg.x=l>R*.2?(e.clientX-cx)/l:0;dg.y=l>R*.2?(e.clientY-cy)/l:0;
  dodgeKnob.style.transform='translate('+(dx/m)+'px,'+(dy/m)+'px)';
}
dodgeEl.addEventListener('pointerdown',e=>{e.preventDefault();dg.id=e.pointerId;dodgeEl.setPointerCapture(e.pointerId);dgMove(e)});
dodgeEl.addEventListener('pointermove',e=>{if(e.pointerId===dg.id)dgMove(e)});
function dgEnd(e){
  if(e.pointerId!==dg.id)return;dg.id=null;dodgeKnob.style.transform='';
  if(e.type==='pointercancel')return;
  if(dg.x||dg.y)doDodge(...camRot(dg.x,dg.y));else{const [mx,my]=moveDir();doDodge(mx,my)}
  dg.x=dg.y=0;
}
dodgeEl.addEventListener('pointerup',dgEnd);dodgeEl.addEventListener('pointercancel',dgEnd);
addEventListener('keydown',e=>{if(e.key==='Shift'&&!e.repeat&&started&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){const [mx,my]=moveDir();doDodge(mx,my)}});
function cancelTp(why){if(P.tp>0){P.tp=0;if(why)say(why,'#d9503f')}}
function useTp(){
  if(!started||P.dead>0)return;
  if(P.tp>0)return;
  if(pot.tp>0){say('Home Scroll is recharging ('+Math.ceil(pot.tp)+'s).','#8d9aa2');return}
  if(P.pots.tp<=0){say('No Home Scrolls left. Buy some from the Potion Merchant (N in your hub).','#8d9aa2');return}
  if(inTown()){say('You are already in the hub.','#8d9aa2');return}
  P.tp=TP_CHANNEL;P.tpx=P.x;P.tpy=P.y;P.target=null;P.task=null;P.mine=0;
  say('Teleporting home in '+TP_CHANNEL+'s… stay still.','#d2b4ff');
}
let tpAcc=0,tpRing=0;
/* channel animation: violet motes spiral in and rise around you, a ring pulses out every half second, both get faster as the channel ends */
function tpFx(dt){
  const pr=1-Math.max(0,P.tp)/TP_CHANNEL;
  tpAcc+=dt*(40+pr*70);
  while(tpAcc>=1&&parts.length<520){
    tpAcc--;const a=rnd()*6.2832,r=44-pr*14;
    parts.push({x:P.x+Math.cos(a)*r,y:P.y+Math.sin(a)*r*.7+10,vx:-Math.sin(a)*70-Math.cos(a)*40,vy:Math.cos(a)*45-Math.sin(a)*28-150-pr*90,life:.55+rnd()*.35,max:.9,col:rnd()<.35?'#ffffff':(rnd()<.5?'#d2b4ff':'#9a6bff'),size:1.6+rnd()*2.2});
  }
  tpRing-=dt;if(tpRing<=0){tpRing=.5-pr*.25;ring(P.x,P.y,54,'#b794f4');}
  shake=Math.max(shake,pr*.08);
}
function finishTp(){
  P.tp=0;if(P.pots.tp<=0)return;
  P.pots.tp--;pot.tp=TP_CD;
  spark(P.x,P.y,'#ffffff',30,260,.9,3.4,120);ring(P.x,P.y,90,'#ffffff');ring(P.x,P.y,60,'#b794f4');
  P.x=C;P.y=C+110;P.target=null;P.mv=null;P.task=null;P.mine=0;stopMine();
  if(auto){auto=false;$('bAuto').classList.remove('on');say('Auto-hunt turned off after teleporting.','#8d9aa2')}
  spark(P.x,P.y,'#ffffff',30,260,1,3.4,120);spark(P.x,P.y,'#9a6bff',24,180,1,3,90);ring(P.x,P.y,100,'#ffffff');ring(P.x,P.y,70,'#b794f4');shake=Math.max(shake,.25);pop(P.x,P.y-40,'Home','#d2b4ff',16);
  bagLog('Used a Home Scroll','#d2b4ff');save();if(!$('bag').hidden)renderBag();
}
function usePot(k,auto){
  if(k==='tp'){useTp();return}
  if(!started||P.dead>0||pot[k]>0)return;
  if(P.pots[k]<=0){if(!auto)say(k==='ck'?'No Fried Chicken. Fry a Chicken pet in your bag (Bag > Chicken > Fry).':'No '+POTS[k].n+'s left. Buy some from the Potion Merchant (N in your hub).','#8d9aa2');return}
  if(k==='ck'){if(P.hp>=maxHp()){say('HP is already full.','#8d9aa2');return}const h=healP(Math.round(maxHp()*CK_PCT));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#f0b25a',17);spark(P.x,P.y,'#f0b25a',16,90,.9,2.8,60);ring(P.x,P.y,60,'#f0b25a')}
  else if(k==='hp'){if(P.hp>=maxHp())return;const h=healP(Math.round(maxHp()*HP_POT_PCT));P.hp=Math.min(maxHp(),P.hp+h);pop(P.x,P.y-30,'+'+h,'#ff8a80',15);spark(P.x,P.y,'#ff9a8a',10,70,.8,2.6,50)}
  else{if(P.qi>=maxQi())return;const q=Math.round(maxQi()*MP_POT_PCT);P.qi=Math.min(maxQi(),P.qi+q);pop(P.x,P.y-30,'+'+q+' MP','#8fd0ff',14);spark(P.x,P.y,'#8fd0ff',10,70,.8,2.6,50)}
  P.pots[k]--;pot[k]=k==='ck'?CK_CD:POT_CD;SFX('potion');save();if(!$('bag').hidden)renderBag();
}
function autoPot(){if(!P.autoPot||!started||P.dead>0)return;if(P.hp<maxHp()*(P.apHp||35)/100)usePot('hp',true);if(P.qi<maxQi()*(P.apQi||20)/100)usePot('qi',true)}
function bagRow(label,val,col){const d=document.createElement('div');d.className='row';const b=document.createElement('b');b.textContent=label;if(col)b.style.color=col;const v=document.createElement('span');v.textContent=val;d.appendChild(b);d.appendChild(v);return d}
/* bag: Mir4-style slot grid. Slot colour = rarity, bottom-right = amount, orange ribbon = gained since you last closed the bag */
let bagSel=null,bagSeen=null,bagConfirm=null,bagMulti=false,bagPick=new Set();
const fmtQ=n=>n>=1e7?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n.toLocaleString();
const svgW=(inner,c)=>'<svg viewBox="0 0 64 64">'+inner.replace(/\{c\}/g,c||'#fff')+'</svg>';
function flaskSvg(a,b){const id='fg'+a.slice(1);return '<svg viewBox="0 0 64 64"><defs><radialGradient id="'+id+'" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></radialGradient></defs><rect x="28" y="5" width="8" height="8" rx="2" fill="#8a5a2b"/><rect x="25" y="12" width="14" height="5" rx="2" fill="#d9a441"/><rect x="26" y="16" width="12" height="12" fill="#cfe3f0" fill-opacity=".55"/><ellipse cx="32" cy="43" rx="21" ry="17" fill="url(#'+id+')" stroke="#d9a441" stroke-width="2"/><ellipse cx="24" cy="36" rx="6" ry="3.5" fill="#fff" fill-opacity=".4" transform="rotate(-25 24 36)"/></svg>'}
const ICONS={
  hp:()=>flaskSvg('#ff5a5a','#7a0b12'),qi:()=>flaskSvg('#4aa0ff','#12348a'),
  tp:()=>svgW('<rect x="14" y="8" width="36" height="48" rx="4" fill="#f1e4c3" stroke="#8a5a2b" stroke-width="2"/><rect x="10" y="5" width="44" height="7" rx="3" fill="#b3302c"/><rect x="10" y="52" width="44" height="7" rx="3" fill="#b3302c"/><path d="M32 20l10 8h-4v12H26V28h-4z" fill="#7a4fd0"/><circle cx="32" cy="46" r="3" fill="#7a4fd0"/>'),
  ck:()=>svgW('<ellipse cx="26" cy="34" rx="20" ry="17" transform="rotate(-35 26 34)" fill="#c9772b" stroke="#6b3410" stroke-width="2"/><ellipse cx="22" cy="28" rx="9" ry="5" transform="rotate(-35 22 28)" fill="#f0b25a" fill-opacity=".7"/><path d="M38 40 L50 52" stroke="#f1e4c3" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="50" r="5" fill="#f1e4c3" stroke="#8a8a7a" stroke-width="1.5"/><circle cx="53" cy="55" r="5" fill="#f1e4c3" stroke="#8a8a7a" stroke-width="1.5"/>'),
  coin:()=>svgW('<g fill="#e3b559" stroke="#7a5a10" stroke-width="2"><ellipse cx="32" cy="46" rx="20" ry="8"/><rect x="12" y="38" width="40" height="8" stroke="none"/><ellipse cx="32" cy="38" rx="20" ry="8"/><rect x="12" y="30" width="40" height="8" stroke="none"/><ellipse cx="32" cy="30" rx="20" ry="8" fill="#f6d27a"/></g>'),
  ore:()=>svgW('<polygon points="32,6 44,26 38,56 24,56 18,26" fill="#4fc3d9"/><polygon points="32,6 44,26 32,30" fill="#a8f0ff"/><polygon points="32,30 44,26 38,56" fill="#2a8aa0"/><polygon points="12,34 20,30 24,56 8,56" fill="#3aa8bf"/><polygon points="52,38 58,56 42,56" fill="#2a8aa0"/>'),
  ear:c=>svgW('<circle cx="32" cy="16" r="7" fill="none" stroke="{c}" stroke-width="4"/><path d="M32 26 L41 44 L32 58 L23 44Z" fill="{c}" stroke="#fff" stroke-width="1.5"/>',c),
  ring:c=>svgW('<ellipse cx="32" cy="42" rx="18" ry="15" fill="none" stroke="{c}" stroke-width="6"/><polygon points="32,6 43,17 32,28 21,17" fill="#ff6a6a" stroke="#fff" stroke-width="1.5"/>',c),
  neck:c=>svgW('<path d="M10 8 Q32 58 54 8" fill="none" stroke="{c}" stroke-width="4"/><circle cx="32" cy="46" r="9" fill="{c}" stroke="#fff" stroke-width="1.5"/>',c),
  glove:c=>svgW('<path d="M18 58V34l-6-10 5-3 6 8V10h5v22V8h5v24V12h5v22V18h5v24l-5 16z" fill="{c}" stroke="#222" stroke-width="1.5"/>',c),
  legs:c=>svgW('<path d="M16 6h32l4 24-8 28H34l-2-26-2 26H20l-8-28z" fill="{c}" stroke="#222" stroke-width="2"/><rect x="16" y="6" width="32" height="7" fill="#e3b559" stroke="#222" stroke-width="1.5"/><circle cx="23" cy="34" r="4" fill="#fff" opacity=".55"/><circle cx="41" cy="34" r="4" fill="#fff" opacity=".55"/>',c),
  brace:c=>svgW('<ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="{c}" stroke-width="8"/><ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="#222" stroke-width="1.5"/><polygon points="32,6 41,15 32,24 23,15" fill="#7fe8ff" stroke="#fff" stroke-width="1.5"/>',c),
  belt:c=>svgW('<rect x="4" y="22" width="56" height="18" rx="3" fill="{c}" stroke="#222" stroke-width="2"/><rect x="24" y="18" width="16" height="26" rx="3" fill="#e3b559" stroke="#222" stroke-width="2"/><rect x="29" y="25" width="6" height="12" fill="#222"/><path d="M40 40l6 18h-8z" fill="{c}" stroke="#222" stroke-width="1.5"/>',c),
  boot:c=>svgW('<path d="M22 6h18v26l16 9v17H12V40l10-4z" fill="{c}" stroke="#222" stroke-width="2"/>',c),
  wpn:c=>ICONS.blade(c),
  wpn2:c=>svgW('<path d="M32 4l5 6-3 26H30L27 10z" fill="#dfe8f0" stroke="#6b7a88" stroke-width="1.5"/><path d="M20 38h24l-3 6H23z" fill="{c}" stroke="#222" stroke-width="1.5"/><rect x="29" y="44" width="6" height="14" fill="#6b4a2a"/><circle cx="32" cy="60" r="3" fill="{c}"/>',c),
  blade:c=>svgW('<path d="M32 3l6 7v31H26V10z" fill="#dfe8f0" stroke="#6b7a88" stroke-width="1.5"/><rect x="19" y="41" width="26" height="6" rx="2" fill="{c}"/><rect x="29" y="47" width="6" height="13" fill="#6b4a2a"/>',c),
  robe:c=>svgW('<path d="M22 6h20l11 14-9 6v32H20V26l-9-6z" fill="{c}" stroke="#e3b559" stroke-width="2"/>',c)
};
function bagItems(){
  const a=[];
  if(P.coins>0)a.push({id:'coins',n:'Coins',v:P.coins,t:fmtQ(P.coins),r:'leg',ic:ICONS.coin(),d:'Spend them at the Potion Merchant.'});
  if(P.ore>0)a.push({id:'ore',n:'Darksteel Ore',v:P.ore,t:fmtQ(P.ore),r:'leg',ic:ICONS.ore(),d:'Temper your gear at the Lotus Forge (O in a hub).'});
  for(const k of ['hp','ck','qi','tp'])if(P.pots[k]>0)a.push({id:k,n:POTS[k].n,v:P.pots[k],t:fmtQ(P.pots[k]),r:k==='hp'||k==='ck'?'epic':(k==='tp'?'leg':''),ic:ICONS[k](),d:POTS[k].d+'.',pot:k});
  if(P.wlv>0&&P.gear.wpn.g===0)a.push({id:'blade',n:'Primary Weapon (Blade)',v:P.wlv,t:'+'+P.wlv,r:'epic',eq:1,ic:ICONS.blade('#e3b559'),d:'Your starting Blade, forge level +'+P.wlv+'. A boss-dropped Primary Weapon can replace it. Temper it at the Lotus Forge.'});
  if(P.alv>0&&P.gear.robe.g===0)a.push({id:'robe',n:'Robe',v:P.alv,t:'+'+P.alv,r:'epic',eq:1,ic:ICONS.robe(skinOf(SKIN).robe),d:'Your starting Robe, forge level +'+P.alv+'. A boss-dropped Robe can replace it. Temper it at the Lotus Forge.'});
  for(const q of GEAR){const o=P.gear[q.k];if(o.g>0)a.push({id:'g_'+q.k,n:gearName(q,o),v:o.r*1e6+Math.round(gearScore(o)*100)+o.lv,t:'+'+o.lv,r:RAR[o.r].cls||'rare',eq:1,ic:ICONS[q.k](RAR[o.r].c),d:gearDesc(q,o)})}
  for(const it of bagArr()){const q=GEAR.find(z=>z.k===it.slot);a.push({id:'s_'+it.u,n:gearName(q,it),v:1,t:'G'+it.g,r:RAR[it.r].cls||'rare',ic:ICONS[q.k](RAR[it.r].c),d:statTxt(it.st,0,null)+'. Sells for '+oreOf(it)+' ore.',stored:it})}
  return petBagItems(a);
}
function sellStored(u){const A=bagArr(),i=A.findIndex(x=>x.u===u);if(i<0)return;const it=A[i],q=GEAR.find(z=>z.k===it.slot),ore=oreOf(it);A.splice(i,1);P.ore+=ore;bagLog('Sold '+gearName(q,it)+' \u2192 '+ore+' ore','#7fe0ee');bagSel=null;bagConfirm=null;save();renderBag()}
function sellMany(){const A=bagArr();let n=0,ore=0;
  for(let i=A.length-1;i>=0;i--){const it=A[i];if(bagPick.has(it.u)){ore+=oreOf(it);n++;A.splice(i,1)}}
  if(n){P.ore+=ore;bagLog('Sold '+n+' piece'+(n>1?'s':'')+' \u2192 '+ore.toLocaleString()+' ore','#7fe0ee');say('Sold '+n+' piece'+(n>1?'s':'')+' for '+ore.toLocaleString()+' ore.','#7fe0ee',5000);save()}
  bagPick.clear();bagConfirm=null;bagSel=null;renderBag()}
function equipStored(u){const A=bagArr(),i=A.findIndex(x=>x.u===u);if(i<0)return;const it=A[i],o=P.gear[it.slot];
  const q=GEAR.find(z=>z.k===it.slot),oldName=o.g>0?gearName(q,o):'';
  if(o.g>0)A[i]={slot:it.slot,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:it.u};else A.splice(i,1);
  o.g=it.g;o.r=it.r;o.st=it.st;bagSel=o.g>0&&oldName?'s_'+it.u:null;bagConfirm=null;
  say('Equipped '+gearName(q,it)+(oldName?'. '+oldName+' is in your bag (selected). Tap Equip to wear it again.':'.'),it.col,7000);bagLog('Equipped '+gearName(q,it)+(oldName?'; '+oldName+' \u2192 bag':''),it.col);
  save();renderBag();if(!$('forge').hidden)renderForge()}
/* v5_76 Unequip: the worn piece goes back to the bag (selected), the slot keeps its forge level. A weapon / robe slot falls back to the plain Blade / Robe.
   Wearing a piece never changes the bag count (it moves from 'worn' to 'bag'), so there is always room. */
function unequipGear(k){
  const q=GEAR.find(z=>z.k===k),o=q&&P.gear[k];if(!o||o.g<=0)return;
  const nm=gearName(q,o),it={slot:k,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:bagUid++};
  bagArr().push(it);o.g=0;o.r=0;o.st={};
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());
  bagSel='s_'+it.u;bagConfirm=null;
  say('Unequipped '+nm+'. It is in your bag (selected).',it.col,5000);bagLog('Unequipped '+nm,it.col);
  save();renderBag();if(!$('forge').hidden)renderForge();
}
/* Auto-equip best: for every gear slot, wear the bag piece with the highest stat score (the same score the game already uses for drops);
   a tie goes to the higher grade. The piece you were wearing goes to the bag. Forge level stays with the slot, so it is not part of the comparison. */
function autoEquipBest(){
  const A=bagArr(),done=[];
  for(const q of GEAR){
    const o=P.gear[q.k];let bi=-1,bs=o.g>0?gearScore(o):-1,bg=o.g>0?o.g:0;
    for(let i=0;i<A.length;i++){const it=A[i];if(it.slot!==q.k)continue;const sc=gearScore(it);
      if(sc>bs+1e-9||(Math.abs(sc-bs)<=1e-9&&it.g>bg)){bi=i;bs=sc;bg=it.g}}
    if(bi<0)continue;
    const it=A[bi],had=o.g>0;
    if(had)A[bi]={slot:q.k,g:o.g,r:o.r,st:o.st,col:RAR[o.r].c,u:it.u};else A.splice(bi,1);
    o.g=it.g;o.r=it.r;o.st=it.st;done.push(gearName(q,it));
  }
  bagSel=null;bagConfirm=null;
  if(done.length){say('Auto-equipped: '+done.join(', ')+'.','#e3b559',7000);bagLog('Auto-equipped '+done.length+' piece'+(done.length>1?'s':''),'#e3b559');save()}
  else say('You are already wearing your best gear.','#8d9aa2',4000);
  renderBag();if(!$('forge').hidden)renderForge();
}
function snapSeen(){bagSeen={};for(const it of bagItems())bagSeen[it.id]=it.v}
function renderBag(){
  petCombValidate();const items=bagItems(),total=BAG_CAP;
  if(!bagSeen)snapSeen();
  if(bagSel&&!items.some(i=>i.id===bagSel))bagSel=null;
  $('bagCnt').textContent=items.length+' / '+BAG_CAP;
  $('bagLv').textContent='Lv. '+P.lvl;
  const pick=it=>{
    if(petComb&&!bagMulti&&petCombTap(it))return;
    if(bagMulti){if(!it.stored){say('Only spare gear in your bag can be sold.','#8d9aa2',2500);return}const u=it.stored.u;bagPick.has(u)?bagPick.delete(u):bagPick.add(u);bagConfirm=null;renderBag();return}
    if(bagSel!==it.id)bagConfirm=null;bagSel=it.id;renderBag()};
  const mkSlot=it=>{
    const b=document.createElement('button');b.type='button';
    b.className='bslot '+it.r+(bagMulti?(it.stored&&bagPick.has(it.stored.u)?' msel':''):(bagSel===it.id?' sel':'')+(petComb&&it.pet&&petComb.b===it.pet.key?' msel':''));b.title=it.n;b.innerHTML=it.ic;
    if(!it.eq&&it.v>(bagSeen[it.id]||0)){const ad=document.createElement('span');ad.className='ad';ad.textContent='NEW';b.appendChild(ad)}
    if(it.pet&&P.pet===it.pet.key){const ad=document.createElement('span');ad.className='eqr';ad.textContent='OUT';b.appendChild(ad)}
    const q=document.createElement('span');q.className='q';q.textContent=it.t;b.appendChild(q);
    b.addEventListener('click',()=>pick(it));return b};
  /* equipped gear around the avatar: left and right columns */
  const SIDE_L=['wpn','wpn2','glove','brace','ring','belt'],SIDE_R=['ear','neck','robe','legs','boot'];
  const fillSide=(el,keys)=>{
    el.innerHTML='';
    for(const k of keys){
      const q=GEAR.find(z=>z.k===k),o=P.gear[k];
      const id=o.g>0?'g_'+k:(k==='wpn'?'blade':k==='robe'?'robe':null);
      const it=id&&items.find(x=>x.id===id);
      if(it){el.appendChild(mkSlot(it));continue}
      const b=document.createElement('div');b.className='bslot empty';b.title=q.n+' (empty)';
      const sl=document.createElement('span');sl.className='sl';sl.textContent=q.ic;b.appendChild(sl);el.appendChild(b);
    }
  };
  fillSide($('bagEqL'),SIDE_L);fillSide($('bagEqR'),SIDE_R);
  /* spare items (not equipped) on the right */
  const g=$('bagItems');g.innerHTML='';
  const spare=items.filter(i=>!i.eq),eqN=items.length-spare.length,slots=Math.max(spare.length,BAG_CAP-eqN);
  for(let i=0;i<slots;i++){
    const it=spare[i];
    if(!it){const b=document.createElement('button');b.type='button';b.className='bslot empty';b.disabled=true;g.appendChild(b);continue}
    g.appendChild(mkSlot(it));
  }
  if(!BAGV.raf)BAGV.raf=requestAnimationFrame(bagPreview);
  const info=$('bagInfo');info.innerHTML='';
  const sel=items.find(i=>i.id===bagSel);
  $('bagMulti').classList.toggle('on',bagMulti);$('bagMulti').textContent=bagMulti?'Done selecting':'Sell multiple';
  if(petComb&&!bagMulti)petCombPanel(info);else
  if(bagMulti){
    const A=bagArr();for(const u of [...bagPick])if(!A.some(x=>x.u===u))bagPick.delete(u);
    let ore=0;for(const it of A)if(bagPick.has(it.u))ore+=oreOf(it);const n=bagPick.size;
    const d=document.createElement('div'),sm=document.createElement('small');
    sm.textContent=bagConfirm==='multi'?'Sell '+n+' piece'+(n>1?'s':'')+'? You get +'+ore.toLocaleString()+' ore ('+P.ore.toLocaleString()+' \u2192 '+(P.ore+ore).toLocaleString()+'). This cannot be undone.'
      :(n?n+' selected \u00b7 '+ore.toLocaleString()+' ore':'Tap spare gear to tick it. Equipped gear and potions cannot be selected.');
    d.appendChild(sm);info.appendChild(d);
    const w=document.createElement('div');w.className='bagact wrap';
    const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
    if(bagConfirm==='multi'){mk('Confirm sell','pri',sellMany);mk('Cancel','',()=>{bagConfirm=null;renderBag()})}
    else{mk('Select all','',()=>{for(const it of A)bagPick.add(it.u);renderBag()},!A.length);mk('Clear','',()=>{bagPick.clear();renderBag()},!n);mk('Sell selected ('+n+')','pri',()=>{bagConfirm='multi';renderBag()},!n)}
    info.appendChild(w);
  }else
  if(!sel){const e=document.createElement('span');e.style.color='#8d9aa2';e.textContent='Tap an item to see what it does.';info.appendChild(e)}
  else{
    const d=document.createElement('div'),nm=document.createElement('b');nm.textContent=sel.n+(sel.pot?' \u00d7 '+sel.v:'');
    nm.style.color=sel.pot?POTS[sel.pot].c:'#e8e0ca';d.appendChild(nm);
    const sm=document.createElement('small');sm.textContent=sel.d;d.appendChild(sm);info.appendChild(d);
    if(sel.stored){const u=sel.stored.u,w=document.createElement('div');w.className='bagact';
      if(bagConfirm===u){
        const it=sel.stored,q=GEAR.find(z=>z.k===it.slot),o=P.gear[it.slot];
        sm.innerHTML='';sm.appendChild(document.createTextNode('Sell '+sel.n+' (grade '+it.g+', '+RAR[it.r].n+')? You get +'+oreOf(it)+' ore ('+P.ore.toLocaleString()+' \u2192 '+(P.ore+oreOf(it)).toLocaleString()+'). This cannot be undone.'));
        const c=document.createElement('button'),x=document.createElement('button');c.type=x.type='button';
        c.className='btn pri';c.textContent='Confirm sell';c.addEventListener('click',()=>sellStored(u));
        x.className='btn';x.textContent='Cancel';x.addEventListener('click',()=>{bagConfirm=null;renderBag()});
        w.appendChild(c);w.appendChild(x);
      }else{
        const e=document.createElement('button'),b=document.createElement('button');e.type=b.type='button';
        e.className='btn';e.textContent='Equip';e.addEventListener('click',()=>equipStored(u));
        b.className='btn pri';b.textContent='Sell to ore';b.addEventListener('click',()=>{bagConfirm=u;renderBag()});
        w.appendChild(e);w.appendChild(b);
      }
      info.appendChild(w)}
    if(sel.eq&&sel.id.slice(0,2)==='g_'){const k=sel.id.slice(2),w=document.createElement('div'),b=document.createElement('button');w.className='bagact';b.type='button';b.className='btn';b.textContent='Unequip';b.addEventListener('click',()=>unequipGear(k));w.appendChild(b);info.appendChild(w)}
    if(sel.egg||sel.pet)petBagActions(sel,info);
    if(sel.pot){const k=sel.pot,b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent=pot[k]>0?Math.ceil(pot[k])+'s':(k==='tp'&&P.tp>0?'...':'Use');b.disabled=pot[k]>0;b.addEventListener('click',()=>{usePot(k);renderBag()});info.appendChild(b)}
  }
}
/* ---------- Warehouse: private storage in the hub (100 slots, spare gear only; saved with your character) ---------- */
let whSel=null;
function openWh(){
  if(!started)return;
  if(!inTown()){say('Return to your hub to use the Warehouse.','#8d9aa2');return}
  whSel=null;renderWh();$('wh').hidden=false;
}
function closeWh(){$('wh').hidden=true;whSel=null}
function whMove(u,toWh){
  const A=bagArr(),W=whArr(),src=toWh?A:W,dst=toWh?W:A,i=src.findIndex(x=>x.u===u);if(i<0)return;
  if(toWh&&W.length>=WH_CAP){say('The Warehouse is full ('+WH_CAP+').','#8d9aa2');return}
  if(!toWh&&bagCount()>=BAG_CAP){say('Your bag is full.','#8d9aa2');return}
  dst.push(src.splice(i,1)[0]);whSel=null;save();renderWh();if(!$('bag').hidden)renderBag();
}
function whStoreAll(){
  const A=bagArr(),W=whArr();let n=0;
  while(A.length&&W.length<WH_CAP){W.push(A.shift());n++}
  if(n)say('Stored '+n+' piece'+(n>1?'s':'')+' in the Warehouse.','#e3b559',4000);
  else say(A.length?'The Warehouse is full.':'No spare gear in your bag.','#8d9aa2',3000);
  whSel=null;save();renderWh();if(!$('bag').hidden)renderBag();
}
function renderWh(){
  const W=whArr(),A=bagArr();
  if(whSel&&!W.some(x=>x.u===whSel)&&!A.some(x=>x.u===whSel))whSel=null;
  $('whCnt').textContent=W.length+' / '+WH_CAP;$('whBagCnt').textContent=bagCount()+' / '+BAG_CAP+' slots';
  const fill=(el,arr,min)=>{
    el.innerHTML='';
    for(let i=0;i<Math.max(min,arr.length);i++){
      const it=arr[i],b=document.createElement('button');b.type='button';
      if(!it){b.className='bslot empty';b.disabled=true;el.appendChild(b);continue}
      const q=GEAR.find(z=>z.k===it.slot);
      b.className='bslot '+(RAR[it.r].cls||'rare')+(whSel===it.u?' sel':'');b.title=gearName(q,it);b.innerHTML=ICONS[q.k](RAR[it.r].c);
      const t=document.createElement('span');t.className='q';t.textContent='G'+it.g;b.appendChild(t);
      b.addEventListener('click',()=>{whSel=it.u;renderWh()});el.appendChild(b);
    }
  };
  fill($('whGrid'),W,WH_CAP);fill($('whBag'),A,12);
  const info=$('whInfo');info.innerHTML='';
  const inW=W.find(x=>x.u===whSel),it=inW||A.find(x=>x.u===whSel);
  if(!it){const e=document.createElement('span');e.style.color='#8d9aa2';e.textContent='Tap a piece to move it between the bag and the Warehouse.';info.appendChild(e);return}
  const q=GEAR.find(z=>z.k===it.slot),d=document.createElement('div'),nm=document.createElement('b');
  nm.textContent=gearName(q,it);nm.style.color=RAR[it.r].c;d.appendChild(nm);
  const sm=document.createElement('small');sm.textContent=statTxt(it.st,0,null);d.appendChild(sm);info.appendChild(d);
  const b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent=inW?'Withdraw to bag':'Store in Warehouse';
  b.addEventListener('click',()=>whMove(it.u,!inW));info.appendChild(b);
}
$('bWare').addEventListener('click',openWh);$('whClose').addEventListener('click',closeWh);$('whAll').addEventListener('click',whStoreAll);
$('wh').addEventListener('pointerdown',e=>{if(e.target===$('wh'))closeWh()});
function closeBag(){$('bag').hidden=true;bagConfirm=null;petComb=null;bagMulti=false;bagPick.clear();snapSeen()}
function toggleBag(){if(!started)return;const b=$('bag');if(b.hidden){b.hidden=false;renderBag()}else closeBag()}
$('bBag').addEventListener('click',toggleBag);$('bagAuto').addEventListener('click',autoEquipBest);$('bagMulti').addEventListener('click',()=>{bagMulti=!bagMulti;bagPick.clear();bagConfirm=null;renderBag()});$('bagClose').addEventListener('click',closeBag);
$('autoPot').addEventListener('change',e=>{P.autoPot=e.target.checked;save()});
$('apHp').addEventListener('input',e=>{P.apHp=clamp(+e.target.value||35,5,95);$('apHpV').textContent=P.apHp+'%'});$('apHp').addEventListener('change',()=>save());
$('apQi').addEventListener('input',e=>{P.apQi=clamp(+e.target.value||20,5,95);$('apQiV').textContent=P.apQi+'%'});$('apQi').addEventListener('change',()=>save());
$('fightBack').addEventListener('change',e=>{P.fightBack=e.target.checked;save()});
$('tapMove').addEventListener('change',e=>{P.tapMove=e.target.checked;if(!P.tapMove)P.mv=null;save()}); /* v5_134 phone: tapping the ground only walks when this is on */
$('perfSel').value=PERF;
$('perfSel').addEventListener('change',e=>{const v=e.target.value;try{localStorage.setItem('alperf',v)}catch(_){}say('Performance mode: '+v+' \u2014 reloading\u2026','#e3b559');try{saveNow()}catch(_){}setTimeout(()=>location.reload(),700)});
/* ---------- GOLD: premium currency, kept ON THE SERVER (coupons.go) ----------
   The balance lives in the account on the server, never in the browser save, so it cannot be edited. You get gold by redeeming a coupon code
   (codes are generated by the server owner, see README); here it is exchanged for coins or ore. P.gold is only a display copy of the server balance. */
const WALLET={coin:5000,ore:100};
function walletLoad(){return api('/api/wallet').then(r=>{P.gold=Math.max(0,+r.gold||0);WALLET.coin=+r.coinRate||5000;WALLET.ore=+r.oreRate||100;if(!$('shop').hidden)renderShop()}).catch(()=>{})}
function buyWithGold(kind,n){
  n=Math.min(n,P.gold);if(n<=0){say('Not enough gold.','#8d9aa2');return}
  api('/api/exchange',{kind,n}).then(r=>{
    P.gold=Math.max(0,+r.gold||0);
    if(r.kind==='coins'){P.coins=Math.min(2e9,P.coins+r.grant);bagLog('Exchanged '+r.n+' gold for '+r.grant.toLocaleString()+' coins','#e3b559')}
    else{P.ore=Math.min(2e9,P.ore+r.grant);bagLog('Exchanged '+r.n+' gold for '+r.grant.toLocaleString()+' darksteel ore','#7fe0ee')}
    save();renderShop();
  }).catch(e=>{say(e.message||'Exchange failed.','#d9503f');walletLoad()});
}
/* confirmation before spending gold on coins or ore */
let xcPend=null;
function confirmExchange(kind,n){
  n=Math.min(n,P.gold);if(n<=0){say('Not enough gold.','#8d9aa2');return}
  const per=kind==='coins'?WALLET.coin:WALLET.ore,what=kind==='coins'?'coins':'darksteel ore';
  xcPend={kind,n};
  $('xcText').textContent='Spend '+n.toLocaleString()+' gold to get '+(n*per).toLocaleString()+' '+what+'? (1 gold = '+per.toLocaleString()+' '+what+')';
  $('xcDlg').hidden=false;
}
function closeXc(){$('xcDlg').hidden=true;xcPend=null}
$('xcCancel').addEventListener('click',closeXc);
$('xcDlg').addEventListener('pointerdown',e=>{if(e.target===$('xcDlg'))closeXc()});
$('xcGo').addEventListener('click',()=>{if(!xcPend)return;const {kind,n}=xcPend;closeXc();buyWithGold(kind,n)});
function redeemCoupon(code){
  code=String(code||'').trim();if(!code){say('Enter a coupon code.','#8d9aa2');return}
  api('/api/redeem',{code}).then(r=>{
    P.gold=Math.max(0,+r.balance||0);
    say('Coupon accepted: +'+(r.gold|0).toLocaleString()+' gold.','#ffc94d',7000);bagLog('+'+(r.gold|0).toLocaleString()+' gold (coupon)','#ffc94d');
    const i=$('cpnIn');if(i)i.value='';renderShop();
  }).catch(e=>say(e.message||'Could not redeem the coupon.','#d9503f'));
}
function renderGoldBox(){
  const bx=$('goldBox');bx.innerHTML='';
  const h=document.createElement('div');h.style.cssText='margin:6px 0 2px;font-size:12px;color:#ffc94d;font-weight:700';h.textContent='Gold Exchange \u00b7 you have '+P.gold.toLocaleString()+' gold';bx.appendChild(h);
  const cr=document.createElement('div');cr.style.cssText='display:flex;gap:6px;margin:4px 0';
  const inp=document.createElement('input');inp.id='cpnIn';inp.type='text';inp.placeholder='Coupon code  XXXX-XXXX-XXXX-XXXX';inp.maxLength=32;inp.autocomplete='off';inp.spellcheck=false;
  inp.style.cssText='flex:1;min-width:0;padding:6px 8px;background:#0a1019;border:1px solid #2d4262;color:#e8edf4;font:inherit;font-size:12px;text-transform:uppercase';
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')redeemCoupon(inp.value)});inp.addEventListener('keyup',e=>e.stopPropagation());
  const rb=document.createElement('button');rb.type='button';rb.className='btn pri';rb.textContent='Redeem';rb.addEventListener('click',()=>redeemCoupon(inp.value));
  cr.appendChild(inp);cr.appendChild(rb);bx.appendChild(cr);
  for(const [kind,lb,per,col] of [['coins','Coins',WALLET.coin,'#e3b559'],['ore','Darksteel Ore',WALLET.ore,'#7fe0ee']]){
    const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;justify-content:space-between;margin:3px 0;flex-wrap:wrap';
    const t=document.createElement('span');t.style.cssText='font-size:12px;color:'+col;t.textContent='1 gold = '+per.toLocaleString()+' '+lb.toLowerCase();row.appendChild(t);
    const w=document.createElement('span');w.className='bagact';
    for(const [lb2,n] of [['1',1],['10',10],['100',100],['Max',1e9]]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Buy '+lb2;b.disabled=P.gold<1;b.addEventListener('click',()=>confirmExchange(kind,n));w.appendChild(b)}
    row.appendChild(w);bx.appendChild(row);
  }
}
/* purchase dialog: pick a quantity, then pay the total in coins */
let buyK=null,buyN=1,buyPadVal='';
function buyMaxN(k){const pr=priceOf(k);return Math.max(0,Math.min(Math.floor(P.coins/pr),POT_MAX-P.pots[k]))}
function renderBuy(){
  const k=buyK,pr=priceOf(k),mx=buyMaxN(k);
  buyN=Math.max(mx>0?1:0,Math.min(buyN,mx));
  $('buyIco').innerHTML=ICONS[k]();$('buyName').textContent=POTS[k].n;$('buyOwned').textContent='Owned: '+P.pots[k].toLocaleString();
  $('buyQty').textContent=buyN.toLocaleString();$('buyMax').textContent=mx.toLocaleString();
  $('buyCoin').innerHTML=ICONS.coin();$('buyTotal').textContent=(buyN*pr).toLocaleString();
  $('buyMinus').disabled=buyN<=1;$('buyPlus').disabled=buyN>=mx;$('buyMax').disabled=mx<1;$('buyGo').disabled=buyN<1;
}
function openBuy(k){
  if(buyMaxN(k)<1){say(P.pots[k]>=POT_MAX?'Your bag cannot hold more.':'Not enough coins.','#8d9aa2');return}
  buyK=k;buyN=1;$('buyPadBox').hidden=true;$('buyDlg').hidden=false;renderBuy();
}
function closeBuy(){$('buyDlg').hidden=true;buyK=null;$('buyPadBox').hidden=true;buyPadVal=''}
function buyPot(k,n){
  const pr=priceOf(k);n=Math.min(n,buyMaxN(k));
  if(n<=0){say(P.pots[k]>=POT_MAX?'Your bag cannot hold more.':'Not enough coins.','#8d9aa2');return}
  P.coins-=n*pr;P.pots[k]+=n;bagLog('Bought '+n+' '+POTS[k].n+(n>1?'s':'')+' (-'+(n*pr).toLocaleString()+' coins)',POTS[k].c);save();renderShop();
}
$('buyMinus').addEventListener('click',()=>{buyN--;renderBuy()});
$('buyPlus').addEventListener('click',()=>{buyN++;renderBuy()});
$('buyReset').addEventListener('click',()=>{buyN=1;renderBuy()});
$('buyMax').addEventListener('click',()=>{buyN=buyMaxN(buyK);renderBuy()});
$('buyCancel').addEventListener('click',closeBuy);
$('buyDlg').addEventListener('pointerdown',e=>{if(e.target===$('buyDlg'))closeBuy()});
$('buyGo').addEventListener('click',()=>{if(!buyK)return;const k=buyK,n=buyN;closeBuy();buyPot(k,n)});
$('buyPad').addEventListener('click',()=>{
  const b=$('buyPadBox');if(!b.hidden){b.hidden=true;return}
  buyPadVal='';b.innerHTML='';
  for(const t of ['1','2','3','4','5','6','7','8','9','C','0','OK']){
    const x=document.createElement('button');x.type='button';x.className='qbtn';x.textContent=t;
    x.addEventListener('click',()=>{
      if(t==='C')buyPadVal='';else if(t==='OK'){if(buyPadVal)buyN=+buyPadVal;b.hidden=true;renderBuy();return}
      else if(buyPadVal.length<5)buyPadVal=(buyPadVal+t).replace(/^0+/,'');
      if(buyPadVal)buyN=+buyPadVal;renderBuy();
    });b.appendChild(x);
  }
  b.hidden=false;
});
let shopSel='hp';
function renderShop(){
  $('shopCoins').textContent='Coins: '+P.coins.toLocaleString()+' \u00b7 Gold: '+P.gold.toLocaleString();renderGoldBox();
  $('shopInfo').textContent=potPrice().toLocaleString()+' coins per potion \u00b7 '+tpPrice().toLocaleString()+' per Home Scroll';
  const g=$('shopGrid');g.innerHTML='';
  for(const k of ['hp','qi','tp']){
    const b=document.createElement('button');b.type='button';b.className='bslot '+(k==='hp'?'epic':(k==='tp'?'leg':''))+(shopSel===k?' sel':'');b.title=POTS[k].n;b.innerHTML=ICONS[k]();
    const q=document.createElement('span');q.className='q';q.textContent=fmtQ(P.pots[k]);b.appendChild(q);
    b.addEventListener('click',()=>{shopSel=k;renderShop()});g.appendChild(b);
  }
  const k=shopSel,info=$('shopSel');info.innerHTML='';
  const d=document.createElement('div'),nm=document.createElement('b');nm.textContent=POTS[k].n+' \u00b7 '+priceOf(k).toLocaleString()+' coins';nm.style.color=POTS[k].c;d.appendChild(nm);
  const sm=document.createElement('small');sm.textContent=POTS[k].d+' \u00b7 you own '+P.pots[k];d.appendChild(sm);info.appendChild(d);
  const w=document.createElement('div');w.className='bagact';
  {const b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent='Buy';b.disabled=buyMaxN(k)<1;b.addEventListener('click',()=>openBuy(k));w.appendChild(b)}
  info.appendChild(w);
}
function openShop(){
  if(!started)return;
  if(!inTown()||dist(P.x,P.y,NPC.x,NPC.y)>190){say('Walk up to the Potion Merchant in your hub to shop.','#8d9aa2');return}
  renderShop();$('shop').hidden=false;walletLoad();
}
$('shopClose').addEventListener('click',()=>{closeBuy();closeXc();$('shop').hidden=true});
setInterval(()=>{if(started)save()},8000); /* v5_186 20 s -> 8 s */

/* ---------- PETS (v5_195): eggs drop from bosses, hatch in the bag, combine F > E > D > C > B > A > S. v5_219: the summoned pet gives its owner 2 stats (by pet species, see PET_PAIR in 01_core.js) and attacks monsters (petFight below). ----------
   P.eggs  = number of eggs (one stacked bag slot).
   P.pets  = { 's:c': count } stacks, s = species index (0 chicken, 1-5 special), c = class index (0 F ... 6 S). One bag slot per stack.
   Chicken is the common pet: it has no class and cannot be combined. */
const EGG_DROP_CHANCE=1,EGG_DROP_N=1,EGG_ORE=10;                /* boss egg drop (bag full: the egg is sold for ore) */
const EGG_SPECIAL_CHANCE=5;                                     /* % chance a hatched egg is a special pet (else a chicken) */
const PET_CLS=['F','E','D','C','B','A','S'],PET_CLS_COL=['#c4cdd2','#5aa9ff','#c07bff','#ff6a4a','#ffb02e','#4de3b0','#ff7ae0'],PET_CLS_SLOT=['cm','','pu','epic','leg','pa','ps'];
const PET_UP=[5,4,3,2,1,.5];                                    /* % chance to combine class i + class i into class i+1 (F>E 5, E>D 4, D>C 3, C>B 2, B>A 1, A>S .5) */
const PET_SP=[{n:'Chicken',col:'#f3e6c4'},{n:'Dragon',col:'#5cd36a'},{n:'Fairy',col:'#ff9ad5'},{n:'Phoenix',col:'#ff7a2a'},{n:'Tiger',col:'#ffb347'},{n:'Wolf',col:'#aab7c4'}];
P.eggs=0;P.pets={};P.pet=null;P.pf=null; /* P.pet = key of the summoned pet ('s:c') or null; P.pf = where it is (follows you) */
let petComb=null; /* combine mode: {a:'s:c' first pet, b:'s:c' second pet or null} */
const petKey=(s,c)=>s+':'+c,petParse=k=>{const a=k.split(':');return{s:a[0]|0,c:a[1]|0}};
const petsObj=()=>P.pets||(P.pets={});
/* v5_201: validate a pet key received from another player ("s:c"); returns '' for anything invalid */
function petKeyClean(k){if(typeof k!=='string'||!/^[0-5]:[0-6]$/.test(k))return '';return k[0]==='0'&&k[2]!=='0'?'':k}
const petStacks=()=>Object.keys(petsObj()).filter(k=>petsObj()[k]>0).length;
const petName=(s,c)=>s===0?'Chicken':PET_SP[s].n+' [Class '+PET_CLS[c]+']';
const petCol=(s,c)=>s===0?PET_SP[0].col:PET_CLS_COL[c];
function petAdd(s,c,n){const o=petsObj(),k=petKey(s,c);o[k]=(o[k]||0)+n}
function petTake(s,c,n){const o=petsObj(),k=petKey(s,c);o[k]=(o[k]||0)-n;if(o[k]<=0)delete o[k]}
function parsePets(o){const out={};if(o&&typeof o==='object')for(const k in o){const p=petParse(k);if(p.s<0||p.s>=PET_SP.length||p.c<0||p.c>=PET_CLS.length)continue;if(p.s===0&&p.c!==0)continue;const n=Math.min(99999,o[k]|0);if(n>0)out[petKey(p.s,p.c)]=n}return out}
/* ---- icons ---- */
ICONS.egg=()=>svgW('<path d="M32 5C20 5 11 28 11 40c0 12 9 19 21 19s21-7 21-19C53 28 44 5 32 5z" fill="#f4ecd8" stroke="#8a7a56" stroke-width="2"/><circle cx="24" cy="38" r="4" fill="#e3b559"/><circle cx="39" cy="30" r="3.5" fill="#7fb0e8"/><circle cx="36" cy="47" r="4" fill="#e88aa8"/><path d="M20 22q4-9 10-12" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>');
ICONS.pet=[
 c=>svgW('<ellipse cx="30" cy="40" rx="18" ry="15" fill="#f6efd8" stroke="#8a7a56" stroke-width="2"/><circle cx="44" cy="25" r="10" fill="#f6efd8" stroke="#8a7a56" stroke-width="2"/><path d="M40 11q4-6 8 0q4-5 6 2z" fill="#e0412f" stroke="#7a1c14" stroke-width="1.5"/><path d="M53 26l8 3-8 3z" fill="#f0a030" stroke="#8a5a10" stroke-width="1.5"/><circle cx="46" cy="23" r="2" fill="#222"/><path d="M13 36q-6 2-6 10 8-2 10-6z" fill="#e9dfbf" stroke="#8a7a56" stroke-width="1.5"/><path d="M26 54v6M34 54v6" stroke="#f0a030" stroke-width="3"/>'),
 c=>svgW('<path d="M6 30l16-16 6 14-10 8z" fill="#3aa84d" stroke="#14451d" stroke-width="2"/><path d="M58 30L42 14l-6 14 10 8z" fill="#3aa84d" stroke="#14451d" stroke-width="2"/><ellipse cx="32" cy="38" rx="12" ry="14" fill="#5cd36a" stroke="#14451d" stroke-width="2"/><path d="M24 14l4 10M40 14l-4 10" stroke="#e3b559" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="7" ry="5" fill="#a8f0a0"/><circle cx="26" cy="34" r="2.5" fill="#ffe14a" stroke="#222"/><circle cx="38" cy="34" r="2.5" fill="#ffe14a" stroke="#222"/><circle cx="29" cy="44" r="1.2" fill="#14451d"/><circle cx="35" cy="44" r="1.2" fill="#14451d"/>'),
 c=>svgW('<path d="M30 30L8 12q-2 18 12 26z" fill="#bfe8ff" stroke="#6aa8d8" stroke-width="1.5" opacity=".9"/><path d="M34 30l22-18q2 18-12 26z" fill="#bfe8ff" stroke="#6aa8d8" stroke-width="1.5" opacity=".9"/><circle cx="32" cy="18" r="8" fill="#ffd9c0" stroke="#8a5a40" stroke-width="1.5"/><path d="M23 16q4-12 18 0q-2-4-9-4t-9 4z" fill="#ff9ad5" stroke="#a04070" stroke-width="1.5"/><path d="M26 26h12l5 22H21z" fill="#ff9ad5" stroke="#a04070" stroke-width="2"/><path d="M28 48v10M36 48v10" stroke="#ffd9c0" stroke-width="3"/><path d="M50 40l2 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" fill="#ffe14a" stroke="#a07a10" stroke-width="1"/>'),
 c=>svgW('<path d="M32 36L4 18q4 24 28 28z" fill="#ff7a2a" stroke="#7a2a08" stroke-width="2"/><path d="M32 36l28-18q-4 24-28 28z" fill="#ff7a2a" stroke="#7a2a08" stroke-width="2"/><path d="M32 40q-12 6-6 22 6-8 6-12 0 4 6 12 6-16-6-22z" fill="#ffd23a" stroke="#c0500a" stroke-width="1.5"/><ellipse cx="32" cy="32" rx="9" ry="12" fill="#ff9a3a" stroke="#7a2a08" stroke-width="2"/><circle cx="32" cy="16" r="8" fill="#ffb347" stroke="#7a2a08" stroke-width="2"/><path d="M26 10q2-8 6-8-1 4 2 6 2-4 6-4-2 6-4 8z" fill="#e0412f"/><path d="M30 18l-2 6 4-2 4 2-2-6z" fill="#ffe14a" stroke="#8a5a10" stroke-width="1"/><circle cx="29" cy="15" r="1.6" fill="#222"/><circle cx="35" cy="15" r="1.6" fill="#222"/>'),
 c=>svgW('<path d="M12 22L9 6l14 8zM52 22l3-16-14 8z" fill="#ffb347" stroke="#7a4a08" stroke-width="2"/><ellipse cx="32" cy="34" rx="22" ry="21" fill="#ffb347" stroke="#7a4a08" stroke-width="2"/><path d="M32 13v9M22 15l3 8M42 15l-3 8M10 32h8M54 32h-8M12 42l7-2M52 42l-7-2" stroke="#2a1a08" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="11" ry="8" fill="#fff4dc"/><circle cx="23" cy="31" r="3" fill="#ffe14a" stroke="#222" stroke-width="1.5"/><circle cx="41" cy="31" r="3" fill="#ffe14a" stroke="#222" stroke-width="1.5"/><path d="M29 40h6l-3 4z" fill="#e0707a" stroke="#222" stroke-width="1"/><path d="M32 44v4M26 48q6 4 12 0" stroke="#222" stroke-width="1.5" fill="none"/>'),
 c=>svgW('<path d="M12 28L8 4l16 12zM52 28l4-24-16 12z" fill="#aab7c4" stroke="#33414f" stroke-width="2"/><path d="M12 28q-4 18 12 28h16q16-10 12-28-8-10-20-10t-20 10z" fill="#aab7c4" stroke="#33414f" stroke-width="2"/><path d="M24 40q8-6 16 0l-4 16H28z" fill="#e8eef4" stroke="#33414f" stroke-width="1.5"/><path d="M28 44h8l-4 7z" fill="#222"/><circle cx="23" cy="32" r="2.8" fill="#ffd23a" stroke="#222"/><circle cx="41" cy="32" r="2.8" fill="#ffd23a" stroke="#222"/><path d="M20 22l3 5M44 22l-3 5" stroke="#6b7a88" stroke-width="2"/>')];
const petIcon=(s,c)=>ICONS.pet[s](petCol(s,c));
/* ---- boss drop ---- */
function giveEgg(m){
  const n=EGG_DROP_N;
  if(P.eggs===0&&bagCount()>=BAG_CAP){
    P.ore+=EGG_ORE;lootIcon('o','&#9670;',EGG_ORE,'#7fe0ee');
    say('Bag full. Sold a Pet Egg for '+EGG_ORE+' ore.','#7fe0ee');bagLog('Bag full: sold Pet Egg \u2192 '+EGG_ORE+' ore','#7fe0ee');save();return}
  P.eggs+=n;lootIcon('egg','&#9711;',n,'#f4ecd8');pop(P.x+28,P.y-52,'+'+n+' Pet Egg','#f4ecd8',13);
  say((m?m.name+' dropped a Pet Egg! ':'')+'Open your bag and tap it to hatch.','#f4ecd8',6000);bagLog('+'+n+' Pet Egg'+(n>1?'s':''),'#f4ecd8');save();
}
/* ---- hatching ---- */
function hatchRoll(){return rnd()*100<EGG_SPECIAL_CHANCE?1+Math.floor(rnd()*5):0}
function hatchEggs(n){
  n=Math.min(n,P.eggs);if(n<=0)return;
  const got={};let done=0,first=null;
  for(let i=0;i<n;i++){
    const s=hatchRoll(),k=petKey(s,0),isNew=!(petsObj()[k]>0),freed=P.eggs===1;
    if(isNew&&!got[k]&&bagCount()>=BAG_CAP&&!freed){if(!done)say('Your bag is full. Make room to hatch this egg.','#8d9aa2',4000);break}
    P.eggs--;petAdd(s,0,1);got[k]=(got[k]||0)+1;done++;if(!first)first=k;
  }
  if(!done){renderBag();return}
  const sp=Object.keys(got).filter(k=>petParse(k).s>0);
  if(done===1){const p=petParse(first);
    if(p.s>0){say('The egg hatched a '+PET_SP[p.s].n+'! (Class F)','#ffe14a',8000);pop(P.x,P.y-60,'\u2605 '+PET_SP[p.s].n+'!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
    else say('The egg hatched a Chicken.','#c4cdd2',4000);
    lootIcon('pet'+first,'&#9733;',1,petCol(p.s,0));
  }else{
    const parts=Object.keys(got).sort().map(k=>got[k]+' '+PET_SP[petParse(k).s].n+(got[k]>1?'s':''));
    say('Hatched '+done+' eggs: '+parts.join(', ')+'.',sp.length?'#ffe14a':'#c4cdd2',8000);
    if(sp.length){pop(P.x,P.y-60,'\u2605 Special pet!','#ffe14a',18);spark(P.x,P.y-20,'#ffe14a',24,200,.8,3)}
  }
  bagLog('Hatched '+done+' egg'+(done>1?'s':'')+(sp.length?' \u2014 special pet!':''),sp.length?'#ffe14a':'#c4cdd2');
  const pick=sp.length?sp[0]:first;bagSel='pet_'+pick;bagConfirm=null;
  save();renderBag();
}
/* ---- combining: two pets of the same class (any species) -> one pet of the next class, or a failure that destroys 1 of the two ---- */
function petCanCombine(p){return p.s>0&&p.c<PET_CLS.length-1}
function petCombineReady(){
  if(!petComb||!petComb.b)return false;
  const A=petParse(petComb.a),B=petParse(petComb.b),o=petsObj();
  if(A.s!==B.s||A.c!==B.c||!petCanCombine(A)||!petCanCombine(B))return false;
  return petComb.a===petComb.b?(o[petComb.a]|0)>=2:(o[petComb.a]|0)>=1&&(o[petComb.b]|0)>=1;
}
function doCombine(){
  if(!petCombineReady())return;
  const A=petParse(petComb.a),B=petParse(petComb.b),c=A.c,ch=PET_UP[c];
  if(rnd()*100<ch){
    const s=A.s;
    petTake(A.s,c,1);petTake(B.s,c,1);petAdd(s,c+1,1);
    const msg='Combine success! '+PET_SP[A.s].n+' + '+PET_SP[B.s].n+' became a '+PET_SP[s].n+' [Class '+PET_CLS[c+1]+']!';
    say(msg,PET_CLS_COL[c+1],9000);pop(P.x,P.y-60,'\u2605 Class '+PET_CLS[c+1]+' '+PET_SP[s].n,PET_CLS_COL[c+1],18);spark(P.x,P.y-20,PET_CLS_COL[c+1],34,220,.9,3.2);
    bagLog('Combined \u2192 '+PET_SP[s].n+' Class '+PET_CLS[c+1],PET_CLS_COL[c+1]);
    petComb=null;bagSel='pet_'+petKey(s,c+1);
  }else{
    const lose=rnd()<.5?A:B;
    petTake(lose.s,c,1);
    say('Combine failed (' + ch + '% chance). A '+PET_SP[lose.s].n+' [Class '+PET_CLS[c]+'] was destroyed.','#ff8a7a',8000);
    bagLog('Combine failed: lost '+PET_SP[lose.s].n+' Class '+PET_CLS[c],'#ff8a7a');
    /* back to the pick screen with the first pet kept selected if it is still there */
    petComb=(petsObj()[petComb.a]>0)?{a:petComb.a,b:null}:null;
    if(!petComb)bagSel=null;
  }
  save();renderBag();
}
/* bag integration: items, tap handling, info panel */
function petBagItems(a){
  if(P.eggs>0)a.push({id:'egg',n:'Pet Egg',v:P.eggs,t:fmtQ(P.eggs),r:'pu',ic:ICONS.egg(),d:'Dropped by world bosses. Hatch it for a pet: '+EGG_SPECIAL_CHANCE+'% a special pet (Dragon, Fairy, Phoenix, Tiger or Wolf, Class F), '+(100-EGG_SPECIAL_CHANCE)+'% a Chicken.',egg:1});
  const o=petsObj(),ks=Object.keys(o).filter(k=>o[k]>0).sort((x,y)=>{const a=petParse(x),b=petParse(y);return b.c-a.c||a.s-b.s});
  for(const k of ks){const p=petParse(k),n=o[k];
    a.push({id:'pet_'+k,n:p.s===0?'Chicken':PET_SP[p.s].n+' (Class '+PET_CLS[p.c]+')',v:n,t:p.s===0?'\u00d7'+fmtQ(n):PET_CLS[p.c]+(n>1?' \u00d7'+n:''),r:p.s===0?'cm':PET_CLS_SLOT[p.c],ic:petIcon(p.s,p.c),
      d:(p.s===0?'A common pet. It cannot be combined.':'Class '+PET_CLS[p.c]+' pet.')+petInfoText(p.s,p.c)+(p.s===0?'':(petCanCombine(p)?' Combine two Class '+PET_CLS[p.c]+' '+PET_SP[p.s].n+'s (same pet only) for a '+PET_UP[p.c]+'% chance of a Class '+PET_CLS[p.c+1]+' pet; on failure 1 of the 2 is destroyed.':' The highest class.')),pet:{key:k,s:p.s,c:p.c,n:n}})}
  return a;
}
/* returns true when the tap was a combine-mode tap (and was handled) */
function petCombTap(it){
  if(!petComb)return false;
  if(!it.pet){petComb=null;return false}
  const A=petParse(petComb.a);
  if(it.pet.s!==A.s||it.pet.c!==A.c||!petCanCombine(it.pet)){say('Pick another '+PET_SP[A.s].n+' of the same class (Class '+PET_CLS[A.c]+').','#8d9aa2',3000);return true}
  if(it.pet.key===petComb.a&&!petComb.b&&it.pet.n<2){return true}
  if(petComb.b===it.pet.key){petComb.b=null;renderBag();return true}
  if(it.pet.key===petComb.a&&!petComb.b&&it.pet.n>=2){petComb.b=it.pet.key;renderBag();return true}
  if(it.pet.key!==petComb.a){petComb.b=it.pet.key;renderBag();return true}
  return true;
}
function petCombPanel(info){
  const A=petParse(petComb.a),d=document.createElement('div'),sm=document.createElement('small'),nm=document.createElement('b');
  nm.textContent='Combine pets \u2014 Class '+PET_CLS[A.c];nm.style.color=PET_CLS_COL[A.c];d.appendChild(nm);
  const ch=PET_UP[A.c],ready=petCombineReady();
  sm.textContent=ready?(PET_SP[A.s].n+' + '+PET_SP[A.s].n+': '+ch+'% chance of a Class '+PET_CLS[A.c+1]+' '+PET_SP[A.s].n+'. On failure 1 of the 2 is destroyed. Cannot be undone.')
    :(PET_SP[A.s].n+' selected. Tap a second Class '+PET_CLS[A.c]+' '+PET_SP[A.s].n+((petsObj()[petComb.a]|0)>=2?' (or the same stack again)':'')+'. '+ch+'% chance of Class '+PET_CLS[A.c+1]+'.');
  d.appendChild(sm);info.appendChild(d);
  const w=document.createElement('div');w.className='bagact';
  const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
  mk('Combine','pri',doCombine,!ready);mk('Cancel','',()=>{petComb=null;renderBag()});info.appendChild(w);
}
/* Fry n Chicken pets (species 0) into n Fried Chicken potions (50% HP, 60 s cooldown, no summon needed) */
function fryChicken(n){
  const have=petsObj()['0:0']|0;n=Math.min(n|0,have,POT_MAX-P.pots.ck);
  if(n<=0){say(have>0?'Your bag cannot hold more Fried Chicken.':'No Chicken to fry.','#8d9aa2');return}
  petTake(0,0,n);P.pots.ck+=n;petValidate();
  if(!P.pet)netInfo(true);
  bagLog('Fried '+n+' Chicken \u2192 '+n+' Fried Chicken','#f0b25a');say('Fried '+n+' Chicken. Use Fried Chicken (Y) to heal 50% HP.','#f0b25a',4000);
  bagSel=null;save();renderBag();
}
function petBagActions(sel,info){
  const w=document.createElement('div');w.className='bagact';
  const mk=(t,c,f,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(c?' '+c:'');b.textContent=t;b.disabled=!!dis;b.addEventListener('click',f);w.appendChild(b)};
  if(sel.egg){mk('Hatch','pri',()=>hatchEggs(1));if(P.eggs>1)mk('Hatch all ('+P.eggs+')','',()=>hatchEggs(P.eggs))}
  else if(sel.pet){
    const on=P.pet===sel.pet.key;
    mk(on?'Dismiss':'Summon',on?'':'pri',()=>on?petDismiss():petSummon(sel.pet.key));
    if(sel.pet.s===0){mk('Fry (\u2192 Fried Chicken)','pri',()=>fryChicken(1));if(sel.pet.n>1)mk('Fry all ('+sel.pet.n+')','',()=>fryChicken(sel.pet.n))}
    if(petCanCombine(sel.pet))mk('Combine','',()=>{petComb={a:sel.pet.key,b:null};renderBag()},sel.pet.n<2&&petPartners(sel.pet)<1);
  }
  if(w.children.length)info.appendChild(w);
}
/* how many OTHER special pets of the same class exist (so Combine is only enabled when a partner exists) */
function petPartners(p){let n=0;const o=petsObj();for(const k in o){if(k===p.key)continue;const q=petParse(k);if(q.s===p.s&&q.c===p.c)n+=o[k]}return n}
function petCombValidate(){if(!petComb)return;const o=petsObj();if(!(o[petComb.a]>0))petComb=null;else if(petComb.b&&!(o[petComb.b]>0))petComb.b=null}


/* ---------- PET ATTACK (v5_219) ----------
   The summoned pet fights for you (monsters only: nothing in town or in PvP mode). Each hit = your ATK (without the pet's own ATK bonus, so it does not snowball) x the pet's class %
   (PET_ATK_PCT, F..S) x the species factor f, once every iv seconds, on your target or the nearest monster within PET_RANGE of you. It goes through hitMonster, so accuracy, monster
   defence, level gap and kill credit work like your own hits. Spirit Summoners already have wolves, so their pet's attack is halved (PET_SUMMONER_K).
   Species: Tiger / Wolf fast melee | Dragon slow fire breath that also scorches up to 2 enemies near the target | Phoenix hit + burn | Fairy weak hit + heals you | Chicken weak peck. */
const PET_ATK_PCT=[6,9,13,18,24,31,40],PET_RANGE=320,PET_SUMMONER_K=.5;
const PET_FIGHT=[
 {kind:'peck',f:.4,iv:1.5,col:'#f3e6c4'},   /* 0 Chicken */
 {kind:'fire',f:1.15,iv:2.2,col:'#ff7a22'},  /* 1 Dragon */
 {kind:'spark',f:.5,iv:1.5,col:'#ff9ad5',heal:[.5,.7,1,1.3,1.6,2,2.5],hiv:5},   /* 2 Fairy: heal = % of your max HP every hiv seconds while you are hurt, by class F..S */
 {kind:'burn',f:.9,iv:1.5,col:'#ffb02e'},    /* 3 Phoenix: 3 burn ticks of 25% of the hit */
 {kind:'claw',f:1,iv:1.2,col:'#ffb347'},     /* 4 Tiger */
 {kind:'bite',f:1,iv:1.2,col:'#aab7c4'}];    /* 5 Wolf */
const petHitDmg=()=>{ /* damage of one pet hit before the monster's own defence, 0 when there is no pet */
  if(!P.pet)return 0;const p=petParse(P.pet),F=PET_FIGHT[p.s];if(!F)return 0;
  const atk=atkVal()/(1+petPct('atk'));
  return atk*PET_ATK_PCT[p.s===0?0:p.c]/100*F.f*(P.cls===4?PET_SUMMONER_K:1)};
let petCd=0,petHc=0,petFightAt=-99,petAtkN=0,petTgt=null; /* petFightAt (v5_221): game time of the pet's last attack, drives the dragon's take-off / landing */
function petFight(dt){
  if(!P.pet||!P.pf||P.dead>0||inTown())return;
  const p=petParse(P.pet),F=PET_FIGHT[p.s];if(!F)return;
  const f=P.pf;petCd-=dt;
  if(F.heal){petHc-=dt;if(petHc<=0){petHc=F.hiv;const mh=maxHp();if(P.hp<mh*.95){const h=Math.max(1,Math.round(mh*F.heal[p.c]/100));P.hp=Math.min(mh,P.hp+h);pop(P.x,P.y-40,'+'+h,'#7dffb0',13);spark(f.x,f.y,'#ff9ad5',10,110,.5,3);ring(P.x,P.y,40,'#7dffb0')}}}
  if(petCd>0||pvpOnly())return;
  let b=(P.target&&!P.target.isPl&&!P.target.dead&&!P.target.pend&&dist(P.target.x,P.target.y,P.x,P.y)<PET_RANGE)?P.target:null,bd=PET_RANGE;
  if(!b)for(const m of mons){if(m.dead||m.pend)continue;const d=dist(m.x,m.y,P.x,P.y);if(d<bd){bd=d;b=m}}
  if(!b)return;
  petCd=F.iv;petFightAt=time;petAtkN++;petTgt=b;
  const base=petHitDmg(),one=(m,mul)=>{const d=Math.max(1,Math.round(base*(mul||1)*(.9+rnd()*.2)));hitMonster(m,d,false);return d};
  sigLine(f.x,f.y,b.x,b.y,F.col,6);spark(b.x,b.y,F.col,8,150,.35,3);
  const d=one(b);
  if(F.kind==='fire'){ /* breath also scorches up to 2 other enemies near the target */
    ring(b.x,b.y,90,F.col);let n=0;
    for(const m of mons){if(n>=2)break;if(m===b||m.dead||m.pend)continue;if(dist(m.x,m.y,b.x,b.y)<110){one(m,.6);spark(m.x,m.y,F.col,6,120,.3,3);n++}}
  }else if(F.kind==='burn'&&d>0){ /* 3 burn ticks (no accuracy roll) */
    const tick=Math.max(1,Math.round(base*.25));
    for(let j=1;j<=3;j++)delayed.push({t:.8*j,f:()=>{if(!b.dead&&!b.pend){hitMonster(b,tick,false,true);spark(b.x,b.y,'#ff5a2a',5,90,.3,2.6)}}});
  }
}
/* text for the bag panel: what this pet gives YOU (fixed by its species) and how it attacks */
function petInfoText(s,c){
  const g=PET_GF[c]*(s===0?PET_CHICKEN_K:1),st=PET_PAIR[s]||[],lbl={atk:'ATK',hp:'HP',def:'DEF',acc:'accuracy',eva:'evasion'};
  const gives=st.map(k=>'+'+(Math.round(PET_STAT_S[k]*g*10)/10)+(PET_FLAT[k]?(k==='eva'?'% ':' '):'% ')+lbl[k]).join(', ');
  const F=PET_FIGHT[s],pc=PET_ATK_PCT[s===0?0:c]*F.f*(P.cls===4?PET_SUMMONER_K:1);
  const how=F.kind==='spark'?'weak sparks and heals you '+F.heal[c]+'% HP every '+F.hiv+' s when hurt':{peck:'weak pecks',fire:'fire breath that also scorches 2 nearby enemies',burn:'hits that also burn',claw:'fast claw strikes',bite:'fast bites'}[F.kind];
  return ' Gives you '+gives+'. It attacks for about '+(Math.round(pc*10)/10)+'% of your ATK every '+F.iv+' s ('+how+').';
}

/* ---------- summon: ONE pet follows beside you (any pet, common or special). Summoning another replaces it. Summoning does not use the pet up. ---------- */
function petValidate(){if(P.pet&&!(petsObj()[P.pet]>0)){P.pet=null;P.pf=null}}
function petLoad(k){return typeof k==='string'&&petsObj()[k]>0?k:null}
function petSummon(k){
  if(!(petsObj()[k]>0))return;const p=petParse(k),old=P.pet;
  P.pet=k;P.pf=null;P.hp=Math.min(P.hp,maxHp()); /* the pet's HP bonus changes max HP */
  say((old&&old!==k?'You swapped your pet. ':'')+(p.s===0?'Chicken':PET_SP[p.s].n+' (Class '+PET_CLS[p.c]+')')+' is now by your side.',petCol(p.s,p.c),5000);
  bagLog('Summoned '+petName(p.s,p.c).replace(/ \[Class (.)\]/,' (Class $1)'),petCol(p.s,p.c));save();netInfo(true);renderBag();
}
function petDismiss(){if(!P.pet)return;const p=petParse(P.pet);P.pet=null;P.pf=null;P.hp=Math.min(P.hp,maxHp());say('Pet dismissed.','#8d9aa2',3000);bagLog('Dismissed pet','#8d9aa2');save();netInfo(true);renderBag()}
/* sprite: the pet's icon on a canvas (class-coloured glow behind special pets). Used by the 2D view directly and by the 3D view as a billboard sprite. */
const PET_SPR={};
function petSprite(k){
  let e=PET_SPR[k];if(e)return e;
  const p=petParse(k),cv=document.createElement('canvas');cv.width=cv.height=128;
  e=PET_SPR[k]={cv,tex:null,ok:false};
  const g=cv.getContext('2d');
  if(p.s>0){const gr=g.createRadialGradient(64,70,8,64,70,62);gr.addColorStop(0,PET_CLS_COL[p.c]+'aa');gr.addColorStop(1,PET_CLS_COL[p.c]+'00');g.fillStyle=gr;g.fillRect(0,0,128,128)}
  const im=new Image();
  im.onload=()=>{g.drawImage(im,14,14,100,100);e.ok=true;if(e.tex)e.tex.needsUpdate=true};
  im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(petIcon(p.s,p.c).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" '));
  return e;
}
let petT=0;
/* follower position: eases toward a spot to the right of you (screen-right in 3D, from the camera yaw), snaps if you teleport. Returns the hop height. */
function petStep(is3){
  petValidate();if(!P.pet)return 0;
  const now=performance.now(),dt=Math.min(.1,petT?(now-petT)/1000:.016);petT=now;
  const yaw=is3&&typeof camView!=='undefined'?camView.yaw:0,rx=Math.cos(yaw),ry=-Math.sin(yaw);
  const tx=P.x+rx*54,ty=P.y+ry*54;
  if(!P.pf||Math.hypot(tx-P.pf.x,ty-P.pf.y)>700)P.pf={x:tx,y:ty,mv:0};
  const f=P.pf,k=1-Math.exp(-7*dt),ox=f.x,oy=f.y;f.x+=(tx-f.x)*k;f.y+=(ty-f.y)*k;
  f.vx=f.x-ox;f.vy=f.y-oy;f.dt=dt;const sp=Math.hypot(f.x-ox,f.y-oy)/Math.max(dt,.001);f.mv+=((sp>40?1:0)-f.mv)*Math.min(1,dt*10);
  f.ph=(f.ph||0)+dt*(2.5+f.mv*7);
  return f.mv>.05?Math.abs(Math.sin(f.ph))*7*f.mv+2:Math.sin(f.ph)*1.6+2.5;
}
/* ---- 3D pet models (web/pets3d.js). Each view (world, bag, forge) owns its own rig; the model is rebuilt only when the summoned pet changes. ---- */
const PET_WORLD_K=1.15;
function petRigFor(h,sc,key){
  if(window.PET3D&&window.THREE&&!petRigFor.ok){try{PET3D.init(THREE,LOW);petRigFor.ok=1}catch(e){petRigFor.ok=-1}}
  if(h.pk!==key){
    if(h.pr){sc.remove(h.pr.root);try{h.pr.dispose()}catch(e){}h.pr=null}
    h.pk=key;
    if(key&&petRigFor.ok===1){try{const p=petParse(key);h.pr=PET3D.make(p.s,p.c);sc.add(h.pr.root)}catch(e){console.error('pet model',e);h.pr=null}}
  }
  return h.pr||null;
}
/* the summoned pet standing beside the avatar in the Bag / Forge preview (the avatar moves a little to the left to make room). Returns true if shown. */
function petPreview(V,t){
  petValidate();
  const rig=petRigFor(V,V.sc,P.pet);
  if(!rig)return false;
  rig.root.position.set(26,0,12);rig.root.rotation.y=-.6+Math.sin(t*.5)*.08;rig.root.scale.setScalar(1.25*Math.min(1,90/rig.h));   /* v5_223 big classes shrink to fit the preview */
  rig.anim(t,0);return true;
}
function petRender3(){
  const hop=petStep(true),T=T3;
  if(!P.pet){if(T.petSp)T.petSp.visible=false;if(T.pr)T.pr.root.visible=false;return}
  const rig=petRigFor(T,T.sc,P.pet),f=P.pf;
  if(rig){
    if(T.petSp)T.petSp.visible=false;
    const fighting=!inTown()&&P.dead<=0&&(combatT>0||time-petFightAt<4);
    let want=f.mv>.3&&Math.hypot(f.vx||0,f.vy||0)>.05?Math.atan2(f.vx,f.vy):Math.PI/2-P.face;
    if(fighting&&petTgt&&!petTgt.dead&&time-petFightAt<2.5)want=Math.atan2(petTgt.x-f.x,petTgt.y-f.y);   /* v5_222 turn to face the enemy it is attacking */
    if(f.yaw===undefined)f.yaw=want;
    let d=want-f.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw+=d*Math.min(1,(f.dt||.016)*(fighting?10:7));
    rig.root.visible=true;rig.root.scale.setScalar(PET_WORLD_K);
    rig.root.position.set(f.x-C,gh3(f.x,f.y),f.y-C);rig.root.rotation.y=f.yaw;
    rig.anim(time,f.mv,fighting,petFightAt,petAtkN);return;   /* v5_221 fighting = in combat or the pet attacked in the last 4 s: the dragon flies, otherwise it lands. v5_222 every pet plays its fight animation */   /* v5_221 fighting = in combat or the pet attacked in the last 4 s: the dragon flies, otherwise it lands */
  }
  /* fallback (pets3d.js missing or the model failed): billboard sprite of the icon */
  if(T.petKey!==P.pet||!T.petSp){
    if(T.petSp){T.sc.remove(T.petSp);T.petSp.material.dispose()}
    const e=petSprite(P.pet);if(!e.tex)e.tex=new THREE.CanvasTexture(e.cv);
    const m=new THREE.SpriteMaterial({map:e.tex,transparent:true,depthWrite:false});
    T.petSp=new THREE.Sprite(m);T.sc.add(T.petSp);T.petKey=P.pet;
  }
  const sp=T.petSp,sz=petParse(P.pet).s===0?38:50;
  sp.visible=true;sp.scale.set(sz,sz,1);sp.position.set(f.x-C,gh3(f.x,f.y)+sz*.46+hop,f.y-C);
}
function petDraw2D(){
  const hop=petStep(false);if(!P.pet||!P.pf)return;
  const e=petSprite(P.pet);if(!e.ok&&petParse(P.pet).s===0)return;
  const f=P.pf,x=f.x-cam.x,y=f.y-cam.y,sz=petParse(P.pet).s===0?36:46;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+2,sz*.3,sz*.11,0,0,6.2832);ctx.fill();
  ctx.drawImage(e.cv,x-sz/2,y-sz*.9-hop,sz,sz);
}

/* ---------- OTHER PLAYERS' PETS (v5_201): each peer reports its summoned pet key (q.pet, from the server 'pt' field); it is drawn following that player. ---------- */
/* follower position for a peer (same easing / offset as your own pet, see petStep) */
function peerPetStep(q,is3){
  if(!q.pet)return 0;
  const now=performance.now(),dt=Math.min(.1,q.pfT?(now-q.pfT)/1000:.016);q.pfT=now;
  const yaw=is3&&typeof camView!=='undefined'?camView.yaw:0,rx=Math.cos(yaw),ry=-Math.sin(yaw);
  const tx=q.x+rx*54,ty=q.y+ry*54;
  if(!q.pf||Math.hypot(tx-q.pf.x,ty-q.pf.y)>700)q.pf={x:tx,y:ty,mv:0};
  const f=q.pf,k=1-Math.exp(-7*dt),ox=f.x,oy=f.y;f.x+=(tx-f.x)*k;f.y+=(ty-f.y)*k;
  f.vx=f.x-ox;f.vy=f.y-oy;f.dt=dt;const sp=Math.hypot(f.x-ox,f.y-oy)/Math.max(dt,.001);f.mv+=((sp>40?1:0)-f.mv)*Math.min(1,dt*10);
  f.ph=(f.ph||0)+dt*(2.5+f.mv*7);
  return f.mv>.05?Math.abs(Math.sin(f.ph))*7*f.mv+2:Math.sin(f.ph)*1.6+2.5;
}
/* 3D: list = the peers drawn this frame (rpl). Pets of peers that left, were dismissed or are out of range are removed. */
function peerPets3(list){
  const T=T3,map=T.rpt||(T.rpt=new Map()),seen=new Set();
  for(const q of list){
    if(!q.pet)continue;
    peerPetStep(q,true);
    let h=map.get(q);if(!h){h={};map.set(q,h)}
    const rig=petRigFor(h,T.sc,q.pet),f=q.pf;
    if(!rig||!f)continue;
    seen.add(q);
    const want=f.mv>.3&&Math.hypot(f.vx||0,f.vy||0)>.05?Math.atan2(f.vx,f.vy):Math.PI/2-q.face;
    if(f.yaw===undefined)f.yaw=want;
    let d=want-f.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw+=d*Math.min(1,(f.dt||.016)*7);
    rig.root.visible=true;rig.root.scale.setScalar(PET_WORLD_K);
    rig.root.position.set(f.x-C,gh3(f.x,f.y),f.y-C);rig.root.rotation.y=f.yaw;
    if(q.swing>0||q.hurt>0)q.fightUntil=time+5;   /* v5_221 a peer is fighting while it swings / gets hurt (+5 s): its dragon flies */
    if(q.swing>.1&&time-(q.petAtkAt||-99)>1.2){q.petAtkAt=time;q.petAtkN=(q.petAtkN|0)+1}   /* v5_222 their pet strikes along with each of their swings (at most every 1.2 s) */
    rig.anim(time,f.mv,time<(q.fightUntil||0),q.petAtkAt,q.petAtkN);
  }
  for(const [q,h] of map)if(!seen.has(q)){
    if(h.pr){T.sc.remove(h.pr.root);try{h.pr.dispose()}catch(e){}h.pr=null}
    map.delete(q);
  }
}
/* 2D: draw a peer's pet (called from drawRemote) */
function peerPetDraw2D(q){
  const hop=peerPetStep(q,false);if(!q.pet||!q.pf)return;
  const e=petSprite(q.pet);if(!e.ok&&petParse(q.pet).s===0)return;
  const f=q.pf,x=f.x-cam.x,y=f.y-cam.y,sz=petParse(q.pet).s===0?36:46;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+2,sz*.3,sz*.11,0,0,6.2832);ctx.fill();
  ctx.drawImage(e.cv,x-sz/2,y-sz*.9-hop,sz,sz);
}
/* ---------- input ---------- */
const keys={};
window.addEventListener('keydown',e=>{
  if(!started)return;
  if(e.target&&e.target.tagName==='INPUT')return;
  const k=e.key.toLowerCase();
  if(k==='enter'){e.preventDefault();openChat();return}
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  keys[k]=true;
  if(e.repeat)return;
  if(SLOTKEYS.includes(k))manualSkill(SLOTKEYS.indexOf(k));else if(k==='q')usePot('hp');else if(k==='z')usePot('qi');else if(k==='y')usePot('ck');else if(k==='x')useTp();else if(k==='b')toggleBag();else if(k==='n')openShop();else if(k==='m')toggleMap();else if(k==='k')toggleBook();else if(k==='i')togglePchat();else if(k==='v')toggle3D();else if(k==='p')togglePvpMode();else if(k==='c')cycleSkin();
  else if(k===' ')doJump(); /* v5_169 Space = jump (attack nearest is F) */
  else if(k==='e')startMine();
  else if(k==='f'){const m=(P.sel&&!P.sel.dead&&!P.sel.isPl)?P.sel:nearest(320);if(m){P.target=m;P.task=null;P.mv=null;P.fatk=true}} /* F = attack nearest */
  else if(k==='o')openForge();else if(k==='g')openWorlds();else if(k==='h')openWh();
  else if(k==='escape'){cpHide();$('forge').hidden=true;$('worlds').hidden=true;$('book').hidden=true;$('wardrobe').hidden=true;$('menu').hidden=true;statsToggle(false);if(!$('bag').hidden)closeBag();$('shop').hidden=true;closeWh()}
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
$('bChat').addEventListener('click',toggleChat);
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false});

let cam={x:0,y:0};
const camDrag={on:false,x:0,y:0,moved:0,t:-1e9};
cv.style.touchAction='none';
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&(e.button===2||e.button===1)){camDrag.on=true;camDrag.x=e.clientX;camDrag.y=e.clientY;camDrag.moved=0}});
window.addEventListener('pointermove',e=>{
  if(!camDrag.on||e.pointerType!=='mouse'||!(e.buttons&6)){if(camDrag.on&&!(e.buttons&6))camDrag.on=false;return}
  const dx=e.clientX-camDrag.x,dy=e.clientY-camDrag.y;camDrag.x=e.clientX;camDrag.y=e.clientY;camDrag.moved+=Math.abs(dx)+Math.abs(dy);
  if(camDrag.moved>6){camDrag.t=performance.now();camAdj(-dx*.006,dy*.004)}
});
window.addEventListener('pointerup',e=>{if(camDrag.on&&e.pointerType==='mouse'){camDrag.on=false;if(camDrag.moved>6)camDrag.t=performance.now()}});
/* two-finger camera on touch screens: sideways = rotate, up/down = tilt, pinch = zoom */
const camTouch=new Map();let camMid=null,camDist=0;
function camTouchInfo(){const a=[...camTouch.values()];if(a.length<2)return null;return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}}
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;camTouch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(camTouch.size===2){P.mv=null;const i=camTouchInfo();camMid={x:i.x,y:i.y};camDist=i.d}});
window.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||!camTouch.has(e.pointerId))return;
  camTouch.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const i=camTouchInfo();if(!i||!camMid)return;
  if(camDist>20&&i.d>20&&MODE3D)T3.zoom=clamp(T3.zoom*camDist/i.d,.55,2.2);
  camMid={x:i.x,y:i.y};camDist=i.d;P.mv=null;
});
/* v5_110 CONTROLS. PC: left click = move (marker shows where) / select / attack, right-drag or middle-drag = rotate + tilt, wheel = zoom, plain right click on a player = PvP.
   Phone: one tap = move (or select a monster / player / ore), touch and drag = rotate + tilt, pinch = zoom, double tap on a monster or player = attack. */
const lc={id:null,x:0,y:0,moved:0,ev:null};
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0){lc.id=null;return}
  if(e.pointerType==='touch'&&camTouch.size>=2){lc.id=null;return} /* second finger: two-finger camera takes over */
  lc.id=e.pointerId;lc.x=e.clientX;lc.y=e.clientY;lc.moved=0;lc.ev={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType,button:0};
});
window.addEventListener('pointermove',e=>{
  if(lc.id===null||e.pointerId!==lc.id)return;
  if(e.pointerType==='touch'&&camTouch.size>=2){lc.id=null;return}
  const dx=e.clientX-lc.x,dy=e.clientY-lc.y;lc.x=e.clientX;lc.y=e.clientY;lc.moved+=Math.abs(dx)+Math.abs(dy);
  if(lc.moved>10&&e.pointerType!=='mouse'){camAdj(-dx*.006,dy*.004)}
});
const lcEnd=e=>{if(lc.id===null||e.pointerId!==lc.id)return;const was=e.type==='pointerup'&&lc.moved<=(e.pointerType==='mouse'?8:10);lc.id=null;if(was)cvClick(lc.ev)};
window.addEventListener('pointerup',lcEnd);window.addEventListener('pointercancel',lcEnd);
const camTouchEnd=e=>{if(e.pointerType!=='touch')return;camTouch.delete(e.pointerId);camMid=null};
window.addEventListener('pointerup',camTouchEnd);window.addEventListener('pointercancel',camTouchEnd);
addEventListener('keydown',e=>{
  if(!started||/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||''))return;
  if(e.key==='['){camAdj(-.12,0)}else if(e.key===']'){camAdj(.12,0)}else if(e.key==='PageUp'){camAdj(0,.06)}else if(e.key==='PageDown'){camAdj(0,-.06)}else if(e.key==='Home'){camView.yaw=0;camView.tilt=CAM_TILT0}
});
cv.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(e.pointerType==='touch')return; /* a long press on a phone is not a click */
  if(performance.now()-camDrag.t<450)return; /* a right-drag rotated the camera */
  if(!started||P.dead>0||!$('forge').hidden)return;
  const r=cv.getBoundingClientRect(),w3=(MODE3D&&T3.r)?pick3(e):null,wx=w3?w3.x:e.clientX-r.left+cam.x,wy=w3?w3.y:e.clientY-r.top+cam.y;
  const q=MP?(scrPick(e,[...NET.peers.values()].filter(o=>!o.dead))||peerAt(wx,wy,w3?20:0)):null;
  /* v5_110 right button: drag = rotate the camera; a plain right click on a player = PvP select / attack. (Moving is the LEFT click again.) */
  if(!q)return;
  if(P.sel===q)startPvp(q);   /* 2nd right click on the selected player: attack */
  else P.sel=q;               /* 1st right click: select only */
});
let tapO=null,tapT=0;
function cvClick(e){
  if(!started||P.dead>0||!$('forge').hidden)return;
  const r=cv.getBoundingClientRect();
  const w3=(MODE3D&&T3.r)?pick3(e):null,wx=w3?w3.x:e.clientX-r.left+cam.x,wy=w3?w3.y:e.clientY-r.top+cam.y,ex=w3?20:0;
  if(inTown()&&dist(NPC.x,NPC.y,wx,wy)<46+ex){openShop();return}
  /* touch: tapping another player SELECTS them (no right-click on a phone); the action bar under the target frame offers Inspect / Attack / Party / Friend / Whisper */
  if(MP&&(PHONE||e.pointerType==='touch'||e.pointerType==='pen')){
    const q=scrPick(e,[...NET.peers.values()].filter(o=>!o.dead))||peerAt(wx,wy,ex+14);
    if(q){
      const now=performance.now();
      if(P.sel===q&&tapO===q&&now-tapT<450){tapT=0;startPvp(q);return} /* v5_110 double tap on a player = attack (PvP) */
      P.sel=q;if(P.target&&P.target!==q)P.target=null;tapO=q;tapT=now;return}
  }
  /* monsters: 1st left click SELECTS (nothing attacks yet), 2nd left click on the same monster ATTACKS it */
  if(!pvpOnly()){
    let m=scrPick(e,mons.filter(o=>!o.dead&&!o.pend));
    if(!m){let bd=1e9;for(const o of mons){if(o.dead)continue;const d=dist(o.x,o.y,wx,wy);if(d<o.r+50+ex&&d<bd){bd=d;m=o}}} /* v5_109 bigger click area */
    if(m){
      const now=performance.now(),touch=e.pointerType==='touch'||e.pointerType==='pen';
      /* mouse: 2nd click on the selected monster attacks; touch: DOUBLE TAP (within 0.45 s) attacks, a single tap only selects */
      if(P.sel===m&&(!touch||(tapO===m&&now-tapT<450))){P.target=m;P.task=null;P.mv=null;tapT=0}
      else{P.sel=m;tapO=m;tapT=now}
      return}
  }
  /* players are NOT targeted with the left button: PvP is right click only (contextmenu handler above) */
  for(const o of ores){
    if(o.cd<=0&&dist(o.x,o.y,wx,wy)<50+ex){P.sel=null;P.task=o;P.target=null;P.mv=null;P.mine=0;return}
  }
  /* v5_110 left click / single tap on the ground = move there. A ripple + a marker on the ground show the destination. */
  if(MODE3D&&T3.r&&!w3)return; /* clicked the sky / above the horizon: no ground point */
  if(PHONE&&P.tapMove===false)return; /* v5_134 phone option 'Tap to move' is off: the joystick is the only way to walk (monsters, ore and the shop can still be tapped) */
  P.sel=null;P.mv={x:wx,y:wy};P.target=null;P.task=null;stopMine('Auto-mine off.');
  ring(wx,wy,46,'#8ff0c4');ring(wx,wy,26,'#ffffff');
}

const joy={x:0,y:0,id:null};
const joyEl=$('joy'),joyKnob=joyEl.firstElementChild;
function joyMove(e){
  const r=joyEl.getBoundingClientRect();
  let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const l=Math.hypot(dx,dy),m=r.width/2;
  if(l>m){dx=dx/l*m;dy=dy/l*m}
  joy.x=dx/m;joy.y=dy/m;
  joyKnob.style.transform='translate('+dx+'px,'+dy+'px)';
}
joyEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)joyMove(e)});
function joyEnd(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;joyKnob.style.transform=''}
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
/* v5_117 TAPS WHILE THE JOYSTICK IS HELD: phones often do not send a 'click' for a tap made while another finger is already down (the joystick finger),
   so every button that listens for 'click' (Auto, Mine, Land, menu and bag icons, ...) looked dead while walking. Here a tap on such a control made during a
   multi-finger touch fires the click itself on release, and the browser's own (late or duplicate) click for that tap is swallowed so it never runs twice.
   Skill slots, Attack, Dodge and the potion buttons already react on pointerdown and are left alone. A single-finger tap is untouched. */
(function(){
  const SEL='button,[role="button"],.ic,label,a[href],input[type="checkbox"],input[type="radio"]';
  const act=new Set(),tap=new Map();let blockEl=null,blockUntil=0,synth=false;
  const skip=el=>el.disabled||(el.closest&&el.closest('.sk,#dodge,#joy,#saver,#bPot,#bPotQ,#bTp'));
  window.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    const other=act.size>0;act.add(e.pointerId);
    const el=e.target&&e.target.closest?e.target.closest(SEL):null;
    if(el&&!skip(el))tap.set(e.pointerId,{el,x:e.clientX,y:e.clientY,multi:other});
  },true);
  window.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch')return;
    const rec=tap.get(e.pointerId),multi=act.size>1;act.delete(e.pointerId);tap.delete(e.pointerId);
    if(!rec||!(rec.multi||multi))return;                              /* single-finger tap: the browser handles it */
    if(Math.hypot(e.clientX-rec.x,e.clientY-rec.y)>14)return;         /* it was a drag, not a tap */
    const t=document.elementFromPoint(e.clientX,e.clientY);
    if(!t||!(t===rec.el||rec.el.contains(t)))return;                  /* released off the button */
    blockEl=rec.el;blockUntil=performance.now()+600;synth=true;
    try{rec.el.click()}catch(_){}finally{synth=false}
  },true);
  window.addEventListener('pointercancel',e=>{act.delete(e.pointerId);tap.delete(e.pointerId)},true);
  window.addEventListener('click',e=>{                                /* swallow the browser's own click for a tap we already handled */
    if(synth||!blockEl||performance.now()>blockUntil)return;
    if(e.target===blockEl||blockEl.contains(e.target)){e.stopPropagation();e.preventDefault();blockEl=null}
  },true);
})();

/* v5_109 SCREEN SAVER / LOCK: while auto-hunt or auto-mine is on and nobody touched the screen for SAVER_IDLE seconds (v5_123: 300 = 5 minutes; any click / tap / key / wheel / drag resets it, plain mouse-cursor movement does not), a dark screen covers the game so a stray touch cannot do anything.
   Slide the handle to the right to unlock. The game keeps running underneath; the 3D world is not drawn meanwhile. */
const SAVER_IDLE=300,SV={on:false,last:performance.now(),t0:0,exp:0,coins:0,lvl:0,el:null,ex:0};
function saverTouch(){if(!SV.on)SV.last=performance.now()}
for(const ev of ['pointerdown','keydown','wheel'])window.addEventListener(ev,saverTouch,{capture:true,passive:true});
window.addEventListener('pointermove',e=>{if(e.buttons>0||e.pointerType==='touch')saverTouch()},{capture:true,passive:true}); /* v5_123: dragging (joystick, camera) is activity; a mouse cursor that just moves is not */
function saverBuild(){
  const d=document.createElement('div');d.id='saver';
  d.innerHTML='<div class="svbox"><div class="svt">World of Ascension</div><div class="svm" id="svMode"></div><div class="svs" id="svStat"></div><div class="svh" id="svHp"><i></i></div></div><div class="svsl" id="svSl"><div class="svk" id="svK">&#10095;&#10095;</div><span>Slide to unlock</span></div>';
  document.body.appendChild(d);SV.el=d;
  const k=d.querySelector('#svK'),sl=d.querySelector('#svSl');let drag=null;
  const max=()=>sl.clientWidth-k.offsetWidth-8;
  k.addEventListener('pointerdown',e=>{e.preventDefault();k.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,o:SV.ex}});
  k.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;SV.ex=clamp(drag.o+e.clientX-drag.x,0,max());k.style.transform='translateX('+SV.ex+'px)'});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;if(SV.ex>=max()*.85)saverOff();else{SV.ex=0;k.style.transition='transform .2s';k.style.transform='';setTimeout(()=>k.style.transition='',220)}};
  k.addEventListener('pointerup',end);k.addEventListener('pointercancel',end);
  /* swallow everything else so nothing reaches the game */
  for(const ev of ['pointerdown','pointerup','click','touchstart','touchend','contextmenu','wheel'])d.addEventListener(ev,e=>{if(e.target!==k)e.stopPropagation();if(ev==='contextmenu'||ev==='wheel')e.preventDefault()},{passive:false});
}
function saverOn(manual){
  if(SV.on)return;if(!SV.el)saverBuild();
  SV.manual=!!manual;SV.on=true;SV.t0=performance.now();SV.exp=0;SV.coins=P.coins;SV.lvl=P.lvl;SV.ex=0;$('svK').style.transform='';
  SV.el.classList.add('on');saverUpdate();
  try{if(window.SND)SND.hush(true)}catch(e){} /* v5_116: no sound at all while the saver covers the screen */
}
function saverOff(){if(!SV.on)return;SV.on=false;SV.last=performance.now();SV.ex=0;SV.el.classList.remove('on');try{if(window.SND)SND.hush(false)}catch(e){}}
function saverUpdate(){
  if(!SV.on)return;
  const m=Math.floor((performance.now()-SV.t0)/60000),h=Math.floor(m/60),f=n=>Math.round(n).toLocaleString();
  $('svMode').textContent=(auto||amine)?(auto?'Auto-hunt':'')+(auto&&amine?' + ':'')+(amine?'Auto-mine':'')+' running':'Screen locked';
  $('svStat').textContent='Lv. '+P.lvl+(P.lvl>SV.lvl?' (+'+(P.lvl-SV.lvl)+')':'')+'  \u00b7  EXP +'+f(SV.exp)+'  \u00b7  Coins '+(P.coins-SV.coins>=0?'+':'')+f(P.coins-SV.coins)+'  \u00b7  '+(h?h+'h ':'')+(m%60)+'m';
  $('svHp').firstChild.style.width=clamp(P.hp/maxHp()*100,0,100)+'%';
  const b=SV.el.querySelector('.svbox');b.style.transform='translate('+(Math.sin(performance.now()/9000)*18)+'vw,'+(Math.cos(performance.now()/7000)*14)+'vh)'; /* slow drift: no burn-in */
}
setInterval(()=>{
  const act=started&&P.dead<=0&&(auto||amine);
  if(SV.on){if(!act&&!SV.manual)saverOff();else saverUpdate();return}
  if(act&&performance.now()-SV.last>SAVER_IDLE*1000)saverOn();
},1000);
function toggleAuto(){auto=!auto;if(auto)stopMine();$('bAuto').classList.toggle('on',auto);say(auto?'Auto-hunt on.':'Auto-hunt off.','#8d9aa2')}
let amine=false,amT=0,amWait=false;
function nearestOre(){let best=null,bd=1e9;for(const o of ores){if(o.cd>0)continue;const d=dist(o.x,o.y,P.x,P.y);if(d<bd){bd=d;best=o}}return best}
function stopMine(msg){if(!amine)return;amine=false;amWait=false;$('bMine').classList.remove('on');if(msg)say(msg,'#8d9aa2')}
function startMine(){ /* toggle: keeps walking to the next ready ore vein after each one is mined */
  if(amine){stopMine('Auto-mine off.');P.task=null;P.mine=0;return}
  amine=true;amWait=false;amT=0;$('bMine').classList.add('on');
  if(auto){auto=false;$('bAuto').classList.remove('on')}
  const best=nearestOre();
  if(best){P.task=best;P.target=null;P.mv=null;P.mine=0;say('Auto-mine on. Heading to the nearest ore vein.','#8d9aa2')}
  else{amWait=true;say('Auto-mine on. No ore nodes are ready yet \u2014 waiting for one.','#8d9aa2')}
}
$('bAuto').addEventListener('click',()=>{if(started)toggleAuto()});
$('bMine').addEventListener('click',()=>{if(started)startMine()});
$('bForge').addEventListener('click',openForge);

const skWrap=$('skills');let skBtns=[],armed=3,rsvEl=null,rsvKey='';
const GLYPH={pierce:'\u2197',fan:'\u224b',nova:'\u2738',meteor:'\u2604',chain:'\u26a1',drain:'\u263e',might:'\u25b2',mend:'\u271a',heal:'\u271a',strike:'\u2694',cleave:'\u263d',leap:'\u27a4',flurry:'\u2736',kunai:'\u2734',shadowstep:'\u21af',venom:'\u2623',bladestorm:'\u274b',smoke:'\u2601',execute:'\u2620',siphon:'\u2665',rush:'\u21d2',bash:'\u25a3',charge:'\u27a4',quake:'\u2301',bulwark:'\u26e8',roar:'\u2742',counter:'\u21ba',hammer:'\u2692',ironskin:'\u25c6',shockwave:'\u224b',arrow:'\u27b6',volley:'\u2917',rain:'\u2602',blast:'\u2739',eagle:'\u25ce',gale:'\u21e0',trap:'\u26a1',stormarrow:'\u21af',wolves:'\u2658',soulburst:'\u2735',wail:'\u224b',chains:'\u26d3',soulheal:'\u271a',harvest:'\u2766',guardian:'\u2656',spiritbomb:'\u2600'};
for(const c of SIGD)for(const y of c)GLYPH[y[0]]=y[6]; /* v5_160 signature skill icons */
/* [right, bottom] of each button's centre, in HUD units, measured from the bottom-right corner (round slots 1-12, then the two large ones) */
const SLOTPOS=[[105,42],[154,42],[202,42],[250,42],[297,42],[345,42],[105,99],[154,99],[202,99],[250,99],[297,99],[345,99],[106,152],[34,148]];
function buildBar(){
  skWrap.innerHTML='';skBtns=[];
  const U=n=>'calc('+n+'*var(--u))',place=(el,rc,bc,sz)=>{el.style.right=U(rc-sz/2);el.style.bottom=U(bc-sz/2)};
  const atk=document.createElement('button');atk.type='button';atk.className='sk atk';atk.title='Attack nearest (F)';
  atk.innerHTML='<b>\u2694</b>';place(atk,52,67,64);
  atk.addEventListener('pointerdown',e=>{e.preventDefault();if(!started)return;if(P.sel&&!P.sel.dead&&P.sel.isPl){startPvp(P.sel);return}const m=(P.sel&&!P.sel.dead&&!P.sel.isPl)?P.sel:nearest(320);if(m){P.target=m;P.task=null;P.mv=null}});
  skWrap.appendChild(atk);
  rsvEl=document.createElement('div');rsvEl.className='rsv';rsvEl.hidden=true;rsvKey='';skWrap.appendChild(rsvEl);
  for(let i=0;i<NSLOT;i++){const s=SKILLS[EQ[i]],b=document.createElement('button');b.type='button';b.className='sk'+(i>=12?' big':'');
    if(i<12)place(b,SLOTPOS[i][0],SLOTPOS[i][1],40); /* R (12) and T (13) are positioned in CSS, left of the dodge pad */
    if(s)b.style.borderColor=s.col;b.title=(s?s.n:'Empty slot (K to equip)')+' ['+SLOTKEYS[i].toUpperCase()+']';
    b.innerHTML='<b'+(s?' style="color:'+s.col+'"':'')+'>'+(s?GLYPH[s.t]||'\u2726':'')+'</b><span class="kn">'+SLOTKEYS[i].toUpperCase()+'</span><em class="cdn"></em><i class="cdv"></i>';
    /* tap = cast, drag upward = toggle auto-cast for this slot */
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();const sy=e.clientY,u=parseFloat(getComputedStyle($('hud')).getPropertyValue('--u'))||1,thr=Math.max(14,14*u);let flipped=false;
      try{b.setPointerCapture(e.pointerId)}catch(_){}
      const mv=ev=>{if(!flipped&&sy-ev.clientY>thr){flipped=true;toggleAutoSkill(i)}};
      const end=ev=>{b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',end);if(!flipped&&ev.type==='pointerup')manualSkill(i)};
      b.addEventListener('pointermove',mv);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
    });
    skWrap.appendChild(b);skBtns.push(b)}
}
function toggleAutoSkill(i){
  if(i>=AUTO_SLOTS){say('Slots R and T have no auto-cast.','#8d9aa2');return}
  const id=EQ[i];if(id<0||!SKILLS[id])return;
  AUTOSK[i]=!AUTOSK[i];say(SKILLS[id].n+': auto-cast '+(AUTOSK[i]?'ON':'OFF'),AUTOSK[i]?'#5fd3a5':'#8d9aa2');save();
}
buildBar();
function equip(id){if((SKILLS[id].c||0)!==P.cls)return;const j=EQ.indexOf(id),o=EQ[armed];if(j>=0)EQ[j]=o;EQ[armed]=id;buildBar();renderBook();save()}
function renderBook(){
  const cb=$('bookCls');cb.innerHTML='';
  CLASSES.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===P.cls?' on':'');b.textContent=c.n;b.addEventListener('click',()=>switchClass(i));cb.appendChild(b)});
  $('bookClsD').textContent=CLASSES[P.cls].d;
  const sl=$('bookSlots');sl.innerHTML='';
  EQ.forEach((id,i)=>{const b=document.createElement('button');b.type='button';b.className='btn bk'+(i===armed?' on':'');b.textContent=(i+1)+(id>=0?' '+SKILLS[id].n:' -');b.title=id>=0?SKILLS[id].n:'empty';b.addEventListener('click',()=>{armed=i;renderBook()});sl.appendChild(b)});
  const rows=$('bookRows');rows.innerHTML='';
  SKILLS.map((s,id)=>[s,id]).filter(x=>(x[0].c||0)===P.cls).sort((a,b)=>(P.lvl>=b[0].lv)-(P.lvl>=a[0].lv)||a[1]-b[1]).forEach(([s,id])=>{const ok=P.lvl>=s.lv,row=document.createElement('div');row.className='row'+(ok?'':' lock');
    if(s.sig)row.classList.add('sig');
    const nm=document.createElement('b');nm.style.color=s.col;const ic=document.createElement('span');ic.className='sic';ic.textContent=GLYPH[s.t]||'\u2726';ic.style.color=s.col;ic.style.borderColor=s.col;nm.appendChild(ic);nm.appendChild(document.createTextNode(s.n));if(s.sig){const u=document.createElement('i');u.className='uq';u.textContent='\u2605 UNIQUE';nm.appendChild(u);row.title=(SIGD[s.c].find(y=>y[0]===s.t)||[])[5]||s.n}row.appendChild(nm);
    const b=document.createElement('button');b.type='button';const sl=EQ.indexOf(id);b.className='btn'+(sl>=0?' on':'');b.textContent=!ok?'Lv '+s.lv:(sl>=0?String(sl+1):'Equip');if(sl>=0)b.title='Equipped in slot '+(sl+1)+' (click to move to the selected slot)';b.disabled=!ok;b.addEventListener('click',()=>equip(id));row.appendChild(b);
    const sm=document.createElement('small');sm.textContent=TL[s.t]+(s.m?' · '+s.m.toFixed(1)+'x ATK':'')+' · '+skCostLbl(s)+' · '+s.cd+'s cooldown';row.appendChild(sm);rows.appendChild(row)});
}
function toggleBook(){if(!started)return;const b=$('book');b.hidden=!b.hidden;if(!b.hidden)renderBook()}
$('bBook').addEventListener('click',toggleBook);$('bookClose').addEventListener('click',()=>{$('book').hidden=true});
$('bookAuto').addEventListener('click',()=>{autoArrangeAll();buildBar();renderBook();save()});

/* ---------- wardrobe: skin / hair / outfit / headwear / aura ---------- */
const WD={tab:0,cls:0,raf:0,t:0};
/* tab = [label, option names, look field]. v5_53: every class (Cultivator included) has the SAME tabs and the SAME options. Armor = all class colour schemes pooled. */
function wdTabs(cl){
  if(!window.AL3D)return [];const A=AL3D;
  return [['Gender',A.GENDERS,'g'],['Skin',A.SKINS.map(x=>x.n),'p'],['Hair',A.HAIRS,'h'],['Outfit',A.OUTFITS,'o'],['Headwear',A.HEADS,'w'],['Armor',A.ARMORS,'r'],['Accent',A.ACCENTS.map(x=>x.n),'x'],['Aura',A.AURAS,'a']];
}
/* the class tab being edited (WD.cls) is independent of the class you are playing (P.cls); each class has its own saved look */
const wdLookOf=c=>c===P.cls?SKIN:normLook(LOOKS[c]|0);
function wdApply(v){
  if(WD.cls===P.cls){setLook(v);return}
  LOOKS[WD.cls]=normLook(v);save();cloudFlush();wdRender();
}
function wdSet(k,v){const l=AL3D.look(wdLookOf(WD.cls));l[k]=v;wdApply(AL3D.packLook(l))}
function wdRender(){
  const W=$('wardrobe');if(!W||W.hidden||!window.AL3D)return;
  if(WD.cls===undefined||WD.cls<0||WD.cls>=CLASSES.length)WD.cls=P.cls;
  const cl=WD.cls,lk=wdLookOf(cl),tabs=wdTabs(cl),T=$('wdTabs'),G=$('wdGrid'),l=AL3D.look(lk);if(WD.tab>=tabs.length)WD.tab=0;
  $('wdTitle').textContent='Wardrobe';$('wdClsName').textContent=CLASSES[cl].n;
  const CT=$('wdClassTabs');CT.innerHTML='';
  CLASSES.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===cl?' on':'')+(i===P.cls?' cur':'');b.textContent=c.n;b.title=i===P.cls?c.n+' (your current class)':c.n;
    b.addEventListener('click',()=>{WD.cls=i;WD.tab=0;wdRender()});CT.appendChild(b)});
  T.innerHTML='';tabs.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(i===WD.tab?' on':'');b.textContent=t[0];b.addEventListener('click',()=>{WD.tab=i;wdRender()});T.appendChild(b)});
  G.innerHTML='';const names=tabs[WD.tab][1],fk=tabs[WD.tab][2],cur=l[fk];
  names.forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';if(i===cur)b.className='on';
    if(fk==='p'){const p=AL3D.SKINS[i],sw=document.createElement('span');sw.className='sw';
      for(const c of (cl>0?[p.skin,p.hair]:[p.robe,p.trim,p.sash])){const e=document.createElement('i');e.style.background=c;sw.appendChild(e)}
      const u=document.createElement('u');u.style.background=p.skin;sw.appendChild(u);b.appendChild(sw)}
    if(fk==='r'){const p=i>0?AL3D.ARMOR_POOL[i-1]:cl>0?AL3D.CLS_SCHEMES[cl][0]:null,sw=document.createElement('span');sw.className='sw';
      const q=AL3D.SKINS[l.p%AL3D.SKINS.length];
      for(const c of (p?[p.r,p.s,p.b]:[q.robe,q.sash,q.boot])){const e=document.createElement('i');e.style.background=c;sw.appendChild(e)}b.appendChild(sw)}
    if(fk==='x'){const sw=document.createElement('span');sw.className='sw';sw.style.background=AL3D.ACCENTS[i].c||'#9aa5ab';b.appendChild(sw)}
    if(fk==='a'){const sw=document.createElement('span');sw.className='sw';const c=AL3D.AURA_CFG[i];sw.style.background='radial-gradient(circle,'+(c.col||c.ring)+','+c.ring+' 55%,#10161a)';b.appendChild(sw)}
    b.appendChild(document.createTextNode(n));
    b.addEventListener('click',()=>wdSet(fk,i));G.appendChild(b)});
  const cur2=G.querySelector('.on');if(cur2&&cur2.scrollIntoView)try{cur2.scrollIntoView({block:'nearest'})}catch(e){}
  const S=skinOf(lk);
  $('wdName').innerHTML='<b>'+AL3D.SKINS[S.pi].n+'</b> ('+AL3D.GENDERS[S.ge]+')<br>'+AL3D.HAIRS[S.hs]+' / '+AL3D.OUTFITS[S.ot]+' / '+AL3D.HEADS[S.hw]+'<br>'+AL3D.ARMORS[S.ar]+' / '+AL3D.ACCENTS[S.ax].n+' / '+AL3D.AURAS[S.au];
}
/* wardrobe preview: the same rotatable Three.js character the bag shows (drag to spin, double-click to face front), for the class tab being edited.
   It has its own WebGL view; if 3D is off or unavailable the flat 2D avatar is painted instead. */
const WDV={r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
const wdWord=()=>(wdLookOf(WD.cls)|((WD.cls&7)<<21))>>>0;
function wdInit3(){
  if(WDV.r)return true;if(WDV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('wdCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();WDV.fail=1;WDV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(wdWord());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(WDV,{r,sc,cam,rig});
  }catch(e){console.error(e);WDV.fail=1;WDV.r=null;return false}
  return true;
}
function paintWd3(){
  if(!wdInit3())return false;
  const {r,sc,cam,rig}=WDV,t=performance.now()/1000,w=wdWord();
  if(rig.skin!==w)AL3D.setSkin(rig,w); /* switching class tab / changing an option re-dresses the model */
  if(WDV.drag)WDV.vel*=.7;else{WDV.yaw+=WDV.vel;WDV.vel*=.94;if(Math.abs(WDV.vel)<.0004)WDV.vel=0}
  rig.root.rotation.y=WDV.yaw;
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,ft:armorFireTier(P),hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function wdPreview(){
  WD.raf=0;const W=$('wardrobe');if(!W||W.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintWd3());
    if(WDV.mode!==(ok?1:0)){WDV.mode=ok?1:0;$('wdCv3').hidden=!ok;$('wdCv').hidden=ok;$('wdHint').hidden=!ok;$('wdStage').classList.toggle('rot3',ok);if(!ok){WDV.drag=0;$('wdStage').classList.remove('drag')}}
    if(!ok){
      const kS=SKIN,kC=P.cls;
      try{SKIN=wdLookOf(WD.cls);P.cls=WD.cls;paintAvatar($('wdCv'))}finally{SKIN=kS;P.cls=kC}
    }
  }
  WD.raf=requestAnimationFrame(wdPreview);
}
(function(){
  const st=$('wdStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||(e.pointerType==='mouse'&&e.button!==0))return;
    WDV.drag=1;WDV.lx=e.clientX;WDV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!WDV.drag)return;const dx=e.clientX-WDV.lx;WDV.lx=e.clientX;WDV.yaw+=dx*.012;WDV.vel=dx*.012});
  const end=()=>{WDV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',()=>{WDV.yaw=0;WDV.vel=0});
})();
function paintClassAvatar(cv,cl){
  const c=cv.getContext('2d'),S0=skinOf(SKIN),S=clsPal(S0,cl),t=performance.now()/1000,k=cv.width/220,keep=ctx,keepCS=CS;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
  const AC=(AL3D.AURA_CFG[S.au])||{ring:'#5fd3a5'};
  ctx=c;CS=S;
  try{
    c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);
    const g=c.createRadialGradient(0,0,4,0,0,34);g.addColorStop(0,hexA(AC.ring,0));g.addColorStop(.4,hexA(AC.ring,0));g.addColorStop(.72,hexA(AC.ring,.34));g.addColorStop(1,hexA(AC.ring,0));c.fillStyle=g;c.beginPath();c.arc(0,0,34,0,6.2832);c.fill();
    c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,13,15,5,0,0,6.2832);c.fill();
    fgBody(c,0,0,fgTier(P.alv));
    c.translate(0,Math.sin(t*2.2)*.7);
    cLine(c,-3,6,-3,13,5,S.boot);cLine(c,3,6,3,13,5,S.boot);cDot(c,-3,13.5,3,mixc(S.boot,'#000000',.4));cDot(c,3,13.5,3,mixc(S.boot,'#000000',.4));
    c.fillStyle=S.robe;c.beginPath();c.moveTo(-8,-14);c.quadraticCurveTo(-9,-4,-12,9);c.lineTo(12,9);c.quadraticCurveTo(9,-4,8,-14);c.closePath();c.fill();
    c.fillStyle=mixc(S.robe,'#ffffff',.14);c.beginPath();c.moveTo(-2,-14);c.lineTo(2,-14);c.lineTo(3,9);c.lineTo(-3,9);c.fill();
    c.fillStyle=S.sash;c.fillRect(-8,-3,16,3);c.fillStyle=S.trim;c.fillRect(-9,-14,18,3);
    look2Outfit(c,S,0,0,0);
    cLine(c,-7,-12,-10,-4,S.ot===4?8:4,S.robe);cDot(c,-10,-3.6,2.4,S.skin);
    clsBack(cl,1,0);look2Back(c,S,0,t,0);
    cDot(c,0,-20,7,S.skin);
    look2Hair(c,S,0,t,0);
    clsFront(cl,1);look2Wear(c,S,0,t,0);
    const ex=10,ey=-5,sa=-1.35;
    cLine(c,5,-12,ex,ey,4,S.robe);
    clsWeapon(cl,ex,ey,sa,26);
    fgWeapon(c,cl,ex,ey,sa,26,fgTier(P.wlv));
    cDot(c,ex,ey,2.6,S.skin);
    c.restore();
    if(S.au>0){c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);look2Aura(c,S,0,0,t);c.restore()}
  }finally{ctx=keep;CS=keepCS}
}
function paintAvatar(cv){
  if(P.cls>0&&P.cls<CLPAL.length){paintClassAvatar(cv,P.cls);return}
  const c=cv.getContext('2d'),S=clsPal(skinOf(SKIN),0),t=performance.now()/1000;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
  const k=cv.width/220;
  const AC=(AL3D.AURA_CFG[S.au])||{ring:'#5fd3a5'};
  c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);
  const g=c.createRadialGradient(0,0,4,0,0,34);g.addColorStop(0,hexA(AC.ring,0));g.addColorStop(.4,hexA(AC.ring,0));g.addColorStop(.72,hexA(AC.ring,.34));g.addColorStop(1,hexA(AC.ring,0));c.fillStyle=g;c.beginPath();c.arc(0,0,34,0,6.2832);c.fill();
  c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,13,15,5,0,0,6.2832);c.fill();
  fgBody(c,0,0,fgTier(P.alv));
  const bob=Math.sin(t*2.2)*.7;c.translate(0,bob);
  cLine(c,-3,6,-3,13,5,S.boot);cLine(c,3,6,3,13,5,S.boot);cDot(c,-3,13.5,3,mixc(S.boot,'#000000',.4));cDot(c,3,13.5,3,mixc(S.boot,'#000000',.4));
  const sway=Math.sin(t*1.6)*.6;
  c.fillStyle=S.robe;c.beginPath();c.moveTo(-8,-14);c.quadraticCurveTo(-9,-4,-12,9);c.lineTo(12,9);c.quadraticCurveTo(9,-4,8,-14);c.closePath();c.fill();
  c.fillStyle=mixc(S.robe,'#ffffff',.14);c.beginPath();c.moveTo(-2,-14);c.lineTo(2,-14);c.lineTo(3,9);c.lineTo(-3,9);c.fill();
  c.fillStyle=S.sash;c.fillRect(-8,-3,16,3);c.fillStyle=S.trim;c.fillRect(-9,-14,18,3);
  look2Outfit(c,S,0,sway,0);
  const aw=S.ot===4?8:4;
  cLine(c,-7,-12,-10,-4,aw,S.robe);cLine(c,7,-12,10,-4,aw,S.robe);cDot(c,-10,-3.6,2.4,S.skin);cDot(c,10,-3.6,2.4,S.skin);
  cLine(c,10,-4,10,-30,2.4,'#cfe3f0');cLine(c,8,-4,12,-4,3.4,S.trim);
  fgWeapon(c,0,10,-4,-Math.PI/2,26,fgTier(P.wlv));
  look2Back(c,S,0,t,0);cDot(c,0,-20,7,S.skin);look2Front(c,S,0,t,0);
  c.restore();
  if(S.au>0){c.save();c.scale(k,k);c.translate(110,172);c.scale(4.1,4.1);look2Aura(c,S,0,0,t);c.restore()}
}
/* bag avatar: in 3D mode a second small WebGL view shows the same Three.js character rig the game uses (all gear, look, aura),
   and you can drag it left/right to spin it (double-click resets to the front). In 2D mode, or if WebGL is unavailable, the 2D avatar is painted as before. */
const BAGV={raf:0,r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
function bagInit3(){
  if(BAGV.r)return true;if(BAGV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('bagCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();BAGV.fail=1;BAGV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(SKW());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(BAGV,{r,sc,cam,rig,sh});
  }catch(e){console.error(e);BAGV.fail=1;BAGV.r=null;return false}
  return true;
}
function paintBag3(){
  if(!bagInit3())return false;
  const {r,sc,cam,rig}=BAGV,t=performance.now()/1000;
  if(rig.skin!==SKW())AL3D.setSkin(rig,SKW());
  if(BAGV.drag)BAGV.vel*=.7;else{BAGV.yaw+=BAGV.vel;BAGV.vel*=.94;if(Math.abs(BAGV.vel)<.0004)BAGV.vel=0}
  rig.root.rotation.y=BAGV.yaw;{const hp=petPreview(BAGV,t);rig.root.position.x=hp?-16:0;BAGV.sh.position.x=rig.root.position.x}
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,ft:armorFireTier(P),hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function bagPreview(){
  BAGV.raf=0;const B=$('bag');if(!B||B.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintBag3());
    if(BAGV.mode!==(ok?1:0)){BAGV.mode=ok?1:0;$('bagCv3').hidden=!ok;$('bagCv').hidden=ok;$('bagHint').hidden=!ok;$('bagStage').classList.toggle('rot3',ok);if(!ok){BAGV.drag=0;$('bagStage').classList.remove('drag')}}
    if(!ok)paintAvatar($('bagCv'));
  }
  BAGV.raf=requestAnimationFrame(bagPreview);
}
(function(){
  const st=$('bagStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||e.target.closest('.bslot')||(e.pointerType==='mouse'&&e.button!==0))return;
    BAGV.drag=1;BAGV.lx=e.clientX;BAGV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!BAGV.drag)return;const dx=e.clientX-BAGV.lx;BAGV.lx=e.clientX;BAGV.yaw+=dx*.012;BAGV.vel=dx*.012});
  const end=()=>{BAGV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',e=>{if(e.target.closest('.bslot'))return;BAGV.yaw=0;BAGV.vel=0});
})();
/* v5_131 Forge window avatar: same 3D / 2D preview as the bag, with its own canvases and renderer */
const FGV={raf:0,r:null,fail:0,yaw:0,vel:0,drag:0,lx:0,mode:-1};
function fgInit3(){
  if(FGV.r)return true;if(FGV.fail)return false;
  try{
    if(!T3.r)init3();
    const cv=$('fgCv3'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,stencil:false});
    r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(380,448,false);
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();FGV.fail=1;FGV.r=null});
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,380/448,10,2000);
    sc.add(new THREE.AmbientLight(0xffffff,.8*LK));const sun=new THREE.DirectionalLight(0xffffff,.9*LK);sun.position.set(120,220,260);sc.add(sun);
    const rig=AL3D.makePlayer(SKW());sc.add(rig.root);
    const sh=new THREE.Mesh(new THREE.CircleGeometry(15,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));sh.position.y=.3;sc.add(sh);
    cam.position.set(0,48,190);cam.lookAt(0,32,0);
    Object.assign(FGV,{r,sc,cam,rig,sh});
  }catch(e){console.error(e);FGV.fail=1;FGV.r=null;return false}
  return true;
}
function paintFg3(){
  if(!fgInit3())return false;
  const {r,sc,cam,rig}=FGV,t=performance.now()/1000;
  if(rig.skin!==SKW())AL3D.setSkin(rig,SKW());
  if(FGV.drag)FGV.vel*=.7;else{FGV.yaw+=FGV.vel;FGV.vel*=.94;if(Math.abs(FGV.vel)<.0004)FGV.vel=0}
  rig.root.rotation.y=FGV.yaw;{const hp=petPreview(FGV,t);rig.root.position.x=hp?-16:0;FGV.sh.position.x=rig.root.position.x}
  AL3D.animPlayer(rig,{mvAmt:0,anim:0,swing:0,wlv:P.wlv,alv:P.alv,ft:armorFireTier(P),hurt:0,bfT:0,sh:0,dead:0},t,realmIdx());
  r.render(sc,cam);return true;
}
function fgPreview(){
  FGV.raf=0;const B=$('forge');if(!B||B.hidden)return;
  if(!document.hidden){
    const ok=!!(MODE3D&&window.THREE&&window.AL3D&&paintFg3());
    if(FGV.mode!==(ok?1:0)){FGV.mode=ok?1:0;$('fgCv3').hidden=!ok;$('fgCv').hidden=ok;$('fgHint').hidden=!ok;$('fgStage').classList.toggle('rot3',ok);if(!ok){FGV.drag=0;$('fgStage').classList.remove('drag')}}
    if(!ok)paintAvatar($('fgCv'));
  }
  FGV.raf=requestAnimationFrame(fgPreview);
}
(function(){
  const st=$('fgStage');
  st.addEventListener('pointerdown',e=>{if(!st.classList.contains('rot3')||e.target.closest('.bslot')||(e.pointerType==='mouse'&&e.button!==0))return;
    FGV.drag=1;FGV.lx=e.clientX;FGV.vel=0;st.classList.add('drag');try{st.setPointerCapture(e.pointerId)}catch(_){}});
  st.addEventListener('pointermove',e=>{if(!FGV.drag)return;const dx=e.clientX-FGV.lx;FGV.lx=e.clientX;FGV.yaw+=dx*.012;FGV.vel=dx*.012});
  const end=()=>{FGV.drag=0;st.classList.remove('drag')};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('dblclick',e=>{if(e.target.closest('.bslot'))return;FGV.yaw=0;FGV.vel=0});
})();
function toggleWardrobe(){
  const W=$('wardrobe');if(!W||!window.AL3D)return;
  if(W.hidden){if(!started)return;WD.cls=P.cls;WD.tab=0;W.hidden=false;wdRender();if(!WD.raf)WD.raf=requestAnimationFrame(wdPreview)}else W.hidden=true;
}
$('wdClose').addEventListener('click',()=>{$('wardrobe').hidden=true});
$('wdReset').addEventListener('click',()=>wdApply(AL3D.packLook({p:0,h:WD.cls>0?7:0,o:0,w:0,a:0,g:AL3D.look(wdLookOf(WD.cls)).g,r:0,x:0})));
$('wdRand').addEventListener('click',()=>{const A=AL3D,c=WD.cls,R=n=>Math.random()*n|0,l={p:R(A.SKINS.length),h:R(A.HAIRS.length),o:R(A.OUTFITS.length),w:R(A.HEADS.length),a:R(A.AURAS.length),g:A.look(wdLookOf(c)).g,r:R(A.ARMORS.length),x:R(A.ACCENTS.length)};wdApply(A.packLook(l))});
$('wardrobe').addEventListener('mousedown',e=>{if(e.target.id==='wardrobe')$('wardrobe').hidden=true});

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
  pot.hp=Math.max(0,pot.hp-dt);pot.qi=Math.max(0,pot.qi-dt);pot.tp=Math.max(0,pot.tp-dt);pot.ck=Math.max(0,pot.ck-dt);
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

  P.rsvA=-1;
  if(P.rsv>=0){const rid=EQ[P.rsv];P.rsvT-=dt;
    if(P.dead>0||P.rsvT<=0||rid<0||SCD[rid]>0||!skCanPay(SKILLS[rid]))P.rsv=-1;
    else if(!(P.skLock>0)||P.rsv>=AUTO_SLOTS){const r=P.rsv;P.rsv=-1;useSkill(r)}} /* v5_189 reserved skill fires first, as soon as it is ready */
  if((auto||P.fatk||(P.target&&!P.target.dead))&&P.tp<=0){ /* v5_111 skills with AUTO lit cast in EVERY attack mode: auto-hunt, F, Space, click / double-click attack, Attack button, PvP attack and fight-back */
    const t=P.target;
    if(t&&!t.dead){
      const d=dist(t.x,t.y,P.x,P.y);
      let near=0;for(const m of (pvpOnly()?foes():mons))if(!m.dead&&dist(m.x,m.y,P.x,P.y)<120)near++;
      {let bs=1e9;for(let i=0;i<AUTO_SLOTS;i++){const id=EQ[i];if(id<0||!AUTOSK[i])continue;const k=SKILLS[id];if(!autoWants(k.t,d,t,near)||!skCanPay(k))continue;const w=Math.max(0,SCD[id]);if(w<bs){bs=w;P.rsvA=i}}} /* v5_189 next auto skill = ready soonest (slot order breaks ties) */
      if(!(P.skLock>0)&&!(P.rsv>=0)&&!wantsMove())for(let i=0;i<AUTO_SLOTS;i++){ /* v5_190 a manually reserved skill is the NEXT cast: auto skills wait for it */ /* v5_153 AUTO skills wait while you steer (keys / joystick): stop moving and they cast again */const id=EQ[i];if(id<0||!AUTOSK[i])continue;const ty=SKILLS[id].t; /* slot 1 first, then 2, 3 ... */
        const u=autoWants(ty,d,t,near);
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
  petFight(dt);
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
function drawPlayer(){const pb=P.pet&&P.pf&&P.pf.y<=P.y;if(pb)petDraw2D();drawPlayerE(P,SK());if(!pb)petDraw2D();if(P.bub)drawBubble(P.x-cam.x,P.y-cam.y-56,P)}
function drawRemote(q){
  const x=q.x-cam.x,y=q.y-cam.y;
  if(x<-90||y<-130||x>VW+90||y>VH+90)return;
  const pb=q.pet&&q.pf&&q.pf.y<=q.y;if(pb)peerPetDraw2D(q);
  drawPlayerE(q,skinOf(q.sk));if(q.pet&&!pb)peerPetDraw2D(q); /* v5_201 other players' pets */
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
    const pl=T3.pl;pl.position.set(tx,gy+(P.jz||0),tz);pl.rotation.y=Math.PI/2-P.face;pl.rotation.x=P.dead>0?-1.4:0;if(T3.rig.skin!==SKW())AL3D.setSkin(T3.rig,SKW());P.ft=armorFireTier(P);AL3D.animPlayer(T3.rig,P,time,realmIdx());jumpRings(T3.rig,P.jz||0);AL3D.hubUpdate(T3.hub,time);petRender3();
    let rpl=NONE;
    if(MP&&NET.peers.size){const prg=LOW?800:1200,PMAX=LOW?PQ.peers:14;let nw=0;rpl=[];
      for(const q of NET.peers.values()){const had=T3.rp.has(q),e=prg+(had?150:0);if(Math.abs(q.x-P.x)>e||Math.abs(q.y-P.y)>e)continue;
        if(!had){if(nw>=1)continue;nw++}rpl.push(q)}
      if(rpl.length>PMAX){rpl.sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y));rpl.length=PMAX}}
    sync3(T3.rp,rpl,q=>{const R=AL3D.makePlayer(q.sk),g=R.root;g.userData.rig=R;g.userData.mat={dispose(){try{Object.values(R.m).forEach(x=>x.dispose&&x.dispose())}catch(e){}}};return g},
      (g,q)=>{const R=g.userData.rig;if(R.skin!==q.sk)AL3D.setSkin(R,q.sk);g.position.set(q.x-C,gh3(q.x,q.y)+(q.jz||0),q.y-C);g.rotation.y=Math.PI/2-q.face;g.rotation.x=q.dead>0?-1.4:0;q.ft=armorFireTier(q);AL3D.animPlayer(R,q,time,Math.floor((q.lvl-1)/10));jumpRings(R,q.jz||0)},
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

/* ---------- HUD ---------- */
const el={hp:$('hp'),qi:$('qi'),xp:$('xp'),tg:$('tg'),tgHp:$('tgHp')};
const power=()=>Math.round(atkVal()*6+defVal()*4+maxHp()*.25);
const kfmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':String(n);
const pad2=n=>(n<10?'0':'')+n;
/* v5_143 buff tooltip: hover (PC) or tap (phone) a buff icon to see its name, description and time left. The panel follows the live buff data, so the numbers
   keep counting down while you hold the mouse still. */
let bfTipName='',bfTipEl=null,bfTipHide=0;
function bfTipBox(){if(!bfTipEl){bfTipEl=document.createElement('div');bfTipEl.id='bftip';bfTipEl.hidden=true;($('hud')||document.body).appendChild(bfTipEl)}return bfTipEl}
function bfTipFill(b){const e=bfTipBox();e.innerHTML='';const n=document.createElement('b');n.textContent=b[3];e.appendChild(n);const d=document.createElement('small');d.textContent=b[4];e.appendChild(d);if(b[5]>0){const t=document.createElement('small');t.textContent=b[5]+' s left';e.appendChild(t)}}
function bfTipPlace(x,y){const e=bfTipBox(),w=e.offsetWidth,h=e.offsetHeight;e.style.left=Math.max(4,Math.min(innerWidth-w-4,x+14))+'px';e.style.top=Math.max(4,Math.min(innerHeight-h-4,y+18))+'px'}
function bfTipShow(name,x,y){bfTipName=name;const b=(window.BUFF_NOW||[]).find(z=>z[3]===name);if(!b)return bfTipOff();bfTipFill(b);bfTipBox().hidden=false;bfTipPlace(x,y)}
function bfTipOff(){bfTipName='';clearTimeout(bfTipHide);if(bfTipEl)bfTipEl.hidden=true}
function bfTipRefresh(bs){window.BUFF_NOW=bs;if(!bfTipName)return;const b=bs.find(z=>z[3]===bfTipName);if(!b)return bfTipOff();bfTipFill(b)}
(function(){const bx=$('buffs');if(!bx)return;
  /* v5_164 pointer events only: mouse = hover as before; touch / pen = tap a buff to open its tooltip, tap it again or anywhere else to close. (The old mouseover + click pair fired together on phones: the emulated mouseover opened the tip and the click closed it at once.) */
  const at=e=>{const t=e.target.closest&&e.target.closest('.bf');return t&&bx.contains(t)?t:null};
  const near=t=>{const r=t.getBoundingClientRect();bfTipBox().hidden=false;bfTipPlace(r.left,r.bottom)};
  bx.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const t=at(e);if(t)bfTipShow(t.dataset.n,e.clientX,e.clientY)});
  bx.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&bfTipName&&at(e))bfTipPlace(e.clientX,e.clientY)});
  bx.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const r=e.relatedTarget;if(!at(e)||!bx.contains(r)||!(r.closest&&r.closest('.bf')))bfTipOff()});
  bx.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')return;const t=at(e);if(!t)return;e.stopPropagation();
    if(bfTipName===t.dataset.n){bfTipOff();return}
    bfTipShow(t.dataset.n,0,0);if(bfTipName){near(t);clearTimeout(bfTipHide);bfTipHide=setTimeout(bfTipOff,4000)}});
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&bfTipName&&!(e.target.closest&&e.target.closest('#buffs')))bfTipOff()},true);
})();
let buffKey='',zoneKey='',lastPing='';
const st=(e,t)=>{t=''+t;if(e.textContent!==t)e.textContent=t},sw=(e,v)=>{v=''+v;if(e.style.width!==v)e.style.width=v},sh=(e,v)=>{v=''+v;if(e.style.height!==v)e.style.height=v};
function hud(){
  const mh=maxHp(),mq=maxQi();
  sw(el.hp.firstElementChild,(P.hp/mh*100)+'%');st(el.hp.lastElementChild,Math.ceil(P.hp).toLocaleString()+' / '+mh.toLocaleString());
  sw(el.qi.firstElementChild,(P.qi/mq*100)+'%');st(el.qi.lastElementChild,Math.floor(P.qi).toLocaleString()+' / '+mq.toLocaleString());
  const xpp=P.lvl>=MAXLV?100:P.exp/expNext()*100;
  sw(el.xp.firstElementChild,xpp+'%');
  st($('xpt'),'EXP '+(P.lvl>=MAXLV?'MAX':xpp.toFixed(4)+'%'));
  st($('lv'),'Lv. '+P.lvl);st($('realm'),realmName(realmIdx()));st($('pw'),power().toLocaleString());
  st($('sAtk'),atkVal());st($('sDef'),defVal());st($('sCrit'),Math.round(critChance()*100)+'%');
  statsUpdate();
  st($('coins'),P.coins.toLocaleString());st($('gold'),P.gold.toLocaleString());st($('ore'),P.ore);st($('oreN'),P.ore);
  st($('partyN'),MP?NET.peers.size+1:1);
  const d=new Date();st($('clk'),pad2(d.getHours())+':'+pad2(d.getMinutes()));
  /* connection / ping */
  let nt='solo',nc='net off';
  if(NET.joined){if(NET.ping===undefined){nt='online';nc='net'}else{nt=NET.ping+' ms';nc='net'+(NET.ping>250?' bad':NET.ping>100?' mid':'')}}
  if(nt!==lastPing){lastPing=nt;st($('ping'),nt);$('net').className=nc}
  /* target frame */
  const t=started?(P.target&&!P.target.dead?P.target:(P.sel&&!P.sel.dead?P.sel:null)):null;
  el.tg.hidden=!t;
  if(t){
    const tmx=t.isPl?t.mh:t.maxhp;
    st($('tgLv'),'Lv. '+t.lvl);st($('tgNm'),t.name);st($('tgDef'),t.isPl?'':'DEF '+effMonDef(t));
    st($('tgRank'),t.isPl?'Player':t.boss?'Boss':'Common');$('tgRank').className=t.isPl?'pvp':t.boss?'boss mon':'mon';$('tgRank').title=t.isPl?'Click to view '+t.name+'\u2019s equipment':'Click to view monster stats';
    sw(el.tgHp.firstElementChild,Math.max(0,t.hp/tmx*100)+'%');st(el.tgHp.lastElementChild,Math.max(0,Math.ceil(t.hp)).toLocaleString()+' / '+tmx.toLocaleString());
  }
  tgActRender(t&&t.isPl&&NET.peers.has(t.id)?t:null);
  if(MG.m)mgRender();
  /* zone strip + banner */
  const full=zoneName(),base=full.split(' \u00b7 ')[0],safe=inTown();
  {const pv=!safe&&(PVPLVL>0||curWorld===ARENA);st($('znTag'),safe?'Safe':pv?'PvP \u00b7 '+PVP_NAMES[PVPLVL]:'Danger');$('znTag').className=safe?'safe':pv?'pvp':'';pvpUI()}
  st($('znTxt'),base);st($('znCh'),'World '+curWorld);$('znCh').title=W[curWorld].n;
  const zk=curWorld+':'+base;
  if(zk!==zoneKey){const first=!zoneKey;zoneKey=zk;if(started&&!first){const b=$('banner');b.innerHTML='';b.appendChild(document.createTextNode(base));const sm=document.createElement('small');sm.textContent=W[curWorld].n;b.appendChild(sm);b.style.animation='none';void b.offsetWidth;b.style.animation=''}}
  /* buffs */
  const bs=[];
  if(P.bfT>0)bs.push(['\u25b2',fmtT(P.bfT),'#ffd36b','ATK Boost','+'+Math.round(P.bf*100)+'% ATK.',fmtT(P.bfT)]);
  if(P.vlT>0)bs.push(['\u2601',fmtT(P.vlT),'#b79cff','Haste','+35% move speed (Smoke Veil also adds an ATK boost).',fmtT(P.vlT)]);
  if(P.drT>0)bs.push(['\u26e8',fmtT(P.drT),'#ffb070','Damage Reduction','Takes '+Math.round(P.dr*100)+'% less damage from hits.',fmtT(P.drT)]);
  if(P.ceT>0)bs.push(['\u25ce',fmtT(P.ceT),'#ffe27a','Eagle Eye','+25% crit chance.',fmtT(P.ceT)]);
  if(P.lsT>0)bs.push(['\u2665',fmtT(P.lsT),'#ff7a9a','Lifesteal','Heals you for '+Math.round((P.ls||.1)*100)+'% of the damage you deal (max 5% HP per hit).',fmtT(P.lsT)]);
  if(P.rfT>0)bs.push(['\u21b6',fmtT(P.rfT),'#ffd27a','Reflect','Monsters that hit you take '+Math.round((P.rf||.5)*100)+'% of the damage back.',fmtT(P.rfT)]);
  if(P.absT>0)bs.push(['\u25ce',fmtT(P.absT),'#c8d4dc','Vessel','Absorbing damage ('+Math.round(P.abs||0).toLocaleString()+' stored); it is released as a shockwave.',fmtT(P.absT)]);
  if(P.markT>0)bs.push(['\u2620',fmtT(P.markT),'#ff5a7a','Death Mark','Your mark detonates when this ends.',fmtT(P.markT)]);
  if(P.linkT>0)bs.push(['\u26d3',fmtT(P.linkT),'#80e8ff','Soul Web','Damage to a linked monster is shared (40%) with the others.',fmtT(P.linkT)]);
  {const SPN={1:['\u2658','Spirit Wolves','Wolves that focus your target.'],2:['\u2656','Guardian Spirit','A guardian spirit that fights beside you.'],3:['\u2687','Dao Clone','A clone of yourself strikes your target.'],4:['\u265c','Stone Sentinels','Stone sentinels fight beside you.']}; /* v5_164 one icon per kind of summon */
   for(const kd of [1,2,3,4]){const L=P.spirits.filter(q=>q.k===kd);if(!L.length)continue;const n=SPN[kd],fz=kd===1&&L.some(q=>q.fz);bs.push([n[0],fmtT(Math.max(...L.map(q=>q.t))),L[0].col||'#9fe0ff',n[1],'x'+L.length+' active. '+n[2]+(fz?' Pack Frenzy: they strike twice as fast and 50% harder.':''),fmtT(Math.max(...L.map(q=>q.t)))])}}
  if(P.gsT>0)bs.push(['\u21e0',fmtT(P.gsT),'#9fe8c8','Gale Step','Your Piercing / Volley arrows hit harder (+40%).',fmtT(P.gsT)]);
  if(P.inv>.5)bs.push(['\u2727',fmtT(P.inv),'#ffffff','Untouchable','You cannot take damage.',fmtT(P.inv)]);
  for(const k in HB){const h=HB[k],l=h[4]-HBCLK;if(l<=0){delete HB[k];continue}bs.push([h[0],fmtT(l),h[1],h[2],h[3],fmtT(l)])}
  if(P.sh>0&&P.shT>0)bs.push(['\u25c8',fmtT(P.shT),'#8ff0c4','Shield','Absorbs '+Math.round(P.sh).toLocaleString()+' damage.',fmtT(P.shT)]);
  const bk=bs.map(x=>x[0]+x[3]).join('|'); /* v5_164 rebuilt only when the SET of buffs changes (a rebuild every second swallowed phone taps); the numbers update in place */
  if(bk===buffKey){const ch=$('buffs').children;for(let i=0;i<bs.length&&i<ch.length;i++){const em=ch[i].firstElementChild;if(em&&em.textContent!==String(bs[i][1]))em.textContent=bs[i][1]}}
  if(bk!==buffKey){buffKey=bk;const bx=$('buffs');bx.innerHTML='';for(const x of bs){const e=document.createElement('div');e.className='bf';e.dataset.n=x[3];e.style.color=x[2];e.textContent=x[0];const em=document.createElement('em');em.textContent=x[1];e.appendChild(em);bx.appendChild(e)}}
  bfTipRefresh(bs);
  /* potions */
  st($('potN'),kfmt(P.pots.hp));st($('ckN'),kfmt(P.pots.ck));$('ckCd').hidden=pot.ck<=0;st($('ckCd'),fmtT(pot.ck)+'s');$('bCk').style.opacity=P.pots.ck>0?1:.5;st($('potQN'),kfmt(P.pots.qi));
  $('potCd').hidden=pot.hp<=0;st($('potCd'),fmtT(pot.hp)+'s');$('potQCd').hidden=pot.qi<=0;st($('potQCd'),fmtT(pot.qi)+'s');
  {const tb=$('tpBar');tb.hidden=!(P.tp>0);if(P.tp>0)sw($('tpFill'),Math.round((1-P.tp/TP_CHANNEL)*100)+'%')}
  st($('tpN'),kfmt(P.pots.tp));$('tpCd').hidden=!(pot.tp>0||P.tp>0);st($('tpCd'),P.tp>0?fmtT(P.tp)+'s':fmtT(pot.tp)+'s');$('bTp').style.opacity=P.pots.tp>0?1:.5;
  $('bPot').style.opacity=P.pots.hp>0?1:.5;$('bPotQ').style.opacity=P.pots.qi>0?1:.5;
  st($('viewLb'),MODE3D?'3D':'2D');
  renderOnline();
  if(rsvEl){const ri=P.rsv>=0?P.rsv:P.rsvA,rk=ri>=0?SKILLS[EQ[ri]]:null,key=rk?EQ[ri]+(P.rsv>=0?'m':'a'):'';
    if(key!==rsvKey){rsvKey=key;rsvEl.hidden=!rk;if(rk){rsvEl.style.borderColor=rk.col;rsvEl.classList.toggle('man',P.rsv>=0);rsvEl.innerHTML='<b style="color:'+rk.col+'">'+(GLYPH[rk.t]||'\u2726')+'</b><u>Reserved</u>'}}} /* v5_189 */
  skBtns.forEach((b,i)=>{const id=EQ[i],k=SKILLS[id],cd=k?Math.max(0,SCD[id]):0;
    sh(b.lastElementChild,k?(cd/k.cd*100)+'%':'0');
    st(b.children[2],cd>0?fmtT(cd):'');
    b.classList.toggle('nq',!k||!skCanPay(k));b.classList.toggle('auto',!!k&&i<AUTO_SLOTS&&AUTOSK[i]);
  });
  $('bForge').style.opacity=inTown()?1:.55;$('bWare').style.opacity=inTown()?1:.55;
  {const ha=$('hubArr'),show=started&&P.dead<=0&&!inTown();ha.hidden=!show;
   if(show){const dx0=C-P.x,dy0=C-P.y,d=Math.hypot(dx0,dy0),[dx,dy]=camUnrot(dx0,dy0),an=Math.atan2(dy,dx),hd=$('hud'),R=Math.max(70,Math.min(hd.clientWidth,hd.clientHeight)*.2);
     ha.firstElementChild.style.transform='rotate('+an+'rad) translateX('+R+'px)';
     const lb=ha.lastElementChild;lb.style.transform='translate('+(Math.cos(an)*(R+28))+'px,'+(Math.sin(an)*(R+28))+'px) translate(-50%,-50%)';
     lb.textContent='Hub '+(d>=1000?(d/1000).toFixed(1)+'k':Math.round(d))}}
  jumpEl.classList.toggle('cd',!!P.air||P.jcd>0);
  dodgeEl.classList.toggle('cd',P.dcd>0);{const t=P.dcd>0?P.dcd.toFixed(1)+'s':'DODGE';if(dodgeEl.lastElementChild.textContent!==t)dodgeEl.lastElementChild.textContent=t}
}
function toggleMap(){const w=$('mmw');w.classList.toggle('off');$('bMap').classList.toggle('on',!w.classList.contains('off'))}
$('bMap').classList.add('on');
/* v5_59 Who's online: the button is the ONLY thing that shows / hides the list (moving, clicking the map or the joystick no longer closes it).
   The choice is remembered (al_online); the button lights up while the list is on. Default = shown. */
let ONL_OPEN=true;try{ONL_OPEN=localStorage.getItem('al_online')!=='0'}catch(e){}
function onlineApply(){$('online').classList.toggle('off',!ONL_OPEN);$('bParty').classList.toggle('on',ONL_OPEN)}
$('bParty').addEventListener('click',()=>{
  ONL_OPEN=!ONL_OPEN;try{localStorage.setItem('al_online',ONL_OPEN?'1':'0')}catch(e){}
  onlineApply();NET.olKey='';renderOnline();
  if(ONL_OPEN&&!MP)say('The Online list needs the multiplayer server (you are playing solo).','#8d9aa2');
});
onlineApply();
$('bMap').addEventListener('click',toggleMap);
$('bBell').classList.add('on');
$('bBell').addEventListener('click',()=>{const l=$('log');l.hidden=!l.hidden;$('bBell').classList.toggle('on',!l.hidden)});
function syncMenuOpts(){$('autoPot').checked=!!P.autoPot;$('apHp').value=P.apHp||35;$('apHpV').textContent=(P.apHp||35)+'%';$('apQi').value=P.apQi||20;$('apQiV').textContent=(P.apQi||20)+'%';$('fightBack').checked=!!P.fightBack;$('tapMove').checked=P.tapMove!==false;$('perfSel').value=PERF}
$('bGear').addEventListener('click',()=>{const m=$('menu');m.hidden=!m.hidden;if(!m.hidden)syncMenuOpts()});
$('bSaver').addEventListener('click',()=>{if(!started)return;$('menu').hidden=true;saverOn(true)});
/* volume sliders (menu): music and sound effects are separate and remembered */
(function(){
  const mv=$('volMusic'),sv=$('volSfx');if(!mv||!sv||!window.SND)return;
  const show=()=>{$('volMusicV').textContent=Math.round(SND.music()*100)+'%';$('volSfxV').textContent=Math.round(SND.sfx()*100)+'%'};
  mv.value=Math.round(SND.music()*100);sv.value=Math.round(SND.sfx()*100);show();
  mv.addEventListener('input',()=>{SND.unlock();SND.music(mv.value/100);show()});
  sv.addEventListener('input',()=>{SND.unlock();SND.sfx(sv.value/100);show()});
  sv.addEventListener('change',()=>{SND.play('crit')}); /* let go of the slider = hear the new level */
  for(const el of [mv,sv])el.addEventListener('change',()=>el.blur()); /* give the keyboard back to the game */
})();
/* ---------- stats window + click-outside-to-close ---------- */
function statsUpdate(){
  const w=$('statsWin');if(w.hidden)return;
  st($('swCls'),CLASSES[P.cls].n);st($('swLv'),P.lvl);st($('swRealm'),realmName(realmIdx()));st($('swPw'),power().toLocaleString());
  st($('swHp'),maxHp().toLocaleString());st($('swQi'),maxQi().toLocaleString());st($('swQrg'),'+'+(Math.round(qrgVal()*100)/100)+'%/s');
  st($('swAtk'),atkVal().toLocaleString());st($('swDef'),defVal().toLocaleString());
  st($('swRed'),Math.round(defRedAt(defVal(),P.lvl)*100)+'%');
  st($('swCrit'),Math.round(critChance()*100)+'%');st($('swCd'),Math.round(critMul()*100)+'%');st($('swCdb'),Math.round(cdbVal()*10)/10+'%');st($('swCev'),Math.round(cevVal()*10)/10+'%');st($('swCdr'),Math.round(cdrVal()*10)/10+'%');
  st($('swBab'),Math.round(babVal()*10)/10+'%');st($('swBdr'),Math.round(bdrVal()*10)/10+'%');st($('swPab'),Math.round(pabVal()*10)/10+'%');st($('swPdr'),Math.round(pdrVal()*10)/10+'%');
  st($('swMab'),Math.round(mabVal()*10)/10+'%');st($('swMdr'),Math.round(mdrVal()*10)/10+'%');st($('swBsa'),Math.round(bsaVal()*10)/10+'%');st($('swBsd'),Math.round(bsdVal()*10)/10+'%');
  st($('swAs'),(1/atkCd()).toFixed(2)+'/s');st($('swMs'),Math.round(moveSpd()));
  st($('swAcc'),Math.round(accVal()*10)/10);st($('swEva'),Math.round(evaVal()*10)/10+'%');
  st($('swWl'),P.wlv);st($('swAl'),P.alv);st($('swPk'),P.pvpKills||0);
}
function statsToggle(on){
  const w=$('statsWin');w.hidden=on===undefined?!w.hidden:!on;
  $('bStats').classList.toggle('on',!w.hidden);$('bStats').setAttribute('aria-expanded',String(!w.hidden));
  statsUpdate();
}
$('bStats').addEventListener('click',e=>{e.stopPropagation();statsToggle()});
/* Clicking anywhere outside the pop-up windows closes them. The chat window is left alone, and a click inside the chat never closes anything. */
document.addEventListener('pointerdown',e=>{
  if(!started)return;
  const t=e.target;if(!(t instanceof Element))return;
  if(t.closest('#cp'))return;
  const inside=(win,btn)=>t.closest(win)||(btn&&t.closest(btn));
  if(!$('statsWin').hidden&&!inside('#statsWin','#bStats'))statsToggle(false);
  if(!$('menu').hidden&&!inside('#menu','#bGear'))$('menu').hidden=true;
  /* full-screen pop-ups: the dimmed backdrop counts as outside */
  if(t.classList.contains('modal')&&t.id!=='title'&&!t.hidden){
    if(t.id==='bag')closeBag();else t.hidden=true;
  }
},true);
$('bLogoutGame').addEventListener('click',()=>{if(!confirm('Log out? Your progress is saved to your account.'))return;try{save()}catch(e){}logout()});
$('bOre').addEventListener('click',()=>{if(started)openForge()});
$('bPot').addEventListener('pointerdown',e=>{e.preventDefault();usePot('hp')});
$('bPotQ').addEventListener('pointerdown',e=>{e.preventDefault();usePot('qi')});
$('bCk').addEventListener('pointerdown',e=>{e.preventDefault();usePot('ck')});
$('bTp').addEventListener('pointerdown',e=>{e.preventDefault();useTp()});
/* the HUD is laid out on a 1000x534 canvas and scaled to fit the window */
function fitHud(){if(!$('hud'))return;$('hud').style.setProperty('--u',Math.max(.55,Math.min(innerWidth/1000,innerHeight/534,2.6))+'px')}
window.addEventListener('resize',fitHud);fitHud();

/* ---------- multiplayer client ----------
   Server -> client: hello, on, world, s (snapshot), h (someone hit a monster), d (monster died), k (you get credit: XP and loot),
   hurt (a monster hit you), o (ore taken), pj/pl/pi (player joined/left/changed), fx (their skill effects), chat.
   Client -> server: join, p (my position ~15/s), i (my stats), hit, mine, fx, chat, world. */
const NONE=[];
function netSend(o){const w=NET.ws;if(w&&w.readyState===1)w.send(JSON.stringify(o))}
/* v5_159 party support: share a heal / ATK buff with party mates nearby (server relays it, clamped). Only when you are in a party in a multiplayer world. */
function partyShare(kind,v){if(typeof MP!=='undefined'&&MP&&typeof PARTY!=='undefined'&&PARTY.m.length>1&&v>0)netSend({t:'pbuff',m:kind,d:+v.toFixed(3)})}
function fxs(o){if(MP){o.t='fx';netSend(o)}}
/* equipped gear shared with other players (so they can inspect you): slot -> [grade, rarity, forge level, stat rolls] */
function eqPack(){const o={};for(const q of GEAR){const g=P.gear[q.k];if(g&&g.g>0){const st={};for(const k in g.st){const v=+g.st[k];if(isFinite(v))st[k]=Math.round(v*100)/100}o[q.k]=[g.g|0,g.r|0,g.lv|0,st]}}return o}
function eqClean(raw){const o={};if(!raw||typeof raw!=='object')return o;
  for(const q of GEAR){const a=raw[q.k];if(!Array.isArray(a))continue;
    const g=clamp(a[0]|0,1,TIER.length),r=clamp(a[1]|0,0,RAR.length-1),lv=clamp(a[2]|0,0,500),st={};
    if(a[3]&&typeof a[3]==='object')for(const k in a[3]){if(Object.prototype.hasOwnProperty.call(STAT_LBL,k)){const v=+a[3][k];if(isFinite(v))st[k]=v}}
    o[q.k]={g,r,lv,st}}
  return o}
function mkPeer(i){
  return {isPl:true,eq:eqClean(i.eq),id:i.id,name:String(i.n||'?').slice(0,16),sk:i.sk|0,lvl:clamp(i.lv|0,1,MAXLV),wlv:i.wl|0,alv:i.al|0,mh:Math.max(1,i.mh|0),hp:Math.max(1,i.mh|0),
    x:+i.x||C,y:+i.y||C,tx:+i.x||C,ty:+i.y||C,face:0,dir:1,mvAmt:0,anim:0,swing:0,hurt:0,bfT:0,sh:0,dead:0,r:14,mine:0,pvp:false,pm:0,pet:petKeyClean(i.pt),pf:null};
}
function netInfo(force){
  if(!NET.joined)return;
  const o={t:'i',cl:P.cls,sk:SKW(),lv:P.lvl,wl:P.wlv,al:P.alv,mh:maxHp(),df:defVal(),eq:eqPack(),pt:P.pet||''},k=JSON.stringify(o);
  if(!force&&k===NET.infoKey)return;
  NET.infoKey=k;netSend(o);
}
function netJoin(){
  NET.joined=true;NET.infoKey='';
  netSend({t:'join',token:AUTH.token,sid:SID,name:NET.name,w:curWorld,cl:P.cls,sk:SKW(),lv:P.lvl,wl:P.wlv,al:P.alv,mh:maxHp(),df:defVal()});
  netSend({t:'pvpm',on:PVPLVL}); /* v5_158 tell the server my PvP mode */
}
function setNetStatus(){
  const s=$('netStat');if(!s)return;
  if(NET.on){const on=Math.max(NET.online|0,NET.joined?1:0);s.textContent='Online \u00b7 '+on+' adventurer'+(on===1?'':'s')+' in the world';s.style.color='#5fd3a5'}
  else{s.textContent=NET.giveUp?'No server found \u00b7 playing solo':'Connecting to server\u2026';s.style.color='#8d9aa2'}
}
function netConnect(){
  if(!/^https?:$/.test(location.protocol)){NET.giveUp=true;setNetStatus();return} /* opened as a file: solo only */
  let ws;
  try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws')}catch(e){NET.giveUp=true;setNetStatus();return}
  NET.ws=ws;
  ws.onopen=()=>{NET.on=true;NET.fails=0;setNetStatus()};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}try{netMsg(m)}catch(err){console.error(err)}};
  ws.onclose=()=>{
    const was=NET.on;NET.on=false;NET.joined=false;NET.ws=null;
    setParty([]);pinvHide();
    if(MP){MP=false;NET.peers.clear();buildWorld(curWorld);P.target=null;P.pvpT=0;say('Connection lost \u2014 playing solo while reconnecting\u2026','#d9503f')}
    if(!was&&++NET.fails>=3)NET.giveUp=true;
    setNetStatus();
    if(!NET.giveUp)setTimeout(netConnect,2500);
  };
  ws.onerror=()=>{};
}
/* network ticks run on a timer, not requestAnimationFrame, so a backgrounded tab keeps reporting its position */
setInterval(()=>{
  if(!NET.joined)return;
  netSend({t:'p',x:+P.x.toFixed(1),y:+P.y.toFixed(1),f:+P.face.toFixed(2),hp:Math.round(P.hp),
    fl:(P.dead>0?1:0)|(P.bfT>0?2:0)|(P.sh>0?4:0)|(document.hidden?16:0)});
},66);
setInterval(()=>netInfo(),2000);
setInterval(()=>{if(NET.joined)netSend({t:'pg',i:Date.now()%1000000000})},2000);

/* ---------- parties: invite / accept / decline / leave (server: party.go). Chat: /invite name, /accept, /decline, /leave ---------- */
const PARTY={m:[],ids:new Set(),key:'',lead:0};
/* party window preferences: hidden flag + dragged position (fractions of the screen), remembered per browser */
const PUI=(()=>{let o={};try{o=JSON.parse(localStorage.getItem('al_partyui')||'{}')||{}}catch(e){}return{hidden:!!o.hidden,x:typeof o.x==='number'?o.x:null,y:typeof o.y==='number'?o.y:null}})();
function partyUiSave(){try{localStorage.setItem('al_partyui',JSON.stringify(PUI))}catch(e){}}
function partyPlace(){
  const b=$('party');
  if(PUI.x===null){b.style.left=b.style.top='';return}
  const r=$('hud').getBoundingClientRect(),w=b.offsetWidth||180,h=b.offsetHeight||60;
  b.style.left=clamp(PUI.x*r.width,0,Math.max(0,r.width-w))+'px';b.style.top=clamp(PUI.y*r.height,0,Math.max(0,r.height-h))+'px';
}
function partyHide(v){PUI.hidden=v;partyUiSave();PARTY.key='';renderParty()}
(function(){ /* drag the window by its title; double-click the title to put it back */
  const b=$('party');let d=null;
  b.addEventListener('pointerdown',e=>{
    if((e.target.closest&&e.target.closest('button'))||e.button>0)return; /* drag from anywhere on the window except its buttons */
    const r=b.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};b.classList.add('drag');e.preventDefault()});
  window.addEventListener('pointermove',e=>{
    if(!d||e.pointerId!==d.id)return;
    const hr=$('hud').getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight;
    const x=clamp(e.clientX-d.dx-hr.left,0,Math.max(0,hr.width-w)),y=clamp(e.clientY-d.dy-hr.top,0,Math.max(0,hr.height-h));
    b.style.left=x+'px';b.style.top=y+'px';PUI.x=x/hr.width;PUI.y=y/hr.height});
  const end=e=>{if(!d||(e&&e.pointerId!==d.id))return;d=null;b.classList.remove('drag');partyUiSave()};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  b.addEventListener('dblclick',e=>{if(!(e.target.closest&&e.target.closest('button'))){PUI.x=PUI.y=null;partyUiSave();partyPlace()}});
  window.addEventListener('resize',partyPlace);
})();
$('bPty').addEventListener('click',()=>{
  if(PARTY.m.length<2){say('You are not in a party. Tap + next to a name in the Online list, or type /invite name.','#8d9aa2');return}
  partyHide(!PUI.hidden);
}); /* EXP-share rules (factor, level gap, no bosses) live on the server: see party.go */
const isLeader=()=>PARTY.m.length>1&&PARTY.lead===NET.id;
let pinvTimer=0;
function partySend(m,name){netSend(name===undefined?{t:'party',m:m}:{t:'party',m:m,name:name})}
function partyCmd(c,arg){
  if(!(NET.on&&NET.joined)){say('Parties need the multiplayer server.','#8d9aa2');return}
  if(c==='invite'){if(!arg){say('Usage: /invite playername  (or tap + next to a name in the Party list)','#8d9aa2');return}partySend('invite',arg)}
  else if(c==='accept'||c==='decline'||c==='leave'||c==='disband'){partySend(c);if(c==='accept'||c==='decline')pinvHide()}
  else if(c==='kick'||c==='leader'||c==='promote'){if(!arg){say('Usage: /'+c+' playername','#8d9aa2');return}partySend(c==='promote'?'leader':c,arg)}
  else if((c==='p'||c==='party')&&arg){if(!PARTY.m.length){say('You are not in a party.','#8d9aa2');return}netSend({t:'party',m:'chat',tx:arg})}
  else say('Party: /invite name \u00b7 /accept \u00b7 /decline \u00b7 /leave \u00b7 /p message (party chat)'+(isLeader()?' \u00b7 /kick name \u00b7 /leader name \u00b7 /disband':''),'#e3b559',9000);
}
function pinvHide(){if(pinvTimer){clearTimeout(pinvTimer);pinvTimer=0}$('pinv').hidden=true}
function pinvShow(name,secs){
  pinvHide();
  $('pinvT').innerHTML='<b></b> invited you to a party.';$('pinvT').firstChild.textContent=String(name);
  $('pinv').hidden=false;pinvTimer=setTimeout(pinvHide,(+secs||30)*1000);
  say(String(name)+' invited you to a party. Type /accept or /decline.','#e3b559',10000);
}
function setParty(list,lead){
  const was=PARTY.m.length>1;PARTY.lead=lead|0;
  PARTY.m=list.map(e=>({id:e[0]|0,n:String(e[1]),lv:e[2]|0,hp:+e[3]||0,mh:Math.max(1,e[4]|0),w:e[5]|0,dead:!!e[6]}));
  PARTY.ids=new Set(PARTY.m.map(x=>x.id));
  if(!was&&PARTY.m.length>1&&PUI.hidden){PUI.hidden=false;partyUiSave()} /* a new party shows the window again */
  if(was!==(PARTY.m.length>1)){if(PARTY.m.length<2&&CP.cur==='party')CP.cur='all';cpSched()}
  renderParty();NET.olKey='';
}
function renderParty(){
  const box=$('party'),inP=PARTY.m.length>1,btn=$('bPty'),bn=$('ptyN');
  btn.classList.toggle('on',inP&&!PUI.hidden);bn.style.display=inP?'':'none';if(inP)bn.textContent=PARTY.m.length;
  if(!inP||PUI.hidden){box.hidden=true;box.innerHTML='';PARTY.key='';return}
  const key=PARTY.m.map(x=>x.id+':'+x.n+':'+x.lv+':'+Math.round(x.hp/x.mh*50)+':'+x.w+':'+x.dead).join('|')+'@'+curWorld+'#'+PARTY.lead;
  if(key===PARTY.key)return;
  PARTY.key=key;box.hidden=false;box.innerHTML='';
  const h=document.createElement('h4'),t=document.createElement('span'),lv=document.createElement('button'),hd=document.createElement('button'),bt=document.createElement('span');
  t.className='phd';t.title='Drag the window to move it \u00b7 double-click to reset';t.textContent='Party \u00b7 '+PARTY.m.length+'/4';
  lv.type='button';lv.textContent='Leave';lv.title='Leave the party';lv.addEventListener('click',()=>partyCmd('leave'));
  hd.type='button';hd.textContent='\u2013';hd.title='Hide (use the Party button on the left to show it again)';hd.addEventListener('click',()=>partyHide(true));
  const ch=document.createElement('button');ch.type='button';ch.textContent='\u{1F4AC}';ch.title='Party chat';ch.addEventListener('click',()=>{if(cpOpen()&&CP.cur==='party')cpHide();else cpShow('party',!PHONE)});
  bt.className='pbt';bt.appendChild(ch);bt.appendChild(lv);bt.appendChild(hd);h.appendChild(t);h.appendChild(bt);box.appendChild(h);
  for(const x of PARTY.m){
    const me=x.id===NET.id,r=document.createElement('div'),a=document.createElement('div'),n=document.createElement('span'),l=document.createElement('span'),b=document.createElement('div'),f=document.createElement('i');
    r.className='pmr'+(me?' me':'')+(x.dead?' dead':'');
    n.textContent=(x.id===PARTY.lead?'\u2605 ':'')+x.n;l.textContent='Lv '+x.lv+(x.w!==curWorld&&W[x.w]?' \u00b7 W'+x.w:'');
    a.appendChild(n);a.appendChild(l);
    if(isLeader()&&!me){
      const k=document.createElement('span');k.className='pact';
      for(const [txt,tt,fn] of [['\u2605','Make '+x.n+' the leader',()=>partyCmd('leader',x.n)],['\u2715','Remove '+x.n+' from the party',()=>partyCmd('kick',x.n)]]){
        const bt=document.createElement('button');bt.type='button';bt.textContent=txt;bt.title=tt;bt.addEventListener('click',fn);k.appendChild(bt)}
      a.insertBefore(k,l);
    }b.className='pb';f.style.width=clamp(x.hp/x.mh,0,1)*100+'%';b.appendChild(f);
    r.appendChild(a);r.appendChild(b);box.appendChild(r);
  }
  partyPlace();
}
$('pinvY').addEventListener('click',()=>partyCmd('accept'));
$('pinvN').addEventListener('click',()=>partyCmd('decline'));
/* ---------- friends: requests that are saved on the server (friends.go). Chat: /friend name \u00b7 /friend accept [name] \u00b7 /friend decline [name] \u00b7 /unfriend name \u00b7 /friends ---------- */
const FR={f:[],inn:[],out:[],open:false,timer:0,key:'',pend:'',finvT:0};
function frSend(m,name){netSend(name===undefined||name===''?{t:'friend',m:m}:{t:'friend',m:m,name:name})}
const frIs=n=>FR.f.some(x=>x.n.toLowerCase()===String(n).toLowerCase());
function frCmd(c,arg){
  if(!(NET.on&&NET.joined)){say('Friends need the multiplayer server.','#8d9aa2');return}
  arg=(arg||'').trim();
  if(c==='friends'&&!arg){frToggle(true);return}
  const sub=arg.match(/^(add|accept|decline|deny|cancel|remove|delete|list)(?:\s+(.*))?$/i);
  if(c==='unfriend'){if(!arg){say('Usage: /unfriend playername','#8d9aa2');return}frSend('remove',arg);return}
  if(sub){
    const a=sub[1].toLowerCase(),n=(sub[2]||'').trim().replace(/^"(.*)"$/,'$1');
    if(a==='list'){frToggle(true);return}
    if(a==='add'){if(!n){say('Usage: /friend playername','#8d9aa2');return}frSend('add',n);return}
    frSend(a==='deny'?'decline':a==='delete'?'remove':a,n);if(a==='accept'||a==='decline'||a==='deny')finvHide();return}
  if(arg){frSend('add',arg.replace(/^"(.*)"$/,'$1'));return}
  say('Friends: /friend name (send a request) \u00b7 /friend accept [name] \u00b7 /friend decline [name] \u00b7 /unfriend name \u00b7 /friends (open the window)','#e3b559',9000);
}
function finvHide(){if(FR.finvT){clearTimeout(FR.finvT);FR.finvT=0}$('finv').hidden=true}
function finvShow(name){
  finvHide();FR.pend=String(name);
  $('finvT').innerHTML='<b></b> sent you a friend request.';$('finvT').firstChild.textContent=FR.pend;
  $('finv').hidden=false;FR.finvT=setTimeout(finvHide,25000);
}
$('finvY').addEventListener('click',()=>{frSend('accept',FR.pend);finvHide()});
$('finvN').addEventListener('click',()=>{frSend('decline',FR.pend);finvHide()});
function setFriends(m){
  FR.f=(m.f||[]).map(e=>({n:String(e[0]),on:!!e[1],lv:e[2]|0,w:e[3]|0}));
  FR.inn=(m.in||[]).map(String);FR.out=(m.o||[]).map(String);
  const bn=$('frN');bn.style.display=FR.inn.length?'':'none';bn.textContent=FR.inn.length;
  if(!FR.inn.some(n=>n===FR.pend))finvHide();
  NET.olKey='';renderFriends();
}
function frToggle(v){
  FR.open=v===undefined?!FR.open:!!v;$('bFr').classList.toggle('on',FR.open);
  if(FR.timer){clearInterval(FR.timer);FR.timer=0}
  if(FR.open){frSend('list');FR.timer=setInterval(()=>{if(NET.joined)frSend('list')},10000)}
  FR.key='';renderFriends();
}
/* drag any floating window by its heading (h4): converts the centred layout to left/top px and keeps it inside the screen */
function makeDrag(box,hs){
  box.addEventListener('pointerdown',e=>{
    const h=e.target.closest(hs);if(!h||e.target.closest('button,input')||(e.button||0)>0)return;
    const par=box.offsetParent||box.parentElement,pr=par.getBoundingClientRect(),br=box.getBoundingClientRect(),sx=(pr.width/par.offsetWidth)||1,ox=e.clientX-br.left,oy=e.clientY-br.top;
    box.style.transform='none';box.style.left=((br.left-pr.left)/sx)+'px';box.style.top=((br.top-pr.top)/sx)+'px';e.preventDefault();
    const mv=ev=>{let l=(ev.clientX-ox-pr.left)/sx,t=(ev.clientY-oy-pr.top)/sx;
      l=Math.max(0,Math.min(par.offsetWidth-box.offsetWidth,l));t=Math.max(0,Math.min(par.offsetHeight-box.offsetHeight,t));
      box.style.left=l+'px';box.style.top=t+'px'};
    const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up)};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  });
}
makeDrag($('frwin'),'h4');
/* inspect another player: click the "Player" tag on the target frame */
const PG={id:-1};
const PG_ORDER=['wpn','wpn2','robe','ear','neck','ring','brace','glove','belt','legs','boot'];
const pgStats=statArr;
/* another player's POWER: same formula as the Power on your own HUD (ATK*6 + DEF*4 + max HP*0.25), worked out from the gear and levels they share.
   Max HP is the value their own client reports. Temporary buffs are not counted. */
function peerStat(q,key){let v=0;for(const s of GEAR){const o=q.eq&&q.eq[s.k];if(o&&o.g>0){v+=o.st[key]||0;const a=s.st[key];if(a&&!FLAT_STATS[key])v+=forgeEff(o.lv)*a[1]}}return v}
const peerForgePct=(q,k)=>flatForgePct(k,s=>{const o=q.eq&&q.eq[s.k];return s.core?{g:o&&o.g>0?o.g:0,lv:s.core==='wlv'?q.wlv:q.alv}:(o||{g:0,lv:0})});
function peerPower(q){
  const ri=Math.floor((q.lvl-1)/10),cb=CLB[(q.sk>>>21)&7]||{};
  const atk=Math.round((10+q.lvl*3.5+peerStat(q,'atk'))*(1+peerForgePct(q,'atk'))*(1+ri*.12));
  const def=Math.round((q.lvl*3+peerStat(q,'def'))*(1+peerForgePct(q,'def'))*(1+ri*.04)*(cb.def||1));
  return Math.round(atk*6+def*4+q.mh*.25)}
function pgRender(){
  const box=$('pgear'),q=NET.peers.get(PG.id);
  if(PG.id<0||!q){box.hidden=true;box.innerHTML='';PG.id=-1;return}
  const keep=box.querySelector('.pgb'),scr=keep?keep.scrollTop:0;
  box.hidden=false;box.innerHTML='';
  const h=frEl('h4'),x=frBtn('\u2715','','Close',pgClose);x.className='';h.appendChild(frEl('span','',q.name));h.appendChild(x);box.appendChild(h);
  const cls=CLASSES[(q.sk>>>21)&7],pw=frEl('div','pgp'),sub=frEl('div','pgs');box.appendChild(pw);box.appendChild(sub);
  const body=frEl('div','pgb');box.appendChild(body);let n=0;
  const add=(o)=>{ /* o: {ic, slotLetter, name, lv, sub, stats[], col, cls} */
    const d=frEl('div','pgi'+(o.ic?'':' em')),s=frEl('div','bslot '+(o.ic?o.cls:'empty'));
    if(o.col)d.style.setProperty('--rc',o.col);
    if(o.ic)s.innerHTML=o.ic;else s.appendChild(frEl('span','sl',o.slotLetter));
    d.appendChild(s);
    const t=frEl('div','pgt'),nm=frEl('div','pgn'),a=frEl('span','',o.name);if(o.col)a.style.color=o.col;nm.appendChild(a);
    if(o.ic)nm.appendChild(frEl('span','pgl','+'+o.lv));t.appendChild(nm);
    t.appendChild(frEl('div','pgr',o.sub));
    if(o.stats&&o.stats.length){const ul=frEl('ul','pgst');for(const z of o.stats)ul.appendChild(frEl('li','',z));t.appendChild(ul)}
    d.appendChild(t);body.appendChild(d)};
  for(const k of PG_ORDER){
    const g=GEAR.find(z=>z.k===k),o=q.eq&&q.eq[k];
    if(o){n++;add({ic:ICONS[k](RAR[o.r].c),cls:RAR[o.r].cls||'rare',name:gearName(g,o),lv:o.lv,col:RAR[o.r].c,sub:RAR[o.r].n+' \u00b7 Grade '+o.g+' \u00b7 '+g.n,stats:pgStats(o.st,o.lv,g)})}
    else if(k==='wpn'&&q.wlv>0){n++;add({ic:ICONS.blade('#e3b559'),cls:'epic',name:'Primary Weapon (Blade)',lv:q.wlv,col:'#e3b559',sub:'Starting blade \u00b7 forge level +'+q.wlv,stats:corePctArr(GQ.wpn,forgeFrac(q.wlv))})}
    else if(k==='robe'&&q.alv>0){n++;add({ic:ICONS.robe('#e3b559'),cls:'epic',name:'Robe',lv:q.alv,col:'#e3b559',sub:'Starting robe \u00b7 forge level +'+q.alv,stats:corePctArr(GQ.robe,forgeFrac(q.alv))})}
    else add({slotLetter:g.ic,name:g.n,sub:'Empty'});
  }
  pw.textContent='\u26A1 Power '+peerPower(q).toLocaleString();
  sub.textContent='Lv. '+q.lvl+(cls?' \u00b7 '+cls.n:'')+' \u00b7 HP '+q.mh.toLocaleString()+' \u00b7 '+n+'/'+PG_ORDER.length+' equipped';
  body.scrollTop=scr;
}
window.addEventListener('resize',()=>{const b=$('pgear');if(b&&!b.hidden){b.style.left='';b.style.top='';b.style.transform=''}});
function pgClose(){PG.id=-1;pgRender()}
function pgOpen(t){if(!t||!t.isPl||!NET.peers.has(t.id))return;PG.id=t.id;pgRender()}
$('tgRank').addEventListener('click',e=>{e.stopPropagation();const t=P.target&&!P.target.dead?P.target:P.sel;if(t&&t.isPl)pgOpen(t);else if(t)mgOpen(t)});
$('tgRank').addEventListener('pointerdown',e=>e.stopPropagation());
makeDrag($('pgear'),'h4');
/* v5_91 monster stats window: click the "Common" / "Boss" tag on the target frame while a monster is selected */
var MG={m:null,key:""};
function mgOpen(m){MG.m=m;MG.key='';mgRender()}
function mgClose(){MG.m=null;MG.key='';const b=$('mgear');b.hidden=true;b.innerHTML=''}
function mgRender(){
  const b=$('mgear'),m=MG.m;
  if(!m||m.dead||m.isPl||!started||!mons.includes(m)){if(!b.hidden)mgClose();MG.m=null;return}
  const gap=monGap(m.lvl,P.lvl),hitDmg=Math.max(1,Math.round(m.atk*MON_ATK_MUL*(1-defRedAt(defVal(),m.lvl))*gap*(1-bdrVal()*(1-monDom(m.lvl))/100)*(1-(m.boss?bsdVal():mdrVal())*(1-monDom(m.lvl))/100))),hc=Math.round(hitChance(m)*100);
  const rows=[['Type',m.boss?'Boss':'Common'],['Level',m.lvl+(m.lvl>P.lvl?' (+'+(m.lvl-P.lvl)+' above you)':m.lvl<P.lvl?' ('+(P.lvl-m.lvl)+' below you)':'')],
    ['HP',Math.max(0,Math.ceil(m.hp)).toLocaleString()+' / '+m.maxhp.toLocaleString()],['ATK',Math.round(m.atk*MON_ATK_MUL).toLocaleString()],
    ['Hits you for','~'+hitDmg.toLocaleString()+' (x'+gap.toFixed(2)+' level gap)'],['DEF',effMonDef(m).toLocaleString()],['Your hit chance',hc+'%'],['EXP',m.exp.toLocaleString()]];
  const key=m.name+'|'+rows.map(r=>r[1]).join('|');
  if(key===MG.key&&!b.hidden)return;MG.key=key;b.hidden=false;b.innerHTML='';
  const h=frEl('h4'),x=frBtn('\u2715','','Close',mgClose);x.className='';h.appendChild(frEl('span','',m.name));h.appendChild(x);b.appendChild(h);
  for(const r of rows){const d=frEl('div','mr');d.appendChild(frEl('span','',r[0]));d.appendChild(frEl('span','',r[1]));b.appendChild(d)}
}
makeDrag($('mgear'),'h4');
/* action bar under the target frame when a PLAYER is selected (phone has no right click) */
let tgActKey='';
function tgActRender(t){
  const box=$('tgAct');
  if(!t){if(tgActKey){tgActKey='';box.classList.remove('on');box.innerHTML=''}return}
  const inP=PARTY.ids.has(t.id),isF=frIs(t.name),sent=FR.out.some(n=>n.toLowerCase()===t.name.toLowerCase());
  const key=[t.id,inP,isF,sent,PARTY.m.length,PVPLVL,inTown()].join('|');
  if(key===tgActKey)return;
  tgActKey=key;box.innerHTML='';box.classList.add('on');
  const mk=(txt,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=txt;b.addEventListener('click',e=>{e.stopPropagation();fn()});b.addEventListener('pointerdown',e=>e.stopPropagation());box.appendChild(b)};
  mk('\u{1F50D} Inspect','',()=>pgOpen(t));
  if(!inP)mk('\u2694 Attack','atk',()=>startPvp(t));
  if(!inP&&PARTY.m.length<4)mk('\uFF0B Party','',()=>partyCmd('invite',t.name));
  if(!isF&&!sent)mk('\u2665 Friend','',()=>frCmd('friend',t.name));
  mk('\u{1F4AC} Whisper','',()=>whisperTo(t.name));
  mk('\u2715','x',()=>{P.sel=null;P.target=null});
}
function frEl(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
function frBtn(txt,cls,tt,fn){const b=frEl('button','fb '+cls,txt);b.type='button';if(tt)b.title=tt;b.addEventListener('click',fn);return b}
function renderFriends(){
  const box=$('frwin');
  if(!FR.open){box.hidden=true;box.innerHTML='';FR.key='';return}
  const key=JSON.stringify([FR.f,FR.inn,FR.out,curWorld]);
  if(key===FR.key&&!box.hidden)return;
  let draft='',hadFocus=false;const old=box.querySelector('input');if(old){draft=old.value;hadFocus=document.activeElement===old}
  FR.key=key;box.hidden=false;box.innerHTML='';
  const h=frEl('h4'),t=frEl('span','',' Friends \u00b7 '+FR.f.length+'/50'),x=frBtn('\u2715','','Close',()=>frToggle(false));x.className='';
  h.appendChild(t);h.appendChild(x);box.appendChild(h);
  const add=frEl('div','fadd'),inp=document.createElement('input');inp.type='text';inp.maxLength=16;inp.placeholder='Player name';inp.value=draft;
  const go=frBtn('Add','','Send a friend request',()=>{const v=inp.value.trim();if(v){frSend('add',v);inp.value=''}});
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go.click();else if(e.key==='Escape')frToggle(false)});inp.addEventListener('keyup',e=>e.stopPropagation());
  add.appendChild(inp);add.appendChild(go);box.appendChild(add);
  const body=frEl('div','fbody');box.appendChild(body);
  if(FR.inn.length){
    body.appendChild(frEl('h5','','Requests for you'));
    for(const n of FR.inn){const r=frEl('div','fr');r.appendChild(frEl('span','nm',n));
      r.appendChild(frBtn('Accept','','Become friends with '+n,()=>frSend('accept',n)));r.appendChild(frBtn('\u2715','no sm','Decline',()=>frSend('decline',n)));body.appendChild(r)}
  }
  body.appendChild(frEl('h5','','Friends'));
  if(!FR.f.length)body.appendChild(frEl('div','fe','No friends yet. Type a name above, or tap the heart next to a name in the Online list.'));
  for(const f of FR.f){
    const r=frEl('div','fr '+(f.on?'on':'off'));r.appendChild(frEl('i'));r.appendChild(frEl('span','nm',f.n));
    r.appendChild(frEl('span','sub',f.on?'Lv '+f.lv+(f.w!==curWorld&&W[f.w]?' \u00b7 W'+f.w:''):'offline'));
    r.appendChild(frBtn('\u{1F4AC}','sm','Whisper '+f.n+(f.on?'':' (they get it when they log in)'),()=>whisperTo(f.n)));
    if(f.on&&PARTY.m.length<4&&!PARTY.m.some(x=>x.n===f.n))r.appendChild(frBtn('+','sm','Invite '+f.n+' to your party',()=>partyCmd('invite',f.n)));
    r.appendChild(frBtn('\u2715','no sm','Remove '+f.n+' from your friends',()=>{if(confirm('Remove '+f.n+' from your friends?'))frSend('remove',f.n)}));
    body.appendChild(r);
  }
  if(FR.out.length){
    body.appendChild(frEl('h5','','Requests you sent'));
    for(const n of FR.out){const r=frEl('div','fr');r.appendChild(frEl('span','nm',n));r.appendChild(frEl('span','sub','waiting'));
      r.appendChild(frBtn('Cancel','no sm','Take the request back',()=>frSend('cancel',n)));body.appendChild(r)}
  }
  if(hadFocus)inp.focus();
}
$('bFr').addEventListener('click',()=>{if(!(NET.on&&NET.joined)){say('Friends need the multiplayer server.','#8d9aa2');return}frToggle()});
function monAt(i){const m=mons[i];return m&&m.id===i?m:null}
function netMsg(m){
  switch(m.t){
    case 'kick':{
      /* signed out because the account logged in elsewhere: SAVE FIRST (browser + account), only then drop the session */
      try{if(started&&AUTH.ok)save()}catch(e){}
      try{cloudFlush(true)}catch(e){}try{pmSaveNow()}catch(e){}
      AUTH.ok=false;NET.giveUp=true;if(cloudT){clearTimeout(cloudT);cloudT=0}cloudStr=null;
      authForget();
      try{if(NET.ws)NET.ws.close()}catch(e){}
      setTimeout(()=>{alert(String(m.m||'This account was logged in somewhere else.'));location.reload()},50);break}
    case 'auth':logout();break;
    case 'flush':saveNow();break; /* the server asks us to save right now because this account is logging in on another device */
    case 'pg':NET.ping=(Date.now()%1000000000-(m.i|0)+1000000000)%1000000000;break;
    case 'hello':
      NET.id=m.id;NET.online=m.n|0;time=+m.tm||0;
      if(started&&!NET.joined)netJoin();
      setNetStatus();break;
    case 'on':
      NET.online=m.n|0;NET.counts=m.c||[];
      if(MP&&Math.abs(time-m.tm)>3)time=m.tm;
      setNetStatus();break;
    case 'world':{
      const entering=NET.pendingEnter===m.w;NET.pendingEnter=-1;
      NET.peers.clear();
      for(const i of (m.ps||[]))if(i.id!==NET.id)NET.peers.set(i.id,mkPeer(i));
      MP=true;
      if(entering)arriveWorld(m.w,m.mons);else buildWorld(m.w,m.mons);
      for(const e of (m.ores||[]))if(ores[e[0]])ores[e[0]].cd=e[1];
      if(!entering)say('Joined the shared world of '+W[m.w].n+' \u00b7 '+(NET.peers.size+1)+' here.',W[m.w].acc);
      break}
    case 's':onSnap(m);break;
    case 'h':{
      const o=monAt(m.i);if(!o||o.dead)break;
      o.flash=.1;spark(o.x,o.y,m.c?'#ffd36b':'#ffd9a0',m.c?8:4,150,.3,2.4);
      pop(o.x,o.y-o.r-8,String(m.d)+(m.c?'!':''),'#c8d6e5',m.c?15:12);break}
    case 'd':{const o=monAt(m.i);if(o&&!o.dead)killMonster(o,true);break}
    case 'k':{const o=monAt(m.i);if(o)rewardKill(o,m.l===0);break}  /* l:0 = you hit this boss but someone else landed the last hit */
    case 'bs':{ /* boss wave: [id,x,y,bossIdx,maxHp,def,radius,hp,dead,level] */
      if(!MP)break;const out=[];
      for(const e of (m.b||[])){
        const b=BOSSES[e[3]];if(!b||!mons[e[0]])continue;
        const o=monsterAt(e[1],e[2],b,e[9]);
        o.id=e[0];o.maxhp=e[4];o.hp=e[7];o.def=e[5];o.r=e[6];o.tx=o.x;o.ty=o.y;
        mons[e[0]]=o;out.push(o);
      }
      announceBosses(out);break}
    case 'bx':{const o=monAt(m.i);if(o&&!o.dead){o.dead=true;o.dieT=0;o.respawn=1e9;o.pend=false;if(P.target===o)P.target=null;say(o.name+' (Lv '+o.lvl+') has vanished.','#8d9aa2')}break}
    case 'hurt':if(MP&&P.dead<=0){const o=monAt(m.i);if(o)o.atkT=.25;hurtPlayer(Math.max(1,m.d|0),false,o?o.lvl:P.lvl,o);retaliate(o)}break;
    case 'o':if(ores[m.i])ores[m.i].cd=+m.cd||30;break;
    case 'pj':{const i=m.p;if(i&&i.id!==NET.id&&MP){NET.peers.set(i.id,mkPeer(i));say(String(i.n)+' entered the world.','#5fd3a5')}break}
    case 'pl':{const q=NET.peers.get(m.id);if(q){NET.peers.delete(m.id);say(q.name+' left.','#8d9aa2');if(PG.id===m.id)pgClose()}break}
    case 'pi':{const i=m.p,q=i&&NET.peers.get(i.id);if(q){q.sk=i.sk|0;q.lvl=clamp(i.lv|0,1,MAXLV);q.wlv=i.wl|0;q.alv=i.al|0;q.mh=Math.max(1,i.mh|0);{const pk=petKeyClean(i.pt);if(pk!==q.pet){q.pet=pk;q.pf=null}}if(i.eq!==undefined){q.eq=eqClean(i.eq);if(PG.id===q.id)pgRender()}}break}
    case 'fx':if(MP)playFx(m);break;
    case 'pvp':break; /* v5_158 the 30 s flag is gone (PvP modes) */
    case 'pvpno':say(String(m.r||'PvP not allowed here.'),'#8d9aa2');break;
    case 'pvpw':break;
    case 'pbf':if(MP&&P.dead<=0){ /* v5_159 shared party heal / ATK buff from a nearby party mate (server clamps the values) */
      const a=NET.peers.get(m.i|0),v=+m.v||0,who=a?a.name:'Ally';
      if(m.k==='heal'&&v>0){const h=Math.min(maxHp()-P.hp,Math.round(maxHp()*Math.min(.08,v)));if(h>0){P.hp+=h;pop(P.x,P.y-30,'+'+h,'#5fd3a5',15);say(who+' healed you for '+h+'.','#5fd3a5')}}
      else if(m.k==='atk'&&v>0){P.bf=Math.max(P.bfT>0?P.bf:0,Math.min(.15,v));P.bfT=Math.max(P.bfT,8);pop(P.x,P.y-34,'ATK +'+Math.round(Math.min(.15,v)*100)+'%','#ffd36b',14);say(who+' boosted your attack.','#ffd36b')}
    }break;
    case 'phurt':if(MP&&P.dead<=0){
      const a=NET.peers.get(m.i|0);if(a){a.swing=.2}
      let pd=Math.max(1,m.d|0);
      if(P.cls===2&&a&&dist(a.x,a.y,P.x,P.y)<=IG_GUARD_R)pd=Math.max(1,Math.round(pd*(1-IG_GUARD*(1-pvpDom(a.lv))))); /* v5_87 Iron Guardian: melee-range guard */
      hurtPlayer(pd,true,(a&&a.lv)||P.lvl,null,!!m.c);
      if(a&&(!P.target||P.target.dead)&&!inTown()&&P.tp<=0)P.target=a; /* fight back: auto-target whoever hit you */
    }break;
    case 'pdm':{const q=NET.peers.get(m.v|0);if(q){const c=m.c;q.hp=Math.max(0,q.hp-(m.d|0));pop(q.x,q.y-q.r-30,String(m.d|0)+(c?'!':''),c?'#ffd36b':'#ff9a8a',c?17:13)}break}
    case 'ph':{const q=NET.peers.get(m.v|0);if(q){q.hurt=.2;spark(q.x,q.y,'#ffb0a0',5,150,.3,2.4);pop(q.x,q.y-q.r-30,String(m.d|0)+(m.c?'!':''),'#c8d6e5',m.c?15:12)}break}
    case 'pk':{
      P.pvpKills++;
      if(m.b){const g=Math.max(1,(m.lv|0))*PVP_BOUNTY;P.coins+=g;lootIcon('c','&#9679;',g,'#e3b559');pop(P.x,P.y-30,'+'+g,'#e3b559',13);bagLog('+'+g.toLocaleString()+' coins (PvP bounty)','#e3b559');save()}
      say('You defeated '+String(m.n)+(m.b?'.':' (no bounty: killed again too soon).')+' PvP kills: '+(m.k||P.pvpKills),'#ff9a8a',8000);
      if(P.target&&P.target.isPl)P.target=null;break}
    case 'pkf':say(String(m.k)+' defeated '+String(m.v)+' in PvP'+(m.n>1?' (kill #'+m.n+')':'')+'.','#ff8a7a',8000);break;
    case 'sys':say(String(m.m),'#e3b559',12000);break;
    case 'pm':{const out=m.d==='to',nm=String(m.n);
      if(!out)PM_LAST=nm;
      {const Q=out?P:NET.peers.get(m.id);if(Q)setBubble(Q,String(m.m),out?'#d9b8ff':'#ff9ee8',true)}
      if(!out){const k=pcKey(nm),showing=cpOpen()&&CP.cur==='pm:'+k;if(!showing)feed('[Whisper] '+nm+': '+String(m.m),'#ff9ee8',12000)}
      pcAdd(nm,String(m.m),out,m.id,{off:!!m.off,ts:m.ts|0});break}
    case 'party':setParty(m.m||[],m.l);break;
    case 'kp':{const o=monAt(m.i);if(o){const x=Math.max(1,Math.round(o.exp*Math.max(.1,Math.min(1,1-(P.lvl-o.lvl)*.04))*clamp(+m.f||0,0,1)));gainExp(x);feed('Party share: +'+x+' EXP ('+o.name+')','#8ff0b0')}break}
    case 'pchat':{
      const mine=m.id===NET.id,nm=String(m.n),txt=String(m.m),q=mine?P:NET.peers.get(m.id),pm=PARTY.m.find(x=>x.id===m.id),wi=CP.who.get(nm.toLowerCase());
      const sk=mine?SKIN:q?q.sk:wi?wi.sk:0,lv=mine?P.lvl:pm?pm.lv:q?q.lvl:0;
      if(!mine&&q)CP.who.set(nm.toLowerCase(),{sk:sk,lv:lv});
      const showing=cpOpen()&&(CP.cur==='party'||CP.cur==='all');
      if(!showing)feed('[Party] '+nm+': '+txt,'#8ff0b0',16000);
      cpPush({k:'pty',n:nm,m:txt,me:mine,sk:sk,lv:lv});
      if(q)setBubble(q,txt,'#8ff0b0',false);break}
    case 'pinv':pinvShow(m.n,m.s);break;
    case 'fl':setFriends(m);break;
    case 'freq':finvShow(m.n);break;
    case 'cmd':runCmd(String(m.m));break;
    case 'chat':{
      const mine=m.id===NET.id,wt=(MP&&m.w!==curWorld)?(W[m.w]?W[m.w].n:'?'):'',tag=wt?' ['+wt+']':'';
      const nm=String(m.n),txt=String(m.m),q=mine?P:NET.peers.get(m.id);
      let info=CP.who.get(nm.toLowerCase());
      if(mine)info={sk:SKIN,lv:P.lvl};else if(q)info={sk:q.sk,lv:q.lvl};
      if(info)CP.who.set(nm.toLowerCase(),info);
      feed(nm+tag+': '+txt,mine?'#e8e0ca':'#bfe3ff',16000);
      cpPush({k:'chat',n:nm,m:txt,me:mine,sk:info?info.sk:0,lv:info?info.lv:0,wt:wt});
      if(q)setBubble(q,txt,mine?'#e3b559':'#bfe3ff',false);break}
  }
}
function onSnap(m){
  if(!MP)return;
  const L=m.m||NONE;
  for(let k=0;k<L.length;k++){
    const e=L[k],o=mons[e[0]];
    if(!o||o.id!==e[0])continue;
    if(o.dead){o.dead=false;o.pend=false;o.dieT=0;o.x=e[1];o.y=e[2];o.lx=undefined} /* respawned */
    o.tx=e[1];o.ty=e[2];
    if(!(o.predT>0&&e[3]>o.hp))o.hp=e[3];
    if(e[3]>0)o.pend=false;
    const st=e[4]&3;o.state=st===1?'chase':st===2?'return':'idle';
    if((e[4]&8)&&!(o.atkT>0))o.atkT=.25;
    o.wx=(Math.abs(o.tx-o.x)>.4||Math.abs(o.ty-o.y)>.4)?1:0;
  }
  for(const e of (m.p||NONE)){
    const q=NET.peers.get(e[0]);if(!q)continue;
    q.tx=e[1];q.ty=e[2];q.face=e[3];q.hp=e[4];peerSample(q,e[1],e[2]);
    const f=e[5];q.dead=(f&1)?1.5:0;q.bfT=(f&2)?1:0;q.sh=(f&4)?1:0;q.pm=(f>>5)&3;q.pvp=q.pm>=2; /* v5_158 bits 5-6 = PvP mode; red name + swords for Hostile / Carnal */
  }
  if(m.dd)for(const id of m.dd){const o=monAt(id);if(o&&!o.dead)killMonster(o,true)}
  if(m.tm!==undefined)time+=(m.tm-time)*.2;
}
/* other players: positions arrive ~15x/s with network jitter. They are buffered and shown PEER_DELAY seconds late, interpolated linearly
   between the two samples around that moment, so they glide at their real speed instead of chasing the latest packet. */
const PEER_DELAY=.2; /* v5_166 was .12 (< 2 updates): any late packet ran the buffer dry and the player froze, then jumped */
/* v5_163 remote players: (1) a dash / teleport skill (one update that jumps > PEER_BLINK units) now draws a trail + rings at both ends, so it reads as a skill and not as a glitch;
   (2) after a lag spike (> .25 s without an update) the player no longer freezes and then zips: the catch-up slide lasts as long as running that distance really takes (PEER_RUN units/s),
   and only a huge jump (respawn, Home Scroll, world change: > PEER_SNAP) snaps. A standing player that starts moving (first step is short) still does not slide from the old spot. */
const PEER_BLINK=110,PEER_SNAP=900,PEER_RUN=450,PEER_STILL=70;
function peerBlinkFx(ox,oy,nx,ny){
  const d=Math.hypot(nx-ox,ny-oy),col='#c7b8ff';
  if(d<=700)for(let j=0;j<=10;j++)spark(ox+(nx-ox)*j/10,oy+(ny-oy)*j/10,col,2,60,.4,2.4);
  ring(ox,oy,36,col);ring(nx,ny,50,col,'whirl');spark(nx,ny,col,10,200,.4,2.6);
}
function peerSample(q,x,y){
  const t=performance.now()/1000,b=q.buf||(q.buf=[]),l=b[b.length-1];let tt=t;
  if(l&&l.x===x&&l.y===y)return;                                  /* repeated position: keep the longer segment, no stutter */
  if(l){
    const d=Math.hypot(x-l.x,y-l.y),gap=t-l.t;
    if(gap<=.25){ /* regular update */
      tt=Math.min(Math.max(t,l.t+.045),l.t+.09);if(Math.abs(tt-t)>.15)tt=t; /* v5_166 even out arrival jitter: stamps stay 45-90 ms apart (updates are really 66 ms apart) */
      if(d>PEER_BLINK){peerBlinkFx(l.x,l.y,x,y);if(d>400){b.length=0;q.x=x;q.y=y}} /* dash / teleport skill */
    }else if(d>PEER_SNAP){peerBlinkFx(l.x,l.y,x,y);b.length=0;q.x=x;q.y=y}  /* respawn / Home Scroll / world change */
    else if(d>=PEER_STILL){b.push({t:t-Math.min(.6,Math.max(.066,d/PEER_RUN)),x:l.x,y:l.y})} /* lag catch-up: slide at running speed instead of a freeze + zip */
    else b.push({t:t-.066,x:l.x,y:l.y});                            /* was standing still: do not slide during the pause */
  }
  b.push({t:tt,x,y});if(b.length>16)b.shift();
}
function updatePeers(dt){
  const k=Math.min(1,dt*12),rt=performance.now()/1000-PEER_DELAY;
  for(const q of NET.peers.values()){
    const ox=q.x,oy=q.y,b=q.buf;
    if(b&&b.length){
      while(b.length>2&&b[1].t<=rt)b.shift();
      const a=b[0],c=b[1];let tx,ty;
      if(!c||rt>=(c.t)){const l=b[b.length-1];tx=l.x;ty=l.y}
      else if(rt<=a.t){tx=a.x;ty=a.y}
      else{const f=(rt-a.t)/(c.t-a.t);tx=a.x+(c.x-a.x)*f;ty=a.y+(c.y-a.y)*f}
      const dd=Math.hypot(tx-q.x,ty-q.y); /* v5_166 ease the last few units so small timing hiccups do not show; real dashes / teleports (> 150) still go straight there */
      if(dd>150)(q.x=tx,q.y=ty);else{const e=1-Math.exp(-dt*30);q.x+=(tx-q.x)*e;q.y+=(ty-q.y)*e}
    }else{const dx=q.tx-q.x,dy=q.ty-q.y;
      if(dx*dx+dy*dy>160000){q.x=q.tx;q.y=q.ty}else{q.x+=dx*k;q.y+=dy*k}}
    const mvd=Math.hypot(q.x-ox,q.y-oy);
    q.mvAmt+=((mvd>.05?1:0)-q.mvAmt)*Math.min(1,dt*10);q.anim+=mvd*.07;
    q.swing-=dt;q.hurt-=dt;
    {if(q.jzAt&&performance.now()/1000-q.jzAt>5)q.jzT=0;q.jz=(q.jz||0)+((q.jzT||0)-(q.jz||0))*Math.min(1,dt*18)} /* v5_170 their height, from 'jz' messages */
    if(Math.cos(q.face)>.1)q.dir=1;else if(Math.cos(q.face)<-.1)q.dir=-1;
  }
}
function updateMonstersMP(dt){
  const k=Math.min(1,dt*12);
  for(const m of mons){
    if(m.flash>0)m.flash-=dt;
    if(m.predT>0)m.predT-=dt;
    if(m.dead){m.dieT=Math.max(0,(m.dieT||0)-dt);continue}
    m.atkT=Math.max(0,(m.atkT||0)-dt);
    if(m.tx!==undefined){const dx=m.tx-m.x,dy=m.ty-m.y;if(dx*dx+dy*dy>90000){m.x=m.tx;m.y=m.ty}else{m.x+=dx*k;m.y+=dy*k}}
  }
}
/* other players' skill effects: purely visual, they never deal damage here (their own client reports that to the server) */
function playFx(m){
  const q=NET.peers.get(m.id),col=/^#[0-9a-f]{6}$/i.test(m.c)?m.c:'#cfe8ff',x=+m.x||0,y=+m.y||0;
  switch(m.k){
    case 'pr':{
      const an=Array.isArray(m.a)?m.a.slice(0,9):[];
      for(const g of an)if(typeof g==='number')projs.push({x,y,vx:Math.cos(g)*520,vy:Math.sin(g)*520,life:.7,l0:.7,dmg:0,hit:new Set(),ang:g,col,cos:true});
      if(q&&typeof an[0]==='number'){q.face=an[0];q.swing=.2}
      break}
    case 'ri':ring(x,y,clamp(+m.r||100,20,400),col,m.q==='whirl'?'whirl':0);if(m.s)spark(x,y,col,18,240,.5,2.6);break;
    case 'mt':{const r=clamp(+m.r||110,20,400);ring(x,y,r,col);ring(x,y,r*.6,col);delayed.push({t:.7,f:()=>{ring(x,y,r,col,'whirl');spark(x,y,col,30,300,.7,3.2)}});break}
    case 'ch':{
      const p=Array.isArray(m.p)?m.p.slice(0,40):[];
      for(let i=0;i+3<p.length;i+=4){
        for(let k=0;k<7;k++)spark(p[i]+(p[i+2]-p[i])*k/7,p[i+1]+(p[i+3]-p[i+1])*k/7,col,1,40,.35,2.4);
        ring(p[i+2],p[i+3],40,col);
      }
      break}
    case 'sw':if(q){q.swing=.18;q.face=+m.f||0}break;
    case 'jz':if(q){q.jzT=clamp(+m.z||0,0,400);q.jzAt=performance.now()/1000}break; /* v5_170 another player's height above the ground (jumping / standing on a structure) */
    case 'sp':{ /* v5_165 another player's spirits (visual only) */
      if(!q)break;const a=Array.isArray(m.a)?m.a:[],list=[];
      for(let kd=1;kd<=4;kd++){const n=clamp(a[kd-1]|0,0,6);for(let j=0;j<n;j++)list.push({k:kd,col,fz:m.f?1:0})}
      q.spx=list.length?{e:performance.now()/1000+clamp(+m.t||0,0,20),list}:null;break}
  }
}
function renderOnline(){
  const box=$('online');
  if(!MP){if(!box.hidden){box.hidden=true;NET.olKey=''}return}
  const list=[...NET.peers.values()].sort((a,b)=>b.lvl-a.lvl),key=list.length+':'+NET.online+':'+PARTY.m.length+':'+FR.f.length+':'+FR.out.length+':'+list.slice(0,6).map(q=>q.name+q.lvl+(q.pvp?'!':'')+(PARTY.ids.has(q.id)?'p':'')).join('|');
  if(key===NET.olKey)return;
  NET.olKey=key;box.hidden=false;box.innerHTML='';
  const h=document.createElement('h4');h.textContent='Here \u00b7 '+(list.length+1)+'  \u00b7  Online \u00b7 '+NET.online;box.appendChild(h);
  for(const q of list.slice(0,6)){
    const r=document.createElement('div');const inP=PARTY.ids.has(q.id);r.className='pn'+(q.pvp?' pvp':'')+(inP?' pty':'');r.title='Tap to whisper';r.addEventListener('click',()=>whisperTo(q.name));
    const a=document.createElement('span'),b=document.createElement('span');a.textContent=(q.pvp?'\u2694 ':'')+q.name;b.textContent='Lv '+q.lvl;r.appendChild(a);r.appendChild(b);
    if(frIs(q.name))r.classList.add('fr');
    else{const hv=document.createElement('span');hv.className='fadd2';hv.textContent='\u2665';hv.title=FR.out.some(n=>n.toLowerCase()===q.name.toLowerCase())?'Friend request already sent to '+q.name:'Send '+q.name+' a friend request';hv.addEventListener('click',e=>{e.stopPropagation();frCmd('friend',q.name)});r.appendChild(hv)}
    if(!inP&&PARTY.m.length<4){const v=document.createElement('span');v.className='inv';v.textContent='+';v.title='Invite '+q.name+' to your party';v.addEventListener('click',e=>{e.stopPropagation();partyCmd('invite',q.name)});r.appendChild(v)}
    box.appendChild(r);
  }
  if(list.length>6){const r=document.createElement('div');r.className='pn';r.textContent='+ '+(list.length-6)+' more';box.appendChild(r)}
}
/* ---------- chat commands: type /help in chat. On the server only -admin accounts may use them; boss/bossclear/who/announce run on the server, the rest run here. ---------- */
const CMDHELP=[
 'Spawn:  /boss [1-5] [level]  \u00b7 /bossclear  \u00b7 /bosses (list + distance)  \u00b7 /gotoboss',
 'Me:  /heal  \u00b7 /god (invincible on/off)  \u00b7 /speed 0.5-5  \u00b7 /home  \u00b7 /where',
 'Stats:  /lvl N  \u00b7 /exp N  \u00b7 /coins N  \u00b7 /ore N  \u00b7 /pots N  \u00b7 /gear [grade] [common|rare|epic|legendary] [count]',
 'Reset:  /coinsreset (coins to 0)  \u00b7 /orereset (ore to 0)  \u00b7 /walletreset (both)   also /coins reset  \u00b7 /ore reset',
 'Pets:  /pet [species] [class] [count] (species: chicken dragon fairy phoenix tiger wolf random \u00b7 class: F E D C B A S)  \u00b7 /egg [count]  \u00b7 /petreset (remove every pet and egg)',
 'Forge:  /forge (show levels)  \u00b7 /forge [slot|all] 0-'+FORGE_MAX+' (set forge level)  \u00b7 /forgereset [slot|all] (back to 0)  \u00b7 slots: wpn wpn2 robe ear neck ring brace glove belt legs boot',
 'View:  /minimap 500-'+3080*MAP_K+' | max | min (radar range, default 2000; max = full map radius)',
 'Party:  /invite name  \u00b7 /accept  \u00b7 /decline  \u00b7 /leave  \u00b7 /p message or the Party chat tab  \u00b7 leader: /kick name  \u00b7 /leader name  \u00b7 /disband',
 'Friends:  /friend name (send a request)  \u00b7 /friend accept [name]  \u00b7 /friend decline [name]  \u00b7 /unfriend name  \u00b7 /friends (open the window)',
 'Private:  /w name message  \u00b7 /r message (reply)  \u00b7 or tap a name in the Here list',
 'Fun:  /fireworks  \u00b7 /roll [sides]  \u00b7 /flip',
 'Server:  /who  \u00b7 /announce message'];
const CMDNUM=(v,d)=>{const n=parseFloat(v);return isFinite(n)?n:d};
function refreshCurrencyUi(){if($('bag')&&!$('bag').hidden)renderBag();if($('forge')&&!$('forge').hidden)renderForge();if($('shop')&&!$('shop').hidden&&typeof renderShop==='function')renderShop()}
const isReset=v=>v!==undefined&&/^(reset|zero|clear|none)$/i.test(String(v));
function bossNear(n,lv){
  const alive=mons.filter(m=>m.boss&&!m.dead).length,w=W[curWorld],out=[];n=Math.min(n,BOSS_MAX-alive);
  if(curWorld===ARENA){say('There are no bosses in the arena.','#8d9aa2');return}
  if(n<=0){say('Already '+BOSS_MAX+' bosses alive. Use /bossclear.','#8d9aa2');return}
  for(let k=0;k<n;k++){
    const a=rnd()*Math.PI*2,d=350+rnd()*500,l=lv>0?clamp(lv,w.lo,w.hi):w.lo+Math.floor(rnd()*(w.hi-w.lo+1));
    let x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d;const dc=dist(x,y,C,C),lim=RIM-340;if(dc>lim){x=C+(x-C)*lim/dc;y=C+(y-C)*lim/dc}
    const m=monsterAt(x,y,BOSSES[Math.floor(rnd()*BOSSES.length)],l);m.life=BOSS_LIFE;mons.push(m);out.push(m);
  }
  announceBosses(out);
}
const RARNAME={common:0,rare:1,epic:2,legendary:3};
/* slot name (or alias) -> list of slot keys; 'all' = every slot; null = unknown */
function forgeSlots(w){
  if(w===undefined)return null;w=String(w).toLowerCase();
  if(w==='all')return GEAR.map(q=>q.k);
  const al={weapon:'wpn',blade:'wpn',primary:'wpn',secondary:'wpn2',offhand:'wpn2',earrings:'ear',earring:'ear',necklace:'neck',gloves:'glove',bracelet:'brace',boots:'boot',legguards:'legs',armor:'robe'};
  w=al[w]||w;return GEAR.some(q=>q.k===w)?[w]:null}
function forgeApply(keys,n){
  for(const k of keys)P.gear[k].lv=n; /* wpn / robe write through to P.wlv / P.alv */
  P.hp=Math.min(P.hp,maxHp());P.qi=Math.min(P.qi,maxQi());
  save();if(!$('forge').hidden)renderForge();if(!$('bag').hidden)renderBag()}
const CMDS={
  help(){for(const l of CMDHELP)say(l,'#e3b559',14000)},
  heal(){P.hp=maxHp();P.qi=maxQi();say('Fully healed.','#8ff0c4')},
  god(){P.god=!P.god;say('Invincible: '+(P.god?'ON':'OFF'),'#e3b559')},
  speed(a){const v=clamp(CMDNUM(a[0],1),.5,5);P.spdMul=v;say('Move speed x'+v,'#e3b559')},
  home(){P.x=C;P.y=C+110;P.target=null;P.mv=null;P.task=null;say('Teleported to the hub.','#d2b4ff')},
  where(){say(W[curWorld].n+' \u00b7 x '+Math.round(P.x)+', y '+Math.round(P.y)+' \u00b7 '+Math.round(dist(P.x,P.y,C,C))+' from the hub \u00b7 Lv '+P.lvl,'#8d9aa2',9000)},
  lvl(a){const n=clamp(CMDNUM(a[0],P.lvl)|0,1,MAXLV);P.lvl=n;P.exp=0;P.hp=maxHp();P.qi=maxQi();buildBar();save();say('Level set to '+n+'.','#e3b559')},
  exp(a){const n=Math.max(0,CMDNUM(a[0],0)|0);if(n)gainExp(n);say('+'+n.toLocaleString()+' EXP','#e3b559')},
  coins(a){if(isReset(a[0])){CMDS.coinsreset();return}const n=CMDNUM(a[0],1000)|0;P.coins=clamp(P.coins+n,0,2e9);save();say('Coins: '+P.coins.toLocaleString(),'#e3b559')},
  ore(a){if(isReset(a[0])){CMDS.orereset();return}const n=CMDNUM(a[0],100)|0;P.ore=clamp(P.ore+n,0,2e9);save();say('Ore: '+P.ore.toLocaleString(),'#7fe0ee')},
  /* v5_200 admin: set coins / ore back to zero (also /coins reset, /ore reset, /coins zero ...) */
  coinsreset(){P.coins=0;save();refreshCurrencyUi();say('Coins reset to 0.','#e3b559')},
  orereset(){P.ore=0;save();refreshCurrencyUi();say('Ore reset to 0.','#7fe0ee')},
  walletreset(){P.coins=0;P.ore=0;save();refreshCurrencyUi();say('Coins and ore reset to 0.','#e3b559')},
  resetcoins(){CMDS.coinsreset()},resetore(){CMDS.orereset()},resetwallet(){CMDS.walletreset()},
  /* v5_200 admin: /pet [species] [class] [count]  -> gives pets straight into the bag (no egg needed). Chicken has no class. Every argument is optional and may come in any order. */
  pet(a){
    let s=-1,c=0,n=1,rs=false;
    for(const w0 of a){const w=String(w0).toLowerCase();
      if(w==='random'||w==='any'||w==='r'){rs=true;continue}
      const si=PET_SP.findIndex(q=>q.n.toLowerCase()===w||(w.length>=3&&q.n.toLowerCase().startsWith(w)));if(si>=0){s=si;continue}
      const ci=PET_CLS.indexOf(w.toUpperCase());if(ci>=0&&w.length===1){c=ci;continue}
      if(/^x?\d+$/.test(w)){n=clamp(parseInt(w.replace('x',''),10)||1,1,999);continue}
      say('Usage: /pet [species] [class] [count]   species: '+PET_SP.map(q=>q.n.toLowerCase()).join(' ')+' random   class: '+PET_CLS.join(' ')+'   e.g. /pet dragon S 2','#d9503f');return}
    const given=[];
    for(let i=0;i<n;i++){
      const sp=s>=0&&!rs?s:1+Math.floor(rnd()*(PET_SP.length-1)),cl=sp===0?0:c;
      const k=petKey(sp,cl);if(!(petsObj()[k]>0)&&!given.includes(k)&&bagCount()+given.length>=BAG_CAP){say('Bag full - '+i+' of '+n+' pets given. Make room first.','#8d9aa2');break}
      petAdd(sp,cl,1);if(!given.includes(k))given.push(k)}
    if(!given.length)return;
    save();if(!$('bag').hidden)renderBag();
    say('Added '+(n>1?n+' pets: ':'a pet: ')+given.map(k=>{const p=petParse(k);return petName(p.s,p.c)}).join(', ')+'.','#ffe14a',6000)},
  egg(a){const n=clamp(CMDNUM(a[0],1)|0,1,9999);P.eggs=clamp((P.eggs|0)+n,0,99999);save();if(!$('bag').hidden)renderBag();say('Pet Eggs: '+P.eggs.toLocaleString(),'#f4ecd8')},
  petreset(){P.pets={};P.eggs=0;P.pet=null;P.pf=null;petComb=null;if(typeof bagSel==='string'&&(bagSel==='egg'||bagSel.indexOf('pet_')===0))bagSel=null;save();if(!$('bag').hidden)renderBag();say('All pets and eggs removed.','#e3b559')},
  pots(a){const n=CMDNUM(a[0],10)|0;for(const k of ['hp','ck','qi','tp'])P.pots[k]=clamp(P.pots[k]+n,0,POT_MAX);save();say('Potions and scrolls '+(n>=0?'+':'')+n+' each.','#e3b559')},
  minimap(a){const w=String(a[0]||'').toLowerCase();MINI_MAX=w==='max';if(!MINI_MAX)MINI_R=w==='min'?500:clamp(CMDNUM(a[0],2000),500,3080*MAP_K);say('Minimap range: '+(MINI_MAX?RIM+' units (maximum radius = whole map)':MINI_R+' units.'),'#e3b559')},
  boss(a){bossNear(clamp(CMDNUM(a[0],1)|0,1,BOSS_MAX),CMDNUM(a[1],0)|0)},
  bossclear(){let n=0;for(const m of mons)if(m.boss&&!m.dead){m.dead=true;m.dieT=0;m.respawn=1e9;n++}say('Removed '+n+' boss(es).','#e3b559')},
  bosses(){
    const L=mons.filter(m=>m.boss&&!m.dead).sort((p,q)=>dist(p.x,p.y,P.x,P.y)-dist(q.x,q.y,P.x,P.y));
    if(!L.length){say('No bosses alive. Try /boss','#8d9aa2');return}
    const dirs=['E','SE','S','SW','W','NW','N','NE'];
    for(const m of L)say(m.name+' Lv '+m.lvl+' \u00b7 '+Math.round(dist(m.x,m.y,P.x,P.y))+' away to the '+dirs[Math.round(((Math.atan2(m.y-P.y,m.x-P.x)+6.2832)%6.2832)/.7854)%8],'#ff9a6a',12000)},
  gotoboss(){
    const L=mons.filter(m=>m.boss&&!m.dead).sort((p,q)=>dist(p.x,p.y,P.x,P.y)-dist(q.x,q.y,P.x,P.y));
    if(!L.length){say('No bosses alive. Try /boss','#8d9aa2');return}
    const m=L[0];P.x=m.x-160;P.y=m.y;P.target=null;P.mv=null;P.task=null;say('Teleported next to '+m.name+'. Good luck!','#ff9a6a')},
  fireworks(){
    const cols=['#ff6a6a','#ffd36b','#8ff0c4','#6ab8ff','#d2b4ff','#ff9ad5'];
    for(let i=0;i<16;i++)setTimeout(()=>{const x=P.x+(rnd()-.5)*520,y=P.y+(rnd()-.5)*340,c=cols[i%cols.length];ring(x,y,70+rnd()*60,c);spark(x,y,c,28,280,.9,3);pop(x,y,'\u2726',c,26)},i*150);
    say('Celebrate!','#ffd36b')},
  roll(a){const n=clamp(CMDNUM(a[0],100)|0,2,1e6);say('You rolled '+(1+Math.floor(Math.random()*n))+' (1-'+n+')','#e8e0ca')},
  flip(){say(Math.random()<.5?'Heads!':'Tails!','#e8e0ca')},
  gear(a){
    const g=clamp(CMDNUM(a[0],Math.max(1,curWorld))|0,1,NW),rr=a[1]===undefined||a[1]==='random'?-1:(a[1] in RARNAME?RARNAME[a[1]]:clamp(CMDNUM(a[1],0)|0,0,RAR.length-1)),n=clamp(CMDNUM(a[2],1)|0,1,20);
    for(let i=0;i<n;i++){const q=GEAR[Math.floor(rnd()*GEAR.length)];takeGear(rollGear(q,g,.5,rr<0?rollRarity():rr))}
    renderBag&&!$('bag').hidden&&renderBag()},
  /* v5_143 admin: set / reset forge level. The level belongs to the SLOT (wpn / robe use the Blade / Robe level), so it works with or without an item worn. */
  forge(a){
    const sl=forgeSlots(a[0]);
    if(a.length===0){say('Forge levels: '+GEAR.map(q=>q.k+' +'+P.gear[q.k].lv).join(' \u00b7 '),'#e3b559');return}
    let keys=sl,val=a.length>1?a[1]:a[0];
    if(a.length===1&&!isNaN(parseFloat(a[0]))){keys=GEAR.map(q=>q.k);val=a[0]} /* "/forge 50" = every slot */
    if(!keys||keys.length===0||isNaN(parseFloat(val))){say('Usage: /forge [slot|all] 0-'+FORGE_MAX+'   slots: '+GEAR.map(q=>q.k).join(' '),'#d9503f');return}
    const n=clamp(parseFloat(val)|0,0,FORGE_MAX);
    forgeApply(keys,n);say('Forge level set to +'+n+' on '+(keys.length===GEAR.length?'all slots':keys.join(', '))+'.','#e3b559')},
  forgereset(a){
    const keys=a.length?forgeSlots(a[0]):GEAR.map(q=>q.k);
    if(!keys||keys.length===0){say('Usage: /forgereset [slot|all]   slots: '+GEAR.map(q=>q.k).join(' '),'#d9503f');return}
    forgeApply(keys,0);say('Forge level reset to +0 on '+(keys.length===GEAR.length?'all slots':keys.join(', '))+'.','#e3b559')},
  who(){say('/who needs the multiplayer server.','#8d9aa2')},
  announce(){say('/announce needs the multiplayer server.','#8d9aa2')}
};
function runCmd(line){
  if(!started)return;
  const f=line.trim().split(/\s+/),c=f[0].replace(/^\//,'').toLowerCase();
  if(CMDS[c]&&Object.prototype.hasOwnProperty.call(CMDS,c)){try{CMDS[c](f.slice(1))}catch(e){say('Command failed: '+e.message,'#d9503f')}}
  else say('Unknown command "/'+c+'". Type /help','#8d9aa2');
}
let PM_LAST=''; /* name of the last player who whispered to you (for /r) */
/* ---------- CHAT WINDOW ----------
   Tabs: All (world chat + system + whispers), World (player chat), System (kills, drops, announcements), and one tab per whisper partner.
   Enter / Chat button opens it; Enter sends. History is kept while the page is open. State object CP is declared next to say(). */
const CPREF=(()=>{const d={sys:true,pm:true,ts:true,feed:true};try{return Object.assign(d,JSON.parse(localStorage.getItem('wl_chatpref')||'{}'))}catch(e){return d}})();
function cpSavePref(){try{localStorage.setItem('wl_chatpref',JSON.stringify(CPREF))}catch(e){}$('hud').classList.toggle('nofeed',!CPREF.feed)}
function cpOpen(){const e=$('cp');return !!e&&!e.hidden}
function cpFmt(u){const d=new Date(u*1000),n=new Date(),t=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');return d.toDateString()===n.toDateString()?t:(d.getMonth()+1)+'/'+d.getDate()+' '+t}
function cpTime(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
const pcKey=n=>String(n).toLowerCase();
function cpMatch(m){
  const c=CP.cur;
  if(c==='all')return m.k==='chat'||m.k==='pty'||(m.k==='sys'&&CPREF.sys)||(m.k==='pm'&&CPREF.pm);
  if(c==='party')return m.k==='pty';
  if(c==='world')return m.k==='chat';
  if(c==='sys')return m.k==='sys';
  return m.k==='pm'&&'pm:'+m.th===c;
}
function cpPush(m){
  if(!m.ts)m.ts=cpTime();CP.log.push(m);
  if(CP.log.length>300){const i=CP.log.findIndex(x=>x.k!=='pm');CP.log.splice(i<0?0:i,1)} /* trim old world/system lines first: private messages are kept until the player deletes them */
  if(m.k==='pm')pmSaveSoon();
  const open=cpOpen(),c=CP.cur;
  if(m.k==='chat'){if(!m.me&&!(open&&(c==='all'||c==='world')))CP.un.world=Math.min(99,CP.un.world+1)}
  else if(m.k==='sys'){if(!(open&&(c==='sys'||(c==='all'&&CPREF.sys))))CP.un.sys=Math.min(99,CP.un.sys+1)}
  else if(m.k==='pty'){if(!m.me&&!(open&&(c==='party'||c==='all')))CP.un.party=Math.min(99,CP.un.party+1)}
  else if(m.k==='pm'&&!m.me){const t=CP.th.get(m.th);if(t&&!(open&&c==='pm:'+m.th))t.un=Math.min(99,t.un+1)}
  cpSched();
}
function cpSched(){if(CP.raf)return;CP.raf=requestAnimationFrame(()=>{CP.raf=0;cpRender()})}
function cpClearUn(){
  const c=CP.cur;
  if(c==='all'){CP.un.world=0;CP.un.party=0;if(CPREF.sys)CP.un.sys=0}
  else if(c==='party')CP.un.party=0;
  else if(c==='world')CP.un.world=0;
  else if(c==='sys')CP.un.sys=0;
  else{const t=CP.th.get(c.slice(3));if(t)t.un=0}
}
function cpBadges(){
  let pm=0;CP.th.forEach(t=>pm+=t.un);
  const tot=CP.un.world+CP.un.party+pm,txt=tot>99?'99+':String(tot);
  for(const id of ['cpDoorN','chN']){const b=$(id);if(b){b.textContent=txt;b.style.display=tot?'':'none'}}
  const pn=$('pcN');if(pn){pn.textContent=pm>99?'99+':String(pm);pn.style.display=pm?'':'none'}
}
function cpAvatar(sk){
  const s=skinOf(sk|0),a=document.createElement('span');a.className='av';
  a.style.background='linear-gradient(#25324a,'+s.sash+')';
  const b=document.createElement('i');b.className='bd2';b.style.background=s.robe;b.style.borderTopColor=s.trim;
  const h=document.createElement('i');h.className='hd2';h.style.background='linear-gradient('+s.hair+' 0 40%,'+s.skin+' 40%)';
  a.appendChild(b);a.appendChild(h);return a;
}
function cpEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function cpRow(m){
  if(m.k==='sys'){
    const d=cpEl('div','cs',m.m);if(m.col)d.style.color=m.col;
    if(CPREF.ts)d.appendChild(cpEl('span','tm',' ('+m.ts+')'));
    return d;
  }
  const pm=m.k==='pm',d=cpEl('div','cm'+(m.me?' me':'')+(pm?' pm':''));
  d.appendChild(cpAvatar(m.sk));
  const body=cpEl('div','cb'),h=cpEl('div','ch');
  if(pm){const t=CP.th.get(m.th);const w=cpEl('span','wh','[Whisper'+(m.me&&CP.cur==='all'&&t?' \u2192 '+t.name:'')+(m.off?' \u00b7 offline':'')+']');if(m.off)w.title=m.me?'They were offline. They will get this when they log in.':'Sent while you were offline.';h.appendChild(w)}
  else if(m.k==='pty'){const w=cpEl('span','wh','[Party]');w.style.color='#8ff0b0';h.appendChild(w);if(m.lv)h.appendChild(cpEl('span','tg','[Lv '+m.lv+']'))}
  else if(m.lv)h.appendChild(cpEl('span','tg','[Lv '+m.lv+']'));
  if(m.wt)h.appendChild(cpEl('span','wt','['+m.wt+']'));
  h.appendChild(cpEl('span','nm',m.me?'You':m.n));
  if(CPREF.ts)h.appendChild(cpEl('span','tm','('+m.ts+')'));
  body.appendChild(h);
  const bb=cpEl('div','bb',m.m),lm=String(m.m).match(CP_LOC_RE);
  if(lm){bb.classList.add('loc');bb.title='Click to walk to this location';bb.addEventListener('click',()=>cpGoLoc(lm[1],+lm[2],+lm[3]))}
  body.appendChild(bb);d.appendChild(body);return d;
}
function cpTabsRender(){
  const box=$('cpTabs'),sc=box.scrollTop,defs=[{id:'all',ic:'\u{1F310}',lb:'All',un:0},{id:'world',ic:'\u{1F3EF}',lb:'World',un:CP.un.world},{id:'sys',ic:'\u{1F4E2}',lb:'System',un:CP.un.sys}];
  if(PARTY.m.length>1)defs.splice(2,0,{id:'party',ic:'\u{1F6E1}',lb:'Party',un:CP.un.party});
  CP.th.forEach((t,k)=>defs.push({id:'pm:'+k,ic:'\u{1F91D}',lb:t.name,un:t.un,pm:k}));
  box.innerHTML='';
  for(const d of defs){
    const b=cpEl('div','ct'+(d.id===CP.cur?' on':''));b.title=d.lb;
    b.appendChild(cpEl('span','ic2',d.ic));b.appendChild(cpEl('span','lb2',d.lb));
    if(d.un&&d.id!==CP.cur)b.appendChild(cpEl('span','bdg',d.un>99?'99+':String(d.un)));
    if(d.pm){const x=cpEl('span','cx','\u00d7');x.title='Close this chat';x.addEventListener('click',e=>{e.stopPropagation();cpCloseThread(d.pm)});b.appendChild(x)}
    b.addEventListener('click',()=>cpSwitch(d.id));
    box.appendChild(b);
  }
  box.scrollTop=sc;
}
function cpLogRender(){
  const log=$('cpLog'),stick=CP.stick||log.scrollHeight-log.scrollTop-log.clientHeight<48,list=CP.log.filter(cpMatch).slice(-150),fr=document.createDocumentFragment();
  if(!list.length){
    const c=CP.cur;
    fr.appendChild(cpEl('div','hint',c.startsWith('pm:')?'Say something to '+CP.th.get(c.slice(3)).name+'. Only they can see it. If they are offline they get it when they log in.':c==='sys'?'Kills, drops and announcements show up here.':c==='party'?'Only your party can see messages here. Press Enter and type. (/p message works from any tab.)':(NET.on&&NET.joined)?'No messages yet. Press Enter and say hello.':'Chat needs the multiplayer server.'));
  }
  for(const m of list)fr.appendChild(cpRow(m));
  log.innerHTML='';log.appendChild(fr);
  if(stick)log.scrollTop=log.scrollHeight;CP.stick=false;
}
function cpRender(){
  cpBadges();
  if(!cpOpen())return;
  cpTabsRender();cpLogRender();
  const inp=$('cpIn'),ro=CP.cur==='sys';
  inp.disabled=ro;inp.placeholder=ro?'System messages are read-only.':CP.cur==='party'?'Party chat':CP.cur.startsWith('pm:')?'Whisper to '+CP.th.get(CP.cur.slice(3)).name:'Enter text.';
}
function cpSwitch(id){
  if(id.startsWith('pm:')&&!CP.th.has(id.slice(3)))id='all';
  if(id==='party'&&PARTY.m.length<2)id='all';
  CP.cur=id;CP.stick=true;cpClearUn();cpPopHide();cpRender();
  if(!$('cpIn').disabled&&!PHONE)$('cpIn').focus();
}
function cpShow(ch,focus){
  $('cp').hidden=false;$('hud').classList.add('cpOpen');
  if(ch)CP.cur=ch;
  if(CP.cur.startsWith('pm:')&&!CP.th.has(CP.cur.slice(3)))CP.cur='all';
  if(CP.cur==='party'&&PARTY.m.length<2)CP.cur='all';
  CP.stick=true;cpClearUn();cpPopHide();cpRender();
  if(focus!==false&&!$('cpIn').disabled){for(const k in keys)keys[k]=false;setTimeout(()=>$('cpIn').focus(),0)}
}
function cpHide(){if(!cpOpen())return;$('cp').hidden=true;$('hud').classList.remove('cpOpen');$('cpIn').blur();cpPopHide()}
function openChat(){
  if(!started)return;
  if(cpOpen()){if(document.activeElement!==$('cpIn')&&!$('cpIn').disabled){for(const k in keys)keys[k]=false;$('cpIn').focus()}return}
  cpShow(null,true);
}
function toggleChat(){if(!started)return;if(cpOpen())cpHide();else cpShow(null,!PHONE)}
/* ----- private chat is kept per account in this browser until the player deletes it (tab X = delete conversation, menu "Clear this tab" = clear its messages) ----- */
let PM_LOADED=false,PM_T=0;
const pmKey=()=>'al_pm_'+String(AUTH.email||'').toLowerCase();
function pmSaveNow(){
  clearTimeout(PM_T);PM_T=0;
  if(!PM_LOADED||!AUTH.email)return;   /* never overwrite the stored chat before it has been loaded */
  try{
    const th=[],msgs=[],per={};
    CP.th.forEach((t,k)=>th.push({k:k,n:t.name,u:t.un||0}));
    for(let i=CP.log.length-1;i>=0;i--){const m=CP.log[i];if(m.k!=='pm')continue;
      per[m.th]=(per[m.th]||0)+1;if(per[m.th]>200)continue;   /* newest 200 messages per conversation */
      msgs.push({th:m.th,n:m.n,m:m.m,me:m.me?1:0,sk:m.sk||0,lv:m.lv||0,off:m.off?1:0,ts:m.ts||''})}
    msgs.reverse();
    localStorage.setItem(pmKey(),JSON.stringify({v:1,th:th,msgs:msgs}));
  }catch(e){}
}
function pmSaveSoon(){if(!PM_LOADED)return;clearTimeout(PM_T);PM_T=setTimeout(pmSaveNow,400)}
function pmLoad(){
  PM_LOADED=false;
  CP.th.clear();CP.log=CP.log.filter(m=>m.k!=='pm');
  try{
    const d=JSON.parse(localStorage.getItem(pmKey())||'null');
    if(d&&Array.isArray(d.th)){
      for(const t of d.th)if(t&&t.k&&t.n)CP.th.set(String(t.k),{name:String(t.n),un:Math.min(99,t.u|0)});
      const old=[];
      for(const x of (d.msgs||[]))if(x&&CP.th.has(String(x.th)))old.push({k:'pm',th:String(x.th),n:String(x.n),m:String(x.m),me:!!x.me,sk:x.sk|0,lv:x.lv|0,off:!!x.off,ts:String(x.ts||'')});
      CP.log=old.concat(CP.log);
    }
  }catch(e){}
  PM_LOADED=true;cpSched();
}
window.addEventListener('pagehide',pmSaveNow);
window.addEventListener('beforeunload',pmSaveNow);
/* ----- whisper threads (messages live in CP.log; a thread is just a tab + unread count) ----- */
function pcThread(name,mk){const k=pcKey(name);let t=CP.th.get(k);if(!t&&mk){t={name:String(name),un:0};CP.th.set(k,t);pmSaveSoon()}return t}
function cpCloseThread(k){
  CP.th.delete(k);CP.log=CP.log.filter(m=>!(m.k==='pm'&&m.th===k));
  if(CP.cur==='pm:'+k)CP.cur='all';CP.stick=true;cpRender();pmSaveSoon();
}
function pcAdd(name,text,me,id,x){
  let t=pcThread(name,false);
  /* a tab opened with a typed name that is still empty takes the real name the server resolved (e.g. "Win" -> "Wind Walker") */
  if(me&&!t&&CP.cur.startsWith('pm:')){
    const ck=CP.cur.slice(3),ct=CP.th.get(ck);
    if(ct&&!CP.log.some(x=>x.k==='pm'&&x.th===ck)&&pcKey(ct.name)!==pcKey(name)){CP.th.delete(ck);ct.name=String(name);CP.th.set(pcKey(name),ct);CP.cur='pm:'+pcKey(name);t=ct}
  }
  if(!t)t=pcThread(name,true);
  const k=pcKey(t.name),q=me?null:NET.peers.get(id),info=me?{sk:SKIN,lv:P.lvl}:q?{sk:q.sk,lv:q.lvl}:CP.who.get(k);
  if(info&&!me)CP.who.set(k,info);
  cpPush({k:'pm',th:k,n:me?'You':String(name),m:String(text),me:!!me,sk:info?info.sk:0,lv:info?info.lv:0,off:!!(x&&x.off),ts:(x&&x.ts)?cpFmt(x.ts):''});
}
function openPrivate(name,focus){
  if(!started)return;
  if(!(NET.on&&NET.joined)){say('Private chat needs the multiplayer server.','#8d9aa2');return}
  const t=pcThread(name,true);t.un=0;cpShow('pm:'+pcKey(t.name),focus!==false);
}
function whisperTo(name){openPrivate(name,true)}
function togglePchat(){
  if(!started)return;
  if(cpOpen()){cpHide();return}
  const u=[...CP.th.entries()].find(e=>e[1].un);
  cpShow(u?'pm:'+u[0]:null,!PHONE);
}
/* ----- sending ----- */
function cpSend(){
  const inp=$('cpIn');let t=inp.value.trim();if(!t||CP.cur==='sys')return;
  const online=NET.on&&NET.joined,c=CP.cur,done=()=>{inp.value='';CP.stick=true;if(PHONE)inp.blur()};
  if(c==='party'&&t[0]!=='/'){
    if(!online||PARTY.m.length<2){say('You are not in a party.','#8d9aa2');return}
    netSend({t:'party',m:'chat',tx:t});done();return;
  }
  if(c.startsWith('pm:')&&t[0]!=='/'){
    const th=CP.th.get(c.slice(3));
    if(!online){say('Private messages need the multiplayer server.','#8d9aa2');return}
    netSend({t:'chat',m:'/w "'+th.name+'" '+t});done();return;
  }
  const rm=t.match(/^\/r\s+(.+)/i);
  if(rm){if(!PM_LAST){say('Nobody has whispered to you yet.','#8d9aa2');inp.value='';return}t='/w "'+PM_LAST+'" '+rm[1]}
  const wm=t.match(/^\/(?:w|pm|msg|tell|whisper)\s+(?:"([^"]+)"|(\S+))\s*$/i);
  if(wm){inp.value='';openPrivate(wm[1]||wm[2],true);return}
  if(/^\/r\s*$/i.test(t)){inp.value='';if(PM_LAST)openPrivate(PM_LAST,true);else say('Nobody has whispered to you yet.','#8d9aa2');return}
  if(/^\/(w|pm|msg|tell|whisper)(\s|$)/i.test(t)&&!online){say('Private messages need the multiplayer server.','#8d9aa2');inp.value='';return}
  const fc=t.match(/^\/(friend|friends|unfriend|addfriend)(?:\s+(.*))?$/i);
  if(fc){inp.value='';frCmd(fc[1].toLowerCase()==='addfriend'?'friend':fc[1].toLowerCase(),fc[2]);return}
  const pc=t.match(/^\/(invite|accept|decline|leave|kick|leader|promote|disband|party|p)(?:\s+(.*))?$/i);
  if(pc){inp.value='';partyCmd(pc[1].toLowerCase(),(pc[2]||'').trim().replace(/^"(.*)"$/,'$1'));return}
  if(t[0]==='/'){if(online)netSend({t:'chat',m:t});else runCmd(t)}
  else if(NET.on)netSend({t:'chat',m:t});else say('Chat needs the multiplayer server.','#8d9aa2');
  done();
}
/* ----- pop-ups: settings, new whisper, help, quick phrases ----- */
function cpPopHide(){const p=$('cpPop');if(p){p.hidden=true;p.innerHTML=''}CP.pop=''}
function cpPopOpen(kind,top){
  const p=$('cpPop');if(!p.hidden&&CP.pop===kind){cpPopHide();return null}
  p.innerHTML='';p.hidden=false;CP.pop=kind;p.classList.toggle('top',!!top);return p;
}
function cpItem(p,a,b,fn){const it=cpEl('button','it');it.type='button';it.appendChild(cpEl('span','',a));if(b!==undefined)it.appendChild(cpEl('span','',b));it.addEventListener('click',fn);p.appendChild(it);return it}
function cpSettings(){
  const p=cpPopOpen('set',true);if(!p)return;
  p.appendChild(cpEl('h5','','Chat settings'));
  for(const [k,lb] of [['sys','Show system messages in All'],['pm','Show whispers in All'],['ts','Show times'],['feed','Floating messages over the game']]){
    const l=cpEl('label'),c=document.createElement('input');c.type='checkbox';c.checked=!!CPREF[k];
    c.addEventListener('change',()=>{CPREF[k]=c.checked;cpSavePref();CP.stick=true;cpRender()});
    l.appendChild(c);l.appendChild(cpEl('span','',lb));p.appendChild(l);
  }
  cpItem(p,'Clear this tab',undefined,()=>{CP.log=CP.log.filter(m=>!cpMatch(m));CP.stick=true;cpPopHide();cpRender();pmSaveSoon()});
}
function cpNewChat(){
  const p=cpPopOpen('new',true);if(!p)return;
  p.appendChild(cpEl('h5','','New private chat'));
  if(!(NET.on&&NET.joined)){p.appendChild(cpEl('p','','Private chat needs the multiplayer server.'));return}
  const list=[...NET.peers.values()].sort((a,b)=>b.lvl-a.lvl).slice(0,8);
  if(list.length){for(const q of list)cpItem(p,q.name,'Lv '+q.lvl,()=>openPrivate(q.name,true))}
  else p.appendChild(cpEl('p','','Nobody else is in this world. Type a name to whisper anyone, even if they are offline.'));
  p.appendChild(cpEl('p','','Offline players get your message when they next log in.'));
  const r=cpEl('div','rw'),i=document.createElement('input');i.type='text';i.placeholder='Player name';i.maxLength=16;
  const go=cpEl('button','it','Start');go.type='button';go.style.width='auto';
  const run=()=>{const v=i.value.trim();if(v)openPrivate(v,true)};
  go.addEventListener('click',run);
  i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')run();else if(e.key==='Escape')cpPopHide()});i.addEventListener('keyup',e=>e.stopPropagation());
  r.appendChild(i);r.appendChild(go);p.appendChild(r);
}
function cpHelp(){
  const p=cpPopOpen('help',true);if(!p)return;
  p.appendChild(cpEl('h5','','Chat help'));
  for(const t of ['Enter opens chat, Enter sends, Esc closes.','All = everything. World = player chat. System = kills, drops, announcements.','Whisper: /w name message, or tap a name in the Here list or the + button. Works even if they are offline (they get it when they log in). Reply with /r message.','Tap the door button to jump to unread messages, the pin to share where you are.'])p.appendChild(cpEl('p','',t));
  cpItem(p,'Show all commands',undefined,()=>{cpPopHide();$('cpIn').value='/help';cpSend()});
}
function cpQuick(){
  const p=cpPopOpen('list',false);if(!p)return;
  p.appendChild(cpEl('h5','','Quick phrases'));
  for(const t of ['Anyone want to party?','Boss spotted!','Help, I need backup!','Thanks!','GG','Brb'])cpItem(p,t,undefined,()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');$('cpIn').value=t;cpSend()});
  p.appendChild(cpEl('h5','','Commands'));
  cpItem(p,'/w name message','Whisper',()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');const i=$('cpIn');i.value='/w ';i.focus()});
  cpItem(p,'/r message','Reply',()=>{cpPopHide();if(CP.cur==='sys')cpSwitch('world');const i=$('cpIn');i.value='/r ';i.focus()});
}
/* clicking a shared "[Location] World (x, y)" message walks the character there (same world only) */
const CP_LOC_RE=/^\[Location\]\s+(.+?)\s+\((-?\d+),\s*(-?\d+)\)\s*$/;
function cpGoLoc(wn,x,y){
  if(!started||P.dead>0)return;
  const wi=W.findIndex(w=>w.n===wn);
  if(wi<0){say('Unknown location.','#8d9aa2');return}
  if(wi!==curWorld){say('That location is in '+wn+'. Travel to that world first.','#8d9aa2');return}
  const d=dist(x,y,C,C);if(d>RIM-20){x=C+(x-C)/d*(RIM-20);y=C+(y-C)/d*(RIM-20)} /* keep the destination inside the map edge */
  P.mv={x:x,y:y};P.target=null;P.task=null;P.mine=0;stopMine('Auto-mine off.');
  say('Heading to ('+Math.round(x)+', '+Math.round(y)+').','#8d9aa2');
}
function cpShareLoc(){
  if(!(NET.on&&NET.joined)){say('Chat needs the multiplayer server.','#8d9aa2');return}
  const loc='[Location] '+W[curWorld].n+' ('+Math.round(P.x)+', '+Math.round(P.y)+')';
  /* send only to the selected tab: a whisper tab gets a private whisper to that player, otherwise world chat */
  const th=CP.cur.startsWith('pm:')?CP.th.get(CP.cur.slice(3)):null;
  if(th){netSend({t:'chat',m:'/w \"'+th.name+'\" '+loc});CP.stick=true;return}
  netSend({t:'chat',m:loc});
  if(CP.cur==='sys')cpSwitch('world');
}
function cpJump(){
  const u=[...CP.th.entries()].find(e=>e[1].un);
  if(u)cpSwitch('pm:'+u[0]);else if(CP.un.world)cpSwitch('world');else if(CP.un.sys)cpSwitch('sys');
  else{CP.stick=true;cpLogRender()}
}
{
  const inp=$('cpIn');
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();cpSend()}else if(e.key==='Escape'){if(!$('cpPop').hidden)cpPopHide();else cpHide()}});
  inp.addEventListener('keyup',e=>e.stopPropagation());
  $('cpSet').addEventListener('click',cpSettings);$('cpNew').addEventListener('click',cpNewChat);$('cpHelp').addEventListener('click',cpHelp);
  $('cpPin').addEventListener('click',cpShareLoc);$('cpDoor').addEventListener('click',cpJump);$('cpList').addEventListener('click',cpQuick);
  $('cpX').addEventListener('click',cpHide);{const bp=$('bPchat');if(bp)bp.addEventListener('click',togglePchat)} /* v5_151 the top-bar Msg button was removed; private chat still opens with I or /w */
  $('cpLog').addEventListener('click',()=>{if(!$('cpPop').hidden)cpPopHide()});
  $('hud').classList.toggle('nofeed',!CPREF.feed);
  /* drag the window by its title bar */
  const box=$('cp'),hd=$('cpHead');let dg=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=box.getBoundingClientRect(),h=$('hud').getBoundingClientRect();dg={id:e.pointerId,ox:e.clientX-r.left,oy:e.clientY-r.top,hx:h.left,hy:h.top,hw:h.width,hh:h.height};try{hd.setPointerCapture(e.pointerId)}catch(_){}});
  hd.addEventListener('pointermove',e=>{if(!dg||e.pointerId!==dg.id)return;const w=box.offsetWidth,hh=box.offsetHeight;box.style.left=clamp(e.clientX-dg.hx-dg.ox,0,Math.max(0,dg.hw-w))+'px';box.style.top=clamp(e.clientY-dg.hy-dg.oy,0,Math.max(0,dg.hh-Math.min(hh,40)))+'px'});
  const end=e=>{if(dg&&e.pointerId===dg.id)dg=null};hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
}
$('nameIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('bStart').click()});
$('nameIn').addEventListener('input',ignCheck);

/* ---------- landscape mode (phones): full screen + rotation lock. Not every browser allows it (iPhone Safari does not), then we say so. ---------- */
const LAND={on:false,hinted:false};
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),STANDALONE=!!navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
function landPref(v){try{if(v===undefined)return localStorage.getItem('wl_land')==='1';localStorage.setItem('wl_land',v?'1':'0')}catch(e){return false}}
async function landOn(quiet){
  let ok=false;
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(e){}
  try{if(screen.orientation&&screen.orientation.lock){await screen.orientation.lock('landscape');ok=true}}catch(e){}
  LAND.on=ok||innerWidth>innerHeight;$('bLand').classList.toggle('on',LAND.on);
  if(ok)say('Landscape mode on.','#5fd3a5');
  else if(!quiet&&IOS&&!STANDALONE)say('iPhone Safari cannot hide its tabs or lock rotation. Tap Share, then Add to Home Screen, and open World of Ascension from your home screen for full screen. Turn off Portrait Orientation Lock and hold the phone sideways.','#e3b559',14000);
  else if(!quiet)say('This browser cannot lock rotation. Turn off your phone\u2019s rotation lock and hold it sideways.','#e3b559',9000);
}
function landOff(){
  try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch(e){}
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  LAND.on=false;$('bLand').classList.remove('on');say('Landscape mode off.','#8d9aa2');
}
$('bLand').addEventListener('click',()=>{if(LAND.on&&screen.orientation&&screen.orientation.type&&screen.orientation.type.startsWith('landscape')){landPref(false);landOff()}else{landPref(true);landOn(false)}});
/* remembered preference is re-applied on the first touch (browsers need a tap for fullscreen); portrait gets a one-time hint */
window.addEventListener('pointerdown',()=>{if(started&&PHONE&&landPref()&&!LAND.on&&innerHeight>innerWidth)landOn(true)},{passive:true});
setInterval(()=>{if(started&&PHONE&&IOS&&!STANDALONE&&!LAND.hinted){LAND.hinted=true;say('Tip for iPhone: Share > Add to Home Screen, then open from your home screen to play full screen without Safari tabs.','#e3b559',12000);return}if(started&&PHONE&&!LAND.hinted&&innerHeight>innerWidth*1.1){LAND.hinted=true;say('Tip: tap the Land button (left side) to play in landscape.','#e3b559',9000)}},3000);

/* ---------- keep the screen awake while playing ----------
   Screen Wake Lock API where available (needs https or localhost). Over plain http on a LAN address browsers hide that API,
   so we fall back to the NoSleep trick: a tiny muted video playing from a canvas stream keeps the phone from dimming. */
const AWAKE={lock:null,vid:null,want:false};
async function keepAwake(){
  AWAKE.want=true;
  try{
    if(navigator.wakeLock&&!AWAKE.lock){
      AWAKE.lock=await navigator.wakeLock.request('screen');
      AWAKE.lock.addEventListener('release',()=>{AWAKE.lock=null});
      return;
    }
  }catch(e){}
  if(AWAKE.lock||(AWAKE.vid&&!AWAKE.vid.paused))return;
  try{
    if(!AWAKE.vid){
      const c=document.createElement('canvas');c.width=c.height=16;
      const g=c.getContext('2d'),v=document.createElement('video');
      v.setAttribute('playsinline','');v.muted=true;v.loop=true;
      v.style.cssText='position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;left:0;top:0';
      v.srcObject=c.captureStream(5);
      document.body.appendChild(v);AWAKE.vid=v;
      let f=0;setInterval(()=>{g.fillStyle=(f++&1)?'#000':'#010101';g.fillRect(0,0,16,16)},200); /* keep the stream producing frames */
    }
    await AWAKE.vid.play();
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AWAKE.want)keepAwake()});
window.addEventListener('pointerdown',()=>{if(started&&AWAKE.want&&!AWAKE.lock&&(!AWAKE.vid||AWAKE.vid.paused))keepAwake()},{passive:true});

/* ---------- loop ---------- */
let last=performance.now(),hudT=0,saveT=0,rafPrev=0,rafAvg=16.7;
function stepGame(dt){
  if(started&&$('title').hidden){
    time+=dt;HBCLK+=dt;
    updatePlayer(dt);if(MP){updateMonstersMP(dt);updatePeers(dt)}else updateMonsters(dt);updateMisc(dt);
    hudT+=dt;if(hudT>.08){hud();hudT=0}
    saveT+=dt;if(saveT>8){save();saveT=0}
    if(window.SND)SND.tick(dt,true,combatNow(dt));
  }else if(window.SND)SND.tick(dt,false,false);
}
function frame(now){
  if(rafPrev){const d=now-rafPrev;if(d>0&&d<100)rafAvg+=(d-rafAvg)*.05}rafPrev=now;
  if(PHONE&&rafAvg<9.6&&now-last<14.5){requestAnimationFrame(frame);return} /* display runs at 120Hz+: render every other refresh (~60 fps) */
  const dt=Math.min(.05,(now-last)/1000);last=now;
  stepGame(dt);
  drawFrame();
  requestAnimationFrame(frame);
}
/* ---------- background play ----------
   Browsers stop requestAnimationFrame (and throttle page timers) in a hidden tab. A Web Worker timer is not throttled that way, so while
   the tab is hidden the worker drives the game logic (auto-hunt, auto-mine, regen, combat) in small fixed steps; drawing is skipped. */
(function(){
  let w=null;
  try{
    const src='setInterval(function(){postMessage(0)},50)';
    w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  }catch(e){return}
  w.onmessage=()=>{
    if(!document.hidden)return;
    const now=performance.now();let el=Math.min(120,(now-last)/1000);last=now;
    while(el>0){const dt=Math.min(.05,el);el-=dt;try{stepGame(dt)}catch(e){console.error(e);break}}
  };
  document.addEventListener('visibilitychange',()=>{last=performance.now()});
})();

/* ---------- start ---------- */
/* ----- permanent in-game name (IGN): checked for availability, then claimed once; the server refuses any later change ----- */
let ignT=0,ignSeq=0,ignBusy=false;
function ignMsg(t,good){const m=$('ignMsg');m.textContent=t||'';m.style.color=good?'#5fd3a5':'#d9503f'}
function applyIgnUI(){
  const i=$('nameIn'),l=document.querySelector('label[for=nameIn]');
  if(AUTH.ign){i.value=AUTH.ign;i.readOnly=true;i.title='Your in-game name is permanent.';if(l)l.textContent='Your name (permanent)';ignMsg('')}
  else{i.readOnly=false;i.title='';i.placeholder='Choose your name';if(l)l.textContent='Choose your name (permanent)';ignCheck()}
}
function ignCheck(){
  if(AUTH.ign||!AUTH.ok)return;
  clearTimeout(ignT);const v=$('nameIn').value.trim();
  if(!v){ignSeq++;ignMsg('');return}
  ignMsg('Checking\u2026',true);const seq=++ignSeq;
  ignT=setTimeout(async()=>{
    try{const r=await api('/api/ign/check?name='+encodeURIComponent(v));if(seq!==ignSeq)return;
      ignMsg(r.ok?'\u2713 "'+r.name+'" is available. It becomes permanent once you begin.':r.error,r.ok)}
    catch(e){if(seq===ignSeq)ignMsg(e.status?e.message:'Cannot check the name: server unreachable.')}
  },350);
}
/* resolves true when the account has its IGN (already set, or just claimed); false if the player must pick another */
async function ensureIgn(){
  if(AUTH.ign)return true;
  if(ignBusy)return false;
  const v=$('nameIn').value.trim();
  if(!v){ignMsg('Enter a name for your character.');$('nameIn').focus();return false}
  ignBusy=true;
  try{
    const c=await api('/api/ign/check?name='+encodeURIComponent(v));          /* 1) is it available? */
    if(!c.ok){ignMsg(c.error);return false}
    if(!confirm('Your in-game name will be "'+c.name+'".\n\nIt is permanent and cannot be changed later. Continue?'))return false;
    const r=await api('/api/ign',{name:c.name});                              /* 2) claim it (the server re-checks atomically) */
    AUTH.ign=r.ign;applyIgnUI();return true;
  }catch(e){ignMsg(e.status?e.message:'Cannot reach the server to save your name.');return false}
  finally{ignBusy=false}
}
/* v5_88 HP persistence: phone browsers often unload / reload a background tab, which used to restart the game with FULL HP (load + begin refilled it).
   The current HP/Qi is now stashed every second and restored on start (alive only, plus the natural out-of-hub regen for the time away, capped at 10 min). */
const hpKey=()=>saveKey()+'_hp';
function hpStash(){if(!started||!AUTH.ok||P.dead>0||P.hp<=0)return;try{localStorage.setItem(hpKey(),JSON.stringify({h:Math.round(P.hp),q:Math.round(P.qi),t:Date.now(),w:P.lvl}))}catch(e){}}
function hpRestore(){try{const o=JSON.parse(localStorage.getItem(hpKey())||'null');if(!o||!(o.h>0)||o.w!==P.lvl)return;const el=Math.min(600,Math.max(0,(Date.now()-o.t)/1000));
  P.hp=Math.min(maxHp(),Math.max(1,o.h+el*(1+P.lvl*.15)));P.qi=Math.min(maxQi(),Math.max(0,o.q+el*(3+P.lvl*.1+maxQi()*qrgVal()/100)))}catch(e){}}
setInterval(hpStash,4000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hpStash()});window.addEventListener('pagehide',hpStash);
async function begin(){
  if(!AUTH.ok)return;
  if(!(await ensureIgn()))return;
  applyLook(SKIN);started=true;$('title').hidden=true;
  NET.name=AUTH.ign;authSet('al_name',NET.name);
  if(NET.on&&!NET.joined)netJoin();
  keepAwake();
  fixBagOverflow();P.hp=maxHp();P.qi=maxQi();hpRestore();snapSeen();hud();
  say('Welcome to the Lotus Sanctum. Step outside and hunt.','#e8e0ca');
}
$('bStart').addEventListener('click',begin);

/* ---------- accounts (register / log in) ---------- */
function api(path,body){
  const o={method:body?'POST':'GET',headers:{}};
  if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}
  if(AUTH.token)o.headers.Authorization='Bearer '+AUTH.token;
  o.headers['X-Sid']=SID; /* v5_186 page id: /api/load makes this page the account's live session */
  return fetch(path,o).then(r=>r.text().then(t=>{
    let j=null;try{j=JSON.parse(t)}catch(e){}
    if(!r.ok)throw Object.assign(new Error((j&&j.error)||'Server error'),{status:r.status});
    return j;
  }));
}
function authMsg(msg,good){const m=$('authMsg');m.textContent=msg||'';m.style.color=good?'#5fd3a5':'#d9503f'}
function setAuthUI(){
  $('authBox').hidden=AUTH.ok;$('whoBox').hidden=!AUTH.ok;$('playBox').hidden=!AUTH.ok;
  $('whoEmail').textContent=AUTH.email;
}
function logout(){
  saveNow();pmSaveNow(); /* v5_186 save the CURRENT state first (it only pushed an already queued save before, so up to 20 s of play was lost) */
  authForget();
  location.reload();
}
async function enterAccount(){
  let server=null,got=false,newerLocal=false;
  try{server=await api('/api/load');got=true}catch(e){if(e.status===401){authForget();AUTH.token='';setAuthUI();authMsg('Session expired. Please log in again.');return}
    /* v5_186 the account's save could not be loaded (network / server error): do NOT go on with an old browser copy, it could later overwrite newer progress from another device */
    AUTH.ok=false;setAuthUI();authMsg('Could not load your saved progress from the server. Check the connection and log in again.');return}
  AUTH.ver=server?(server._ver|0):0;
  try{
    const key=saveKey(),local=localStorage.getItem(key);
    let l=null;try{l=JSON.parse(local||'null')}catch(_){}
    if(got&&server&&l&&(+l.ts||0)>(+server.ts||0)&&(l.sv===undefined||(l.sv|0)>=(server._ver|0)))newerLocal=true; /* v5_186 only if the browser copy is based on the current account version: a copy from before another device saved is stale even when its clock is ahead */   /* this account's last cloud push never made it: keep its newer browser copy and push it now */
    if(got&&server&&!newerLocal){server.sv=server._ver;delete server._ver;localStorage.setItem(key,JSON.stringify(server));if(server.sk!==undefined)localStorage.setItem('al_look_'+AUTH.email,String(server.sk|0))}
    localStorage.removeItem('ashenlotus');localStorage.removeItem('al_acct');   /* old shared slot from earlier versions: never trusted again */
  }catch(e){}
  AUTH.ok=true;pmLoad();
  let has=false;try{has=!!localStorage.getItem(saveKey())}catch(e){}
  if(has){load();$('bStart').textContent='Continue';if(!(got&&server)||newerLocal)save()}
  else{$('bStart').textContent='Begin ascension'}
  try{const me=await api('/api/me');AUTH.ign=me.ign||''}catch(e){AUTH.ign=''}
  walletLoad();
  setAuthUI();applyIgnUI();hud();
}
async function doAuth(kind){
  const email=$('emailIn').value.trim(),password=$('passIn').value;
  if(!email||!password){authMsg('Enter your email and password.');return}
  const body={email,password};
  if(kind==='register'){
    const confirm=$('pass2In').value;
    if(password.length<8){authMsg('Password must be at least 8 characters.');return}
    if(!confirm){authMsg('Please confirm your password.');$('pass2In').focus();return}
    if(confirm!==password){authMsg('Passwords do not match. Please retype them.');$('pass2In').value='';$('pass2In').focus();return}
    body.confirm=confirm;
  }
  $('bLogin').disabled=$('bRegister').disabled=true;authMsg('Please wait\u2026',true);
  try{
    const r=await api('/api/'+kind,body);
    AUTH.token=r.token;AUTH.email=r.email;
    authSet('al_token',AUTH.token);authSet('al_email',AUTH.email);
    $('passIn').value=$('pass2In').value='';authMsg('');
    await enterAccount();
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server. Logging in needs the server to be running.')}
  $('bLogin').disabled=$('bRegister').disabled=false;
}
$('bLogin').addEventListener('click',()=>doAuth('login'));
$('bRegister').addEventListener('click',()=>doAuth('register'));
$('bLogout').addEventListener('click',logout);
async function forgotSend(){
  const email=$('emailIn').value.trim();
  if(!email){authMsg('Type your account email above first.');return}
  authMsg('Sending\u2026',true);
  try{
    await api('/api/forgot',{email,password:''});
    $('resetBox').hidden=false;$('codeIn').focus();
    authMsg('If that email is registered, a 6-digit code was sent to it (valid 15 minutes). Enter it below with a new password.',true);
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server.')}
}
$('bForgot').addEventListener('click',e=>{e.preventDefault();forgotSend()});
$('bResend').addEventListener('click',forgotSend);
$('bReset').addEventListener('click',async()=>{
  const email=$('emailIn').value.trim(),code=$('codeIn').value.trim(),password=$('newPassIn').value;
  if(!email||!code||!password){authMsg('Enter your email, the 6-digit code and a new password.');return}
  $('bReset').disabled=true;authMsg('Please wait\u2026',true);
  try{
    const r=await api('/api/reset',{email,code,password});
    AUTH.token=r.token;AUTH.email=r.email;
    authSet('al_token',AUTH.token);authSet('al_email',AUTH.email);
    $('codeIn').value=$('newPassIn').value=$('passIn').value='';$('resetBox').hidden=true;authMsg('');
    await enterAccount();
  }catch(e){authMsg(e.status?e.message:'Cannot reach the game server.')}
  $('bReset').disabled=false;
});
$('passIn').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth('login')});
$('pass2In').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth('register')});
$('emailIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('passIn').focus()});
$('emailIn').value=AUTH.email;
if(AUTH.token)api('/api/me').then(enterAccount).catch(e=>{
  if(e.status===401){authForget();AUTH.token='';authMsg('Session expired. Please log in again.')}
  else authMsg('Cannot reach the game server. Logging in needs the server to be running.');
});
hud();
try{$('nameIn').value=authGet('al_name')||''}catch(e){}
netConnect();
/* v5_120 read-only bridge for tutorial.js (the guided tutorial). It only exposes state for reading; nothing here changes the game. */
window.WOA_API={get P(){return P},get SCD(){return SCD},get EQ(){return EQ},get AUTH(){return AUTH},get started(){return started},get MP(){return MP},PHONE:PHONE,
  inTown:()=>inTown(),pvpOnly:()=>pvpOnly(),say:(t,c)=>say(t,c)};
requestAnimationFrame(frame);
})();
