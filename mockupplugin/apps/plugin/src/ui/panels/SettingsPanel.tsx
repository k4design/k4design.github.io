import { useEffect, useState } from 'react';
import type { HealthResponse } from '@mf/shared';
import type { useSandbox } from '../useSandbox.js';
import { health } from '../api.js';

type Bridge = ReturnType<typeof useSandbox>;

/**
 * Production builds compile the service origin in and the manifest allows only
 * that origin, so a URL field would just be a way to break the plugin. Dev
 * builds keep it for pointing at local or staging services.
 */
const DEV_BUILD = __MF_API_BASE__ === '';

export function SettingsPanel({ state, api }: { state: Bridge['state']; api: Bridge['api'] }) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; health: HealthResponse } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  useEffect(() => {
    if (state.config) setDraft(state.config.apiBase);
  }, [state.config?.apiBase]);

  async function check(base: string) {
    setStatus({ kind: 'checking' });
    try {
      setStatus({ kind: 'ok', health: await health(base) });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  }

  useEffect(() => {
    if (state.config?.apiBase) void check(state.config.apiBase);
  }, [state.config?.apiBase]);

  const valid = /^https?:\/\/.+/.test(draft.trim());

  return (
    <div className="stack">
      {DEV_BUILD ? (
        <>
          <label className="field">
            Render service URL
            <input
              type="url"
              value={draft}
              spellCheck={false}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="http://localhost:8787"
            />
          </label>
          <p className="muted">
            The URL must also be listed in the plugin’s <span className="mono">manifest.json</span>{' '}
            under <span className="mono">networkAccess.allowedDomains</span> — Figma blocks any
            other origin.
          </p>

          <div className="row">
            <button
              className="primary"
              disabled={!valid || draft.trim() === state.config?.apiBase}
              onClick={() => api.setConfig({ apiBase: draft.trim() })}
            >
              Save
            </button>
            <button
              className="secondary"
              disabled={!valid}
              onClick={() => void check(draft.trim())}
            >
              Test connection
            </button>
          </div>
        </>
      ) : null}

      {status.kind === 'checking' ? <div className="notice">Checking…</div> : null}
      {status.kind === 'error' ? <div className="notice error">{status.message}</div> : null}
      {status.kind === 'ok' ? (
        <div className="notice stack">
          <span>
            Connected — v{status.health.version}, {status.health.items} mockup
            {status.health.items === 1 ? '' : 's'} in the catalogue.
          </span>
          <span className="muted">
            Video rendering: {status.health.features.video ? 'enabled' : 'disabled'}
          </span>
        </div>
      ) : null}

      <hr style={{ border: 0, borderTop: '1px solid var(--mf-border)', margin: '4px 0' }} />

      <label className="field">
        Render width override (px)
        <input
          type="number"
          min={256}
          max={8192}
          step={64}
          value={state.config?.outputWidth ?? ''}
          placeholder="Full item resolution"
          onChange={(e) => {
            const raw = e.target.value.trim();
            api.setConfig({ outputWidth: raw === '' ? null : Number(raw) });
          }}
        />
      </label>
      <p className="muted">
        Leave empty to render at the mockup’s native resolution. Lower values render faster while
        you iterate.
      </p>
    </div>
  );
}
