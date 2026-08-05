import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

// Sandbox code: plain script for Figma's plugin VM
await build({
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  format: 'iife',
  target: 'es2017',
});

// UI: bundle (mediabunny + the WASM H.264 encoder) fully inlined into the
// single HTML file Figma loads. No WebCodecs, no network — self-contained.
const ui = await build({
  entryPoints: ['src/ui.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  minify: true,
});
// h264-mp4-encoder's web build is a plain script defining a global `HME` (wasm inlined)
const hme = readFileSync('node_modules/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js', 'utf8');
const js = (hme + ';\n' + ui.outputFiles[0].text).replace(/<\/script/gi, '<\\/script');
const template = readFileSync('src/ui-template.html', 'utf8');
writeFileSync('dist/ui.html', template.replace('/*__UI_JS__*/', () => js));

console.log('Built dist/code.js and dist/ui.html');
