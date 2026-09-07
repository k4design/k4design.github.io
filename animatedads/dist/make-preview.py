#!/usr/bin/env python3
"""Regenerate lite-preview.html - every lite build, live in an iframe, with current sizes. Run from dist/."""
import os
def kb(p): return f"{os.path.getsize(p)/1024:.0f} KB"
builds = [
  ("300x250","300x250/lite",       "Couple",  "Couple footage, wide framing", "300x250/buymyhouse_300x250_lite.zip",
   "Steps first, “Cash Offer / Fast” closes and holds. Green step words in Cormorant Garamond Bold Italic. 15 s MP4."),
  ("300x250","300x250/lite-house", "House",   "house_bg.webm footage",        "300x250/buymyhouse_300x250_lite-house.zip",
   "Same edit. 5.2 s clip played as a 15 s ping-pong (push-in, then pull-out) – no cuts."),
  ("728x90", "728x90/lite",        "Couple",  "Couple master footage",        "728x90/buymyhouse_728x90_lite.zip",
   "5-frame cut. Wide framing (laptop in shot), no pan, inner shadow on the strip’s right edge. End card holds from 9.8 s."),
  ("728x90", "728x90/lite-house",  "House",   "house_bg.webm footage",        "728x90/buymyhouse_728x90_lite-house.zip",
   "Same edit, house footage as a 15 s ping-pong, inner shadow on the strip."),
  ("320x50", "320x50/lite",        "No video","HTML only",                    "320x50/buymyhouse_320x50_lite.zip",
   "Video removed, layout re-spaced. Step icons (house / contract / review) fade with each step. End card: 3 steps · Fast, simple, stress-free · larger CTA · smaller logo cross-faded in. Also Google Ads-eligible."),
]
cards={}
for size,folder,label,footage,zipf,notes in builds:
    w,h=size.split("x"); vid=[f for f in os.listdir(folder) if f.endswith(".mp4")]
    vidtxt=f"video {kb(os.path.join(folder,vid[0]))}" if vid else "no video"
    cards.setdefault(size,[]).append(f"""
      <figure class="card" style="--w:{w}px">
        <div class="frame" style="width:{w}px;height:{h}px"><iframe src="{folder}/index.html" width="{w}" height="{h}" scrolling="no" title="{size} {label}"></iframe></div>
        <figcaption>
          <div class="title"><span class="size">{size}</span><span class="tag">{label}</span></div>
          <div class="meta">{footage} · zip <b>{kb(zipf)}</b> · {vidtxt}</div>
          <p class="notes">{notes}</p>
          <div class="links"><a href="{folder}/index.html" target="_blank">open alone</a><a href="{zipf}">zip</a><a href="{folder}/">folder</a></div>
        </figcaption>
      </figure>""")
sections="".join(f"""
    <section>
      <h2>{size}<small>{len(cs)} build{'s' if len(cs)>1 else ''}</small></h2>
      <div class="row">{''.join(cs)}</div>
    </section>""" for size,cs in cards.items())
html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>buymyhouse · lite builds</title>
<style>
  :root {{ color-scheme: dark; --bg:#0f1210; --panel:#161a17; --line:#262c28; --ink:#e6e9e4; --muted:#9aa39c; --green:#2CC679; }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif; }}
  header {{ display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:22px 28px 6px; flex-wrap:wrap; }}
  h1 {{ font-size:18px; font-weight:600; margin:0; letter-spacing:.01em; }}
  h1 span {{ color:var(--muted); font-weight:400; }}
  .controls {{ display:flex; gap:10px; align-items:center; color:var(--muted); font-size:13px; }}
  button {{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:7px 12px; font:inherit; cursor:pointer; }}
  button:hover {{ border-color:var(--green); }}
  main {{ padding:6px 28px 40px; }}
  section {{ margin-top:22px; }}
  h2 {{ font-size:13px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin:0 0 12px; display:flex; gap:10px; align-items:baseline; }}
  h2 small {{ font-weight:400; text-transform:none; letter-spacing:0; font-size:12px; }}
  .row {{ display:flex; flex-wrap:wrap; gap:18px; align-items:flex-start; }}
  .card {{ margin:0; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; width:max-content; max-width:100%; }}
  .frame {{ background:#000; border-radius:4px; overflow:hidden; box-shadow:0 0 0 1px #000; }}
  iframe {{ display:block; border:0; }}
  figcaption {{ margin-top:12px; max-width:var(--w); min-width:260px; }}
  .title {{ display:flex; gap:8px; align-items:center; }}
  .size {{ font-weight:600; font-variant-numeric:tabular-nums; }}
  .tag {{ font-size:12px; color:var(--green); border:1px solid color-mix(in srgb, var(--green) 40%, transparent); border-radius:999px; padding:1px 8px; }}
  .meta {{ color:var(--muted); font-size:12.5px; margin-top:4px; }}
  .meta b {{ color:var(--ink); font-weight:600; }}
  .notes {{ margin:8px 0 0; font-size:12.5px; color:#c3cac4; }}
  .links {{ display:flex; gap:12px; margin-top:8px; font-size:12px; }}
  .links a {{ color:var(--green); text-decoration:none; }}
  .links a:hover {{ text-decoration:underline; }}
  footer {{ color:var(--muted); font-size:12px; padding:0 28px 30px; }}
  @media (prefers-color-scheme: light) {{ :root {{ color-scheme:light; --bg:#f4f5f3; --panel:#fff; --line:#dde2dd; --ink:#161a17; --muted:#5f6a62; }} .notes {{ color:#3d453f; }} }}
</style>
</head>
<body>
<header>
  <h1>buymyhouse <span>· HTML5 lite builds</span></h1>
  <div class="controls"><span id="clock">—</span><button id="restart" type="button">Restart all loops</button></div>
</header>
<main>{sections}
</main>
<footer>Each unit is the live <code>index.html</code> from its folder, so this page always shows the current build. Every loop is 15 s; “Restart all loops” reloads the units together so their timelines line up.</footer>
<script>
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe')), t0 = Date.now();
  function restart() {{ frames.forEach(function (f) {{ f.src = f.getAttribute('src'); }}); t0 = Date.now(); }}
  document.getElementById('restart').addEventListener('click', restart);
  setInterval(function () {{ var s = ((Date.now() - t0) / 1000) % 15; document.getElementById('clock').textContent = 'loop ' + s.toFixed(1) + ' s / 15'; }}, 100);
</script>
</body>
</html>
"""
open("lite-preview.html","w").write(html); print("lite-preview.html regenerated")
