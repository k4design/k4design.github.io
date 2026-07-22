import * as esbuild from 'esbuild'
import fs from 'node:fs'

const watch = process.argv.includes('--watch')
fs.mkdirSync('dist', { recursive: true })

// Composes dist/ui.html from the bundled UI js + css after every UI build.
// Figma loads the UI as a single self-contained HTML string, so everything
// must be inlined — no external files, no CDN.
const composeHtml = {
  name: 'compose-html',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return
      const js = fs.readFileSync('dist/ui.js', 'utf8').replace(/<\/script>/g, '<\\/script>')
      const css = fs.existsSync('dist/ui.css') ? fs.readFileSync('dist/ui.css', 'utf8') : ''
      const html = `<style>${css}</style>\n<div id="app"></div>\n<script>${js}</script>\n`
      fs.writeFileSync('dist/ui.html', html)
      console.log(`[${new Date().toLocaleTimeString()}] built dist/main.js + dist/ui.html`)
    })
  },
}

const mainOpts = {
  entryPoints: ['src/main/main.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2019',
  logLevel: 'silent',
}

const uiOpts = {
  entryPoints: ['src/ui/ui.tsx'],
  bundle: true,
  outfile: 'dist/ui.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2019',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  logLevel: 'silent',
  plugins: [composeHtml],
}

if (watch) {
  const mainCtx = await esbuild.context(mainOpts)
  const uiCtx = await esbuild.context(uiOpts)
  await Promise.all([mainCtx.watch(), uiCtx.watch()])
  console.log('watching for changes…')
} else {
  await esbuild.build(mainOpts)
  await esbuild.build(uiOpts)
}
