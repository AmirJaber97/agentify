import { describe, expect, it } from 'vitest';
import type { AgentState } from '@shared/types';
import { deriveDataSummary } from './summary';

const state = (structured_data: Record<string, unknown>): AgentState => ({
  agent_id: 'x',
  stable_facts: {},
  current_state: {},
  structured_data,
  updated_at: '2026-01-01T00:00:00Z',
});

describe('deriveDataSummary', () => {
  it('summarizes by the status enum, most frequent first', () => {
    const s = deriveDataSummary(
      state({ items: [{ status: 'watching' }, { status: 'watching' }, { status: 'planned' }, { status: 'completed' }] }),
    );
    expect(s).toBe('2 watching · 1 planned · 1 completed');
  });

  it('falls back to a record count when there is no status enum', () => {
    expect(deriveDataSummary(state({ notes: [{ text: 'a' }, { text: 'b' }] }))).toBe('2 notes');
  });

  it('returns null when there is no dataset (never fabricates)', () => {
    expect(deriveDataSummary(state({ goal: 'x' }))).toBeNull();
    expect(deriveDataSummary(undefined)).toBeNull();
  });
});
