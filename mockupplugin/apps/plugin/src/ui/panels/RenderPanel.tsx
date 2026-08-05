import { useCallback, useMemo, useState } from 'react';
import {
  aspectDrift,
  aspectMatches,
  ASPECT_TOLERANCE,
  type ExportedTarget,
  type RenderTarget,
  type RenderWarning,
} from '@mf/shared';
import type { useSandbox } from '../useSandbox.js';
import { post } from '../bridge.js';
import { ApiClientError, renderItem } from '../api.js';
import { VideoSection } from '../video/VideoSection.js';
import { ClipGallery } from '../video/ClipGallery.js';

type Bridge = ReturnType<typeof useSandbox>;

type Phase = 'idle' | 'exporting' | 'rendering' | 'applying' | 'done' | 'failed';

interface JobState {
  phase: Phase;
  message?: string;
  warnings: RenderWarning[];
  ms?: number;
}

/** Plain-language recovery advice for each failure the server can report. */
function adviceFor(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
  switch (error.code) {
    case 'offline':
      return `${error.message} Open Settings to check the URL.`;
    case 'rate_limited':
      return 'The render service is rate limiting this connection. Wait a moment and try again.';
    case 'render_timeout':
      return 'The render timed out. Lower the render width in Settings and try again.';
    case 'payload_too_large':
      return `${error.message}`;
    case 'not_found':
      return 'That mockup is no longer in the library. Re-import it from the Library tab.';
    default:
      return error.message;
  }
}

export function RenderPanel({ state, api }: { state: Bridge['state']; api: Bridge['api'] }) {
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [busy, setBusy] = useState(false);

  const apiBase = state.config?.apiBase ?? null;
  const outputWidth = state.config?.outputWidth ?? null;

  const setJob = useCallback((guid: string, patch: Partial<JobState>) => {
    setJobs((prev) => ({
      ...prev,
      [guid]: { phase: 'idle', warnings: [], ...prev[guid], ...patch },
    }));
  }, []);

  const run = useCallback(
    async (targets: RenderTarget[]) => {
      if (!apiBase || targets.length === 0 || busy) return;
      setBusy(true);

      const jobId = `job-${Date.now()}`;
      for (const target of targets) {
        setJob(target.instanceGuid, { phase: 'exporting', warnings: [] });
      }

      let exported: ExportedTarget[];
      try {
        // The sandbox owns the canvas, so it does the exporting; the iframe owns
        // the network, so it does the POST. This is that handoff.
        const response = api.once(
          'designs-exported',
          (message) => message.jobId === jobId,
          60_000,
        );
        post({
          type: 'export-designs',
          jobId,
          instanceGuids: targets.map((t) => t.instanceGuid),
        });
        exported = (await response).targets;
      } catch (err) {
        for (const target of targets) {
          setJob(target.instanceGuid, { phase: 'failed', message: adviceFor(err) });
        }
        setBusy(false);
        return;
      }

      // Render sequentially: each is CPU-bound on the server, so firing them all
      // at once only makes every one of them slower and risks the rate limit.
      for (const target of exported) {
        setJob(target.instanceGuid, { phase: 'rendering' });
        try {
          const result = await renderItem(apiBase, {
            itemId: target.itemId,
            designs: target.surfaces.map((surface) => ({
              surfaceId: surface.surfaceId,
              design: surface.design,
              width: surface.width,
              height: surface.height,
            })),
            colorize: target.colorize,
            ...(outputWidth ? { outputWidth } : {}),
            allowAspectDrift: true,
          });

          setJob(target.instanceGuid, {
            phase: 'applying',
            warnings: result.warnings,
            ms: result.ms,
          });

          const applied = api.once(
            'render-applied',
            (message) => message.instanceGuid === target.instanceGuid,
            30_000,
          );
          post({
            type: 'apply-render',
            instanceGuid: target.instanceGuid,
            png: result.png,
            width: result.width,
            height: result.height,
            renderId: result.renderId,
          });
          await applied;

          setJob(target.instanceGuid, { phase: 'done', ms: result.ms });
        } catch (err) {
          setJob(target.instanceGuid, { phase: 'failed', message: adviceFor(err) });
        }
      }

      setBusy(false);
    },
    [apiBase, api, busy, outputWidth, setJob],
  );

  const targets = state.targets;
  const emptyCount = useMemo(
    () => targets.filter((t) => t.surfaces.every((s) => s.looksEmpty)).length,
    [targets],
  );

  if (targets.length === 0) {
    // Rendered clips stay reachable even with nothing selected — that is the
    // point of the gallery.
    return (
      <div className="stack">
        <ClipGallery api={api} />
        <div className="empty">
          <strong>Nothing selected</strong>
          <span>
            Select a mockup on the canvas, or one of its design frames.
            {state.foreignCount > 0
              ? ` ${state.foreignCount} selected layer${state.foreignCount === 1 ? '' : 's'} ${
                  state.foreignCount === 1 ? 'is' : 'are'
                } not part of a mockup.`
              : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <ClipGallery api={api} />
      <div className="row">
        <button className="primary" disabled={busy} onClick={() => void run(targets.slice(0, 1))}>
          {busy ? 'Rendering…' : 'Render selected'}
        </button>
        {targets.length > 1 ? (
          <button className="secondary" disabled={busy} onClick={() => void run(targets)}>
            Render all {targets.length}
          </button>
        ) : null}
        <span className="spacer" />
        <button className="secondary" disabled={busy} onClick={api.refreshSelection}>
          Refresh
        </button>
      </div>

      {emptyCount > 0 ? (
        <div className="notice warn">
          {emptyCount === 1
            ? 'One design frame still looks empty — the render will show the placeholder only.'
            : `${emptyCount} design frames still look empty.`}
        </div>
      ) : null}

      {targets.map((target) => {
        const job = jobs[target.instanceGuid];
        return (
          <div key={target.instanceGuid} className="card">
            <div className="row">
              <strong>{target.itemName}</strong>
              <span className="spacer" />
              <button
                className="secondary"
                onClick={() => post({ type: 'focus-node', nodeId: target.itemNodeId })}
                title="Select this mockup on the canvas"
              >
                Show
              </button>
            </div>

            {target.surfaces.map((surface) => {
              const matches = aspectMatches(surface.aspect, surface.expectedAspect);
              return (
                <div key={surface.surfaceId} className="stack" style={{ gap: 2 }}>
                  <div className="row">
                    <span className="muted">{surface.surfaceId}</span>
                    <span className="spacer" />
                    <span className="mono muted">
                      {surface.width}×{surface.height}
                    </span>
                  </div>
                  {!matches ? (
                    <span className="notice warn">
                      Frame ratio has drifted {Math.round(aspectDrift(surface.aspect, surface.expectedAspect) * 100)}%
                      from this surface (tolerance {Math.round(ASPECT_TOLERANCE * 100)}%). The artwork
                      will be stretched — resize the frame to{' '}
                      {Math.round(surface.width / surface.expectedAspect)}px tall for an exact fit.
                    </span>
                  ) : null}
                  {surface.looksEmpty ? (
                    <span className="muted">Empty — only the placeholder hint is inside.</span>
                  ) : null}
                </div>
              );
            })}

            {Object.keys(target.colorize).length > 0 ? (
              <div className="swatch-row">
                <span className="muted">Colours</span>
                {Object.entries(target.colorize).map(([id, hex]) => (
                  <span key={id} className="swatch" style={{ background: hex }} title={`${id}: ${hex}`} />
                ))}
              </div>
            ) : null}

            {apiBase ? (
              <VideoSection target={target} apiBase={apiBase} outputWidth={outputWidth} />
            ) : null}

            {job && job.phase !== 'idle' ? (
              <>
                <div className="progress">
                  <span style={{ width: `${progressFor(job.phase)}%` }} />
                </div>
                <span className="muted">
                  {job.phase === 'exporting' ? 'Exporting your design…' : null}
                  {job.phase === 'rendering' ? 'Warping and compositing…' : null}
                  {job.phase === 'applying' ? 'Placing the render on canvas…' : null}
                  {job.phase === 'done' ? `Rendered in ${job.ms ?? 0}ms.` : null}
                  {job.phase === 'failed' ? null : null}
                </span>
                {job.phase === 'failed' ? <div className="notice error">{job.message}</div> : null}
                {job.warnings.map((warning, index) => (
                  <div key={`${warning.code}-${index}`} className="notice warn">
                    {warning.message}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function progressFor(phase: Phase): number {
  switch (phase) {
    case 'exporting':
      return 25;
    case 'rendering':
      return 65;
    case 'applying':
      return 90;
    case 'done':
      return 100;
    default:
      return 0;
  }
}
