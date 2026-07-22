import { CAT_SLOT_RE, catSlotField } from '../shared/categories'
import {
  CropAlign,
  LOCKED_FIELD,
  MainToUi,
  SelNode,
  Tag,
  TagKind,
  TEMPLATE_FIELD,
  UiToMain,
  templateFields,
} from '../shared/types'
import { autoNumberSlots, renameToTags, scanNames } from './bulk'
import { applyText, dryRun, loadContent, saveContent } from './content'
import {
  alignSpreadFills,
  applyPhotos,
  compactImageSlots,
  createImageRef,
  loadPhotos,
  maintainImageVault,
  savePhotos,
} from './photos'
import {
  clearAllTags,
  clearTag,
  countTaggedNodes,
  indexSummary,
  loadIndex,
  patchIndex,
  readTag,
  rebuildIndexFull,
  scanTagged,
  writeTag,
} from './tags'
import { applyRetag, collectPageImageHashes, planRetagByImage } from './retag'
import { validate } from './validate'

let cancelApply = false
let pendingRetag: ReturnType<typeof planRetagByImage>['changes'] = []

figma.skipInvisibleInstanceChildren = true
figma.showUI(__html__, { width: 380, height: 620, themeColors: true })

function send(msg: MainToUi): void {
  figma.ui.postMessage(msg)
}

function toast(message: string, error = false): void {
  send({ type: 'toast', message, error })
}

const MAX_SELECTION_DETAIL = 20

function postSelection(): void {
  const sel = figma.currentPage.selection
  const nodes: SelNode[] = sel.slice(0, MAX_SELECTION_DETAIL).map((n) => ({
    id: n.id,
    name: n.name,
    nodeType: n.type,
    tag: readTag(n),
    chars: n.type === 'TEXT' && n.characters.length <= 2000 ? n.characters : undefined,
  }))
  send({ type: 'selection', nodes, total: sel.length })
}

function postIndex(): void {
  const idx = loadIndex()
  send({
    type: 'index',
    entries: indexSummary(idx),
    page: idx?.page ?? '',
    taggedNodes: countTaggedNodes(idx),
    templateCounts: idx?.templateCounts ?? {},
  })
}

figma.on('selectionchange', postSelection)

async function withBusy(label: string, fn: () => void | Promise<void>): Promise<void> {
  send({ type: 'busy', busy: true, label })
  // Let the busy state paint before a long synchronous scan blocks the thread.
  await new Promise((r) => setTimeout(r, 16))
  try {
    await fn()
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err), true)
  } finally {
    send({ type: 'busy', busy: false })
  }
}

function assignTag(field: string, kind: TagKind): void {
  const sel = figma.currentPage.selection
  if (!sel.length) {
    toast('Select at least one layer first.', true)
    return
  }
  const trimmed = field.trim()
  if (!trimmed) {
    toast('Field key is empty.', true)
    return
  }

  // photo.<category>.auto -> the next free number(s) in that category. With
  // several containers selected, each gets its OWN consecutive number (a
  // distinct slot), in reading order — not one shared tag.
  const auto = /^photo\.([a-z][a-z0-9]*)\.auto$/.exec(trimmed)
  if (auto && kind === 'image') {
    const cat = auto[1]
    const idx = loadIndex()
    let max = 0
    for (const key of Object.keys(idx?.fields ?? {})) {
      const m = CAT_SLOT_RE.exec(key)
      if (m && m[1] === cat) max = Math.max(max, parseInt(m[2], 10))
    }
    const ordered = readingOrder(sel)
    ordered.forEach((node, i) => {
      const f = catSlotField(cat, max + 1 + i)
      const tag: Tag = { v: 1, kind: 'image', field: f }
      writeTag(node, tag)
      patchIndex([node.id], f, tag)
    })
    postSelection()
    postIndex()
    toast(
      ordered.length === 1
        ? `Tagged "${ordered[0].name}" as ${catSlotField(cat, max + 1)}`
        : `Tagged ${ordered.length} containers as ${catSlotField(cat, max + 1)}–${catSlotField(cat, max + ordered.length)}`
    )
    return
  }

  // Locked is a shared marker across many nodes; an explicit image field on
  // multiple nodes is a linked spread (one photo across the halves).
  const spread = kind === 'image' && sel.length > 1 && trimmed !== LOCKED_FIELD
  const tag: Tag = { v: 1, kind, field: trimmed, options: spread ? { spread: true } : undefined }
  for (const node of sel) writeTag(node, tag)
  patchIndex(sel.map((n) => n.id), trimmed, tag)
  postSelection()
  postIndex()
  toast(
    sel.length === 1
      ? `Tagged "${sel[0].name}" as ${trimmed}`
      : `Tagged ${sel.length} layers as ${trimmed}${spread ? ' (linked spread)' : ''}`
  )
}

/** Selection sorted top-to-bottom, then left-to-right, by canvas position. */
function readingOrder(nodes: readonly SceneNode[]): SceneNode[] {
  const pos = (n: SceneNode) => {
    const bb = 'absoluteBoundingBox' in n ? n.absoluteBoundingBox : null
    return bb ? { x: bb.x, y: bb.y } : { x: 'x' in n ? n.x : 0, y: 'y' in n ? n.y : 0 }
  }
  return [...nodes].sort((a, b) => {
    const pa = pos(a)
    const pb = pos(b)
    return pa.y - pb.y || pa.x - pb.x
  })
}

function removeTag(): void {
  const sel = figma.currentPage.selection
  if (!sel.length) {
    toast('Select the tagged layer(s) first.', true)
    return
  }
  let removed = 0
  for (const node of sel) {
    if (readTag(node)) {
      clearTag(node)
      removed++
    }
  }
  patchIndex(sel.map((n) => n.id), null, null)
  postSelection()
  postIndex()
  toast(removed ? `Removed ${removed} tag${removed === 1 ? '' : 's'}.` : 'Selection had no tags.')
}

/**
 * Tag the single selected text node as a template (partial tagging). Empty
 * template with no tokens clears the template back to untagged.
 */
async function setTemplate(template: string): Promise<void> {
  const sel = figma.currentPage.selection.filter((n) => n.type === 'TEXT')
  if (sel.length !== 1) {
    toast('Select exactly one text layer first.', true)
    return
  }
  const node = sel[0]
  const trimmed = template.trim()
  if (!trimmed || templateFields(trimmed).length === 0) {
    // No tokens — nothing to template. Clear any existing tag.
    clearTag(node)
    toast('No {{field}} tokens — template cleared.')
  } else {
    writeTag(node, { v: 1, kind: 'text', field: TEMPLATE_FIELD, options: { template } })
    toast(`Tagged template: ${templateFields(template).join(', ')}.`)
  }
  await rebuildIndexFull()
  postSelection()
  postIndex()
}

/** Set the crop alignment on every selected image-tagged container. */
function setAlign(align: CropAlign): void {
  const sel = figma.currentPage.selection
  let changed = 0
  for (const node of sel) {
    const tag = readTag(node)
    if (!tag || tag.kind !== 'image') continue
    const options = { ...tag.options }
    if (align === 'center') delete options.align
    else options.align = align
    writeTag(node, { ...tag, options: Object.keys(options).length ? options : undefined })
    changed++
  }
  if (!changed) {
    toast('Select an image-tagged container first.', true)
    return
  }
  postSelection()
  toast(`Set ${changed} container${changed === 1 ? '' : 's'} to ${align} align.`)
}

/**
 * Couple exactly two selected image containers into one spread: both share a
 * single field (so they take the same photo) and are pinned to opposite
 * borders (left container → left, right container → right) so the photo reads
 * as one continuous image across the two touching artboards.
 */
function coupleSpread(): void {
  const sel = figma.currentPage.selection.filter((n) => 'fills' in n)
  if (sel.length !== 2) {
    toast('Select exactly two image containers to couple.', true)
    return
  }
  const [left, right] = readingOrder(sel as SceneNode[])
  // Reuse an existing image field if either half already has one, else mint a
  // fresh generic slot so the pair shares a photo.
  const existing = [readTag(left), readTag(right)].find((t) => t && t.kind === 'image')
  let field = existing?.field
  if (!field) {
    const idx = loadIndex()
    let max = 0
    for (const key of Object.keys(idx?.fields ?? {})) {
      const m = /^photo\.slot\.(\d+)$/.exec(key)
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
    field = `photo.slot.${String(max + 1).padStart(3, '0')}`
  }
  writeTag(left, { v: 1, kind: 'image', field, options: { spread: true, align: 'left' } })
  writeTag(right, { v: 1, kind: 'image', field, options: { spread: true, align: 'right' } })
  patchIndex([left.id, right.id], field, { v: 1, kind: 'image', field })
  postSelection()
  postIndex()
  toast(`Coupled as spread on ${field} (left ◄ / ► right).`)
}

async function selectField(field: string): Promise<void> {
  const idx = loadIndex()
  const entry = idx?.fields[field]
  if (!entry || !entry.ids.length) {
    toast(`No indexed nodes for ${field}. Try Rebuild index.`, true)
    return
  }
  const nodes: SceneNode[] = []
  const dead: string[] = []
  for (const id of entry.ids) {
    const node = await figma.getNodeByIdAsync(id)
    if (node && !node.removed && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      nodes.push(node as SceneNode)
    } else {
      dead.push(id)
    }
  }
  if (dead.length) {
    // Self-heal: drop node ids that no longer exist (deleted/moved layers).
    patchIndex(dead, null, null)
    postIndex()
  }
  if (!nodes.length) {
    toast(`All nodes for ${field} are gone — index healed.`, true)
    return
  }
  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  toast(`Selected ${nodes.length} node${nodes.length === 1 ? '' : 's'} for ${field}.`)
}

figma.ui.onmessage = async (msg: UiToMain) => {
  switch (msg.type) {
    case 'init': {
      postSelection()
      postIndex()
      send({ type: 'content', values: loadContent() })
      const photos = loadPhotos()
      send({ type: 'photos', assignments: photos.assignments, library: photos.library })
      // Pin existing library images against Figma's unused-image GC.
      void maintainImageVault()
      break
    }
    case 'upload-image':
      try {
        const ref = await createImageRef(msg.name, msg.bytes)
        send({ type: 'image-created', id: msg.id, ref })
      } catch (err) {
        send({
          type: 'image-error',
          id: msg.id,
          message: `${msg.name}: ${err instanceof Error ? err.message : err}`,
        })
      }
      break
    case 'save-photos':
      savePhotos(msg.assignments, msg.library)
      void maintainImageVault()
      break
    case 'apply-photos':
      cancelApply = false
      await withBusy('Applying photos…', async () => {
        const { summary, unassigned, emptied } = await applyPhotos(
          msg.fields,
          (done, total) => send({ type: 'apply-progress', done, total }),
          () => cancelApply
        )
        postIndex()
        send({ type: 'apply-result', summary })
        toast(
          `Filled ${summary.updated} layer${summary.updated === 1 ? '' : 's'} across ${summary.fieldsApplied} slot${summary.fieldsApplied === 1 ? '' : 's'}.` +
            (emptied ? ` ${emptied} empty slot(s) flagged magenta.` : '') +
            (summary.errors.length ? ` ${summary.errors.length} issue(s).` : '')
        )
        figma.notify(`Dezzy: filled ${summary.updated} photo layers`)
      })
      break
    case 'save-content':
      saveContent(msg.values)
      break
    case 'dry-run':
      send({ type: 'dry-run-result', report: dryRun() })
      break
    case 'apply-all':
      cancelApply = false
      await withBusy('Applying text + photos…', async () => {
        const text = await applyText(
          null,
          (done, total) => send({ type: 'apply-progress', done, total }),
          () => cancelApply
        )
        let photosLine = ''
        let combined = text
        if (!cancelApply) {
          const { summary: photos, emptied } = await applyPhotos(
            null,
            (done, total) => send({ type: 'apply-progress', done, total }),
            () => cancelApply
          )
          photosLine =
            ` ${photos.updated} photo layer${photos.updated === 1 ? '' : 's'} filled` +
            (emptied ? ` (${emptied} empty slot(s) flagged magenta)` : '') +
            '.'
          combined = {
            updated: text.updated + photos.updated,
            fieldsApplied: text.fieldsApplied + photos.fieldsApplied,
            deadRemoved: text.deadRemoved + photos.deadRemoved,
            errors: [...text.errors, ...photos.errors],
          }
        }
        postIndex()
        send({ type: 'apply-result', summary: combined })
        send({ type: 'dry-run-result', report: dryRun() })
        toast(
          `${text.updated} text layer${text.updated === 1 ? '' : 's'} updated.` +
            photosLine +
            (combined.errors.length ? ` ${combined.errors.length} issue(s).` : '')
        )
        figma.notify(`Dezzy: updated ${combined.updated} layers`)
      })
      break
    case 'cancel-apply':
      cancelApply = true
      break
    case 'fetch-image': {
      // Thumbnail hydration: the UI regenerates previews for persisted
      // library entries from Figma's stored bytes. Empty bytes = not found.
      const image = figma.getImageByHash(msg.hash)
      let bytes = new Uint8Array(0)
      if (image) {
        try {
          bytes = (await image.getBytesAsync()) as Uint8Array<ArrayBuffer>
        } catch {
          // keep empty — UI shows the placeholder
        }
      }
      send({ type: 'image-bytes', hash: msg.hash, bytes })
      break
    }
    case 'export-images':
      cancelApply = false
      await withBusy('Exporting images…', async () => {
        // Every per-node tag (field, kind, options) travels with the save
        // state so the layout's tagging can be restored into a fresh copy.
        // Keyed by node id — Figma preserves ids across a file duplicate.
        const tagged = scanTagged()
        send({
          type: 'export-tags',
          tags: JSON.stringify(tagged.map(({ node, tag }) => ({ id: node.id, tag }))),
        })
        // Page images first, then library photos not yet placed — so a
        // restored save state can always re-link every assignment.
        const hashes = collectPageImageHashes()
        const seen = new Set(hashes)
        const { library } = loadPhotos()
        for (const ref of library) {
          if (!seen.has(ref.hash)) {
            seen.add(ref.hash)
            hashes.push(ref.hash)
          }
        }
        const nameByHash = new Map(library.map((r) => [r.hash, r.name] as const))
        let done = 0
        let exported = 0
        let unnamed = 0
        for (const hash of hashes) {
          if (cancelApply) break
          done++
          const image = figma.getImageByHash(hash)
          if (!image) continue
          let bytes: Uint8Array
          try {
            bytes = await image.getBytesAsync()
          } catch {
            continue
          }
          const name = nameByHash.get(hash) ?? `image-${String(++unnamed).padStart(2, '0')}`
          exported++
          send({ type: 'export-image', name, bytes, done, total: hashes.length })
          send({ type: 'apply-progress', done, total: hashes.length })
        }
        send({ type: 'export-images-done', count: exported, cancelled: cancelApply })
      })
      break
    case 'restore-tags':
      await withBusy('Restoring tags…', async () => {
        let restored = 0
        let missing = 0
        for (const { id, tag } of msg.tags) {
          const node = await figma.getNodeByIdAsync(id)
          if (!node || node.removed) {
            missing++
            continue
          }
          writeTag(node, tag)
          restored++
        }
        await rebuildIndexFull()
        postIndex()
        toast(
          `Restored ${restored} tag${restored === 1 ? '' : 's'}` +
            (missing ? `, ${missing} layer${missing === 1 ? '' : 's'} not found in this file.` : '.')
        )
      })
      break
    case 'retag-preview':
      await withBusy('Classifying photos…', () => {
        const { summary, changes } = planRetagByImage()
        pendingRetag = changes
        send({ type: 'retag-plan', summary })
      })
      break
    case 'retag-apply':
      if (!pendingRetag.length) {
        toast('Nothing to retag.', true)
        break
      }
      await withBusy('Retagging containers…', async () => {
        const applied = await applyRetag(pendingRetag)
        pendingRetag = []
        postIndex()
        toast(`Retagged ${applied} container${applied === 1 ? '' : 's'} from their images.`)
        figma.notify(`Dezzy: retagged ${applied} containers`)
      })
      break
    case 'validate':
      await withBusy('Checking magazine…', async () => {
        const report = await validate()
        postIndex()
        send({ type: 'validate-result', report })
        toast(
          `Checked ${report.totalTagged} tagged layers.` +
            (report.deadHealed ? ` Healed ${report.deadHealed} dead tag(s).` : '')
        )
      })
      break
    case 'apply-text':
      cancelApply = false
      await withBusy('Applying text…', async () => {
        const summary = await applyText(
          msg.fields,
          (done, total) => send({ type: 'apply-progress', done, total }),
          () => cancelApply
        )
        postIndex()
        send({ type: 'apply-result', summary })
        send({ type: 'dry-run-result', report: dryRun() })
        toast(
          `Updated ${summary.updated} text layer${summary.updated === 1 ? '' : 's'} across ${summary.fieldsApplied} field${summary.fieldsApplied === 1 ? '' : 's'}.` +
            (summary.errors.length ? ` ${summary.errors.length} issue(s).` : ''),
          false
        )
        figma.notify(`Dezzy: updated ${summary.updated} text layers`)
      })
      break
    case 'assign-tag':
      assignTag(msg.field, msg.kind)
      break
    case 'remove-tag':
      removeTag()
      break
    case 'set-align':
      setAlign(msg.align)
      break
    case 'couple-spread':
      coupleSpread()
      break
    case 'set-template':
      await withBusy('Tagging template…', () => setTemplate(msg.template))
      break
    case 'align-spread': {
      // Fields come from the selection: any image tag on a selected node.
      const fields = [
        ...new Set(
          figma.currentPage.selection
            .map((n) => readTag(n))
            .filter((t): t is Tag => !!t && t.kind === 'image')
            .map((t) => t.field)
        ),
      ]
      if (!fields.length) {
        toast('Select a coupled spread container first.', true)
        break
      }
      await withBusy('Aligning spread fills…', async () => {
        const { aligned, issues } = await alignSpreadFills(fields)
        postSelection()
        toast(
          (aligned
            ? `Aligned ${aligned} container${aligned === 1 ? '' : 's'} across ${fields.length} spread${fields.length === 1 ? '' : 's'}.`
            : 'Nothing aligned.') + (issues.length ? ` ${issues[0]}` : ''),
          !aligned
        )
      })
      break
    }
    case 'scan-names':
      await withBusy('Scanning layer names…', async () => {
        const res = scanNames()
        await rebuildIndexFull()
        postSelection()
        postIndex()
        toast(
          `Name scan: ${res.tagged} tagged` +
            (res.categorized ? ` (${res.categorized} category slots)` : '') +
            `, ${res.skipped} already up to date.`
        )
      })
      break
    case 'auto-number':
      await withBusy('Numbering photo slots…', async () => {
        const res = autoNumberSlots(msg.renumber)
        if (!res.pages) {
          toast('No page frames found (looking for "Insert Page N" / "Cover_…").', true)
          return
        }
        await rebuildIndexFull()
        postSelection()
        postIndex()
        toast(
          `${res.slots} photo slots across ${res.pages} pages` +
            (res.spreadPairs ? `, ${res.spreadPairs} spreads` : '') +
            (res.skipped ? `, ${res.skipped} skipped` : '') +
            '.'
        )
      })
      break
    case 'rename-to-tags':
      await withBusy('Renaming tagged layers…', () => {
        const res = renameToTags()
        postSelection()
        toast(
          `Renamed ${res.renamed} layer${res.renamed === 1 ? '' : 's'} to their tags` +
            (res.skipped ? `, ${res.skipped} skipped (inside instances / read-only).` : '.')
        )
        figma.notify(`Dezzy: renamed ${res.renamed} layers`)
      })
      break
    case 'clear-tags':
      await withBusy('Clearing tags…', () => {
        const removed = clearAllTags()
        postSelection()
        postIndex()
        toast(`Cleared all tags (${removed} layer${removed === 1 ? '' : 's'}).`)
        figma.notify(`Dezzy: cleared ${removed} tags`)
      })
      break
    case 'rebuild-index':
      await withBusy('Rebuilding index…', async () => {
        // Preview the renumber. If slot numbers would change, confirm first
        // (rewriting tags isn't undoable); otherwise just rebuild.
        const plan = await compactImageSlots(true)
        if (!plan.renumbered) {
          const idx = await rebuildIndexFull()
          postIndex()
          toast(`Index rebuilt: ${countTaggedNodes(idx)} tagged nodes on "${idx.page}".`)
        } else {
          send({ type: 'compact-plan', renumbered: plan.renumbered })
        }
      })
      break
    case 'rebuild-index-apply':
      await withBusy('Renumbering image slots…', async () => {
        const res = await compactImageSlots()
        postIndex()
        toast(`Rebuilt: renumbered ${res.renumbered} slot${res.renumbered === 1 ? '' : 's'} by layer order.`)
      })
      break
    case 'select-field':
      await withBusy('Selecting…', () => selectField(msg.field))
      break
  }
}
