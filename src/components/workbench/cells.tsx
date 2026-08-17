import type { ReactNode } from 'react';
import type { ValueKind } from '@/lib/dataset';
import { isEmptyValue } from '@/lib/dataset';
import { RelativeTime } from '@/components/RelativeTime';
import { formatRelative } from '@/lib/format';

const STATUS_TONE: Record<string, string> = {
  watching: 'var(--status-working)',
  reading: 'var(--status-working)',
  playing: 'var(--status-working)',
  active: 'var(--status-working)',
  in_progress: 'var(--status-working)',
  planned: 'var(--status-idle)',
  need_research: 'var(--status-idle)',
  researching: 'var(--status-waiting)',
  paused: 'var(--status-waiting)',
  waiting: 'var(--status-waiting)',
  shortlisted: 'var(--accent)',
  selected: 'var(--accent)',
  decision_needed: 'var(--status-blocked)',
  blocked: 'var(--status-blocked)',
  completed: 'var(--ok)',
  purchased: 'var(--ok)',
  installed: 'var(--ok)',
  done: 'var(--ok)',
  dropped: 'var(--status-disabled)',
  cancelled: 'var(--status-disabled)',
};

export function enumColor(value: string): string {
  return STATUS_TONE[value.toLowerCase().replace(/[\s-]+/g, '_')] ?? 'var(--text-2)';
}

export function EnumBadge({ value }: { value: string }) {
  const color = enumColor(value);
  return (
    <span className="wb-enum" style={{ ['--enum-color' as string]: color }}>
      <span className="wb-enum__dot" style={{ background: color }} aria-hidden="true" />
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function Empty() {
  return (
    <span className="wb-empty" aria-label="empty">
      —
    </span>
  );
}

/** Compact, schema-aware cell rendering for the table grid. */
export function CellValue({ value, kind }: { value: unknown; kind: ValueKind }): ReactNode {
  if (isEmptyValue(value)) return <Empty />;

  switch (kind) {
    case 'boolean':
      return value === true ? (
        <span className="wb-bool wb-bool--yes" title="true">✓</span>
      ) : (
        <span className="wb-bool wb-bool--no" title="false">✕</span>
      );
    case 'number':
      return <span className="wb-num">{String(value)}</span>;
    case 'enum':
      return <EnumBadge value={String(value)} />;
    case 'datetime':
      return <RelativeTime iso={String(value)} />;
    case 'date':
      return (
        <span className="mono" title={String(value)}>
          {formatDateOnly(String(value))}
        </span>
      );
    case 'url': {
      const href = String(value);
      let label = href;
      try {
        label = new URL(href).hostname.replace(/^www\./, '');
      } catch {
        /* keep raw */
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
          {label} ↗
        </a>
      );
    }
    case 'tags':
      return (
        <span className="wb-tags">
          {(value as unknown[]).slice(0, 4).map((t, i) => (
            <span key={i} className="wb-tag">
              {String(t)}
            </span>
          ))}
          {(value as unknown[]).length > 4 && <span className="wb-tag wb-tag--more">+{(value as unknown[]).length - 4}</span>}
        </span>
      );
    case 'object':
      return <span className="wb-obj mono">{compactObject(value)}</span>;
    case 'longtext': {
      const text = String(value);
      return (
        <span className="wb-longtext" title={text}>
          {text.length > 60 ? `${text.slice(0, 60)}…` : text}
        </span>
      );
    }
    default:
      return <span>{String(value)}</span>;
  }
}

/** Fuller value rendering for the row detail drawer (no truncation). */
export function DetailValue({ value, kind }: { value: unknown; kind: ValueKind }): ReactNode {
  if (isEmptyValue(value)) return <Empty />;
  switch (kind) {
    case 'datetime':
      return (
        <span>
          <RelativeTime iso={String(value)} /> <span className="wb-detail-exact mono">({String(value)})</span>
        </span>
      );
    case 'longtext':
      return <span className="wb-detail-longtext">{String(value)}</span>;
    case 'object':
      return <pre className="wb-detail-json">{JSON.stringify(value, null, 2)}</pre>;
    case 'tags':
      return (
        <span className="wb-tags">
          {(value as unknown[]).map((t, i) => (
            <span key={i} className="wb-tag">
              {String(t)}
            </span>
          ))}
        </span>
      );
    default:
      return <CellValue value={value} kind={kind} />;
  }
}

function formatDateOnly(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function compactObject(v: unknown): string {
  const s = JSON.stringify(v);
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

export { formatRelative };
