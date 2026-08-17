import { useMemo } from 'react';
import type { Dataset } from '@/lib/dataset';
import { buildDashboard, type Widget } from '@/lib/analytics';
import { EmptyState } from '@/components/ui';
import { BarDistribution, Gauge, LineTrend, ProgressBar, Spark } from './charts';

function DeltaTag({ delta }: { delta?: { text: string; dir: 'up' | 'down' | 'flat' } }) {
  if (!delta) return null;
  const arrow = delta.dir === 'up' ? '↑' : delta.dir === 'down' ? '↓' : '→';
  return <span className={`dash-delta dash-delta--${delta.dir}`}>{arrow} {delta.text}</span>;
}

function WidgetCard({ w }: { w: Widget }) {
  switch (w.kind) {
    case 'stat':
      return (
        <div className="dash-card dash-card--stat">
          <div className="dash-card__label">{w.label}</div>
          <div className="dash-card__value">{w.value}</div>
          <div className="dash-card__foot">
            {w.sub && <span className="dash-card__sub">{w.sub}</span>}
            <DeltaTag delta={w.delta} />
          </div>
          {w.spark && (
            <div className="dash-card__spark">
              <Spark values={w.spark} />
            </div>
          )}
        </div>
      );
    case 'trend':
      return (
        <div className="dash-card dash-card--wide">
          <div className="dash-card__head">
            <span className="dash-card__label">{w.label}</span>
            <span className="dash-card__value dash-card__value--sm">
              {w.latest}
              {w.unit} <DeltaTag delta={w.delta} />
            </span>
          </div>
          <LineTrend points={w.points} />
        </div>
      );
    case 'gauge':
      return (
        <div className="dash-card dash-card--center">
          <div className="dash-card__label">{w.label}</div>
          <Gauge value={w.value} target={w.target} />
        </div>
      );
    case 'progress':
      return (
        <div className="dash-card">
          <div className="dash-card__label">{w.label}</div>
          <ProgressBar completed={w.completed} total={w.total} />
        </div>
      );
    case 'distribution':
      return (
        <div className="dash-card dash-card--wide">
          <div className="dash-card__label">{w.label}</div>
          <BarDistribution entries={w.entries} total={w.total} />
        </div>
      );
    default:
      return null;
  }
}

/** Auto-generated statistics dashboard for a dataset. */
export function DatasetDashboard({ dataset }: { dataset: Dataset }) {
  const dash = useMemo(() => buildDashboard(dataset.rows), [dataset.rows]);

  if (dash.widgets.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Not enough to chart yet"
        hint="This dataset has no numeric or categorical fields that make a useful dashboard. Add records over time to see trends."
      />
    );
  }

  const snapshot = dash.widgets.filter((w) => w.kind === 'gauge' || w.kind === 'progress');
  const stats = dash.widgets.filter((w) => w.kind === 'stat');
  const trends = dash.widgets.filter((w) => w.kind === 'trend');
  const dists = dash.widgets.filter((w) => w.kind === 'distribution');

  return (
    <div className="dash">
      {dash.latestLabel && (
        <div className="dash__meta">
          {dash.recordCount} records · latest {dash.latestLabel}
        </div>
      )}
      {stats.length > 0 && <div className="dash-grid">{stats.map((w) => <WidgetCard key={w.id} w={w} />)}</div>}
      {trends.length > 0 && <div className="dash-grid dash-grid--wide">{trends.map((w) => <WidgetCard key={w.id} w={w} />)}</div>}
      {snapshot.length > 0 && (
        <div className="dash-section">
          <div className="dash-section__title">Latest{dash.latestLabel ? ` · ${dash.latestLabel}` : ''}</div>
          <div className="dash-grid">{snapshot.map((w) => <WidgetCard key={w.id} w={w} />)}</div>
        </div>
      )}
      {dists.length > 0 && <div className="dash-grid dash-grid--wide">{dists.map((w) => <WidgetCard key={w.id} w={w} />)}</div>}
    </div>
  );
}
