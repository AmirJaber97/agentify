import { useNavigate } from 'react-router-dom';
import { useAgents } from '@/api/queries';
import { Button, EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { AgentCard } from './AgentCard';

export function AgentsPage() {
  const agents = useAgents();
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header">
        <h1>Agents</h1>
        <Button variant="accent" onClick={() => navigate('/agents/new')}>
          ✚ Create Agent
        </Button>
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
      {agents.data && (
        <div className="roster">
          {agents.data.map((card) => (
            <AgentCard key={card.id} card={card} />
          ))}
        </div>
      )}
      {agents.data?.length === 0 && (
        <Panel>
          <EmptyState icon="⬡" title="No agents yet" hint="Create your first agent to get started." />
        </Panel>
      )}
    </>
  );
}
