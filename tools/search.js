/**
 * Finder — search every lesson: ideas, formulas, key results, JEE traps, questions, solutions, labs.
 *
 *   Open it with the 🔍 button in the top bar, Ctrl/⌘ K or "/". The Library search box shows the
 *   best matches too. Picking a result opens the lesson, scrolls to the exact spot and highlights it.
 *
 * The index (assets/search-index.js) is built from the lessons by tools/build.py and loads the
 * first time search is used. Ranking: BM25 over weighted fields (heading › text › formulas), plus
 *   • stemming and prefix matching while you type ("magnet" → magnetic, magnetism)
 *   • typo tolerance ("kirchof", "solenid") with a "showing results for" note
 *   • physics synonyms and abbreviations (emf, pd, RHR, KVL, SHM, B-field, Cp …)
 *   • formula matching on a symbol skeleton: "F=qvB", "mu0 I/2 pi r", "μ₀nI", "qB/m" all work
 *   • intent words: "formula for…", "trap", "pyq 2019", "lab" focus the results
 *   • phrase and proximity bonuses, and a nudge towards the chapter you are in
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ico = function (id) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var M = JSON.parse(document.getElementById('manifest').textContent);
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');

  /* ══════════════════════ text normalisation ══════════════════════ */
  var GREEK = { α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ϵ: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ϑ: 'theta', ι: 'iota', κ: 'kappa', λ: 'lambda', μ: 'mu', µ: 'mu', ν: 'nu', ξ: 'xi', π: 'pi', ρ: 'rho', σ: 'sigma', ς: 'sigma', τ: 'tau', υ: 'upsilon', φ: 'phi', ϕ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
    Γ: 'gamma', Δ: 'delta', Θ: 'theta', Λ: 'lambda', Ξ: 'xi', Π: 'pi', Σ: 'sigma', Φ: 'phi', Ψ: 'psi', Ω: 'omega', '∞': 'infinity', '∇': 'nabla', 'ℏ': 'hbar', '∫': 'integral', '∮': 'integral', '√': 'sqrt', '°': 'deg', '∘': 'deg' };
  var GREEK_RE = /[α-ωϑϕϵµΓΔΘΛΞΠΣΦΨΩ∞∇ℏ∫∮√°∘]/g;
  var SUPSUB = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-' };
  function fold(s) {
    return String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺₀₁₂₃₄₅₆₇₈₉₊₋]/g, function (c) { return SUPSUB[c]; })
      .normalize('NFKD').replace(/[̀-ͯ⃐-⃿]/g, '');
  }
  /** Lower-case words, Greek spelled out ("μ0" → "mu 0"), possessives dropped. */
  function norm(s) {
    return fold(s).replace(GREEK_RE, function (c) { return ' ' + GREEK[c] + ' '; }).toLowerCase()
      .replace(/['’]s\b/g, '').replace(/['’]/g, '');
  }
  /** Formula skeleton: symbols only, no spaces or brackets. "B = μ₀ I/(2πr)" → "b=mu0i/2pir". */
  function skel(s, keepCase) {
    s = fold(s).replace(GREEK_RE, function (c) { return GREEK[c]; });
    if (!keepCase) s = s.toLowerCase();
    return s.replace(/[−–]/g, '-').replace(/[⋅·×∗*]/g, '').replace(/⟹|⇒|→/g, '>').replace(/[^a-zA-Z0-9=+\-\/<>]/g, '');
  }
  var STOP = {};
  ('a an the of for to in on at by and or is are was be as with from that this these those it its into how what why when which who whom does do did can could ' +
    'between about vs versus me show find give tell explain i we you my our there their than then so if all any some use using used get').split(' ').forEach(function (w) { STOP[w] = 1; });

  /** A light English stemmer: plurals, -ing, -ed, -ly, final -e. */
  function stem(w) {
    if (w.length < 4 || /\d/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
    else if (/sses$/.test(w)) w = w.slice(0, -2);
    else if (/[^su]s$/.test(w) && !/(is|us|ss)$/.test(w)) w = w.slice(0, -1);
    var m;
    if ((m = /^(.{3,}?)(ing|ed)$/.exec(w)) && /[aeiouy]/.test(m[1])) {
      w = m[1];
      if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1);
    } else if (/ly$/.test(w) && w.length > 5) w = w.slice(0, -2);
    if (/e$/.test(w) && w.length > 4) w = w.slice(0, -1);
    return w;
  }
  function words(s) { return norm(s).match(/[a-z0-9]+/g) || []; }

  /* ══════════════════════ physics vocabulary ══════════════════════
     Each line is one group of interchangeable ways of saying the same thing. */
  var SYN_GROUPS = [
    'emf | electromotive force', 'pd | potential difference | voltage', 'rhr | right hand rule', 'flhr | fleming left hand rule',
    'kvl | kirchhoff voltage law | loop rule', 'kcl | kirchhoff current law | junction rule', 'kirchhoff | kirchoff',
    'efield | electric field', 'bfield | magnetic field', 'emi | electromagnetic induction', 'ac | alternating current', 'dc | direct current',
    'shm | simple harmonic motion', 'ktg | kinetic theory', 'cp | specific heat constant pressure', 'cv | specific heat constant volume',
    'capacitor | capacitance', 'resistor | resistance', 'inductor | inductance', 'galvanometer | galvo', 'wheatstone | bridge',
    'isochoric | isovolumetric | constant volume', 'isobaric | constant pressure', 'isothermal | constant temperature', 'adiabatic | no heat',
    'first law | 1st law', 'second law | 2nd law', 'zeroth law | 0th law', 'fridge | refrigerator', 'heat pump | refrigerator',
    'internal energy | du', 'work done | work', 'efficiency | eta', 'temperature | temp', 'thermal expansion | expansion',
    'stefan | stefan boltzmann', 'newton cooling | law of cooling', 'wien | wien displacement',
    'biot savart | biot', 'ampere law | ampere circuital', 'lorentz force | lorentz', 'cyclotron | cyclotron frequency',
    'dipole moment | magnetic moment', 'torque | moment of force', 'solenoid | coil', 'toroid | toroidal',
    'mag | magnetic', 'magnetism | magnetic effects', 'thermodynamics | thermal physics | heat', 'electrostatics | electric charges and fields', 'elec | electric', 'eq | equation', 'eqn | equation', 'pe | potential energy', 'ke | kinetic energy',
    'charge | q', 'current | i', 'field line | line of force', 'flux | phi', 'gauss | gaussian', 'permittivity | epsilon',
    'permeability | mu', 'drift velocity | drift speed', 'mobility | drift', 'resistivity | rho', 'conductivity | sigma',
    'potentiometer | meter bridge', 'ammeter | shunt', 'voltmeter | multiplier', 'superposition | principle of superposition',
    'equipotential | same potential', 'conductor | metal', 'dielectric | insulator', 'electron | e',
/* chapter:alcohols-phenols-and-ethers:synonyms:start */
    'pcc | pyridinium chlorochromate', 'lialh4 | lithium aluminium hydride | lah', 'nabh4 | sodium borohydride', 'eas | electrophilic substitution | electrophilic aromatic substitution', 'sn1 | unimolecular substitution', 'sn2 | bimolecular substitution', 'reimer tiemann | salicylaldehyde', 'kolbe | salicylic acid', 'williamson | williamson synthesis', 'carbolic acid | phenol', 'grignard | rmgx | organomagnesium', 'hydroboration | anti markovnikov', 'markovnikov | markownikoff', 'saytzeff | zaitsev', 'iodoform | haloform | chi3', 'picric acid | trinitrophenol', 'anisole | methoxybenzene', 'phenetole | ethoxybenzene', 'cumene | isopropylbenzene', 'lucas | lucas test | lucas reagent', 'dehydration | elimination', 'bp | boiling point', 'hbond | hydrogen bond', 'pka | acidity | acid strength', 'wood spirit | methanol', 'glycerol | propane-1,2,3-triol | glycerine', 'glycol | ethane-1,2-diol', 'cresol | methylphenol', 'catechol | benzene-1,2-diol', 'resorcinol | benzene-1,3-diol', 'quinol | hydroquinone | benzene-1,4-diol', 'ether | alkoxyalkane',
/* chapter:alcohols-phenols-and-ethers:synonyms:end */
/* chapter:simple-harmonic-motion:synonyms:start */
    'spring constant | force constant | stiffness', 'time period | period of oscillation', 'angular frequency | omega', 'reference circle | phasor | auxiliary circle', 'mean position | equilibrium position', 'extreme position | turning point', 'seconds pendulum | second pendulum', 'compound pendulum | physical pendulum', 'damped | damping', 'forced oscillation | driven oscillation', 'lissajous | lissajous figure', 'u tube | u-tube',
/* chapter:simple-harmonic-motion:synonyms:end */
/* chapter:waves-and-sound:synonyms:start */
    'wavelength | lambda', 'wave number | propagation constant | angular wave number', 'progressive wave | travelling wave | traveling wave', 'standing wave | stationary wave', 'fundamental | first harmonic', 'overtone | higher harmonic', 'closed pipe | closed organ pipe | stopped pipe', 'open pipe | open organ pipe', 'resonance tube | resonance column', 'end correction | end effect', 'sonometer | sonometer wire', 'beat frequency | beats per second', 'doppler | doppler effect | doppler shift', 'mach | mach number | sonic boom', 'laplace correction | laplace', 'newton formula | newton speed of sound', 'linear mass density | mass per unit length', 'compression | condensation',
/* chapter:waves-and-sound:synonyms:end */
  ];
  var SYN = {}; // stemmed single word → [[stems…], …]
  SYN_GROUPS.forEach(function (g) {
    var alts = g.split('|').map(function (a) { return words(a).filter(function (w) { return !STOP[w]; }).map(stem); });
    alts.forEach(function (a) {
      if (a.length !== 1) return;
      alts.forEach(function (b) { if (b !== a) (SYN[a[0]] = SYN[a[0]] || []).push(b); });
    });
    // multi-word forms ("electromotive force") also point at their short form, keyed by their rarest word
    alts.forEach(function (a) {
      if (a.length < 2) return;
      alts.forEach(function (b) { if (b !== a && b.length === 1) a.forEach(function (w) { (SYN['~' + w] = SYN['~' + w] || []).push({ need: a, give: b[0] }); }); });
    });
  });

  var KIND = {
    chapter: { label: 'Chapter', boost: 1.35 }, lesson: { label: 'Lesson', boost: 1.3 }, sec: { label: 'Section', boost: 1.2 },
    text: { label: 'Explanation', boost: 1 }, formula: { label: 'Formula', boost: 1.12 }, key: { label: 'Key result', boost: 1.2 },
    trap: { label: 'JEE trap', boost: 1.05 }, intuition: { label: 'Intuition', boost: .98 }, recap: { label: 'Recap', boost: 1.05 },
    story: { label: 'Story', boost: .85 }, note: { label: 'Note', boost: .95 }, table: { label: 'Table', boost: .95 }, figure: { label: 'Figure', boost: .9 },
    q: { label: 'Concept check', boost: .92 }, pyq: { label: 'PYQ', boost: .95 }, sol: { label: 'Solution', boost: .72 }, lab: { label: 'Lab', boost: 1.05 },
  };
  var FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'formula', label: 'Formulas', kinds: { formula: 1, key: 1 } },
    { id: 'ideas', label: 'Key ideas', kinds: { key: 1, recap: 1, intuition: 1, sec: 1, lesson: 1, chapter: 1 } },
    { id: 'trap', label: 'JEE traps', kinds: { trap: 1 } },
    { id: 'q', label: 'Questions', kinds: { q: 1, pyq: 1, sol: 1 } },
    { id: 'lab', label: 'Labs', kinds: { lab: 1 } },
  ];
  var INTENT = {
    formula: 'formula', formulae: 'formula', formulas: 'formula', equation: 'formula', equations: 'formula', expression: 'formula', relation: 'formula', eqn: 'formula',
    trap: 'trap', traps: 'trap', mistake: 'trap', mistakes: 'trap', pitfall: 'trap', pitfalls: 'trap', tricky: 'trap',
    pyq: 'pyq', pyqs: 'pyq', previous: 'pyq', past: 'pyq', paper: 'pyq',
    question: 'q', questions: 'q', problem: 'q', problems: 'q', practice: 'q', mcq: 'q',
    lab: 'lab', labs: 'lab', simulation: 'lab', simulations: 'lab', sim: 'lab', interactive: 'lab',
    summary: 'recap', recap: 'recap', revision: 'recap', revise: 'recap',
  };
  var INTENT_BOOST = {
    formula: { formula: 2.2, key: 1.6, recap: 1.15 }, trap: { trap: 3 }, pyq: { pyq: 3, sol: 1.3 }, q: { q: 2.2, pyq: 2.2, sol: 1.2 },
    lab: { lab: 3.2 }, recap: { recap: 2.4, key: 1.4 },
  };

  /* ══════════════════════ the index ══════════════════════ */
  var IX = null, waiting = [], loading = false;
  function ensure(cb) {
    if (IX) { if (cb) cb(); return; }
    if (cb) waiting.push(cb);
    if (loading) return;
    loading = true;
    var s = document.createElement('script');
    s.src = 'assets/search-index.js'; s.charset = 'utf-8'; s.async = true;
    s.onerror = function () { loading = false; s.remove(); var w = waiting; waiting = []; failed = true; w.forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }
  var failed = false;

  /** Called by assets/search-index.js. */
  function load(data) {
    var t0 = performance.now(), chapters = data.chapters, docs = [];
    // chapters themselves are results too
    M.chapters.forEach(function (c) {
      docs.push({ c: chapters.indexOf(c.id), l: 0, a: -1, k: 'chapter', h: c.title, t: c.tagline || '', m: [], fx: '' });
    });
    data.docs.forEach(function (d) { docs.push({ c: d[0], l: d[1], a: d[2], k: d[3], h: d[4], t: d[5], m: d[6] || [], fx: d[7] || '' }); });
    var vocab = new Map(), terms = [], post = [], N = docs.length, totLen = 0;
    function add(doc, i, text, w) {
      words(text).forEach(function (raw) {
        if ((raw.length < 2 && !/\d/.test(raw)) || STOP[raw]) return;
        var st = stem(raw), id = vocab.get(st);
        if (id === undefined) { id = terms.length; vocab.set(st, id); terms.push(st); post.push(new Map()); }
        var p = post[id]; p.set(i, (p.get(i) || 0) + w); doc.len += w;
      });
    }
    docs.forEach(function (d, i) {
      d.len = 0;
      var ch = M.chapters.filter(function (c) { return c.id === chapters[d.c]; })[0];
      d.ch = ch; d.lt = ch && d.l ? ch.lessons[d.l - 1].title : '';
      var headW = d.k === 'sec' || d.k === 'lesson' || d.k === 'chapter' || d.k === 'lab' ? 3 : d.k === 'key' || d.k === 'trap' || d.k === 'recap' || d.k === 'intuition' || d.k === 'story' ? 2 : 1.2;
      var textW = d.k === 'sec' ? .3 : d.k === 'formula' ? .55 : d.k === 'sol' ? .8 : 1;
      add(d, i, d.h, headW);
      if (/^(key|trap|intuition|recap|lab|pyq)$/.test(d.k)) add(d, i, KIND[d.k].label, 1);
      add(d, i, d.t, textW);
      add(d, i, d.m.join(' '), d.k === 'formula' ? 1.6 : .5);
      if (d.lt) add(d, i, d.lt, .35);
      if (d.ch) add(d, i, d.ch.title + ' ' + d.ch.id.replace(/-/g, ' ') + ' ' + (d.ch.unit || ''), .15);
      d.sk = d.m.map(skel).join('|');
      d.skc = d.m.map(function (x) { return skel(x, true); }).join('|');
      d.len = Math.max(d.len, 1); totLen += d.len;
    });
    var byLen = {};
    terms.forEach(function (t, id) { (byLen[t.length] = byLen[t.length] || []).push(id); });
    IX = { docs: docs, vocab: vocab, terms: terms, post: post, N: N, avg: totLen / N, byLen: byLen, sorted: terms.map(function (t, i) { return [t, i]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }), ms: 0 };
    IX.ms = Math.round(performance.now() - t0);
    var w = waiting; waiting = []; w.forEach(function (f) { f(); });
  }

  /* ══════════════════════ matching ══════════════════════ */
  function idf(id) { var df = IX.post[id].size; return Math.log(1 + (IX.N - df + .5) / (df + .5)); }
  function bm25(id, i) {
    var tf = IX.post[id].get(i); if (!tf) return 0;
    var d = IX.docs[i], k1 = 1.2, b = .72;
    return idf(id) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * d.len / IX.avg));
  }
  /** Damerau–Levenshtein distance, giving up early past `max`. */
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var best = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  /** Ways a query word can match the vocabulary: [{ id, w, how }]. */
  function expand(word, last) {
    var out = [], seen = {}, st = stem(word);
    function push(id, w, how) { if (id === undefined) return; if (!seen[id] || seen[id].w < w) { seen[id] = { id: id, w: w, how: how }; } }
    push(IX.vocab.get(st), 1, 'exact');
    if (st !== word) push(IX.vocab.get(word), 1, 'exact');
    (SYN[st] || []).forEach(function (alt) { if (alt.length === 1) push(IX.vocab.get(alt[0]), .85, 'syn'); });
    // prefixes: the word being typed, or any longer word starting with it ("magnet" → magnetic)
    var minPre = last ? 2 : 4;
    if (word.length >= minPre) {
      var lo = 0, hi = IX.sorted.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (IX.sorted[mid][0] < word) lo = mid + 1; else hi = mid; }
      for (var k = lo, n = 0; k < IX.sorted.length && IX.sorted[k][0].indexOf(word) === 0 && n < 60; k++, n++) {
        var t = IX.sorted[k][0]; push(IX.sorted[k][1], (last ? .8 : .65) * Math.min(1, (word.length + 2) / t.length + .25), 'prefix');
      }
      if (st !== word && st.length >= 4) {
        lo = 0; hi = IX.sorted.length;
        while (lo < hi) { var mid2 = (lo + hi) >> 1; if (IX.sorted[mid2][0] < st) lo = mid2 + 1; else hi = mid2; }
        for (k = lo, n = 0; k < IX.sorted.length && IX.sorted[k][0].indexOf(st) === 0 && n < 40; k++, n++) push(IX.sorted[k][1], .7, 'prefix');
      }
    }
    var exact = out.length || Object.keys(seen).some(function (id) { return seen[id].how === 'exact' || seen[id].how === 'syn'; });
    // typos: only when the word isn't a known word itself
    if (!exact && word.length >= 4 && !/\d/.test(word)) {
      var max = word.length >= 8 ? 2 : 1, best = [];
      for (var L = st.length - max; L <= st.length + max; L++) (IX.byLen[L] || []).forEach(function (id) {
        var t = IX.terms[id];
        if (t[0] !== st[0] && !(t[1] === st[0] && t[0] === st[1])) return;
        var d = dist(st, t, max); if (d <= max) best.push([id, d]);
      });
      best.sort(function (a, b) { return a[1] - b[1] || IX.post[b[0]].size - IX.post[a[0]].size; });
      best.slice(0, 4).forEach(function (b) { push(b[0], b[1] === 1 ? .62 : .45, 'typo'); });
    }
    Object.keys(seen).forEach(function (id) { out.push(seen[id]); });
    return out;
  }

  /* ══════════════════════ search ══════════════════════ */
  var CUR = null; // chapter id the reader is in
  function parseQuery(q) {
    var raw = q.trim(), intents = {}, ws = words(raw), content = [];
    ws.forEach(function (w) { if (INTENT[w]) intents[INTENT[w]] = 1; else if (!STOP[w]) content.push(w); });
    if (!content.length) content = ws.filter(function (w) { return !INTENT[w]; });
    if (intents.pyq && intents.q) delete intents.q;
    var only = !content.length && Object.keys(intents).length > 0;
    var years = raw.match(/\b(19|20)\d\d\b/g) || [];
    // symbols make it a formula; a short letter cluster ("qvB", "mv") only when it isn't a known word
    var strong = /[=^_\/*+<>()·×√∫−]|[α-ωΑ-Ωµ]|[a-z]\d|\d[a-z]/i.test(raw) || /\b(mu|epsilon|pi|theta|omega|phi|lambda|rho|sigma|alpha|beta)\s*\d?\b/i.test(raw) && ws.length > 1;
    var weak = !strong && /^[A-Za-z]{2,5}$/.test(raw) && IX && IX.vocab.get(stem(raw.toLowerCase())) === undefined && !SYN[stem(raw.toLowerCase())];
    return { raw: raw, words: content, intents: intents, years: years, formulaish: !only && (strong || weak), only: only };
  }

  function search(q, opt) {
    opt = opt || {};
    var P = parseQuery(q), docs = IX.docs, scores = new Map(), hits = new Map(), corrections = [], matchedTerms = {};
    if (P.only) return listKinds(P, opt);
    if (!P.words.length && !P.formulaish) return { P: P, list: [], total: 0, corrections: [] };
    var nTerms = P.words.length;
    // formula skeleton first: if the symbols match somewhere, loose words matter less
    var qsk = P.formulaish ? skel(P.raw) : '', qskc = P.formulaish ? skel(P.raw, true) : '', qsk2 = '', skHits = new Map();
    if (qsk.indexOf('=') > 0) qsk2 = qsk.slice(qsk.indexOf('=') + 1);
    var xless = P.formulaish ? skel(P.raw.replace(/\s+x\s+/gi, ' ')) : '';
    if (qsk.length >= 2) docs.forEach(function (d, i) {
      if (!d.sk) return;
      var s = 0;
      if (d.sk.indexOf(qsk) >= 0) s = 7 + qsk.length * .6;
      else if (xless !== qsk && xless.length >= 2 && d.sk.indexOf(xless) >= 0) s = 6 + xless.length * .5;
      else if (qsk2.length >= 3 && d.sk.indexOf(qsk2) >= 0) s = 4 + qsk2.length * .4;
      if (!s) return;
      s *= d.k === 'formula' ? 2.4 : d.k === 'key' || d.k === 'recap' ? 1.3 : 1;
      if (qskc.length >= 2 && d.skc.indexOf(qskc) >= 0) s *= 1.3; // same capitals: n ≠ N
      skHits.set(i, s);
    });
    var wordScale = skHits.size ? .5 : 1;
    P.words.forEach(function (w, qi) {
      var ex = expand(w, qi === nTerms - 1), per = new Map(), viaSyn = [];
      // multi-word synonyms ("electromotive force" → emf) when every word of the phrase is present
      (SYN['~' + stem(w)] || []).forEach(function (r) {
        var have = r.need.every(function (s) { return P.words.some(function (x) { return stem(x) === s; }); });
        if (have) viaSyn.push(r.give);
      });
      viaSyn.forEach(function (g) { var id = IX.vocab.get(g); if (id !== undefined) ex.push({ id: id, w: .8, how: 'syn' }); });
      // phrase synonyms ("pd" → potential + difference): need both words in the doc
      (SYN[stem(w)] || []).forEach(function (alt) {
        if (alt.length < 2) return;
        var ids = alt.map(function (s) { return IX.vocab.get(s); });
        if (ids.some(function (x) { return x === undefined; })) return;
        IX.post[ids[0]].forEach(function (_, i) {
          var s = 0; for (var k = 0; k < ids.length; k++) { var v = bm25(ids[k], i); if (!v) return; s += v; }
          s = .8 * s / ids.length; if (s > (per.get(i) || [0])[0]) per.set(i, [s, ids]);
        });
      });
      var typoOnly = ex.length && ex.every(function (e) { return e.how === 'typo'; });
      if (typoOnly) corrections.push([w, IX.terms[ex.sort(function (a, b) { return b.w - a.w; })[0].id]]);
      ex.forEach(function (e) {
        IX.post[e.id].forEach(function (_, i) {
          var s = e.w * bm25(e.id, i), cur = per.get(i);
          if (!cur || s > cur[0]) per.set(i, [s, [e.id]]);
        });
      });
      per.forEach(function (v, i) {
        scores.set(i, (scores.get(i) || 0) + v[0] * wordScale);
        var h = hits.get(i) || hits.set(i, { n: 0, ids: [] }).get(i); h.n++; h.ids = h.ids.concat(v[1]);
      });
    });
    skHits.forEach(function (s, i) {
      scores.set(i, (scores.get(i) || 0) + s);
      var h = hits.get(i) || hits.set(i, { n: 0, ids: [] }).get(i); h.formula = true; h.n = Math.max(h.n, nTerms);
    });
    // final ranking
    var filter = FILTERS.filter(function (f) { return f.id === opt.filter; })[0], ranked = [];
    var ib = {}; Object.keys(P.intents).forEach(function (k) { var b = INTENT_BOOST[k]; Object.keys(b).forEach(function (x) { ib[x] = Math.max(ib[x] || 0, b[x]); }); });
    var anyIntent = Object.keys(P.intents).length > 0;
    scores.forEach(function (s, i) {
      var d = docs[i], h = hits.get(i);
      if (filter && filter.kinds && !filter.kinds[d.k]) return;
      var cover = nTerms ? Math.min(1, h.n / nTerms) : 1;
      s *= h.formula ? Math.max(cover, .9) : Math.pow(cover, 2.2);
      s *= KIND[d.k] ? KIND[d.k].boost : 1;
      if (anyIntent) s *= ib[d.k] || .45;
      if (P.years.length) s *= P.years.some(function (y) { return d.h.indexOf(y) >= 0; }) ? 2.4 : (d.k === 'pyq' || d.k === 'q' || d.k === 'sol' ? .5 : .8);
      if (CUR && d.ch && d.ch.id === CUR) s *= 1.12;
      ranked.push([i, s, h]);
    });
    ranked.sort(function (a, b) { return b[1] - a[1]; });
    // phrase & proximity bonus on the leaders
    var qStems = P.words.map(stem);
    ranked.slice(0, 120).forEach(function (r) {
      if (qStems.length < 2) return;
      var d = docs[r[0]], ws = words(d.h + ' . ' + d.t).map(stem), best = Infinity;
      for (var i = 0; i < ws.length; i++) {
        if (ws[i] !== qStems[0]) continue;
        var ok = true; for (var k = 1; k < qStems.length; k++) if (ws[i + k] !== qStems[k]) { ok = false; break; }
        if (ok) { r[1] *= 1.6; return; }
      }
      // smallest window holding every matched word
      var pos = {}; ws.forEach(function (w, i) { if (qStems.indexOf(w) >= 0) (pos[w] = pos[w] || []).push(i); });
      if (Object.keys(pos).length === qStems.length) {
        var all = []; Object.keys(pos).forEach(function (w) { pos[w].forEach(function (p) { all.push([p, w]); }); });
        all.sort(function (a, b) { return a[0] - b[0]; });
        var cnt = {}, have = 0, lo = 0;
        for (var hi = 0; hi < all.length; hi++) {
          if (!cnt[all[hi][1]]++) have++;
          while (have === qStems.length) { best = Math.min(best, all[hi][0] - all[lo][0]); if (!--cnt[all[lo][1]]) have--; lo++; }
        }
        if (best < 8) r[1] *= 1.25; else if (best < 20) r[1] *= 1.08;
      }
    });
    ranked.sort(function (a, b) { return b[1] - a[1]; });
    // keep the list varied: the same block can't fill the page
    var per = {}, out = [];
    ranked.slice(0, 200).forEach(function (r) {
      var d = docs[r[0]], key = d.c + '/' + d.l + '/' + d.a + '/' + d.k, k2 = d.c + '/' + d.l;
      per[key] = (per[key] || 0) + 1; per[k2] = (per[k2] || 0) + 1;
      r[1] *= Math.pow(.6, per[key] - 1) * Math.pow(.93, Math.max(0, per[k2] - 3));
      out.push(r);
    });
    out.sort(function (a, b) { return b[1] - a[1]; });
    var top = out.length ? out[0][1] : 0;
    out = out.filter(function (r) { return r[1] >= top * .04; });
    // the stems to highlight
    out.forEach(function (r) { r[2].ids.forEach(function (id) { matchedTerms[IX.terms[id]] = 1; }); });
    return { P: P, list: out, total: out.length, corrections: corrections, terms: matchedTerms };
  }

  /** "lab", "pyq", "traps", "formulas" on their own: everything of that kind, this chapter first. */
  function listKinds(P, opt) {
    var want = {}; Object.keys(P.intents).forEach(function (k) { Object.keys(INTENT_BOOST[k]).forEach(function (x) { if (INTENT_BOOST[k][x] >= 2) want[x] = 1; }); });
    var filter = FILTERS.filter(function (f) { return f.id === opt.filter; })[0], list = [];
    IX.docs.forEach(function (d, i) {
      if (!want[d.k] || (filter && filter.kinds && !filter.kinds[d.k])) return;
      var s = 1000 - d.c * 50 - d.l + (CUR && d.ch && d.ch.id === CUR ? 1000 : 0);
      if (P.years.length) { if (!P.years.some(function (y) { return d.h.indexOf(y) >= 0; })) return; }
      list.push([i, s, { n: 1, ids: [] }]);
    });
    list.sort(function (a, b) { return b[1] - a[1]; });
    return { P: P, list: list, total: list.length, corrections: [], terms: {} };
  }

  /* ══════════════════════ snippets ══════════════════════ */
  var WORD_RE = /[\p{L}\p{N}]+/gu;
  function marked(text, terms, maxLen) {
    var toks = [], m; WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) {
      var ws = words(m[0]), hit = ws.length && ws.some(function (w) { return terms[stem(w)]; });
      toks.push({ s: m.index, e: m.index + m[0].length, hit: hit });
    }
    var start = 0, end = text.length;
    if (text.length > maxLen) {
      var best = -1, bestAt = 0;
      toks.forEach(function (t, i) {
        if (!t.hit) return;
        var n = 0; for (var k = i; k < toks.length && toks[k].s < t.s + maxLen * .7; k++) if (toks[k].hit) n++;
        if (n > best) { best = n; bestAt = t.s; }
      });
      start = Math.max(0, bestAt - Math.round(maxLen * .25));
      var sp = text.lastIndexOf(' ', start); if (start > 0 && sp > start - 20) start = sp + 1;
      end = Math.min(text.length, start + maxLen);
      var sp2 = text.indexOf(' ', end); if (sp2 > 0 && sp2 < end + 20) end = sp2;
    }
    var h = '', at = start;
    toks.forEach(function (t) {
      if (!t.hit || t.s < start || t.e > end) return;
      h += esc(text.slice(at, t.s)) + '<mark>' + esc(text.slice(t.s, t.e)) + '</mark>'; at = t.e;
    });
    h += esc(text.slice(at, end));
    return (start > 0 ? '…' : '') + pretty(h) + (end < text.length ? '…' : '');
  }

  /** Linear maths in snippets → real superscripts and subscripts ("10^(−19)" → 10⁻¹⁹ as <sup>). */
  function pretty(h) {
    return h.replace(/\^∘/g, '°').replace(/\^\(([^()<>]{1,16})\)/g, '<sup>$1</sup>').replace(/\^([A-Za-z0-9′+−])/g, '<sup>$1</sup>')
      .replace(/_\(([^()<>]{1,16})\)/g, '<sub>$1</sub>').replace(/_([A-Za-z0-9])/g, '<sub>$1</sub>');
  }
  function hitHTML(r, res, i) {
    var d = IX.docs[r[0]], k = KIND[d.k] || { label: d.k }, href = hrefOf(d);
    var where = d.k === 'chapter' ? d.ch.subject + ' · ' + d.ch.unit : d.ch.title + (d.l ? ' · L' + d.l + ' ' + d.lt : '');
    var title = d.k === 'formula' ? d.h : d.k === 'lesson' || d.k === 'chapter' ? d.h : d.h;
    var body = d.k === 'formula' ? '' : marked(d.t, res.terms, 170);
    return '<a class="fd__hit" role="option" id="fd-o' + i + '" href="' + href + '" data-i="' + r[0] + '" aria-selected="false">' +
      '<span class="fd__kind" data-k="' + d.k + '">' + esc(k.label) + '</span><span class="fd__main">' +
      (d.fx ? '<span class="fd__fx">' + d.fx + '</span>' : '') +
      (title ? '<b class="fd__title">' + marked(title, res.terms, 120) + '</b>' : '') +
      (body ? '<span class="fd__snip">' + body + '</span>' : '') +
      '<small class="fd__where">' + esc(where) + '</small></span>' + ico('arrow') + '</a>';
  }
  function hrefOf(d) { return '#/c/' + d.ch.id + (d.l ? '/' + d.l : ''); }

  /* ══════════════════════ jump to a result ══════════════════════ */
  var pending = null, hlTimer = 0;
  function open(i, terms) {
    var d = IX.docs[i]; if (!d) return;
    remember(lastQuery);
    var href = hrefOf(d);
    pending = { d: d, terms: terms || {}, until: Date.now() + 20000 };
    close(true);
    if (location.hash === href) settle(); else location.hash = href;
    requestAnimationFrame(settle);
  }
  function settle() {
    if (!pending) return;
    var d = pending.d;
    if (Date.now() > pending.until) { pending = null; return; }
    if (!d.l) { pending = null; return; } // chapter overview: nothing to point at
    var art = $('.lesson[data-chapter="' + d.ch.id + '"][data-lesson="' + d.l + '"]');
    if (!art || art.hidden) { requestAnimationFrame(settle); return; }
    var terms = pending.terms; pending = null;
    var el = d.a >= 0 ? $('[data-find="' + d.a + '"]', art) : null;
    if (!el) return;
    // inside a closed hint / solution? point at the question instead
    var shown = el, closed = el.closest('[hidden]');
    if (closed && closed !== art) shown = closed.closest('.q') || closed.parentElement || el;
    var blk = shown.closest('.lesson > *'); if (blk) blk.classList.add('in');
    setTimeout(function () {
      if (d.k === 'lesson') { highlight(shown, terms); return; } // the page already opens at its title
      shown.scrollIntoView({ behavior: window.FX && FX.motionOK() ? 'smooth' : 'auto', block: 'center' });
      shown.classList.remove('fd-flash'); void shown.offsetWidth; shown.classList.add('fd-flash');
      setTimeout(function () { shown.classList.remove('fd-flash'); }, 2600);
      highlight(shown, terms);
    }, 60);
  }
  function highlight(el, terms) {
    if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
    var ranges = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentElement && n.parentElement.closest('.katex, svg, .ink-layer, [hidden], .q__actions') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    }), n, m;
    while ((n = walker.nextNode())) {
      WORD_RE.lastIndex = 0;
      while ((m = WORD_RE.exec(n.data))) {
        var ws = words(m[0]);
        if (ws.length && ws.some(function (w) { return terms[stem(w)]; })) {
          var r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); ranges.push(r);
        }
      }
    }
    var hl = new Highlight(); ranges.slice(0, 400).forEach(function (r) { hl.add(r); });
    CSS.highlights.set('fd', hl);
    clearTimeout(hlTimer); hlTimer = setTimeout(clearHL, 9000);
  }
  function clearHL() { if (window.CSS && CSS.highlights) CSS.highlights.delete('fd'); }
  window.addEventListener('hashchange', function () { if (!pending) clearHL(); });

  /* ══════════════════════ recent searches ══════════════════════ */
  var RKEY = 'jee-prep:finder', recent = [];
  try { recent = (JSON.parse(localStorage.getItem(RKEY) || '{}') || {}).recent || []; } catch (e) { recent = []; }
  function remember(q) {
    q = (q || '').trim(); if (q.length < 2) return;
    recent = [q].concat(recent.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 6);
    try { localStorage.setItem(RKEY, JSON.stringify({ recent: recent })); } catch (e) { /* memory only */ }
  }

  /* ══════════════════════ the search panel ══════════════════════ */
  var dlg = document.createElement('div'); dlg.className = 'fd'; dlg.hidden = true;
  dlg.innerHTML = '<div class="fd__scrim"></div><div class="fd__panel glass" role="dialog" aria-modal="true" aria-label="Search everything">' +
    '<div class="fd__bar">' + ico('search') + '<input type="search" class="fd__input" placeholder="Search formulas, ideas, questions…" autocomplete="off" spellcheck="false" aria-label="Search every lesson" role="combobox" aria-expanded="true" aria-controls="fdList" aria-autocomplete="list">' +
    '<button type="button" class="fd__close" aria-label="Close search"><kbd>Esc</kbd>' + ico('close') + '</button></div>' +
    '<div class="fd__chips" role="tablist" aria-label="Show">' + FILTERS.map(function (f, i) { return '<button type="button" class="fd__chip" role="tab" data-f="' + f.id + '" aria-selected="' + (i === 0) + '">' + f.label + '</button>'; }).join('') + '</div>' +
    '<div class="fd__note" aria-live="polite"></div><div class="fd__list" id="fdList" role="listbox" aria-label="Results"></div>' +
    '<div class="fd__foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd> search anywhere</span></div></div>';
  document.body.appendChild(dlg);
  var input = $('.fd__input', dlg), list = $('.fd__list', dlg), note = $('.fd__note', dlg), filter = 'all', active = -1, lastQuery = '', lastRes = null, prevFocus = null, raf = 0;

  // top-bar button
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'icon-btn fd-btn'; btn.innerHTML = ico('search');
  btn.setAttribute('aria-label', 'Search everything (' + (isMac ? '⌘' : 'Ctrl') + ' K)'); btn.title = 'Search everything (' + (isMac ? '⌘' : 'Ctrl') + ' K)';
  var bar = $('.topbar'); bar.insertBefore(btn, $('.amb', bar) || $('#topProgress'));
  btn.addEventListener('pointerenter', function () { ensure(); });
  btn.addEventListener('click', function () { show(''); });

  function show(q) {
    if (!dlg.hidden) { input.focus(); input.select(); return; }
    prevFocus = document.activeElement;
    dlg.hidden = false; document.documentElement.classList.add('fd-open');
    void dlg.offsetWidth; dlg.classList.add('is-on');
    input.value = q || ''; input.focus(); if (q) input.select();
    if (window.FX) FX.play('select');
    ensure(run); run();
  }
  function close(silent) {
    if (dlg.hidden) return;
    dlg.classList.remove('is-on'); document.documentElement.classList.remove('fd-open');
    setTimeout(function () { if (!dlg.classList.contains('is-on')) dlg.hidden = true; }, 180);
    if (!silent && prevFocus && prevFocus.focus) prevFocus.focus();
  }
  $('.fd__scrim', dlg).addEventListener('click', function () { close(); });
  $('.fd__close', dlg).addEventListener('click', function () { close(); });
  $('.fd__chips', dlg).addEventListener('click', function (e) {
    var c = e.target.closest('.fd__chip'); if (!c) return;
    filter = c.dataset.f; $$('.fd__chip', dlg).forEach(function (x) { x.setAttribute('aria-selected', String(x === c)); });
    if (window.FX) FX.play('select'); run(); input.focus();
  });
  input.addEventListener('input', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; run(); }); });

  function idle() {
    var h = '';
    if (recent.length) h += '<div class="fd__group"><span class="eyebrow">Recent</span><div class="fd__sugg">' + recent.map(function (q) { return '<button type="button" class="pill fd__q">' + ico('clock') + esc(q) + '</button>'; }).join('') + '</div></div>';
    var ideas = [], picks = IX ? IX.docs.filter(function (d) { return d.k === 'formula' && d.h && d.h.length < 40; }) : [];
    for (var i = 0; i < picks.length && ideas.length < 3; i += Math.max(1, Math.floor(picks.length / 3))) ideas.push(picks[i].h);
    var tries = ['F = qvB', 'formula for magnetic field of a solenoid', 'JEE traps in thermodynamics', 'Gauss law', 'PYQ 2019', 'emf'].concat(ideas);
    h += '<div class="fd__group"><span class="eyebrow">Try</span><div class="fd__sugg">' + tries.slice(0, 8).map(function (q) { return '<button type="button" class="pill fd__q">' + esc(q) + '</button>'; }).join('') + '</div></div>' +
      '<p class="fd__tip">Search words, formulas or symbols: <b>μ0 I/2πr</b>, <b>qB/m</b>, <b>Cp − Cv</b>. Add <b>formula</b>, <b>trap</b>, <b>pyq</b> or <b>lab</b> to narrow it down.</p>';
    list.innerHTML = h; note.textContent = ''; active = -1;
  }
  list.addEventListener('click', function (e) {
    var s = e.target.closest('.fd__q');
    if (s) { input.value = s.textContent; run(); input.focus(); return; }
    var a = e.target.closest('.fd__hit');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); open(+a.dataset.i, lastRes && lastRes.terms); }
  });
  list.addEventListener('pointermove', function (e) { var a = e.target.closest('.fd__hit'); if (a) setActive($$('.fd__hit', list).indexOf(a), true); });

  function run() {
    var q = input.value; lastQuery = q;
    if (!q.trim()) { idle(); return; }
    if (!IX) { list.innerHTML = failed ? '<p class="fd__empty">The search index couldn’t load. Check your connection and try again.</p>' : '<p class="fd__empty">Loading the index…</p>'; return; }
    var res = search(q, { filter: filter }); lastRes = res;
    var shown = res.list.slice(0, 40);
    if (!shown.length) {
      list.innerHTML = '<p class="fd__empty">No matches for “' + esc(q.trim()) + '”' + (filter !== 'all' ? ' in this filter. <button type="button" class="btn btn--ghost fd__all">Search everything</button>' : '. Try fewer words, or a formula like <b>qvB</b>.') + '</p>';
      note.textContent = ''; active = -1; return;
    }
    list.innerHTML = shown.map(function (r, i) { return hitHTML(r, res, i); }).join('');
    var n = res.corrections.length ? 'Showing results for ' + res.corrections.map(function (c) { return '<b>' + esc(c[1]) + '</b>'; }).join(', ') + ' · ' : '';
    note.innerHTML = n + res.total + (res.total === 1 ? ' match' : ' matches') + (res.total > 40 ? ' · best 40 shown' : '');
    setActive(0);
  }
  $('.fd__list', dlg).addEventListener('click', function (e) {
    if (e.target.closest('.fd__all')) { var c = $('.fd__chip[data-f="all"]', dlg); c.click(); }
  });
  function setActive(i, fromPointer) {
    var hs = $$('.fd__hit', list); if (!hs.length) { active = -1; return; }
    active = Math.max(0, Math.min(i, hs.length - 1));
    hs.forEach(function (h, k) { h.setAttribute('aria-selected', String(k === active)); });
    input.setAttribute('aria-activedescendant', hs[active].id);
    if (!fromPointer) hs[active].scrollIntoView({ block: 'nearest' });
  }
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); return; }
    if (e.key === 'Enter' && e.target === input) {
      e.preventDefault(); var h = $$('.fd__hit', list)[Math.max(active, 0)];
      if (h) open(+h.dataset.i, lastRes && lastRes.terms);
      return;
    }
    if (e.key === 'Tab') { // keep focus inside the panel
      var f = $$('input, button:not([hidden]), a[href]', $('.fd__panel', dlg)), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (dlg.hidden) show(''); else close(); return; }
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && dlg.hidden) { e.preventDefault(); show(''); }
  });

  /* ══════════════════════ the Library search box ══════════════════════ */
  /** Called by the app after it draws the syllabus matches for the Library search box. */
  function lib(q, box) {
    q = (q || '').trim();
    if (q.length < 2 || !box) return;
    if (!IX) { ensure(function () { var b = $('#libList'), s = $('#libSearch'); if (b && s && s.value.trim() === q) lib(q, b); }); return; }
    var res = search(q, {}), top = res.list.filter(function (r) { return IX.docs[r[0]].k !== 'chapter'; }).slice(0, 6);
    if (!top.length) return;
    var none = $('.foot-note', box); if (none && !$('.unit', box)) none.remove();
    var sec = document.createElement('section'); sec.className = 'unit fd-lib';
    sec.innerHTML = '<h3 class="unit__title">Inside the lessons<small>' + res.total + (res.total === 1 ? ' match' : ' matches') + '</small></h3>' +
      '<div class="fd__list">' + top.map(function (r, i) { return hitHTML(r, res, 'l' + i); }).join('') + '</div>' +
      (res.total > top.length ? '<button type="button" class="btn btn--ghost fd-lib__more">' + ico('search') + 'See all ' + res.total + ' matches</button>' : '');
    box.appendChild(sec);
    sec.addEventListener('click', function (e) {
      if (e.target.closest('.fd-lib__more')) { show(q); return; }
      var a = e.target.closest('.fd__hit');
      if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); lastQuery = q; open(+a.dataset.i, res.terms); }
    });
  }
  document.addEventListener('focusin', function (e) { if (e.target.id === 'libSearch') ensure(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'libSearch' && e.target.value.trim()) { e.preventDefault(); show(e.target.value.trim()); }
  });

  function onRoute() { var m = /^#\/c\/([\w-]+)/.exec(location.hash); CUR = m ? m[1] : null; }
  window.addEventListener('hashchange', onRoute); onRoute();

  window.Finder = { load: load, lib: lib, open: show, search: function (q, o) { return IX ? search(q, o) : null; }, ready: function () { return !!IX; }, ensure: ensure, _ix: function () { return IX; } };
})();
