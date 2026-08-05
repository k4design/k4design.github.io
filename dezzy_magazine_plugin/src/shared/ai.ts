// AI photo classification contract — mirrors the intake site's auto-tag.
// Photos are downscaled in the UI and sent straight to Anthropic's Claude API
// using the USER'S OWN key (entered in the plugin, kept in figma.clientStorage
// — on-device only, never stored in the document). Classification returns one
// room category via a strict JSON-schema enum; the result renames the library
// entry so the filename-driven auto-assign routes it.

import { PHOTO_CATEGORIES, isAllImagePoolCat, isFullPageCat } from './categories'

/**
 * Anthropic Messages API. Must match manifest.json's
 * networkAccess.allowedDomains — Figma blocks requests to undeclared domains.
 */
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'

export interface AiModel {
  id: string
  label: string
}

/** Model choices for classification (persisted via clientStorage). */
export const AI_MODELS: AiModel[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — most accurate' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 — balanced' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — cheapest for bulk' },
]
export const AI_DEFAULT_MODEL = AI_MODELS[0].id

/**
 * Categories the model may choose from: every real room/content category
 * (layout tags like fullpage/preview describe placement, not photo content),
 * plus `agent` for headshots and `unknown` when the image is indeterminate.
 */
const CONTENT_CATS = PHOTO_CATEGORIES.filter(
  (c) => !isFullPageCat(c.key) && !isAllImagePoolCat(c.key)
)

export const AI_CLASSIFY_KEYS: string[] = [
  ...CONTENT_CATS.map((c) => c.key),
  'agent',
  'unknown',
]

/**
 * Category -> filename base used when renaming. Each base is verified to
 * round-trip through matchCategory()/looksLikeAgentPhoto() back to the same
 * category, so a renamed photo auto-assigns correctly. `unknown` keeps the
 * original name (absent from this map).
 */
export const RENAME_BASE: Record<string, string> = {
  exterior: 'exterior',
  entry: 'entry',
  living: 'living',
  kitchen: 'kitchen',
  dining: 'dining',
  master: 'master',
  masterbath: 'master bath',
  secondary: 'secondary bedroom',
  secondarybath: 'secondary bath',
  office: 'office',
  amenities: 'amenities',
  garage: 'garage',
  outdoor: 'outdoor',
  interior: 'interior',
  floorplan: 'floorplan',
  agent: 'headshot',
}

export const AI_PROMPT =
  'You are tagging photos for a real-estate property magazine. Look at the image and choose the single best category from the list below. ' +
  'Rules: a portrait/headshot of a person -> "agent"; a floor plan, site plan, survey, or map -> "floorplan"; ' +
  'a bathroom attached to the primary bedroom -> "masterbath"; any other bathroom or powder room -> "secondarybath"; ' +
  "the primary/master bedroom -> \"master\"; any other bedroom -> \"secondary\"; " +
  'a room that does not clearly fit a specific category (hallway, stairs, landing) -> "interior"; ' +
  'if you truly cannot tell -> "unknown". Categories:\n' +
  CONTENT_CATS.map((c) => `- ${c.key}: ${c.label}`).join('\n') +
  '\n- agent: Portrait / headshot of a person (the listing agent)' +
  '\n- unknown: Cannot determine'

export const AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['category'],
  properties: { category: { type: 'string', enum: AI_CLASSIFY_KEYS } },
} as const
