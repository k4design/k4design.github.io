import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Production build driver.
 *
 * The public origin has exactly one source of truth: the first entry of
 * manifest.production.json's allowedDomains. It is compiled into both bundles
 * as __MF_API_BASE__, so the manifest and the code cannot disagree about
 * where the plugin talks to.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');

const manifest = JSON.parse(await readFile(path.join(app, 'manifest.production.json'), 'utf8'));
const origin = manifest.networkAccess?.allowedDomains?.[0];
if (!origin || !/^https:\/\//.test(origin)) {
  console.error('✗ manifest.production.json needs an https origin as allowedDomains[0].');
  process.exit(1);
}

console.log(`Building production bundles against ${origin}`);
const prodEnv = { ...process.env, MF_API_BASE: origin, NODE_ENV: 'production' };
const run = (command, args, env) =>
  execFileSync(command, args, { cwd: app, env, stdio: 'inherit' });

run('npx', ['vite', 'build'], prodEnv);
run('node', ['scripts/build-code.mjs'], prodEnv);
run('node', ['scripts/package-release.mjs'], prodEnv);

// dist/ is what the DEV manifest points at, and the production bundles were
// just written into it. Leaving them there silently repoints any imported dev
// plugin at the public origin — which the dev manifest does not even allow.
// Rebuild the dev profile so dist/ is always safe to run from Figma.
console.log('Restoring dev bundles in dist/ (release artifacts live in release/)');
const devEnv = { ...process.env };
delete devEnv.MF_API_BASE;
delete devEnv.NODE_ENV;
run('npx', ['vite', 'build'], devEnv);
run('node', ['scripts/build-code.mjs'], devEnv);
