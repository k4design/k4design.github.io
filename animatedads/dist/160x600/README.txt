buymyhouse - 160x600 HTML5 ad (HD)
==================================

hd/         StackAdapt / DV360 - index.html + bg-160x600.mp4 + bg-160x600-still.jpg
            Skyscraper. 220 px video band on top (asset cover-fit to 343x220, 90 px pan); headlines split onto two lines
            (white line, then the green key words) at 0.62x, CTA and logo persistent. End card: "3 steps" + tag stacked.
            Built by large/build.py from the pieces in dist/728x90/hd/index.html (same outlined type,
            colours, drop shadows and the five-frame 15 s cut: Get a cash offer -> Step 1/2/3 -> end card).
            Video is the existing HD asset, not re-encoded; the page cover-fits it and re-syncs it to
            frame 0 on every wrap of the 15 s timeline. If autoplay is refused (iOS Low Power Mode,
            Safari "Never Auto-Play") the video stays hidden and the still carries the ad.
            Click-through: standard `clickTag` variable in <head>; the default URL is a placeholder -
            set it in the ad server or edit the one line. A ?clickTag=... query parameter is honoured.
            Not for Google Ads (video files are rejected there).

backup-160x600-hd.jpg
            Static fallback (held final frame). Upload separately where asked - not in the zip.

buymyhouse_160x600_hd.zip   672 KB (video 550 KB)
            index.html at the ROOT of the zip, as platforms expect. To rebuild:
                cd hd && zip -r -X ../buymyhouse_160x600_hd.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width=160,height=600">, no external
requests (logo inline), no local/session storage, muted autoplay only.
