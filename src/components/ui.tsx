import { type ReactNode } from 'react';
import clsx from 'clsx';
import { ApiError } from '@/api/errors';

export function Panel({
  title,
  actions,
  children,
  flush = false,
  raised = false,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  raised?: boolean;
  className?: string;
}) {
  return (
    <section className={clsx('panel', raised && 'panel--raised', className)}>
      {(title || actions) && (
        <header className="panel__header">
          <h2 className="panel__title">{title}</h2>
          {actions}
        </header>
      )}
      <div className={clsx('panel__body', flush && 'panel__body--flush')}>{children}</div>
    </section>
  );
}

type ButtonVariant = 'default' | 'accent' | 'danger' | 'ghost';

export function Button({
  variant = 'default',
  size,
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'btn',
        variant !== 'default' && `btn--${variant}`,
        size && `btn--${size}`,
        className,
      )}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Badge({
  tone,
  mono = false,
  children,
  title,
}: {
  tone?: 'ok' | 'warn' | 'danger' | 'accent';
  mono?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={clsx('badge', tone && `badge--${tone}`, mono && 'badge--mono')} title={title}>
      {children}
    </span>
  );
}

export function Spinner({ large = false, label }: { large?: boolean; label?: string }) {
  return (
    <span role="status" aria-label={label ?? 'Loading'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className={clsx('spinner', large && 'spinner--lg')} aria-hidden="true" />
      {label && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>}
    </span>
  );
}

export function Skeleton({ height = 14, width }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}

export function EmptyState({ icon = '◇', title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty-state__title">{title}</div>
      {hint && <div className="empty-state__hint">{hint}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong';
  const title =
    error instanceof ApiError
      ? {
          network: 'Connection problem',
          timeout: 'Request timed out',
          auth: 'Not authenticated',
          validation: 'Invalid request',
          http: 'Request failed',
        }[error.kind]
      : 'Error';
  return (
    <div className="error-state" role="alert">
      <div className="error-state__title">{title}</div>
      <div className="error-state__message">{message}</div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function KeyValueList({ entries }: { entries: Array<[string, ReactNode]> }) {
  return (
    <dl className="kv">
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
