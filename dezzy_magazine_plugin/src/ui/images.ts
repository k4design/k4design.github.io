/** Figma rejects images with either dimension above 4096px. */
const MAX_DIM = 4096
/** Long edge of gallery thumbnails. */
const THUMB_DIM = 160
/** Formats figma.createImage accepts as-is — anything else gets re-encoded. */
const PASSTHROUGH_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif'])

export interface ProcessedImage {
  bytes: Uint8Array
  width: number
  height: number
  /** Object URL of a small JPEG thumbnail for the gallery. */
  thumb: string
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas.convertToBlob({ type: 'image/jpeg', quality })
}

/**
 * Decode one photo, downscale only if it exceeds Figma's 4096px ceiling
 * (print quality is the point — never recompress an image that already
 * fits), and produce a small thumbnail. The bitmap is closed before
 * returning so peak memory is one decoded image at a time.
 */
export async function processFile(file: File): Promise<ProcessedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`Unsupported or corrupt image: ${file.name}`)
  }
  try {
    const { width, height } = bitmap
    const scale = Math.min(1, MAX_DIM / Math.max(width, height))
    let bytes: Uint8Array
    let outW = width
    let outH = height

    if (scale < 1) {
      outW = Math.round(width * scale)
      outH = Math.round(height * scale)
      const blob = await encode(bitmap, outW, outH, 0.9)
      bytes = new Uint8Array(await blob.arrayBuffer())
    } else if (PASSTHROUGH_TYPES.has(file.type)) {
      bytes = new Uint8Array(await file.arrayBuffer())
    } else {
      // e.g. WebP/AVIF: fits size-wise but Figma can't ingest the format.
      const blob = await encode(bitmap, width, height, 0.92)
      bytes = new Uint8Array(await blob.arrayBuffer())
    }

    const tScale = Math.min(1, THUMB_DIM / Math.max(width, height))
    const tBlob = await encode(
      bitmap,
      Math.max(1, Math.round(width * tScale)),
      Math.max(1, Math.round(height * tScale)),
      0.7
    )
    return { bytes, width: outW, height: outH, thumb: URL.createObjectURL(tBlob) }
  } finally {
    bitmap.close()
  }
}

/**
 * Gallery thumbnail from raw image bytes (used to rebuild previews for
 * library entries restored from a previous session — Figma stores the
 * pixels, we regenerate the 160px preview). Returns an object URL.
 */
export async function makeThumb(bytes: Uint8Array): Promise<string> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]))
  try {
    const scale = Math.min(1, THUMB_DIM / Math.max(bitmap.width, bitmap.height))
    const blob = await encode(
      bitmap,
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
      0.7
    )
    return URL.createObjectURL(blob)
  } finally {
    bitmap.close()
  }
}

/** Natural sort for photographer filenames (IMG_2 before IMG_10). */
export function byFilename<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}
