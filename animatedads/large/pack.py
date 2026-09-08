#!/usr/bin/env python3
"""Package the large HD sizes: zip (index.html at the root), backup JPEG of the
held final frame (headless Chrome at 14.9 s), README. Run from the project root."""
import os, subprocess, shutil, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SIZES = ["970x90", "970x250", "300x600", "160x600"]

def backup(size):
    d = os.path.join(ROOT, f"dist/{size}/hd"); w, h = size.split("x")
    s = open(os.path.join(d, "index.html")).read()
    # freeze the ad on its held final frame; the video is hidden so the still shows under it
    s = s.replace("</body>", """<script>
  addEventListener('load', function () {
    var v = document.querySelector('video'); v.pause(); document.getElementById('ad').className = 'no-autoplay';
    document.getAnimations().forEach(function (a) { a.pause(); a.currentTime = 14900; });
  });
</script>
</body>""")
    tmp = os.path.join(d, "_backup.html"); open(tmp, "w").write(s)
    png = os.path.join(ROOT, f"dist/{size}/backup-{size}-hd.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", "--virtual-time-budget=3000", f"--screenshot={png}", "file://" + tmp],
                   check=True, capture_output=True)
    os.remove(tmp)
    jpg = png[:-4] + ".jpg"
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "85", png, "--out", jpg], check=True, capture_output=True)
    os.remove(png)
    return jpg

def zipit(size):
    d = os.path.join(ROOT, f"dist/{size}"); z = os.path.join(d, f"buymyhouse_{size}_hd.zip")
    if os.path.exists(z): os.remove(z)
    subprocess.run(["zip", "-q", "-r", "-X", z, ".", "-x", ".DS_Store", "-x", "_backup.html"], cwd=os.path.join(d, "hd"), check=True)
    return z

NOTES = {
 "970x90":  "Super leaderboard. The 728x90 layout re-spaced across 970: 186 px strip (the 728x90 HD asset, 372x180, no pan),\n"
            "            copy at 1.25x, logo at the right behind a rule. End card = the 728 end card at 1.25x; logo stays put.",
 "970x250": "Billboard. 360 px video strip on the left (the 300x250 HD asset, 780x500, rendered 390x250, 30 px pan) fading into\n"
            "            the panel; copy at 1.65x, logo bottom right. End card on two rows: \"3 steps\" | rule | tag, then the CTA, centred.",
 "300x600": "Half page. 320 px video band on top (300x250 HD asset cover-fit to 499x320, 90 px pan) fading into the panel;\n"
            "            copy at 0.85x left-aligned, CTA and logo persistent at the bottom. End card: \"3 steps\" at 1.5x + tag above the CTA.",
 "160x600": "Skyscraper. 220 px video band on top (asset cover-fit to 343x220, 90 px pan); headlines split onto two lines\n"
            "            (white line, then the green key words) at 0.62x, CTA and logo persistent. End card: \"3 steps\" + tag stacked.",
}
for size in SIZES:
    z = zipit(size); j = backup(size)
    kb = lambda p: f"{os.path.getsize(p)/1024:.0f} KB"
    d = os.path.join(ROOT, f"dist/{size}")
    open(os.path.join(d, "README.txt"), "w").write(f"""buymyhouse - {size} HTML5 ad (HD)
{'=' * (len(size) + 27)}

hd/         StackAdapt / DV360 - index.html + bg-{size}.mp4 + bg-{size}-still.jpg
            {NOTES[size]}
            Built by large/build.py from the pieces in dist/728x90/hd/index.html (same outlined type,
            colours, drop shadows and the five-frame 15 s cut: Get a cash offer -> Step 1/2/3 -> end card).
            Video is the existing HD asset, not re-encoded; the page cover-fits it and re-syncs it to
            frame 0 on every wrap of the 15 s timeline. If autoplay is refused (iOS Low Power Mode,
            Safari "Never Auto-Play") the video stays hidden and the still carries the ad.
            Click-through: standard `clickTag` variable in <head>; the default URL is a placeholder -
            set it in the ad server or edit the one line. A ?clickTag=... query parameter is honoured.
            Not for Google Ads (video files are rejected there).

backup-{size}-hd.jpg
            Static fallback (held final frame). Upload separately where asked - not in the zip.

buymyhouse_{size}_hd.zip   {kb(z)} (video {kb(os.path.join(d, 'hd', f'bg-{size}.mp4'))})
            index.html at the ROOT of the zip, as platforms expect. To rebuild:
                cd hd && zip -r -X ../buymyhouse_{size}_hd.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width={size.split('x')[0]},height={size.split('x')[1]}">, no external
requests (logo inline), no local/session storage, muted autoplay only.
""")
    print(size, "zip", kb(z), "backup", kb(j))
