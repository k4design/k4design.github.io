#!/usr/bin/env python3
"""Regenerate lite-preview.html: every lite build embedded (works from Finder), with a per-ad
transport - plays twice then holds the final frame, play/pause, replay, 15 s timeline. Run from dist/."""
import os, re, html
def kb(p): return f"{os.path.getsize(p)/1024:.0f} KB"
builds = [
  ("300x250","300x250/lite",       "Couple",  "Couple footage, wide framing", "300x250/buymyhouse_300x250_lite.zip",
   "Steps first, “Cash Offer / Fast” closes and holds. Green step words in Cormorant Garamond Bold Italic."),
  ("300x250","300x250/lite-couple2","Couple 2","couple_2.webm footage",        "300x250/buymyhouse_300x250_lite-couple2.zip",
   "Same edit. 832×464 source, cover-cropped to the 390×250 pan region with a light contrast lift, flipped horizontally; 5.2 s clip as a 15 s ping-pong, 64 kbps."),
  ("300x250","300x250/lite-house", "House",   "house_bg.webm footage",        "300x250/buymyhouse_300x250_lite-house.zip",
   "Same edit. 5.2 s clip played as a 15 s ping-pong – no cuts."),
  ("728x90", "728x90/lite",        "Couple",  "Couple master footage",        "728x90/buymyhouse_728x90_lite.zip",
   "5-frame cut. Wide framing (laptop in shot), no pan, inner shadow on the strip. End card holds from 9.8 s."),
  ("728x90", "728x90/lite-house",  "House",   "house_bg.webm footage",        "728x90/buymyhouse_728x90_lite-house.zip",
   "Same edit, house footage as a 15 s ping-pong, inner shadow on the strip."),
  ("300x250","300x250/hd",         "Couple HD","Couple footage, 780×500 video", "300x250/buymyhouse_300x250_hd.zip",
   "Same unit as Couple with a 2× (retina) video at 300 kbps. Zip ≤ 700 KB."),
  ("300x250","300x250/hd-couple2",  "Couple 2 HD","couple_2.webm, 780×500 video","300x250/buymyhouse_300x250_hd-couple2.zip",
   "Same unit as Couple 2 with a 2× video at 300 kbps. Zip ≤ 700 KB."),
  ("300x250","300x250/hd-house",    "House HD","house_bg.webm, 780×500 video",  "300x250/buymyhouse_300x250_hd-house.zip",
   "Same unit as House with a 2× video at 300 kbps. Zip ≤ 700 KB."),
  ("728x90", "728x90/hd",           "Couple HD","Couple master, 372×180 video",  "728x90/buymyhouse_728x90_hd.zip",
   "Same unit as Couple with a 2× strip video at 200 kbps. Zip ≤ 700 KB."),
  ("728x90", "728x90/hd-house",     "House HD","house_bg.webm, 372×180 video",  "728x90/buymyhouse_728x90_hd-house.zip",
   "Same unit as House with a 2× strip video at 200 kbps. Zip ≤ 700 KB."),
  ("320x50", "320x50/lite",        "No video","HTML only",                    "320x50/buymyhouse_320x50_lite.zip",
   "Video removed, layout re-spaced. Step icons fade with each step. End card: 3 steps · Fast, simple, stress-free · CTA · logo."),
  ("970x250","970x250/hd",         "Couple HD","Couple master, 780×500 video (300x250 HD asset)", "970x250/buymyhouse_970x250_hd.zip",
   "Billboard. 360 px strip left with a 30 px pan, copy at 1.65×, logo bottom right. End card on two rows: 3 steps | tag, then the CTA."),
  ("970x90", "970x90/hd",          "Couple HD","Couple master, 372×180 video (728x90 HD asset)",  "970x90/buymyhouse_970x90_hd.zip",
   "Super leaderboard. The 728x90 layout re-spaced across 970: 186 px strip, copy at 1.25×, end card at 1.25×, logo right."),
  ("300x600","300x600/hd",         "Couple HD","Couple master, 780×500 video (300x250 HD asset)", "300x600/buymyhouse_300x600_hd.zip",
   "Half page. 320 px video band fading into the panel, copy at 0.85×, CTA and logo persistent. End card: 3 steps at 1.5× + tag."),
  ("160x600","160x600/hd",         "Couple HD","Couple master, 780×500 video (300x250 HD asset)", "160x600/buymyhouse_160x600_hd.zip",
   "Skyscraper. 220 px video band, headlines on two lines (white, then green), CTA and logo persistent. End card: 3 steps + tag stacked."),
]
def embed(folder):
    s=open(f"{folder}/index.html").read()
    s=re.sub(r'(src|poster)="(bg-[^"]+)"', lambda m: f'{m.group(1)}="{folder}/{m.group(2)}"', s)
    return html.escape(s, quote=True)
cards={}
for size,folder,label,footage,zipf,notes in builds:
    w,h=size.split("x"); vid=[f for f in os.listdir(folder) if f.endswith(".mp4")]
    vidtxt=f"video {kb(os.path.join(folder,vid[0]))}" if vid else "no video"
    tier="HD · up to 700 KB zipped" if os.path.basename(folder).startswith("hd") else "Lite · under 200 KB zipped"
    cards.setdefault(tier,{}).setdefault(size,[]).append(f"""
      <section class="card" style="--w:{max(int(w),300)}px">
        <div class="frame" style="width:{w}px;height:{h}px"><iframe srcdoc="{embed(folder)}" width="{w}" height="{h}" scrolling="no" title="{size} {label}"></iframe></div>
        <figcaption>
          <div class="title"><span class="size">{size}</span><span class="tag">{label}</span></div>
          <div class="meta">{footage} · zip <b>{kb(zipf)}</b> · {vidtxt} · <a href="{folder}/index.html" target="_blank">open alone</a> · <a href="{zipf}">zip</a></div>
          <p class="notes">{notes}</p>
        </figcaption>
        <div class="transport">
          <button class="play" type="button" aria-label="Play / pause">❚❚</button>
          <button class="replay" type="button" aria-label="Replay">↺ Replay</button>
          <input class="scrub" type="range" min="0" max="15000" step="16" value="0" aria-label="Timeline">
          <span class="time">0.0 s</span>
          <span class="loop">connecting…</span>
        </div>
      </section>""")
sections="".join(f"""
  <section class="tier">
    <h2 class="tier-h">{tier}<small>{sum(len(v) for v in sizes.values())} builds</small></h2>""" + "".join(f"""
    <section class="group">
      <h2>{size}<small>{len(cs)} build{'s' if len(cs)>1 else ''}</small></h2>
      <div class="row">{''.join(cs)}</div>
    </section>""" for size,cs in sizes.items()) + """
  </section>""" for tier,sizes in sorted(cards.items(), key=lambda kv: not kv[0].startswith("HD")))   # HD tier first
CONTROLLER = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview-controller.js")).read()
html_out=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>buymyhouse · lite builds</title>
<style>
  :root {{ color-scheme: dark; --bg:#0f1210; --panel:#161a17; --line:#262c28; --ink:#e6e9e4; --muted:#9aa39c; --green:#2CC679; }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif; }}
  header {{ position:sticky; top:0; z-index:20; background:var(--bg); display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 28px 12px; flex-wrap:wrap; border-bottom:1px solid var(--line); box-shadow:0 6px 18px rgba(0,0,0,.35); }}
  h1 {{ font-size:18px; font-weight:600; margin:0; letter-spacing:.01em; }} h1 span {{ color:var(--muted); font-weight:400; }}
  .controls {{ display:flex; gap:10px; align-items:center; color:var(--muted); font-size:13px; }}
  button {{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:6px 11px; font:inherit; cursor:pointer; }}
  button:hover {{ border-color:var(--green); }} button.play {{ min-width:40px; }} button:disabled {{ opacity:.4; cursor:default; }}
  main {{ padding:6px 28px 40px; }} .group {{ margin-top:22px; }} .tier + .tier {{ margin-top:40px; padding-top:28px; border-top:1px solid var(--line); }}
  h2.tier-h {{ font-size:17px; font-weight:600; color:var(--ink); text-transform:none; letter-spacing:.01em; margin:18px 0 4px; }}
  h2 {{ font-size:13px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin:0 0 12px; display:flex; gap:10px; align-items:baseline; }}
  h2 small {{ font-weight:400; text-transform:none; letter-spacing:0; font-size:12px; }}
  .row {{ display:flex; flex-wrap:wrap; gap:18px; align-items:flex-start; }}
  .card {{ margin:0; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; width:max-content; max-width:100%; }}
  .frame {{ background:#000; border-radius:4px; overflow:hidden; box-shadow:0 0 0 1px #000; }} iframe {{ display:block; border:0; }}
  figcaption {{ margin-top:12px; max-width:max(var(--w), 300px); min-width:280px; }}
  .title {{ display:flex; gap:8px; align-items:center; }} .size {{ font-weight:600; font-variant-numeric:tabular-nums; }}
  .tag {{ font-size:12px; color:var(--green); border:1px solid color-mix(in srgb, var(--green) 40%, transparent); border-radius:999px; padding:1px 8px; }}
  .meta {{ color:var(--muted); font-size:12.5px; margin-top:4px; }} .meta b {{ color:var(--ink); font-weight:600; }} .meta a {{ color:var(--green); text-decoration:none; }}
  .notes {{ margin:8px 0 0; font-size:12.5px; color:#c3cac4; }}
  .transport {{ display:grid; grid-template-columns:auto auto 1fr auto; grid-template-areas:"play replay scrub time" "loop loop loop loop"; gap:6px 8px; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); max-width:max(var(--w), 300px); }}
  .play {{ grid-area:play; }} .replay {{ grid-area:replay; }} .scrub {{ grid-area:scrub; width:100%; accent-color:var(--green); }}
  .time {{ grid-area:time; font-variant-numeric:tabular-nums; color:var(--muted); font-size:12px; min-width:44px; text-align:right; }}
  .loop {{ grid-area:loop; font-size:11.5px; color:var(--muted); }} .loop.hold {{ color:var(--green); }} .loop.err {{ color:#ff7b7b; }}
  footer {{ color:var(--muted); font-size:12px; padding:0 28px 30px; max-width:1000px; }}
  @media (prefers-color-scheme: light) {{ :root {{ color-scheme:light; --bg:#f4f5f3; --panel:#fff; --line:#dde2dd; --ink:#161a17; --muted:#5f6a62; }} .notes {{ color:#3d453f; }} }}
</style>
</head>
<body>
<header>
  <h1>buymyhouse <span>· HTML5 builds · lite &amp; HD · 300×250 · 728×90 · 320×50 · 970×250 · 970×90 · 300×600 · 160×600</span></h1>
  <div class="controls"><span>Each ad plays twice, then holds its final frame.</span><button id="replayAll" type="button">↺ Replay all</button><button id="lastAll" type="button">⏭ Last frame</button></div>
</header>
<main>{sections}
</main>
<footer>The units are embedded from their folders (assets stream from the folders beside this file), so this page works opened straight from Finder as well as over a server. The preview caps each ad at <b>2</b> loops and holds the final frame; shipping units loop as built. The timeline scrubs one 15 s loop, driving the ad's real animations and video.</footer>
<script>
{CONTROLLER}
</script>
</body>
</html>
"""
open("lite-preview.html","w").write(html_out); print("lite-preview.html regenerated:", f"{len(html_out)/1024:.0f} KB")
