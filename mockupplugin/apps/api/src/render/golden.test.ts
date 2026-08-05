import fs from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { surfacesOf } from '@mf/shared';
import { catalog } from '../catalog/store.js';
import { GOLDEN_DIR, ITEMS_DIR } from '../config.js';
import { renderItem } from './pipeline.js';
import { testDesignPng } from './testdesign.js';

/**
 * Golden-image suite: renders every catalog item against a fixed test design and
 * compares the result to a committed reference.
 *
 * Goldens are rendered at 600px rather than full resolution — every code path
 * (each warp family, masks, lighting, colorize, overlays) runs identically, but
 * the reference files stay small enough to belong in git and to diff by eye.
 *
 * Set MF_UPDATE_GOLDEN=1 to (re)write references. Do that deliberately: a
 * regression and an intended change look identical to the test, so the diff in
 * the review is the only thing standing between them.
 */

const GOLDEN_WIDTH = 600;

/** Per-channel difference below this is indistinguishable and ignored. */
const CHANNEL_TOLERANCE = 6;
/**
 * Fraction of pixels allowed to exceed that tolerance. Non-zero because libvips
 * versions differ very slightly in resampling; large enough to absorb that,
 * small enough that any real geometry change blows straight past it.
 */
const MAX_DIFFERING_FRACTION = 0.002;

const UPDATE = process.env.MF_UPDATE_GOLDEN === '1';

interface Comparison {
  differing: number;
  total: number;
  fraction: number;
  maxDelta: number;
}

function compare(actual: Buffer, expected: Buffer, pixels: number): Comparison {
  let differing = 0;
  let maxDelta = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const index = pixel * 4;
    let worst = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(actual[index + channel]! - expected[index + channel]!);
      if (delta > worst) worst = delta;
    }
    if (worst > maxDelta) maxDelta = worst;
    if (worst > CHANNEL_TOLERANCE) differing += 1;
  }
  return { differing, total: pixels, fraction: differing / pixels, maxDelta };
}

/** A visual diff, written next to the golden so a failure is inspectable. */
async function writeDiff(
  file: string,
  actual: Buffer,
  expected: Buffer,
  width: number,
  height: number,
): Promise<void> {
  const diff = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    let worst = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      worst = Math.max(worst, Math.abs(actual[index + channel]! - expected[index + channel]!));
    }
    const hot = worst > CHANNEL_TOLERANCE;
    diff[index] = hot ? 255 : Math.round(expected[index]! * 0.25);
    diff[index + 1] = hot ? 0 : Math.round(expected[index + 1]! * 0.25);
    diff[index + 2] = hot ? 255 : Math.round(expected[index + 2]! * 0.25);
    diff[index + 3] = 255;
  }
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(file);
}

describe('golden renders', () => {
  beforeAll(async () => {
    await catalog.ready();
    await fs.mkdir(GOLDEN_DIR, { recursive: true });
  });

  it('has a catalog to render', () => {
    // A green suite over an empty catalog would be worthless.
    expect(catalog.size).toBeGreaterThanOrEqual(10);
  });

  // Item ids are read synchronously: vitest builds the case list before any
  // hook runs, so the async catalog is not loaded yet at this point.
  const itemIds = existsSync(ITEMS_DIR)
    ? readdirSync(ITEMS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  for (const itemId of itemIds) {
    it(`renders ${itemId} identically to its golden`, async () => {
      const { item } = catalog.entry(itemId);

      const designs = [];
      for (const surface of surfacesOf(item)) {
        // Keep the design small: the warp resamples it anyway, and this keeps
        // the suite quick enough to run on every change.
        const width = Math.min(900, surface.placeholder.recommendedWidth);
        const height = Math.max(1, Math.round(width / surface.placeholder.aspect));
        designs.push({
          surfaceId: surface.id,
          design: (await testDesignPng(width, height)).toString('base64'),
          width,
          height,
        });
      }

      const outcome = await renderItem({
        itemId: item.id,
        designs,
        colorize: {},
        outputWidth: GOLDEN_WIDTH,
        allowAspectDrift: true,
      });

      const goldenPath = path.join(GOLDEN_DIR, `${item.id}.png`);
      const exists = await fs
        .access(goldenPath)
        .then(() => true)
        .catch(() => false);

      if (UPDATE || !exists) {
        await fs.writeFile(goldenPath, outcome.png);
        if (!UPDATE) {
          throw new Error(
            `No golden existed for ${item.id}; wrote one to ${goldenPath}. Review it, commit it, and re-run.`,
          );
        }
        return;
      }

      const [actual, expected] = await Promise.all([
        sharp(outcome.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(goldenPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      ]);

      expect(
        { width: actual.info.width, height: actual.info.height },
        'render dimensions changed',
      ).toEqual({ width: expected.info.width, height: expected.info.height });

      const result = compare(
        actual.data,
        expected.data,
        actual.info.width * actual.info.height,
      );

      if (result.fraction > MAX_DIFFERING_FRACTION) {
        const actualPath = path.join(GOLDEN_DIR, `${item.id}.actual.png`);
        const diffPath = path.join(GOLDEN_DIR, `${item.id}.diff.png`);
        await fs.writeFile(actualPath, outcome.png);
        await writeDiff(
          diffPath,
          actual.data,
          expected.data,
          actual.info.width,
          actual.info.height,
        );
        throw new Error(
          `${item.id} drifted from its golden: ${result.differing}/${result.total} pixels ` +
            `(${(result.fraction * 100).toFixed(3)}%) differ by more than ${CHANNEL_TOLERANCE}, ` +
            `worst channel delta ${result.maxDelta}.\n` +
            `  actual: ${actualPath}\n  diff:   ${diffPath}\n` +
            `If the change is intended, re-run with MF_UPDATE_GOLDEN=1.`,
        );
      }
    });
  }
});
