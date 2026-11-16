WORLD OF ASCENSION - current state (v5_163)
Full version history: CHANGELOG.txt

RUN / BUILD
  build.bat       builds WorldOfEly.exe (needs Go: https://go.dev/dl/)
  run-lan.bat     starts it for a LAN (edit your admin e-mail inside)
  node tools/check_constants.js   run BEFORE every build: the constants shared by server and client must agree
  node tools/class_sim.js [level] class comparison from the real skill tables

FILES
  main.go static.go ws.go    server start-up, static files (everything in web/ is embedded), websocket
  game.go                    world, monsters, PvP rules + damage, chat commands, message handling
  party.go friends.go        parties and friends     accounts.go mail.go offline.go coupons.go   accounts / mail / whispers / coupons
  web/index.html             markup + CSS only
  web/game.js                the whole client game (skills, classes, UI, networking)
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

KNOWN LIMITS
  - The client decides its own damage, loot and stats; the server caps and range-checks but does not recompute damage. A modified client can cheat within those caps.
  - Slow / root effects do not exist yet (Iron Charge is the only anti-kiting tool).
  - Skills 9-200 of a class repeat the same 8 skill types with scaling numbers (the 8 signature skills per class are the exception).
