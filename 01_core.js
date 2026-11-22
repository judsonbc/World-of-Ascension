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
const SCENERY_BIG=30; /* percent of scenery props that are the BIG size (v5_258) */
const SCENERY_N=1950*5; /* scatter props per world (1500*MAP_K before v5_257); MAP_K is 5 */
const RING_MONS=[300,400,500,600,700,800,900,1000,300]; /* monsters per ring 1-9; must equal ringMons in game.go */
const MAP_K=5,WORLD=6400*MAP_K,C=WORLD/2,TOWN=400,MAXLV=1000,FORGE_MAX=100;
let RIM=3080*MAP_K; /* current map radius: the Colosseum swaps in ARENA_R */
const NW=16,ARENA=0,ARENA_R=2250,ARENA_PROPS=600; /* World 0 (Arena) is the PvP arena, worlds 1-15 are the hunting worlds; keep equal to arenaWi / arenaR in game.go */
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
/* v5_229 COST RULE: a skill that heals HP (with or without giving Qi back) is paid with Qi; a skill that gives Qi back and does NOT heal HP is paid with HP (QI_REGEN_T). Today that is only soulburst (Soul Burst line).
   soulheal, mend, sg_c25, sg_s25 and sg_s300 also heal HP, so they went back to a Qi cost. Add a type to QI_REGEN_T only if it restores Qi and never heals HP.
   v5_188 Qi-REGEN skills were paid with HP instead of Qi (history: soulburst, soulheal, mend + signature sg_c25 / sg_s25 / sg_s300).
   v5_188e HP price = a FIXED % of your MAX HP per skill (it does not change as you level). The % is the skill's Qi cost as a share of the class's max Qi, both taken at the skill's own unlock level (skHpPct, cached in s._hp).
   A cast needs remaining HP >= QI_REGEN_SAFE (2) x the HP price, otherwise it does not cast. */
const QI_REGEN_T={soulburst:1};
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
/* v5_277 UNIQUE (signature) skills live ONLY in the large R and T slots (12, 13). Anything of that kind found in a round slot is moved to a free R / T slot, or unequipped. */
const isSigSlot=i=>i>=AUTO_SLOTS;
function fixSig(){for(let i=0;i<AUTO_SLOTS;i++){const q=SKILLS[EQ[i]];if(!q||!q.sig)continue;const e=EQ.findIndex((v,j)=>isSigSlot(j)&&v<0);if(e>=0){EQ[e]=EQ[i];AUTOSK[e]=true}EQ[i]=-1}}
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
P.cls=0;P.rsv=-1;P.rsvT=0;P.rsvA=-1;P.vlT=0;P.drT=0;P.dr=0;P.ceT=0;P.spirits=[];P.dcd=0;P.dashT=0;P.dvx=0;P.dvy=0;P.pots={hp:0,qi:0,tp:0,ck:0};P.tp=0;P.tpx=0;P.tpy=0;P.autoPot=true;P.apHp=35;P.apQi=20;P.fightBack=true;P.tapMove=true;P.joySmall=false;P.recent=[];
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
const moveSpd=()=>200*(1+Math.min(25,gearStat('spd'))/100)*(P.spdMul||1)*(P.vlT>0?1.35:1)*(CLB[P.cls].spd||1)*(P.slowT>0?SLOW_HIT_MUL:1)*(P.sprT>0?SPRINT_MUL:1);
/* v5_277 getting hit (monster or player) slows you 10% for SLOW_HIT_T s (refreshed, never stacks); the Sprint button gives +30% while you keep tapping it (each tap = SPRINT_T s) */
const SLOW_HIT_MUL=.9,SLOW_HIT_T=2,SPRINT_MUL=1.3,SPRINT_T=3,SPRINT_SHOW_T=3; /* v5_279 the Sprint button appears after SPRINT_SHOW_T s of running (was 5); getting hit hides it and slows you 10% */
const SPRINT_ICO='data:image/png;base64,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';
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
const NET={ws:null,on:false,joined:false,id:0,name:'Wanderer',peers:new Map(),online:0,counts:[],pendingEnter:-1,sendT:0,infoT:0,infoKey:'',fails:0,giveUp:false,rt:0,lastMsg:0,olKey:''};
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
    r=Object.assign({},pal,{pi:l.p%A.SKINS.length,hs:l.h%A.HAIRS.length,ot:l.o%A.OUTFITS.length,hw:0,au:l.a%A.AURAS.length,ge:l.g&1,ar:l.r%A.ARMORS.length,ax:0});_skc.set(i,r)}
  return r;
}
const SK=()=>skinOf(SKIN);
/* look value + class bits (21-23): this is what the 3D rig and other players receive, so class gear shows for everyone */
const SKW=()=>(SKIN|((P.cls&7)<<21))>>>0;
function mixc(a,b,f){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),m=(x,y)=>Math.round(x+(y-x)*f);return '#'+((1<<24)|(m(A>>16,B>>16)<<16)|(m((A>>8)&255,(B>>8)&255)<<8)|m(A&255,B&255)).toString(16).slice(1)}
function normLook(v){
  v=v|0;if(!window.AL3D)return v>>>0;
  const A=AL3D,l=A.look(v);l.p%=A.SKINS.length;l.h%=A.HAIRS.length;l.o%=A.OUTFITS.length;l.w=0;l.a%=A.AURAS.length;l.g&=1;l.r%=A.ARMORS.length;l.x=0;   /* v5_298 no Accent option any more: saved / other players' accents are ignored */
  return A.packLook(l);
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
function bldWet(i,x,y,r){ /* v5_272 NOTHING IN THE WATER: the footprint (centre + 2 rings of 8 points out to radius r) must stay on dry ground, a little above the real water level of the world (worldWL, the same level the water surface is drawn at). Before, only the centre of a building was checked, only on island worlds, against height 2. */
  try{const f=mkH(i),wl=worldWL(i);if(wl<-1e4)return false;const lim=wl+10,cx=x-C,cy=y-C;r=r||0;
    if(f(cx,cy)<lim)return true;
    if(r>0)for(let q=0;q<8;q++){const a=q*.7854,ca=Math.cos(a),sa=Math.sin(a);for(const k of[.5,1])if(f(cx+ca*r*k,cy+sa*r*k)<lim)return true}
    return false}catch(e){return false}} /* WMAP / GKIT do not exist yet while World 1 is built at start-up (it is rebuilt right after): no check then */
/* v5_172 CULTURES: every world has its own architecture. Kinds: 0 cottage, 1 hall, 2 watchtower (flat top, standable), 3 pagoda, 4 skyscraper, 5 domed temple, 6 round tower, 7 yurt,
   8 obelisk, 9 ziggurat (3 standable tiers), 10 windmill, 11 crystal spire, 12 longhouse, 13 lighthouse, 14 well.
   home = [kind, weight] used for ordinary village buildings, land = tall / grand landmarks (lone, or the centre of a village, or a 'downtown' cluster).
   pal = [wallH,wallS,wallL, roofH,roofS,roofL, accentH,accentS,accentL]. */
const CUL=[
 {home:[[2,3],[22,3],[0,1],[14,1],[15,2]],land:[[35,3],[40,1],[9,3],[8,2],[18,3],[22,3],[6,2],[15,2]],pal:[35,12,48,20,20,30,45,70,60]}, /* Arena: ruined sandstone, henge, pyramids */
 {home:[[0,4],[29,3],[17,1],[7,1],[1,2]],land:[[36,4],[35,3],[37,3],[39,2],[38,2],[40,2],[41,3],[3,5],[29,4],[2,1],[10,1]],pal:[40,25,70,5,55,32,45,80,58]}, /* Ashen Reach: lacquered pagodas, torii shrines */
 {home:[[12,3],[0,2],[2,3],[25,3],[1,1]],land:[[6,3],[9,2],[32,3],[25,2],[4,1]],pal:[10,18,42,0,60,28,40,70,55]}, /* Crimson Dominion: war forts, smelters, beacons */
 {home:[[5,3],[16,3],[7,1],[0,2],[14,1]],land:[[11,4],[8,2],[28,3],[20,3],[4,2]],pal:[225,25,66,250,35,40,190,80,75]}, /* Starfall: observatories, mushrooms, storm rods, monoliths */
 {home:[[25,4],[12,2],[0,2],[2,2]],land:[[9,4],[32,3],[25,3],[4,1],[24,3]],pal:[15,15,28,10,70,34,28,100,55]}, /* Ember Throne: smelters, forge ziggurats, shard spires */
 {home:[[0,2],[5,3],[26,3],[7,1]],land:[[36,1],[41,1],[3,3],[26,4],[20,3],[4,3],[11,1]],pal:[50,20,82,195,45,48,48,90,62]}, /* Heavenfall: sky temples, celestial spires */
 {home:[[17,4],[0,3],[27,3],[14,2],[12,1]],land:[[38,1],[40,2],[13,5],[27,2],[5,2],[10,1],[3,1]],pal:[190,30,72,205,50,35,15,70,58]}, /* Tideglass: stilt harbour, shell domes, lighthouses */
 {home:[[16,4],[7,3],[17,2],[0,2],[10,1]],land:[[35,2],[36,2],[41,2],[37,1],[10,3],[15,3],[16,2],[3,1],[2,1]],pal:[30,32,45,110,40,30,85,60,55]}, /* Verdant: mushroom homes, stilt houses, windmills, henges */
 {home:[[2,3],[0,2],[26,2],[12,1]],land:[[28,4],[4,3],[26,3],[8,2],[24,2]],pal:[215,12,54,225,25,28,55,95,60]}, /* Stormcrown: storm rods, sky fortresses */
 {home:[[0,3],[30,2],[22,2],[1,1],[14,1]],land:[[23,5],[8,3],[6,2],[30,2],[5,1]],pal:[340,10,30,350,50,22,355,80,50]}, /* Bloodmoon: cathedrals, ruins, skull gates */
 {home:[[0,4],[7,3],[31,2],[14,2],[5,1]],land:[[36,1],[18,5],[9,3],[31,3],[8,2],[10,1]],pal:[38,50,66,30,60,45,45,95,58]}, /* Sunforged: pyramids, sundials, domes */
 {home:[[0,2],[24,3],[5,2],[20,2],[7,1]],land:[[11,4],[20,4],[24,3],[4,3],[8,1]],pal:[290,20,76,270,30,44,180,70,70]}, /* Mirrorveil: glass towers, monoliths, shards */
 {home:[[24,3],[2,3],[0,2],[6,1]],land:[[23,3],[20,2],[8,3],[24,3],[9,1]],pal:[265,15,24,275,35,20,285,80,58]}, /* Voidmaw: obsidian cathedrals, shard spires */
 {home:[[12,3],[30,2],[0,2],[15,1],[1,2]],land:[[19,5],[30,3],[6,2],[9,2]],pal:[45,22,74,20,40,36,10,80,52]}, /* Dragonbone: rib arches, skull gates, bone halls */
 {home:[[0,2],[31,3],[10,2],[7,1],[29,2],[14,1]],land:[[40,1],[21,5],[31,2],[4,3],[6,2],[10,2]],pal:[30,28,50,35,60,36,45,90,60]}, /* Chronos: clock towers, sundials, clockwork */
 {home:[[1,3],[26,2],[29,3],[5,2],[2,1]],land:[[4,3],[26,4],[20,3],[32,3],[8,2],[9,1]],pal:[55,10,84,45,40,40,48,100,64]}]; /* Heaven-Sundering: monuments, sky temples, beacons */
const KROUND=[6,7,10,13,14,15,16,20,24,27,28,31,32,38,40,41]; /* kinds with a circular footprint (hw = radius). v5_253 new kinds 15-32 (v5_262 PHILIPPINES: 33 bahay kubo, 34 bahay na bato, 35 The Ruins, 36 cathedral, 37 sugar mill, 38 Masskara monument, 39 capitol, 40 Spanish watchtower, 41 Mt. Kanlaon): 15 henge, 16 mushroom house, 17 stilt house, 18 pyramid, 19 rib arch, 20 crystal monolith, 21 clock tower, 22 ruins, 23 cathedral, 24 shard spire, 25 smelter, 26 sky temple, 27 shell dome, 28 storm rod, 29 torii shrine, 30 skull gate, 31 sundial, 32 beacon */
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
      if(sites.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+r+130)||bldWet(i,x,y,Math.min(r,230)))continue;
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
      case 15:{const r=rr(70,100);return [r,r,rr(60,90)]}case 16:{const r=rr(36,56);return [r,r,rr(110,190)]}
      case 17:return [rr(50,70),rr(44,60),rr(90,120)];case 18:{const w=rr(90,140);return [w,w,rr(160,260)]}
      case 19:return [rr(70,100),rr(30,40),rr(180,260)];case 20:{const r=rr(30,44);return [r,r,rr(220,420)]}
      case 21:{const w=rr(34,46);return [w,w,rr(340,520)]}case 22:return [rr(80,120),rr(40,60),rr(90,170)];
      case 23:return [rr(60,80),rr(100,140),rr(200,320)];case 24:{const r=rr(46,70);return [r,r,rr(180,340)]}
      case 25:return [rr(60,84),rr(50,70),rr(150,230)];case 26:return [rr(70,100),rr(70,100),rr(140,220)];
      case 27:{const r=rr(44,66);return [r,r,rr(100,170)]}case 28:{const r=rr(22,30);return [r,r,rr(360,560)]}
      case 29:return [rr(40,56),rr(40,56),rr(100,140)];case 30:return [rr(70,96),rr(34,46),rr(160,230)];
      case 31:{const r=rr(60,90);return [r,r,rr(70,120)]}case 32:{const r=rr(26,36);return [r,r,rr(180,300)]}
      case 33:return [rr(40,54),rr(36,48),rr(72,92)];case 34:return [rr(76,100),rr(54,70),rr(104,132)];
      case 35:return [rr(92,122),rr(62,82),rr(130,190)];case 36:return [rr(60,80),rr(100,130),rr(210,300)];
      case 37:return [rr(72,92),rr(50,64),rr(300,440)];case 38:{const r=rr(38,50);return [r,r,rr(200,300)]}
      case 39:return [rr(104,132),rr(60,76),rr(150,220)];case 40:{const r=rr(34,46);return [r,r,rr(220,320)]}
      case 41:{const r=rr(120,165);return [r,r,rr(300,440)]}
      default:return [17,17,22]}};
  const colors=()=>{const rh=P9[3]+(R2()<.4?(R2()<.5?36:-36):0);return {wc:H(P9[0]+rr(-9,9),P9[1],P9[2]+rr(-8,8)),rc:H(rh,P9[4],P9[5]+rr(-6,6)),ac:H(P9[6],P9[7],P9[8]),tc:H(P9[0]+rr(-6,6),P9[1]*.7,P9[2]*.55),gc:H(P9[6]+rr(-10,10),55,76)}};
  /* put one building (a ziggurat adds 3 nested records). (tx,ty) = the point its door faces. Returns the record or null. */
  const put=(k,x,y,tx,ty,site,keepList)=>{
    const d=dims(k),hw=d[0],hh=d[1],wh=d[2],rd=KROUND.includes(k),m=Math.max(hw,hh);
    if(Math.hypot(x-C,y-C)>RIM-70-m||Math.hypot(x-C,y-C)<TOWN+140+m)return null;
    for(const q of keepList)if(Math.abs(q.x-x)<q.hw+hw+(k===14?24:46)&&Math.abs(q.y-y)<q.hh+hh+(k===14?24:46))return null;
    if(bldWet(i,x,y,m+30))return null;
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
/* v5_231 worldGen counts every buildWorld(): the 3D scene is rebuilt whenever it changes (not only when the world number changes), so what is drawn always matches the solids you collide with */
/* v5_281 PACKS: every normal monster belongs to a pack of PACK_SIZE (3). Hit one and the whole pack attacks you. Spawn spots are not changed, only grouped.
   A monster takes the 2 nearest monsters that have no pack yet; a ring whose count is not a multiple of 3 ends with one pack of 1 or 2. Same rule as groupMons() in game.go (the server does it in shared worlds). */
const PACK_SIZE=3;
function groupMonsters(list){
  const free=list.slice();
  while(free.length){
    const a=free.shift(),pack=[a];
    for(let k=0;k<PACK_SIZE-1&&free.length;k++){
      let bi=0,bd=Infinity;
      for(let i=0;i<free.length;i++){const o=free[i],d=(o.hx-a.hx)*(o.hx-a.hx)+(o.hy-a.hy)*(o.hy-a.hy);if(d<bd){bd=d;bi=i}}
      pack.push(free[bi]);free[bi]=free[free.length-1];free.pop();
    }
    for(const m of pack)m.grp=pack;
  }
}
function pullPack(m){for(const o of (m.grp||[]))if(o!==m&&!o.dead&&o.state==='idle')o.state='chase'}
let worldGen=0;
function buildWorld(i,spawn){
  worldGen++;P.sel=null;
  setWorld(i);
  mons.length=0;ores.length=0;items.length=0;projs.length=0;fx.length=0;texts.length=0;deco.length=0;parts.length=0;beams.length=0;delayed.length=0;
  const R2=rngSeed(20261101+i*7919);
  for(let k=0;k<9;k++){ /* fixed monster count per ring, even per AREA inside each ring (keep equal to ringMons in game.go) */
    const lo=k?ZD[k-1]:500,hi=k<8?ZD[k]:RIM-40;
    const ringFirst=mons.length;
    for(let n=0;n<RING_MONS[k];n++){
      const a=R2()*Math.PI*2,d=Math.sqrt(lo*lo+R2()*Math.max(0,hi*hi-lo*lo));
      if(!spawn&&i!==ARENA)mons.push(monsterAt(C+Math.cos(a)*d,C+Math.sin(a)*d,null)); /* still draws the same random numbers so ore and scenery stay identical */
    }
    if(!spawn&&i!==ARENA)groupMonsters(mons.slice(ringFirst)); /* v5_281 packs of 3 (spawn spots are not touched) */
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
  let arenaKept=0; /* v5_260 the Arena is capped at ARENA_PROPS scatter props */
  for(let n=0;n<SCENERY_N;n++){ /* v5_257 scenery density +30%: 1500 -> 1950 per map-k. Nothing else draws from R2() after this loop, so every old prop keeps its place and the extra 30% are appended */
    const a=R2()*Math.PI*2,d=Math.sqrt(R2())*RIM;
    if(d<TOWN+40||(i===ARENA&&(n%12||arenaKept>=ARENA_PROPS)))continue; /* v5_260 the Arena keeps exactly ARENA_PROPS (600) props: every 12th candidate until the cap (v5_259 kept 1 in 8, about 1,200) */
    if(i===ARENA)arenaKept++;
    const k=Math.floor(R2()*54),x=C+Math.cos(a)*d,y=C+Math.sin(a)*d,r=R2(); /* same 4 draws as before */
    deco.push({k,x,y,s:(Math.imul(n,2654435761)>>>0)%100<SCENERY_BIG?1.6+r*.6:.7+r*.4}); /* v5_258 two sizes: SMALL .7-1.1, BIG 1.6-2.2 (about double), picked by a hash of n so no extra random draw */
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
  const str=JSON.stringify({v:2,pm:PVPLVL,ts:Date.now(),gv:GEAR_VER,sv:AUTH.ver===null?undefined:AUTH.ver,lvl:P.lvl,exp:P.exp,coins:P.coins,ore:P.ore,wlv:P.wlv,alv:P.alv,wv:2,wi:curWorld===ARENA?1:curWorld,eq:EQ,as:AUTOSK.map(x=>x?1:0),sk:SKIN,lkv:2,lk:LOOKS.map((v,i)=>i===P.cls?SKIN:v),gear:P.gear,bag:bagArr(),pots:P.pots,wh:whArr(),eg:P.eggs|0,pt:P.pets,sp:P.pet||'',fb:P.fightBack?1:0,tm:P.tapMove?1:0,js:P.joySmall?1:0,mk:1,sg:1,cl:P.cls,cs:CLS_STORE.map(x=>x?{e:x.e,a:x.a.map(y=>y?1:0)}:null),ap:P.autoPot?1:0,ah:P.apHp,aq:P.apQi});
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
    if(s.pots)P.pots={hp:clamp(s.pots.hp|0,0,9999),qi:clamp(s.pots.qi|0,0,9999),tp:clamp(s.pots.tp|0,0,9999),ck:clamp(s.pots.ck|0,0,9999)};P.autoPot=s.ap!==0;P.apHp=clamp((s.ah|0)||35,5,95);P.apQi=clamp((s.aq|0)||20,5,95);P.fightBack=s.fb!==0;P.tapMove=s.tm!==0;P.joySmall=s.js===1;applyJoySize();
    let wi=s.wi|0;if(s.wv!==2&&wi<=10)wi++; /* older saves: world numbers started at 0 for Ashen Reach */
    wi=clamp(wi,0,NW-1);if(wi===ARENA)wi=1;if(wi!==curWorld)buildWorld(wi);
    P.cls=clamp(s.cl|0,0,CLASSES.length-1);loadLooks(s);CLS_STORE.fill(null);
    if(Array.isArray(s.cs))for(let c=0;c<CLASSES.length;c++){const o=s.cs[c];if(o&&Array.isArray(o.e)&&c!==P.cls)CLS_STORE[c]={e:o.e.slice(0,NSLOT).map(v=>v|0),a:o.e.slice(0,NSLOT).map((_,i)=>!Array.isArray(o.a)||o.a[i]!==0)}}
    if(s.v===2&&Array.isArray(s.eq)&&s.eq.length<=NSLOT){for(let i=0;i<NSLOT;i++){const q=SKILLS[s.eq[i]];EQ[i]=q&&P.lvl>=q.lv&&(q.c||0)===P.cls?s.eq[i]:-1}}else autoArrange();
    for(let i=0;i<NSLOT;i++)AUTOSK[i]=!Array.isArray(s.as)||s.as[i]!==0;
    if(s.mk!==1&&P.cls===0)giveMelee();
    fixSig();if(s.sg!==1)giveSig();
    buildBar();
    P.hp=maxHp();P.qi=maxQi();return true;
  }catch(e){return false}
}

