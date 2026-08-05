import { SandboxToUiSchema, UiToSandboxSchema, type SandboxToUi, type UiToSandbox } from '@mf/shared';

/**
 * Typed, validated postMessage bridge on the sandbox side.
 *
 * Anything arriving from the iframe is untrusted input as far as the sandbox
 * is concerned — it can mutate the user's document — so every inbound message
 * is parsed before a handler ever sees it.
 */
export function send(message: SandboxToUi): void {
  const parsed = SandboxToUiSchema.safeParse(message);
  if (!parsed.success) {
    console.error('[MF] refusing to send malformed message', parsed.error.issues);
    return;
  }
  figma.ui.postMessage(parsed.data);
}

export function sendError(code: string, message: string, jobId?: string): void {
  send({ type: 'sandbox-error', code, message, ...(jobId ? { jobId } : {}) });
}

export function onMessage(handler: (message: UiToSandbox) => void | Promise<void>): void {
  figma.ui.onmessage = (raw: unknown) => {
    const parsed = UiToSandboxSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      console.error('[MF] dropped malformed UI message', detail, raw);
      sendError('bad_message', `The plugin sent an unreadable instruction (${detail}).`);
      return;
    }
    void Promise.resolve(handler(parsed.data)).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[MF] handler failed', err);
      sendError('sandbox_failure', message);
    });
  };
}
