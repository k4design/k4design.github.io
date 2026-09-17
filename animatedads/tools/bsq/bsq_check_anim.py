#!/usr/bin/env python3
"""Animation inventory across every built unit - the check the 328-file hash cannot do.

    python3 tools/bsq/bsq_check_anim.py [distdir]

The hash proves WHICH files changed; it says nothing about whether a changed file is
still CORRECT. A unit can lose an entire animation and still hash as "changed, fine" -
which is how BSQ_C4_160x600_still shipped with a static band after a recompose-in-place
loop dropped BSQ_PAN.

The rules are structural, not peer-comparison: per-ad line counts legitimately differ,
so comparing an ad against its neighbours is all noise. Each unit is checked against
what its own markup implies it needs:

  1  every <g id="lnN"> has a kf_lnN, with no gaps in the run
  2  every animation: NAME resolves to an @keyframes NAME, and every @keyframes is used
  3  the panning sizes carry kf_pan; nothing else does
  4  every unit has a CTA track - kf_cta, or the bespoke frame track that replaces it
  5  the bespoke leaderboards carry their full declared set
  6  C4's recolour sizes carry kf_reline, and 300x250 also the two pill tracks
"""
import os, re, sys

DIST = sys.argv[1] if len(sys.argv) > 1 else "/Users/kyleforeman/Documents/Aperture/bigskyquarry_ads/dist"
UNITS = os.path.join(DIST, "bsq")

PAN_SIZES = {"160x600"}
# 300x250 is deliberately absent: the user withdrew both its recolours, so it must NOT
# carry kf_reline or the pill tracks - and rule 6 checks that too.
C4_RECOLOUR = {"1080x1080", "1080x1350", "1200x628", "160x600",
               "768x1024", "1024x768", "480x320", "970x250", "320x480", "300x600"}
# The two bespoke leaderboards, as built. C4's CTA rides kf_f3rise with the rest of its
# closing lockup rather than having its own kf_cta - so `no kf_cta` is correct there and
# rule 4 exempts it. F1's three-frame sequence has no click gate and no rise: its button
# fades in at 1.0 s and stays, so it is clickable for the whole 15 s.
BESPOKE = {
    "BSQ_C4_728x90_still": {"kf_w0","kf_w1","kf_w2","kf_w3","kf_s0","kf_s1","kf_s2","kf_s3",
                            "kf_s4","kf_s5","kf_s6","kf_s7","kf_recolour","kf_subrecolour",
                            "kf_f1","kf_f2","kf_f3","kf_f3rise","kf_click"},
    "BSQ_F1_728x90_still": {"kf_f1","kf_f2","kf_f3","kf_cta"},
}


def check(name, html):
    defined = set(re.findall(r'@keyframes (kf_\w+)', html))
    used = set()
    for m in re.findall(r'animation:\s*([^;]+);', html):
        used |= set(re.findall(r'\b(kf_\w+)\b', m))
    ids = set(re.findall(r'<g id="(ln\d+)"', html))
    _, ad, size, var = name.split("_")
    errs = []

    # 1 - a track per line, contiguous
    n = len(ids)
    for i in range(n):
        if f"ln{i}" not in ids: errs.append(f"line group ln{i} missing (gap in the run)")
        elif f"kf_ln{i}" not in defined: errs.append(f"ln{i} has no kf_ln{i}")
    # 2 - no orphans either way
    for k in sorted(defined - used): errs.append(f"@keyframes {k} defined but never used")
    for k in sorted(used - defined): errs.append(f"animation {k} used but never defined")
    # 3 - pan
    if size in PAN_SIZES and "kf_pan" not in defined: errs.append("MISSING kf_pan (this size pans)")
    if size not in PAN_SIZES and "kf_pan" in defined: errs.append("has kf_pan but this size does not pan")
    # 4 - a CTA track of some kind
    if not ({"kf_cta"} & defined) and name not in BESPOKE: errs.append("no CTA track")
    # 5 - bespoke sets complete
    if name in BESPOKE:
        for k in sorted(BESPOKE[name] - defined): errs.append(f"bespoke sequence missing {k}")
    # 6 - C4's recolours
    if ad == "C4" and size in C4_RECOLOUR:
        if "kf_reline" not in defined: errs.append("MISSING kf_reline (C4 recolour size)")
    if ad == "C4" and size == "300x250":
        for k in ("kf_reline", "kf_pillbg", "kf_pillfg"):
            if k in defined: errs.append(f"{k} present, but this size's recolours were withdrawn")
    return errs


def main():
    bad = n = 0
    for name in sorted(os.listdir(UNITS)):
        f = os.path.join(UNITS, name, "index.html")
        if not os.path.isfile(f):
            continue
        n += 1
        errs = check(name, open(f).read())
        if errs:
            bad += 1
            print(f"  {name}")
            for e in errs: print(f"      {e}")
    print(f"\n{n} units checked, {bad} with a defect")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
