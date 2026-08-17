import type { AgentState } from '@shared/types';
import { asNumber, asRecord, asRecordArray, asString } from '@/lib/guards';
import { GenericStateView } from '../GenericStateView';
import { RelativeTime } from '@/components/RelativeTime';
import { formatRelative } from '@/lib/format';

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      {sub && <span className="metric__sub">{sub}</span>}
    </div>
  );
}

/** Weight trend as a tiny CSS bar sparkline — only when numeric history exists. */
function WeightSpark({ points }: { points: Array<{ date: string; weight: number }> }) {
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  return (
    <div>
      <div className="project-card__section-title" style={{ marginBottom: 6 }}>
        Weight trend ({min.toFixed(1)}–{max.toFixed(1)} kg)
      </div>
      <div className="spark" role="img" aria-label={`Weight trend from ${weights[0]} to ${weights[weights.length - 1]} kg`}>
        {points.map((p) => (
          <div
            key={p.date}
            className="spark__bar"
            style={{ height: `${20 + ((p.weight - min) / range) * 80}%` }}
            title={`${p.weight} kg — ${formatRelative(p.date)}`}
          />
        ))}
      </div>
    </div>
  );
}

export function HealthBoard({ state }: { state: AgentState }) {
  const current = asRecord(state.current_state);
  const structured = asRecord(state.structured_data);

  const goal = asString(current.goal);
  const plan = asString(current.plan);
  const nextWorkout = asString(current.next_workout);
  const todaysState = asString(current.todays_state);
  const streak = asNumber(current.workout_streak_days);
  const adherence = asNumber(current.diet_adherence_week);

  const workouts = asRecordArray(structured.workouts)
    .map((w) => ({
      date: asString(w.date),
      type: asString(w.type, 'Workout'),
      duration: asNumber(w.duration_min),
      notes: asString(w.notes),
    }))
    .filter((w) => w.date);

  const measurements = asRecordArray(structured.measurements)
    .map((m) => ({ date: asString(m.date), weight: asNumber(m.weight_kg) }))
    .filter((m): m is { date: string; weight: number } => m.weight !== null && m.date !== '')
    .sort((a, b) => a.date.localeCompare(b.date));

  const observations = (Array.isArray(structured.observations) ? structured.observations : []).filter(
    (o): o is string => typeof o === 'string',
  );

  const hasAnything = goal || plan || workouts.length > 0 || measurements.length > 0;
  if (!hasAnything) return <GenericStateView state={state} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="metric-row">
        {streak !== null && <Metric label="Streak" value={`${streak}d`} sub="workout streak" />}
        {adherence !== null && <Metric label="Diet" value={`${Math.round(adherence * 100)}%`} sub="adherence this week" />}
        {workouts.length > 0 && <Metric label="Workouts" value={String(workouts.length)} sub="recent sessions" />}
        {measurements.length > 0 && (
          <Metric label="Weight" value={`${measurements[measurements.length - 1]!.weight.toFixed(1)}kg`} sub="latest" />
        )}
      </div>

      {(goal || plan || nextWorkout || todaysState) && (
        <dl className="kv">
          {goal && (
            <div style={{ display: 'contents' }}>
              <dt>Goal</dt>
              <dd>{goal}</dd>
            </div>
          )}
          {plan && (
            <div style={{ display: 'contents' }}>
              <dt>Plan</dt>
              <dd>{plan}</dd>
            </div>
          )}
          {nextWorkout && (
            <div style={{ display: 'contents' }}>
              <dt>Next workout</dt>
              <dd>{nextWorkout}</dd>
            </div>
          )}
          {todaysState && (
            <div style={{ display: 'contents' }}>
              <dt>Today</dt>
              <dd>{todaysState}</dd>
            </div>
          )}
        </dl>
      )}

      {measurements.length >= 3 && <WeightSpark points={measurements} />}

      {workouts.length > 0 && (
        <div>
          <div className="project-card__section-title" style={{ marginBottom: 6 }}>
            Recent workouts
          </div>
          <div>
            {workouts.slice(0, 6).map((w) => (
              <div key={`${w.date}-${w.type}`} className="task-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <span className="task-row__title">
                  <strong>{w.type}</strong>
                  {w.duration !== null && <span className="attention-item__meta"> · {w.duration} min</span>}
                  {w.notes && <span className="attention-item__meta"> · {w.notes}</span>}
                </span>
                <span className="task-row__meta">
                  <RelativeTime iso={w.date} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {observations.length > 0 && (
        <div>
          <div className="project-card__section-title" style={{ marginBottom: 6 }}>
            Observations
          </div>
          <ul className="project-card__list">
            {observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
