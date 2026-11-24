"""
Search index builder for Deep Thought Education (used by tools/build.py).

Every lesson is cut into small, meaningful pieces — the lesson itself, each section heading,
paragraph, list, table, figure caption, displayed formula, callout (key result, JEE trap,
intuition, recap…), question, solution and lab. Each piece's element gets a data-find="<n>"
attribute so a search result can scroll straight to it and highlight it.

Formulas are stored only as KaTeX HTML (no TeX source), so this module turns that HTML back into
  • linear text   "B = (μ0 I)/(2πr)"     — searched as words and as a formula "skeleton"
  • light HTML    with <sup>, <sub>, stacked fractions, vectors — shown in the results list
"""
import html as htmllib
import re
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
        # SVG children that are self-closed in the source
        'path', 'line', 'circle', 'rect', 'use', 'polyline', 'polygon', 'stop', 'ellipse'}
BLOCK = {'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure',
         'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre',
         'section', 'table', 'ul'}
INLINE = {'a', 'b', 'i', 'em', 'strong', 'span', 'sub', 'sup', 'small', 'code', 'mark', 'abbr', 'cite', 'q', 'u', 's', 'kbd'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent', 'insert_at', 'text')

    def __init__(self, tag, attrs=None, parent=None, text=None):
        self.tag, self.attrs, self.children, self.parent, self.insert_at, self.text = tag, attrs or {}, [], parent, None, text

    @property
    def cls(self):
        return self.attrs.get('class', '').split()

    def has(self, c):
        return c in self.cls

    def els(self):
        return [c for c in self.children if c.tag]

    def find(self, pred):
        for c in self.children:
            if c.tag:
                if pred(c):
                    return c
                r = c.find(pred)
                if r:
                    return r
        return None

    def find_all(self, pred, out=None):
        out = [] if out is None else out
        for c in self.children:
            if c.tag:
                if pred(c):
                    out.append(c)
                c.find_all(pred, out)
        return out


class Builder(HTMLParser):
    """A small DOM builder that mimics the browser where it matters (void tags, implied </p>)."""

    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.lines = [0]
        for m in re.finditer('\n', src):
            self.lines.append(m.end())
        self.root = Node('#root')
        self.stack = [self.root]

    def abs_pos(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag in BLOCK:  # a block start tag closes an open <p> (only inline elements in between)
            for k in range(len(self.stack) - 1, 0, -1):
                t = self.stack[k].tag
                if t == 'p':
                    del self.stack[k:]
                    break
                if t not in INLINE:
                    break
        n = Node(tag, {k: (v or '') for k, v in attrs}, self.stack[-1])
        raw = self.get_starttag_text()
        end = self.abs_pos() + len(raw) - (2 if raw.endswith('/>') else 1)
        n.insert_at = end
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, {k: (v or '') for k, v in attrs}, self.stack[-1])
        self.stack[-1].children.append(n)

    def handle_endtag(self, tag):
        for k in range(len(self.stack) - 1, 0, -1):
            if self.stack[k].tag == tag:
                del self.stack[k:]
                return
        # stray end tag (e.g. </p> after an implied close): ignored, like the browser's tree for our purposes

    def handle_data(self, data):
        self.stack[-1].children.append(Node(None, parent=self.stack[-1], text=data))


def parse(src):
    b = Builder(src)
    b.feed(src)
    b.close()
    return b.root


# ═════════════════════════════════════ KaTeX → text / html ═════════════════════════════════════

def esc(s):
    return htmllib.escape(s, quote=False)


def top_of(node):
    m = re.search(r'top:\s*(-?[\d.]+)em', node.attrs.get('style', ''))
    return float(m.group(1)) if m else 0.0


def vrows(node):
    """Rows of the first vertical list under a KaTeX construct, highest first."""
    vt = node.find(lambda n: n.has('vlist-t'))
    if not vt:
        return []
    rows = []
    for r in vt.els():
        if not r.has('vlist-r'):
            continue
        for v in r.els():
            if v.has('vlist'):
                rows += [x for x in v.els() if 'top:' in x.attrs.get('style', '')]
    return sorted(rows, key=top_of)


def wrap(t):
    t = t.strip()
    core = re.sub(r'\s+', '', t)
    if len(core) <= 1 or re.fullmatch(r'[\w.]+', core) and len(core) <= 3 and not re.search(r'[a-zA-Z]\d|\d[a-zA-Z]', core):
        return core
    if core.startswith('(') and core.endswith(')') and core.count('(') == 1:
        return core
    return '(' + t + ')'


def katex(node):
    """(text, html) for a KaTeX subtree."""
    if node.tag is None:
        t = node.text.replace('​', '')
        return t, esc(t)
    c = node.cls
    if node.tag == 'svg' or 'katex-strut' in c or 'pstrut' in c or 'frac-line' in c or 'vlist-s' in c or 'nulldelimiter' in c or 'katex-mathml' in c:
        return '', ''
    if 'mspace' in c:
        return ' ', ' '
    if 'mfrac' in c:
        rows = [r for r in vrows(node) if not r.find(lambda n: n.has('frac-line'))]
        if len(rows) >= 2:
            (nt, nh), (dt, dh) = katex_kids(rows[0]), katex_kids(rows[-1])
            return wrap(nt) + '/' + wrap(dt), '<span class="fx-fr"><span>' + nh + '</span><span>' + dh + '</span></span>'
    if 'msupsub' in c:
        rows = vrows(node)
        sup = sub = None
        if len(rows) >= 2:
            sup, sub = rows[0], rows[-1]
        elif len(rows) == 1:
            if top_of(rows[0]) < -2.8:
                sup = rows[0]
            else:
                sub = rows[0]
        t = h = ''
        if sub is not None:
            st, sh = katex_kids(sub)
            t += '_' + wrap(st)
            h += '<sub>' + sh + '</sub>'
        if sup is not None:
            pt, ph = katex_kids(sup)
            t += '^' + wrap(pt)
            h += '<sup>' + ph + '</sup>'
        return t, h
    if 'katex-accent' in c or 'accent' in c:
        rows = vrows(node)
        body = [r for r in rows if r.find(lambda n: n.has('accent-body')) or r.has('accent-body')]
        base = [r for r in rows if r not in body]
        if base:
            bt, bh = katex_kids(base[-1])
            mark = ''
            if body:
                at = katex_kids(body[0])[0].strip()
                mark = {'^': '̂', '˙': '̇', '¨': '̈', '~': '̃', '¯': '̅', 'ˉ': '̅'}.get(at, '⃗' if not at else '')
            cls = 'fx-vec' if mark == '⃗' else 'fx-acc'
            return bt, '<span class="' + cls + '">' + bh + (mark if mark != '⃗' else '') + '</span>'
    if 'sqrt' in c:
        rows = vrows(node)
        inner = [r for r in rows if not r.find(lambda n: n.has('hide-tail')) and not r.has('hide-tail')]
        if inner:
            it, ih = katex_kids(inner[-1] if len(inner) == 1 else inner[0])
            return '√' + wrap(it) if len(re.sub(r'\s', '', it)) > 1 else '√' + it.strip(), '√<span class="fx-sq">' + ih + '</span>'
    if 'op-limits' in c:
        rows = vrows(node)
        opi = next((k for k, r in enumerate(rows) if r.find(lambda n: n.has('mop') and not n.has('mtight')) or r.has('mop')), None)
        if opi is not None:
            ot, oh = katex_kids(rows[opi])
            t, h = ot, oh
            if opi + 1 < len(rows):
                st, sh = katex_kids(rows[opi + 1])
                t += '_' + wrap(st)
                h += '<sub>' + sh + '</sub>'
            if opi > 0:
                pt, ph = katex_kids(rows[0])
                t += '^' + wrap(pt)
                h += '<sup>' + ph + '</sup>'
            return t, h
    t, h = katex_kids(node)
    if 'text' in c and 'mord' in c:
        return ' ' + t + ' ', '<span class="fx-t">' + h + '</span>'
    if 'mathnormal' in c or 'mathit' in c:
        return t, '<i>' + h + '</i>'
    if 'mathbf' in c or 'boldsymbol' in c:
        return t, '<b>' + h + '</b>'
    if 'mrel' in c or 'mbin' in c:
        return ' ' + t + ' ', ' ' + h + ' '
    if 'mpunct' in c:
        return t + ' ', h + ' '
    return t, h


def katex_kids(node):
    ts, hs = [], []
    for k in node.children:
        t, h = katex(k)
        ts.append(t)
        hs.append(h)
    return ''.join(ts), ''.join(hs)


def tidy(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\(\s+', '(', s)
    s = re.sub(r'\s+\)', ')', s)
    return s


def math_of(node):
    t, h = katex_kids(node)
    return tidy(t), re.sub(r'\s+', ' ', h).strip()


# ═════════════════════════════════════ text extraction ═════════════════════════════════════

SKIP_CLASSES = {'ico', 'opt__key', 'q__actions', 'q__feedback', 'q__solhead', 'sim__mount', 'callout__head', 'q__head'}


def text_of(node, maths=None):
    """Readable text of a subtree; inline formulas become linear text (also collected in `maths`)."""
    out = []

    def walk(n):
        if n.tag is None:
            out.append(n.text)
            return
        if n.tag in ('svg', 'script', 'style', 'button') and not n.has('opt'):
            if n.tag != 'button':
                return
        if SKIP_CLASSES & set(n.cls):
            return
        if n.has('katex') or n.has('katex-display'):
            t, _ = math_of(n)
            if maths is not None and t:
                maths.append(t)
            out.append(' ' + t + ' ')
            return
        block = n.tag in BLOCK or n.tag in ('li', 'tr', 'td', 'th', 'br', 'button')
        if block:
            out.append(' ')
        for k in n.children:
            walk(k)
        if block:
            out.append(' ')

    walk(node)
    return tidy(''.join(out))


def first_text(node, cls):
    n = node.find(lambda x: x.has(cls))
    return text_of(n) if n else ''


# ═════════════════════════════════════ lesson → pieces ═════════════════════════════════════

CALLOUT_KIND = {'key': 'key', 'trap': 'trap', 'intuition': 'intuition', 'recap': 'recap', 'story': 'story'}


def index_article(src, chapter_no, lesson_no):
    """Returns (article html with data-find anchors, [doc, …]).
    doc = [chapter_no, lesson_no, anchor, kind, heading, text, maths, formula_html]"""
    root = parse(src)
    art = root.find(lambda n: n.tag == 'article')
    docs, marks = [], []

    def anchor(n):
        k = len(marks)
        marks.append((n.insert_at, k))
        return k

    def add(n, kind, heading, text, maths=(), fx=''):
        text = text[:1400]
        docs.append([chapter_no, lesson_no, anchor(n) if n is not None else -1, kind, heading, text, list(maths)[:12], fx])

    def formulas(scope, host_anchor_node, heading, context):
        for mb in scope.find_all(lambda x: x.has('math-block')):
            t, h = math_of(mb)
            if t:
                k = anchor(host_anchor_node) if host_anchor_node is not mb else anchor(mb)
                docs.append([chapter_no, lesson_no, k, 'formula', heading, context[-260:], [t], h])

    for blk in art.els():
        if blk.tag == 'header' and blk.has('lesson__hero'):
            h1 = blk.find(lambda n: n.tag == 'h1')
            add(blk, 'lesson', text_of(h1) if h1 else '', first_text(blk, 'lesson__summary'))
        elif blk.has('card'):
            heading, prev_text = '', ''
            for el in blk.els():
                if el.tag in ('h2', 'h3'):
                    heading = text_of(el)
                    nxt = el.parent.els()
                    i = nxt.index(el)
                    peek = next((text_of(x) for x in nxt[i + 1:] if x.tag == 'p'), '')
                    add(el, 'sec', heading, peek[:300])
                    continue
                if el.has('math-block'):
                    t, h = math_of(el)
                    if t:
                        add(el, 'formula', heading, prev_text[-260:], [t], h)
                    continue
                if el.tag == 'aside' and el.has('callout'):
                    kind = next((CALLOUT_KIND[c[9:]] for c in el.cls if c.startswith('callout--') and c[9:] in CALLOUT_KIND), 'note')
                    title = first_text(el, 'callout__title')
                    label = first_text(el, 'callout__label')
                    body = el.find(lambda n: n.has('callout__body')) or el
                    ms = []
                    txt = text_of(body, ms)
                    add(el, kind, title or label, txt, ms)
                    formulas(body, el, title or heading, txt)
                    prev_text = txt
                    continue
                ms = []
                txt = text_of(el, ms)
                if not txt:
                    continue
                kind = 'table' if el.has('table-wrap') or el.tag == 'table' else 'figure' if el.tag == 'figure' else 'text'
                if kind == 'figure':
                    cap = el.find(lambda n: n.tag == 'figcaption')
                    txt = text_of(cap, ms) if cap else ''
                    if not txt:
                        continue
                add(el, kind, heading, txt, ms)
                formulas(el, el, heading, txt) if el.tag != 'p' else None
                prev_text = txt
        elif blk.tag == 'section' and blk.has('q'):
            exam, qkind = first_text(blk, 'q__exam'), first_text(blk, 'q__kind')
            head = ' · '.join(x for x in (exam, qkind) if x)
            ms = []
            stem = blk.find(lambda n: n.has('q__stem'))
            opts = blk.find(lambda n: n.has('q__opts'))
            txt = text_of(stem, ms) if stem else ''
            if opts:
                txt += ' ' + ' · '.join(text_of(o, ms) for o in opts.els())
            add(blk, 'pyq' if blk.has('q--pyq') else 'q', head, tidy(txt), ms)
            ms2 = []
            sol = blk.find(lambda n: n.has('q__solution'))
            hint = blk.find(lambda n: n.has('q__hint'))
            st = (text_of(sol, ms2) if sol else '') + (' ' + text_of(hint, ms2) if hint else '')
            if st.strip():
                docs.append([chapter_no, lesson_no, docs[-1][2], 'sol', head, tidy(st)[:1400], ms2[:12], ''])
        elif blk.has('sim'):
            h3 = blk.find(lambda n: n.tag == 'h3')
            ms = []
            notes = blk.find(lambda n: n.has('sim__notes'))
            add(blk, 'lab', text_of(h3) if h3 else 'Interactive lab', text_of(notes, ms) if notes else '', ms)

    # write the anchors into the html (from the end, so offsets stay valid)
    out = src
    seen = {}
    for pos, k in marks:
        seen.setdefault(pos, k)
    for pos, k in sorted(seen.items(), key=lambda x: -x[0]):
        out = out[:pos] + ' data-find="%d"' % k + out[pos:]
    # docs that share an element must point at the same anchor number
    remap = {k: seen[pos] for pos, k in marks}
    for d in docs:
        if d[2] >= 0:
            d[2] = remap[d[2]]
    return out, docs
