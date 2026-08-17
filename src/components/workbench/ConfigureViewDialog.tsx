import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { ColumnMeta } from '@/lib/dataset';
import type { DatasetViewConfig, SortRule } from '@/lib/viewConfig';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/ui';

export interface ConfigureState {
  label: string;
  orderKeys: string[];
  hidden: Set<string>;
  primaryField: string | null;
  sort: SortingState;
}

/** Configure how a dataset is presented. Persists to ui_metadata; never touches data. */
export function ConfigureViewDialog({
  open,
  onClose,
  columns,
  initial,
  onSave,
  onReset,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  columns: ColumnMeta[];
  initial: ConfigureState;
  onSave: (config: Partial<DatasetViewConfig>) => void;
  onReset: () => void;
  saving: boolean;
}) {
  const [label, setLabel] = useState(initial.label);
  const [orderKeys, setOrderKeys] = useState<string[]>(initial.orderKeys);
  const [hidden, setHidden] = useState<Set<string>>(new Set(initial.hidden));
  const [primary, setPrimary] = useState<string>(initial.primaryField ?? '');
  const [sortId, setSortId] = useState<string>(initial.sort[0]?.id ?? '');
  const [sortDesc, setSortDesc] = useState<boolean>(initial.sort[0]?.desc ?? true);

  const byKey = new Map(columns.map((c) => [c.key, c]));
  const ordered = orderKeys.map((k) => byKey.get(k)).filter(Boolean) as ColumnMeta[];

  function move(idx: number, dir: -1 | 1) {
    const next = [...orderKeys];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setOrderKeys(next);
  }

  function toggleHidden(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
  }

  function save() {
    const sort: SortRule[] = sortId ? [{ id: sortId, desc: sortDesc }] : [];
    onSave({
      label: label.trim() || initial.label,
      column_order: orderKeys,
      hidden_columns: [...hidden],
      primary_field: primary || undefined,
      default_sort: sort,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configure view"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onReset} disabled={saving}>
            Reset to automatic
          </Button>
          <div style={{ flex: 1 }} />
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" busy={saving} onClick={save}>
            Save view
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="cfg-label">
          View label
        </label>
        <input id="cfg-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="cfg-grid">
        <div className="field">
          <label className="field__label" htmlFor="cfg-primary">
            Primary (title) field
          </label>
          <select id="cfg-primary" className="select" value={primary} onChange={(e) => setPrimary(e.target.value)}>
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.header}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="cfg-sort">
            Default sort
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select id="cfg-sort" className="select" value={sortId} onChange={(e) => setSortId(e.target.value)}>
              <option value="">None</option>
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.header}
                </option>
              ))}
            </select>
            <select className="select" value={sortDesc ? 'desc' : 'asc'} onChange={(e) => setSortDesc(e.target.value === 'desc')} disabled={!sortId} aria-label="Sort direction">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="field__label" style={{ marginBottom: 6 }}>
          Columns — visibility & order
        </div>
        <ul className="cfg-columns">
          {ordered.map((col, idx) => (
            <li key={col.key} className="cfg-column">
              <label className="cfg-column__vis">
                <input type="checkbox" checked={!hidden.has(col.key)} onChange={() => toggleHidden(col.key)} />
                <span>{col.header}</span>
                <span className="cfg-column__kind mono">{col.kind}</span>
              </label>
              <span className="cfg-column__moves">
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Move ${col.header} up`}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => move(idx, 1)}
                  disabled={idx === ordered.length - 1}
                  aria-label={`Move ${col.header} down`}
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
