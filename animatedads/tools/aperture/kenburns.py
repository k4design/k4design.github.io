#!/usr/bin/env python3
"""Build a 15 s Ken Burns sequence from stills: slow zoom + pan per photo, crossfaded.
Usage: kenburns.py <outdir> <prefix> <W> <H> <img1> <img2> ...
Writes <prefix>0000.png ... 225 frames at 15 fps."""
import sys, os, shutil
from PIL import Image

outdir, prefix, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
srcs = sys.argv[5:]
TOTAL, OV = 225, 11                      # 15 s at 15 fps; crossfade length in frames
n = len(srcs)
base = (TOTAL + OV * (n - 1)) // n
segs = [base] * n
segs[-1] += (TOTAL + OV * (n - 1)) - sum(segs)
# subtle, alternating moves: (zoom start, zoom end, pan start, pan end) - zoom is the fraction of the cover region
MOVES = [(1.00, 0.90, (0.00, 0.00), (0.16, -0.10)),
         (0.90, 1.00, (-0.16, 0.08), (0.00, 0.00)),
         (1.00, 0.88, (-0.12, 0.06), (0.12, -0.06)),
         (0.94, 0.86, (0.12, 0.05), (-0.10, -0.05))]

def seg_frames(path, count, mv):
    img = Image.open(path).convert("RGB")
    sw, sh = img.size; ar = W / H
    cw, ch = (sh * ar, sh) if sw / sh > ar else (sw, sw / ar)     # cover region
    z0, z1, p0, p1 = mv
    out = []
    for i in range(count):
        u = i / (count - 1) if count > 1 else 0
        e = u * u * (3 - 2 * u)                                    # ease in-out
        z = z0 + (z1 - z0) * e
        px = p0[0] + (p1[0] - p0[0]) * e
        py = p0[1] + (p1[1] - p0[1]) * e
        rw, rh = cw * z, ch * z
        cx = sw / 2 + px * (sw - rw) / 2
        cy = sh / 2 + py * (sh - rh) / 2
        box = (cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2)
        out.append(img.resize((W, H), Image.LANCZOS, box=box))
    return out

shutil.rmtree(outdir, ignore_errors=True); os.makedirs(outdir)
segments = [seg_frames(srcs[i], segs[i], MOVES[i % len(MOVES)]) for i in range(n)]
frames = []
for i, seg in enumerate(segments):
    head = seg[OV:] if i > 0 else seg                              # the head was consumed by the crossfade
    tail = head[:-OV] if i < n - 1 else head
    frames += tail
    if i < n - 1:                                                  # crossfade into the next segment
        a, b = head[-OV:], segments[i + 1][:OV]
        frames += [Image.blend(x, y, (k + 1) / (OV + 1)) for k, (x, y) in enumerate(zip(a, b))]
frames = frames[:TOTAL]
for k, f in enumerate(frames): f.save(f"{outdir}/{prefix}{k:04d}.png")
print(f"{prefix}: {len(frames)} frames {W}x{H} from {n} stills (segments {segs}, crossfade {OV})")
