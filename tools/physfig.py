"""
Physics-figure helpers for tools/add_chapter.py — springs, blocks, walls, pendulums, waves, pipes, axes.

Lesson sources call these inside <?py … ?>, together with the helpers in chemfig.py (fig, note, line …):

    <?py fig(360, 140, wall(20, 30, 110) + spring(20, 70, 150, 70) + block(150, 50, 46, 40, 'm'),
           'A block on a spring', 'aria description') ?>

Everything is plain SVG using the house classes (.ln .thin .dash .acc .wrn .okk .vio .shade .dot-a .it .rm .sm
.t-a …), so figures follow light/dark mode and the chapter's colour tone. Coordinates are viewBox units.
Math labels: 'x_0' → x with a subscript 0; 'T_{max}' → T with subscript max.
"""
import math
import re

from chemfig import esc, fig, line, note  # noqa: F401  (re-exported for convenience)


def _f(v):
    return '%.1f' % v


def _label(s):
    """'x_0' / 'T_{max}' → escaped text with subscript tspans."""
    out, pos = [], 0
    for m in re.finditer(r'_(\{[^}]*\}|\S)', s):
        out.append(esc(s[pos:m.start()]))
        sub = m.group(1).strip('{}')
        out.append('<tspan dy="4" font-size="72%%">%s</tspan><tspan dy="-4">​</tspan>' % esc(sub))
        pos = m.end()
    out.append(esc(s[pos:]))
    return ''.join(out)


def var(x, y, s, cls='it', anchor='middle', extra=''):
    """An italic maths label (variables)."""
    return '<text class="%s" x="%s" y="%s" text-anchor="%s"%s>%s</text>' % (cls, _f(x), _f(y), anchor, extra, _label(s))


def lbl(x, y, s, cls='rm', anchor='middle', extra=''):
    """An upright label (units, words) — subscripts allowed."""
    return var(x, y, s, cls, anchor, extra)


def path(d, cls='ln', extra=''):
    return '<path class="%s" d="%s"%s/>' % (cls, d, extra)


def poly(pts, cls='ln', extra=''):
    return '<polyline class="%s" points="%s"%s/>' % (cls, ' '.join('%s,%s' % (_f(x), _f(y)) for x, y in pts), extra)


def g(body, cls='', style='', extra=''):
    """Group — give it a class from the chapter's theme.css to animate it."""
    return '<g%s%s%s>%s</g>' % ((' class="%s"' % cls) if cls else '', (' style="%s"' % style) if style else '', extra, body)


def arr(x1, y1, x2, y2, cls='ln', marker='ah', both=False, extra=''):
    """An arrow (marker ah = ink, ah-a accent, ah-w warn, ah-v violet, ah-o ok, ah-p pos)."""
    return '<line class="%s" x1="%s" y1="%s" x2="%s" y2="%s" marker-end="url(#%s)"%s%s/>' % (
        cls, _f(x1), _f(y1), _f(x2), _f(y2), marker, (' marker-start="url(#%s)"' % marker) if both else '', extra)


def dim(x1, y1, x2, y2, label='', off=12, cls='ln thin', tcls='it'):
    """A dimension line with arrowheads at both ends and a label beside its middle."""
    s = arr(x1, y1, x2, y2, cls, 'ah', True)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        L = math.hypot(x2 - x1, y2 - y1) or 1
        nx, ny = -(y2 - y1) / L, (x2 - x1) / L
        s += var(mx + nx * off, my + ny * off + 4, label, tcls)
    return s


def spring(x1, y1, x2, y2, n=7, w=8, lead=8, cls='ln'):
    """A zig-zag spring from (x1, y1) to (x2, y2) with n coils and straight leads at both ends."""
    L = math.hypot(x2 - x1, y2 - y1)
    if L < 1:
        return ''
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    px, py = -uy, ux
    lead = min(lead, L / 4)
    body = L - 2 * lead
    pts = [(x1, y1), (x1 + ux * lead, y1 + uy * lead)]
    k = 2 * n
    for i in range(1, k + 1):
        t = lead + body * (i - 0.5) / k
        side = w if i % 2 else -w
        pts.append((x1 + ux * t + px * side, y1 + uy * t + py * side))
    pts += [(x2 - ux * lead, y2 - uy * lead), (x2, y2)]
    return poly(pts, cls)


def block(x, y, w, h, label='', cls='ln', fill='shade', tcls='it'):
    s = '<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="4"/>' % (fill, _f(x), _f(y), _f(w), _f(h))
    s += '<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="4"/>' % (cls, _f(x), _f(y), _f(w), _f(h))
    if label:
        s += var(x + w / 2, y + h / 2 + 5, label, tcls)
    return s


def hatch(x1, y1, x2, y2, side=1, gap=7, size=6, cls='ln'):
    """A rigid wall/ceiling/floor: a line from (x1,y1) to (x2,y2) with hatching on one side (side = ±1)."""
    L = math.hypot(x2 - x1, y2 - y1)
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    nx, ny = -uy * side, ux * side
    s = line(x1, y1, x2, y2, cls)
    t = gap / 2
    while t < L:
        bx, by = x1 + ux * t, y1 + uy * t
        s += line(bx, by, bx + (nx - ux) * size, by + (ny - uy) * size, 'ln thin')
        t += gap
    return s


def wall(x, y1, y2, side=-1):
    """Vertical wall, hatched on the left (side=-1) or right (side=+1)."""
    return hatch(x, y2, x, y1, side)


def ceiling(x1, x2, y):
    return hatch(x1, y, x2, y, -1)


def floor(x1, x2, y):
    return hatch(x1, y, x2, y, 1)


def bob(x, y, r=9, cls='dot-a', label=''):
    s = '<circle class="%s" cx="%s" cy="%s" r="%s"/>' % (cls, _f(x), _f(y), _f(r))
    if label:
        s += var(x, y + r + 15, label)
    return s


def dot(x, y, r=2.6, cls='dot', extra=''):
    return '<circle class="%s" cx="%s" cy="%s" r="%s"%s/>' % (cls, _f(x), _f(y), _f(r), extra)


def ring(x, y, r, cls='ln', extra=''):
    return '<circle class="%s" cx="%s" cy="%s" r="%s" fill="none"%s/>' % (cls, _f(x), _f(y), _f(r), extra)


def pendulum(px, py, L, deg, r=9, label='', guide=True, arc_label='θ', cls='ln', bobcls='dot-a'):
    """A simple pendulum hanging from (px, py), swung `deg` degrees to the right of vertical."""
    a = math.radians(deg)
    bx, by = px + L * math.sin(a), py + L * math.cos(a)
    s = ''
    if guide:
        s += line(px, py, px, py + L + 6, 'ln thin dash')
    s += line(px, py, bx, by, cls)
    if deg and arc_label:
        R = min(40, L * 0.35)
        s += path('M%s %s A%d %d 0 0 0 %s %s' % (_f(px), _f(py + R), R, R, _f(px + R * math.sin(a)), _f(py + R * math.cos(a))), 'ln acc')
        m = a / 2
        s += var(px + (R + 11) * math.sin(m), py + (R + 11) * math.cos(m) + 4, arc_label, 'it t-a')
    s += bob(bx, by, r, bobcls)
    if label:
        s += var(bx + r + 6, by + 5, label, 'it', 'start')
    return s


def curve(fn, u0, u1, ox, oy, sx, sy, n=160, cls='ln acc', extra=''):
    """Plot v = fn(u) for u in [u0, u1]; screen x = ox + sx*u, y = oy - sy*v."""
    pts = [(ox + sx * (u0 + (u1 - u0) * i / n), oy - sy * fn(u0 + (u1 - u0) * i / n)) for i in range(n + 1)]
    return poly(pts, cls, extra)


def sine(x0, y0, length, amp, wl, phase=0.0, cls='ln acc', n=None, extra=''):
    """y = y0 − amp·sin(2π(x − x0)/wl + phase) from x0 to x0 + length (screen y points down)."""
    n = n or max(24, int(length / 2))
    pts = [(x0 + length * i / n, y0 - amp * math.sin(2 * math.pi * (length * i / n) / wl + phase)) for i in range(n + 1)]
    return poly(pts, cls, extra)


def axes(ox, oy, xlen, yup, ydown=0, xl='t', yl='x', cls='ln thin', tcls='it'):
    """Axes through (ox, oy): x to the right, y up (and optionally down)."""
    s = arr(ox, oy, ox + xlen, oy, cls) + arr(ox, oy + ydown, ox, oy - yup, cls)
    s += var(ox + xlen + 4, oy + 4, xl, tcls, 'start') + var(ox, oy - yup - 6, yl, tcls)
    return s


def envelope(x0, y0, L, amp, n, kind='string', cls='ln acc', ghost=True, steps=120):
    """Standing-wave displacement envelope of mode n along a length L (x0 → x0+L), centred on y0.
    kind: 'string' (nodes at both ends), 'open' (antinodes at both ends), 'closed' (node at the left, closed end;
    antinode at the right, open end — n counts the harmonics present: 1, 3, 5 … is passed as 1, 2, 3 …)."""
    def shape(u):
        if kind == 'string':
            return math.sin(n * math.pi * u)
        if kind == 'open':
            return math.cos(n * math.pi * u)
        return math.sin((2 * n - 1) * math.pi * u / 2)
    top = [(x0 + L * i / steps, y0 - amp * shape(i / steps)) for i in range(steps + 1)]
    bot = [(x, 2 * y0 - y) for x, y in top]
    return poly(top, cls) + (poly(bot, cls + ' dash' if ghost else cls) if ghost is not None else '')


def pipe(x, y, L, h, left='open', right='open', cls='ln'):
    """A horizontal pipe from x to x+L, bore h, top edge at y. Ends: 'open' or 'closed'."""
    s = line(x, y, x + L, y, cls) + line(x, y + h, x + L, y + h, cls)
    if left == 'closed':
        s += line(x, y - 4, x, y + h + 4, cls, ' stroke-width="4"')
    if right == 'closed':
        s += line(x + L, y - 4, x + L, y + h + 4, cls, ' stroke-width="4"')
    return s


def tag(x, y, s, cls='t-a', r=9):
    """A small lettered marker, e.g. N (node) or A (antinode)."""
    return ('<circle cx="%s" cy="%s" r="%d" class="shade"/>' % (_f(x), _f(y), r) +
            '<text class="sm %s" x="%s" y="%s" text-anchor="middle" font-weight="700" opacity="1">%s</text>' % (cls, _f(x), _f(y + 3.8), esc(s)))


NAMES = dict(var=var, lbl=lbl, path=path, poly=poly, g=g, arr=arr, dim=dim, spring=spring, block=block, hatch=hatch,
             wall=wall, ceiling=ceiling, floor=floor, bob=bob, dot=dot, circ=ring, pendulum=pendulum, curve=curve, sine=sine,
             axes=axes, envelope=envelope, pipe=pipe, tag=tag,
             sin=math.sin, cos=math.cos, tan=math.tan, exp=math.exp, sqrt=math.sqrt, pi=math.pi, radians=math.radians)
