import { rename } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Vite emits index.html; the manifest points at dist/ui.html. */
function emitAsUiHtml(): Plugin {
  return {
    name: 'mf:emit-ui-html',
    async closeBundle() {
      const dist = path.resolve(import.meta.dirname, 'dist');
      await rename(path.join(dist, 'index.html'), path.join(dist, 'ui.html'));
    },
  };
}

/**
 * Figma loads the UI from a single local HTML file, so every asset has to be
 * inlined — no code splitting, no separate CSS or JS files.
 */
export default defineConfig({
  root: 'src/ui',
  plugins: [react(), viteSingleFile(), emitAsUiHtml()],
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
