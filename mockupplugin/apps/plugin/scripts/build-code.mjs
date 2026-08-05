import esbuild from 'esbuild';

/**
 * The sandbox bundle. Figma's plugin sandbox is not a browser: no DOM, no
 * fetch, no dynamic import. Everything must be inlined into one ES5-ish IIFE.
 */
const options = {
  entryPoints: ['src/sandbox/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es2017',
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'default'],
  logLevel: 'info',
  sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    // Empty in dev; the public origin in build:prod.
    __MF_API_BASE__: JSON.stringify(process.env.MF_API_BASE ?? ''),
  },
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[code] watching…');
} else {
  await esbuild.build(options);
}
