// Generic "generate dashboard" engine. Given the rows of any dataset it
// flattens nested records, classifies fields from the actual values, and emits
// a spec of chart widgets that make sense for that data — trends for numbers
// over time, gauges for value/target pairs, progress for completed/total pairs,
// distributions for enums. Nothing is agent-specific.

import { humanize, inferKind, isEmptyValue } from './dataset';

export type Widget =
  | { kind: 'stat'; id: string; label: string; value: string; sub?: string; delta?: { text: string; dir: 'up' | 'down' | 'flat' }; spark?: number[] }
  | { kind: 'trend'; id: string; label: string; points: { t: number; y: number }[]; latest: number; delta?: { text: string; dir: 'up' | 'down' | 'flat' }; unit?: string }
  | { kind: 'gauge'; id: string; label: string; value: number; target: number }
  | { kind: 'progress'; id: string; label: string; completed: number; total: number }
  | { kind: 'distribution'; id: string; label: string; entries: { name: string; count: number }[]; total: number };

export interface Dashboard {
  widgets: Widget[];
  recordCount: number;
  timeField: string | null;
  latestLabel: string | null;
}

const GENERIC_LEAVES = new Set(['value', 'amount', 'count', 'hours', 'glasses', 'minutes', 'level', 'num', 'qty', 'total', 'reading']);
const SALIENT = /weight|sleep|water|glass|hour|calorie|protein|carb|fat|duration|rating|price|step|distance|reps|streak|adherence|score|mood|energy|value/i;

function flatten(obj: Record<string, unknown>, prefix: string, out: Record<string, unknown>, depth: number): void {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) continue; // skip arrays (observations, exercises, tags)
    if (typeof v === 'object') {
      if (depth < 2) flatten(v as Record<string, unknown>, key, out, depth + 1);
      continue;
    }
    out[key] = v;
  }
}

export function flattenRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  flatten(row, '', out, 0);
  return out;
}

function labelForPath(path: string): string {
  const segs = path.split('.');
  const leaf = segs[segs.length - 1]!;
  const parent = segs.length > 1 ? segs[segs.length - 2]! : '';
  if (GENERIC_LEAVES.has(leaf.toLowerCase()) && parent) return humanize(parent);
  if (parent && !leaf.toLowerCase().includes(parent.toLowerCase())) {
    const p = humanize(parent);
    const l = humanize(leaf);
    return p === l ? l : `${p} ${l}`;
  }
  return humanize(leaf);
}

function deltaOf(first: number, last: number, unit = ''): { text: string; dir: 'up' | 'down' | 'flat' } {
  const d = last - first;
  const dir = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'down';
  const sign = d > 0 ? '+' : '';
  return { text: `${sign}${round(d)}${unit}`, dir };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round(n));
}

export function buildDashboard(rows: Record<string, unknown>[]): Dashboard {
  const flat = rows.map(flattenRecord);
  const recordCount = rows.length;
  if (recordCount === 0) return { widgets: [], recordCount: 0, timeField: null, latestLabel: null };

  // Union of flattened fields in first-seen order.
  const fields: string[] = [];
  const seen = new Set<string>();
  for (const f of flat) for (const k of Object.keys(f)) if (!seen.has(k)) (seen.add(k), fields.push(k));

  const kinds = new Map<string, ReturnType<typeof inferKind>>();
  const fill = new Map<string, number>();
  for (const key of fields) {
    const values = flat.map((f) => f[key]);
    kinds.set(key, inferKind(key.split('.').pop()!, values));
    fill.set(key, values.filter((v) => !isEmptyValue(v)).length / recordCount);
  }

  // Time axis: prefer a `date` leaf, then created_at, then any datetime.
  const timeField =
    fields.find((k) => k.split('.').pop() === 'date' && (kinds.get(k)!.kind === 'date' || kinds.get(k)!.kind === 'datetime')) ??
    fields.find((k) => k.endsWith('created_at')) ??
    fields.find((k) => kinds.get(k)!.kind === 'datetime') ??
    null;

  const order = flat.map((f, i) => ({ i, t: timeField ? Date.parse(String(f[timeField] ?? '')) : i }));
  order.sort((a, b) => (Number.isNaN(a.t) ? -1 : a.t) - (Number.isNaN(b.t) ? -1 : b.t));
  const sorted = order.map((o) => flat[o.i]!);
  const latest = sorted[sorted.length - 1]!;
  const latestLabel = timeField ? String(latest[timeField] ?? '').slice(0, 10) || null : null;

  const numericFields = fields.filter((k) => kinds.get(k)!.kind === 'number' && fill.get(k)! >= 0.3);
  const consumed = new Set<string>();
  const widgets: Widget[] = [];

  // value/target gauges and completed/total progress (latest snapshot).
  for (const key of numericFields) {
    if (consumed.has(key)) continue;
    const segs = key.split('.');
    const leaf = segs[segs.length - 1]!;
    const base = segs.slice(0, -1).join('.');
    const targetKey = numericFields.find((k) => k === `${base}${base ? '.' : ''}target_${leaf}` || k === `${base}${base ? '.' : ''}${leaf}_target`);
    if (targetKey && !isEmptyValue(latest[key]) && !isEmptyValue(latest[targetKey])) {
      consumed.add(key);
      consumed.add(targetKey);
      widgets.push({ kind: 'gauge', id: key, label: labelForPath(key), value: Number(latest[key]), target: Number(latest[targetKey]) });
      continue;
    }
    if (leaf.endsWith('_completed')) {
      const totalKey = numericFields.find((k) => k === `${base}${base ? '.' : ''}${leaf.replace('_completed', '_total')}`);
      if (totalKey && !isEmptyValue(latest[key]) && !isEmptyValue(latest[totalKey])) {
        consumed.add(key);
        consumed.add(totalKey);
        const groupLabel = humanize(`${segs.slice(0, -1).pop() ?? ''} ${leaf.replace('_completed', '')}`).trim();
        widgets.push({ kind: 'progress', id: key, label: groupLabel || labelForPath(key), completed: Number(latest[key]), total: Number(latest[totalKey]) });
        continue;
      }
    }
  }

  // Remaining numerics → trend (if a time series) or stat, salient first.
  // Suppress derived/paired-half fields that would just add noise.
  const NOISE = /^target_|_target$|_total$|change_from|_from_start/;
  const remaining = numericFields
    .filter((k) => !consumed.has(k) && !NOISE.test(k.split('.').pop()!))
    .sort((a, b) => (SALIENT.test(b) ? 1 : 0) - (SALIENT.test(a) ? 1 : 0));
  let trendCount = 0;
  for (const key of remaining) {
    const points = sorted
      .map((f) => ({ t: timeField ? Date.parse(String(f[timeField] ?? '')) : 0, y: f[key] }))
      .filter((p) => !isEmptyValue(p.y))
      .map((p) => ({ t: p.t, y: Number(p.y) }));
    if (points.length === 0) continue;
    const ys = points.map((p) => p.y);
    const latestY = ys[ys.length - 1]!;
    const unit = key.includes('kg') || /weight/i.test(key) ? '' : '';

    if (timeField && points.length >= 3 && trendCount < 4) {
      trendCount += 1;
      widgets.push({ kind: 'trend', id: key, label: labelForPath(key), points, latest: latestY, delta: deltaOf(ys[0]!, latestY, unit), unit });
    } else if (SALIENT.test(key) || points.length >= 2) {
      const avg = ys.reduce((s, y) => s + y, 0) / ys.length;
      widgets.push({
        kind: 'stat',
        id: key,
        label: labelForPath(key),
        value: fmt(latestY),
        sub: ys.length > 1 ? `avg ${fmt(avg)}` : undefined,
        delta: ys.length >= 2 ? deltaOf(ys[0]!, latestY) : undefined,
        spark: ys.length >= 3 ? ys : undefined,
      });
    }
  }

  // Enum distributions (status/type first), low cardinality only.
  const enumFields = fields
    .filter((k) => kinds.get(k)!.kind === 'enum' && fill.get(k)! >= 0.3)
    .sort((a, b) => rankEnum(a) - rankEnum(b))
    .slice(0, 3);
  for (const key of enumFields) {
    const counts = new Map<string, number>();
    for (const f of flat) {
      const v = f[key];
      if (typeof v === 'string' && v.trim()) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    if (entries.length >= 2) widgets.push({ kind: 'distribution', id: key, label: labelForPath(key), entries, total: rows.length });
  }

  return { widgets, recordCount, timeField, latestLabel };
}

function rankEnum(key: string): number {
  const leaf = key.split('.').pop()!.toLowerCase();
  if (leaf === 'status') return 0;
  if (leaf === 'type') return 1;
  return 5;
}
