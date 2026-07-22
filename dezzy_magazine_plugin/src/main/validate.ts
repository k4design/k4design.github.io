import { LOCKED_FIELD, TEXT_LOCKED_FIELD, ValidationReport } from '../shared/types'
import { loadContent } from './content'
import { loadPhotos } from './photos'
import { patchIndex, readTag, rebuildIndexFull } from './tags'

/**
 * Whole-magazine health check. Rebuilds the index from scratch (including
 * instance propagation) so the report reflects the file as it is right now,
 * then cross-references content and photo assignments. Spread drift is only
 * flagged for genuine spread tags — a named photo reused at different sizes
 * (e.g. the agent headshot) is fine.
 */
export async function validate(): Promise<ValidationReport> {
  const idx = await rebuildIndexFull()
  const values = loadContent()
  const { assignments } = loadPhotos()

  const report: ValidationReport = {
    totalTagged: 0,
    textFieldsReady: 0,
    textNodes: 0,
    emptyTagged: [],
    valueNoNodes: [],
    imageSlots: 0,
    assignedSlots: 0,
    unassigned: [],
    lockedSlots: 0,
    spreadIssues: [],
    deadHealed: 0,
  }

  const dead: string[] = []
  let processed = 0

  for (const field of Object.keys(idx.fields).sort()) {
    const entry = idx.fields[field]
    const nodes: SceneNode[] = []
    for (const id of entry.ids) {
      const node = await figma.getNodeByIdAsync(id)
      if (!node || node.removed) dead.push(id)
      else nodes.push(node as SceneNode)
      if (++processed % 25 === 0) await new Promise((r) => setTimeout(r, 0))
    }
    report.totalTagged += nodes.length

    if (entry.kind === 'text') {
      if (field === TEXT_LOCKED_FIELD) {
        report.lockedSlots += nodes.length
      } else if (values[field]?.trim()) {
        report.textFieldsReady++
        report.textNodes += nodes.length
      } else {
        report.emptyTagged.push(field)
      }
      continue
    }

    if (field === LOCKED_FIELD) {
      report.lockedSlots += nodes.length
      continue // locked containers are intentionally kept, not a missing slot
    }

    report.imageSlots++
    if (assignments[field]) report.assignedSlots++
    else report.unassigned.push(field)

    if (nodes.length > 1 && nodes.some((n) => readTag(n)?.options?.spread)) {
      const sized = nodes.filter((n) => 'width' in n)
      const ws = sized.map((n) => Math.round(n.width))
      const hs = sized.map((n) => Math.round(n.height))
      if (
        ws.length > 1 &&
        (Math.max(...ws) - Math.min(...ws) > 2 || Math.max(...hs) - Math.min(...hs) > 2)
      ) {
        report.spreadIssues.push(
          `${field}: halves are ${ws[0]}×${hs[0]} vs ${ws[1]}×${hs[1]} — resize to match for a seamless spread`
        )
      }
    }
  }

  for (const key of Object.keys(values)) {
    if (values[key]?.trim() && !idx.fields[key]) report.valueNoNodes.push(key)
  }

  if (dead.length) {
    patchIndex(dead, null, null)
    report.deadHealed = dead.length
  }
  return report
}
