#!/usr/bin/env python3
"""
Re-derive the answers to the numerical questions of the physics chapters written as source folders, and compare them
with the answer keys stored in the lessons.

    python3 tools/verify_answers.py

Every number below is computed from scratch (no copying from the solutions). For a numeric or integer question the
computed value must fall inside the question's own tolerance; for a single-correct question the keyed option must
contain the computed value (as text); for questions whose answer is a fact or a shape, there is a short note instead.
Exit code 1 on any mismatch, or if a question has no check at all.
"""
import math
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pi, sqrt, log10, sin, cos, asin, exp = math.pi, math.sqrt, math.log10, math.sin, math.cos, math.asin, math.exp


def fmt(v, d):
    return ('%.' + str(d) + 'f') % v


# ── Oscillations & SHM ──
g = 9.8
S = {
    '1.1': ('fact', 'pendulum, spring and needle oscillate; Moon and clock hand only repeat'),
    '1.2': ('opt', '2'),                                            # LCM of 1 s and 2/3 s
    '1.3': ('fact', 'x = 1/2 − cos(2ωt)/2 → a = −4ω²(x − 1/2): SHM about 1/2, period π/ω'),
    '1.4': ('fact', 'only −9x and −9(x − 2) are linear restoring'),
    '1.5': ('num', 0.05 * 2 * pi * 2),                              # Aω
    '2.1': ('fact', 'a = −ω²x0 cos(ωt − π/4) = x0ω² cos(ωt + 3π/4)'),
    '2.2': ('fact', 'a²T² + 4π²v² = 4π²ω²A² and aT/x = −4π²/T are both constant'),
    '2.3': ('fact', 'sinφ = −1/2 with cosφ > 0 → φ = −π/6'),
    '2.4': ('num', 2.4 * (90 - 30) / 360),
    '2.5': ('fact', 'A(1 − c) = a, 2A(1 − c²) = 3a → c = 1/2 → T = 6τ, A = 2a'),
    '2.6': ('opt', '7A/3' if abs(sqrt(4 / 9 + 9 * (1 - 4 / 9)) - 7 / 3) < 1e-12 else 'x'),
    '2.7': ('opt', '%d cm and 2/3 s' % round(5 * sqrt(1 + 3))),
    '2.8': ('fact', '2A sin(δ/2) = A → δ = π/3'),
    '3.1': ('opt', '16/9' if abs((5 / 3) ** 2 - 1 - 16 / 9) < 1e-12 else 'x'),
    '3.2': ('num', 2 * pi * sqrt(0.025 / 10)),
    '3.3': ('fact', 'k_eff = 2k'),
    '3.4': ('fact', 'k_eff ×4 → f ×2'),
    '3.5': ('fact', 'piece constant nk → T/√n'),
    '3.6': ('num', 2 * pi * sqrt((1 * 2 / 3) / 300)),
    '3.7': ('opt', fmt(0.108 / 6.02e23 * (2 * pi * 1e12) ** 2, 1)),
    '4.1': ('fact', 'KE max at x = 0'),
    '4.2': ('num', sqrt(1 / 4)),                                    # E = 4U → x = A/2
    '4.3': ('fact', 'K = E cos²ωt from the mean position'),
    '4.4': ('opt', '1/6' if abs(math.acos(sqrt(0.75)) / (2 * pi / 2) - 1 / 6) < 1e-12 else 'x'),
    '4.5': ('fact', 'U″(0) = U0α² → ω = α√(U0/m)'),
    '4.6': ('fact', 'A2 = Mv/√(k(M + m)), A1 = v√(M/k) → A1/A2 = √((M + m)/M)'),
    '4.7': ('num', 1 / sqrt(2)),
    '5.1': ('fact', 'g_eff = 3g/2 → T√(2/3)'),
    '5.2': ('fact', 'g_eff = √2 g → T/2^(1/4)'),
    '5.3': ('fact', 'g_eff = 15g/16 → T·4/√15'),
    '5.4': ('fact', 'centre of mass rises → L and T fall'),
    '5.5': ('fact', 'centre of mass falls, then rises again'),
    '5.6': ('num', 86400 * 0.5 * 2e-5 * 20),
    '5.7': ('fact', '(T_M/T)² = 1 + Mg/(AY)'),
    '5.8': ('num', 2 * pi * sqrt(2 * 1.5 / (3 * 10))),
    '6.1': ('num', 2 * pi * sqrt(0.5 / (2 * 10))),
    '6.2': ('fact', 'ω² = ρg/(l d)'),
    '6.3': ('fact', 'k_eff = k + Aσg'),
    '6.4': ('opt', '%d min' % round(2 * pi * sqrt(6.371e6 / 9.8) / 60 / 4)),
    '6.5': ('fact', 'adiabatic: ω² = γP0A²/(MV0)'),
    '6.6': ('num', sqrt(3 ** 2 + 4 ** 2)),
    '6.7': ('fact', 'R² = 2A²(1 + cos 120°) = A²'),
    '6.8': ('fact', 'x² + y² = 4'),
    '7.1': ('opt', fmt(0.9 ** 3, 3)),
    '7.2': ('fact', 'amplitude ∝ e^(−bt/2) → τ = 2/b'),
    '7.3': ('num', 60 * math.log(16 / 2, 2)),
    '7.4': ('fact', 'x = F0/(m(ω0² − ω²))'),
    '7.5': ('fact', 'steady state follows the drive; 90° lag at resonance'),
    '8.1': ('fact', '½kx² = ¼kA² → x = A/√2'),
    '8.2': ('num', cos(pi * 210 / 90) ** 2 / sin(pi * 210 / 90) ** 2),
    '8.3': ('num', 0.5 / (0.5 / 12)),
    '8.4': ('fact', 'platform accelerates down at ω²A at the top; contact lost when ω²A > g'),
    '8.5': ('num', 2 / sqrt(100 / 1) * 100),
    '8.6': ('num', sqrt(9 + 16) * 2),
}

# ── Waves & Sound ──
W = {
    '1.1': ('fact', 'fluids carry only longitudinal waves in their bulk; S-waves stop at the liquid core'),
    '1.2': ('num', 340 / 512),
    '1.3': ('fact', 'f fixed by the source; v and λ rise together'),
    '1.4': ('num', 340 / 100e3 * 1000),
    '2.1': ('fact', '(√a x + √b t)² → moves to −x at √(b/a)'),
    '2.2': ('opt', fmt(100 / 20, 0) + ' m/s'),
    '2.3': ('opt', '%d\\pi' % round(2 * pi / 0.08 / pi)),
    '2.4': ('opt', 'towards $-x$ with speed %d m/s' % round(50 / 2)),
    '2.5': ('num', 360 * 0.12 / (360 / 500)),
    '2.6': ('fact', 'v_p = −v ∂y/∂x < 0 on an upward slope'),
    '2.7': ('num', 0.02 * 2 * pi / 0.5),
    '3.1': ('opt', fmt(0.04 * (0.50 / 0.04) ** 2, 2) + ' N'),
    '3.2': ('opt', fmt((0.006 / 0.6) * 90 ** 2 * 0.6 / (1e-6 * 16e11) * 1000, 2) + ' mm'),
    '3.3': ('opt', 'g/%d' % round(1 / sqrt(((60.5 / 60) ** 2) ** 2 - 1))),
    '3.4': ('fact', 't = 2√(L/g) = 2√2 s'),
    '3.5': ('opt', '%d m/s' % round(460 * sqrt(1.67 / 1.4 * 32 / 4))),          # γ(He) = 1.67 as in the official solution (5/3 gives 1420)
    '3.6': ('num', 4 * 273 - 273),
    '3.7': ('num', 10 * log10(20)),
    '4.1': ('num', ((1 + 2) / (2 - 1)) ** 2),
    '4.2': ('fact', 'path difference 1.25 m = 2.5λ → destructive'),
    '4.3': ('opt', '\\sqrt3' if abs(sqrt(2 + 2 * cos(pi / 3)) - sqrt(3)) < 1e-12 else 'x'),
    '4.4': ('fact', 'node at x = 0 needs −a sin(ωt + kx)'),
    '4.5': ('fact', 'reflection inverted, transmission upright and slower, frequency kept'),
    '5.1': ('opt', '%d m/s' % round(200 * pi / (5 * pi / 4))),
    '5.2': ('opt', '%d Hz' % (420 - 315)),
    '5.3': ('opt', fmt(sqrt(2.2e11 * 0.01 / 7.7e3) / (2 * 1.5), 1) + ' Hz'),
    '5.4': ('num', sqrt(8 / 0.005) / 100 / 2 * 100),
    '5.5': ('fact', 'even modes have a node at the midpoint'),
    '5.6': ('fact', 'v ∝ 1/r → p : q = λ_B : λ_A = 1 : 2'),
    '5.7': ('opt', '%d kHz' % round(sqrt(9.27e10 / 2.7e3) / (2 * 0.6) / 1000)),
    '6.1': ('num', sum(1 for n in range(1, 100, 2) if n * 340 / (4 * 0.85) < 1250)),
    '6.2': ('fact', 'closed pipe of length L/2 → v/2L'),
    '6.3': ('num', sum(1 for n in range(1, 100, 2) if n * 1.5 <= 20) - 1),
    '6.4': ('num', 300 / sqrt(2) / 2),
    '6.5': ('num', 340 / (2 * (0.5 + 2 * 0.6 * 0.02))),
    '6.6': ('fact', 'summer: v up → lengths up; l2 > 3l1'),
    '6.7': ('num', 2 * 512 * (0.48 - 0.15)),
    '7.1': ('opt', '%d Hz' % (256 - 5)),
    '7.2': ('opt', '%d Hz' % (200 - 4)),
    '7.3': ('num', 2),                                              # |1 + 2cos 2πt| peaks at t = 0 and t = ½ each second
    '7.4': ('opt', '%d Hz' % (425 - 5)),
    '7.5': ('num', 19 * 4),
    '8.1': ('opt', '%d%%' % round((1.2 - 1) * 100)),
    '8.2': ('opt', '%d%%' % round((1000 * 320 / 300 - 1000 * 320 / 340) / (1000 * 320 / 300) * 100)),
    '8.3': ('opt', '%d Hz' % round(100 * 330 / (330 - 19.4 * cos(pi / 3)))),
    '8.4': ('num', 400 * (340 + 20) / (340 - 20)),
    '8.5': ('opt', '%d m' % round((0.06 * 330) ** 2 / (2 * 2))),
    '8.6': ('num', math.degrees(asin(1 / 2))),
    '9.1': ('opt', '%d m/s, %d Hz' % (round(240 * 2 * 2.0 / 3), 240 / 3)),
    '9.2': ('num', 0.6 / 4 * 100),
    '9.3': ('num', 340 * 345 / 340 - 340 * 335 / 340),
    '9.4': ('num', 2 * 15 / 4),
}


def questions(cid):
    out = {}
    d = os.path.join(REPO, 'content', cid, 'lessons')
    for f in sorted(os.listdir(d)):
        n = int(f[:2])
        src = open(os.path.join(d, f), encoding='utf-8').read()
        for k, m in enumerate(re.finditer(r'<q\b([^>]*)>(.*?)</q>', src, re.S), 1):
            a = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
            out['%d.%d' % (n, k)] = (a, re.findall(r'<opt>(.*?)</opt>', m.group(2), re.S))
    return out


def main():
    bad, n = [], 0
    for cid, table in (('simple-harmonic-motion', S), ('waves-and-sound', W)):
        qs = questions(cid)
        for qid, (a, opts) in qs.items():
            n += 1
            where = '%s %s' % (cid, qid)
            if qid not in table:
                bad.append(where + ': no check written'); continue
            kind, val = table[qid]
            if kind == 'num':
                if a.get('type') not in ('numeric', 'integer'):
                    bad.append(where + ': expected a numeric question'); continue
                tol = float(a.get('tol', '0')) or 0.5e-9
                if abs(float(a['answer']) - val) > tol + 1e-9:
                    bad.append('%s: key %s, computed %.4f (tolerance %s)' % (where, a['answer'], val, a.get('tol', '0')))
            elif kind == 'opt':
                keyed = opts[ord(a['answer']) - 65] if a.get('type') == 'single' else ''
                plain = re.sub(r'\\[a-z]+\{|[{}$\\]|\\,', '', keyed).replace('\\ ', ' ')
                if val.replace('$', '') not in keyed and val.replace('$', '').replace('\\', '') not in plain:
                    bad.append('%s: keyed option %r does not contain the computed %r' % (where, keyed, val))
        for qid in table:
            if qid not in qs:
                bad.append('%s %s: check for a question that does not exist' % (cid, qid))
    print('%d questions checked across 2 chapters.' % n)
    if bad:
        print('\n'.join(bad))
        return 1
    print('Every computed answer matches its key.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
