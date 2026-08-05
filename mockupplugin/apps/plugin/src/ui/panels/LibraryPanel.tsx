import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES,
  VIEWPOINTS,
  type CatalogItem,
  type Category,
  type Viewpoint,
} from '@mf/shared';
import type { useSandbox } from '../useSandbox.js';
import { post } from '../bridge.js';
import { ApiClientError, fetchAssetBase64, fetchCatalog, fetchItem } from '../api.js';

type Bridge = ReturnType<typeof useSandbox>;

const PAGE_SIZE = 18;

interface Filters {
  q: string;
  category: Category | '';
  viewpoint: Viewpoint | '';
}

export function LibraryPanel({ state }: { state: Bridge['state']; api: Bridge['api'] }) {
  const apiBase = state.config?.apiBase ?? null;
  const [filters, setFilters] = useState<Filters>({ q: '', category: '', viewpoint: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  // Debounce typing so each keystroke does not fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q.trim()), 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const query = useMemo(
    () => ({
      ...(debouncedQ ? { q: debouncedQ } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.viewpoint ? { viewpoint: filters.viewpoint } : {}),
      limit: PAGE_SIZE,
    }),
    [debouncedQ, filters.category, filters.viewpoint],
  );

  /** Latest request wins — a slow first page must not overwrite a newer one. */
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: 'replace' | 'append') => {
      if (!apiBase) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const page = await fetchCatalog(apiBase, {
          ...query,
          ...(mode === 'append' && cursor ? { cursor } : {}),
        });
        if (id !== requestId.current) return;
        setItems((prev) => (mode === 'append' ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setTotal(page.total);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Could not load the mockup library. Check the render service URL in Settings.',
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [apiBase, query, cursor],
  );

  // Filters changed — start a fresh page.
  useEffect(() => {
    setCursor(null);
    void load('replace');
    // `load` closes over `cursor`, which we deliberately ignore here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, query]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void load('append');
      },
      { rootMargin: '160px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loading, load]);

  async function importItem(item: CatalogItem) {
    if (!apiBase || importing) return;
    setImporting(item.id);
    try {
      const detail = await fetchItem(apiBase, item.id);
      // The sandbox has no fetch, so the iframe pulls the preview bytes and
      // hands them over as base64.
      const preview = await fetchAssetBase64(detail.previewUrl);
      post({ type: 'import-item', detail, preview });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Could not import ${item.name}.`);
    } finally {
      setImporting(null);
    }
  }

  if (!apiBase) return <div className="empty">Connecting to the canvas…</div>;

  return (
    <div className="stack">
      <input
        type="text"
        placeholder="Search mockups…"
        value={filters.q}
        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
      />

      <div className="row">
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as Category | '' }))}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </select>
        <select
          value={filters.viewpoint}
          onChange={(e) =>
            setFilters((f) => ({ ...f, viewpoint: e.target.value as Viewpoint | '' }))
          }
        >
          <option value="">All viewpoints</option>
          {VIEWPOINTS.map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      {items.length === 0 && !loading && !error ? (
        <div className="empty">
          <strong>No mockups match</strong>
          <span>Try a different search or clear the filters.</span>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <span className="muted">
            {total} mockup{total === 1 ? '' : 's'}
          </span>
          <div className="grid">
            {items.map((item) => (
              <button
                key={item.id}
                className="tile"
                disabled={importing !== null}
                onClick={() => void importItem(item)}
                title={`${item.name} — ${label(item.category)}, ${label(item.viewpoint)}`}
              >
                <span className="tile-image">
                  <img src={item.thumbnailUrl} alt="" loading="lazy" />
                  {importing === item.id ? <span className="tile-busy">Importing…</span> : null}
                </span>
                <span className="tile-name">{item.name}</span>
                <span className="tile-meta">
                  {label(item.category)}
                  {item.surfaceCount > 1 ? ` · ${item.surfaceCount} surfaces` : ''}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div ref={sentinel} />
      {loading ? <div className="muted">Loading…</div> : null}
    </div>
  );
}

function label(value: string): string {
  return value.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
