import type { AgentState } from '@shared/types';
import { Badge } from '@/components/ui';
import { asNumber, asRecord, asRecordArray, asString } from '@/lib/guards';
import { formatEuro } from '@/lib/format';
import { GenericStateView } from '../GenericStateView';

const STATUS_ORDER: Array<{ key: string; label: string; tone?: 'warn' | 'ok' | 'accent' }> = [
  { key: 'decision_needed', label: 'Decision needed', tone: 'warn' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'accent' },
  { key: 'researching', label: 'Researching' },
  { key: 'need_research', label: 'Need to research' },
  { key: 'selected', label: 'Selected', tone: 'accent' },
  { key: 'purchased', label: 'Purchased', tone: 'ok' },
  { key: 'installed', label: 'Installed / done', tone: 'ok' },
];

function normalizeStatus(s: string): string {
  const v = s.toLowerCase().replace(/[\s/-]+/g, '_');
  if (v.includes('install') || v === 'done') return 'installed';
  return v;
}

export function ApartmentBoard({ state }: { state: AgentState }) {
  const board = asRecord(state.structured_data).board;
  if (!Array.isArray(board)) return <GenericStateView state={state} />;

  const items = asRecordArray(board).map((item) => ({
    item: asString(item.item, 'Item'),
    category: asString(item.category),
    room: asString(item.room),
    priority: asNumber(item.priority),
    status: normalizeStatus(asString(item.status, 'need_research')),
    budget: asNumber(item.budget_eur ?? item.budget ?? item.price_eur),
    options: (Array.isArray(item.options) ? item.options : []).filter((o): o is string => typeof o === 'string'),
    next: asString(item.next_action),
  }));

  const known = new Set(STATUS_ORDER.map((s) => s.key));
  const groups = STATUS_ORDER.map((s) => ({
    ...s,
    items: items
      .filter((i) => i.status === s.key)
      .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9)),
  }));
  const other = items.filter((i) => !known.has(i.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.key}>
              <div className="project-card__section-title" style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                {group.label}
                <Badge tone={group.tone} mono>
                  {group.items.length}
                </Badge>
              </div>
              <div>
                {group.items.map((i) => (
                  <div key={i.item} className="board-row">
                    <span className="board-row__item">
                      {i.item}
                      {i.priority === 1 && (
                        <span title="Top priority" style={{ color: 'var(--warn)' }}>
                          {' '}
                          ●
                        </span>
                      )}
                    </span>
                    <span className="board-row__detail">
                      {[i.room, i.category].filter(Boolean).join(' · ')}
                      {i.budget !== null && ` · ~${formatEuro(i.budget)}`}
                      {i.options.length > 0 && (
                        <>
                          <br />
                          {i.options.join('  /  ')}
                        </>
                      )}
                    </span>
                    {i.next && <span className="board-row__next">→ {i.next}</span>}
                  </div>
                ))}
              </div>
            </div>
          ),
      )}
      {other.length > 0 && (
        <div>
          <div className="project-card__section-title">Other</div>
          {other.map((i) => (
            <div key={i.item} className="board-row">
              <span className="board-row__item">{i.item}</span>
              <span className="board-row__detail">{i.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
