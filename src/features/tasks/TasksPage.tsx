import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { TaskStatus } from '@shared/types';
import { TASK_STATUSES } from '@shared/types';
import { useAgents, useTasks } from '@/api/queries';
import { EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { TaskStatusBadge } from '@/components/status';
import { RelativeTime } from '@/components/RelativeTime';

const OPEN_STATUSES: TaskStatus[] = ['QUEUED', 'RUNNING', 'WAITING_FOR_USER', 'OPEN'];

export function TasksPage() {
  const tasks = useTasks();
  const agents = useAgents();
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  // The v1 API has no filter params — all filtering is client-side over the
  // newest-first window the API returns.
  const filtered = useMemo(() => {
    let rows = tasks.data ?? [];
    if (!showClosed && !statusFilter) rows = rows.filter((t) => OPEN_STATUSES.includes(t.status));
    if (agentFilter) rows = rows.filter((t) => t.agent_id === agentFilter);
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (priorityFilter) rows = rows.filter((t) => String(t.priority ?? 3) === priorityFilter);
    return rows;
  }, [tasks.data, agentFilter, statusFilter, priorityFilter, showClosed]);

  return (
    <>
      <div className="page-header">
        <h1>Tasks</h1>
        <span className="page-header__hint">Showing the latest {tasks.data?.length ?? 0} tasks across all agents.</span>
      </div>

      <div className="filter-bar">
        <select className="select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label="Filter by agent">
          <option value="">All agents</option>
          {(agents.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">Open statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">Any priority</option>
          {[1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={String(p)}>
              P{p}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          include finished
        </label>
      </div>

      <Panel flush>
        {tasks.isPending && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={20} />
          </div>
        )}
        {tasks.isError && <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />}
        {tasks.data && filtered.length === 0 && (
          <EmptyState icon="☰" title="No tasks match" hint="Adjust the filters, or enjoy the quiet." />
        )}
        {filtered.map((t) => (
          <div key={t.id} className={clsx('task-row', t.status === 'RUNNING' && 'task-row__running')}>
            <span className="task-row__title">
              {t.title}
              {t.description && <span className="attention-item__meta"> — {t.description}</span>}
            </span>
            <span className="task-row__meta">
              <span className="mono">P{t.priority ?? 3}</span>
              <Link to={`/agents/${t.agent_id}`} className="mono">
                {t.agent_id}
              </Link>
              {t.due_at && (
                <span>
                  due <RelativeTime iso={t.due_at} />
                </span>
              )}
              <RelativeTime iso={t.updated_at} />
              <TaskStatusBadge status={t.status} />
            </span>
          </div>
        ))}
      </Panel>
    </>
  );
}
