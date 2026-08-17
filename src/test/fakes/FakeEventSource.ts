type Listener = (ev: MessageEvent) => void;

export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: Listener | null = null;
  closed = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(cb);
    this.listeners.set(type, set);
  }

  close(): void {
    this.closed = true;
  }

  // Test drivers
  open(): void {
    this.onopen?.();
  }

  error(): void {
    this.onerror?.();
  }

  emit(type: string, data: unknown): void {
    const ev = { data: JSON.stringify(data) } as MessageEvent;
    for (const cb of this.listeners.get(type) ?? []) cb(ev);
  }

  static reset(): void {
    FakeEventSource.instances = [];
  }

  static latest(): FakeEventSource {
    const es = FakeEventSource.instances[FakeEventSource.instances.length - 1];
    if (!es) throw new Error('no FakeEventSource instance');
    return es;
  }
}
