#!/usr/bin/env python3
"""
Build tool for Deep Thought Education.

The app is authored as one self-contained HTML file (every chapter, lab, font and script inlined).
This script turns such a file into:

  single  — the same single file, with Export / Import backup added (if it isn't there already)
  site    — the website in this repo: a light index.html shell, assets/app.css + assets/app.js,
            and one chapters/<id>.js per chapter (its lessons + its interactive labs), which the
            app loads the first time one of that chapter's lessons is opened.

Usage
  python3 tools/build.py single  path/to/source.html  path/to/output.html
  python3 tools/build.py site    path/to/source.html  [repo-root]          (default: this repo)

Adding a chapter: build it into the single-file version as usual, then run `site` on that file.
The script checks every place it patches and stops with a clear message if the source has changed
shape, rather than producing a half-working site.
"""
import json
import os
import re
import sys

import search_index

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
APP_NAME = 'Deep Thought Education'


class BuildError(Exception):
    pass


def rep(s, old, new, count=1, what=''):
    """Replace `old` with `new`, insisting it occurs exactly `count` times."""
    n = s.count(old)
    if n != count:
        raise BuildError('expected %d occurrence(s) of %s, found %d:\n  %r' % (count, what or 'patch anchor', n, old[:160]))
    return s.replace(old, new)


def between(s, start, end, frm=0):
    i = s.index(start, frm) + len(start)
    j = s.index(end, i)
    return s[i:j], i, j


# ════════════════════════════════════════ 1. Export / Import ════════════════════════════════════════

SPRITE_ADD = (
    '  <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></symbol>\n'
    '  <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14"/></symbol>\n'
)

FOOT_BTN = 'style="min-height:36px;padding:4px 12px;font-size:.78rem"'

APP_HOOKS = r"""  /* ── hooks for the Backup module (export / import) ── */
  window.JEEApp = {
    state: function () { return JSON.parse(JSON.stringify(state)); },
    /** Swap in a whole saved state (used when an import can't be saved and reloaded). */
    replace: function (s) {
      state = s && typeof s === 'object' ? JSON.parse(JSON.stringify(s)) : {};
      state.answers = state.answers && typeof state.answers === 'object' ? state.answers : {};
      streak = 0; save();
      applyTheme(state.theme === 'light' || state.theme === 'dark' ? state.theme : root.getAttribute('data-theme'));
      applyMotion(state.motion !== false); applySound(state.sound !== false);
      $$('.q').forEach(function (q) { paint(q, state.answers[q.dataset.qid] || null); });
      summaries(); go();
    },
  };

"""

STORE_ADD = r"""
        /** Every saved page: localStorage copies, then IndexedDB, then this session's writes (newest wins). */
        all: function () {
          var out = {};
          if (lsOK) {
            try {
              for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf('jee-prep:ink:') === 0) { try { out[k.slice(13)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* skip a damaged page */ } }
              }
            } catch (e) { /* storage went away */ }
          }
          return dbp.then(function (db) {
            if (!db) return out;
            return new Promise(function (res) {
              try {
                var rq = db.transaction('pages').objectStore('pages').openCursor();
                rq.onsuccess = function () { var c = rq.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
                rq.onerror = function () { res(out); };
              } catch (e) { res(out); }
            });
          }).then(function (o) { Object.keys(mem).forEach(function (k) { o[k] = mem[k]; }); return o; });
        },
        /** Replace every saved page with these (Import). */
        replaceAll: function (src) {
          src = src || {};
          var keys = Object.keys(src).filter(function (k) { return src[k] && Array.isArray(src[k].s); });
          mem = {};
          keys.forEach(function (k) { mem[k] = src[k]; });
          if (lsOK) {
            try {
              var old = [];
              for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('jee-prep:ink:') === 0) old.push(k); }
              old.forEach(function (k) { localStorage.removeItem(k); });
            } catch (e) { /* storage went away */ }
          }
          function viaLS() { var ok = true; keys.forEach(function (k) { if (!lsPut(k, src[k])) ok = false; }); return ok; }
          return dbp.then(function (db) {
            if (!db) return viaLS();
            return new Promise(function (res) {
              var done = false, fin = function (v) { if (!done) { done = true; res(v); } };
              try {
                var tx = db.transaction('pages', 'readwrite'), st = tx.objectStore('pages');
                st.clear(); keys.forEach(function (k) { st.put(src[k], k); });
                tx.oncomplete = function () { fin(true); };
                tx.onerror = tx.onabort = function () { fin(viaLS()); };
              } catch (e) { fin(viaLS()); }
            });
          });
        },"""

FLUSH_OLD = r"""    function flush(pg) {
      pg = pg || page; if (!pg || !pg.ready) return;
      clearTimeout(saveTimer);
      Store.put(pg.key, { v: 1, s: pg.strokes.map(ser) }).then(function (ok) {
        if (!ok && !warned) { warned = true; toast('<span>Ink can’t be saved in this view</span>', 4600); }
      });
      bar.fab.classList.toggle('has-ink', pg.strokes.length > 0);
    }"""

FLUSH_NEW = r"""    function flush(pg) {
      pg = pg || page; if (!pg || !pg.ready) return Promise.resolve(true);
      clearTimeout(saveTimer);
      var done = Store.put(pg.key, { v: 1, s: pg.strokes.map(ser) }).then(function (ok) {
        if (!ok && !warned) { warned = true; toast('<span>Ink can’t be saved in this view</span>', 4600); }
        return ok;
      });
      bar.fab.classList.toggle('has-ink', pg.strokes.length > 0);
      return done;
    }"""

INK_API_OLD = """    return {
      stats: stats,
      route: function (r) {"""

INK_API_NEW = """    return {
      stats: stats,
      store: Store,
      /** Save the open lesson's ink now (Export). */
      flush: function () { return flush(); },
      /** Forget every loaded page and its strokes on screen (Import). */
      reset: function () {
        clearTimeout(saveTimer); cancelActive(); if (ro) ro.disconnect();
        page = null; pages = {};
        $$('.ink-layer').forEach(function (l) { if (l.parentNode) l.parentNode.removeChild(l); });
        bar.fab.classList.remove('has-ink'); bar.sync();
      },
      route: function (r) {"""


def add_backup(html, file_prefix='jee-prep-backup'):
    """Add Export / Import backup to a single-file build. Safe to run on a file that already has it."""
    if 'window.Backup = ' in html:
        return html
    # icons
    m = re.search(r'  <symbol id="i-headphones"[^\n]*\n', html)
    if not m:
        raise BuildError('icon sprite: i-headphones symbol not found')
    html = html[:m.end()] + SPRITE_ADD + html[m.end():]
    # library footer: export / import next to "Reset progress"
    html = rep(html, "Progress is saved on this device only.' +",
               "Progress is saved on this device only — export a backup to keep it safe or move it to another device.' +",
               what='footer text')
    html = rep(html, """' <button type="button" class="btn btn--ghost" id="resetAll" """,
               """' <button type="button" class="btn btn--ghost" id="exportAll" """ + FOOT_BTN + """>' + ico('download') + 'Export backup</button>' +
      ' <button type="button" class="btn btn--ghost" id="importAll" """ + FOOT_BTN + """>' + ico('upload') + 'Import backup</button>' +
      ' <button type="button" class="btn btn--ghost" id="resetAll" """, what='reset button')
    # app shell hooks
    html = rep(html, "  summaries();\n  // Restore saved answers, then show the right page.\n",
               APP_HOOKS + "  summaries();\n  // Restore saved answers, then show the right page.\n", what='app boot')
    # ink store: enumerate / replace
    html = rep(html, "        durable: function () { return dbp.then(function (db) { return !!db || lsOK; }); },",
               "        durable: function () { return dbp.then(function (db) { return !!db || lsOK; }); }," + STORE_ADD,
               what='ink store')
    html = rep(html, FLUSH_OLD, FLUSH_NEW, what='ink flush')
    html = rep(html, INK_API_OLD, INK_API_NEW, what='ink api')
    html = rep(html, "  window.StudyTools = { Ambient: Ambient, Ink: Ink };",
               "  window.StudyTools = { Ambient: Ambient, Ink: Ink, refresh: onRoute, ui: function () { return JSON.parse(JSON.stringify(ui)); } };",
               what='StudyTools export')
    # the module itself, last
    with open(os.path.join(HERE, 'backup.js'), encoding='utf-8') as f:
        js = f.read().replace('__FILE_PREFIX__', file_prefix)
    i = html.rindex('</body>')
    html = html[:i] + '<script>' + js + '</script>\n' + html[i:]
    return html


# ════════════════════════════════════════ 2. Split into the site ════════════════════════════════════════

LOADER = r"""  /* ── chapters live in their own files (chapters/<id>.js) and load the first time a lesson needs them ── */
  var CHS = {};
  function chapterReady(id) { return !!(CHS[id] && CHS[id].ready); }
  function loadChapter(id, cb) {
    var c = CHS[id] || (CHS[id] = { ready: false, cbs: [], el: null });
    if (c.ready) { if (cb) cb(); return; }
    if (cb) c.cbs.push(cb);
    if (c.el) return;
    var s = c.el = document.createElement('script');
    s.src = 'chapters/' + encodeURIComponent(id) + '.js'; s.charset = 'utf-8'; s.async = true;
    s.onerror = function () {
      if (s.parentNode) s.parentNode.removeChild(s);
      c.el = null; var waiting = c.cbs.length; c.cbs = [];
      if (!waiting) return;
      var ch = chapterById(id), now = parse();
      FX.toast('<span><b>Couldn’t load ' + esc(ch ? ch.title : id) + '</b> · check your connection and try again</span>', 5200); FX.play('wrong');
      if (now.chapter === ch && now.lesson) location.hash = '#/c/' + id; // fall back to the chapter overview
    };
    document.head.appendChild(s);
  }
  function prefetch(id, ms) { setTimeout(function () { loadChapter(id); }, ms || 350); }
  function setupChapter(ch) {
    buildPagers(ch);
    revealIn(ch.id);
    $$('.lesson[data-chapter="' + ch.id + '"] .q').forEach(function (q) { var a = state.answers[q.dataset.qid]; if (a) paint(q, a); });
    ch.lessons.forEach(function (l) { renderSummary(ch, l); });
  }
  window.DeepThought = {
    /** Called by chapters/<id>.js once its labs are registered: adds that chapter's lessons to the page. */
    chapter: function (id, html) {
      var ch = chapterById(id), c = CHS[id] || (CHS[id] = { ready: false, cbs: [], el: null });
      if (!ch || c.ready) return;
      $('#view').insertAdjacentHTML('beforeend', html);
      c.ready = true; setupChapter(ch);
      var cbs = c.cbs; c.cbs = []; cbs.forEach(function (f) { f(); });
      window.dispatchEvent(new Event('deepthought:chapter'));
    },
    load: loadChapter,
  };

"""


def patch_shell(js):
    """App shell: build pagers / reveal / restore answers per chapter, after its file loads."""
    js = rep(js, " * Everything it needs is already in this file's DOM — it never touches the network.",
             " * Each chapter's lessons arrive from chapters/<id>.js the first time they are needed.", what='shell comment')
    # pager: once per chapter instead of once for all
    js = rep(js, "  /* ── lesson pager (built once) ── */\n  M.chapters.forEach(function (ch) {\n    ch.lessons.forEach(function (l) {",
             "  /* ── lesson pager (built once per chapter, when its file is in) ── */\n  function buildPagers(ch) {\n    ch.lessons.forEach(function (l) {",
             what='pager start')
    js = rep(js, "      art.appendChild(sum); art.appendChild(nav);\n    });\n  });\n",
             "      art.appendChild(sum); art.appendChild(nav);\n    });\n  }\n", what='pager end')
    # scroll-in reveals: per chapter
    m = re.search(r"  if \('IntersectionObserver' in window\) \{\n    var io = (new IntersectionObserver\(.*?\{ rootMargin: '0px 0px -6% 0px' \}\));\n"
                  r"    \$\$\('\.lesson > \.card, \.lesson > \.q, \.lesson > \.sim, \.lesson > \.summary, \.lesson > \.pager'\)\.forEach\(function \(n\) \{ n\.classList\.add\('reveal'\); io\.observe\(n\); \}\);\n  \}\n", js)
    if not m:
        raise BuildError('reveal observer block not found')
    js = js[:m.start()] + (
        "  var io = 'IntersectionObserver' in window ? " + m.group(1) + " : null;\n"
        "  function revealIn(id) {\n"
        "    if (!io) return;\n"
        "    var a = '.lesson[data-chapter=\"' + id + '\"] > ';\n"
        "    $$(a + '.card, ' + a + '.q, ' + a + '.sim, ' + a + '.summary, ' + a + '.pager').forEach(function (n) { n.classList.add('reveal'); io.observe(n); });\n"
        "  }\n") + js[m.end():]
    # router: a lesson waits for its chapter file
    js = rep(js, "  function go() {\n    var before = route.chapter;\n    route = parse();\n",
             "  function go() {\n    var before = route.chapter, prev = route;\n    route = parse();\n"
             "    // a lesson needs its chapter's file: fetch it, and stay on the current page until it is in\n"
             "    if (route.lesson && !chapterReady(route.chapter.id)) {\n"
             "      var want = location.hash, id = route.chapter.id;\n"
             "      route = prev;\n"
             "      loadChapter(id, function () { if (location.hash === want) go(); });\n"
             "      return;\n"
             "    }\n", what='go()')
    js = rep(js, "      renderChapter(route.chapter);\n      document.title = route.chapter.title + ' · JEE Prep';\n",
             "      renderChapter(route.chapter);\n      document.title = route.chapter.title + ' · " + APP_NAME + "';\n      prefetch(route.chapter.id);\n",
             what='overview route')
    js = rep(js, "      document.title = 'JEE Prep — Offline';\n", "      document.title = '" + APP_NAME + "';\n", what='home title')
    js = rep(js, "    var hasLab = !!$('.lesson[data-chapter=\"' + ch.id + '\"] [data-sim]');",
             "    var hasLab = !!ch.lab;", what='hasLab')
    # library: quietly fetch the chapter behind "Jump back in"
    js = rep(js, "    $('#libSearch').value = libQuery;\n    renderLib();\n",
             "    $('#libSearch').value = libQuery;\n    renderLib();\n    if (ll) prefetch(lch.id, 1500);\n", what='renderHome')
    # search: the Library box also lists matches inside the lessons (Finder, tools/search.js)
    js = rep(js, "    $('#libList').innerHTML = h;\n  }\n",
             "    $('#libList').innerHTML = h;\n    if (window.Finder && q) Finder.lib(q, $('#libList'));\n  }\n", what='renderLib')
    js = rep(js, 'placeholder="Find a chapter or lesson"', 'placeholder="Find a chapter, lesson, formula or idea"', what='lib placeholder')
    js = rep(js, "  summaries();\n  // Restore saved answers, then show the right page.\n",
             LOADER + "  summaries();\n  // Restore saved answers, then show the right page.\n", what='boot')
    return js


def patch_tools(js):
    return rep(js, "  window.addEventListener('hashchange', onRoute);\n",
               "  window.addEventListener('hashchange', onRoute);\n  window.addEventListener('deepthought:chapter', onRoute); // a chapter file just arrived\n",
               what='study tools route')


def js_string(s):
    out = json.dumps(s, ensure_ascii=False)
    return out.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def js_string_obj(o):
    out = json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    return out.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def build_site(html, out_dir):
    html = add_backup(html, file_prefix='deep-thought-education-backup')
    html = re.sub(r"FILE_PREFIX = '[^']*'", "FILE_PREFIX = 'deep-thought-education-backup'", html, count=1)

    # ── carve the file up ──
    css, cs, ce = between(html, '<style>', '</style>')
    head = html[:cs - len('<style>')]
    m_main = re.search(r'<main id="view" tabindex="-1">\n\s*<section class="home" id="home" hidden></section>\n', html)
    if not m_main:
        raise BuildError('<main id="view"> with the home section not found')
    shell = html[ce + len('</style>'):m_main.end()]
    main_end = html.index('\n    </main>', m_main.end())
    articles_src = html[m_main.end():main_end]
    manifest_src, ms, me = between(html, '<script type="application/json" id="manifest">', '</script>')
    tail = html[main_end:ms - len('<script type="application/json" id="manifest">')]
    scripts = re.findall(r'<script>(.*?)</script>', html[me:], re.S)
    if len(scripts) != 4:
        raise BuildError('expected 4 scripts after the manifest (bundle, perfect-freehand, study tools, backup), found %d' % len(scripts))
    bundle, freehand, tools, backup = scripts

    # ── chapters: lessons ──
    arts = re.findall(r'(<article class="lesson" data-chapter="([\w-]+)" data-lesson="(\d+)".*?</article>)', articles_src, re.S)
    if not arts:
        raise BuildError('no lessons found')
    rebuilt = ''.join(a[0] for a in arts)
    if len(re.sub(r'\s', '', rebuilt)) != len(re.sub(r'\s', '', articles_src)):
        raise BuildError('something other than <article class="lesson"> sits inside <main>; refusing to drop it')
    manifest = json.loads(manifest_src)
    order = [c['id'] for c in manifest['chapters']]
    lessons = {cid: [] for cid in order}
    for full, cid, n in arts:
        if cid not in lessons:
            raise BuildError('lesson for unknown chapter %r' % cid)
        lessons[cid].append(full)
    sims = {cid: set(re.findall(r'data-sim="([\w-]+)"', ''.join(lessons[cid]))) for cid in order}

    # ── search index: cut every lesson into findable pieces and anchor them (data-find) ──
    docs = []
    for ci, cid in enumerate(order):
        for k, art in enumerate(lessons[cid]):
            n = int(re.search(r'data-lesson="(\d+)"', art).group(1))
            lessons[cid][k], d = search_index.index_article(art, ci, n)
            docs += d

    # ── chapters: labs (the bundle's modules are joined with "\n;\n") ──
    parts = bundle.split('\n;\n')
    core, labs = [], {cid: [] for cid in order}
    for p in parts:
        names = re.findall(r"^Sim\.register\('([\w-]+)'", p, re.M)
        if not names:
            core.append(p)
            continue
        owners = {cid for cid in order if sims[cid] & set(names)}
        tag = re.match(r'/\* lab:([\w-]+):start \*/', p)
        if tag:
            owners = {tag.group(1)}
        if len(owners) != 1:
            raise BuildError('cannot tell which chapter owns the lab(s) %s' % names)
        labs[owners.pop()].append(p)
    if not any('App shell' in p for p in core):
        raise BuildError('app shell module not found in the bundle')
    core = [patch_shell(p) if 'App shell: hash router' in p else p for p in core]

    for c in manifest['chapters']:
        c['lab'] = bool(sims[c['id']])

    # ── write ──
    os.makedirs(os.path.join(out_dir, 'assets'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'chapters'), exist_ok=True)

    def write(rel, text):
        with open(os.path.join(out_dir, rel), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        return os.path.getsize(os.path.join(out_dir, rel))

    sizes = {}
    with open(os.path.join(HERE, 'search.css'), encoding='utf-8') as f:
        css = css.strip('\n') + '\n' + f.read()
    with open(os.path.join(HERE, 'search.js'), encoding='utf-8') as f:
        finder = f.read()
    sizes['assets/app.css'] = write('assets/app.css', css.strip('\n') + '\n')
    app_js = ('/* ' + APP_NAME + ' — app core: effects, lab framework, router & quiz engine, handwriting, ambient sound, backup, search.\n'
              '   Generated by tools/build.py — chapters/<id>.js add each chapter\'s lessons and labs on demand. */\n'
              + '\n;\n'.join(core) + '\n;\n' + freehand.strip('\n') + '\n;\n' + patch_tools(tools).strip('\n') + '\n;\n' + backup.strip('\n') + '\n;\n' + finder.strip('\n') + '\n')
    sizes['assets/app.js'] = write('assets/app.js', app_js)

    index_js = ('/* ' + APP_NAME + ' — search index: every lesson cut into findable pieces. Generated by tools/build.py. */\n'
                'Finder.load(' + js_string_obj({'v': 1, 'chapters': order, 'docs': docs}) + ');\n')
    sizes['assets/search-index.js'] = write('assets/search-index.js', index_js)

    titles = {c['id']: c['title'] for c in manifest['chapters']}
    for cid in order:
        body = '\n'.join(lessons[cid]) + '\n'
        js = ('/* ' + APP_NAME + ' · ' + titles[cid] + ' — lessons and interactive labs.\n'
              '   Generated by tools/build.py; loaded by assets/app.js the first time one of these lessons is opened. */\n')
        for lab in labs[cid]:
            js += lab.strip('\n') + '\n;\n'
        js += 'DeepThought.chapter(' + json.dumps(cid) + ', ' + js_string(body) + ');\n'
        sizes['chapters/%s.js' % cid] = write('chapters/%s.js' % cid, js)

    head = rep(head, '<title>JEE Prep — Offline</title>', '<title>' + APP_NAME + '</title>', what='<title>')
    # "Deep Thought" on the bold line, "Education" on the small one: same footprint as the old brand
    shell = rep(shell, '<b>JEE Prep</b><small>Offline · Advanced track</small>',
                '<b>Deep Thought</b><small>Education · Advanced track</small>', what='brand')
    tail = rep(tail, 'This module needs JavaScript for navigation and the interactive labs. All content is stored in this one file — nothing is downloaded.',
               'This app needs JavaScript for navigation and the interactive labs.', what='noscript')
    man = json.dumps(manifest, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    index = (head + '<link rel="stylesheet" href="assets/app.css">' + shell + tail.lstrip('\n') +
             '<script type="application/json" id="manifest">' + man + '</script>\n'
             '<script src="assets/app.js"></script>\n</body>\n</html>\n')
    sizes['index.html'] = write('index.html', index)
    return sizes


def main(argv):
    if len(argv) < 3 or argv[1] not in ('single', 'site'):
        print(__doc__)
        return 2
    with open(argv[2], encoding='utf-8') as f:
        html = f.read()
    try:
        if argv[1] == 'single':
            if len(argv) < 4:
                print(__doc__)
                return 2
            out = add_backup(html)
            with open(argv[3], 'w', encoding='utf-8', newline='\n') as f:
                f.write(out)
            print('wrote %s (%.1f MB)' % (argv[3], os.path.getsize(argv[3]) / 1e6))
        else:
            sizes = build_site(html, argv[3] if len(argv) > 3 else REPO)
            for k, v in sizes.items():
                print('%-40s %8.0f kB' % (k, v / 1e3))
    except BuildError as e:
        print('build failed: %s' % e, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
