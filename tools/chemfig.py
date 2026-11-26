"""
Tiny chemistry-figure helpers for tools/add_chapter.py.

Lesson sources call these inside <?py … ?> to draw structures as plain SVG that uses the same classes
as every other figure in the app (.ln, .acc, .rm, .sm, .t-a …), so they follow the colour theme,
light/dark mode and the chapter's tone automatically.

    <?py fig(420, 150, ring(70, 75, {1: "OH"}) + arrow(130, 75, 230, "Br₂ (aq)") + ring(300, 75, {1: "OH", 2: "Br", 4: "Br", 6: "Br"}),
           "Phenol and bromine water", "aria description") ?>

Coordinates are SVG user units in the figure's viewBox (0 0 width height).
Formula text: digits after a letter or ')' become subscripts — 'CH3CH2OH' → CH₃CH₂OH.
"""
import html
import math

SUB = 4  # subscript drop, in user units


def esc(s):
    return html.escape(str(s), quote=True)


def chem(label, size=None):
    """Formula text → SVG tspans with subscripts. '^' before + or − makes it a superscript."""
    out, i, n, prev = [], 0, len(label), ''
    fs = ' font-size="%.1f"' % (size * 0.72) if size else ' font-size="72%"'
    while i < n:
        c = label[i]
        if c.isdigit() and prev and (prev.isalpha() or prev in ')]'):
            j = i
            while j < n and label[j].isdigit():
                j += 1
            out.append('<tspan dy="%d"%s>%s</tspan><tspan dy="-%d">​</tspan>' % (SUB, fs, esc(label[i:j]), SUB))
            prev = label[j - 1]
            i = j
            continue
        if c == '^' and i + 1 < n:
            out.append('<tspan dy="-6"%s>%s</tspan><tspan dy="6">​</tspan>' % (fs, esc(label[i + 1])))
            prev = label[i + 1]
            i += 2
            continue
        out.append(esc(c))
        prev = c
        i += 1
    return ''.join(out)


def txt(x, y, label, cls='rm', anchor='middle', formula=True, extra=''):
    body = chem(label) if formula else esc(label)
    return '<text class="%s" x="%.1f" y="%.1f" text-anchor="%s"%s>%s</text>' % (cls, x, y, anchor, extra, body)


def note(x, y, label, cls='sm', anchor='middle'):
    return '<text class="%s" x="%.1f" y="%.1f" text-anchor="%s">%s</text>' % (cls, x, y, anchor, esc(label))


def line(x1, y1, x2, y2, cls='ln', extra=''):
    return '<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"%s/>' % (cls, x1, y1, x2, y2, extra)


def arrow(x1, y, x2, top='', bottom='', cls='ln', marker='ah', y2=None, tcls='sm'):
    """A reaction arrow with conditions above and below."""
    y2 = y if y2 is None else y2
    s = '<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" marker-end="url(#%s)"/>' % (cls, x1, y, x2, y2, marker)
    mx, my = (x1 + x2) / 2, (y + y2) / 2
    for k, t in enumerate(top.split('\n') if top else []):
        n = len(top.split('\n'))
        s += '<text class="%s" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (tcls, mx, my - 7 - 13 * (n - 1 - k), chem(t))
    for k, t in enumerate(bottom.split('\n') if bottom else []):
        s += '<text class="%s" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (tcls, mx, my + 16 + 13 * k, chem(t))
    return s


def vertex(cx, cy, r, k, n=6, rot=0):
    a = math.radians(-90 + rot + (k - 1) * 360 / n)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def ring(cx, cy, subs=None, r=24, hl=(), hlcls='dot-a', cls='ln', n=6, doubles=None, aromatic=True,
         charges=None, bond=15, lcls='rm', rot=0):
    """A ring (benzene by default), position 1 at the top, numbered clockwise.
    subs:    {position: label | (label, text-class)}; a label starting with '=' is drawn with a double bond
    hl:      positions to mark with a glowing dot
    doubles: ring double bonds as (a, b) pairs; default Kekulé benzene (1-2, 3-4, 5-6), none for n != 6
    charges: {position: '−' | '+' | 'δ−' …} small labels just outside a ring atom"""
    subs, charges = subs or {}, charges or {}
    if doubles is None:
        doubles = [(1, 2), (3, 4), (5, 6)] if (n == 6 and aromatic) else []
    pts = [vertex(cx, cy, r, k, n, rot) for k in range(1, n + 1)]
    d = 'M' + ' L'.join('%.1f %.1f' % p for p in pts) + ' Z'
    s = '<path class="%s" d="%s"/>' % (cls, d)
    for a, b in doubles:
        (x1, y1), (x2, y2) = pts[a - 1], pts[b - 1]
        ix1, iy1 = x1 + (cx - x1) * 0.2, y1 + (cy - y1) * 0.2
        ix2, iy2 = x2 + (cx - x2) * 0.2, y2 + (cy - y2) * 0.2
        sx, sy = (ix2 - ix1) * 0.12, (iy2 - iy1) * 0.12
        s += line(ix1 + sx, iy1 + sy, ix2 - sx, iy2 - sy, cls)
    for k in hl:
        x, y = pts[k - 1]
        s += '<circle class="%s" cx="%.1f" cy="%.1f" r="5" opacity=".8"/>' % (hlcls, x, y)
    for k, lab in subs.items():
        tc = lcls
        if isinstance(lab, tuple):
            lab, tc = lab
        x, y = pts[k - 1]
        ux, uy = (x - cx) / r, (y - cy) / r
        ex, ey = x + ux * bond, y + uy * bond
        if lab.startswith('='):
            lab = lab[1:]
            px, py = -uy * 2.2, ux * 2.2
            s += line(x + px, y + py, ex + px, ey + py, cls) + line(x - px, y - py, ex - px, ey - py, cls)
        else:
            s += line(x, y, ex, ey, cls)
        if abs(ux) < 0.2:
            anchor, lx, ly = 'middle', ex, ey + (-5 if uy < 0 else 13)
        elif ux > 0:
            anchor, lx, ly = 'start', ex + 2, ey + (5 if abs(uy) < 0.6 else (10 if uy > 0 else 0))
        else:
            anchor, lx, ly = 'end', ex - 2, ey + (5 if abs(uy) < 0.6 else (10 if uy > 0 else 0))
        s += txt(lx, ly, lab, tc, anchor)
    for k, q in charges.items():
        x, y = pts[k - 1]
        ux, uy = (x - cx) / r, (y - cy) / r
        # sit beside the atom, rotated a little off the substituent direction
        a = math.atan2(uy, ux) + math.radians(38)
        s += '<text class="sm t-ox" x="%.1f" y="%.1f" text-anchor="middle" font-weight="700">%s</text>' % (x + 11 * math.cos(a), y + 11 * math.sin(a) + 4, esc(q))
    return s


def bent(cx, cy, left, right, angle, arm=50, centre='O', length=''):
    """A bent X–O–Y unit: O (tinted) with two lone pairs, two arms, the angle arc and its value."""
    h = math.radians(angle / 2)
    sx, sy = math.sin(h), math.cos(h)
    lx, ly, rx, ry = cx - arm * sx, cy + arm * sy, cx + arm * sx, cy + arm * sy
    s = '<circle class="ox" cx="%.1f" cy="%.1f" r="14"/>' % (cx, cy)
    s += txt(cx, cy + 5, centre, 'rm t-ox')
    for k in (-1, 1):  # lone pairs
        px, py = cx + k * 13, cy - 13
        for d in (-2.6, 2.6):
            s += '<circle class="dot" cx="%.1f" cy="%.1f" r="1.5" opacity=".75"/>' % (px + d * 0.7, py + d * 0.7 * -k)
    s += line(cx - 9 * sx, cy + 9 * sy, lx + 9 * sx, ly - 9 * sy)
    s += line(cx + 9 * sx, cy + 9 * sy, rx - 9 * sx, ry - 9 * sy)
    s += txt(lx - 2, ly + 13, left, 'rm', 'end' if len(left) > 1 else 'middle')
    s += txt(rx + 2, ry + 13, right, 'rm', 'start' if len(right) > 1 else 'middle')
    R = 22
    s += '<path class="ln acc" d="M%.1f %.1f A%d %d 0 0 0 %.1f %.1f"/>' % (cx - R * sx, cy + R * sy, R, R, cx + R * sx, cy + R * sy)
    s += '<text class="sm t-a" x="%.1f" y="%.1f" text-anchor="middle" font-weight="700" opacity="1">%s</text>' % (cx, cy + R + 14, esc('%g°' % angle))
    if length:
        s += note(cx, ly + 34, length)
    return s


def box(x, y, w, h, label, cls='ln', tcls='rm', fill='shade', sub=''):
    s = '<rect class="%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="10"/>' % (fill, x, y, w, h)
    s += '<rect class="%s thin" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="10"/>' % (cls, x, y, w, h)
    ty = y + h / 2 + (0 if sub else 5)
    s += txt(x + w / 2, ty, label, tcls)
    if sub:
        s += txt(x + w / 2, y + h / 2 + 15, sub, 'sm')
    return s


def fig(w, h, body, caption='', label='', maxw=None):
    """Wrap SVG elements into the house <figure>."""
    return ('<figure class="fig-wrap"><svg class="fig" viewBox="0 0 %d %d" style="--w:%dpx" role="img" aria-label="%s">\n%s\n</svg>%s</figure>'
            % (w, h, maxw or w + 40, esc(label or caption), body, ('<figcaption>%s</figcaption>' % caption) if caption else ''))


NAMES = dict(chem=chem, txt=txt, note=note, line=line, arrow=arrow, ring=ring, box=box, fig=fig, vertex=vertex, bent=bent)
