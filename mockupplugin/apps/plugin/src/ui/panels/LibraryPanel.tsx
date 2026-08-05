import type { useSandbox } from '../useSandbox.js';

type Bridge = ReturnType<typeof useSandbox>;

/** Real browsing grid arrives in milestone 2. */
export function LibraryPanel({ state }: { state: Bridge['state']; api: Bridge['api'] }) {
  return (
    <div className="empty">
      <strong>Library coming next</strong>
      <span>
        The canvas bridge is live{state.config ? ` and pointed at ${state.config.apiBase}` : ''}.
      </span>
    </div>
  );
}
