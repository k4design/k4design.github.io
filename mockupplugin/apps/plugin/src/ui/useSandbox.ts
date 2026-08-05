import { useEffect, useMemo, useRef, useState } from 'react';
import type { PluginConfig, RenderTarget, SandboxToUi } from '@mf/shared';
import { post, subscribe } from './bridge.js';

export interface SandboxState {
  ready: boolean;
  config: PluginConfig | null;
  targets: RenderTarget[];
  foreignCount: number;
  lastError: { code: string; message: string } | null;
}

type Listener = (message: SandboxToUi) => void;

/**
 * Single subscription to the sandbox, shared by the whole UI. Ad-hoc
 * per-component listeners are registered through `on` so we never end up with
 * competing `window.onmessage` handlers.
 */
export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    ready: false,
    config: null,
    targets: [],
    foreignCount: 0,
    lastError: null,
  });

  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      switch (message.type) {
        case 'sandbox-ready':
          setState((s) => ({ ...s, ready: true, config: message.config }));
          break;
        case 'config':
          setState((s) => ({ ...s, config: message.config }));
          break;
        case 'selection-changed':
          setState((s) => ({
            ...s,
            targets: message.targets,
            foreignCount: message.foreignCount,
          }));
          break;
        case 'sandbox-error':
          setState((s) => ({ ...s, lastError: { code: message.code, message: message.message } }));
          break;
        default:
          break;
      }
      for (const listener of listeners.current) listener(message);
    });

    post({ type: 'ui-ready' });
    return unsubscribe;
  }, []);

  const api = useMemo(
    () => ({
      on(listener: Listener): () => void {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      /** Wait for the first message matching `match`, or reject on timeout. */
      once<T extends SandboxToUi['type']>(
        type: T,
        match: (m: Extract<SandboxToUi, { type: T }>) => boolean,
        timeoutMs = 30_000,
      ): Promise<Extract<SandboxToUi, { type: T }>> {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            off();
            reject(new Error(`Timed out waiting for ${type} from the canvas.`));
          }, timeoutMs);
          const off = this.on((message) => {
            if (message.type !== type) return;
            const candidate = message as Extract<SandboxToUi, { type: T }>;
            if (!match(candidate)) return;
            clearTimeout(timer);
            off();
            resolve(candidate);
          });
        });
      },
      setConfig(patch: Partial<PluginConfig>) {
        post({ type: 'set-config', config: patch });
      },
      refreshSelection() {
        post({ type: 'refresh-selection' });
      },
      clearError() {
        setState((s) => ({ ...s, lastError: null }));
      },
    }),
    [],
  );

  return { state, api };
}
