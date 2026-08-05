/**
 * Tuning constants only — no logic lives here.
 *
 * Radii are expressed at the REFERENCE_EDGE reference resolution and scaled by
 * (actualMaxEdge / REFERENCE_EDGE) in pipeline.js, so a preset behaves the same
 * regardless of input size.
 *
 * highPassRadius is the one to understand. Measured frequency response of
 * highPass() (sinusoid amplitude surviving, at the 2048 reference edge):
 *
 *   wavelength ->      8     32    128    384    768   2048
 *   radius  32       1.00   1.00   0.75   0.13   0.03   0.00
 *   radius  64       1.00   1.00   1.00   0.44   0.13   0.02
 *   radius 128       1.00   1.00   1.00   0.93   0.44   0.07
 *   radius 256       1.00   1.00   1.00   1.00   0.93   0.23
 *
 * The 50% cutoff lands at a wavelength of roughly 6x the radius. Against real
 * feature scales at 2048px — weave 4-12px, creases 30-120px, garment folds
 * 200-600px, lighting falloff 1000-2048px — radius 128 keeps folds (0.93 at
 * 384px) while discarding overall lighting (0.07 at 2048px). Anything at or
 * below 64 quietly erases the folds, which are most of what you want.
 */

export const REFERENCE_EDGE = 2048;

export const PRESETS = {
  fabric: {
    shadowStrength: 0.85,
    shadowGamma: 1.15,
    highlightStrength: 0.35,
    highlightThreshold: 0.93,
    label: "Fabric / apparel",
    hint: "T-shirts, hoodies, totes. Keeps weave, creases and folds; drops overall lighting.",
    // Keeps weave, creases and folds; drops overall lighting.
    highPassRadius: 128,
    smoothRadius: 3,
    aoRadius: 24,
    aoStrength: 1.2,
    displacementScalePx: 12,
    normalYUp: true,
  },
  paper: {
    shadowStrength: 0.7,
    shadowGamma: 1.0,
    highlightStrength: 0.3,
    highlightThreshold: 0.94,
    label: "Paper / print",
    hint: "Cards, posters, packaging. Keeps creases and gentle bends in the sheet.",
    // Paper is flatter than cloth, so keep more of the mid scale (gentle bends).
    highPassRadius: 192,
    smoothRadius: 2,
    aoRadius: 16,
    aoStrength: 0.8,
    displacementScalePx: 6,
    normalYUp: true,
  },
  screen: {
    shadowStrength: 0.55,
    shadowGamma: 0.9,
    highlightStrength: 0.55,
    highlightThreshold: 0.88,
    // highPassRadius 0 keeps the low-frequency curvature, which is the whole
    // point on a device screen. aoRadius 0 skips the AO map entirely.
    label: "Device screen",
    hint: "Phone and laptop mockups. Keeps the panel\u2019s curvature; writes no AO map.",
    highPassRadius: 0,
    smoothRadius: 6,
    aoRadius: 0,
    aoStrength: 0,
    displacementScalePx: 3,
    normalYUp: true,
  },
  signage: {
    shadowStrength: 0.9,
    shadowGamma: 1.25,
    highlightStrength: 0.25,
    highlightThreshold: 0.95,
    label: "Signage / wall",
    hint: "Brick, concrete, billboards. Keeps high-frequency texture, discards broad shape.",
    // Brick/concrete is all high-frequency texture — discard the broad shape.
    highPassRadius: 64,
    smoothRadius: 1,
    aoRadius: 12,
    aoStrength: 1.5,
    displacementScalePx: 8,
    normalYUp: true,
  },
};

export const PARAM_KEYS = [
  "highPassRadius",
  "smoothRadius",
  "aoRadius",
  "aoStrength",
  "displacementScalePx",
  "shadowStrength",
  "shadowGamma",
  "highlightStrength",
  "highlightThreshold",
];
