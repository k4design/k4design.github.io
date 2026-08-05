import { PluginConfigSchema, type PluginConfig } from '@mf/shared';

const KEY = 'mf:config';

/**
 * Production builds compile the public origin in via __MF_API_BASE__ and the
 * manifest allows only that origin — install-and-go, no configuration.
 *
 * Dev falls back to `localhost`, not `127.0.0.1`: Figma's manifest validator
 * rejects IP-literal origins in `networkAccess.allowedDomains`, so an address
 * the manifest cannot declare is useless as a default.
 */
const DEFAULT_CONFIG: PluginConfig = {
  apiBase: __MF_API_BASE__ || 'http://localhost:8787',
  outputWidth: null,
};

/**
 * In production, stored config from an older install must not pin users to a
 * dead or local origin — the compiled origin always wins there. Dev keeps
 * whatever the user set in Settings.
 */
function normalize(config: PluginConfig): PluginConfig {
  if (__MF_API_BASE__ && config.apiBase !== __MF_API_BASE__) {
    return { ...config, apiBase: __MF_API_BASE__ };
  }
  return config;
}

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
    return parsed.success ? normalize(parsed.data) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(patch: Partial<PluginConfig>): Promise<PluginConfig> {
  const current = await readConfig();
  const next = normalize(PluginConfigSchema.parse({ ...current, ...patch }));
  await figma.clientStorage.setAsync(KEY, next);
  return next;
}
