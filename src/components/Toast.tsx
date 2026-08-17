import { useSyncExternalStore } from 'react';
import clsx from 'clsx';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function toast(message: string, tone: 'info' | 'error' = 'info'): void {
  const item: ToastItem = { id: nextId++, message, tone };
  toasts = [...toasts, item];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    emit();
  }, 5000);
}

export function ToastRegion() {
  const items = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={clsx('toast', t.tone === 'error' && 'toast--error')}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
