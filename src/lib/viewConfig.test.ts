import { describe, expect, it } from 'vitest';
import type { Agent } from '@shared/types';
import { discoverDatasets } from './dataset';
import { buildUiMetadataPatch, resolveView, storedViewConfig } from './viewConfig';

const agent = (ui_metadata: Record<string, unknown>): Agent =>
  ({ id: 'media', name: 'Media', ui_metadata } as unknown as Agent);

const dataset = () =>
  discoverDatasets({
    agent_id: 'media',
    stable_facts: {},
    current_state: {},
    structured_data: {
      items: [
        { title: 'A', status: 'watching', updated_at: '2026-08-10T00:00:00Z', empty: '' },
        { title: 'B', status: 'planned', updated_at: '2026-08-12T00:00:00Z', empty: '' },
      ],
    },
    updated_at: '2026-08-12T00:00:00Z',
  })[0]!;

describe('resolveView', () => {
  it('auto-generates a sensible default: newest-first sort, all-empty column hidden', () => {
    const r = resolveView(dataset(), undefined);
    expect(r.sort).toEqual([{ id: 'updated_at', desc: true }]);
    expect(r.hiddenColumns.has('empty')).toBe(true); // all-empty auto-hidden
    expect(r.primaryField).toBe('title');
    expect(r.customized).toBe(false);
  });

  it('merges stored config over defaults and keeps newly-added columns visible', () => {
    const r = resolveView(dataset(), { label: 'Library', hidden_columns: ['status'], column_order: ['status', 'title'] });
    expect(r.label).toBe('Library');
    expect(r.hiddenColumns.has('status')).toBe(true);
    // column_order respected, then any columns it didn't know about appended
    expect(r.orderedColumns[0]!.key).toBe('status');
    expect(r.orderedColumns.map((c) => c.key)).toContain('updated_at');
    expect(r.customized).toBe(true);
  });
});

describe('buildUiMetadataPatch', () => {
  it('preserves other ui_metadata keys (e.g. Hermes card_metrics) and other datasets', () => {
    const a = agent({
      card_metrics: ['currently_watching', 'planned'],
      agentify: { views: { 'structured_data.other': { label: 'Other' } } },
    });
    const patch = buildUiMetadataPatch(a, 'structured_data.items', { label: 'Library' });
    expect((patch as any).card_metrics).toEqual(['currently_watching', 'planned']);
    expect((patch as any).agentify.views['structured_data.other'].label).toBe('Other');
    expect((patch as any).agentify.views['structured_data.items'].label).toBe('Library');
  });

  it('round-trips through storedViewConfig', () => {
    const patch = buildUiMetadataPatch(agent({}), 'structured_data.items', { primary_field: 'title', default_sort: [{ id: 'title', desc: false }] });
    const updated = agent(patch);
    expect(storedViewConfig(updated, 'structured_data.items')?.primary_field).toBe('title');
  });
});
