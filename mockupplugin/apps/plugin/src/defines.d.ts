/**
 * Compile-time defines injected by both bundlers (vite for the UI, esbuild for
 * the sandbox). Empty string in dev builds; the production origin in
 * `build:prod`.
 */
declare const __MF_API_BASE__: string;
