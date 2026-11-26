/**
 * Labs for Alcohols, Phenols & Ethers. Shared drawing helpers first (APE), then six labs:
 *   ape-hbond-lab      (Lesson 4)  molecules in a box: hydrogen bonds, boiling, mixing with water
 *   ape-acidity-lab    (Lesson 5)  build a substituted phenol and read its pKa off a ladder
 *   ape-lucas-lab      (Lesson 6)  four test tubes race to turn cloudy with the Lucas reagent
 *   ape-mechanism-lab  (Lessons 6, 9)  step-by-step curved-arrow mechanisms with moving atoms
 *   ape-phenol-lab     (Lesson 8)  electrophilic substitution and other reactions of phenol
 *   ape-rush-lab       (Lesson 10) Reagent Rush, a quick-fire reaction game
 * Everything is drawn from the page's CSS colours, so the labs follow light/dark mode and the chapter tone.
 */
var APE = (function () {
  'use strict';
  var FONT = 'Inter Variable, Roboto, system-ui, sans-serif', SERIF = 'KaTeX_Main, "Times New Roman", serif';
  /** Split a formula into runs: digits after a letter or ')' are subscripts; '^x' is a superscript. */
  function runs(s) {
    var out = [], prev = '', i = 0, c;
    while (i < s.length) {
      c = s[i];
      if (/[0-9]/.test(c) && /[A-Za-z)\]]/.test(prev)) {
        var j = i; while (j < s.length && /[0-9]/.test(s[j])) j++;
        out.push({ t: s.slice(i, j), k: 'sub' }); prev = s[j - 1]; i = j; continue;
      }
      if (c === '^' && i + 1 < s.length) { out.push({ t: s[i + 1], k: 'sup' }); prev = s[i + 1]; i += 2; continue;
      }
      if (out.length && out[out.length - 1].k === 'n') out[out.length - 1].t += c; else out.push({ t: c, k: 'n' });
      prev = c; i++;
    }
    return out;
  }
  function fontFor(o, small) { return (o.weight || 500) + ' ' + ((o.size || 14) * (small ? 0.72 : 1)).toFixed(1) + 'px ' + (o.serif === false ? FONT : SERIF); }
  /** Width of a formula drawn with chem(). */
  function measure(ctx, s, o) {
    o = o || {}; var w = 0;
    runs(s).forEach(function (r) { ctx.font = fontFor(o, r.k !== 'n'); w += ctx.measureText(r.t).width; });
    return w;
  }
  /** Draw a formula with real subscripts. o: { size, color, align: 'center'|'left'|'right', weight, serif, plate } */
  function chem(ctx, s, x, y, o) {
    o = o || {};
    var size = o.size || 14, w = measure(ctx, s, o), x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.plate) {
      ctx.fillStyle = o.plate; ctx.beginPath();
      var ph = size + 10;
      if (ctx.roundRect) ctx.roundRect(x0 - 7, y - ph / 2, w + 14, ph, ph / 2); else ctx.rect(x0 - 7, y - ph / 2, w + 14, ph);
      ctx.fill();
    }
    ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    runs(s).forEach(function (r) {
      ctx.font = fontFor(o, r.k !== 'n');
      var dy = r.k === 'sub' ? size * 0.3 : r.k === 'sup' ? -size * 0.36 : 0;
      ctx.fillText(r.t, x0, y + dy + 0.5); x0 += ctx.measureText(r.t).width;
    });
    ctx.restore();
    return w;
  }
  /** Plain text with wrapping; returns the height used. */
  function wrap(ctx, text, x, y, maxW, o) {
    o = o || {};
    var size = o.size || 13, lh = o.lh || size * 1.35, words = String(text).split(' '), line = '', lines = [];
    ctx.save(); ctx.font = (o.weight || 500) + ' ' + size + 'px ' + FONT;
    words.forEach(function (wd) { var t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; });
    if (line) lines.push(line);
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    ctx.restore();
    return lines.length * lh;
  }
  /** Hexagon vertices, position 1 at the top, clockwise. */
  function verts(x, y, r) { var p = []; for (var k = 0; k < 6; k++) { var a = -Math.PI / 2 + k * Math.PI / 3; p.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } return p; }
  /** Benzene ring with substituents. o: { subs: {pos: label}, color, lw, doubles: [[a,b]], subColor: {pos: colour}, alpha, bond } */
  function ring(ctx, x, y, r, o) {
    o = o || {};
    var p = verts(x, y, r), col = o.color || '#fff', doubles = o.doubles || [[1, 2], [3, 4], [5, 6]], bond = o.bond || r * 0.62;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = o.lw || 2; ctx.lineJoin = ctx.lineCap = 'round';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); p.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
    doubles.forEach(function (d) {
      var a = p[d[0] - 1], b = p[d[1] - 1], ia = [a[0] + (x - a[0]) * 0.2, a[1] + (y - a[1]) * 0.2], ib = [b[0] + (x - b[0]) * 0.2, b[1] + (y - b[1]) * 0.2];
      var sx = (ib[0] - ia[0]) * 0.12, sy = (ib[1] - ia[1]) * 0.12;
      ctx.beginPath(); ctx.moveTo(ia[0] + sx, ia[1] + sy); ctx.lineTo(ib[0] - sx, ib[1] - sy); ctx.stroke();
    });
    ctx.restore();
    Object.keys(o.subs || {}).forEach(function (k) {
      var lab = o.subs[k]; if (!lab) return;
      var q = p[k - 1], ux = (q[0] - x) / r, uy = (q[1] - y) / r, dbl = lab[0] === '=';
      if (dbl) lab = lab.slice(1);
      var ex = q[0] + ux * bond, ey = q[1] + uy * bond, c = (o.subColor && o.subColor[k]) || col;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = o.lw || 2; ctx.lineCap = 'round';
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      if (o.subAlpha && o.subAlpha[k] != null) ctx.globalAlpha = o.subAlpha[k];
      if (dbl) { var px = -uy * 2.4, py = ux * 2.4; ctx.beginPath(); ctx.moveTo(q[0] + px, q[1] + py); ctx.lineTo(ex + px, ey + py); ctx.moveTo(q[0] - px, q[1] - py); ctx.lineTo(ex - px, ey - py); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(ex, ey); ctx.stroke(); }
      var al = Math.abs(ux) < 0.2 ? 'center' : ux > 0 ? 'left' : 'right', fs = o.size || Math.max(12, r * 0.5);
      var lx = ex + (al === 'left' ? 3 : al === 'right' ? -3 : 0), ly = ey + (Math.abs(ux) < 0.2 ? (uy < 0 ? -fs * 0.6 : fs * 0.65) : uy * fs * 0.35);
      chem(ctx, lab, lx, ly, { size: fs, color: c, align: al, weight: 500, alpha: o.subAlpha && o.subAlpha[k] != null ? o.subAlpha[k] : o.alpha });
      ctx.restore();
    });
    return p;
  }
  function glow(ctx, x, y, r, color, a) {
    ctx.save(); var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /** Buttons that behave as a radio group. items: [[value, label]] */
  function radio(stage, items, value, onPick) {
    var btns = items.map(function (it) {
      return stage.toggle({ label: it[1], value: it[0] === value, onChange: function () { set(it[0]); onPick(it[0]); } });
    });
    function set(v) { btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(items[i][0] === v)); }); }
    return { set: set, btns: btns };
  }
  function motion() { return !window.FX || window.FX.motionOK(); }
  function fx(n, a) { if (window.FX) window.FX.play(n, a); }
  return { chem: chem, measure: measure, wrap: wrap, ring: ring, verts: verts, glow: glow, rrect: rrect, ease: ease, lerp: lerp, radio: radio, motion: motion, fx: fx, FONT: FONT };
})();

/* ═══════════════════════════ Lesson 4: the sticky-molecule box ═══════════════════════════ */
Sim.register('ape-hbond-lab', function (stage) {
  'use strict';
  var SUBS = {
    light: {
      alkane: { name: 'Propane', f: 'CH3CH2CH3', M: 44, bp: 231, mix: 0, len: 7 },
      ether: { name: 'Methoxymethane', f: 'CH3OCH3', M: 46, bp: 248, mix: 0.95, len: 7 },
      alcohol: { name: 'Ethanol', f: 'CH3CH2OH', M: 46, bp: 351, mix: 1, len: 7 },
    },
    heavy: {
      alkane: { name: 'Pentane', f: 'CH3(CH2)3CH3', M: 72, bp: 309, mix: 0, len: 11 },
      ether: { name: 'Ethoxyethane', f: 'C2H5OC2H5', M: 74, bp: 308, mix: 0.18, len: 11 },
      alcohol: { name: 'Butan-1-ol', f: 'CH3(CH2)3OH', M: 74, bp: 391, mix: 0.22, len: 11 },
    },
  };
  var fam = 'alcohol', heavy = false, water = false, T = 298, N = 32, NW = 30;
  var mols = [], waters = [], hbAvg = 0;
  function rnd() { return Math.random(); }
  function make(kind) { return { kind: kind, x: 0, y: 0, vx: 0, vy: 0, u: rnd(), m: rnd(), hx: rnd(), hy: rnd(), a: rnd() * 6.28, ph: rnd() * 6.28, gas: false, init: false }; }
  for (var i = 0; i < N; i++) mols.push(make('org'));
  for (i = 0; i < NW; i++) waters.push(make('w'));

  var outC = stage.readout('Compound'), outB = stage.readout('Boiling point'), outS = stage.readout('At this temperature'), outH = stage.readout('H-bonds per molecule');
  stage.slider({ label: 'Temperature', min: 180, max: 420, step: 1, value: T, format: function (v) { return v + ' K'; }, onInput: function (v) { T = v; } });
  APE.radio(stage, [['alkane', 'Alkane'], ['ether', 'Ether'], ['alcohol', 'Alcohol']], fam, function (v) { fam = v; });
  stage.toggle({ label: 'Heavier (C₄–C₅)', value: false, onChange: function (on) { heavy = on; } });
  stage.toggle({ label: 'Add water', value: false, onChange: function (on) { water = on; } });
  stage.setAnimating(true);

  function fvap(bp) { return 1 / (1 + Math.exp(-(T - bp) / 3.5)); }
  function sub() { return SUBS[heavy ? 'heavy' : 'light'][fam]; }

  stage.draw(function (ctx, s) {
    var t = s.theme, S = sub(), now = s.time, moving = APE.motion();
    var B = { l: 14, t: 40, r: s.w - 74, b: s.h - 14 }, W = B.r - B.l, H = B.b - B.t;
    // vessel
    ctx.save(); ctx.strokeStyle = t.ink3; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.l, B.t); ctx.lineTo(B.l, B.b); ctx.lineTo(B.r, B.b); ctx.lineTo(B.r, B.t); ctx.stroke(); ctx.restore();
    APE.chem(ctx, S.name + ' · ' + S.f, B.l, 18, { size: 14, color: t.ink, align: 'left', serif: false, weight: 650 });

    // who is liquid, who is gas, which layer
    var fv = fvap(S.bp), fw = fvap(373), A0 = (W * H) / 105; // area per liquid molecule
    var orgLiq = [], orgMix = [], wLiq = [];
    mols.forEach(function (m) { m.gas = m.u < fv; if (!m.gas) { if (water && m.m < S.mix) orgMix.push(m); else orgLiq.push(m); } });
    waters.forEach(function (m) { m.gas = water && m.u < fw; if (water && !m.gas) wLiq.push(m); });
    var hWater = water ? Math.min(H * 0.8, (wLiq.length + orgMix.length) * A0 / W) : 0, hOrg = Math.min(H * 0.8 - hWater, orgLiq.length * A0 / W);
    var yW = B.b - hWater, yO = yW - hOrg, surface = yO;
    if (water && hWater > 1) { ctx.save(); ctx.fillStyle = t.neg; ctx.globalAlpha = 0.1; ctx.fillRect(B.l + 1, yW, W - 2, hWater - 1); ctx.restore(); }
    if (hOrg > 1) { ctx.save(); ctx.fillStyle = t.warn; ctx.globalAlpha = 0.08; ctx.fillRect(B.l + 1, yO, W - 2, hOrg); ctx.restore(); }

    var amp = 1.2 + (T - 180) / 240 * 3.2, spd = Math.sqrt(T / S.M) * 0.55, wspd = Math.sqrt(T / 18) * 0.55;
    function place(m, top, h, speed) {
      if (!m.gas) {
        var tx = B.l + 10 + m.hx * (W - 20) + (moving ? Math.sin(now * 3 + m.ph) * amp : 0), ty = top + 6 + m.hy * Math.max(0, h - 12) + (moving ? Math.cos(now * 2.6 + m.ph) * amp : 0);
        if (!m.init) { m.x = tx; m.y = ty; m.init = true; }
        m.x += (tx - m.x) * 0.12; m.y += (ty - m.y) * 0.12; m.a += moving ? Math.sin(now + m.ph) * 0.02 : 0;
      } else {
        if (!m.init || !m.vx) { var an = rnd() * 6.28; m.vx = Math.cos(an); m.vy = -Math.abs(Math.sin(an)); if (!m.init) { m.x = B.l + 10 + m.hx * (W - 20); m.y = B.t + 10 + m.hy * Math.max(10, surface - B.t - 20); m.init = true; } }
        if (moving) { m.x += m.vx * speed; m.y += m.vy * speed; m.a += 0.04; }
        if (m.x < B.l + 6) { m.x = B.l + 6; m.vx = Math.abs(m.vx); } if (m.x > B.r - 6) { m.x = B.r - 6; m.vx = -Math.abs(m.vx); }
        if (m.y < B.t - 18) { m.y = B.t - 18; m.vy = Math.abs(m.vy); } if (m.y > surface - 6) { m.y = surface - 6; m.vy = -Math.abs(m.vy); }
      }
      if (m.gas && !moving) { m.x = B.l + 10 + m.hx * (W - 20); m.y = B.t + 6 + m.hy * Math.max(4, surface - B.t - 12); }
    }
    orgLiq.forEach(function (m) { place(m, yO, hOrg, spd); });
    orgMix.forEach(function (m) { place(m, yW, hWater, spd); });
    wLiq.forEach(function (m) { place(m, yW, hWater, wspd); });
    mols.forEach(function (m) { if (m.gas) place(m, 0, 0, spd); else m.vx = 0; });
    waters.forEach(function (m) { if (water && m.gas) place(m, 0, 0, wspd); else if (!water) { m.init = false; m.vx = 0; } });

    // hydrogen bonds between liquid neighbours
    var donor = fam === 'alcohol', acceptor = fam !== 'alkane', liq = orgLiq.concat(orgMix), parts = liq.map(function (m) { return { m: m, d: donor, a: acceptor, w: false }; }).concat(wLiq.map(function (m) { return { m: m, d: true, a: true, w: true }; }));
    var R = 34, cnt = new Map(), orgBonds = 0;
    ctx.save(); ctx.setLineDash([3, 4]); ctx.lineWidth = 1.8;
    for (var a = 0; a < parts.length; a++) for (var b = a + 1; b < parts.length; b++) {
      var p = parts[a], q = parts[b];
      if (!((p.d && q.a) || (q.d && p.a))) continue;
      var d = Math.hypot(p.m.x - q.m.x, p.m.y - q.m.y); if (d > R) continue;
      if ((cnt.get(p.m) || 0) >= 3 || (cnt.get(q.m) || 0) >= 3) continue;
      cnt.set(p.m, (cnt.get(p.m) || 0) + 1); cnt.set(q.m, (cnt.get(q.m) || 0) + 1);
      var ww = p.w && q.w; if (!p.w) orgBonds++; if (!q.w) orgBonds++;
      ctx.strokeStyle = ww ? t.neg : t.violet; ctx.globalAlpha = ww ? 0.35 : 0.85;
      ctx.beginPath(); ctx.moveTo(p.m.x, p.m.y); ctx.lineTo(q.m.x, q.m.y); ctx.stroke();
    }
    ctx.restore();
    hbAvg += ((liq.length ? orgBonds / mols.length : 0) - hbAvg) * 0.1;

    // molecules (smaller on narrow screens)
    var gs = Math.max(0.72, Math.min(1.25, W / 560));
    function drawOrg(m) {
      var L = S.len, c = Math.cos(m.a), sn = Math.sin(m.a);
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.scale(gs, gs);
      ctx.strokeStyle = t.ink3; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = m.gas ? 0.75 : 1;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
      if (fam === 'ether') { ctx.fillStyle = t.pos; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, 7); ctx.fill(); }
      if (fam === 'alcohol') { ctx.fillStyle = t.pos; ctx.beginPath(); ctx.arc(L + 2, 0, 4, 0, 7); ctx.fill(); ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(L + 6, 3, 2.2, 0, 7); ctx.fill(); }
      ctx.restore(); void c; void sn;
    }
    function drawW(m) {
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.scale(gs, gs); ctx.globalAlpha = m.gas ? 0.7 : 0.9;
      ctx.fillStyle = t.neg; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(4, 3, 2, 0, 7); ctx.arc(-4, 3, 2, 0, 7); ctx.fill(); ctx.restore();
    }
    if (water) waters.forEach(drawW);
    mols.forEach(drawOrg);

    // thermometer
    var tx = s.w - 40, ty0 = B.t, ty1 = B.b, TY = function (v) { return ty1 - (v - 180) / 240 * (ty1 - ty0); };
    ctx.save(); ctx.strokeStyle = t.ink3; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(tx, ty0); ctx.lineTo(tx, ty1); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = t.warn; ctx.beginPath(); ctx.moveTo(tx, ty1); ctx.lineTo(tx, TY(T)); ctx.stroke(); ctx.restore();
    function tick(v, label, col) { var y = TY(v); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 12, y); ctx.lineTo(tx + 12, y); ctx.stroke(); ctx.restore(); Sim.label(ctx, label, tx - 16, y, { size: 10, weight: 700, color: col, align: 'right', plate: t.plate }); }
    tick(S.bp, 'b.p. ' + S.bp, t.pos);
    if (water) tick(373, 'water 373', t.neg);
    Sim.label(ctx, T + ' K', tx, ty0 - 14, { size: 11, weight: 700, color: t.warn });

    var state = T < S.bp - 6 ? 'liquid' : T > S.bp + 6 ? 'gas — boiled away' : 'boiling';
    outC(S.name, S.f.replace(/(\D)(\d+)/g, function (m0, a1, d1) { return a1 + d1.replace(/\d/g, function (x) { return '₀₁₂₃₄₅₆₇₈₉'[x]; }); }) + ' · M = ' + S.M);
    outB(S.bp + ' K', fam === 'alcohol' ? 'donor + acceptor' : fam === 'ether' ? 'acceptor only' : 'no H-bonds');
    outS(state, water ? (S.mix > 0.9 ? 'mixes with water' : S.mix > 0.1 ? 'partly mixes, rest floats on top' : 'floats on water as a layer') : '');
    outH(hbAvg.toFixed(1), water ? 'violet = to compound' : 'dashed lines');
  });
}, { unitsWide: 10, aspect: 0.6, minHeight: 320, maxHeight: 470, hint: '' });

/* ═══════════════════════════ Lesson 5: the pKa ladder ═══════════════════════════ */
Sim.register('ape-acidity-lab', function (stage) {
  'use strict';
  var DATA = {
    H: { name: 'Phenol', p: { o: 10.0, m: 10.0, p: 10.0 } },
    NO2: { name: 'nitrophenol', lab: 'NO2', p: { o: 7.2, m: 8.3, p: 7.1 }, kind: 'w' },
    Cl: { name: 'chlorophenol', lab: 'Cl', p: { o: 8.6, m: 9.1, p: 9.4 }, kind: 'wi' },
    CH3: { name: 'cresol', lab: 'CH3', p: { o: 10.2, m: 10.1, p: 10.2 }, kind: 'd' },
    OCH3: { name: 'methoxyphenol', lab: 'OCH3', p: { o: 10.0, m: 9.7, p: 10.2 }, kind: 'dr' },
    DNP: { name: '2,4-Dinitrophenol', p: 4.0, multi: [2, 4] },
    TNP: { name: '2,4,6-Trinitrophenol (picric acid)', p: 0.4, multi: [2, 4, 6] },
  };
  var POS = { o: 2, m: 3, p: 4 }, PREF = { o: 'o-', m: 'm-', p: 'p-' };
  var sub = 'NO2', pos = 'p', shown = null, fizz = 0;
  function cur() {
    var d = DATA[sub];
    if (d.multi) return { name: d.name, pk: d.p, subs: d.multi.reduce(function (o, k) { o[k] = 'NO2'; return o; }, {}), why: ['−R and −I, ×' + d.multi.length, 'each o/p nitro group takes more of the charge'] };
    if (sub === 'H') return { name: 'Phenol', pk: 10.0, subs: {}, why: ['reference', 'charge spread over O and the o, p carbons'] };
    var pk = d.p[pos], s = {}; s[POS[pos]] = d.lab;
    var why = {
      w: pos === 'm' ? ['−I only', 'resonance cannot reach the meta carbon'] : ['−R and −I', 'the charge is pulled onto the NO₂ oxygens'],
      wi: pos === 'o' ? ['−I, close by', 'induction is strongest next door and beats weak +R'] : pos === 'm' ? ['−I only', 'weaker with distance'] : ['−I minus +R', 'the weak +R partly cancels −I'],
      d: ['+I', 'CH₃ pushes charge back onto the ring'],
      dr: pos === 'm' ? ['−I only', 'no +R at meta, so MORE acidic than phenol'] : pos === 'p' ? ['+R beats −I', 'charge pushed back onto the ring'] : ['+R ≈ −I', 'the two effects nearly cancel'],
    }[d.kind];
    return { name: PREF[pos] + d.name, pk: pk, subs: s, why: why };
  }
  var outP = stage.readout('pKa'), outV = stage.readout('Compared with phenol'), outW = stage.readout('Why');
  APE.radio(stage, [['H', 'H (phenol)'], ['NO2', '–NO₂'], ['Cl', '–Cl'], ['CH3', '–CH₃'], ['OCH3', '–OCH₃'], ['DNP', '2,4-(NO₂)₂'], ['TNP', '2,4,6-(NO₂)₃']], sub, function (v) { sub = v; });
  var posR = APE.radio(stage, [['o', 'ortho'], ['m', 'meta'], ['p', 'para']], pos, function (v) { pos = v; });
  stage.button({ label: 'Add NaHCO₃', onClick: function () { fizz = performance.now(); stage.setAnimating(true); setTimeout(function () { stage.setAnimating(false); stage.invalidate(); }, 2800); } });

  var REFS = [[4.76, 'CH3COOH', 'r'], [6.4, 'H2CO3', 'line'], [10.0, 'phenol', 'r'], [15.7, 'H2O', 'l'], [15.9, 'ethanol', 'r']];
  stage.draw(function (ctx, s) {
    var t = s.theme, c = cur();
    posR.btns.forEach(function (b) { b.disabled = sub === 'H' || !!DATA[sub].multi; });
    if (shown == null) shown = c.pk;
    var target = c.pk; shown += (target - shown) * (APE.motion() ? 0.16 : 1);
    if (Math.abs(target - shown) > 0.01) stage.invalidate(); else shown = target;
    // ring
    var rx = s.w * 0.27, ry = s.h * 0.55, R = Math.min(s.w * 0.1, s.h * 0.17), V = APE.verts(rx, ry, R);
    var ewgOP = (sub === 'NO2' && pos !== 'm') || sub === 'DNP' || sub === 'TNP';
    var oGlow = sub === 'TNP' ? 0.35 : sub === 'DNP' ? 0.5 : ewgOP ? 0.65 : sub === 'CH3' || (sub === 'OCH3' && pos !== 'm') ? 1.15 : 0.9;
    var Ox = rx, Oy = ry - R - R * 0.62 - 10;
    APE.glow(ctx, Ox, Oy, 34 * oGlow + 8, t.pos, 0.55);
    [2, 4, 6].forEach(function (k) { APE.glow(ctx, V[k - 1][0], V[k - 1][1], 22, t.pos, 0.35 * oGlow); });
    Object.keys(c.subs).forEach(function (k) {
      if (c.subs[k] !== 'NO2' || +k === 3) return;
      var q = V[k - 1], ux = (q[0] - rx) / R, uy = (q[1] - ry) / R;
      APE.glow(ctx, q[0] + ux * R * 1.15, q[1] + uy * R * 1.15, 30, t.pos, 0.45);
    });
    var subs = Object.assign({ 1: 'O^−' }, c.subs), colors = { 1: t.pos };
    APE.ring(ctx, rx, ry, R, { subs: subs, color: t.ink, subColor: colors, size: Math.max(13, R * 0.42) });
    APE.chem(ctx, c.name, rx, s.h - 22, { size: 13, color: t.ink2, serif: false, weight: 650 });
    var narrow = s.w < 560;
    if (!narrow) Sim.label(ctx, 'the conjugate base: where does the − charge sit?', rx, 18, { size: 11, weight: 600, color: t.ink3 });

    // ladder
    var lx = s.w * 0.66, top = 30, bot = s.h - 26, Y = function (pk) { return top + pk / 18 * (bot - top); };
    ctx.save(); ctx.strokeStyle = t.ink3; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bot); ctx.stroke();
    for (var v = 0; v <= 18; v += 2) { ctx.beginPath(); ctx.moveTo(lx - 5, Y(v)); ctx.lineTo(lx + 5, Y(v)); ctx.stroke(); Sim.label(ctx, String(v), lx - 10, Y(v), { size: 10, weight: 600, color: t.ink3, align: 'right' }); }
    ctx.restore();
    Sim.label(ctx, 'stronger acid', lx - 10, top - 14 + (narrow ? 6 : 0), { size: 10, weight: 700, color: t.ok, align: 'right' });
    Sim.label(ctx, 'weaker acid', lx - 10, bot + 14, { size: 10, weight: 700, color: t.ink3, align: 'right' });
    REFS.forEach(function (r) {
      var y = Y(r[0]);
      if (r[2] === 'line') {
        ctx.save(); ctx.strokeStyle = t.warn; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx - 30, y); ctx.lineTo(s.w - 8, y); ctx.stroke(); ctx.restore();
        APE.chem(ctx, narrow ? 'H2CO3 6.4' : 'H2CO3 6.4 — NaHCO3 fizzes above this', s.w - 10, y - 9, { size: 10.5, color: t.warn, align: 'right', serif: false, weight: 650 });
        return;
      }
      ctx.save(); ctx.fillStyle = t.ink2; ctx.beginPath(); ctx.arc(lx, y, 3, 0, 7); ctx.fill(); ctx.restore();
      APE.chem(ctx, r[1] + ' ' + r[0], r[2] === 'l' ? lx - 30 : lx + 12, y, { size: 11, color: t.ink2, align: r[2] === 'l' ? 'right' : 'left', serif: false, weight: 560 });
    });
    var my = Y(shown);
    ctx.save(); ctx.strokeStyle = t.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx - 14, my); ctx.lineTo(lx + 14, my); ctx.stroke(); ctx.restore();
    APE.chem(ctx, 'pKa ' + c.pk.toFixed(1), lx + 22, my, { size: 13, color: t.accent, align: 'left', serif: false, weight: 760, plate: t.plate });

    // bicarbonate test
    if (fizz) {
      var age = (performance.now() - fizz) / 1000;
      if (age < 2.8) {
        if (c.pk < 6.4) {
          for (var i = 0; i < 18; i++) {
            var ph = (i * 0.37 + age * 0.9) % 1, bx = rx - R * 1.2 + (i * 53 % 100) / 100 * R * 2.4, by = ry + R * 1.6 - ph * R * 3.2;
            ctx.save(); ctx.strokeStyle = t.ok; ctx.globalAlpha = 1 - ph; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 7); ctx.stroke(); ctx.restore();
          }
          Sim.label(ctx, 'CO₂ fizzes — stronger than carbonic acid', rx, s.h - 44, { size: 12, weight: 700, color: t.ok, plate: t.plate });
        } else Sim.label(ctx, 'No fizz — too weak an acid (pKa > 6.4)', rx, s.h - 44, { size: 12, weight: 700, color: t.bad || t.pos, plate: t.plate });
      } else fizz = 0;
    }
    var ratio = Math.pow(10, 10 - c.pk);
    outP(c.pk.toFixed(1), c.name);
    outV(Math.abs(c.pk - 10) < 0.05 ? 'same' : ratio > 1 ? '≈ ' + (ratio >= 100 ? Math.round(ratio).toLocaleString() : ratio.toFixed(1)) + '× stronger' : '≈ ' + (1 / ratio).toFixed(1) + '× weaker', 'Ka ratio = 10^(10.0 − pKa)');
    outW(c.why[0], c.why[1]);
  });
}, { unitsWide: 10, aspect: 0.56, minHeight: 330, maxHeight: 460, hint: '' });

/* ═══════════════════════════ Lesson 6: the Lucas race ═══════════════════════════ */
Sim.register('ape-lucas-lab', function (stage) {
  'use strict';
  var FOURTH = [
    { name: 'ethanol', f: 'CH3CH2OH', cls: '1°', t: Infinity, hot: 420 },
    { name: 'benzyl alcohol', f: 'C6H5CH2OH', cls: '1°, benzylic', t: 8 },
    { name: 'allyl alcohol', f: 'CH2=CHCH2OH', cls: '1°, allylic', t: 12 },
    { name: 'cyclohexanol', f: 'C6H11OH', cls: '2°', t: 260 },
  ];
  var tubes = [
    { name: '2-methylpropan-2-ol', f: '(CH3)3COH', cls: '3°', t: 3 },
    { name: 'butan-2-ol', f: 'CH3CH(OH)C2H5', cls: '2°', t: 300 },
    { name: 'butan-1-ol', f: 'CH3(CH2)3OH', cls: '1°', t: Infinity, hot: 480 },
    FOURTH[1],
  ];
  var k4 = 1, started = 0, heat = false, heatAt = 0, timer = 0, SPEED = 60, END = 420;
  var outClock = stage.readout('Clock (60× speed)'), outR = stage.readout('Cloudy so far');
  stage.button({ label: 'Add Lucas reagent', onClick: function () { start(); } });
  var hb = stage.toggle({ label: 'Heat', value: false, onChange: function (on) { heat = on; heatAt = simT(); if (on && !started) start(); } });
  var b4 = stage.button({ label: 'Tube 4: benzyl alcohol', onClick: function () { k4 = (k4 + 1) % FOURTH.length; tubes[3] = FOURTH[k4]; b4.textContent = 'Tube 4: ' + FOURTH[k4].name; reset(); } });
  stage.button({ label: 'Reset', onClick: function () { reset(); } });
  function reset() { started = 0; heat = false; hb.setAttribute('aria-pressed', 'false'); clearInterval(timer); timer = 0; stage.invalidate(); }
  function start() {
    started = performance.now(); clearInterval(timer);
    if (!APE.motion()) started = performance.now() - END / SPEED * 1000; // motion off: show the outcome at once
    timer = setInterval(function () { stage.invalidate(); if (simT() > END + 30) { clearInterval(timer); timer = 0; } }, 60);
    APE.fx('reveal');
  }
  function simT() { return started ? (performance.now() - started) / 1000 * SPEED : 0; }
  function onset(tb) { if (isFinite(tb.t)) return tb.t; if (heat && tb.hot) return Math.max(heatAt, 0) + 70; return Infinity; }
  function fmt(sec) { sec = Math.floor(sec); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }

  stage.draw(function (ctx, s) {
    var t = s.theme, T = simT(), n = tubes.length, gap = s.w / n, tw = Math.min(46, gap * 0.38), th = s.h * (gap < 130 ? 0.46 : 0.55), top = 40, done = [];
    tubes.forEach(function (tb, i) {
      var cx = gap * (i + 0.5), x0 = cx - tw / 2, liqTop = top + th * 0.32, on = onset(tb), age = started ? T - on : -1;
      var turb = age > 0 ? Math.min(1, age / 25) : 0, layer = age > 30 ? Math.min(1, (age - 30) / 60) : 0;
      // liquid
      ctx.save(); APE.rrect(ctx, x0, liqTop, tw, th - th * 0.32, [0, 0, tw / 2, tw / 2]); ctx.clip();
      ctx.fillStyle = t.neg; ctx.globalAlpha = 0.12 + (started ? 0.05 : 0); ctx.fillRect(x0, liqTop, tw, th);
      if (turb > 0) {
        ctx.globalAlpha = 0.75 * turb * (1 - layer * 0.7); ctx.fillStyle = t.light ? '#d8dbe6' : '#e9ecf5'; ctx.fillRect(x0, liqTop, tw, th);
        for (var k = 0; k < 26; k++) { var px = x0 + ((k * 37) % 100) / 100 * tw, py = liqTop + ((k * 61) % 100) / 100 * th * 0.66; ctx.globalAlpha = 0.5 * turb * (1 - layer); ctx.beginPath(); ctx.arc(px + Math.sin(T / 8 + k) * 2, py, 1.6, 0, 7); ctx.fill(); }
      }
      if (layer > 0) { ctx.globalAlpha = 0.85; ctx.fillStyle = t.warn; ctx.fillRect(x0, liqTop, tw, th * 0.14 * layer); }
      ctx.restore();
      // glass
      ctx.save(); ctx.strokeStyle = t.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, top + th - tw / 2); ctx.arc(cx, top + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(x0 + tw, top); ctx.stroke(); ctx.restore();
      // labels
      var dy = gap < 130 && i % 2 ? 36 : 0, fsz = gap < 130 ? 11 : 12.5;
      APE.chem(ctx, tb.f, cx, top + th + 18 + dy, { size: fsz, color: t.ink, serif: true });
      ctx.font = '600 ' + (gap < 130 ? 9.5 : 10.5) + 'px ' + APE.FONT; var nw = ctx.measureText(tb.name).width / 2 + 4;
      Sim.label(ctx, tb.name, Math.max(nw, Math.min(s.w - nw, cx)), top + th + 34 + dy, { size: gap < 130 ? 9.5 : 10.5, weight: 600, color: t.ink2 });
      Sim.label(ctx, tb.cls, cx, top - 14, { size: 11, weight: 750, color: t.accent });
      var status = !started ? 'clear' : turb > 0 ? 'cloudy at ' + fmt(on) : heat && tb.hot ? 'heating…' : 'clear';
      Sim.label(ctx, status, cx, top + th + 50 + dy, { size: gap < 130 ? 9.5 : 10.5, weight: 700, color: turb > 0 ? t.ok : t.ink3 });
      if (turb > 0) done.push(tb.cls + ' ' + fmt(on));
      if (heat) { for (var f = 0; f < 3; f++) { var fy = top + th + 6 + Math.sin(performance.now() / 120 + f + i) * 1.5; ctx.save(); ctx.fillStyle = t.warn; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(cx - 8 + f * 8, fy, 3, 6, 0, 0, 7); ctx.fill(); ctx.restore(); } }
    });
    outClock(started ? fmt(Math.min(T, 9999)) : '0:00', started ? (T >= END ? 'about 7 minutes of real reaction time' : 'simulated minutes:seconds') : 'press Add Lucas reagent');
    outR(done.length ? done.join(' · ') : '—', heat ? 'heated: the primary alcohol reacts eventually' : 'oily layer on top = alkyl chloride');
  });
}, { unitsWide: 10, aspect: 0.6, minHeight: 340, maxHeight: 460, hint: '' });

/* ═══════════════════════════ Lessons 6 & 9: the mechanism player ═══════════════════════════ */
Sim.register('ape-mechanism-lab', function (stage) {
  'use strict';
  /* A mechanism is a list of steps. Each step lists its atoms {id: [label, x, y, charge]}, bonds [[a, b, order]],
     curved arrows [[from, to]] (from/to: an atom id, or 'a-b' for the middle of a bond; a from-atom means one of its
     lone pairs) and a caption. Atoms keep their ids between steps, so they glide to their new places. */
  var M = {
    dehydration: { title: 'Dehydration of ethanol', steps: [
      { cap: 'Step 1 · Protonation (fast). A lone pair on oxygen takes H⁺ from the acid. –OH becomes –OH₂⁺, which can leave as water.',
        at: { hb: ['H', -2.6, 1.1], cb: ['CH2', -1.8, 0], ca: ['CH2', -0.2, 0], o: ['O', 1.2, 0.6], ho: ['H', 2.2, 1.2], hp: ['H^+', 3.4, -0.7], b: ['HSO4^−', -3.6, 2.2, ''] },
        bo: [['hb', 'cb', 1], ['cb', 'ca', 1], ['ca', 'o', 1], ['o', 'ho', 1]], ar: [['o', 'hp']] },
      { cap: 'Step 2 · Water leaves (slow — the rate-determining step). The C–O bonding pair goes with the oxygen, leaving a carbocation.',
        at: { hb: ['H', -2.6, 1.1], cb: ['CH2', -1.8, 0], ca: ['CH2', -0.2, 0, '+?'], o: ['O', 1.2, 0.6, '+'], ho: ['H', 2.2, 1.2], hp: ['H', 1.9, -0.3], b: ['HSO4^−', -3.6, 2.2] },
        bo: [['hb', 'cb', 1], ['cb', 'ca', 1], ['ca', 'o', 1], ['o', 'ho', 1], ['o', 'hp', 1]], ar: [['ca-o', 'o']] },
      { cap: 'Step 3 · A base removes an H from the carbon next door; that C–H bonding pair becomes the new π bond.',
        at: { hb: ['H', -2.6, 1.1], cb: ['CH2', -1.8, 0], ca: ['CH2', -0.2, 0, '+'], o: ['O', 2.9, 0.9], ho: ['H', 3.9, 1.5], hp: ['H', 3.6, 0.0], b: ['HSO4^−', -3.6, 2.2] },
        bo: [['hb', 'cb', 1], ['cb', 'ca', 1], ['o', 'ho', 1], ['o', 'hp', 1]], ar: [['b', 'hb'], ['hb-cb', 'cb-ca']] },
      { cap: 'Ethene and water. The acid is regenerated (H₂SO₄), so it was only a catalyst.',
        at: { hb: ['H', -3.2, 1.6], cb: ['CH2', -1.8, 0], ca: ['CH2', -0.2, 0], o: ['O', 2.9, 0.9], ho: ['H', 3.9, 1.5], hp: ['H', 3.6, 0.0], b: ['HSO4', -3.6, 2.2] },
        bo: [['cb', 'ca', 2], ['o', 'ho', 1], ['o', 'hp', 1], ['hb', 'b', 1]], ar: [] },
    ] },
    shift: { title: '3,3-Dimethylbutan-2-ol', steps: [
      { cap: 'Step 1 · Protonation of the –OH by the acid (fast).',
        at: { c1: ['CH3', -2.8, -0.6], c2: ['C', -1.2, 0], h2: ['H', -1.2, -1.4], o: ['O', -1.2, 1.6], ho: ['H', -0.3, 2.2], hp: ['H^+', 1.6, 2.6], c3: ['C', 0.6, -0.6], ma: ['CH3', 0.6, 1.0], mb: ['CH3', 2.3, -0.2], mc: ['CH3', 0.6, -2.2] },
        bo: [['c1', 'c2', 1], ['c2', 'h2', 1], ['c2', 'o', 1], ['o', 'ho', 1], ['c2', 'c3', 1], ['c3', 'ma', 1], ['c3', 'mb', 1], ['c3', 'mc', 1]], ar: [['o', 'hp']] },
      { cap: 'Step 2 · Water leaves, giving a secondary (2°) carbocation.',
        at: { c1: ['CH3', -2.8, -0.6], c2: ['C', -1.2, 0], h2: ['H', -1.2, -1.4], o: ['O', -1.2, 1.6, '+'], ho: ['H', -0.3, 2.2], hp: ['H', -2.1, 2.2], c3: ['C', 0.6, -0.6], ma: ['CH3', 0.6, 1.0], mb: ['CH3', 2.3, -0.2], mc: ['CH3', 0.6, -2.2] },
        bo: [['c1', 'c2', 1], ['c2', 'h2', 1], ['c2', 'o', 1], ['o', 'ho', 1], ['o', 'hp', 1], ['c2', 'c3', 1], ['c3', 'ma', 1], ['c3', 'mb', 1], ['c3', 'mc', 1]], ar: [['c2-o', 'o']] },
      { cap: 'Step 3 · 1,2-Methyl shift. A methyl group on the next carbon moves over with its bonding pair — the 2° cation becomes a more stable 3° cation.',
        at: { c1: ['CH3', -2.8, -0.6], c2: ['C', -1.2, 0, '+'], h2: ['H', -1.2, -1.4], o: ['O', -2.9, 2.4], ho: ['H', -2.0, 3.0], hp: ['H', -3.8, 3.0], c3: ['C', 0.6, -0.6], ma: ['CH3', 0.6, 1.0], mb: ['CH3', 2.3, -0.2], mc: ['CH3', 0.6, -2.2] },
        bo: [['c1', 'c2', 1], ['c2', 'h2', 1], ['o', 'ho', 1], ['o', 'hp', 1], ['c2', 'c3', 1], ['c3', 'ma', 1], ['c3', 'mb', 1], ['c3', 'mc', 1]], ar: [['c3-ma', 'c2']] },
      { cap: 'Step 4 · The new 3° cation loses the H⁺ from the neighbouring carbon; that C–H pair becomes the π bond, giving the most substituted alkene.',
        at: { c1: ['CH3', -2.8, -0.6], c2: ['C', -1.2, 0], h2: ['H', -1.2, -1.4], o: ['O', -2.9, 2.4], ho: ['H', -2.0, 3.0], hp: ['H', -3.8, 3.0], c3: ['C', 0.6, -0.6, '+'], ma: ['CH3', -1.2, 1.6], mb: ['CH3', 2.3, -0.2], mc: ['CH3', 0.6, -2.2] },
        bo: [['c1', 'c2', 1], ['c2', 'h2', 1], ['o', 'ho', 1], ['o', 'hp', 1], ['c2', 'c3', 1], ['c2', 'ma', 1], ['c3', 'mb', 1], ['c3', 'mc', 1]], ar: [['h2-c2', 'c2-c3']] },
      { cap: '2,3-Dimethylbut-2-ene, (CH₃)₂C=C(CH₃)₂ — the major product. Without the shift you would have expected 3,3-dimethylbut-1-ene.',
        at: { c1: ['CH3', -2.8, -0.6], c2: ['C', -1.2, 0], h2: ['H^+', -2.2, -2.1], o: ['O', -2.9, 2.4], ho: ['H', -2.0, 3.0], hp: ['H', -3.8, 3.0], c3: ['C', 0.6, -0.6], ma: ['CH3', -1.2, 1.6], mb: ['CH3', 2.3, -0.2], mc: ['CH3', 0.6, -2.2] },
        bo: [['c1', 'c2', 1], ['o', 'ho', 1], ['o', 'hp', 1], ['c2', 'c3', 2], ['c2', 'ma', 1], ['c3', 'mb', 1], ['c3', 'mc', 1]], ar: [] },
    ] },
    'cleave-sn2': { title: 'Methoxyethane + HI', steps: [
      { cap: 'Step 1 · HI protonates the ether oxygen, turning –OR into a group that can leave as a neutral alcohol.',
        at: { me: ['CH3', -1.5, 0], o: ['O', 0, 0], et: ['CH2CH3', 1.8, 0], h: ['H', 0.4, 1.7], i: ['I', 1.9, 2.3] },
        bo: [['me', 'o', 1], ['o', 'et', 1], ['h', 'i', 1]], ar: [['o', 'h'], ['h-i', 'i']] },
      { cap: 'Step 2 · Iodide attacks the LESS hindered carbon — the methyl — from the back (SN2), pushing the C–O pair onto oxygen.',
        at: { me: ['CH3', -1.5, 0], o: ['O', 0, 0, '+'], et: ['CH2CH3', 1.8, 0], h: ['H', 0, 1.2], i: ['I^−', -3.4, 0.2] },
        bo: [['me', 'o', 1], ['o', 'et', 1], ['o', 'h', 1]], ar: [['i', 'me'], ['me-o', 'o']] },
      { cap: 'Iodomethane + ethanol. With excess HI, ethanol would go on to iodoethane.',
        at: { me: ['CH3', -2.0, 0], o: ['O', 0.9, 0], et: ['CH2CH3', 2.7, 0], h: ['H', 0.9, 1.2], i: ['I', -3.4, 0] },
        bo: [['i', 'me', 1], ['o', 'et', 1], ['o', 'h', 1]], ar: [] },
    ] },
    'cleave-sn1': { title: 'tert-Butyl methyl ether + HI', steps: [
      { cap: 'Step 1 · Protonation of the ether oxygen by HI.',
        at: { tb: ['(CH3)3C', -1.9, 0], o: ['O', 0, 0], me: ['CH3', 1.5, 0], h: ['H', 0.4, 1.7], i: ['I', 1.9, 2.3] },
        bo: [['tb', 'o', 1], ['o', 'me', 1], ['h', 'i', 1]], ar: [['o', 'h'], ['h-i', 'i']] },
      { cap: 'Step 2 · The bond to the TERTIARY carbon breaks on its own (SN1): methanol leaves and a stable 3° carbocation forms.',
        at: { tb: ['(CH3)3C', -1.9, 0], o: ['O', 0, 0, '+'], me: ['CH3', 1.5, 0], h: ['H', 0, 1.2], i: ['I^−', -3.0, 2.0] },
        bo: [['tb', 'o', 1], ['o', 'me', 1], ['o', 'h', 1]], ar: [['tb-o', 'o']] },
      { cap: 'Step 3 · Iodide captures the carbocation.',
        at: { tb: ['(CH3)3C', -2.2, 0, '+'], o: ['O', 1.0, 0], me: ['CH3', 2.5, 0], h: ['H', 1.0, 1.2], i: ['I^−', -3.0, 2.0] },
        bo: [['o', 'me', 1], ['o', 'h', 1]], ar: [['i', 'tb']] },
      { cap: '2-Iodo-2-methylpropane + methanol: here the BIG group gets the iodine — the opposite of the SN2 case.',
        at: { tb: ['(CH3)3C', -2.2, 0], o: ['O', 1.0, 0], me: ['CH3', 2.5, 0], h: ['H', 1.0, 1.2], i: ['I', -2.2, 1.6] },
        bo: [['tb', 'i', 1], ['o', 'me', 1], ['o', 'h', 1]], ar: [] },
    ] },
  };
  var host = stage.host.closest('[data-sim]'), mech = (host && host.dataset.mech) || 'dehydration';
  if (!M[mech]) mech = 'dehydration';
  var step = 0, from = 0, t0 = 0, DUR = 750;
  var outS = stage.readout('Step');
  var ORDER = mech.indexOf('cleave') === 0 ? ['cleave-sn2', 'cleave-sn1', 'dehydration', 'shift'] : ['dehydration', 'shift', 'cleave-sn2', 'cleave-sn1'];
  APE.radio(stage, ORDER.map(function (k) { return [k, M[k].title]; }), mech, function (v) { mech = v; step = from = 0; t0 = 0; stage.invalidate(); });
  stage.button({ label: '◀ Back', onClick: function () { go(step - 1); } });
  stage.button({ label: 'Next ▶', onClick: function () { go(step + 1); } });
  stage.button({ label: 'Restart', onClick: function () { go(0); } });
  function go(n) {
    var L = M[mech].steps.length; n = Math.max(0, Math.min(L - 1, n)); if (n === step) return;
    from = step; step = n; t0 = performance.now(); APE.fx('tap');
    if (APE.motion()) { stage.setAnimating(true); setTimeout(function () { stage.setAnimating(false); stage.invalidate(); }, DUR + 450); }
  }

  function pt(st, ref, P) {
    if (ref.indexOf('-') > 0) { var ab = ref.split('-'), a = P[ab[0]], b = P[ab[1]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, true]; }
    return [P[ref][0], P[ref][1], false];
  }
  stage.draw(function (ctx, s) {
    var t = s.theme, steps = M[mech].steps, S = steps[step], F = steps[from];
    var k = t0 && APE.motion() ? APE.ease((performance.now() - t0) / DUR) : 1;
    // fit every step of this mechanism into the canvas, above the caption
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    steps.forEach(function (st) { Object.keys(st.at).forEach(function (id) { var a = st.at[id]; if (!a[0]) return; x0 = Math.min(x0, a[1]); x1 = Math.max(x1, a[1]); y0 = Math.min(y0, a[2]); y1 = Math.max(y1, a[2]); }); });
    var sc = Math.min((s.w - 90) / (x1 - x0 + 1.2), (s.h - 120) / (y1 - y0 + 0.6), 80), ox = s.w / 2 - (x0 + x1) / 2 * sc, oy = 24 + (s.h - 100) / 2 + (y0 + y1) / 2 * sc;
    var P = {}, A = {};
    function scr(x, y) { return [ox + x * sc, oy - y * sc]; }
    Object.keys(S.at).forEach(function (id) {
      var a = S.at[id], b = F.at[id] || a, x = APE.lerp(b[1], a[1], k), y = APE.lerp(b[2], a[2], k);
      P[id] = scr(x, y); A[id] = a;
    });
    // bonds: fade out the old, fade in the new
    function key(b) { return [b[0], b[1]].sort().join('|') + ':' + b[2]; }
    var now = {}, was = {}; S.bo.forEach(function (b) { now[key(b)] = b; }); F.bo.forEach(function (b) { was[key(b)] = b; });
    var all = Object.assign({}, was, now);
    Object.keys(all).forEach(function (kk) {
      var b = all[kk], alpha = now[kk] && was[kk] ? 1 : now[kk] ? k : 1 - k; if (from === step) alpha = now[kk] ? 1 : 0;
      if (alpha <= 0.02 || !P[b[0]] || !P[b[1]]) return;
      var p = P[b[0]], q = P[b[1]], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var pad = function (id) {
        var lab = (A[id] && A[id][0]) || ''; if (!lab) return 2;
        var hw = APE.measure(ctx, lab, { size: 18 }) / 2 + 4, hh = 12;
        return Math.min(Math.abs(ux) > 0.01 ? hw / Math.abs(ux) : 1e9, Math.abs(uy) > 0.01 ? hh / Math.abs(uy) : 1e9);
      };
      var pa = pad(b[0]), pb = pad(b[1]);
      ctx.save(); ctx.strokeStyle = t.ink; ctx.globalAlpha = alpha; ctx.lineWidth = 2; ctx.lineCap = 'round';
      var offs = b[2] === 2 ? [-3, 3] : [0];
      offs.forEach(function (o) { ctx.beginPath(); ctx.moveTo(p[0] + ux * pa - uy * o, p[1] + uy * pa + ux * o); ctx.lineTo(q[0] - ux * pb - uy * o, q[1] - uy * pb + ux * o); ctx.stroke(); });
      ctx.restore();
    });
    // atoms
    Object.keys(S.at).forEach(function (id) {
      var a = S.at[id], f = F.at[id], p = P[id], lab = k < 0.5 && f ? f[0] : a[0], ch = k < 0.5 && f ? f[3] : a[3];
      if (!lab) return;
      var isO = /^O/.test(lab), col = isO ? t.pos : /^I/.test(lab) ? t.violet : t.ink;
      var w = APE.chem(ctx, lab, p[0], p[1], { size: 18, color: col, weight: 500 });
      if (ch && ch !== '+?') { Sim.label(ctx, ch === '+' ? '+' : '−', p[0] + w / 2 + 6, p[1] - 11, { size: 13, weight: 800, color: ch === '+' ? t.warn : t.neg }); }
      if (ch === '+' && /^C/.test(lab) && !isO) APE.glow(ctx, p[0], p[1], 26, t.warn, 0.35);
    });
    // curved arrows, once the atoms have settled
    if (k >= 1) {
      S.ar.forEach(function (r, j) {
        var a = pt(S, r[0], P), b = pt(S, r[1], P), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        var sx = a[0] + (a[2] ? 0 : dx / L * 12) - dy / L * (a[2] ? 4 : 8), sy = a[1] + (a[2] ? 0 : dy / L * 12) + dx / L * (a[2] ? 4 : 8) - (a[2] ? 0 : 6);
        var ex = b[0] - dx / L * (b[2] ? 2 : 14), ey = b[1] - dy / L * (b[2] ? 2 : 14);
        var bend = (j % 2 ? -1 : 1) * Math.max(24, Math.min(60, L * 0.45)), cx = (sx + ex) / 2 - dy / L * bend, cy = (sy + ey) / 2 + dx / L * bend;
        ctx.save(); ctx.strokeStyle = t.accent; ctx.fillStyle = t.accent; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
        var hx = ex - cx, hy = ey - cy, hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - hx * 10 - hy * 5, ey - hy * 10 + hx * 5); ctx.lineTo(ex - hx * 10 + hy * 5, ey - hy * 10 - hx * 5); ctx.closePath(); ctx.fill();
        if (!a[2]) { ctx.beginPath(); ctx.arc(sx - 3, sy, 1.8, 0, 7); ctx.arc(sx + 3, sy, 1.8, 0, 7); ctx.fill(); }
        ctx.restore();
      });
    }
    // caption
    ctx.save(); ctx.fillStyle = t.plate; APE.rrect(ctx, 10, s.h - 70, s.w - 20, 60, 12); ctx.fill(); ctx.restore();
    APE.wrap(ctx, S.cap, 22, s.h - 62, s.w - 44, { size: 13, color: t.ink, weight: 560 });
    outS((step + 1) + ' / ' + steps.length, M[mech].title);
  });
}, { unitsWide: 10, aspect: 0.62, minHeight: 360, maxHeight: 500, hint: '' });

/* ═══════════════════════════ Lesson 8: phenol reaction explorer ═══════════════════════════ */
Sim.register('ape-phenol-lab', function (stage) {
  'use strict';
  var R = {
    brcs2: { label: 'Br₂ / CS₂, 273 K', el: 'Br₂ (weakly polarised)', name: 'p-Bromophenol', detail: 'major; some o-bromophenol', subs: { 1: 'OH', 4: 'Br' }, ghost: { 2: 'Br' }, at: [4], note: 'Low-polarity solvent, low temperature: phenol stays un-ionised, so the reaction stops after one bromine.' },
    brw: { label: 'Br₂ water', el: 'Br₂ (polarised by water)', name: '2,4,6-Tribromophenol', detail: 'white precipitate', subs: { 1: 'OH', 2: 'Br', 4: 'Br', 6: 'Br' }, at: [2, 4, 6], ppt: true, note: 'In water some phenol is phenoxide, even more activated: all three o/p positions react. A test for phenol.' },
    dil: { label: 'dil. HNO₃, 298 K', el: 'NO₂⁺', name: 'o- + p-Nitrophenol', detail: 'a mixture', two: [{ 1: 'OH', 2: 'NO2' }, { 1: 'OH', 4: 'NO2' }], at: [2, 4], note: 'A mixture. Steam distillation carries off the ortho isomer (intramolecular H-bond); para stays behind.' },
    conc: { label: 'conc. HNO₃', el: 'NO₂⁺', name: 'Picric acid', detail: '2,4,6-trinitrophenol', subs: { 1: 'OH', 2: 'NO2', 4: 'NO2', 6: 'NO2' }, at: [2, 4, 6], note: 'Poor yield by direct nitration (the ring gets oxidised); industry sulphonates first, then nitrates.' },
    s298: { label: 'conc. H₂SO₄, 298 K', el: 'SO₃', name: 'o-HOC₆H₄SO₃H', detail: 'o-hydroxybenzenesulphonic acid', subs: { 1: 'OH', 2: 'SO3H' }, at: [2], note: 'At room temperature the ortho product forms fastest.' },
    s373: { label: 'conc. H₂SO₄, 373 K', el: 'SO₃', name: 'p-HOC₆H₄SO₃H', detail: 'p-hydroxybenzenesulphonic acid', subs: { 1: 'OH', 4: 'SO3H' }, at: [4], note: 'Sulphonation is reversible: when hot, the more stable para isomer wins.' },
    kolbe: { label: 'Kolbe: NaOH, CO₂; H⁺', el: 'CO₂ (attacked by phenoxide)', name: 'Salicylic acid', detail: '2-hydroxybenzoic acid', subs: { 1: 'OH', 2: 'COOH' }, at: [2], note: 'NaOH first makes phenoxide — plain phenol is not reactive enough for a weak electrophile like CO₂.' },
    rt: { label: 'Reimer–Tiemann: CHCl₃, NaOH', el: ':CCl₂ (dichlorocarbene)', name: 'Salicylaldehyde', detail: '2-hydroxybenzaldehyde', subs: { 1: 'OH', 2: 'CHO' }, at: [2], note: 'CHCl₃ + OH⁻ → :CCl₂. The –CHCl₂ it leaves on the ring is hydrolysed to –CHO.' },
    zn: { label: 'Zn dust, heat', el: '— (reduction)', name: 'Benzene', subs: {}, at: [], off: true, note: 'Zinc takes the oxygen: C₆H₅OH + Zn → C₆H₆ + ZnO.' },
    ox: { label: 'Na₂Cr₂O₇, H₂SO₄', el: '— (oxidation)', name: 'Benzoquinone', subs: { 1: '=O', 4: '=O' }, doubles: [[2, 3], [5, 6]], at: [], note: 'Phenol is oxidised to the yellow conjugated diketone. Air does this slowly too.' },
    fecl3: { label: 'neutral FeCl₃', el: 'Fe³⁺ (complex)', name: 'Violet colour', subs: { 1: 'OH' }, at: [], violet: true, note: 'Phenols give coloured iron complexes; alcohols and ethers do not.' },
  };
  var ORDER = ['brcs2', 'brw', 'dil', 'conc', 's298', 's373', 'kolbe', 'rt', 'zn', 'ox', 'fecl3'];
  var cur = null, t0 = 0, DUR = 1100;
  var outE = stage.readout('Electrophile / reagent'), outP = stage.readout('Product');
  var pick = APE.radio(stage, ORDER.map(function (k) { return [k, R[k].label]; }), null, function (v) {
    cur = v; t0 = performance.now(); APE.fx('reveal');
    if (APE.motion()) { stage.setAnimating(true); setTimeout(function () { stage.setAnimating(false); stage.invalidate(); }, DUR + 2600); }
  });
  stage.button({ label: 'Back to phenol', onClick: function () { cur = null; pick.set(null); stage.invalidate(); } });

  stage.draw(function (ctx, s) {
    var t = s.theme, r = cur && R[cur], age = r ? (APE.motion() ? (performance.now() - t0) / DUR : 2) : 0;
    var rx = s.w * (r && r.two ? 0.3 : 0.4), ry = s.h * 0.47, Rr = Math.min(s.w * 0.085, s.h * 0.15), pulse = APE.motion() ? 0.5 + 0.5 * Math.sin(performance.now() / 380) : 0.8;
    var V = APE.verts(rx, ry, Rr);
    if (!r) {
      [2, 4, 6].forEach(function (k) { APE.glow(ctx, V[k - 1][0], V[k - 1][1], 26, t.accent, 0.35 + 0.35 * pulse); });
      APE.ring(ctx, rx, ry, Rr, { subs: { 1: 'OH' }, color: t.ink, size: Math.max(13, Rr * 0.45) });
      Sim.label(ctx, 'phenol: o and p positions are electron-rich', rx, s.h - 26, { size: 12, weight: 650, color: t.ink2 });
      Sim.label(ctx, '← pick a reagent below', s.w * 0.76, ry, { size: 12, weight: 650, color: t.ink3 });
      outE('—', 'choose a reaction'); outP('—', '');
      if (APE.motion()) stage.invalidate();
      return;
    }
    var k = APE.ease(Math.min(1, age)), settled = age >= 1;
    if (r.violet) APE.glow(ctx, rx, ry, Rr * 3, t.violet, 0.65 * k);
    if (r.two) {
      var gap = s.w * 0.36;
      [0, 1].forEach(function (i) {
        var x = rx + i * gap, subs = Object.assign({}, r.two[i]), sa = {};
        sa[i ? 4 : 2] = k;
        APE.ring(ctx, x, ry, Rr, { subs: subs, color: t.ink, subColor: (function () { var o = {}; o[i ? 4 : 2] = t.accent; return o; })(), subAlpha: sa, size: Math.max(12, Rr * 0.42) });
        Sim.label(ctx, i ? 'para' : 'ortho', x, ry + Rr * 2.3, { size: 11, weight: 700, color: t.ink3 });
      });
      Sim.label(ctx, '+', rx + gap / 2, ry, { size: 20, weight: 700, color: t.ink2 });
    } else {
      var subs = Object.assign({}, r.subs), sa = {}, sc = {};
      if (r.off) { subs[1] = 'OH'; sa[1] = 1 - k; }
      (r.at || []).forEach(function (p) { sa[p] = k; sc[p] = t.accent; });
      if (r.ghost) Object.keys(r.ghost).forEach(function (p) { subs[p] = r.ghost[p]; sa[p] = 0.35 * k; sc[p] = t.ink3; });
      if (r.doubles) { sa[1] = 1; sa[4] = k; sc[4] = t.accent; }
      APE.ring(ctx, rx, ry, Rr, { subs: subs, color: t.ink, doubles: r.doubles && k > 0.5 ? r.doubles : null, subColor: sc, subAlpha: sa, size: Math.max(13, Rr * 0.45) });
      if (r.ghost && settled) Sim.label(ctx, 'minor', V[1][0] + Rr * 1.4, V[1][1] - 18, { size: 10, weight: 700, color: t.ink3 });
    }
    // incoming electrophiles
    if (!settled && (r.at || []).length) {
      (r.at).forEach(function (p, j) {
        var q = V[p - 1], ux = (q[0] - rx) / Rr, uy = (q[1] - ry) / Rr, tx = q[0] + ux * Rr * 1.1, ty = q[1] + uy * Rr * 1.1, sx = s.w - 30, sy = 30 + j * 40;
        var e = APE.ease(Math.min(1, age * 1.4)), x = APE.lerp(sx, tx, e), y = APE.lerp(sy, ty, e);
        APE.glow(ctx, x, y, 18, t.warn, 0.6 * (1 - e * 0.6));
        Sim.label(ctx, r.el.split(' ')[0], x, y, { size: 12, weight: 800, color: t.warn });
      });
    }
    if (r.ppt && settled) {
      for (var i = 0; i < 40; i++) { var px = rx - Rr * 2.5 + ((i * 47) % 100) / 100 * Rr * 5, py = ry + Rr * 2.7 + ((i * 29) % 100) / 100 * 18 + (APE.motion() ? (performance.now() / 60 + i * 7) % 18 : 0) * 0.3;
        ctx.save(); ctx.fillStyle = t.light ? '#9aa1b5' : '#f4f6fb'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); ctx.restore(); }
    }
    APE.wrap(ctx, r.note, 16, s.h - 52, s.w - 32, { size: 12.5, color: t.ink2, weight: 560 });
    outE(r.el, r.label); outP(r.name, r.detail || '');
  });
}, { unitsWide: 10, aspect: 0.56, minHeight: 340, maxHeight: 460, hint: '' });

/* ═══════════════════════════ Lesson 10: Reagent Rush ═══════════════════════════ */
Sim.register('ape-rush-lab', function (stage) {
  'use strict';
  var DECK = [
    ['CH3CH=CH2', 'H2O, H^+', ['propan-2-ol', 'propan-1-ol', 'propane-1,2-diol'], 'Markovnikov: –OH on the more substituted carbon.'],
    ['CH3CH=CH2', 'B2H6; H2O2, OH^−', ['propan-1-ol', 'propan-2-ol', 'propanal'], 'Hydroboration–oxidation: anti-Markovnikov orientation.'],
    ['CH3CH2OH', 'PCC', ['ethanal', 'ethanoic acid', 'ethene'], 'PCC stops at the aldehyde.'],
    ['CH3CH2OH', 'KMnO4, H^+', ['ethanoic acid', 'ethanal', 'ethoxyethane'], 'Strong oxidant: on to the acid.'],
    ['(CH3)2CHOH', 'Cu, 573 K', ['propanone', 'propene', 'propanal'], '2° alcohol → ketone.'],
    ['(CH3)3COH', 'Cu, 573 K', ['2-methylpropene', '2-methylpropanal', 'no reaction'], '3° alcohols dehydrate over hot copper.'],
    ['CH3CH2OH', 'conc. H2SO4, 443 K', ['ethene', 'ethoxyethane', 'ethanal'], '443 K: elimination.'],
    ['CH3CH2OH', 'conc. H2SO4, 413 K', ['ethoxyethane', 'ethene', 'ethanal'], '413 K: substitution, two alcohols make an ether.'],
    ['HCHO', 'CH3MgBr; H2O', ['ethanol', 'methanol', 'propan-2-ol'], 'HCHO + RMgX → primary alcohol.'],
    ['CH3COCH3', 'CH3MgBr; H2O', ['2-methylpropan-2-ol', 'propan-2-ol', 'butan-2-ol'], 'Ketone + RMgX → tertiary alcohol.'],
    ['CH3COOC2H5', 'excess CH3MgBr; H2O', ['2-methylpropan-2-ol', 'propan-2-ol', 'butan-2-one'], 'Esters take two RMgX → 3° alcohol.'],
    ['C6H5OH', 'Br2 water', ['2,4,6-tribromophenol', 'p-bromophenol', 'bromobenzene'], 'Water: all three o/p positions.'],
    ['C6H5OH', 'Br2 in CS2, 273 K', ['p-bromophenol', '2,4,6-tribromophenol', 'm-bromophenol'], 'Low polarity, low temperature: one Br, mainly para.'],
    ['C6H5OH', 'dil. HNO3, 298 K', ['o- + p-nitrophenol', 'm-nitrophenol', 'picric acid'], 'Dilute acid: mononitration at o and p.'],
    ['C6H5OH', 'conc. HNO3', ['picric acid', 'p-nitrophenol', 'benzoquinone'], 'Concentrated: 2,4,6-trinitrophenol.'],
    ['C6H5OH', 'NaOH, CO2; H^+', ['salicylic acid', 'salicylaldehyde', 'benzoic acid'], 'Kolbe’s reaction.'],
    ['C6H5OH', 'CHCl3, NaOH; H^+', ['salicylaldehyde', 'salicylic acid', 'chlorobenzene'], 'Reimer–Tiemann, via :CCl2.'],
    ['C6H5OH', 'Zn dust, heat', ['benzene', 'cyclohexanol', 'benzoquinone'], 'Zinc removes the oxygen.'],
    ['C6H5OH', 'Na2Cr2O7, H2SO4', ['benzoquinone', 'salicylic acid', 'catechol'], 'Oxidation to the quinone.'],
    ['cumene', 'O2; dil. H^+', ['phenol + acetone', 'benzoic acid', 'benzyl alcohol + acetone'], 'Via cumene hydroperoxide.'],
    ['C6H5Cl', 'NaOH, 623 K, 300 atm; H^+', ['phenol', 'benzene', 'anisole'], 'Dow process.'],
    ['C6H5N2^+Cl^−', 'H2O, warm', ['phenol', 'aniline', 'chlorobenzene'], 'N2 leaves, water takes its place.'],
    ['C6H5OCH3', 'HI', ['phenol + CH3I', 'C6H5I + CH3OH', 'C6H5I + CH3I'], 'The O–aryl bond survives.'],
    ['(CH3)3COCH3', 'HI', ['(CH3)3CI + CH3OH', '(CH3)3COH + CH3I', '(CH3)3COH + CH3OH'], 'SN1: the 3° carbon takes the iodine.'],
    ['CH3OC2H5', 'HI', ['CH3I + C2H5OH', 'CH3OH + C2H5I', 'C2H5I + C2H5OH'], 'SN2 at the less hindered methyl.'],
    ['C6H5O^−Na^+', 'CH3I', ['anisole', 'toluene', 'phenol'], 'Williamson: phenoxide + methyl iodide.'],
    ['(CH3)3CBr', 'CH3O^−Na^+', ['2-methylpropene', 'tert-butyl methyl ether', '2-methylpropan-2-ol'], '3° halide + strong base: elimination.'],
    ['CH3CH(OH)CH2CH3', 'conc. H2SO4, heat', ['but-2-ene (major)', 'but-1-ene (major)', 'butan-2-one'], 'Saytzeff: the more substituted alkene.'],
    ['salicylic acid', '(CH3CO)2O, H^+', ['aspirin', 'methyl salicylate', 'phenol'], 'Acetylation of the phenolic –OH.'],
    ['CH3CH2OH', 'I2, NaOH', ['yellow CHI3', 'no change', 'violet colour'], 'Ethanol is the one 1° alcohol that gives iodoform.'],
    ['C6H5OH', 'neutral FeCl3', ['violet colour', 'white precipitate', 'yellow precipitate'], 'The ferric chloride test for phenols.'],
    ['(CH3)3COH', 'Lucas reagent', ['cloudy at once', 'cloudy in ~5 min', 'stays clear'], '3° alcohols react immediately.'],
    ['CH3COCH2CH3', 'NaBH4', ['butan-2-ol', 'butan-1-ol', 'butane'], 'Ketone → 2° alcohol.'],
    ['CH3CH2OH', 'Na', ['CH3CH2O^−Na^+ + H2', 'ethene + NaOH', 'no reaction'], 'Alcohols are weak acids towards sodium.'],
  ];
  var ROUND = 12, TIME = 12;
  var queue = [], card = null, order = [], picked = -1, cardAt = 0, score = 0, streak = 0, best = 0, seen = 0, playing = false, timer = 0, flash = 0, missed = [], ended = false;
  try { best = +(localStorage.getItem('jee-prep:ape-rush-best') || 0) || 0; } catch (e) { best = 0; }
  var outS = stage.readout('Score'), outK = stage.readout('Streak'), outB = stage.readout('Best');
  var startBtn = stage.button({ label: 'Start round', onClick: function () { begin(); } });
  var opts = [0, 1, 2].map(function (i) { var b = stage.button({ label: '—', onClick: function () { answer(i); } }); b.disabled = true; return b; });
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function begin() {
    queue = shuffle(DECK.slice()).slice(0, ROUND); score = 0; streak = 0; seen = 0; missed = []; playing = true; ended = false;
    startBtn.textContent = 'Restart round'; next();
    clearInterval(timer); timer = setInterval(tick, 100);
  }
  function next() {
    if (!queue.length) { finish(); return; }
    card = queue.shift(); order = shuffle([0, 1, 2]); picked = -1; cardAt = performance.now(); seen++;
    opts.forEach(function (b, i) { b.textContent = (i + 1) + '. ' + card[2][order[i]]; b.disabled = false; b.removeAttribute('aria-pressed'); });
    stage.invalidate();
  }
  function answer(i) {
    if (!playing || picked >= 0) return;
    picked = i < 0 ? -2 : i; var right = i >= 0 && order[i] === 0;
    opts.forEach(function (b, j) { b.disabled = true; if (order[j] === 0) b.setAttribute('aria-pressed', 'true'); });
    if (right) { streak++; score += 10 + Math.min(streak, 5) * 2 + Math.max(0, Math.round(TIME - (performance.now() - cardAt) / 1000)); APE.fx('correct', streak); }
    else { streak = 0; APE.fx('wrong'); if (missed.indexOf(card) < 0) { missed.push(card); queue.splice(Math.min(queue.length, 3), 0, card); } }
    flash = performance.now();
    setTimeout(function () { if (playing) next(); }, right ? 900 : 2300);
    stage.invalidate();
  }
  function tick() { if (!playing) return; if (picked < 0 && (performance.now() - cardAt) / 1000 > TIME) answer(-1); stage.invalidate(); }
  function finish() {
    playing = false; ended = true; clearInterval(timer); timer = 0; card = null;
    if (score > best) { best = score; try { localStorage.setItem('jee-prep:ape-rush-best', String(best)); } catch (e) { /* memory only */ } }
    opts.forEach(function (b) { b.disabled = true; b.textContent = '—'; b.removeAttribute('aria-pressed'); });
    APE.fx('complete'); stage.invalidate();
  }
  stage.draw(function (ctx, s) {
    var t = s.theme, cx = s.w / 2;
    outS(String(score), playing ? 'card ' + Math.min(seen, ROUND + missed.length) + ' of ' + (ROUND + missed.length) : ''); outK(String(streak), streak >= 3 ? 'on fire' : ''); outB(String(best), 'kept on this device');
    if (!card) {
      Sim.label(ctx, ended ? 'Round over: ' + score + ' points' : 'Reagent Rush', cx, s.h * 0.34, { size: 24, weight: 800, color: t.accent });
      Sim.label(ctx, ended ? (missed.length ? 'Missed: ' + missed.length + ' — look them up on the maps, then play again.' : 'Clean sweep. Try to beat your best.') : 'Twelve reactions, twelve seconds each. Press Start round.', cx, s.h * 0.34 + 34, { size: 13, weight: 600, color: t.ink2 });
      if (ended && missed.length) missed.slice(0, 4).forEach(function (m, i) { APE.chem(ctx, m[0] + '  →  ' + m[2][0], cx, s.h * 0.34 + 66 + i * 22, { size: 13, color: t.ink3 }); });
      return;
    }
    var el = (performance.now() - cardAt) / 1000, frac = picked >= 0 || picked === -2 ? 0 : Math.max(0, 1 - el / TIME);
    ctx.save(); ctx.fillStyle = t.grid; APE.rrect(ctx, 20, 18, s.w - 40, 8, 4); ctx.fill();
    ctx.fillStyle = frac < 0.3 ? t.warn : t.accent; APE.rrect(ctx, 20, 18, (s.w - 40) * frac, 8, 4); ctx.fill(); ctx.restore();
    var y = s.h * 0.4, w1 = 0, res = picked !== -1 ? card[2][0] : '?', narrow = s.w < 560;
    if (!narrow) {
      APE.chem(ctx, card[0], cx - 110, y, { size: 20, color: t.ink, align: 'right' });
      Sim.arrow(ctx, cx - 96, y, cx + 96, y, { color: t.ink2, width: 2.4, head: 12 });
      APE.chem(ctx, card[1], cx, y - 18, { size: 13, color: t.accent, weight: 650, serif: false });
      APE.chem(ctx, res, cx + 110, y, { size: 20, color: picked === -1 ? t.ink3 : t.ok, align: 'left' });
    } else {
      y = 62;
      APE.chem(ctx, card[0], cx, y, { size: 19, color: t.ink });
      Sim.arrow(ctx, cx, y + 16, cx, y + 58, { color: t.ink2, width: 2.2, head: 10 });
      APE.chem(ctx, card[1], cx + 12, y + 37, { size: 12, color: t.accent, weight: 650, serif: false, align: 'left' });
      APE.chem(ctx, res, cx, y + 76, { size: 19, color: picked === -1 ? t.ink3 : t.ok });
      y += 60;
    }
    void w1;
    if (picked !== -1) {
      var right = picked >= 0 && order[picked] === 0;
      Sim.label(ctx, right ? 'Correct!' : picked === -2 ? 'Time’s up' : 'Not quite', cx, y + 46, { size: 16, weight: 800, color: right ? t.ok : t.bad || t.pos });
      APE.wrap(ctx, card[3], cx, y + 66, s.w - 60, { size: 13, color: t.ink2, align: 'center', weight: 560 });
    } else Sim.label(ctx, 'Pick the product below (or press 1, 2, 3)', cx, y + 46, { size: 12, weight: 600, color: t.ink3 });
    void flash;
  });
  stage.canvas.addEventListener('keydown', function (e) { if (/^[123]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); } });
}, { unitsWide: 10, aspect: 0.5, minHeight: 300, maxHeight: 400, hint: '' });
