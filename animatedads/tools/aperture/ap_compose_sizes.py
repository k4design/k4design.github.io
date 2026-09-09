import os, json
# Aperture carousel unit, every size. AP_SIZE = 768x1024 | 1024x768 | 480x320 | 970x250 | 320x480 | 300x600
# Same vector copy (Figma paths from the 768x1024 frames) re-placed with translate/scale; same 7.5 s looping storyboard.
import os
SC=os.environ.get("AD_ASSETS") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
SIZE=os.environ["AP_SIZE"]; W,H=map(int,SIZE.split("x")); VIDEO=os.environ.get("AP_VIDEO","0")=="1"   # video band instead of the carousel
SET=os.environ.get("AP_SET","ap")   # fragment set: ap = Parque das Nacoes, pw = Priory Walk
NAME=os.environ.get("AP_NAME","Parque das Nações"); URL=os.environ.get("AP_URL","https://www.apertureglobal.com/"); LANG=os.environ.get("AP_LANG","pt")
CTA_LABEL=os.environ.get("AP_CTA","Agendar visita"); ALT=os.environ.get("AP_ALT",NAME)
F={k:open(f"{SC}/{SET}_{k}.svgfrag").read() for k in ("header1","header3","headline","sub1","sub3","sub4","cta")}
if os.path.exists(f"{SC}/{SET}_hero1.svgfrag"): F["hero1"]=open(f"{SC}/{SET}_hero1.svgfrag").read()   # story hero: icon + stacked Exclusive / Offer
B=json.load(open(f"{SC}/{SET}_bboxes.json"))
BLUE="#4090EF"
# ---------------------------------------------------------------- layouts: header region, photo rect, bottom region, scales
L={ "768x1024":dict(head=(0,8,768,194),   photo=(0,194,768,473),  bot=(0,667,768,357),  sh=1.00, sb=1.00, side=False),   # the master, Figma positions
    "1024x768":dict(head=(40,634,300,134), photo=(0,0,1024,634),  bot=(40,634,944,134), sh=1.00, sb=0.55, side=False, row=True),   # video to the top edge, 134 px panel: logo left | address + subline centre | CTA right
    "480x320": dict(head=(16,256,200,64), photo=(0,0,480,256),    bot=(16,256,448,64),  sh=1.00, sb=0.44, side=False, row=True, gap=10, scta=0.36),   # same row structure as 1024x768
    "970x250": dict(head=(612,0,338,250), photo=(0,0,592,250),    bot=(612,0,338,250),  sh=0.40, sb=0.60, side=True, three=True, story=True),   # 15 s one-pass story: icon group -> logo -> headline + rotating text -> final three-group layout
    "320x480": dict(head=(0,0,320,80),    photo=(0,80,320,200),   bot=(0,284,320,196),  sh=0.42, sb=0.50, side=False),
    "300x600": dict(head=(0,0,300,90),    photo=(0,90,300,300),   bot=(0,394,300,206),  sh=0.42, sb=0.50, side=False)}[SIZE]
hx,hy,hw,hh=L["head"]; px,py,pw,ph=L["photo"]; bx,by,bw,bh=L["bot"]; sh=L["sh"]; sb=L["sb"]
def bw_(k): x0,y0,x1,y1=B[k]; return x1-x0
def bh_(k): x0,y0,x1,y1=B[k]; return y1-y0
def place(k,X,Y,s):   # put the fragment's bbox top-left at (X,Y) scaled by s
    x0,y0,_,_=B[k]; return f'<g transform="translate({X-x0*s:.2f} {Y-y0*s:.2f}) scale({s:.4f})">{F[k]}</g>'
def centred(k,rx,rw,Y,s): return place(k, rx+(rw-bw_(k)*s)/2, Y, s)
# header: both wordmarks centred in the header region
hs=min(sh, hw*0.9/max(bw_("header1"),bw_("header3")), hh*0.8/max(bh_("header1"),bh_("header3")))
hY=hy+(hh-bh_("header3")*hs)/2
head1=centred("header1",hx,hw,hy+(hh-bh_("header1")*hs)/2,hs); head3=centred("header3",hx,hw,hY,hs)
# bottom stack: headline / subline / CTA, centred vertically in the bottom region
s_hl=min(sb, bw*0.94/bw_("headline")); s_sub=min(s_hl, bw*0.94/bw_("sub4")); s_cta=s_hl
g1=26*s_hl
textH=bh_("headline")*s_hl+g1+bh_("sub4")*s_sub; ctaH=bh_("cta")*s_cta
pad=max(6,(bh-textH-ctaH)/3)                      # space-around: equal air above the text group, between it and the CTA, and below
Y0=by+pad; hl_y=Y0; sub_y=hl_y+bh_("headline")*s_hl+g1; cta_y=hl_y+textH+pad; stack=textH+pad+ctaH
if L.get("three"):
    # three groups - header (logo / Exclusive Offer), headline + subline, CTA - centred horizontally, equal air above/between/below
    headH=max(bh_("header1"),bh_("header3"))*hs; ctaH=bh_("cta")*s_cta
    pad=max(6,(bh-headH-textH-ctaH)/4)
    head_y=by+pad; hl_y=head_y+headH+pad; sub_y=hl_y+bh_("headline")*s_hl+g1; cta_y=hl_y+textH+pad
    head1=centred("header1",bx,bw,head_y+(headH-bh_("header1")*hs)/2,hs); head3=centred("header3",bx,bw,head_y+(headH-bh_("header3")*hs)/2,hs)
    headline=centred("headline",bx,bw,hl_y,s_hl); subs={k:centred(k,bx,bw,sub_y,s_sub) for k in ("sub1","sub3","sub4")}
    cta=centred("cta",bx,bw,cta_y,s_cta); cta_box=(bx+(bw-bw_("cta")*s_cta)/2-10, cta_y-10, bw_("cta")*s_cta+20, ctaH+20); Y0=head_y; stack=headH+textH+ctaH+2*pad
elif L.get("row"):
    # one row, vertically centred in the panel: header (logo / Exclusive Offer) LEFT, headline + subline (left-aligned) in the MIDDLE, CTA RIGHT
    mid_y=by+bh/2; G=L.get("gap",28)
    s_cta=L.get("scta",0.6); cta_w=bw_("cta")*s_cta; cta_x=W-bx-cta_w; cta_y=mid_y-bh_("cta")*s_cta/2
    # AUTO-FIT (template standard): logo | rule | text must all sit left of the CTA with a G gap, so scale the whole
    # group down by k until it does - the logo is sized off the text height, so one factor drives everything.
    base_textH=bh_("headline")*s_hl+g1+bh_("sub4")*s_sub
    base_head_w=bw_("header3")*(base_textH/bh_("header3"))
    base_text_w=max(bw_("headline")*s_hl,bw_("sub4")*s_sub)
    avail=(cta_x-G)-bx-(2*G+2)                                    # room for logo + text once the two gaps and the rule are taken
    k=min(1.0, avail/(base_head_w+base_text_w), (bh*0.80)/base_textH)
    s_hl*=k; s_sub*=k; g1*=k
    textH=bh_("headline")*s_hl+g1+bh_("sub4")*s_sub; hl_y=mid_y-textH/2; sub_y=hl_y+bh_("headline")*s_hl+g1
    hs3=textH/bh_("header3"); head_w=bw_("header3")*hs3           # Aperture logo as tall as the text group ...
    hs1=head_w/bw_("header1")                                      # ... and the Exclusive Offer group set to the SAME WIDTH
    head1=place("header1",bx,mid_y-bh_("header1")*hs1/2,hs1); head3=place("header3",bx,mid_y-textH/2,hs3)
    rule_x=bx+head_w+G; text_x=rule_x+2+G                          # logo | rule | text, left-aligned with equal gaps
    ROW_RULE=f'<rect x="{rule_x:.2f}" y="{mid_y-textH/2:.2f}" width="2" height="{textH:.2f}" fill="{BLUE}"/>'
    text_w=max(bw_("headline")*s_hl,bw_("sub4")*s_sub)
    headline=place("headline",text_x,hl_y,s_hl); subs={k2:place(k2,text_x,sub_y,s_sub) for k2 in ("sub1","sub3","sub4")}
    cta=place("cta",cta_x,cta_y,s_cta); cta_box=(cta_x-10,cta_y-10,cta_w+20,bh_("cta")*s_cta+20); Y0=hl_y; stack=textH
    print(f"  row auto-fit k={k:.3f} | logo {bx:.0f}-{bx+head_w:.0f} | rule {rule_x:.0f} | text {text_x:.0f}-{text_x+text_w:.0f} | CTA {cta_x:.0f}-{cta_x+cta_w:.0f} (gap {cta_x-(text_x+text_w):.0f})")
elif L.get("bl"):
    headH=max(bh_("header1"),bh_("header3"))*hs
    pad=max(6,(bh-headH-textH)/3)
    head_y=by+pad; hl_y=head_y+headH+pad; sub_y=hl_y+bh_("headline")*s_hl+g1
    head1=place("header1",bx,head_y+(headH-bh_("header1")*hs)/2,hs); head3=place("header3",bx,head_y+(headH-bh_("header3")*hs)/2,hs)
    headline=place("headline",bx,hl_y,s_hl); subs={k:place(k,bx,sub_y,s_sub) for k in ("sub1","sub3","sub4")}
    s_cta=min(sb,1.0); cta_y=by+(bh-bh_("cta")*s_cta)/2; cta_x=W-40-bw_("cta")*s_cta
    cta=place("cta",cta_x,cta_y,s_cta); cta_box=(cta_x-10,cta_y-10,bw_("cta")*s_cta+20,bh_("cta")*s_cta+20); Y0=head_y; stack=headH+2*pad+textH
else:
    headline=centred("headline",bx,bw,hl_y,s_hl)
    subs={k:centred(k,bx,bw,sub_y,s_sub) for k in ("sub1","sub3","sub4")}
    cta=centred("cta",bx,bw,cta_y,s_cta)
    cta_box=(bx+(bw-bw_("cta")*s_cta)/2-10, cta_y-10, bw_("cta")*s_cta+20, bh_("cta")*s_cta+20)
rules = (globals().get('ROW_RULE','')) + (f'<rect x="{px+pw-1}" y="{py}" width="3" height="{ph}" fill="{BLUE}"/>' if L["side"]
         else (f'<rect x="0" y="{py+ph-1}" width="{W}" height="3" fill="{BLUE}"/>' if py==0 else f'<rect x="0" y="{py}" width="{W}" height="3" fill="{BLUE}"/><rect x="0" y="{py+ph-1}" width="{W}" height="3" fill="{BLUE}"/>'))
small = W<500
NAV=30 if small else 44; DOT=7 if small else 10
print(f"{SIZE}: header s {hs:.2f} | stack s {s_hl:.2f}/{s_sub:.2f} block {Y0:.0f}-{Y0+stack:.0f} in {by}-{by+bh} | cta box {[round(v) for v in cta_box]}")
# ---------------------------------------------------------------- motion (identical storyboard to the 768x1024 unit)
T=15.0; DUR=7.5
def pct(t): return round(t/T*100,3)
E="cubic-bezier(0.5,0,0.5,1)"
def kf_inout(name,a,b,c,d): return f"@keyframes {name} {{ 0%, {pct(a)}% {{ opacity:0; transform:translateX(-48px); animation-timing-function:{E}; }} {pct(b)}% {{ opacity:1; transform:translateX(0); animation-timing-function:linear; }} {pct(c)}% {{ opacity:1; transform:translateX(0); animation-timing-function:{E}; }} {pct(d)}%, 100% {{ opacity:0; transform:translateX(48px); }} }}"
def kf_loop1(name,c,d,e,f): return f"@keyframes {name} {{ 0%, {pct(c)}% {{ opacity:1; transform:translateX(0); animation-timing-function:{E}; }} {pct(d)}% {{ opacity:0; transform:translateX(48px); }} {pct(d)+0.001}%, {pct(e)}% {{ opacity:0; transform:translateX(-48px); animation-timing-function:{E}; }} {pct(f)}%, 100% {{ opacity:1; transform:translateX(0); }} }}"
HD1_END=0.5+4.375/2; HD3_IN=0.5+4.375/2   # real seconds
kf="\n".join([kf_loop1("kf_f1",3.575,4.375,13.8,15.0),
 f"@keyframes kf_hd1 {{ 0%, {0.65/HD1_END*100:.3f}% {{ opacity:0; animation-timing-function:{E}; }} {1.85/HD1_END*100:.3f}% {{ opacity:1; }} {(HD1_END-0.8)/HD1_END*100:.3f}% {{ opacity:1; animation-timing-function:{E}; }} 100% {{ opacity:0; }} }}",      # header groups: fade only (1.2 s in, 0.8 s out), no pan
 f"@keyframes kf_hd3 {{ 0%, {HD3_IN/(HD3_IN+1.2)*100:.3f}% {{ opacity:0; animation-timing-function:{E}; }} 100% {{ opacity:1; }} }}", kf_inout("kf_s3",4.375,5.575,7.65,8.45), kf_inout("kf_s4",8.45,9.65,13.8,14.6),
 "@keyframes kf_intro { 0% { opacity:0; transform:translateX(-48px); } 100% { opacity:1; transform:translateX(0); } }",
 "@keyframes kf_fade_once { 0% { opacity:0; } 100% { opacity:1; } }",
 "@keyframes kf_cta_bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }",
 "@keyframes kf_vid { 0%, 100% { opacity:1; } }"])   # 15 s beat the video re-syncs to
STORY = L.get("story",False)
if STORY:
    # hero zone: the space above the CTA; A = icon group, B = logo, C = headline + rotating sublines, then the final three-group frame
    zt=by; zb=cta_y-10; zc=(zt+zb)/2; zh=zb-zt                      # the space above the CTA
    kA="hero1" if "hero1" in F else "header1"
    hsA=min(bw*0.88/bw_(kA), zh*0.80/bh_(kA))                        # icon + stacked Exclusive / Offer, centred in that space
    A=centred(kA,bx,bw,zc-bh_(kA)*hsA/2,hsA)
    hsB=min(bw*0.88/bw_("header3"), zh*0.62/bh_("header3")); Bg=centred("header3",bx,bw,zc-bh_("header3")*hsB/2,hsB)
    c_hl_y=zc-textH/2; c_sub_y=c_hl_y+bh_("headline")*s_hl+g1
    C_hl=centred("headline",bx,bw,c_hl_y,s_hl); C_subs={k:centred(k,bx,bw,c_sub_y,s_sub) for k in ("sub1","sub3","sub4")}
    def P(t): return round(t/15*100,3)
    def fade(name,a,b,cc,d): return f"@keyframes {name} {{ 0%, {P(a)}% {{ opacity:0; animation-timing-function:{E}; }} {P(b)}% {{ opacity:1; animation-timing-function:linear; }} {P(cc)}% {{ opacity:1; animation-timing-function:{E}; }} {P(d)}%, 100% {{ opacity:0; }} }}"
    def pan(name,a,b,cc,d): return f"@keyframes {name} {{ 0%, {P(a)}% {{ opacity:0; transform:translateX(-48px); animation-timing-function:{E}; }} {P(b)}% {{ opacity:1; transform:translateX(0); animation-timing-function:linear; }} {P(cc)}% {{ opacity:1; transform:translateX(0); animation-timing-function:{E}; }} {P(d)}%, 100% {{ opacity:0; transform:translateX(48px); }} }}"
    STORY_KF="\n".join([fade("kf_A",0.5,1.0,2.0,2.5), fade("kf_B",2.5,3.0,5.0,5.5), fade("kf_C",5.5,6.0,12.0,12.4),
        pan("kf_c1",5.5,6.1,7.1,7.5), pan("kf_c3",7.5,8.1,9.1,9.5), pan("kf_c4",9.5,10.1,11.6,12.0),
        f"@keyframes kf_final {{ 0%, {P(12.4)}% {{ opacity:0; animation-timing-function:{E}; }} {P(13.0)}%, 100% {{ opacity:1; }} }}"])
    STORY_CSS="\n".join(f"  #{g} {{ opacity:0; transform-origin:0 0; animation: {k} 15s linear 1 forwards; }}" for g,k in (("gA","kf_A"),("gB","kf_B"),("gC","kf_C"),("c1","kf_c1"),("c3","kf_c3"),("c4","kf_c4"),("gF","kf_final")))
    STORY_SVG=f"""    <g id="gA">{A}</g>
    <g id="gB">{Bg}</g>
    <g id="gC">{C_hl}<g id="c1">{C_subs['sub1']}</g><g id="c3">{C_subs['sub3']}</g><g id="c4">{C_subs['sub4']}</g></g>
    <g id="gF">{head3}{headline}{subs['sub1']}</g>"""
    STORY_LEAD="gA"; STORY_CUTS="[[5500, 1], [9500, 2], [12400, 3]]"; STORY_PERIOD=15000
CAROUSEL_JS=f"""<script type="text/javascript">
  (function () {{
    var track = document.getElementById('track'), N = track.children.length, STEP = {pw};
    var dots = Array.prototype.slice.call(document.querySelectorAll('#dots button'));
    var cur = 0, RESUME = 6000;
    function show(i) {{ cur = (i + N) % N; track.style.transform = 'translateX(' + (-cur * STEP) + 'px)'; dots.forEach(function (d, k) {{ d.className = k === cur ? 'on' : ''; }}); }}
    var lead = document.getElementById('{STORY_LEAD if STORY else 'f1'}'), CUTS = {STORY_CUTS if STORY else '[[2188, 1], [4225, 2], [5562, 3], [6900, 0]]'}, autoOn = true, PERIOD = {STORY_PERIOD if STORY else 7500}, OFF = {0 if STORY else 500};
    var freeT0 = null;
    function phase() {{ var a = lead.getAnimations ? lead.getAnimations()[0] : null;
      if (a && a.playState === 'running' && a.currentTime != null) {{ freeT0 = null; return Math.max(0, a.currentTime - OFF) % PERIOD; }}
      if (freeT0 === null) freeT0 = Date.now() - ((a && a.currentTime) ? Math.max(0, a.currentTime - OFF) % PERIOD : 0);   // copy stopped: keep rotating on a free-running clock, continuing from the current phase
      return (Date.now() - freeT0) % PERIOD; }}
    function wanted(ph) {{ var w = 0; for (var k = 0; k < CUTS.length; k++) if (ph >= CUTS[k][0]) w = CUTS[k][1]; return w; }}
    setInterval(function () {{ if (!autoOn) return; var ph = phase(); if (ph === null) return; var w = wanted(ph); if (w !== cur) show(w); }}, 100);
    var resume = null, hint = document.getElementById('swipe');
    function dismissHint() {{ if (hint) {{ var el = hint; hint = null; el.className = 'gone'; setTimeout(function () {{ if (el.parentNode) el.parentNode.removeChild(el); }}, 500); }} }}
    function user(fn) {{ return function (e) {{ e.preventDefault(); e.stopPropagation(); autoOn = false; clearTimeout(resume); dismissHint(); fn(); resume = setTimeout(function () {{ autoOn = true; }}, RESUME); }}; }}
    document.getElementById('prev').addEventListener('click', user(function () {{ show(cur - 1); }}));
    document.getElementById('next').addEventListener('click', user(function () {{ show(cur + 1); }}));
    dots.forEach(function (d, k) {{ d.addEventListener('click', user(function () {{ show(k); }})); }});
    var x0 = null, band = document.getElementById('band');
    band.addEventListener('touchstart', function (e) {{ x0 = e.touches[0].clientX; }}, {{ passive: true }});
    band.addEventListener('touchend', function (e) {{ if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) {{ autoOn = false; clearTimeout(resume); dismissHint(); show(cur + (dx < 0 ? 1 : -1)); resume = setTimeout(function () {{ autoOn = true; }}, RESUME); }} }});
  }})();
</script>"""
VIDEO_JS="""<script type="text/javascript">
  (function () {
    var v = document.querySelector('#band video'), ad = document.getElementById('ad');
    v.muted = true; v.defaultMuted = true;
    v.addEventListener('playing', function () { ad.className = ''; });
    v.addEventListener('pause',   function () { if (!v.ended) ad.className = 'no-autoplay'; });
    function play() { var p = v.play(); if (p) p.catch(function () {}); }
    var LOOP = 15;
    v.addEventListener('loadedmetadata', function () { if (isFinite(v.duration) && v.duration > 0 && Math.abs(v.duration - LOOP) > 0.05) { v.defaultPlaybackRate = v.playbackRate = v.duration / LOOP; } });
    v.addEventListener('animationiteration', function (e) { if (e.animationName === 'kf_vid') { try { v.currentTime = 0; } catch (x) {} } });
    v.addEventListener('loadedmetadata', play);
    v.addEventListener('canplay', play, { once: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    if (v.readyState >= 1) play();
    setTimeout(function () { if (v.paused) ad.className = 'no-autoplay'; }, 4000);
    // Fallback watchdog. iOS Low Power Mode can report the video as playing (paused === false, currentTime even
    // advancing) while it never PAINTS a frame, so we count presented frames rather than trusting the clock.
    // It only arms after the first 'playing' event - before that the video is still hidden behind the fallback and
    // would present no frames, which used to trip a false positive - and the decision is final for the impression.
    var frames = 0, hasRVFC = typeof v.requestVideoFrameCallback === 'function', watch = null;
    function onFrame() { frames++; if (hasRVFC) v.requestVideoFrameCallback(onFrame); }
    if (hasRVFC) v.requestVideoFrameCallback(onFrame);
    function painted() {
      if (hasRVFC) return frames;
      if (v.getVideoPlaybackQuality) { try { return v.getVideoPlaybackQuality().totalVideoFrames; } catch (e) {} }
      if (typeof v.webkitDecodedFrameCount === 'number') return v.webkitDecodedFrameCount;
      return Math.round(v.currentTime * 15);                              // last resort: time-based
    }
    // Only judge while the ad is genuinely on screen: a hidden tab or an off-screen (lazy) slot stops the video
    // decoding too, and that must not be mistaken for Low Power Mode.
    var onScreen = true;
    if (window.IntersectionObserver) { try { new IntersectionObserver(function (es) { onScreen = es[es.length - 1].isIntersecting; }, { threshold: 0.1 }).observe(ad); } catch (e) {} }
    function armWatch() {
      if (watch) return;
      var last = painted(), stuck = 0;
      watch = setInterval(function () {
        if (v.paused || document.hidden || !onScreen) { last = painted(); stuck = 0; return; }
        var f = painted();
        if (f <= last) { if (++stuck >= 2) { ad.className = 'no-autoplay'; clearInterval(watch); } }   // playing but never painting: hand over to the carousel
        else { stuck = 0; if (f > last + 4) clearInterval(watch); }                                     // genuinely painting: stop watching
        last = f;
      }, 1000);
    }
    v.addEventListener('playing', armWatch);
  })();
</script>"""
CAROUSEL_BAND=f"""    <div id="track"><img src="photo1.jpg" alt="{ALT} 1"><img src="photo2.jpg" alt="{ALT} 2"><img src="photo3.jpg" alt="{ALT} 3"><img src="photo4.jpg" alt="{ALT} 4"></div>
    <button class="nav" id="prev" type="button" aria-label="Imagem anterior"><svg viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 3.5 6 9l5.5 5.5"/></svg></button>
    <button class="nav" id="next" type="button" aria-label="Próxima imagem"><svg viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5 12 9l-5.5 5.5"/></svg></button>
    <div id="dots"><button type="button" class="on" aria-label="Imagem 1"></button><button type="button" aria-label="Imagem 2"></button><button type="button" aria-label="Imagem 3"></button><button type="button" aria-label="Imagem 4"></button></div>
    <div id="swipe" aria-hidden="true"><svg viewBox="0 0 64 40" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20 3 14m0 6 6 6M3 20h10"/><path d="M55 20l6-6m0 6-6 6M61 20H51"/><path d="M27 32V13.5a2.5 2.5 0 0 1 5 0V22m0-3a2.5 2.5 0 0 1 5 0v3m0-2a2.5 2.5 0 0 1 5 0v2m0-1a2.5 2.5 0 0 1 5 0v6c0 4.5-3 8.5-8 8.5h-5c-3.5 0-5.5-1.5-7.5-4.5L23 25.5a2.4 2.4 0 0 1 4-2.5"/></svg></div>"""
VIDEO_BAND=CAROUSEL_BAND+f"""
    <video src="video.mp4" poster="photo1.jpg" autoplay muted loop playsinline preload="auto" webkit-playsinline disableremoteplayback></video>"""
AD_CLASS=' class="no-autoplay"' if VIDEO else ""
LOOP_SVG=f"""    <g id="hd1">{head1}</g>
    <g id="hd3">{head3}</g>
    <g id="f1_intro"><g id="f1">
      {subs['sub1']}
    </g></g>
    <g id="s3">{subs['sub3']}</g>
    <g id="s4">{subs['sub4']}</g>"""
html=f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width={W},height={H}">
<title>Aperture · {NAME} · {SIZE} {"video" if VIDEO else "carousel"}</title>
<script type="text/javascript">
  var clickTag = "{URL}";
</script>
<script type="text/javascript">
  (function () {{ var m = /[?&]clicktag=([^&#]*)/i.exec(window.location.search); if (m) {{ try {{ clickTag = decodeURIComponent(m[1]); }} catch (e) {{}} }} }})();
</script>
<style>
  :root {{ color-scheme: dark; }}
  html, body {{ margin:0; padding:0; background:#0b0f16; overflow:hidden; }}
  #ad {{ position:relative; width:{W}px; height:{H}px; overflow:hidden; background:#0b0f16 url(bg.jpg) 0 0/{W}px {H}px no-repeat; font-family: Helvetica, Arial, sans-serif; }}
  #ad > svg {{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }}
  #band {{ position:absolute; left:{px}px; top:{py}px; width:{pw}px; height:{ph}px; overflow:hidden; background:#000; opacity:0; animation: kf_fade_once 0.8s linear 1 forwards; }}
  #track {{ position:absolute; left:0; top:0; height:{ph}px; display:flex; will-change:transform; transition: transform .7s cubic-bezier(0.5,0,0.3,1); }}
  #track img {{ width:{pw}px; height:{ph}px; object-fit:cover; flex:0 0 {pw}px; display:block; }}
  #band video {{ position:absolute; left:0; top:0; width:{pw}px; height:{ph}px; object-fit:cover; display:block; z-index:3; animation: kf_vid 15s linear infinite; }}
  /* video unit: the carousel is the fallback - hidden while the video plays, revealed (with its controls) when autoplay is refused */
  {'#ad:not(.no-autoplay) .nav, #ad:not(.no-autoplay) #dots, #ad:not(.no-autoplay) #swipe { display:none !important; }  #ad.no-autoplay video { display:none; }' if VIDEO else ''}
  #band::before {{ content:""; position:absolute; inset:0; background:rgba(0,0,0,.2); pointer-events:none; z-index:2; }}
  #band::after  {{ content:""; position:absolute; inset:0; box-shadow: inset 0 4px 4px rgba(0,0,0,.25); pointer-events:none; z-index:2; }}
  .nav {{ position:absolute; top:50%; width:{NAV}px; height:{NAV}px; margin-top:-{NAV//2}px; border:0; border-radius:50%; background:rgba(11,15,22,.55); color:#fff; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; padding:0; transition: background .2s; }}
  .nav:hover {{ background:rgba(64,144,239,.85); }}
  .nav svg {{ width:{NAV*0.4:.0f}px; height:{NAV*0.4:.0f}px; display:block; }}
  #prev {{ left:{8 if small else 14}px; }} #next {{ right:{8 if small else 14}px; }}
  #dots {{ position:absolute; left:0; right:0; bottom:{8 if small else 14}px; display:flex; justify-content:center; gap:{6 if small else 8}px; z-index:5; }}
  #dots button {{ width:{DOT}px; height:{DOT}px; border-radius:50%; border:1px solid rgba(255,255,255,.8); background:transparent; padding:0; cursor:pointer; transition: background .2s; }}
  #dots button.on {{ background:{BLUE}; border-color:{BLUE}; }}
  #swipe {{ position:absolute; left:50%; top:50%; width:{128 if small else 176}px; height:{80 if small else 110}px; margin:-{40 if small else 55}px 0 0 -{64 if small else 88}px; z-index:5; display:none; pointer-events:none; filter:drop-shadow(0 3px 8px rgba(0,0,0,.6)); opacity:.6; transition:opacity .4s; }}   /* 2x, partly transparent */
  #swipe svg {{ width:100%; height:100%; animation: kf_swipe 2.2s cubic-bezier(0.45,0,0.2,1) infinite; }}
  @media (hover:none) and (pointer:coarse) {{ #swipe {{ display:block; }} }}   /* touch screens only */
  #swipe.gone {{ opacity:0 !important; }}
  /* swoop: sweep right with a lift and a slight tilt, pause, then glide back */
  @keyframes kf_swipe {{ 0% {{ transform:translate({-34 if small else -48}px,6px) rotate(-10deg); }} 22% {{ transform:translate(0,-6px) rotate(0deg); }} 45% {{ transform:translate({34 if small else 48}px,4px) rotate(9deg); }} 60% {{ transform:translate({34 if small else 48}px,4px) rotate(9deg); }} 100% {{ transform:translate({-34 if small else -48}px,6px) rotate(-10deg); }} }}
  #ad g[id] {{ will-change: transform, opacity; }}
  #static {{ opacity:0; animation: kf_fade_once 0.8s linear 1 forwards; animation-delay:0.5s; }}
  #cta_bob {{ animation: kf_cta_bob 1.9s ease-in-out infinite; }}
  /* hover state - driven off the click layer, which is the element that actually receives the pointer
     (the artwork SVG is pointer-events:none). Desktop only: :hover never matches on touch. */
  #cta_hover {{ transition: transform .25s cubic-bezier(0.4,0,0.2,1), filter .25s; }}
  #cta_hover line {{ transition: stroke .25s, stroke-width .25s; }}
  #cta_hover path {{ transition: fill .25s; }}
  #clickthrough:hover ~ svg #cta_bob {{ animation-play-state: paused; }}          /* idle bob pauses so the two don't fight */
  #clickthrough:hover ~ svg #cta_hover {{ transform: translateY(-3px); filter: drop-shadow(0 2px 10px rgba(64,144,239,.55)); }}
  #clickthrough:hover ~ svg #cta_hover line {{ stroke:#8cc4ff; stroke-width:4.5; }}
  #clickthrough:hover ~ svg #cta_hover path {{ fill:#8cc4ff; }}                     /* label turns blue with the rule */
  #f1_intro {{ opacity:0; transform-origin:0 0; animation: kf_intro 0.6s cubic-bezier(0.5,0,0.5,1) 1 forwards; animation-delay:0.65s; }}
  #hd1 {{ opacity:0; transform-origin:0 0; animation: kf_hd1 {HD1_END}s linear 1 forwards; }}          /* Oferta Exclusiva: first pass only */
  #hd3 {{ opacity:0; transform-origin:0 0; animation: kf_hd3 {HD3_IN+1.2}s linear 1 forwards; }}       /* Aperture logo: arrives with frame 3, stays */
  #f1 {{ transform-origin:0 0; animation: kf_f1 {DUR}s linear infinite forwards; animation-delay:0.5s; }}
  #s3 {{ opacity:0; transform-origin:0 0; animation: kf_s3 {DUR}s linear infinite forwards; animation-delay:0.5s; }}
  #s4 {{ opacity:0; transform-origin:0 0; animation: kf_s4 {DUR}s linear infinite forwards; animation-delay:0.5s; }}
  #clickthrough {{ position:absolute; left:{cta_box[0]:.0f}px; top:{cta_box[1]:.0f}px; width:{cta_box[2]:.0f}px; height:{cta_box[3]:.0f}px; display:block; cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent; z-index:3; }}
{kf}
{STORY_KF if STORY else ''}
{STORY_CSS if STORY else ''}
</style>
</head>
<body>
<div id="ad"{AD_CLASS}>
  <div id="band" aria-roledescription="carousel">
{VIDEO_BAND if VIDEO else CAROUSEL_BAND}
  </div>
  <a id="clickthrough" href="javascript:window.open(window.clickTag)" aria-label="{CTA_LABEL} - Aperture Global Real Estate"></a>
  <svg viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="static">
      {rules}
      {'' if STORY else headline}
      <g id="cta_bob"><g id="cta_hover">{cta}</g></g>
    </g>
{STORY_SVG if STORY else LOOP_SVG}
  </svg>
</div>
{(CAROUSEL_JS+VIDEO_JS) if VIDEO else CAROUSEL_JS}
</script>
</body>
</html>
"""
open("index.html","w").write(html); print("index.html", len(html)//1024, "KB")
