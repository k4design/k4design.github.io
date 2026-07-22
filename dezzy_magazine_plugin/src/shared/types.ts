// Shared between the plugin sandbox (main) and the UI iframe.

/** Shared plugin data namespace — readable by future companion tools. */
export const NS = 'dezzymag'
/** Per-node key holding the Tag JSON. */
export const TAG_KEY = 'tag'
/** Document-root key holding the TagIndex JSON. */
export const INDEX_KEY = 'index'

export type TagKind = 'text' | 'image'

/** Crop alignment of a photo within its container. Absent = centered. */
export type CropAlign = 'left' | 'center' | 'right'

export interface Tag {
  v: 1
  kind: TagKind
  field: string
  options?: {
    /** This node is one half of a spread image (same field on both halves). */
    spread?: boolean
    /**
     * Which border to pin the cover-fit crop to. Used for spread halves — the
     * left container shows the image's left portion, the right its right — so a
     * shared photo reads as one continuous image across two touching artboards.
     */
    align?: CropAlign
    /**
     * Template text for partial tagging. When set, the node isn't replaced
     * wholesale — its characters are rendered from this string, with
     * `{{field}}` tokens swapped for values and all literal text preserved.
     * The tag's `field` is TEMPLATE_FIELD in this mode.
     */
    template?: string
  }
}

/**
 * Reserved text field for template-mode nodes (partial tagging). The node's
 * template string lives in options.template; the index stores template nodes
 * under this field so the apply engine can find and render them.
 */
export const TEMPLATE_FIELD = 'text.template'

/** Field keys referenced by a template's {{tokens}}, unique, in order. */
export function templateFields(template: string): string[] {
  const out: string[] = []
  const re = /\{\{\s*([^}]+?)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(template))) {
    const key = m[1].trim()
    if (key && !out.includes(key)) out.push(key)
  }
  return out
}

/** Render a template, replacing {{field}} with its value (missing → empty). */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => values[key.trim()] ?? '')
}

/** Cached map of field -> tagged node ids, stored on figma.root. */
export interface TagIndex {
  v: 1
  /** Name of the Figma page the index was built from. */
  page: string
  fields: Record<string, { kind: TagKind; ids: string[] }>
  /** How many template nodes reference each field (for content-form counts). */
  templateCounts?: Record<string, number>
}

export interface SelNode {
  id: string
  name: string
  nodeType: string
  tag: Tag | null
  /** For text nodes: the node's current characters (for the template editor). */
  chars?: string
}

export interface IndexEntry {
  field: string
  kind: TagKind
  count: number
  spread: boolean
}

/** Entered listing data, persisted on figma.root so it travels with the file. */
export interface ContentData {
  v: 1
  values: Record<string, string>
}

export interface DryRunEntry {
  field: string
  nodeCount: number
  hasValue: boolean
}

export interface DryRunReport {
  entries: DryRunEntry[]
  /** Text nodes that would be written. */
  nodesToUpdate: number
  /** Tagged text fields with no entered value. */
  emptyTagged: number
  /** Entered values with no tagged node anywhere. */
  valueNoNodes: number
}

export interface ApplySummary {
  updated: number
  fieldsApplied: number
  deadRemoved: number
  errors: string[]
}

/** Whole-magazine health check: content, photos, and index integrity. */
export interface ValidationReport {
  totalTagged: number
  /** Text fields with a value ready to apply / nodes they cover. */
  textFieldsReady: number
  textNodes: number
  /** Tagged text fields with no entered value. */
  emptyTagged: string[]
  /** Entered values with no tagged node anywhere. */
  valueNoNodes: string[]
  imageSlots: number
  assignedSlots: number
  unassigned: string[]
  /** Locked layers — text and image — kept as-is, never changed by apply. */
  lockedSlots: number
  /** Spread slots whose halves have drifted in size (breaks seamless fill). */
  spreadIssues: string[]
  /** Dead node ids healed out of the index during the check. */
  deadHealed: number
}

/** An image Figma has stored (via createImage) — we only keep metadata. */
export interface PhotoRef {
  hash: string
  name: string
  width: number
  height: number
}

/** field -> imageHash */
export type PhotoAssignments = Record<string, string>

/** Preview of a "retag containers from their current image" run. */
export interface RetagSummary {
  /** Containers whose tag would change. */
  changeCount: number
  /** Containers already tagged with the category their image implies. */
  unchanged: number
  /** Containers holding an image the library can't identify (left as-is). */
  unmatchedImages: number
  /** Distinct image containers found on the page. */
  totalWithImages: number
  /** Per-category tally of the resulting tags, category key -> count. */
  byCategory: { category: string; count: number }[]
}

export type UiToMain =
  | { type: 'init' }
  | { type: 'assign-tag'; field: string; kind: TagKind }
  | { type: 'remove-tag' }
  | { type: 'set-align'; align: CropAlign }
  | { type: 'couple-spread' }
  | { type: 'set-template'; template: string }
  | { type: 'align-spread' }
  | { type: 'scan-names' }
  | { type: 'auto-number'; renumber: boolean }
  | { type: 'rename-to-tags' }
  | { type: 'rebuild-index' }
  | { type: 'rebuild-index-apply' }
  | { type: 'clear-tags' }
  | { type: 'select-field'; field: string }
  | { type: 'save-content'; values: Record<string, string> }
  | { type: 'dry-run' }
  | { type: 'apply-text'; fields: string[] | null }
  | { type: 'upload-image'; id: number; name: string; bytes: Uint8Array }
  | { type: 'save-photos'; assignments: PhotoAssignments; library: PhotoRef[] }
  | { type: 'apply-photos'; fields: string[] | null }
  | { type: 'apply-all' }
  | { type: 'cancel-apply' }
  | { type: 'validate' }
  | { type: 'retag-preview' }
  | { type: 'retag-apply' }
  | { type: 'export-images' }
  | { type: 'restore-tags'; tags: { id: string; tag: Tag }[] }
  | { type: 'fetch-image'; hash: string }

export type MainToUi =
  | { type: 'selection'; nodes: SelNode[]; total: number }
  | {
      type: 'index'
      entries: IndexEntry[]
      page: string
      taggedNodes: number
      templateCounts: Record<string, number>
    }
  | { type: 'content'; values: Record<string, string> }
  | { type: 'dry-run-result'; report: DryRunReport }
  | { type: 'apply-progress'; done: number; total: number }
  | { type: 'apply-result'; summary: ApplySummary }
  | { type: 'image-created'; id: number; ref: PhotoRef }
  | { type: 'image-error'; id: number; message: string }
  | { type: 'photos'; assignments: PhotoAssignments; library: PhotoRef[] }
  | { type: 'validate-result'; report: ValidationReport }
  | { type: 'compact-plan'; renumbered: number }
  | { type: 'retag-plan'; summary: RetagSummary }
  | { type: 'export-tags'; tags: string }
  | { type: 'export-image'; name: string; bytes: Uint8Array; done: number; total: number }
  | { type: 'export-images-done'; count: number; cancelled?: boolean }
  | { type: 'image-bytes'; hash: string; bytes: Uint8Array }
  | { type: 'toast'; message: string; error?: boolean }
  | { type: 'busy'; busy: boolean; label?: string }

export const SLOT_PREFIX = 'photo.slot.'
export const SLOT_RE = /^photo\.slot\.(\d+)$/

/**
 * Reserved image field marking a container the plugin must never fill or
 * reclassify — permanent artwork, branding, a fixed photo. Apply skips it,
 * retag leaves it, auto-number won't touch it, and it isn't an assignable slot.
 */
export const LOCKED_FIELD = 'photo.locked'

/**
 * Reserved text field marking a layer the plugin must never overwrite —
 * boilerplate, a disclaimer, a fixed heading. Apply-text and the dry-run skip
 * it, and it isn't shown as an editable content field.
 */
export const TEXT_LOCKED_FIELD = 'text.locked'

export function isLockedField(field: string): boolean {
  return field === LOCKED_FIELD || field === TEXT_LOCKED_FIELD
}

export function slotField(n: number): string {
  return SLOT_PREFIX + String(n).padStart(3, '0')
}
