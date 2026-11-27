#!/usr/bin/env python3
"""
Enrich a chapter that already exists in chapters/<id>.js (built from the single-file app) with extra
material written in content/enrich/<id>/: story openers, breathers, memory hooks, card splits, closing
games. The chapter's own lessons are left as they are; the additions are slotted in around them.

    python3 tools/enrich_chapter.py magnetism
    python3 tools/enrich_chapter.py current-electricity

content/enrich/<id>/
  NN.html   additions for lesson NN, as <insert> blocks:
              <insert at="…" pos="before|after|append|split" [para="…"]> markup </insert>
            at   which block of the lesson:  h2:<heading starts with>   q:<exam/title text, exact>
                 sim:<lab title>   callout:<callout title>   first   last
            pos  before / after the block; append = at the end inside it (a card or a callout);
                 split = end the card just before its child that starts with `para`, and open a new card
                 (the markup should start with that new card's <h2>)
            The markup is the same light markup tools/add_chapter.py reads ($…$, \\ce{…}, <callout>, <lab>, …).
  labs.js   (optional) extra labs; a line  /* include: shared/rush.js */  pulls in a shared file
            from content/shared/.

Every addition is wrapped in <!--enrich--> … <!--/enrich--> comments and the labs in marker comments, so
running the tool again first removes its previous output: it is safe to re-run, also after
`tools/build.py site` has regenerated the chapter from the single-file app. The chapter's entries in
assets/search-index.js are rebuilt to match.
"""
import html as htmllib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import add_chapter as AC  # noqa: E402
import search_index  # noqa: E402

OPEN, CLOSE = '<!--enrich-->', '<!--/enrich-->'


class EnrichError(Exception):
    pass


def text(h):
    h = re.sub(r'<span class="katex">.*?</span></span></span>(?=[^<]*<)', ' ', h, flags=re.S)
    h = re.sub(r'<svg.*?</svg>', ' ', h, flags=re.S)
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()


def top_blocks(art):
    """[(start, end, tag)] of the article's direct children after its header (sections and asides)."""
    out, i = [], art.index('</header>') + len('</header>')
    pat = re.compile(r'<(/?)(section|aside|header|div|details|figure)\b[^>]*>|<!--.*?-->', re.S)
    depth, start, tag = 0, None, None
    for m in pat.finditer(art, i):
        if m.group(0).startswith('<!--'):
            continue
        closing, t = m.group(1) == '/', m.group(2)
        if not closing:
            if depth == 0:
                start, tag = m.start(), t
            depth += 1
        else:
            depth -= 1
            if depth == 0 and start is not None:
                out.append((start, m.end(), tag))
                start = None
    return out


def find(art, at, where):
    blocks = top_blocks(art)
    if at == 'first':
        return blocks[0]
    if at == 'last':
        return blocks[-1]
    kind, _, val = at.partition(':')
    hits = []
    for b in blocks:
        h = art[b[0]:b[1]]
        if kind == 'h2':
            m = re.search(r'<h2[^>]*>(.*?)</h2>', h, re.S)
            ok = h.startswith('<section class="card') and m and text(m.group(1)).startswith(val)
        elif kind == 'q':
            m = re.search(r'class="q__exam">(.*?)</span>', h, re.S)
            ok = h.startswith('<section class="q ') and m and text(m.group(1)) == val
        elif kind == 'sim':
            m = re.search(r'<h3>(.*?)</h3>', h, re.S)
            ok = h.startswith('<section class="sim') and m and text(m.group(1)) == val
        elif kind == 'callout':
            ok = any(text(t) == val for t in re.findall(r'class="callout__title">(.*?)</span>', h, re.S))
        else:
            raise EnrichError('%s: unknown anchor %r' % (where, at))
        if ok:
            hits.append(b)
    if len(hits) != 1:
        raise EnrichError('%s: anchor %r matches %d blocks (need exactly 1)' % (where, at, len(hits)))
    return hits[0]


def apply(art, block, where):
    """Insert one rendered fragment. block = (attrs, html)."""
    a, frag = block
    at, pos = a.get('at', ''), a.get('pos', 'after')
    s, e, tag = find(art, at, where)
    wrap = lambda h: OPEN + h + CLOSE
    if pos == 'before':
        return art[:s] + wrap(frag + '\n') + art[s:]
    if pos == 'after':
        return art[:e] + wrap('\n' + frag) + art[e:]
    if pos == 'append':
        if at.startswith('callout:'):
            title = at.split(':', 1)[1]
            h = art[s:e]
            m = [x for x in re.finditer(r'class="callout__title">(.*?)</span>', h, re.S) if text(x.group(1)) == title][0]
            end = h.index('</div></aside>', m.end())
            k = s + end
            return art[:k] + wrap(frag) + art[k:]
        k = e - len('</section>')
        if art[k:e] != '</section>':
            raise EnrichError('%s: append needs a card' % where)
        if art[k - len(OPEN):k] == OPEN:  # the first half of a split card: stay outside the split's markers
            k -= len(OPEN)
        return art[:k] + wrap(frag + '\n') + art[k:]
    if pos == 'split':
        para = a.get('para', '')
        h = art[s:e]
        body = h.index('>') + 1
        for m in re.finditer(r'\n<(p|div|aside|figure|ul|ol|details|blockquote|h3)\b', h[body:]):
            k = body + m.start() + 1
            close = re.search(r'</%s>' % m.group(1), h[k:])
            if close and text(h[k:k + close.end()]).startswith(para):
                k += s
                return art[:k] + wrap('</section>\n<section class="card glass prose">' + frag + '\n') + art[k:]
        raise EnrichError('%s: split point %r not found in %r' % (where, para, at))
    raise EnrichError('%s: unknown pos %r' % (where, pos))


def run(cid, repo=REPO):
    src = os.path.join(repo, 'content', 'enrich', cid)
    js_p = os.path.join(repo, 'chapters', cid + '.js')
    js = AC.read(js_p)
    m = re.search(r'DeepThought\.chapter\(("[^"]*"), (".*")\);\s*$', js, re.S)
    if not m:
        raise EnrichError('chapters/%s.js: DeepThought.chapter(…) call not found' % cid)
    body = json.loads(m.group(2))
    head = js[:m.start()]

    # undo earlier runs, and drop search anchors (rebuilt below)
    body = re.sub(re.escape(OPEN) + r'.*?' + re.escape(CLOSE), '', body, flags=re.S)
    body = re.sub(r' data-find="\d+"', '', body)
    arts = re.findall(r'<article class="lesson" data-chapter="[\w-]+" data-lesson="\d+".*?</article>', body, re.S)
    if '\n'.join(arts) + '\n' != body:
        raise EnrichError('chapters/%s.js: unexpected content around the lessons' % cid)

    # render every insert (one KaTeX run for the whole chapter)
    plan, store = {}, []
    for k in range(len(arts)):
        p = os.path.join(src, '%02d.html' % (k + 1))
        if not os.path.exists(p):
            continue
        where = os.path.relpath(p, repo)
        for mm in re.finditer(r'<insert\b([^>]*)>(.*?)</insert>', AC.read(p), re.S):
            frag = AC.maths(AC.markup(mm.group(2).strip(), where), store)
            plan.setdefault(k, []).append((AC.attrs(mm.group(1)), frag))
    rendered = AC.render_tex(store)
    fill = lambda h: re.sub(r'\x00(\d+)\x00', lambda x: rendered[int(x.group(1))], h)
    n_ins = 0
    for k, blocks in plan.items():
        for a, frag in blocks:
            arts[k] = apply(arts[k], (a, fill(frag)), 'content/enrich/%s/%02d.html [%s]' % (cid, k + 1, a.get('at')))
            n_ins += 1

    # search index for this chapter
    six_p = os.path.join(repo, 'assets', 'search-index.js')
    six = AC.read(six_p)
    sm = re.search(r'Finder\.load\((.*)\);\s*$', six, re.S)
    data = json.loads(sm.group(1))
    ci = data['chapters'].index(cid)
    data['docs'] = [d for d in data['docs'] if d[0] != ci]
    for k, art in enumerate(arts):
        n = int(re.search(r'data-lesson="(\d+)"', art).group(1))
        arts[k], docs = search_index.index_article(art, ci, n)
        data['docs'] += docs
    out = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    AC.write(six_p, six[:sm.start(1)] + out + six[sm.end(1):])

    # extra labs
    start, end = '/* enrich:%s:labs:start */' % cid, '/* enrich:%s:labs:end */' % cid
    head = re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\n;\n', '', head, flags=re.S)
    labs_p = os.path.join(src, 'labs.js')
    if os.path.exists(labs_p):
        labs = re.sub(r'/\*\s*include:\s*([\w./-]+)\s*\*/', lambda x: AC.read(os.path.join(repo, 'content', x.group(1))).strip('\n'), AC.read(labs_p))
        head += start + '\n' + labs.strip('\n') + '\n' + end + '\n;\n'
    AC.write(js_p, head + 'DeepThought.chapter(%s, %s);\n' % (m.group(1), AC.js_string('\n'.join(arts) + '\n')))
    AC.apply_shared(repo)
    return n_ins, os.path.getsize(js_p)


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    try:
        for cid in argv[1:]:
            n, size = run(cid)
            print('%-22s %3d additions   chapters/%s.js %6.0f kB' % (cid, n, cid, size / 1e3))
    except (EnrichError, AC.BuildError) as e:
        print('enrich failed: %s' % e, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
