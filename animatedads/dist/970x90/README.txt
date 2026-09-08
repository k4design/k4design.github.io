buymyhouse - 970x90 HTML5 ad (HD)
=================================

hd/         StackAdapt / DV360 - index.html + bg-970x90.mp4 + bg-970x90-still.jpg
            Super leaderboard. The 728x90 layout re-spaced across 970: 186 px strip (the 728x90 HD asset, 372x180, no pan),
            copy at 1.25x, logo at the right behind a rule. End card = the 728 end card at 1.25x; logo stays put.
            Built by large/build.py from the pieces in dist/728x90/hd/index.html (same outlined type,
            colours, drop shadows and the five-frame 15 s cut: Get a cash offer -> Step 1/2/3 -> end card).
            Video is the existing HD asset, not re-encoded; the page cover-fits it and re-syncs it to
            frame 0 on every wrap of the 15 s timeline. If autoplay is refused (iOS Low Power Mode,
            Safari "Never Auto-Play") the video stays hidden and the still carries the ad.
            Click-through: standard `clickTag` variable in <head>; the default URL is a placeholder -
            set it in the ad server or edit the one line. A ?clickTag=... query parameter is honoured.
            Not for Google Ads (video files are rejected there).

backup-970x90-hd.jpg
            Static fallback (held final frame). Upload separately where asked - not in the zip.

buymyhouse_970x90_hd.zip   453 KB (video 368 KB)
            index.html at the ROOT of the zip, as platforms expect. To rebuild:
                cd hd && zip -r -X ../buymyhouse_970x90_hd.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width=970,height=90">, no external
requests (logo inline), no local/session storage, muted autoplay only.
