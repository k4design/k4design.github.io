import {
  MAX_STORED_CLIP_BYTES,
  MAX_STORED_TOTAL_BYTES,
  StoredClipMetaSchema,
  type StoredClipMeta,
} from '@mf/shared';

/**
 * Persisted rendered clips.
 *
 * clientStorage is the only storage a plugin has that survives restarts, and
 * it is per-user, per-plugin — the right scope for "my rendered previews".
 * It is NOT document data: clips do not travel with a shared Figma file, and
 * that is deliberate (pluginData entries are capped far below video size, and
 * silently bloating a team file with MP4s would be hostile).
 *
 * Layout: one index key with metadata for everything, one key per clip's
 * bytes. The index is what the UI lists; bytes are fetched lazily on play.
 */

const INDEX_KEY = 'mf:clips';
const clipKey = (id: string) => `mf:clip:${id}`;

async function readIndex(): Promise<StoredClipMeta[]> {
  try {
    const raw = await figma.clientStorage.getAsync(INDEX_KEY);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => StoredClipMetaSchema.safeParse(entry))
      .filter((r): r is { success: true; data: StoredClipMeta } => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
}

async function writeIndex(index: StoredClipMeta[]): Promise<void> {
  await figma.clientStorage.setAsync(INDEX_KEY, index);
}

export async function listClips(): Promise<{ clips: StoredClipMeta[]; storedBytes: number }> {
  const clips = await readIndex();
  return {
    clips: [...clips].sort((a, b) => b.createdAt - a.createdAt),
    storedBytes: clips.reduce((sum, clip) => sum + clip.bytes, 0),
  };
}

export async function saveClip(
  meta: StoredClipMeta,
  mp4Base64: string,
): Promise<{ ok: boolean; message?: string }> {
  if (meta.bytes > MAX_STORED_CLIP_BYTES) {
    return {
      ok: false,
      message: `This clip is ${(meta.bytes / 1024 / 1024).toFixed(1)} MB — over the ${
        MAX_STORED_CLIP_BYTES / 1024 / 1024
      } MB per-clip limit, so it stays for this session only.`,
    };
  }

  const index = await readIndex();
  const others = index.filter((clip) => clip.id !== meta.id);
  const total = others.reduce((sum, clip) => sum + clip.bytes, 0) + meta.bytes;
  if (total > MAX_STORED_TOTAL_BYTES) {
    return {
      ok: false,
      message: `Saving this clip would exceed the ${
        MAX_STORED_TOTAL_BYTES / 1024 / 1024
      } MB storage budget. Delete an older clip first.`,
    };
  }

  try {
    await figma.clientStorage.setAsync(clipKey(meta.id), mp4Base64);
    await writeIndex([...others, meta]);
    return { ok: true };
  } catch (err) {
    // clientStorage can refuse for its own reasons (quota, serialization);
    // the clip still lives in the UI's session gallery, so this is a demotion,
    // not a failure.
    return { ok: false, message: `Figma refused to store the clip: ${(err as Error).message}` };
  }
}

export async function loadClip(id: string): Promise<string | null> {
  try {
    const raw = await figma.clientStorage.getAsync(clipKey(id));
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export async function deleteClip(id: string): Promise<void> {
  const index = await readIndex();
  await figma.clientStorage.deleteAsync(clipKey(id));
  await writeIndex(index.filter((clip) => clip.id !== id));
}
