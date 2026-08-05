import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Asset root. Local dev reads from the repo's `assets/` directory; in
 * production this points at a mounted S3-compatible bucket (or is fronted by
 * a CDN, in which case ASSET_BASE_URL is set and thumbnails/previews are
 * served as absolute CDN URLs instead of via this service).
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ASSET_DIR: z.string().default(path.resolve(here, '../../../assets')),
  /** When set, thumbnail/preview URLs are rewritten to this origin. */
  ASSET_BASE_URL: z.string().url().optional(),
  /** Public origin of this API, used to build absolute asset URLs. */
  PUBLIC_URL: z.string().url().optional(),
  /** Renders per window, per IP. */
  RATE_LIMIT_RENDERS: z.coerce.number().int().min(1).default(30),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  /** Hard ceiling on render wall time before we return render_timeout. */
  RENDER_TIMEOUT_MS: z.coerce.number().int().min(1000).default(20_000),
  /** Phase-2 video rendering. Off by default — see docs/VIDEO.md. */
  MF_VIDEO: z
    .enum(['0', '1'])
    .default('0')
    .transform((v) => v === '1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof EnvSchema> & { assetBaseUrl: string };

function load(): Config {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${detail}`);
  }
  const env = parsed.data;
  // The bind address is not a usable public hostname: Figma's manifest
  // validator rejects IP-literal origins in allowedDomains, so asset URLs
  // built from 127.0.0.1 (or a wildcard bind) produce images the plugin is
  // forbidden from loading even though the catalog JSON itself arrives fine.
  const publicHost = ['127.0.0.1', '0.0.0.0', '::', '::1'].includes(env.HOST)
    ? 'localhost'
    : env.HOST;
  const publicUrl = env.PUBLIC_URL ?? `http://${publicHost}:${env.PORT}`;
  return {
    ...env,
    assetBaseUrl: (env.ASSET_BASE_URL ?? `${publicUrl}/assets`).replace(/\/$/, ''),
  };
}

export const config: Config = load();

export const ITEMS_DIR = path.join(config.ASSET_DIR, 'items');
export const GOLDEN_DIR = path.join(config.ASSET_DIR, 'golden');
