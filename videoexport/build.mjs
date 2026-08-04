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

// Encoder app: bundle (with mediabunny), inline into a page hosted on GitHub
// Pages. It runs in a nested iframe because Figma's plugin iframe is not a
// secure context, which hides WebCodecs.
const APP_URL = 'https://k4design.github.io/videoexport/app/';

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
mkdirSync('app', { recursive: true });
writeFileSync('app/index.html', template.replace('/*__UI_JS__*/', () => js));

// Plugin UI shell: relays messages between the Figma sandbox and the app iframe
const shell = readFileSync('src/shell.html', 'utf8');
writeFileSync('dist/ui.html', shell.replaceAll('__APP_URL__', APP_URL));

console.log('Built dist/code.js, dist/ui.html (shell), app/index.html (hosted encoder)');
