import { Link } from 'react-router-dom';
import type { ProjectSummary, Task } from '@shared/types';
import { useOverview } from '@/api/queries';
import { EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { TaskStatusBadge } from '@/components/status';
import { Timeline } from '@/components/Timeline';
import { RelativeTime } from '@/components/RelativeTime';
import { AgentCard } from './AgentCard';
import clsx from 'clsx';

function warningText(w: unknown): { text: string; agentId?: string } {
  if (typeof w === 'string') return { text: w };
  const rec = w as Record<string, unknown>;
  const text = String(rec.message ?? rec.warning ?? rec.text ?? JSON.stringify(w));
  const agentId = typeof rec.agent_id === 'string' ? rec.agent_id : undefined;
  return { text, agentId };
}

function TaskRailRow({ task }: { task: Task }) {
  return (
    <div className={clsx('task-row', task.status === 'RUNNING' && 'task-row__running')}>
      <span className="task-row__title">{task.title}</span>
      <span className="task-row__meta">
        <Link to={`/agents/${task.agent_id}`} className="mono">
          {task.agent_id}
        </Link>
        <TaskStatusBadge status={task.status} />
      </span>
    </div>
  );
}

export function OverviewPage() {
  const overview = useOverview();

  if (overview.isPending) {
    return (
      <>
        <div className="system-strip">
          <Skeleton width={240} height={18} />
        </div>
        <div className="roster">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="agent-card" style={{ minHeight: 140 }}>
              <Skeleton height={40} />
              <Skeleton height={14} width="70%" />
              <Skeleton height={14} width="50%" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (overview.isError) {
    return (
      <Panel title="Overview">
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      </Panel>
    );
  }

  const data = overview.data;
  const system = data.system as Record<string, unknown>;
  const byStatus = (system.agents_by_status ?? {}) as Record<string, number>;
  const activeTasks = [...data.running_tasks, ...data.queued_tasks];
  const attention: Array<{ key: string; text: string; link?: string; meta?: string }> = [];

  for (const [i, w] of data.warnings.entries()) {
    const { text, agentId } = warningText(w);
    attention.push({ key: `warn-${i}`, text, link: agentId ? `/agents/${agentId}` : undefined });
  }
  for (const p of data.projects_needing_attention as ProjectSummary[]) {
    attention.push({
      key: `proj-${p.project_alias}`,
      text: `${p.project_alias}: ${p.attention_next_session || p.session_summary || `project is ${p.status}`}`,
      link: '/projects',
      meta: p.status,
    });
  }
  const waitingTasks = activeTasks.filter((t) => t.status === 'WAITING_FOR_USER');
  for (const t of waitingTasks) {
    attention.push({ key: `task-${t.id}`, text: `${t.title} — waiting for you`, link: `/agents/${t.agent_id}` });
  }

  return (
    <>
      <div className="system-strip" aria-label="System status">
        <span className="system-strip__item">
          Hermes <span className="system-strip__value">{String(system.status ?? 'unknown')}</span>
        </span>
        <span className="system-strip__item">
          Agents{' '}
          <span className="system-strip__value">
            {Object.entries(byStatus)
              .map(([s, n]) => `${n} ${s.toLowerCase()}`)
              .join(' · ') || '—'}
          </span>
        </span>
        <span className="system-strip__item">
          Running <span className="system-strip__value">{data.running_tasks.length}</span>
        </span>
        <span className="system-strip__item">
          Queued <span className="system-strip__value">{data.queued_tasks.length}</span>
        </span>
        {typeof system.time === 'string' && (
          <span className="system-strip__item">
            Updated{' '}
            <span className="system-strip__value">
              <RelativeTime iso={system.time} />
            </span>
          </span>
        )}
      </div>

      <div className="overview-grid">
        <div className="overview-grid__side">
          <section aria-label="Agent roster">
            <div className="roster">
              {data.agents.map((card) => (
                <AgentCard key={card.id} card={card} />
              ))}
            </div>
            {data.agents.length === 0 && (
              <Panel>
                <EmptyState
                  icon="⬡"
                  title="No agents yet"
                  hint="Create your first agent to start delegating parts of your life and work."
                />
              </Panel>
            )}
          </section>

          <Panel title="Recent activity" flush>
            <Timeline items={data.recent_activity.slice(0, 10)} />
          </Panel>
        </div>

        <div className="overview-grid__side">
          <Panel title="Needs attention" flush>
            {attention.length === 0 ? (
              <EmptyState icon="✓" title="All clear" hint="Nothing is waiting on you right now." />
            ) : (
              <div>
                {attention.map((a) => (
                  <div key={a.key} className="attention-item">
                    <span className="attention-item__icon" aria-hidden="true">
                      ▲
                    </span>
                    <span className="attention-item__text">
                      {a.link ? <Link to={a.link}>{a.text}</Link> : a.text}
                      {a.meta && <span className="attention-item__meta"> · {a.meta}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Active tasks" flush>
            {activeTasks.length === 0 ? (
              <EmptyState icon="◱" title="Nothing running" hint="Running and queued tasks appear here." />
            ) : (
              <div>
                {activeTasks.map((t) => (
                  <TaskRailRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
