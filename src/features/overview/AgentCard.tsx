import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { AgentCard as AgentCardModel } from '@shared/types';
import { AgentAvatar, AgentStatusBadge } from '@/components/status';
import { RelativeTime } from '@/components/RelativeTime';
import { useAgentState } from '@/api/queries';
import { deriveDataSummary } from '@/features/hq/summary';

export function AgentCard({ card }: { card: AgentCardModel }) {
  // Real structured-data summary (cached; shared with HQ). Omitted when the
  // data can't support one — never fabricated.
  const state = useAgentState(card.id);
  const dataSummary = deriveDataSummary(state.data ?? undefined);

  return (
    <Link
      to={`/agents/${card.id}`}
      className={clsx('agent-card', !card.enabled && 'agent-card--disabled')}
      aria-label={`${card.name} — ${card.status}`}
    >
      <div className="agent-card__head">
        <AgentAvatar icon={card.icon} status={card.status} />
        <div style={{ minWidth: 0 }}>
          <div className="agent-card__name">{card.name}</div>
          <div className="agent-card__purpose">{card.short_purpose}</div>
        </div>
      </div>
      {card.current_focus ? <div className="agent-card__focus">{card.current_focus}</div> : null}
      {dataSummary ? <div className="agent-card__summary mono">{dataSummary}</div> : null}
      {card.warning && (
        <div className="agent-card__warning">
          <span aria-hidden="true">▲</span>
          <span>{card.warning}</span>
        </div>
      )}
      <div className="agent-card__foot">
        <AgentStatusBadge status={card.status} />
        <span>
          {card.outstanding_tasks > 0 && (
            <span className="mono" title="Open tasks">
              {card.outstanding_tasks} open ·{' '}
            </span>
          )}
          <RelativeTime iso={card.last_activity_at} />
        </span>
      </div>
    </Link>
  );
}
