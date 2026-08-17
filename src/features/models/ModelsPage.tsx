import { useModels } from '@/api/queries';
import { Badge, EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { StatusDot } from '@/components/status';

export function ModelsPage() {
  const models = useModels();

  return (
    <>
      <div className="page-header">
        <h1>Models</h1>
        <span className="page-header__hint">
          Providers registered with Hermes. Routing picks by privacy class, policy and priority.
        </span>
      </div>

      <Panel flush>
        {models.isPending && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        )}
        {models.isError && <ErrorState error={models.error} onRetry={() => void models.refetch()} />}
        {models.data?.length === 0 && <EmptyState icon="⚙" title="No models registered" />}
        {[...(models.data ?? [])]
          .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
          .map((m) => {
            const local = m.cost_class === 'local' || (m.capabilities ?? []).includes('local');
            return (
              <div key={m.id} className="model-row" style={{ opacity: m.enabled === false ? 0.55 : 1 }}>
                <StatusDot color={m.enabled === false ? 'var(--status-disabled)' : 'var(--ok)'} />
                <span className="model-row__id">{m.id}</span>
                <span className="model-row__name">
                  {m.provider} / {m.model}
                </span>
                <Badge tone={local ? 'ok' : 'accent'}>{local ? 'local' : 'cloud'}</Badge>
                <Badge mono title="Cost class">{m.cost_class ?? 'unknown'}</Badge>
                <Badge mono title="Latency class">{m.latency_class ?? 'unknown'}</Badge>
                <Badge mono title="Routing priority">p{m.priority ?? 100}</Badge>
                <Badge
                  mono
                  tone={(m.privacy_allowed ?? []).includes('WORK_RESTRICTED') ? 'ok' : undefined}
                  title={`Privacy classes: ${(m.privacy_allowed ?? []).join(', ') || 'none'}`}
                >
                  {(m.privacy_allowed ?? []).length}/4 privacy
                </Badge>
                <span className="model-row__caps">
                  {(m.capabilities ?? []).map((cap) => (
                    <Badge key={cap} mono>
                      {cap}
                    </Badge>
                  ))}
                </span>
              </div>
            );
          })}
      </Panel>

      <Panel title="How routing works">
        <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 640 }}>
          Each agent has a privacy class and a model policy. Hermes only routes an agent's work to models whose allowed
          privacy classes include the agent's, then picks by policy — e.g. a <span className="mono">LOCAL_ONLY</span> health
          update goes to a local model, while a <span className="mono">DEEP_REASONING</span> research task prefers a
          heavier cloud model. Execution responses show the selected model and the routing reason.
        </p>
      </Panel>
    </>
  );
}
