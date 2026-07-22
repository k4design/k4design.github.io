import { catSlotField, matchCategory } from '../shared/categories'
import { LOCKED_FIELD, RetagSummary } from '../shared/types'
import { loadPhotos } from './photos'
import { readTag, rebuildIndexFull, writeTag } from './tags'

const IMAGE_TYPES: NodeType[] = [
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'FRAME',
  'COMPONENT',
  'INSTANCE',
]

/** First visible image hash filling a node, or null. */
export function imageHashOf(node: SceneNode): string | null {
  if (!('fills' in node)) return null
  const fills = (node as GeometryMixin).fills
  if (fills === figma.mixed || !Array.isArray(fills)) return null
  for (const paint of fills) {
    if (paint.type === 'IMAGE' && paint.visible !== false && paint.imageHash) return paint.imageHash
  }
  return null
}

/** Every distinct image hash filling a container on the current page, in scan order. */
export function collectPageImageHashes(): string[] {
  const nodes = figma.currentPage.findAllWithCriteria({ types: IMAGE_TYPES })
  const seen = new Set<string>()
  const out: string[] = []
  for (const node of nodes) {
    const hash = imageHashOf(node)
    if (hash && !seen.has(hash)) {
      seen.add(hash)
      out.push(hash)
    }
  }
  return out
}

interface Change {
  nodeId: string
  field: string
  spread: boolean
}

/**
 * Classify every image container by the photo currently filling it and derive
 * the category tag it should carry. Containers sharing one image (spread
 * halves, or the same photo reused) collapse to a single numbered slot with
 * spread flagged when more than one node uses it. Images the library can't
 * identify are left untouched. Pure computation — writes nothing.
 */
export function planRetagByImage(): { summary: RetagSummary; changes: Change[] } {
  const { library } = loadPhotos()
  const nameByHash = new Map<string, string>()
  for (const ref of library) nameByHash.set(ref.hash, ref.name)

  const nodes = figma.currentPage.findAllWithCriteria({ types: IMAGE_TYPES })

  interface Container {
    node: SceneNode
    hash: string
    cat: string
  }
  const matched: Container[] = []
  let totalWithImages = 0
  let unmatchedImages = 0

  for (const node of nodes) {
    const hash = imageHashOf(node)
    if (!hash) continue
    totalWithImages++
    if (readTag(node)?.field === LOCKED_FIELD) continue // leave locked containers alone
    const name = nameByHash.get(hash)
    const cat = name ? matchCategory(name) : null
    if (!cat) {
      unmatchedImages++
      continue
    }
    matched.push({ node, hash, cat })
  }

  // Group containers by the image they hold so a spread gets one slot number.
  const byHash = new Map<string, Container[]>()
  for (const c of matched) {
    const group = byHash.get(c.hash)
    if (group) group.push(c)
    else byHash.set(c.hash, [c])
  }

  const counters = new Map<string, number>()
  const byCategory = new Map<string, number>()
  const changes: Change[] = []
  let unchanged = 0
  const seen = new Set<string>()

  // Iterate matched in scan order; number each distinct image within its
  // category the first time it's encountered.
  for (const c of matched) {
    if (seen.has(c.hash)) continue
    seen.add(c.hash)
    const group = byHash.get(c.hash)!
    const n = (counters.get(c.cat) ?? 0) + 1
    counters.set(c.cat, n)
    byCategory.set(c.cat, (byCategory.get(c.cat) ?? 0) + 1)
    const field = catSlotField(c.cat, n)
    const spread = group.length > 1
    for (const g of group) {
      const existing = readTag(g.node)
      if (existing && existing.field === field) {
        unchanged++
        continue
      }
      changes.push({ nodeId: g.node.id, field, spread })
    }
  }

  const summary: RetagSummary = {
    changeCount: changes.length,
    unchanged,
    unmatchedImages,
    totalWithImages,
    byCategory: [...byCategory.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  }
  return { summary, changes }
}

export async function applyRetag(changes: Change[]): Promise<number> {
  let applied = 0
  for (const ch of changes) {
    const node = await figma.getNodeByIdAsync(ch.nodeId)
    if (!node || node.removed) continue
    writeTag(node, {
      v: 1,
      kind: 'image',
      field: ch.field,
      options: ch.spread ? { spread: true } : undefined,
    })
    applied++
  }
  await rebuildIndexFull()
  return applied
}
