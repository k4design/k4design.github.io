#!/usr/bin/env python3
"""Bake a property's copy into SVG outline fragments for ap_compose_sizes.py.

Text is converted to vector paths with tools/bin/wordpath (CoreText), so the units
need no webfonts. Geometry matches the 768x1024 Figma master: everything is centred
on x=384, with the baselines and nominal boxes the original artwork used.

Usage:  bake_set.py <setkey> <json spec>
        bake_set.py --calibrate           re-derive the type specs from the pw fragments

The spec is {"headline": "...", "sub1": "...", "sub3": "...", "sub4": "...",
             "cta": "...", "hero1": ["line1","line2"]}; omit a key to skip it
(the composer then falls back to whatever fragment already exists for that set).
"""
import json, os, subprocess, sys, re

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.environ.get("AD_ASSETS") or os.path.join(HERE, "assets")
WORDPATH = os.environ.get("AD_WORDPATH") or os.path.join(HERE, "..", "bin", "wordpath")

# Type specs, derived from the Priory Walk fragments (see --calibrate).
# font, size, tracking in em, baseline y, nominal box top/bottom
SPEC = {
    "headline": ("CormorantGaramond-Regular", 89.02, 0.000, 779.0, 723.0, 801.4),
    "sub1":     ("Avenir-Book",               33.58, 0.108, 853.0, 827.0, 861.0),
    "sub3":     ("Avenir-Book",               33.58, 0.108, 853.0, 827.0, 861.0),
    "sub4":     ("Avenir-Book",               33.58, 0.108, 853.0, 827.0, 861.0),
    "cta":      ("Avenir-Medium",             26.47, 0.082, 948.0, 928.0, 973.9),
}
HERO = ("CormorantGaramond-MediumItalic", 80.07, 0.0)   # the stacked "Exclusive / Offer" hero
FILL = "#F3F3F3"
CTA_RULE = '<line x1="209" y1="972.368" x2="559" y2="559" stroke="#0099FF" stroke-width="3"/>'
CTA_RULE = '<line x1="209" y1="972.368" x2="559" y2="972.368" stroke="#0099FF" stroke-width="3"/>'
CENTRE = 384.0
SPACE_EM = 0.28          # wordpath reports no space glyph; this matches the source artwork

def glyphs(font, size, text):
    uniq = sorted(set(c for c in text if c != " "))
    out = subprocess.run([WORDPATH, font, str(size), *uniq], capture_output=True, text=True)
    if out.returncode != 0 or not out.stdout.strip():
        sys.exit(f"wordpath failed for {font} {size}: {out.stderr.strip()}")
    d = json.loads(out.stdout)
    return {w["word"]: w for w in d["words"]}, d

def lay_out(font, size, text, track):
    """Return (glyph placements, advance width, ink box) with the run starting at x=0, baseline y=0."""
    G, _ = glyphs(font, size, text)
    x = 0.0; put = []; ink = [1e9, 1e9, -1e9, -1e9]
    for c in text:
        if c == " ":
            x += size * SPACE_EM + track * size
            continue
        g = G[c]; b = g["bbox"]
        put.append((c, x, g["d"]))
        ink = [min(ink[0], x + b[0]), min(ink[1], b[1]), max(ink[2], x + b[2]), max(ink[3], b[3])]
        x += g["advance"] + track * size
    adv = x - track * size                      # no trailing letter-space
    return put, adv, ink

def run_svg(put, tx, ty, fill=FILL):
    return "".join(f'<g transform="translate({tx + gx:.2f} {ty:.2f})"><path d="{d}" fill="{fill}"/></g>'
                   for _, gx, d in put)

MAXW = 768 * 0.94        # the widest run the 768x1024 master will take

def bake_key(key, text):
    font, size, track, base, y0, y1 = SPEC[key]
    put, adv, ink = lay_out(font, size, text, track)
    if key != "cta" and adv > MAXW:                           # too long for the frame - bake it smaller
        size = size * MAXW / adv
        put, adv, ink = lay_out(font, size, text, track)
    if key == "cta":
        x = 209.0 + (350.0 - adv) / 2.0                       # centred over the fixed 209-559 rule
        svg = run_svg(put, x, base, "white") + CTA_RULE
        box = [209.0, y0, 559.0, y1]
    else:
        x = CENTRE - adv / 2.0
        svg = run_svg(put, x, base)
        box = [x, y0, x + adv, y1]
    return svg, box, (adv, ink)

def bake_hero(lines):
    """Icon + two stacked words, the icon as tall as the stack, gap 0.30x the stack width-wise.
    The icon group is lifted verbatim from the pw fragment; only its transform is recomputed."""
    src = open(os.path.join(ASSETS, "pw_hero1.svgfrag")).read()
    icon = src[:src.index("</g>") + 4]
    m = re.match(r'<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)">', icon)
    itx, ity, isc = float(m.group(1)), float(m.group(2)), float(m.group(3))
    inner = icon[icon.index(">") + 1:-4]
    # the icon's own ink box, in its untransformed space
    pts = re.findall(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', inner)   # coords come in "x y" pairs
    ix = [float(a) for a, _ in pts]; iy = [float(b) for _, b in pts]
    ix0, ix1, iy0, iy1 = min(ix), max(ix), min(iy), max(iy)

    font, size, track = HERO
    put1, adv1, ink1 = lay_out(font, size, lines[0], track)
    put2, adv2, ink2 = lay_out(font, size, lines[1], track)
    lead = size * 0.760                                       # matches the pw stack
    text = run_svg(put1, 0.0, 0.0, "white") + run_svg(put2, 0.0, lead, "white")
    top = ink1[1]; bot = lead + ink2[3]
    stackH = bot - top; stackW = max(ink1[2], ink2[2])
    sc = stackH / ((iy1 - iy0) * isc) * isc                   # icon scaled to the stack height
    gap = 0.30 * stackH
    ix_off = -(gap + (ix1 - ix0) * sc)                        # icon sits left of the text
    icon_g = (f'<g transform="translate({ix_off - ix0 * sc:.3f} {top - iy0 * sc:.3f}) '
              f'scale({sc:.5f})">{inner}</g>')
    box = [ix_off, top, stackW, bot]
    return icon_g + text, box

def calibrate():
    """Re-derive SPEC by fitting each pw fragment's measured ink box."""
    def frag_ink(name):
        s = open(os.path.join(ASSETS, f"pw_{name}.svgfrag")).read()
        s = re.sub(r'<line[^>]*>', '', s)
        pts = re.findall(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', s)   # coords come in "x y" pairs
        xs = [float(a) for a, _ in pts]; ys = [float(b) for _, b in pts]
        return min(xs), min(ys), max(xs), max(ys)
    CASES = [("headline", "CormorantGaramond-Regular", "Priory Walk"),
             ("sub1", "Avenir-Book", "Kensington, London"),
             ("sub4", "Avenir-Book", "Listed by Caroline de Havillande"),
             ("cta", "Avenir-Medium", "Schedule a viewing")]
    for key, font, text in CASES:
        x0, y0, x1, y1 = frag_ink(key)
        tw, th = x1 - x0, y1 - y0
        best = None
        for tr in [i / 1000 for i in range(0, 141)]:
            _, _, i1 = lay_out(font, 100, text, tr)
            s = 100 * tw / (i1[2] - i1[0])
            _, _, i2 = lay_out(font, s, text, tr)
            err = abs((i2[3] - i2[1]) - th)
            if best is None or err < best[0]: best = (err, tr, s)
        err, tr, s = best
        print(f"  {key:9s} {font:32s} size {s:6.2f}  track {tr:.3f}em  (fit error {err:.2f}px)")

if __name__ == "__main__":
    if sys.argv[1] == "--calibrate":
        calibrate(); sys.exit()
    setkey, spec = sys.argv[1], json.loads(sys.argv[2])
    boxes_path = os.path.join(ASSETS, f"{setkey}_bboxes.json")
    boxes = json.load(open(boxes_path)) if os.path.exists(boxes_path) else {}
    for key, text in spec.items():
        if key == "hero1":
            svg, box = bake_hero(text)
            info = ""
        else:
            svg, box, (adv, ink) = bake_key(key, text)
            info = f"  adv {adv:7.2f}  ink h {ink[3]-ink[1]:5.2f}"
        open(os.path.join(ASSETS, f"{setkey}_{key}.svgfrag"), "w").write(svg)
        boxes[key] = [round(v, 4) for v in box]
        print(f"  {setkey}_{key:9s} box [{box[0]:7.2f} {box[1]:7.2f} {box[2]:7.2f} {box[3]:7.2f}]{info}")
    json.dump(boxes, open(boxes_path, "w"))
    print(f"  -> {os.path.basename(boxes_path)} ({len(boxes)} keys)")
