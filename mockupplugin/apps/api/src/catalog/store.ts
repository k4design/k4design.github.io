import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MockupItemSchema,
  colorizeOf,
  surfacesOf,
  type CatalogItem,
  type CatalogQuery,
  type CatalogResponse,
  type ItemDetail,
  type MockupItem,
} from '@mf/shared';
import { config, ITEMS_DIR } from '../config.js';
import { notFound } from '../errors.js';

export interface CatalogEntry {
  item: MockupItem;
  /** Absolute directory holding this item's assets. */
  dir: string;
}

/**
 * The catalog is a directory of self-contained item packages:
 *
 *   assets/items/<item-id>/item.json
 *   assets/items/<item-id>/base.png, mask.png, ...
 *
 * It is loaded once at boot and held in memory. Items are immutable at
 * runtime, so there is no invalidation to get wrong; a deploy ships a new
 * catalog. `reload()` exists for tests and the seed script.
 */
class CatalogStore {
  private entries = new Map<string, CatalogEntry>();
  private order: string[] = [];
  private loaded = false;

  get size(): number {
    return this.entries.size;
  }

  async ready(): Promise<void> {
    if (!this.loaded) await this.reload();
  }

  async reload(): Promise<{ loaded: number; errors: string[] }> {
    const errors: string[] = [];
    const next = new Map<string, CatalogEntry>();

    let dirents: string[] = [];
    try {
      const found = await fs.readdir(ITEMS_DIR, { withFileTypes: true });
      dirents = found.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch (err) {
      // A missing items directory is a valid empty catalog — the plugin still
      // loads, it just has nothing to show until the seed script runs.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    for (const name of dirents.sort()) {
      const dir = path.join(ITEMS_DIR, name);
      const jsonPath = path.join(dir, 'item.json');
      try {
        const raw = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as unknown;
        const item = MockupItemSchema.parse(raw);
        if (item.id !== name) {
          errors.push(`${name}: item.json id "${item.id}" does not match its directory name`);
          continue;
        }
        if (next.has(item.id)) {
          errors.push(`${item.id}: duplicate item id`);
          continue;
        }
        next.set(item.id, { item, dir });
      } catch (err) {
        errors.push(`${name}: ${(err as Error).message}`);
      }
    }

    this.entries = next;
    this.order = [...next.keys()];
    this.loaded = true;
    return { loaded: next.size, errors };
  }

  entry(id: string): CatalogEntry {
    const found = this.entries.get(id);
    if (!found) throw notFound(`No mockup item with id "${id}"`);
    return found;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  all(): CatalogEntry[] {
    return this.order.map((id) => this.entries.get(id)!);
  }

  /** Absolute path to an asset declared in an item's layers. */
  assetPath(id: string, src: string): string {
    const { dir } = this.entry(id);
    const resolved = path.resolve(dir, src);
    // Item JSON is authored data, not user input, but a traversal here would
    // read arbitrary files off disk — cheap to rule out entirely.
    if (resolved !== dir && !resolved.startsWith(dir + path.sep)) {
      throw new Error(`asset "${src}" escapes item directory for ${id}`);
    }
    return resolved;
  }

  assetUrl(id: string, src: string): string {
    return `${config.assetBaseUrl}/items/${encodeURIComponent(id)}/${src
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }

  toCatalogItem(entry: CatalogEntry): CatalogItem {
    const { item } = entry;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      viewpoint: item.viewpoint,
      tags: item.tags,
      canvas: item.canvas,
      thumbnailUrl: this.assetUrl(item.id, item.thumbnail),
      surfaceCount: surfacesOf(item).length,
    };
  }

  toItemDetail(entry: CatalogEntry): ItemDetail {
    const { item } = entry;
    return {
      ...this.toCatalogItem(entry),
      previewUrl: this.assetUrl(item.id, item.preview),
      surfaces: surfacesOf(item).map((s) => ({
        id: s.id,
        ...(s.label === undefined ? {} : { label: s.label }),
        placeholder: s.placeholder,
        warpKind: s.warp.kind,
      })),
      colorize: colorizeOf(item).map((c) => ({
        id: c.id,
        ...(c.label === undefined ? {} : { label: c.label }),
        default: c.default,
      })),
    };
  }

  query(q: CatalogQuery): CatalogResponse {
    const needle = q.q?.trim().toLowerCase();
    let matches = this.all();

    if (q.category) matches = matches.filter((e) => e.item.category === q.category);
    if (q.viewpoint) matches = matches.filter((e) => e.item.viewpoint === q.viewpoint);
    if (needle) {
      matches = matches.filter((e) => {
        const haystack = [e.item.name, e.item.id, ...e.item.tags].join(' ').toLowerCase();
        return needle.split(/\s+/).every((word) => haystack.includes(word));
      });
    }

    const offset = decodeCursor(q.cursor);
    const page = matches.slice(offset, offset + q.limit);
    const nextOffset = offset + page.length;

    return {
      items: page.map((e) => this.toCatalogItem(e)),
      nextCursor: nextOffset < matches.length ? encodeCursor(nextOffset) : null,
      total: matches.length,
    };
  }
}

/**
 * Offset cursors are adequate here: the catalog is a static, deploy-time
 * ordered list, so pages cannot shift under a paginating client.
 */
function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const match = /^o:(\d+)$/.exec(decoded);
    if (!match?.[1]) return 0;
    return Math.max(0, Number.parseInt(match[1], 10));
  } catch {
    return 0;
  }
}

export const catalog = new CatalogStore();
