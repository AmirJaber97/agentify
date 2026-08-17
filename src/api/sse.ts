import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { SSE_EVENT_TYPES, type SseFrame } from '@shared/types';
import { invalidateForHints } from './queryKeys';
import { notifyUnauthorized } from '@/auth/session';

export type StreamStatus = 'connecting' | 'open' | 'reconnecting' | 'down';

type EventSourceFactory = (url: string) => EventSource;

const MAX_BACKOFF_MS = 30_000;
const DOWN_AFTER_FAILURES = 3;
// The BFF sends an 'hb' event every 25s. If nothing arrives for this long the
// connection is silently dead (e.g. a proxy holding the socket open after the
// upstream died) and must be torn down manually — EventSource won't notice.
const STALE_AFTER_MS = 65_000;
const WATCHDOG_INTERVAL_MS = 10_000;

export class StreamClient {
  private status: StreamStatus = 'connecting';
  private listeners = new Set<() => void>();
  private es: EventSource | null = null;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private lastEventAt = 0;
  private stopped = false;
  private hadDrop = false;

  constructor(
    private qc: QueryClient,
    private esFactory: EventSourceFactory = (url) => new EventSource(url),
    private url = '/api/stream',
  ) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
    this.es?.close();
    this.es = null;
    this.setStatus('down');
  }

  getStatus(): StreamStatus {
    return this.status;
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setStatus(next: StreamStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const l of this.listeners) l();
  }

  private connect(): void {
    if (this.stopped) return;
    this.setStatus(this.failures === 0 && !this.hadDrop ? 'connecting' : 'reconnecting');

    const es = this.esFactory(this.url);
    this.es = es;

    es.onopen = () => {
      this.failures = 0;
      this.lastEventAt = Date.now();
      this.startWatchdog();
      this.setStatus('open');
      if (this.hadDrop) {
        // v1 emits id: but ignores Last-Event-ID — anything sent while we
        // were disconnected is unrecoverable, so refetch everything.
        void this.qc.invalidateQueries();
      }
      this.hadDrop = false;
    };

    const onFrame = (ev: MessageEvent) => {
      this.lastEventAt = Date.now();
      let frame: SseFrame;
      try {
        frame = JSON.parse(ev.data as string) as SseFrame;
      } catch {
        console.warn('[agentify] malformed SSE frame, skipping');
        return;
      }
      invalidateForHints(this.qc, frame.refresh);
    };

    // EventSource only delivers named events to explicit listeners.
    for (const type of SSE_EVENT_TYPES) {
      es.addEventListener(type, onFrame);
    }
    // BFF heartbeat — exists so the watchdog can tell "quiet" from "dead".
    es.addEventListener('hb', () => {
      this.lastEventAt = Date.now();
    });
    es.onmessage = onFrame; // frames without an event: line, just in case

    es.onerror = () => {
      es.close();
      if (this.es === es) this.es = null;
      if (this.stopped) return;
      this.hadDrop = true;
      this.failures += 1;
      this.setStatus(this.failures >= DOWN_AFTER_FAILURES ? 'down' : 'reconnecting');

      // A 401 surfaces as a generic error — probe the session before looping.
      void this.probeAuthThenReconnect();
    };
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => {
      if (this.stopped || this.status !== 'open' || !this.es) return;
      if (Date.now() - this.lastEventAt <= STALE_AFTER_MS) return;
      // Silently dead connection: tear down and go through the normal
      // reconnect path (which also blanket-invalidates on reopen).
      const es = this.es;
      this.es = null;
      es.close();
      this.hadDrop = true;
      this.failures += 1;
      this.setStatus('reconnecting');
      void this.probeAuthThenReconnect();
    }, WATCHDOG_INTERVAL_MS);
  }

  private async probeAuthThenReconnect(): Promise<void> {
    try {
      const res = await fetch('/auth/session', { credentials: 'same-origin' });
      if (res.status === 401) {
        notifyUnauthorized();
        this.stop();
        return;
      }
    } catch {
      // BFF itself unreachable — keep backing off.
    }
    const delay = Math.min(1000 * 2 ** (this.failures - 1), MAX_BACKOFF_MS) + Math.random() * 500;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

let activeClient: StreamClient | null = null;

export function startStream(qc: QueryClient): StreamClient {
  if (activeClient) return activeClient;
  activeClient = new StreamClient(qc);
  activeClient.start();
  return activeClient;
}

export function stopStream(): void {
  activeClient?.stop();
  activeClient = null;
}

export function useStreamStatus(): StreamStatus {
  return useSyncExternalStore(
    (cb) => (activeClient ? activeClient.subscribe(cb) : () => {}),
    () => activeClient?.getStatus() ?? 'down',
  );
}
