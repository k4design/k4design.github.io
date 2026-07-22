import {
  ApplySummary,
  ContentData,
  DryRunReport,
  NS,
  TEMPLATE_FIELD,
  TEXT_LOCKED_FIELD,
  renderTemplate,
  templateFields,
} from '../shared/types'
import { loadIndex, patchIndex, readTag, rebuildIndex } from './tags'

const CONTENT_KEY = 'content'

export function loadContent(): Record<string, string> {
  const raw = figma.root.getSharedPluginData(NS, CONTENT_KEY)
  if (!raw) return {}
  try {
    const data = JSON.parse(raw) as ContentData
    return data?.values ?? {}
  } catch {
    return {}
  }
}

export function saveContent(values: Record<string, string>): void {
  const data: ContentData = { v: 1, values }
  figma.root.setSharedPluginData(NS, CONTENT_KEY, JSON.stringify(data))
}

/**
 * What would an apply touch right now? Computed purely from the cached index
 * and stored content — no node resolution, so it's instant even at 120 pages.
 */
export function dryRun(): DryRunReport {
  const idx = loadIndex() ?? rebuildIndex()
  const values = loadContent()
  const report: DryRunReport = { entries: [], nodesToUpdate: 0, emptyTagged: 0, valueNoNodes: 0 }

  const textFields = Object.keys(idx.fields)
    .filter(
      (f) => idx.fields[f].kind === 'text' && f !== TEXT_LOCKED_FIELD && f !== TEMPLATE_FIELD
    )
    .sort()

  for (const field of textFields) {
    const nodeCount = idx.fields[field].ids.length
    const hasValue = !!values[field]?.trim()
    report.entries.push({ field, nodeCount, hasValue })
    if (hasValue) report.nodesToUpdate += nodeCount
    else report.emptyTagged++
  }
  // Template nodes re-render on every apply (each renders once).
  report.nodesToUpdate += idx.fields[TEMPLATE_FIELD]?.ids.length ?? 0
  for (const key of Object.keys(values)) {
    if (values[key]?.trim() && !idx.fields[key] && !idx.templateCounts?.[key]) report.valueNoNodes++
  }
  return report
}

async function loadFontsFor(node: TextNode, loaded: Set<string>, errors: string[]): Promise<boolean> {
  const fonts: FontName[] =
    node.characters.length === 0
      ? node.fontName === figma.mixed
        ? []
        : [node.fontName]
      : node.getRangeAllFontNames(0, node.characters.length)
  for (const font of fonts) {
    const key = `${font.family}::${font.style}`
    if (loaded.has(key)) continue
    try {
      await figma.loadFontAsync(font)
      loaded.add(key)
    } catch {
      errors.push(`Font unavailable: ${font.family} ${font.style}`)
      return false
    }
  }
  return true
}

const YIELD_EVERY = 10

/**
 * Write entered values into every tagged text node. `fields` limits the run
 * (per-group apply); null applies every text field that has a value. Fonts
 * are deduped across the whole run, dead node ids are healed out of the
 * index, and the loop yields regularly so Figma stays responsive.
 */
export async function applyText(
  fields: string[] | null,
  onProgress: (done: number, total: number) => void,
  shouldCancel: () => boolean = () => false
): Promise<ApplySummary> {
  const idx = loadIndex() ?? rebuildIndex()
  const values = loadContent()
  const summary: ApplySummary = { updated: 0, fieldsApplied: 0, deadRemoved: 0, errors: [] }
  const wanted = fields ? new Set(fields) : null

  interface Target {
    node: TextNode
    value: string
  }
  const targets: Target[] = []
  const dead: string[] = []

  // Whole-node text fields.
  for (const field of Object.keys(idx.fields)) {
    const entry = idx.fields[field]
    if (entry.kind !== 'text') continue
    if (field === TEXT_LOCKED_FIELD || field === TEMPLATE_FIELD) continue
    if (wanted && !wanted.has(field)) continue
    const value = values[field]?.trim()
    if (!value) continue
    let resolvedAny = false
    for (const id of entry.ids) {
      const node = await figma.getNodeByIdAsync(id)
      if (!node || node.removed) {
        dead.push(id)
        continue
      }
      if (node.type !== 'TEXT') continue
      targets.push({ node, value })
      resolvedAny = true
    }
    if (resolvedAny) summary.fieldsApplied++
  }

  // Template nodes: render their template with current values, preserving all
  // literal (untagged) text. Included whenever any referenced field is wanted
  // (or on a full apply). The token's own value is trimmed; literals are not.
  const templateEntry = idx.fields[TEMPLATE_FIELD]
  if (templateEntry) {
    for (const id of templateEntry.ids) {
      const node = await figma.getNodeByIdAsync(id)
      if (!node || node.removed) {
        dead.push(id)
        continue
      }
      if (node.type !== 'TEXT') continue
      const tmpl = readTag(node)?.options?.template
      if (!tmpl) continue
      if (wanted && !templateFields(tmpl).some((f) => wanted.has(f))) continue
      targets.push({ node, value: renderTemplate(tmpl, values) })
    }
  }

  // Keep the whole fill as a single native Undo step, separate from whatever
  // the plugin did before it.
  figma.commitUndo()

  const loadedFonts = new Set<string>()
  const total = targets.length
  let done = 0
  onProgress(0, total)

  for (const { node, value } of targets) {
    if (node.hasMissingFont) {
      summary.errors.push(`Missing font on "${node.name}" — skipped.`)
    } else if (await loadFontsFor(node, loadedFonts, summary.errors)) {
      try {
        node.characters = value
        summary.updated++
      } catch (err) {
        summary.errors.push(`Could not set "${node.name}": ${err instanceof Error ? err.message : err}`)
      }
    }
    done++
    if (done % YIELD_EVERY === 0 || done === total) {
      onProgress(done, total)
      await new Promise((r) => setTimeout(r, 0))
      if (shouldCancel() && done < total) {
        summary.errors.push(`Cancelled — ${done} of ${total} layers applied.`)
        break
      }
    }
  }

  if (dead.length) {
    patchIndex(dead, null, null)
    summary.deadRemoved = dead.length
  }
  return summary
}
