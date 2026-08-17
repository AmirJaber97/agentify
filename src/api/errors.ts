export type ApiErrorKind = 'auth' | 'validation' | 'http' | 'timeout' | 'network';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  code?: string;
  fieldErrors: FieldError[];

  constructor(kind: ApiErrorKind, message: string, opts: { status?: number; code?: string; fieldErrors?: FieldError[] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status;
    this.code = opts.code;
    this.fieldErrors = opts.fieldErrors ?? [];
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

/**
 * Normalize a non-2xx response body into an ApiError. PAOS produces two 422
 * shapes: FastAPI validation arrays ({detail: [{loc, msg}]}) and app errors
 * ({detail: {error: "code"}}).
 */
export function errorFromResponse(status: number, body: unknown): ApiError {
  if (status === 401) {
    return new ApiError('auth', 'Not authenticated', { status });
  }

  const detail = (body as { detail?: unknown } | null)?.detail;

  if (status === 422 && Array.isArray(detail)) {
    const fieldErrors = (detail as FastApiValidationItem[]).map((item) => ({
      field: (item.loc ?? []).filter((p) => p !== 'body').join('.'),
      message: item.msg ?? 'Invalid value',
    }));
    const first = fieldErrors[0];
    return new ApiError('validation', first ? `${first.field}: ${first.message}` : 'Validation failed', {
      status,
      fieldErrors,
    });
  }

  if (detail && typeof detail === 'object' && 'error' in (detail as Record<string, unknown>)) {
    const code = String((detail as Record<string, unknown>).error);
    const kind = status === 422 ? 'validation' : 'http';
    return new ApiError(kind, humanizeCode(code), { status, code });
  }

  if (typeof detail === 'string') {
    return new ApiError('http', detail, { status });
  }

  return new ApiError('http', `Request failed (${status})`, { status });
}

function humanizeCode(code: string): string {
  const known: Record<string, string> = {
    paos_unreachable: 'Personal Agent OS is unreachable',
    paos_stream_error: 'Personal Agent OS event stream is unavailable',
    agent_not_found: 'Agent not found',
    agent_exists: 'An agent with this ID already exists',
    unauthorized: 'Not authenticated',
  };
  return known[code] ?? code.replace(/_/g, ' ');
}
