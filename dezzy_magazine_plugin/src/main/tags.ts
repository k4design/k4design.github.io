import {
  INDEX_KEY,
  IndexEntry,
  NS,
  TAG_KEY,
  TEMPLATE_FIELD,
  Tag,
  TagIndex,
  templateFields,
} from '../shared/types'

export function readTag(node: BaseNode): Tag | null {
  const raw = node.getSharedPluginData(NS, TAG_KEY)
  if (!raw) return null
  try {
    const tag = JSON.parse(raw) as Tag
    return tag && tag.field ? tag : null
  } catch {
    return null
  }
}

export function writeTag(node: BaseNode, tag: Tag): void {
  node.setSharedPluginData(NS, TAG_KEY, JSON.stringify(tag))
}

export function clearTag(node: BaseNode): void {
  node.setSharedPluginData(NS, TAG_KEY, '')
}

/**
 * Strip every Dezzy tag from the current page and reset the index. Entered
 * content and uploaded photos (stored on figma.root) are untouched — only the
 * per-node tags and the field index go away.
 */
export function clearAllTags(): number {
  const tagged = figma.currentPage.findAll((n) => !!n.getSharedPluginData(NS, TAG_KEY))
  for (const node of tagged) clearTag(node)
  saveIndex({ v: 1, page: figma.currentPage.name, fields: {} })
  return tagged.length
}

export function loadIndex(): TagIndex | null {
  const raw = figma.root.getSharedPluginData(NS, INDEX_KEY)
  if (!raw) return null
  try {
    const idx = JSON.parse(raw) as TagIndex
    return idx && idx.fields ? idx : null
  } catch {
    return null
  }
}

export function saveIndex(idx: TagIndex): void {
  figma.root.setSharedPluginData(NS, INDEX_KEY, JSON.stringify(idx))
}

export function scanTagged(): { node: BaseNode; tag: Tag }[] {
  const out: { node: BaseNode; tag: Tag }[] = []
  const tagged = figma.currentPage.findAll((n) => !!n.getSharedPluginData(NS, TAG_KEY))
  for (const node of tagged) {
    const tag = readTag(node)
    if (tag) out.push({ node, tag })
  }
  return out
}

function buildIndex(tagged: { node: BaseNode; tag: Tag }[]): TagIndex {
  const idx: TagIndex = { v: 1, page: figma.currentPage.name, fields: {}, templateCounts: {} }
  for (const { node, tag } of tagged) {
    // Template nodes index under TEMPLATE_FIELD only (so apply can find them);
    // their token fields feed content-form counts, not the id lists.
    if (tag.kind === 'text' && tag.options?.template) {
      const entry = (idx.fields[TEMPLATE_FIELD] ??= { kind: 'text', ids: [] })
      entry.ids.push(node.id)
      for (const f of templateFields(tag.options.template)) {
        idx.templateCounts![f] = (idx.templateCounts![f] ?? 0) + 1
      }
      continue
    }
    const entry = (idx.fields[tag.field] ??= { kind: tag.kind, ids: [] })
    entry.ids.push(node.id)
  }
  return idx
}

/**
 * Full scan of the current page for tagged nodes. This is the only
 * whole-page traversal in the plugin — everything else works off the
 * cached index so a 120-page magazine is never re-walked per operation.
 */
export function rebuildIndex(): TagIndex {
  const idx = buildIndex(scanTagged())
  saveIndex(idx)
  return idx
}

/**
 * rebuildIndex plus component→instance propagation: a tag set on a layer
 * inside a main component is inherited by the matching layer of every
 * instance on the page. Instance sublayer ids are deterministic
 * (`I<instanceId>;<componentChildId>`), so we derive and verify them rather
 * than relying on plugin data being readable through the instance.
 */
export async function rebuildIndexFull(): Promise<TagIndex> {
  const tagged = scanTagged()
  const idx = buildIndex(tagged)

  // field/kind of tagged layers per enclosing main component.
  const compTagged = new Map<string, { field: string; kind: Tag['kind']; childId: string }[]>()
  for (const { node, tag } of tagged) {
    let parent: BaseNode | null = node.parent
    let componentId: string | null = null
    while (parent && parent.type !== 'PAGE') {
      if (parent.type === 'COMPONENT') componentId = parent.id
      parent = parent.parent
    }
    if (!componentId) continue
    const list = compTagged.get(componentId) ?? []
    list.push({ field: tag.field, kind: tag.kind, childId: node.id })
    compTagged.set(componentId, list)
  }

  if (compTagged.size) {
    const instances = figma.currentPage.findAllWithCriteria({ types: ['INSTANCE'] })
    for (const inst of instances) {
      const main = await inst.getMainComponentAsync()
      const list = main && compTagged.get(main.id)
      if (!list) continue
      for (const { field, kind, childId } of list) {
        const derivedId = `I${inst.id};${childId}`
        const node = await figma.getNodeByIdAsync(derivedId)
        if (!node || node.removed) continue
        const entry = (idx.fields[field] ??= { kind, ids: [] })
        if (!entry.ids.includes(derivedId)) entry.ids.push(derivedId)
      }
    }
  }

  saveIndex(idx)
  return idx
}

/**
 * Incremental index update after tagging/untagging a handful of nodes —
 * avoids a full page scan on every assign. Pass field=null to untag.
 */
export function patchIndex(nodeIds: string[], field: string | null, tag: Tag | null): TagIndex {
  const idx = loadIndex() ?? { v: 1 as const, page: figma.currentPage.name, fields: {} }
  const removing = new Set(nodeIds)
  for (const key of Object.keys(idx.fields)) {
    const entry = idx.fields[key]
    entry.ids = entry.ids.filter((id) => !removing.has(id))
    if (entry.ids.length === 0) delete idx.fields[key]
  }
  if (field && tag) {
    const entry = (idx.fields[field] ??= { kind: tag.kind, ids: [] })
    entry.kind = tag.kind
    entry.ids.push(...nodeIds)
  }
  saveIndex(idx)
  return idx
}

export function indexSummary(idx: TagIndex | null): IndexEntry[] {
  if (!idx) return []
  return Object.keys(idx.fields)
    .sort()
    .map((field) => ({
      field,
      kind: idx.fields[field].kind,
      count: idx.fields[field].ids.length,
      spread: idx.fields[field].kind === 'image' && idx.fields[field].ids.length > 1,
    }))
}

export function countTaggedNodes(idx: TagIndex | null): number {
  if (!idx) return 0
  let n = 0
  for (const key of Object.keys(idx.fields)) n += idx.fields[key].ids.length
  return n
}
