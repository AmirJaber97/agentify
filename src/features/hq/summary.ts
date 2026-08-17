import type { AgentState } from '@shared/types';
import { discoverDatasets } from '@/lib/dataset';

/**
 * Derive a short, factual data summary from an agent's real structured_data —
 * e.g. Media "3 watching · 4 planned". Returns null when the data can't support
 * a metric (never fabricated). Uses the primary dataset's status-like enum.
 */
export function deriveDataSummary(state: AgentState | undefined): string | null {
  const datasets = discoverDatasets(state);
  if (datasets.length === 0) return null;
  const primary = datasets[0]!;

  const statusCol =
    primary.columns.find((c) => c.kind === 'enum' && c.key.toLowerCase() === 'status') ??
    primary.columns.find((c) => c.kind === 'enum');

  if (statusCol) {
    const counts = new Map<string, number>();
    for (const row of primary.rows) {
      const v = row[statusCol.key];
      if (typeof v === 'string' && v.trim()) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length > 0) return top.map(([k, n]) => `${n} ${k.replace(/_/g, ' ')}`).join(' · ');
  }

  return `${primary.rows.length} ${primary.label.toLowerCase()}`;
}
