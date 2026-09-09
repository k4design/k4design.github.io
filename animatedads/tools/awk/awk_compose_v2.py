import json, re, os
REFRAME = float(os.environ.get("AWK_REFRAME_PX", "0"))   # px the video moves up with the panel
VID_W = float(os.environ.get("AWK_VIDEO_W", "340"))      # rendered width of the 340x250 asset (300 = "zoomed out", no pan)
VID_H = round(VID_W*250/340, 1); PAN = int(os.environ.get('AWK_PAN', str(int(VID_W-300))))
VID_LEFT = (int(-(VID_W-300)) if PAN else int(-(VID_W-300)/2)) or 0            # panning: start flush right; fixed: centred
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
NAVY, GOLD = "#141b33", "#c8861a"; GOLD_TXT = "#FFAE2B"   # accent for text runs and the CTA pill (rule, panel edges, logo keep #c8861a)
W={}
for f in ("awk_head.json","awk_res.json","awk_cta.json","awk2_head.json","awk2_res.json","awk2_head_b.json","awk2_head_c.json","awk3_reg.json"):
    for w in json.load(open(f"{SC}/{f}"))['words']: W[w['word']]=w
WI={w['word']:w for w in json.load(open(f"{SC}/awk3_ital.json"))['words']}    # Avenir Next Demi Bold Italic (Omnes italic stand-in)
WB={w['word']:w for w in json.load(open(f"{SC}/awk3_bold.json"))['words']}    # Helvetica Neue Bold (Inter bold stand-in)
WBI={w['word']:w for w in json.load(open(f"{SC}/awk3_boldital.json"))['words']}
HB={w['word']:w for w in json.load(open(f"{SC}/awk_body_hn.json"))['words']}
EHL=open(f"{SC}/ehl_white.svgfrag").read(); EHL_S=20/192.756; EHL_W=20   # Equal Housing logo, white, 20x20     # Helvetica Neue: body line 1
HBI={w['word']:w for w in json.load(open(f"{SC}/awk_body_hnmi.json"))['words']}   # Helvetica Neue Italic: "new construction."  # Avenir Next Bold Italic: one weight up from the white Demi Bold, for the accent runs
def bake(d,s,tx,ty):
    out=[]
    for cmd,args in re.findall(r'([MLQCZ])([^MLQCZ]*)', d):
        n=[float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        out.append(cmd+' '.join(('%.2f %.2f'%(n[i]*s+tx,n[i+1]*s+ty)).replace('.00','') for i in range(0,len(n),2)))
    return ''.join(out)
def text(word,size,x,base,fill,extra="",D=None): D=D or W; fill=GOLD_TXT if fill==GOLD else fill; return f'<path fill="{fill}" {extra} d="{bake(D[word]["d"],size/100,x,base)}"/>'
def width(word,size,D=None): return (D or W)[word]['advance']*size/100
def textI(word,size,x,base,fill,extra=""): return text(word,size,x,base,fill,extra,WI)
def widthI(word,size): return width(word,size,WI)
PAD=12; IMG_H=118
# ---- big frames (2-4) ----
CTA_Y=202; GAP_TOP=IMG_H+2; MID=(GAP_TOP+CTA_Y)/2
BIG=26; BIG_LH=30; big_b1=MID-(BIG_LH+0.708*BIG)/2+0.708*BIG; big_b2=big_b1+BIG_LH
RES=21; RES_LH=26; res_b1=MID-(RES_LH+0.714*RES)/2+0.714*RES; res_b2=res_b1+RES_LH
for w in ("Wondering which","builders are...","paying closing costs","this month?","New construction","has it all."): assert width(w,BIG)<=276,(w,width(w,BIG))
assert width("Meet the ",RES)+width("Agent Who Knows",RES)<=276
# ---- frame 1 category line, on the image (full-bleed), bottom-left ----
ov_b2=min(250.0,VID_H)-22; ov_b1=ov_b2-BIG_LH
# ---- frame 5 composite (the v1 layout, centred in the panel) ----
VEIL_TOP,VEIL_BOT=0.66,0.95   # veil: lighter at the top, darker at the bottom (was flat 0.75)
FULL = os.environ.get("AWK_FINAL_FULL","0")=="1"   # final frame: veil + rule scroll to the top, composite fills 0..CTA_Y
ACCENT = os.environ.get("AWK_Q_STYLE","")=="accent"   # v3: "paying closing costs" on one line, larger than the two white lines
if FULL and ACCENT:
    SP=0.28
    # v3: three-line question - Wondering which builders are / paying closing costs / this month? - with a rule before the body
    Q0=min(276/width("Wondering which builders are ",1), 276/(width("paying",1,WBI)+SP+width("closing costs",1,WBI)), 26.0)
    Q=1.2*Q0; QB=Q                                    # +20 %: line 1 now breaks after "which"
    assert width("paying",Q,WBI)+SP*Q+width("closing costs",Q,WBI)<=276 and width("builders are",Q)<=276
    Q_LH=1.15*Q
    R=1.5*min(Q0*0.6, 276/width("Meet the Agent Who Knows new construction.",1)); R_LH=1.15*R; R_GAP=2.1*R; MIDF=(10+CTA_Y)/2   # body unchanged
    H=0.708*Q+3*Q_LH+R_GAP+R_LH
    q_b1=MIDF-H/2+0.708*Q; q_b2=q_b1+Q_LH; q_b3=q_b2+Q_LH; q_b4=q_b3+Q_LH; r_b=q_b4+R_GAP; r_b2=r_b+R_LH
    RULE_Y=q_b4+0.25*Q+(R_GAP-0.25*Q-0.714*R)/2     # rule centred between the question's descenders and the body's cap height
elif FULL:
    SP=0.28   # em, word space between the white and gold runs on line 2
    Q=min(276/(width("builders are",1)+SP+width("paying",1,WBI)), 276/(width("closing costs",1,WBI)+width(" this month?",1)), 276/width("Wondering which",1), 26.0)
    Q_LH=1.18*Q; R=1.5*min(Q*0.6, 276/width("Meet the Agent Who Knows new construction.",1)); R_LH=1.15*R; R_GAP=1.7*R; MIDF=(10+CTA_Y)/2
    H=0.708*Q+2*Q_LH+R_GAP+R_LH                       # cap top of line 1 -> baseline of body line 2
    q_b1=MIDF-H/2+0.708*Q; q_b2=q_b1+Q_LH; q_b3=q_b2+Q_LH; r_b=q_b3+R_GAP; r_b2=r_b+R_LH
else:
    Q=15.5; Q_LH=19; R=11; R_GAP=19; R_LH=0                # same as the v1 template: two question lines, body on one line
    q_b1=MID-(Q_LH+R_GAP+0.708*Q)/2+0.708*Q; q_b2=q_b1+Q_LH; r_b=q_b2+R_GAP; r_b2=r_b
CTA_W,CTA_H=96,26; cta_x=PAD; cta_y=CTA_Y+5; L=11.5; lbl="Learn More"; lbl_x=cta_x+(CTA_W-width(lbl,L))/2; lbl_base=cta_y+CTA_H/2+0.714*L/2   # button + logo 5 px lower
LOGO_W=138; logo_s=LOGO_W/5165.78; LOGO_H=882*logo_s; logo_x=300-PAD-LOGO_W; logo_y=cta_y+CTA_H/2-LOGO_H/2
logo=open(f"{SC}/awk_logo_light.svgfrag").read()
mark=open(f"{SC}/awk_blueicon.svgfrag").read()                  # agentwhoknows_blueicon.svg: the mark on a #141b33 disc, 977.78 square
ICON=44; icon_s=ICON/977.78; icon_x=PAD; ov_x=PAD+ICON+10
icon_y=((ov_b1-0.708*BIG)+ov_b2)/2 - (977.78*icon_s)/2          # centred on the two-line block
assert ov_x+widthI("New construction",BIG)<=288
QBTXT=("QB %.1f"%QB) if ACCENT else ""
print(f"big baselines {big_b1:.1f}/{big_b2:.1f} (bottom of line 2 ~{big_b2+0.24*BIG:.0f}) | res {res_b1:.1f}/{res_b2:.1f} | CTA row {cta_y:.0f}-{cta_y+CTA_H:.0f} | composite Q {Q:.1f} {QBTXT} R {R:.1f} q {q_b1:.0f}/{q_b2:.0f} r {r_b:.0f}/{r_b2:.0f} full={FULL}")

E="cubic-bezier(0.5,0,0.5,1)"; LOOP=15
def pct(t): return round(t/LOOP*100,3)
def frame(name,a,b,c,d,dx_in=-36,dx_out=-36):
    """slide+fade in over a..b, hold, slide+fade out over c..d"""
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX({dx_in}px); opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}% {{ transform: translateX(0px); opacity: 1; animation-timing-function: linear; }}
  {pct(c)}% {{ transform: translateX(0px); opacity: 1; animation-timing-function: {E}; }}
  {pct(d)}%, 100% {{ transform: translateX({dx_out}px); opacity: 0; }}
}}"""
def hold_in(name,a,b,dx=-36):
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ transform: translateX({dx}px); opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ transform: translateX(0px); opacity: 1; }}
}}"""
def fade_hold(name,a,b):
    return f"""@keyframes {name} {{
  0%, {pct(a)}% {{ opacity: 0; animation-timing-function: {E}; }}
  {pct(b)}%, 100% {{ opacity: 1; }}
}}"""
kf="\n".join([
 frame("kf_f1", 0.4,0.9, 2.5,3.0),           # category line, on the full-bleed image
 frame("kf_f2", 0.9,1.4, 4.0,4.4),           # Wondering which builders are paying
 frame("kf_f3", 4.4,4.9, 7.5,7.9),           # closing costs this month?
 frame("kf_f4", 7.9,8.4, 11.0,11.4),         # Meet the Agent Who Knows new construction.
 hold_in("kf_f5", 11.4,12.0), fade_hold("kf_ehl", 11.4,12.0),                # composite - held to the end (final frame rule)
 (f"""@keyframes kf_veil {{                     /* final frame: overlay + gold rule scroll to the top */
  0%, {pct(11.4)}% {{ transform: translateY(0px); animation-timing-function: {E}; }}
  {pct(12.0)}%, 100% {{ transform: translateY(-{IMG_H}px); }}
}}""" if FULL else ""),
 fade_hold("kf_chrome", 0.6,1.2),            # CTA + logo arrive with the panel
 f"""@keyframes kf_reframe {{                    /* video rides up with the panel (REFRAME px) */
  0%, {pct(0.3)}% {{ top: 0px; }}
  {pct(0.9)}%, 100% {{ top: -{REFRAME:.0f}px; }}
}}
@keyframes kf_panel {{                      /* panel + gold rule ride up with the collapse */
  0%, {pct(0.3)}% {{ transform: translateY(132px); }}
  {pct(0.9)}%, 100% {{ transform: translateY(0px); }}
}}
@keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); }} 100% {{ transform: translateX({PAN:.0f}px); }} }}
@keyframes kf_cta_bob {{ 0%, 100% {{ transform: translateY(0px); }} 50% {{ transform: translateY(-3px); }} }}"""])

html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=300,height=250">
<title>AgentWhoKnows 300x250 (frames)</title>
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
  /* image layer: full-bleed for frame 1, then the panel rises over it. One 340x250 asset = exactly what the 40px pan reveals. */
  #photo {{ position:absolute; left:0; top:0; width:300px; height:250px; overflow:hidden; }}   /* full height: the 75% panel shows the footage through */
  #photo video, #photo #bgstill {{
    position:absolute; left:{VID_LEFT:.0f}px; top:0; width:{VID_W:.0f}px; height:{VID_H}px; object-fit:cover; display:block;
    will-change:transform; animation: kf_bg_pan {LOOP}s linear 3 forwards{', kf_reframe ' + str(LOOP) + 's linear 3 forwards' if REFRAME else ''};
  }}
  #ad.no-autoplay video {{ display:none; }}
  #photo::after {{ content:""; position:absolute; left:0; right:0; bottom:0; height:110px; pointer-events:none;
    background: linear-gradient(to bottom, rgba(20,27,51,0) 0%, rgba(20,27,51,0.72) 100%); }}
  #ad g[id], #panel {{ will-change: transform, opacity; }}
  #panel {{ animation: kf_panel {LOOP}s linear 3 forwards; }}
  {"#veil { animation: kf_veil "+str(LOOP)+"s linear 3 forwards; will-change: transform; }" if FULL else ""}
  #f1 {{ opacity:0; transform-origin:0 0; animation: kf_f1 {LOOP}s linear 3 forwards; }}
  #f2 {{ opacity:0; transform-origin:0 0; animation: kf_f2 {LOOP}s linear 3 forwards; }}
  #f3 {{ opacity:0; transform-origin:0 0; animation: kf_f3 {LOOP}s linear 3 forwards; }}
  #f4 {{ opacity:0; transform-origin:0 0; animation: kf_f4 {LOOP}s linear 3 forwards; }}
  #f5 {{ opacity:0; transform-origin:0 0; animation: kf_f5 {LOOP}s linear 3 forwards; }}
  #ehl {{ opacity:0; animation: kf_ehl {LOOP}s linear 3 forwards; }}
  #chrome {{ opacity:0; animation: kf_chrome {LOOP}s linear 3 forwards; }}
  #cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out 23 forwards; }}
  #clickthrough {{ position:absolute; inset:0; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; }}
{kf}
</style>
</head>
<body>
<div id="ad" class="no-autoplay">
  <div id="photo">
    <img id="bgstill" src="bg-300x250-still.jpg" width="{VID_W:.0f}" height="{VID_H}" alt="">
    <video src="bg-300x250.mp4" poster="bg-300x250-still.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>
  </div>
  <svg viewBox="0 0 300 250" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="veil_g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{NAVY}" stop-opacity="{VEIL_TOP}"/><stop offset="1" stop-color="{NAVY}" stop-opacity="{VEIL_BOT}"/></linearGradient></defs>
    <!-- frame 1: the category line, the only text that may sit on the image -->
    <g id="f1"></g>   <!-- category line removed: the opener is the footage alone -->
    <!-- brand panel: rides up as the image collapses -->
    <g id="panel">
      <g id="veil">
        <rect x="0" y="{IMG_H}" width="300" height="{(250-IMG_H)+(IMG_H if FULL else 0)}" fill="url(#veil_g)"/>
        <rect x="0" y="{IMG_H}" width="300" height="2" fill="{GOLD}"/>
      </g>
      <g id="f2">
        {text("Wondering which",BIG,PAD,big_b1,"#ffffff")}
        {text("builders are...",BIG,PAD,big_b2,"#ffffff")}
      </g>
      <g id="f3">
        {text("paying ",BIG,PAD,big_b1,"#ffffff")}
        {text("closing costs",BIG,PAD+width("paying ",BIG),big_b1,GOLD,D=WBI)}
        {text("this month?",BIG,PAD,big_b2,"#ffffff")}
      </g>
      <g id="f4">
        {text("Meet the ",RES,PAD,res_b1,"#ffffff")}
        {text("Agent Who Knows",RES,PAD+width("Meet the ",RES),res_b1,GOLD,D=WB)}
        {text("new construction.",RES,PAD,res_b2,"#ffffff")}
      </g>
      <g id="f5">
        {(text("Wondering which",Q,PAD,q_b1,"#ffffff")+text("builders are",Q,PAD,q_b2,"#ffffff")+text("paying",Q,PAD,q_b3,GOLD,D=WBI)+text("closing costs",Q,PAD+width("paying",Q,WBI)+SP*Q,q_b3,GOLD,D=WBI)+text("this month?",Q,PAD,q_b4,"#ffffff")+f'<rect x="{PAD}" y="{RULE_Y:.2f}" width="276" height="1.5" fill="{GOLD}" opacity="0.9"/>') if (FULL and ACCENT) else (text("Wondering which",Q,PAD,q_b1,"#ffffff")+text("builders are",Q,PAD,q_b2,"#ffffff")+text("paying",Q,PAD+width("builders are",Q)+SP*Q,q_b2,GOLD,D=WBI)+text("closing costs",Q,PAD,q_b3,GOLD,D=WBI)+text(" this month?",Q,PAD+width("closing costs",Q,WBI),q_b3,"#ffffff")) if FULL else (text("Wondering which builders are ",Q,PAD,q_b1,"#ffffff")+text("paying",Q,PAD,q_b2,GOLD,D=WBI)+text("closing costs",Q,PAD+width("paying",Q,WBI)+0.28*Q,q_b2,GOLD,D=WBI)+text(" this month?",Q,PAD+width("paying",Q,WBI)+0.28*Q+width("closing costs",Q,WBI),q_b2,"#ffffff"))}
        {text("Meet the Agent Who Knows",R,PAD,r_b,"#ffffff",'opacity="0.88"',D=HB)}
        {text("new construction.",R,(PAD if FULL else PAD+width("Meet the Agent Who Knows",R,HB)+0.278*R),r_b2,"#ffffff",'opacity="0.88"',D=HBI)}
      </g>
      <g id="chrome">
        <g id="cta_bob">
          <rect x="{cta_x}" y="{cta_y:.2f}" width="{CTA_W}" height="{CTA_H}" rx="{CTA_H/2}" ry="{CTA_H/2}" fill="{GOLD_TXT}"/>
          {text(lbl,L,lbl_x,lbl_base,NAVY)}
        </g>
        <g transform="translate({logo_x:.2f} {logo_y:.2f}) scale({logo_s:.6f})">{logo}</g>
      </g>
    </g>
    <g id="ehl" transform="translate({300-8-EHL_W} 8) scale({EHL_S:.6f})">{EHL}</g>   <!-- Equal Housing: above the veil, fades in with the final frame and stays -->
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
