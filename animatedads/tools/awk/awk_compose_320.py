import json, re, os
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
NAVY, GOLD = "#141b33", "#c8861a"; GOLD_TXT = "#FFAE2B"   # accent for text runs and the CTA pill (rule, panel edges, logo keep #c8861a)
def load(*fs):
    d={}
    for f in fs:
        for w in json.load(open(f"{SC}/{f}"))['words']: d[w['word']]=w
    return d
W=load("awk728_reg.json"); WBI=load("awk728_bi.json"); WH=load("awk728_hn.json"); WHB=load("awk728_hnb.json")
def bake(d,s,tx,ty):
    out=[]
    for cmd,args in re.findall(r'([MLQCZ])([^MLQCZ]*)', d):
        n=[float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        out.append(cmd+' '.join(('%.2f %.2f'%(n[i]*s+tx,n[i+1]*s+ty)).replace('.00','') for i in range(0,len(n),2)))
    return ''.join(out)
def text(D,word,size,x,base,fill,extra=""): fill=GOLD_TXT if fill==GOLD else fill; return f'<path fill="{fill}" {extra} d="{bake(D[word]["d"],size/100,x,base)}"/>'
def width(D,word,size): return D[word]['advance']*size/100
# ---- geometry
AD_W,AD_H=320,50
STRIP=74; PAN=16; COPY_X=84; MID=25
LW,LH=map(float,open(f"{SC}/awk_logo_stacked.dims").read().split())
CTA_W,CTA_H=62,18; cta_x=AD_W-8-CTA_W; cta_y=MID-CTA_H/2; L=8.5; lbl="Learn More"
import json as _j; cta=_j.load(open(f"{SC}/awk_cta.json"))['words'][0]; lbl_x=cta_x+(CTA_W-cta['advance']*L/100)/2; lbl_base=cta_y+CTA_H/2+0.714*L/2
COPY_W=cta_x-10-COPY_X
def fit(lines): return min(COPY_W/sum(width(D,w,1) for D,w in ln) for ln in lines)
BIG=fit([[(W,"Which builders are paying")],[(WBI,"closing costs"),(W," this month?")]]); BIG_LH=1.2*BIG
b1=MID-(BIG_LH+0.708*BIG)/2+0.708*BIG; b2=b1+BIG_LH
RES=fit([[(WH,"Meet the "),(WHB,"Agent Who Knows")],[(WH,"new construction.")]]); RES_LH=1.235*RES
r1=MID-(RES_LH+0.714*RES)/2+0.714*RES; r2=r1+RES_LH
# ---- end card: panel slides over the strip; question left, CTA middle, stacked logo right
LOGO_H=21; logo_s=LOGO_H/LH; LOGO_W=LW*logo_s; logo_x=AD_W-8-LOGO_W; logo_y=MID-LOGO_H/2   # 25 % smaller than the 28 px lockup
Z0=8; Z1=logo_x-10-CTA_W-10; ZC=(Z0+Z1)/2            # text zone; the CTA slides into the gap between text and logo
ecta_x=Z1+10; CTA_DX=ecta_x-cta_x
Q=(Z1-Z0)/max(width(W,"Which builders are paying",1), width(WBI,"closing costs",1)+width(W," this month?",1)); Q_LH=1.2*Q
q1=MID-(Q_LH+0.708*Q)/2+0.708*Q; q2=q1+Q_LH
qx1=Z0; qx2=Z0   # left-aligned
PAN_DX=STRIP+2
print(f"fit: BIG {BIG:.2f} RES {RES:.2f} | copy {COPY_X}-{COPY_X+COPY_W:.0f} | CTA {cta_x}-{cta_x+CTA_W} | end card text {Z0}-{Z1:.0f} CTA -> {ecta_x:.0f} logo {logo_x:.0f}-{logo_x+LOGO_W:.0f} x {LOGO_H}, Q {Q:.2f} zone {Z0:.0f}-{Z1:.0f}")
logo=open(f"{SC}/awk_logo_stacked.svgfrag").read()
E="cubic-bezier(0.5,0,0.5,1)"; LOOP=15
def pct(t): return round(t/LOOP*100,3)
def frame(name,a,b,c,d): return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX(-18px); opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}% {{ transform: translateX(0px); opacity: 1; animation-timing-function: linear; }}
  {pct(c)}% {{ transform: translateX(0px); opacity: 1; animation-timing-function: {E}; }}
  {pct(d)}%, 100% {{ transform: translateX(-18px); opacity: 0; }}
}}"""
def hold_in(name,a,b): return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX(-18px); opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ transform: translateX(0px); opacity: 1; }}
}}"""
def fade_hold(name,a,b): return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ opacity: 1; }}
}}"""
def slide(name,a,b,dx): return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX(0px); animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ transform: translateX({dx:.2f}px); }}
}}"""
kf="\n".join([frame("kf_f1",0.4,0.9,5.6,6.0), frame("kf_f2",6.0,6.5,9.6,10.0), hold_in("kf_f3",10.0,10.6), fade_hold("kf_chrome",0.3,0.9), slide("kf_cta_end",10.0,10.6,CTA_DX), slide("kf_panel",10.0,10.6,-PAN_DX),
  f"@keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); }} 100% {{ transform: translateX({PAN}px); }} }}",
  "@keyframes kf_cta_bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }"])
title=os.environ.get("AWK_TITLE","AgentWhoKnows 320x50")
html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=320,height=50">
<title>{title}</title>
<script type="text/javascript">
  var clickTag = "https://www.agentwhoknows.com/";
</script>
<script type="text/javascript">
  (function () {{ var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search); if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }} }})();
</script>
<style>
  :root {{ color-scheme: light; }}
  html, body {{ margin:0; padding:0; background:{NAVY}; overflow:hidden; }}
  #ad {{ position:relative; width:320px; height:50px; overflow:hidden; background:{NAVY}; }}
  #ad svg {{ position:absolute; inset:0; width:100%; height:100%; }}
  #photo {{ position:absolute; left:0; top:0; width:{STRIP}px; height:50px; overflow:hidden; }}
  #photo video, #photo #bgstill {{ position:absolute; left:-{PAN}px; top:0; width:{STRIP+PAN}px; height:50px; object-fit:cover; display:block; will-change:transform; animation: kf_bg_pan {LOOP}s linear 3 forwards; }}
  #ad.no-autoplay video {{ display:none; }}
  #photo::after {{ content:""; position:absolute; top:0; bottom:0; right:0; width:16px; pointer-events:none; background: linear-gradient(to right, rgba(20,27,51,0) 0%, rgba(20,27,51,.55) 100%); }}
  #ad g[id] {{ will-change: transform, opacity; }}
  #f1 {{ opacity:0; transform-origin:0 0; animation: kf_f1 {LOOP}s linear 3 forwards; }}
  #f2 {{ opacity:0; transform-origin:0 0; animation: kf_f2 {LOOP}s linear 3 forwards; }}
  #f3 {{ opacity:0; transform-origin:0 0; animation: kf_f3 {LOOP}s linear 3 forwards; }}
  #chrome {{ opacity:0; animation: kf_chrome {LOOP}s linear 3 forwards; }}
  #panel {{ animation: kf_panel {LOOP}s linear 3 forwards; }}
  #cta_end {{ animation: kf_cta_end {LOOP}s linear 3 forwards; }}
  #cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out 23 forwards; }}
  #clickthrough {{ position:absolute; inset:0; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; }}
{kf}
</style>
</head>
<body>
<div id="ad" class="no-autoplay">
  <div id="photo">
    <img id="bgstill" src="bg-320x50-still.jpg" width="{STRIP+PAN}" height="50" alt="">
    <video src="bg-320x50.mp4" poster="bg-320x50-still.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>
  </div>
  <svg viewBox="0 0 320 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="panel"><rect x="{STRIP}" y="0" width="{AD_W+PAN_DX}" height="50" fill="{NAVY}"/><rect x="{STRIP}" y="0" width="2" height="50" fill="{GOLD}"/></g>
    <g id="f1">
      {text(W,"Which builders are paying",BIG,COPY_X,b1,"#ffffff")}
      {text(WBI,"closing costs",BIG,COPY_X,b2,GOLD)}
      {text(W," this month?",BIG,COPY_X+width(WBI,"closing costs",BIG),b2,"#ffffff")}
    </g>
    <g id="f2">
      {text(WH,"Meet the ",RES,COPY_X,r1,"#ffffff")}
      {text(WHB,"Agent Who Knows",RES,COPY_X+width(WH,"Meet the ",RES),r1,GOLD)}
      {text(WH,"new construction.",RES,COPY_X,r2,"#ffffff")}
    </g>
    <g id="f3">
      <g transform="translate({logo_x:.2f} {logo_y:.2f}) scale({logo_s:.6f})">{logo}</g>
      {text(W,"Which builders are paying",Q,qx1,q1,"#ffffff")}
      {text(WBI,"closing costs",Q,qx2,q2,GOLD)}
      {text(W," this month?",Q,qx2+width(WBI,"closing costs",Q),q2,"#ffffff")}
    </g>
    <g id="chrome">
      <g id="cta_end"><g id="cta_bob">
        <rect x="{cta_x:.2f}" y="{cta_y:.2f}" width="{CTA_W}" height="{CTA_H}" rx="{CTA_H/2}" ry="{CTA_H/2}" fill="{GOLD_TXT}"/>
        <path fill="{NAVY}" d="{bake(cta['d'],L/100,lbl_x,lbl_base)}"/>
      </g></g>
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
    v.addEventListener('loadedmetadata', function () {{ if (isFinite(v.duration) && v.duration > 0 && Math.abs(v.duration - LOOP) > 0.05) {{ v.defaultPlaybackRate = v.playbackRate = v.duration / LOOP; }} }});
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
open("index.html","w").write(html)
print(f"320 index.html {len(html)} bytes | f1 baselines {b1:.1f}/{b2:.1f} f2 {r1:.1f}/{r2:.1f}")
