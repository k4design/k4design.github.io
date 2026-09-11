#!/usr/bin/env python3
"""Aperture carousel units - preview page. Run from dist/parque/.
Parque das Nacoes ships in two languages, so the page is sectioned EN video / EN carousel / PT video / PT carousel."""
import os, re, html
def kb(p): return f"{os.path.getsize(p)/1024:.0f} KB"
ORDER=["768x1024","1024x768","480x320","970x250","320x480","300x600"]
NOTES={"768x1024":"Master unit built from the Figma frames 1/3/4. 4-image carousel (arrows, dots, swipe), copy loops every 7.5 s, CTA is the only click-through.",
       "1024x768":"Landscape: video to the top edge, 134 px panel below - logo | rule | headline + rotating text | CTA, auto-fit so nothing crowds the button.","480x320":"Small landscape, the same row structure as 1024x768 at reduced scale.",
       "970x250":"Billboard: photo left (592 px), one-pass 15 s story right - icon group, then logo, then headline + rotating text, ending on the three-group frame.","320x480":"Portrait, the 768x1024 proportions at 320 wide.","300x600":"Half page: taller 300x300 photo band."}
LANGS=[("en","English"),("pt","Portugu\u00eas")]
ADS=[(f"APERTURE_ParqueDasNacoes_{s}_{kind}_{lg}", s, kind, lg)
     for lg,_ in LANGS for kind in ("video","carousel") for s in ORDER
     if os.path.isdir(f"APERTURE_ParqueDasNacoes_{s}_{kind}_{lg}")]
def embed(folder):
    s=open(f"{folder}/index.html").read()
    s=re.sub(r'url\((bg\.jpg)\)', lambda m: f'url({folder}/{m.group(1)})', s)
    s=re.sub(r'src="(photo\d\.jpg)"', lambda m: f'src="{folder}/{m.group(1)}"', s)
    s=re.sub(r'(src|poster)="(video[^"]*|photo\d\.jpg)"', lambda m: f'{m.group(1)}="{folder}/{m.group(2)}"', s)
    return html.escape(s, quote=True)
import sys, shutil, subprocess
SITE = len(sys.argv)>1 and sys.argv[1]=='--site'
def card(f,size,kind,lg):
    w,h=size.split("x"); return f"""
    <section class="card" style="--w:{max(int(w),300)}px">
      <div class="frame" style="width:{w}px;height:{h}px"><iframe srcdoc="{embed(f)}" width="{w}" height="{h}" scrolling="no" title="Aperture {size} {lg}"></iframe></div>
      <div class="meta">
        <div class="title"><span class="size">{size}</span><span class="tag">{kind}</span><span class="tag lang">{lg.upper()}</span></div>
        <p class="notes">{NOTES.get(size,"") if kind=="carousel" else "Video version: the two listing clips as a 15 s silent H.264 loop; if autoplay is refused (Safari Low Power Mode) the 4-photo carousel underneath takes over as the fallback."}</p>
        <div class="fileinfo">zip <b>{kb(f+'.zip')}</b> · <a href="{f}/{'ad.html' if SITE else 'index.html'}" target="_blank">open alone</a> · <a href="{'downloads/' if SITE else ''}{f}.zip" download>zip</a> · <a href="{'downloads/' if SITE else ''}{f}_backup.jpg" download>backup</a></div>
      </div>
      <div class="transport"><button class="play" type="button" disabled>▶</button><button class="replay" type="button" disabled>↺ Replay</button><input class="scrub" type="range" min="0" max="15000" step="50" value="0" disabled><span class="time">0.0 s</span><span class="loop">loading…</span></div>
    </section>"""
controller=open("../preview-controller.js").read()
page=f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Aperture · Parque das Nações · EN + PT builds</title>
<style>
  :root {{ --bg:#0b0f16; --panel:#131a26; --line:#25304a; --ink:#f0f3f8; --muted:#8d97ad; --blue:#4090EF; }}
  html,body {{ margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 -apple-system,"Segoe UI",Inter,Helvetica,Arial,sans-serif; }}
  header {{ position:sticky; top:0; z-index:20; background:var(--bg); display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 28px 12px; flex-wrap:wrap; border-bottom:1px solid var(--line); box-shadow:0 6px 18px rgba(0,0,0,.35); }}
  h1 {{ font-size:18px; font-weight:600; margin:0; }} h1 span {{ color:var(--muted); font-weight:400; }}
  .global {{ display:flex; gap:10px; align-items:center; color:var(--muted); font-size:13px; }}
  button {{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:6px 11px; font:inherit; cursor:pointer; }} button:hover {{ border-color:var(--blue); }} button.play {{ min-width:40px; }} button:disabled {{ opacity:.4; cursor:default; }}
  main {{ padding:12px 28px 40px; }} .grid {{ display:flex; flex-direction:column; gap:24px; align-items:flex-start; }}   /* one unit per row */ h2.tier-h {{ font-size:20px; margin:22px 0 14px; }} h2.tier-h + .grid {{ }} .grid + h2.tier-h {{ margin-top:44px; padding-top:30px; border-top:2px solid var(--line); }}
  .card {{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; width:max-content; max-width:100%; }} .meta,.transport {{ max-width:var(--w); }}
  .frame {{ background:#000; border-radius:4px; overflow:hidden; box-shadow:0 0 0 1px #000; }} iframe {{ display:block; border:0; }}
  .meta {{ margin-top:12px; }} .title {{ display:flex; gap:8px; align-items:center; font-weight:600; }} .tag.lang {{ color:#c9a35a; border-color:rgba(201,163,90,.5); }}
  .tag {{ font-size:11px; font-weight:500; color:var(--blue); border:1px solid rgba(64,144,239,.5); border-radius:999px; padding:1px 8px; }}
  .notes {{ margin:6px 0 0; font-size:12.5px; color:#c5cbe0; }} .fileinfo {{ color:var(--muted); font-size:12px; margin-top:6px; }} .fileinfo b {{ color:var(--ink); font-weight:600; }} .fileinfo a {{ color:var(--blue); text-decoration:none; }}
  .transport {{ display:grid; grid-template-columns:auto auto 1fr auto; grid-template-areas:"play replay scrub time" "loop loop loop loop"; gap:6px 8px; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }}
  .play {{ grid-area:play; }} .replay {{ grid-area:replay; }} .scrub {{ grid-area:scrub; width:100%; accent-color:var(--blue); }} .time {{ grid-area:time; font-variant-numeric:tabular-nums; color:var(--muted); font-size:12px; min-width:44px; text-align:right; }}
  .loop {{ grid-area:loop; font-size:11.5px; color:var(--muted); }} .loop.hold {{ color:var(--blue); }} .loop.err {{ color:#ff7b7b; }}
  footer {{ color:var(--muted); font-size:12px; padding:0 28px 30px; max-width:1000px; }}
</style></head><body>
<header><h1>Aperture <span>· Parque das Nações · English + Português · carousel &amp; video · {len(ADS)} units</span></h1>
  <div class="global"><span>Each unit loops every 7.5 s; the preview plays two loops then holds.</span><button id="replayAll" type="button">↺ Replay all</button><button id="lastAll" type="button">⏭ Last frame</button></div></header>
<main>{"".join(f'<h2 class="tier-h">{label} · Video</h2><div class="grid">' + "".join(card(f,s,k,l) for f,s,k,l in ADS if k=="video" and l==code) + f'</div><h2 class="tier-h">{label} · Carousel</h2><div class="grid">' + "".join(card(f,s,k,l) for f,s,k,l in ADS if k=="carousel" and l==code) + "</div>" for code,label in LANGS)}</main>
<footer>Four listing photos rotate in each carousel. The arrows, dots and swipe work inside each preview; only the underlined CTA is the click-through. Zips sit beside the folders.</footer>
<script>
{controller}
</script></body></html>"""
if not SITE:
    open("preview.html","w").write(page); print("preview.html:", len(ADS), "units")
else:
    S="preview-site"; shutil.rmtree(S, ignore_errors=True); os.makedirs(f"{S}/downloads")
    for f,_,_,_ in ADS:
        shutil.copytree(f, f"{S}/{f}"); os.rename(f"{S}/{f}/index.html", f"{S}/{f}/ad.html")   # site copies: only the preview page is an index.html (Netlify)
        shutil.copy(f"{f}.zip", f"{S}/downloads/"); shutil.copy(f"{f}_backup.jpg", f"{S}/downloads/")
    open(f"{S}/index.html","w").write(page)
    open(f"{S}/README.txt","w").write("""Aperture Global Real Estate - Parque das Nacoes - HTML5 carousel + video ads, review site (English and Portuguese)
Open index.html in any browser (double-click; no server needed). Six sizes in two languages play side by side with play/pause, replay and a 15 s scrubber;
each card links to the unit (ad.html - the shippable zips in downloads/ keep index.html at their root), its StackAdapt zip and a backup image (downloads/).
The carousel arrows, dots and swipe work inside the previews. Only the underlined CTA ('Schedule a viewing' / 'Agendar visita') is the click-through.
Four listing photos (ParqueDasNacoes 1-4) rotate in each carousel.
""")
    if os.path.exists("preview-site.zip"): os.remove("preview-site.zip")
    subprocess.run(["zip","-q","-r","-X","preview-site.zip",S,"-x",".DS_Store"],check=True)                       # for colleagues: unzips to a folder
    if os.path.exists("preview-site-netlify.zip"): os.remove("preview-site-netlify.zip")
    subprocess.run(["zip","-q","-r","-X","../preview-site-netlify.zip",".","-x",".DS_Store"],cwd=S,check=True)   # for Netlify Drop: index.html at the zip root
    print("site:", S, "+ preview-site.zip", f"{os.path.getsize('preview-site.zip')/1024/1024:.1f} MB", "+ preview-site-netlify.zip (flat root)")
