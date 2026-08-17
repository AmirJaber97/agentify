import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import { server } from '@/test/msw/server';
import { StreamClient } from './sse';
import { FakeEventSource } from '@/test/fakes/FakeEventSource';

function makeClient(qc: QueryClient): StreamClient {
  return new StreamClient(qc, (url) => new FakeEventSource(url) as unknown as EventSource);
}

describe('StreamClient', () => {
  beforeEach(() => {
    FakeEventSource.reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps refresh hints to exact query invalidations', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const client = makeClient(qc);
    client.start();
    const es = FakeEventSource.latest();
    es.open();
    spy.mockClear();

    es.emit('agent.state_updated', {
      type: 'agent.state_updated',
      refresh: ['agent:media', 'dashboard'],
    });

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(['agent', 'media']));
    expect(keys).toContain(JSON.stringify(['dashboard']));
    expect(spy).toHaveBeenCalledTimes(2);
    client.stop();
  });

  it('ignores malformed frames without crashing', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const client = makeClient(qc);
    client.start();
    const es = FakeEventSource.latest();
    es.open();
    spy.mockClear();

    const badEvent = { data: 'not-json{{{' } as MessageEvent;
    es.onmessage?.(badEvent);
    expect(spy).not.toHaveBeenCalled();
    client.stop();
  });

  it('reconnects with exponential backoff and blanket-invalidates on reopen', async () => {
    server.use(http.get('/auth/session', () => HttpResponse.json({ authenticated: true, mock: true })));
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const client = makeClient(qc);
    client.start();

    const first = FakeEventSource.latest();
    first.open();
    expect(client.getStatus()).toBe('open');
    spy.mockClear();

    first.error();
    expect(client.getStatus()).toBe('reconnecting');
    // auth probe resolves, then backoff timer (1000ms + jitter ≤ 500ms)
    await vi.advanceTimersByTimeAsync(1600);
    expect(FakeEventSource.instances.length).toBe(2);

    const second = FakeEventSource.latest();
    second.open();
    expect(client.getStatus()).toBe('open');
    // v1 ignores Last-Event-ID → blanket invalidation after any drop
    expect(spy).toHaveBeenCalledWith();
    client.stop();
  });

  it('tears down a silently dead connection via the heartbeat watchdog', async () => {
    server.use(http.get('/auth/session', () => HttpResponse.json({ authenticated: true, mock: true })));
    const qc = new QueryClient();
    const client = makeClient(qc);
    client.start();
    const es = FakeEventSource.latest();
    es.open();
    expect(client.getStatus()).toBe('open');

    // No frames, no heartbeats — watchdog should declare the stream dead
    // after STALE_AFTER_MS and schedule a reconnect.
    await vi.advanceTimersByTimeAsync(80_000);
    expect(es.closed).toBe(true);
    expect(FakeEventSource.instances.length).toBeGreaterThan(1);
    client.stop();
  });

  it('keeps a connection alive while heartbeats arrive', async () => {
    server.use(http.get('/auth/session', () => HttpResponse.json({ authenticated: true, mock: true })));
    const qc = new QueryClient();
    const client = makeClient(qc);
    client.start();
    const es = FakeEventSource.latest();
    es.open();

    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(25_000);
      es.emit('hb', {});
    }
    expect(es.closed).toBe(false);
    expect(client.getStatus()).toBe('open');
    expect(FakeEventSource.instances.length).toBe(1);
    client.stop();
  });

  it('goes down and stops retrying after a 401 probe', async () => {
    server.use(http.get('/auth/session', () => HttpResponse.json({ detail: { error: 'unauthorized' } }, { status: 401 })));
    const qc = new QueryClient();
    const client = makeClient(qc);
    client.start();
    const es = FakeEventSource.latest();
    es.open();

    es.error();
    await vi.advanceTimersByTimeAsync(100);
    // no reconnect scheduled — still a single EventSource
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeEventSource.instances.length).toBe(1);
    expect(client.getStatus()).toBe('down');
  });
});
