buymyhouse - 320x50 HTML5 ad (lite)
==================================

lite/       StackAdapt / DV360 - index.html only (no video at this size)
            Built from 320x50/index-5frame.html (the cut without the "in 3 EASY
            steps" frame). The video strip was removed and the layout re-spaced
            across the full 320px: copy column / rule / logo with equal gaps, logo
            at a 20px right margin in both the copy phase and the end card.
            Click-through: standard `clickTag` variable in <head>; the default URL
            is a placeholder - set it in the ad server or edit the one line. A
            ?clickTag=... query parameter is also honoured.
            No video files, so this one is also eligible for Google Ads HTML5
            (drop the clickTag/anchor there - Google makes the whole ad clickable).

backup-320x50-lite.jpg
            Static fallback (end card). Upload separately where asked - not in the zip.

buymyhouse_320x50_lite.zip
            index.html at the ROOT of the zip, as platforms expect. To rebuild:
                cd lite && zip -r -X ../buymyhouse_320x50_lite.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width=320,height=50">, no external
requests (logo inline), no local/session storage, muted autoplay only.
