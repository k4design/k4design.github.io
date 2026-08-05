# Video mockups

Status: **shipped**, client-side. Pick a clip in the Render tab, watch the
warped result play in the plugin, download the MP4, and optionally pin the
first frame to the canvas as a poster (Figma cannot play video on canvas).

## Architecture

The entire video pipeline runs in the **plugin UI iframe**, and the three
stages are **pipelined**: while batch N renders on the server, the client
decodes batch N+1 and encodes batch N−1. Decode and encode share the main
thread but are async-cooperative, so they interleave inside each other's
waits. The encode chain is order-preserving by construction, so frames cannot
reorder. Measured on a 3s/24fps clip: 59s serial → 18s pipelined (the two
biggest wins beyond overlap: native base64 decode via `fetch(data:)` — the
`Uint8Array.from(atob(...), cb)` per-character path cost ~230ms/frame — and
defaulting video output to 1280px, since every output pixel is paid for three
times). Memory stays bounded per batch:

```
<video> seek loop ──► design PNGs (one batch)
      └► POST /render/batch ──► warped PNGs
      └► h264-mp4-encoder (WASM) ──► one MP4 blob
            ├► <video src=blobURL loop controls>   realtime preview
            ├► a.download                          export
            └► first frame → apply-render          canvas poster
```

The preview **is** the export: one blob, played and saved as-is.

Key files:

- `apps/plugin/src/ui/video/decode.ts` — `<video>` + `currentTime` seek per
  frame, drawn to a fixed design-sized canvas (`cover` crops, `contain`
  letterboxes). 30s cap, fps ∈ {12, 24, 30}.
- `apps/plugin/src/ui/video/encoder.ts` — streaming H.264 session.
- `apps/plugin/src/ui/video/useVideoRender.ts` — the interleaved state
  machine; only one batch of frames is alive at any moment.
- `apps/api/src/render/pipeline.ts` `renderSequence()` — hoists everything
  frame-invariant (baked base+colorize canvas, warp sampler, masks, lighting,
  displacement, overlays) out of the frame loop. Measured 44ms/frame batched
  vs ~100ms via single `/render` calls.
- `POST /render/batch` — up to 30 same-sized frames for one item+surface,
  one rate-limit hit per batch.

## Constraints discovered the hard way

- **No WebCodecs.** Figma plugin iframes are not secure contexts, so the API
  does not exist there. Encoding uses `h264-mp4-encoder` (pure WASM), the same
  library the sibling frame-to-mp4 plugin ships. Its web build defines a
  script-scoped `var HME`, invisible under Vite's ESM — it is imported `?raw`
  and injected as a classic script tag.
- **The sandbox never sees the video.** Only the ordinary `apply-render`
  poster crosses the postMessage boundary.
- The clip never leaves the user's machine except as individual design frames
  posted to the render service; nothing is stored server-side.

## Why not the server-side ffmpeg route

An earlier scaffold looped ffmpeg-decoded frames through the still pipeline
server-side. It was deleted (see git history, milestone 7 → `325a41e`) because
finishing it required exactly the machinery this product avoids: an upload
endpoint, object storage for results, and a job queue with progress reporting.
The client pipeline needs none of it, and gets realtime preview for free.

## Future options

- **Audio passthrough.** The export is currently silent. The reference
  implementation is `muxAudio()` in `../videoexport/src/ui.ts`: `mediabunny`
  in packet-passthrough mode re-muxes the WASM encoder's AVC packets with the
  source file's encoded audio — no re-encode, no WebCodecs.
- **Item-canvas output.** Export resolution follows the item canvas (capped by
  the Settings render-width override). A dedicated per-video resolution picker
  would help very large canvases.
- **WebM.** `h264-mp4-encoder` is MP4-only; WebM would need a VP9 WASM build.
