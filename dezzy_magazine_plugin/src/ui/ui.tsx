import { render, type ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { FieldDef, SCHEMA, SCHEMA_GROUPS, fieldDef } from '../shared/schema'
import {
  CAT_SLOT_RE,
  PHOTO_CATEGORIES_DISPLAY,
  categoryLabel,
  PREVIEW_ORDER,
  fullPageRank,
  isAllImagePoolCat,
  isCategorySlot,
  isFullPageCat,
  looksLikeAgentPhoto,
  matchCategory,
  matchesAgentName,
  poolOf,
} from '../shared/categories'
import { LOCKED_FIELD, SLOT_RE, TEMPLATE_FIELD, TEXT_LOCKED_FIELD, templateFields } from '../shared/types'
import type {
  ApplySummary,
  DryRunReport,
  IndexEntry,
  MainToUi,
  PhotoAssignments,
  PhotoRef,
  SelNode,
  Tag,
  TagKind,
  UiToMain,
  ValidationReport,
} from '../shared/types'
import { byFilename, makeThumb, processFile } from './images'
import {
  buildCsv,
  buildZip,
  downloadBlob,
  ensureExt,
  isImagePath,
  mimeFor,
  readZip,
  recordFromCsv,
} from './savestate'
import './styles.css'

function post(msg: UiToMain): void {
  parent.postMessage({ pluginMessage: msg }, '*')
}

const CUSTOM = '__custom__'
const TABS = ['Tag', 'Content', 'Photos', 'Apply', 'Bulk'] as const
type Tab = (typeof TABS)[number]

interface PhotoItem {
  id: number
  name: string
  status: 'processing' | 'ready' | 'error'
  hash?: string
  width?: number
  height?: number
  thumb?: string
  error?: string
}

function App() {
  const [tab, setTab] = useState<Tab>('Tag')
  const [selection, setSelection] = useState<SelNode[]>([])
  const [selTotal, setSelTotal] = useState(0)
  const [index, setIndex] = useState<IndexEntry[]>([])
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({})
  const [taggedNodes, setTaggedNodes] = useState(0)
  const [indexPage, setIndexPage] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [report, setReport] = useState<DryRunReport | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [lastApply, setLastApply] = useState<ApplySummary | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const [library, setLibrary] = useState<PhotoItem[]>([])
  const [assignments, setAssignments] = useState<PhotoAssignments>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)
  const toastTimer = useRef<number>()
  const saveTimer = useRef<number>()
  const photoSaveTimer = useRef<number>()
  const photosLoaded = useRef(false)
  const exportEntries = useRef<Record<string, Uint8Array>>({})
  // filename -> Figma image hash, for restoring assignments after an import.
  const hashByName = useRef(new Map<string, string>())
  const nextPhotoId = useRef(1)
  const pendingUploads = useRef(new Map<number, () => void>())
  const pendingThumbs = useRef(new Map<string, (bytes: Uint8Array) => void>())
  const hydratingThumbs = useRef(false)
  // Uploads are serialized: one image's bytes cross to the sandbox at a time,
  // so peak memory stays at ~one photo no matter how many were dropped.
  const uploadChain = useRef<Promise<void>>(Promise.resolve())

  function showToast(message: string, error = false): void {
    setToast({ message, error })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    window.onmessage = (e: MessageEvent) => {
      const msg = e.data?.pluginMessage as MainToUi | undefined
      if (!msg) return
      switch (msg.type) {
        case 'selection':
          setSelection(msg.nodes)
          setSelTotal(msg.total)
          break
        case 'index':
          setIndex(msg.entries)
          setTemplateCounts(msg.templateCounts)
          setTaggedNodes(msg.taggedNodes)
          setIndexPage(msg.page)
          break
        case 'content':
          setValues(msg.values)
          break
        case 'photos':
          setAssignments(msg.assignments)
          for (const ref of msg.library) hashByName.current.set(ref.name, ref.hash)
          setLibrary(
            msg.library.map((ref) => ({
              id: nextPhotoId.current++,
              name: ref.name,
              hash: ref.hash,
              width: ref.width,
              height: ref.height,
              status: 'ready' as const,
            }))
          )
          photosLoaded.current = true
          break
        case 'image-created':
          hashByName.current.set(msg.ref.name, msg.ref.hash)
          setLibrary((prev) => {
            const duplicate = prev.find((it) => it.id !== msg.id && it.hash === msg.ref.hash)
            if (duplicate) {
              // Same pixels already in the library — drop the new entry, but
              // heal the survivor: re-uploading a file whose bytes Figma had
              // GC'd clears its "missing" error (createImage restored it),
              // and it inherits the fresh thumbnail if it lacks one.
              const incoming = prev.find((it) => it.id === msg.id)
              return prev
                .map((it) =>
                  it.id === duplicate.id
                    ? {
                        ...it,
                        status: 'ready' as const,
                        error: undefined,
                        thumb: it.thumb ?? incoming?.thumb,
                      }
                    : it
                )
                .filter((it) => it.id !== msg.id)
            }
            return prev.map((it) =>
              it.id === msg.id
                ? {
                    ...it,
                    hash: msg.ref.hash,
                    width: msg.ref.width,
                    height: msg.ref.height,
                    status: 'ready' as const,
                  }
                : it
            )
          })
          pendingUploads.current.get(msg.id)?.()
          pendingUploads.current.delete(msg.id)
          break
        case 'image-bytes':
          pendingThumbs.current.get(msg.hash)?.(msg.bytes)
          pendingThumbs.current.delete(msg.hash)
          break
        case 'image-error':
          setLibrary((prev) =>
            prev.map((it) =>
              it.id === msg.id ? { ...it, status: 'error' as const, error: msg.message } : it
            )
          )
          pendingUploads.current.get(msg.id)?.()
          pendingUploads.current.delete(msg.id)
          break
        case 'dry-run-result':
          setReport(msg.report)
          break
        case 'validate-result':
          setValidation(msg.report)
          break
        case 'compact-plan': {
          setConfirmDialog({
            title: 'Rebuild & renumber slots',
            message:
              `Rebuild will renumber ${msg.renumbered} image slot${msg.renumbered === 1 ? '' : 's'} by layer order — ` +
              `bottom-most layer becomes 01, increasing upward, with no gaps. No tags are removed; ` +
              `photos and alignment follow the renumbering (not undoable). Proceed?`,
            confirmLabel: 'Rebuild',
            onConfirm: () => post({ type: 'rebuild-index-apply' }),
          })
          break
        }
        case 'retag-plan': {
          const s = msg.summary
          if (s.changeCount === 0) {
            setToast({
              message:
                s.totalWithImages === 0
                  ? 'No image containers found to classify.'
                  : `All ${s.totalWithImages} filled containers already match their images.`,
              error: false,
            })
            window.clearTimeout(toastTimer.current)
            toastTimer.current = window.setTimeout(() => setToast(null), 3500)
            break
          }
          const breakdown = s.byCategory
            .map((c) => `${categoryLabel(c.category)} ×${c.count}`)
            .join(', ')
          setConfirmDialog({
            title: 'Retag containers from images',
            message:
              `Re-tag ${s.changeCount} container${s.changeCount === 1 ? '' : 's'} to match the photo currently in each: ${breakdown}.` +
              (s.unmatchedImages
                ? ` ${s.unmatchedImages} container${s.unmatchedImages === 1 ? '' : 's'} hold an image the library can't identify and will be left as-is.`
                : '') +
              (s.unchanged ? ` ${s.unchanged} already match.` : ''),
            confirmLabel: 'Retag',
            onConfirm: () => post({ type: 'retag-apply' }),
          })
          break
        }
        case 'apply-progress':
          setProgress(msg.total ? { done: msg.done, total: msg.total } : null)
          break
        case 'apply-result':
          setLastApply(msg.summary)
          setProgress(null)
          break
        case 'export-tags':
          exportEntries.current['tags.json'] = new TextEncoder().encode(msg.tags)
          break
        case 'export-image': {
          let name = ensureExt(msg.name, msg.bytes)
          let final = name
          for (let i = 2; exportEntries.current[`images/${final}`]; i++) {
            const dot = name.lastIndexOf('.')
            final = `${name.slice(0, dot)}-${i}${name.slice(dot)}`
          }
          exportEntries.current[`images/${final}`] = msg.bytes
          setProgress({ done: msg.done, total: msg.total })
          break
        }
        case 'export-images-done': {
          setProgress(null)
          if (msg.cancelled) {
            exportEntries.current = {}
            showToast('Export cancelled.', true)
            break
          }
          const zip = buildZip(exportEntries.current)
          exportEntries.current = {}
          const stamp = new Date().toISOString().slice(0, 10)
          downloadBlob(`dezzy-save-${stamp}.zip`, zip, 'application/zip')
          showToast(`Save state downloaded (${msg.count} image${msg.count === 1 ? '' : 's'}).`)
          break
        }
        case 'busy':
          setBusy(msg.busy ? msg.label ?? 'Working…' : null)
          if (!msg.busy) setProgress(null)
          break
        case 'toast':
          setToast({ message: msg.message, error: !!msg.error })
          window.clearTimeout(toastTimer.current)
          toastTimer.current = window.setTimeout(() => setToast(null), 3500)
          break
      }
    }
    post({ type: 'init' })
  }, [])

  function updateValue(key: string, value: string): void {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => post({ type: 'save-content', values: next }), 400)
      return next
    })
  }

  // Thumbnail hydration: library entries restored from a previous session
  // have no preview (thumbs are session-only object URLs). Fetch each image's
  // bytes back from Figma one at a time and rebuild a 160px thumb.
  useEffect(() => {
    if (hydratingThumbs.current) return
    const needs = library.filter((it) => it.status === 'ready' && it.hash && !it.thumb)
    if (!needs.length) return
    hydratingThumbs.current = true
    ;(async () => {
      let missing = 0
      for (const item of needs) {
        const hash = item.hash!
        const bytes = await new Promise<Uint8Array>((resolve) => {
          pendingThumbs.current.set(hash, resolve)
          post({ type: 'fetch-image', hash })
        })
        if (!bytes.length) {
          // Figma no longer stores this image (GC'd before the vault existed).
          // Flag it so the user re-uploads; same file re-links automatically.
          missing++
          setLibrary((prev) =>
            prev.map((it) =>
              it.hash === hash && it.status === 'ready'
                ? {
                    ...it,
                    status: 'error' as const,
                    error: `${it.name}: missing from Figma's storage — re-upload it (assignments re-link automatically).`,
                  }
                : it
            )
          )
          continue
        }
        try {
          const thumb = await makeThumb(bytes)
          setLibrary((prev) =>
            prev.map((it) => (it.hash === hash && !it.thumb ? { ...it, thumb } : it))
          )
        } catch {
          // undecodable — leave the placeholder
        }
      }
      hydratingThumbs.current = false
      if (missing) {
        showToast(
          `${missing} photo${missing === 1 ? '' : 's'} missing from Figma's storage — re-upload them in the Photos tab.`,
          true
        )
      }
    })()
  }, [library])

  // Persist photo metadata + assignments (never bytes) after any change.
  useEffect(() => {
    if (!photosLoaded.current) return
    window.clearTimeout(photoSaveTimer.current)
    photoSaveTimer.current = window.setTimeout(() => flushPhotos(), 400)
  }, [library, assignments])

  function readyRefs(items: PhotoItem[]): PhotoRef[] {
    // Keep any item with a hash — including ones flagged "missing from
    // Figma's storage" — so their names/assignments survive the session and
    // they're re-flagged (or healed by re-upload) next time.
    return items
      .filter((it): it is PhotoItem & { hash: string; width: number; height: number } =>
        Boolean(it.hash && it.width && it.height)
      )
      .map((it) => ({ hash: it.hash, name: it.name, width: it.width, height: it.height }))
  }

  function flushPhotos(nextAssignments?: PhotoAssignments): void {
    window.clearTimeout(photoSaveTimer.current)
    post({
      type: 'save-photos',
      assignments: nextAssignments ?? assignments,
      library: readyRefs(library),
    })
  }

  function addFiles(files: File[]): void {
    for (const file of files) {
      const id = nextPhotoId.current++
      setLibrary((prev) => [...prev, { id, name: file.name, status: 'processing' }])
      uploadChain.current = uploadChain.current.then(async () => {
        try {
          const processed = await processFile(file)
          setLibrary((prev) =>
            prev.map((it) => (it.id === id ? { ...it, thumb: processed.thumb } : it))
          )
          await new Promise<void>((resolve) => {
            pendingUploads.current.set(id, resolve)
            post({ type: 'upload-image', id, name: file.name, bytes: processed.bytes })
          })
        } catch (err) {
          setLibrary((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : String(err),
                  }
                : it
            )
          )
        }
      })
    }
  }

  function assignPhoto(field: string, hash: string | null): void {
    setAssignments((prev) => {
      const next = { ...prev }
      if (hash) next[field] = hash
      else delete next[field]
      return next
    })
  }

  // Removing a photo drops its library entry, revokes its thumbnail URL, and
  // clears any slot assigned to it. Already-applied fills on the canvas are
  // untouched (Undo reverts those) — this only affects the upload library.
  function removePhoto(id: number): void {
    const item = library.find((it) => it.id === id)
    if (item?.thumb) URL.revokeObjectURL(item.thumb)
    setLibrary((prev) => prev.filter((it) => it.id !== id))
    if (item?.hash) {
      setAssignments((prev) => {
        const next = { ...prev }
        for (const field of Object.keys(next)) {
          if (next[field] === item.hash) delete next[field]
        }
        return next
      })
    }
  }

  function clearAllPhotos(): void {
    for (const it of library) if (it.thumb) URL.revokeObjectURL(it.thumb)
    setLibrary([])
    setAssignments({})
  }

  function requestRemovePhoto(id: number): void {
    const item = library.find((it) => it.id === id)
    const usedIn = item?.hash
      ? Object.keys(assignments).filter((f) => assignments[f] === item.hash).length
      : 0
    setConfirmDialog({
      title: 'Delete photo',
      message:
        `Remove "${item?.name ?? 'this photo'}" from the library?` +
        (usedIn ? ` It's assigned to ${usedIn} slot${usedIn === 1 ? '' : 's'}, which will be cleared.` : ''),
      confirmLabel: 'Delete',
      onConfirm: () => removePhoto(id),
    })
  }

  // ------------------------------------------------------------ Save state

  function buildContentCsv(): string {
    const keys: string[] = []
    const seen = new Set<string>()
    for (const f of SCHEMA) {
      if (f.kind === 'text' && f.group !== 'Locks') {
        keys.push(f.key)
        seen.add(f.key)
      }
    }
    for (const k of Object.keys(values)) if (!seen.has(k)) keys.push(k)
    return buildCsv([['field', 'value'], ...keys.map((k) => [k, values[k] ?? ''])])
  }

  function buildAssignmentsCsv(): string {
    const nameByHash = new Map<string, string>()
    for (const it of library) if (it.hash) nameByHash.set(it.hash, it.name)
    const rows: string[][] = [['field', 'filename']]
    for (const field of Object.keys(assignments).sort()) {
      const name = nameByHash.get(assignments[field])
      if (name) rows.push([field, name])
    }
    return buildCsv(rows)
  }

  function downloadContentCsv(): void {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadBlob(`dezzy-content-${stamp}.csv`, new TextEncoder().encode(buildContentCsv()), 'text/csv')
    showToast('Content CSV downloaded.')
  }

  function exportSaveState(): void {
    const enc = new TextEncoder()
    exportEntries.current = {
      'data.csv': enc.encode(buildContentCsv()),
      'assignments.csv': enc.encode(buildAssignmentsCsv()),
    }
    post({ type: 'export-images' })
  }

  interface StagedState {
    values: Record<string, string> | null
    assigns: [string, string][]
    images: [string, Uint8Array][]
    tags: { id: string; tag: Tag }[]
  }

  function applySaveState(staged: StagedState): void {
    if (staged.tags.length) {
      // Re-apply per-node tags (metadata, not canvas content), then the index
      // refreshes so the Content/Photos/Apply views see the restored fields.
      post({ type: 'restore-tags', tags: staged.tags })
    }
    if (staged.values) {
      window.clearTimeout(saveTimer.current)
      setValues(staged.values)
      post({ type: 'save-content', values: staged.values })
    }
    if (staged.images.length) {
      addFiles(
        staged.images.map(([name, data]) => new File([data as BlobPart], name, { type: mimeFor(name) }))
      )
    }
    if (staged.assigns.length) {
      // Restore assignments once every image is in Figma; filenames resolve
      // to hashes via hashByName, which dedupe keeps accurate.
      uploadChain.current = uploadChain.current.then(() => {
        setAssignments((prev) => {
          const next = { ...prev }
          for (const [field, filename] of staged.assigns) {
            const hash = hashByName.current.get(filename)
            if (hash) next[field] = hash
          }
          return next
        })
      })
    }
    showToast(
      `Save state loaded: ${staged.values ? Object.keys(staged.values).length : 0} fields, ${staged.images.length} images.`
    )
  }

  async function importSaveState(file: File): Promise<void> {
    try {
      const entries = readZip(new Uint8Array(await file.arrayBuffer()))
      const staged: StagedState = { values: null, assigns: [], images: [], tags: [] }
      const dec = new TextDecoder()
      for (const [path, data] of Object.entries(entries)) {
        if (path.endsWith('/')) continue
        const base = path.split('/').pop()!
        if (base.toLowerCase() === 'data.csv') {
          staged.values = recordFromCsv(dec.decode(data))
        } else if (base.toLowerCase() === 'assignments.csv') {
          staged.assigns = Object.entries(recordFromCsv(dec.decode(data)))
        } else if (base.toLowerCase() === 'tags.json') {
          try {
            const parsed = JSON.parse(dec.decode(data))
            if (Array.isArray(parsed)) staged.tags = parsed
          } catch {
            // malformed tag file — skip, restore the rest
          }
        } else if (isImagePath(base)) {
          staged.images.push([base, data])
        }
      }
      if (!staged.values && !staged.images.length && !staged.tags.length) {
        showToast('No data.csv, images, or tags found in that zip.', true)
        return
      }
      setConfirmDialog({
        title: 'Load save state',
        message:
          `Load "${file.name}"? This replaces entered content with ${staged.values ? Object.keys(staged.values).length : 0} field values, adds ${staged.images.length} photos to the library, restores ${staged.assigns.length} slot assignments` +
          (staged.tags.length
            ? `, and re-applies ${staged.tags.length} layer tag${staged.tags.length === 1 ? '' : 's'} to this file`
            : '') +
          `. Nothing changes on the canvas until you Apply.`,
        confirmLabel: 'Load',
        onConfirm: () => applySaveState(staged),
      })
    } catch (err) {
      showToast(`Could not read zip: ${err instanceof Error ? err.message : err}`, true)
    }
  }

  async function importCsvOnly(file: File): Promise<void> {
    try {
      const imported = recordFromCsv(await file.text())
      const count = Object.keys(imported).length
      if (!count) {
        showToast('No field,value rows found in that CSV.', true)
        return
      }
      setConfirmDialog({
        title: 'Import CSV',
        message: `Import ${count} field value${count === 1 ? '' : 's'} from "${file.name}"? Existing values for those fields will be replaced; other fields are kept.`,
        confirmLabel: 'Import',
        onConfirm: () => {
          window.clearTimeout(saveTimer.current)
          const merged = { ...values, ...imported }
          setValues(merged)
          post({ type: 'save-content', values: merged })
          showToast(`Imported ${count} field value${count === 1 ? '' : 's'}.`)
        },
      })
    } catch (err) {
      showToast(`Could not read CSV: ${err instanceof Error ? err.message : err}`, true)
    }
  }

  function requestClearTags(): void {
    setConfirmDialog({
      title: 'Clear all tags',
      message:
        `Remove every tag on this page` +
        (taggedNodes
          ? ` (${taggedNodes} layer${taggedNodes === 1 ? '' : 's'} across ${index.length} field${index.length === 1 ? '' : 's'})`
          : '') +
        `? Entered content and uploaded photos are kept — only the tags are removed, so you'd need to re-tag before applying again.`,
      confirmLabel: 'Clear tags',
      onConfirm: () => post({ type: 'clear-tags' }),
    })
  }

  function requestClearAll(): void {
    const readyCount = library.filter((it) => it.status === 'ready' && it.hash).length
    setConfirmDialog({
      title: 'Clear all photos',
      message:
        `Remove all ${readyCount || library.length} loaded photo${(readyCount || library.length) === 1 ? '' : 's'} and clear every slot assignment? ` +
        `Photos already applied to the canvas stay put — undo in Figma to revert those.`,
      confirmLabel: 'Clear all',
      onConfirm: clearAllPhotos,
    })
  }

  function autoAssign(overwrite: boolean): void {
    const photos = library.filter((it) => it.status === 'ready' && it.hash).sort(byFilename)
    const genericSlots = index
      .filter((e) => e.kind === 'image' && SLOT_RE.test(e.field))
      .map((e) => e.field)
      .sort()
    // Full-page slots (photo.fullpage/fullpageleft/fullpageright.NN) all share
    // one progression pool; regular category slots (photo.kitchen.01, …) match
    // by filename. Both grouped by number order.
    const fullpageSlots: string[] = []
    // preview / minipreview slots draw from the whole photo pool in their own
    // passes — kept out of catSlots so the room-category passes never touch them.
    const previewSlots: string[] = []
    const miniPreviewSlots: string[] = []
    const catSlots = new Map<string, string[]>()
    for (const e of index) {
      if (e.kind !== 'image') continue
      const m = CAT_SLOT_RE.exec(e.field)
      if (!m || m[1] === 'slot') continue
      if (isFullPageCat(m[1])) {
        fullpageSlots.push(e.field)
        continue
      }
      if (m[1] === 'minipreview') {
        miniPreviewSlots.push(e.field)
        continue
      }
      if (m[1] === 'preview') {
        previewSlots.push(e.field)
        continue
      }
      const list = catSlots.get(m[1])
      if (list) list.push(e.field)
      else catSlots.set(m[1], [e.field])
    }
    previewSlots.sort()
    miniPreviewSlots.sort()
    // Number order first, then left → center → right within a number, so a
    // left/right pair at the same index reads left page first.
    const fpRank = (f: string) => {
      const m = CAT_SLOT_RE.exec(f)
      const cat = m ? m[1] : ''
      return {
        num: m ? parseInt(m[2], 10) : 0,
        side: cat === 'fullpageleft' ? 0 : cat === 'fullpage' ? 1 : 2,
      }
    }
    fullpageSlots.sort((a, b) => {
      const ra = fpRank(a)
      const rb = fpRank(b)
      return ra.num - rb.num || ra.side - rb.side
    })
    for (const list of catSlots.values()) list.sort()

    setAssignments((prev) => {
      const next = { ...prev }
      const used = new Set(overwrite ? [] : Object.values(next))
      // Fields assigned during THIS run — never reassigned by a later pass
      // (so pass 2's pool fill can't clobber pass 1's specific placements).
      const claimed = new Set<string>()
      // A slot is fillable if it wasn't claimed this run and — unless
      // overwriting — didn't already hold an assignment before this run.
      const canFill = (f: string) => !claimed.has(f) && (overwrite || !prev[f])
      const assign = (field: string, hash: string) => {
        next[field] = hash
        claimed.add(field)
      }

      // Agent headshot: reserve the first photo whose filename looks like a
      // person's name / headshot for photo.agent BEFORE any room or preview
      // pass can claim it. The reserved photo is then held out of every other
      // pass (nonAgentPhotos) so a headshot never lands in a room slot.
      const agentField = 'photo.agent'
      let agentPhoto: PhotoItem | null = null
      if (
        canFill(agentField) &&
        index.some((e) => e.field === agentField && e.kind === 'image')
      ) {
        // Prefer a filename matching the agent name entered on the Content tab
        // (catches even delimiter-less "marthajohnson.png"); else fall back to
        // the generic headshot/person-name heuristic.
        const agentName = values['name'] ?? ''
        agentPhoto =
          (agentName.trim()
            ? photos.find((p) => !!p.name && matchesAgentName(p.name, agentName))
            : undefined) ??
          photos.find((p) => !!p.name && looksLikeAgentPhoto(p.name)) ??
          null
        if (agentPhoto) {
          assign(agentField, agentPhoto.hash!)
          used.add(agentPhoto.hash!)
        }
      }
      const nonAgentPhotos = agentPhoto
        ? photos.filter((p) => p.hash !== agentPhoto!.hash)
        : photos

      // Pass 0: full-page slots. Order every ready photo by its category's
      // position in FULLPAGE_ORDER (then filename) and consume them one per
      // slot in sequence, so full pages progress front porch → living →
      // kitchen → dining → master → masterbath → secondary → secondarybath →
      // office → amenities → garage → outdoor → exterior.
      // Repeats are only guarded against OTHER full-page slots — a photo
      // sitting in a category/generic slot must not starve the progression.
      // (Coupled spread halves share a single field, so one photo fills both.)
      if (fullpageSlots.length) {
        const ordered = [...nonAgentPhotos].sort(
          (a, b) =>
            fullPageRank(a.name ? matchCategory(a.name) : null) -
              fullPageRank(b.name ? matchCategory(b.name) : null) || byFilename(a, b)
        )
        const usedFp = new Set<string>()
        if (!overwrite) {
          for (const f of fullpageSlots) if (next[f]) usedFp.add(next[f])
        }
        let pi = 0
        for (const field of fullpageSlots) {
          if (!canFill(field)) continue
          while (pi < ordered.length && usedFp.has(ordered[pi].hash!)) pi++
          if (pi >= ordered.length) break
          const hash = ordered[pi].hash!
          assign(field, hash)
          usedFp.add(hash)
          used.add(hash) // later passes still prefer photos not on a full page
          pi++
        }
      }

      const available = nonAgentPhotos.filter((p) => !used.has(p.hash!))

      // Fill a category's fillable slots from a queue of photos, in order;
      // returns the photos that didn't fit.
      const fillSlots = (cat: string, queue: PhotoItem[]): PhotoItem[] => {
        const fields = (catSlots.get(cat) ?? []).filter(canFill)
        const over: PhotoItem[] = []
        queue.forEach((p, i) => {
          if (i < fields.length) assign(fields[i], p.hash!)
          else over.push(p)
        })
        return over
      }

      // Pass 1 (specific): each photo -> a slot of its OWN category first.
      const bySpecific = new Map<string, PhotoItem[]>()
      const afterSpecific: PhotoItem[] = []
      for (const p of available) {
        const cat = p.name ? matchCategory(p.name) : null
        if (cat && catSlots.has(cat)) {
          const list = bySpecific.get(cat)
          if (list) list.push(p)
          else bySpecific.set(cat, [p])
        } else {
          afterSpecific.push(p)
        }
      }
      let remaining: PhotoItem[] = [...afterSpecific]
      for (const [cat, queue] of bySpecific) remaining.push(...fillSlots(cat, queue))

      // Pass 2 (pools): interior/exterior slots draw from EVERY photo whose
      // category belongs to the pool — repeats allowed, so a kitchen photo can
      // sit in kitchen.01 AND an interior slot. Not-yet-used photos go first;
      // if there are more pool slots than pool photos, the queue cycles.
      for (const pool of ['interior', 'exterior'] as const) {
        if (!catSlots.has(pool)) continue
        const poolPhotos = nonAgentPhotos.filter(
          (p) => poolOf(p.name ? matchCategory(p.name) : null) === pool
        )
        if (!poolPhotos.length) continue
        const queue = [
          ...poolPhotos.filter((p) => !used.has(p.hash!)),
          ...poolPhotos.filter((p) => used.has(p.hash!)),
        ]
        const fields = (catSlots.get(pool) ?? []).filter(canFill)
        fields.forEach((field, i) => {
          const p = queue[i % queue.length]
          assign(field, p.hash!)
          used.add(p.hash!)
        })
        // Photos consumed by the pool leave the generic queue.
        remaining = remaining.filter((p) => !used.has(p.hash!))
      }

      // Pass 3: everything else -> generic numbered slots in filename order.
      remaining.sort(byFilename)
      let qi = 0
      for (const field of genericSlots) {
        if (!canFill(field)) continue
        if (qi >= remaining.length) break
        assign(field, remaining[qi++].hash!)
      }

      // Preview passes: independent of every category above. They read the
      // whole photo pool and never consult or mutate `used`/`remaining`, so a
      // photo placed here is still free to fill its own room slot elsewhere.

      // Mini preview: one image per category, ranked like the full-page tags —
      // the first photo (filename order) of each category, categories in
      // FULLPAGE_ORDER. Extra slots beyond the covered categories stay empty.
      if (miniPreviewSlots.length && photos.length) {
        const firstByCat = new Map<string, PhotoItem>()
        for (const p of [...nonAgentPhotos].sort(byFilename)) {
          const cat = p.name ? matchCategory(p.name) : null
          if (cat && !firstByCat.has(cat)) firstByCat.set(cat, p)
        }
        const reps = [...firstByCat.entries()]
          .sort((a, b) => fullPageRank(a[0]) - fullPageRank(b[0]))
          .map(([, p]) => p)
        let ri = 0
        for (const field of miniPreviewSlots) {
          if (!canFill(field)) continue
          if (ri >= reps.length) break
          assign(field, reps[ri++].hash!)
        }
      }

      // Preview: lead with one image from each PREVIEW_ORDER category
      // (exterior → kitchen → living → master), then continue with the rest of
      // the pool in filename order; repeats allowed when slots outnumber photos.
      if (previewSlots.length && photos.length) {
        const sorted = [...nonAgentPhotos].sort(byFilename)
        const queue: PhotoItem[] = []
        const taken = new Set<string>()
        for (const cat of PREVIEW_ORDER) {
          const p = sorted.find(
            (x) => !taken.has(x.hash!) && (x.name ? matchCategory(x.name) : null) === cat
          )
          if (p) {
            queue.push(p)
            taken.add(p.hash!)
          }
        }
        for (const p of sorted) if (!taken.has(p.hash!)) queue.push(p)
        let pi = 0
        for (const field of previewSlots) {
          if (!canFill(field)) continue
          assign(field, queue[pi % queue.length].hash!)
          pi++
        }
      }
      return next
    })
  }

  function flushContent(): void {
    window.clearTimeout(saveTimer.current)
    post({ type: 'save-content', values })
  }

  function applyPhotosNow(): void {
    flushPhotos()
    post({ type: 'apply-photos', fields: null })
  }

  function applyTextNow(fields: string[] | null): void {
    flushContent()
    post({ type: 'apply-text', fields })
  }

  function applyEverythingNow(): void {
    flushContent()
    flushPhotos()
    post({ type: 'apply-all' })
  }

  const photoSlotStats = useMemo(() => {
    const slots = index.filter((e) => e.kind === 'image' && e.field !== LOCKED_FIELD)
    return {
      total: slots.length,
      assigned: slots.filter((e) => assignments[e.field]).length,
    }
  }, [index, assignments])

  function openTab(t: Tab): void {
    setTab(t)
    if (t === 'Apply') post({ type: 'dry-run' })
  }

  return (
    <div class="app">
      <div class="tabs">
        {TABS.map((t) => (
          <div class={`tab${tab === t ? ' active' : ''}`} key={t} onClick={() => openTab(t)}>
            {t}
          </div>
        ))}
      </div>
      {busy && <div class="busy">{busy}</div>}
      <div class="scroll">
        {tab === 'Tag' && (
          <TagTab
            selection={selection}
            selTotal={selTotal}
            index={index}
            taggedNodes={taggedNodes}
            indexPage={indexPage}
            onClearTags={requestClearTags}
          />
        )}
        {tab === 'Content' && (
          <ContentTab
            values={values}
            updateValue={updateValue}
            index={index}
            templateCounts={templateCounts}
            busy={!!busy}
            onDownloadCsv={downloadContentCsv}
            onImportCsv={importCsvOnly}
          />
        )}
        {tab === 'Photos' && (
          <PhotosTab
            library={library}
            assignments={assignments}
            index={index}
            onFiles={addFiles}
            onAssign={assignPhoto}
            onAutoAssign={autoAssign}
            onRemovePhoto={requestRemovePhoto}
            onClearAll={requestClearAll}
          />
        )}
        {tab === 'Apply' && (
          <ApplyTab
            report={report}
            validation={validation}
            progress={progress}
            lastApply={lastApply}
            busy={!!busy}
            photoSlots={photoSlotStats}
            onApplyText={applyTextNow}
            onApplyPhotos={applyPhotosNow}
            onApplyAll={applyEverythingNow}
          />
        )}
        {tab === 'Bulk' && (
          <BulkTab
            busy={!!busy}
            progress={progress}
            onExportZip={exportSaveState}
            onImportZip={importSaveState}
          />
        )}
      </div>
      {tab === 'Content' && (
        <div class="action-bar">
          <button disabled={!!busy} onClick={() => applyTextNow(null)}>
            Apply all content
          </button>
          {progress && (
            <div class="action-progress">
              <ProgressBar progress={progress} />
            </div>
          )}
        </div>
      )}
      {tab === 'Photos' && (
        <div class="action-bar">
          <button
            disabled={!!busy || !photoSlotStats.assigned}
            onClick={applyPhotosNow}
          >
            Apply photos ({photoSlotStats.assigned} slot
            {photoSlotStats.assigned === 1 ? '' : 's'})
          </button>
          {progress && (
            <div class="action-progress">
              <ProgressBar progress={progress} />
            </div>
          )}
        </div>
      )}
      {toast && <div class={`toast${toast.error ? ' error' : ''}`}>{toast.message}</div>}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => {
            confirmDialog.onConfirm()
            setConfirmDialog(null)
          }}
        />
      )}
    </div>
  )
}

function ConfirmModal(props: {
  title: string
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const { title, message, confirmLabel, onCancel, onConfirm } = props
  return (
    <div class="modal-overlay" onClick={onCancel}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-title">{title}</div>
        <div class="modal-message">{message}</div>
        <div class="modal-actions">
          <button class="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button class="danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Tag tab

// Partial tagging: edit a text node's template. The mirror is where the user
// highlights — Figma can't expose the on-canvas text selection, but a textarea
// here reports selectionStart/End, which we turn into a {{field}} token.
function TemplateEditor(props: { node: SelNode; field: string }) {
  const { node, field } = props
  const base = node.tag?.options?.template ?? node.chars ?? ''
  const [draft, setDraft] = useState(base)
  const ref = useRef<HTMLTextAreaElement>(null)
  const isTemplate = !!node.tag?.options?.template
  const tokens = templateFields(draft)

  const wrapSelection = () => {
    const el = ref.current
    if (!el || !field) return
    const s = el.selectionStart
    const e = el.selectionEnd
    if (s === e) return // nothing highlighted
    setDraft(draft.slice(0, s) + `{{${field}}}` + draft.slice(e))
  }

  return (
    <details class="help" open={isTemplate}>
      <summary>Tag part of this text (template)</summary>
      <div class="help-body">
        <p>
          Highlight text below, pick a Content field above, then <b>Wrap selection</b> to tag just
          that part as a token — everything else stays literal. You can also edit the template by
          hand.
        </p>
        <textarea
          ref={ref}
          rows={3}
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
        />
        <div class="row">
          <button class="secondary grow" disabled={!field} onClick={wrapSelection}>
            Wrap selection as {`{{${field || 'field'}}}`}
          </button>
        </div>
        <div class="row">
          <button class="grow" disabled={draft === base} onClick={() => post({ type: 'set-template', template: draft })}>
            Save template
          </button>
          <button
            class="secondary"
            disabled={!draft}
            onClick={() => {
              setDraft(node.chars ?? '')
            }}
          >
            Reset
          </button>
        </div>
        <div class="muted" style={{ marginTop: '4px' }}>
          {tokens.length
            ? `Tokens: ${tokens.join(', ')}`
            : 'No tokens yet — pick a Content field above, highlight text, then Wrap.'}
        </div>
      </div>
    </details>
  )
}

function TagTab(props: {
  selection: SelNode[]
  selTotal: number
  index: IndexEntry[]
  taggedNodes: number
  indexPage: string
  onClearTags: () => void
}) {
  const { selection, selTotal, index, taggedNodes, indexPage, onClearTags } = props
  const firstText = SCHEMA.find((f) => f.kind === 'text')!.key
  const firstImage = SCHEMA.find((f) => f.kind === 'image')!.key
  const [textChoice, setTextChoice] = useState(firstText)
  const [textCustom, setTextCustom] = useState('')
  const [imageChoice, setImageChoice] = useState(firstImage)
  const [imageCustom, setImageCustom] = useState('')

  const activeTextField = textChoice === CUSTOM ? textCustom.trim() : textChoice
  const activeImageField = imageChoice === CUSTOM ? imageCustom.trim() : imageChoice

  // Alignment toggle / spread coupling operate on selected image containers.
  const imageTagged = selection.filter((n) => n.tag?.kind === 'image')
  const alignSet = new Set(imageTagged.map((n) => n.tag?.options?.align ?? 'center'))
  const curAlign = alignSet.size === 1 ? [...alignSet][0] : null

  // Partial (template) tagging: available when exactly one text node is
  // selected and we have its characters to mirror.
  const soleTextNode =
    selTotal === 1 && selection.length === 1 && selection[0].nodeType === 'TEXT'
      ? selection[0]
      : null

  // Same schema, split by kind: content fields vs photo slots.
  const groupedByKind = useMemo(() => {
    const byKind = (kind: TagKind) =>
      SCHEMA_GROUPS.map((g) => ({
        group: g,
        fields: SCHEMA.filter((f) => f.group === g && f.kind === kind),
      })).filter((g) => g.fields.length > 0)
    return { text: byKind('text'), image: byKind('image') }
  }, [])

  const slotEntries = index.filter((e) => e.field.startsWith('photo.slot.'))
  const otherEntries = index.filter((e) => !e.field.startsWith('photo.slot.'))

  return (
    <>
      <div class="section">
        <h2>Selection</h2>
        <div class="card">
          {selection.length === 0 ? (
            <div class="muted">Nothing selected. Select layers on the canvas to tag them.</div>
          ) : (
            <>
              {selection.map((n) => (
                <div class="sel-node" key={n.id}>
                  <span class="name" title={n.name}>
                    {n.name}
                  </span>
                  <span class="node-type">{n.nodeType.toLowerCase()}</span>
                  {n.tag ? (
                    <span class={`chip ${n.tag.kind}`}>
                      {n.tag.options?.align === 'left' ? '◄ ' : ''}
                      {n.tag.field}
                      {n.tag.options?.spread ? ' ⇔' : ''}
                      {n.tag.options?.align === 'right' ? ' ►' : ''}
                    </span>
                  ) : (
                    <span class="muted">untagged</span>
                  )}
                </div>
              ))}
              {selTotal > selection.length && (
                <div class="muted">…and {selTotal - selection.length} more</div>
              )}
            </>
          )}
          <div class="assign-label">Content (text)</div>
          <div class="row" style={{ marginTop: '4px' }}>
            <select
              class="grow"
              value={textChoice}
              onChange={(e) => setTextChoice((e.target as HTMLSelectElement).value)}
            >
              {groupedByKind.text.map(({ group, fields }) => (
                <optgroup label={group} key={group}>
                  {fields.map((f) => (
                    <option value={f.key} key={f.key}>
                      {f.label} ({f.key})
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM}>Custom field…</option>
            </select>
            <button
              disabled={!selTotal || !activeTextField}
              onClick={() => post({ type: 'assign-tag', field: activeTextField, kind: 'text' })}
            >
              Assign
            </button>
          </div>
          {textChoice === CUSTOM && (
            <div class="row">
              <input
                class="grow"
                type="text"
                placeholder="e.g. caption.9.title"
                value={textCustom}
                onInput={(e) => setTextCustom((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          {soleTextNode && (
            <TemplateEditor
              node={soleTextNode}
              field={activeTextField}
              key={soleTextNode.id}
            />
          )}

          <div class="assign-label">Photos (image)</div>
          <div class="row" style={{ marginTop: '4px' }}>
            <select
              class="grow"
              value={imageChoice}
              onChange={(e) => setImageChoice((e.target as HTMLSelectElement).value)}
            >
              {groupedByKind.image.map(({ group, fields }) => (
                <optgroup label={group} key={group}>
                  {fields.map((f) => (
                    <option value={f.key} key={f.key}>
                      {f.label} ({f.key})
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM}>Custom slot…</option>
            </select>
            <button
              disabled={!selTotal || !activeImageField}
              onClick={() => post({ type: 'assign-tag', field: activeImageField, kind: 'image' })}
            >
              Assign
            </button>
          </div>
          {imageChoice === CUSTOM && (
            <div class="row">
              <input
                class="grow"
                type="text"
                placeholder="e.g. photo.slot.012"
                value={imageCustom}
                onInput={(e) => setImageCustom((e.target as HTMLInputElement).value)}
              />
            </div>
          )}
          {selTotal > 1 && (
            <div class="muted" style={{ marginTop: '6px' }}>
              A "next #" slot numbers each selected container separately
              (kitchen.03, .04, …). To share one photo across a spread, use Couple below.
            </div>
          )}

          <div class="assign-label">Spread &amp; alignment</div>
          <div class="row" style={{ marginTop: '4px' }}>
            <button
              class="secondary grow"
              disabled={selTotal !== 2}
              onClick={() => post({ type: 'couple-spread' })}
            >
              Couple 2 as spread ⇔
            </button>
            <button
              class="secondary grow"
              disabled={imageTagged.length === 0}
              onClick={() => post({ type: 'align-spread' })}
            >
              Align spread fills
            </button>
          </div>
          {imageTagged.length > 0 && (
            <div class="row">
              <span class="muted" style={{ alignSelf: 'center', marginRight: '2px' }}>
                Align
              </span>
              <button
                class={`secondary grow${curAlign === 'left' ? ' active' : ''}`}
                onClick={() => post({ type: 'set-align', align: 'left' })}
              >
                ◄ Left
              </button>
              <button
                class={`secondary grow${curAlign === 'center' ? ' active' : ''}`}
                onClick={() => post({ type: 'set-align', align: 'center' })}
              >
                Center
              </button>
              <button
                class={`secondary grow${curAlign === 'right' ? ' active' : ''}`}
                onClick={() => post({ type: 'set-align', align: 'right' })}
              >
                Right ►
              </button>
            </div>
          )}
          <div class="muted" style={{ marginTop: '6px' }}>
            Couple two containers on touching artboards to share one photo, then set each half's
            alignment so the image continues across the spread — left page ◄ Left, right page
            Right ►.
          </div>

          <div class="row">
            <button class="secondary grow" disabled={!selTotal} onClick={() => post({ type: 'remove-tag' })}>
              Remove tag
            </button>
          </div>
        </div>
      </div>


      <div class="section">
        <h2>
          Tag index{' '}
          <span class="muted">
            {taggedNodes ? `· ${taggedNodes} nodes${indexPage ? ` on ${indexPage}` : ''}` : ''}
          </span>
        </h2>
        <div class="card">
          <div class="row" style={{ marginTop: 0 }}>
            <button class="grow secondary" onClick={() => post({ type: 'rebuild-index' })}>
              Rebuild index
            </button>
            <button class="danger" disabled={!taggedNodes} onClick={onClearTags}>
              Clear all tags
            </button>
          </div>
          {index.length === 0 ? (
            <div class="muted" style={{ marginTop: '8px' }}>
              No tags indexed yet. Tag some layers or run the bulk tools.
            </div>
          ) : (
            <div style={{ marginTop: '6px' }}>
              {otherEntries.map((e) => (
                <IndexRow entry={e} key={e.field} />
              ))}
              {slotEntries.length > 0 && (
                <div class="muted" style={{ margin: '6px 0 2px' }}>
                  Photo slots ({slotEntries.length})
                </div>
              )}
              {slotEntries.map((e) => (
                <IndexRow entry={e} key={e.field} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryHelp({ context }: { context: 'tagging' | 'assign' }) {
  return (
    <details class="help">
      <summary>How photo categories work</summary>
      <div class="help-body">
        {context === 'tagging' ? (
          <p>
            Name a photo layer after a room — <b>Master Bath 2</b>, <b>Kitchen</b>,{' '}
            <b>#pool</b> — and the scan tags it as the next numbered slot in that category
            (photo.master.01, photo.kitchen.03, …). First matching category wins, so "master
            bathroom" counts as Master, not Secondary. Layers whose names match nothing (like
            "Rectangle 36") are untouched — use Auto-number to sweep those into generic slots.
          </p>
        ) : (
          <p>
            Auto-assign reads each photo's <b>filename</b>: master-bath-2.jpg fills a Master
            slot, Kitchen2.jpg a Kitchen slot, and so on, in filename order within each
            category. Photos with no recognized room word (IMG_9928.jpg), or more photos than a
            category has slots, flow into the generic numbered slots instead. First matching
            word wins — "master bathroom" counts as Master, not Secondary.
          </p>
        )}
        <p>
          <b>Preview</b> and <b>Mini preview</b> are special: they draw from the whole photo
          pool regardless of category. Auto-assign leads <b>Preview</b> slots with one image
          from exterior, kitchen, living room, then master bedroom, then continues through the
          rest of the images in filename order. <b>Mini preview</b> gets one representative
          image per category, in the same order the full-page tags use.
        </p>
        <div class="help-cats">
          {PHOTO_CATEGORIES_DISPLAY.map((c) => (
            <div class="help-cat" key={c.key}>
              <span class="help-cat-label">{c.label}</span>
              <span class="help-cat-words">{c.keywords.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

function IndexRow({ entry }: { entry: IndexEntry }) {
  return (
    <div
      class="index-row"
      title={`Select all nodes tagged ${entry.field}`}
      onClick={() => post({ type: 'select-field', field: entry.field })}
    >
      <span class={`chip ${entry.kind}`}>{entry.kind === 'image' ? 'img' : 'txt'}</span>
      <span class="field">{entry.field}</span>
      <span class="count">
        ×{entry.count}
        {entry.kind === 'image' && entry.count > 1 ? ' ⇔' : ''}
      </span>
    </div>
  )
}

// ------------------------------------------------------------ Content tab

function ContentTab(props: {
  values: Record<string, string>
  updateValue: (key: string, value: string) => void
  index: IndexEntry[]
  templateCounts: Record<string, number>
  busy: boolean
  onDownloadCsv: () => void
  onImportCsv: (file: File) => void
}) {
  const { values, updateValue, index, templateCounts, busy, onDownloadCsv, onImportCsv } = props
  const csvInput = useRef<HTMLInputElement>(null)
  // Count = whole-node tags + template-token references for the field.
  const tagCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of index) if (e.kind === 'text') map.set(e.field, e.count)
    for (const [f, n] of Object.entries(templateCounts)) map.set(f, (map.get(f) ?? 0) + n)
    return map
  }, [index, templateCounts])

  // Text fields tagged in the doc but not part of the built-in schema
  // (e.g. custom caption.9.title) still get an input — including fields used
  // only inside templates. TEMPLATE_FIELD itself is never an editable field.
  const extraFields: FieldDef[] = useMemo(() => {
    const keys = new Set<string>()
    for (const e of index) if (e.kind === 'text' && e.field !== TEMPLATE_FIELD) keys.add(e.field)
    for (const f of Object.keys(templateCounts)) keys.add(f)
    return [...keys]
      .filter((k) => !fieldDef(k))
      .map((k) => ({ key: k, label: k, kind: 'text' as const, group: 'Other' }))
  }, [index, templateCounts])

  const groups = [
    ...SCHEMA_GROUPS.filter((g) => g !== 'Photos' && g !== 'Locks').map((g) => ({
      group: g,
      fields: SCHEMA.filter((f) => f.group === g),
    })),
    ...(extraFields.length ? [{ group: 'Other tagged fields', fields: extraFields }] : []),
  ]

  const lockedTextCount = index.find((e) => e.field === TEXT_LOCKED_FIELD)?.count ?? 0

  return (
    <>
      <div class="row" style={{ marginTop: 0, marginBottom: '10px' }}>
        <button class="grow secondary" disabled={busy} onClick={onDownloadCsv}>
          Download CSV
        </button>
        <button class="grow secondary" disabled={busy} onClick={() => csvInput.current?.click()}>
          Import CSV
        </button>
        <input
          ref={csvInput}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) onImportCsv(file)
            ;(e.target as HTMLInputElement).value = ''
          }}
        />
      </div>
      <div class="muted" style={{ marginBottom: '10px' }}>
        Values autosave into this Figma file and stay with it when duplicated. Fill in what you
        have, then head to Apply. The CSV is a field,value file — download it as a fill-in
        template, import it to update the fields below.
      </div>
      {lockedTextCount > 0 && (
        <div
          class="muted"
          style={{ marginBottom: '10px', cursor: 'pointer' }}
          title="Select locked text layers"
          onClick={() => post({ type: 'select-field', field: TEXT_LOCKED_FIELD })}
        >
          🔒 {lockedTextCount} locked text layer{lockedTextCount === 1 ? '' : 's'} — kept as-is, not
          overwritten.
        </div>
      )}
      {groups.map(({ group, fields }) => (
        <div class="section" key={group}>
          <h2>{group}</h2>
          <div class="card">
            {fields.map((f) => {
              const count = tagCount.get(f.key) ?? 0
              return (
                <div class="field-row" key={f.key}>
                  <label>
                    <span class="field-label">{f.label}</span>
                    <span class={`tag-count${count ? '' : ' none'}`}>
                      {count ? `×${count}` : 'untagged'}
                    </span>
                  </label>
                  {f.multiline ? (
                    <textarea
                      rows={4}
                      value={values[f.key] ?? ''}
                      onInput={(e) => updateValue(f.key, (e.target as HTMLTextAreaElement).value)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[f.key] ?? ''}
                      onInput={(e) => updateValue(f.key, (e.target as HTMLInputElement).value)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

    </>
  )
}

// ------------------------------------------------------------- Photos tab

function PhotosTab(props: {
  library: PhotoItem[]
  assignments: PhotoAssignments
  index: IndexEntry[]
  onFiles: (files: File[]) => void
  onAssign: (field: string, hash: string | null) => void
  onAutoAssign: (overwrite: boolean) => void
  onRemovePhoto: (id: number) => void
  onClearAll: () => void
}) {
  const {
    library,
    assignments,
    index,
    onFiles,
    onAssign,
    onAutoAssign,
    onRemovePhoto,
    onClearAll,
  } = props
  const [dragging, setDragging] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const ready = library.filter((it) => it.status === 'ready' && it.hash)
  const processing = library.filter((it) => it.status === 'processing')
  const failed = library.filter((it) => it.status === 'error')

  const imageFields = useMemo(() => {
    const images = index.filter((e) => e.kind === 'image' && e.field !== LOCKED_FIELD)
    const named = images
      .filter((e) => !SLOT_RE.test(e.field) && !isCategorySlot(e.field))
      .sort((a, b) => a.field.localeCompare(b.field))
    const categorized = images
      .filter((e) => isCategorySlot(e.field))
      .sort((a, b) => a.field.localeCompare(b.field))
    const generic = images
      .filter((e) => SLOT_RE.test(e.field))
      .sort((a, b) => a.field.localeCompare(b.field))
    return [...named, ...categorized, ...generic]
  }, [index])

  const lockedCount = useMemo(
    () => index.find((e) => e.field === LOCKED_FIELD)?.count ?? 0,
    [index]
  )

  const assignedCount = imageFields.filter((e) => assignments[e.field]).length

  // hash -> every slot field using it, for gallery badges. A photo can be
  // manually assigned to any number of slots; the badge shows all of them.
  const slotsByHash = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of imageFields) {
      const hash = assignments[e.field]
      if (!hash) continue
      const short = e.field.replace('photo.slot.', 'slot ').replace(/^photo\./, '')
      const list = map.get(hash)
      if (list) list.push(short)
      else map.set(hash, [short])
    }
    return map
  }, [imageFields, assignments])

  function pickFiles(list: FileList | null): void {
    if (!list?.length) return
    onFiles([...list].filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name)))
  }

  return (
    <>
      <div class="section">
        <h2>Upload</h2>
        <div
          class={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pickFiles(e.dataTransfer?.files ?? null)
          }}
          onClick={() => fileInput.current?.click()}
        >
          Drop photos here or click to choose.
          <div class="muted">
            Processed one at a time — oversized images are scaled to Figma's 4096px limit, print
            quality preserved.
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              pickFiles((e.target as HTMLInputElement).files)
              ;(e.target as HTMLInputElement).value = ''
            }}
          />
        </div>
        {processing.length > 0 && (
          <div class="muted" style={{ marginTop: '6px' }}>
            Processing {processing.length} photo{processing.length === 1 ? '' : 's'}…
          </div>
        )}
        {failed.map((it) => (
          <div class="warn" key={it.id}>
            {it.error ?? `${it.name} failed`}
          </div>
        ))}
      </div>

      <div class="section">
        <h2>
          Slots{' '}
          <span class="muted">
            · {assignedCount}/{imageFields.length} assigned
          </span>
        </h2>
        <div class="card">
          <div class="row" style={{ marginTop: 0 }}>
            <button
              class="grow secondary"
              disabled={!ready.length || !imageFields.length}
              onClick={() => onAutoAssign(overwrite)}
            >
              Auto-assign by filename order
            </button>
          </div>
          <div class="row">
            <label class="check">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite((e.target as HTMLInputElement).checked)}
              />
              Overwrite existing assignments
            </label>
          </div>
          <CategoryHelp context="assign" />
          {imageFields.length === 0 ? (
            <div class="muted" style={{ marginTop: '6px' }}>
              No image slots tagged yet — run Auto-number photo slots on the Tag tab.
            </div>
          ) : (
            <div style={{ marginTop: '6px' }}>
              {imageFields.map((e) => (
                <div class="slot-row" key={e.field}>
                  <span
                    class="field"
                    title="Select tagged layers"
                    onClick={() => post({ type: 'select-field', field: e.field })}
                  >
                    {e.field}
                    {e.spread ? ' ⇔' : ''}
                  </span>
                  <select
                    value={assignments[e.field] ?? ''}
                    onChange={(ev) =>
                      onAssign(e.field, (ev.target as HTMLSelectElement).value || null)
                    }
                  >
                    <option value="">—</option>
                    {ready.map((p) => (
                      <option value={p.hash} key={p.hash}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          {lockedCount > 0 && (
            <div
              class="muted"
              style={{ marginTop: '6px', cursor: 'pointer' }}
              title="Select locked containers"
              onClick={() => post({ type: 'select-field', field: LOCKED_FIELD })}
            >
              🔒 {lockedCount} locked container{lockedCount === 1 ? '' : 's'} — kept as-is, not
              replaced.
            </div>
          )}
        </div>
      </div>

      <div class="section">
        <h2>
          Library <span class="muted">· {ready.length} photos</span>
          {library.length > 0 && (
            <button class="link-danger" onClick={onClearAll}>
              Clear all
            </button>
          )}
        </h2>
        {library.length === 0 ? (
          <div class="muted">Nothing uploaded yet.</div>
        ) : (
          <div class="gallery">
            {library.map((it) => (
              <div class={`photo${it.status !== 'ready' ? ' dim' : ''}`} key={it.id} title={it.name}>
                <button
                  class="photo-delete"
                  title="Delete photo"
                  aria-label="Delete photo"
                  onClick={() => onRemovePhoto(it.id)}
                >
                  ×
                </button>
                {it.thumb ? (
                  <img src={it.thumb} loading="lazy" />
                ) : (
                  <div class="photo-placeholder">{it.status === 'processing' ? '…' : 'no preview'}</div>
                )}
                {it.hash && slotsByHash.has(it.hash) && (
                  <span
                    class="photo-badge"
                    title={slotsByHash.get(it.hash)!.join(', ')}
                  >
                    {slotsByHash.get(it.hash)!.length === 1
                      ? slotsByHash.get(it.hash)![0]
                      : `${slotsByHash.get(it.hash)!.length} slots`}
                  </span>
                )}
                <div class="photo-name">{it.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// --------------------------------------------------------------- Bulk tab

function ToolRow(props: {
  icon: string
  title: string
  desc: string
  action: string
  disabled?: boolean
  onAction: () => void
  children?: ComponentChildren
}) {
  const { icon, title, desc, action, disabled, onAction, children } = props
  return (
    <div class="tool-row">
      <div class="tool-icon">{icon}</div>
      <div class="tool-info">
        <div class="tool-title">{title}</div>
        <div class="tool-desc">{desc}</div>
        {children}
      </div>
      <button class="secondary" disabled={disabled} onClick={onAction}>
        {action}
      </button>
    </div>
  )
}

function BulkTab(props: {
  busy: boolean
  progress: { done: number; total: number } | null
  onExportZip: () => void
  onImportZip: (file: File) => void
}) {
  const { busy, progress, onExportZip, onImportZip } = props
  const [renumber, setRenumber] = useState(false)
  const zipInput = useRef<HTMLInputElement>(null)

  return (
    <>
      <div class="muted" style={{ marginBottom: '10px' }}>
        One-click passes over the whole template. Typical setup order: scan names → auto-number →
        upload photos → apply.
      </div>

      <div class="section">
        <h2>Tagging</h2>
        <div class="card tools">
          <ToolRow
            icon="🏷️"
            title="Scan layer names"
            desc="Turns #field names, schema-named text layers (street, price, …), and room-named photo layers into tags. Idempotent — already-tagged layers are skipped."
            action="Scan"
            disabled={busy}
            onAction={() => post({ type: 'scan-names' })}
          >
            <CategoryHelp context="tagging" />
          </ToolRow>
          <ToolRow
            icon="🔢"
            title="Auto-number photo slots"
            desc='Tags placeholder rectangles in "Insert Page N" / "Cover_…" frames as photo.slot.001… in reading order, with spread pairs detected and linked.'
            action="Number"
            disabled={busy}
            onAction={() => post({ type: 'auto-number', renumber })}
          >
            <label class="check" style={{ marginTop: '6px' }}>
              <input
                type="checkbox"
                checked={renumber}
                onChange={(e) => setRenumber((e.target as HTMLInputElement).checked)}
              />
              Renumber existing slots from 001
            </label>
          </ToolRow>
          <ToolRow
            icon="🖼️"
            title="Retag containers from images"
            desc="Re-tags each filled container to the category of the photo inside it (matched by filename). You'll get a preview to confirm before anything changes."
            action="Preview"
            disabled={busy}
            onAction={() => post({ type: 'retag-preview' })}
          />
          <ToolRow
            icon="✏️"
            title="Rename layers to tags"
            desc="Renames every tagged layer to its tag (price, photo.kitchen.01, …) so the layer list mirrors the tagging. Layers inside instances inherit the main component's name and are skipped."
            action="Rename"
            disabled={busy}
            onAction={() => post({ type: 'rename-to-tags' })}
          />
        </div>
      </div>

      <div class="section">
        <h2>Save state</h2>
        <div class="card tools">
          <ToolRow
            icon="📦"
            title="Download save state"
            desc="Zip with data.csv (field values), assignments.csv (slot → filename), tags.json (every layer tag), and images/ — every photo on the page plus the library."
            action="Download"
            disabled={busy}
            onAction={onExportZip}
          />
          <ToolRow
            icon="📂"
            title="Upload save state"
            desc="Restores fields, photos, slot assignments, and layer tags from a save-state zip, with confirmation. Tags re-apply immediately; nothing else changes on the canvas until you Apply."
            action="Upload"
            disabled={busy}
            onAction={() => zipInput.current?.click()}
          />
          {progress && (
            <div style={{ padding: '0 10px 10px' }}>
              <ProgressBar progress={progress} />
            </div>
          )}
          <input
            ref={zipInput}
            type="file"
            accept=".zip,application/zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) onImportZip(file)
              ;(e.target as HTMLInputElement).value = ''
            }}
          />
        </div>
      </div>
    </>
  )
}

// -------------------------------------------------------------- Apply tab

function ProgressBar(props: { progress: { done: number; total: number } }) {
  const { progress } = props
  return (
    <div class="row">
      <div class="progress grow">
        <div class="progress-bar" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        <span class="progress-label">
          {progress.done}/{progress.total}
        </span>
      </div>
      <button class="secondary" onClick={() => post({ type: 'cancel-apply' })}>
        Cancel
      </button>
    </div>
  )
}

function FieldChips({ fields }: { fields: string[] }) {
  return (
    <div class="chips">
      {fields.map((f) => (
        <span class="chip clickable" key={f} onClick={() => post({ type: 'select-field', field: f })}>
          {f}
        </span>
      ))}
    </div>
  )
}

function ApplyTab(props: {
  report: DryRunReport | null
  validation: ValidationReport | null
  progress: { done: number; total: number } | null
  lastApply: ApplySummary | null
  busy: boolean
  photoSlots: { total: number; assigned: number }
  onApplyText: (fields: string[] | null) => void
  onApplyPhotos: () => void
  onApplyAll: () => void
}) {
  const {
    report,
    validation,
    progress,
    lastApply,
    busy,
    photoSlots,
    onApplyText,
    onApplyPhotos,
    onApplyAll,
  } = props

  const applicable = report?.entries.filter((e) => e.hasValue) ?? []
  const groupsWithFields = SCHEMA_GROUPS.filter((g) =>
    applicable.some((e) => fieldDef(e.field)?.group === g)
  )

  function applyGroup(group: string | null): void {
    const fields = group
      ? applicable.filter((e) => fieldDef(e.field)?.group === group).map((e) => e.field)
      : null
    onApplyText(fields)
  }

  return (
    <>
      <div class="section">
        <h2>Magazine check</h2>
        <div class="card">
          <div class="row" style={{ marginTop: 0 }}>
            <button class="grow secondary" disabled={busy} onClick={() => post({ type: 'validate' })}>
              Check magazine
            </button>
          </div>
          <div class="muted" style={{ marginTop: '6px' }}>
            Rebuilds the index (including component instances), verifies every tagged layer, and
            reports anything that would make an apply incomplete.
          </div>
          {validation && (
            <div style={{ marginTop: '8px' }}>
              <div>
                <b>{validation.totalTagged}</b> tagged layers · <b>{validation.textFieldsReady}</b>{' '}
                text fields ready ({validation.textNodes} layers) ·{' '}
                <b>
                  {validation.assignedSlots}/{validation.imageSlots}
                </b>{' '}
                photo slots assigned
                {validation.lockedSlots ? ` · ${validation.lockedSlots} locked` : ''}
                {validation.deadHealed ? ` · ${validation.deadHealed} dead tag(s) healed` : ''}
              </div>
              {validation.spreadIssues.map((issue, i) => (
                <div class="warn" key={i}>
                  ⚠ {issue}
                </div>
              ))}
              {validation.unassigned.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div class="warn">Slots without a photo:</div>
                  <FieldChips fields={validation.unassigned} />
                </div>
              )}
              {validation.emptyTagged.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div class="warn">Tagged fields without a value:</div>
                  <FieldChips fields={validation.emptyTagged} />
                </div>
              )}
              {validation.valueNoNodes.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div class="warn">Entered values with no tagged layer:</div>
                  <div class="muted">{validation.valueNoNodes.join(', ')}</div>
                </div>
              )}
              {validation.spreadIssues.length === 0 &&
                validation.unassigned.length === 0 &&
                validation.emptyTagged.length === 0 &&
                validation.valueNoNodes.length === 0 && (
                  <div class="ok">Everything checks out — ready to apply.</div>
                )}
            </div>
          )}
        </div>
      </div>

      <div class="section">
        <h2>Dry run</h2>
        <div class="card">
          {!report ? (
            <div class="muted">Computing…</div>
          ) : report.entries.length === 0 ? (
            <div class="muted">No text fields tagged yet — tag layers on the Tag tab first.</div>
          ) : (
            <>
              <div style={{ marginBottom: '6px' }}>
                <b>{report.nodesToUpdate}</b> text layer{report.nodesToUpdate === 1 ? '' : 's'} will
                update across <b>{applicable.length}</b> field{applicable.length === 1 ? '' : 's'}.
              </div>
              {report.emptyTagged > 0 && (
                <div class="warn">{report.emptyTagged} tagged field(s) have no value yet.</div>
              )}
              {report.valueNoNodes > 0 && (
                <div class="warn">{report.valueNoNodes} entered value(s) have no tagged layer.</div>
              )}
              <div style={{ marginTop: '6px' }}>
                {report.entries.map((e) => (
                  <div class="index-row" key={e.field} onClick={() => post({ type: 'select-field', field: e.field })}>
                    <span class={`chip${e.hasValue ? '' : ' off'}`}>{e.hasValue ? 'ready' : 'empty'}</span>
                    <span class="field">{e.field}</span>
                    <span class="count">×{e.nodeCount}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div class="section">
        <h2>Apply</h2>
        <div class="card">
          <div class="row" style={{ marginTop: 0 }}>
            <button
              class="grow"
              disabled={busy || (!applicable.length && !photoSlots.assigned)}
              onClick={onApplyAll}
            >
              Apply everything ({applicable.length} fields + {photoSlots.assigned} photo slots)
            </button>
          </div>
          <div class="row">
            <button
              class="grow secondary"
              disabled={busy || !applicable.length}
              onClick={() => applyGroup(null)}
            >
              Apply all text ({applicable.length})
            </button>
            <button
              class="grow secondary"
              disabled={busy || !photoSlots.assigned}
              onClick={onApplyPhotos}
            >
              Apply photos ({photoSlots.assigned}/{photoSlots.total})
            </button>
          </div>
          {groupsWithFields.length > 1 && (
            <div class="row" style={{ flexWrap: 'wrap' }}>
              {groupsWithFields.map((g) => (
                <button class="secondary" key={g} disabled={busy} onClick={() => applyGroup(g)}>
                  {g}
                </button>
              ))}
            </div>
          )}
          {progress && <ProgressBar progress={progress} />}
          {lastApply && !progress && (
            <div style={{ marginTop: '8px' }}>
              <div>
                Last apply: <b>{lastApply.updated}</b> layers updated
                {lastApply.deadRemoved ? `, ${lastApply.deadRemoved} dead tag(s) healed` : ''}.
              </div>
              {lastApply.errors.map((err, i) => (
                <div class="warn" key={i}>
                  {err}
                </div>
              ))}
            </div>
          )}
          <div class="muted" style={{ marginTop: '8px' }}>
            Each apply is a single Undo step (Apply everything = one for text, one for photos).
          </div>
        </div>
      </div>
    </>
  )
}

render(<App />, document.getElementById('app')!)
