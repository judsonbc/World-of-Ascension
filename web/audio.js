/* World of Ascension - audio engine (no sound files needed: everything is synthesised with the Web Audio API).
   - Two background tracks that crossfade: CALM (exploring / hub) and COMBAT (fighting).
   - Combat sound effects: swings, hits, crits, misses, skill casts, kills, boss kills, damage taken, dodge, block, death, level-up, potions.
   - Two independent volume controls (music, sound effects), saved in localStorage.
   Public API (window.SND):
     SND.unlock()                  call from a user gesture (done automatically on the first click / key / touch)
     SND.tick(dt, active, combat)  call every game frame: active = game running, combat = player is fighting
     SND.play(name, arg)           one-shot effect, e.g. SND.play('hit'), SND.play('cast_proj')
     SND.music(v) / SND.sfx(v)     set volume 0..1 (no argument = read it)
*/
(function SNDMOD(root) {
  'use strict';
  var KEY_M = 'al_vol_music', KEY_S = 'al_vol_sfx';
  function lsGet(k, d) { try { var v = localStorage.getItem(k); if (v === null) return d; var n = parseFloat(v); return isFinite(n) ? Math.min(1, Math.max(0, n)) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  var OC = root.OfflineAudioContext || root.webkitOfflineAudioContext, PSR = 32000, REF = 0.392; /* REF = effects bus gain at the default 70% volume (taper(0.7)*0.8) */
  var preReady = !OC, progDone = 0, progTotal = 0, fromCache = 0, srcHash = null, rbCtx = null, bgJobs = [], rjAct = 0, rjGen = 0, W = { calm: 4, combat: 6 };
  var MAXC = Math.max(2, Math.min(3, ((root.navigator && navigator.hardwareConcurrency) || 4) - 1)); /* how many sounds are rendered at the same time */
  var pre = !!OC, pbuf = {}, bufSfx = {}, sfxOut = null, hushed = false, offline = false, saved = null, jobs = [], jobBusy = false, preStarted = false, nActive = 0, satC = null;
  var ctx = null, master = null, musicBus = null, sfxBus = null, rev = null, fxIn = null, noiseBuf = null, timer = null;
  var vMusic = lsGet(KEY_M, 0.5), vSfx = lsGet(KEY_S, 0.7);
  var active = false, combat = false, wasActive = false, wasCombat = false, unlocked = false;
  var voices = 0, VMAX = 360;
  var MUSIC_GAIN = 0.55, SFX_GAIN = 0.8;
  var tracks = {};
  var rv = function () { return 1 + (Math.random() - 0.5) * 0.3; };
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var taper = function (v) { return v * v; }; /* volume feels linear to the ear when squared */

  /* ---------- setup ---------- */
  function init() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; return false; } }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.008; comp.release.value = 0.18; /* slower attack lets the crisp transients through */
    master = ctx.createGain(); master.gain.value = 1;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(master);
    /* effects bus: soft saturation for punch, then master. A short room reverb feeds back into the bus. */
    var sat = ctx.createWaveShaper(); sat.curve = satCurve(); try { sat.oversample = '2x'; } catch (e) {}
    sfxBus.connect(sat); sat.connect(master);
    var irLen = Math.floor(ctx.sampleRate * 0.55), ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var id = ir.getChannelData(c), lp1 = 0;
      for (var j = 0; j < irLen; j++) { lp1 += (Math.random() * 2 - 1 - lp1) * 0.45; id[j] = lp1 * Math.pow(1 - j / irLen, 3.2); }
    }
    var cv = ctx.createConvolver(); cv.buffer = ir;
    rev = ctx.createGain(); rev.gain.value = 1;
    var revOut = ctx.createGain(); revOut.gain.value = 0.7;
    rev.connect(cv); cv.connect(revOut); revOut.connect(sfxBus);
    var n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    /* soft echo used by the calm track for space */
    fxIn = ctx.createGain();
    var dl = ctx.createDelay(1); dl.delayTime.value = 0.43;
    var fb = ctx.createGain(); fb.gain.value = 0.36;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    fxIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(musicBus);
    makeTrack('calm', 60 / 66 / 4, calmStep);
    makeTrack('combat', 60 / 128 / 4, combatStep);
    sfxOut = ctx.createGain(); sfxOut.connect(master); /* pre-rendered effects play through here (already saturated + reverbed) */
    attachBuf('calm'); attachBuf('combat');
    applyVol(true);
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} /* iOS 16.4+: play even with the ring/silent switch on, and take audio focus */
    ctx.onstatechange = function () {
      if (!ctx) return;
      if (ctx.state === 'running') { if (!unlocked) unlock(); else applyTracks(); } /* back from an interruption: re-fade the music in */
    };
    return true;
  }
  function makeTrack(name, dur, fn) {
    var out = ctx.createGain(); out.gain.value = 0; out.connect(musicBus);
    var send = ctx.createGain(); send.gain.value = 1; send.connect(fxIn);
    tracks[name] = { name: name, level: name === 'calm' ? 1.6 : 2.6, out: out, send: send, dur: dur, play: fn, on: false, stopAt: 0, next: 0, step: 0, mi: 3 };
  }
  function applyVol(now) {
    if (!ctx) return;
    var t = ctx.currentTime, tc = now ? 0.001 : 0.04;
    musicBus.gain.setTargetAtTime(taper(vMusic) * MUSIC_GAIN, t, tc);
    sfxBus.gain.setTargetAtTime(taper(vSfx) * SFX_GAIN, t, tc);
    if (sfxOut) sfxOut.gain.setTargetAtTime(taper(vSfx) * SFX_GAIN / REF, t, tc);
  }

  /* ---------- low-level voices ---------- */
  function env(t, peak, a, d, hold) {
    var g = ctx.createGain(), p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (hold) p.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + d);
    return g;
  }
  /* oscillator note: dest, start, wave, freq from -> to, attack, decay, peak, {hold, det, lp, lp1, q, send, wet} */
  function tone(dest, t, type, f0, f1, a, d, peak, o) {
    if (voices > VMAX && !offline) return;
    o = o || {};
    var osc = ctx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    var total = a + (o.hold || 0) + d;
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + total);
    if (o.det) osc.detune.value = o.det;
    if (o.vib && o.vib[1] > 0) { /* vibrato: [rate Hz, depth Hz] */
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + total + 0.06);
    }
    var g = env(t, peak, a, d, o.hold), node = osc;
    if (o.lp) {
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 0.7;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp1) f.frequency.exponentialRampToValueAtTime(o.lp1, t + total);
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(dest);
    if (o.send && o.wet) { var w = ctx.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(o.send); }
    osc.start(t); osc.stop(t + total + 0.06);
    if (!offline) { voices++; osc.onended = function () { voices--; }; }
  }
  /* filtered noise: dest, start, decay, peak, filter type, freq from -> to, Q, attack, reverb send amount */
  function noise(dest, t, d, peak, ftype, f0, f1, q, a, wet) {
    if (voices > VMAX && !offline) return;
    a = a || 0.004;
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = ftype; f.Q.value = q || 0.7;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    var g = env(t, peak, a, d);
    src.connect(f); f.connect(g); g.connect(dest);
    if (wet && rev) { var w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev); }
    src.start(t, Math.random() * 1.5); src.stop(t + a + d + 0.06);
    if (!offline) { voices++; src.onended = function () { voices--; }; }
  }

  /* ---------- sound effects ----------
     Built from noise and gliding tones, not drums (no pitched thumps):
       click   - 10-20 ms bright noise transient (crisp attack)
       boom    - explosion: cracking transient + wide noise blast whose filter falls + low noise rumble + scattered debris
       bolt    - lightning: sharp crack + pitch-diving zap + random crackle + electric buzz + rolling thunder
       glide   - "woo" / "wee": a pitch-sliding tone pair with vibrato (magic charge, whistle, shimmer)
       whoosh  - band-passed noise sweep (air, blades, movement)
       ring    - inharmonic metal partials (steel, shields); bell - glassy harmonic chime (heal, level-up)
     All go through a soft saturator (punch) and a short room reverb (space). */
  var S = function () { return sfxBus; };
  function click(t, peak, f, d) { f = f || 4500; noise(S(), t, d || 0.016, peak, 'highpass', f, f * 1.6, 0.7, 0.0005); }
  function whoosh(t, dur, peak, f0, f1, q, wet) { noise(S(), t, dur * 0.6, peak, 'bandpass', f0, f1, q || 1.1, dur * 0.4, wet || 0); }
  function crunch(t, n, peak, f, spread) {
    for (var i = 0; i < n; i++) noise(S(), t + Math.random() * (spread || 0.05), 0.03 + Math.random() * 0.04, peak * (0.5 + Math.random() * 0.5), 'bandpass', f * (0.6 + Math.random() * 1.0), f * 0.4, 1.5, 0.0008);
  }
  /* two slightly detuned voices sliding f0 -> f1, with vibrato (rate Hz, depth Hz). Gives the "woooo" / "weeee" */
  function glide(t, f0, f1, dur, peak, o) {
    o = o || {};
    var vib = o.vib === undefined ? [6, f0 * 0.012] : o.vib;
    var a = o.a === undefined ? dur * 0.3 : o.a, d = Math.max(0.03, dur - a);
    tone(S(), t, o.type || 'triangle', f0, f1, a, d, peak, { det: -7, vib: vib, lp: o.lp, send: rev, wet: o.wet === undefined ? 0.3 : o.wet });
    tone(S(), t, 'sine', f0 * 1.003, f1 * 1.003, a, d, peak * 0.7, { det: 7, vib: vib });
  }
  var RING = [[1, 1], [2.76, 0.55], [5.4, 0.28]];
  function ring(t, f, peak, d, wet) {
    RING.forEach(function (p, i) { if (f * p[0] < 14000) tone(S(), t, 'sine', f * p[0], f * p[0] * 0.995, 0.0008, d / (1 + i * 0.8), peak * p[1], { send: rev, wet: wet || 0 }); });
  }
  function bell(t, f, peak, d, wet) {
    tone(S(), t, 'sine', f, f, 0.003, d, peak, { send: rev, wet: wet || 0.4 });
    tone(S(), t, 'sine', f * 2.01, f * 2.01, 0.002, d * 0.55, peak * 0.35);
    tone(S(), t, 'sine', f * 3.99, f * 3.99, 0.001, d * 0.25, peak * 0.15);
  }
  function sparkle(t, dur, peak) { /* airy glitter on top */
    noise(S(), t, dur, peak, 'highpass', 6500, 10500, 0.6, dur * 0.25, 0.4);
    for (var i = 0; i < 4; i++) tone(S(), t + Math.random() * dur * 0.7, 'sine', 3500 + Math.random() * 3500, 0, 0.002, 0.07, peak * 0.9, { send: rev, wet: 0.5 });
  }
  /* explosion. size ~0.3 (pop) .. 1 (big) .. 1.6 (boss) */
  function boom(t, size) {
    size = size || 1;
    click(t, 0.34, 2500, 0.05);
    noise(S(), t, 0.14, 0.3, 'bandpass', 3200, 900, 0.8, 0.0008);                                   /* crack */
    noise(S(), t, 0.45 * size + 0.1, 0.5, 'lowpass', 6500, 160, 0.9, 0.003, 0.3);                  /* blast: filter falls */
    noise(S(), t + 0.015, 1.0 * size + 0.2, 0.34, 'lowpass', 320, 55, 0.7, 0.02 * size + 0.01, 0.45); /* rumble */
    crunch(t + 0.05, Math.round(4 + 6 * size), 0.17, 1700, 0.35 * size + 0.1);                     /* debris */
    if (size >= 0.7) tone(S(), t, 'sine', 62, 30, 0.012, 0.6 * size, 0.2);                         /* felt, not heard as a drum */
  }
  /* lightning bolt. big = longer crackle + louder thunder */
  function bolt(t, big) {
    var k = big === true ? 1.4 : (big || 1);
    click(t, 0.4, 3000, 0.08);
    noise(S(), t, 0.16, 0.34, 'bandpass', 5500, 2500, 0.8, 0.0008, 0.25);                          /* the crack */
    tone(S(), t, 'sawtooth', 6500, 160, 0.001, 0.15, 0.1, { lp: 6000, lp1: 700 });                  /* kzzzt dive */
    tone(S(), t + 0.012, 'square', 3800, 240, 0.001, 0.12, 0.05, { lp: 5000, lp1: 900 });
    var n = Math.round(9 * k);
    for (var i = 0; i < n; i++) {                                                                    /* random crackle */
      var dt = 0.02 + Math.random() * 0.32 * k;
      click(t + dt, 0.2 * (1 - dt / (0.4 * k)) + 0.04, 2500 + Math.random() * 6000, 0.006 + Math.random() * 0.012);
    }
    tone(S(), t, 'sawtooth', 118, 105, 0.005, 0.3 * k, 0.045, { lp: 2600, vib: [45, 14] });         /* electric buzz */
    noise(S(), t + 0.07, 0.9 * k, 0.3, 'lowpass', 750, 85, 0.8, 0.05, 0.55);                       /* thunder */
  }
  var NOP = function () {};
  var SFX = {
    /* silenced on request: only skill-cast sounds remain (kept as no-ops so the game code that calls them needs no change) */
    swing: NOP, hit: NOP, crit: NOP, miss: NOP, kill: NOP, boss: NOP, hurt: NOP, block: NOP, dodge: NOP, die: NOP, levelup: NOP, potion: NOP,

    /* ---- skill casts, by family. Each runs about 1-2 seconds. ---- */
    cast_proj: function (t) {
      var r = rv();
      click(t, 0.16, 4500, 0.012);
      tone(S(), t, 'triangle', 340, 160, 0.001, 0.09, 0.07, { lp: 1600 });                           /* bow twang */
      whoosh(t, 0.55, 0.26, 1200 * r, 5600 * r, 1.2, 0.2);
      glide(t + 0.01, 3600 * r, 700, 0.55, 0.08, { a: 0.01, vib: [0, 0], wet: 0.4 });               /* weeeeew */
      glide(t + 0.18, 2400 * r, 500, 0.7, 0.04, { a: 0.02, vib: [11, 30], wet: 0.5 });              /* trailing whistle */
      sparkle(t + 0.15, 0.7, 0.05);
    },
    cast_slash: function (t) {
      var r = rv();
      whoosh(t, 0.34, 0.38, 500 * r, 4800 * r, 1.2, 0.2);
      whoosh(t + 0.15, 0.3, 0.26, 4200 * r, 600 * r, 1.2, 0.2);                                       /* return stroke */
      glide(t, 2800 * r, 900, 0.35, 0.05, { a: 0.01, vib: [0, 0] });
      click(t + 0.12, 0.26, 5000, 0.016);
      ring(t + 0.12, 2400 * r, 0.08, 1.0, 0.5);
      ring(t + 0.27, 3100 * r, 0.05, 0.7, 0.5);
      sparkle(t + 0.2, 0.7, 0.05);
    },
    cast_smash: function (t) {
      whoosh(t, 0.16, 0.16, 2500, 400, 1.0, 0.15);
      boom(t + 0.03, 1.0);
      glide(t + 0.03, 520, 70, 0.7, 0.1, { a: 0.02, type: 'sawtooth', lp: 900, vib: [4, 8], wet: 0.5 });
      crunch(t + 0.3, 8, 0.1, 1500, 0.7);
    },
    cast_dash: function (t) {
      whoosh(t, 0.5, 0.36, 300, 5400, 1.0, 0.2);
      glide(t, 350, 2600, 0.5, 0.07, { a: 0.3, vib: [9, 25], wet: 0.4 });
      glide(t + 0.4, 2600, 600, 0.55, 0.05, { a: 0.02, vib: [8, 30], wet: 0.5 });                    /* fading trail */
      noise(S(), t + 0.38, 0.3, 0.14, 'lowpass', 1800, 250, 0.8, 0.004, 0.3);
      crunch(t + 0.38, 3, 0.08, 1500, 0.06);
      sparkle(t + 0.35, 0.8, 0.05);
    },
    cast_magic: function (t) {
      var r = rv();
      glide(t, 220 * r, 1700 * r, 0.95, 0.17, { a: 0.5, vib: [6.5, 26], wet: 0.55 });                /* wooooo */
      glide(t + 0.5, 1500 * r, 4800 * r, 0.55, 0.075, { a: 0.25, vib: [9, 40], wet: 0.6 });          /* weeee */
      glide(t + 1.0, 4200 * r, 1300, 0.7, 0.04, { a: 0.02, vib: [7, 30], wet: 0.7 });                /* shimmering fade */
      noise(S(), t, 0.9, 0.09, 'highpass', 4500, 9000, 0.7, 0.3, 0.4);
      for (var i = 0; i < 7; i++) click(t + 0.5 + Math.random() * 0.6, 0.12, 6000 + Math.random() * 2500, 0.01);
      ring(t + 0.55, 1900 * r, 0.05, 1.3, 0.6);
    },
    cast_heal: function (t) {
      glide(t, 520, 1560, 1.1, 0.1, { a: 0.6, vib: [5, 14], wet: 0.65 });
      glide(t + 0.08, 780, 2340, 1.1, 0.06, { a: 0.6, vib: [5.5, 20], wet: 0.65 });
      [880, 1046.5, 1318.5, 1568, 1760, 2093].forEach(function (f, i) { bell(t + 0.25 + i * 0.12, f, 0.12, 1.3, 0.6); });
      sparkle(t + 0.1, 1.3, 0.05);
    },
    cast_buff: function (t) {
      tone(S(), t, 'sawtooth', 130, 650, 0.6, 0.3, 0.09, { lp: 300, lp1: 3200, send: rev, wet: 0.25 }); /* swelling power-up */
      glide(t, 200, 1300, 0.9, 0.11, { a: 0.6, vib: [7, 22], wet: 0.5 });
      whoosh(t, 0.9, 0.16, 300, 4800, 0.9, 0.3);
      ring(t + 0.7, 1500, 0.08, 1.3, 0.6);
      glide(t + 0.8, 2800, 1200, 0.6, 0.04, { a: 0.02, vib: [6, 25], wet: 0.7 });
      sparkle(t + 0.6, 0.9, 0.05);
    },
    cast_aoe: function (t) {
      glide(t, 800, 100, 1.1, 0.15, { a: 0.02, vib: [5, 10], wet: 0.55 });                            /* falling woooom */
      whoosh(t, 0.9, 0.24, 3600, 250, 0.9, 0.4);
      boom(t + 0.03, 1.0);
      glide(t + 0.35, 1200, 3600, 0.7, 0.05, { a: 0.3, vib: [8, 35], wet: 0.7 });                    /* rising aftershock shimmer */
      sparkle(t + 0.2, 1.0, 0.05);
    },
    cast_lightning: function (t) {
      glide(t, 900, 3800, 0.12, 0.06, { a: 0.005, vib: [0, 0] });                                    /* charge */
      bolt(t + 0.05, 2);                                                                              /* main strike, long thunder */
      bolt(t + 0.4, 0.8);                                                                             /* chained second arc */
      glide(t + 0.5, 3000, 700, 0.8, 0.03, { a: 0.02, vib: [9, 30], wet: 0.7 });
    },
    cast_explosion: function (t) {
      glide(t, 1400, 260, 0.25, 0.06, { a: 0.01, vib: [0, 0] });
      boom(t + 0.05, 1.7);                                                                            /* big, long rumble */
      boom(t + 0.28, 0.5);                                                                            /* secondary blast */
      crunch(t + 0.4, 10, 0.1, 1400, 1.0);
      glide(t + 0.1, 500, 60, 1.4, 0.08, { a: 0.03, type: 'sawtooth', lp: 800, vib: [4, 7], wet: 0.5 });
    }
  };
  var GAP = { swing: 0.09, hit: 0.05, crit: 0.06, miss: 0.1, kill: 0.07, boss: 0.5, hurt: 0.08, block: 0.1, dodge: 0.1, die: 1, levelup: 0.5, potion: 0.2, cast_lightning: 0.08, cast_explosion: 0.08 };
  var lastPlay = {};
  function play(name) {
    if (hushed) return; /* screen saver: no sound at all */
    if (ctx && ctx.state !== 'running') wake();
    if (!ctx || ctx.state !== 'running' || vSfx < 0.005) return;
    var f = SFX[name]; if (!f || f === NOP) return;
    var now = ctx.currentTime, gap = GAP[name] === undefined ? 0.06 : GAP[name];
    if (lastPlay[name] !== undefined && now - lastPlay[name] < gap) return;
    lastPlay[name] = now;
    if (pre) { /* pre-rendered: playing a finished sample costs almost nothing, so no lag and no dropped sounds */
      var vs = bufSfx[name];
      if (vs && vs.length) { playBuf(vs, now); return; }
      if (!vs) return; /* still being prepared */
    }
    try { f(now + 0.005); } catch (e) { /* never let a sound break the game */ }
  }
  function playBuf(vs, now) {
    if (nActive > 12 || !sfxOut) return;
    var s = ctx.createBufferSource(); s.buffer = vs[(Math.random() * vs.length) | 0];
    s.playbackRate.value = 0.97 + Math.random() * 0.06;
    s.connect(sfxOut); nActive++;
    s.onended = function () { nActive--; try { s.disconnect(); } catch (e) {} };
    s.start(now + 0.005);
  }

  /* ---------- music ---------- */
  var Q_MIN = [0, 3, 7], Q_MAJ = [0, 4, 7];
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* CALM: slow A minor, warm pads, soft bass, sparse pentatonic plucks with echo. 8 bars, 66 BPM */
  var CALM_ROOT = [45, 41, 48, 43, 45, 41, 50, 52];
  var CALM_Q = [Q_MIN, Q_MAJ, Q_MAJ, Q_MAJ, Q_MIN, Q_MAJ, Q_MIN, Q_MIN];
  var POOL = [69, 72, 74, 76, 79, 81, 84, 86, 88]; /* A minor pentatonic, A4..E6 */
  function calmStep(step, t, T) {
    var bar = Math.floor(step / 16) % 8, s = step % 16, root = CALM_ROOT[bar], q = CALM_Q[bar];
    if (s === 0) {
      q.forEach(function (iv) {
        var f = mtof(root + 12 + iv);
        tone(T.out, t, 'triangle', f, f, 1.0, 1.6, 0.035, { hold: 1.4, det: -6, lp: 1100, send: T.send, wet: 0.5 });
        tone(T.out, t, 'triangle', f, f, 1.0, 1.6, 0.035, { hold: 1.4, det: 6, lp: 1100 });
      });
      tone(T.out, t, 'triangle', mtof(root), mtof(root), 0.03, 2.4, 0.17, { lp: 500 });
      tone(T.out, t, 'triangle', mtof(root + 12), mtof(root + 12), 0.03, 1.6, 0.05, { lp: 900 });
      if (bar % 2 === 0) noise(T.out, t, 2.4, 0.02, 'bandpass', 500, 900, 2.5, 1.8);
    }
    if (s === 8) tone(T.out, t, 'triangle', mtof(root + 7), mtof(root + 7), 0.03, 1.6, 0.09, { lp: 600 });
    if (s % 2 === 0) {
      var p = s === 0 ? 0.55 : s === 8 ? 0.5 : 0.22;
      if (Math.random() < p) {
        T.mi = clamp(T.mi + pick([-2, -1, -1, 0, 1, 1, 2]), 0, POOL.length - 1);
        var f = mtof(POOL[T.mi]);
        tone(T.out, t, 'triangle', f, f, 0.008, 1.4, 0.075, { lp: 3000, send: T.send, wet: 0.8 });
        tone(T.out, t, 'sine', f * 2, f * 2, 0.008, 0.6, 0.02);
      }
    }
  }

  /* COMBAT: 144 BPM, A minor, taiko-style drums, driving saw bass, string pad and a square-wave arpeggio. 8 bars */
  var CB_BASS = [45, 45, 41, 43, 45, 45, 38, 40];
  var CB_UP = [57, 57, 53, 55, 57, 57, 50, 52];
  var CB_Q = [Q_MIN, Q_MIN, Q_MAJ, Q_MAJ, Q_MIN, Q_MIN, Q_MIN, Q_MAJ];
  var ARPS = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 2, 3, 2, 1, 2, 3], [3, 2, 1, 0, 1, 2, 3, 2], [0, 2, 3, 2, 1, 3, 2, 1]];
  var LEAD = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1];
  function combatStep(step, t, T) {
    var o = T.out, bar = Math.floor(step / 16) % 8, s = step % 16, cyc = Math.floor(step / 128);
    var up = CB_UP[bar], q = CB_Q[bar], bass = CB_BASS[bar], R = Math.random;
    if (s === 0 && bar === 0 && cyc % 2 === 0) noise(o, t, 1.2, 0.06, 'highpass', 4000, 6500, 0.7, 0.003); /* crash, every other loop */
    /* light, short pulse instead of a boomy kick: only on beats 1 and 3, no sub-bass */
    if (s === 0 || s === 8) {
      tone(o, t, 'sine', 120, 78, 0.002, 0.07, 0.16);
      noise(o, t, 0.03, 0.07, 'bandpass', 900, 600, 1.0, 0.001);
    }
    if (s === 4 || s === 12) {
      noise(o, t, 0.14, 0.17, 'bandpass', 2200, 1800, 0.9, 0.001);
      tone(o, t, 'triangle', 230, 170, 0.001, 0.07, 0.1);
    } else if (s === 10 && R() < 0.25) noise(o, t, 0.07, 0.06, 'bandpass', 2200, 1800, 0.9, 0.001);
    if (s % 2 === 0 && (s % 4 === 0 || R() > 0.15)) noise(o, t, 0.035, s % 4 === 2 ? 0.05 : 0.03, 'highpass', 8000, 9000, 0.7, 0.001);
    if (s === 14 && R() < 0.6) noise(o, t, 0.18, 0.04, 'highpass', 7000, 9000, 0.7, 0.002);
    if (bar === 7 && s >= 12 && cyc % 2 === 1) { /* small high-tom fill, every other loop */
      var tf = [330, 290, 250, 215][s - 12];
      tone(o, t, 'triangle', tf, tf * 0.7, 0.002, 0.14, 0.12, { lp: 1800 });
      noise(o, t, 0.08, 0.07, 'bandpass', 1800, 900, 0.9, 0.002);
    }
    if (s % 2 === 0 && (s % 4 === 0 || R() > 0.12)) {
      var bm = bass + (s === 6 || s === 14 ? 12 : 0), bf = mtof(bm);
      tone(o, t, 'sawtooth', bf, bf, 0.004, 0.12, 0.085, { lp: 1200, lp1: 400 });
    }
    if (s === 0) {
      q.forEach(function (iv) {
        var f = mtof(up + iv);
        tone(o, t, 'sawtooth', f, f, 0.05, 0.4, 0.028, { hold: 1.2, det: -7, lp: 1300 });
        tone(o, t, 'sawtooth', f, f, 0.05, 0.4, 0.028, { hold: 1.2, det: 7, lp: 1300 });
      });
    }
    if (LEAD[s] && R() > 0.1) {
      var tones = [up + 12, up + 12 + q[1], up + 12 + 7, up + 24];
      var lf = mtof(tones[ARPS[(bar + cyc) % 4][s % 8]] + (R() < 0.1 ? 12 : 0));
      tone(o, t, 'square', lf, lf, 0.003, 0.12, 0.035, { lp: 2600 });
    }
  }

  /* ---------- scheduler + crossfade ---------- */
  var LOOK = 1.3;
  function pump() {
    if (pre || !ctx || ctx.state !== 'running' || vMusic < 0.005) return; /* pre-render mode plays finished loops, nothing to schedule */
    var now = ctx.currentTime;
    for (var k in tracks) {
      var T = tracks[k];
      if (!(T.on || now < T.stopAt)) continue;
      if (T.next < now - 0.4) T.next = now + 0.03; /* fell behind (throttled timer): resync */
      while (T.next < now + LOOK) { T.play(T.step, T.next, T); T.next += T.dur; T.step++; }
    }
  }
  function fade(T, on, tc) {
    var now = ctx.currentTime;
    if (on && !T.on) {
      T.next = now + 0.04;
      T.step = T.name === 'combat' ? 0 : Math.ceil(T.step / 16) * 16; /* combat always starts on its downbeat; calm resumes on a bar line */
    }
    if (!on && T.on) T.stopAt = now + tc * 6;
    T.on = on;
    T.out.gain.cancelScheduledValues(now);
    T.out.gain.setTargetAtTime(on ? T.level : 0, now, tc);
  }
  function startSrc(T, now) {
    var s = ctx.createBufferSource(); s.buffer = T.buf; s.loop = true; s.loopStart = 0; s.loopEnd = T.loopEnd;
    s.connect(T.out);
    var off = T.name === 'combat' ? 0 : (T.pos || 0); /* combat starts on its downbeat; calm resumes on a bar line */
    s.start(0, off % T.loopEnd);
    T.src = s; T.t0 = now; T.off = off;
  }
  function fadeBuf(T, on, tc) {
    var now = ctx.currentTime;
    if (on) { if (!T.src && T.buf) startSrc(T, now); }
    else if (T.on && T.src) {
      var s = T.src, pos = (T.off + (now - T.t0)) % T.loopEnd, bar = 16 * T.dur;
      T.pos = (Math.ceil(pos / bar) * bar) % T.loopEnd;
      setTimeout(function () { if (T.src === s && !T.on) { try { s.stop(); s.disconnect(); } catch (e) {} T.src = null; } }, tc * 6000 + 100); /* nothing keeps running once faded out */
    }
    T.on = on;
    T.out.gain.cancelScheduledValues(now);
    T.out.gain.setTargetAtTime(on ? T.level : 0, now, tc);
  }
  function attachBuf(name) {
    var T = tracks[name], P = pbuf[name];
    if (!T || !P) return;
    T.buf = P.buf; T.loopEnd = P.loopEnd;
    if (ctx && unlocked) applyTracks();
  }
  function applyTracks() {
    if (!ctx) return;
    var wc = active && combat && !hushed, wn = active && !combat && !hushed, f = pre ? fadeBuf : fade;
    f(tracks.combat, wc, wc ? 0.1 : 0.7);
    f(tracks.calm, wn, wn ? 0.9 : 0.35);
  }
  /* screen saver: silence everything and let the audio engine sleep (saves battery and CPU) */
  function hush(v) {
    v = !!v; if (v === hushed) return;
    hushed = v;
    if (!ctx) return;
    applyTracks();
    if (v) setTimeout(function () { if (hushed && ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} } }, 1200);
    else wake();
  }

  /* ---------- pre-rendered music and effects ----------
     Playing the synthesised sounds live made phones lag and drop notes (hundreds of oscillators every second).
     Instead each sound is rendered ONCE, a few seconds after the page loads, with an OfflineAudioContext (it runs off the main thread),
     and from then on the game only plays finished samples: the two music tracks are seamless loops, effects are one-shot samples (2 variants each).
     If the browser has no OfflineAudioContext, or a render fails, the old live synthesis is used instead. */
  function satCurve() {
    if (satC) return satC;
    satC = new Float32Array(2048);
    for (var k = 0; k < satC.length; k++) { var x = k / (satC.length - 1) * 2 - 1; satC[k] = Math.tanh(x * 1.8) / Math.tanh(1.8); }
    return satC;
  }
  function mkNoise(c) { var n = PSR * 2, b = c.createBuffer(1, n, PSR), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  function buildOff(kind, secs) {
    var c = new OC(1, Math.ceil(secs * PSR), PSR), g = { ctx: c, noiseBuf: mkNoise(c), musicBus: null, sfxBus: null, rev: null, fxIn: null };
    if (kind === 'music') {
      g.musicBus = c.createGain(); g.musicBus.connect(c.destination);
      g.fxIn = c.createGain();
      var dl = c.createDelay(1); dl.delayTime.value = 0.43;
      var fb = c.createGain(); fb.gain.value = 0.36;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      g.fxIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(g.musicBus);
    } else {
      var sb = g.sfxBus = c.createGain(); sb.gain.value = REF;
      var sat = c.createWaveShaper(); sat.curve = satCurve(); try { sat.oversample = '2x'; } catch (e) {}
      sb.connect(sat); sat.connect(c.destination);
      var irLen = Math.floor(PSR * 0.55), ir = c.createBuffer(1, irLen, PSR), id = ir.getChannelData(0), l1 = 0;
      for (var j = 0; j < irLen; j++) { l1 += (Math.random() * 2 - 1 - l1) * 0.45; id[j] = l1 * Math.pow(1 - j / irLen, 3.2); }
      var cv = c.createConvolver(); cv.buffer = ir;
      g.rev = c.createGain(); var ro = c.createGain(); ro.gain.value = 0.7;
      g.rev.connect(cv); cv.connect(ro); ro.connect(sb);
    }
    return g;
  }
  /* the synth functions use these module variables; point them at the offline graph while scheduling, then put the live ones back */
  function swapIn(g) {
    saved = { ctx: ctx, musicBus: musicBus, sfxBus: sfxBus, rev: rev, fxIn: fxIn, noiseBuf: noiseBuf };
    ctx = g.ctx; musicBus = g.musicBus; sfxBus = g.sfxBus; rev = g.rev; fxIn = g.fxIn; noiseBuf = g.noiseBuf; offline = true;
  }
  function swapOut() {
    if (!saved) return;
    ctx = saved.ctx; musicBus = saved.musicBus; sfxBus = saved.sfxBus; rev = saved.rev; fxIn = saved.fxIn; noiseBuf = saved.noiseBuf; offline = false; saved = null;
  }
  function render(c, cb) {
    var fired = false, fin = function (b) { if (fired) return; fired = true; cb(b || null); }, p;
    c.oncomplete = function (e) { fin(e && e.renderedBuffer); };
    try { p = c.startRendering(); } catch (e) { fin(null); return; }
    if (p && p.then) p.then(fin, function () { fin(null); });
  }
  function runJobs() {
    for (;;) {
      var j = null;
      if (jobs.length) { if (rjAct < MAXC) j = jobs.shift(); }
      else if (rjAct === 0) { preReady = true; if (bgJobs.length) j = bgJobs.shift(); } /* required sounds all done = ready; extras (2nd effect variants) follow one at a time */
      if (!j) return;
      rjAct++;
      (function (j, gen) {
        var fin = false, done = function () { if (fin || gen !== rjGen) return; fin = true; rjAct--; setTimeout(runJobs, 10); };
        try { j(done); } catch (e) { swapOut(); preFail(); }
      })(j, rjGen);
      if (!jobs.length) return;
    }
  }
  function preFail() { /* anything went wrong: go back to live synthesis */
    pre = false; preReady = true; jobs.length = 0; bgJobs.length = 0; rjAct = 0; rjGen++;
    for (var k in tracks) { var T = tracks[k]; if (T.src) { try { T.src.stop(); T.src.disconnect(); } catch (e) {} T.src = null; } }
    if (ctx && unlocked) applyTracks();
  }
  function jobMusic(name, dur, fn, cycles, tail) {
    return function (next) {
      var steps = 128 * cycles, loopLen = steps * dur, g = buildOff('music', loopLen + tail), i = 0, T;
      swapIn(g);
      try {
        T = { name: name, level: 1, dur: dur, play: fn, step: 0, mi: 3 };
        T.out = g.ctx.createGain(); T.out.connect(g.musicBus); T.send = g.ctx.createGain(); T.send.connect(g.fxIn);
      } finally { swapOut(); }
      (function chunk() { /* a few bars per tick, so the page never stalls */
        try {
          swapIn(g);
          try { for (var n = 0; n < 16 && i < steps; n++, i++) T.play(i, 0.02 + i * dur, T); } finally { swapOut(); }
        } catch (e) { preFail(); return; }
        if (i < steps) { setTimeout(chunk, 6); return; }
        render(g.ctx, function (b) {
          if (!b) { preFail(); return; }
          var d = b.getChannelData(0), N = Math.round(loopLen * b.sampleRate);
          for (var k = 0; k + N < d.length; k++) d[k] += d[N + k]; /* the ring-out after the loop end is mixed onto the start: seamless loop */
          pbuf[name] = { buf: b, loopEnd: N / b.sampleRate };
          idbSave(name, { sr: b.sampleRate, loopEnd: N / b.sampleRate, d: d.slice(0, N) }); /* keep it on the device: next start loads it instead of rendering */
          progDone += W[name] || 1; attachBuf(name); next();
        });
      })();
    };
  }
  /* renders ONE variant of an effect. Loading renders variant 1 of everything; variant 2 is made afterwards in the background (bg = true). */
  function jobSfx(name, bg) {
    return function (next) {
      var g, finished = false;
      var finish = function (b) {
        if (finished) return; finished = true;
        var list = bufSfx[name] || (bufSfx[name] = []); /* an empty list = could not render: that sound falls back to live synthesis */
        if (b) list.push(b);
        if (!bg) progDone += 1;
        if (list.length) { try { idbSave(name, { sr: PSR, v: list.map(function (x) { return x.getChannelData(0); }) }); } catch (e) {} }
        next();
      };
      try { g = buildOff('sfx', 3.4); swapIn(g); try { SFX[name](0.01); } finally { swapOut(); } } catch (e) { finish(null); return; }
      render(g.ctx, function (b) {
        if (b) {
          try { /* cut the silent tail, fade the last few ms */
            var d = b.getChannelData(0), n = d.length;
            while (n > 1200 && Math.abs(d[n - 1]) < 0.0015) n--;
            n = Math.min(d.length, n + 800);
            var nb = g.ctx.createBuffer(1, n, PSR), nd = nb.getChannelData(0);
            nd.set(d.subarray(0, n)); for (var q = 0; q < 400 && q < n; q++) nd[n - 1 - q] *= q / 400;
            b = nb;
          } catch (e) {}
        }
        finish(b);
      });
    };
  }
  /* ---------- saved copy on the device (IndexedDB) ----------
     The first start renders everything (a few seconds, on the loading screen) and stores the finished samples. Every later start reads them back
     (about 100-300 ms) and renders nothing. The saved copy is tagged with a hash of this file's source, so editing audio.js refreshes it by itself. */
  var DBN = 'woa-audio', DBS = 'snd';
  function hashSrc() {
    if (srcHash) return srcHash;
    var t = SNDMOD.toString(), h = 2166136261;
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (srcHash = (h >>> 0) + ':' + t.length + ':' + PSR);
  }
  function idbOpen(cb) {
    var fin = false, once = function (db) { if (fin) { if (db) { try { db.close(); } catch (e) {} } return; } fin = true; cb(db); };
    try {
      var rq = root.indexedDB.open(DBN, 1);
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore(DBS); } catch (e) {} };
      rq.onsuccess = function () { once(rq.result); };
      rq.onerror = rq.onblocked = function () { once(null); };
      setTimeout(function () { once(null); }, 3000); /* some private modes never answer: just render instead */
    } catch (e) { once(null); }
  }
  function idbLoad(cb) {
    idbOpen(function (db) {
      if (!db) { cb({}); return; }
      var out = {}, h = hashSrc(), fin = false, end = function () { if (fin) return; fin = true; try { db.close(); } catch (e) {} cb(out); };
      try {
        var rq = db.transaction(DBS, 'readonly').objectStore(DBS).getAll();
        rq.onsuccess = function () {
          var all = rq.result || [], stale = false;
          all.forEach(function (r) { if (r && r.h === h && r.k) out[r.k] = r; else stale = true; });
          if (stale) { try { db.transaction(DBS, 'readwrite').objectStore(DBS).clear(); out = {}; all.forEach(function (r) { if (r && r.h === h && r.k) out[r.k] = r; }); } catch (e) {} }
          end();
        };
        rq.onerror = end;
      } catch (e) { end(); }
      setTimeout(end, 4000);
    });
  }
  function idbSave(k, rec) {
    rec.k = k; rec.h = hashSrc();
    idbOpen(function (db) {
      if (!db) return;
      var close = function () { try { db.close(); } catch (e) {} };
      try { var tx = db.transaction(DBS, 'readwrite'); tx.objectStore(DBS).put(rec, k); tx.oncomplete = tx.onerror = tx.onabort = close; } catch (e) { close(); }
    });
  }
  function rebuild(arr, sr) {
    if (!rbCtx) rbCtx = new OC(1, 1, PSR);
    var b = rbCtx.createBuffer(1, arr.length, sr); b.getChannelData(0).set(arr);
    return b;
  }
  function queueMissing(names) {
    if (!pbuf.calm) jobs.push(jobMusic('calm', 60 / 66 / 4, calmStep, 1, 5));
    if (!pbuf.combat) jobs.push(jobMusic('combat', 60 / 128 / 4, combatStep, 2, 3));
    names.forEach(function (k) { if (!bufSfx[k]) jobs.push(jobSfx(k, false)); });
    names.forEach(function (k) { if (!bufSfx[k] || bufSfx[k].length < 2) bgJobs.push(jobSfx(k, true)); }); /* second variant, after the game is ready */
  }
  function startPre() {
    if (preStarted || !pre) return; preStarted = true;
    var names;
    try { names = Object.keys(SFX).filter(function (k) { return SFX[k] !== NOP; }); } catch (e) { preFail(); return; }
    progTotal = W.calm + W.combat + names.length;
    idbLoad(function (cache) {
      try {
        ['calm', 'combat'].forEach(function (k) {
          var r = cache[k]; if (!r || !r.d) return;
          pbuf[k] = { buf: rebuild(r.d, r.sr), loopEnd: r.loopEnd }; progDone += W[k]; fromCache++;
        });
        names.forEach(function (k) {
          var r = cache[k]; if (!r || !r.v || !r.v.length) return;
          bufSfx[k] = r.v.map(function (a) { return rebuild(a, r.sr); }); progDone += 1; fromCache++;
        });
        attachBuf('calm'); attachBuf('combat');
      } catch (e) { pbuf = {}; bufSfx = {}; progDone = 0; fromCache = 0; } /* saved copy unreadable: render everything again */
      try { queueMissing(names); } catch (e) { preFail(); return; }
      runJobs();
    });
  }
  if (pre) setTimeout(startPre, 30); /* starts at once: the loading screen waits for it (SND.progress) */

  /* ---------- public ---------- */
  /* Phones put the audio context to sleep ('suspended', or 'interrupted' on iOS) after a call, app switch, screen lock or
     headphone change, and only let it restart from a touch. So: wake() is tried on every touch, on returning to the page, and
     while playing; the touch listeners stay installed for the whole session (they used to be removed after the first unlock,
     so a sleeping context could never be woken again). */
  var silentEl = null;
  function wake() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed' || document.hidden || hushed) return;
    try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  /* older iOS: a silent looping <audio> element moves the page to the 'playback' audio session so the silent switch does not mute effects */
  function silentStart() {
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!ios || navigator.audioSession || document.hidden) return;
    try {
      if (!silentEl) {
        var n = 800, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = function (o, t) { for (var i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
        w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
        for (var i = 0; i < n; i++) b[44 + i] = 128;
        silentEl = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
        silentEl.loop = true; silentEl.setAttribute('playsinline', '');
      }
      var pr = silentEl.play(); if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state !== 'running' && !document.hidden) { try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    silentStart();
    if (ctx.state === 'running' && !unlocked) {
      unlocked = true;
      applyTracks();
    }
    if (!timer) timer = setInterval(pump, 90);
  }
  ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(function (ev) { root.addEventListener(ev, unlock, true); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) {} if (silentEl) { try { silentEl.pause(); } catch (e) {} } } /* background play stays silent */
    else if (unlocked) { wake(); silentStart(); }
  });
  root.addEventListener('pageshow', function () { if (unlocked) wake(); });
  root.addEventListener('focus', function () { if (unlocked) wake(); });
  var lastWake = 0;

  root.SND = {
    unlock: unlock,
    hush: hush,
    progress: function () { return { done: progDone, total: progTotal, ready: preReady, cached: fromCache }; },
    play: play,
    tick: function (dt, isActive, isCombat) {
      active = !!isActive; var c = !!isCombat;
      if (ctx && unlocked && active && ctx.state !== 'running') { var tn = Date.now(); if (tn - lastWake > 1500) { lastWake = tn; wake(); } }
      if (!ctx || !unlocked) { combat = c; wasActive = active; wasCombat = c; return; }
      if (active !== wasActive || c !== wasCombat) { combat = c; wasActive = active; wasCombat = c; applyTracks(); }
    },
    music: function (v) {
      if (v === undefined) return vMusic;
      vMusic = clamp(+v || 0, 0, 1); lsSet(KEY_M, vMusic); applyVol();
      return vMusic;
    },
    sfx: function (v) {
      if (v === undefined) return vSfx;
      vSfx = clamp(+v || 0, 0, 1); lsSet(KEY_S, vSfx); applyVol();
      return vSfx;
    },
    _dbg: function () { return { ctx: ctx, master: master, tracks: tracks, sfx: SFX, pre: pre, pbuf: pbuf, bufSfx: bufSfx, hushed: hushed }; }
  };
})(window);
