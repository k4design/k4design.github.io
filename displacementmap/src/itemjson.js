/**
 * Reading and patching a Mockup Forge `item.json`.
 *
 * The plugin cannot run the repo's Zod schema, so everything here is
 * deliberately conservative: read what we need, change only the two fields we
 * own, and leave every other key byte-identical. Validation happens by running
 * the repo's own tests afterwards.
 */

const DISPLACEMENT_SCALE_MAX = 512; // packages/shared/src/item.ts:89

/**
 * @typedef {{id: string, label: string}} SurfaceRef
 * @typedef {{name: string, itemId: string, canvas: {width: number, height: number},
 *            surfaces: SurfaceRef[], raw: object}} ItemInfo
 */

/**
 * Parse an item.json's text into just what the panel needs.
 * @param {string} text
 * @returns {ItemInfo}
 */
export function parseItem(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`item.json is not valid JSON: ${e.message}`);
  }
  if (!raw || !Array.isArray(raw.layers)) {
    throw new Error("item.json has no layers array — is this a Mockup Forge item folder?");
  }
  if (!raw.canvas || !raw.canvas.width || !raw.canvas.height) {
    throw new Error("item.json has no canvas size.");
  }

  const surfaces = raw.layers
    .filter((l) => l && l.type === "surface" && typeof l.id === "string")
    .map((l) => ({ id: l.id, label: l.label || l.id }));

  if (surfaces.length === 0) {
    throw new Error("item.json declares no surface layers, so there is nothing to bake maps for.");
  }

  return {
    name: raw.name || raw.id || "(unnamed)",
    itemId: raw.id || "",
    canvas: { width: raw.canvas.width, height: raw.canvas.height },
    surfaces,
    raw,
  };
}

/** The three filenames a surface's maps must use, per the catalog convention. */
export function mapNames(surfaceId) {
  return {
    displace: `displace-${surfaceId}.png`,
    shadow: `shadow-${surfaceId}.png`,
    highlight: `highlight-${surfaceId}.png`,
  };
}

/**
 * Return a new item object with `surfaceId`'s warp promoted to a displacement
 * warp and its lighting pointed at our maps. Does not mutate `item`.
 *
 * The promotion is lossless: WarpSchema's `homography` and `mesh` variants are
 * structurally identical to GeometrySchema's, so the existing warp object IS a
 * valid `geometry` and gets nested verbatim. Authored corners and mesh points
 * survive untouched — nothing is re-derived or guessed.
 *
 * @param {object} item parsed item.json
 * @param {string} surfaceId
 * @param {number} scale max displacement in canvas pixels
 * @returns {object} patched clone
 */
export function patchItem(item, surfaceId, scale) {
  const names = mapNames(surfaceId);
  const clamped = Math.max(0, Math.min(DISPLACEMENT_SCALE_MAX, Math.round(scale)));

  const layers = item.layers.map((layer) => {
    if (layer.type !== "surface" || layer.id !== surfaceId) return layer;

    const warp =
      layer.warp && layer.warp.kind === "displacement"
        ? // Already a displacement warp: keep its authored geometry, swap the map.
          { ...layer.warp, map: names.displace, scale: clamped, vector: true }
        : // homography | mesh: the warp itself becomes the geometry.
          {
            kind: "displacement",
            geometry: layer.warp,
            map: names.displace,
            scale: clamped,
            vector: true,
          };

    return {
      ...layer,
      warp,
      lighting: {
        ...(layer.lighting || {}),
        multiply: names.shadow,
        // Strength is baked into the maps, so the opacities stay at 1 and the
        // rendered result matches what the panel previewed.
        multiplyOpacity: 1,
        screen: names.highlight,
        screenOpacity: 1,
      },
    };
  });

  return { ...item, layers };
}

/** Two-space JSON with a trailing newline, matching the catalog's existing files. */
export function serializeItem(item) {
  return `${JSON.stringify(item, null, 2)}\n`;
}

/**
 * Guard against baking from the wrong file. A size mismatch with matching aspect
 * is fine — the maps get resampled to canvas on write. A different aspect means
 * the open document isn't this item's base photo, and proceeding would produce
 * maps that don't line up with the product at all.
 */
export function checkCanvas(docWidth, docHeight, canvas, tolerance = 0.01) {
  if (docWidth === canvas.width && docHeight === canvas.height) return null;

  const docAspect = docWidth / docHeight;
  const canvasAspect = canvas.width / canvas.height;
  const drift = Math.abs(docAspect - canvasAspect) / canvasAspect;
  if (drift > tolerance) {
    throw new Error(
      `Open document is ${docWidth}×${docHeight} but this item's canvas is ` +
        `${canvas.width}×${canvas.height} — a different shape, not just a different size. ` +
        `Open this item's base.png instead.`
    );
  }
  return `Document is ${docWidth}×${docHeight}; maps will be resampled to ${canvas.width}×${canvas.height}.`;
}
