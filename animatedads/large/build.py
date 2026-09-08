#!/usr/bin/env python3
"""buymyhouse - large sizes (HD): 970x90, 970x250, 300x600, 160x600.

The Figma frame exports for the 3-steps creative are gone, but the shipped
dist/728x90/hd/index.html still carries every outlined piece as a tagged
group (headline white/green halves, "Step N:" labels, end-card lockup, tag,
CTA, logo bitmap, drop-shadow filters). This script lifts those pieces and
re-lays them out per size; copy, type, colours, shadows and the 15 s
five-frame timeline are the 728x90's.

Video: no re-encode. The 970x90 strip reuses the 728x90 HD asset (372x180 =
186x90 @2x); the other three reuse the 300x250 HD asset (780x500 = 390x250
@2x), letterboxed/cover-fit by CSS into their bands, with the same 90 px pan.

Run from the project root:  python3 large/build.py
Writes dist/<size>/hd/{index.html, bg-<size>.mp4, bg-<size>-still.jpg}
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "dist/728x90/hd/index.html")
V728 = os.path.join(ROOT, "dist/728x90/hd")          # 372x180 strip asset
V300 = os.path.join(ROOT, "dist/300x250/hd")         # 780x500 asset

LOOP, IN, OUT = 15.0, 0.60, 0.50
EASE_IN = 'cubic-bezier(0.16,1,0.30,1)'
EASE_OUT = 'cubic-bezier(0.55,0,0.85,0.35)'
ORDER, HOLDS = [1, 3, 4, 5], [1.50, 1.30, 1.30, 1.00]      # the shipped five-frame cut
GREEN_DK, GREEN = "#132504", "#1B3B00"


def pct(t):
    return round(t / LOOP * 100, 4)


# ---------------------------------------------------------------------------
# lift the pieces out of the 728x90 HD
# ---------------------------------------------------------------------------
def grab(s, idn):
    """inner HTML of <g id="idn" ...> ... </g>, balancing nested <g>."""
    m = re.search(r'<g id="%s"[^>]*>' % re.escape(idn), s)
    assert m, idn
    i, depth, j = m.end(), 1, m.end()
    while depth:
        n = re.compile(r'<g\b|</g>').search(s, j)
        depth += 1 if n.group(0) == '<g' else -1
        j = n.end()
    return s[i:n.start()].strip()


def parse():
    s = open(SRC).read()
    P = {}
    for idn in ['s1w', 's1g', 's3l', 's3h', 's4l', 's4h', 's5l', 's5h', 'e_3', 'e_steps', 'e_tag']:
        P[idn] = grab(s, idn)
    P['cta'] = grab(s, 'e_cta_bob')
    # headline halves for the tall sizes: one white path, one green path each
    for i in (3, 4, 5):
        ps = re.findall(r'<path\b[^>]*/>', P[f's{i}h'])
        fid = re.search(r'filter="url\(#([^)]+)\)"', P[f's{i}h']).group(1)
        w = [p for p in ps if 'fill="white"' in p]
        g = [p for p in ps if '2CC679' in p]
        assert len(w) == 1 and len(g) == 1, (i, len(w), len(g))
        P[f's{i}w'] = f'<g filter="url(#{fid})">\n{w[0]}\n</g>'
        P[f's{i}g'] = f'<g filter="url(#{fid})">\n{g[0]}\n</g>'
    art = s[s.index('<svg id="art"'):]
    defs = re.search(r'<defs>(.*)</defs>', art, re.S).group(1)
    defs = re.sub(r'<clipPath id="ad_clip">.*?</clipPath>\s*', '', defs, flags=re.S)
    P['defs'] = defs.strip()
    P['script'] = s[s.index('<script type="text/javascript">\n  (function () {\n    var v'):s.index('</body>')]
    return P


# ---------------------------------------------------------------------------
# timeline helpers (identical curves to the 728x90 build)
# ---------------------------------------------------------------------------
class Timeline:
    def __init__(self):
        self.css = []
        slots, t = [], 0.30
        for h in HOLDS:
            slots.append((t, t + IN + h))
            t = t + IN + h + OUT
        self.slots, self.END = slots, t

    def slide(self, name, a, b, y_from, y_to, delay=0.0, axis='Y'):
        a += delay; b += delay
        self.css.append(f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translate{axis}({y_from}px); opacity: 0; animation-timing-function: {EASE_IN}; }}
  {pct(a + IN)}% {{ transform: translate{axis}(0px); opacity: 1; animation-timing-function: linear; }}
  {pct(b)}% {{ transform: translate{axis}(0px); opacity: 1; animation-timing-function: {EASE_OUT}; }}
  {pct(b + OUT)}%, 100% {{ transform: translate{axis}({y_to}px); opacity: 0; }}
}}""")
        return f"animation: {name} {LOOP}s linear infinite;"

    def fade(self, name, a, dur=0.8, out=None):
        ks = [f"0%, {pct(a)}% {{ opacity: 0; animation-timing-function: cubic-bezier(0.33,1,0.68,1); }}",
              f"{pct(a + dur)}% {{ opacity: 1; animation-timing-function: linear; }}"]
        if out is None:
            ks.append("100% { opacity: 1; }")
        else:
            ks.append(f"{pct(out)}% {{ opacity: 1; }}")
            ks.append(f"{pct(out + 0.5)}%, 100% {{ opacity: 0; }}")
        self.css.append("@keyframes " + name + " {\n  " + "\n  ".join(ks) + "\n}")
        return f"animation: {name} {LOOP}s linear infinite;"


def T(tx, ty, s):
    return f'transform="translate({tx:.2f} {ty:.2f}) scale({s})"'


def wrap(idn, style, inner, tx, ty, s):
    return f'<g {T(tx, ty, s)}>\n<g id="{idn}" style="{style}">\n{inner}\n</g>\n</g>'


def logo_rect(x, y, s):
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{157*s:.2f}" height="{62.3974*s:.2f}" fill="url(#LOGO)"/>'


# 728 geometry we lay out against
COPY_X0, COPY_CY = 180.7, 46.0             # copy column left edge, block centre (frames 3-5: 17.6..74.3)
LBL_X0, LBL_Y0 = 185.0, 17.6
HEAD_Y0 = 39.5
LOCK = (15.7, 28.0, 134.6, 44.0)           # "3 steps" lockup bbox (e_3 + e_steps)
TAG = (177.8, 26.0, 144.6, 40.2)
CTA = (342.0, 24.0, 177.465, 42.5431)


def copy_layers(tl, P, tx, ty, s, ls, ltx, lty, split=False, sw=None):
    """The four copy frames. split=True stacks white/green on two lines (tall
    sizes); sw = (dy of white line, dy of green line) in 728 units."""
    out = []
    for (a, b), i in zip(tl.slots, ORDER):
        if i == 1 and not split:
            out.append(wrap('s1w', tl.slide('kf_s1w', a, b, -90, 90), P['s1w'], tx, ty, s))
            out.append(wrap('s1g', tl.slide('kf_s1g', a, b, 90, -90, 0.12), P['s1g'], tx, ty, s))
        elif not split:
            out.append(wrap(f's{i}l', tl.slide(f'kf_s{i}l', a, b, -50, -50), P[f's{i}l'], ltx, lty, ls))
            out.append(wrap(f's{i}h', tl.slide(f'kf_s{i}h', a, b, 90, 90, 0.10), P[f's{i}h'], tx, ty, s))
        else:
            # two lines, both left-aligned at CX: white falls in from the top, green rises from below.
            # sw = (top of the white line, top of the green line) in px.
            Y_W, Y_G = sw
            WX0 = {1: 181.0, 3: 185.1, 4: 185.8, 5: 185.1}[i]; WY0 = {1: 25.7, 3: 40.4, 4: 39.9, 5: 39.7}[i]
            GX0 = {1: 303.7, 3: 376.7, 4: 344.2, 5: 392.7}[i]; GY0 = {1: 24.8, 3: 39.5, 4: 39.1, 5: 39.5}[i]
            if i != 1:
                out.append(wrap(f's{i}l', tl.slide(f'kf_s{i}l', a, b, -50, -50), P[f's{i}l'], ltx, lty, ls))
            out.append(wrap(f's{i}w', tl.slide(f'kf_s{i}w', a, b, -90, 90), P[f's{i}w'], tx - WX0 * s, Y_W - WY0 * s, s))
            out.append(wrap(f's{i}g', tl.slide(f'kf_s{i}g', a, b, 90, -90, 0.12), P[f's{i}g'], tx - GX0 * s, Y_G - GY0 * s, s))
    return out


def page(W, H, title, style_extra, body_svg_base, photo_html, art_layers, tl, P, video, still, still_wh, aria):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width={W},height={H}">
<title>{title}</title>
<script type="text/javascript">
  var clickTag = "https://www.buymyhouse.com/";
</script>
<script type="text/javascript">
  // DSPs that pass the destination on the query string (clickTag=...) win over the default.
  (function () {{
    var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search);
    if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }}
  }})();
</script>
<style>
  :root {{ color-scheme: light; }}
  html, body {{ margin: 0; padding: 0; background: {GREEN_DK}; overflow: hidden; }}
  #ad {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; background: {GREEN_DK}; }}
  #ad svg {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
  #ad.no-autoplay video {{ display: none; }}
  #ad g[id] {{ will-change: transform, opacity; }}
  #e_cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out infinite; }}
  #clickthrough {{ position: absolute; inset: 0; display: block; cursor: pointer; text-decoration: none; -webkit-tap-highlight-color: transparent; }}
{style_extra}
@keyframes kf_cta_bob {{
  0%, 100% {{ transform: translateY(0px); }}
  50% {{ transform: translateY(-3px); }}
}}
{chr(10).join(tl.css)}
</style>
</head>
<body>
<div id="ad" class="no-autoplay">

  <!-- 1. base: panel and scrim, under the video -->
  <svg id="base" viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">
{body_svg_base}
  </svg>

  <!-- 2. video, with its still underneath (shown if autoplay is refused) -->
  <div id="photo">
    <img id="bgstill" src="{still}" width="{still_wh[0]}" height="{still_wh[1]}" alt="">
    <video src="{video}" poster="{still}" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>
  </div>

  <!-- 3. copy, chrome and end card - pieces lifted from the 728x90 -->
  <svg id="art" viewBox="0 0 {W} {H}" fill="none"
       xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g clip-path="url(#ad_clip)">
{chr(10).join(art_layers)}
    </g>
    <defs>
      <clipPath id="ad_clip"><rect width="{W}" height="{H}" fill="white"/></clipPath>
{P['defs']}
    </defs>
  </svg>
  <a id="clickthrough" href="javascript:window.open(window.clickTag)" aria-label="{aria}"></a>
</div>

{P['script']}</body>
</html>
"""


def emit(size, html, vsrc, vname):
    d = os.path.join(ROOT, f"dist/{size}/hd")
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w").write(html)
    shutil.copy(os.path.join(vsrc, f"bg-{vname}.mp4"), os.path.join(d, f"bg-{size}.mp4"))
    shutil.copy(os.path.join(vsrc, f"bg-{vname}-still.jpg"), os.path.join(d, f"bg-{size}-still.jpg"))
    print(f"{d}/index.html  {len(html):,} bytes")


# ---------------------------------------------------------------------------
# 970x90 - super leaderboard: the 728 layout, copy at 1.25, strip 186
# ---------------------------------------------------------------------------
def build_970x90(P):
    W, H = 970, 90
    tl = Timeline()
    STRIP = 186
    S, LS = 1.25, 1.25
    CX = 228                                    # copy column left edge
    tx = CX - COPY_X0 * S
    ty = H / 2 - COPY_CY * S
    LOGO_X, LOGO_Y = W - 157 - 23, 15
    RULE_X = LOGO_X - 24

    layers = copy_layers(tl, P, tx, ty, S, LS, CX - LBL_X0 * LS + (LBL_X0 - COPY_X0) * LS, ty)
    chrome = tl.fade('kf_chrome_rule', 0.30, 0.6, out=tl.END)
    layers.append(f'<line id="chrome_rule" style="{chrome}" opacity="0.52" x1="{RULE_X}.5" y1="13" x2="{RULE_X}.5" y2="77" stroke="white" stroke-width="0.75"/>')
    layers.append(logo_rect(LOGO_X, LOGO_Y, 1.0))

    # end card: the 728 end card scaled 1.25 (lockup | rule | tag | CTA), logo stays put
    E = 1.25
    ex, ey = 40 - LOCK[0] * E, H / 2 - 45 * E
    layers += [
        f'<g id="e_bg" style="{tl.fade("kf_e_bg", tl.END)}"><rect width="{W}" height="{H}" fill="url(#end_grad)"/></g>',
        f'<g id="e_logo" style="{tl.fade("kf_e_logo", tl.END)}">{logo_rect(LOGO_X, LOGO_Y, 1.0)}</g>',
        f'<g {T(ex, ey, E)}>',
        f'<g id="e_rule" style="{tl.fade("kf_e_rule", tl.END + 0.30)}"><line opacity="0.52" x1="164.631" y1="79" x2="164.631" y2="15" stroke="white" stroke-width="0.737636"/></g>',
        f'<g id="e_3" style="{tl.fade("kf_e_3", tl.END + 0.30)}">{P["e_3"]}</g>',
        f'<g id="e_steps" style="{tl.fade("kf_e_steps", tl.END + 0.30)}">{P["e_steps"]}</g>',
        f'<g id="e_tag" style="{tl.fade("kf_e_tag", tl.END + 0.50)}">{P["e_tag"]}</g>',
        f'<g id="e_cta" style="{tl.fade("kf_e_cta", tl.END + 0.70)}"><g id="e_cta_bob">{P["cta"]}</g></g>',
        '</g>',
    ]
    style = f"""  /* 186 px strip on the left: the 728x90 HD asset (372x180) at 1:1 on the 90 px stage, no pan. */
  #photo {{ position: absolute; left: 0; top: 0; width: {STRIP}px; height: {H}px; overflow: hidden; }}
  #photo video, #photo #bgstill {{ position: absolute; left: 0; top: 0; width: 186px; height: 90px; object-fit: cover; display: block; will-change: transform; animation: kf_bg_pan {LOOP}s linear infinite; }}
  /* no pan; the keyframes stay as a no-op because the 15 s re-sync listens for this animation's iteration */
  @keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); }} 100% {{ transform: translateX(0px); }} }}"""
    base = f"""    <rect width="{W}" height="{H}" fill="url(#scrim)"/>
    <defs>
      <linearGradient id="scrim" x1="{STRIP-110}" y1="0" x2="{W}" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#223710" stop-opacity="0"/>
        <stop offset="{(40/(W-STRIP+110)):.4f}" stop-color="#20380C" stop-opacity="0.467551"/>
        <stop offset="{(90/(W-STRIP+110)):.4f}" stop-color="{GREEN}"/>
        <stop offset="1" stop-color="{GREEN_DK}"/>
      </linearGradient>
    </defs>"""
    layers.insert(0, f'<defs><linearGradient id="end_grad" x1="0" y1="0" x2="{W*0.7:.0f}" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="{GREEN}"/><stop offset="1" stop-color="{GREEN_DK}"/></linearGradient></defs>')
    html = page(W, H, "buymyhouse 970x90 (HD)", style, base, None, layers, tl, P,
                "bg-970x90.mp4", "bg-970x90-still.jpg", (186, 90), "Check my offer")
    emit("970x90", html, V728, "728x90")


# ---------------------------------------------------------------------------
# 970x250 - billboard: 360 px video strip left, copy at 1.5, two-row end card
# ---------------------------------------------------------------------------
def build_970x250(P):
    W, H = 970, 250
    tl = Timeline()
    STRIP, PAN = 360, 30
    S, LS = 1.65, 1.65
    CX = 404
    tx = CX - COPY_X0 * S
    ty = 108 - COPY_CY * S
    ltx = tx + (COPY_X0 - LBL_X0) * (S - LS) + 0   # label shares the column
    LOGO_X, LOGO_Y = W - 157 - 26, H - 62.4 - 22

    layers = copy_layers(tl, P, tx, ty, S, LS, ltx, ty)
    layers.append(logo_rect(LOGO_X, LOGO_Y, 1.0))

    # end card: row 1 = "3 steps" | rule | tag (1.8), row 2 = CTA (1.5), centred on the full width
    E1, E2 = 1.8, 1.5
    row1_w = (LOCK[2] + 28 + TAG[2]) * E1
    x0 = (W - row1_w) / 2
    lock_tx = x0 - LOCK[0] * E1
    tag_tx = x0 + (LOCK[2] + 28) * E1 - TAG[0] * E1
    row1_cy = 96
    lock_ty = row1_cy - (LOCK[1] + LOCK[3] / 2) * E1
    tag_ty = row1_cy - (TAG[1] + TAG[3] / 2) * E1
    rule_x = x0 + (LOCK[2] + 14) * E1
    cta_tx = W / 2 - (CTA[0] + CTA[2] / 2) * E2
    cta_ty = 186 - (CTA[1] + CTA[3] / 2) * E2
    layers += [
        f'<g id="e_bg" style="{tl.fade("kf_e_bg", tl.END)}"><rect width="{W}" height="{H}" fill="url(#end_grad)"/></g>',
        f'<g id="e_logo" style="{tl.fade("kf_e_logo", tl.END)}">{logo_rect(LOGO_X, LOGO_Y, 1.0)}</g>',
        f'<g id="e_rule" style="{tl.fade("kf_e_rule", tl.END + 0.30)}"><line opacity="0.52" x1="{rule_x:.2f}" y1="{row1_cy-40}" x2="{rule_x:.2f}" y2="{row1_cy+40}" stroke="white" stroke-width="1"/></g>',
        f'<g {T(lock_tx, lock_ty, E1)}><g id="e_3" style="{tl.fade("kf_e_3", tl.END + 0.30)}">{P["e_3"]}</g>'
        f'<g id="e_steps" style="{tl.fade("kf_e_steps", tl.END + 0.30)}">{P["e_steps"]}</g></g>',
        f'<g {T(tag_tx, tag_ty, E1)}><g id="e_tag" style="{tl.fade("kf_e_tag", tl.END + 0.50)}">{P["e_tag"]}</g></g>',
        f'<g {T(cta_tx, cta_ty, E2)}><g id="e_cta" style="{tl.fade("kf_e_cta", tl.END + 0.70)}"><g id="e_cta_bob">{P["cta"]}</g></g></g>',
    ]
    style = f"""  /* 360 px strip on the left: the 300x250 HD asset (780x500) rendered at 390x250, 30 px pan. */
  #photo {{ position: absolute; left: 0; top: 0; width: {STRIP}px; height: {H}px; overflow: hidden; }}
  #photo video, #photo #bgstill {{ position: absolute; left: -{PAN}px; top: 0; width: 390px; height: 250px; object-fit: cover; display: block; will-change: transform; animation: kf_bg_pan {LOOP}s linear infinite; }}
  @keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); animation-timing-function: linear; }} 60% {{ transform: translateX({PAN}px); animation-timing-function: ease-in-out; }} 100% {{ transform: translateX({PAN-2}px); }} }}"""
    base = f"""    <rect width="{W}" height="{H}" fill="url(#scrim)"/>
    <defs>
      <linearGradient id="scrim" x1="{STRIP-150}" y1="0" x2="{W}" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#223710" stop-opacity="0"/>
        <stop offset="{(70/(W-STRIP+150)):.4f}" stop-color="#20380C" stop-opacity="0.467551"/>
        <stop offset="{(150/(W-STRIP+150)):.4f}" stop-color="{GREEN}"/>
        <stop offset="1" stop-color="{GREEN_DK}"/>
      </linearGradient>
    </defs>"""
    layers.insert(0, f'<defs><linearGradient id="end_grad" x1="0" y1="0" x2="{W*0.7:.0f}" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="{GREEN}"/><stop offset="1" stop-color="{GREEN_DK}"/></linearGradient></defs>')
    html = page(W, H, "buymyhouse 970x250 (HD)", style, base, None, layers, tl, P,
                "bg-970x250.mp4", "bg-970x250-still.jpg", (390, 250), "Check my offer")
    emit("970x250", html, V300, "300x250")


# ---------------------------------------------------------------------------
# tall sizes: video band on top, copy in the panel, CTA + logo persistent
# ---------------------------------------------------------------------------
def build_tall(P, W, H, BAND, vid_w, vid_h, vid_left, PAN, S, LS, CX, COPY_CY_PX, split, sw,
               E_LOCK, LOCK_CY, E_TAG, TAG_CY, E_CTA, CTA_CY, E_LOGO, LOGO_CY, name):
    tl = Timeline()
    tx = CX - COPY_X0 * S
    ty = COPY_CY_PX - COPY_CY * S
    ltx = CX - LBL_X0 * LS
    lty = ty + (LBL_Y0 * S - LBL_Y0 * LS)          # label top stays where the 728 puts it
    if split:                                      # sw = (label top, white top, green top) in px
        tx, lty, sw = CX, sw[0] - LBL_Y0 * LS, (sw[1], sw[2])
    layers = copy_layers(tl, P, tx, ty, S, LS, ltx, lty, split=split, sw=sw)

    # persistent chrome: CTA (bobbing) and logo, in from 0.3 s
    cta_tx = W / 2 - (CTA[0] + CTA[2] / 2) * E_CTA
    cta_ty = CTA_CY - (CTA[1] + CTA[3] / 2) * E_CTA
    logo_x = W / 2 - 157 * E_LOGO / 2
    logo_y = LOGO_CY - 62.3974 * E_LOGO / 2
    layers.append(f'<g id="chrome_logo" style="{tl.fade("kf_chrome_logo", 0.0, 0.6)}">{logo_rect(logo_x, logo_y, E_LOGO)}</g>')
    layers.append(f'<g {T(cta_tx, cta_ty, E_CTA)}><g id="e_cta" style="{tl.fade("kf_e_cta", 0.3, 0.6)}"><g id="e_cta_bob">{P["cta"]}</g></g></g>')

    # end card: "3 steps" lockup, then the tag line, both centred
    lock_tx = W / 2 - (LOCK[0] + LOCK[2] / 2) * E_LOCK
    lock_ty = LOCK_CY - (LOCK[1] + LOCK[3] / 2) * E_LOCK
    tag_tx = W / 2 - (TAG[0] + TAG[2] / 2) * E_TAG
    tag_ty = TAG_CY - (TAG[1] + TAG[3] / 2) * E_TAG
    layers += [
        f'<g {T(lock_tx, lock_ty, E_LOCK)}><g id="e_3" style="{tl.fade("kf_e_3", tl.END + 0.20)}">{P["e_3"]}</g>'
        f'<g id="e_steps" style="{tl.fade("kf_e_steps", tl.END + 0.20)}">{P["e_steps"]}</g></g>',
        f'<g {T(tag_tx, tag_ty, E_TAG)}><g id="e_tag" style="{tl.fade("kf_e_tag", tl.END + 0.45)}">{P["e_tag"]}</g></g>',
    ]
    style = f"""  /* video band on top: the 300x250 HD asset (780x500) cover-fit to {vid_w}x{vid_h}, {PAN} px pan, fading into the panel. */
  #photo {{ position: absolute; left: 0; top: 0; width: {W}px; height: {BAND}px; overflow: hidden; }}
  #photo video, #photo #bgstill {{ position: absolute; left: {vid_left}px; top: 0; width: {vid_w}px; height: {vid_h}px; object-fit: cover; display: block; will-change: transform; animation: kf_bg_pan {LOOP}s linear infinite; }}
  @keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); animation-timing-function: linear; }} 60% {{ transform: translateX({PAN}px); animation-timing-function: ease-in-out; }} 100% {{ transform: translateX({PAN-3}px); }} }}
  #photo::after {{ content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: {int(BAND*0.42)}px; pointer-events: none; background: linear-gradient(to bottom, rgba(27,59,0,0) 0%, rgba(27,59,0,0.55) 55%, {GREEN} 100%); }}"""
    base = f"""    <rect width="{W}" height="{H}" fill="url(#panel)"/>
    <defs>
      <linearGradient id="panel" x1="0" y1="{BAND}" x2="0" y2="{H}" gradientUnits="userSpaceOnUse">
        <stop stop-color="{GREEN}"/>
        <stop offset="1" stop-color="{GREEN_DK}"/>
      </linearGradient>
    </defs>"""
    html = page(W, H, f"buymyhouse {name} (HD)", style, base, None, layers, tl, P,
                f"bg-{name}.mp4", f"bg-{name}-still.jpg", (390, 250), "Check my offer")
    emit(name, html, V300, "300x250")


if __name__ == "__main__":
    P = parse()
    build_970x90(P)
    build_970x250(P)
    # 300x600 half page: band 320 tall (asset at 499x320), copy 0.85 left-aligned at x=16
    build_tall(P, 300, 600, BAND=320, vid_w=499, vid_h=320, vid_left=-100, PAN=90,
               S=0.85, LS=0.85, CX=16, COPY_CY_PX=395, split=False, sw=None,
               E_LOCK=1.5, LOCK_CY=385, E_TAG=1.2, TAG_CY=450,
               E_CTA=1.0, CTA_CY=511, E_LOGO=0.72, LOGO_CY=566, name="300x600")
    # 160x600 skyscraper: band 220 tall (asset at 343x220), two-line copy at 0.62, x=14
    build_tall(P, 160, 600, BAND=220, vid_w=343, vid_h=220, vid_left=-92, PAN=90,
               S=0.62, LS=0.70, CX=14, COPY_CY_PX=330, split=True, sw=(317, 333, 359),
               E_LOCK=1.0, LOCK_CY=318, E_TAG=0.95, TAG_CY=372,
               E_CTA=0.8, CTA_CY=478, E_LOGO=0.85, LOGO_CY=543, name="160x600")
