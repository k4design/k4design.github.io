// UXP only injects require() into classic scripts, never into ES modules — using
// it here silently kills the whole module at evaluation time. Host modules are
// CommonJS, so import the default binding and destructure off that.
import photoshop from "photoshop";
const { app, action, imaging } = photoshop;

/**
 * Read the flattened composite of a document as 8-bit chunky RGB, optionally
 * downsampled so the longest edge is at most `maxEdge`.
 *
 * We ask Photoshop for `colorSpace: "RGB"` so CMYK / Lab / Grayscale documents
 * are converted on the way out instead of handing us samples we'd silently
 * misinterpret. If that still doesn't yield at least 3 components we bail loudly.
 *
 * @param {number} documentID
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {number} maxEdge
 * @returns {Promise<{data: Uint8Array, width: number, height: number, components: number}>}
 */
export async function readComposite(documentID, srcWidth, srcHeight, maxEdge) {
  const { width, height } = fitToMaxEdge(srcWidth, srcHeight, maxEdge);

  const options = {
    documentID,
    componentSize: 8,
    applyAlpha: false,
    colorSpace: "RGB",
  };
  if (width !== srcWidth || height !== srcHeight) {
    options.targetSize = { width, height };
  }

  const result = await imaging.getPixels(options);
  const imageData = result.imageData;
  try {
    if (imageData.components < 3) {
      throw new Error(
        `Expected an RGB composite but got ${imageData.components} component(s). ` +
        `Convert the document to RGB (Image > Mode > RGB Color) and try again.`
      );
    }
    const raw = await imageData.getData({ chunky: true });
    // Copy out of the UXP-owned buffer before disposing.
    const data = new Uint8Array(raw.length);
    data.set(raw);
    return {
      data,
      width: imageData.width,
      height: imageData.height,
      components: imageData.components,
    };
  } finally {
    imageData.dispose();
  }
}

/**
 * Create a new 8-bit RGB document and blit `rgb` into its background layer.
 *
 * Everything is written as RGB even for the grayscale maps — replicating the
 * value across R/G/B costs a slightly larger PNG and avoids juggling document
 * colour modes and single-component putPixels, which is a reliable source of
 * garbage output.
 *
 * @param {Uint8Array} rgb chunky RGB, 3 components per pixel
 * @param {number} width
 * @param {number} height
 * @param {string} name
 * @returns {Promise<Document>} the newly created (and now active) document
 */
export async function createDocumentFromRgb(rgb, width, height, name) {
  // batchPlay rather than documents.add(): at 72 dpi a "distanceUnit" value maps
  // 1:1 to pixels, so the document is exactly the size we asked for regardless
  // of the user's ruler units.
  await action.batchPlay(
    [
      {
        _obj: "make",
        new: {
          _obj: "document",
          name,
          mode: { _class: "RGBColorMode" },
          width: { _unit: "distanceUnit", _value: width },
          height: { _unit: "distanceUnit", _value: height },
          resolution: { _unit: "densityUnit", _value: 72 },
          depth: 8,
          fill: { _enum: "fill", _value: "white" },
          profile: "sRGB IEC61966-2.1",
        },
      },
    ],
    { synchronousExecution: false }
  );

  const doc = app.activeDocument;
  const imageData = await imaging.createImageDataFromBuffer(rgb, {
    width,
    height,
    components: 3,
    componentSize: 8,
    colorSpace: "RGB",
    chunky: true,
  });
  try {
    await imaging.putPixels({
      documentID: doc.id,
      layerID: doc.layers[0].id,
      imageData,
      replace: true,
    });
  } finally {
    imageData.dispose();
  }
  return doc;
}

/** Scale (w,h) down so the longest edge is `maxEdge`; never scales up. */
export function fitToMaxEdge(w, h, maxEdge) {
  const longest = Math.max(w, h);
  if (!maxEdge || longest <= maxEdge) return { width: w, height: h, scale: 1 };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  };
}

/** Expand a single-channel [0,1] float buffer into chunky 8-bit RGB. */
export function grayToRgb(gray) {
  const out = new Uint8Array(gray.length * 3);
  for (let i = 0, p = 0; i < gray.length; i++, p += 3) {
    const v = gray[i];
    const b = Math.round((v < 0 ? 0 : v > 1 ? 1 : v) * 255);
    out[p] = b;
    out[p + 1] = b;
    out[p + 2] = b;
  }
  return out;
}
