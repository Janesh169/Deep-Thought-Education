/**
 * DTRush — a quick-fire review game for any chapter (shared by tools/enrich_chapter.py).
 *   DTRush(stage, deck, { key: 'storage-key', title: 'Circuit Rush', round: 12, time: 15 })
 * deck: [[situation, question, [right, wrong, wrong], why], …]. Options are shuffled; the cards you miss
 * come back later in the round; the best score is kept in localStorage (memory only if that is blocked).
 */
var DTRush = window.DTRush || function (stage, deck, o) {
  'use strict';
  o = o || {};
  var ROUND = o.round || 12, TIME = o.time || 15, KEY = 'jee-prep:' + (o.key || 'rush') + '-best';
  var queue = [], card = null, order = [], picked = -1, cardAt = 0, score = 0, streak = 0, best = 0, seen = 0, playing = false, timer = 0, missed = [], ended = false;
  try { best = +(localStorage.getItem(KEY) || 0) || 0; } catch (e) { best = 0; }
  var FONT = 'Inter Variable, Roboto, system-ui, sans-serif';
  function fx(n, a) { if (window.FX) window.FX.play(n, a); }
  function wrap(ctx, s, x, y, maxW, size, color, weight) {
    ctx.save(); ctx.font = (weight || 560) + ' ' + size + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var words = String(s).split(' '), line = '', lines = [];
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * size * 1.35); }); ctx.restore();
    return lines.length * size * 1.35;
  }
  var outS = stage.readout('Score'), outK = stage.readout('Streak'), outB = stage.readout('Best');
  var startBtn = stage.button({ label: 'Start round', onClick: function () { begin(); } });
  var opts = [0, 1, 2].map(function (i) { var b = stage.button({ label: '—', onClick: function () { answer(i); } }); b.disabled = true; return b; });
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function begin() {
    queue = shuffle(deck.slice()).slice(0, ROUND); score = 0; streak = 0; seen = 0; missed = []; playing = true; ended = false;
    startBtn.textContent = 'Restart round'; next(); clearInterval(timer); timer = setInterval(tick, 100);
  }
  function next() {
    if (!queue.length) { finish(); return; }
    card = queue.shift(); order = shuffle([0, 1, 2]); picked = -1; cardAt = performance.now(); seen++;
    opts.forEach(function (b, i) { b.textContent = (i + 1) + '. ' + card[2][order[i]]; b.disabled = false; b.removeAttribute('aria-pressed'); });
    stage.invalidate();
  }
  function answer(i) {
    if (!playing || picked !== -1) return;
    picked = i < 0 ? -2 : i; var right = i >= 0 && order[i] === 0;
    opts.forEach(function (b, j) { b.disabled = true; if (order[j] === 0) b.setAttribute('aria-pressed', 'true'); });
    if (right) { streak++; score += 10 + Math.min(streak, 5) * 2 + Math.max(0, Math.round(TIME - (performance.now() - cardAt) / 1000)); fx('correct', streak); }
    else { streak = 0; fx('wrong'); if (missed.indexOf(card) < 0) { missed.push(card); queue.splice(Math.min(queue.length, 3), 0, card); } }
    setTimeout(function () { if (playing) next(); }, right ? 1100 : 2800);
    stage.invalidate();
  }
  function tick() { if (!playing) return; if (picked === -1 && (performance.now() - cardAt) / 1000 > TIME) answer(-1); stage.invalidate(); }
  function finish() {
    playing = false; ended = true; clearInterval(timer); timer = 0; card = null;
    if (score > best) { best = score; try { localStorage.setItem(KEY, String(best)); } catch (e) { /* memory only */ } }
    opts.forEach(function (b) { b.disabled = true; b.textContent = '—'; b.removeAttribute('aria-pressed'); });
    fx('complete'); stage.invalidate();
  }
  stage.canvas.addEventListener('keydown', function (e) { if (/^[123]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); } });
  stage.draw(function (ctx, s) {
    var t = s.theme, cx = s.w / 2, W = Math.min(s.w - 40, 620);
    outS(String(score), playing ? 'card ' + seen + ' of ' + (ROUND + missed.length) : ''); outK(String(streak), streak >= 3 ? 'on fire' : ''); outB(String(best), 'kept on this device');
    if (!card) {
      Sim.label(ctx, ended ? 'Round over: ' + score + ' points' : (o.title || 'Rush'), cx, s.h * 0.32, { size: 24, weight: 800, color: t.accent });
      wrap(ctx, ended ? (missed.length ? 'Missed ' + missed.length + ' — they are worth a second look before the next round:' : 'Clean sweep. Try to beat your best.') : ROUND + ' quick questions, ' + TIME + ' seconds each. Press Start round.', cx, s.h * 0.32 + 22, W, 13, t.ink2);
      if (ended) missed.slice(0, 3).forEach(function (m, i) { wrap(ctx, m[1] + ' → ' + m[2][0], cx, s.h * 0.32 + 64 + i * 22, W, 12.5, t.ink3); });
      return;
    }
    var frac = picked === -1 ? Math.max(0, 1 - (performance.now() - cardAt) / 1000 / TIME) : 0;
    ctx.save(); ctx.fillStyle = t.grid; ctx.fillRect(20, 18, s.w - 40, 7); ctx.fillStyle = frac < 0.3 ? t.warn : t.accent; ctx.fillRect(20, 18, (s.w - 40) * frac, 7); ctx.restore();
    var y = Math.max(46, s.h * 0.24);
    y += wrap(ctx, card[0], cx, y, W, s.w < 520 ? 15 : 17, t.ink, 600) + 10;
    y += wrap(ctx, card[1], cx, y, W, 14, t.accent, 700) + 14;
    if (picked !== -1) {
      var right = picked >= 0 && order[picked] === 0;
      Sim.label(ctx, right ? 'Correct!' : picked === -2 ? 'Time’s up — ' + card[2][0] : 'It’s ' + card[2][0], cx, y + 4, { size: 15, weight: 800, color: right ? t.ok : t.pos });
      wrap(ctx, card[3], cx, y + 22, W, 13, t.ink2);
    } else Sim.label(ctx, 'Pick below, or press 1, 2, 3', cx, y + 4, { size: 12, weight: 600, color: t.ink3 });
  });
};
window.DTRush = DTRush;
