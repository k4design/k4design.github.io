import { CAT_SLOT_RE, catSlotField, categoryAlignOf } from '../shared/categories'
import {
  ApplySummary,
  CropAlign,
  LOCKED_FIELD,
  NS,
  PhotoAssignments,
  PhotoRef,
  slotField,
} from '../shared/types'
import {
  loadIndex,
  patchIndex,
  readTag,
  rebuildIndex,
  rebuildIndexFull,
  scanTagged,
  writeTag,
} from './tags'

const PHOTOS_KEY = 'photos'

interface PhotoStore {
  v: 1
  assignments: PhotoAssignments
  library: PhotoRef[]
}

export function loadPhotos(): PhotoStore {
  const raw = figma.root.getSharedPluginData(NS, PHOTOS_KEY)
  if (raw) {
    try {
      const store = JSON.parse(raw) as PhotoStore
      if (store && store.assignments && store.library) return store
    } catch {
      // fall through to empty store
    }
  }
  return { v: 1, assignments: {}, library: [] }
}

export function savePhotos(assignments: PhotoAssignments, library: PhotoRef[]): void {
  const store: PhotoStore = { v: 1, assignments, library }
  figma.root.setSharedPluginData(NS, PHOTOS_KEY, JSON.stringify(store))
}

const VAULT_ID_KEY = 'vaultId'

/**
 * Figma garbage-collects images that no fill references when the file is
 * closed — which silently destroyed library photos that hadn't been applied
 * yet (no thumbnails, nothing to apply, "missing from store"). The vault is
 * a tiny invisible, locked rectangle whose fills reference every library
 * image, pinning their bytes in the file. Rebuilt after each library change.
 */
export async function maintainImageVault(): Promise<void> {
  const { library } = loadPhotos()
  const id = figma.root.getSharedPluginData(NS, VAULT_ID_KEY)
  let rect: RectangleNode | null = null
  if (id) {
    const node = await figma.getNodeByIdAsync(id)
    if (node && !node.removed && node.type === 'RECTANGLE') rect = node
  }
  if (!library.length) {
    if (rect) rect.remove()
    figma.root.setSharedPluginData(NS, VAULT_ID_KEY, '')
    return
  }
  if (!rect) {
    rect = figma.createRectangle()
    rect.name = '🗄 Dezzy image vault — keeps uploaded photos in the file (do not delete)'
    rect.resize(16, 16)
    rect.x = -20000
    rect.y = -20000
    rect.visible = false
    rect.locked = true
    figma.currentPage.appendChild(rect)
    figma.root.setSharedPluginData(NS, VAULT_ID_KEY, rect.id)
  }
  // Only pin images Figma still has — a paint with a dead hash is useless.
  rect.fills = library
    .filter((ref) => figma.getImageByHash(ref.hash))
    .map((ref): ImagePaint => ({ type: 'IMAGE', imageHash: ref.hash, scaleMode: 'FILL' }))
}

/**
 * Hand raw bytes to Figma and return only metadata. Figma stores the pixels;
 * the plugin never retains image bytes, so memory stays flat regardless of
 * how many photos a magazine uses.
 */
export async function createImageRef(name: string, bytes: Uint8Array): Promise<PhotoRef> {
  const image = figma.createImage(bytes)
  const size = await image.getSizeAsync()
  return { hash: image.hash, name, width: size.width, height: size.height }
}

export interface PhotoApplyResult {
  summary: ApplySummary
  /** Image fields in the index that have no photo assigned. */
  unassigned: number
  /** Unused slot nodes flagged magenta. */
  emptied: number
}

/** Solid magenta flag for image slots left unfilled after an apply. */
const MAGENTA: SolidPaint = { type: 'SOLID', color: { r: 1, g: 0, b: 1 } }

/**
 * CROP-mode transform reproducing object-fit: cover — uniform scale to
 * cover the node, centered, overflow cropped. The matrix maps normalized
 * node coordinates into normalized image coordinates, so the visible
 * window is (cropW × cropH) centered in the image; one axis is always 1.
 * Using CROP (not FILL) means the fill is already in Figma's crop mode,
 * so repositioning/rescaling the photo by hand afterwards is one click.
 */
function coverCropTransform(
  nodeW: number,
  nodeH: number,
  imgW: number,
  imgH: number,
  align: CropAlign = 'center'
): Transform {
  const scale = Math.max(nodeW / imgW, nodeH / imgH)
  const cropW = nodeW / (scale * imgW)
  const cropH = nodeH / (scale * imgH)
  // Horizontal offset within the free (overflow) width: left border, right
  // border, or centered. Vertical stays centered.
  const freeX = 1 - cropW
  const offsetX = align === 'left' ? 0 : align === 'right' ? freeX : freeX / 2
  return [
    [cropW, 0, offsetX],
    [0, cropH, (1 - cropH) / 2],
  ]
}

/**
 * Perfect spread continuity: cover-fit the image to the UNION of all the
 * field's containers (their combined absolute bounding box — works across
 * different artboards), then give each container the crop window matching its
 * portion of that union. Adjacent halves tile the image exactly, with no
 * duplicated or missing sliver in the gutter. Returns per-node transforms,
 * or null when there's nothing to distribute (fewer than 2 boxed nodes).
 */
function unionCropTransforms(
  nodes: SceneNode[],
  imgW: number,
  imgH: number
): Map<string, Transform> | null {
  const boxes = nodes
    .map((n) => ({ n, bb: 'absoluteBoundingBox' in n ? n.absoluteBoundingBox : null }))
    .filter((x): x is { n: SceneNode; bb: Rect } => !!x.bb)
  if (boxes.length < 2 || imgW <= 0 || imgH <= 0) return null
  const ux = Math.min(...boxes.map((b) => b.bb.x))
  const uy = Math.min(...boxes.map((b) => b.bb.y))
  const ux2 = Math.max(...boxes.map((b) => b.bb.x + b.bb.width))
  const uy2 = Math.max(...boxes.map((b) => b.bb.y + b.bb.height))
  const W = ux2 - ux
  const H = uy2 - uy
  if (W <= 0 || H <= 0) return null
  const scale = Math.max(W / imgW, H / imgH)
  const winW = W / (scale * imgW)
  const winH = H / (scale * imgH)
  const x0 = (1 - winW) / 2
  const y0 = (1 - winH) / 2
  const map = new Map<string, Transform>()
  for (const { n, bb } of boxes) {
    const cx = x0 + ((bb.x - ux) / W) * winW
    const cy = y0 + ((bb.y - uy) / H) * winH
    const cw = (bb.width / W) * winW
    const ch = (bb.height / H) * winH
    map.set(n.id, [
      [cw, 0, cx],
      [0, ch, cy],
    ])
  }
  return map
}

/** First visible image hash on a node's fills, or null. */
function fillHashOf(node: SceneNode): string | null {
  if (!('fills' in node)) return null
  const fills = (node as GeometryMixin).fills
  if (fills === figma.mixed || !Array.isArray(fills)) return null
  for (const paint of fills) {
    if (paint.type === 'IMAGE' && paint.visible !== false && paint.imageHash) return paint.imageHash
  }
  return null
}

/**
 * Set image fills on every node tagged with an assigned photo slot. Spread
 * halves share a field, so both get the identical fill — same hash, same
 * FILL scale mode — which renders seamlessly across the two page frames.
 */
export async function applyPhotos(
  fields: string[] | null,
  onProgress: (done: number, total: number) => void,
  shouldCancel: () => boolean = () => false
): Promise<PhotoApplyResult> {
  const idx = loadIndex() ?? rebuildIndex()
  const { assignments, library } = loadPhotos()
  const summary: ApplySummary = { updated: 0, fieldsApplied: 0, deadRemoved: 0, errors: [] }

  // Image dimensions are needed for the cover-crop math. The library refs
  // already carry them; fall back to Figma for hashes from older data.
  const sizeCache = new Map<string, { width: number; height: number }>()
  for (const ref of library) sizeCache.set(ref.hash, { width: ref.width, height: ref.height })
  async function imageSize(hash: string): Promise<{ width: number; height: number } | null> {
    const cached = sizeCache.get(hash)
    if (cached && cached.width > 0 && cached.height > 0) return cached
    const image = figma.getImageByHash(hash)
    if (!image) return null
    const size = await image.getSizeAsync()
    sizeCache.set(hash, size)
    return size
  }
  const wanted = fields ? new Set(fields) : null

  interface Target {
    node: SceneNode
    hash: string
    align: CropAlign
  }
  const targets: Target[] = []
  const empties: SceneNode[] = []
  const dead: string[] = []
  // Coupled spread fields: all their nodes, for union-fit distribution.
  const spreadNodes = new Map<string, SceneNode[]>()
  let unassigned = 0

  for (const field of Object.keys(idx.fields)) {
    const entry = idx.fields[field]
    if (entry.kind !== 'image') continue
    if (field === LOCKED_FIELD) continue // never replace locked containers
    if (wanted && !wanted.has(field)) continue
    const hash = assignments[field]
    let resolvedAny = false
    for (const id of entry.ids) {
      const node = await figma.getNodeByIdAsync(id)
      if (!node || node.removed) {
        dead.push(id)
        continue
      }
      if (!('fills' in node)) {
        summary.errors.push(`"${node.name}" (${field}) cannot hold an image fill — skipped.`)
        continue
      }
      // Crop alignment: the per-node Align toggle wins; otherwise a
      // fullpageleft/right slot implies its side; else centered.
      const tag = readTag(node)
      const align = tag?.options?.align ?? categoryAlignOf(field) ?? 'center'
      // An unassigned slot gets flagged magenta so empty placeholders are
      // obvious after an apply.
      if (hash) {
        targets.push({ node: node as SceneNode, hash, align })
        if (tag?.options?.spread) {
          const list = spreadNodes.get(field) ?? []
          list.push(node as SceneNode)
          spreadNodes.set(field, list)
        }
      } else {
        empties.push(node as SceneNode)
      }
      resolvedAny = true
    }
    if (!hash) unassigned++
    if (resolvedAny && hash) summary.fieldsApplied++
  }

  figma.commitUndo()

  // Coupled spreads get union-fit transforms: the image is cover-fit to the
  // combined bounding box of the field's containers, each half showing its
  // exact portion — perfectly continuous across artboards.
  const unionTransform = new Map<string, Transform>()
  for (const [field, nodes] of spreadNodes) {
    if (nodes.length < 2) continue
    const hash = assignments[field]
    const size = hash ? await imageSize(hash) : null
    if (!size) continue
    const map = unionCropTransforms(nodes, size.width, size.height)
    if (map) for (const [id, t] of map) unionTransform.set(id, t)
  }

  const total = targets.length + empties.length
  let done = 0
  let emptied = 0
  onProgress(0, total)

  // A hash the library remembers but Figma no longer stores (GC'd before the
  // vault existed) would paint a broken fill — skip it with a clear error.
  const hashAlive = new Map<string, boolean>()
  const isAlive = (h: string): boolean => {
    let alive = hashAlive.get(h)
    if (alive === undefined) {
      alive = !!figma.getImageByHash(h)
      hashAlive.set(h, alive)
    }
    return alive
  }
  const reportedDead = new Set<string>()

  for (const { node, hash, align } of targets) {
    if (!isAlive(hash)) {
      if (!reportedDead.has(hash)) {
        reportedDead.add(hash)
        summary.errors.push(
          `"${node.name}": its photo is missing from Figma's storage — re-upload it in the Photos tab (same file re-links automatically).`
        )
      }
      done++
      continue
    }
    try {
      const size = await imageSize(hash)
      const nodeW = 'width' in node ? node.width : 0
      const nodeH = 'height' in node ? node.height : 0
      const union = unionTransform.get(node.id)
      const paint: ImagePaint = union
        ? { type: 'IMAGE', imageHash: hash, scaleMode: 'CROP', imageTransform: union }
        : size && size.width > 0 && size.height > 0 && nodeW > 0 && nodeH > 0
          ? {
              type: 'IMAGE',
              imageHash: hash,
              scaleMode: 'CROP',
              imageTransform: coverCropTransform(nodeW, nodeH, size.width, size.height, align),
            }
          : // No dimensions available — FILL still renders cover-style, just
            // without being pre-set to crop mode for manual adjustment.
            { type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }
      ;(node as MinimalFillsMixin).fills = [paint]
      summary.updated++
    } catch (err) {
      summary.errors.push(
        `Could not fill "${node.name}": ${err instanceof Error ? err.message : err}`
      )
    }
    done++
    if (done % 10 === 0 || done === total) {
      onProgress(done, total)
      await new Promise((r) => setTimeout(r, 0))
      if (shouldCancel() && done < total) {
        summary.errors.push(`Cancelled — ${done} of ${total} layers filled.`)
        break
      }
    }
  }

  const cancelled = shouldCancel()
  for (const node of empties) {
    if (cancelled) break
    try {
      ;(node as MinimalFillsMixin).fills = [MAGENTA]
      emptied++
    } catch {
      // non-fillable already filtered out; ignore anything else
    }
    done++
    if (done % 10 === 0 || done === total) {
      onProgress(done, total)
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  if (dead.length) {
    patchIndex(dead, null, null)
    summary.deadRemoved = dead.length
  }
  return { summary, unassigned, emptied }
}

/**
 * Re-distribute the existing image across a coupled spread's containers so
 * the halves overlap perfectly: cover-fit to the union of their bounding
 * boxes, each container getting the crop window for its portion. The image
 * comes from the field's assignment, or whatever fill is already on a half
 * (the left/first one found wins). Pure re-crop — nothing is reassigned.
 */
export async function alignSpreadFills(
  fields: string[]
): Promise<{ aligned: number; issues: string[] }> {
  const idx = loadIndex() ?? rebuildIndex()
  const { assignments } = loadPhotos()
  let aligned = 0
  const issues: string[] = []
  let committed = false

  for (const field of fields) {
    const entry = idx.fields[field]
    if (!entry || entry.kind !== 'image') {
      issues.push(`${field}: not an image tag.`)
      continue
    }
    const nodes: SceneNode[] = []
    for (const id of entry.ids) {
      const node = await figma.getNodeByIdAsync(id)
      if (node && !node.removed && 'fills' in node) nodes.push(node as SceneNode)
    }
    if (nodes.length < 2) {
      issues.push(`${field}: needs two coupled containers.`)
      continue
    }
    // Prefer the assignment; else adopt the fill already on a half — sorted
    // left-to-right so "based on the left tag fill" holds.
    nodes.sort((a, b) => {
      const ba = 'absoluteBoundingBox' in a ? a.absoluteBoundingBox : null
      const bb = 'absoluteBoundingBox' in b ? b.absoluteBoundingBox : null
      return (ba?.x ?? 0) - (bb?.x ?? 0)
    })
    let hash = assignments[field] ?? null
    if (!hash) for (const n of nodes) {
      const h = fillHashOf(n)
      if (h) {
        hash = h
        break
      }
    }
    if (!hash) {
      issues.push(`${field}: no image on either container.`)
      continue
    }
    const image = figma.getImageByHash(hash)
    if (!image) {
      issues.push(`${field}: image missing from Figma's store.`)
      continue
    }
    const size = await image.getSizeAsync()
    const map = unionCropTransforms(nodes, size.width, size.height)
    if (!map) {
      issues.push(`${field}: could not compute spread geometry.`)
      continue
    }
    if (!committed) {
      figma.commitUndo()
      committed = true
    }
    for (const node of nodes) {
      const t = map.get(node.id)
      if (!t) continue
      try {
        ;(node as MinimalFillsMixin).fills = [
          { type: 'IMAGE', imageHash: hash, scaleMode: 'CROP', imageTransform: t },
        ]
        aligned++
      } catch (err) {
        issues.push(`${node.name}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  return { aligned, issues }
}

export interface CompactResult {
  renumbered: number // slots whose number changed
}

/**
 * Renumber numbered image slots by layer order: within each category the
 * bottom-most layer becomes 01, increasing up the layers panel, with no gaps.
 * No tags are removed — unassigned slots keep their place in the sequence.
 * Named slots (cover/hero/agent), the lock marker, and text tags are left
 * alone. Photo assignments and each tag's options (align/spread) follow the
 * rename. Pass dry=true to only compute the counts without mutating.
 */
export async function compactImageSlots(dry = false): Promise<CompactResult> {
  // scanTagged() returns nodes in findAll DFS order, which follows Figma's
  // back-to-front child order — the bottom-most layer first. So iterating in
  // this order and numbering as we go makes the bottom layer 01 and increases
  // up the layers panel, exactly matching the panel top-to-bottom view.
  const tagged = scanTagged()
  const { assignments, library } = loadPhotos()

  const bySeries = new Map<string, string[]>() // cat -> fields in layer order
  const seen = new Set<string>()
  for (const { tag } of tagged) {
    if (tag.kind !== 'image') continue
    const m = CAT_SLOT_RE.exec(tag.field) // matches photo.<cat>.<n> incl. slot/fullpage
    if (!m || seen.has(tag.field)) continue
    seen.add(tag.field)
    const list = bySeries.get(m[1]) ?? []
    list.push(tag.field)
    bySeries.set(m[1], list)
  }

  const rename = new Map<string, string>() // old field -> new field
  let renumbered = 0
  for (const [cat, fields] of bySeries) {
    // fields are already in bottom-to-top layer order (encounter order).
    fields.forEach((field, i) => {
      const newField = cat === 'slot' ? slotField(i + 1) : catSlotField(cat, i + 1)
      if (newField !== field) {
        rename.set(field, newField)
        renumbered++
      }
    })
  }

  if (dry || !renumbered) {
    if (!dry) await rebuildIndexFull()
    return { renumbered }
  }

  // Rewrite tags on the base tagged nodes (instances re-derive on rebuild).
  for (const { node, tag } of tagged) {
    if (tag.kind !== 'image') continue
    const nf = rename.get(tag.field)
    if (nf) writeTag(node, { ...tag, field: nf })
  }

  // Carry photo assignments across the rename.
  const nextAssignments: PhotoAssignments = {}
  for (const [field, hash] of Object.entries(assignments)) {
    nextAssignments[rename.get(field) ?? field] = hash
  }
  savePhotos(nextAssignments, library)

  await rebuildIndexFull()
  return { renumbered }
}
