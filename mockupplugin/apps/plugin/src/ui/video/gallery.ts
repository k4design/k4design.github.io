import type { StoredClipMeta } from '@mf/shared';

/**
 * The clip gallery's backing store.
 *
 * Deliberately a module singleton, not React state: the Render panel unmounts
 * whenever the user switches tabs or changes selection, and a rendered clip
 * must outlive that. React components subscribe for re-renders; the data
 * lives here for the whole plugin session.
 *
 * Persistence is layered on top: clips that fit the quota are also written to
 * clientStorage via the sandbox, and their bytes are fetched back lazily on
 * play after a plugin restart.
 */

export interface ClipEntry {
  meta: StoredClipMeta;
  /** Blob URL when the bytes are in memory this session; null until loaded. */
  url: string | null;
  /** True once clientStorage accepted the clip. */
  persisted: boolean;
  /** Why persistence was declined, when it was. */
  note?: string;
  /** A clip-load has been posted and not yet answered. */
  loading?: boolean;
}

type Listener = () => void;

const entries = new Map<string, ClipEntry>();
const listeners = new Set<Listener>();
let storedBytes = 0;
/**
 * Cached snapshot for useSyncExternalStore: getSnapshot must return the same
 * reference until the store actually changes, or React loops forever.
 */
let snapshot: ClipEntry[] | null = null;

function notify(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export const clipGallery = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  all(): ClipEntry[] {
    if (!snapshot) {
      snapshot = [...entries.values()].sort((a, b) => b.meta.createdAt - a.meta.createdAt);
    }
    return snapshot;
  },

  storedBytes(): number {
    return storedBytes;
  },

  /** A clip rendered this session — bytes already in memory. */
  addSession(meta: StoredClipMeta, blob: Blob): void {
    const previous = entries.get(meta.id);
    if (previous?.url) URL.revokeObjectURL(previous.url);
    entries.set(meta.id, { meta, url: URL.createObjectURL(blob), persisted: false });
    notify();
  },

  /** Merge the sandbox's persisted index without dropping session bytes. */
  applyList(clips: StoredClipMeta[], bytes: number): void {
    storedBytes = bytes;
    const persistedIds = new Set(clips.map((clip) => clip.id));
    for (const clip of clips) {
      const existing = entries.get(clip.id);
      if (existing) {
        existing.persisted = true;
        existing.meta = clip;
      } else {
        entries.set(clip.id, { meta: clip, url: null, persisted: true });
      }
    }
    // Entries that only ever existed as persisted clips and are now gone from
    // the index were deleted elsewhere; session-only entries stay regardless.
    for (const [id, entry] of entries) {
      if (!persistedIds.has(id) && entry.url === null) entries.delete(id);
      else if (!persistedIds.has(id)) entry.persisted = false;
    }
    notify();
  },

  saveResult(id: string, ok: boolean, message?: string): void {
    const entry = entries.get(id);
    if (!entry) return;
    entry.persisted = ok;
    if (message !== undefined) entry.note = message;
    notify();
  },

  markLoading(id: string): void {
    const entry = entries.get(id);
    if (!entry || entry.url || entry.loading) return;
    entry.loading = true;
    notify();
  },

  /** Bytes arrived from clientStorage for a persisted clip. */
  loaded(id: string, mp4Base64: string | null): void {
    const entry = entries.get(id);
    if (!entry) return;
    entry.loading = false;
    if (mp4Base64) {
      // Native base64 decode — the atob + per-char callback alternative is
      // ~20x slower and these blobs run to megabytes.
      void fetch(`data:video/mp4;base64,${mp4Base64}`)
        .then((response) => response.blob())
        .then((blob) => {
          entry.url = URL.createObjectURL(blob);
          notify();
        });
    } else {
      entry.note = 'The stored clip could not be read back; it may have been evicted.';
    }
    notify();
  },

  remove(id: string): void {
    const entry = entries.get(id);
    if (entry?.url) URL.revokeObjectURL(entry.url);
    entries.delete(id);
    notify();
  },
};
