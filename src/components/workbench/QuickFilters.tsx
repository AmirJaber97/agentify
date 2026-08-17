import type { ColumnFiltersState } from '@tanstack/react-table';
import clsx from 'clsx';
import type { ColumnMeta } from '@/lib/dataset';

function getFilter(filters: ColumnFiltersState, id: string): unknown {
  return filters.find((f) => f.id === id)?.value;
}

function setFilter(filters: ColumnFiltersState, id: string, value: unknown): ColumnFiltersState {
  const rest = filters.filter((f) => f.id !== id);
  const empty = value === undefined || (Array.isArray(value) && value.length === 0);
  return empty ? rest : [...rest, { id, value }];
}

/**
 * Quick filter chips derived from the actual enum/boolean columns present.
 * Nothing hard-coded per agent — Media's Watching/Planned/… pills are just the
 * distinct values of its `status` enum column.
 */
export function QuickFilters({
  columns,
  filters,
  onChange,
}: {
  columns: ColumnMeta[];
  filters: ColumnFiltersState;
  onChange: (next: ColumnFiltersState) => void;
}) {
  const enumCols = columns
    .filter((c) => c.kind === 'enum' && (c.enumValues?.length ?? 0) >= 2 && (c.enumValues?.length ?? 0) <= 8)
    .sort((a, b) => rank(a.key) - rank(b.key))
    .slice(0, 2);
  const boolCols = columns.filter((c) => c.kind === 'boolean').slice(0, 2);

  if (enumCols.length === 0 && boolCols.length === 0) return null;

  return (
    <div className="wb-quickfilters">
      {enumCols.map((col) => {
        const selected = (getFilter(filters, col.key) as string[] | undefined) ?? [];
        return (
          <div key={col.key} className="wb-qf-group" role="group" aria-label={`Filter by ${col.header}`}>
            <span className="wb-qf-label">{col.header}</span>
            <button
              type="button"
              className={clsx('wb-qf-chip', selected.length === 0 && 'wb-qf-chip--on')}
              onClick={() => onChange(setFilter(filters, col.key, undefined))}
            >
              All
            </button>
            {col.enumValues!.map((v) => {
              const on = selected.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  className={clsx('wb-qf-chip', on && 'wb-qf-chip--on')}
                  onClick={() => {
                    const next = on ? selected.filter((s) => s !== v) : [...selected, v];
                    onChange(setFilter(filters, col.key, next));
                  }}
                >
                  {v.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        );
      })}
      {boolCols.map((col) => {
        const val = getFilter(filters, col.key);
        return (
          <div key={col.key} className="wb-qf-group" role="group" aria-label={`Filter by ${col.header}`}>
            <span className="wb-qf-label">{col.header}</span>
            {[
              { label: 'All', v: undefined },
              { label: 'Yes', v: true },
              { label: 'No', v: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                aria-pressed={val === opt.v}
                className={clsx('wb-qf-chip', val === opt.v && 'wb-qf-chip--on')}
                onClick={() => onChange(setFilter(filters, col.key, opt.v))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function rank(key: string): number {
  const k = key.toLowerCase();
  if (k === 'status') return 0;
  if (k === 'type') return 1;
  return 5;
}
