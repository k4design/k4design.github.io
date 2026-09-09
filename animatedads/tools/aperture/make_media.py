#!/usr/bin/env python3
"""Render the per-size photo and video assets for an Aperture property.

Photos are cover-cropped to the band rect with Lanczos; the video is assembled from the
source clips (equal share of the 15 s each) via bin/mp4frames + bin/seqenc.

Usage: make_media.py <srcdir> <outdir> [sizes...]
  <srcdir>  holds the listing stills 1.jpg.. and, optionally, clips 1.mp4..
  <outdir>  gets photos/<size>/photoN.jpg and video/<size>.mp4
"""
import os, subprocess, sys, glob, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BIN = os.path.join(HERE, "..", "bin")
BAND = {"768x1024": (768, 473), "1024x768": (1024, 634), "480x320": (480, 256),
        "970x250": (592, 250), "320x480": (320, 200), "300x600": (300, 300)}
KBPS = {"768x1024": 130, "1024x768": 120, "480x320": 100, "970x250": 110,
        "320x480": 95, "300x600": 100}
FPS, TOTAL = 15, 225

def cover(img, W, H):
    sw, sh = img.size; ar = W / H
    cw, ch = (sh * ar, sh) if sw / sh > ar else (sw, sw / ar)
    cx, cy = sw / 2, sh / 2
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return img.resize((W, H), Image.LANCZOS, box=box)

def photos(src, out, size, quality):
    W, H = BAND[size]
    d = os.path.join(out, "photos", size); os.makedirs(d, exist_ok=True)
    stills = sorted(glob.glob(os.path.join(src, "[0-9].jpg")))
    for i, p in enumerate(stills, 1):
        cover(Image.open(p).convert("RGB"), W, H).save(
            os.path.join(d, f"photo{i}.jpg"), quality=quality, optimize=True, progressive=True)
    return len(stills)

def video(src, out, size):
    W, H = BAND[size]
    clips = sorted(glob.glob(os.path.join(src, "[0-9].mp4")))
    if not clips: return None
    tmp = os.path.join(out, "_frames", size)
    shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    per = [TOTAL // len(clips)] * len(clips); per[-1] += TOTAL - sum(per)
    n = 0
    for c, count in zip(clips, per):
        sub = os.path.join(tmp, "c%d" % n); os.makedirs(sub)
        subprocess.run([os.path.join(BIN, "mp4frames"), c, sub, "f", str(count), str(W), str(H)],
                       check=True, capture_output=True)
        for k, f in enumerate(sorted(os.listdir(sub))):
            os.rename(os.path.join(sub, f), os.path.join(tmp, "seq%04d.png" % (n * 10000 + k)))
        os.rmdir(sub); n += 1
    for k, f in enumerate(sorted(os.listdir(tmp))):
        os.rename(os.path.join(tmp, f), os.path.join(tmp, "_%04d.png" % k))
    vd = os.path.join(out, "video"); os.makedirs(vd, exist_ok=True)
    dst = os.path.join(vd, f"{size}.mp4")
    subprocess.run([os.path.join(BIN, "seqenc"), tmp, "_", dst, str(FPS), str(KBPS[size])],
                   check=True, capture_output=True)
    shutil.rmtree(tmp, ignore_errors=True)
    return os.path.getsize(dst)

if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    sizes = sys.argv[3:] or list(BAND)
    q = int(os.environ.get("AP_PHOTO_Q", "62"))
    for size in sizes:
        n = photos(src, out, size, q)
        sz = video(src, out, size)
        print(f"  {size:9s} {n} photos ({BAND[size][0]}x{BAND[size][1]}, q{q})" +
              (f"  video {sz//1024} KB" if sz else "  no clips"))
    shutil.rmtree(os.path.join(out, "_frames"), ignore_errors=True)
