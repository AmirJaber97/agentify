import { ApiError, errorFromResponse } from './errors';
import { notifyUnauthorized } from '@/auth/session';

const DEFAULT_TIMEOUT_MS = 15_000;
// Synchronous Hermes invocations (message/run/derive) can take minutes.
export const LONG_TIMEOUT_MS = 300_000;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Central fetch wrapper: relative /api paths, JSON, normalized errors. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = opts;

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combined,
      credentials: 'same-origin',
    });
  } catch (e) {
    if (timeoutSignal.aborted) {
      throw new ApiError('timeout', `Request timed out after ${Math.round(timeoutMs / 1000)}s — the operation may still be running on the server`);
    }
    if (signal?.aborted) throw e;
    throw new ApiError(
      'network',
      navigator.onLine === false ? 'You appear to be offline' : 'Cannot reach the dashboard server',
    );
  }

  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      // non-JSON error body
    }
    const error = errorFromResponse(res.status, parsed);
    if (error.kind === 'auth') notifyUnauthorized();
    throw error;
  }

  return (await res.json()) as T;
}
