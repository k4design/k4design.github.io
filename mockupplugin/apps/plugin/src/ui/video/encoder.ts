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
  // Same trade-off frame-to-mp4 ships: ~visually lossless, encodes faster than
  // frames arrive from the render service.
  encoder.speed = 5;
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

  return {
    width,
    height,
    async addFrame(pngBase64: string): Promise<void> {
      if (dead) throw new Error('Encoder session already finished.');
      const bytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      encoder.addFrameRgba(ctx.getImageData(0, 0, width, height).data);
      frames += 1;
      // Yield to the event loop periodically or the iframe locks up on long
      // sequences — the progress bar freezes and Figma may flag the plugin.
      if (frames % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    },
    async finish(): Promise<Uint8Array> {
      if (dead) throw new Error('Encoder session already finished.');
      dead = true;
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
