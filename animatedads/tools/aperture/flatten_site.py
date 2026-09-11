#!/usr/bin/env python3
"""Flatten a review-site folder so every file sits at the root - no subfolders.

Each unit's files are prefixed with the unit name (APERTURE_..._video_bg.jpg), the unit
page becomes <unit>_ad.html, and every reference is rewritten to match: the links on the
preview page, the folder paths inside its iframe srcdoc, and the relative asset paths
inside each unit page. Zips and backup stills are pulled in beside them if they are
missing, so the download links resolve too.

Usage: flatten_site.py <sitedir> [assetsrc]
       assetsrc defaults to the site folder's parent (where the zips and backups live).
"""
import os, re, shutil, sys, html

site = os.path.abspath(sys.argv[1].rstrip("/"))
src = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.dirname(site)
index = os.path.join(site, "index.html")
if not os.path.exists(index): sys.exit(f"no index.html in {site}")

units = sorted(d for d in os.listdir(site)
               if os.path.isdir(os.path.join(site, d)) and d != "downloads")
if not units: sys.exit("already flat - no unit folders found")

moved = 0
for u in units:
    d = os.path.join(site, u)
    for f in sorted(os.listdir(d)):
        newname = f"{u}_ad.html" if f in ("ad.html", "index.html") else f"{u}_{f}"
        target = os.path.join(site, newname)
        if f.endswith(".html"):                       # rewrite the unit page's own asset paths
            s = open(os.path.join(d, f)).read()
            s = re.sub(r'url\((bg\.jpg)\)', lambda m: f'url({u}_{m.group(1)})', s)
            s = re.sub(r'(src|poster)="(bg\.jpg|photo\d\.jpg|video[^"]*)"',
                       lambda m: f'{m.group(1)}="{u}_{m.group(2)}"', s)
            open(target, "w").write(s)
            os.remove(os.path.join(d, f))
        else:
            shutil.move(os.path.join(d, f), target)
        moved += 1
    os.rmdir(d)

# the zips and backup stills the page links to, flattened out of downloads/ or copied in
dl = os.path.join(site, "downloads")
pulled = 0
for u in units:
    for name in (f"{u}.zip", f"{u}_backup.jpg"):
        dst = os.path.join(site, name)
        if os.path.exists(dst): continue
        for cand in (os.path.join(dl, name), os.path.join(src, name)):
            if os.path.exists(cand):
                shutil.copy(cand, dst); pulled += 1; break
if os.path.isdir(dl): shutil.rmtree(dl)

s = open(index).read()
for u in units:
    for esc in (lambda t: t, lambda t: html.escape(t, quote=True)):   # plain hrefs and srcdoc-escaped paths
        s = s.replace(esc(f"{u}/ad.html"), esc(f"{u}_ad.html"))
        s = s.replace(esc(f"{u}/index.html"), esc(f"{u}_ad.html"))
        s = s.replace(esc(f"{u}/bg.jpg"), esc(f"{u}_bg.jpg"))
        s = s.replace(esc(f"{u}/video.mp4"), esc(f"{u}_video.mp4"))
        for i in range(1, 9):
            s = s.replace(esc(f"{u}/photo{i}.jpg"), esc(f"{u}_photo{i}.jpg"))
s = s.replace('href="downloads/', 'href="')

# Any asset still bare inside an iframe's srcdoc: the unit is named by that srcdoc's own
# bg.jpg, so each block can be fixed in isolation (the generator missed video posters).
def fix_srcdoc(m):
    block = m.group(2)
    u = re.search(r'([A-Za-z0-9_]+)_bg\.jpg', block)
    if u:
        pre = u.group(1)
        block = re.sub(r'((?:src|poster)=(?:&quot;|"))(photo\d\.jpg|video[^&"]*)',
                       lambda g: g.group(1) + pre + "_" + g.group(2), block)
    return m.group(1) + block + m.group(3)
s = re.sub(r'(srcdoc=")(.*?)("\s)', fix_srcdoc, s, flags=re.S)
open(index, "w").write(s)

left = [d for d in os.listdir(site) if os.path.isdir(os.path.join(site, d))]
print(f"flattened {len(units)} units, {moved} files moved, {pulled} zips/backups pulled in")
print(f"{len(os.listdir(site))} files at the root, {len(left)} subfolders remaining")
bad = [m for m in re.findall(r'(?:href|src)="([^"]+)"', open(index).read())
       if "/" in m and not m.startswith(("http", "data:", "javascript:"))]
print("unresolved paths with a slash:", bad[:5] if bad else "none")
