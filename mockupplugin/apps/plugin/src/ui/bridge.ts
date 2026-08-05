import { SandboxToUiSchema, UiToSandboxSchema, type SandboxToUi, type UiToSandbox } from '@mf/shared';

/**
 * Typed postMessage bridge on the iframe side. Figma wraps plugin messages as
 * `{ pluginMessage }`, and the iframe also receives unrelated window messages,
 * so anything that fails validation is ignored rather than surfaced.
 */
export function post(message: UiToSandbox): void {
  const parsed = UiToSandboxSchema.safeParse(message);
  if (!parsed.success) {
    console.error('[MF] refusing to post malformed message', parsed.error.issues);
    return;
  }
  parent.postMessage({ pluginMessage: parsed.data }, '*');
}

export function subscribe(handler: (message: SandboxToUi) => void): () => void {
  const listener = (event: MessageEvent) => {
    const payload = (event.data as { pluginMessage?: unknown } | null)?.pluginMessage;
    if (payload === undefined) return;
    const parsed = SandboxToUiSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn('[MF] ignored unreadable sandbox message', parsed.error.issues, payload);
      return;
    }
    handler(parsed.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function notify(message: string, error = false): void {
  post({ type: 'notify', message, error });
}
