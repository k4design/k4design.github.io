Aperture Global Real Estate - The Penthouse, Embassy Works (Lawn Lane, London SW8) - HTML5 units, carousel + video, six sizes
Template: the Priory Walk / Parque das Nacoes set - same layouts, storyboard, infinite 7.5 s copy loop, CTA-only click-through,
CTA hover state, swipe hint on touch, and the carousel-as-fallback in the video units.
Copy (from apertureglobal.com/thepenthouseembassyworks): "Exclusive Offer" / APERTURE wordmark; headline "The Penthouse";
sublines "Embassy Works, London" | "4 br | 4 bth | 3,628 sq ft" | "Listed by Solly Strickland"; CTA "Schedule a viewing".
clickTag default: https://www.apertureglobal.com/thepenthouseembassyworks

ASSUMPTION - no video footage exists for this property. The listing page carries four stills only (src/1-4.jpg, the same
photos the page uses). The video units therefore play a 15 s Ken Burns sequence built from those four stills: each gets a slow
zoom and pan (alternating direction) for ~3.7 s, crossfaded over 11 frames, 225 frames at 15 fps, single-pass silent H.264
(90-130 kbps by size; only 168-291 KB because the motion is synthetic). To swap in real footage, drop the clips beside src/
and re-run the frame + encode step, then rebuild - no layout work needed.
Carousel units use the same four stills as slides.

Folders: APERTURE_EmbassyWorks_<size>_video / _carousel (+ .zip + _backup.jpg), sizes 768x1024, 1024x768, 480x320, 970x250,
320x480, 300x600. Preview: preview.html; review site: preview-site(.zip) and preview-site-netlify.zip.
1024x768 needed photos at JPEG q36 (video) / q52 (carousel) to stay under 700 KB - these brick-and-steel interiors are detailed.
Fallback watchdog: only judges while the page is visible and the ad is on screen (IntersectionObserver), so a hidden tab or a lazy off-screen slot is never mistaken for Low Power Mode; the decision is final for the impression.
