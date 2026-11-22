WORLD OF ASCENSION - current state (v5_201; ground shader v5_261; animations v5_322; animation level of detail v5_331)
Full version history: CHANGELOG.txt

RUN / BUILD
  build.bat       builds web/game.js from web-src/client/ (needs Node.js), then WorldOfEly.exe (needs Go: https://go.dev/dl/)
  node tools/build_client.js [--check]   stitches web-src/client/*.js into web/game.js.  EDIT THE PARTS IN web-src/client/, NOT web/game.js (it is regenerated)
  run-lan.bat     starts it for a LAN (edit your admin e-mail inside)
  node tools/check_constants.js   run BEFORE every build: the constants shared by server and client must agree
  node tools/class_sim.js [level] class comparison from the real skill tables

PLAYER DATA / UPDATING: all accounts, levels and gear are in a separate data folder (-data), not in the game files. Read UPDATING.txt before updating a live server.

FILES
  main.go static.go ws.go    server start-up, static files (everything in web/ is embedded), websocket
  game.go                    world, monsters, PvP rules + damage, chat commands, message handling
  party.go friends.go        parties and friends     accounts.go mail.go offline.go coupons.go   accounts / mail / whispers / coupons
  web/index.html             markup + CSS only
  web-src/client/*.js        SOURCE of the client game, 10 parts: 01_core (constants, classes, skills, player, world) 02_combat 03_items_forge_bag 04_input_wardrobe 05_render2d 06_render3d 07_hud 08_network_social 09_chat_ui 10_main_loop  (+ 03_pets: pet eggs, hatching, combining)
                             (one closure on purpose: they share state, so they are stitched, not separate modules)
  web/game.js                GENERATED from the parts above (the whole client game)
  web/fx3d.js                3D sky (clouds, auroras, stars, per-world celestial bodies), fog + ground mist, glow sprites, level-up light pillars (off switch: ?fx3=0)
  web/three-compat.js        keeps a newer Three.js looking like r128 (see THREE_UPGRADE.txt)
  web/trees3d.js             real tree models (v5_321): swaps the primitive tree props of the 3D scenery for the Quaternius tree pack in web/trees/ (trees.json, trees.bin, tex/); RECIPES = which prop gets which trees; ?trees=0 turns it off; tools/make_trees.py rebuilds the pack from the OBJ files
  web/skillfx3d.js           (v5_327; spell sprites removed v5_329) skill cast effects: Attack Slashes meshes only (web/skillfx/); ?skfx=0 turns it off; tools/make_skillfx.py rebuilds the slashes
  web/pets3d.js              3D pet models (PET3D.make(species, class)): chicken, dragon, fairy, phoenix, tiger, wolf + class effects
  web/vrm3d.js              VRM 1.0 loader + rig for the Cultivator avatars (web/Cultivator_He.vrm, web/Cultivator_She.vrm) and the Night Blade avatars (web/NightBlade_He.vrm, web/NightBlade_She.vrm) and the Iron Guardian avatars (web/IronGuardian_He.vrm, web/IronGuardian_She.vrm) and the Storm Archer avatars (web/StormArcher_He.vrm, web/StormArcher_She.vrm) and the Spirit Summoner avatars (web/SpiritSummoner_He.vrm, web/SpiritSummoner_She.vrm); weapons (v5_317): web/weapons/Sword|Dagger|Hammer|Bow|Staff.glb, mounted on the VRM hands, hold angles in WSPEC; ?vrm=0 hides all avatars (v5_300: the old built-in 3D bodies are deleted, models3d.js keeps only the animation rig)
  web/anim3d.js + web/anims/   (v5_322) the 82 moves of the Universal Animation Library 1 + 2 (Quaternius, CC0) on the VRM avatars: locomotion, jump, dodge, per-class attacks, skills, hit, death, mining, potion, and /emotes (type /emotes). ?anim=0 = the old procedural moves. (v5_330) every skill and signature skill has its own cast move (SKILL in anim3d.js), all 82 clips are in use. node tools/test_skillmoves.js checks them. tools/bake_anims.py rebuilds web/anims from the two library folders
                             (v5_331) slower phones: cheaper maths + ANIM3D.due() thins out the poses of OTHER players (stride by distance / device / frame time; attacks, hits and dodges are never thinned), off-screen players are hidden, far monsters and peer pets animate every 2nd frame on a weak device. ?alod=0 turns the thinning off. node tools/test_anim_lod.js, test_vrm_lod.js, bench_anim3d.js
  web/models3d.js audio.js tutorial.js sw.js manifest.json

CLASSES (passives; skills are in web/game.js: CLB, CLS_GEN, NB_T, SKILLS)
  Cultivator       all-rounder: +5% crit, +20% max Qi, +10% DEF.  Ranged qi spells, heals, melee strikes.  PvP reach 420
  Night Blade      assassin: +10% crit, -10% max HP.  Teleport, poison, blade storm, lifesteal.            PvP reach 440
  Iron Guardian    tank: +25% max HP, +40% DEF, +10% speed, -35% PvP damage from melee range.  Melee only. PvP reach 260
                   Iron Charge closes gaps; War Cry taunts monsters and shares an ATK buff with the party.
  Storm Archer     marksman: +15% crit, +10% speed.  Longest range (normal attack 460).                    PvP reach 560
  Spirit Summoner  summoner: +62.5% max Qi, -5% max HP, half cooldowns.  Wolves, spirits, soul heals.      PvP reach 480
  Every class: 3 starters at level 1, then a new skill every 5 levels (200 per class). Switch class in the Skill Book (K).
  SIGNATURE SKILLS (v5_160): every class also gets a unique skill with its own mechanic at Lv 25 / 50 / 100 / 200 / 300 / 500 / 750 / 1000 (40 in all, SIGD in web/game.js). Details: CHANGELOG.txt, top of v5_160.

PARTY (up to 4)  /invite /accept /decline /leave /kick /leader /disband
  Heals heal nearby party mates for half; War Cry / Might share half their ATK buff; Iron Guardian War Cry taunts monsters.

PVP
  Modes: Peaceful / Lawful / Hostile / Carnal (rule table: pvpCanHit in game.go = pvpRule in web/game.js). The safe hub is no-PvP.
  Server checks: mode, reach per class (pvpHitRange + slack), hit tokens, per-hit cap, defence curve, level compression.
  Level compression: a level lead counts for at most 100 levels (pvpMaxGap / PVP_MAX_GAP), so a high level player cannot one-shot a low level one.
  Damage numbers, stats and gear are still reported by the client (see "Known limits").

CONSTANTS THAT MUST MATCH (checked by tools/check_constants.js)
  pvpMult/PVP_MULT  pvpCapGap/PVP_CAP_GAP  pvpMaxGap/PVP_MAX_GAP  pDef*/PDEF_*  arenaR/ARENA_R  monLose, monLeash, bossLose, bossLeash / MON_*, BOSS_*
  Also keep equal by hand: pvpHitRange (game.go) with the class reaches, pvpCanHit with pvpRule, worldDefs with WORLDS.

BUILDINGS (v5_172)  15 building kinds (cottages, halls, pagodas, skyscrapers, domes, round towers, yurts, obelisks, ziggurats, windmills, crystal spires, longhouses, lighthouses, wells), a different architecture per world (CUL in web/game.js),
                    villages / hamlets / lone tall landmarks / downtowns scattered over each map. Solid; watchtowers, ziggurat tiers and wells can be jumped onto.

KNOWN LIMITS
  - The client decides its own damage, loot and stats; the server caps and range-checks but does not recompute damage. A modified client can cheat within those caps.
  - Root effects do not exist yet. Slow exists only as the 10% 'got hit' slow (v5_277).
  - Skills 9-200 of a class repeat the same 8 skill types with scaling numbers (the 8 signature skills per class are the exception).
