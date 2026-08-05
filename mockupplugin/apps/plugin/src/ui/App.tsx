import { useState } from 'react';
import { useSandbox } from './useSandbox.js';
import { SettingsPanel } from './panels/SettingsPanel.js';
import { LibraryPanel } from './panels/LibraryPanel.js';
import { RenderPanel } from './panels/RenderPanel.js';

type Tab = 'library' | 'render' | 'settings';

export function App() {
  const { state, api } = useSandbox();
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="app">
      <header className="topbar">
        <h1>Mockup Forge</h1>
        <span className="spacer" />
        <span className="badge">
          <span className={`dot ${state.ready ? 'ok' : ''}`} />
          {state.ready ? 'Canvas connected' : 'Connecting…'}
        </span>
      </header>

      <nav className="tabs" role="tablist">
        {(
          [
            ['library', 'Library'],
            ['render', `Render${state.targets.length ? ` (${state.targets.length})` : ''}`],
            ['settings', 'Settings'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className="tab"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="body">
        {state.lastError ? (
          <div className="notice error stack" style={{ marginBottom: 10 }}>
            <strong>{state.lastError.code}</strong>
            <span>{state.lastError.message}</span>
            <button className="secondary" onClick={api.clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        {tab === 'library' ? <LibraryPanel state={state} api={api} /> : null}
        {tab === 'render' ? <RenderPanel state={state} api={api} /> : null}
        {tab === 'settings' ? <SettingsPanel state={state} api={api} /> : null}
      </div>
    </div>
  );
}
