/**
 * Labs for Waves & Sound. Shared helpers first (WAV: drawing, colours, a small sound engine), then eleven labs:
 *   wav-medium-lab   (Lesson 1)  beads in a medium: transverse or longitudinal, follow one particle
 *   wav-travel-lab   (Lesson 2)  y = A sin(kx − ωt): snapshot, history at a probe, particle velocity
 *   wav-speed-lab    (Lesson 3)  races: strings of different tension and mass, gases, a hanging rope
 *   wav-pulse-lab    (Lesson 4)  superposition of pulses; reflection at fixed/free ends and at a joint
 *   wav-ripple-lab   (Lesson 4)  two sources in a ripple tank; a microphone you can move; loudness map
 *   wav-string-lab   (Lesson 5)  standing waves on a string: pick a harmonic or drive it; hear it
 *   wav-pipe-lab     (Lesson 6)  air columns, open or closed: particle motion, displacement and pressure
 *   wav-tube-lab     (Lesson 6)  the resonance-tube experiment, done for real: find v and the end correction
 *   wav-beats-lab    (Lesson 7)  two close tones: the envelope, the beat frequency, a mystery fork to tune
 *   wav-doppler-lab  (Lesson 8)  a moving source, wavefronts, Mach cone; hear it drive past
 *   wav-rush-lab     (Lesson 9)  Wave Rush, a quick-fire game
 * Colours come from the page's CSS, so the labs follow light/dark mode and the chapter tone. Sound plays only on a
 * button press, for a few seconds, and only while the app's sound switch is on.
 */
var WAV = (function () {
  'use strict';
  var FONT = 'Inter Variable, Roboto, system-ui, sans-serif', MATH = 'KaTeX_Math, "Times New Roman", serif', TAU = Math.PI * 2;
  function motion() { return !window.FX || window.FX.motionOK(); }
  function fx(n, a) { if (window.FX) window.FX.play(n, a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clock() { var last = 0; return function (s, run) { var dt = last ? s.time - last : 0; last = s.time; if (dt < 0 || dt > 0.1) dt = 1 / 60; return run ? dt : 0; }; }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function line(ctx, x1, y1, x2, y2, color, lw, dash, alpha) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 1; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function dot(ctx, x, y, r, color, alpha) { ctx.save(); ctx.fillStyle = color; if (alpha != null) ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
  function ring(ctx, x, y, r, color, lw, alpha, dash) { if (r <= 0) return; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 1; if (alpha != null) ctx.globalAlpha = alpha; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }
  function text(ctx, str, x, y, o) {
    o = o || {}; ctx.save();
    ctx.font = (o.italic ? 'italic ' : '') + (o.weight || 600) + ' ' + (o.size || 12) + 'px ' + (o.math ? MATH : FONT);
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle'; if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillText(str, x, y); ctx.restore();
  }
  function wrap(ctx, str, x, y, maxW, o) {
    o = o || {};
    var size = o.size || 13, lh = o.lh || size * 1.38, words = String(str).split(' '), cur = '', lines = [];
    ctx.save(); ctx.font = (o.weight || 560) + ' ' + size + 'px ' + FONT;
    words.forEach(function (wd) { var tt = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tt; });
    if (cur) lines.push(cur);
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    ctx.restore(); return lines.length * lh;
  }
  function arrow(ctx, x, y, dx, dy, color, width, label, t) {
    if (Math.hypot(dx, dy) < 4) return;
    Sim.arrow(ctx, x, y, x + dx, y + dy, { color: color, width: width || 2.4, head: 9 });
    if (label) Sim.label(ctx, label, x + dx + (dx >= 0 ? 12 : -12), y + dy + (dy > 0 ? 10 : dy < 0 ? -10 : -12), { size: 11, weight: 700, color: color, plate: t && t.plate });
  }
  /** Polyline through n+1 samples: fn(i/n) → [x, y]. */
  function path(ctx, n, fn, color, lw, o) {
    o = o || {}; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); for (var i = 0; i <= n; i++) { var p = fn(i / n); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    ctx.stroke(); ctx.restore();
  }
  function frame(ctx, B, t, label, col) {
    ctx.save(); ctx.fillStyle = t.grid; ctx.globalAlpha = 0.5; rrect(ctx, B.x - 4, B.y - 2, B.w + 8, B.h + 4, 6); ctx.fill(); ctx.restore();
    line(ctx, B.x, B.y + B.h / 2, B.x + B.w, B.y + B.h / 2, t.ink3, 1, null, 0.5);
    if (label) text(ctx, label, B.x - 14, B.y + B.h / 2, { size: 15, italic: true, math: true, color: col || t.ink2, weight: 500 });
  }
  function num(v, d) { d = d == null ? 2 : d; var s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? '−' : '') + s; }
  function signed(v, d) { d = d == null ? 2 : d; var s = Math.abs(v).toFixed(d); return (+s === 0 ? '' : v < 0 ? '−' : '+') + s; }
  function trim(v, d) { return (+v.toFixed(d == null ? 2 : d)).toString(); }
  function radio(stage, items, value, onPick) {
    var btns = items.map(function (it) { return stage.toggle({ label: it[1], value: it[0] === value, onChange: function () { set(it[0]); onPick(it[0]); } }); });
    function set(v) { btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(items[i][0] === v)); }); }
    return { set: set, btns: btns };
  }
  function store(key, v) { try { if (v === undefined) return localStorage.getItem(key); localStorage.setItem(key, String(v)); } catch (e) { /* storage blocked */ } return null; }
  /** CSS colour → [r, g, b], for pixel work. */
  function rgb(c) {
    var m; c = String(c || '').trim();
    if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    if ((m = /^#([0-9a-f]{3})$/i.exec(c))) return [0, 1, 2].map(function (i) { return parseInt(m[1][i] + m[1][i], 16); });
    if ((m = /rgba?\(([^)]+)\)/.exec(c))) { var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    return [200, 200, 200];
  }
  /** Gaussian bump of unit height. */
  function bump(u, w) { return Math.exp(-u * u / (2 * w * w)); }

  /* ── a tiny sound engine: one voice at a time, soft envelope, follows the app's sound switch ── */
  var Sound = (function () {
    var ac = null, bus = null, stopCur = null;
    function ctx() {
      if (window.FX && window.FX.soundOn && !window.FX.soundOn()) return null;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!ac) {
        try { ac = new AC(); bus = ac.createGain(); bus.gain.value = 0.22; var comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; bus.connect(comp); comp.connect(ac.destination); }
        catch (e) { ac = null; return null; }
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function stop() { if (stopCur) { try { stopCur(); } catch (e) { /* already stopped */ } stopCur = null; } }
    /** partials: [[hz, amplitude]]. o: { dur, attack, release, gain, decay (bool), fcurve: [multipliers], gcurve: [gains] } */
    function play(partials, o) {
      o = o || {};
      var c = ctx();
      if (!c) { if (window.FX) window.FX.toast('<span><b>Sound is off.</b> Turn on sound effects (speaker button) to hear this.</span>', 3600); return false; }
      stop();
      var t = c.currentTime + 0.04, d = o.dur || 2.5, a = o.attack || 0.06, r = o.release || 0.4, peak = o.gain == null ? 0.9 : o.gain, env = c.createGain(), oscs = [];
      env.gain.setValueAtTime(0.0001, t);
      if (o.gcurve) env.gain.setValueCurveAtTime(Float32Array.from(o.gcurve.map(function (g) { return Math.max(0.0001, g * peak); })), t, d);
      else {
        env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
        if (o.decay) env.gain.exponentialRampToValueAtTime(0.0001, t + d);
        else { env.gain.setValueAtTime(Math.max(0.0002, peak), t + Math.max(a, d - r)); env.gain.exponentialRampToValueAtTime(0.0001, t + d); }
      }
      env.connect(bus);
      var sum = partials.reduce(function (s, p) { return s + p[1]; }, 0) || 1;
      partials.forEach(function (p) {
        var osc = c.createOscillator(), pg = c.createGain(); osc.type = 'sine';
        if (o.fcurve) osc.frequency.setValueCurveAtTime(Float32Array.from(o.fcurve.map(function (k) { return p[0] * k; })), t, d);
        else osc.frequency.value = p[0];
        pg.gain.value = p[1] / sum; osc.connect(pg); pg.connect(env); osc.start(t); osc.stop(t + d + 0.05); oscs.push(osc);
      });
      stopCur = function () { var n = c.currentTime; env.gain.cancelScheduledValues(n); env.gain.setValueAtTime(env.gain.value, n); env.gain.linearRampToValueAtTime(0, n + 0.06); oscs.forEach(function (x) { try { x.stop(n + 0.1); } catch (e) { /* stopped */ } }); };
      return true;
    }
    return { play: play, stop: stop };
  })();
  return { motion: motion, fx: fx, clamp: clamp, clock: clock, rrect: rrect, line: line, dot: dot, ring: ring, text: text, wrap: wrap, arrow: arrow, path: path, frame: frame,
    num: num, signed: signed, trim: trim, radio: radio, store: store, rgb: rgb, bump: bump, Sound: Sound, TAU: TAU, FONT: FONT, MATH: MATH };
})();

/* ═══════════════════════════ Lesson 1: inside a wave ═══════════════════════════ */
Sim.register('wav-medium-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, mode = 'trans', f = 0.6, lam = 2, pulse = false, follow = true, t = 0, playing = true, tick = WAV.clock(), N = 41, LEN = 4;
  var outV = stage.readout('Wave speed v = fλ'), outP = stage.readout('Each particle'), outL = stage.readout('Wavelength λ');
  WAV.radio(stage, [['trans', 'Transverse'], ['long', 'Longitudinal']], mode, function (v) { mode = v; });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.toggle({ label: 'Single pulse', value: false, onChange: function (on) { pulse = on; t = 0; } });
  stage.toggle({ label: 'Follow one particle', value: true, onChange: function (on) { follow = on; } });
  stage.slider({ label: 'Frequency f', min: 0.2, max: 1.5, step: 0.05, value: f, format: function (v) { return v.toFixed(2) + ' Hz'; }, onInput: function (v) { f = v; } });
  stage.slider({ label: 'Wavelength λ', min: 0.5, max: 4, step: 0.1, value: lam, format: function (v) { return v.toFixed(1) + ' m'; }, onInput: function (v) { lam = v; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var v = f * lam, x0 = 22, x1 = s.w - 22, sp = (x1 - x0) / (N - 1), ppm = (x1 - x0) / LEN, cy = s.h * 0.5, tag = 12;
    function disp(X) {
      if (pulse) { var span = LEN + 2, c = ((v * t) % span) - 1; return WAV.bump(X - c, 0.22); }
      return Math.sin(TAU * (X / lam - f * t));
    }
    var pos = [];
    for (var i = 0; i < N; i++) {
      var X = i * LEN / (N - 1), d = disp(X);
      if (mode === 'trans') pos.push([x0 + i * sp, cy - d * Math.min(s.h * 0.24, 62)]);
      else pos.push([x0 + i * sp + d * sp * 0.75, cy]);
    }
    WAV.text(ctx, '0', x0, s.h - 14, { size: 10, color: th.ink3, weight: 700 }); WAV.text(ctx, LEN + ' m', x1, s.h - 14, { size: 10, color: th.ink3, weight: 700 });
    if (mode === 'trans') {
      WAV.line(ctx, x0, cy, x1, cy, th.ink3, 1, [3, 5], 0.5);
      WAV.path(ctx, N - 1, function (u) { return pos[Math.round(u * (N - 1))]; }, th.ink3, 1.4, { alpha: 0.7 });
      pos.forEach(function (p, j) { WAV.dot(ctx, p[0], p[1], j === tag && follow ? 7.5 : 4.5, j === tag && follow ? th.violet : th.accent); });
      if (follow) { var A = Math.min(s.h * 0.24, 62); WAV.line(ctx, pos[tag][0], cy - A - 8, pos[tag][0], cy + A + 8, th.violet, 1.4, [3, 4], 0.7); WAV.text(ctx, 'only up and down', pos[tag][0], cy + A + 20, { size: 10, color: th.violet, weight: 700 }); }
    } else {
      for (var g = 0; g < N - 1; g++) {
        var dens = sp / Math.max(2, pos[g + 1][0] - pos[g][0]);
        ctx.save(); ctx.fillStyle = dens > 1 ? th.accent : th.violet; ctx.globalAlpha = WAV.clamp(Math.abs(dens - 1) * 0.5, 0, 0.5);
        ctx.fillRect(pos[g][0], cy - 46, pos[g + 1][0] - pos[g][0], 92); ctx.restore();
      }
      [-30, 0, 30].forEach(function (dy) { pos.forEach(function (p, j) { WAV.dot(ctx, p[0], cy + dy, j === tag && follow ? 6.5 : 3.6, j === tag && follow ? th.violet : th.ink); }); });
      if (follow) { WAV.line(ctx, x0 + tag * sp - sp * 0.75, cy - 56, x0 + tag * sp + sp * 0.75, cy - 56, th.violet, 2, null, 0.9); WAV.text(ctx, 'only back and forth', x0 + tag * sp, cy - 68, { size: 10, color: th.violet, weight: 700 }); }
      if (!pulse) for (var m = -2; m < 6; m++) {
        var Xc = lam * (f * t + 0.5 + m), Xr = lam * (f * t + m);
        if (Xc >= 0 && Xc <= LEN) WAV.text(ctx, 'C', x0 + Xc * ppm, cy + 62, { size: 12, color: th.accent, weight: 800 });
        if (Xr >= 0 && Xr <= LEN) WAV.text(ctx, 'R', x0 + Xr * ppm, cy + 62, { size: 12, color: th.violet, weight: 800 });
      }
    }
    // a flag riding the pattern at the wave speed
    var Xf = pulse ? ((v * t) % (LEN + 2)) - 1 : (lam * (f * t + (mode === 'trans' ? 0.25 : 0.5))) % lam;
    if (!pulse) while (Xf + lam <= LEN) { if (Xf >= 0.2) break; Xf += lam; }
    if (Xf >= 0 && Xf <= LEN) { var fx0 = x0 + Xf * ppm; WAV.arrow(ctx, fx0 - 18, 22, 36, 0, th.warn, 2.4, '', th); WAV.text(ctx, pulse ? 'pulse' : mode === 'trans' ? 'crest' : 'compression', fx0, 36, { size: 10, color: th.warn, weight: 700 }); }
    outV(v.toFixed(2) + ' m/s', 'pattern moves, particles stay');
    outP(mode === 'trans' ? 'up and down' : 'back and forth', 'about a fixed place');
    outL(lam.toFixed(1) + ' m', mode === 'trans' ? 'crest to crest' : 'C to C');
  });
}, { unitsWide: 10, aspect: 0.42, minHeight: 260, maxHeight: 380, hint: '' });

/* ═══════════════════════════ Lesson 2: y = A sin(kx − ωt) ═══════════════════════════ */
Sim.register('wav-travel-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, A = 2, lam = 2, f = 0.5, dir = 1, xp = 1.25, ghost = false, playing = true, t = 0, tick = WAV.clock(), G = null, XMAX = 6;
  var P = stage.handle({ x: 0, y: 0, radius: 12 });
  P.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); xp = WAV.clamp((p[0] - G.x0) / G.sx, 0, XMAX); };
  var outV = stage.readout('Wave speed ω/k'), outU = stage.readout('Particle at the probe'), outF = stage.readout('Phase difference from x = 0');
  WAV.radio(stage, [[1, 'Moving +x'], [-1, 'Moving −x']], dir, function (v) { dir = v; });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.toggle({ label: 'Ghost: a moment later', value: false, onChange: function (on) { ghost = on; } });
  stage.slider({ label: 'Amplitude A', min: 1, max: 3, step: 0.5, value: A, format: function (v) { return v.toFixed(1) + ' cm'; }, onInput: function (v) { A = v; } });
  stage.slider({ label: 'Wavelength λ', min: 1, max: 4, step: 0.5, value: lam, format: function (v) { return v.toFixed(1) + ' m'; }, onInput: function (v) { lam = v; } });
  stage.slider({ label: 'Frequency f', min: 0.25, max: 1, step: 0.05, value: f, format: function (v) { return v.toFixed(2) + ' Hz'; }, onInput: function (v) { f = v; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var k = TAU / lam, w = TAU * f, v = w / k;
    function y(x, tt) { return A * Math.sin(k * x - dir * w * tt); }
    var B = { x: 40, y: 22, w: s.w - 58, h: s.h * 0.48 }, H = { x: 40, y: B.y + B.h + 46, w: s.w - 58, h: s.h - (B.y + B.h + 46) - 22 };
    var sx = B.w / XMAX, sy = B.h / 2 / 3.4; G = { x0: B.x, sx: sx };
    WAV.frame(ctx, B, th, 'y', th.accent);
    WAV.text(ctx, 'snapshot: the whole string at one instant', B.x + B.w, B.y + B.h - 8, { size: 10, color: th.ink3, align: 'right', weight: 700 });
    for (var m = 1; m < XMAX; m++) WAV.text(ctx, m + ' m', B.x + m * sx, B.y + B.h + 10, { size: 9, color: th.ink3, weight: 700 });
    if (ghost) WAV.path(ctx, 240, function (u) { var x = u * XMAX; return [B.x + x * sx, B.y + B.h / 2 - y(x, t + 0.12 / f) * sy]; }, th.ink2, 1.6, { dash: [5, 4], alpha: 0.8 });
    WAV.path(ctx, 240, function (u) { var x = u * XMAX; return [B.x + x * sx, B.y + B.h / 2 - y(x, t) * sy]; }, th.accent, 2.6);
    // a crest riding at the wave speed
    var xc = (((dir * v * t + lam / 4) % lam) + lam) % lam; while (xc + lam < XMAX * 0.2) xc += lam;
    WAV.arrow(ctx, B.x + xc * sx - 16 * dir, B.y + B.h / 2 - A * sy - 14, 32 * dir, 0, th.warn, 2.2, '', th);
    // the probe
    var px = B.x + xp * sx, py = B.y + B.h / 2 - y(xp, t) * sy, vy = -dir * w * A * Math.cos(k * xp - dir * w * t);
    WAV.line(ctx, px, B.y, px, B.y + B.h, th.violet, 1.2, [3, 4], 0.8);
    WAV.dot(ctx, px, py, 8, th.violet);
    WAV.arrow(ctx, px + 14, py, 0, -vy * sy * 0.45, th.ok, 2.4, 'v_p', th);
    var hp = s.toWorld(px, B.y + B.h); if (!P.active) { P.x = hp[0]; P.y = hp[1]; }
    WAV.dot(ctx, px, B.y + B.h, P.active || s.focused(P) ? 9 : 7, th.violet); WAV.text(ctx, 'probe', px, B.y + B.h + 22, { size: 10, color: th.violet, weight: 700 });
    // history at the probe
    WAV.frame(ctx, H, th, 'y', th.violet);
    WAV.text(ctx, 'history: the probe particle over the last 4 s (now at right)', H.x + H.w, H.y + 8, { size: 10, color: th.ink3, align: 'right', weight: 700 });
    WAV.path(ctx, 200, function (u) { var tt = t - 4 * (1 - u); return [H.x + u * H.w, H.y + H.h / 2 - y(xp, tt) * (H.h / 2 / 3.4)]; }, th.violet, 2.2);
    var kk = 2 / lam, ww = 2 * f, pf = function (c) { return c === 1 ? 'π' : WAV.trim(c) + 'π'; };
    Sim.label(ctx, 'y = ' + WAV.trim(A, 1) + ' sin(' + pf(kk) + 'x ' + (dir > 0 ? '−' : '+') + ' ' + pf(ww) + 't)  (y in cm, x in m, t in s)', B.x, B.y + 10, { size: 12, weight: 700, color: th.ink, align: 'left', plate: th.plate });
    outV(v.toFixed(2) + ' m/s', dir > 0 ? 'signs differ: towards +x' : 'signs alike: towards −x');
    outU(WAV.signed(vy, 1) + ' cm/s', 'at most Aω = ' + (A * w).toFixed(1) + ' cm/s');
    var lag = ((k * xp * 180 / Math.PI) % 360 + 360) % 360;
    outF(Math.round(lag) + '°', (dir > 0 ? 'lags' : 'leads') + ': Δφ = 2π × ' + (xp / lam).toFixed(2));
  });
}, { unitsWide: 10, aspect: 0.62, minHeight: 360, maxHeight: 500, hint: 'Drag the probe along the string' });

/* ═══════════════════════════ Lesson 3: wave races ═══════════════════════════ */
Sim.register('wav-speed-lab', function (stage) {
  'use strict';
  var GASES = [['Air', 1.4, 0.029], ['Helium', 1.67, 0.004], ['Hydrogen', 1.41, 0.002], ['CO₂', 1.3, 0.044]];
  var mode = 'string', T = 160, mu = 10, gas = 1, TC = 20, t0 = 0, now = 0, tick = WAV.clock();
  var P = { string: { T: 160, mu: 10 }, gas: { gas: 1, TC: 20 } };
  var outA = stage.readout('Lane A'), outB = stage.readout('Lane B'), outR = stage.readout('Speed ratio');
  function names(a, b, c) { var rs = stage.readouts.children; [a, b, c].forEach(function (nm, i) { if (rs[i]) rs[i].firstChild.textContent = nm; }); }
  WAV.radio(stage, [['string', 'Strings'], ['gas', 'Sound in gases'], ['rope', 'Hanging rope']], mode, function (v) { mode = v; build(); race(); });
  stage.button({ label: 'Race again', onClick: function () { race(); } });
  function race() { t0 = now; }
  function build() {
    stage.controls.innerHTML = '';
    if (mode === 'rope') names('Pulse', 'Speed now', 'Time'); else names('Lane A', 'Lane B', 'Speed ratio');
    if (mode === 'string') {
      stage.slider({ label: 'Lane B tension T', min: 10, max: 640, step: 10, value: P.string.T, format: function (v) { return v + ' N'; }, onInput: function (v) { P.string.T = v; race(); } });
      stage.slider({ label: 'Lane B mass per length μ', min: 2.5, max: 40, step: 2.5, value: P.string.mu, format: function (v) { return v + ' g/m'; }, onInput: function (v) { P.string.mu = v; race(); } });
    } else if (mode === 'gas') {
      stage.slider({ label: 'Gas in lane B', min: 0, max: 3, step: 1, value: P.gas.gas, format: function (v) { return GASES[v][0]; }, onInput: function (v) { P.gas.gas = v; race(); } });
      stage.slider({ label: 'Temperature (both lanes)', min: -20, max: 100, step: 5, value: P.gas.TC, format: function (v) { return v + ' °C'; }, onInput: function (v) { P.gas.TC = v; race(); } });
    }
  }
  build();
  function vGas(g, tc) { return Math.sqrt(g[1] * 8.314 * (tc + 273.15) / g[2]); }
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, WAV.motion()); now += dt;
    var el = now - t0;
    if (mode === 'rope') {
      var L = 20, g = 10, x = s.w * 0.5, top = 24, bot = s.h - 30, ttop = 2 * Math.sqrt(L / g), tt = Math.min(el, ttop), yrise = g * tt * tt / 4, ppm = (bot - top) / L;
      WAV.line(ctx, x - 50, top, x + 50, top, th.ink3, 3);
      for (var hh = 0; hh < 10; hh++) WAV.line(ctx, x - 48 + hh * 10, top, x - 54 + hh * 10, top - 6, th.ink3, 1, null, 0.6);
      var yp = bot - yrise * ppm;
      WAV.path(ctx, 160, function (u) { var yy = top + u * (bot - top), d = WAV.bump((yy - yp) / ppm, 0.6); return [x + d * 22 * (el < ttop + 0.2 ? 1 : 0), yy]; }, th.ink2, 2.4);
      WAV.dot(ctx, x, bot + 6, 7, th.accent);
      for (var m = 0; m <= L; m += 5) { var ym = bot - m * ppm; WAV.line(ctx, x + 60, ym, x + 66, ym, th.ink3, 1); WAV.text(ctx, m + ' m', x + 72, ym, { size: 10, color: th.ink3, align: 'left', weight: 700 }); }
      var vnow = Math.sqrt(g * yrise);
      if (el <= ttop + 0.2) WAV.arrow(ctx, x - 40, yp + 20, 0, -Math.max(10, vnow * 3.4), th.warn, 2.6, '', th);
      WAV.text(ctx, 'tension at height y is the weight below it: T = μgy, so v = √(gy)', s.w / 2, s.h - 10, { size: 11, color: th.ink3, weight: 700 });
      outA(el < ttop ? 'climbing' : 'reached the top', 'pulse sent up from the bottom');
      outB(vnow.toFixed(1) + ' m/s', 'speed now = √(g·' + yrise.toFixed(1) + ' m)');
      outR(Math.min(el, ttop).toFixed(2) + ' s', el >= ttop ? 'total 2√(L/g) = ' + ttop.toFixed(2) + ' s' : 'time so far');
      if (el > ttop + 2.5) race();
      return;
    }
    var lanes, D, slow, unit;
    if (mode === 'string') {
      var vA = Math.sqrt(40 / 0.01), vB = Math.sqrt(P.string.T / (P.string.mu / 1000));
      lanes = [['A: T = 40 N, μ = 10 g/m', vA], ['B: T = ' + P.string.T + ' N, μ = ' + P.string.mu + ' g/m', vB]]; D = 20; slow = 10; unit = 'm';
    } else {
      lanes = [['A: air', vGas(GASES[0], P.gas.TC)], ['B: ' + GASES[P.gas.gas][0].toLowerCase(), vGas(GASES[P.gas.gas], P.gas.TC)]]; D = 343; slow = 4; unit = 'm';
    }
    var x0 = 30, x1 = s.w - 30, ppm2 = (x1 - x0) / D;
    lanes.forEach(function (ln, i) {
      var y = s.h * (0.32 + 0.4 * i), dist = Math.min(D, ln[1] * el / slow), px = x0 + dist * ppm2, done = ln[1] * el / slow >= D;
      WAV.text(ctx, ln[0], x0, y - 40, { size: 12, color: i ? th.violet : th.accent, align: 'left', weight: 700 });
      WAV.line(ctx, x1, y - 30, x1, y + 30, th.ink3, 2, [4, 3]);
      if (mode === 'string') {
        WAV.path(ctx, 200, function (u) { var xx = x0 + u * (x1 - x0), d = done ? 0 : WAV.bump(xx - px, 9); return [xx, y - d * 24]; }, i ? th.violet : th.accent, 2.4);
      } else {
        for (var q = 0; q < 70; q++) { var xx = x0 + q * (x1 - x0) / 69, d = done ? 0 : WAV.bump(xx - px, 10); var sh = d * 5; WAV.line(ctx, xx + sh, y - 22, xx + sh, y + 22, i ? th.violet : th.accent, 1.4, null, 0.35 + d * 0.65); }
      }
      if (done) WAV.text(ctx, (D / ln[1]).toFixed(D / ln[1] < 0.1 ? 3 : 2) + ' s ✓', x1 - 6, y - 40, { size: 12, color: th.ok, align: 'right', weight: 800 });
    });
    WAV.text(ctx, D + ' ' + unit + ' track · shown ' + slow + '× slower than real life', s.w / 2, s.h - 12, { size: 10, color: th.ink3, weight: 700 });
    outA(lanes[0][1].toFixed(0) + ' m/s', mode === 'string' ? 'v = √(T/μ)' : 'v = √(γRT/M)');
    outB(lanes[1][1].toFixed(0) + ' m/s', mode === 'string' ? '×4 tension → ×2 speed' : 'γ = ' + GASES[P.gas.gas][1] + ', M = ' + GASES[P.gas.gas][2] * 1000 + ' g/mol');
    outR('B/A = ' + (lanes[1][1] / lanes[0][1]).toFixed(2), 'time ratio is the inverse');
    if (el * Math.min(lanes[0][1], lanes[1][1]) / slow > D * 1.3 && el > 2) race();
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 300, maxHeight: 420, hint: '' });

/* ═══════════════════════════ Lesson 4: pulses meet and bounce ═══════════════════════════ */
Sim.register('wav-pulse-lab', function (stage) {
  'use strict';
  var host = stage.host.closest('[data-sim]'), mode = (host && host.dataset.mode) || 'meet', flip = false, comps = true, t = 0, playing = true, tick = WAV.clock();
  var outM = stage.readout('What happens'), outR = stage.readout('Reflected pulse'), outT = stage.readout('Transmitted pulse');
  WAV.radio(stage, [['meet', 'Two pulses meet'], ['fixed', 'Fixed end'], ['free', 'Free end'], ['heavy', 'Into a heavier string'], ['light', 'Into a lighter string']], mode, function (v) { mode = v; t = 0; });
  stage.button({ label: 'Send again', onClick: function () { t = 0; } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.toggle({ label: 'Flip the second pulse', value: false, onChange: function (on) { flip = on; t = 0; } });
  stage.toggle({ label: 'Show the separate pulses', value: true, onChange: function (on) { comps = on; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var W = s.w, cy = s.h * 0.56, Ap = mode === 'meet' ? Math.min(s.h * 0.17, 46) : Math.min(s.h * 0.24, 60), sig = Math.max(14, W * 0.032), v1 = W / 3.4, X0 = -3 * sig, xb = mode === 'meet' ? W : W * 0.66;
    var v2 = mode === 'heavy' ? v1 / 2 : mode === 'light' ? 2 * v1 : v1;
    var r = mode === 'fixed' ? -1 : mode === 'free' ? 1 : mode === 'heavy' ? -1 / 3 : mode === 'light' ? 1 / 3 : 0, tr = 1 + r;
    var tEnd = mode === 'meet' ? (W + 6 * sig) / v1 + 0.6 : (2 * xb - X0 + 3 * sig) / v1 + 0.6;
    if (t > tEnd + 0.8) t = 0;
    var g = function (u) { return WAV.bump(u, sig); };
    var inc = function (x) { return g(x - X0 - v1 * t); };
    var refl = function (x) { return r * g(2 * xb - x - X0 - v1 * t); };
    var trans = function (x) { return tr * g((xb - X0 - v1 * t) + (x - xb) * v1 / v2); };
    var second = function (x) { return (flip ? -1 : 1) * g(x - (W + 3 * sig - v1 * t)); };
    function total(x) {
      if (mode === 'meet') return inc(x) + second(x);
      if (x <= xb) return inc(x) + refl(x);
      return (mode === 'heavy' || mode === 'light') ? trans(x) : 0;
    }
    var xEnd = (mode === 'fixed' || mode === 'free') ? xb : W;
    if (comps) {
      if (mode === 'meet') { WAV.path(ctx, 200, function (u) { var x = u * W; return [x, cy - inc(x) * Ap]; }, th.accent, 1.4, { dash: [5, 4], alpha: 0.8 }); WAV.path(ctx, 200, function (u) { var x = u * W; return [x, cy - second(x) * Ap]; }, th.violet, 1.4, { dash: [5, 4], alpha: 0.8 }); }
      else { WAV.path(ctx, 160, function (u) { var x = u * xb; return [x, cy - inc(x) * Ap]; }, th.accent, 1.4, { dash: [5, 4], alpha: 0.8 }); if (r) WAV.path(ctx, 160, function (u) { var x = u * xb; return [x, cy - refl(x) * Ap]; }, th.violet, 1.4, { dash: [5, 4], alpha: 0.8 }); }
    }
    // the string(s)
    WAV.path(ctx, 300, function (u) { var x = u * Math.min(xEnd, xb); return [x, cy - total(x) * Ap]; }, th.ink, 2.8);
    if (mode === 'heavy' || mode === 'light') {
      WAV.path(ctx, 200, function (u) { var x = xb + u * (W - xb); return [x, cy - total(x) * Ap]; }, th.warn, mode === 'heavy' ? 5 : 1.6);
      WAV.dot(ctx, xb, cy - total(xb) * Ap, 4, th.ink2);
      WAV.text(ctx, mode === 'heavy' ? 'heavier string: slower' : 'lighter string: faster', (xb + W) / 2, cy + Ap + 26, { size: 11, color: th.warn, weight: 700 });
    }
    if (mode === 'fixed') { ctx.save(); ctx.fillStyle = th.ink3; ctx.globalAlpha = 0.35; ctx.fillRect(xb, cy - Ap - 20, 14, 2 * Ap + 40); ctx.restore(); WAV.line(ctx, xb, cy - Ap - 20, xb, cy + Ap + 20, th.ink2, 2.5); WAV.text(ctx, 'clamped', xb + 30, cy + Ap + 30, { size: 11, color: th.ink3, weight: 700 }); }
    if (mode === 'free') { WAV.line(ctx, xb + 2, cy - Ap - 26, xb + 2, cy + Ap + 26, th.ink3, 3); WAV.ring(ctx, xb, cy - total(xb) * Ap, 6, th.ink, 2); WAV.text(ctx, 'ring slides on a smooth rod', xb + 10, cy + Ap + 34, { size: 11, color: th.ink3, weight: 700, align: 'left' }); }
    var msg = mode === 'meet' ? (flip ? 'They cancel for an instant, then pass through unchanged.' : 'They add to twice the height, then pass through unchanged.')
      : mode === 'fixed' ? 'Comes back upside down: a phase change of π.' : mode === 'free' ? 'Comes back the right way up: no phase change.'
      : mode === 'heavy' ? 'Part comes back inverted; part goes on, upright and slower.' : 'Part comes back upright; part goes on, upright and faster.';
    WAV.wrap(ctx, msg, 16, 14, Math.min(520, s.w - 32), { size: 13, color: th.ink2 });
    outM(mode === 'meet' ? 'superposition' : 'reflection' + (r && Math.abs(r) < 1 ? ' + transmission' : ''), 'y = y₁ + y₂ wherever they overlap');
    outR(mode === 'meet' ? '—' : (r < 0 ? 'inverted' : 'upright') + ', ' + Math.round(Math.abs(r) * 100) + '% height', mode === 'meet' ? '' : r < 0 ? 'phase change π' : 'no phase change');
    outT(mode === 'heavy' || mode === 'light' ? 'upright, ' + Math.round(tr * 100) + '% height' : '—', mode === 'heavy' ? 'v halves, pulse gets narrower' : mode === 'light' ? 'v doubles, pulse gets wider' : '');
  });
}, { unitsWide: 10, aspect: 0.42, minHeight: 280, maxHeight: 380, hint: '' });

/* ═══════════════════════════ Lesson 4: two sources, one pond ═══════════════════════════ */
Sim.register('wav-ripple-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, lamCm = 20, anti = false, map = false, t = 0, playing = true, tick = WAV.clock(), CELL = 4, off = null, offCtx = null, img = null, init = false;
  var S1 = stage.handle({ x: -3, y: 0.8, radius: 11 }), S2 = stage.handle({ x: -3, y: -0.8, radius: 11 }), M = stage.handle({ x: 3, y: 1, radius: 13 });
  var outD = stage.readout('Path difference at the mic'), outL = stage.readout('At the mic'), outS = stage.readout('Source separation');
  stage.slider({ label: 'Wavelength λ', min: 10, max: 40, step: 1, value: lamCm, format: function (v) { return v + ' cm'; }, onInput: function (v) { lamCm = v; } });
  stage.toggle({ label: 'Loudness map', value: false, onChange: function (on) { map = on; } });
  stage.toggle({ label: 'Sources out of phase', value: false, onChange: function (on) { anti = on; } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    if (!init) { var b = s.bounds(); S1.x = S2.x = b.xmin * 0.55; S1.y = 0.9; S2.y = -0.9; M.x = b.xmax * 0.6; M.y = 1.2; init = true; }
    var pxPerM = s.w / 2, lam = lamCm / 100 * pxPerM, k = TAU / lam, w = TAU * 0.9, sgn = anti ? -1 : 1;
    var p1 = s.toScreen(S1.x, S1.y), p2 = s.toScreen(S2.x, S2.y), pm = s.toScreen(M.x, M.y);
    var GW = Math.ceil(s.w / CELL), GH = Math.ceil(s.h / CELL);
    if (!off || off.width !== GW || off.height !== GH) { off = document.createElement('canvas'); off.width = GW; off.height = GH; offCtx = off.getContext('2d'); img = offCtx.createImageData(GW, GH); }
    var cp = WAV.rgb(th.accent), cn = WAV.rgb(th.violet), d = img.data, ph = w * t;
    for (var j = 0; j < GH; j++) for (var i = 0; i < GW; i++) {
      var x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, r1 = Math.hypot(x - p1[0], y - p1[1]), r2 = Math.hypot(x - p2[0], y - p2[1]);
      var a1 = 1 / Math.sqrt(1 + r1 / (2 * lam)), a2 = 1 / Math.sqrt(1 + r2 / (2 * lam)), val;
      if (map) val = Math.sqrt(Math.max(0, a1 * a1 + a2 * a2 + 2 * sgn * a1 * a2 * Math.cos(k * (r1 - r2)))) / 2;
      else val = (a1 * Math.sin(k * r1 - ph) + sgn * a2 * Math.sin(k * r2 - ph)) / 2;
      var c = val >= 0 ? cp : cn, o = (j * GW + i) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.min(255, Math.abs(val) * (map ? 330 : 300));
    }
    offCtx.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, GW * CELL, GH * CELL); ctx.restore();
    [p1, p2].forEach(function (p, i) { WAV.dot(ctx, p[0], p[1], 9, th.ink); WAV.text(ctx, 'S' + (i + 1), p[0], p[1] - 18, { size: 11, color: th.ink, weight: 800 }); });
    var r1m = Math.hypot(pm[0] - p1[0], pm[1] - p1[1]), r2m = Math.hypot(pm[0] - p2[0], pm[1] - p2[1]), dl = Math.abs(r1m - r2m) / lam;
    WAV.line(ctx, p1[0], p1[1], pm[0], pm[1], th.ink2, 1, [3, 4], 0.7); WAV.line(ctx, p2[0], p2[1], pm[0], pm[1], th.ink2, 1, [3, 4], 0.7);
    WAV.ring(ctx, pm[0], pm[1], 12, th.ink, 2.4); WAV.dot(ctx, pm[0], pm[1], 4, th.ink); WAV.text(ctx, 'mic', pm[0], pm[1] + 22, { size: 11, color: th.ink, weight: 800 });
    var amp = Math.sqrt(Math.max(0, 2 + 2 * sgn * Math.cos(TAU * (r1m - r2m) / lam))) / 2, frac = dl - Math.floor(dl);
    var loud = anti ? Math.abs(frac - 0.5) < 0.12 : (frac < 0.12 || frac > 0.88), quiet = anti ? (frac < 0.12 || frac > 0.88) : Math.abs(frac - 0.5) < 0.12;
    outD(dl.toFixed(2) + ' λ', '|S₁M − S₂M| = ' + (Math.abs(r1m - r2m) / pxPerM * 100).toFixed(1) + ' cm');
    outL(loud ? 'loud (constructive)' : quiet ? 'quiet (destructive)' : 'in between', 'amplitude ' + Math.round(amp * 100) + '% of the maximum');
    outS((Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) / lam).toFixed(1) + ' λ', anti ? 'sources out of phase: rules swap' : 'sources in phase');
  });
}, { unitsWide: 10, aspect: 0.55, minHeight: 300, maxHeight: 460, hint: 'Drag the sources and the microphone' });

/* ═══════════════════════════ Lesson 5: standing waves on a string ═══════════════════════════ */
Sim.register('wav-string-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, mode = 'pick', n = 2, T = 100, mu = 1, L = 1, fd = 300, comps = false, t = 0, playing = true, tick = WAV.clock();
  function v() { return Math.sqrt(T / (mu / 1000)); }
  var outF = stage.readout('Frequency'), outL = stage.readout('Wavelength'), outN = stage.readout('Harmonic'), outV = stage.readout('Wave speed √(T/μ)');
  WAV.radio(stage, [['pick', 'Pick a harmonic'], ['drive', 'Drive it']], mode, function (m) { mode = m; build(); });
  stage.toggle({ label: 'Show the two travelling waves', value: false, onChange: function (on) { comps = on; } });
  stage.button({ label: '♪ Hear it', onClick: function () { var f = mode === 'pick' ? n * v() / (2 * L) : fd; if (f > 20 && f < 5000) WAV.Sound.play([[f, 1], [2 * f, 0.18], [3 * f, 0.06]], { dur: 2.2, attack: 0.02, decay: true, gain: 0.9 }); } });
  function build() {
    stage.controls.innerHTML = '';
    if (mode === 'pick') stage.slider({ label: 'Harmonic n', min: 1, max: 8, step: 1, value: n, format: function (x) { return 'n = ' + x; }, onInput: function (x) { n = x; } });
    else stage.slider({ label: 'Driving frequency', min: 20, max: 1400, step: 1, value: fd, format: function (x) { return x + ' Hz'; }, onInput: function (x) { fd = x; } });
    stage.slider({ label: 'Tension T', min: 10, max: 400, step: 5, value: T, format: function (x) { return x + ' N'; }, onInput: function (x) { T = x; } });
    stage.slider({ label: 'Mass per length μ', min: 0.5, max: 10, step: 0.5, value: mu, format: function (x) { return x + ' g/m'; }, onInput: function (x) { mu = x; } });
    stage.slider({ label: 'Length L', min: 0.3, max: 1.5, step: 0.05, value: L, format: function (x) { return x.toFixed(2) + ' m'; }, onInput: function (x) { L = x; } });
  }
  build();
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var vv = v(), x0 = 34, x1 = s.w - 34, cy = s.h * 0.5, Amax = Math.min(s.h * 0.3, 80), ph = TAU * 0.7 * t, c = Math.cos(ph);
    WAV.line(ctx, x0 - 10, cy - Amax - 18, x0 - 10, cy + Amax + 18, th.ink2, 3); WAV.line(ctx, x1 + 10, cy - Amax - 18, x1 + 10, cy + Amax + 18, th.ink2, 3);
    WAV.line(ctx, x0, cy, x1, cy, th.ink3, 1, [3, 5], 0.5);
    var shape, amp, f, label = '';
    if (mode === 'pick') {
      f = n * vv / (2 * L); amp = Amax * 0.5;
      shape = function (u) { return Math.sin(n * Math.PI * u); };
      WAV.path(ctx, 240, function (u) { return [x0 + u * (x1 - x0), cy - amp * shape(u)]; }, th.accent, 1, { alpha: 0.35, dash: [2, 4] });
      WAV.path(ctx, 240, function (u) { return [x0 + u * (x1 - x0), cy + amp * shape(u)]; }, th.accent, 1, { alpha: 0.35, dash: [2, 4] });
      if (comps) {
        WAV.path(ctx, 240, function (u) { return [x0 + u * (x1 - x0), cy - amp / 2 * Math.sin(n * Math.PI * u - ph)]; }, th.violet, 1.6, { dash: [5, 4], alpha: 0.85 });
        WAV.path(ctx, 240, function (u) { return [x0 + u * (x1 - x0), cy - amp / 2 * Math.sin(n * Math.PI * u + ph)]; }, th.warn, 1.6, { dash: [5, 4], alpha: 0.85 });
      }
      WAV.path(ctx, 240, function (u) { return [x0 + u * (x1 - x0), cy - amp * shape(u) * c]; }, th.accent, 3);
      for (var j = 0; j <= n; j++) { var xn = x0 + (x1 - x0) * j / n; WAV.text(ctx, 'N', xn, cy + amp + 22, { size: 11, color: th.ink2, weight: 800 }); WAV.dot(ctx, xn, cy, 3.5, th.ink2); }
      for (j = 0; j < n; j++) { var xa = x0 + (x1 - x0) * (j + 0.5) / n; WAV.text(ctx, 'A', xa, cy - amp - 16, { size: 11, color: th.accent, weight: 800 }); }
      label = n === 1 ? 'fundamental' : (n - 1) + (n === 2 ? 'st' : n === 3 ? 'nd' : n === 4 ? 'rd' : 'th') + ' overtone';
      outN('n = ' + n, label + ' · ' + n + ' loop' + (n > 1 ? 's' : '') + ', ' + (n + 1) + ' nodes');
    } else {
      f = fd; var k = TAU * fd / vv, kL = k * L, den = Math.sin(kL), a0 = Amax * 0.06, gain = Math.min(Amax / a0, 1 / Math.max(Math.abs(den), 0.06));
      shape = function (u) { return Math.sin(k * L * (1 - u)) / (Math.abs(den) < 1e-9 ? 1e-9 : den); };
      var mx = 0; for (var q = 0; q <= 60; q++) mx = Math.max(mx, Math.abs(shape(q / 60)));
      var scale = Math.min(a0, Amax / (mx || 1)); void gain;
      WAV.path(ctx, 300, function (u) { return [x0 + u * (x1 - x0), cy - scale * shape(u) * c]; }, th.accent, 3);
      ctx.save(); ctx.fillStyle = th.violet; ctx.globalAlpha = 0.7; WAV.rrect(ctx, x0 - 26, cy - 12 + a0 * c, 14, 24, 4); ctx.fill(); ctx.restore();
      WAV.text(ctx, 'vibrator', x0 - 19, cy + 30, { size: 10, color: th.violet, weight: 700 });
      var nn = Math.max(1, Math.round(2 * L * fd / vv)), fn = nn * vv / (2 * L), res = Math.abs(fd - fn) < Math.max(2, fn * 0.012);
      if (res) WAV.text(ctx, 'Resonance! n = ' + nn, s.w / 2, 20, { size: 15, color: th.ok, weight: 800 });
      outN(res ? 'resonating, n = ' + nn : 'nearest: n = ' + nn + ' at ' + fn.toFixed(0) + ' Hz', 'resonances are f₁, 2f₁, 3f₁ …');
    }
    WAV.text(ctx, 'slowed down to be visible', s.w - 12, s.h - 10, { size: 10, color: th.ink3, align: 'right', weight: 700 });
    outF(f.toFixed(0) + ' Hz', mode === 'pick' ? 'f = (n/2L)√(T/μ)' : 'set by the vibrator');
    outL((vv / f).toFixed(2) + ' m', mode === 'pick' ? 'λ = 2L/n' : 'λ = v/f');
    outV(vv.toFixed(0) + ' m/s', 'f₁ = ' + (vv / (2 * L)).toFixed(0) + ' Hz for this string');
  });
}, { unitsWide: 10, aspect: 0.4, minHeight: 260, maxHeight: 360, hint: '' });

/* ═══════════════════════════ Lesson 6: air columns ═══════════════════════════ */
Sim.register('wav-pipe-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, kind = 'open', m = 1, L = 0.5, TC = 20, pres = true, t = 0, playing = true, tick = WAV.clock(), cols = 34, rows = 5;
  function vs() { return 331.3 * Math.sqrt((TC + 273.15) / 273.15); }
  function harm() { return kind === 'open' ? m : 2 * m - 1; }
  function freq() { return kind === 'open' ? m * vs() / (2 * L) : (2 * m - 1) * vs() / (4 * L); }
  var outF = stage.readout('Frequency'), outH = stage.readout('Harmonic'), outL = stage.readout('Wavelength'), outV = stage.readout('Speed of sound');
  WAV.radio(stage, [['open', 'Open at both ends'], ['closed', 'Closed at one end']], kind, function (v) { kind = v; });
  stage.toggle({ label: 'Show pressure', value: true, onChange: function (on) { pres = on; } });
  stage.button({ label: '♪ Hear this mode', onClick: function () { WAV.Sound.play([[freq(), 1]], { dur: 2, gain: 0.8 }); } });
  stage.button({ label: '♪ Hear the pipe', onClick: function () {
    var f1 = kind === 'open' ? vs() / (2 * L) : vs() / (4 * L), parts = [];
    for (var h = 1; h <= 9; h++) { if (kind === 'closed' && h % 2 === 0) continue; if (h * f1 < 5000) parts.push([h * f1, 1 / h]); }
    WAV.Sound.play(parts, { dur: 2.4, attack: 0.08, gain: 0.85 });
  } });
  stage.slider({ label: 'Mode', min: 1, max: 5, step: 1, value: m, format: function (x) { return kind === 'open' ? 'n = ' + x : 'n = ' + (2 * x - 1); }, onInput: function (x) { m = x; } });
  stage.slider({ label: 'Pipe length L', min: 0.2, max: 1.5, step: 0.05, value: L, format: function (x) { return x.toFixed(2) + ' m'; }, onInput: function (x) { L = x; } });
  stage.slider({ label: 'Air temperature', min: 0, max: 40, step: 1, value: TC, format: function (x) { return x + ' °C'; }, onInput: function (x) { TC = x; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var x0 = 40, x1 = s.w - 40, pw = x1 - x0, cy = s.h * 0.5, ph = s.h * 0.2, top = cy - ph / 2, bot = cy + ph / 2, c = Math.cos(TAU * 0.6 * t), K = harm();
    var S = kind === 'open' ? function (u) { return Math.cos(K * Math.PI * u); } : function (u) { return Math.sin(K * Math.PI * u / 2); };
    var Pf = kind === 'open' ? function (u) { return Math.sin(K * Math.PI * u); } : function (u) { return -Math.cos(K * Math.PI * u / 2); };
    // in the closed pipe the closed end is on the LEFT: u = 0 there
    var Sx = kind === 'open' ? S : function (u) { return S(u); };
    ctx.save(); ctx.fillStyle = th.violet; ctx.globalAlpha = 0.07; ctx.fillRect(x0, top, pw, ph); ctx.restore();
    WAV.line(ctx, x0, top, x1, top, th.ink2, 2.4); WAV.line(ctx, x0, bot, x1, bot, th.ink2, 2.4);
    if (kind === 'closed') WAV.line(ctx, x0, top - 6, x0, bot + 6, th.ink, 6);
    var amp = Math.min(pw / cols * 0.9, 14);
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var u = (i + 0.5) / cols, xx = x0 + u * pw + amp * Sx(u) * c, yy = top + ph * (j + 0.5) / rows;
      WAV.dot(ctx, xx, yy, 2.3, th.ink, 0.85);
    }
    // displacement envelope above, pressure below
    var ea = Math.min(s.h * 0.13, 40), ey = top - 16 - ea;
    WAV.path(ctx, 200, function (u) { return [x0 + u * pw, ey - ea * S(u)]; }, th.accent, 2.2);
    WAV.path(ctx, 200, function (u) { return [x0 + u * pw, ey + ea * S(u)]; }, th.accent, 2.2, { dash: [5, 4], alpha: 0.7 });
    Sim.label(ctx, s.w < 560 ? 'top: displacement · bottom: pressure' : 'top: displacement · bottom: pressure · solid and dashed: the two extremes', s.w - 12, s.h - 10, { size: 10, weight: 700, color: th.ink3, align: 'right', plate: th.plate });
    var nodes = [];
    for (var q = 0; q <= 400; q++) { var uu = q / 400, sv = S(uu); if (Math.abs(sv) < 0.008 || (q && Math.sign(sv) !== Math.sign(S((q - 1) / 400)))) nodes.push(uu); }
    var seen = []; nodes.forEach(function (uu) { if (seen.every(function (z) { return Math.abs(z - uu) > 0.02; })) seen.push(uu); });
    seen.forEach(function (uu) { WAV.text(ctx, 'N', x0 + uu * pw, ey, { size: 11, color: th.ink2, weight: 800 }); });
    for (q = 0; q < K + (kind === 'open' ? 1 : 0); q++) { var u2 = kind === 'open' ? q / K : (2 * q + 1) / K; if (u2 <= 1.0001) WAV.text(ctx, 'A', x0 + u2 * pw, ey - ea - 12, { size: 11, color: th.accent, weight: 800 }); }
    if (pres) {
      var py = bot + 16 + ea;
      WAV.path(ctx, 200, function (u) { return [x0 + u * pw, py - ea * Pf(u)]; }, th.violet, 2.2);
      WAV.path(ctx, 200, function (u) { return [x0 + u * pw, py + ea * Pf(u)]; }, th.violet, 2.2, { dash: [5, 4], alpha: 0.7 });
    }
    WAV.text(ctx, kind === 'closed' ? 'closed end' : 'open end', x0 + 4, top - 8, { size: 10, color: th.ink3, weight: 700, align: 'left' });
    var f = freq(), nH = harm(), names = ['1st harmonic', '2nd harmonic', '3rd harmonic', '4th harmonic', '5th harmonic', '6th harmonic', '7th harmonic', '8th harmonic', '9th harmonic'];
    outF(f.toFixed(0) + ' Hz', kind === 'open' ? 'f = nv/2L, n = 1, 2, 3 …' : 'f = nv/4L, n = 1, 3, 5 … only');
    outH(names[nH - 1], m === 1 ? 'fundamental' : 'overtone ' + (m - 1));
    outL((vs() / f).toFixed(2) + ' m', kind === 'open' ? 'L = nλ/2' : 'L = nλ/4');
    outV(vs().toFixed(0) + ' m/s', 'at ' + TC + ' °C: v ∝ √T');
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 300, maxHeight: 420, hint: '' });

/* ═══════════════════════════ Lesson 6: the resonance-tube experiment ═══════════════════════════ */
Sim.register('wav-tube-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, fork = 512, v = 343, e = 0.012, l = 0.1, recs = [], strike = -10, t = 0, tick = WAV.clock(), G = null;
  function lam() { return v / fork; }
  function loud(len) { var sum = 0; for (var n = 1; n <= 4; n++) { var d = (len + e - (2 * n - 1) * lam() / 4) / 0.009; sum += 1 / (1 + d * d); } return Math.min(1, sum); }
  var W = stage.handle({ x: 0, y: 0, radius: 16 });
  W.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); l = WAV.clamp((p[1] - G.top) / G.ppm, 0.05, 0.98); };
  var outL = stage.readout('Air column l'), outD = stage.readout('Loudness'), outR = stage.readout('Recorded'), outV = stage.readout('Your result');
  WAV.radio(stage, [[320, '320 Hz fork'], [384, '384 Hz fork'], [512, '512 Hz fork']], fork, function (f) { fork = f; recs = []; });
  stage.button({ label: '♪ Strike the fork', onClick: function () { strike = t; WAV.Sound.play([[fork, 1], [fork * 6.3, 0.02]], { dur: 3.2, attack: 0.01, decay: true, gain: 0.12 + 0.85 * loud(l) }); } });
  stage.button({ label: 'Record this length', onClick: function () { if (recs.length < 4) { recs.push(l); recs.sort(function (a, b) { return a - b; }); WAV.fx('select'); } } });
  stage.button({ label: 'Clear', onClick: function () { recs = []; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, WAV.motion()); t += dt;
    var cx = s.w * 0.3, tw = 46, top = 56, bot = s.h - 20, ppm = (bot - top) / 1.0, ys = top + l * ppm, R = loud(l), ring = Math.max(0, 1 - (t - strike) / 3.2);
    G = { top: top, ppm: ppm };
    // water
    ctx.save(); ctx.fillStyle = th.violet; ctx.globalAlpha = 0.28; ctx.fillRect(cx - tw / 2, ys, tw, bot - ys); ctx.restore();
    WAV.line(ctx, cx - tw / 2, ys, cx + tw / 2, ys, th.violet, 2);
    WAV.line(ctx, cx - tw / 2, top, cx - tw / 2, bot, th.ink2, 2.4); WAV.line(ctx, cx + tw / 2, top, cx + tw / 2, bot, th.ink2, 2.4); WAV.line(ctx, cx - tw / 2, bot, cx + tw / 2, bot, th.ink2, 2.4);
    // scale
    for (var cm = 0; cm <= 100; cm += 10) { var yy = top + cm / 100 * ppm; WAV.line(ctx, cx + tw / 2 + 4, yy, cx + tw / 2 + (cm % 50 ? 9 : 14), yy, th.ink3, 1); if (cm % 20 === 0) WAV.text(ctx, cm + '', cx + tw / 2 + 18, yy, { size: 9, color: th.ink3, align: 'left', weight: 700 }); }
    WAV.text(ctx, 'cm', cx + tw / 2 + 18, top - 10, { size: 9, color: th.ink3, align: 'left', weight: 700 });
    // standing-wave envelope in the air column (node at the water, antinode just above the mouth)
    var amp = (tw / 2 - 4) * R * Math.max(ring, 0.12), wob = Math.cos(TAU * 3 * t);
    WAV.path(ctx, 120, function (u) { var y = ys - u * (ys - top + e * ppm), z = (ys - y) / ppm; return [cx + amp * Math.sin(TAU * z / lam()) * wob, y]; }, th.accent, 2.2, { alpha: 0.85 });
    WAV.path(ctx, 120, function (u) { var y = ys - u * (ys - top + e * ppm), z = (ys - y) / ppm; return [cx - amp * Math.sin(TAU * z / lam()) * wob, y]; }, th.accent, 1.4, { alpha: 0.5, dash: [4, 4] });
    // tuning fork above the mouth
    var fv = ring > 0 && WAV.motion() ? Math.sin(TAU * 9 * t) * 2 * ring : 0;
    ctx.save(); ctx.strokeStyle = th.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(cx - 9 - fv, top - 44); ctx.lineTo(cx - 9 - fv, top - 18); ctx.moveTo(cx + 9 + fv, top - 44); ctx.lineTo(cx + 9 + fv, top - 18); ctx.moveTo(cx - 9, top - 18); ctx.quadraticCurveTo(cx, top - 8, cx + 9, top - 18); ctx.moveTo(cx, top - 12); ctx.lineTo(cx, top - 4); ctx.stroke(); ctx.restore();
    WAV.text(ctx, fork + ' Hz', cx + 22, top - 34, { size: 11, color: th.ink2, align: 'left', weight: 700 });
    // water-level handle
    var hp = s.toWorld(cx, ys); if (!W.active) { W.x = hp[0]; W.y = hp[1]; }
    WAV.ring(ctx, cx, ys, W.active || s.focused(W) ? 13 : 10, th.violet, 2.4);
    if (s.w > 520) WAV.text(ctx, 'drag the water level', cx - tw / 2 - 8, ys, { size: 10, color: th.violet, align: 'right', weight: 700 });
    // loudness meter
    var mx = s.w * 0.62, mw = 26, mh = s.h - 120, my = 60;
    ctx.save(); ctx.fillStyle = th.grid; WAV.rrect(ctx, mx, my, mw, mh, 8); ctx.fill(); ctx.fillStyle = R > 0.6 ? th.ok : th.accent; WAV.rrect(ctx, mx, my + mh * (1 - R), mw, mh * R, 8); ctx.fill(); ctx.restore();
    WAV.text(ctx, 'loudness', mx + mw / 2, my - 14, { size: 10, color: th.ink3, weight: 700 });
    if (R > 0.6) WAV.text(ctx, 'Resonance!', mx + mw + 12, my + mh * (1 - R) + 8, { size: 14, color: th.ok, align: 'left', weight: 800 });
    recs.forEach(function (r, i) { var yy = top + r * ppm; WAV.line(ctx, cx - tw / 2 - 30, yy, cx - tw / 2 - 4, yy, th.warn, 2); WAV.text(ctx, 'l' + (i + 1), cx - tw / 2 - 36, yy, { size: 11, color: th.warn, align: 'right', weight: 800 }); });
    outL((l * 100).toFixed(1) + ' cm', 'mouth to water');
    outD(Math.round(R * 100) + '%', R > 0.6 ? 'resonating: record it' : 'lower the water slowly');
    outR(recs.length ? recs.map(function (r) { return (r * 100).toFixed(1); }).join(', ') + ' cm' : 'none yet', 'first two resonances');
    if (recs.length >= 2) {
      var l1 = recs[0], l2 = recs[1], vv = 2 * fork * (l2 - l1), ee = (l2 - 3 * l1) / 2;
      outV('v ≈ ' + vv.toFixed(0) + ' m/s', 'e = (l₂ − 3l₁)/2 ≈ ' + (ee * 100).toFixed(1) + ' cm');
    } else outV('—', 'v = 2f(l₂ − l₁)');
  });
}, { unitsWide: 10, aspect: 0.62, minHeight: 380, maxHeight: 520, hint: 'Drag the water level, then strike the fork' });

/* ═══════════════════════════ Lesson 7: beats ═══════════════════════════ */
Sim.register('wav-beats-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, f1 = 256, f2 = 260, mystery = false, hidden = 0, t = 0, tick = WAV.clock(), playing = true, s2 = null;
  var outB = stage.readout('Beat frequency |f₁ − f₂|'), outT = stage.readout('Time between beats'), outM = stage.readout('Heard pitch');
  var s1 = stage.slider({ label: 'Tone 1 (your string)', min: 240, max: 280, step: 0.5, value: f1, format: function (v) { return v.toFixed(1) + ' Hz'; }, onInput: function (v) { f1 = v; } });
  s2 = stage.slider({ label: 'Tone 2 (tuning fork)', min: 240, max: 280, step: 0.5, value: f2, format: function (v) { return mystery ? '? Hz' : v.toFixed(1) + ' Hz'; }, onInput: function (v) { if (!mystery) f2 = v; else s2.set(f2); } });
  stage.button({ label: '♪ Play both (4 s)', onClick: function () { WAV.Sound.play([[f1, 1], [f2, 1]], { dur: 4, gain: 0.9 }); } });
  var mBtn = stage.toggle({ label: 'Mystery fork game', value: false, onChange: function (on) { mystery = on; if (on) newFork(); else s2.set(f2); } });
  stage.button({ label: 'New mystery fork', onClick: function () { if (!mystery) { mystery = true; mBtn.setAttribute('aria-pressed', 'true'); } newFork(); } });
  function newFork() { do { hidden = Math.round((f1 + (Math.random() * 12 - 6)) * 2) / 2; } while (Math.abs(hidden - f1) < 1.5 || hidden < 242 || hidden > 278); f2 = hidden; s2.set(f2); }
  void s1;
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    var df = Math.abs(f1 - f2), win = 2, tc = t % win;
    // zoom: 12 ms of both waves, at the moving cursor time
    var Z = { x: 40, y: 18, w: s.w - 58, h: s.h * 0.3 };
    WAV.frame(ctx, Z, th, '', th.ink2);
    WAV.path(ctx, 260, function (u) { var tt = tc + u * 0.012; return [Z.x + u * Z.w, Z.y + Z.h / 2 - Math.sin(TAU * f1 * tt) * Z.h * 0.42]; }, th.accent, 2);
    WAV.path(ctx, 260, function (u) { var tt = tc + u * 0.012; return [Z.x + u * Z.w, Z.y + Z.h / 2 - Math.sin(TAU * f2 * tt) * Z.h * 0.42]; }, th.violet, 2, { alpha: 0.9 });
    var rel = Math.cos(Math.PI * (f1 - f2) * tc);
    Sim.label(ctx, '12 ms close-up at the cursor · ' + (Math.abs(rel) > 0.85 ? 'in step → loud' : Math.abs(rel) < 0.3 ? 'opposite → quiet' : 'drifting'), Z.x + Z.w - 4, Z.y + 10, { size: 10, color: th.ink2, align: 'right', weight: 700, plate: th.plate });
    // the sum over 2 s: the carrier is too fast to see, so it fills a band; the envelope is the beat
    var B = { x: 40, y: Z.y + Z.h + 34, w: s.w - 58, h: s.h - (Z.y + Z.h + 34) - 26 };
    WAV.frame(ctx, B, th, 'y', th.warn);
    ctx.save(); ctx.strokeStyle = th.warn; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.beginPath();
    for (var px = 0; px <= B.w; px += 1) { var tt = px / B.w * win, env = Math.abs(2 * Math.cos(Math.PI * (f1 - f2) * tt)), yy = env * B.h * 0.23; ctx.moveTo(B.x + px, B.y + B.h / 2 - yy); ctx.lineTo(B.x + px, B.y + B.h / 2 + yy); }
    ctx.stroke(); ctx.restore();
    WAV.path(ctx, 300, function (u) { var tt = u * win; return [B.x + u * B.w, B.y + B.h / 2 - Math.abs(2 * Math.cos(Math.PI * (f1 - f2) * tt)) * B.h * 0.23]; }, th.warn, 2.2);
    WAV.line(ctx, B.x + tc / win * B.w, B.y - 4, B.x + tc / win * B.w, B.y + B.h + 4, th.ink, 1.4, null, 0.8);
    WAV.text(ctx, '0', B.x, B.y + B.h + 12, { size: 10, color: th.ink3, weight: 700 }); WAV.text(ctx, '1 s', B.x + B.w / 2, B.y + B.h + 12, { size: 10, color: th.ink3, weight: 700 }); WAV.text(ctx, '2 s', B.x + B.w, B.y + B.h + 12, { size: 10, color: th.ink3, weight: 700 });
    Sim.label(ctx, 'sum of the two tones over 2 s: count the swells', B.x + B.w - 4, B.y + 10, { size: 10, color: th.ink2, align: 'right', weight: 700, plate: th.plate });
    if (mystery && df < 0.25) WAV.text(ctx, 'In tune! The fork is ' + hidden.toFixed(1) + ' Hz.', s.w / 2, B.y + B.h / 2, { size: 18, color: th.ok, weight: 800 });
    outB(mystery && df >= 0.25 ? 'count them!' : df.toFixed(1) + ' per second', mystery ? 'drag tone 1 until the beats stop' : 'f_beat = |f₁ − f₂|');
    outT(df < 0.01 ? '∞ (no beats)' : (1 / df).toFixed(2) + ' s', 'loud → quiet → loud');
    outM(mystery ? 'about ' + Math.round((f1 + f2) / 2) + ' Hz' : ((f1 + f2) / 2).toFixed(1) + ' Hz', 'the average, (f₁ + f₂)/2');
  });
}, { unitsWide: 10, aspect: 0.55, minHeight: 320, maxHeight: 460, hint: '' });

/* ═══════════════════════════ Lesson 8: the Doppler effect ═══════════════════════════ */
Sim.register('wav-doppler-lab', function (stage) {
  'use strict';
  var TAU = WAV.TAU, M = 0.5, vo = 0, f0 = 500, V = 343, fronts = [], sx = -40, t = 0, lastEmit = 0, playing = true, tick = WAV.clock(), init = false;
  var O = stage.handle({ x: 2, y: 1.6, radius: 13 });
  var outA = stage.readout('Heard ahead'), outB = stage.readout('Heard behind'), outO = stage.readout('Heard at the ear'), outM = stage.readout('Source speed');
  stage.slider({ label: 'Source speed (× speed of sound)', min: 0, max: 1.5, step: 0.05, value: M, format: function (v) { return v.toFixed(2) + ' × v'; }, onInput: function (v) { M = v; fronts = []; } });
  stage.slider({ label: 'Observers walking towards the source', min: 0, max: 50, step: 1, value: 0, format: function (v) { return v + ' m/s'; }, onInput: function (v) { vo = v; } });
  stage.button({ label: '♪ Hear it drive past', onClick: function () {
    var vs = Math.min(M, 0.8) * V, d = 15, dur = 4, n = 240, fc = [], gc = [];
    if (vs < 1) { WAV.Sound.play([[440, 1]], { dur: 2.5 }); return; }
    for (var i = 0; i < n; i++) { var x = -vs * dur / 2 + vs * dur * i / (n - 1), r = Math.hypot(x, d), cosT = -x / r; fc.push(1 / (1 - (vs / V) * cosT)); gc.push(Math.min(1, 0.12 + d / r)); }
    gc[0] = 0.0001; gc[n - 1] = 0.0001;
    WAV.Sound.play([[440, 1], [880, 0.3], [1320, 0.1]], { dur: dur, fcurve: fc, gcurve: gc, gain: 0.9 });
  } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && WAV.motion()); t += dt;
    if (!init) { var b = s.bounds(); O.x = b.xmax * 0.55; O.y = b.ymax * 0.55; init = true; }
    var c = s.w / 6, cy = s.h * 0.5, vsp = M * c, Te = 0.22;
    sx += vsp * dt;
    if (sx > s.w + 60 || (M === 0 && sx < 0)) { sx = M === 0 ? s.w * 0.35 : -40; fronts = []; }
    if (t - lastEmit >= Te) { fronts.push([sx, cy, t]); lastEmit = t; }
    fronts = fronts.filter(function (fr) { return c * (t - fr[2]) < s.w * 1.4; });
    fronts.forEach(function (fr) { var r = c * (t - fr[2]); WAV.ring(ctx, fr[0], fr[1], r, th.accent, 1.6, Math.max(0.12, 0.85 - r / (s.w * 1.4))); });
    WAV.line(ctx, 0, cy, s.w, cy, th.ink3, 1, [3, 6], 0.4);
    if (M > 1) { var half = Math.asin(1 / M), L2 = s.w; [-1, 1].forEach(function (sg) { WAV.line(ctx, sx, cy, sx - L2 * Math.cos(half), cy + sg * L2 * Math.sin(half), th.warn, 2, null, 0.9); }); WAV.text(ctx, 'Mach cone: sin θ = v/v_s', sx - 60, cy - 30, { size: 11, color: th.warn, align: 'right', weight: 700 }); }
    ctx.save(); ctx.fillStyle = th.violet; WAV.rrect(ctx, sx - 16, cy - 9, 32, 18, 7); ctx.fill(); ctx.restore();
    WAV.arrow(ctx, sx + 18, cy, 22 * Math.min(1.5, M) + (M ? 6 : 0), 0, th.violet, 2.4, '', th);
    // the observer's ear
    var po = s.toScreen(O.x, O.y), dx = po[0] - sx, dy = po[1] - cy, r = Math.hypot(dx, dy) || 1, cosT = dx / r;
    WAV.ring(ctx, po[0], po[1], 12, th.ink, 2.4); WAV.dot(ctx, po[0], po[1], 4, th.ink); WAV.text(ctx, 'ear', po[0], po[1] + 22, { size: 11, color: th.ink, weight: 800 });
    function fmt(f) { return isFinite(f) && f > 0 ? Math.round(f) + ' Hz' : 'nothing yet'; }
    var vs = M * V, fa = M < 1 ? f0 * (V + vo) / (V - vs) : NaN, fb = f0 * (V + vo) / (V + vs), den = 1 - M * cosT, fe = den > 0.02 ? f0 / den : NaN;
    outA(fmt(fa), M >= 1 ? 'the source outruns its own sound' : 'f(v + v_o)/(v − v_s)');
    outB(fmt(fb), 'f(v + v_o)/(v + v_s)');
    outO(fmt(fe), 'uses the speed component along the line, v_s cos θ');
    outM(Math.round(vs) + ' m/s', M >= 1 ? 'supersonic: a shock cone forms' : 'emitting f = ' + f0 + ' Hz');
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 300, maxHeight: 440, hint: 'Drag the ear anywhere' });

/* ═══════════════════════════ Lesson 9: Wave Rush ═══════════════════════════ */
Sim.register('wav-rush-lab', function (stage) {
  'use strict';
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var GEN = [
    function () { var c = pick([[340, 680, '0.5 m', '2 m', '1 m'], [330, 165, '2 m', '0.5 m', '4 m'], [1500, 500, '3 m', '0.33 m', '1.5 m']]); return ['A wave of speed ' + c[0] + ' m/s has frequency ' + c[1] + ' Hz. Its wavelength is', c[2], c[3], c[4], 'λ = v/f.']; },
    function () { var c = pick([['y = 0.1 sin(2x − 10t)', '5 m/s, along +x', '5 m/s, along −x', '20 m/s, along +x'], ['y = 0.1 sin(4x + 8t)', '2 m/s, along −x', '2 m/s, along +x', '32 m/s, along −x'], ['y = 3 sin(πx − 6πt)', '6 m/s, along +x', '6 m/s, along −x', '1/6 m/s, along +x']]); return ['The wave ' + c[0] + ' (SI units) travels at', c[1], c[2], c[3], 'v = ω/k. Opposite signs of x and t: +x. Same signs: −x.']; },
    function () { var c = pick([['quadrupled', 'doubles', 'quadruples', 'halves'], ['doubled', 'goes up √2 times', 'doubles', 'stays the same'], ['made 9 times larger', 'triples', 'goes up 9 times', 'goes up 81 times']]); return ['The tension in a string is ' + c[0] + '. The speed of waves on it', c[1], c[2], c[3], 'v = √(T/μ).']; },
    function () { return ['Which harmonics can a pipe closed at one end produce?', 'odd ones only: f, 3f, 5f …', 'all: f, 2f, 3f …', 'even ones only', 'Node at the closed end, antinode at the open end: L = λ/4, 3λ/4 …']; },
    function () { var c = pick([[0.5, '340 Hz', '170 Hz', '680 Hz'], [1, '170 Hz', '85 Hz', '340 Hz'], [0.25, '680 Hz', '340 Hz', '1360 Hz']]); return ['Fundamental of a pipe ' + c[0] + ' m long, open at both ends (v = 340 m/s)?', c[1], c[2], c[3], 'f₁ = v/2L.']; },
    function () { var c = pick([[0.5, '170 Hz', '340 Hz', '85 Hz'], [0.25, '340 Hz', '680 Hz', '170 Hz'], [1, '85 Hz', '170 Hz', '42.5 Hz']]); return ['Fundamental of a pipe ' + c[0] + ' m long, closed at one end (v = 340 m/s)?', c[1], c[2], c[3], 'f₁ = v/4L.']; },
    function () { return ['An open pipe and a closed pipe have the same length. f(open) : f(closed) for their fundamentals is', '2 : 1', '1 : 2', '1 : 1', 'v/2L against v/4L.']; },
    function () { var c = pick([[256, 260, '4 Hz'], [440, 443, '3 Hz'], [512, 506, '6 Hz']]); return ['Forks of ' + c[0] + ' Hz and ' + c[1] + ' Hz sound together. Beats per second?', c[2], (c[0] + c[1]) / 2 + ' Hz', '0', '|f₁ − f₂|.']; },
    function () { return ['Sticking a little wax on a tuning-fork prong makes its frequency', 'decrease', 'increase', 'stay the same', 'More mass, slower vibration. Filing it does the opposite.']; },
    function () { var c = pick([['approaches a still observer at v/10', '10f/9', '11f/10', '9f/10'], ['moves away from a still observer at v/10', '10f/11', '9f/10', '11f/10'], ['is still and the observer approaches it at v/10', '11f/10', '10f/9', '9f/10']]); return ['A source of frequency f ' + c[0] + ' (v = speed of sound). Heard frequency?', c[1], c[2], c[3], 'f′ = f(v ± v_o)/(v ∓ v_s).']; },
    function () { var c = pick([['λ/4', 'π/2', 'π', 'π/4'], ['λ/2', 'π', 'π/2', '2π'], ['λ/6', 'π/3', 'π/6', 'π/2']]); return ['Two points on a travelling wave are ' + c[0] + ' apart. Their phase difference is', c[1], c[2], c[3], 'Δφ = 2πΔx/λ.']; },
    function () { return ['Absolute temperature of a gas rises from 300 K to 1200 K. The speed of sound', 'doubles', 'quadruples', 'goes up √2 times', 'v ∝ √T.']; },
    function () { return ['A wave’s amplitude is doubled at the same frequency. Its intensity', 'goes up 4 times', 'doubles', 'stays the same', 'I ∝ A²f².']; },
    function () { return ['The distance between two neighbouring nodes of a standing wave is', 'λ/2', 'λ', 'λ/4', 'Nodes repeat every half wavelength. Node to antinode is λ/4.']; },
    function () { return ['A pulse reflects from a clamped (fixed) end of a string. It comes back', 'inverted (phase change π)', 'upright (no phase change)', 'doubled in height', 'A fixed end can’t move, so the reflection cancels it there.']; },
    function () { return ['At constant temperature, the pressure of air is doubled. The speed of sound', 'stays the same', 'goes up √2 times', 'doubles', 'P/ρ stays the same.']; },
    function () { return ['A string fixed at both ends resonates at 420 Hz and 315 Hz, with no resonances in between. Its fundamental is', '105 Hz', '210 Hz', '52.5 Hz', 'Consecutive harmonics differ by f₁.']; },
  ];
  var ROUND = 12, TIME = 15;
  var queue = [], card = null, order = [], picked = -1, cardAt = 0, score = 0, streak = 0, best = +(WAV.store('jee-prep:wav-rush-best') || 0) || 0, seen = 0, playing = false, timer = 0, missed = [], ended = false, total = ROUND;
  var outS = stage.readout('Score'), outK = stage.readout('Streak'), outB = stage.readout('Best');
  var startBtn = stage.button({ label: 'Start round', onClick: function () { begin(); } });
  var opts = [0, 1, 2].map(function (i) { var b = stage.button({ label: '—', onClick: function () { answer(i); } }); b.disabled = true; return b; });
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function begin() {
    queue = shuffle(GEN.slice()).slice(0, ROUND).map(function (g) { return g(); });
    score = 0; streak = 0; seen = 0; missed = []; playing = true; ended = false; total = ROUND;
    startBtn.textContent = 'Restart round'; next();
    clearInterval(timer); timer = setInterval(tick, 100);
  }
  function next() {
    if (!queue.length) { finish(); return; }
    card = queue.shift(); order = shuffle([1, 2, 3]); picked = -1; cardAt = performance.now(); seen++;
    opts.forEach(function (b, i) { b.textContent = (i + 1) + '. ' + card[order[i]]; b.disabled = false; b.removeAttribute('aria-pressed'); });
    stage.invalidate();
  }
  function answer(i) {
    if (!playing || picked !== -1) return;
    picked = i < 0 ? -2 : i; var right = i >= 0 && order[i] === 1;
    opts.forEach(function (b, j) { b.disabled = true; if (order[j] === 1) b.setAttribute('aria-pressed', 'true'); });
    if (right) { streak++; score += 10 + Math.min(streak, 5) * 2 + Math.max(0, Math.round(TIME - (performance.now() - cardAt) / 1000)); WAV.fx('correct', streak); }
    else { streak = 0; WAV.fx('wrong'); if (missed.indexOf(card) < 0) { missed.push(card); queue.splice(Math.min(queue.length, 3), 0, card); total++; } }
    setTimeout(function () { if (playing) next(); }, right ? 900 : 2600);
    stage.invalidate();
  }
  function tick() { if (!playing) return; if (picked === -1 && (performance.now() - cardAt) / 1000 > TIME) answer(-1); stage.invalidate(); }
  function finish() {
    playing = false; ended = true; clearInterval(timer); timer = 0; card = null;
    if (score > best) { best = score; WAV.store('jee-prep:wav-rush-best', best); }
    opts.forEach(function (b) { b.disabled = true; b.textContent = '—'; b.removeAttribute('aria-pressed'); });
    WAV.fx('complete'); stage.invalidate();
  }
  stage.draw(function (ctx, s) {
    var t = s.theme, cx = s.w / 2;
    outS(String(score), playing ? 'card ' + seen + ' of ' + total : ''); outK(String(streak), streak >= 3 ? 'on a roll' : ''); outB(String(best), 'kept on this device');
    if (!card) {
      Sim.label(ctx, ended ? 'Round over: ' + score + ' points' : 'Wave Rush', cx, s.h * 0.3, { size: 24, weight: 800, color: t.accent });
      WAV.wrap(ctx, ended ? (missed.length ? 'You missed ' + missed.length + '. Each one came back for a second try. Play again to beat your best.' : 'A clean sweep. Try to beat your best.') : '12 quick questions with 15 seconds each. Answer fast for bonus points and keep a streak going. Press Start round.', cx, s.h * 0.3 + 26, Math.min(460, s.w - 40), { size: 13, color: t.ink2, align: 'center' });
      return;
    }
    var el = (performance.now() - cardAt) / 1000, frac = picked !== -1 ? 0 : Math.max(0, 1 - el / TIME);
    ctx.save(); ctx.fillStyle = t.grid; WAV.rrect(ctx, 20, 18, s.w - 40, 8, 4); ctx.fill();
    ctx.fillStyle = frac < 0.3 ? t.warn : t.accent; WAV.rrect(ctx, 20, 18, (s.w - 40) * frac, 8, 4); ctx.fill(); ctx.restore();
    var hq = WAV.wrap(ctx, card[0], cx, 48, Math.min(560, s.w - 40), { size: s.w < 480 ? 16 : 19, weight: 650, color: t.ink, align: 'center' });
    var y = 48 + hq + 26;
    if (picked !== -1) {
      var right = picked >= 0 && order[picked] === 1;
      Sim.label(ctx, right ? 'Correct!' : picked === -2 ? 'Time’s up: ' + card[1] : 'Not quite: ' + card[1], cx, y, { size: 16, weight: 800, color: right ? t.ok : t.warn });
      WAV.wrap(ctx, card[4], cx, y + 18, Math.min(520, s.w - 40), { size: 13, color: t.ink2, align: 'center' });
    } else Sim.label(ctx, 'Pick an answer below (or press 1, 2, 3)', cx, y, { size: 12, weight: 600, color: t.ink3 });
  });
  stage.canvas.addEventListener('keydown', function (e) { if (/^[123]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); } });
}, { unitsWide: 10, aspect: 0.45, minHeight: 280, maxHeight: 360, hint: '' });
