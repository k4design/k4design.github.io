/**
 * In-iframe H.264 encoding.
 *
 * WebCodecs is not an option: Figma plugin iframes are not secure contexts, so
 * the API simply is not there. This uses the same pure-WASM encoder the
 * frame-to-mp4 plugin shipped with (`h264-mp4-encoder`), whose web build is a
 * plain script defining a top-level `var HME`. Under Vite's ESM that var would
 * be module-scoped and invisible, so the source is imported raw and injected
 * as a classic script tag, which lands `HME` on `window`.
 */
import hmeSource from 'h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js?raw';

interface H264Encoder {
  width: number;
  height: number;
  frameRate: number;
  speed: number;
  quantizationParameter: number;
  outputFilename: string;
  initialize(): void;
  addFrameRgba(rgba: Uint8Array | Uint8ClampedArray): void;
  finalize(): void;
  FS: { readFile(path: string): Uint8Array };
  delete(): void;
}

interface Hme {
  createH264MP4Encoder(): Promise<H264Encoder>;
}

let hme: Hme | null = null;

function loadHme(): Hme {
  if (hme) return hme;
  const existing = (window as unknown as { HME?: Hme }).HME;
  if (existing) {
    hme = existing;
    return hme;
  }
  const script = document.createElement('script');
  script.textContent = hmeSource;
  document.head.appendChild(script);
  const loaded = (window as unknown as { HME?: Hme }).HME;
  if (!loaded) {
    throw new Error('The H.264 encoder failed to load inside the plugin.');
  }
  hme = loaded;
  return hme;
}

export interface Mp4EncoderSession {
  /** Add one warped frame, given as a base64 PNG from the render service. */
  addFrame(pngBase64: string): Promise<void>;
  /** Finish and return the MP4 bytes. The session is unusable afterwards. */
  finish(): Promise<Uint8Array>;
  abort(): void;
  readonly width: number;
  readonly height: number;
}

/**
 * Streaming session: frames are added as render batches arrive, so at no point
 * does the whole warped sequence sit in memory.
 */
export async function createMp4Session(options: {
  width: number;
  height: number;
  fps: number;
}): Promise<Mp4EncoderSession> {
  const encoder = await loadHme().createH264MP4Encoder();

  // H.264 rejects odd dimensions; the render size derives from the item canvas
  // and is not guaranteed even.
  const width = options.width - (options.width % 2);
  const height = options.height - (options.height % 2);

  encoder.width = width;
  encoder.height = height;
  encoder.frameRate = options.fps;
  // Profiled: encode is the pipeline's dominant stage (~450ms/frame at
  // speed 5, 1.2MP). speed 8 encodes ~3x faster; visible quality is governed
  // by the quantizer, which stays at 26, so the trade is motion-estimation
  // effort (slightly larger files), not fidelity.
  encoder.speed = 8;
  encoder.quantizationParameter = 26;
  encoder.initialize();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // Every frame does a full readback, so tell the browser up front.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create an encoding canvas.');

  let frames = 0;
  let dead = false;
  /** Per-step accumulators, reported once at finish — cheap and always on. */
  const stepMs = { base64: 0, bitmap: 0, draw: 0, read: 0, encode: 0 };

  return {
    width,
    height,
    async addFrame(pngBase64: string): Promise<void> {
      if (dead) throw new Error('Encoder session already finished.');
      let t = performance.now();
      // fetch() decodes the base64 natively. The obvious alternative —
      // Uint8Array.from(atob(s), cb) — runs a JS callback per character and
      // profiled at ~230ms/frame on 1MB frames, dominating the whole encode
      // stage. This path is ~20x faster.
      const blob = await (await fetch(`data:image/png;base64,${pngBase64}`)).blob();
      stepMs.base64 += performance.now() - t;

      t = performance.now();
      const bitmap = await createImageBitmap(blob);
      stepMs.bitmap += performance.now() - t;

      t = performance.now();
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      stepMs.draw += performance.now() - t;

      t = performance.now();
      const pixels = ctx.getImageData(0, 0, width, height).data;
      stepMs.read += performance.now() - t;

      t = performance.now();
      encoder.addFrameRgba(pixels);
      stepMs.encode += performance.now() - t;

      frames += 1;
      // Yield to the event loop periodically or the iframe locks up on long
      // sequences — the progress bar freezes and Figma may flag the plugin.
      if (frames % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    },
    async finish(): Promise<Uint8Array> {
      if (dead) throw new Error('Encoder session already finished.');
      dead = true;
      console.info(
        `[MF] encode steps over ${frames} frames (ms): ` +
          Object.entries(stepMs)
            .map(([step, ms]) => `${step} ${Math.round(ms)}`)
            .join(', '),
      );
      encoder.finalize();
      const file = encoder.FS.readFile(encoder.outputFilename);
      encoder.delete();
      return file;
    },
    abort(): void {
      if (dead) return;
      dead = true;
      try {
        encoder.delete();
      } catch {
        // Best-effort teardown; the WASM heap goes away with the iframe anyway.
      }
    },
  };
}
