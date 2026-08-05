// URL and filename helpers. Every template here was confirmed against the live
// explore feed rather than inferred:
//
//   card      <a href="/jobs/<uuid>?index=<n>">  with an image-set() background
//   thumbnail https://cdn.midjourney.com/<uuid>/0_<n>_384_N.webp?method=shortest
//   full size https://cdn.midjourney.com/<uuid>/0_<n>.png
//
// The size token clamps at the image's native width, so `_1024_` and `_2048_`
// both return the same pixels as the bare `.png`. The bare form is what we
// download; there is nothing larger to ask for.

const CDN = 'https://cdn.midjourney.com';

/** Thumbnail we send to Claude. 384px ≈ 200 visual tokens — the whole cost story. */
export function thumbUrl(id, index) {
  return `${CDN}/${id}/0_${index}_384_N.webp?method=shortest`;
}

/** Native-resolution image we actually keep. */
export function fullUrl(id, index) {
  return `${CDN}/${id}/0_${index}.png`;
}

/**
 * Filesystem-safe slug. Deliberately strict: strips anything that isn't
 * [a-z0-9], so emoji, quotes, CJK, and path separators all collapse to `-`
 * rather than surviving into a filename.
 */
export function slugify(text, maxLen = 80) {
  const s = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, ''); // truncation can leave a trailing dash
  return s || 'untitled';
}

/**
 * `<slug>-<first 8 of uuid>.png`. The uuid fragment is what guarantees two
 * similar-looking images can't collide on one name.
 */
export function downloadPath(subject, slug, id) {
  return `mj-${slugify(subject, 40)}/${slugify(slug)}-${id.slice(0, 8)}.png`;
}

/**
 * Selectable models, cheapest-to-judge last. All four are vision-capable and
 * support structured outputs, which this extension requires.
 *
 * The capability flags are not decoration — the request has to be built to
 * match, or the API rejects it:
 *
 *   effort   `output_config.effort` is accepted on the Opus 4.5+/Sonnet 5 line
 *            but ERRORS on Haiku 4.5. Omit it there.
 *   noThink  Whether to send `thinking: {type: "disabled"}`. On the newer
 *            models thinking is on by default (Opus 5) or opt-in, and
 *            disabling it is what we want for a yes/no visual match. Haiku 4.5
 *            predates that config shape and simply doesn't think unless asked,
 *            so we send nothing at all.
 *
 * Prices are USD per million tokens, input/output.
 */
export const MODELS = [
  {
    id: 'claude-opus-5',
    label: 'Opus 5 — most accurate',
    priceIn: 5.0, priceOut: 25.0,
    effort: true, noThink: true,
  },
  {
    id: 'claude-opus-4-8',
    label: 'Opus 4.8 — previous Opus',
    priceIn: 5.0, priceOut: 25.0,
    effort: true, noThink: true,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5 — good, ~40% cheaper',
    priceIn: 3.0, priceOut: 15.0,
    effort: true, noThink: true,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5 — cheapest, fastest',
    priceIn: 1.0, priceOut: 5.0,
    effort: false, noThink: false,
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

/** Look up a model, falling back to the default if the id is unknown/stale. */
export function modelById(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}

export function estimateCost(modelId, inTokens, outTokens) {
  const m = modelById(modelId);
  return (inTokens / 1e6) * m.priceIn + (outTokens / 1e6) * m.priceOut;
}
