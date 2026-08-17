import { useState } from 'react';

function Value({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) return <span className="json-tree__null">null</span>;
  if (typeof value === 'string') return <span className="json-tree__string">"{value}"</span>;
  if (typeof value === 'number') return <span className="json-tree__number">{String(value)}</span>;
  if (typeof value === 'boolean') return <span className="json-tree__bool">{String(value)}</span>;
  return <Branch value={value as object} depth={depth} />;
}

function Branch({ value, depth }: { value: object; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  if (entries.length === 0) return <span className="json-tree__null">{isArray ? '[]' : '{}'}</span>;

  return (
    <span>
      <button
        type="button"
        className="json-tree__toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Collapse' : 'Expand'}
      >
        {open ? '▾' : '▸'} {isArray ? `[${entries.length}]` : `{${entries.length}}`}
      </button>
      {open && (
        <ul>
          {entries.map(([k, v]) => (
            <li key={k}>
              {!isArray && <span className="json-tree__key">{k}</span>}
              {!isArray && ': '}
              <Value value={v} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

/** Collapsible readonly JSON viewer for schemaless agent state. */
export function JsonTree({ data }: { data: unknown }) {
  return (
    <div className="json-tree">
      <Value value={data} depth={0} />
    </div>
  );
}
