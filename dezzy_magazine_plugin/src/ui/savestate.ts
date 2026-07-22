import { unzipSync, zipSync } from 'fflate'

// ------------------------------------------------------------------- CSV

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n'
}

/** RFC-4180-ish parser: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur)
      cur = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      cur += c
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }
  return rows
}

/** Two-column CSV -> record, skipping a `field,...` header row if present. */
export function recordFromCsv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of parseCsv(text)) {
    if (row.length < 2) continue
    const key = row[0].trim()
    if (!key || key.toLowerCase() === 'field') continue
    out[key] = row[1]
  }
  return out
}

// ------------------------------------------------------------------- ZIP

export function buildZip(entries: Record<string, Uint8Array>): Uint8Array {
  // Level 0: the payload is almost entirely JPEGs — recompressing wastes time.
  return zipSync(entries, { level: 0 })
}

export function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes)
}

// ----------------------------------------------------------------- Files

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp)$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXT_RE.test(path)
}

function sniffExt(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'gif'
  if (bytes[8] === 0x57 && bytes[9] === 0x45) return 'webp'
  return 'jpg'
}

/** Make sure an exported image filename carries a real extension. */
export function ensureExt(name: string, bytes: Uint8Array): string {
  return IMAGE_EXT_RE.test(name) ? name : `${name}.${sniffExt(bytes)}`
}

export function mimeFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

export function downloadBlob(name: string, data: Uint8Array, mime: string): void {
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}
