import os
# Aperture Global Real Estate - 768x1024 interactive carousel unit, built from the "768x1024 1/3/4" Figma frames.
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
F={k:open(f"{SC}/ap_{k}.svgfrag").read() for k in ("header1","header3","headline","sub1","sub3","sub4","cta","rules")}
BLUE="#4090EF"; T=15.0            # the storyboard is authored in 15 s time...
DUR=7.5; REPS="infinite"          # ...and played twice as fast, looping for as long as the ad is on screen
def pct(t): return round(t/T*100,3)
E="cubic-bezier(0.5,0,0.5,1)"
def kf_inout(name,a,b,c,d):   # in from the left (a-b), hold, out to the right (c-d)
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ opacity:0; transform:translateX(-48px); animation-timing-function:{E}; }}
  {pct(b)}% {{ opacity:1; transform:translateX(0); animation-timing-function:linear; }}
  {pct(c)}% {{ opacity:1; transform:translateX(0); animation-timing-function:{E}; }}
  {pct(d)}%, 100% {{ opacity:0; transform:translateX(48px); }}
}}"""
def kf_loop1(name,c,d,e,f):   # frame 1 copy: already on screen at the loop start, out to the right, back in from the left at the end
    return f"""@keyframes {name} {{
  0%, {pct(c)}% {{ opacity:1; transform:translateX(0); animation-timing-function:{E}; }}
  {pct(d)}% {{ opacity:0; transform:translateX(48px); }}
  {pct(d)+0.001}%, {pct(e)}% {{ opacity:0; transform:translateX(-48px); animation-timing-function:{E}; }}
  {pct(f)}%, 100% {{ opacity:1; transform:translateX(0); }}
}}"""
kf="\n".join([
 "@keyframes kf_fade_once { 0% { opacity:0; } 100% { opacity:1; } }",
 "@keyframes kf_cta_bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }",
 kf_loop1("kf_f1", 3.575,4.375, 13.8,15.0),
 "@keyframes kf_intro { 0% { opacity:0; transform:translateX(-48px); } 100% { opacity:1; transform:translateX(0); } }",      # Oferta Exclusiva + Lisboa, Portugal
 kf_inout("kf_h3", 4.375,5.575, 13.8,14.6),                    # Aperture wordmark stays through frames 3 and 4
 kf_inout("kf_s3", 4.375,5.575, 7.65,8.45),                     # 4 br | 5 bth | 6,500 sqm
 kf_inout("kf_s4", 8.45,9.65, 13.8,14.6),          # the Listado frame holds twice as long as the other two                  # Listado por ...
])
html=f"""<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=768,height=1024">
<title>Aperture · Parque das Nações · 768x1024 carousel</title>
<script type="text/javascript">
  var clickTag = "https://www.apertureglobal.com/";
</script>
<script type="text/javascript">
  (function () {{ var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search); if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }} }})();
</script>
<style>
  :root {{ color-scheme: dark; }}
  html, body {{ margin:0; padding:0; background:#0b0f16; overflow:hidden; }}
  #ad {{ position:relative; width:768px; height:1024px; overflow:hidden; background:#0b0f16 url(bg.jpg) 0 0/768px 1024px no-repeat; font-family: Helvetica, Arial, sans-serif; }}
  #ad > svg {{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }}
  /* photo band: y 194-667 as in the frames, with the 20 % darkening and inner shadow from the source */
  #band {{ position:absolute; left:0; top:194px; width:768px; height:473px; overflow:hidden; background:#000; opacity:0; animation: kf_fade_once 0.8s linear 1 forwards; }}
  #track {{ position:absolute; left:0; top:0; height:473px; display:flex; will-change:transform; transition: transform .7s cubic-bezier(0.5,0,0.3,1); }}
  #track img {{ width:768px; height:473px; object-fit:cover; flex:0 0 768px; display:block; }}
  #band::before {{ content:""; position:absolute; inset:0; background:rgba(0,0,0,.2); pointer-events:none; z-index:2; }}
  #band::after  {{ content:""; position:absolute; inset:0; box-shadow: inset 0 4px 4px rgba(0,0,0,.25); pointer-events:none; z-index:2; }}
  /* carousel controls sit above the click layer */
  .nav {{ position:absolute; top:50%; width:44px; height:44px; margin-top:-22px; border:0; border-radius:50%; background:rgba(11,15,22,.55); color:#fff; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; padding:0; transition: background .2s; }}
  .nav:hover {{ background:rgba(64,144,239,.85); }}
  .nav svg {{ width:18px; height:18px; display:block; }}
  #prev {{ left:14px; }} #next {{ right:14px; }}
  #dots {{ position:absolute; left:0; right:0; bottom:14px; display:flex; justify-content:center; gap:8px; z-index:5; }}
  #dots button {{ width:10px; height:10px; border-radius:50%; border:1px solid rgba(255,255,255,.8); background:transparent; padding:0; cursor:pointer; transition: background .2s; }}
  #dots button.on {{ background:{BLUE}; border-color:{BLUE}; }}
  /* copy */
  #ad g[id] {{ will-change: transform, opacity; }}
  #static {{ opacity:0; animation: kf_fade_once 0.8s linear 1 forwards; animation-delay:0.5s; }}
  #cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out infinite; }}   /* gentle hover to draw the eye */
  #f1_intro {{ opacity:0; transform-origin:0 0; animation: kf_intro 0.6s cubic-bezier(0.5,0,0.5,1) 1 forwards; animation-delay:0.65s; }}   /* first entrance only */
  #f1 {{ transform-origin:0 0; animation: kf_f1 {DUR}s linear {REPS} forwards; animation-delay:0.5s; }}
  #h3 {{ opacity:0; transform-origin:0 0; animation: kf_h3 {DUR}s linear {REPS} forwards; animation-delay:0.5s; }}
  #s3 {{ opacity:0; transform-origin:0 0; animation: kf_s3 {DUR}s linear {REPS} forwards; animation-delay:0.5s; }}
  #s4 {{ opacity:0; transform-origin:0 0; animation: kf_s4 {DUR}s linear {REPS} forwards; animation-delay:0.5s; }}
  /* only the CTA (the underlined phrase) is the click-through: x 199-569, y 912-986 covers the text and the blue line with a little slack */
  #clickthrough {{ position:absolute; left:199px; top:912px; width:370px; height:74px; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; z-index:3; }}
{kf}
</style>
</head>
<body>
<div id="ad">
  <div id="band" aria-roledescription="carousel">
    <div id="track"><img src="photo1.jpg" alt="Sala de estar"><img src="photo2.jpg" alt="Cozinha"><img src="photo3.jpg" alt="Exterior"></div>
    <button class="nav" id="prev" type="button" aria-label="Imagem anterior"><svg viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 3.5 6 9l5.5 5.5"/></svg></button>
    <button class="nav" id="next" type="button" aria-label="Próxima imagem"><svg viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5 12 9l-5.5 5.5"/></svg></button>
    <div id="dots"><button type="button" class="on" aria-label="Imagem 1"></button><button type="button" aria-label="Imagem 2"></button><button type="button" aria-label="Imagem 3"></button></div>
  </div>
  <a id="clickthrough" href="javascript:window.open(window.clickTag)" aria-label="Agendar visita - Aperture Global Real Estate"></a>
  <svg viewBox="0 0 768 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="static">
      {F['rules']}
      {F['headline']}
      <g id="cta_bob">{F['cta']}</g>
    </g>
    <g id="f1_intro"><g id="f1">
      {F['header1']}
      {F['sub1']}
    </g></g>
    <g id="h3">
      {F['header3']}
    </g>
    <g id="s3">
      {F['sub3']}
    </g>
    <g id="s4">
      {F['sub4']}
    </g>
  </svg>
</div>
<script type="text/javascript">
  (function () {{
    var track = document.getElementById('track'), N = track.children.length;
    var dots = Array.prototype.slice.call(document.querySelectorAll('#dots button'));
    var cur = 0, RESUME = 6000;
    function show(i) {{ cur = (i + N) % N; track.style.transform = 'translateX(' + (-cur * 768) + 'px)'; dots.forEach(function (d, k) {{ d.className = k === cur ? 'on' : ''; }}); }}
    // the photos follow the copy: phase thresholds are the pan-in times of each frame (real ms within the 7.5 s loop)
    var lead = document.getElementById('f1'), CUTS = [[2188, 1], [4225, 2], [6900, 0]], autoOn = true;
    function phase() {{ var a = lead.getAnimations ? lead.getAnimations()[0] : null; if (!a || a.currentTime == null) return null; return a.currentTime % 7500; }}
    function wanted(ph) {{ var w = 0; for (var k = 0; k < CUTS.length; k++) if (ph >= CUTS[k][0]) w = CUTS[k][1]; return w; }}
    setInterval(function () {{ if (!autoOn) return; var ph = phase(); if (ph === null) return; var w = wanted(ph); if (w !== cur) show(w); }}, 100);
    var resume = null;
    function user(fn) {{ return function (e) {{ e.preventDefault(); e.stopPropagation(); autoOn = false; clearTimeout(resume); fn(); resume = setTimeout(function () {{ autoOn = true; }}, RESUME); }}; }}
    document.getElementById('prev').addEventListener('click', user(function () {{ show(cur - 1); }}));
    document.getElementById('next').addEventListener('click', user(function () {{ show(cur + 1); }}));
    dots.forEach(function (d, k) {{ d.addEventListener('click', user(function () {{ show(k); }})); }});
    var x0 = null, band = document.getElementById('band');
    band.addEventListener('touchstart', function (e) {{ x0 = e.touches[0].clientX; }}, {{ passive: true }});
    band.addEventListener('touchend', function (e) {{ if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) {{ autoOn = false; clearTimeout(resume); show(cur + (dx < 0 ? 1 : -1)); resume = setTimeout(function () {{ autoOn = true; }}, RESUME); }} }});
  }})();
</script>
</body>
</html>
"""
open("index.html","w").write(html); print("index.html", len(html)//1024, "KB")
