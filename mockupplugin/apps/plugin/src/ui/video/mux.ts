import {
  ALL_FORMATS,
  BlobSource,
  BufferSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
  type AudioCodec,
} from 'mediabunny';

/**
 * Carries the source clip's audio into the rendered MP4.
 *
 * The WASM H.264 encoder produces video only, and WebCodecs — which would let
 * us decode and re-encode audio — does not exist in a Figma plugin iframe. So
 * this never touches audio samples: it remuxes the *encoded* packets from both
 * files into one container. Mediabunny's packet API is parse-only, so no
 * codec support is required beyond what MP4 can carry.
 *
 * The same approach the sibling frame-to-mp4 plugin ships (`muxAudio()` in
 * videoexport/src/ui.ts), reduced to the single-source case.
 */

export type MuxSkipReason =
  | 'no-audio-track'
  | 'unsupported-codec'
  | 'no-video-track'
  | 'failed';

export interface MuxResult {
  /** The remuxed MP4 when audio was carried over, else null. */
  mp4: Uint8Array | null;
  skipped?: MuxSkipReason;
  detail?: string;
}

/** True when the file has an audio track we could plausibly carry. */
export async function hasAudioTrack(file: File): Promise<boolean> {
  try {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    return (await input.getPrimaryAudioTrack()) !== null;
  } catch {
    return false;
  }
}

/**
 * Audio codecs MP4 can legally hold. A WebM source is commonly Opus or
 * Vorbis; Opus in MP4 is legal but poorly supported by players, and Vorbis is
 * not allowed at all — so anything outside this list is skipped rather than
 * written into a file that would not play.
 */
const MP4_SAFE_AUDIO: readonly string[] = ['aac', 'mp3', 'alac', 'flac'];

export async function muxAudioInto(
  videoMp4: Uint8Array,
  source: File,
  options: {
    fps: number;
    /** Trim audio to the rendered video's length (clips are capped/truncated). */
    durationSeconds: number;
  },
): Promise<MuxResult> {
  try {
    // A fresh copy: the encoder's view may sit on a detached WASM heap, and
    // BufferSource wants a plain ArrayBuffer it can own.
    const videoBytes = new Uint8Array(videoMp4);
    const videoInput = new Input({
      formats: ALL_FORMATS,
      source: new BufferSource(videoBytes.buffer as ArrayBuffer),
    });
    const videoTrack = await videoInput.getPrimaryVideoTrack();
    if (!videoTrack) return { mp4: null, skipped: 'no-video-track' };

    const audioInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(source) });
    const audioTrack = await audioInput.getPrimaryAudioTrack();
    if (!audioTrack) {
      return { mp4: null, skipped: 'no-audio-track', detail: 'source has no audio track' };
    }
    if (!audioTrack.codec) {
      return { mp4: null, skipped: 'unsupported-codec', detail: 'codec not reported' };
    }

    const codec = audioTrack.codec as AudioCodec;
    if (!MP4_SAFE_AUDIO.includes(codec)) {
      return { mp4: null, skipped: 'unsupported-codec', detail: codec };
    }

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const videoSource = new EncodedVideoPacketSource('avc');
    output.addVideoTrack(videoSource, { frameRate: options.fps });
    const audioSource = new EncodedAudioPacketSource(codec);
    output.addAudioTrack(audioSource);
    await output.start();

    // Video: straight passthrough of what the encoder just produced. The
    // decoder config must ride along with the first packet.
    const videoConfig = await videoTrack.getDecoderConfig();
    let firstVideo = true;
    for await (const packet of new EncodedPacketSink(videoTrack).packets()) {
      await videoSource.add(
        packet,
        firstVideo && videoConfig ? { decoderConfig: videoConfig } : undefined,
      );
      firstVideo = false;
    }

    // Audio: passthrough, stopping at the rendered duration so a 60s source
    // trimmed to 30s of frames does not leave 30s of audio over black.
    const audioConfig = await audioTrack.getDecoderConfig();
    let firstAudio = true;
    let audioPackets = 0;
    for await (const packet of new EncodedPacketSink(audioTrack).packets()) {
      if (packet.timestamp >= options.durationSeconds) break;
      await audioSource.add(
        packet,
        firstAudio && audioConfig ? { decoderConfig: audioConfig } : undefined,
      );
      firstAudio = false;
      audioPackets += 1;
    }

    videoSource.close();
    audioSource.close();
    await output.finalize();

    if (audioPackets === 0) {
      return {
        mp4: null,
        skipped: 'no-audio-track',
        detail: `no audio packets before ${options.durationSeconds}s`,
      };
    }

    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) return { mp4: null, skipped: 'failed', detail: 'muxer produced no output' };
    return { mp4: new Uint8Array(buffer) };
  } catch (err) {
    // Audio is a bonus, never a reason to lose the render — the caller falls
    // back to the silent MP4.
    return { mp4: null, skipped: 'failed', detail: (err as Error).message };
  }
}

/** User-facing explanation for a skipped mux, or null when silence is expected. */
export function explainSkip(reason: MuxSkipReason, detail?: string): string | null {
  switch (reason) {
    case 'no-audio-track':
      return null; // The source had no audio; silence is correct, not a problem.
    case 'unsupported-codec':
      return `The clip's audio (${detail ?? 'unknown codec'}) cannot be stored in an MP4, so the export is silent. Convert the source to MP4/AAC to keep its audio.`;
    case 'no-video-track':
      return 'The encoded video could not be re-read to add audio, so the export is silent.';
    case 'failed':
    default:
      return `The audio could not be copied into the export, so it is silent${detail ? ` (${detail})` : ''}.`;
  }
}
