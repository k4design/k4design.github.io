#!/usr/bin/env python3
"""Package a leaderboard-family build (728x90 / 320x50) as a StackAdapt-ready 'lite' folder."""
import re, sys, base64, shutil, os, subprocess, zlib
src, W, H, video, still_src, logo_png, outdir, name = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7], sys.argv[8]
LANDING = "https://www.buymyhouse.com/"
s = open(src).read()
style  = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
markup = re.search(r'(<div id="ad">.*?\n</div>)\n\n<script>', s, re.S).group(1)

# ---- CSS: pin to 0,0; still shares the video's geometry; hide video until it truly plays; click layer
style = style.replace("  html, body { margin: 0; background: #111; }",
                      "  html, body { margin: 0; padding: 0; background: #132504; overflow: hidden; }")
style = style.replace("    margin: 0 auto;\n", "")
style = style.replace("  #photo video {", "  #photo video,\n  #photo #bgstill {", 1)
style += """
  /* Safari refuses autoplay in Low Power Mode / 'Never Auto-Play': the still under the
     video carries the ad until the video is genuinely playing. */
  #ad.no-autoplay video { display: none; }
  #clickthrough { position:absolute; inset:0; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; }
"""
# ---- markup: still + poster, start on the still, click layer on top
vt = re.search(r'    <video src="[^"]+" autoplay muted loop playsinline preload="auto"></video>', markup); assert vt
markup = markup.replace(vt.group(0),
    f'    <img id="bgstill" src="bg-{name}-still.jpg" alt="">\n'
    f'    <video src="bg-{name}.mp4" poster="bg-{name}-still.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>')
markup = markup.replace('<div id="ad">', '<div id="ad" class="no-autoplay">', 1)
markup = markup[:-len('</div>')] + '  <a id="clickthrough" href="javascript:window.open(window.clickTag)" aria-label="Check my offer"></a>\n</div>'
# ---- logo bitmap: keep the <image> width/height so the smaller PNG stretches into the same box
b64 = base64.b64encode(open(logo_png, "rb").read()).decode()
markup, n = re.subn(r'(<image id="image1_6_807" width="2041" height="814"[^>]*href="data:image/png;base64,)[A-Za-z0-9+/=]+', r'\g<1>' + b64, markup); assert n == 1
# ---- path precision: 0.01px
def rnd(m):
    t = ('%.2f' % round(float(m.group(0)), 2)).rstrip('0').rstrip('.'); return '0' if t in ('-0', '') else t
markup = re.sub(r' d="([^"]+)"', lambda m: ' d="' + re.sub(r'-?\d*\.?\d+(?:e-?\d+)?', rnd, m.group(1)) + '"', markup)

script = """<script type="text/javascript">
  (function () {
    var v = document.querySelector('#photo video'), ad = document.getElementById('ad');
    // The still under the video is always there; the video is only shown once it is
    // genuinely playing, and hidden again if it stalls.
    v.muted = true; v.defaultMuted = true;
    v.addEventListener('playing', function () { ad.className = ''; });
    v.addEventListener('pause',   function () { if (!v.ended) ad.className = 'no-autoplay'; });
    function play() { var p = v.play(); if (p) p.catch(function () {}); }
    // Keep the footage in step with the 15s timeline: stretch anything that isn't 15s
    // and re-sync to frame 0 every time the CSS loop wraps.
    var LOOP = 15;
    v.addEventListener('loadedmetadata', function () {
      if (isFinite(v.duration) && v.duration > 0 && Math.abs(v.duration - LOOP) > 0.05) {
        v.defaultPlaybackRate = v.playbackRate = v.duration / LOOP;
      }
    });
    v.addEventListener('animationiteration', function (e) {
      if (e.animationName === 'kf_bg_pan') { try { v.currentTime = 0; } catch (x) {} }
    });
    v.addEventListener('loadedmetadata', play);
    v.addEventListener('canplay', play, { once: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    if (v.readyState >= 1) play();
    setTimeout(function () { if (v.paused) ad.className = 'no-autoplay'; }, 4000);
  })();
</script>"""
doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width={W},height={H}">
<title>buymyhouse {name}</title>
<script type="text/javascript">
  var clickTag = "{LANDING}";
</script>
<script type="text/javascript">
  // DSPs that pass the destination on the query string (clickTag=...) win over the default.
  (function () {{
    var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search);
    if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }}
  }})();
</script>
<style>{style}</style>
</head>
<body>
{markup}

{script}
</body>
</html>
"""
os.makedirs(outdir, exist_ok=True)
open(f"{outdir}/index.html", "w").write(doc)
shutil.copy(video, f"{outdir}/bg-{name}.mp4"); shutil.copy(still_src, f"{outdir}/bg-{name}-still.jpg")
print(f"{name}: index.html {len(s)/1024:.0f} KB -> {len(doc)/1024:.0f} KB raw (~{len(zlib.compress(doc.encode(),9))/1024:.0f} KB zipped)")
