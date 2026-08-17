// Generic dataset discovery + schema inference over agent structured_data.
//
// The guiding principle: agent state is the database, Agentify is the interface.
// Nothing here is hard-coded for a specific agent — an array of objects found
// anywhere in structured_data becomes a tabular dataset, and each column's
// render/filter behavior is inferred from the actual values present (with
// light key-name hints).

import type { AgentState } from '@shared/types';
import { asRecord } from './guards';

export type ValueKind =
  | 'string'
  | 'longtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'url'
  | 'object'
  | 'tags'
  | 'null';

export interface ColumnMeta {
  key: string;
  header: string;
  kind: ValueKind;
  /** Distinct values for enum columns, most frequent first. */
  enumValues?: string[];
  /** Fraction of rows where this column is non-empty (0..1). */
  fill: number;
}

export interface Dataset {
  /** Dotted path from agent root, e.g. "structured_data.items". Stable id. */
  path: string;
  /** Leaf key, e.g. "items". */
  key: string;
  /** Humanized default label, e.g. "Items". */
  label: string;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
}

const LONGTEXT_KEYS = new Set(['notes', 'thoughts', 'description', 'summary', 'comment', 'comments', 'review', 'reason', 'detail', 'details']);
const DATE_KEY_HINT = /(^date$|_date$|_at$|date_|_on$)/i;
const ENUM_KEY_HINT = /(^status$|_status$|^type$|_type$|^state$|category|kind|priority|reaction|verdict)/i;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const URL_RE = /^https?:\/\/\S+$/i;

const HEADER_OVERRIDES: Record<string, string> = {
  id: 'ID',
  url: 'URL',
  updated_at: 'Updated',
  created_at: 'Created',
  date_started: 'Started',
  date_completed: 'Completed',
};

/** snake_case / camelCase / kebab → Title Case, with a few overrides. */
export function humanize(key: string): string {
  if (HEADER_OVERRIDES[key]) return HEADER_OVERRIDES[key]!;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/);
  return words.map((w) => (w.length <= 2 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1))).join(' ');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** An array is "tabular" when most of its elements are plain objects. */
function isTabular(arr: unknown[]): boolean {
  if (arr.length === 0) return false;
  const objects = arr.filter(isPlainObject).length;
  return objects / arr.length >= 0.6;
}

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

/** Infer the render/filter kind for a column from its sampled values. */
export function inferKind(key: string, values: unknown[]): { kind: ValueKind; enumValues?: string[] } {
  const present = values.filter((v) => !isEmptyValue(v));
  if (present.length === 0) return { kind: 'null' };

  const allBool = present.every((v) => typeof v === 'boolean');
  if (allBool) return { kind: 'boolean' };

  const allNum = present.every((v) => typeof v === 'number');
  if (allNum) return { kind: 'number' };

  const allObj = present.every(isPlainObject);
  if (allObj) return { kind: 'object' };

  const allPrimArray = present.every((v) => Array.isArray(v) && (v as unknown[]).every((x) => typeof x !== 'object' || x === null));
  if (present.every((v) => Array.isArray(v))) return { kind: allPrimArray ? 'tags' : 'object' };

  const allStr = present.every((v) => typeof v === 'string');
  if (allStr) {
    const strs = present as string[];
    if (strs.every((s) => URL_RE.test(s.trim()))) return { kind: 'url' };
    if (strs.every((s) => ISO_DATETIME.test(s)) || (DATE_KEY_HINT.test(key) && strs.some((s) => ISO_DATETIME.test(s)))) {
      return { kind: 'datetime' };
    }
    if (strs.every((s) => ISO_DATE.test(s)) || (DATE_KEY_HINT.test(key) && strs.some((s) => ISO_DATE.test(s)))) {
      return { kind: 'date' };
    }
    const distinct = [...new Set(strs.map((s) => s.trim()))];
    const looksEnum =
      (ENUM_KEY_HINT.test(key) && distinct.length <= 24) ||
      (distinct.length <= 12 && strs.length >= 4 && distinct.length < strs.length && distinct.every((s) => s.length <= 24));
    if (looksEnum) {
      // Order by frequency (most common first).
      const freq = new Map<string, number>();
      for (const s of strs) freq.set(s.trim(), (freq.get(s.trim()) ?? 0) + 1);
      const enumValues = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
      return { kind: 'enum', enumValues };
    }
    const isLong = LONGTEXT_KEYS.has(key.toLowerCase()) || strs.some((s) => s.length > 80);
    return { kind: isLong ? 'longtext' : 'string' };
  }

  // Mixed types — fall back to string rendering.
  return { kind: 'string' };
}

/**
 * Build column metadata from the union of keys across rows, preserving
 * first-seen order (a stable, meaningful default column order).
 */
export function inferColumns(rows: Record<string, unknown>[]): ColumnMeta[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
  }
  return order.map((key) => {
    const values = rows.map((r) => r[key]);
    const { kind, enumValues } = inferKind(key, values);
    const fill = rows.length ? values.filter((v) => !isEmptyValue(v)).length / rows.length : 0;
    return { key, header: humanize(key), kind, enumValues, fill };
  });
}

/**
 * Discover tabular datasets inside an agent's structured_data.
 * Recognizes top-level arrays-of-objects, and arrays nested one level inside
 * a top-level object (so `structured_data.library.items` is still found).
 */
export function discoverDatasets(state: AgentState | undefined): Dataset[] {
  const sd = asRecord(state?.structured_data);
  const datasets: Dataset[] = [];

  const consider = (path: string, key: string, value: unknown) => {
    if (Array.isArray(value) && isTabular(value)) {
      const rows = value.filter(isPlainObject);
      datasets.push({ path, key, label: humanize(key), rows, columns: inferColumns(rows) });
    }
  };

  for (const [key, value] of Object.entries(sd)) {
    consider(`structured_data.${key}`, key, value);
    if (isPlainObject(value)) {
      for (const [k2, v2] of Object.entries(value)) {
        consider(`structured_data.${key}.${k2}`, k2, v2);
      }
    }
  }

  // Largest datasets first — the primary collection usually has the most rows.
  return datasets.sort((a, b) => b.rows.length - a.rows.length);
}

/** Pick the best display/title field for a row (for drawers, search, cards). */
export function primaryFieldOf(columns: ColumnMeta[]): string | null {
  const prefer = ['title', 'name', 'item', 'label', 'alias', 'place', 'book'];
  for (const p of prefer) {
    const hit = columns.find((c) => c.key.toLowerCase() === p);
    if (hit) return hit.key;
  }
  const firstString = columns.find((c) => c.kind === 'string' || c.kind === 'longtext');
  return firstString?.key ?? columns[0]?.key ?? null;
}
