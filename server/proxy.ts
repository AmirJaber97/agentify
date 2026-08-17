import type { Handler } from 'hono';
import { Agent as UndiciAgent, fetch as upstreamFetch } from 'undici';
import type { Config } from './config';

export interface UpstreamFetch {
  (url: string, init: Parameters<typeof upstreamFetch>[1]): ReturnType<typeof upstreamFetch>;
}

// Synchronous /run and routed /message calls can take minutes; undici's
// default 300s header/body timeouts would kill them.
const restDispatcher = new UndiciAgent({
  headersTimeout: 600_000,
  bodyTimeout: 600_000,
});

export function proxyHandler(config: Config, fetchImpl: UpstreamFetch = upstreamFetch): Handler {
  return async (c) => {
    const url = new URL(c.req.url);
    const rest = url.pathname.replace(/^\/api/, '');
    const target = `${config.paosBaseUrl}/api/v1${rest}${url.search}`;

    // Forward only the headers the upstream needs. Never the dashboard
    // session cookie, and the bearer token is injected here — server side.
    const headers: Record<string, string> = {
      authorization: `Bearer ${config.paosToken}`,
      accept: c.req.header('accept') ?? 'application/json',
    };
    const contentType = c.req.header('content-type');
    if (contentType) headers['content-type'] = contentType;

    const method = c.req.method;
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let upstream: Awaited<ReturnType<typeof upstreamFetch>>;
    try {
      upstream = await fetchImpl(target, {
        method,
        headers,
        body: hasBody ? await c.req.arrayBuffer() : undefined,
        dispatcher: restDispatcher,
      });
    } catch (e) {
      console.error(`[agentify] PAOS unreachable (${method} ${rest}): ${(e as Error).message}`);
      return c.json({ detail: { error: 'paos_unreachable' } }, 502);
    }

    if (upstream.status === 401) {
      console.error('[agentify] PAOS rejected the bearer token (401). Was the token rotated?');
    }

    // Pass status + content-type verbatim so 422/error payloads reach the
    // client untouched. Never forward upstream Set-Cookie.
    const respHeaders = new Headers();
    const outType = upstream.headers.get('content-type');
    if (outType) respHeaders.set('content-type', outType);

    const body = await upstream.arrayBuffer();
    return new Response(body, { status: upstream.status, headers: respHeaders });
  };
}
