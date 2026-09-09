import json, re
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
NAVY, GOLD = "#141b33", "#c8861a"; GOLD_TXT = "#FFAE2B"   # accent for text runs and the CTA pill (rule, panel edges, logo keep #c8861a)
head=json.load(open(f"{SC}/awk_head.json")); res=json.load(open(f"{SC}/awk_res.json")); cta=json.load(open(f"{SC}/awk_cta.json"))
W = {w['word']:w for j in (head,res,cta) for w in j['words']}
for f in ("awk3_reg.json","awk2_head.json"):
    for w in json.load(open(f"{SC}/{f}"))["words"]: W.setdefault(w["word"],w)
WI={w['word']:w for w in json.load(open(f"{SC}/awk3_ital.json"))['words']}
WBI={w['word']:w for w in json.load(open(f"{SC}/awk3_boldital.json"))['words']}
EHL=open(f"{SC}/ehl_white.svgfrag").read().replace('fill="#ffffff"', 'fill="%s"' % os.environ.get("AWK_EHL_COLOR","#ffffff")); EHL_S=20/192.756; EHL_W=20   # Equal Housing logo, 20x20 (AWK_EHL_COLOR overrides white)
def bake(d, s, tx, ty):
    out=[]
    for cmd,args in re.findall(r'([MLQCZ])([^MLQCZ]*)', d):
        nums=[float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        out.append(cmd+' '.join(('%.2f %.2f'%(nums[i]*s+tx, nums[i+1]*s+ty)).replace('.00','') for i in range(0,len(nums),2)))
    return ''.join(out)
def text(word, size, x, baseline, fill, extra="", D=None):
    D=D or W; fill=GOLD_TXT if fill==GOLD else fill; return f'<path fill="{fill}" {extra} d="{bake(D[word]["d"], size/100, x, baseline)}"/>'
def width(word,size,D=None): return (D or W)[word]['advance']*size/100

# ---------------- layout (300x250) ----------------
IMG_H=118; PAD=12
Q_SIZE=15.5; Q_LH=19; q1,q2="Wondering which builders are paying","closing costs this month?"
assert width(q1,Q_SIZE)<=300-2*PAD and width(q2,Q_SIZE)<=300-2*PAD, (width(q1,Q_SIZE), width(q2,Q_SIZE))
CTA_Y=202; MID=(IMG_H+2+CTA_Y)/2; R_GAP=19            # same vertical rhythm as the v2 end frame
R_SIZE=11; R_LH=0; HB={w['word']:w for w in json.load(open(f"{SC}/awk_body_hn.json"))['words']}; HBI={w['word']:w for w in json.load(open(f"{SC}/awk_body_hnmi.json"))['words']}
r="Meet the Agent Who Knows"; r2="new construction."; assert width(r,R_SIZE,HB)<=300-2*PAD
H=0.708*Q_SIZE+Q_LH+R_GAP+R_LH                       # two question lines
q_base1=MID-H/2+0.708*Q_SIZE; q_base2=q_base1+Q_LH; r_base=q_base2+R_GAP; r_base2=r_base+R_LH
L2W=width("paying",Q_SIZE,WBI)+0.28*Q_SIZE+width("closing costs",Q_SIZE,WBI)+width(" this month?",Q_SIZE); assert L2W<=276, L2W
CTA_W,CTA_H=96,26; cta_y=CTA_Y+5; cta_x=PAD; L_SIZE=11.5; lbl="Learn More"   # button + logo 5 px lower than the text column assumes
lbl_x=cta_x+(CTA_W-width(lbl,L_SIZE))/2; lbl_base=cta_y+CTA_H/2+0.714*L_SIZE/2
LOGO_W=138; logo_s=LOGO_W/5165.78; LOGO_H=882*logo_s; logo_x=300-PAD-LOGO_W; logo_y=cta_y+CTA_H/2-LOGO_H/2
OV_SIZE=13; ov="New construction has it all."; ov_x=PAD; ov_base=IMG_H-13
print(f"question baselines {q_base1:.1f}/{q_base2:.1f} widths {width(q1,Q_SIZE):.0f}/{width(q2,Q_SIZE):.0f} | line2 w {L2W:.0f} | resolution base {r_base:.1f}/{r_base2:.1f} w {width(r,R_SIZE,HB):.0f} | CTA y {cta_y:.1f}-{cta_y+CTA_H:.1f} | logo {logo_x:.1f},{logo_y:.1f} {LOGO_W}x{LOGO_H:.1f} | bottom margin {250-(cta_y+CTA_H):.1f}")
logo=open(f"{SC}/awk_logo_light.svgfrag").read()

# ---------------- motion: same vocabulary as the buymyhouse units ----------------
E="cubic-bezier(0.5,0,0.5,1)"; LOOP=15
def pct(t): return round(t/LOOP*100,3)
def slide_in(name,a,b,dx):           # enter and hold to the end of the loop (final frame must show it)
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX({dx}px); opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ transform: translateX(0px); opacity: 1; }}
}}"""
def fade_in(name,a,b):
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ opacity: 1; }}
}}"""
css_kf="\n".join([
 f"""@keyframes kf_overlay {{
  0%, {pct(0.3)}% {{ opacity: 0; animation-timing-function: {E}; }}
  {pct(0.8)}% {{ opacity: 1; animation-timing-function: linear; }}
  {pct(3.4)}% {{ opacity: 1; animation-timing-function: {E}; }}
  {pct(3.9)}%, 100% {{ opacity: 0; }}
}}""",
 slide_in("kf_question",0.6,1.2,-36), slide_in("kf_resolution",1.5,2.1,36), fade_in("kf_cta",2.4,2.9), fade_in("kf_logo",0.0,0.6), fade_in("kf_ehl",0.0,0.6),
 """@keyframes kf_cta_bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }""",
 f"""@keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); }} 100% {{ transform: translateX(40px); }} }}"""])

html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=300,height=250">
<title>AgentWhoKnows 300x250</title>
<script type="text/javascript">
  var clickTag = "https://www.agentwhoknows.com/";
</script>
<script type="text/javascript">
  (function () {{
    var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search);
    if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }}
  }})();
</script>
<style>
  :root {{ color-scheme: light; }}
  html, body {{ margin:0; padding:0; background:{NAVY}; overflow:hidden; }}
  #ad {{ position:relative; width:300px; height:250px; overflow:hidden; background:{NAVY}; }}
  #ad svg {{ position:absolute; inset:0; width:100%; height:100%; }}

  /* image layer: 340x118 asset, 300 visible, 40px pan - the same move as the buymyhouse units */
  #photo {{ position:absolute; left:0; top:0; width:300px; height:{IMG_H}px; overflow:hidden; }}
  #photo video, #photo #bgstill {{
    position:absolute; left:-40px; top:0; width:340px; height:{IMG_H}px; object-fit:cover; display:block;
    will-change:transform; animation: kf_bg_pan {LOOP}s linear 3 forwards;
  }}
  #ad.no-autoplay video {{ display:none; }}
  /* soft shade at the foot of the image so the category line reads */
  #photo::after {{ content:""; position:absolute; left:0; right:0; bottom:0; height:56px; pointer-events:none;
    background: linear-gradient(to bottom, rgba(20,27,51,0) 0%, rgba(20,27,51,0.55) 100%); }}

  /* every timeline animation runs 3 loops (IAB) and then holds its final frame */
  #ad g[id] {{ will-change: transform, opacity; }}
  #overlay    {{ opacity:0; transform-origin:0 0; animation: kf_overlay {LOOP}s linear 3 forwards; }}
  #question   {{ opacity:0; transform-origin:0 0; animation: kf_question {LOOP}s linear 3 forwards; }}
  #resolution {{ opacity:0; transform-origin:0 0; animation: kf_resolution {LOOP}s linear 3 forwards; }}
  #cta        {{ opacity:0; animation: kf_cta {LOOP}s linear 3 forwards; }}
  #cta_bob    {{ animation: kf_cta_bob 1.9s ease-in-out 23 forwards; }}  /* 23 x 1.9 s = 43.7 s: stops with the 3rd loop */
  #logo       {{ opacity:0; animation: kf_logo {LOOP}s linear 3 forwards; }}
  #ehl        {{ opacity:0; animation: kf_ehl {LOOP}s linear 3 forwards; }}
  #clickthrough {{ position:absolute; inset:0; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; }}
{css_kf}
</style>
</head>
<body>
<div id="ad" class="no-autoplay">
  <div id="photo">
    <img id="bgstill" src="bg-300x250-still.jpg" width="340" height="{IMG_H}" alt="">
    <video src="bg-300x250.mp4" poster="bg-300x250-still.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>
  </div>

  <svg viewBox="0 0 300 250" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- category line: the one piece of text allowed on the image layer -->
    <g id="ehl"><g transform="translate({300-8-EHL_W} 8) scale({EHL_S:.6f})">{EHL}</g></g>   <!-- Equal Housing: fades in at the start, never leaves -->
    <g id="overlay">
    </g>
    <!-- brand panel -->
    <defs><linearGradient id="panel_g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b1f30"/><stop offset="1" stop-color="#0f1b4f"/></linearGradient></defs>
    <rect x="0" y="{IMG_H}" width="300" height="{250-IMG_H}" fill="url(#panel_g)"/>   <!-- navy, desaturated at left -> saturated at right -->
    <rect x="0" y="{IMG_H}" width="300" height="2" fill="{GOLD}"/>
    <g id="question">
      {text("Wondering which builders are ", Q_SIZE, PAD, q_base1, "#ffffff")}
      {text("paying", Q_SIZE, PAD, q_base2, GOLD, D=WBI)}
      {text("closing costs", Q_SIZE, PAD+width("paying",Q_SIZE,WBI)+0.28*Q_SIZE, q_base2, GOLD, D=WBI)}
      {text(" this month?", Q_SIZE, PAD+width("paying",Q_SIZE,WBI)+0.28*Q_SIZE+width("closing costs",Q_SIZE,WBI), q_base2, "#ffffff")}
    </g>
    <g id="resolution">
      {text(r, R_SIZE, PAD, r_base, "#ffffff", 'opacity="0.88"', D=HB)}
      {text(r2, R_SIZE, PAD+width(r,R_SIZE,HB)+0.278*R_SIZE, r_base2, "#ffffff", 'opacity="0.88"', D=HBI)}
    </g>
    <g id="cta">
      <g id="cta_bob">
        <rect x="{cta_x}" y="{cta_y:.2f}" width="{CTA_W}" height="{CTA_H}" rx="{CTA_H/2}" ry="{CTA_H/2}" fill="{GOLD_TXT}"/>
        {text(lbl, L_SIZE, lbl_x, lbl_base, NAVY)}
      </g>
    </g>
    <g id="logo" transform="translate({logo_x:.2f} {logo_y:.2f}) scale({logo_s:.6f})">
      {logo}
    </g>
  </svg>
  <a id="clickthrough" href="javascript:window.open(window.clickTag)" aria-label="Learn more at AgentWhoKnows.com"></a>
</div>

<script type="text/javascript">
  (function () {{
    var v = document.querySelector('#photo video'), ad = document.getElementById('ad');
    v.muted = true; v.defaultMuted = true;
    v.addEventListener('playing', function () {{ ad.className = ''; }});
    v.addEventListener('pause',   function () {{ if (!v.ended) ad.className = 'no-autoplay'; }});
    function play() {{ var p = v.play(); if (p) p.catch(function () {{}}); }}
    var LOOP = 15;
    v.addEventListener('loadedmetadata', function () {{
      if (isFinite(v.duration) && v.duration > 0 && Math.abs(v.duration - LOOP) > 0.05) {{ v.defaultPlaybackRate = v.playbackRate = v.duration / LOOP; }}
    }});
    // keep the footage on the 15 s beat, and stop with the timeline after the third loop (IAB: <=3 loops)
    v.addEventListener('animationiteration', function (e) {{ if (e.animationName === 'kf_bg_pan') {{ try {{ v.currentTime = 0; }} catch (x) {{}} }} }});
    v.addEventListener('animationend', function (e) {{ if (e.animationName === 'kf_bg_pan') {{ v.pause(); v.removeAttribute('loop'); ad.className = ''; }} }});
    v.addEventListener('loadedmetadata', play);
    v.addEventListener('canplay', play, {{ once: true }});
    document.addEventListener('visibilitychange', function () {{ if (!document.hidden) play(); }});
    if (v.readyState >= 1) play();
    setTimeout(function () {{ if (v.paused) ad.className = 'no-autoplay'; }}, 4000);
  }})();
</script>
</body>
</html>
"""
open("index.html","w").write(html); print("index.html", len(html), "bytes")
