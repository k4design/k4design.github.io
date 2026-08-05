import { useEffect, useState, useSyncExternalStore } from 'react';
import { MAX_STORED_TOTAL_BYTES } from '@mf/shared';
import { post } from '../bridge.js';
import type { useSandbox } from '../useSandbox.js';
import { clipGallery } from './gallery.js';

type Api = ReturnType<typeof useSandbox>['api'];

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/**
 * Rendered clips, kept until deleted.
 *
 * Session clips play immediately from their in-memory blob; clips persisted to
 * clientStorage from an earlier plugin run list from metadata and fetch their
 * bytes lazily the first time they are played.
 */
export function ClipGallery({ api }: { api: Api }) {
  const clips = useSyncExternalStore(clipGallery.subscribe, clipGallery.all);
  const [openId, setOpenId] = useState<string | null>(null);

  // Wire sandbox responses into the store, and ask for the persisted index
  // once. The listener stays for the panel's lifetime so saves and deletes
  // initiated anywhere keep the list honest.
  useEffect(() => {
    const off = api.on((message) => {
      switch (message.type) {
        case 'clip-list-result':
          clipGallery.applyList(message.clips, message.storedBytes);
          break;
        case 'clip-save-result':
          clipGallery.saveResult(message.id, message.ok, message.message);
          break;
        case 'clip-loaded':
          clipGallery.loaded(message.id, message.mp4);
          break;
        default:
          break;
      }
    });
    post({ type: 'clip-list' });
    return off;
  }, [api]);

  if (clips.length === 0) return null;

  function play(id: string) {
    const entry = clips.find((c) => c.meta.id === id);
    if (!entry) return;
    setOpenId(openId === id ? null : id);
    if (!entry.url && !entry.loading) {
      clipGallery.markLoading(id);
      post({ type: 'clip-load', id });
    }
  }

  function remove(id: string) {
    clipGallery.remove(id);
    post({ type: 'clip-delete', id });
    if (openId === id) setOpenId(null);
  }

  return (
    <div className="card">
      <div className="row">
        <strong>Rendered clips</strong>
        <span className="spacer" />
        <span className="muted mono">
          {mb(clipGallery.storedBytes())}/{mb(MAX_STORED_TOTAL_BYTES)} MB saved
        </span>
      </div>

      {clips.map((entry) => (
        <div key={entry.meta.id} className="stack" style={{ gap: 6 }}>
          <div className="row">
            <div style={{ minWidth: 0 }}>
              <div
                style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {entry.meta.name}
              </div>
              <span className="muted mono">
                {entry.meta.seconds.toFixed(1)}s · {entry.meta.fps}fps · {entry.meta.width}×
                {entry.meta.height} · {mb(entry.meta.bytes)} MB
                {entry.persisted ? '' : ' · session only'}
              </span>
            </div>
            <span className="spacer" />
            <button className="secondary" onClick={() => play(entry.meta.id)}>
              {openId === entry.meta.id ? 'Hide' : 'Play'}
            </button>
            {entry.url ? (
              <a href={entry.url} download={`${entry.meta.name.replace(/[^\w-]+/g, '-')}.mp4`}>
                <button className="secondary">Save</button>
              </a>
            ) : null}
            <button
              className="secondary"
              title="Remove this clip permanently"
              onClick={() => remove(entry.meta.id)}
            >
              Delete
            </button>
          </div>

          {entry.note ? <span className="notice warn">{entry.note}</span> : null}

          {openId === entry.meta.id ? (
            entry.url ? (
              <video
                src={entry.url}
                controls
                loop
                autoPlay
                muted
                playsInline
                style={{ width: '100%', borderRadius: 6, background: '#000' }}
              />
            ) : (
              <span className="muted">{entry.loading ? 'Loading stored clip…' : 'Unavailable.'}</span>
            )
          ) : null}
        </div>
      ))}
    </div>
  );
}
