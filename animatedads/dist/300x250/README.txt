buymyhouse - 300x250 HTML5 ad
=============================

Two builds of the same creative, because the platforms disagree on video:

video/      StackAdapt, DV360, Campaign Manager 360, most DSPs
            index.html + bg-300x250.mp4 (muted, autoplay, loops with the 15s timeline)
            + bg-300x250.jpg: a still of the same frame sitting under the video.
            Safari blocks autoplay in iOS Low Power Mode and when a user has
            set "Never Auto-Play" for the site; if play() is refused the video
            is hidden and the still takes over with the same slow pan, so the
            ad never shows a black box or a play button. Nothing to configure -
            but do ask the publisher to keep allow="autoplay" on the iframe.
            Click-through: standard `clickTag` variable in <head>. The default
            landing URL is a placeholder - set it in the ad server, or edit the
            `var clickTag = "..."` line in index.html. A ?clickTag=... query
            parameter is also honoured for DSPs that pass it that way.

webm/       StackAdapt / DV360 - the WebM cut (1280x720 source, wider framing)
            index.html + bg-300x250.webm + bg-300x250-still.jpg. Different edit from
            video/: steps first, "Cash Offer / Fast" closes and holds; green key words.
            Same clickTag setup as video/. The still is frame 0 of the WebM and sits
            under the video; if autoplay is refused (iOS Low Power Mode, "Never
            Auto-Play") the video stays hidden and the still carries the ad.
            CAVEATS: ~1.1 MB zip (the WebM is 873 KB) - well over the ~200 KB most
            DSPs recommend, so confirm StackAdapt's ceiling for your placement. WebM
            support in Safari is software-decoded on Mac and partial on iOS, and this
            file carries an audio track, which Safari treats less kindly than silent
            video. The MP4 in video/ is the safer bet for Safari-heavy inventory.
            Not for Google Ads (video files are rejected).

lite/       StackAdapt / DV360 - the WebM cut's design, under 200 KB zipped
            index.html + bg-300x250.mp4 + bg-300x250-still.jpg. Same edit as webm/
            (steps first, "Cash Offer / Fast" closes and holds, green key words) and
            the same wide framing, but the video is a silent H.264 MP4 re-encoded
            from the WebM's frames - the WebM itself is 873 KB and cannot be made
            small. How the weight came down:
              - video: 15 s at 68 kbps, 390x250 = exactly the region the 90 px pan
                ever reveals (nothing encoded that is never on screen); no audio
                track, which is also the format Safari autoplays most reliably.
                The 10 s of footage is stretched to 15 s (225 frames sampled from
                the source, played at 15 fps = 1.5x slower) so the video loops in
                step with the ad, and the page re-syncs it to frame 0 on every
                wrap of the 15 s timeline. webm/ does the same with playbackRate.
              - logo bitmap 2041x814 -> 200 px (it fills a 75x30 slot)
              - path coordinates rounded to 0.01 px; dead Figma stylesheet removed
              - still (frame 0) at 1x, JPEG q60 - it only shows if autoplay is refused
            Plays everywhere the MP4 build plays, including Safari/iOS.

googleads/  Google Ads (HTML5 upload)
            index.html + bg.jpg - no video, no scripts, no exits. Google Ads
            does not accept video files inside HTML5 zips and makes the whole
            ad clickable itself, so the background is a still frame with the
            same slow pan. Zip is well under the 600 KB / 40-file limits.

backup-300x250.jpg / backup-300x250-webm.jpg / backup-300x250-lite.jpg
            Static fallbacks (one per cut). Upload it separately where the platform asks for
            a backup image (DV360 / CM360 / StackAdapt). It is deliberately
            NOT inside either zip.

Zips: the platforms expect index.html at the ROOT of the zip, not inside a
folder. The two .zip files here are already built that way. To rebuild:

    cd video     && zip -r -X ../buymyhouse_300x250_video.zip .     -x '.DS_Store'
    cd webm      && zip -r -X ../buymyhouse_300x250_webm.zip .      -x '.DS_Store'
    cd lite      && zip -r -X ../buymyhouse_300x250_lite.zip .      -x '.DS_Store'
    cd googleads && zip -r -X ../buymyhouse_300x250_googleads.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width=300,height=250">, no external
requests (logo is inline), no local/session storage, muted autoplay only.
