#!/usr/bin/env python3
"""Build the 320x50 mobile leaderboard from the 728x90 frame exports.

The 728x90 build already pulls each Figma frame apart into independently
animatable pieces (headline halves, "Step N:" labels, end-card lockup, CTA,
logo). This script borrows that parser and re-lays the same pieces out for
320x50, so the copy, colours, type and 15s timeline stay identical to the
leaderboard - only the geometry changes.

Produces the same two cuts as the 728x90:
  index.html         - all six frames
  index-5frame.html  - drops the "in 3 EASY steps" frame
"""
import os, sys, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "728x90")

spec = importlib.util.spec_from_file_location("lb", os.path.join(SRC, "build.py"))
lb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lb)


def parse():
    os.chdir(SRC)           # the parser opens the SVGs by bare filename
    try:
        return lb.parse()
    finally:
        os.chdir(HERE)

W, H = 320, 50
LOOP, IN, OUT = lb.LOOP, lb.IN, lb.OUT
VIDEO = "bg-320x50.mp4"

# ---- layout ---------------------------------------------------------------
PHOTO_W = 52                      # video strip, left edge
COPY_X = 58                       # copy column starts here...
RULE_X = 227                      # ...and the divider / logo chrome sits here
LOGO = dict(x=236, y=9.9, w=76, h=30.2)      # 157x62.4 @ 0.484

S_COPY = 0.50                     # headline paths (728 -> 320)
S_LBL = 0.62                      # "Step N:" runs a touch larger so it stays legible
S_LOCK = 0.50                     # "3 steps" end-card lockup
S_CTA = 0.65                      # CTA pill

# 728 copy bbox: x 180.7.., headline block centred on y=45/46
T_COPY = (COPY_X - 180.7 * S_COPY, 2.0)
T_LBL = (COPY_X - 185.0 * S_LBL, -0.4)
T_HEAD = (COPY_X - 180.7 * S_COPY, 2.65)
T_LOCK = (2.0, 0.0)                                    # "3 steps" lockup at x~10
T_CTA = (94 - 342 * S_CTA, 25 - (24 + 42.5431 / 2) * S_CTA)


def tr(t, s):
    return f'transform="translate({t[0]:.2f} {t[1]:.2f}) scale({s})"'


def build(out_path, order, holds):
    parts, defs_all, shared = parse()
    assert len(order) == len(holds)

    slots, t = [], 0.30
    for h in holds:
        slots.append((t, t + IN + h))
        t = t + IN + h + OUT
    END_IN = t

    css, layers = [], []
    pct = lb.pct

    def slide(name, a, b, y_from, y_to, delay=0.0):
        a += delay; b += delay
        css.append(f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateY({y_from}px); opacity: 0; animation-timing-function: {lb.EASE_IN}; }}
  {pct(a + IN)}% {{ transform: translateY(0px); opacity: 1; animation-timing-function: linear; }}
  {pct(b)}% {{ transform: translateY(0px); opacity: 1; animation-timing-function: {lb.EASE_OUT}; }}
  {pct(b + OUT)}%, 100% {{ transform: translateY({y_to}px); opacity: 0; }}
}}""")
        return f"animation: {name} {LOOP}s linear infinite;"

    def fade(name, a, dur=0.8, out=None):
        ks = [f"0%, {pct(a)}% {{ opacity: 0; animation-timing-function: cubic-bezier(0.33,1,0.68,1); }}",
              f"{pct(a + dur)}% {{ opacity: 1; animation-timing-function: linear; }}"]
        if out is None:
            ks.append("100% { opacity: 1; }")
        else:
            ks.append(f"{pct(out)}% {{ opacity: 1; }}")
            ks.append(f"{pct(out + 0.5)}%, 100% {{ opacity: 0; }}")
        css.append("@keyframes " + name + " {\n  " + "\n  ".join(ks) + "\n}")
        return f"animation: {name} {LOOP}s linear infinite;"

    def wrap(idn, style, content, fid, t, s):
        """Animated group inside a static scale/translate wrapper. The keyframe
        translateY values are in the wrapper's (scaled) space, so the 728
        offsets still clear the 50px stage."""
        inner = "\n".join(content)
        if fid:
            inner = f'<g filter="url(#{fid})">\n{inner}\n</g>'
        return f'<g {tr(t, s)}>\n<g id="{idn}" style="{style}">\n{inner}\n</g>\n</g>'

    for (a, b), i in zip(slots, order):
        if i <= 2:      # white falls top -> bottom, green rises bottom -> top
            fid, w = parts[f"s{i}w"]
            _, g = parts[f"s{i}g"]
            layers.append(wrap(f"s{i}w", slide(f"kf_s{i}w", a, b, -90, 90), w, fid, T_COPY, S_COPY))
            layers.append(wrap(f"s{i}g", slide(f"kf_s{i}g", a, b, 90, -90, 0.12), g, fid, T_COPY, S_COPY))
        else:           # "Step N:" ducks in and out the top, headline in and out the bottom
            _, lbl = parts[f"s{i}l"]
            fid, h = parts[f"s{i}h"]
            layers.append(wrap(f"s{i}l", slide(f"kf_s{i}l", a, b, -50, -50), lbl, None, T_LBL, S_LBL))
            layers.append(wrap(f"s{i}h", slide(f"kf_s{i}h", a, b, 90, 90, 0.10), h, fid, T_HEAD, S_COPY))

    e = parts['s6']
    # The end card is rebuilt at 320 wide: "3 steps" | CTA, with the persistent
    # logo on the right. The "Fast, simple, stress-free" tag has no legible
    # home at this size and is dropped.
    end_svg = [
        f'<g id="e_bg" style="{fade("kf_e_bg", END_IN)}">\n'
        f'<rect width="{W}" height="{H}" fill="url(#end_grad)"/>\n</g>',
        f'<g id="e_logo" style="{fade("kf_e_logo", END_IN)}">\n'
        f'<rect x="{LOGO["x"]}" y="{LOGO["y"]}" width="{LOGO["w"]}" height="{LOGO["h"]}" fill="url(#LOGO)"/>\n</g>',
        f'<g id="e_rule" style="{fade("kf_e_rule", END_IN + 0.30)}">\n'
        f'<line opacity="0.52" x1="84.5" y1="7.5" x2="84.5" y2="42.5" stroke="white" stroke-width="0.75"/>\n</g>',
        f'<g {tr(T_LOCK, S_LOCK)}>\n'
        f'<g id="e_3" style="{fade("kf_e_3", END_IN + 0.30)}">\n{e["three"]}\n</g>\n'
        f'<g id="e_steps" style="{fade("kf_e_steps", END_IN + 0.30)}">\n{e["steps"]}\n</g>\n</g>',
    ]

    css.append("""@keyframes kf_cta_bob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}""")
    end_svg.append(f'''<g {tr(T_CTA, S_CTA)}>
<g id="e_cta" style="{fade("kf_e_cta", END_IN + 0.60)}">
<g id="e_cta_bob">
{e['cta']}
{e['ctatx']}
</g>
</g>
</g>''')

    chrome_rule = fade("kf_chrome_rule", 0.30, 0.6, out=END_IN)

    # video strip: the 186x90 asset scaled to 50 tall (103.3 wide), panned 30px
    vid_w = round(186 * H / 90, 1)

    html = f"""<title>3 Steps Mobile Leaderboard</title>
<style>
  :root {{ color-scheme: light; }}
  html, body {{ margin: 0; background: #111; }}

  #ad {{
    position: relative;
    width: {W}px; height: {H}px;
    margin: 0 auto;
    overflow: hidden;
    background: #132504;
  }}
  #ad svg {{ position: absolute; inset: 0; width: 100%; height: 100%; }}

  /* Same panning video as the 728x90, scaled to the 50px stage and clipped
     to a {PHOTO_W}px strip on the left, under the gradient scrim and copy. */
  #photo {{
    position: absolute;
    left: 0; top: 0;
    width: {PHOTO_W}px; height: {H}px;
    overflow: hidden;
  }}
  #photo video {{
    position: absolute;
    left: -30px; top: 0;
    width: {vid_w}px; height: {H}px;
    object-fit: cover;
    display: block;
    will-change: transform;
    animation: kf_bg_pan {LOOP}s linear infinite;
  }}
  @keyframes kf_bg_pan {{
    0%   {{ transform: translateX(0px); }}
    100% {{ transform: translateX(20px); }}
  }}

  #ad g[id] {{ will-change: transform, opacity; }}
  #e_cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out infinite; }}

{chr(10).join(css)}
</style>

<div id="ad">

  <!-- 1. gradient scrim (sits under the video, as in the source art) -->
  <svg id="base" viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="{W}" height="{H}" fill="url(#scrim)"/>
    <defs>
      <linearGradient id="scrim" x1="22" y1="0" x2="{W}" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#223710" stop-opacity="0"/>
        <stop offset="0.044" stop-color="#20380C" stop-opacity="0.467551"/>
        <stop offset="0.094" stop-color="#1B3B00"/>
        <stop offset="1" stop-color="#132504"/>
      </linearGradient>
    </defs>
  </svg>

  <!-- 2. panning video -->
  <div id="photo">
    <video src="{VIDEO}" autoplay muted loop playsinline preload="auto"></video>
  </div>

  <!-- 3. copy, chrome and end card -->
  <svg id="art" viewBox="0 0 {W} {H}" fill="none"
       xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g clip-path="url(#ad_clip)">

{chr(10).join(layers)}

      <!-- persistent brand mark; the divider retires with the copy -->
      <line id="chrome_rule" style="{chrome_rule}" opacity="0.52" x1="{RULE_X}.5" y1="7.5" x2="{RULE_X}.5" y2="42.5" stroke="white" stroke-width="0.75"/>
      <rect x="{LOGO["x"]}" y="{LOGO["y"]}" width="{LOGO["w"]}" height="{LOGO["h"]}" fill="url(#LOGO)"/>

      <!-- end card, derived from "728x90 - 6.svg" -->
{chr(10).join(end_svg)}
    </g>
    <defs>
      <clipPath id="ad_clip"><rect width="{W}" height="{H}" fill="white"/></clipPath>
      <linearGradient id="end_grad" x1="0" y1="0" x2="{RULE_X}" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1B3B00"/>
        <stop offset="1" stop-color="#132504"/>
      </linearGradient>
{chr(10).join(defs_all)}
    </defs>
  </svg>
</div>

<script>
  // Some containers block autoplay; nudge playback whenever we get the chance.
  (function () {{
    var v = document.querySelector('#photo video');
    function play() {{ var p = v.play(); if (p) p.catch(function () {{}}); }}
    play();
    v.addEventListener('canplay', play);
    document.addEventListener('visibilitychange', function () {{ if (!document.hidden) play(); }});
    document.addEventListener('click', play);
  }})();
</script>
"""
    open(out_path, "w").write(html)
    print(f"{out_path}: {len(html):,} bytes  scenes={order}  "
          f"end card {END_IN:.2f}s -> {LOOP:.2f}s ({LOOP - END_IN:.2f}s)")


if __name__ == "__main__":
    build("index.html",        [1, 2, 3, 4, 5], [1.50, 1.50, 1.30, 1.30, 1.00])
    build("index-5frame.html", [1, 3, 4, 5],    [1.50, 1.30, 1.30, 1.00])
