import { describe, expect, it } from 'vitest';
import type { AgentState } from '@shared/types';
import { discoverDatasets, humanize, inferColumns, inferKind, primaryFieldOf } from './dataset';

const mkState = (structured_data: Record<string, unknown>): AgentState => ({
  agent_id: 'x',
  stable_facts: {},
  current_state: {},
  structured_data,
  updated_at: '2026-01-01T00:00:00Z',
});

describe('inferKind', () => {
  it('detects numbers, booleans and urls', () => {
    expect(inferKind('rating', [1, 2, 3]).kind).toBe('number');
    expect(inferKind('revisit', [true, false, true]).kind).toBe('boolean');
    expect(inferKind('url', ['https://a.com', 'https://b.com']).kind).toBe('url');
  });

  it('detects dates vs datetimes', () => {
    expect(inferKind('date_completed', ['2026-08-17', '2026-08-01']).kind).toBe('date');
    expect(inferKind('updated_at', ['2026-08-17T10:00:00Z']).kind).toBe('datetime');
  });

  it('detects enums from a small distinct set and returns values by frequency', () => {
    const r = inferKind('status', ['watching', 'watching', 'planned', 'completed', 'watching']);
    expect(r.kind).toBe('enum');
    expect(r.enumValues?.[0]).toBe('watching'); // most frequent first
  });

  it('treats notes-like long strings as longtext', () => {
    expect(inferKind('thoughts', ['a short note that is quite long and clearly a paragraph of prose here']).kind).toBe('longtext');
  });

  it('treats arrays of primitives as tags and all-empty as null', () => {
    expect(inferKind('tags', [['a', 'b'], ['c']]).kind).toBe('tags');
    expect(inferKind('empty', [null, '', undefined]).kind).toBe('null');
  });
});

describe('humanize', () => {
  it('humanizes snake_case and applies overrides', () => {
    expect(humanize('date_started')).toBe('Started');
    expect(humanize('media_type')).toBe('Media Type');
    expect(humanize('url')).toBe('URL');
  });
});

describe('inferColumns', () => {
  it('unions keys across rows in first-seen order and reports fill', () => {
    const cols = inferColumns([
      { title: 'A', status: 'watching' },
      { title: 'B', status: 'planned', rating: 8 },
    ]);
    expect(cols.map((c) => c.key)).toEqual(['title', 'status', 'rating']);
    expect(cols.find((c) => c.key === 'rating')!.fill).toBe(0.5);
  });
});

describe('discoverDatasets', () => {
  it('finds a top-level array of objects as a table', () => {
    const ds = discoverDatasets(mkState({ items: [{ title: 'A', status: 'watching' }, { title: 'B', status: 'planned' }] }));
    expect(ds).toHaveLength(1);
    expect(ds[0]!.path).toBe('structured_data.items');
    expect(ds[0]!.rows).toHaveLength(2);
    expect(ds[0]!.columns.map((c) => c.key)).toContain('status');
  });

  it('finds arrays nested one level inside an object', () => {
    const ds = discoverDatasets(mkState({ library: { items: [{ title: 'A' }] } }));
    expect(ds.some((d) => d.path === 'structured_data.library.items')).toBe(true);
  });

  it('ignores scalars and empty arrays, sorts largest first', () => {
    const ds = discoverDatasets(
      mkState({ note: 'hello', small: [{ a: 1 }], big: [{ a: 1 }, { a: 2 }, { a: 3 }] }),
    );
    expect(ds.map((d) => d.key)).toEqual(['big', 'small']);
  });

  it('returns nothing for state with no collections', () => {
    expect(discoverDatasets(mkState({ current_goal: 'x' }))).toHaveLength(0);
    expect(discoverDatasets(undefined)).toHaveLength(0);
  });
});

describe('primaryFieldOf', () => {
  it('prefers title/name over other strings', () => {
    const cols = inferColumns([{ source: 'plex', title: 'A' }]);
    expect(primaryFieldOf(cols)).toBe('title');
  });
});
