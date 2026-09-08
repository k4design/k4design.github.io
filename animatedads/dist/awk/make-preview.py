#!/usr/bin/env python3
"""Regenerate the AWK preview (preview.html) and the standalone review site
(../../agentwhoknows/preview-site + .zip). Run from dist/awk/."""
import os, re, html, shutil, subprocess
def kb(p): return f"{os.path.getsize(p)/1024:.0f} KB"
ADS=[("AWK_NC_CC_EXT_300x250_v1", "v1 · single frame · house exterior",      "House-exterior footage (no people) in a top band; one held composition: question, resolution, CTA, logo.", None),
     ("AWK_NC_CC_EXT_300x250_v2", "v2 · five frames · construction_ext",     "Full-bleed opener → question in two frames → resolution → held composite. Panel 75 %, video fixed.", "people in footage – brief §6"),
     ("AWK_NC_CC_EXT_300x250_v3", "v3 · five frames · newconstruction_2",    "Same cut, framed-house footage (no people). Video 340×250 centred and fixed.", None),
     ("AWK_NC_CC_EXT_300x250_v1c","v1c · single frame · agentwhoknows_c",    "v1 layout with the agentwhoknows_c footage in the top band.", None),
     ("AWK_NC_CC_EXT_300x250_v2c","v2c · five frames · agentwhoknows_c",     "v2 cut with the agentwhoknows_c footage (15 s ping-pong).", None),
     ("AWK_NC_CC_EXT_728x90_v1", "728 · v1 · house exterior",              "Leaderboard: short question → resolution → held composite. 160 px strip, 30 px pan.", None),
     ("AWK_NC_CC_EXT_728x90_v2", "728 · v2 · construction_ext",            "Same cut, construction_ext strip.", "people in footage – brief §6"),
     ("AWK_NC_CC_EXT_728x90_v3", "728 · v3 · newconstruction_2",           "Same cut, framed-house strip (Lanczos from 1080p).", None),
     ("AWK_NC_CC_EXT_728x90_v4", "728 · v4 · agentwhoknows_c",             "Same cut, streetscape strip.", None),
     ("AWK_NC_CC_EXT_320x50_v1", "320 · v1 · house exterior",              "Mobile banner: question → resolution → end card: panel slides over the strip, stacked logo left, question centred, CTA right. Reuses the 728 video.", None),
     ("AWK_NC_CC_EXT_320x50_v2", "320 · v2 · construction_ext",            "Same cut, construction_ext strip.", "people in footage – brief §6"),
     ("AWK_NC_CC_EXT_320x50_v3", "320 · v3 · newconstruction_2",           "Same cut, framed-house strip.", None),
     ("AWK_NC_CC_EXT_320x50_v4", "320 · v4 · agentwhoknows_c",             "Same cut, streetscape strip.", None)]
ADS=ADS+[(f+"_HD", l+" · HD", "HD build: same unit, video at 2× resolution (up to 700 KB zipped).", fl) for f,l,n,fl in ADS]
ADS=[a for a in ADS if os.path.isdir(a[0])]
def tier(f): return "HD · up to 700 KB zipped" if f.endswith("_HD") else "Lite · under 200 KB zipped"
def size_of(folder):
    m=re.search(r'_(\d+)x(\d+)_', folder); return int(m.group(1)), int(m.group(2))
def embed(folder, prefix=""):
    s=open(f"{folder}/index.html").read()
    return html.escape(re.sub(r'(src|poster)="(bg-[^"]+)"', lambda m: f'{m.group(1)}="{prefix}{folder}/{m.group(2)}"', s), quote=True)
def card(f,label,notes,flag,site):
    return f"""
    <section class="card" style="--w:{max(size_of(f)[0],300)}px">
      <div class="frame" style="width:{size_of(f)[0]}px;height:{size_of(f)[1]}px"><iframe srcdoc="{embed(f)}" width="{size_of(f)[0]}" height="{size_of(f)[1]}" scrolling="no" title="{label}"></iframe></div>
      <div class="meta">
        <div class="title"><span>{label}</span>{f'<span class="flag" title="{flag}">⚑ {flag}</span>' if flag else ''}</div>
        <p class="notes">{notes}</p>
        <div class="fileinfo">zip <b>{kb(f+'.zip')}</b> · video <b>{kb(f+'/bg-'+str(size_of(f)[0])+'x'+str(size_of(f)[1])+'.mp4')}</b> · <a href="{f}/index.html" target="_blank">open alone</a>{(' · <a href="downloads/'+f+'.zip" download>zip</a> · <a href="downloads/'+f+'_backup.jpg" download>backup</a>') if site else (' · <a href="'+f+'.zip">zip</a>')}</div>
      </div>
      <div class="transport">
        <button class="play" type="button" aria-label="Play / pause">❚❚</button>
        <button class="replay" type="button" aria-label="Replay">↺ Replay</button>
        <input class="scrub" type="range" min="0" max="15000" step="16" value="0" aria-label="Timeline">
        <span class="time">0.0 s</span>
        <span class="loop">connecting…</span>
      </div>
    </section>"""
def page(site):
    cards=""
    for t in ("HD · up to 700 KB zipped","Lite · under 200 KB zipped"):
        T=[a for a in ADS if tier(a[0])==t]
        if not T: continue
        sizes=sorted({size_of(f) for f,*_ in T}, key=lambda s:(-s[1],-s[0]))
        cards+=f"""
  <section class="tier"><h2 class="tier-h">{t} <span>· {len(T)} units</span></h2>"""+"".join(f"""
  <section class="size"><h2>{w}×{h} <span>· {sum(1 for f,*_ in T if size_of(f)==(w,h))} units</span></h2>
  <div class="grid">{"".join(card(*a,site) for a in T if size_of(a[0])==(w,h))}
  </div></section>""" for w,h in sizes)+"""
  </section>"""
    controller=open("../preview-controller.js").read()
    foot = ("Standalone review site: open <code>index.html</code> straight from Finder or host the folder as-is. The units are embedded from the folders beside this file; each card links to the shippable <code>index.html</code>, the StackAdapt zip and the backup image under <code>downloads/</code>."
            if site else "The units are embedded from their folders (assets stream from the folders beside this file), so this page works opened straight from Finder as well as over a server.")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentWhoKnows · display builds</title>
<style>
  :root {{ --bg:#0d1020; --panel:#141b33; --line:#27304f; --ink:#eef0f6; --muted:#9aa3bd; --gold:#c8861a; }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 -apple-system,"Segoe UI",Inter,Helvetica,Arial,sans-serif; }}
  header {{ display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:22px 28px 6px; flex-wrap:wrap; }}
  h1 {{ font-size:18px; font-weight:600; margin:0; }} h1 span {{ color:var(--muted); font-weight:400; }}
  .global {{ display:flex; gap:10px; align-items:center; color:var(--muted); font-size:13px; }}
  button {{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:6px 11px; font:inherit; cursor:pointer; }}
  button:hover {{ border-color:var(--gold); }} button.play {{ min-width:40px; }} button:disabled {{ opacity:.4; cursor:default; }}
  main {{ padding:12px 28px 40px; }} .size + .size {{ margin-top:36px; padding-top:28px; border-top:1px solid var(--line); }}
  .tier + .tier {{ margin-top:48px; padding-top:32px; border-top:2px solid var(--line); }} h2.tier-h {{ font-size:20px; margin:0 0 22px; }}
  .size h2 {{ font-size:16px; font-weight:600; margin:0 0 14px; letter-spacing:.01em; }} .size h2 span {{ color:var(--muted); font-weight:400; }}
  .grid {{ display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start; }}
  .card {{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; width:max-content; max-width:100%; }} .meta, .transport {{ max-width:var(--w); }}
  .frame {{ background:#000; border-radius:4px; overflow:hidden; box-shadow:0 0 0 1px #000; }} iframe {{ display:block; border:0; }}
  .meta {{ margin-top:12px; }} .title {{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-weight:600; }}
  .flag {{ font-size:11px; font-weight:500; color:#f0b45a; border:1px solid rgba(200,134,26,.5); border-radius:999px; padding:1px 8px; }}
  .notes {{ margin:6px 0 0; font-size:12.5px; color:#c5cbe0; }} .fileinfo {{ color:var(--muted); font-size:12px; margin-top:6px; }} .fileinfo b {{ color:var(--ink); font-weight:600; }} .fileinfo a {{ color:var(--gold); text-decoration:none; }}
  .transport {{ display:grid; grid-template-columns:auto auto 1fr auto; grid-template-areas:"play replay scrub time" "loop loop loop loop"; gap:6px 8px; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }}
  .play {{ grid-area:play; }} .replay {{ grid-area:replay; }} .scrub {{ grid-area:scrub; width:100%; accent-color:var(--gold); }} .time {{ grid-area:time; font-variant-numeric:tabular-nums; color:var(--muted); font-size:12px; min-width:44px; text-align:right; }}
  .loop {{ grid-area:loop; font-size:11.5px; color:var(--muted); }} .loop.hold {{ color:var(--gold); }} .loop.err {{ color:#ff7b7b; }}
  footer {{ color:var(--muted); font-size:12px; padding:0 28px 30px; max-width:1000px; }}
  @media (prefers-color-scheme: light) {{ :root {{ --bg:#f3f4f8; --panel:#fff; --line:#dadfe9; --ink:#141b33; --muted:#5d6580; }} .notes {{ color:#3a4160; }} .frame {{ box-shadow:0 0 0 1px #ccd; }} }}
</style>
</head>
<body>
<header>
  <h1>AgentWhoKnows <span>· New Construction · 300×250 · 728×90 · 320×50</span></h1>
  <div class="global"><span>Each ad plays twice, then holds its final frame.</span><button id="replayAll" type="button">↺ Replay all</button></div>
</header>
<main>{cards}
</main>
<footer>{foot} The preview caps each ad at <b>2</b> loops and holds the final frame; shipping units keep their own cap. The timeline scrubs one 15 s loop, driving the ad's real animations and video.</footer>
<script>
{controller}
</script>
</body>
</html>
"""
open("preview.html","w").write(page(site=False)); print("preview.html:", len(ADS), "ads")
# ---- standalone site
SITE="../../agentwhoknows/preview-site"
shutil.rmtree(SITE, ignore_errors=True); os.makedirs(f"{SITE}/downloads")
for f,_,_,_ in ADS:
    shutil.copytree(f, f"{SITE}/{f}"); shutil.copy(f"{f}.zip", f"{SITE}/downloads/"); shutil.copy(f"{f}_backup.jpg", f"{SITE}/downloads/")
open(f"{SITE}/index.html","w").write(page(site=True))
open(f"{SITE}/README.txt","w").write("""AgentWhoKnows - New Construction - 300x250 review site
======================================================
index.html                the preview page (open directly, or host this folder as-is)
AWK_NC_CC_EXT_300x250_*/  the HTML5 units (index.html + video + still) - the page embeds these
downloads/                StackAdapt zips (index.html at the zip root) and backup images

Preview: each ad plays twice then holds its final frame; per-ad play/pause, replay and a
15 s timeline drive the real ad's animations and video. Shipping units keep their 3-loop cap.
Copy: brief Q2 (closing-costs track, no number). Fonts are stand-ins (Avenir Next for Omnes,
Helvetica Neue for Inter) as vector outlines - swap when the font files arrive.
v2 footage contains people (brief section 6 - flagged); the other cuts do not.
""")
subprocess.run(["zip","-q","-r","-X","preview-site.zip","preview-site","-x",".DS_Store"], cwd="../../agentwhoknows", check=True)
print("site rebuilt:", SITE, "+ preview-site.zip")
