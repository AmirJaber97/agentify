import { useId } from 'react';

/** Minimal inline-SVG charts — no chart library, theme-aware, accessible. */

export function LineTrend({ points, height = 64 }: { points: { t: number; y: number }[]; height?: number }) {
  const gradId = useId();
  const width = 240;
  const pad = 6;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const n = points.length;
  const x = (i: number) => (n === 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2));
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`;

  return (
    <svg className="chart-line" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Trend from ${min} to ${max}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(n - 1)} cy={y(ys[n - 1]!)} r="3" fill="var(--accent)" />
    </svg>
  );
}

export function Spark({ values }: { values: number[] }) {
  const width = 80;
  const height = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${(1 - (v - min) / range) * height}`)
    .join(' ');
  return (
    <svg className="chart-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Gauge({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const tone = pct >= 1 ? 'var(--ok)' : pct >= 0.6 ? 'var(--accent)' : 'var(--warn)';
  return (
    <svg className="chart-gauge" viewBox="0 0 80 80" role="img" aria-label={`${value} of ${target}`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(c * pct).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="38" textAnchor="middle" className="chart-gauge__value">{value}</text>
      <text x="40" y="52" textAnchor="middle" className="chart-gauge__target">/ {target}</text>
    </svg>
  );
}

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
  const tone = pct >= 1 ? 'var(--ok)' : 'var(--accent)';
  return (
    <div className="chart-progress" role="img" aria-label={`${completed} of ${total}`}>
      <div className="chart-progress__track">
        <div className="chart-progress__fill" style={{ width: `${pct * 100}%`, background: tone }} />
      </div>
      <span className="chart-progress__label mono">
        {completed}/{total}
      </span>
    </div>
  );
}

export function BarDistribution({ entries, total }: { entries: { name: string; count: number }[]; total: number }) {
  const max = Math.max(...entries.map((e) => e.count), 1);
  return (
    <div className="chart-dist">
      {entries.map((e) => (
        <div key={e.name} className="chart-dist__row">
          <span className="chart-dist__name" title={e.name}>{e.name.replace(/_/g, ' ')}</span>
          <span className="chart-dist__bar">
            <span className="chart-dist__fill" style={{ width: `${(e.count / max) * 100}%` }} />
          </span>
          <span className="chart-dist__count mono">{e.count}</span>
        </div>
      ))}
      <div className="chart-dist__total mono">{total} total</div>
    </div>
  );
}
