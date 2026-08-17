import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { api } from './client';
import { ApiError } from './errors';
import { useSession, notifyAuthenticated } from '@/auth/session';
import { renderHook } from '@testing-library/react';

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return e as ApiError;
  }
  throw new Error('expected ApiError');
}

describe('api client error normalization', () => {
  it('parses FastAPI validation arrays into field errors', async () => {
    server.use(
      http.post('/api/agents', () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }] },
          { status: 422 },
        ),
      ),
    );
    const err = await expectApiError(api('/api/agents', { method: 'POST', body: {} }));
    expect(err.kind).toBe('validation');
    expect(err.fieldErrors).toEqual([{ field: 'name', message: 'Field required' }]);
  });

  it('parses app-error detail objects with codes', async () => {
    server.use(http.get('/api/agents/nope', () => HttpResponse.json({ detail: { error: 'agent_not_found' } }, { status: 404 })));
    const err = await expectApiError(api('/api/agents/nope'));
    expect(err.kind).toBe('http');
    expect(err.code).toBe('agent_not_found');
    expect(err.message).toBe('Agent not found');
  });

  it('maps 502 paos_unreachable to a readable message', async () => {
    server.use(http.get('/api/agents', () => HttpResponse.json({ detail: { error: 'paos_unreachable' } }, { status: 502 })));
    const err = await expectApiError(api('/api/agents'));
    expect(err.message).toBe('Personal Agent OS is unreachable');
  });

  it('classifies network failures', async () => {
    server.use(http.get('/api/agents', () => HttpResponse.error()));
    const err = await expectApiError(api('/api/agents'));
    expect(err.kind).toBe('network');
  });

  it('classifies timeouts and warns the operation may still run', async () => {
    server.use(
      http.get('/api/agents', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json([]);
      }),
    );
    const err = await expectApiError(api('/api/agents', { timeoutMs: 20 }));
    expect(err.kind).toBe('timeout');
    expect(err.message).toContain('may still be running');
  });

  it('notifies the session store on 401', async () => {
    notifyAuthenticated(false);
    server.use(http.get('/api/agents', () => HttpResponse.json({ detail: { error: 'unauthorized' } }, { status: 401 })));
    const err = await expectApiError(api('/api/agents'));
    expect(err.kind).toBe('auth');
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('unauthenticated');
  });
});
