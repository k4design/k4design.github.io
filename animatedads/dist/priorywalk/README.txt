Aperture Global Real Estate - Priory Walk, Kensington (London SW10) - HTML5 units, carousel + video, six sizes
Template: the Parque das Nacoes set (same layouts, storyboard, 7.5 s infinite loop, CTA-only click-through, carousel fallback).
Copy (from apertureglobal.com/priorywalkkensington): "Premier Listing" / APERTURE wordmark; headline "Priory Walk";
sublines "Kensington, London" | "6 br | 5 bth | 3,810 sq ft" | "Listed by Caroline de Havillande"; CTA "Schedule a viewing".
Fonts are stand-ins for the Figma faces: Cormorant Garamond Medium / Medium Italic (serif), Helvetica Neue Light (sublines), Helvetica Neue (CTA).
clickTag default: https://www.apertureglobal.com/priorywalkkensington
Video: priorywalk/1.mp4 ... 6.mp4 in naming order, first 2.5 s of each = 15 s (225 frames at 15 fps), Lanczos-cropped per band,
single-pass silent H.264 (150 kbps + photos q50 on the two large video units, 120-200 kbps others). Clips 3-6 are 768x512 sources, so the two wide bands upscale them slightly.
Carousel photos: frames from clips 1, 2, 4 and 6 (photo1-4.jpg) - swap for stills if preferred.
Folders: APERTURE_PrioryWalk_<size>_video / _carousel (+ .zip + _backup.jpg). Preview: preview.html; review site: preview-site(.zip) and preview-site-netlify.zip.
1024x768: video/photo band 1024x634 from the top edge (panel 134 px, half the previous height), one rule under it; one row, left-aligned with equal 28 px gaps - Aperture logo (as tall as the text group) / Premier Listing (same width as the logo) | 2 px blue vertical rule | address + animating subline; CTA right (scale .60). Video encoded at 800x495 (120 kbps, CSS-upscaled into the 1024x634 band) + photos q36 to fit.
970x250: video 592 px wide (panel 338 px, 30 % narrower than before); right panel = three groups with equal spacing - logo (scale .40) / headline (scale .60) + rotating subline / CTA.
Carousels: once the copy timeline stops (e.g. the preview holding its final frame) the photos keep rotating on a free-running 7.5 s clock.
Header groups (Premier Listing, Aperture logo) fade in/out only - no horizontal pan; 1.2 s in, 0.8 s out (all sizes).
480x320: same row structure as 1024x768 - video 480x256 to the top edge, 64 px panel: logo | rule | address + subline, CTA right. Row AUTO-FITS: the group scales down until it clears the CTA by the gap (k~0.55 here).
Sublines (rotating text) letter-spaced +0.08 em.
970x250 story (15 s, plays once then holds the final frame; photos follow the beats and keep rotating afterwards):
  0.5-2.5  icon group (Premier Listing) fades in above the CTA, holds 1 s, fades out
  2.5-5.5  Aperture logo fades in above the CTA, holds 2 s, fades out
  5.5-12.4 headline + rotating subline above the CTA, each line once: Kensington 5.5-7.5, specs 7.5-9.5, agent 9.5-12.0
  12.4-13  final frame fades in: logo / headline + "Kensington, London" / CTA (the three-group layout)
  CTA is static throughout. Photos: 1 at start, 2 at 5.5 s, 3 at 9.5 s, 4 at 12.4 s.
Swipe hint: an animated hand + arrows icon (176x110 px, 128x80 on the small sizes, 60 % opacity, swooping left-right sweep with lift and tilt) centred on the photo band, shown on touch screens only (hover:none / pointer:coarse); it fades out and is removed after the first manual swipe (or arrow/dot tap). In the video units it only appears in the carousel fallback.
970x250 story frame 1: the Aperture icon beside a stacked "Premier" \/ "Listing" (icon height matched to the two-line stack), centred vertically and horizontally in the space above the CTA.
Row layout (1024x768, 480x320) standard: the logo + rule + text group is scaled by one factor until it fits left of the CTA with the layout's gap, so it can never overlap the button.
CTA hover (desktop): the button lifts 3 px, the label and underline both turn #8cc4ff (the underline also thickens), and a soft blue glow appears; the idle bob pauses while hovered. Driven from #clickthrough (the pointer target) via a sibling selector, so it never fires on touch.
Fallback watchdog: only judges while the page is visible and the ad is on screen (IntersectionObserver); a hidden tab or lazy slot is never mistaken for Low Power Mode.
