import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { proxyHandler, type UpstreamFetch } from './proxy';
import type { Config } from './config';

const config: Config = {
  port: 8787,
  paosBaseUrl: 'http://127.0.0.1:8765',
  paosToken: 'secret-token',
  dashboardPassword: 'pw',
  sessionSecret: 'session-secret-long-enough-for-tests00',
  sessionTtlSeconds: 3600,
  cookieSecure: false,
  mockMode: false,
  distDir: 'dist',
};

function appWith(fetchImpl: UpstreamFetch): Hono {
  const app = new Hono();
  app.all('/api/*', proxyHandler(config, fetchImpl));
  return app;
}

describe('REST proxy', () => {
  it('rewrites the path, preserves the query string and injects the bearer token', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
    const app = appWith(fetchImpl as unknown as UpstreamFetch);

    await app.request('/api/project-summaries?project_alias=Cortex', {
      headers: { cookie: 'paos_session=should-not-leak' },
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('http://127.0.0.1:8765/api/v1/project-summaries?project_alias=Cortex');
    expect(init.headers.authorization).toBe('Bearer secret-token');
    expect(JSON.stringify(init.headers)).not.toContain('should-not-leak');
  });

  it('passes error status and body through untouched', async () => {
    const body = JSON.stringify({ detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }] });
    const fetchImpl = vi.fn(async () => new Response(body, { status: 422, headers: { 'content-type': 'application/json' } }));
    const app = appWith(fetchImpl as unknown as UpstreamFetch);

    const res = await app.request('/api/agents', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(JSON.parse(body));
  });

  it('never forwards upstream Set-Cookie headers', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'upstream=leak' },
        }),
    );
    const app = appWith(fetchImpl as unknown as UpstreamFetch);
    const res = await app.request('/api/agents');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 502 paos_unreachable when the upstream is down', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const app = appWith(fetchImpl as unknown as UpstreamFetch);
    const res = await app.request('/api/agents');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ detail: { error: 'paos_unreachable' } });
  });
});
