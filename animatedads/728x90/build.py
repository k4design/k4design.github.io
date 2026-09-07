#!/usr/bin/env python3
"""Build the 728x90 HTML5 banner from the six exported SVG frames.

Produces two cuts:
  index.html         - all six frames
  index-5frame.html  - drops the "in 3 EASY steps" frame; the end card
                       absorbs the freed time and runs out to 0:15.
"""
import re, sys

FILES = {i: f"728x90 - {i}.svg" for i in range(1, 7)}
LOOP = 15.0
IN, OUT = 0.60, 0.50
EASE_IN = 'cubic-bezier(0.16,1,0.30,1)'
EASE_OUT = 'cubic-bezier(0.55,0,0.85,0.35)'
VIDEO = "bg-728x90.mp4"


def pct(t):
    return round(t / LOOP * 100, 4)


def load(f):
    s = open(f).read()
    body = re.search(r'<g clip-path="url\(#clip0[^"]*\)">(.*?)\n</g>\n<defs>', s, re.S).group(1)
    defs = re.search(r'<defs>(.*)</defs>', s, re.S).group(1)
    return body, defs


def take(body, pat):
    m = re.search(pat, body, re.S)
    assert m, pat
    return m.group(0), body[:m.start()] + body[m.end():]


def paths(g):
    inner = re.search(r'<g [^>]*>(.*)</g>', g, re.S).group(1)
    ps = re.findall(r'<path\b.*?(?:/>|</path>)', inner, re.S)
    assert ps
    return ps


def parse():
    """Pull every frame apart into independently animatable pieces."""
    parts, defs_all = {}, []
    shared = {}
    for i, f in FILES.items():
        body, defs = load(f)
        d = defs
        # the background photo is replaced by the video, so its pattern+bitmap go
        d = re.sub(r'<pattern id="[^"]*" patternContentUnits="objectBoundingBox" width="1" height="1">\s*'
                   r'<use[^>]*matrix\(0\.000874921[^>]*/>\s*</pattern>\s*', '', d)
        d = re.sub(r'<image id="[^"]*"[^>]*width="1456"[^>]*/>\s*', '', d)
        d = re.sub(r'<clipPath id="clip0[^"]*">.*?</clipPath>\s*', '', d, flags=re.S)

        _, body = take(body, r'<rect width="728" height="90" fill="white"/>')
        if i == 1:
            _, body = take(body, r'<line x1="364\.5"[^>]*/>')   # rule through the headline: cut
        if i < 6:
            _, body = take(body, r'<rect width="840" height="127\.703"[^>]*/>')  # scrim  -> base layer
            _, body = take(body, r'<rect width="157" height="112"[^>]*/>')       # photo  -> video
            _, body = take(body, r'<line opacity="0\.52" x1="523\.631"[^>]*/>')  # rule   -> chrome
            _, body = take(body, r'<rect x="548" y="15" width="157"[^>]*/>')     # logo   -> chrome
            fid = re.search(r'filter0_d_[\w]+', d).group(0)
            g, body = take(body, r'<g filter="url\(#filter0_d_[\w]+\)">.*?</g>')
            ps = paths(g)
            white = [p for p in ps if 'fill="white"' in p]
            green = [p for p in ps if '2CC679' in p]
            assert len(white) + len(green) == len(ps)
            if i <= 2:
                parts[f"s{i}w"] = (fid, white)
                parts[f"s{i}g"] = (fid, green)
            else:
                parts[f"s{i}h"] = (fid, ps)                            # headline moves as a block
                lbl, body = take(body, r'<path\b.*?(?:/>|</path>)')    # "Step N:" label
                parts[f"s{i}l"] = (None, [lbl])
            assert not body.strip(), (i, body[:200])
        else:
            e = {}
            e['grad'],  body = take(body, r'<rect width="1043"[^>]*/>')
            e['cta'],   body = take(body, r'<g filter="url\(#filter0_d_1_291\)">.*?</g>')
            e['ctatx'], body = take(body, r'<path\b.*?(?:/>|</path>)')
            e['tag'],   body = take(body, r'<g filter="url\(#filter1_d_1_291\)">.*?</g>')
            e['logo'],  body = take(body, r'<rect x="548" y="15" width="157"[^>]*/>')
            e['steps'], body = take(body, r'<g filter="url\(#filter2_d_1_291\)">.*?</g>')
            e['three'], body = take(body, r'<path\b.*?(?:/>|</path>)')
            e['rule'],  body = take(body, r'<line opacity="0\.52" x1="164\.631"[^>]*/>')
            assert not body.strip(), body[:200]
            e['logo'] = re.sub(r'fill="url\(#pattern\d+_[\w]+\)"', 'fill="url(#LOGO)"', e['logo'])
            # "3 steps" reads as one lockup: the numeral ships green, so the
            # word matches it instead of staying white.
            e['steps'] = e['steps'].replace('fill="white"', 'fill="#2CC679"')
            parts['s6'] = e

        # frame 1 donates the single shared logo pattern/bitmap and the scrim gradient
        if i == 1:
            name = re.search(r'<pattern id="(pattern\d+_[\w]+)" patternContentUnits', d).group(1)
            d = d.replace(f'id="{name}"', 'id="LOGO"')
            shared['grad'] = re.search(r'<linearGradient id="paint0_linear_[\w]+".*?</linearGradient>', d, re.S).group(0)
            shared['grad_id'] = re.search(r'id="(paint0_linear_[\w]+)"', shared['grad']).group(1)
            d = re.sub(r'<linearGradient id="paint0_linear_[\w]+".*?</linearGradient>\s*', '', d, flags=re.S)
        else:
            d = re.sub(r'<pattern id="[^"]*" patternContentUnits="objectBoundingBox" width="1" height="1">\s*'
                       r'<use[^>]*scale\(0\.000489956[^>]*/>\s*</pattern>\s*', '', d)
            d = re.sub(r'<image id="[^"]*"[^>]*width="2041"[^>]*/>\s*', '', d)
            if i < 6:   # frame 6 keeps its own, opaque, wider gradient
                d = re.sub(r'<linearGradient id="paint0_linear_[\w]+".*?</linearGradient>\s*', '', d, flags=re.S)
        defs_all.append(d.strip())
    return parts, defs_all, shared


def build(out_path, order, holds):
    """order: copy frames to include. holds: on-screen dwell for each, in seconds."""
    parts, defs_all, shared = parse()
    assert len(order) == len(holds)

    # lay the scenes end to end; whatever is left over belongs to the end card
    slots, t = [], 0.30
    for h in holds:
        slots.append((t, t + IN + h))
        t = t + IN + h + OUT
    END_IN = t

    css, layers = [], []

    def slide(name, a, b, y_from, y_to, delay=0.0):
        a += delay; b += delay
        css.append(f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateY({y_from}px); opacity: 0; animation-timing-function: {EASE_IN}; }}
  {pct(a + IN)}% {{ transform: translateY(0px); opacity: 1; animation-timing-function: linear; }}
  {pct(b)}% {{ transform: translateY(0px); opacity: 1; animation-timing-function: {EASE_OUT}; }}
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

    def wrap(idn, style, content, fid=None):
        inner = "\n".join(content)
        if fid:
            inner = f'<g filter="url(#{fid})">\n{inner}\n</g>'
        return f'<g id="{idn}" style="{style}">\n{inner}\n</g>'

    for (a, b), i in zip(slots, order):
        if i <= 2:      # white falls top -> bottom, green rises bottom -> top
            fid, w = parts[f"s{i}w"]
            _, g = parts[f"s{i}g"]
            layers.append(wrap(f"s{i}w", slide(f"kf_s{i}w", a, b, -90, 90), w, fid))
            layers.append(wrap(f"s{i}g", slide(f"kf_s{i}g", a, b, 90, -90, 0.12), g, fid))
        else:           # "Step N:" ducks in and out the top, headline in and out the bottom
            _, lbl = parts[f"s{i}l"]
            fid, h = parts[f"s{i}h"]
            layers.append(wrap(f"s{i}l", slide(f"kf_s{i}l", a, b, -50, -50), lbl))
            layers.append(wrap(f"s{i}h", slide(f"kf_s{i}h", a, b, 90, 90, 0.10), h, fid))

    e = parts['s6']
    end = [('e_bg',    e['grad'],  END_IN),        # scrim and logo rise together so the
           ('e_logo',  e['logo'],  END_IN),        # brand mark never dips during the swap
           ('e_rule',  e['rule'],  END_IN + 0.30),
           ('e_3',     e['three'], END_IN + 0.30),
           ('e_steps', e['steps'], END_IN + 0.30),
           ('e_tag',   e['tag'],   END_IN + 0.50)]
    end_svg = [f'<g id="{n}" style="{fade("kf_" + n, t)}">\n{c}\n</g>' for n, c, t in end]

    css.append("""@keyframes kf_cta_bob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}""")
    end_svg.append(f'''<g id="e_cta" style="{fade("kf_e_cta", END_IN + 0.70)}">
<g id="e_cta_bob">
{e['cta']}
{e['ctatx']}
</g>
</g>''')

    chrome_rule = fade("kf_chrome_rule", 0.30, 0.6, out=END_IN)

    html = f"""<title>3 Steps Leaderboard</title>
<style>
  :root {{ color-scheme: light; }}
  html, body {{ margin: 0; background: #111; }}

  #ad {{
    position: relative;
    width: 728px; height: 90px;
    margin: 0 auto;
    overflow: hidden;
    background: #132504;
  }}
  #ad svg {{ position: absolute; inset: 0; width: 100%; height: 100%; }}

  /* The photo strip from the source art becomes a panning video, clipped to
     the left 157px and sandwiched between the gradient scrim and the copy.
     The asset is pre-framed at 186x90 so it maps 1:1 with no cover-crop. */
  #photo {{
    position: absolute;
    left: 0; top: 0;
    width: 157px; height: 90px;
    overflow: hidden;
  }}
  #photo video {{
    position: absolute;
    left: -29px; top: 0;
    width: 186px; height: 90px;
    object-fit: cover;
    display: block;
    will-change: transform;
    animation: kf_bg_pan {LOOP}s linear infinite;
  }}
  @keyframes kf_bg_pan {{
    0%   {{ transform: translateX(0px); }}
    100% {{ transform: translateX(29px); }}
  }}

  #ad g[id] {{ will-change: transform, opacity; }}
  #e_cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out infinite; }}

{chr(10).join(css)}
</style>

<div id="ad">

  <!-- 1. gradient scrim (sits under the video, as in the source art) -->
  <svg id="base" viewBox="0 0 728 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="840" height="127.703" transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 863 -18.8513)" fill="url(#{shared['grad_id']})"/>
    <defs>{shared['grad']}</defs>
  </svg>

  <!-- 2. panning video -->
  <div id="photo">
    <video src="{VIDEO}" autoplay muted loop playsinline preload="auto"></video>
  </div>

  <!-- 3. copy, chrome and end card -->
  <svg id="art" viewBox="0 0 728 90" fill="none"
       xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g clip-path="url(#ad_clip)">

{chr(10).join(layers)}

      <!-- persistent brand mark; the divider retires with the copy -->
      <line id="chrome_rule" style="{chrome_rule}" opacity="0.52" x1="523.631" y1="77" x2="523.631" y2="13" stroke="white" stroke-width="0.737636"/>
      <rect x="548" y="15" width="157" height="62.3974" fill="url(#LOGO)"/>

      <!-- end card, derived from "728x90 - 6.svg" -->
{chr(10).join(end_svg)}
    </g>
    <defs>
      <clipPath id="ad_clip"><rect width="728" height="90" fill="white"/></clipPath>
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
