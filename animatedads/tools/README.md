# animatedads build tools

Everything needed to regenerate the HTML5 ad units in `../dist`. The units are generated,
not hand-edited: text is baked to SVG outlines so no webfonts are needed, and each composer
emits one self-contained `index.html`.

Requires: python3 with Pillow (`pip3 install Pillow`), zip, and — only if you rebuild the
Swift tools — Xcode command line tools. Prebuilt arm64 binaries are already in `bin/`.

## Layout

    aperture/    Aperture Global units (Parque das Nações, Priory Walk, Embassy Works)
      ap_compose_sizes.py   the composer for all 6 sizes x video/carousel
      ap_compose.py         the original single-size (768x1024) version, kept for reference
      kenburns.py           builds a 15 s pan/zoom frame sequence from stills
      make_media.py         per-size photos + video from a property's stills/clips
      bake_set.py           bakes a property's copy into SVG outline fragments
      build.sh              rebuild a whole property set and re-zip
      build_parque.sh       the two-language Parque das Nações build
      assets/               baked SVG copy fragments + bbox metadata
    awk/         AgentWhoKnows units
      awk_compose.py        300x250 v1/v1c/v1k
      awk_compose_v2.py     300x250 v2/v2c/v2k/v3 (framed variants)
      awk_compose_728.py    728x90      awk_compose_320.py     320x50
      awk_compose_big.py    160x600 / 300x600 / 970x250
      awk_compose_970x90.py 970x90
      awk_regen_all.sh      rebuild every AWK unit, re-zip, re-snapshot, refresh the preview
      assets/               SVG fragments, logos, EHL, and per-face glyph path JSON
    media/       Swift sources for the video/snapshot tools + build.sh
    bin/         compiled tools (prebuilt; `media/build.sh` regenerates them)
    serve/       rangeserver.py (local static server with Range support), litepack.py

## Rebuilding

Aperture — pass the set key (`ap`, `pw`, `ew`); copy and URLs are baked into the script:

    tools/aperture/build.sh pw                # all sizes, video + carousel, zipped
    tools/aperture/build.sh ew 970x250        # just one size

Parque das Nações ships in two languages, so it has its own script (fragment sets
`pnen` / `pnpt`, output in `dist/parque`):

    python3 tools/aperture/make_media.py dist/aperture/ParqueDasNacoes /tmp/pnmedia
    AP_MEDIA=/tmp/pnmedia tools/aperture/build_parque.sh

AgentWhoKnows — needs a local server running for the snapshot step:

    python3 tools/serve/rangeserver.py . 8801 &
    tools/awk/awk_regen_all.sh                # or: awk_regen_all.sh 300x250 728x90

The composers read their assets from `assets/` beside the script; set `AD_ASSETS` to override.
`awk_regen_all.sh` honours `AD_BIN` (default `tools/bin`) and `AD_PORT` (default 8801).

## The Aperture composer's inputs

`ap_compose_sizes.py` writes `index.html` into the current directory and is driven entirely
by environment variables:

    AP_SIZE   768x1024 | 1024x768 | 480x320 | 970x250 | 320x480 | 300x600
    AP_VIDEO  1 = video band, 0 = interactive photo carousel
    AP_SET    ap | pw | ew   which copy fragments to use
    AP_NAME   property name, used in image alt text
    AP_ALT    alt-text prefix if it differs from AP_NAME
    AP_LANG   en | pt        the <html lang> value
    AP_CTA    CTA label for the click-through's aria-label
    AP_URL    clickTag destination

The video units carry the carousel as their no-autoplay fallback, so both kinds share one
layout pass. `build.sh` sets all of the above per set; running the composer by hand with the
same values reproduces the committed `index.html` byte for byte.

## Adding a property

1. Put the photos and clips in `dist/<name>/src/`.
2. Bake the copy with `bake_set.py <setkey> '<json>'`, which lays out each run with the
   established type specs (Cormorant Garamond headline, Avenir sublines and CTA), centres it
   on x=384, writes the fragments and updates `<set>_bboxes.json`. A run too wide for the
   master frame is baked a step smaller rather than shrinking every subline with it.
   `bake_set.py --calibrate` re-derives those specs from the pw fragments if they drift.
   Fragments the baker does not make - the wordmark and the icon lockup - are copied from
   whichever existing set has the right language.
3. Media: `make_media.py <srcdir> <outdir>` does photos and video for all six sizes in one
   pass (clips share the 15 s equally). For a property with no footage, `kenburns.py` makes a
   pan/zoom sequence from the stills instead, then `bin/seqenc <dir> <prefix> <out.mp4> 15 <kbps>`.
4. Add the set to `aperture/build.sh` and run it.

Band sizes for the video, by ad size: 768x473, 1024x634, 480x256, 592x250, 320x200, 300x300.

## Notes worth keeping

- **Budget is 700 KB zipped.** The lever is video bitrate (90–130 kbps) traded against photo
  JPEG quality. 1024x768 is the tight one; Embassy Works needed q36/q52 to fit.
- **`bake()` handles only M/L/Q/C/Z.** Figma icon paths using H/V commands must be wrapped in
  a `<g transform="translate(...) scale(...)">` rather than rewritten.
- **The autoplay watchdog only judges while the page is visible and the ad is on screen.**
  A hidden tab stops decoding entirely, which otherwise reads as Low Power Mode and falls back
  to the carousel permanently. Don't remove the `document.hidden` / IntersectionObserver guard.
- **Hover must be driven from `#clickthrough`**, since the artwork SVG is `pointer-events:none`
  — hence the `#clickthrough:hover ~ svg #cta_hover` sibling selectors.
- **Netlify** wants `index.html` at the zip root and only one index file per package, which is
  why `make-preview.py --site` renames each unit's page to `ad.html`.
- WebM has no native decode path here; frames come out via a Chromium canvas POSTing to
  `rangeserver.py`'s `/_upload?name=` endpoint.
