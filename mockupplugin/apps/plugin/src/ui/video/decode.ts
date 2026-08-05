/**
 * Video decoding in the plugin iframe.
 *
 * Same approach the frame-to-mp4 plugin proved inside Figma: a plain <video>
 * element, seek via `currentTime` + the `seeked` event, draw to a canvas. No
 * WebCodecs (plugin iframes are not secure contexts), no uploads — the file
 * never leaves the user's machine except as individual design frames posted to
 * the render service.
 */

export const VIDEO_FPS_CHOICES = [12, 24, 30] as const;
export type VideoFps = (typeof VIDEO_FPS_CHOICES)[number];

/** Hard cap on clip length; longer files are truncated with a warning. */
export const MAX_VIDEO_SECONDS = 30;

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  /** True when the clip was longer than MAX_VIDEO_SECONDS. */
  truncated: boolean;
}

export interface FrameSource {
  info: VideoInfo;
  frameCount: number;
  /** Decode frame k (0-based) as a base64 PNG at the design size. */
  frame(index: number): Promise<string>;
  dispose(): void;
}

export async function openVideo(
  file: File,
  options: {
    fps: VideoFps;
    /** Design-frame pixel size every frame is drawn at. */
    width: number;
    height: number;
    /** cover fills the surface (crops); contain letterboxes on black. */
    fit: 'cover' | 'contain';
  },
): Promise<FrameSource> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error('That file could not be decoded as video in this browser.'));
  });

  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    URL.revokeObjectURL(url);
    throw new Error('That video has no readable duration.');
  }
  if (!video.videoWidth || !video.videoHeight) {
    URL.revokeObjectURL(url);
    throw new Error('That file has no video track.');
  }

  const truncated = video.duration > MAX_VIDEO_SECONDS;
  const duration = Math.min(video.duration, MAX_VIDEO_SECONDS);
  const frameCount = Math.max(1, Math.floor(duration * options.fps));

  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a decoding canvas.');

  const scale =
    options.fit === 'cover'
      ? Math.max(options.width / video.videoWidth, options.height / video.videoHeight)
      : Math.min(options.width / video.videoWidth, options.height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  const drawX = (options.width - drawWidth) / 2;
  const drawY = (options.height - drawHeight) / 2;

  function seekTo(time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Seeking to ${time.toFixed(2)}s timed out.`)),
        10_000,
      );
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error('The video failed while seeking.'));
      };
      video.currentTime = time;
    });
  }

  return {
    info: { duration, width: video.videoWidth, height: video.videoHeight, truncated },
    frameCount,
    async frame(index: number): Promise<string> {
      // Sample mid-interval; sampling at exact boundaries tends to return the
      // previous frame on some decoders.
      const time = Math.min(duration - 0.001, (index + 0.5) / options.fps);
      await seekTo(Math.max(0, time));
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, options.width, options.height);
      ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      // JPEG, not PNG: video frames are opaque photographic content, and PNG
      // makes each one 1-2MB — a 30-frame batch would blow the server's body
      // limit even for a small source file. JPEG at 0.87 is visually
      // indistinguishable after the warp and ~8x smaller.
      return canvas.toDataURL('image/jpeg', 0.87).split(',')[1]!;
    },
    dispose(): void {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    },
  };
}
