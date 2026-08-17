import { useMemo, useState } from 'react';
import { useActivity, useAgents } from '@/api/queries';
import { ErrorState, Panel, Skeleton } from '@/components/ui';
import { Timeline } from '@/components/Timeline';

export function ActivityPage() {
  const activity = useActivity();
  const agents = useAgents();
  const [agentFilter, setAgentFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const filtered = useMemo(() => {
    let rows = activity.data ?? [];
    if (agentFilter === 'system') rows = rows.filter((a) => !a.agent_id);
    else if (agentFilter) rows = rows.filter((a) => a.agent_id === agentFilter);
    if (levelFilter) rows = rows.filter((a) => (a.level ?? 'info') === levelFilter);
    return rows;
  }, [activity.data, agentFilter, levelFilter]);

  return (
    <>
      <div className="page-header">
        <h1>Activity</h1>
        <span className="page-header__hint">The latest {activity.data?.length ?? 0} events across the whole system.</span>
      </div>

      <div className="filter-bar">
        <select className="select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label="Filter by agent">
          <option value="">All sources</option>
          <option value="system">System</option>
          {(agents.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} aria-label="Filter by level">
          <option value="">All levels</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
      </div>

      <Panel flush>
        {activity.isPending && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        )}
        {activity.isError && <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />}
        {activity.data && <Timeline items={filtered} emptyTitle="No matching events" />}
      </Panel>
    </>
  );
}
