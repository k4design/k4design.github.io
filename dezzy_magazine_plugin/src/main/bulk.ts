import { CAT_SLOT_RE, catSlotField, isCategorySlot, matchCategory } from '../shared/categories'
import { SCHEMA } from '../shared/schema'
import { NS, SLOT_RE, Tag, TAG_KEY, slotField } from '../shared/types'
import { readTag, scanTagged, writeTag } from './tags'

export interface ScanResult {
  tagged: number
  skipped: number
  categorized: number
}

/** Node types that can hold an image fill — category names on anything else
 * (groups, text) are ignored to avoid false positives. */
const FILLABLE = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'FRAME',
  'COMPONENT',
  'INSTANCE',
])

/**
 * Convert layer-name conventions into tags:
 *  - `#anyField` on any node -> tag (TEXT -> text, everything else -> image);
 *    if the name matches a photo category (`#kitchen`), it becomes the next
 *    numbered slot in that category (photo.kitchen.03)
 *  - a TEXT layer named exactly like a schema text field (e.g. `street`) -> text tag
 *  - a fillable layer (>=80px) whose name mentions a category ("Master Bath 2")
 *    -> next numbered slot in that category
 * Names are left untouched; the scan is idempotent (tagged nodes are skipped).
 */
export function scanNames(): ScanResult {
  const textKeys = new Set(SCHEMA.filter((f) => f.kind === 'text').map((f) => f.key))
  const result: ScanResult = { tagged: 0, skipped: 0, categorized: 0 }

  // Per-category counters continue after the highest existing slot number.
  const counters = new Map<string, number>()
  const bump = (cat: string): number => {
    const next = (counters.get(cat) ?? 0) + 1
    counters.set(cat, next)
    return next
  }

  interface Candidate {
    node: SceneNode
    field: string
    kind: Tag['kind']
    /** Category key when the field must be numbered at assignment time. */
    cat?: string
  }
  const candidates: Candidate[] = []

  figma.currentPage.findAll((n) => {
    const existing = readTag(n)
    if (existing) {
      const m = CAT_SLOT_RE.exec(existing.field)
      if (m && m[1] !== 'slot') {
        const num = parseInt(m[2], 10)
        if (num > (counters.get(m[1]) ?? 0)) counters.set(m[1], num)
      }
    }

    const name = n.name.trim()
    const isFillable = FILLABLE.has(n.type) && 'width' in n && n.width >= 80 && n.height >= 80

    if (name.startsWith('#') && name.length > 1) {
      const raw = name.slice(1).trim()
      if (!raw) return false
      if (existing) {
        result.skipped++
        return false
      }
      if (n.type === 'TEXT') {
        candidates.push({ node: n as SceneNode, field: raw, kind: 'text' })
      } else {
        const cat = matchCategory(raw)
        if (cat) candidates.push({ node: n as SceneNode, field: '', kind: 'image', cat })
        else candidates.push({ node: n as SceneNode, field: raw, kind: 'image' })
      }
      return false
    }

    if (n.type === 'TEXT' && textKeys.has(name)) {
      if (existing) result.skipped++
      else candidates.push({ node: n as SceneNode, field: name, kind: 'text' })
      return false
    }

    if (isFillable) {
      const cat = matchCategory(name)
      if (cat) {
        if (existing) result.skipped++
        else candidates.push({ node: n as SceneNode, field: '', kind: 'image', cat })
      }
    }
    return false
  })

  for (const c of candidates) {
    const field = c.cat ? catSlotField(c.cat, bump(c.cat)) : c.field
    writeTag(c.node, { v: 1, kind: c.kind, field })
    result.tagged++
    if (c.cat) result.categorized++
  }
  return result
}

export interface AutoNumberResult {
  slots: number
  spreadPairs: number
  skipped: number
  pages: number
}

interface PageFrame {
  frame: FrameNode
  order: number
}

/**
 * Magazine page frames on the current Figma page, in reading order.
 * Recognizes `Cover_Outside`, `Cover_Inside`, and `Insert Page N`.
 */
function magazinePageFrames(): PageFrame[] {
  const out: PageFrame[] = []
  for (const child of figma.currentPage.children) {
    if (child.type !== 'FRAME') continue
    const insert = /^insert\s*page\s*(\d+)/i.exec(child.name)
    if (insert) out.push({ frame: child, order: 100 + parseInt(insert[1], 10) })
    else if (/^cover[_\s]?outside/i.test(child.name)) out.push({ frame: child, order: 0 })
    else if (/^cover[_\s]?inside/i.test(child.name)) out.push({ frame: child, order: 1 })
  }
  return out.sort((a, b) => a.order - b.order)
}

interface Candidate {
  node: SceneNode
  order: number
  ax: number
  ay: number
  w: number
  h: number
}

const MIN_SLOT_SIZE = 80
/** Position/size tolerance (px) when matching the two halves of a spread. */
const SPREAD_SNAP = 4

/**
 * Tag every placeholder rectangle as a numbered photo slot, in reading order
 * (page order, then top-to-bottom, left-to-right). Spread images — the same
 * size rectangle appearing once in each of two adjacent page frames at the
 * same absolute canvas position — are detected automatically and share one
 * slot number, so one photo fills both halves seamlessly at apply time.
 */
export function autoNumberSlots(renumber: boolean): AutoNumberResult {
  const frames = magazinePageFrames()
  const result: AutoNumberResult = { slots: 0, spreadPairs: 0, skipped: 0, pages: frames.length }
  if (!frames.length) return result

  const candidates: Candidate[] = []
  let maxExisting = 0

  for (const { frame, order } of frames) {
    const rects = frame.findAllWithCriteria({ types: ['RECTANGLE'] })
    for (const rect of rects) {
      if (rect.width < MIN_SLOT_SIZE || rect.height < MIN_SLOT_SIZE) continue
      const existing = readTag(rect)
      if (existing) {
        const isSlot = SLOT_RE.test(existing.field)
        if (isSlot) {
          const num = parseInt(SLOT_RE.exec(existing.field)![1], 10)
          if (num > maxExisting) maxExisting = num
        }
        // Never clobber named/manual tags; keep numbered slots unless renumbering.
        if (!isSlot || !renumber) {
          result.skipped++
          continue
        }
      }
      const bb = rect.absoluteBoundingBox
      if (!bb) continue
      candidates.push({ node: rect, order, ax: bb.x, ay: bb.y, w: bb.width, h: bb.height })
    }
  }

  // Spread halves live in different page frames but occupy the same absolute
  // canvas rect (the right page's copy is offset by -pageWidth internally).
  const groups = new Map<string, Candidate[]>()
  for (const c of candidates) {
    const key = [c.w, c.h, c.ax, c.ay].map((v) => Math.round(v / SPREAD_SNAP)).join(':')
    const group = groups.get(key)
    if (group) group.push(c)
    else groups.set(key, [c])
  }

  const ordered = [...groups.values()].sort((a, b) => {
    const ga = a[0]
    const gb = b[0]
    return ga.order - gb.order || ga.ay - gb.ay || ga.ax - gb.ax
  })

  let num = renumber ? 0 : maxExisting
  for (const group of ordered) {
    const field = slotField(++num)
    const spread = group.length > 1
    for (const c of group) {
      writeTag(c.node, { v: 1, kind: 'image', field, options: spread ? { spread: true } : undefined })
    }
    result.slots++
    if (spread) result.spreadPairs++
  }
  return result
}

/** Predicate helper reused by main.ts for cheap "is anything tagged" checks. */
export function hasTag(node: BaseNode): boolean {
  return !!node.getSharedPluginData(NS, TAG_KEY)
}

export interface RenameResult {
  renamed: number
  skipped: number
}

/**
 * Rename every tagged layer to its tag's field (`price`, `photo.kitchen.01`,
 * `text.template`, …) so the layer list mirrors the tagging. Works off
 * scanTagged() — the real tagged nodes — so tags inherited by instances aren't
 * touched (their name is owned by the main component, which we do rename).
 * Layers whose name can't be set (e.g. inside an instance) are skipped.
 */
export function renameToTags(): RenameResult {
  const res: RenameResult = { renamed: 0, skipped: 0 }
  for (const { node, tag } of scanTagged()) {
    if (!('name' in node)) {
      res.skipped++
      continue
    }
    try {
      if ((node as SceneNode).name !== tag.field) (node as SceneNode).name = tag.field
      res.renamed++
    } catch {
      res.skipped++
    }
  }
  return res
}
