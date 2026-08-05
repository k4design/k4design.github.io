import type { useSandbox } from '../useSandbox.js';

type Bridge = ReturnType<typeof useSandbox>;

/** Real render controls arrive in milestone 4. */
export function RenderPanel({ state }: { state: Bridge['state']; api: Bridge['api'] }) {
  if (state.targets.length === 0) {
    return (
      <div className="empty">
        <strong>Nothing selected</strong>
        <span>
          Select a mockup or one of its design frames on the canvas.
          {state.foreignCount > 0
            ? ` (${state.foreignCount} selected node${state.foreignCount === 1 ? '' : 's'} ${
                state.foreignCount === 1 ? 'is' : 'are'
              } not from Mockup Forge.)`
            : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="stack">
      {state.targets.map((t) => (
        <div key={t.instanceGuid} className="notice">
          {t.itemName} — {t.surfaces.length} surface{t.surfaces.length === 1 ? '' : 's'}
        </div>
      ))}
    </div>
  );
}
