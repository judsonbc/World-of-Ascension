TAP TO MOVE OPTION (phones) (v5_134)
  - New checkbox in the Menu window (phone mode only): 'Tap to move'. On (default, as before): tapping the ground walks your hero there. Off: tapping the ground does nothing and the joystick is the only way to walk. Tapping monsters (select / double tap to attack), ore veins, other players and the shop still works either way, and turning it off cancels a walk already in progress.
  - The choice is saved with your character (same place as 'Fight back' and 'Auto-use potions'). The option is hidden on desktop, where clicking to move is unchanged.

SKILL COOLDOWNS +3 s MORE (v5_133)
  - Every skill of every class has 3 more seconds of cooldown (SKILL_CD_ADD in web/index.html is now 6: the +3 s from v5_123 plus this +3 s). It applies to all five classes and to every tier, and the skill book, the cooldown overlay on the buttons and casting all use the new value.

FORGE STRIKE ANIMATION (v5_132)
  - Forging now takes 1 second: a progress bar between the current and the next level (+5 [====    ] +6) fills while the Forge button shows 'Forging...'. The result (success or failure) and the cost are applied when the bar is full, then the SUCCESS / FAILED popup shows.
  - While the strike runs you cannot start another one or switch to another piece. Nothing is spent until the bar finishes, so closing the game during the second loses nothing. Costs and success chances are unchanged.

FORGE WINDOW REDESIGN (v5_131)
  - The Lotus Forge now looks like the Bag window. Left: your avatar (3D, drag to rotate, or 2D) with the equipped gear in slots on both sides, each showing its forge level. Right: tap a piece and its name, rarity / grade, forge level (+N -> +N+1), current stats, next-level stats, per-level bonus, ore / coin cost, success chance and the Forge button.
  - The starting Blade and Robe are slots too (Primary Weapon, Robe). Empty slots can be tapped and show which boss drop they need. Your coins and ore are shown at the top right; a cost you cannot pay is shown in red and the Forge button is disabled.
  - Forging rules are unchanged (same cost, same chances, a failed strike burns the materials and keeps the level, SUCCESS / FAILED popup, hub only, O key, tap outside or Close to leave). Works in landscape and portrait on phones.

SKILLS OUT OF RANGE IN ATTACK MODE (v5_130)
  - In attack mode (auto-hunt, F, or any selected / clicked target) an attack skill is no longer cast when the target is outside THAT skill's real reach. Nothing is spent and no cooldown starts. The reach comes from a new table (web/index.html skillReach) that mirrors what each skill really hits:
    Whirling Blade / Burst 120 (+14 per tier from tier 0), Life Drain 170, Blade Dance 120+8/tier, Earthquake 160+12/tier, War Cry 240, Retaliation 150+8/tier, Soul Burst 140+10/tier, Wraith Wail 240, Soul Harvest 200,
    Ghost Chains 400, Seismic Wave 420, Umbral Rush 280+10/tier, Shadow Step 420, Reaper's Mark 200, Blood Fang 170, Venom Needle, Heavy Strike / Hundred Cuts / Shield Bash 170, Crescent Cleave / Hammer Smash 200, Leaping Slash 360,
    bolts / kunai / arrows by flight distance, Explosive / Storm Arrow, Arrow Rain, Thunder Trap, Spirit Bomb 520, Meteor 450, Chain Lightning 600. (the target's body radius is counted for area, line and bolt skills)
  - Before, auto-hunt used one general check (420 / 480, 300 for bursts), so Whirling Blade (radius 120) and other short-reach skills fired at targets they could not touch.
  - Manual casts in attack mode show 'target is out of range' (throttled). Heals, shields and buffs are unchanged. Manual casts outside attack mode keep the v5_122 behaviour.

SKILL COOLDOWNS +3 s (v5_123)
  - Every skill of every class has 3 seconds more cooldown (web/index.html SKILL_CD_ADD = 3, applied after the heal-skill cooldown multiplier). The skill book, the cooldown overlay on the buttons and casting all use the new value.

MAX QI x2 (v5_123)
  - Every player now has double max Qi (web/index.html QI_MUL = 2; Spirit Summoner keeps its 1.3x class bonus on top). Qi regeneration, skill costs and potion percentages are unchanged (Mana Potion restores 40% of the bigger pool).

SCREEN SAVER (v5_123)
  - The automatic screen saver now starts after 5 minutes without activity (was 15 seconds), only while auto-hunt / auto-mine is on. Any click, tap, key press, mouse wheel or drag (joystick, camera) resets the timer; moving the mouse cursor without clicking does not.

SKILLS OUTSIDE ATTACK MODE (v5_122)
  - AUTO-CAST fires a skill as soon as it is ready. Removed the extra rules that kept skills from firing (minimum distances for Shadow Step / Leap / Rush, enemy counts for Quake / Wail / Roar / Nova, boss-only buffs, strict HP limits). Still held back: out of the skill's own range, a buff that is still running, healing at (almost) full HP, and Gale (emergency escape only).
  - Casting by hand never needs a target in range any more: with nothing in reach the skill still fires (single-target / melee skills strike toward where you face, Shadow Step and Leap dash forward, area skills around you just go off) and costs Qi / starts its cooldown. Auto-hunt keeps its range checks so it does not waste Qi.
  - Attack skills can be cast any time (button or hotkey), not only while attacking. If nothing is targeted or selected and a monster is inside that skill's reach, the nearest monster is selected and the skill aims at it (arrows, volleys, piercing shots, rush, shockwave, etc. no longer fly off in the facing direction). It does not start auto-attacking. Heals, buffs and the safe-hub rules are unchanged.

PHONE MENU + TUTORIAL CARD FIXES (v5_121 / PC menu fix)
  - PC: the Menu window's four buttons (View, Screen saver, How to play, Log out) are now small, two per row, and stick to the bottom of the menu, so Log out is always visible (the menu also scrolls if the window is extremely short).
  - The 3D/2D ("View") and Landscape buttons moved from the left icon strip into the Menu window (Landscape is shown on phones only).
  - Menu (gear icon) on phones: much more compact in portrait and landscape. No more 1.3x zoom; the keyboard-shortcut rows are hidden on phones;
    Screen saver / How to play / Log out are three small buttons on one row. In landscape the Log out button was below the bottom of the screen: it now always fits (and the menu can be scrolled by finger if a screen is extremely short).
  - Tutorial card: if it had been dragged in portrait, turning the phone left it off the screen. Rotating now puts it back, resizing keeps it inside the screen, and in landscape it is smaller so Next / End tutorial are never cut off.

IN-GAME STEP-BY-STEP TUTORIAL (v5_120)
  - New: a short guided tutorial for new players. It only covers the essentials, in 11 steps: your hero (HP / Qi), moving, leaving the safe hub, selecting a monster, fighting it, rewards and levels,
    skills, dodge, potions + Home Scroll, fighting other players (PvP), and a last card listing the handy buttons.
  - It watches what the player really does and moves on by itself when the step is done (walked far enough, left the hub, selected a monster, killed one, cast a skill, dodged). Every step has "Skip step",
    "End tutorial" is always there, the card can be minimised with the "-" button and dragged by its header. A pulsing gold ring points at the part of the screen the step is about.
    Texts are different for PC (keys, mouse) and phones (joystick, taps, DODGE pad). The PvP step is information only: it never turns PvP mode on for the player.
  - Offered once per account, 2 s after the first start, to players below Lv 10 ("Start tutorial" / "No thanks"). Veterans are not asked. Replay any time: Menu > "How to play (tutorial)".
    The done flag is kept per account in this browser (localStorage key woa_tut1_<email>); to see the offer again run  WOA_TUTORIAL.reset()  in the browser console.
  - web/tutorial.js (NEW): the whole tutorial. It never changes game state; it reads it through a small read-only bridge.
  - web/index.html: (1) window.WOA_API read-only bridge at the end of the main script (P, SCD, EQ, AUTH, started, MP, PHONE, inTown, pvpOnly, say),
    (2) <script src="tutorial.js"> after the main script, (3) tutorial.js added to the preloader file list.
  - web/sw.js: tutorial.js added to the cached core files. No server (Go) changes.
  - REBUILD (build.bat) and hard-refresh. The saved copy refreshes itself because the files changed.

COMBAT MUSIC AND EFFECTS NOW REALLY READY AFTER THE LOADING SCREEN (v5_119)
  - Report: combat background music and the effects were not loaded yet when the game started. Cause: the sounds were built one after another (calm, then combat = the longest, then 20 effects) and the
    loading screen stopped waiting after 12 s, so on a real phone the first start opened with only the calm music ready.
  - web/audio.js: sounds are now built several at a time (up to 3, each on its own audio thread), the loading screen only waits for what is REQUIRED (calm, combat and ONE variant of every effect),
    and the second variant of each effect is made afterwards in the background and saved too. Progress is weighted by real work (combat counts more than one effect), so the % on the bar is honest.
  - web/index.html (loading screen): waits until the sounds are really ready (cap 90 s instead of 12 s). After 15 s a "Continue now (sound will follow)" button appears for slow phones. The generic
    "Taking longer than usual" warning no longer fires while sounds are still being prepared.
  - First start on a device: sounds are built and saved (see v5_118). Every later start loads them from the saved copy and the loading screen does not wait for sound.
  - If you press "Continue now" early, the unfinished sounds keep being built and saved, so the next start is quicker.
  - REBUILD (build.bat) and hard-refresh. The saved copy refreshes itself because audio.js changed.

SOUNDS PREPARED ON THE LOADING SCREEN + SAVED ON THE DEVICE (v5_118)
  - Report: at game start the music and effects took about 5 s to begin (the sounds were being rendered then). Now the work is done on the loading screen.
  - web/audio.js starts preparing the sounds as soon as the page loads. The loading screen has a new step, "Preparing sounds...", that waits for them (progress bar 74-92 %), so the sound is ready when the game starts.
    The wait is capped at 12 s: on a very slow phone the game opens anyway and the remaining sounds finish in the background (they are saved as they complete, so the next start is faster).
  - FIRST start on a device: the sounds are rendered (the screen says "first start only") and the finished samples (about 14-20 MB) are saved in the browser's IndexedDB storage ("woa-audio").
    LATER starts: the saved samples are read back in about 0.1-0.3 s and nothing is rendered, so the loading screen does not wait for sound at all.
  - The saved copy is tagged with a hash of the whole audio.js source: any change to audio.js refreshes it by itself on the next start (nothing to delete by hand).
  - If the browser has no IndexedDB (some private modes) or blocks it, the sounds are simply rendered on every start, as in v5_116. If the saved copy cannot be read it is rendered again.
  - To force a fresh render: clear this site's data in the browser settings.
  - Phones still need one touch before any sound can play (browser rule); the first tap after loading starts the music instantly.
  - REBUILD (build.bat) and hard-refresh.

BUTTONS NOT CLICKABLE WHILE THE JOYSTICK IS HELD (v5_117)
  - Report (phone): while moving with the joystick, some action buttons did nothing. Cause: skill slots, Attack, Dodge and the potion buttons react on pointerdown and always worked, but every other
    control (Auto, Mine, Land, menu / bag / book icons, ...) waits for the browser's 'click', and phones often send no 'click' for a tap made while another finger is already down.
  - Fix (web/index.html, right after the joystick code): a tap on a button, icon, label or checkbox made while another finger is down (or released while one is still down) now fires the click itself on release.
    The browser's own click for that tap is swallowed so nothing runs twice. Drags, releases off the button and normal single-finger taps behave exactly as before.
  - If one specific button still does not respond while walking, tell me its name: it may use its own handler instead of 'click'.
  - REBUILD (build.bat) and hard-refresh.

NO SOUND IN SCREEN SAVER + PRE-RENDERED MUSIC / EFFECTS = LESS LAG (v5_116)
  - Screen saver: while the dark saver screen is on, ALL sound is off (music and effects), and the audio engine is put to sleep (less CPU and battery). Sliding to unlock brings the sound back.
    (web/index.html saverOn / saverOff call SND.hush(true / false); web/audio.js hush().)
  - Lag / cut-outs on phones: the music and skill sounds used to be synthesised live (hundreds of oscillators per second); on a phone that stalled the page, and the engine dropped new notes once 360 voices were busy.
    Now (web/audio.js) every sound is rendered ONCE, about 2.5 s after the page loads, with an OfflineAudioContext (off the main thread, in small slices so nothing stalls):
      - calm music: one seamless 29 s loop; combat music: a seamless 30 s loop (2 passes, so the crash cymbal and tom fill variants are kept)
      - each skill-cast sound: 2 variants, picked at random and pitch-shifted +-3 % per cast, so repeats do not sound identical
    From then on the game only plays finished samples, which costs almost nothing. Music and effects may be silent for the first few seconds after a fresh page load while this runs; the loading screen is not affected.
  - Audio latency hint changed from 'interactive' to 'playback': larger audio buffers, so phones no longer crackle or cut out under load (effects start a few ms later).
  - Fallback: if the browser has no OfflineAudioContext, or a render fails, the previous live synthesis is used automatically.
  - Memory: about 20 MB of audio samples are kept in RAM. Volume sliders work as before.
  - Skill-cast effects are the only effects on purpose (swing / hit / crit etc. are silenced no-ops in the SFX table of web/audio.js).
  - REBUILD (build.bat) and hard-refresh; the service worker cache refreshes itself because audio.js and index.html changed.

PVP HITS FROM WHERE THE ATTACKER IS NOT (v5_83)
  - Report: a player attacks (damages) even though it is not there. Causes: (1) the server accepted a PvP hit from anyone up to 1500 units away (the client alone
    decided the range), so a hit could land from far outside the attacker's real reach; (2) other players are drawn ~0.12 s behind plus network delay, so a player
    can look farther from you than it is. (1) is fixed here.
  - Server (game.go "phit"): the hit is dropped when attacker and victim, by the SERVER's positions, are farther apart than pvpHitRange[class] + pvpHitSlack(160).
    pvpHitRange = Cultivator 420, Night Blade 440, Iron Guardian 260, Storm Archer 560, Spirit Summoner 480 (their longest skill / normal attack reach).
    The client now sends its class (cl) in the join and info messages; the server stores it (Player.cls). The 0.12 s display delay (PEER_DELAY) is unchanged.
  - IMPORTANT: rebuild the server (build.bat) AND hard-refresh (Ctrl+F5) every client: an old client does not send its class and would be treated as a Cultivator.

IRON GUARDIAN: SKILLS ONLY IN MELEE REACH (v5_82)
  - Report: Iron Guardian cast skills while not in melee range (and it has no ranged skill). Bash / Hammer Smash reached 170 / 200 units, and Earthquake, War Cry,
    Retaliation, Seismic Wave (auto: 400) and the buffs Bulwark / Iron Skin fired on enemies that were still far away.
  - Now every Iron Guardian attack skill needs the target within real melee reach (own radius + target radius + IG_PAD = 40, the normal attack reach is +30),
    by hand and in auto-hunt (nothing is spent otherwise). In auto-hunt Bulwark and Iron Skin also wait until the target is in melee reach.
    Area skills still hit everything inside their radius once cast. Tune IG_PAD (web/index.html). Client-only. Hard-refresh (Ctrl+F5).

MELEE CLASSES CAN NO LONGER SNIPE WITH RANGED SKILLS (v5_81)
  - Report: melee classes cannot normal attack from far away but could still cast ranged skills. Now Cultivator, Night Blade and Iron Guardian only cast their
    ranged-type skills (Piercing Ray, Blossom Volley, Falling Star, Storm Chain, Soul Siphon, Phantom Kunai, Venom Needle) when the aimed target is within
    MELEE_SKILL_RANGE = 200 units (nothing is spent otherwise, also when auto-casting), and their projectiles stop at about that distance.
    Melee / dash / self-centred skills (Shadow Step, Leaping Slash, Blade Dance, nova, ...) are unchanged. Storm Archer and Spirit Summoner are unchanged.
  - Change MELEE_SKILL_RANGE (web/index.html) to tune it; set it huge to go back. Client-only. Hard-refresh (Ctrl+F5).

NORMAL ATTACK RANGE BY CLASS (v5_80)
  - Melee normal attack (body size + 30): Cultivator, Night Blade, Iron Guardian (unchanged). Ranged normal attack: Storm Archer 460 units, Spirit Summoner 380 units
    (web/index.html BASIC_RANGE = [0,0,0,460,380]). Ranged classes walk to the target until they are at 75% of their range (BASIC_STAND) and shoot from there;
    the normal attack loses up to 25% damage at full range (BASIC_FALL) and shows a short bolt trail. Works against monsters and PvP targets; the server already allows
    hits up to 1500 units. Skills, attack speed and crit are unchanged. Client-only. Hard-refresh (Ctrl+F5).

TWO ACCOUNTS AT ONCE: REFRESH KEEPS YOUR OWN LOGIN (v5_79)
  - Problem: the login (al_token / al_email / al_name) lived in the browser's shared localStorage. Logging in with account B in a second tab overwrote it, so a
    refresh of account A's tab showed the login page with account B's details.
  - Fix (web/index.html authGet / authSet / authForget): each tab keeps its own login in sessionStorage (survives a refresh of that tab, not shared with other tabs).
    localStorage still holds the last login, used only by a NEW tab. Logout / "logged in somewhere else" / expired session clear the tab's own login, and the shared
    last login only if it is still the same one, so signing out of one tab no longer signs out the other account.
  - Note: opening a NEW tab still starts with the last login; log in there as the other account. Two tabs on the SAME account still kick each other (unchanged).
    Accounts that share a browser still have separate saves (v5_67). Client-only. Hard-refresh (Ctrl+F5) in every tab once.

DODGE CANNOT ATTACK (v5_78)
  - Dodge (dash) still makes you untouchable for DODGE_INV = 0.35 s (blocks every hit, skills included), but for those 0.35 s you can no longer cast a skill
    (manual or auto-cast) or basic attack. Before, you could cast skills at the enemy while invulnerable. The dash cooldown (1.6 s) is unchanged.
  - Skills that carry their own invulnerability frames (Shadow Step, Leaping Slash, etc.) are unchanged. Client-only. Hard-refresh (Ctrl+F5).

HEALING SKILLS NERFED (v5_77)
  - Every skill that heals you, in all 5 classes, heals 50% less and has a 2x cooldown (web/index.html SKILL_HEAL_MUL = .5, HEAL_CD_MUL = 2, list HEAL_SKILL_T):
      Cultivator: Lotus Mend (heal) 10 s -> 20 s, Lotus Ward (mend) 14 -> 28 s, Soul Siphon (drain) 8 -> 16 s
      Night Blade: Blood Fang (siphon) 4 -> 8 s
      Iron Guardian: Iron Skin 16 -> 32 s (its 10% heal is halved; the damage reduction is unchanged)
      Spirit Summoner: Soul Mend 10 -> 20 s, Soul Harvest 6 -> 12 s
  - The cooldown change is applied to the skill table itself, so the skill book and the cooldown dial show the new time. The PvP heal reduction (v5_74) still
    applies on top. Health Potion (5%, 5 s) and shields are not changed. Damage of Soul Siphon / Soul Harvest / Blood Fang is unchanged (only their heal and cooldown).
  - Client-only change. Hard-refresh (Ctrl+F5).

UNEQUIP GEAR (v5_76)
  - Open the bag (B), tap a piece you are wearing (around the avatar) and press the new Unequip button. The piece moves to the bag and is selected (so you can Equip
    or Sell it). The slot keeps its forge level; an emptied weapon / robe slot goes back to your plain Blade / Robe. HP / mana are clamped to the new maximum.
    Wearing and unequipping never change the bag slot count, so there is always room. Client-only (web/index.html unequipGear).

REMOVED THE PVP 3 s BURST CAP (v5_75)
  - game.go "phit": the anti-burst rule is gone. Before, once a player had lost 30% of max HP (up to 100% with a level lead) inside a 3 s window,
    every further hit in that window was cut to 1 damage. Now every hit deals its full calculated damage.
  - Still in place: the per-hit cap (10% of max HP at equal level, opening to 100% with the level lead), the DEF / PvP reduction, the level-gap rules and
    the lethal rule at a 500 level lead. Constants pvpBurstWin / pvpBurstCap / pvpBurstCapMax are now unused (left in the file).
  - Effect: equal-level duels are no longer floored at ~10 s; stacked skills can take a player down faster. Rebuild the server (build.bat).

PVP HEAL REDUCTION, LEVEL LEAD CANNOT BE OUT-HEALED (v5_74)
  - Report: Lv1000 could not kill Lv800 in the same gear. Basic attacks alone should kill in ~14 s (gap dominance D = 0.5), so the missing piece was sustain:
    potions, Mend / Soul Mend (25-35% max HP), Drain / Harvest / Siphon and Iron Skin healed without any level-gap or PvP penalty.
  - New (web/index.html healMul / healP, PVP_HEAL = 0.5, PVP_HEAL_WIN = 8): for 8 s after another player hits you, every self-heal works at 50% strength,
    multiplied by (1 - D) against a higher level attacker (D = clamp(level lead / 400, 0, 1), same as v5_70). Lead 200 -> heals at 25%, lead 400+ -> no healing.
    Equal levels: heals at 50% while being hit. Not in a PvP fight: heals unchanged. Natural regeneration is unchanged.
  - Client-only change; no server change.

LOWER GEAR AGAIN (v5_73)
  - Gear multipliers lowered a second time: GEAR_MULT_FLAT 0.8 -> 0.5, GEAR_MULT_PCT 0.35 -> 0.2, FORGE_MULT 0.3 -> 0.18 (also Blade / Robe forge),
    FORGE_MULT_PCT 0.15 -> 0.08. Legendary G15 +100 full set (gear only): PvP DMG red. ~24% -> ~15%, crit EVA ~21 -> ~13, crit DMG red. ~29 -> ~17,
    evasion ~17 -> ~10, aspd ~19 -> ~11. Saves are scaled down once more (GEAR_VER 4 -> 5; saves from v3 and v4 are both converted by new/old).
  - PvP duel length is almost unchanged (equal-level DEF is capped at 75% from level alone): mirror duel ~20 s Lv50-100, ~25 s Lv300, ~30 s Lv500, ~40 s Lv1000.
    pvpMult stays 0.5.

HP POTION CALIBRATION (v5_72)
  - Health Potion heals 5% of max HP (was 35%), cooldown 5 s (unchanged, now the constant POT_CD). Constants HP_POT_PCT / POT_CD in web/index.html.
    Tooltip and shop text updated. Mana Potion (40%) and the auto-use trigger (HP under 35%) are unchanged. Client-only change, no server rebuild needed
    beyond the normal build.bat (files are embedded); hard-refresh (Ctrl+F5).

PVP DUEL RE-CALIBRATION + LOWER GEAR (v5_71)
  - Gear stats roughly halved (web/index.html): GEAR_MULT_FLAT 1.6 -> 0.8, GEAR_MULT_PCT 0.7 -> 0.35, FORGE_MULT 0.6 -> 0.3 (also Blade / Robe forge),
    FORGE_MULT_PCT 0.3 -> 0.15. Legendary G15 +100 full set (gear only, level part not counted): PvP DMG red. ~47% -> ~24%, crit EVA ~41 -> ~21,
    crit DMG red. ~58 -> ~29, evasion ~32 -> ~17, aspd ~38 -> ~19. Existing items in saves (bag, warehouse, equipped) are scaled down automatically
    once (GEAR_VER 3 -> 4, factor new/old), so nobody keeps old-scale items.
  - Why duels were too long: at equal level DEF already sits at the 75% cap from level alone, and the gear % stats (PvP red., crit EVA/DMG red., dodge) added
    a second wall on top. Simulated full-gear mirror duels (basic attacks only, no potions) took 23 s at Lv50 and 88 s at Lv1000.
  - PvP damage: pvpMult / PVP_MULT 0.4 -> 0.5 (game.go + web/index.html, keep them equal). With the lower gear the same mirror duel now takes about
    20 s (Lv50-100), 25 s (Lv300), 28 s (Lv500), 43 s (Lv1000). Potions, skills and dodges stretch it, as before.
  - Unchanged: per-hit cap 10% / 3 s burst cap 30% of max HP at equal level (a duel can never be shorter than ~10 s), and every v5_70 level-gap rule
    (gap dominance D over 400 levels, lethal one-shot at a 500 level lead).
  - Simulator used for the numbers: not shipped in the zip. Rebuild the server (build.bat) and hard-refresh (Ctrl+F5). The Go server compiles (go build / go vet clean)
    and the client script passes a syntax check; the game itself was not run.

PVP LEVEL-GAP ONE-SHOT (v5_70)
  - Problem: even after v5_69, Lv1000 vs Lv1 (both Legendary G15 +100) was not a one-hit kill. Simulated chain for a basic hit: 21,744 dmg after defence,
    cut to 5,146 by the server per-hit cap (Lv1 max HP 12,864), then cut again to ~2,700 by the victim's client-side PvP DMG reduction (47%).
    So the Lv1 needed 5+ hits (and potions / shield / dodge stretched it further). Lv1 -> Lv1000 hits do ~130 dmg vs ~490,000 HP (cannot kill, as intended).
  - Gap dominance D = clamp((attackerLv - victimLv) / 400, 0, 1) (pvpCapGap in game.go, PVP_CAP_GAP in web/index.html). Equal levels: D = 0, nothing changes.
      * server: hit cap 10% -> 100% and 3 s burst cap 30% -> 100% of max HP as D goes 0 -> 1 (was 40% / 90% max);
        the high-level damage penalty of pvpGap (x0.5) fades out with D.
      * client (victim, hurtPlayer): dodge, crit EVA, crit DMG reduction, PvP DMG reduction, damage-reduction buff and shield all count x(1-D) against
        a far higher level player. At a 400 level lead they are ignored.
      * LETHAL RULE: when the attacker is pvpLethalGap (500) or more levels above the victim, every hit that lands deals at least the victim's max HP
        and ignores the caps. Lv1000 kills Lv1 with ONE basic attack, whatever the gear. (Only dash/skill invulnerability frames still avoid a hit.)
  - Gear numbers from v5_69 are unchanged (Legendary G15 +100 full set stays under the stat caps).
  - Rebuild the server (build.bat) and hard-refresh (Ctrl+F5). Not compiled here (no Go toolchain in my sandbox): please run build.bat and report any error.

GEAR + PVP CALIBRATION (v5_69)
  - Problem: Lv1000 needed ~30 s (and potions made it longer) to kill a Lv1 in the same Legendary Grade 15 +100 gear. Gear gave every % stat far
    over its cap (PvP DMG red. 112% vs cap 75, crit EVA 99 vs 75, crit DMG red. 139 vs 90, evasion 77 vs 50) and the PvP caps (10% max HP per hit,
    30% per 3 s) made the damage gap irrelevant: 35% HP potion every 5 s nearly cancelled the 10%/s the caps allow.
  - Gear (web/index.html): GEAR_MULT_FLAT 2.8 -> 1.6, GEAR_MULT_PCT 1.8 -> 0.7, new FORGE_MULT_PCT 0.3 (forge bonus of % stats). Flat forge unchanged.
    Legendary G15 +100 full set now: PvP DMG red. ~47%, crit EVA ~41, crit DMG red. ~58, evasion ~32, aspd ~38 (all under their caps).
  - PvP caps (game.go): the per-hit cap and the 3 s burst cap open up with the attacker's level lead: hit cap 10% -> up to 40%, burst cap 30% -> up to 90%,
    linear over a 400-level gap (pvpCapGap, pvpHitCapMax, pvpBurstCapMax). Equal levels behave exactly as before.
  - Result in the same test: Lv1000 kills Lv1 in ~4 s instead of ~33 s. Rebuild the server (build.bat) and hard-refresh (Ctrl+F5).

POWER SCORE IN THE INSPECT WINDOW (v5_68)
  - The inspect window now shows the other player's POWER at the top (gold, with a lightning bolt), above Lv. / class / HP / equipped count.
  - Same formula as the Power on your own HUD: ATK x 6 + DEF x 4 + max HP x 0.25. ATK and DEF are worked out from the level, Blade / Robe forge levels and the
    gear they share (forge bonuses included); max HP is the value their client reports. Temporary buffs are not counted. It updates live when they change gear.
    (Files: web/index.html peerStat / peerPower / pgRender. No server change.)

TWO ACCOUNTS SHARING ONE CHARACTER (v5_67)
  - Fixed: two accounts used in the same browser (e.g. two tabs) could end up with the same items, stats and forge. The browser's local save used one shared slot
    for every account, and a newer copy left there by one account could be uploaded as the other account's save. Each account now has its own local slot
    (ashenlotus_<email>); the old shared slot is deleted on login. Accounts that were already overwritten are NOT repaired by this.

SAVE BEFORE BEING SIGNED OUT BY ANOTHER LOGIN (v5_66)
  - When the account logs in somewhere else, the old session now SAVES FIRST (browser + account) and only then signs out.
  - The server also asks the old session to save the moment the new device loads the character (/api/load), and waits up to ~1.5 s for that save,
    so the new device starts from the newest progress, not the last timer save. (Files: game.go evFlush, accounts.go flushActive, web/index.html 'kick' / 'flush'.)

PHONE: SELECT OTHER PLAYERS (v5_65)
  - On a phone (touch) tapping another player now selects them; before, players could only be targeted with a right click, which touch screens do not have.
  - An action bar appears under the target frame with: Inspect (gear window), Attack (PvP), + Party (invite), Heart Friend (request), Whisper, and X (deselect).
  - The attack button (crossed swords) next to the skills also attacks a selected player. Tap empty ground to deselect. Desktop controls are unchanged.

INSPECT PLAYER WINDOW (v5_64)
  - The inspect window (click the "Player" tag on a player's target frame) now shows every equipment slot as a card: item icon in its rarity colour,
    name, forge level, rarity / grade and ALL stats (base + forge bonus + extra rolls) one per line. Empty slots are shown dimmed.
  - Responsive: 2 columns on desktop, 1 column on phone portrait, up to 3 columns on phone landscape; the list scrolls, safe-area aware, and the window re-centres on rotate.

FRIEND REQUESTS (v5_61)
  - New Friends button (heart) in the left strip, with a badge for requests waiting for you. It opens the Friends window: add a player by name,
    answer requests (Accept / Decline), see friends with an online dot, level and world, whisper or party-invite them, remove them, and cancel requests you sent.
  - A heart button also appears next to every non-friend in the Online (Here) list. When someone sends you a request while you are online, an Accept / Decline pop-up shows at the top.
  - Requests are saved per ACCOUNT in friends.json (next to users.json; back it up with it), so they work while the other player is offline and survive restarts.
    You see pending requests the next time you log in. If two players ask each other, they become friends at once. Declining is silent.
  - Friends are told when you log in. Limits: 50 friends, 30 pending requests each way.
  - Chat: /friend name  \u00b7 /friend accept [name]  \u00b7 /friend decline [name]  \u00b7 /friend cancel name  \u00b7 /unfriend name  \u00b7 /friends (open the window).
  - Code: server = friends.go (message {"t":"friend","m":"add|accept|decline|cancel|remove|list","name":...}, replies "fl" and "freq");
    client = search "friends: requests that are saved on the server" in web/index.html.
  - REBUILD (build.bat) and hard-refresh (Ctrl+F5).

WORLD OF ASCENSION SERVER  -  MULTIPLAYER EDITION

PLAY WITH FRIENDS
  1. Build (below) and run WorldOfEly.exe on ONE computer. It listens on your network by default.
  2. The console prints addresses like  http://192.168.1.20:8080 . Everyone on the same Wi-Fi/LAN opens that address
     (phones too). Allow the program through the Windows firewall the first time (private networks).
  3. Type a name on the title screen and press Begin. You will see "Online - N adventurers" under the name box.
  Use  WorldOfEly.exe -lan=false  to host for this computer only, and  -port 9090  to change the port.
  Over the internet: forward/tunnel the port to the host; the page and the game socket use the same address, so
  an HTTPS tunnel (which turns the socket into wss://) works with no changes.

WHAT IS SHARED
  - Each of the 16 worlds (World 0 = Arena, Worlds 1-15 = hunting worlds) is a shared room. Everyone in the same world sees the same monsters and bosses, the same
    HP bars, the same deaths and respawns, and the same ore veins (one player mines a vein, it is gone for all).
  - Monsters are simulated by the server and will chase whoever is nearest. Players are shown with name, level, skin,
    health bar, sword and robe upgrades, and their skills/swings are visible to others. Other players appear on the minimap (green).
  - Experience and loot are personal: everyone who damaged a monster gets their own XP, coins, ore and boss gear.
    So friends never steal each other's kills. Level-ups, forge upgrades and skin changes sync automatically.
  - Day/night is the same for everyone. Press Enter to chat (global; messages from other worlds show the world name).
  - The World Gate shows how many players are in each world. Tabbing away makes you ignored by monsters (no AFK deaths).
  - Characters still save in each person's own browser (localStorage), so everyone keeps their own progress.

IF THE SERVER IS UNREACHABLE
  The game falls back to the original single-player simulation ("playing solo"), and reconnects automatically.

TRUST MODEL (read this before hosting publicly)
  The server owns monsters, kills and ore, but each client reports its own stats, damage and loot. That is fine for
  friends. A hostile player could edit their client to cheat. Making it cheat-proof would need server-side characters
  and combat; the structure here (one Hub goroutine, small JSON messages) is meant to make that a natural next step.

FILES
  main.go   web server + /ws endpoint        ws.go    tiny WebSocket implementation (standard library only)
  audio.js  (in web/) music + sound effects + volume engine
  game.go   realms, monster AI, hit/kill credit, chat. Numbers that must match the client (levels, boss types) are in worldDefs.

Build (needs Go from https://go.dev/dl/):
  Windows: double-click build.bat   (or: go build -o WorldOfEly.exe .)
  Mac/Linux: go build -o worldofely .
  Cross-compile for Windows from elsewhere:
    GOOS=windows GOARCH=amd64 go build -ldflags "-s -w" -o WorldOfEly.exe .
Run: WorldOfEly.exe  -> opens http://localhost:8080
Phones on same Wi-Fi: run-lan.bat (or WorldOfEly.exe -lan), open the printed address.
Options: -port 9090   -no-browser   -lan
Saves live in each browser's localStorage (per address).

3D MODE (Three.js): all 3D models (character, monsters, hub, ore, scenery) are built in code in
web/models3d.js - no extra art files needed. The page loads Three.js from the internet. For fully offline play,
download https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js and save it as
web/three.min.js BEFORE building; the game falls back to it automatically.
Press V in game to switch 3D / 2D. Mouse wheel zooms in 3D.
Press C (or the SKIN button) to open the WARDROBE (see below). Your look is saved. Forge upgrades show on the model: sword glow and
colour (weapon level), shoulder plates / cape / halo (armour level).

PHONE LANDSCAPE (new)
Phones get a "Land" button in the left strip: it goes full screen and locks the screen to landscape (Android Chrome etc.; iPhone Safari cannot
lock rotation, so there the game asks you to turn the phone sideways). The choice is remembered. Phone skill slots are smaller (scale .9 in the
html.phone #skills / #ab rules) and the HUD now respects the notch / rounded corners (safe-area insets).

PHONE LANDSCAPE LAYOUT: in landscape the left buttons (Party, Skills, Chat, Skin, 3D, Land) and the potion/scroll/ore/PvP buttons form two rows: Party/Skills/Chat/3D/Land at the top left; the potion/scroll/PvP buttons at the bottom, same size and spacing as the skill slots (the Skin button now replaces the bell at the top right; the ore box button is gone).
Chat messages and loot chips sit just above the row. Phone skill slots are scale 1.1. Portrait is unchanged.
See "PHONE LANDSCAPE LAYOUT" CSS near the html.phone rules in web/index.html.

RANDOM BOSS WAVES & RANDOM GEAR (new)
Bosses no longer stand at fixed spots. Every world gets a boss WAVE at a random time (60-240 s apart): 1 to 5 bosses, each with a random
boss type, a random level (anywhere in the world's level range) and a random location. Never more than 5 bosses alive at once, and an
unkilled boss vanishes after 20 minutes. Killed bosses do not respawn in place - the next wave brings new ones. Spawn announcements appear in
the message feed and bosses show as red dots on the minimap. Constants: maxBosses / bossWaitMin / bossWaitMax / bossLife in game.go and
BOSS_MAX / BOSS_WAIT_MIN / BOSS_WAIT_MAX / BOSS_LIFE in web/index.html (solo mode runs the same rules).
Each boss drops 1-3 random accessories (random slot). Every piece has a rarity and random stat rolls:
  Common (55%)  = slot stat only, low roll        Rare (28%)      = +1 random extra stat
  Epic (13%)    = +2 random extra stats           Legendary (4%)  = +3 random extra stats, best rolls
A new piece replaces the equipped one only if its total stat score is higher (forge level is kept); otherwise it is salvaged into ore.
Tune the table RAR near the top of web/index.html. Old saves load their gear as Common pieces with the old fixed stats.

BOSS GEAR & FORGE (older notes - grade/stats are now as described above)
Every world boss drops one accessory: Earrings (crit chance), Ring (ATK), Necklace (HP), Gloves (attack speed),
Boots (DEF + move speed). Walk over the glowing hexagon to pick it up. Grade = the world the boss is in (1-12);
a higher-grade piece replaces your old one and keeps its forge level, equal/lower pieces are salvaged into ore.
Temper them at the Lotus Forge (O) up to +100, same as the Blade and Robe.

MONSTER SCALING (new)
EXP: the base EXP per level is multiplied by (level x 2). Change EXP_LV_MULT near expNext() in web/index.html (0 = original curve).

Monster HP grows +0.5% per level on top of the old curve, and every monster has a DEF stat (shown next to its name)
that cuts your damage. All numbers are constants near monsterAt() in web/index.html (MON_HP_PER_LV, MON_DEF_*).
Gear stats are in the GEAR table near the top of the player section (GEAR_DROP_CHANCE = drop rate).


HUD LAYOUT (Mir4-style)
Top-left: level + combat power, realm tag, HP/MP, ATK/DEF/CRIT, buffs, coins/ore, day phase.  Left strip: Party (players here), auto-equip skills, Chat, Skin, 3D/2D.
Top-centre: target frame (appears when you have a target).  Top-right: Forge, World Gate, Skill Book, Minimap (M), message feed toggle, menu (+).
Right: Danger/Safe + zone + world strip.
Bottom-centre: Auto-mine (E), Auto-hunt (A), health draught (Q), Qi draught (Z), ore/forge, menu.  Draughts cost coins and share a 5s cooldown.
Bottom-right: 12 round skill slots (keys 1-0 - =), two large slots (R, T), target-nearest and the Attack button.  Bottom-left: clock, EXP %, ping.
Ping needs the updated server (game.go has a new "pg" echo); with an old server it just shows "online".

BAG & POTION SHOP
Every monster drop (coins, ore, Health/Mana potions, boss gear) goes straight into the bag; gear is equipped or salvaged instantly. Open the bag with B.
Monsters drop potions (POT_DROP = 10% each, bosses always 3-6). Potions are used with Q (health) and Z (mana), 5s cooldown, and can auto-drink when HP < 35% / mana < 20% (checkbox in the bag).
The Potion Merchant stands in every hub (click him or press N nearby) and sells potions for coins (potPrice() = 4 x level, min 10). Potions are saved with your character.


ACCOUNTS (new)
You must register with an email and password before you can play. The title screen shows Log in / Register; after that you
pick a name and press Begin/Continue. Your character is saved to your account on the server (and cached in your browser), so
you can log in from another device and keep your progress. Log out with the button under the title.
  - The server creates users.json (accounts + saves; passwords are salted PBKDF2 hashes) and secret.key (signs login tokens)
    in the folder it runs from. Back both up, and never share secret.key.
  - Passwords are at least 8 characters. Logins are valid 30 days. Too many attempts from one address are throttled.
  - Over plain http on a LAN the password is not encrypted in transit. For internet play use an HTTPS tunnel.
  - Logging in needs the server running (the solo fallback still covers a dropped connection once you are in).

SKILLS
A new skill is learned every 5 levels (200 skills, level 5 to 1000). Skill power is scaled so a skill is as strong as the
old every-10-levels skill of the same level. Old saves keep their level; skill slots are re-arranged automatically once.

AUTO-CAST
Tap a skill slot to cast it. Drag a slot upward to switch auto-cast for that slot on or off (a green AUTO tag shows when on).
Auto-hunt (A) only casts skills that have AUTO on. All slots start with AUTO on, and the setting is saved with your character.

MAP SIZE
Every world is 5x larger in width and height than before (radius 15,400 instead of 3,080). Zones, boss positions, monsters (2,400 per world),
ore veins (400) and scenery scale with it; the hub stays the same size. The multiplier is one number: MAP_K in web/index.html and mapK in
game.go. They MUST be equal (the server and the browser both read it). Walking from the hub to the rim now takes about 75 seconds.
Old saves still work; if a save was in a far corner the character is clamped inside the map.

MONSTERS & MINIMAP
Monsters per world are doubled (4,800; MON_MULT in web/index.html = monMult in game.go, keep them equal).
The minimap is centred on you and shows a 2000-unit radius (MINI_R in web/index.html). Light blue dots = monsters, light red = bosses (same size as players),
red = other players, gold = ore, white = you.


HOME SCROLL (new)
A Home Scroll teleports you to your hub spawn in the current world (press X, or tap the scroll button next to the potions, or use it from the bag).
It has a 3s channel: moving or taking damage cancels it (the scroll is only used up when the teleport completes), then a 10s cooldown. It does nothing while you are already in the hub.
Drops: monsters 3% (TP_DROP), bosses always 1-2. The Potion Merchant sells them at max(50, level x 8) coins (tpPrice()). Constants TP_DROP, TP_CHANNEL, TP_CD are near POTS in web/index.html.
Scrolls are saved with your character; old saves load with 0.
While channelling you get a violet spiral of motes, pulsing rings and a progress bar above the hotbar (tpFx() in web/index.html); arriving and leaving each flash with a burst. It works in both 3D and 2D.


PVP (new)
Right-click another player to switch PvP on. (On touch screens a long-press on a player does the same.) You are then "flagged": your name and health bar
turn red with a crossed-swords mark, the zone tag shows PvP and a 30s countdown, and you target that player. While flagged you can hurt players
with the normal attack, every skill and auto-hunt skills. Left-click a flagged-zone player to target them.
  - The flag lasts 30 seconds and every PvP hit you give or take renews it. The server owns the flag (it cannot be faked by the client).
  - The safe hub is a no-PvP zone: nobody in the hub can attack or be attacked, and you cannot start PvP from inside it.
  - If you hit someone who was peaceful, they are flagged too, get a warning, and automatically target you so they can fight back.
  - Server applies damage: player DEF reduces it like monster DEF does, PvP damage is scaled by PVP_MULT (0.4; pvpMult in game.go, PVP_MULT in
    web/index.html - keep equal), a single hit can never take more than 10% of the victim's max HP (pvpHitCap), and nobody can lose more than 30% max HP
    to PvP inside any 3 seconds (pvpBurstWin / pvpBurstCap). A high-level attacker deals less to a lower level (down to x0.5), a lower level attacker gets up to +25%.
  - Killing a player (a hit within the last 12s before they fall) gives a bounty of 10 coins x their level, no bounty for killing the same player again within 60s
    (pvpBountyCd), and announces the kill to the world. The victim loses 10% coins as with any death.
  - Other worlds, solo mode (no server) and monsters are unchanged. PvP needs the multiplayer server.
Same trust model as before: clients report their own damage; the server only caps and validates it.


PVP ARENA (World 0)
World 0, the Arena, is the PvP arena and the first entry at the World Gate (the gate needs a hub as usual). Worlds 12-15 (Voidmaw Frontier, Dragonbone Summit, Chronos Spiral, Heaven-Sundering Throne) are hunting worlds with monsters at Lv 1001-1400; keep worldDefs in game.go equal to WORLDS in web/index.html.
  - Players only: no monsters, no bosses, no ore. Its map is a small round arena (radius ARENA_R = 1500) ringed by red pillars in 3D / a red line in 2D,
    with the hub in the middle. Because it no longer has monsters, the grade-12 boss gear no longer drops anywhere.
  - The hub is the lobby: safe, has the Potion Merchant, forge and World Gate, and it is where you spawn and respawn. Nobody can attack or be attacked inside it.
  - Step outside the hub and PvP is ALWAYS live - no right-click needed (right-click still targets a player). Step back in and you are safe again.
    The zone tag shows PvP LIVE; flagged names and health bars are red.
  - Dying in the arena costs no coins. Kills still pay the PvP bounty (10 coins x victim level, none for re-killing the same player within 60s)
    and the world is told the kill number. Auto-hunt (A) targets the nearest player.
  - Worlds 1-11 keep the right-click rule above. A save made in the arena reloads in Ashen Reach.
  - Constants: arenaWi / arenaR in game.go must equal ARENA / ARENA_R in web/index.html.
  - Not level-gated: a high-level character hits much harder than a low one (per-hit cap is 30% of the victim's max HP).

NOTE: the game files are embedded in the program. After updating, rebuild (build.bat), fully close the old WorldOfEly.exe, start the new one (its console
should print "Build: PvP arena = Arena (World 0) (players only, no monsters)") and hard-refresh the browser (Ctrl+F5). An old server keeps an old arena alive in memory.


FORGOT PASSWORD (new)
"Forgot password?" under Log in / Register. Type your account email, click it, and a 6-digit reset code is emailed (valid 15 minutes, 5 tries, one
new code per minute). Enter the code plus a new password and you are logged in. Passwords are stored only as hashes, so the old password can never be
emailed - that is why a reset code is sent instead. The answer is the same whether or not the email is registered.
The server needs an email account to send from. Example (Gmail needs an "app password"):
  WorldOfEly.exe -smtp-host smtp.gmail.com -smtp-port 587 -smtp-user you@gmail.com -smtp-pass YOUR_APP_PASSWORD
  (or set ALOTUS_SMTP_HOST / _PORT / _USER / _PASS / _FROM). Port 465 uses TLS. -smtp-from sets the From address.
Without SMTP settings the server cannot email anyone: the code is printed in the server window instead, and the console says "NOT configured" at startup.

CHAT COMMANDS (admin only)
  Start the server with  -admin your@email.com  (several emails: comma separated) or set ALOTUS_ADMIN. run-lan.bat has a
  placeholder: replace your@email.com with the email of your game account. Then press Enter in game and type /help.
  /boss [1-5] [level]  spawn bosses within minimap range of you      /bossclear   remove all bosses in this world
  /bosses  list bosses with distance and direction                   /gotoboss    teleport next to the nearest boss
  /heal  /god  /speed 0.5-5  /home  /where                           /lvl N  /exp N  /coins N  /ore N  /pots N
  /gear [grade] [common|rare|epic|legendary] [count]  add gear to the bag      /minimap 500-15400|max|min  radar range (max = full map radius)
  /fireworks  /roll [sides]  /flip  /who  /announce message


PHONE 3D PERFORMANCE PASS (no quality settings changed)
- Static world (terrain, scenery, hub) no longer recomputes transforms every frame; the hub's ~110 static meshes are merged into ~15 draw calls (bake() in models3d.js).
- Phone panels no longer use backdrop-filter blur over the live 3D canvas (html.phone .panel); they are slightly more opaque instead.
- 120Hz+ phones render at ~60 fps (frame() pacing); 60/90Hz phones are untouched.
- Off-screen monsters are hidden (0 draw calls) and, a bit further out, skip their pose update; monsters/ore keep a 150-unit hysteresis so they are not created and destroyed at the edge of the view range.
- HUD only writes to the DOM when a value changed; no per-frame Color allocations; WebGL stencil buffer disabled.

PHONE SHARPNESS (new)
Phones no longer render at 0.85 scale. 3D now renders at up to 1.5x with anti-aliasing on, and lowers itself automatically (down to 1.0x) if the phone drops below ~45 fps, stepping back up after 30 s of smooth play. Steps are PRS near the top of the 3D section in web/index.html.
Regular monsters on phones no longer draw small parts (eyes, ears, claws, fangs); bosses keep them. See LITE in web/models3d.js.

WHO'S ONLINE LIST FIX (v5_59)
The Online button (top bar) now toggles the Here / Online list on and off reliably, the button lights up while the list is on, and the choice is remembered. Moving, tapping the map or using the joystick no longer closes the list - only the button does. It is shown by default. In solo mode (no server) there is nobody to list, and the button says so. See onlineApply() near the bParty handler in web/index.html.

SKILL BOOK AUTO-EQUIP FILLS ALL SLOTS (v5_59)
The Skill Book (K) "Auto-equip best" button now fills all 14 skill slots. First the best unlocked skill of each type (in the usual order), then the 2nd best of each type, then the 3rd, and so on, until every slot is full or the class has no more unlocked skills. It does this for ALL five classes at once: the class you are playing and the saved layouts of the other four (autoArrangeAll). Before, only one skill per type was equipped, so slots were left empty. See autoArrange() in web/index.html.

AUTO-EQUIP BEST (bag)
The Bag has an "Auto-equip best" button. For each of the 5 gear slots it wears the bag piece with the highest stat score (same score the drops use); a tie goes to the higher grade. Your old piece goes to the bag. Forge level stays with the slot. See autoEquipBest() in web/index.html.

EXP NEEDED PER LEVEL HALVED: EXP_NEED_K=.5 next to expNext() in web/index.html (1 = the previous curve).

FIGHT BACK (new)
When a monster hits you and you have no live target, you turn on it and attack automatically (normal attack; auto-hunt casts skills as usual). It never overrides a target you picked, a click-to-move destination or joystick/keyboard movement, and is off in the hub and PvP-only mode. Bag > "Fight back" checkbox turns it off (saved per character). See retaliate() in web/index.html.

MELEE SKILLS (new)
Four melee skill types, all need an enemy close by and spend nothing when there is none:
  Heavy Strike (strike)  single-target hit, short cooldown          | Crescent Cleave (cleave)  arc in front of you, hits everything in it
  Leaping Slash (leap)   jumps next to a target up to 360 away and hits (0.25 s of invulnerability) | Hundred Cuts (flurry)  3+ rapid hits on one target
A starter "Heavy Strike" is learned at level 1 (new characters have it in slot 4); then one melee skill every 10 levels (level 10..1000), cycling the four
types through the 25 tiers (Jade ... Supreme), power scaled like the ranged skills. Melee numbers: MST near SKILLS in web/index.html.
Auto-hunt casts them automatically: strike/flurry within 170, cleave within 200, leap when the target is 170-360 away.
Existing characters: the best melee skill of each type is placed into EMPTY skill slots once on the next login (nothing is replaced); the rest are in the Skill Book (K).
They are appended after the ranged skills, so saved skill slots are unchanged.

PRIVATE MESSAGES (new)
Any player (not just admins) can whisper to someone online, in any world:  /w name message   (also /pm /msg /tell /whisper).
Names with spaces need quotes:  /w "Wind Walker" hello.  A unique start of a name also works (/w Win hello).
Reply to the last person who whispered you with  /r message.  Tap a name in the "Here" list to start a whisper.
Only you and the other player see it. Whispers show pink (received) or lilac (sent).  Server: whisper() in game.go. Client: case 'pm' in web/index.html.

SPEECH BUBBLES (new)
Chat messages also appear in a bubble above the sender's head for about 4-9 seconds (2D and 3D). Everyone who can see the player sees it.
Whispers are never shown to others: the receiver sees a dashed pink bubble over the sender (if they are in the same world), the sender sees a dashed lilac one over their own character.
See setBubble() / drawBubble() in web/index.html.

PRIVATE CHAT BOX (new)
A draggable chat window for whispers, with one tab per player. Open it by tapping a name in the Party list, with the envelope button (top right) or
the I key, by typing /w name (no message), or when someone whispers you (it pops up and the tab blinks with the number of unread messages).
Type in the box and press Enter to send. - minimises it, x hides it (the conversations stay), the x on a tab closes that conversation.
/w name message still works from the normal chat line, and /r message answers the last person who whispered you. Only you and the other player
see a whisper; a bubble is shown over the sender's head to the receiver (see SPEECH BUBBLES). Conversations are kept only while the page is open.
Code: PC / pcRender() / pcAdd() in web/index.html (client), whisper() in game.go (server).


CHAT WINDOW (new, replaces the old chat line and the whisper box)
One MMO-style window: Enter or the Chat button opens it, Enter sends, Esc / x closes it, drag the title bar to move it.
  - Tabs on the left: All (player chat + system + whispers), World (player chat only), System (kills, drops, announcements, boss spawns)
    and one tab per whisper partner. A blue badge on a tab = unread there; the orange badge on the door button (and on the Chat button) = total unread.
  - Messages show an avatar (the sender's skin), [Lv N] name (time) and a bubble. Messages from other worlds carry the world name.
    System lines are plain coloured text with the time. Whispers are pink / purple.
  - Header: gear = settings (system/whispers in All, show times, floating messages over the game, clear tab), speech+ = new whisper (pick a player
    here or type a name), pin = share your world and position in chat, door = jump to the next unread tab, ? = help.
  - The list button next to the input has quick phrases and the /w and /r shortcuts. Whisper commands (/w name msg, /r msg) and admin commands work as before.
  - While the window is open the floating message feed over the game is hidden. Settings are remembered in the browser (wl_chatpref).
  - History is kept while the page is open (300 lines). Code: CP / cpPush() / cpRender() / cpSend() in web/index.html (search "CHAT WINDOW"), say() now also writes to the System tab.


OFFLINE WHISPERS (new)
/w name message (or the whisper tab) now works when the player is offline. The server queues it and delivers it the next time that
player's ACCOUNT logs in (the Chat window shows it in a whisper tab, tagged "offline" with its original date, plus a System line).
  - Who counts as "known": every character name that has joined since this update. The first account to use a name keeps it, so two
    people who both play as the same name cannot both receive offline mail under it. Names not seen since the update are still "not online".
  - Whispers are stored per account (never by name), max 50 queued per account (oldest dropped), anything older than 30 days is discarded.
    If the owner is online under a different character name, the whisper is delivered live instead of queued.
  - Files: offline.go (queue + name list), whispers.json (created next to the program; back it up with users.json), hooks in game.go
    (whisper(), join) and main.go (loadOffline). Rebuild with build.bat and restart the server.

IN-GAME NAME (IGN)
  After logging in, a new account chooses its name on the title screen. The name is checked live for availability
  (unique, case-insensitive, 2-16 characters, letters/numbers/space . - _ '), the player confirms it, and it is then
  saved on the account (users.json "ign") and can never be changed. The server ignores any name sent by the client
  and always uses the saved one. Existing accounts without a name are asked to pick one the next time they press Begin.
  API: GET /api/ign/check?name=X   POST /api/ign {"name"}   (GET /api/me now also returns "ign").


WARDROBE & SAVED LOOK (new)
Press C or tap the Skin button to open the Wardrobe: five tabs with a live preview - Skin (36 colour schemes), Hair (8 styles: Ponytail, Topknot,
Long Flow, Short Crop, Twin Buns, Spiky, Braid, Shaven), Outfit (7: Classic Robe, Battle Plate, Hooded Robe, Shoulder Mantle, Wide Sleeves,
Dragon Scale, Royal Court), Headwear (13: Circlet, Bamboo Hat, Crown, Horns, Fox Ears, Bunny Ears, Scholar Cap, Lotus Crown, Shadow Mask,
Warlord Helm, Antlers, Lotus Pin, Spirit Gem) and Aura (7 particle effects + ring colour: Ember Flame, Frost Shards, Thunder Sparks,
Blossom Petals, Shadow Wisps, Golden Motes, Starlight). Randomize and Default look buttons are at the preview. Everything works in 3D and 2D and
other players see your full look.
  - The look stays until YOU change it: it is saved in your character save (browser + account on the server) and in a backup key
    (al_look_<email>), and it is pushed to the server the moment you pick something, so logging out or closing the tab cannot lose it.
  - Bug fixed: the 3D model was built before login with the default skin and was never updated after your save loaded, so you looked like the
    default Wanderer after logging in. The model now follows your saved look on login and every frame.
  - A look is ONE integer ("sk"): bits 0-5 palette, 6-9 hair, 10-12 outfit, 13-16 headwear, 17-19 aura. Old saves (0-4) are palettes 0-4 with
    default styles. The server accepts sk up to 1<<22 (game.go applyInfo). Add palettes in SKINS, names in HAIRS/OUTFITS/HEADS/AURAS (models3d.js).
  - REBUILD the server (build.bat) so the new web files and the larger sk limit are embedded, then hard-refresh (Ctrl+F5).

GENDER (new): Wardrobe > Gender tab, He / She. Bit 20 of the look integer. She = slimmer robe and head, eyelashes and rose lips (3D and 2D);
every skin, hair, outfit, headwear and aura works with both. Saved and synced like the rest of the look.

MONSTER FACING + PER-WORLD MONSTER LOOKS (new)
Monsters now face the way they are walking (chasing, wandering or returning home) instead of always staring at the player, so they no
longer move backwards. Facing logic: updMon() in web/index.html. Each world also dresses the nine monster body plans differently
(proportions, body glow, signature decoration such as spikes, orbiting stars, flames, halo, fins, leaves, bolts, bones, sun disc, crystal
shards). Tune or add looks in the THEMES table in web/models3d.js (index = world index).

CLASSES: NIGHT BLADE (new)
There are now two classes. Open the Skill Book (K) and press a class button at the top to switch (free, any time). Each class keeps its own
slot layout and auto-cast switches; the Skill Book only lists the active class's skills. Your class is saved with your character.
  Cultivator (default)  every skill that existed before (qi spells, heals, melee). Balanced.
  Night Blade           shadow assassin: +10% crit chance, -10% max HP. Three starters at level 1, then a new skill every 5 levels (200 skills):
     Phantom Kunai (dagger volley)   Shadow Step (teleport behind a target within 420 + backstab, x1.35)   Venom Needle (poison on up to 3 foes)
     Blade Dance (4 spinning hits, invulnerable 1 s)   Smoke Veil (+35% move speed, ATK buff, brief invulnerability)   Reaper's Mark (more damage the
     lower the target's HP)   Blood Fang (melee strike, heals you)   Umbral Rush (dash that cuts everything in its path)
Auto-hunt casts them with the same AUTO switches. Numbers: NB_T table next to SKILLS in web/index.html (name, damage x ATK, Qi cost, cooldown); class
bonuses are in critChance() / maxHp(). Other players see the effects (they reuse the existing effect types), so no server change was needed.
To add another class: add an entry to CLASSES, give its skills a c:N field and add its types to useSkill() and autoArrange().

THREE MORE CLASSES (new): IRON GUARDIAN, STORM ARCHER, SPIRIT SUMMONER
Same rules as the Night Blade: switch in the Skill Book (K), each class keeps its own slots, 3 starters at level 1 then a new skill every 5 levels
(200 per class), auto-hunt uses them. Passive bonuses are in the CLB table; skill numbers in CLS_GEN (both next to SKILLS in web/index.html).
  Iron Guardian    +25% max HP, +25% DEF.   Shield Bash (hit + small shield), Earthquake (slam + 2 aftershocks), Bulwark (big shield + 20% damage
                   reduction), War Cry (area hit + ATK buff), Retaliation (area hit, stronger when you are wounded), Hammer Smash (single hit + splash),
                   Iron Skin (35%+ damage reduction + heal), Seismic Wave (wide shockwave in a line). Starters: Shield Bash, Bulwark, Earthquake.
  Storm Archer     +15% crit chance, +10% move speed.   Piercing Arrow, Arrow Volley, Arrow Rain (3 waves), Explosive Arrow (splash), Eagle Eye (+25% crit
                   chance, ATK buff), Gale Step (leap back + speed + arrows), Thunder Trap (6 pulses), Storm Arrow (jumps between foes). Starters: Piercing
                   Arrow, Arrow Volley, Eagle Eye.
  Spirit Summoner  +30% max Qi, -5% max HP.   Spirit Wolves (up to 3 spirits orbit you and strike the nearest monster), Soul Burst (restores Qi),
                   Wraith Wail (double hit), Ghost Chains (4 nearest foes), Soul Mend (heal + Qi), Soul Harvest (area damage that heals), Phantom Guardian
                   (shield + a spirit), Spirit Bomb (delayed huge blast). Starters: Spirit Wolves, Soul Burst, Soul Mend.
New buffs show in the buff row: damage reduction, Eagle Eye, spirit count. Other players see the effects (existing effect types); no server change.

PARTIES
  - Invite: tap the green + next to a name in the Party list (left button), or  /invite name  (works across worlds).
    The invited player gets an Accept / Decline prompt (30 s), or types /accept or /decline.
  - Up to 4 players. The player who forms the party is its leader (star next to the name).
  - Leader only:  /kick name  (or the red x in the party frame),  /leader name  (or the star button) hands over leadership,
    /disband ends the party. If the leader leaves, leadership passes to the next member. One member left = party disbands.
  - Anyone:  /leave (or the Leave button).
  - Party chat: while you are in a party the chat window gets a "Party" tab (green [Party] tag, unread badge). Type there and only your
    party sees it, in any world. Also  /p message  from any tab, or the chat button on the party window. Party lines also appear in All.
  - EXP sharing (anti power-levelling rules, all enforced by the server, tune them at the top of party.go):
      * Only members who did NOT hit the monster get a share; members who did get full EXP and loot as before. Loot is never shared.
      * Base share is 50% of the kill's EXP (partyXPBase), same world, within ~2500 units of the monster (partyXPRange).
      * No shared EXP from bosses.
      * Level gap: no share if the party's top damager on that kill is more than 10 levels above the member (partyShareGap).
      * Monster level: full share up to monster level = member level + 5, then it falls 10% per level and hits 0 at +15
        (partyMonSlack / partyMonFall), so a high-level player cannot drag a low-level member through high-level monsters.
      * Dead or AFK (tab hidden) members get nothing.
  - PvP: party members cannot flag or hit each other (arena included). Everyone else is unchanged.
  - Left buttons: "Online" shows who is online / in your world (tap + to invite). "Party" shows or hides the party window.
  - The party window is translucent. Press and drag anywhere on it to move it (double-click to reset); the position and hidden/shown
    state are remembered in your browser. Hide it with the - button; it reappears when you join a new party or press Party.
  - Party members are blue on the minimap and green-named; the frame shows name, level, HP and world.
  Code: party.go (+ small hooks in game.go and web/index.html).


DEFENSE REBALANCE
  - Player DEF = (3 x level + 6 x armor level + boots/gear DEF) x (1 + 4% per realm) x class bonus (was 1.2 x level).
  - Same curve for every hit on a player (monster or player): reduction = DEF / (DEF + 10 + attackerLevel x 3), max 75%.
    The attacker's level is inside the formula, so the same DEF protects less against a higher level enemy.
  - Monster DEF = (6 + 2.6 x level) (bosses x1.5), was (2 + 1.5 x level). Reduction = DEF / (DEF + 150 + YOUR level x 3).
  - Level gap, you hitting a monster above your level: damage x 1/(1 + 0.02 x gap), min x0.3.
  - Level gap, monster hitting you: monster above you hits +1% per level (max +60%), monster below you -1% per level (min x0.4).
  - Tunables: PDEF_* / MON_DEF_* in web/index.html and pDef* / pvp* in game.go (keep the two files equal).

LEVEL-GAP DEFENSE AND SKILL CASTING (update)
  - Monster DEF is multiplied by the level gap: +5% per level the monster is above you (max x4), -1% per level below you (min x0.6).
    The DEF number shown above a monster is this effective value. On top of that, damage to a monster above your level is x1/(1 + 0.03 x gap), min x0.2.
    (Example, you Lv 50: a Lv 70 monster keeps about 27% of your damage, a Lv 100 monster about 9%, a Lv 50 monster about 69%.)
  - Skills work during melee: the normal attack and skills run side by side, auto-cast no longer waits for the target to be farther than 90 away.
  - One skill at a time: after any cast (manual or auto) there is a 0.45s skill lock (SKILL_GCD). The basic attack is not affected.
  - Auto-cast order follows the slots: slot 1 first, then 2, 3 ... 12. Each pass casts only the first skill that is ready and wanted.
    Slots R and T never auto-cast (no AUTO light, dragging them up does nothing).

MONSTER SPREAD
  Normal monsters are now spread evenly per AREA (distance = sqrt of a uniform value), not per distance. Same 4,800 per world, but the outer rings
  hold more of them and every ring has the same density. Expected count per ring 1-9: 178, 229, 321, 337, 579, 815, 978, 1141, 223.

MONSTERS PER RING (replaces the area-spread count above)
  Fixed counts per ring 1-9: 300, 400, 500, 600, 700, 800, 900, 1000, 300 (5,500 per world). Inside a ring they are still spread evenly per area.
  Tune ringMons in game.go and RING_MONS in web/index.html (keep equal). MON_MULT / monMult no longer set the count.

CLASS LOOKS (3D)
  Night Blade and Iron Guardian now have their own model, visible to all players:
    Night Blade   - slim, forward-leaning shadow: pointed hood, face wrap with glowing eyes, long scarf, tattered cloak,
                    crossed straps, spiked asymmetric pauldron, twin curved daggers, drifting violet wisps.
    Iron Guardian - broad, heavy full plate: great helm with red plume and glowing visor, layered gold-trimmed pauldrons,
                    tassets, greaves, tower shield, war hammer, heavy red cape, slower stride.
  The class is sent to other players in bits 21-23 of the look value (server clamp raised to 1<<24 in game.go).
  Weapon glow / scarf / visor tint follow your weapon forge tier.


STORM ARCHER LOOK (v3.1)
- Storm Archer now has its own 3D model: feathered ranger cap with storm goggles, slate-teal coat, lightning harness, feather mantle, back quiver, and a glowing recurve bow with a nocked lightning arrow. It holds a bow-draw stance and crackles with sparks. Bow glow takes on your weapon tier colour.

SPIRIT SUMMONER LOOK (v3.2)
- Spirit Summoner now has its own 3D model: wolf-skull headdress, indigo shaman robe, bone-rib chest, skull pauldron, ghost ribbons, soul-lantern staff, floating soul orb, and a translucent spirit wolf companion. Staff and orb glow take on your weapon tier colour.


STORM ARCHER + SPIRIT SUMMONER REFINEMENT (v5.1)
  Storm Archer:  Gale Step now makes your next Piercing Arrow / Arrow Volley deal +40% for 4 s. Auto-hunt uses Eagle Eye on any target in range
                 (was only bosses / 2+ foes) and Gale Step when a foe gets within 150 or you are below 75% HP with 2+ foes near (was 60%).
                 Explosive Arrow splash 55% -> 65%, radius +10.
  Spirit Summoner: Wolves and the Phantom Guardian spirit now have separate caps (3 wolves + 1 guardian; before, the guardian pushed a wolf out and
                 auto-hunt kept recasting). Spirits focus the monster you are targeting instead of just the nearest one. Soul Burst returns 8% Qi (was 6%).
  Client-only change (web/index.html), no server edit needed.

2D CLASS LOOKS (v5.2)
  The top-down 2D view now matches the 3D class models (same palettes and silhouettes): drawPlayerE() in web/index.html calls clsPal / clsBack /
  clsFront / clsWeapon for classes 1-4. Night Blade: pointed hood, glowing eyes, scarf, tattered cloak, twin curved daggers, violet wisps.
  Iron Guardian: great helm with red plume and visor, gold pauldrons, red cape, tower shield, war hammer. Storm Archer: feathered cap, goggles,
  lightning harness, quiver, glowing recurve bow with nocked arrow. Spirit Summoner: wolf-skull headdress, rib chest, ghost ribbons, soul-lantern
  staff, floating orb, translucent spirit wolf. Other players' classes are read from the look value (bits 21-23). Cultivator is unchanged.

NEW GEAR SLOTS (v5.3): LEGGUARDS, BRACELET, BELT
  Three more accessory slots next to Earrings / Ring / Necklace / Gloves / Boots. Same rules: bosses drop them with a rarity and random stats,
  equip from the bag, temper at the Lotus Forge, old saves load with the new slots empty.
    Legguards (pants)  DEF + HP        per grade 4 DEF, 20 HP;   +2.5 DEF, +12 HP per forge level
    Bracelet           ATK + crit      per grade 4 ATK, 0.5% crit; +3 ATK, +0.25% crit per forge level
    Belt               HP + DEF        per grade 35 HP, 1.5 DEF;  +20 HP, +1 DEF per forge level
  Tune in the GEAR table (web/index.html); names are the n: fields. Icons: ICONS.legs / brace / belt; the 3D drop models are in makeGear() in
  web/models3d.js. No server change. Note: three more slots means more total stats, so retune monsters/bosses if it feels too easy.

BAG WINDOW: ROTATABLE 3D AVATAR
  In 3D mode (V toggles 3D / 2D) the avatar in the middle of the Bag window is the real Three.js character: your look, class kit, aura, blade
  and armour tier. Drag it left/right (mouse or finger) to spin it; it keeps a little momentum, and double-click resets it to face front.
  In 2D mode, or if WebGL is unavailable, the old 2D avatar is shown. Code: bagInit3 / paintBag3 / bagPreview in web/index.html (a second
  small WebGL view that reuses AL3D.makePlayer). No server change.

PROGRESS SAVING (closing the browser without Logout)
  The game now writes the current state to the browser and your account the moment the tab is hidden or closed (not just the last 8 s timer
  save), saves ~1 s after every drop, and pushes to the account 2 s after each save. Every save carries a timestamp; at login the browser copy
  is kept (and pushed to the account) if it is newer than the account copy, so a failed last push no longer rolls you back. No server change.

SMOOTH OTHER PLAYERS
  Other players' positions are buffered and shown 0.12 s late, interpolated between packets (peerSample / updatePeers, PEER_DELAY in web/index.html),
  so they move at their true speed without the old catch-up slowdown or stutter. Raise PEER_DELAY to .16 on a very jittery connection.

MULTIPLAYER PERFORMANCE
  Other players are only drawn when near you (3D: within ~1200 units, ~800 on phones, nearest 14 / 6 at most; 2D: only when on screen), and a
  new player model is built at most one per frame so a crowd arriving does not freeze the game. The server sends each websocket frame in a
  single write. Tune in render3D (PMAX / prg) in web/index.html.

EVASION + ACCURACY (v5.9)
  Two new character stats, shown in the Character stats window (the "i" button next to your power) under Move speed.
    Evasion   chance to dodge a monster or player hit completely ("DODGE" pops up, no damage, no shield/buff used). Base 5% + gear, capped at 50%
              (EVA_CAP). Attackers above your level pierce it: -0.4% dodge per level above you (EVA_LV_PEN), so it helps most against same-level fights.
    Accuracy  base 100 + gear. Your hit chance on a monster = (Accuracy - monster evasion) / 100, clamped to 20%-100% (ACC_MIN_HIT).
              Monster evasion = 4% (8% for bosses) + 1.5% per level it is above you (max +30%). A miss shows "MISS", deals no damage, but still pulls aggro.
              At equal level you hit normal monsters 96% of the time and bosses 92%; accuracy gear lifts that to 100% and offsets higher-level monsters.
  Gear: Gloves now roll accuracy (per grade 1, +0.4 per forge level) and Boots roll evasion (per grade 0.6%, +0.2% per forge level) next to their old stats;
  any Rare/Epic/Legendary piece can also roll either one as a random extra stat (STATBASE: eva 0.8% / acc 1.2 per grade). Existing items and saves are unchanged
  (old Gloves/Boots simply have no eva/acc roll until you find new ones).
  PvP: your evasion also dodges player hits (the attacker's level is used for the level-pierce). Accuracy is not used against players.
  All constants are next to defVal() in web/index.html (search "EVASION + ACCURACY"). Client-side only - no server change needed.

CRIT STATS + STAT SPREAD (v5.9)
  Three crit stats join Evasion / Accuracy in the Character stats window (all in %; each = level part + gear + forge):
    Crit chance          15% base, +0.01% per level, + gear (cap 75%).  (existing stat)
    Crit ATK DMG boost   added to the 180% crit multiplier: +0.05% per level + gear. The "Crit damage" row shows the total (180% + boost).
    Crit EVA             monsters can now crit you: chance = 12% (+8% bosses, +0.5% per level above you, max +15%) minus your Crit EVA. A monster crit
                         does x1.5. Crit EVA is +0.03% per level + gear (cap 75%). Against players it gives a chance to turn their crit into a normal hit.
    Crit DMG reduction   cuts the extra damage of crits you take (x1.5 from monsters; a player crit loses part of its bonus): +0.03% per level + gear (cap 90%).
  Level scaling now also covers Evasion (+0.02%/level) and Accuracy (+0.04/level). Crit hits you take show an orange "!" on the damage number.
  Every stat is now spread over several slots (per grade value, +per forge level):
    Earrings  crit 1 (+.4) , crit ATK DMG 2 (+.3)        Ring       ATK 8 (+5) , accuracy .8 (+.25)
    Necklace  HP 50 (+30) , crit DMG reduction 1 (+.3)    Gloves     attack speed .5 (+.5) , accuracy 1 (+.4)
    Boots     DEF 3 (+2) , move speed .1 (+.15) , evasion .6 (+.2)
    Legguards DEF 4 (+2.5) , HP 20 (+12) , evasion .5 (+.15)   Bracelet  ATK 4 (+3) , crit .5 (+.25) , crit ATK DMG 1.5 (+.25)
    Belt      HP 35 (+20) , DEF 1.5 (+1) , crit EVA .8 (+.25)  Primary weapon ATK 12 (+7) , accuracy .8 (+.25) , crit ATK DMG 1.5 (+.25)
    Secondary weapon ATK 5 (+3) , attack speed .3 (+.25) , crit EVA .6 (+.2)   Robe  DEF 5 (+6) , HP 40 (+40) , crit DMG reduction 1 (+.3)
  Rare/Epic/Legendary pieces can also roll any stat as a random extra (STATBASE). Forge levels now also add the new stats on the weapon and robe
  (see CORE_FORGED / gearStat). Old items and saves keep working; they just lack the new rolls. Tune everything next to defVal() ("EVASION + ACCURACY",
  "CRIT STATS") and in the GEAR table. Fully maxed gear can make crits very strong, so retune CDB_PER_LV and the cdb numbers if it feels too easy.

BASH + PVP STATS (v5.9)
  Four more stats in the Character stats window (%, level part + gear + forge). Bash = your basic attack (the auto-attack swing, not skills).
    Bash ATK DMG boost   +% damage on basic attacks (+0.05% per level).
    Bash DMG reduction   -% damage from monster hits (+0.03% per level, cap 75%).
    PvP ATK DMG boost    +% damage you deal to players, basic attacks and skills (+0.03% per level).
    PvP DMG reduction    -% damage you take from players (+0.03% per level, cap 75%). The server still caps one PvP hit at 10% of max HP.
  Gear (per grade, +per forge level): Ring and Gloves roll Bash ATK boost (2 / 1.5), Necklace and Robe roll Bash DMG reduction (1),
  Earrings and Secondary weapon roll PvP ATK boost (1.5), Boots and Belt roll PvP DMG reduction (0.8). Any Rare+ piece can also roll them as extras.
  Constants: "BASH + PVP STATS" next to defVal() in web/index.html. Client-side only.
  Stats window: two columns on every screen. In phone landscape it sits between the player HUD and the minimap, sized in HUD units, and was checked
  to fit without scrolling from 568x320 up to 932x430 (it still scrolls if a screen is shorter). CSS: #statsWin and html.phone #statsWin.

MONSTER + BOSS STATS (v5.9)
  Four more stats in the Character stats window (%, level part + gear + forge):
    Monster ATK DMG boost  +% damage to normal monsters (+0.04% per level).    Boss ATK DMG boost  +% damage to bosses (+0.04% per level).
    Monster DMG reduction  -% damage from normal monsters (+0.03%/level, cap 75%).   Boss DMG reduction  -% damage from bosses (+0.03%/level, cap 75%).
  They stack with Bash DMG reduction on monster hits. Gear (per grade, +per forge level): Ring 1.5 (+.25) and Primary weapon 1.2 (+.2) roll Monster ATK boost;
  Earrings 1.5 (+.25) and Bracelet 1.2 (+.2) roll Boss ATK boost; Necklace and Legguards .8 (+.25) roll Monster DMG reduction; Gloves and Belt .8 (+.25) roll
  Boss DMG reduction. Any Rare+ piece can also roll them as extras. Constants: "MONSTER + BOSS STATS" next to defVal() in web/index.html.

STAT BALANCE (v5.20)
  Power is meant to come from level ~55%, gear ~25%, forge ~20% at any stage (previously ~56/9/35). The knobs are GEAR_MULT_FLAT,
  GEAR_MULT_PCT and FORGE_MULT in web/index.html (search "STAT BALANCE"). Boss-drop gear is ~2.8x stronger per grade (flat stats) /
  1.8x (% stats); forge bonuses per level (gear, Blade, Robe) are x0.6. Existing saves are migrated automatically: stored gear
  rolls are scaled up once (save field gv=3), forge levels are kept.

GOLD + COUPONS (v5.22)
  Gold is a premium currency kept ON THE SERVER inside the account (users.json), so players cannot edit it. You sell coupon codes outside
  the game; the player types the code into the Gold Exchange (Potion Merchant window) and the server adds the gold. Each code works once.

  Make codes (run on the server computer; the game server can keep running):
    WorldOfEly.exe -coupon-new 50 -coupon-gold 100 -coupon-note "shop batch 1"     prints 50 codes worth 100 gold each
    WorldOfEly.exe -coupon-list                                                    every code, unused or used by whom and when
  Codes look like  K7QX-2MNP-VT4R-9HBD  (about 79 bits, cannot be guessed). They are stored in coupons.json next to the program:
  keep that file private and back it up together with users.json. Wrong guesses are rate-limited (8 per 15 minutes per account).

  Exchange rates (constants at the top of coupons.go): 1 gold = 5000 coins, or 100 darksteel ore. Price your coupons with that in mind.
  Gold cannot be earned in the game (no boss drops), so what you sell stays valuable.

  IMPORTANT, read before you sell: gold itself is protected, but coins and ore still live in each player's browser save (see TRUST MODEL
  above). A player who edits their own save can give themselves coins and ore without any coupon. Coupons therefore only have real
  value to players who play honestly. To make them hard currency, characters (coins, ore, gear) must move to the server too.

BAG AND WAREHOUSE
The bag holds 50 slots (BAG_CAP in web/index.html). The Warehouse (H or the box icon, in a hub) is private storage for 100 spare gear pieces (WH_CAP), saved with the character.
Older characters whose bag held more than 50 have the extra spare gear moved to the Warehouse automatically on login.

WARDROBE PER CLASS
Every class keeps its own wardrobe look (saved as "lk" in the character save, one entry per class). Since v5_53 all five classes share the same wardrobe options (see below).
The wardrobe and the bag show the avatar of the class you are currently playing. Switching class (skill book) swaps the look too.


SOUND AND MUSIC (new)
All audio is synthesised in the browser (Web Audio API) by web/audio.js - there are no sound files to ship, and it works offline.
  Music: two background tracks that crossfade. A calm exploration track plays in the hub and while nothing is attacking you; a faster,
  lighter, percussion-and-synth combat track (no bass drums) takes over when you hit or get hit, or when a monster is chasing you nearby. Combat music fades back to calm about 5 seconds
  after the fight ends. The safe hub never plays combat music.
  Sound effects: basic-attack swing, hit, critical hit, miss, a different cast sound per skill family (projectile, blade, heavy smash, dash, magic,
  heal, buff, area blast), monster kill, boss kill, damage taken, dodge, shield block, your own defeat, level-up and potions.
  (Only SKILL sounds play now. Swing, hit, crit, miss, damage taken, block, dodge, kills, death, level-up and potion sounds are disabled - they are
  empty no-ops in the SFX table in web/audio.js. Skill sounds run about 1-2 seconds each.)
  Combat sound design: no drum/thump sounds. Effects are built from noise and gliding tones - explosions (cracking transient, falling-filter blast,
  low rumble, scattered debris), lightning (sharp crack, pitch-diving zap, random crackle, buzz, rolling thunder), and magic casts made of
  pitch-sliding "woo" and "wee" sweeps with vibrato plus airy whooshes and sparkle. Blades and shields get crisp clicks and metal ring.
  Skill families: proj, slash, smash, dash, magic, heal, buff, aoe, lightning (Storm Chain, Ghost Chains, Storm Arrow, Thunder trap) and
  explosion (Falling Star, Explosive Arrow, Spirit Bomb); change which skill uses which in SKFAM in web/index.html.
  All sounds are original synthesis - no samples. Tuning: the SFX table in web/audio.js (helpers click / boom / bolt / glide / whoosh / ring /
  bell / sparkle at the top of that section; bus saturation and reverb are in init()).
  Volume: gear icon (top right) -> "Music" and "Sound FX" sliders. They are independent, take effect immediately, and are remembered in the browser
  (localStorage keys al_vol_music and al_vol_sfx). Releasing the Sound FX slider plays a test sound. Slide to 0 to mute.
  Browsers only allow sound after a click or key press, so audio starts on the first interaction (the Begin button counts). Audio is paused while the
  tab is hidden, so background auto-hunting stays silent.
  Tuning: track tempo/chords/instruments are at the bottom of web/audio.js (calmStep and combatStep); the combat rules (distance, 5s linger) are in
  combatNow() in web/index.html; the skill-to-sound mapping is SKFAM next to it.

UI TWEAKS (v5_49)
  World Gate and Lotus Forge windows: buttons are now small and compact (desktop and phone mode); phone mode no longer zooms these windows 1.3x.
  Forging now shows a big SUCCESS (gold) or FAILED (red) popup in the middle of the forge window for about 1.7 seconds. It does not block clicks, so
  you can keep forging. CSS is next to .btn in web/index.html (search "World Gate + Lotus Forge" and "forge result popup"); logic is forgePop().
  Close button (v5_50): in the World Gate and Forge windows the Close button is pinned at the bottom and always visible - only the list scrolls.
  Tapping the dark area outside either window also closes it.

WARDROBE REDESIGN (v5_51)
  The wardrobe window now uses the same style as the Bag window: a blue panel with the avatar preview on the left and the choices on the right.
  There is one tab per class (Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner) at the top of the right side; a green dot marks the
  class you are currently playing. Pick any class tab to see and edit that class's own look (gender, skin, armor / hair / outfit, accent, aura) without
  switching class - the preview shows that class's avatar. Randomize and Default look apply to the selected class tab. Looks are saved per class as before.
  3D preview (v5_52): the wardrobe stage now shows the same rotatable 3D character as the Bag window - drag left/right to spin it, double-click to face
  front. Switching class tabs re-dresses it as that class. If 3D mode is off (the 3D / 2D toggle) or WebGL is unavailable it falls back to the flat avatar.

SAME WARDROBE FOR EVERY CLASS (v5_53)
  Every class tab (Cultivator, Night Blade, Iron Guardian, Storm Archer, Spirit Summoner) now offers exactly the same eight wardrobe tabs with the same options:
  Gender (2), Skin (36), Hair (8), Outfit (7), Headwear (13), Armor (28), Accent (8), Aura (8, incl. none). Nothing that existed before was removed.
  - Armor is every class's colour schemes pooled together: the 7 Night Blade, 7 Iron Guardian, 7 Storm Archer and 7 Spirit Summoner schemes, so any class can wear any of them,
    plus "Class default" (a class's own first scheme; for the Cultivator, the colours of the chosen Skin). AL3D.ARMOR_POOL / AL3D.ARMORS in web/models3d.js.
  - Accent (trim and glow colour) now works for the Cultivator too ("Class default" = the Skin's own trim colour).
  - Hair, Outfit and Headwear now work for the four classes too. They are drawn together with the class gear (hoods, helms, caps stay on and cover most hair; headwear sits on top).
    A class's default hair is "Shaven", which keeps the original class silhouette, so existing class looks do not change. Pick any hair to add it.
  - Look integer ("sk"): bits 0-5 skin, 6-9 hair, 10-12 outfit, 13-16 headwear, 17-19 aura, 20 gender, 21-23 class (added at run time), 24-28 armor, 29-31 accent.
    It is now an UNSIGNED 32-bit value (packLook returns >>>0), and the server accepts sk up to 2^32-1 (game.go applyInfo).
  - Old saves are converted on load (save field "lkv" = 2 marks the new layout): a class's old Armor scheme and Accent colour are moved to the new Armor / Accent fields, so
    Night Blade, Iron Guardian, Storm Archer and Spirit Summoner characters look exactly as before.
  - Players still on an older cached page may see a different look for you until they refresh (Ctrl+F5). REBUILD the server (build.bat) so the new web files and the larger sk limit are embedded.

SOUND FIX FOR PHONES (v5_58)
  - Cause: phones put the audio engine to sleep after a call, app switch, screen lock or headphone change (iOS calls this 'interrupted'). The game only woke it when the page became visible, and removed its touch listeners after the first unlock, so effects stayed silent until a reload.
  - Now: the audio engine is woken on every touch, when returning to the page, and while playing (retry about every 1.5 s); effects that arrive while it sleeps wake it instead of being dropped silently.
  - iOS: audio session set to 'playback' (and a silent looping audio element on older iOS) so the ring/silent switch does not mute effects. Music fades back in after an interruption.
  - If a phone still has no sound: check the silent switch / media volume, and tap the screen once after returning to the game.

LOADING SCREEN, SERVICE WORKER AND CACHING (v5_57)
  - Loading screen (top of web/index.html): covers the page with a progress bar until the game files, fonts and the 3D engine are ready. If something fails it offers Retry / Continue anyway.
  - Service worker (web/sw.js): stores the game files, three.js and the fonts on the device; repeat visits start from the device cache and work offline. /api and /ws are never cached.
    It refreshes itself on every rebuild (the server writes a hash of all web files into sw.js). NOTE: browsers only allow service workers on https or localhost, NOT on plain http://192.168.x.x LAN addresses.
    On a LAN, the HTTP caching below still applies; for the full effect put the game behind https (e.g. a tunnel or reverse proxy).
  - Server (static.go): every web file has an ETag and Cache-Control: no-cache (browser keeps a copy and re-checks with a tiny 304 reply), and text files are gzip-compressed once at start-up (about 4x smaller index.html).
  - OPTIONAL: put a copy of three.min.js (r128) into web/ so the game also works without internet; the page already falls back to it, and the service worker caches it.
  - REBUILD (build.bat) and hard-refresh (Ctrl+F5) once; after that updates are picked up automatically.

FORGE GLOW UPDATE (v5_55)
  - Weapon glow is now a soft-fading, transparent halo (normal blending, tier colour, no white mix, no bright core). The weapon blade/head stays clearly visible inside it.
  - The outfit glow shell is replaced by a RING GLOW around the character: a soft transparent ring on the ground plus a thin ring of light that rises up the body and fades out.
    Colour and size still step every 10 forge levels; pulse speed/strength still scale with tier.
  - The level (realm) ring around the character is soft-faded too: transparent, fading smoothly on both its inner and outer edge (3D: softMat 'aura', 2D: gradient in drawPlayerE). Size still grows every 10 levels.
  - Tune: softMat() (shader profiles), setGear() ring size (rad / bd), animPlayer() opacities. 2D: fgBody() (ground ring), fgLine()/fgOrb() (soft weapon halo).

FORGE GLOW (v5_54)
  Starting at forge level +10, your primary weapon AND your outfit glow. The glow changes colour and grows every 10 levels (tier = level / 10, max tier 10 at +100):
    +10 ice white  +20 aqua  +30 jade  +40 lime  +50 gold  +60 orange  +70 red  +80 magenta  +90 violet  +100 white-gold
  - Primary weapon glow follows the weapon's forge level (P.wlv): an inner and an outer glow that get wider every tier and pulse faster. It works for every class's weapon:
    Cultivator blade, Night Blade daggers, Iron Guardian hammer head, Storm Archer bow, Spirit Summoner lantern staff. The blade steel and the class weapon accents take the tier colour too.
  - Outfit glow follows the outfit's forge level (P.alv): a coloured glow shell around the body (bigger every tier), plus glowing trim and sash.
  - The weapon and outfit glows are independent (a +100 weapon with a +10 outfit shows a violet-white weapon glow and an ice-white body glow).
  - Other players see your glow (forge levels were already synced). Works in 3D and 2D, and in the Wardrobe / Bag previews.
  - Tune it: FORGE_GLOW (colours) and forgeTier() near the top of the player section of web/models3d.js; sizes are in setGear() (weapon: w = 1+(tier-1)*.16, outfit: 1+(tier-1)*.03)
    and the pulse in animPlayer(). 2D versions: fgBody() / fgWeapon() above drawPlayerE() in web/index.html.
  - REBUILD (build.bat) and hard-refresh (Ctrl+F5).



v5_143  Qi regen on Ring and Necklace
    New special stat "Qi regen" (% of max Qi per second), only on Ring and Necklace. It is added to the base regen (3 + 0.1 per level per second).
    Per piece: grade x 0.05% x rarity roll (Common .6-.9, Rare .9-1.2, Epic 1.2-1.6, Legendary 1.6-2.2) + 0.01% per forge level.
    Examples: Common grade 1 +0 = 0.04%/s, Legendary grade 12 +0 = 1.14%/s, forge +100 adds 1.0%/s. Total from gear is capped at QRG_CAP (6%/s).
    Tune in web/index.html: GEAR (ring / neck, qrg:[per grade, per forge level]), SPECIAL, QRG_CAP, qrgVal().
    Old rings / necklaces get the mid roll of their rarity for their grade when the save loads (addQrg). Shown in the bag, forge, inspect and the stats panel ("Qi regen (gear)").

v5_143  Admin commands for forge level
    /forge                    show the forge level of every slot
    /forge [slot|all] 0-100   set the forge level (one slot, or all; "/forge 50" = all slots)
    /forgereset [slot|all]    set the forge level back to +0 (no argument = all slots)
    Slots: wpn wpn2 robe ear neck ring brace glove belt legs boot (also: weapon, blade, necklace, boots, gloves ...). The level belongs to the slot,
    so it works with or without an item worn; wpn / robe set the Blade / Robe level. Admin only, like the other commands (the server forwards them to the client).


v5_143  Buff tooltip + exponential forge
    Buff icons (top-left, under the HP bar): hover with the mouse (or tap on a phone) to see the buff name, its description with the live numbers and the seconds left,
    in a see-through panel. Buffs: ATK Boost, Veil, Damage Reduction, Eagle Eye, Spirits, Shield. Code: bfTip* functions and #bftip in web/index.html.
    Forge bonus is now exponential from +10: up to +10 every level counts as 1 step of bonus (as before); above that each level counts FORGE_EXP (1.04) times more than the
    level before it. forgeEff(lv) in web/index.html gives the number of steps and is used for gear, the Blade / Robe, the forge window, the bag and player inspect.
    Steps:  +10 = 10 | +20 = 22.5 | +30 = 41 | +50 = 109 | +70 = 258 | +100 = 871 (linear before: 10 / 20 / 30 / 50 / 70 / 100).
    Tune FORGE_EXP_FROM and FORGE_EXP next to CORE_FORGED (FORGE_EXP 1 = old linear). Note: gear Qi regen is also forge-scaled and is capped by QRG_CAP (6%/s).


v5_143  Max Qi reduced by 25%
    QI_MUL 2 -> 1.5 in web/index.html: max Qi is now (60 + 4 x level) x class bonus x 1.5 (25% less than the doubled pool of v5_123). Qi regeneration, skill costs and potion percentages
    are unchanged, so Qi regen is relatively a third stronger and gear Qi regen (% of max Qi) gives 25% fewer Qi per second than before. Set QI_MUL to 2 to undo, 1 for half.


v5_143  Forge window shows the real gain
    The forge window now shows "Forge gain: +X ATK ..." (green) for the next level instead of the growth percentage. From +10 it adds "Every level above +10 gives more than the last."
    Example Blade: +9 -> +10 = +1.26 ATK, +11 -> +12 = +1.36, +20 -> +21 = +1.94, +50 -> +51 = +6.29, +99 -> +100 = +42.99. Code: forgeGain() in web/index.html.


v5_148  Percent forge (forge 0 vs +100 no longer huge)
    The forge bonus of ATK / DEF / HP is no longer a flat amount (that gave x200 power at level 1 and x1.7 at level 1000). It is now a PERCENTAGE of your level + gear stats,
    so it is the same at any character level, and it follows a curve: bonus = 40% x (forge / 100) ^ 2 for a full set (every slot at that forge level).
    Each slot, and the Blade / Robe, gets its share of the 40% (its old per-level weight). Starting Blade only (+100) = about +16% ATK, Robe only = about +20% DEF / +16% HP.
    Full set: +10 = +0.4% | +30 = +3.6% | +50 = +10% | +70 = +19.6% | +90 = +32.4% | +100 = +40% (ATK, DEF and HP). Total power, forge 0 -> +100 with a full set: about x1.4 at every level.
    % stats (crit, attack speed, damage boosts, Qi regen ...) use the same curve: FORGE_PCT_REF = 140 steps at +100 (was 871). Full +100 set: about +7% crit chance, +8.4% attack speed, +5.6% crit ATK DMG, +2.8% Qi regen.
    The forge window, bag, item text and player inspect show the % ("+X% ATK (forge)", "Forge gain: +X% ATK"). Forge levels in saves are unchanged. Other players' Power uses the same formula.
    Tune in web/index.html next to forgeFrac(): FORGE_MAX_PCT (.40), FORGE_CURVE (2; 1 = linear, higher = more back-loaded), FORGE_PCT_REF (140). FORGE_EXP is gone.


v5_149  Spirit Summoner skill cooldowns x0.5
    Every Spirit Summoner skill (attacks, Soul Mend, Soul Harvest, summons) now has half its final cooldown (after the +6 s and the 2x on healing skills): SUMMONER_CD_MUL = 0.5 in web/index.html, right after SKILL_CD_ADD.
    Average cooldown: Summoner 16.3 s -> 8.2 s (Night Blade 12.0, Storm Archer 13.1, Cultivator 14.6, Iron Guardian 15.6). Fastest skill 5 s (Soul Burst), Soul Mend 13 s, Wolves 9 s, Phantom Guardian 10 s, Spirit Bomb 7 s.
    Other classes, Qi costs, and the spirits' / wolves' own attack speed are unchanged. 1 = same as the other classes.


v5_150  Spirit Summoner max Qi +25%
    The Summoner's max Qi class bonus is 1.3 -> 1.625 (x1.25 on top of the old +30%, so +62.5% over the base pool): CLB[4].qi in web/index.html. The class description now says "+62.5% max Qi".
    Max Qi = (60 + 4 x level) x 1.625 x QI_MUL (1.5). Example: level 1 = 156 Qi (was 125), level 1000 = 9,896 Qi (was 7,917). Regen, skill costs and potions are percent based / unchanged. Other classes unchanged.


v5_151  Msg button removed from the top bar
    The envelope "Msg" button (top-right icon row) is gone. Private chat still opens with the I key and the /w name message command; the unread badge that sat on that button is no longer shown.


v5_152  Moving is never blocked by casting
    A move input (WASD / arrows / joystick, or tapping / clicking the ground) cancels the cast pose at once, and a skill cast while you are moving does not root you at all (no cast pose, no stop).
    Before, every cast rooted you for 0.6 s (1.0 s for long skills) and auto-cast chained the roots (0.45 s between casts), so you could hardly walk with auto skills on. Damage, Qi cost and cooldown of the skill are unchanged
    (they happen when you cast). Auto skills keep firing while you run, so ranged classes can kite. Standing still still plays the cast pose and roots you as before. Code: wantsMove() and the P.cast lines in web/index.html.


v5_153  Auto skills pause while you move; casting roots you again
    Replaces the "no root while moving" part of v5_152. Auto-cast skills do NOT fire while you steer (WASD / arrows / joystick): stop moving and they cast again. Casting a skill roots you again (0.6 s, 1.0 s for long skills, as before),
    but a move input still cancels the cast pose at once, so you are never stuck: you walk away whenever you want, and auto skills stay paused until you stop. Tap / click-to-move also cancels the cast.
    Code: wantsMove() in web/index.html (auto-cast loop checks it; useSkill roots again).


v5_154  Cast pose is not cancelled by moving
    A move input no longer ends the cast pose: the pose plays to the end (0.6 s, 1.0 s for long skills), then you walk (hold the key / joystick and you start moving as soon as it ends). Tap / click-to-move also waits.
    Still true from v5_153: auto skills do not cast while you steer with keys / joystick, and casting roots you. Dodge still cancels a cast. Removed: the P.cast=0 on move input (v5_152).


v5_155  Shorter cast pose
    Casting roots you for 0.3 s (was 0.6 s), and 0.5 s for the long skills (was 1.0 s): CAST_T and CAST_T_LONG in web/index.html. Everything else from v5_154 is unchanged.


v5_156  Skill slots R and T are priority skills
    The skills in slot 13 (R) and slot 14 (T) can be cast at any moment when you press the key, click or tap the button: they ignore the short global lock (0.45 s after any cast, also after a dodge) and interrupt a cast pose in progress.
    Cooldown and Qi cost still apply (and the hub rules). Slots R and T never auto-cast (as before), and a priority cast still starts the normal cast pose and global lock, so auto skills wait a moment after it. Code: 'prio' in useSkill() in web/index.html.


v5_157  Bigger monster and boss leash
    A chasing monster gives up and walks home when you are further than LOSE from it, or when it is further than LEASH from its spawn point.
    Normal monsters: lose 650 -> 1000, leash 520 -> 800.  Bosses: lose 2400 -> 3600, leash 3000 -> 4500.
    The multiplayer SERVER (game.go) used 650 / 520 for every monster including bosses, so online bosses reset much sooner than the solo client; the server now has separate boss values (monLose, monLeash, bossLose, bossLeash).
    Keep them equal to MON_LOSE / MON_LEASH / BOSS_LOSE / BOSS_LEASH in web/index.html. Aggro radius (190, boss 300) is unchanged. REBUILD (build.bat) for the server change and hard-refresh (Ctrl+F5).
