import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/store.js';
import { ApiFailure } from '../errors.js';
import { renderItem, renderSequence } from './pipeline.js';

/**
 * The batch path must be indistinguishable from the single path pixel-wise —
 * it is an optimization, not a second renderer — so the core assertion here is
 * agreement with renderItem on identical input.
 */

async function solidFrame(width: number, height: number, rgb: [number, number, number]) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: rgb[0], g: rgb[1], b: rgb[2] },
    },
  })
    .png()
    .toBuffer();
}

const ITEM = 'mug-ceramic-front-01';
const SURFACE = 'design';
const FRAME_W = 512;
const FRAME_H = 384;
const OUT_W = 480;

describe('renderSequence', () => {
  beforeAll(async () => {
    await catalog.ready();
  });

  it('renders N distinct frames to N distinct outputs', async () => {
    const frames = await Promise.all([
      solidFrame(FRAME_W, FRAME_H, [220, 40, 40]),
      solidFrame(FRAME_W, FRAME_H, [40, 220, 40]),
      solidFrame(FRAME_W, FRAME_H, [40, 40, 220]),
    ]);

    const outcome = await renderSequence({
      itemId: ITEM,
      surfaceId: SURFACE,
      frames,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      colorize: {},
      outputWidth: OUT_W,
    });

    expect(outcome.frames).toHaveLength(3);
    expect(outcome.width).toBe(OUT_W);

    // Distinct designs must produce distinct composites.
    const hashes = await Promise.all(
      outcome.frames.map(async (png) => (await sharp(png).raw().toBuffer()).toString('base64')),
    );
    expect(new Set(hashes).size).toBe(3);
  });

  it('matches renderItem exactly on identical input', async () => {
    const frame = await solidFrame(FRAME_W, FRAME_H, [180, 60, 200]);

    const single = await renderItem({
      itemId: ITEM,
      designs: [
        { surfaceId: SURFACE, design: frame.toString('base64'), width: FRAME_W, height: FRAME_H },
      ],
      colorize: { mugColor: '#20222c' },
      outputWidth: OUT_W,
      allowAspectDrift: true,
    });

    const batch = await renderSequence({
      itemId: ITEM,
      surfaceId: SURFACE,
      frames: [frame],
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      colorize: { mugColor: '#20222c' },
      outputWidth: OUT_W,
    });

    const a = await sharp(single.png).raw().toBuffer();
    const b = await sharp(batch.frames[0]!).raw().toBuffer();
    expect(b.equals(a)).toBe(true);
  });

  it('rejects an unknown surface with the available ids', async () => {
    const frame = await solidFrame(64, 48, [0, 0, 0]);
    await expect(
      renderSequence({
        itemId: ITEM,
        surfaceId: 'nope',
        frames: [frame],
        frameWidth: 64,
        frameHeight: 48,
        colorize: {},
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('rejects a frame whose size differs from the first', async () => {
    const frames = [await solidFrame(512, 384, [10, 10, 10]), await solidFrame(256, 192, [10, 10, 10])];
    await expect(
      renderSequence({
        itemId: ITEM,
        surfaceId: SURFACE,
        frames,
        frameWidth: 512,
        frameHeight: 384,
        colorize: {},
        outputWidth: OUT_W,
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('rejects garbage frame bytes as unsupported media', async () => {
    await expect(
      renderSequence({
        itemId: ITEM,
        surfaceId: SURFACE,
        frames: [Buffer.from('definitely not a png')],
        frameWidth: 512,
        frameHeight: 384,
        colorize: {},
      }),
    ).rejects.toBeInstanceOf(ApiFailure);
  });

  it('reports aspect drift once for the whole batch', async () => {
    // The mug wants 4:3; send square frames.
    const frames = [await solidFrame(400, 400, [1, 2, 3]), await solidFrame(400, 400, [4, 5, 6])];
    const outcome = await renderSequence({
      itemId: ITEM,
      surfaceId: SURFACE,
      frames,
      frameWidth: 400,
      frameHeight: 400,
      colorize: {},
      outputWidth: OUT_W,
    });
    expect(outcome.warnings.filter((w) => w.code === 'aspect_drift')).toHaveLength(1);
  });
});
