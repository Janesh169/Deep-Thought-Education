/**
 * Labs for Oscillations & SHM. Shared drawing helpers first (OSC), then eight labs:
 *   osc-circle-lab     (Lesson 1)  the reference circle: SHM as the shadow of uniform circular motion
 *   osc-phase-lab      (Lesson 2)  x, v and a graphs in step with a moving block; drag the time cursor
 *   osc-spring-lab     (Lesson 3)  horizontal, vertical, series and parallel springs; pull and release
 *   osc-energy-lab     (Lesson 4)  KE ↔ PE in the potential well, against x and against time; stiffening spring
 *   osc-pendulum-lab   (Lesson 5)  a true (non-linear) pendulum next to its SHM twin; lifts, cars, planets
 *   osc-systems-lab    (Lesson 6)  U-tube, floating block, tunnel through the Earth, gas spring
 *   osc-combine-lab    (Lesson 6)  two SHMs: phasor addition on one line, Lissajous figures at right angles
 *   osc-resonance-lab  (Lesson 7)  damped and driven oscillator with its resonance curve
 *   osc-rush-lab       (Lesson 8)  SHM Rush, a quick-fire game
 * Everything is drawn from the page's CSS colours, so the labs follow light/dark mode and the chapter tone.
 */
var OSC = (function () {
  'use strict';
  var FONT = 'Inter Variable, Roboto, system-ui, sans-serif', MATH = 'KaTeX_Math, "Times New Roman", serif';
  var TAU = Math.PI * 2;
  function motion() { return !window.FX || window.FX.motionOK(); }
  function fx(n, a) { if (window.FX) window.FX.play(n, a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /** A simulation clock: seconds since the last frame, or 0 when the lab is not running. */
  function clock() {
    var last = 0;
    return function (s, run) {
      var dt = last ? s.time - last : 0; last = s.time;
      if (dt < 0 || dt > 0.1) dt = 1 / 60;
      return run ? dt : 0;
    };
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function line(ctx, x1, y1, x2, y2, color, lw, dash, alpha) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 1; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function dot(ctx, x, y, r, color, alpha) { ctx.save(); ctx.fillStyle = color; if (alpha != null) ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
  function ring(ctx, x, y, r, color, lw, alpha, dash) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 1; if (alpha != null) ctx.globalAlpha = alpha; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }
  function text(ctx, str, x, y, o) {
    o = o || {}; ctx.save();
    ctx.font = (o.italic ? 'italic ' : '') + (o.weight || 600) + ' ' + (o.size || 12) + 'px ' + (o.math ? MATH : FONT);
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillText(str, x, y); ctx.restore();
  }
  /** Word-wrapped text; returns the height used. */
  function wrap(ctx, str, x, y, maxW, o) {
    o = o || {};
    var size = o.size || 13, lh = o.lh || size * 1.38, words = String(str).split(' '), cur = '', lines = [];
    ctx.save(); ctx.font = (o.weight || 560) + ' ' + size + 'px ' + FONT;
    words.forEach(function (wd) { var tt = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tt; });
    if (cur) lines.push(cur);
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    ctx.restore();
    return lines.length * lh;
  }
  /** Zig-zag spring between two points. o: { coils, width, lead, color, lw, alpha } */
  function spring(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    var n = o.coils || 9, w = o.width || 8, L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 2) return;
    var ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux, lead = Math.min(o.lead || 8, L / 4), body = L - 2 * lead;
    ctx.save(); ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = o.lw || 2; ctx.lineJoin = ctx.lineCap = 'round';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
    for (var i = 1; i <= 2 * n; i++) { var tt = lead + body * (i - 0.5) / (2 * n), sd = i % 2 ? w : -w; ctx.lineTo(x1 + ux * tt + px * sd, y1 + uy * tt + py * sd); }
    ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  /** A rigid support: a line with hatching on one side (side = ±1). */
  function hatch(ctx, x1, y1, x2, y2, side, color) {
    var L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * side, ny = ux * side;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.beginPath();
    for (var d = 4; d < L; d += 8) { var bx = x1 + ux * d, by = y1 + uy * d; ctx.moveTo(bx, by); ctx.lineTo(bx + (nx - ux) * 6, by + (ny - uy) * 6); }
    ctx.stroke(); ctx.restore();
  }
  /** A block (rounded square) with a tinted fill and an optional label. */
  function block(ctx, x, y, w, h, t, label, col, active) {
    col = col || t.accent;
    ctx.save(); rrect(ctx, x, y, w, h, 6); ctx.fillStyle = col; ctx.globalAlpha = active ? 0.42 : 0.26; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = active ? 2.6 : 2; ctx.stroke(); ctx.restore();
    if (label) text(ctx, label, x + w / 2, y + h / 2 + 1, { size: 15, italic: true, math: true, color: t.ink, weight: 500 });
  }
  function arrow(ctx, x, y, dx, dy, color, width, label, t) {
    if (Math.hypot(dx, dy) < 4) return;
    Sim.arrow(ctx, x, y, x + dx, y + dy, { color: color, width: width || 2.4, head: 9 });
    if (label) Sim.label(ctx, label, x + dx + (dx >= 0 ? 12 : -12), y + dy + (dy > 0 ? 10 : dy < 0 ? -10 : -12), { size: 11, weight: 700, color: color, plate: t && t.plate });
  }
  /** Plot fn(u) for u in [0, 1] into box B, value v in [−1, 1] → B.mid ∓ v·B.h/2. */
  function plot(ctx, B, fn, color, lw, o) {
    o = o || {};
    var n = o.n || Math.max(60, Math.round(B.w / 2)), mid = B.y + B.h / 2;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw || 2; ctx.lineJoin = 'round'; if (o.dash) ctx.setLineDash(o.dash); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) { var u = i / n, v = fn(u), X = B.x + u * B.w, Y = mid - v * B.h / 2; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.restore();
  }
  /** Light frame for a graph: centre line and an optional label on the left. */
  function frame(ctx, B, t, label, col) {
    ctx.save(); ctx.fillStyle = t.grid; ctx.globalAlpha = 0.5; rrect(ctx, B.x - 4, B.y - 2, B.w + 8, B.h + 4, 6); ctx.fill(); ctx.restore();
    line(ctx, B.x, B.y + B.h / 2, B.x + B.w, B.y + B.h / 2, t.ink3, 1, null, 0.5);
    if (label) text(ctx, label, B.x - 14, B.y + B.h / 2, { size: 15, italic: true, math: true, color: col || t.ink2, weight: 500 });
  }
  /** Numbers with a true minus sign. */
  function num(v, d) { d = d == null ? 2 : d; var s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? '−' : '') + s; }
  function signed(v, d) { d = d == null ? 2 : d; var s = Math.abs(v).toFixed(d); return (+s === 0 ? '' : v < 0 ? '−' : '+') + s; }
  /** Buttons that behave as a radio group. items: [[value, label]] */
  function radio(stage, items, value, onPick) {
    var btns = items.map(function (it) { return stage.toggle({ label: it[1], value: it[0] === value, onChange: function () { set(it[0]); onPick(it[0]); } }); });
    function set(v) { btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(items[i][0] === v)); }); }
    return { set: set, btns: btns };
  }
  /** Complete elliptic integral of the first kind K(k), by the arithmetic–geometric mean. */
  function ellipK(k) { var a = 1, b = Math.sqrt(Math.max(1e-12, 1 - k * k)); for (var i = 0; i < 12; i++) { var an = (a + b) / 2; b = Math.sqrt(a * b); a = an; } return Math.PI / (2 * a); }
  function store(key, v) { try { if (v === undefined) return localStorage.getItem(key); localStorage.setItem(key, String(v)); } catch (e) { /* storage blocked: keep going in memory */ } return null; }
  return { motion: motion, fx: fx, clamp: clamp, clock: clock, rrect: rrect, line: line, dot: dot, ring: ring, text: text, wrap: wrap, spring: spring, hatch: hatch, block: block,
    arrow: arrow, plot: plot, frame: frame, num: num, signed: signed, radio: radio, ellipK: ellipK, store: store, TAU: TAU, FONT: FONT, MATH: MATH };
})();

/* ═══════════════════════════ Lesson 1: the reference circle ═══════════════════════════ */
Sim.register('osc-circle-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, w = 1.2, th = Math.PI / 6, playing = true, vecs = false, tick = OSC.clock(), G = null;
  var P = stage.handle({ x: 0, y: 0, radius: 12 });
  P.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); th = Math.atan2(G.cy - p[1], p[0] - G.cx); setPlay(false); };
  var outT = stage.readout('Angle on the circle'), outX = stage.readout('Shadow position'), outV = stage.readout('Shadow velocity'), outA = stage.readout('Shadow acceleration');
  stage.slider({ label: 'Angular speed ω', min: 0.4, max: 3, step: 0.1, value: w, format: function (v) { return v.toFixed(1) + ' rad/s'; }, onInput: function (v) { w = v; } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { setPlay(!playing); } });
  stage.toggle({ label: 'Show velocity & acceleration', value: false, onChange: function (on) { vecs = on; } });
  function setPlay(on) { playing = on; playBtn.textContent = on ? 'Pause' : 'Play'; stage.setAnimating(on); }
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var t = s.theme, dt = tick(s, playing && !P.active && OSC.motion());
    th += w * dt;
    var R = Math.max(42, Math.min(s.h * 0.36, s.w * 0.2)), cx = 20 + R, cy = s.h / 2 + 4, trackX = cx + R + 36, x1 = s.w - 16;
    G = { cx: cx, cy: cy };
    var px = cx + R * Math.cos(th), py = cy - R * Math.sin(th);
    if (!P.active) { var wp = s.toWorld(px, py); P.x = wp[0]; P.y = wp[1]; }
    var a = ((th % TAU) + TAU) % TAU;

    // the circle, its axis and the radius to P
    OSC.line(ctx, cx - R - 8, cy, x1, cy, t.ink3, 1, null, 0.45);
    OSC.ring(ctx, cx, cy, R, t.ink3, 1.5, 0.7);
    OSC.line(ctx, cx, cy, px, py, t.ink2, 1.6);
    ctx.save(); ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * 0.26, 0, -a, true); ctx.stroke(); ctx.restore();
    OSC.text(ctx, 'θ', cx + R * 0.42 * Math.cos(a / 2), cy - R * 0.42 * Math.sin(a / 2), { size: 15, math: true, italic: true, color: t.accent, weight: 500 });

    // the wall the shadow falls on, with ±A marks
    OSC.line(ctx, trackX, cy - R - 6, trackX, cy + R + 6, t.ink3, 2, null, 0.7);
    [['+A', -R], ['−A', R], ['0', 0]].forEach(function (m) { OSC.line(ctx, trackX - 6, cy + m[1], trackX + 6, cy + m[1], t.ink3, 1.5); OSC.text(ctx, m[0], trackX - 18, cy + m[1], { size: 11, color: t.ink3, weight: 700 }); });
    // the shadow's history: x = A sin(θ − ωτ) for the last 12 s
    var win = 12, X0 = trackX + 6, sp = (x1 - X0) / win;
    ctx.save(); ctx.strokeStyle = t.accent; ctx.lineWidth = 2.2; ctx.beginPath();
    for (var i = 0; i <= 240; i++) { var tau = win * i / 240, X = X0 + tau * sp, Y = cy - R * Math.sin(th - w * tau); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.restore();
    OSC.text(ctx, 'now', X0 + 14, cy + R + 18, { size: 10, color: t.ink3, weight: 700 });
    OSC.text(ctx, '12 s ago →', x1 - 30, cy + R + 18, { size: 10, color: t.ink3, weight: 700 });
    // projection
    OSC.line(ctx, px, py, trackX, py, t.violet, 1.4, [4, 4], 0.8);
    OSC.dot(ctx, trackX, py, 8, t.violet);
    OSC.dot(ctx, px, py, P.active || s.focused(P) ? 11 : 9, t.accent);
    OSC.ring(ctx, px, py, 14, t.accent, 1.5, P.active ? 0.9 : 0.35);

    if (vecs) {
      var kv = R * 0.3, ka = R * 0.1, vx = -Math.sin(th) * w * kv, vy = -Math.cos(th) * w * kv, an = w * w * ka;
      OSC.arrow(ctx, px, py, vx, vy, t.ok, 2.2, 'v', t);
      OSC.arrow(ctx, px, py, (cx - px) / R * an, (cy - py) / R * an, t.warn, 2.2, 'a', t);
      OSC.arrow(ctx, trackX + 14, py, 0, vy, t.ok, 2.6, 'v', t);
      OSC.arrow(ctx, trackX - 14, py, 0, (cy - py) / R * an, t.warn, 2.6, 'a', t);
    }
    outT(Math.round(a * 180 / Math.PI) + '°', 'θ = ωt + φ');
    outX(OSC.signed(Math.sin(th)) + ' A', 'x = A sin θ');
    outV(OSC.signed(Math.cos(th)) + ' Aω', 'v = Aω cos θ');
    outA(OSC.signed(-Math.sin(th)) + ' Aω²', 'a = −Aω² sin θ = −ω²x');
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 280, maxHeight: 420, hint: 'Drag the dot round the circle' });

/* ═══════════════════════════ Lesson 2: x, v and a in step ═══════════════════════════ */
Sim.register('osc-phase-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, T = 3, phi = 0, A = 6, showV = true, showA = true, playing = true, t = 0, tick = OSC.clock(), G = null;
  var C = stage.handle({ x: 0, y: 0, radius: 10 });
  C.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); t = OSC.clamp((p[0] - G.x0) / G.gw, 0, 0.9999) * 2 * T; setPlay(false); };
  var outE = stage.readout('Phase ωt + φ'), outX = stage.readout('Displacement x'), outV = stage.readout('Velocity v'), outA = stage.readout('Acceleration a');
  stage.slider({ label: 'Period T', min: 1, max: 5, step: 0.5, value: T, format: function (v) { return v.toFixed(1) + ' s'; }, onInput: function (v) { t = t / T * v; T = v; } });
  stage.slider({ label: 'Initial phase φ', min: 0, max: 360, step: 15, value: 0, format: function (v) { return v + '°'; }, onInput: function (v) { phi = v * Math.PI / 180; } });
  stage.slider({ label: 'Amplitude A', min: 2, max: 10, step: 1, value: A, format: function (v) { return v + ' cm'; }, onInput: function (v) { A = v; } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { setPlay(!playing); } });
  stage.toggle({ label: 'Velocity graph', value: true, onChange: function (on) { showV = on; } });
  stage.toggle({ label: 'Acceleration graph', value: true, onChange: function (on) { showA = on; } });
  function setPlay(on) { playing = on; playBtn.textContent = on ? 'Pause' : 'Play'; stage.setAnimating(on); }
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var t0 = s.theme, dt = tick(s, playing && !C.active && OSC.motion());
    t = (t + dt) % (2 * T);
    var w = TAU / T, ph = w * t + phi, k = A / 10;
    var xN = Math.sin(ph), vN = Math.cos(ph), aN = -Math.sin(ph);

    // the block on its track
    var ty = 42, cx = s.w / 2, sc = s.w * 0.034, bx = cx + A * xN * sc;
    OSC.line(ctx, cx - 10 * sc - 20, ty + 14, cx + 10 * sc + 20, ty + 14, t0.ink3, 1.5, null, 0.6);
    OSC.line(ctx, cx, ty - 16, cx, ty + 20, t0.ink3, 1, [3, 3], 0.7);
    [-A, A].forEach(function (e) { OSC.line(ctx, cx + e * sc, ty + 9, cx + e * sc, ty + 19, t0.ink3, 1.5); });
    OSC.text(ctx, '−A', cx - A * sc, ty + 27, { size: 10, color: t0.ink3, weight: 700 }); OSC.text(ctx, '+A', cx + A * sc, ty + 27, { size: 10, color: t0.ink3, weight: 700 });
    OSC.block(ctx, bx - 14, ty - 12, 28, 26, t0, '', t0.accent);
    function harrow(y, len, col, lab) { if (Math.abs(len) < 4) return; OSC.arrow(ctx, bx, y, len, 0, col, 2.4, '', t0); OSC.text(ctx, lab, bx - (len > 0 ? 9 : -9), y, { size: 13, italic: true, math: true, color: col, weight: 600 }); }
    if (showV) harrow(ty - 24, vN * k * 70, t0.violet, 'v');
    if (showA) harrow(ty + 38, aN * k * 70, t0.warn, 'a');

    // the graphs
    var rows = [['x', xN, function (u) { return k * Math.sin(w * u * 2 * T + phi); }, t0.accent, '±A']];
    if (showV) rows.push(['v', vN, function (u) { return k * Math.cos(w * u * 2 * T + phi); }, t0.violet, '±Aω']);
    if (showA) rows.push(['a', aN, function (u) { return -k * Math.sin(w * u * 2 * T + phi); }, t0.warn, '±Aω²']);
    var top = 98, bottom = s.h - 22, gap = 12, gh = (bottom - top - gap * (rows.length - 1)) / rows.length, x0 = 40, gw = s.w - x0 - 18;
    G = { x0: x0, gw: gw };
    var Xc = x0 + gw * t / (2 * T);
    for (var q = 1; q < 8; q++) { var gx = x0 + gw * q / 8; OSC.line(ctx, gx, top - 4, gx, bottom, t0.ink3, 1, [2, 4], q % 4 === 0 ? 0.55 : 0.28); }
    rows.forEach(function (r, i) {
      var B = { x: x0, y: top + i * (gh + gap), w: gw, h: gh };
      OSC.frame(ctx, B, t0, r[0], r[3]);
      OSC.plot(ctx, B, r[2], r[3], 2.2);
      OSC.dot(ctx, Xc, B.y + B.h / 2 - k * r[1] * B.h / 2, 5, r[3]);
      OSC.text(ctx, r[4], B.x + B.w - 2, B.y + 6, { size: 10, color: r[3], align: 'right', weight: 700 });
    });
    ['T/2', 'T', '3T/2', '2T'].forEach(function (lab, i) { OSC.text(ctx, lab, x0 + gw * (i + 1) / 4, bottom + 11, { size: 10, color: t0.ink3, weight: 700 }); });
    OSC.line(ctx, Xc, top - 8, Xc, bottom, t0.ink, 1.4, null, 0.7);
    var hp = s.toWorld(Xc, top - 8); if (!C.active) { C.x = hp[0]; C.y = hp[1]; }
    OSC.dot(ctx, Xc, top - 8, C.active || s.focused(C) ? 8 : 6, t0.ink);

    var deg = ((ph * 180 / Math.PI) % 360 + 360) % 360;
    Sim.label(ctx, 'x = ' + A + ' sin(2πt/' + T + ' + ' + Math.round(phi * 180 / Math.PI) + '°) cm', 10, 12, { size: 12, weight: 700, color: t0.ink2, align: 'left', plate: t0.plate });
    outE(Math.round(deg) + '°', 'at t = ' + t.toFixed(2) + ' s');
    outX(OSC.signed(A * xN, 1) + ' cm', 'x = A sin(ωt + φ)');
    outV(OSC.signed(A * w * vN, 1) + ' cm/s', 'leads x by 90°');
    outA(OSC.signed(A * w * w * aN, 1) + ' cm/s²', 'leads x by 180°: a = −ω²x');
  });
}, { unitsWide: 10, aspect: 0.66, minHeight: 360, maxHeight: 520, hint: 'Drag the white dot to scrub through time' });

/* ═══════════════════════════ Lesson 3: springs ═══════════════════════════ */
Sim.register('osc-spring-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, mode = 'h', k = 40, m = 0.5, x0 = 0.1, t = 0, tick = OSC.clock(), G = null;
  var Bh = stage.handle({ x: 0, y: 0, radius: 24 });
  Bh.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); x0 = OSC.clamp(mode === 'v' ? (p[1] - G.eq) / G.sc : (p[0] - G.eq) / G.sc, -G.max, G.max); t = 0; };
  function kEff() { return mode === 's' ? k / 2 : mode === 'p' ? 2 * k : k; }
  var outK = stage.readout('Effective spring constant'), outT = stage.readout('Period T = 2π√(m/k)'), outF = stage.readout('Frequency'), outV = stage.readout('Top speed Aω');
  OSC.radio(stage, [['h', 'Horizontal'], ['v', 'Vertical'], ['s', 'Two in series'], ['p', 'Two in parallel']], mode, function (v) { mode = v; x0 = mode === 'v' ? 0.05 : 0.1; t = 0; });
  stage.slider({ label: 'Spring constant k (each)', min: 10, max: 120, step: 5, value: k, format: function (v) { return v + ' N/m'; }, onInput: function (v) { k = v; t = 0; } });
  stage.slider({ label: 'Mass m', min: 0.1, max: 2, step: 0.05, value: m, format: function (v) { return v.toFixed(2) + ' kg'; }, onInput: function (v) { m = v; t = 0; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, !Bh.active && OSC.motion());
    t += dt;
    var ke = kEff(), w = Math.sqrt(ke / m), x = Bh.active ? x0 : x0 * Math.cos(w * t), T = TAU / w;
    var stripH = 64, bw = 46, eq, sc, bx, by, wp;
    if (mode !== 'v') {
      var cy = (s.h - stripH) / 2 - 4, wallX = 26;
      eq = s.w * 0.6; sc = (s.w * 0.3) / 0.2; G = { eq: eq, sc: sc, max: 0.2 };
      bx = eq + x * sc; by = cy;
      OSC.hatch(ctx, wallX, cy - 52, wallX, cy + 52, -1, th.ink3);
      OSC.line(ctx, wallX, cy + bw / 2 + 2, s.w - 12, cy + bw / 2 + 2, th.ink3, 1.5, null, 0.55);
      OSC.line(ctx, eq, cy - 40, eq, cy + 40, th.ink3, 1, [3, 4], 0.6);
      OSC.text(ctx, 'equilibrium', eq, cy + 48, { size: 10, color: th.ink3, weight: 700 });
      var left = bx - bw / 2;
      if (mode === 'h') OSC.spring(ctx, wallX, cy, left, cy, { color: th.ink2, coils: 10, width: 9 });
      else if (mode === 's') { var mid = (wallX + left) / 2; OSC.spring(ctx, wallX, cy, mid, cy, { color: th.ink2, coils: 6, width: 9 }); OSC.spring(ctx, mid, cy, left, cy, { color: th.violet, coils: 6, width: 9 }); OSC.dot(ctx, mid, cy, 4, th.ink2); }
      else { OSC.spring(ctx, wallX, cy - 13, left, cy - 13, { color: th.ink2, coils: 10, width: 6 }); OSC.spring(ctx, wallX, cy + 13, left, cy + 13, { color: th.violet, coils: 10, width: 6 }); }
      OSC.block(ctx, left, cy - bw / 2, bw, bw, th, 'm', th.accent, Bh.active || s.focused(Bh));
      OSC.arrow(ctx, bx, cy - bw / 2 - 12, -x * sc * 0.6, 0, th.warn, 2.4, x ? 'F = −kx' : '', th);
    } else {
      var topY = 18, L0 = 56, d = 9.8 / ke, avail = s.h - stripH - topY - L0 - bw - 24;
      sc = Math.min(260, avail / (d + 0.08)); eq = topY + L0 + d * sc + bw / 2; G = { eq: eq, sc: sc, max: Math.min(0.08, avail / sc - d) };
      var sx = s.w * 0.3; bx = sx; by = eq + x * sc;
      OSC.hatch(ctx, sx - 60, topY, sx + 60, topY, -1, th.ink3);
      OSC.spring(ctx, sx, topY, sx, by - bw / 2, { color: th.ink2, coils: 11, width: 9 });
      OSC.block(ctx, sx - bw / 2, by - bw / 2, bw, bw, th, 'm', th.accent, Bh.active || s.focused(Bh));
      OSC.line(ctx, sx - 70, topY + L0, sx + 90, topY + L0, th.ink3, 1, [3, 4], 0.7);
      OSC.text(ctx, 'end of unstretched spring', sx + 94, topY + L0, { size: 10, color: th.ink3, align: 'left', weight: 700 });
      OSC.line(ctx, sx - 70, eq, sx + 90, eq, th.accent, 1, [3, 4], 0.8);
      OSC.text(ctx, 'equilibrium: stretched by mg/k = ' + (d * 100).toFixed(1) + ' cm', sx + 94, eq, { size: 10, color: th.accent, align: 'left', weight: 700 });
      OSC.arrow(ctx, sx + bw / 2 + 14, by, 0, -x * sc * 0.6, th.warn, 2.4, x ? 'net F = −ky' : '', th);
    }
    wp = s.toWorld(bx, by); if (!Bh.active) { Bh.x = wp[0]; Bh.y = wp[1]; }

    // x–t trace for the last 6 s
    var B = { x: 40, y: s.h - stripH + 6, w: s.w - 58, h: stripH - 18 }, win = 6, t1 = Math.max(0, t - win), A0 = Math.abs(x0) || 1e-9;
    OSC.frame(ctx, B, th, 'x', th.accent);
    var span = Math.min(win, t);
    if (!Bh.active && span > 0.05) {
      OSC.plot(ctx, B, function (u) { var tt = t1 + u * span; return x0 * Math.cos(w * tt) / Math.max(A0, 0.05) * 0.9; }, th.accent, 2, { n: 200 });
      for (var i = Math.ceil(t1 / T), nl = 0; i * T <= t && nl < 14; i++, nl++) { var gx = B.x + B.w * (i * T - t1) / span; OSC.line(ctx, gx, B.y, gx, B.y + B.h, th.ink3, 1, [2, 3], 0.6); }
    }
    OSC.text(ctx, 'last ' + win + ' s · dashed lines one period apart', B.x + B.w, B.y - 6, { size: 10, color: th.ink3, align: 'right', weight: 700 });

    outK(ke + ' N/m', mode === 's' ? 'series: 1/k = 1/k₁ + 1/k₂' : mode === 'p' ? 'parallel: k = k₁ + k₂' : mode === 'v' ? 'gravity only moves the centre' : 'one spring');
    outT(T.toFixed(2) + ' s', 'independent of amplitude');
    outF((1 / T).toFixed(2) + ' Hz', 'ω = ' + w.toFixed(1) + ' rad/s');
    outV((Math.abs(x0) * w).toFixed(2) + ' m/s', 'A = ' + (Math.abs(x0) * 100).toFixed(1) + ' cm');
  });
}, { unitsWide: 10, aspect: 0.6, minHeight: 330, maxHeight: 470, hint: 'Pull the block, then let go' });

/* ═══════════════════════════ Lesson 4: energy in the well ═══════════════════════════ */
Sim.register('osc-energy-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, A = 0.8, anh = false, b = 3, x = A, v = 0, tau = 0, hist = [], playing = true, tick = OSC.clock(), G = null, Tcache = {};
  function U(q) { return 0.5 * q * q + (anh ? 0.25 * b * q * q * q * q : 0); }
  function F(q) { return -q - (anh ? b * q * q * q : 0); }
  function period(amp) { // T = 4∫ dx / √(2(E − U)), with x = A sin u to remove the end-point singularity
    var key = (anh ? 'a' : 'h') + amp.toFixed(3); if (Tcache[key]) return Tcache[key];
    if (!anh) return (Tcache[key] = TAU);
    var E = U(amp), n = 400, sum = 0;
    for (var i = 0; i < n; i++) { var u = (i + 0.5) / n * Math.PI / 2, q = amp * Math.sin(u), den = Math.sqrt(Math.max(1e-12, 2 * (E - U(q)))); sum += amp * Math.cos(u) / den; }
    return (Tcache[key] = 4 * sum * (Math.PI / 2) / n);
  }
  function reset(q) { x = q; v = 0; tau = 0; hist = []; }
  var Bh = stage.handle({ x: 0, y: 0, radius: 12 });
  Bh.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); var q = OSC.clamp((p[0] - G.cx) / G.sx, -1, 1); if (Math.abs(q) < 0.05) q = q < 0 ? -0.05 : 0.05; A = Math.abs(q); reset(q); };
  var outX = stage.readout('Position'), outK = stage.readout('Kinetic energy'), outU = stage.readout('Potential energy'), outT = stage.readout('Period');
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.toggle({ label: 'Stiffening spring (not SHM)', value: false, onChange: function (on) { anh = on; reset(A); } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var t = s.theme, dt = tick(s, playing && !Bh.active && OSC.motion()) * TAU / 3; // the SHM period shows as 3 s
    var n = Math.ceil(dt / 0.004);
    for (var i = 0; i < n; i++) { // RK4
      var h = dt / n, k1x = v, k1v = F(x), k2x = v + h / 2 * k1v, k2v = F(x + h / 2 * k1x), k3x = v + h / 2 * k2v, k3v = F(x + h / 2 * k2x), k4x = v + h * k3v, k4v = F(x + h * k3x);
      x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    }
    tau += dt;
    var E = U(A), pe = U(x), ke = Math.max(0, E - pe);
    if (dt > 0) { hist.push([tau, ke / E, pe / E]); while (hist.length && tau - hist[0][0] > 2.2 * TAU) hist.shift(); }

    // the potential well
    var narrow = s.w < 560, W = { x: 18, y: 14, w: narrow ? s.w - 36 - 130 : s.w * 0.62, h: s.h * (narrow ? 0.46 : 0.56) };
    var xm = 1.12, Um = U(xm), cx = W.x + W.w / 2, sx = W.w / 2 / xm, sy = W.h / Um, base = W.y + W.h;
    G = { cx: cx, sx: sx };
    function P(q, e) { return [cx + q * sx, base - e * sy]; }
    ctx.save(); ctx.strokeStyle = t.ink3; ctx.lineWidth = 2; ctx.beginPath();
    for (var j = 0; j <= 120; j++) { var q = -xm + 2 * xm * j / 120, p = P(q, U(q)); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    ctx.stroke(); ctx.restore();
    if (anh) { ctx.save(); ctx.strokeStyle = t.ink3; ctx.setLineDash([3, 4]); ctx.globalAlpha = 0.5; ctx.beginPath(); for (j = 0; j <= 120; j++) { q = -xm + 2 * xm * j / 120; p = [cx + q * sx, base - 0.5 * q * q * sy]; if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.restore(); OSC.text(ctx, 'dashed: ½kx²', W.x + 4, W.y + 8, { size: 10, color: t.ink3, align: 'left', weight: 700 }); }
    OSC.line(ctx, P(-A, E)[0], P(-A, E)[1], P(A, E)[0], P(A, E)[1], t.ink, 1.4, [5, 4], 0.8);
    OSC.text(ctx, 'total E', P(A, E)[0] + 6, P(A, E)[1], { size: 11, color: t.ink2, align: 'left', weight: 700 });
    var bp = P(x, pe), top = P(x, E);
    OSC.line(ctx, bp[0], base, bp[0], bp[1], t.violet, 5, null, 0.85);
    OSC.line(ctx, bp[0], bp[1], top[0], top[1], t.accent, 5, null, 0.85);
    OSC.dot(ctx, bp[0], bp[1] - 9, Bh.active || s.focused(Bh) ? 11 : 9, t.ink);
    var wp = s.toWorld(bp[0], bp[1] - 9); if (!Bh.active) { Bh.x = wp[0]; Bh.y = wp[1]; }
    OSC.text(ctx, 'x', W.x + W.w + 2, base, { size: 14, italic: true, math: true, color: t.ink3, align: 'left', weight: 500 });
    OSC.line(ctx, W.x, base, W.x + W.w, base, t.ink3, 1, null, 0.6);

    // energy bars
    var bx0 = W.x + W.w + (narrow ? 16 : 46), bY = W.y + 10, bH = W.h - 24, bars = [['KE', ke / E, t.accent], ['PE', pe / E, t.violet], ['E', 1, t.ink3]];
    bars.forEach(function (r, i) {
      var X = bx0 + i * 40, hh = r[1] * bH;
      ctx.save(); ctx.fillStyle = r[2]; ctx.globalAlpha = 0.18; OSC.rrect(ctx, X, bY, 26, bH, 5); ctx.fill(); ctx.globalAlpha = 0.9; OSC.rrect(ctx, X, bY + bH - hh, 26, hh, 5); ctx.fill(); ctx.restore();
      OSC.text(ctx, r[0], X + 13, bY + bH + 12, { size: 11, color: r[2], weight: 800 });
    });

    // energy against time
    var B = { x: 40, y: W.y + W.h + 28, w: s.w - 58, h: s.h - (W.y + W.h + 28) - 12 };
    OSC.frame(ctx, B, t, 'E', t.ink2);
    OSC.line(ctx, B.x, B.y + B.h / 2, B.x + B.w, B.y + B.h / 2, t.ink, 1, [4, 4], 0.35);
    OSC.text(ctx, 'average of each = E/2', B.x + B.w, B.y + B.h / 2 - 8, { size: 10, color: t.ink3, align: 'right', weight: 700 });
    if (hist.length > 1) {
      [[1, t.accent], [2, t.violet]].forEach(function (c) {
        ctx.save(); ctx.strokeStyle = c[1]; ctx.lineWidth = 2; ctx.beginPath();
        hist.forEach(function (hp, ii) { var X = B.x + B.w * (1 - (tau - hp[0]) / (2.2 * TAU)), Y = B.y + B.h - hp[c[0]] * B.h; if (ii) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.stroke(); ctx.restore();
      });
    }
    OSC.text(ctx, '← earlier          now', B.x + B.w - 4, B.y + B.h + 10, { size: 10, color: t.ink3, align: 'right', weight: 700 });

    outX(OSC.signed(x / A) + ' A', Math.abs(Math.abs(x / A) - Math.SQRT1_2) < 0.03 ? 'x ≈ A/√2: KE = PE here' : 'drag the ball to change A');
    outK(Math.round(100 * ke / E) + '% of E', '½k(A² − x²)');
    outU(Math.round(100 * pe / E) + '% of E', anh ? '½kx² + ¼bx⁴' : '½kx²');
    var Tr = period(A) / TAU;
    outT(anh ? Tr.toFixed(2) + ' × 2π√(m/k)' : '2π√(m/k)', anh ? 'depends on amplitude: not SHM' : 'the same for every amplitude');
  });
}, { unitsWide: 10, aspect: 0.66, minHeight: 380, maxHeight: 520, hint: 'Drag the ball to set the amplitude' });

/* ═══════════════════════════ Lesson 5: the pendulum and its SHM twin ═══════════════════════════ */
Sim.register('osc-pendulum-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, PLANETS = { earth: ['Earth', 9.8], moon: ['Moon', 1.62], mars: ['Mars', 3.71], jupiter: ['Jupiter', 24.8] };
  var planet = 'earth', L = 1.5, ay = 0, ax = 0, phi = 0.35, om = 0, phi0 = 0.35, tRel = 0, twin = true, hist = [], tick = OSC.clock(), G = null, wasActive = false;
  function gvec() { return [-ax, -(PLANETS[planet][1] + ay)]; }
  function geff() { var g = gvec(); return Math.hypot(g[0], g[1]); }
  function phiEq() { var g = gvec(); return Math.atan2(g[0], -g[1]); }
  function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function release(a) { phi = phi0 = a; om = 0; tRel = 0; hist = []; }
  var Bh = stage.handle({ x: 0, y: 0, radius: 14 });
  Bh.onDrag = function (h) { if (!G) return; var p = stage.toScreen(h.x, h.y); var a = Math.atan2(p[0] - G.px, p[1] - G.py); a = OSC.clamp(a, -2.97, 2.97); phi = phi0 = a; om = 0; tRel = 0; hist = []; };
  var outG = stage.readout('Effective g'), outS = stage.readout('T from 2π√(L/g)'), outE = stage.readout('True period'), outA = stage.readout('Amplitude');
  OSC.radio(stage, [['earth', 'Earth'], ['moon', 'Moon'], ['mars', 'Mars'], ['jupiter', 'Jupiter']], planet, function (v) { planet = v; release(phiEq() + 0.35); });
  stage.toggle({ label: 'SHM twin', value: true, onChange: function (on) { twin = on; } });
  [10, 45, 90].forEach(function (d) { stage.button({ label: 'Let go from ' + d + '°', onClick: function () { release(phiEq() + d * Math.PI / 180); } }); });
  stage.slider({ label: 'Length L', min: 0.2, max: 2, step: 0.05, value: L, format: function (v) { return v.toFixed(2) + ' m'; }, onInput: function (v) { L = v; release(phi0); } });
  stage.slider({ label: 'Lift acceleration', min: -9.8, max: 9.8, step: 0.2, value: 0, format: function (v) { return OSC.signed(v, 1) + (v > 0 ? ' ↑' : v < 0 ? ' ↓' : ''); }, onInput: function (v) { ay = Math.abs(v) < 0.05 ? 0 : v; release(phiEq() + 0.35); } });
  stage.slider({ label: 'Car acceleration', min: 0, max: 9.8, step: 0.2, value: 0, format: function (v) { return v.toFixed(1) + (v ? ' →' : ''); }, onInput: function (v) { ax = v; release(phiEq() + 0.35); } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var t = s.theme, dt = tick(s, !Bh.active && OSC.motion());
    if (wasActive && !Bh.active) { tRel = 0; hist = []; }
    wasActive = Bh.active;
    var g = gvec(), ge = geff(), eq = phiEq(), free = ge < 0.05;
    var n = Math.ceil(dt * 240);
    for (var i = 0; i < n; i++) {
      var h = dt / n, f = function (a) { return (g[0] * Math.cos(a) + g[1] * Math.sin(a)) / L; };
      var k1p = om, k1o = f(phi), k2p = om + h / 2 * k1o, k2o = f(phi + h / 2 * k1p), k3p = om + h / 2 * k2o, k3o = f(phi + h / 2 * k2p), k4p = om + h * k3o, k4o = f(phi + h * k3p);
      phi += h / 6 * (k1p + 2 * k2p + 2 * k3p + k4p); om += h / 6 * (k1o + 2 * k2o + 2 * k3o + k4o);
    }
    tRel += dt;
    var amp = Math.abs(wrapA(phi0 - eq)), w0 = Math.sqrt(ge / L), Ts = TAU / w0, Te = 4 * Math.sqrt(L / ge) * OSC.ellipK(Math.sin(Math.min(amp, 3.1) / 2));
    if (dt > 0) { hist.push([tRel, wrapA(phi - eq)]); while (hist.length && tRel - hist[0][0] > 8) hist.shift(); }

    var narrow = s.w < 560, px = narrow ? s.w / 2 : s.w * 0.36, py = 40, Lmax = Math.min(s.h - 90, (narrow ? s.w * 0.42 : s.w * 0.3)), Lp = Lmax * L / 2;
    G = { px: px, py: py };
    // the frame: lift cabin or car outline when it is accelerating
    if (ay || ax) {
      ctx.save(); ctx.strokeStyle = t.ink3; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      OSC.rrect(ctx, px - Lmax - 24, 18, 2 * Lmax + 48, Lmax + 58, 14); ctx.stroke(); ctx.restore();
      if (ay) OSC.arrow(ctx, px - Lmax - 8, 70, 0, ay > 0 ? -34 : 34, t.warn, 2.6, 'a', t);
      if (ax) OSC.arrow(ctx, px + Lmax + 2, 34, 34, 0, t.warn, 2.6, 'a', t);
      OSC.text(ctx, ay && ax ? 'accelerating frame' : ay ? 'lift' : 'car', px - Lmax - 14, 30, { size: 10, color: t.ink3, align: 'left', weight: 700 });
    }
    OSC.hatch(ctx, px - 44, py, px + 44, py, -1, t.ink3);
    if (!free) { OSC.line(ctx, px, py, px + (Lp + 18) * Math.sin(eq), py + (Lp + 18) * Math.cos(eq), t.ink3, 1, [3, 4], 0.7); }
    // twin
    if (twin && !free && !Bh.active) {
      var tw = eq + wrapA(phi0 - eq) * Math.cos(w0 * tRel), tx = px + Lp * Math.sin(tw), ty = py + Lp * Math.cos(tw);
      OSC.line(ctx, px, py, tx, ty, t.violet, 1.5, [4, 3], 0.85); OSC.ring(ctx, tx, ty, 11, t.violet, 2, 0.95);
    }
    var bx = px + Lp * Math.sin(phi), by = py + Lp * Math.cos(phi);
    OSC.line(ctx, px, py, bx, by, t.ink2, 2);
    OSC.dot(ctx, bx, by, Bh.active || s.focused(Bh) ? 13 : 11, t.accent);
    OSC.dot(ctx, px, py, 3.5, t.ink2);
    var wp = s.toWorld(bx, by); if (!Bh.active) { Bh.x = wp[0]; Bh.y = wp[1]; }
    if (free) OSC.text(ctx, 'Weightless: no restoring force, so no oscillation', px, py + Lp + 34, { size: 12, color: t.warn, weight: 700 });

    // angle against time, true (accent) and twin (violet)
    if (!narrow && hist.length > 1) {
      var B = { x: s.w * 0.68, y: 40, w: s.w * 0.3 - 14, h: Math.min(140, s.h * 0.4) }, sc = Math.max(0.2, amp);
      OSC.frame(ctx, B, t, 'θ', t.ink2);
      OSC.text(ctx, 'angle, last 8 s', B.x + B.w, B.y - 8, { size: 10, color: t.ink3, align: 'right', weight: 700 });
      ctx.save(); ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.beginPath();
      hist.forEach(function (hp, ii) { var X = B.x + B.w * (1 - (tRel - hp[0]) / 8), Y = B.y + B.h / 2 - hp[1] / sc * B.h / 2 * 0.9; if (ii) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.restore();
      if (twin && !free) OSC.plot(ctx, B, function (u) { var tt = tRel - 8 * (1 - u); return tt < hist[0][0] ? NaN : wrapA(phi0 - eq) * Math.cos(w0 * tt) / sc * 0.9; }, t.violet, 1.6, { dash: [4, 3] });
      OSC.text(ctx, 'solid: real pendulum · dashed: SHM twin', B.x + B.w, B.y + B.h + 12, { size: 10, color: t.ink3, align: 'right', weight: 700 });
    }

    outG(ge.toFixed(2) + ' m/s²', PLANETS[planet][0] + (ay ? ', lift ' + OSC.signed(ay, 1) : '') + (ax ? ', car ' + ax.toFixed(1) : ''));
    outS(free ? '∞' : Ts.toFixed(2) + ' s', 'small-angle formula');
    outE(free ? '—' : Te.toFixed(2) + ' s', free ? '' : '+' + ((Te / Ts - 1) * 100).toFixed(amp < 0.4 ? 2 : 1) + '% on the formula');
    outA(Math.round(amp * 180 / Math.PI) + '°', ax ? 'measured from the tilted vertical' : 'from the vertical');
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 340, maxHeight: 480, hint: 'Drag the bob to pull it aside' });

/* ═══════════════════════════ Lesson 6: SHM in disguise ═══════════════════════════ */
Sim.register('osc-systems-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, g = 9.8, sys = 'utube', t = 0, tick = OSC.clock();
  var SYS = {
    utube: { name: 'U-tube', p: { l: 0.6 }, sl: [['l', 'Liquid column length ℓ', 0.2, 1.2, 0.05, function (v) { return v.toFixed(2) + ' m'; }]],
      T: function (p) { return TAU * Math.sqrt(p.l / (2 * g)); }, slow: 1,
      lines: ['Raise one side by y and the other falls by y.', 'The extra column 2y pushes back: F = −(2ρAg) y.', 'All of the liquid moves: m = ρAℓ, so ω² = 2g/ℓ.'] },
    float: { name: 'Floating block', p: { H: 0.3, r: 0.6 }, sl: [['H', 'Block height H', 0.1, 0.6, 0.05, function (v) { return v.toFixed(2) + ' m'; }], ['r', 'Density of block ÷ density of liquid', 0.2, 0.9, 0.05, function (v) { return v.toFixed(2); }]],
      T: function (p) { return TAU * Math.sqrt(p.r * p.H / g); }, slow: 1,
      lines: ['Push the block down by y: the extra buoyancy is ρAgy, with ρ the liquid’s density.', 'Its mass is m = σAH (σ is the block’s density), so ω² = ρg/(σH).', 'In short, T = 2π√(h/g), where h is the depth under water.'] },
    tunnel: { name: 'Tunnel through the Earth', p: { d: 0 }, sl: [['d', 'Tunnel distance from the centre', 0, 0.85, 0.05, function (v) { return Math.round(v * 100) + '% of R'; }]],
      T: function () { return TAU * Math.sqrt(6.371e6 / g); }, slow: 1 / 600,
      lines: ['Inside a uniform Earth, gravity falls in proportion to r: g(r) = g r/R.', 'Along any straight tunnel, the pull is F = −(mg/R) x.', 'T = 2π√(R/g) ≈ 84 min for every chord, centre or not.'] },
    piston: { name: 'Gas spring', p: { gm: 1.4 }, sl: [['gm', 'γ of the gas (1 = isothermal)', 1, 1.67, 0.01, function (v) { return v.toFixed(2); }]],
      T: function (p) { return TAU * Math.sqrt(1 * 1e-3 / (p.gm * 1e5 * 1e-6)); }, slow: 0.25,
      lines: ['Push the piston in by x: the volume drops by Ax.', 'Adiabatic: dP = −γP·dV/V, so F = −(γP₀A²/V₀) x.', 'M = 1 kg, A = 10 cm², V₀ = 1 L, P₀ = 1 bar.'] },
  };
  var outT = stage.readout('Period'), outS = stage.readout('Shown');
  OSC.radio(stage, Object.keys(SYS).map(function (k) { return [k, SYS[k].name]; }), sys, function (v) { sys = v; t = 0; build(); });
  function build() {
    stage.controls.innerHTML = '';
    SYS[sys].sl.forEach(function (d) { stage.slider({ label: d[1], min: d[2], max: d[3], step: d[4], value: SYS[sys].p[d[0]], format: d[5], onInput: function (v) { SYS[sys].p[d[0]] = v; } }); });
  }
  build();
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, S = SYS[sys], p = S.p, dt = tick(s, OSC.motion());
    t += dt;
    var T = S.T(p), ph = TAU * t * S.slow / T, c = Math.cos(ph), narrow = s.w < 560;
    var area = narrow ? { x: 10, y: 10, w: s.w - 20, h: s.h * 0.62 } : { x: s.w * 0.4, y: 10, w: s.w * 0.6 - 10, h: s.h - 20 };
    var cx = area.x + area.w / 2, cy = area.y + area.h / 2, F = -c;
    if (sys === 'utube') {
      var L = p.l, arm = Math.min(area.h * 0.72, 90 + L * 150), r = Math.min(area.w * 0.2, 58), tw = 24, xl = cx - r, xr = cx + r, yb = area.y + area.h - r - 16, y0 = yb - arm * 0.55, dy = 28 * c;
      ctx.save(); ctx.strokeStyle = th.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = tw - 3; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(xl, y0 - dy); ctx.lineTo(xl, yb); ctx.arc(cx, yb, r, Math.PI, 0, true); ctx.lineTo(xr, y0 + dy); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 2;
      [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(xl + k * tw / 2, yb - arm); ctx.lineTo(xl + k * tw / 2, yb); ctx.arc(cx, yb, r - k * tw / 2, Math.PI, 0, true); ctx.lineTo(xr - k * tw / 2, yb - arm); ctx.stroke(); });
      ctx.restore();
      OSC.line(ctx, xl - 26, y0, xr + 26, y0, th.ink3, 1, [3, 4], 0.7);
      var hi = dy > 0 ? xl : xr, side = dy > 0 ? -1 : 1;
      OSC.line(ctx, hi + side * (tw / 2 + 6), y0, hi + side * (tw / 2 + 6), y0 - Math.abs(dy), th.warn, 3, null, 0.9);
      OSC.arrow(ctx, hi, y0 - Math.abs(dy) - 26, 0, Math.min(22, Math.abs(F) * 30), th.warn, 2.4, '', th);
      if (Math.abs(c) > 0.2) OSC.text(ctx, 'extra column pulls back', hi + side * (tw / 2 + 12), y0 - Math.abs(dy) / 2, { size: 10, color: th.warn, align: side < 0 ? 'right' : 'left', weight: 700 });
    } else if (sys === 'float') {
      var tank = { x: cx - Math.min(area.w * 0.4, 150), w: Math.min(area.w * 0.8, 300), y: area.y + area.h * 0.18, h: area.h * 0.78 }, yw = tank.y + tank.h * 0.34;
      ctx.save(); ctx.fillStyle = th.accent; ctx.globalAlpha = 0.16; ctx.fillRect(tank.x, yw, tank.w, tank.y + tank.h - yw); ctx.restore();
      ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(tank.x, tank.y + tank.h); ctx.lineTo(tank.x + tank.w, tank.y + tank.h); ctx.lineTo(tank.x + tank.w, tank.y); ctx.stroke(); ctx.restore();
      OSC.line(ctx, tank.x, yw, tank.x + tank.w, yw, th.accent, 1.5);
      var Hp = 40 + p.H * 150, hp = p.r * Hp, bw = 70, by = yw - (Hp - hp) + 14 * c;
      OSC.block(ctx, cx - bw / 2, by, bw, Hp, th, '', th.violet);
      OSC.line(ctx, cx + bw / 2 + 8, yw, cx + bw / 2 + 8, yw + hp, th.ink3, 1.2); OSC.text(ctx, 'h', cx + bw / 2 + 16, yw + hp / 2, { size: 14, italic: true, math: true, color: th.ink2, align: 'left', weight: 500 });
      OSC.arrow(ctx, cx + bw / 2 + 30, by + Hp / 2, 0, F * 28, th.warn, 2.4, Math.abs(c) > 0.2 ? (c > 0 ? 'extra buoyancy' : 'weight wins') : '', th);
    } else if (sys === 'tunnel') {
      var R = Math.min(area.w, area.h) * 0.42, d = p.d * R, half = Math.sqrt(R * R - d * d), bx = cx + half * c, byy = cy + d;
      ctx.save(); var gr = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R); gr.addColorStop(0, th.warn); gr.addColorStop(1, th.accent); ctx.globalAlpha = 0.2; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.restore();
      OSC.ring(ctx, cx, cy, R, th.ink2, 2);
      OSC.line(ctx, cx - half, byy, cx + half, byy, th.ink2, 6, null, 0.4);
      OSC.dot(ctx, cx, cy, 3, th.ink3);
      var rr = Math.hypot(bx - cx, byy - cy) || 1, gl = 36 * rr / R;
      OSC.arrow(ctx, bx, byy, (cx - bx) / rr * gl, (cy - byy) / rr * gl, th.ink3, 1.8, '', th);
      OSC.arrow(ctx, bx, byy, (cx - bx) / R * 36, 0, th.warn, 2.6, Math.abs(c) > 0.25 ? 'along the tunnel' : '', th);
      OSC.dot(ctx, bx, byy, 8, th.violet);
    } else {
      var cw = 90, ctop = area.y + 20, cbot = area.y + area.h - 16, py = ctop + (cbot - ctop) * 0.38 + 16 * c;
      ctx.save(); ctx.fillStyle = th.violet; ctx.globalAlpha = 0.12 + 0.06 * c; ctx.fillRect(cx - cw / 2, py + 12, cw, cbot - py - 12); ctx.restore();
      ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - cw / 2 - 2, ctop); ctx.lineTo(cx - cw / 2 - 2, cbot); ctx.lineTo(cx + cw / 2 + 2, cbot); ctx.lineTo(cx + cw / 2 + 2, ctop); ctx.stroke(); ctx.restore();
      OSC.block(ctx, cx - cw / 2, py - 12, cw, 24, th, 'M', th.accent);
      for (var i = 0; i < 18; i++) { var qx = cx - cw / 2 + 8 + ((i * 37) % 74) + 4 * Math.sin(t * 7 + i), qy = py + 22 + ((i * 53) % Math.max(10, cbot - py - 32)) + 3 * Math.cos(t * 6 + i * 2); OSC.dot(ctx, qx, qy, 2.4, th.violet, 0.8); }
      OSC.arrow(ctx, cx + cw / 2 + 22, py, 0, F * 30, th.warn, 2.4, Math.abs(c) > 0.2 ? (c > 0 ? 'gas pushes up' : 'weight wins') : '', th);
      OSC.text(ctx, 'gas', cx, cbot - 12, { size: 11, color: th.violet, weight: 700 });
    }
    // the derivation, step by step
    var tx = narrow ? 16 : 16, ty = narrow ? area.y + area.h + 8 : 20, tw2 = narrow ? s.w - 32 : s.w * 0.4 - 28;
    OSC.text(ctx, S.name, tx, ty + 6, { size: 15, color: th.accent, align: 'left', weight: 800 });
    var yy = ty + 22;
    S.lines.forEach(function (l, i) { yy += OSC.wrap(ctx, (i + 1) + '. ' + l, tx, yy, tw2, { size: narrow ? 12 : 13, color: th.ink2 }) + 6; });
    var Tm = T >= 120 ? (T / 60).toFixed(1) + ' min' : T.toFixed(2) + ' s';
    outT(Tm, sys === 'tunnel' ? 'the same for every tunnel' : sys === 'piston' ? 'T ∝ 1/√γ' : sys === 'utube' ? 'T = 2π√(ℓ/2g)' : 'T = 2π√(h/g)');
    outS(S.slow === 1 ? 'real time' : S.slow < 1 / 10 ? 'time-lapse: 1 s = 10 min' : 'slow motion, 4× slower', '');
  });
}, { unitsWide: 10, aspect: 0.6, minHeight: 380, maxHeight: 500, hint: '' });

/* ═══════════════════════════ Lesson 6: adding two SHMs ═══════════════════════════ */
Sim.register('osc-combine-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, mode = 'line', A1 = 0.8, A2 = 0.6, dl = 60, p = 1, q = 1, th = 0, trail = [], tick = OSC.clock(), playing = true;
  var outR = stage.readout('Resultant'), outD = stage.readout('Phase / shape');
  OSC.radio(stage, [['line', 'Same line'], ['perp', 'At right angles']], mode, function (v) { mode = v; trail = []; ratios.btns.forEach(function (b) { b.style.display = v === 'perp' ? '' : 'none'; }); });
  var ratios = OSC.radio(stage, [['1:1', 'ω₁ : ω₂ = 1 : 1'], ['1:2', '1 : 2'], ['2:3', '2 : 3'], ['3:4', '3 : 4']], '1:1', function (v) { p = +v.split(':')[0]; q = +v.split(':')[1]; trail = []; });
  ratios.btns.forEach(function (b) { b.style.display = 'none'; });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.slider({ label: 'Amplitude A₁', min: 0, max: 1, step: 0.05, value: A1, format: function (v) { return v.toFixed(2); }, onInput: function (v) { A1 = v; trail = []; } });
  stage.slider({ label: 'Amplitude A₂', min: 0, max: 1, step: 0.05, value: A2, format: function (v) { return v.toFixed(2); }, onInput: function (v) { A2 = v; trail = []; } });
  stage.slider({ label: 'Phase difference δ', min: 0, max: 360, step: 5, value: dl, format: function (v) { return v + '°'; }, onInput: function (v) { dl = v; trail = []; } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var t = s.theme, dt = tick(s, playing && OSC.motion()), d = dl * Math.PI / 180;
    th += 1.1 * dt;
    if (mode === 'line') {
      var R0 = Math.max(30, Math.min(s.h * 0.2, s.w * 0.11)), cx = 16 + 2 * R0, cy = s.h / 2, trackX = cx + 2 * R0 + 26, x1 = s.w - 14;
      var a1 = [A1 * R0 * Math.cos(th), A1 * R0 * Math.sin(th)], a2 = [A2 * R0 * Math.cos(th + d), A2 * R0 * Math.sin(th + d)], res = [a1[0] + a2[0], a1[1] + a2[1]];
      var Rr = Math.sqrt(A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(d));
      OSC.ring(ctx, cx, cy, Rr * R0, t.warn, 1, 0.4, [3, 4]);
      OSC.line(ctx, cx - 2 * R0, cy, x1, cy, t.ink3, 1, null, 0.4);
      OSC.arrow(ctx, cx, cy, a1[0], -a1[1], t.accent, 2.4, '', t);
      OSC.arrow(ctx, cx + a1[0], cy - a1[1], a2[0], -a2[1], t.violet, 2.4, '', t);
      OSC.arrow(ctx, cx, cy, res[0], -res[1], t.warn, 3, '', t);
      function tag(x0, y0, dx, dy, lab, col, side) { var L = Math.hypot(dx, dy) || 1; Sim.label(ctx, lab, x0 + dx / 2 - dy / L * 13 * side, y0 + dy / 2 + dx / L * 13 * side, { size: 12, weight: 700, color: col, plate: t.plate }); }
      if (A1 > 0.05) tag(cx, cy, a1[0], -a1[1], 'A₁', t.accent, 1);
      if (A2 > 0.05) tag(cx + a1[0], cy - a1[1], a2[0], -a2[1], 'A₂', t.violet, 1);
      if (Rr > 0.05) tag(cx, cy, res[0], -res[1], 'R', t.warn, -1);
      OSC.line(ctx, cx + res[0], cy - res[1], trackX, cy - res[1], t.warn, 1, [3, 4], 0.7);
      OSC.line(ctx, trackX, cy - 2 * R0, trackX, cy + 2 * R0, t.ink3, 2, null, 0.6);
      var win = 10, X0 = trackX + 6, sp = (x1 - X0) / win;
      [[A1, 0, t.accent, 1.6], [A2, d, t.violet, 1.6]].forEach(function (c) {
        ctx.save(); ctx.strokeStyle = c[2]; ctx.lineWidth = c[3]; ctx.globalAlpha = 0.75; ctx.beginPath();
        for (var i = 0; i <= 200; i++) { var tau = win * i / 200, X = X0 + tau * sp, Y = cy - c[0] * R0 * Math.sin(th - 1.1 * tau + c[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.stroke(); ctx.restore();
      });
      ctx.save(); ctx.strokeStyle = t.warn; ctx.lineWidth = 2.8; ctx.beginPath();
      for (var i = 0; i <= 200; i++) { var tau = win * i / 200, X = X0 + tau * sp, Y = cy - R0 * (A1 * Math.sin(th - 1.1 * tau) + A2 * Math.sin(th - 1.1 * tau + d)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.restore();
      OSC.dot(ctx, trackX, cy - res[1], 7, t.warn);
      var al = Math.atan2(A2 * Math.sin(d), A1 + A2 * Math.cos(d)) * 180 / Math.PI;
      outR('R = ' + Rr.toFixed(2), '√(A₁² + A₂² + 2A₁A₂ cos δ)');
      outD('R leads A₁ by ' + Math.round(al) + '°', dl === 0 ? 'in phase: R = A₁ + A₂' : dl === 180 ? 'opposite: R = |A₁ − A₂|' : 'same frequency, still SHM');
    } else {
      var Rm = Math.min(s.h * 0.36, s.w * 0.3), cx2 = s.w / 2, cy2 = s.h / 2 - 6;
      function P(tt) { return [cx2 + A1 * Rm * Math.sin(p * tt), cy2 - A2 * Rm * Math.sin(q * tt + d)]; }
      ctx.save(); ctx.strokeStyle = t.ink3; ctx.globalAlpha = 0.22; ctx.lineWidth = 1; ctx.strokeRect(cx2 - Rm, cy2 - Rm, 2 * Rm, 2 * Rm); ctx.restore();
      ctx.save(); ctx.strokeStyle = t.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var j = 0; j <= 600; j++) { var pp = P(TAU * j / 600); if (j) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]); }
      ctx.stroke(); ctx.restore();
      var cur = P(th);
      if (dt > 0) { trail.push(cur); if (trail.length > 70) trail.shift(); }
      for (var k = 1; k < trail.length; k++) OSC.line(ctx, trail[k - 1][0], trail[k - 1][1], trail[k][0], trail[k][1], t.accent, 2.6, null, k / trail.length);
      OSC.line(ctx, cur[0], cy2 + Rm + 10, cur[0], cur[1], t.violet, 1, [2, 4], 0.6); OSC.line(ctx, cx2 - Rm - 10, cur[1], cur[0], cur[1], t.violet, 1, [2, 4], 0.6);
      OSC.dot(ctx, cur[0], cy2 + Rm + 10, 5, t.violet); OSC.dot(ctx, cx2 - Rm - 10, cur[1], 5, t.violet);
      OSC.dot(ctx, cur[0], cur[1], 7, t.warn);
      OSC.text(ctx, 'x = A₁ sin ω₁t', cx2, Math.min(s.h - 8, cy2 + Rm + 24), { size: 11, color: t.ink3, weight: 700 });
      var shape = p === q ? (dl % 180 === 0 ? 'a straight line' : (dl % 90 === 0 && Math.abs(A1 - A2) < 0.01) ? 'a circle' : 'an ellipse') : 'a Lissajous figure';
      outR('ω₁ : ω₂ = ' + p + ' : ' + q, 'y = A₂ sin(ω₂t + δ)');
      outD(shape, p === q ? 'same frequency at right angles' : 'closes because the ratio is a fraction');
    }
  });
}, { unitsWide: 10, aspect: 0.5, minHeight: 300, maxHeight: 430, hint: '' });

/* ═══════════════════════════ Lesson 7: damping, driving, resonance ═══════════════════════════ */
Sim.register('osc-resonance-lab', function (stage) {
  'use strict';
  var TAU = OSC.TAU, w0 = TAU / 1.5, r = 0.6, z = 0.08, drive = true, x = 0, v = 0, t = 0, tRel = 0, x0rel = 0, hist = [], tick = OSC.clock(), playing = true;
  function steady(rr) { return 1 / Math.sqrt(Math.pow(1 - rr * rr, 2) + Math.pow(2 * z * rr, 2)); }
  var outR = stage.readout('Drive ÷ natural'), outA = stage.readout('Steady amplitude'), outP = stage.readout('Phase lag'), outQ = stage.readout('Sharpness Q = 1/2ζ');
  stage.slider({ label: 'Driving frequency (× natural)', min: 0.2, max: 2.5, step: 0.01, value: r, format: function (v) { return v.toFixed(2) + ' ω₀'; }, onInput: function (v) { r = v; } });
  stage.slider({ label: 'Damping ζ', min: 0.03, max: 0.5, step: 0.01, value: z, format: function (v) { return v.toFixed(2); }, onInput: function (v) { z = v; } });
  var dBtn = stage.toggle({ label: 'Driver on', value: true, onChange: function (on) { drive = on; } });
  stage.button({ label: 'Start from rest', onClick: function () { x = 0; v = 0; t = 0; hist = []; drive = true; dBtn.setAttribute('aria-pressed', 'true'); } });
  stage.button({ label: 'Pluck, driver off', onClick: function () { drive = false; dBtn.setAttribute('aria-pressed', 'false'); x = 10; v = 0; tRel = t; x0rel = 10; } });
  var playBtn = stage.button({ label: 'Pause', onClick: function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; stage.setAnimating(playing); } });
  stage.setAnimating(true);

  stage.draw(function (ctx, s) {
    var th = s.theme, dt = tick(s, playing && OSC.motion()), wd = r * w0;
    var n = Math.ceil(dt * 400);
    for (var i = 0; i < n; i++) {
      var h = dt / n, f = function (tt, xx, vv) { return -w0 * w0 * (xx - (drive ? Math.sin(wd * tt) : 0)) - 2 * z * w0 * vv; };
      var k1x = v, k1v = f(t, x, v), k2x = v + h / 2 * k1v, k2v = f(t + h / 2, x + h / 2 * k1x, v + h / 2 * k1v), k3x = v + h / 2 * k2v, k3v = f(t + h / 2, x + h / 2 * k2x, v + h / 2 * k2v), k4x = v + h * k3v, k4v = f(t + h, x + h * k3x, v + h * k3v);
      x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v); t += h;
    }
    var xd = drive ? Math.sin(wd * t) : 0;
    if (dt > 0) { hist.push([t, x, xd]); while (hist.length && t - hist[0][0] > 10) hist.shift(); }
    var narrow = s.w < 600, D = Math.min(4, s.w / 160);
    // the machine: shaker, spring, block
    var my = 44, wallX = 34 + xd * D * 2.5, eq = s.w * (narrow ? 0.56 : 0.34), bx = eq + x * D;
    ctx.save(); ctx.fillStyle = th.ink3; ctx.globalAlpha = 0.25; OSC.rrect(ctx, wallX - 22, my - 26, 14, 52, 4); ctx.fill(); ctx.restore();
    OSC.line(ctx, wallX - 8, my - 26, wallX - 8, my + 26, th.ink2, 3);
    if (drive) OSC.text(ctx, 'driver', wallX - 15, my + 38, { size: 10, color: th.ink3, weight: 700 });
    OSC.spring(ctx, wallX - 8, my, bx - 18, my, { color: th.ink2, coils: 9, width: 8 });
    OSC.block(ctx, bx - 18, my - 18, 36, 36, th, 'm', th.accent);
    OSC.line(ctx, 12, my + 22, narrow ? s.w - 12 : s.w * 0.62, my + 22, th.ink3, 1.2, null, 0.5);

    // x(t) for the last 10 s
    var B = narrow ? { x: 34, y: 96, w: s.w - 50, h: s.h * 0.26 } : { x: 34, y: 96, w: s.w * 0.6 - 40, h: s.h - 120 }, ys = 1 / 18;
    OSC.frame(ctx, B, th, 'x', th.accent);
    if (hist.length > 1) {
      [[2, th.ink3, 1.4, [4, 3]], [1, th.accent, 2.2, null]].forEach(function (c) {
        ctx.save(); ctx.strokeStyle = c[1]; ctx.lineWidth = c[2]; if (c[3]) ctx.setLineDash(c[3]); ctx.beginPath();
        hist.forEach(function (hp, ii) { var X = B.x + B.w * (1 - (t - hp[0]) / 10), Y = B.y + B.h / 2 - OSC.clamp(hp[c[0]] * ys, -1, 1) * B.h / 2; if (ii) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.stroke(); ctx.restore();
      });
      if (!drive && x0rel) {
        [1, -1].forEach(function (sg) { OSC.plot(ctx, B, function (u) { var tt = t - 10 * (1 - u); return tt < tRel ? NaN : sg * x0rel * Math.exp(-z * w0 * (tt - tRel)) * ys; }, th.warn, 1.4, { dash: [5, 4] }); });
        OSC.text(ctx, 'envelope A₀e^(−bt/2m)', B.x + B.w, B.y + 8, { size: 10, color: th.warn, align: 'right', weight: 700 });
      } else OSC.text(ctx, 'dashed: the driver’s own motion', B.x + B.w, B.y + 8, { size: 10, color: th.ink3, align: 'right', weight: 700 });
    }

    // resonance curve
    var C = narrow ? { x: 34, y: B.y + B.h + 26, w: s.w - 50, h: s.h - (B.y + B.h + 26) - 22 } : { x: s.w * 0.64 + 10, y: 30, w: s.w * 0.36 - 28, h: s.h - 62 };
    var peak = steady(Math.sqrt(Math.max(0, 1 - 2 * z * z))) || 1, top = Math.max(4, peak * 1.08);
    ctx.save(); ctx.fillStyle = th.grid; ctx.globalAlpha = 0.5; OSC.rrect(ctx, C.x - 4, C.y - 4, C.w + 8, C.h + 8, 6); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = th.violet; ctx.lineWidth = 2.2; ctx.beginPath();
    for (var j = 0; j <= 200; j++) { var rr = 2.5 * j / 200, X = C.x + C.w * rr / 2.5, Y = C.y + C.h - steady(rr) / top * C.h; if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.restore();
    OSC.line(ctx, C.x + C.w * 0.4, C.y, C.x + C.w * 0.4, C.y + C.h, th.ink3, 1, [3, 4], 0.6);
    OSC.text(ctx, 'ω₀', C.x + C.w * 0.4, C.y + C.h + 12, { size: 11, color: th.ink3, weight: 700 });
    OSC.text(ctx, 'amplitude vs driving frequency', C.x + C.w / 2, C.y - 12, { size: 10, color: th.ink3, weight: 700 });
    var cxp = C.x + C.w * r / 2.5, cyp = C.y + C.h - steady(r) / top * C.h;
    OSC.line(ctx, cxp, C.y + C.h, cxp, cyp, th.warn, 1.2, [2, 3], 0.7);
    OSC.dot(ctx, cxp, cyp, 6, th.warn);
    if (drive && hist.length > 20) {
      var since = hist.filter(function (hp) { return t - hp[0] < TAU / wd * 1.05; }), mx = 0;
      since.forEach(function (hp) { mx = Math.max(mx, Math.abs(hp[1])); });
      OSC.ring(ctx, cxp, C.y + C.h - Math.min(mx, top) / top * C.h, 8, th.ink, 1.6, 0.9);
    }
    outR(r.toFixed(2), drive ? (Math.abs(r - 1) < 0.06 ? 'at resonance' : r < 1 ? 'below resonance' : 'above resonance') : 'driver off');
    outA(drive ? steady(r).toFixed(1) + ' × driver' : '—', drive ? 'ring: what the block does now' : 'free, damped oscillation');
    outP(drive ? Math.round(Math.atan2(2 * z * r, 1 - r * r) * 180 / Math.PI) + '°' : '—', 'block behind driver');
    outQ((1 / (2 * z)).toFixed(1), 'tall, narrow peak = high Q');
  });
}, { unitsWide: 10, aspect: 0.62, minHeight: 400, maxHeight: 540, hint: '' });

/* ═══════════════════════════ Lesson 8: SHM Rush ═══════════════════════════ */
Sim.register('osc-rush-lab', function (stage) {
  'use strict';
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // Each card: [question, right, wrong, wrong, why]
  var GEN = [
    function () { var c = pick([[1, 4, 'π s', '4π s', '0.5 s'], [1, 16, 'π/2 s', '8π s', '0.25 s'], [1, 100, 'π/5 s', '20π s', '0.1 s'], [4, 100, '2π/5 s', '10π s', '0.2 s'], [9, 100, '3π/5 s', '20π/3 s', '0.3 s']]);
      return ['A ' + c[0] + ' kg block on a spring with k = ' + c[1] + ' N/m. Period?', c[2], c[3], c[4], 'T = 2π√(m/k).']; },
    function () { var c = pick([[0.4, '2π/5 s', '10π s', 'π/5 s'], [2.5, 'π s', '4π s', 'π/2 s'], [0.1, 'π/5 s', '20π s', 'π/10 s'], [1.6, '4π/5 s', '5π s', '2π/5 s']]);
      return ['A simple pendulum ' + c[0] + ' m long, g = 10 m/s². Period?', c[1], c[2], c[3], 'T = 2π√(L/g).']; },
    function () { var c = pick([['g/4', '2T', 'T/2', '4T'], ['4g', 'T/2', '2T', 'T/4'], ['g/9', '3T', 'T/3', '9T']]);
      return ['A pendulum has period T on Earth. On a planet where gravity is ' + c[0] + ', its period is', c[1], c[2], c[3], 'T ∝ 1/√g.']; },
    function () { var c = pick([['goes up, accelerating at g/3', 'T√3/2', '2T/√3', 'T'], ['goes down, accelerating at g/2', 'T√2', 'T/√2', '2T'], ['falls freely', 'it stops oscillating', 'T', 'T/2'], ['goes up at constant speed', 'T', 'T√2', 'T/√2']]);
      return ['A pendulum of period T hangs in a lift that ' + c[0] + '. New period?', c[1], c[2], c[3], 'Use g_eff: g + a going up, g − a going down, 0 in free fall.']; },
    function () { var c = pick([[2, 'T/√2', 'T/2', 'T√2'], [3, 'T/√3', 'T/3', 'T√3'], [4, 'T/2', 'T/4', '2T'], [9, 'T/3', 'T/9', '3T']]);
      return ['A spring–mass system has period T. The spring is cut into ' + c[0] + ' equal parts and the same mass hangs from one part. Period?', c[1], c[2], c[3], 'k ∝ 1/length, so k becomes nk and T falls by √n.']; },
    function () { var c = pick([['in parallel', 'T/√2', 'T√2', 'T/2'], ['in series', 'T√2', 'T/√2', '2T'], ['one on each side of the block, both ends fixed to walls', 'T/√2', 'T√2', 'T']]);
      return ['One spring gives a block period T. With two such springs ' + c[0] + ', the period is', c[1], c[2], c[3], 'Parallel (and springs on both sides) add k; series halves it.']; },
    function () { var c = pick([['A/2', '3E/4', 'E/4', 'E/2'], ['A/√2', 'E/2', 'E/4', '3E/4'], ['√3A/2', 'E/4', '3E/4', 'E/2'], ['A/3', '8E/9', 'E/9', '2E/3']]);
      return ['In SHM with total energy E and amplitude A, the kinetic energy at x = ' + c[0] + ' is', c[1], c[2], c[3], 'KE = E(1 − x²/A²).']; },
    function () { var c = pick([['the mean position to x = A/2', 'T/12', 'T/6', 'T/8'], ['x = A/2 to x = A', 'T/6', 'T/12', 'T/4'], ['the mean position to x = A/√2', 'T/8', 'T/12', 'T/4'], ['x = −A/2 to x = +A/2', 'T/6', 'T/12', 'T/3'], ['x = +A to x = −A', 'T/2', 'T', 'T/4']]);
      return ['Shortest time to go from ' + c[0] + '?', c[1], c[2], c[3], 'Angle swept on the reference circle ÷ ω.']; },
    function () { var c = pick([['top speed', '1 m/s', '10 m/s', '0.01 m/s'], ['largest acceleration', '10 m/s²', '1 m/s²', '100 m/s²']]);
      return ['SHM with A = 0.1 m and ω = 10 rad/s. Its ' + c[0] + ' is', c[1], c[2], c[3], 'v_max = Aω, a_max = Aω².']; },
    function () { var c = pick([['x and a', 'π', 'π/2', '0'], ['x and v', 'π/2', 'π', '0'], ['v and a', 'π/2', 'π', '0']]);
      return ['In SHM, the phase difference between ' + c[0] + ' is', c[1], c[2], c[3], 'v leads x by π/2; a leads x by π.']; },
    function () { return ['A particle does SHM at frequency f. Its kinetic energy oscillates at', '2f', 'f', 'f/2', 'KE ∝ cos²(ωt): twice per cycle.']; },
    function () { var c = pick([['mass is made 4 times larger', '2T', '4T', 'T/2'], ['spring constant is made 4 times larger', 'T/2', '2T', 'T/4'], ['amplitude is doubled', 'T', '2T', '√2 T']]);
      return ['A spring–mass system has period T. If the ' + c[0] + ', the period becomes', c[1], c[2], c[3], 'T = 2π√(m/k): amplitude never enters.']; },
    function () { return ['The length of a seconds pendulum (period 2 s) on Earth is about', '1 m', '2 m', '25 cm', 'L = gT²/4π² ≈ 0.99 m.']; },
    function () { return ['A damped oscillator’s amplitude halves every 10 s. After 30 s it is', 'A/8', 'A/6', 'A/4', 'Exponential decay: ½ × ½ × ½.']; },
    function () { return ['Where is a particle in SHM when its acceleration is largest?', 'at either extreme', 'at the mean position', 'halfway out', '|a| = ω²|x|.']; },
    function () { return ['A ball dropped into a tunnel through the Earth’s centre comes back after about', '84 min', '42 min', '24 h', 'T = 2π√(R/g).']; },
  ];
  var ROUND = 12, TIME = 15;
  var queue = [], card = null, order = [], picked = -1, cardAt = 0, score = 0, streak = 0, best = +(OSC.store('jee-prep:osc-rush-best') || 0) || 0, seen = 0, playing = false, timer = 0, missed = [], ended = false, total = ROUND;
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
    if (right) { streak++; score += 10 + Math.min(streak, 5) * 2 + Math.max(0, Math.round(TIME - (performance.now() - cardAt) / 1000)); OSC.fx('correct', streak); }
    else { streak = 0; OSC.fx('wrong'); if (missed.indexOf(card) < 0) { missed.push(card); queue.splice(Math.min(queue.length, 3), 0, card); total++; } }
    setTimeout(function () { if (playing) next(); }, right ? 900 : 2600);
    stage.invalidate();
  }
  function tick() { if (!playing) return; if (picked === -1 && (performance.now() - cardAt) / 1000 > TIME) answer(-1); stage.invalidate(); }
  function finish() {
    playing = false; ended = true; clearInterval(timer); timer = 0; card = null;
    if (score > best) { best = score; OSC.store('jee-prep:osc-rush-best', best); }
    opts.forEach(function (b) { b.disabled = true; b.textContent = '—'; b.removeAttribute('aria-pressed'); });
    OSC.fx('complete'); stage.invalidate();
  }
  stage.draw(function (ctx, s) {
    var t = s.theme, cx = s.w / 2;
    outS(String(score), playing ? 'card ' + seen + ' of ' + total : ''); outK(String(streak), streak >= 3 ? 'on a roll' : ''); outB(String(best), 'kept on this device');
    if (!card) {
      Sim.label(ctx, ended ? 'Round over: ' + score + ' points' : 'SHM Rush', cx, s.h * 0.3, { size: 24, weight: 800, color: t.accent });
      OSC.wrap(ctx, ended ? (missed.length ? 'You missed ' + missed.length + '. Each one came back for a second try. Play again to beat your best.' : 'A clean sweep. Try to beat your best.') : '12 quick questions with 15 seconds each. Answer fast for bonus points and keep a streak going. Press Start round.', cx, s.h * 0.3 + 26, Math.min(460, s.w - 40), { size: 13, color: t.ink2, align: 'center' });
      return;
    }
    var el = (performance.now() - cardAt) / 1000, frac = picked !== -1 ? 0 : Math.max(0, 1 - el / TIME);
    ctx.save(); ctx.fillStyle = t.grid; OSC.rrect(ctx, 20, 18, s.w - 40, 8, 4); ctx.fill();
    ctx.fillStyle = frac < 0.3 ? t.warn : t.accent; OSC.rrect(ctx, 20, 18, (s.w - 40) * frac, 8, 4); ctx.fill(); ctx.restore();
    var hq = OSC.wrap(ctx, card[0], cx, 48, Math.min(560, s.w - 40), { size: s.w < 480 ? 16 : 19, weight: 650, color: t.ink, align: 'center' });
    var y = 48 + hq + 26;
    if (picked !== -1) {
      var right = picked >= 0 && order[picked] === 1;
      Sim.label(ctx, right ? 'Correct!' : picked === -2 ? 'Time’s up: ' + card[1] : 'Not quite: ' + card[1], cx, y, { size: 16, weight: 800, color: right ? t.ok : t.warn });
      OSC.wrap(ctx, card[4], cx, y + 18, Math.min(520, s.w - 40), { size: 13, color: t.ink2, align: 'center' });
    } else Sim.label(ctx, 'Pick an answer below (or press 1, 2, 3)', cx, y, { size: 12, weight: 600, color: t.ink3 });
  });
  stage.canvas.addEventListener('keydown', function (e) { if (/^[123]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); } });
}, { unitsWide: 10, aspect: 0.45, minHeight: 280, maxHeight: 360, hint: '' });
