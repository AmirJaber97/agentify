import { describe, expect, it } from 'vitest';
import { buildDashboard, flattenRecord, type Widget } from './analytics';

function byKind(widgets: Widget[], kind: Widget['kind']) {
  return widgets.filter((w) => w.kind === kind);
}

const healthRows = [0, 1, 2].map((i) => ({
  date: `2026-08-1${5 + i}`,
  created_at: `2026-08-1${5 + i}T08:00:00Z`,
  sleep: { hours: 7 + (i % 2) },
  water: { glasses: 6 + i, target_glasses: 8 },
  weight: { value: 96 - i * 0.5, change_from_start: -i * 0.5 },
  workout: { status: i === 2 ? 'skipped' : 'completed', main_completed: i === 2 ? 4 : 6, main_total: 6 },
}));

describe('flattenRecord', () => {
  it('flattens nested objects to dotted keys and drops arrays', () => {
    const flat = flattenRecord({ a: 1, b: { c: 2, d: { e: 3 } }, arr: [1, 2], nil: null });
    expect(flat).toMatchObject({ a: 1, 'b.c': 2, 'b.d.e': 3 });
    expect(flat).not.toHaveProperty('arr');
    expect(flat).not.toHaveProperty('nil');
  });
});

describe('buildDashboard', () => {
  it('produces a time-series trend for a numeric field over a date', () => {
    const dash = buildDashboard(healthRows);
    const trends = byKind(dash.widgets, 'trend');
    const weight = trends.find((w) => w.label === 'Weight');
    expect(weight).toBeTruthy();
    expect((weight as Extract<Widget, { kind: 'trend' }>).points).toHaveLength(3);
    expect(dash.timeField).toBeTruthy();
    expect(dash.latestLabel).toBe('2026-08-17');
  });

  it('detects value/target as a gauge and completed/total as progress from the latest record', () => {
    const dash = buildDashboard(healthRows);
    const gauge = byKind(dash.widgets, 'gauge').find((w) => w.label === 'Water') as Extract<Widget, { kind: 'gauge' }>;
    expect(gauge).toMatchObject({ value: 8, target: 8 }); // latest row: glasses 6+2
    const progress = byKind(dash.widgets, 'progress')[0] as Extract<Widget, { kind: 'progress' }>;
    expect(progress).toMatchObject({ completed: 4, total: 6 });
  });

  it('builds a distribution from an enum field', () => {
    const dash = buildDashboard(healthRows);
    const dist = byKind(dash.widgets, 'distribution').find((w) => /status/i.test(w.label)) as Extract<Widget, { kind: 'distribution' }>;
    expect(dist.entries).toEqual(expect.arrayContaining([{ name: 'completed', count: 2 }, { name: 'skipped', count: 1 }]));
  });

  it('suppresses derived/paired-half fields (change_from_start, targets, totals)', () => {
    const dash = buildDashboard(healthRows);
    const labels = dash.widgets.map((w) => w.label);
    expect(labels.some((l) => /change from start/i.test(l))).toBe(false);
    expect(labels.some((l) => /target/i.test(l))).toBe(false);
  });

  it('returns no widgets for data with nothing chartable', () => {
    const dash = buildDashboard([{ title: 'A', note: 'hello' }, { title: 'B', note: 'world' }]);
    expect(dash.widgets).toHaveLength(0);
  });

  it('works on a flat dataset (Media-style): avg rating stat + status distribution', () => {
    const media = [
      { title: 'A', status: 'completed', rating: 9, type: 'series' },
      { title: 'B', status: 'completed', rating: 7, type: 'movie' },
      { title: 'C', status: 'planned', rating: null, type: 'series' },
    ];
    const dash = buildDashboard(media);
    expect(byKind(dash.widgets, 'distribution').length).toBeGreaterThanOrEqual(1);
  });
});
