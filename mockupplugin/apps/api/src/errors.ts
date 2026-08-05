import type { ErrorCode } from '@mf/shared';

/** An error with a wire-safe code and HTTP status. */
export class ApiFailure extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
    this.status = status ?? DEFAULT_STATUS[code];
    this.details = details;
  }
}

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  payload_too_large: 413,
  aspect_mismatch: 422,
  unsupported_media: 415,
  rate_limited: 429,
  render_failed: 500,
  render_timeout: 504,
  internal: 500,
};

export const badRequest = (message: string, details?: unknown) =>
  new ApiFailure('bad_request', message, undefined, details);

export const notFound = (message: string) => new ApiFailure('not_found', message);
