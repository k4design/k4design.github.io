# Frame to MP4 — Figma plugin

Exports Figma frames as a single MP4, including embedded **video fill layers** played back for real (not frozen as a poster frame).

## Install in Figma

1. `npm install && npm run build` (skip if `dist/` is already built)
2. In the Figma desktop app: **Plugins → Development → Import plugin from manifest…** and pick `manifest.json`.

Everything is self-contained in `dist/` — encoding uses a pure-WASM H.264 encoder (Figma plugin iframes are not secure contexts, so WebCodecs is unavailable), and the manifest declares zero network access.

## How it works

- Select the frames you want (or select nothing to use every frame on the page). Frames export in canvas reading order (top-to-bottom, left-to-right); toggle checkboxes to exclude.
- Static frames hold on screen for their per-frame **Hold** duration.
- Frames containing a video fill show a 🎬 badge — **drop/choose the original video file** (Figma's plugin API can't read video bytes back out of the file). The segment's length becomes the video's duration, and its audio is carried into the MP4.
- Pick fps, resolution scale, and optional crossfade, then **Export MP4**. Encoding happens locally via WebCodecs (H.264 + AAC) — no network access.

For video frames the plugin exports the frame as two static layers (below and above the video layer), then composites the decoded video between them per output frame, respecting the layer's position, corner radius, and FILL/FIT scale mode.

## Limitations (v1)

- One playing video layer per frame (extras export as static images).
- The below/above layer split is by the video's top-level layer inside the frame — siblings *inside the same group* as the video that overlap it may not layer perfectly.
- Rotated video layers render unrotated; TILE/CROP scale modes fall back to cover.
- Smart Animate / prototype transitions can't be captured (Figma API limitation).
- Output resolution comes from the first frame; differently-sized frames are letterboxed.
