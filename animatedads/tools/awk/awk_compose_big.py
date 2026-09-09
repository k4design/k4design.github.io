import os, json, re
# AgentWhoKnows - single-frame layouts for the large sizes. AWK_SIZE = 160x600 | 300x600 | 970x250
# Stacked (skyscrapers): video band on top, brand panel below. Billboard (970x250): video strip left, panel right.
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
NAVY, GOLD = "#141b33", "#c8861a"; GOLD_TXT = "#FFAE2B"   # accent for text runs and the CTA pill (rule, panel edges, logo keep #c8861a)
SIZE=os.environ["AWK_SIZE"]; AD_W,AD_H=map(int,SIZE.split("x")); title=os.environ.get("AWK_TITLE",f"AgentWhoKnows {SIZE}")
W={}
for f in ("awk_head.json","awk_res.json","awk_cta.json","awk3_reg.json","awk2_head.json","awk2_head_b.json"):
    for w in json.load(open(f"{SC}/{f}"))["words"]: W.setdefault(w["word"],w)
WBI={w['word']:w for w in json.load(open(f"{SC}/awk3_boldital.json"))['words']}
HB={w['word']:w for w in json.load(open(f"{SC}/awk_body_hn.json"))['words']}
HBI={w['word']:w for w in json.load(open(f"{SC}/awk_body_hnmi.json"))['words']}
CG={w['word']:w for w in json.load(open(f"{SC}/awk_cg_bi.json"))['words']}   # Cormorant Garamond Bold Italic (skyscrapers: the gold line)
CG_K=49.8/38.6   # size factor so Cormorant's x-height matches Avenir Next's
def fs(D,size): return size*CG_K if D is CG else size
EHL=open(f"{SC}/ehl_white.svgfrag").read().replace('fill="#ffffff"','fill="%s"'%os.environ.get("AWK_EHL_COLOR","#ffffff")); EHL_S=20/192.756; EHL_W=20
LW,LH=map(float,open(f"{SC}/awk_logo_stacked.dims").read().split()); logo=open(f"{SC}/awk_logo_stacked.svgfrag").read()
def bake(d,s,tx,ty):
    out=[]
    for cmd,args in re.findall(r'([MLQCZ])([^MLQCZ]*)', d):
        n=[float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        out.append(cmd+' '.join(('%.2f %.2f'%(n[i]*s+tx,n[i+1]*s+ty)).replace('.00','') for i in range(0,len(n),2)))
    return ''.join(out)
def text(word,size,x,base,fill,extra="",D=None): D=D or W; fill=GOLD_TXT if fill==GOLD else fill; return f'<path fill="{fill}" {extra} d="{bake(D[word]["d"],fs(D,size)/100,x,base)}"/>'
def width(word,size,D=None): D=D or W; return D[word]['advance']*fs(D,size)/100
SP=0.28   # em word space between a white run and a gold run
STACKED = AD_H>AD_W
# ------------------------------------------------------------------ geometry
if STACKED:
    IMG_H=230; PAN=40; VID_W=AD_W+PAN; VID_H=270          # asset is W+40 x 270, cover-cropped into the band
    NARROW = AD_W<200
    PAD=14 if NARROW else 18; CW=AD_W-2*PAD
    if NARROW:   # 160: five lines, the gold pair in Cormorant
        qlines=[[("Wondering which",W,"#ffffff")],[("builders are",W,"#ffffff")],[("paying",CG,GOLD)],[("closing costs",CG,GOLD)],[("this month?",W,"#ffffff")]]; QCAP=22
    else:        # 300: four lines, "paying closing costs" on one Cormorant line
        qlines=[[("Wondering which",W,"#ffffff")],[("builders are",W,"#ffffff")],[("paying closing costs",CG,GOLD)],[("this month?",W,"#ffffff")]]; QCAP=28
    CTA_W,CTA_H,L = (120,32,13) if NARROW else (130,34,14)
    LOGO_W=100 if NARROW else 120; logo_s=LOGO_W/LW; LOGO_H=LH*logo_s
    logo_x=PAD; logo_y=IMG_H+2+PAD                          # logo under the rule, above the copy
    rows_h=CTA_H; rows_top=AD_H-PAD-rows_h; cta_x=PAD; cta_y=rows_top
    TXT_X=PAD; T0=logo_y+LOGO_H+30; T1=rows_top-24
    CURVE=True; CR=logo_y+LOGO_H-IMG_H; PHOTO_H=IMG_H+CR; VID_H=PHOTO_H   # panel corner straightens level with the logo's bottom edge
    ehl_x,ehl_y=AD_W-8-EHL_W,8
else:
    STRIP=400; PAN=40; VID_W=STRIP+PAN; VID_H=AD_H; IMG_H=AD_H
    PAD=24; TXT_X=STRIP+2+PAD; CW=AD_W-PAD-TXT_X
    qlines=[[("Wondering which builders are ",W,"#ffffff")],[("paying",WBI,GOLD),("closing costs",WBI,GOLD),(" this month?",W,"#ffffff")]]; QCAP=30
    CTA_W,CTA_H=110,30; L=13; LOGO_W=170; logo_s=LOGO_W/LW; LOGO_H=LH*logo_s
    rows_h=max(CTA_H,LOGO_H); rows_top=AD_H-PAD-rows_h
    logo_x=TXT_X; logo_y=rows_top+(rows_h-LOGO_H)/2; cta_x=AD_W-PAD-CTA_W; cta_y=rows_top+(rows_h-CTA_H)/2   # logo left, CTA right
    T0=PAD; T1=rows_top-14
    ehl_x,ehl_y=8,AD_H-8-EHL_W
    CURVE=False; CR=0; PHOTO_H=IMG_H
def gap(prev,cur): return 0 if (cur.startswith(" ") or prev.endswith(" ")) else SP   # a word space unless one run already carries it
def linew(ln,s): return sum(width(w,s,D) for w,D,_ in ln)+s*sum(gap(ln[i-1][0],ln[i][0]) for i in range(1,len(ln)))
Q=min([CW/linew(ln,1) for ln in qlines]+[QCAP]); Q_LH=(1.22 if STACKED else 1.15)*Q
RULE = STACKED   # skyscrapers: short gold rule between the question and the body
R=min(0.6*Q, CW/width("Meet the Agent Who Knows",1,HB)); R_LH=1.15*R; R_GAP=(2.9 if RULE else 1.6)*R
body2 = (width("Meet the Agent Who Knows",R,HB)+0.278*R+width("new construction.",R,HBI) > CW)   # wrap the body when it will not fit one line
H=0.708*Q+(len(qlines)-1)*Q_LH+R_GAP+(R_LH if body2 else 0)
mid=(T0+T1)/2; q_b=[mid-H/2+0.708*Q+i*Q_LH for i in range(len(qlines))]; r_b=q_b[-1]+R_GAP; r_b2=r_b+R_LH
rule_y=q_b[-1]+0.25*Q+(R_GAP-0.25*Q-0.714*R)/2   # centred between the question's descenders and the body's cap height
rule_svg=f'<rect x="{TXT_X}" y="{rule_y:.2f}" width="48" height="2" fill="{GOLD}"/>' if RULE else ''
cta_word=json.load(open(f"{SC}/awk_cta.json"))['words'][0]; lbl_x=cta_x+(CTA_W-cta_word['advance']*L/100)/2; lbl_base=cta_y+CTA_H/2+0.714*L/2
def qsvg():
    out=[]
    for ln,b in zip(qlines,q_b):
        x=TXT_X
        for i,(w,D,fill) in enumerate(ln):
            if i>0: x+=gap(ln[i-1][0],w)*Q
            out.append(text(w,Q,x,b,fill,D=D)); x+=width(w,Q,D)
    return "\n      ".join(out)
body = text("Meet the Agent Who Knows",R,TXT_X,r_b,"#ffffff",'opacity="0.88"',D=HB) + ("\n      "+text("new construction.",R,TXT_X,r_b2,"#ffffff",'opacity="0.88"',D=HBI) if body2 else text("new construction.",R,TXT_X+width("Meet the Agent Who Knows",R,HB)+0.278*R,r_b,"#ffffff",'opacity="0.88"',D=HBI))
print(f"{SIZE}: curve r={CR} photo_h={PHOTO_H} | Q {Q:.1f} R {R:.1f} body2={body2} | text {T0:.0f}-{T1:.0f} block {q_b[0]-0.708*Q:.0f}-{(r_b2 if body2 else r_b):.0f} | CTA {cta_x:.0f},{cta_y:.0f} | logo {logo_x:.0f},{logo_y:.0f} {LOGO_W}x{LOGO_H:.0f}")
# ------------------------------------------------------------------ motion (v1 vocabulary)
E="cubic-bezier(0.5,0,0.5,1)"; LOOP=15
def pct(t): return round(t/LOOP*100,3)
def slide_in(name,a,b,dx): return f"@keyframes {name} {{ 0%, {pct(a)}% {{ transform: translateX({dx}px); opacity: 0; animation-timing-function: {E}; }} {pct(b)}%, 100% {{ transform: translateX(0px); opacity: 1; }} }}"
def fade_in(name,a,b): return f"@keyframes {name} {{ 0%, {pct(a)}% {{ opacity: 0; animation-timing-function: {E}; }} {pct(b)}%, 100% {{ opacity: 1; }} }}"
kf="\n".join([slide_in("kf_question",0.6,1.2,-36), slide_in("kf_resolution",1.5,2.1,36), fade_in("kf_cta",2.4,2.9), fade_in("kf_logo",0.0,0.6), fade_in("kf_ehl",0.0,0.6),
  "@keyframes kf_cta_bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }",
  f"@keyframes kf_bg_pan {{ 0% {{ transform: translateX(0px); }} 100% {{ transform: translateX({PAN}px); }} }}"])
photo_css = (f"#photo {{ position:absolute; left:0; top:0; width:{AD_W}px; height:{PHOTO_H}px; overflow:hidden; }}\n  #photo::after {{ content:\"\"; position:absolute; left:0; right:0; bottom:0; height:56px; pointer-events:none; background: linear-gradient(to bottom, rgba(20,27,51,0) 0%, rgba(20,27,51,0.45) 100%); }}"
             if STACKED else
             f"#photo {{ position:absolute; left:0; top:0; width:{STRIP}px; height:{AD_H}px; overflow:hidden; }}\n  #photo::after {{ content:\"\"; position:absolute; top:0; bottom:0; right:0; width:40px; pointer-events:none; background: linear-gradient(to right, rgba(20,27,51,0) 0%, rgba(20,27,51,.55) 100%); }}")
CRX=1.5*CR   # softer: an elliptical corner, wider than it is tall, still straightening level with the logo's bottom edge
panel = ((f'<path d="M0 {IMG_H} H{AD_W-CRX:.2f} A{CRX:.2f} {CR:.2f} 0 0 1 {AD_W} {IMG_H+CR:.2f} V{AD_H} H0 Z" fill="{NAVY}"/><path d="M0 {IMG_H+1} H{AD_W-CRX:.2f} A{CRX-1:.2f} {CR-1:.2f} 0 0 1 {AD_W-1} {IMG_H+CR:.2f} V{IMG_H+CR+1:.2f}" fill="none" stroke="{GOLD}" stroke-width="2"/>' if CURVE
         else f'<rect x="0" y="{IMG_H}" width="{AD_W}" height="{AD_H-IMG_H}" fill="{NAVY}"/><rect x="0" y="{IMG_H}" width="{AD_W}" height="2" fill="{GOLD}"/>') if STACKED
         else f'<rect x="{STRIP}" y="0" width="{AD_W-STRIP}" height="{AD_H}" fill="{NAVY}"/><rect x="{STRIP}" y="0" width="2" height="{AD_H}" fill="{GOLD}"/>')
html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width={AD_W},height={AD_H}">
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
  #ad {{ position:relative; width:{AD_W}px; height:{AD_H}px; overflow:hidden; background:{NAVY}; }}
  #ad svg {{ position:absolute; inset:0; width:100%; height:100%; }}
  {photo_css}
  #photo video, #photo #bgstill {{ position:absolute; left:-{PAN}px; top:0; width:{VID_W}px; height:{VID_H}px; object-fit:cover; display:block; will-change:transform; animation: kf_bg_pan {LOOP}s linear 3 forwards; }}
  #ad.no-autoplay video {{ display:none; }}
  #ad g[id] {{ will-change: transform, opacity; }}
  #question   {{ opacity:0; transform-origin:0 0; animation: kf_question {LOOP}s linear 3 forwards; }}
  #resolution {{ opacity:0; transform-origin:0 0; animation: kf_resolution {LOOP}s linear 3 forwards; }}
  #cta        {{ opacity:0; animation: kf_cta {LOOP}s linear 3 forwards; }}
  #cta_bob    {{ animation: kf_cta_bob 1.9s ease-in-out 23 forwards; }}
  #logo       {{ opacity:0; animation: kf_logo {LOOP}s linear 3 forwards; }}
  #ehl        {{ opacity:0; animation: kf_ehl {LOOP}s linear 3 forwards; }}
  #clickthrough {{ position:absolute; inset:0; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; }}
{kf}
</style>
</head>
<body>
<div id="ad" class="no-autoplay">
  <div id="photo">
    <img id="bgstill" src="bg-{SIZE}-still.jpg" width="{VID_W}" height="{VID_H}" alt="">
    <video src="bg-{SIZE}.mp4" poster="bg-{SIZE}-still.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>
  </div>
  <svg viewBox="0 0 {AD_W} {AD_H}" fill="none" xmlns="http://www.w3.org/2000/svg">
    {panel}
    <g id="ehl"><g transform="translate({ehl_x} {ehl_y}) scale({EHL_S:.6f})">{EHL}</g></g>
    <g id="question">
      {qsvg()}
    </g>
    <g id="resolution">
      {rule_svg}
      {body}
    </g>
    <g id="cta">
      <g id="cta_bob">
        <rect x="{cta_x:.2f}" y="{cta_y:.2f}" width="{CTA_W}" height="{CTA_H}" rx="{CTA_H/2}" ry="{CTA_H/2}" fill="{GOLD_TXT}"/>
        <path fill="{NAVY}" d="{bake(cta_word['d'],L/100,lbl_x,lbl_base)}"/>
      </g>
    </g>
    <g id="logo" transform="translate({logo_x:.2f} {logo_y:.2f}) scale({logo_s:.6f})">{logo}</g>
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
open("index.html","w").write(html); print("index.html", len(html), "bytes")
