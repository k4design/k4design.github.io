import { PHOTO_CATEGORIES_DISPLAY } from './categories'
import { LOCKED_FIELD, TEXT_LOCKED_FIELD, type TagKind } from './types'

export interface FieldDef {
  key: string
  label: string
  kind: TagKind
  group: string
  multiline?: boolean
}

// Field keys deliberately match the layer names already used in the
// Aperture Powerpack template (street, cityState, price, name, …) so the
// name-scan can convert Kyle's existing naming convention into tags as-is.
const property: FieldDef[] = [
  { key: 'street', label: 'Street address', kind: 'text', group: 'Property' },
  { key: 'street2', label: 'Street address line 2', kind: 'text', group: 'Property' },
  { key: 'cityState', label: 'City / State / Zip (combined)', kind: 'text', group: 'Property' },
  { key: 'city', label: 'City', kind: 'text', group: 'Property' },
  { key: 'state', label: 'State', kind: 'text', group: 'Property' },
  { key: 'zip', label: 'Zip code', kind: 'text', group: 'Property' },
  { key: 'price', label: 'Price', kind: 'text', group: 'Property' },
  { key: 'tagline', label: 'Tagline', kind: 'text', group: 'Property' },
  { key: 'description', label: 'Description', kind: 'text', group: 'Property', multiline: true },
  { key: 'communityDescription', label: 'Community description', kind: 'text', group: 'Property', multiline: true },
  { key: 'bedrooms', label: 'Bedrooms', kind: 'text', group: 'Property' },
  { key: 'bathrooms', label: 'Bathrooms', kind: 'text', group: 'Property' },
  { key: 'sqft', label: 'Square feet', kind: 'text', group: 'Property' },
  { key: 'lotSize', label: 'Lot size', kind: 'text', group: 'Property' },
  { key: 'yearBuilt', label: 'Year built', kind: 'text', group: 'Property' },
]

const features: FieldDef[] = [
  ...Array.from({ length: 9 }, (_, i): FieldDef => ({
    key: `feature${i + 1}`,
    label: `Feature ${i + 1}`,
    kind: 'text',
    group: 'Features',
  })),
  { key: 'featuresBulleted', label: 'Features (bulleted block)', kind: 'text', group: 'Features', multiline: true },
]

const agent: FieldDef[] = [
  { key: 'name', label: 'Agent name', kind: 'text', group: 'Agent' },
  { key: 'agentTitle', label: 'Agent title', kind: 'text', group: 'Agent' },
  { key: 'phone', label: 'Agent phone', kind: 'text', group: 'Agent' },
  { key: 'email', label: 'Agent email', kind: 'text', group: 'Agent' },
]

// Room-caption blocks repeat across the magazine (living, bedrooms, kitchen,
// outdoor, …). Numbered groups keep them template-agnostic.
const captions: FieldDef[] = Array.from({ length: 8 }, (_, i) => i + 1).flatMap(
  (n): FieldDef[] => [
    { key: `caption.${n}.title`, label: `Caption ${n} title`, kind: 'text', group: 'Captions' },
    { key: `caption.${n}.body`, label: `Caption ${n} body`, kind: 'text', group: 'Captions', multiline: true },
  ]
)

// Named photo slots. Numbered slots (photo.slot.NNN) are created dynamically
// by auto-numbering and are not enumerated here. The `.auto` entries are
// pseudo-fields: assigning one makes the sandbox pick the next free number
// in that category (photo.kitchen.03, …).
// Lock markers — selectable in the Tag dropdown, but the Content form hides
// this whole group so a locked field is never shown as editable.
const locks: FieldDef[] = [
  { key: TEXT_LOCKED_FIELD, label: 'Locked — keep current text', kind: 'text', group: 'Locks' },
  { key: LOCKED_FIELD, label: 'Locked — keep current image', kind: 'image', group: 'Locks' },
]

const photos: FieldDef[] = [
  { key: 'photo.cover', label: 'Cover photo', kind: 'image', group: 'Photos' },
  { key: 'photo.hero', label: 'Hero photo', kind: 'image', group: 'Photos' },
  { key: 'photo.agent', label: 'Agent headshot', kind: 'image', group: 'Photos' },
  ...PHOTO_CATEGORIES_DISPLAY.map(
    (c): FieldDef => ({
      key: `photo.${c.key}.auto`,
      label: `${c.label} slot (next #)`,
      kind: 'image',
      group: 'Photos',
    })
  ),
]

export const SCHEMA: FieldDef[] = [
  ...property,
  ...features,
  ...agent,
  ...captions,
  ...photos,
  ...locks,
]

export const SCHEMA_GROUPS: string[] = [
  'Property',
  'Features',
  'Agent',
  'Captions',
  'Photos',
  'Locks',
]

export function fieldDef(key: string): FieldDef | undefined {
  return SCHEMA.find((f) => f.key === key)
}
