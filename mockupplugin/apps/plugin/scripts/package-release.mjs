import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Assembles the publishable artifact after a production build:
 *
 *   release/mockup-forge/manifest.json   (manifest.production.json)
 *   release/mockup-forge/code.js
 *   release/mockup-forge/ui.html
 *   release/mockup-forge.zip
 *
 * Refuses to package anything that still references localhost — the one
 * mistake that would sail through review and then fail on every machine
 * except this one.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const dist = path.join(app, 'dist');
const releaseRoot = path.join(app, 'release');
const releaseDir = path.join(releaseRoot, 'mockup-forge');

const manifest = JSON.parse(await readFile(path.join(app, 'manifest.production.json'), 'utf8'));

const domains = manifest.networkAccess?.allowedDomains ?? [];
if (domains.length === 0 || domains.some((d) => /localhost|127\.0\.0\.1/.test(d))) {
  console.error('✗ manifest.production.json must allow exactly the public origin(s), no localhost.');
  process.exit(1);
}

for (const file of ['code.js', 'ui.html']) {
  const contents = await readFile(path.join(dist, file), 'utf8');
  // The literal appears only as the compiled default apiBase; a production
  // build must have replaced it.
  if (contents.includes('http://localhost:8787')) {
    console.error(
      `✗ dist/${file} still contains the localhost default — run this through "npm run build:prod", not "build".`,
    );
    process.exit(1);
  }
}

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });
await writeFile(path.join(releaseDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(path.join(dist, 'code.js'), path.join(releaseDir, 'code.js'));
await cp(path.join(dist, 'ui.html'), path.join(releaseDir, 'ui.html'));

execFileSync('zip', ['-r', '-q', path.join(releaseRoot, 'mockup-forge.zip'), 'mockup-forge'], {
  cwd: releaseRoot,
});

console.log(`✓ release/mockup-forge.zip — allowed domains: ${domains.join(', ')}`);
