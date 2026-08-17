import { useEffect, useRef, useState } from 'react';
import type { ColumnMeta, ValueKind } from '@/lib/dataset';
import { isEmptyValue } from '@/lib/dataset';
import type { FieldEdit } from '@/lib/agentEdit';
import { Button, Spinner } from '@/components/ui';
import { DetailValue, EnumBadge } from './cells';

const EDITABLE_KINDS = new Set<ValueKind>(['string', 'longtext', 'number', 'boolean', 'date', 'datetime', 'enum']);

function coerceInitial(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function FieldEditor({
  column,
  value,
  onCancel,
  onSave,
  pending,
}: {
  column: ColumnMeta;
  value: unknown;
  onCancel: () => void;
  onSave: (next: string) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState(coerceInitial(value));
  const enumOptions = column.enumValues ?? [];
  const currentMissing = column.kind === 'enum' && draft && !enumOptions.includes(draft);

  return (
    <div className="wb-field__editor">
      {column.kind === 'enum' ? (
        <select className="select" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={column.header}>
          {currentMissing && <option value={draft}>{draft}</option>}
          {enumOptions.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ) : column.kind === 'boolean' ? (
        <select className="select" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={column.header}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : column.kind === 'longtext' ? (
        <textarea className="textarea" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={column.header} />
      ) : (
        <input
          className="input"
          type={column.kind === 'number' ? 'number' : column.kind === 'date' ? 'date' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={column.header}
        />
      )}
      <div className="wb-field__editor-actions">
        <Button size="sm" variant="accent" busy={pending} onClick={() => onSave(draft)}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function RowDrawer({
  open,
  onClose,
  record,
  columns,
  primaryField,
  datasetLabel,
  canEdit,
  onEditField,
  editPendingKey,
  clearEditToken,
}: {
  open: boolean;
  onClose: () => void;
  record: Record<string, unknown> | null;
  columns: ColumnMeta[];
  primaryField: string | null;
  datasetLabel: string;
  canEdit: boolean;
  onEditField: (edit: FieldEdit) => void;
  editPendingKey: string | null;
  /** Increments after a successful save so the open editor closes. */
  clearEditToken: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setShowRaw(false);
    }
  }, [open]);

  // A successful save bumps clearEditToken → close the inline editor.
  useEffect(() => {
    if (clearEditToken > 0) setEditing(null);
  }, [clearEditToken]);

  if (!record) return null;

  const primaryValue = primaryField ? String(record[primaryField] ?? '') : datasetLabel;
  const statusCol = columns.find((c) => c.key.toLowerCase() === 'status');
  const statusValue = statusCol ? record[statusCol.key] : null;

  return (
    <dialog
      ref={ref}
      className="wb-drawer"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={`${primaryValue} details`}
    >
      <div className="wb-drawer__panel">
        <header className="wb-drawer__header">
          <div>
            <div className="wb-drawer__eyebrow">{datasetLabel}</div>
            <h2 className="wb-drawer__title">{primaryValue || 'Record'}</h2>
            {statusValue != null && !isEmptyValue(statusValue) && <EnumBadge value={String(statusValue)} />}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close details">
            ✕
          </Button>
        </header>

        <div className="wb-drawer__body">
          <dl className="wb-fields">
            {columns.map((col) => {
              const value = record[col.key];
              const isEditing = editing === col.key;
              const editable = canEdit && EDITABLE_KINDS.has(col.kind);
              return (
                <div key={col.key} className="wb-field">
                  <dt className="wb-field__label">{col.header}</dt>
                  <dd className="wb-field__value">
                    {isEditing ? (
                      <FieldEditor
                        column={col}
                        value={value}
                        pending={editPendingKey === col.key}
                        onCancel={() => setEditing(null)}
                        onSave={(next) => {
                          onEditField({
                            datasetLabel,
                            recordLabel: primaryValue || String(record[col.key] ?? ''),
                            fieldKey: col.key,
                            fieldLabel: col.header,
                            newValue: next,
                            kind: col.kind,
                          });
                        }}
                      />
                    ) : (
                      <>
                        <span className="wb-field__display">
                          <DetailValue value={value} kind={col.kind} />
                        </span>
                        {editable && (
                          <button
                            type="button"
                            className="wb-field__edit"
                            onClick={() => setEditing(col.key)}
                            aria-label={`Edit ${col.header}`}
                          >
                            edit
                          </button>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          {canEdit && editPendingKey && (
            <div className="in-flight" style={{ marginTop: 12 }}>
              <Spinner />
              Sending the change to the agent — waiting for it to persist…
            </div>
          )}

          <button type="button" className="advanced-toggle" style={{ marginTop: 16 }} onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw}>
            {showRaw ? '▾' : '▸'} Raw record (developer)
          </button>
          {showRaw && <pre className="wb-detail-json wb-drawer__raw">{JSON.stringify(record, null, 2)}</pre>}
        </div>
      </div>
    </dialog>
  );
}
