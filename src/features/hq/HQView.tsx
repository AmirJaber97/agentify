import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgentCard } from '@shared/types';
import { useAgentState } from '@/api/queries';
import { AgentStatusBadge } from '@/components/status';
import { RelativeTime } from '@/components/RelativeTime';
import { deriveDataSummary } from './summary';
import { Workstation, accentFor, propFor } from './Workstation';

/** Pauses ambient HQ animation when the tab is hidden (perf + battery). */
function useTabVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

function Pod({ card }: { card: AgentCard }) {
  // Real structured data drives the summary line (cached; ~one per agent).
  const state = useAgentState(card.id);
  const dataSummary = deriveDataSummary(state.data ?? undefined);
  const accent = accentFor(card.id, card.category);

  return (
    <Link to={`/agents/${card.id}`} className="hq-pod" aria-label={`${card.name} — ${card.status}`}>
      <div className="hq-pod__art">
        <Workstation status={card.status} icon={card.icon} accent={accent} prop={propFor(card.id, card.category)} />
      </div>
      <div className="hq-pod__body">
        <div className="hq-pod__head">
          <span className="hq-pod__name">{card.name}</span>
          <AgentStatusBadge status={card.status} />
        </div>
        {card.current_focus && <div className="hq-pod__focus">{card.current_focus}</div>}
        <div className="hq-pod__meta">
          {dataSummary && <span className="hq-pod__summary">{dataSummary}</span>}
          {card.warning && <span className="hq-pod__warn">▲ {card.warning}</span>}
        </div>
      </div>
      {/* Hover / focus detail */}
      <div className="hq-pod__hover" role="tooltip">
        <div className="hq-pod__hover-row">
          <strong>{card.name}</strong>
          <AgentStatusBadge status={card.status} />
        </div>
        <div className="hq-pod__hover-purpose">{card.short_purpose}</div>
        {card.current_focus && <div className="hq-pod__hover-line">Focus: {card.current_focus}</div>}
        {dataSummary && <div className="hq-pod__hover-line">{dataSummary}</div>}
        <div className="hq-pod__hover-line">
          {card.outstanding_tasks} open task{card.outstanding_tasks === 1 ? '' : 's'} · last active{' '}
          <RelativeTime iso={card.last_activity_at} />
        </div>
        {card.warning && <div className="hq-pod__hover-warn">▲ {card.warning}</div>}
      </div>
    </Link>
  );
}

export function HQView({ agents }: { agents: AgentCard[] }) {
  const visible = useTabVisible();
  const enabled = agents.filter((a) => a.enabled);
  const disabled = agents.filter((a) => !a.enabled);

  return (
    <div className={`hq ${visible ? '' : 'hq--paused'}`}>
      <div className="hq-grid" role="list" aria-label="Agent headquarters">
        {[...enabled, ...disabled].map((card) => (
          <div role="listitem" key={card.id}>
            <Pod card={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
