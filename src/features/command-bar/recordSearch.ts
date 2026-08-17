import type { QueryClient } from '@tanstack/react-query';
import type { AgentCard, AgentState } from '@shared/types';
import { discoverDatasets, primaryFieldOf, isEmptyValue } from '@/lib/dataset';

export interface RecordHit {
  agentId: string;
  agentLabel: string;
  datasetLabel: string;
  primary: string;
  secondary: string;
}

/**
 * Lightweight, offline record search over agent states already in the query
 * cache (warm after visiting HQ or an agent). Surfaces e.g. "Media → The
 * Expanse → watching". Bounded on purpose — it never fetches, only reads cache.
 */
export function searchRecords(qc: QueryClient, query: string, limit = 8): RecordHit[] {
  const needle = query.toLowerCase().trim();
  if (needle.length < 2) return [];

  const nameById = new Map<string, string>();
  const cards = qc.getQueryData<AgentCard[]>(['agents']);
  for (const c of cards ?? []) nameById.set(c.id, c.name);

  const stateEntries = qc.getQueriesData<AgentState>({ queryKey: ['agent'] });
  const hits: RecordHit[] = [];

  for (const [key, state] of stateEntries) {
    if (!Array.isArray(key) || key.length !== 3 || key[2] !== 'state' || !state) continue;
    const agentId = String(key[1]);
    for (const dataset of discoverDatasets(state)) {
      const primaryField = primaryFieldOf(dataset.columns);
      const statusCol = dataset.columns.find((c) => c.key.toLowerCase() === 'status');
      for (const row of dataset.rows) {
        const matched = dataset.columns.some((c) => {
          const v = row[c.key];
          return typeof v === 'string' && v.toLowerCase().includes(needle);
        });
        if (!matched) continue;
        const primary = primaryField ? String(row[primaryField] ?? '') : dataset.label;
        const statusVal = statusCol ? row[statusCol.key] : null;
        hits.push({
          agentId,
          agentLabel: nameById.get(agentId) ?? agentId,
          datasetLabel: dataset.label,
          primary,
          secondary: !isEmptyValue(statusVal) ? String(statusVal) : dataset.label,
        });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}
