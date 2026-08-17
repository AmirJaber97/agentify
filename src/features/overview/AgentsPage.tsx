import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAgents } from '@/api/queries';
import { Button, EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { AgentCard } from './AgentCard';
import { HQView } from '@/features/hq/HQView';

type ViewMode = 'hq' | 'list';
const PREF_KEY = 'agentify:agents-view';

function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF_KEY) : null;
    // HQ is desktop-first; default to the efficient list on narrow screens.
    if (stored === 'hq' || stored === 'list') return stored;
    return typeof window !== 'undefined' && window.innerWidth < 700 ? 'list' : 'hq';
  });
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);
  return [mode, setMode];
}

export function AgentsPage() {
  const agents = useAgents();
  const navigate = useNavigate();
  const [mode, setMode] = useViewMode();

  return (
    <>
      <div className="page-header">
        <h1>Agents</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={clsx('view-toggle__btn', mode === 'hq' && 'view-toggle__btn--active')}
              aria-pressed={mode === 'hq'}
              onClick={() => setMode('hq')}
            >
              ⬡ HQ
            </button>
            <button
              type="button"
              className={clsx('view-toggle__btn', mode === 'list' && 'view-toggle__btn--active')}
              aria-pressed={mode === 'list'}
              onClick={() => setMode('list')}
            >
              ☰ List
            </button>
          </div>
          <Button variant="accent" onClick={() => navigate('/agents/new')}>
            ✚ Create Agent
          </Button>
        </div>
      </div>

      {agents.isPending && (
        <div className="roster">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="agent-card" style={{ minHeight: 140 }}>
              <Skeleton height={40} />
              <Skeleton height={14} width="70%" />
            </div>
          ))}
        </div>
      )}
      {agents.isError && (
        <Panel>
          <ErrorState error={agents.error} onRetry={() => void agents.refetch()} />
        </Panel>
      )}

      {agents.data && agents.data.length > 0 && (mode === 'hq' ? <HQView agents={agents.data} /> : (
        <div className="roster">
          {agents.data.map((card) => (
            <AgentCard key={card.id} card={card} />
          ))}
        </div>
      ))}

      {agents.data?.length === 0 && (
        <Panel>
          <EmptyState icon="⬡" title="No agents yet" hint="Create your first agent to get started." />
        </Panel>
      )}
    </>
  );
}
