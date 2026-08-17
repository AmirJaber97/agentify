// Defensive accessors for schemaless agent state (structured_data,
// current_state, stable_facts). PAOS gives no schema guarantees here —
// a shape miss must degrade to a generic view, never crash a page.

export function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function asRecordArray(v: unknown): Record<string, unknown>[] {
  return asArray(v).filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object');
}

export function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function asBoolean(v: unknown): boolean {
  return v === true;
}
