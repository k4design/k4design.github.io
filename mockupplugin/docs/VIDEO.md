# Video mockups (phase 2)

Status: **scaffolded, not shipped.** The pipeline code is real and the data model
already supports it; uploads and result storage are not built.

## Why this is mostly free

A warp is a pure function of `(design pixels, item geometry)`. Nothing in the
still pipeline carries state between renders — no accumulation, no time
dependence — so a video frame is just another design PNG. `renderVideo()` in
[apps/api/src/render/video.ts](../apps/api/src/render/video.ts) is a loop over
`renderItem()`, not a second renderer.

That is the reason the item model stores geometry normalized to 0..1: the same
mesh drives a 300px preview frame and a 3000px hero frame.

## What exists today

- `renderVideo()` — probes the source with `ffprobe`, decodes frames to PNG at
  the surface's authored resolution, warps each frame through `renderItem()`,
  and encodes with `libx264` or `libvpx-vp9`. Frames are padded to even
  dimensions, because encoders reject odd ones and the render size derives from
  the item canvas.
- `POST /render/video` — validates the request, checks the item exists and that
  ffmpeg is present, then returns `501` with an explanation. It does not
  pretend to enqueue work it cannot finish.
- `GET /render/video/:jobId` — reads the in-memory job table.
- Everything is gated behind `MF_VIDEO=1`.

## What is missing

1. **Upload endpoint.** `VideoRenderRequest.uploadId` is a handle for a file
   that nothing produces yet. Needs a multipart or presigned-PUT route with a
   size cap, a duration cap, and a content sniff — `.mp4` in a filename means
   nothing.
2. **Object storage for results.** A finished MP4 currently lives in a temp
   directory that `renderVideo` deletes on the way out. Results and posters need
   to go to S3-compatible storage with signed, expiring URLs.
3. **A real queue.** Jobs are held in a `Map`, so they die with the process and
   do not survive a deploy or spread across instances. A 20-second still render
   can hold an HTTP connection; a 40-second clip at 30fps is 1,200 renders and
   cannot.
4. **Streaming instead of frame dumps.** Decoding every frame to PNG on disk is
   the simplest correct thing and the wrong thing at scale: a 30-second 1080p
   clip is thousands of files and gigabytes of I/O. The shape to move to is
   `ffmpeg -f rawvideo` piped in, warped in flight, piped straight back out to
   the encoder — the warp already works on raw RGBA buffers, so no warp code has
   to change.
5. **Progress reporting.** ffmpeg writes frame counts to stderr; parse them and
   surface percentage to the plugin, since a designer staring at a spinner for
   two minutes will assume it has hung.

## Plugin side

Figma cannot play video on canvas, so the plugin will not try. The intended UX,
once the above is built:

- The design frame becomes a **video slot** — the user picks a local file in the
  iframe rather than placing artwork on canvas.
- The UI shows the poster frame (already produced by `renderVideo`) as a still
  preview, plus a download link for the MP4/WEBM.
- The item frame on canvas keeps showing the still render of the first frame, so
  the mockup still reads correctly in the Figma file.

## Cost note

Video renders are minutes of CPU, not milliseconds. Anonymous per-IP rate
limiting is adequate for stills but not for this — video will need either a much
tighter limit, a queue with per-IP concurrency of one, or the accounts this
product deliberately does not have.
