import { PluginConfigSchema, type PluginConfig } from '@mf/shared';

const KEY = 'mf:config';

/**
 * `localhost`, not `127.0.0.1`: Figma's manifest validator rejects IP-literal
 * origins in `networkAccess.allowedDomains`, so an address the manifest cannot
 * declare is useless as a default.
 */
const DEFAULT_CONFIG: PluginConfig = {
  apiBase: 'http://localhost:8787',
  outputWidth: null,
};

/**
 * clientStorage is per-user, per-plugin and survives across files — the right
 * home for the API base URL. It is never document data, so it does not follow
 * a file that gets shared.
 */
export async function readConfig(): Promise<PluginConfig> {
  try {
    const raw = await figma.clientStorage.getAsync(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = PluginConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(patch: Partial<PluginConfig>): Promise<PluginConfig> {
  const current = await readConfig();
  const next = PluginConfigSchema.parse({ ...current, ...patch });
  await figma.clientStorage.setAsync(KEY, next);
  return next;
}
