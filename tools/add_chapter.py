#!/usr/bin/env python3
"""
Add (or rebuild) one chapter that is written as its own source folder, content/<id>/:

  chapter.json     its manifest entry: title, subject, unit, tone, tagline, sections, and per lesson
                   { n, title, summary, minutes }  (question ids and PYQ flags are filled in here)
  lessons/NN.html  one file per lesson, in the light authoring markup below
  labs.js          (optional) the chapter's interactive labs — Sim.register(…) calls
  theme.css        (optional) the chapter's colour tone and chapter-specific styles
  ambient.js       (optional) an ambient soundscape: one entry for the Ambient BUILD table
  synonyms.txt     (optional) extra search synonym groups, one "a | b | c" per line

It writes chapters/<id>.js, puts the chapter into the manifest in index.html, adds its pieces to the
search index (assets/search-index.js), and patches assets/app.css, assets/app.js and tools/search.js
between marker comments. Re-running it replaces its own earlier output, so it is safe to run again —
including after `tools/build.py site`, which regenerates those files from the single-file app.

    python3 tools/add_chapter.py content/alcohols-phenols-and-ethers

Needs Node and KaTeX 0.19.1 for the maths:  (cd tools && npm install)

Authoring markup (everything else is ordinary HTML and passes through untouched)
  $…$  inline maths        $$…$$  displayed maths (on its own line)        \\ce{…} chemistry (mhchem)
  <card> … </card>                                             a glass card of prose
  <callout kind="story|intuition|trap|key|recap|breather" title="…" [label="…"]> … </callout>
  <derive tag="Derivation" title="…" [predict]> … </derive>    a fold-out block
  <tbl> <table>…</table> </tbl>                                a scrollable table
  <?py fig(…) ?>                                               a figure drawn with tools/chemfig.py / tools/physfig.py
  <lab sim="name" title="…" [data-…="…"]> notes </lab>         an interactive lab
  <q type="single|multi|integer|numeric|reveal" answer="…" [tol="…"] [pyq="JEE Main 2014"] [title="…"]>
     <stem>…</stem> <opt>…</opt>… <hint>…</hint> <sol>…</sol>
  </q>
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import chemfig  # noqa: E402
import physfig  # noqa: E402
import search_index  # noqa: E402

APP_NAME = 'Deep Thought Education'


class BuildError(Exception):
    pass


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def ico(name):
    return '<svg class="ico" aria-hidden="true"><use href="#i-%s"/></svg>' % name


def attrs(s):
    """name="value" pairs plus bare flags (e.g. `predict`)."""
    out = dict(re.findall(r'([\w-]+)="([^"]*)"', s))
    for flag in re.sub(r'[\w-]+="[^"]*"', ' ', s).split():
        out.setdefault(flag, '')
    return out


# ═════════════════════════════════════════ maths ═════════════════════════════════════════

def render_tex(items):
    """[(tex, display)] → [html] through tools/tex.js (one Node process for the whole chapter)."""
    if not items:
        return []
    p = subprocess.run(['node', os.path.join(HERE, 'tex.js')], input=json.dumps(items), capture_output=True, text=True)
    if p.returncode:
        raise BuildError('KaTeX failed:\n' + p.stderr.strip() + '\n(run `cd tools && npm install` if KaTeX is missing)')
    return json.loads(p.stdout)


def maths(html, store):
    """Swap every $$…$$ and $…$ for a placeholder; the TeX goes into `store`."""
    def disp(m):
        store.append((m.group(1).strip(), True))
        return '<div class="math-block">\x00%d\x00</div>' % (len(store) - 1)

    def inline(m):
        if '\n\n' in m.group(1) or '<' in m.group(1) and re.search(r'</?(p|li|section|div)\b', m.group(1)):
            raise BuildError('unbalanced $ near: %s' % m.group(0)[:120])
        store.append((m.group(1), False))
        return '\x00%d\x00' % (len(store) - 1)
    html = re.sub(r'(?:<p>\s*)?\$\$(.+?)\$\$(?:\s*</p>)?', disp, html, flags=re.S)
    html = re.sub(r'(?<!\\)\$(.+?)(?<!\\)\$', inline, html, flags=re.S)
    return html


# ═════════════════════════════════════════ markup ═════════════════════════════════════════

CALLOUT = {
    'story': ('spark', 'Picture this'), 'intuition': ('bulb', 'Intuition'), 'trap': ('alert', 'JEE trap'),
    'key': ('key', 'Key result'), 'recap': ('check', 'Recap'), 'breather': ('wave', 'Breather'),
}
KIND = {'single': 'Single correct', 'multi': 'One or more correct', 'integer': 'Integer answer',
        'numeric': 'Numerical answer', 'reveal': 'Think, then reveal'}


def figures(src, where):
    def run(m):
        try:
            env = dict(chemfig.NAMES)
            env.update(physfig.NAMES)
            env['__builtins__'] = {'range': range, 'len': len, 'dict': dict, 'min': min, 'max': max, 'round': round, 'enumerate': enumerate, 'zip': zip, 'str': str,
                                   'abs': abs, 'sum': sum, 'int': int, 'float': float, 'list': list}
            return str(eval(m.group(1), env))
        except Exception as e:
            raise BuildError('%s: figure failed (%s): %s' % (where, e, m.group(1)[:200]))
    return re.sub(r'<\?py(.*?)\?>', run, src, flags=re.S)


def question(m, cid, lesson, k, where):
    a = attrs(m.group(1))
    body = m.group(2)
    qtype = a.get('type', 'single')
    if qtype not in KIND:
        raise BuildError('%s: unknown question type %r' % (where, qtype))
    qid = '%s.%d.%d' % (cid, lesson, k)
    pyq = a.get('pyq', '')

    def part(tag, required=True):
        mm = re.search(r'<%s>(.*?)</%s>' % (tag, tag), body, re.S)
        if not mm:
            if required:
                raise BuildError('%s: question %s has no <%s>' % (where, qid, tag))
            return None
        return mm.group(1).strip()
    stem, sol, hint = part('stem'), part('sol'), part('hint', False)
    opts = re.findall(r'<opt>(.*?)</opt>', body, re.S)
    answer = a.get('answer', '')
    if qtype in ('single', 'multi'):
        if len(opts) < 2:
            raise BuildError('%s: question %s needs options' % (where, qid))
        keys = [chr(65 + i) for i in range(len(opts))]
        given = answer.split(',')
        if not answer or any(x not in keys for x in given) or (qtype == 'single' and len(given) != 1):
            raise BuildError('%s: question %s has a bad answer %r' % (where, qid, answer))
    elif qtype in ('integer', 'numeric'):
        try:
            float(answer)
        except ValueError:
            raise BuildError('%s: question %s needs a numeric answer, got %r' % (where, qid, answer))
    elif not answer:
        raise BuildError('%s: reveal question %s needs answer="…" (shown after revealing)' % (where, qid))

    def para(s):
        return s if s.lstrip().startswith('<') else '<p>' + s + '</p>'

    h = '<section class="q glass q--%s" id="q-%s" data-qid="%s" data-type="%s" data-answer="%s"%s>\n' % (
        'pyq' if pyq else 'concept', qid, qid, qtype, esc(answer), (' data-tol="%s"' % esc(a['tol'])) if a.get('tol') else '')
    if pyq:
        h += '<header class="q__head"><span class="q__badge q__badge--pyq">%sPYQ</span><span class="q__exam">%s</span><span class="q__kind">%s</span></header>\n' % (ico('trophy'), esc(pyq), KIND[qtype])
    else:
        h += '<header class="q__head"><span class="q__badge q__badge--concept">%sConcept check</span><span class="q__exam">%s</span><span class="q__kind">%s</span></header>\n' % (ico('target'), esc(a.get('title', 'Quick check')), KIND[qtype])
    h += '<div class="q__stem prose">%s\n</div>\n' % para(stem)
    if qtype in ('single', 'multi'):
        h += '<div class="q__opts" role="group" aria-label="Options">' + ''.join(
            '<button type="button" class="opt" data-key="%s" aria-pressed="false"><span class="opt__key">%s</span><span class="opt__body">%s</span></button>' % (chr(65 + i), chr(65 + i), o.strip())
            for i, o in enumerate(opts)) + '</div>\n'
    elif qtype in ('integer', 'numeric'):
        h += '<label class="q__num"><span>Your answer</span><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="%s"></label>\n' % ('integer' if qtype == 'integer' else 'e.g. 1.25')
    if hint and qtype != 'reveal':
        h += '<div class="q__hint prose" hidden>%s<div>%s</div></div>\n' % (ico('bulb'), para(hint))
    if qtype == 'reveal':
        h += '<div class="q__actions"><button type="button" class="btn btn--primary q__reveal">Reveal answer</button><button type="button" class="btn btn--ghost q__retry" hidden>Try again</button></div>\n'
    else:
        h += ('<div class="q__actions"><button type="button" class="btn btn--primary q__check">Check</button><button type="button" class="btn q__reveal">Show solution</button>'
              + ('<button type="button" class="btn btn--ghost q__hintbtn">Hint</button>' if hint else '')
              + '<button type="button" class="btn btn--ghost q__retry" hidden>Try again</button></div>\n')
    h += '<div class="q__feedback" role="status" aria-live="polite"></div>\n'
    h += '<div class="q__solution prose" hidden><div class="q__solhead">%sSolution</div>%s\n</div>\n</section>' % (ico('check'), para(sol))
    return h, {'id': qid, 'pyq': bool(pyq)}


def markup(src, where):
    """Light authoring markup → house HTML (everything except questions and maths)."""
    src = figures(src, where)

    def callout(m):
        a = attrs(m.group(1))
        kind = a.get('kind', 'intuition')
        if kind not in CALLOUT:
            raise BuildError('%s: unknown callout kind %r' % (where, kind))
        icon, label = CALLOUT[kind]
        title = a.get('title', '')
        return ('<aside class="callout callout--%s"><div class="callout__head">%s<span class="callout__label">%s</span>%s</div><div class="callout__body">'
                % (kind, ico(icon), esc(a.get('label', label)), ('<span class="callout__title">%s</span>' % title) if title else ''))
    src = re.sub(r'<callout\b([^>]*)>', callout, src)
    src = src.replace('</callout>', '</div></aside>')

    def derive(m):
        a = attrs(m.group(1))
        return ('<details class="derive%s"><summary>%s<span class="derive__tag">%s</span><span>%s</span></summary><div class="derive__body">'
                % (' derive--predict' if 'predict' in a else '', ico('chev'), a.get('tag', 'Derivation'), a.get('title', '')))
    src = re.sub(r'<derive\b([^>]*)>', derive, src)
    src = src.replace('</derive>', '</div></details>')
    src = re.sub(r'<card>', '<section class="card glass prose">', src).replace('</card>', '</section>')
    src = src.replace('<tbl>', '<div class="table-wrap">').replace('</tbl>', '</div>')

    def lab(m):
        a = attrs(m.group(1))
        extra = ''.join(' %s="%s"' % (k, esc(v)) for k, v in a.items() if k.startswith('data-'))
        return ('<section class="sim glass" data-sim="%s"%s><header class="sim__head">%s<div><span class="eyebrow">Interactive lab</span><h3>%s</h3></div></header><div class="sim__mount"></div><div class="sim__notes prose">%s</div></section>'
                % (a['sim'], extra, ico('hand'), a.get('title', 'Interactive lab'), m.group(2).strip()))
    src = re.sub(r'<lab\b([^>]*)>(.*?)</lab>', lab, src, flags=re.S)
    return src


def lesson_html(src, ch, meta, where):
    cid, n = ch['id'], meta['n']
    src = markup(src, where)
    qs, k = [], [0]

    def q(m):
        k[0] += 1
        h, info = question(m, cid, n, k[0], where)
        qs.append(info)
        return h
    src = re.sub(r'<q\b([^>]*)>(.*?)</q>', q, src, flags=re.S)

    hero = ('<header class="lesson__hero">\n<p class="eyebrow">%s · Lesson %d · %d min</p>\n<h1>%s</h1>\n<p class="lesson__summary">%s</p>\n</header>\n'
            % (esc(ch['title']), n, meta['minutes'], esc(meta['title']), esc(meta['summary'])))
    art = '<article class="lesson" data-chapter="%s" data-lesson="%d" hidden>\n%s%s\n</article>' % (cid, n, hero, src.strip())
    return art, qs


# ═════════════════════════════════════════ patching ═════════════════════════════════════════

def marked(text, cid, part, block, anchor_re=None, before=True, comment=('/*', '*/')):
    """Put `block` between start/end markers: replace an earlier copy, or insert it at the anchor (or the end)."""
    a, b = comment
    start, end = '%s chapter:%s:%s:start %s' % (a, cid, part, b), '%s chapter:%s:%s:end %s' % (a, cid, part, b)
    wrapped = start + '\n' + block.strip('\n') + '\n' + end
    pat = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
    if pat.search(text):
        return pat.sub(lambda _: wrapped, text, count=1)
    if anchor_re is None:
        return text.rstrip('\n') + '\n' + wrapped + '\n'
    m = re.search(anchor_re, text, re.M)
    if not m:
        raise BuildError('patch anchor for %s not found: %s' % (part, anchor_re))
    i = m.start() if before else m.end()
    return text[:i] + wrapped + '\n' + text[i:]


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    return os.path.getsize(p)


def js_string(s):
    return json.dumps(s, ensure_ascii=False).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


SHARED_CSS = os.path.join(REPO, 'content', 'shared', 'styles.css')


def apply_shared(repo=REPO):
    """Styles every chapter may use (breathers, …): content/shared/styles.css → assets/app.css."""
    css_p = os.path.join(repo, 'assets', 'app.css')
    if os.path.exists(SHARED_CSS):
        return write(css_p, marked(read(css_p), 'shared', 'styles', read(SHARED_CSS)))
    return os.path.getsize(css_p)


def build(src_dir, repo=REPO):
    ch = json.loads(read(os.path.join(src_dir, 'chapter.json')))
    cid = ch['id']
    sizes = {}

    # ── lessons ──
    arts, store = [], []
    for meta in ch['lessons']:
        p = os.path.join(src_dir, 'lessons', '%02d.html' % meta['n'])
        art, qs = lesson_html(read(p), ch, meta, os.path.relpath(p, repo))
        meta['questions'] = qs
        arts.append(maths(art, store))
    rendered = render_tex(store)
    arts = [re.sub(r'\x00(\d+)\x00', lambda m: rendered[int(m.group(1))], a) for a in arts]

    # ── manifest ──
    index_p = os.path.join(repo, 'index.html')
    index = read(index_p)
    m = re.search(r'(<script type="application/json" id="manifest">)(.*?)(</script>)', index, re.S)
    manifest = json.loads(m.group(2))
    entry = {k: ch[k] for k in ('id', 'title', 'subject', 'unit', 'tone', 'tagline') if k in ch}
    entry['lessons'] = [{'n': l['n'], 'title': l['title'], 'summary': l['summary'], 'minutes': l['minutes'], 'questions': l['questions']} for l in ch['lessons']]
    entry['sections'] = ch['sections']
    entry['lab'] = os.path.exists(os.path.join(src_dir, 'labs.js'))
    ids = [c['id'] for c in manifest['chapters']]
    if cid in ids:
        manifest['chapters'][ids.index(cid)] = entry
    else:
        manifest['chapters'].append(entry)
    ci = [c['id'] for c in manifest['chapters']].index(cid)
    man = json.dumps(manifest, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    sizes['index.html'] = write(index_p, index[:m.start(2)] + man + index[m.end(2):])

    # ── search index: this chapter's pieces, anchored with data-find ──
    six_p = os.path.join(repo, 'assets', 'search-index.js')
    six = read(six_p)
    mm = re.search(r'Finder\.load\((.*)\);\s*$', six, re.S)
    data = json.loads(mm.group(1))
    if cid in data['chapters']:
        old = data['chapters'].index(cid)
    else:
        data['chapters'].append(cid)
        old = len(data['chapters']) - 1
    data['docs'] = [d for d in data['docs'] if d[0] != old]
    for k, art in enumerate(arts):
        arts[k], docs = search_index.index_article(art, old, ch['lessons'][k]['n'])
        data['docs'] += docs
    out = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    sizes['assets/search-index.js'] = write(six_p, six[:mm.start(1)] + out + six[mm.end(1):])
    del ci

    # ── chapters/<id>.js ──
    js = ('/* %s · %s — lessons and interactive labs.\n'
          '   Generated by tools/add_chapter.py from content/%s/; loaded by assets/app.js the first time one of these lessons is opened. */\n'
          % (APP_NAME, ch['title'], cid))
    labs_p = os.path.join(src_dir, 'labs.js')
    if os.path.exists(labs_p):
        js += '/* lab:%s:start */\n%s\n/* lab:%s:end */\n;\n' % (cid, read(labs_p).strip('\n'), cid)
    js += 'DeepThought.chapter(%s, %s);\n' % (json.dumps(cid), js_string('\n'.join(arts) + '\n'))
    sizes['chapters/%s.js' % cid] = write(os.path.join(repo, 'chapters', cid + '.js'), js)

    # ── styles, ambient sound and search synonyms (between markers, so re-runs replace them) ──
    css_p, app_p, finder_p = (os.path.join(repo, 'assets', 'app.css'), os.path.join(repo, 'assets', 'app.js'),
                              os.path.join(HERE, 'search.js'))
    theme_p = os.path.join(src_dir, 'theme.css')
    if os.path.exists(theme_p):
        sizes['assets/app.css'] = write(css_p, marked(read(css_p), cid, 'theme', read(theme_p)))
    app = read(app_p)
    amb_p = os.path.join(src_dir, 'ambient.js')
    if os.path.exists(amb_p):
        amb = json.loads(re.search(r'/\*\s*scene\s*(\{.*?\})\s*\*/', read(amb_p), re.S).group(1))
        build_src = re.sub(r'/\*\s*scene\s*\{.*?\}\s*\*/', '', read(amb_p), count=1, flags=re.S).strip('\n')
        app = marked(app, cid, 'scene', '      %s: { name: %s, note: %s },' % (amb['id'], json.dumps(amb['name'], ensure_ascii=False), json.dumps(amb['note'], ensure_ascii=False)),
                     r'^    \};\n    var MAP = \{')
        app = marked(app, cid, 'map', "    MAP[%s] = '%s';" % (json.dumps(cid), amb['id']), r'^    var MAP = \{.*\n', before=False)
        app = marked(app, cid, 'build', build_src, r"^      focus: function \(c\) \{")
    syn_p = os.path.join(src_dir, 'synonyms.txt')
    if os.path.exists(syn_p):
        groups = [l.strip() for l in read(syn_p).splitlines() if l.strip() and not l.startswith('#')]
        block = '    ' + ', '.join(json.dumps(g, ensure_ascii=False).replace('"', "'") for g in groups) + ','
        app = marked(app, cid, 'synonyms', block, r'^  \];\n  var SYN = \{\};')
        write(finder_p, marked(read(finder_p), cid, 'synonyms', block, r'^  \];\n  var SYN = \{\};'))
    sizes['assets/app.js'] = write(app_p, app)
    sizes['assets/app.css'] = apply_shared(repo)
    return sizes, sum(len(l['questions']) for l in ch['lessons']), sum(q['pyq'] for l in ch['lessons'] for q in l['questions'])


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    try:
        sizes, nq, npyq = build(os.path.abspath(argv[1]))
    except BuildError as e:
        print('add_chapter failed: %s' % e, file=sys.stderr)
        return 1
    for k, v in sizes.items():
        print('%-48s %8.0f kB' % (k, v / 1e3))
    print('%d questions (%d PYQs)' % (nq, npyq))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
