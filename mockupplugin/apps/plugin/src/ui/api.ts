import {
  ApiErrorSchema,
  CatalogResponseSchema,
  HealthResponseSchema,
  ItemDetailSchema,
  RenderResponseSchema,
  type CatalogQuery,
  type CatalogResponse,
  type HealthResponse,
  type ItemDetail,
  type RenderRequest,
  type RenderResponse,
} from '@mf/shared';
import type { z, ZodTypeAny } from 'zod';

/** An API error carrying the server's machine-readable code. */
export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const OFFLINE_MESSAGE =
  'Cannot reach the render service. Check that it is running and that its URL is allowed in the plugin manifest.';

async function request<S extends ZodTypeAny>(
  apiBase: string,
  path: string,
  schema: S,
  init?: RequestInit & { timeoutMs?: number },
): Promise<z.output<S>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 30_000);

  let response: Response;
  try {
    response = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiClientError('render_timeout', 'The request took too long and was cancelled.');
    }
    throw new ApiClientError('offline', OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiClientError('internal', `Unexpected non-JSON response (${response.status}).`);
  }

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiClientError(parsed.data.error.code, parsed.data.error.message, response.status);
    }
    throw new ApiClientError('internal', `Request failed (${response.status}).`, response.status);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(
      'internal',
      'The render service returned a response this plugin version does not understand.',
    );
  }
  return parsed.data;
}

export function health(apiBase: string): Promise<HealthResponse> {
  return request(apiBase, '/health', HealthResponseSchema, { timeoutMs: 6000 });
}

export function fetchCatalog(apiBase: string, query: Partial<CatalogQuery>): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.viewpoint) params.set('viewpoint', query.viewpoint);
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return request(apiBase, `/catalog${qs ? `?${qs}` : ''}`, CatalogResponseSchema);
}

export function fetchItem(apiBase: string, id: string): Promise<ItemDetail> {
  return request(apiBase, `/items/${encodeURIComponent(id)}`, ItemDetailSchema);
}

export function renderItem(
  apiBase: string,
  body: RenderRequest,
  timeoutMs = 90_000,
): Promise<RenderResponse> {
  return request(apiBase, '/render', RenderResponseSchema, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
  });
}

/** Fetch an asset (thumbnail/preview) as base64 so the sandbox can use it. */
export async function fetchAssetBase64(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ApiClientError('offline', OFFLINE_MESSAGE);
  }
  if (!response.ok) {
    throw new ApiClientError('not_found', `Could not load image (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked to stay well clear of the argument-count limit on large images.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
