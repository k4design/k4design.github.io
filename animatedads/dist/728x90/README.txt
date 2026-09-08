buymyhouse - 728x90 HTML5 ad (lite)
==================================

lite/       StackAdapt / DV360 - index.html + bg-728x90.mp4 + bg-728x90-still.jpg
            Built from 728x90/index-5frame.html (the cut without the "in 3 EASY
            steps" frame). Silent H.264, 15 s, loops in step with the timeline and
            re-syncs to frame 0 on every wrap. The still is frame 0 of the video and
            sits under it; if autoplay is refused (iOS Low Power Mode, Safari "Never
            Auto-Play") the video stays hidden and the still carries the ad.
            Footage: cut from the 1280x720 couple master (not bg.mp4, whose field
            of view is too tight to show the laptop) - cover-fit into 186x90, centred
            band, 10 s stretched to 15 s (225 samples at 15 fps). Faces and laptop
            both in frame. No pan on this version: the strip shows the asset centred
            (the animation is kept as a no-op so the 15 s re-sync still fires).
            Click-through: standard `clickTag` variable in <head>; the default URL
            is a placeholder - set it in the ad server or edit the one line. A
            ?clickTag=... query parameter is also honoured.
            Not for Google Ads (video files are rejected there).

lite-house/ Same as lite/, with house_bg.webm as the footage (index.html + bg-728x90.mp4 + bg-728x90-still.jpg; the lite/ layout and edit, 45 kbps).
            house_bg.webm is 832x464, silent, 5.2 s. To fill the 15 s loop without a
            cut it is played as a ping-pong: 113 frames sampled forward (stretched to
            7.5 s, ~0.69x speed), then the same frames in reverse, so the push-in
            becomes a pull-out and the loop closes on frame 0. Encoded silent H.264
            at the strip the ad actually reveals. Backup: backup-728x90-lite-house.jpg.

backup-728x90-lite.jpg
            Static fallback (end card). Upload separately where asked - not in the zip.

buymyhouse_728x90_lite.zip
            index.html at the ROOT of the zip, as platforms expect. To rebuild:
                cd lite && zip -r -X ../buymyhouse_728x90_lite.zip . -x '.DS_Store'

Specs met: <meta name="ad.size" content="width=728,height=90">, no external
requests (logo inline), no local/session storage, muted autoplay only.

HD builds (up to 700 KB zipped) - hd/, hd-house/
            Same index.html as lite/ and lite-house/ with the strip video at 2x: 372x180 (rendered in
            the 186x90 slot), single-pass H.264 at 200 kbps, 15 fps, same centred cover crop.
            Zips: buymyhouse_728x90_hd*.zip (~450-470 KB). Backups: backup-728x90-hd*.jpg.

Change: the thin vertical rule beside the step copy (chrome_rule) is removed from the step frames in all four
builds; the only vertical rule left is the one in the end card (e_rule).
