// Photo categories: recognized in layer names (slot tagging) and in uploaded
// filenames (auto-assign). Order matters — first match wins. Bed and bath are
// separate tags: the bath categories sit ABOVE their bedroom counterparts so
// "master bath" → masterbath (not master), and any plain "bathroom"/"bath"
// falls to secondarybath. porch/pool still outrank exterior's generic terms.

export interface PhotoCategory {
  key: string
  label: string
  keywords: string[]
}

export const PHOTO_CATEGORIES: PhotoCategory[] = [
  // Full-page images. Distinctive keywords, first so nothing steals them (the
  // left/right variants sit above the base so "full page left" matches them).
  // Auto-assign treats ALL full-page slots specially — see FULLPAGE_ORDER —
  // filling them with every photo in category progression rather than by
  // filename match. Left/right carry a default crop alignment at apply; the
  // per-tag Align toggle can override any of them.
  {
    key: 'fullpageleft',
    label: 'Full page (left)',
    keywords: ['full page left', 'fullpage left', 'left full page', 'full-page-left', 'fullpageleft'],
  },
  {
    key: 'fullpageright',
    label: 'Full page (right)',
    keywords: [
      'full page right',
      'fullpage right',
      'right full page',
      'full-page-right',
      'fullpageright',
    ],
  },
  {
    key: 'fullpage',
    label: 'Full page',
    keywords: ['full page', 'fullpage', 'full-page', 'fullbleed', 'full bleed'],
  },
  // Preview categories draw from the WHOLE photo pool, independent of any
  // photo's own category (see ALL_IMAGE_POOL_CATS / autoAssign). minipreview
  // must sit ABOVE preview so "mini preview" doesn't get stolen by "preview".
  {
    key: 'minipreview',
    label: 'Mini preview',
    keywords: ['mini preview', 'minipreview', 'mini-preview'],
  },
  {
    key: 'preview',
    label: 'Preview',
    keywords: ['preview'],
  },
  {
    key: 'masterbath',
    label: 'Master bath',
    keywords: [
      'master bath',
      'master bathroom',
      'master ensuite',
      'master en suite',
      'primary bath',
      'primary bathroom',
      'primary ensuite',
      'principal bath',
      'principal bathroom',
      'owner bath',
      'owner bathroom',
      'masterbath',
    ],
  },
  {
    key: 'secondarybath',
    label: 'Secondary bath',
    keywords: [
      'bathroom',
      'bath',
      'ensuite',
      'en suite',
      'guest bath',
      'guest bathroom',
      'family bath',
      'family bathroom',
      'shower room',
      'powder room',
      'powder',
      'wc',
      'washroom',
      'cloakroom',
      'secondarybath',
    ],
  },
  {
    key: 'master',
    label: 'Master bedroom',
    keywords: ['master', 'primary', 'principal', 'owner', 'owners'],
  },
  {
    key: 'entry',
    label: 'Front porch / entryway',
    keywords: ['front porch', 'porch', 'entry', 'entryway', 'entrance', 'foyer'],
  },
  { key: 'kitchen', label: 'Kitchen', keywords: ['kitchen', 'pantry'] },
  { key: 'dining', label: 'Dining', keywords: ['dining', 'breakfast'] },
  {
    key: 'living',
    label: 'Living room',
    keywords: ['living', 'family room', 'great room', 'sitting'],
  },
  { key: 'office', label: 'Office / den', keywords: ['office', 'study', 'den', 'library'] },
  {
    key: 'amenities',
    label: 'Amenities / bonus',
    keywords: [
      'gym',
      'fitness',
      'theater',
      'theatre',
      'media',
      'wine',
      'bar',
      'game',
      'bonus',
      'laundry',
      'mudroom',
      'sauna',
      'amenities',
    ],
  },
  { key: 'garage', label: 'Garage', keywords: ['garage'] },
  {
    key: 'outdoor',
    label: 'Outdoor living',
    keywords: [
      'pool',
      'patio',
      'deck',
      'spa',
      'backyard',
      'back yard',
      'yard',
      'garden',
      'outdoor',
      'fire pit',
      'firepit',
      'lanai',
      'balcony',
    ],
  },
  {
    key: 'secondary',
    label: 'Secondary bedroom',
    keywords: ['secondary', 'guest', 'bedroom', 'bed', 'bunk', 'spare', 'nursery'],
  },
  {
    key: 'exterior',
    label: 'Exterior',
    keywords: ['exterior', 'aerial', 'drone', 'front', 'facade', 'curb', 'elevation'],
  },
  {
    key: 'floorplan',
    label: 'Floor plan',
    keywords: ['floorplan', 'floor plan', 'site plan', 'plan', 'survey', 'map'],
  },
  // Generic catch-all for interior shots that don't fit a specific room —
  // hallways, landings, stairs. Sits last so any specific room wins first.
  {
    key: 'interior',
    label: 'Interior (general)',
    keywords: [
      'interior',
      'hallway',
      'hall',
      'landing',
      'stairs',
      'staircase',
      'stairwell',
      'corridor',
      'atrium',
    ],
  },
]

// PHOTO_CATEGORIES is ordered for MATCHING (bath keywords must outrank
// bedroom keywords). Dropdowns and help panels use this display order
// instead, which keeps related tags together: bedroom then its bath.
const DISPLAY_ORDER = [
  'fullpage',
  'fullpageleft',
  'fullpageright',
  'minipreview',
  'preview',
  'master',
  'masterbath',
  'secondary',
  'secondarybath',
  'kitchen',
  'dining',
  'living',
  'office',
  'entry',
  'amenities',
  'garage',
  'outdoor',
  'exterior',
  'interior',
  'floorplan',
]

/**
 * Category progression for full-page slots. Auto-assign fills photo.fullpage.NN
 * slots by ordering every photo by its category's position here (then by
 * filename), and consuming them one per slot in sequence — so full pages read
 * front porch → living room → kitchen → … through the whole shoot.
 */
export const FULLPAGE_ORDER = [
  'entry', // front porch / entryway
  'living', // living room
  'kitchen',
  'dining',
  'master', // master bed
  'masterbath', // master bath
  'secondary', // second bed
  'secondarybath', // second bath
  'office',
  'amenities',
  'garage',
  'outdoor', // outdoor living
  'exterior',
]

/**
 * Lead ordering for `preview` slots. Auto-assign fills the first preview slots
 * with one image from each of these categories, in this order, then continues
 * with the rest of the photo pool in filename order.
 */
export const PREVIEW_ORDER = ['exterior', 'kitchen', 'living', 'master']

/**
 * The `interior` and `exterior` slots are POOLS: an interior slot accepts a
 * photo from any interior room category, an exterior slot from any exterior
 * category. A photo still prefers its own specific slot first (a kitchen photo
 * fills a kitchen slot before an interior slot); the pool is the fallback.
 */
export const INTERIOR_POOL = [
  'interior',
  'entry',
  'kitchen',
  'dining',
  'living',
  'office',
  'amenities',
  'master',
  'masterbath',
  'secondary',
  'secondarybath',
]
export const EXTERIOR_POOL = ['exterior', 'outdoor', 'garage']

/** Which pool slot ('interior'/'exterior') a category feeds, or null. */
export function poolOf(cat: string | null): 'interior' | 'exterior' | null {
  if (!cat) return null
  if (INTERIOR_POOL.includes(cat)) return 'interior'
  if (EXTERIOR_POOL.includes(cat)) return 'exterior'
  return null
}

/** Rank a category key for full-page ordering (unlisted → end). */
export function fullPageRank(cat: string | null): number {
  if (!cat) return FULLPAGE_ORDER.length
  const i = FULLPAGE_ORDER.indexOf(cat)
  return i === -1 ? FULLPAGE_ORDER.length : i
}

export const PHOTO_CATEGORIES_DISPLAY: PhotoCategory[] = [...PHOTO_CATEGORIES].sort((a, b) => {
  const rank = (key: string) => {
    const i = DISPLAY_ORDER.indexOf(key)
    return i === -1 ? DISPLAY_ORDER.length : i
  }
  return rank(a.key) - rank(b.key)
})

/** Category slot fields look like photo.kitchen.01 (photo.slot.NNN is generic). */
export const CAT_SLOT_RE = /^photo\.([a-z][a-z0-9]*)\.(\d+)$/

export function isCategorySlot(field: string): boolean {
  const m = CAT_SLOT_RE.exec(field)
  return !!m && m[1] !== 'slot'
}

export function catSlotField(cat: string, n: number): string {
  return `photo.${cat}.${String(n).padStart(2, '0')}`
}

const FULLPAGE_CATS = new Set(['fullpage', 'fullpageleft', 'fullpageright'])

/** Is this category key any full-page variant? All share one progression pool. */
export function isFullPageCat(cat: string): boolean {
  return FULLPAGE_CATS.has(cat)
}

/**
 * Slot categories that populate from the ENTIRE photo pool, ignoring each
 * photo's own category and never consuming from (or contributing to) the
 * used-photo set that the room categories share:
 *   • preview     — cycles through every image in filename order.
 *   • minipreview — one representative image per category, in full-page order.
 * Auto-assign handles them in dedicated passes; they are excluded from the
 * specific-match, interior/exterior-pool, and generic-slot passes.
 */
const ALL_IMAGE_POOL_CATS = new Set(['preview', 'minipreview'])

export function isAllImagePoolCat(cat: string): boolean {
  return ALL_IMAGE_POOL_CATS.has(cat)
}

/**
 * Default crop alignment implied by a slot's category (fullpageleft/right).
 * A tag's own options.align (the Align toggle) overrides this at apply.
 */
export function categoryAlignOf(field: string): 'left' | 'right' | null {
  const m = CAT_SLOT_RE.exec(field)
  if (!m) return null
  if (m[1] === 'fullpageleft') return 'left'
  if (m[1] === 'fullpageright') return 'right'
  return null
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// "Kitchen2", "bedrooms", "MASTER-BATH_04.jpg" should all hit, but "garden"
// must not hit "den" — keywords match on token boundaries, allowing a
// plural s and trailing digits.
const compiled = PHOTO_CATEGORIES.map((cat) => ({
  key: cat.key,
  patterns: cat.keywords.map(
    (kw) => new RegExp(`(?:^|\\s)${escapeRe(kw)}(?:e?s)?\\d*(?:\\s|$)`)
  ),
}))

/** Match a layer name or filename to a category key, or null. */
export function matchCategory(name: string): string | null {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!norm) return null
  for (const cat of compiled) {
    for (const re of cat.patterns) {
      if (re.test(norm)) return cat.key
    }
  }
  return null
}

export function categoryLabel(key: string): string {
  return PHOTO_CATEGORIES.find((c) => c.key === key)?.label ?? key
}

// Agent-headshot detection for auto-assign. The agent photo isn't a room
// category — it's recognized by explicit words (headshot, agent, portrait, …)
// or by a plausible person's name (e.g. "Martha Johnson", "john-smith") that
// matches no room category.
const AGENT_KEYWORDS = ['headshot', 'agent', 'realtor', 'broker', 'portrait', 'profile', 'staff']
const agentKwPatterns = AGENT_KEYWORDS.map(
  (kw) => new RegExp(`(?:^|\\s)${escapeRe(kw)}(?:e?s)?\\d*(?:\\s|$)`)
)

/**
 * Does this photo filename look like the agent's headshot? True for explicit
 * agent/headshot wording, or a 2–3-word all-letters name that isn't a room
 * category ("Great Room" stays a living-room photo, "Martha Johnson" is agent).
 */
export function looksLikeAgentPhoto(name: string): boolean {
  const base = name.replace(/\.[^./\\]+$/, '') // strip extension
  // Split camelCase/PascalCase boundaries FIRST, so "MarthaJohnson" tokenizes
  // like "Martha Johnson" and "GreatRoom" reads as "Great Room" (which the room
  // matcher then claims). An all-lowercase run with no boundary —
  // "marthajohnson", "greatroom" — stays one token and can't be split.
  const spaced = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // lower→Upper boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ACRONYMWord → ACRONYM Word
  const norm = spaced.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!norm) return false
  for (const re of agentKwPatterns) if (re.test(norm)) return true
  if (matchCategory(spaced)) return false // a recognized room wins
  const tokens = spaced.trim().split(/[\s_.\-]+/).filter(Boolean)
  return tokens.length >= 2 && tokens.length <= 3 && tokens.every((t) => /^[A-Za-z]+$/.test(t))
}

/**
 * Does this filename match the agent's entered name? Uses the name typed into
 * the Content tab as ground truth, so even a delimiter-less "marthajohnson.png"
 * is recognized. Matches when the filename (letters/digits only) contains the
 * name tokens concatenated, OR contains every name token as a substring
 * (requires a first + last name so a lone common surname can't over-match).
 */
export function matchesAgentName(filename: string, agentName: string): boolean {
  const tokens = agentName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return false
  const fileNorm = filename.replace(/\.[^./\\]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (!fileNorm) return false
  if (fileNorm.includes(tokens.join(''))) return true // "marthajohnson"
  return tokens.every((t) => fileNorm.includes(t)) // "johnson_martha", "martha-j-johnson"
}
