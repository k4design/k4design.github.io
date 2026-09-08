#!/usr/bin/env python3
"""Tall AWK units, copy pass:
  300x600 v*_HD : 'paying closing costs' (Cormorant Garamond Bold Italic, the family's heaviest cut)
                  gets a same-colour 1.2 px stroke = one weight step heavier, width kept.
  160x600 v*_HD : question re-set larger - 19 px Avenir Next Demi Bold / 25 px Cormorant (was 16 / ~21)
                  on five lines: Wondering / which builders / are paying / closing costs / this month?
                  Body 11.5 px Helvetica Neue (was 9.5) on three lines, 'new construction.' Medium Italic.
Text is outlined with CoreText (tools/outline.swift -> tools/outline). Run from dist/awk/."""
import re, glob, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "outline")
if not os.path.exists(OUT):
    subprocess.run(["swiftc", "-O", os.path.join(HERE, "outline.swift"), "-o", OUT], check=True)

def outline(font, size, x, baseline, text):
    r = subprocess.run([OUT, font, str(size), str(x), str(baseline), text], capture_output=True, text=True, check=True)
    return r.stdout.strip(), float(r.stderr.split()[1])

AV, CG, HN, HNI = "AvenirNext-DemiBold", "CormorantGaramond-BoldItalic", "HelveticaNeue", "HelveticaNeue-MediumItalic"
GOLD_STROKE = 'stroke="#FFAE2B" stroke-width="{w}" stroke-linejoin="round" paint-order="stroke"'

# ---- 300x600: heavier gold line
for f in sorted(glob.glob("AWK_NC_CC_EXT_300x600_v*_HD/index.html")):
    s = open(f).read()
    q0, q1 = s.index('<g id="question">'), s.index('</g>', s.index('<g id="question">'))
    q = s[q0:q1]
    q = re.sub(r'<path fill="#FFAE2B"\s+(stroke="[^"]*" stroke-width="[^"]*" stroke-linejoin="round" paint-order="stroke" )?d=',
               '<path fill="#FFAE2B" ' + GOLD_STROKE.format(w=1.2) + ' d=', q)
    open(f, "w").write(s[:q0] + q + s[q1:]); print(f, "gold line +1.2px stroke")

# ---- 160x600: bigger copy
X = 14
QS, GS, BS = 19, 25, 11.5
lines = [  # (baseline, [(font, size, text, fill, extra)])
    (366, [(AV, QS, "Wondering", "#ffffff", "")]),
    (389, [(AV, QS, "which builders", "#ffffff", "")]),
    (415, [(AV, QS, "are", "#ffffff", ""), (CG, GS, "paying", "#FFAE2B", GOLD_STROKE.format(w=0.8))]),
    (441, [(CG, GS, "closing costs", "#FFAE2B", GOLD_STROKE.format(w=0.8))]),
    (464, [(AV, QS, "this month?", "#ffffff", "")]),
]
RULE_Y = 478
body = [(494, HN, "Meet the Agent"), (508, HN, "Who Knows"), (522, HNI, "new construction.")]

def question_svg():
    out = []
    for base, parts in lines:
        x = X
        for font, size, text, fill, extra in parts:
            d, adv = outline(font, size, x, base, text)
            out.append(f'      <path fill="{fill}" {extra} d="{d}"/>'.replace('  d=', ' d='))
            x += adv + (0.27 * size)          # word space to the next run
    return "\n".join(out)

def body_svg():
    out = [f'      <rect x="{X}" y="{RULE_Y}" width="48" height="2" fill="#c8861a"/>']
    for base, font, text in body:
        d, _ = outline(font, BS, X, base, text)
        out.append(f'      <path fill="#ffffff" opacity="0.88" d="{d}"/>')
    return "\n".join(out)

qsvg, bsvg = question_svg(), body_svg()
for f in sorted(glob.glob("AWK_NC_CC_EXT_160x600_v*_HD/index.html")):
    s = open(f).read()
    s = re.sub(r'(<g id="question">\n).*?(\n    </g>)', lambda m: m.group(1) + qsvg + m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'(<g id="resolution">\n).*?(\n    </g>)', lambda m: m.group(1) + bsvg + m.group(2), s, count=1, flags=re.S)
    open(f, "w").write(s); print(f, "question 19/25 px on 5 lines, body 11.5 px on 3 lines")
