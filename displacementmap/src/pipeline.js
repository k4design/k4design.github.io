// See imaging.js — require() is unavailable inside UXP ES modules.
import photoshop from "photoshop";
import { readComposite, grayToRgb } from "./imaging.js";
import { writeMap, readTextFile, writeTextFile } from "./export.js";
import { REFERENCE_EDGE } from "./presets.js";
import { luminance } from "./ops/luminance.js";
import { highPassWithLow } from "./ops/highpass.js";
import { normalize } from "./ops/levels.js";
import { blur } from "./ops/blur.js";
import { aoMap } from "./ops/ao.js";
import { vectorDisplacement } from "./ops/vectordisp.js";
import { shadowMap } from "./ops/shadow.js";
import { highlightMap } from "./ops/highlight.js";
import { parseItem, patchItem, serializeItem, mapNames, checkCanvas } from "./itemjson.js";

const { app } = photoshop;

/**
 * Working resolution cap. The height field is computed here and the outputs are
 * resampled to their required sizes on write. Shadow/highlight must land on the
 * item's exact canvas, but they are smooth maps, so computing them at 2048 and
 * letting Photoshop upscale is visually identical to computing at 4096 and far
 * cheaper — several Float32Array buffers at 4096² is ~400MB.
 */
const WORKING_EDGE = 2048;

/** Displacement maps are authored at half canvas, matching the catalog. */
const DISPLACE_DIVISOR = 2;

/**
 * Bake the three maps Mockup Forge's renderer consumes for one surface, and wire
 * them into the item's `item.json`.
 *
 * Call inside core.executeAsModal.
 *
 * @param {object} args
 * @param {Folder} args.folder the item directory (assets/items/<id>/)
 * @param {string} args.surfaceId which surface's maps to write
 * @param {string} args.presetName
 * @param {object} args.params resolved preset params (possibly user-edited)
 * @param {(msg: string) => void} [args.onProgress]
 * @returns {Promise<{files: string[], canvas: object, warnings: string[]}>}
 */
export async function bakeMaps({ folder, surfaceId, presetName, params, onProgress = () => {} }) {
  const doc = app.activeDocument;
  if (!doc) throw new Error("No document is open.");

  onProgress("Reading item.json…");
  const itemText = await readTextFile(folder, "item.json");
  if (itemText === null) {
    throw new Error("No item.json in that folder — pick a Mockup Forge item directory.");
  }
  const info = parseItem(itemText);
  if (!info.surfaces.some((s) => s.id === surfaceId)) {
    throw new Error(
      `item.json has no surface "${surfaceId}". It defines: ${info.surfaces.map((s) => s.id).join(", ")}`
    );
  }

  const warnings = [];
  const canvas = info.canvas;
  const resampleNote = checkCanvas(doc.width, doc.height, canvas);
  if (resampleNote) warnings.push(resampleNote);

  onProgress("Reading pixels…");
  const src = await readComposite(doc.id, doc.width, doc.height, WORKING_EDGE);
  const { data, width, height, components } = src;
  const count = width * height;

  // Preset radii are authored at REFERENCE_EDGE, so scale them to whatever we
  // actually read. Without this a preset behaves differently on every input size.
  const radiusScale = Math.max(width, height) / REFERENCE_EDGE;
  const r = (v) => v * radiusScale;

  onProgress("Computing luminance…");
  const luma = luminance(data, count, components);

  onProgress("Separating geometry from lighting…");
  // `low` is the broad lighting the high pass removes. It is not waste — it is
  // the real shading, and it feeds the shadow map.
  const { height: highPassed, low } = highPassWithLow(luma, width, height, r(params.highPassRadius));

  // Symmetric normalization only makes sense once the field is centered on 0.5,
  // which is exactly when the high pass ran. With highPassRadius 0 (screen
  // preset) the raw luminance IS the signal, so stretch it end to end.
  const didHighPass = Math.round(r(params.highPassRadius)) >= 1;
  const leveled = normalize(highPassed, { symmetric: didHighPass });

  onProgress("Smoothing…");
  const heightField = blur(leveled, width, height, r(params.smoothRadius));

  const names = mapNames(surfaceId);
  const files = [];

  onProgress("Writing displacement map…");
  await writeMap(
    folder,
    names.displace,
    vectorDisplacement(heightField, width, height, { yUp: params.normalYUp }),
    width,
    height,
    {
      width: Math.max(1, Math.round(canvas.width / DISPLACE_DIVISOR)),
      height: Math.max(1, Math.round(canvas.height / DISPLACE_DIVISOR)),
    }
  );
  files.push(names.displace);

  onProgress("Writing shadow map…");
  const ao =
    Math.round(r(params.aoRadius)) >= 1 && params.aoStrength > 0
      ? aoMap(heightField, width, height, r(params.aoRadius), params.aoStrength)
      : filled(count, 1);
  const shadow = shadowMap(low, ao, {
    gamma: params.shadowGamma,
    strength: params.shadowStrength,
  });
  await writeMap(folder, names.shadow, grayToRgb(shadow), width, height, canvas);
  files.push(names.shadow);

  onProgress("Writing highlight map…");
  const highlight = highlightMap(luma, {
    threshold: params.highlightThreshold,
    strength: params.highlightStrength,
  });
  await writeMap(folder, names.highlight, grayToRgb(highlight), width, height, canvas);
  files.push(names.highlight);

  onProgress("Patching item.json…");
  // Keep the original before touching it. The plugin can't run the repo's Zod
  // validation, so an easy undo matters more than usual.
  await writeTextFile(folder, "item.json.bak", itemText);
  const patched = patchItem(info.raw, surfaceId, params.displacementScalePx);
  await writeTextFile(folder, "item.json", serializeItem(patched));
  files.push("item.json (patched, .bak kept)");

  return { files, canvas, warnings, item: info.name, preset: presetName };
}

function filled(n, value) {
  const a = new Float32Array(n);
  a.fill(value);
  return a;
}

/** Read an item directory's metadata for the panel, without baking anything. */
export async function inspectItemFolder(folder) {
  const text = await readTextFile(folder, "item.json");
  if (text === null) {
    throw new Error(
      "No item.json in that folder. Pick a single item directory such as " +
        "mockupplugin/assets/items/tshirt-marina-01 — not the items folder itself, " +
        "and not a general output folder."
    );
  }
  return parseItem(text);
}
