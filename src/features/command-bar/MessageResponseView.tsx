import { Link } from 'react-router-dom';
import type { MessageResponse, StructuredResult } from '@shared/types';
import {
  isAgentExecution,
  isCreateAgent,
  isDryRun,
  isListAgents,
  isMediaUpdate,
  isUnrouted,
} from '@shared/message-response';
import { Badge, Button } from '@/components/ui';
import { formatDuration } from '@/lib/format';

function mutationSummary(r: StructuredResult): string[] {
  const parts: string[] = [];
  if (r.state_updates?.length) parts.push(`${r.state_updates.length} state update${r.state_updates.length > 1 ? 's' : ''}`);
  if (r.facts_to_add?.length) parts.push(`${r.facts_to_add.length} fact${r.facts_to_add.length > 1 ? 's' : ''} added`);
  if (r.facts_to_remove?.length) parts.push(`${r.facts_to_remove.length} fact${r.facts_to_remove.length > 1 ? 's' : ''} removed`);
  if (r.tasks_to_create?.length) parts.push(`${r.tasks_to_create.length} task${r.tasks_to_create.length > 1 ? 's' : ''} created`);
  if (r.tasks_to_update?.length) parts.push(`${r.tasks_to_update.length} task${r.tasks_to_update.length > 1 ? 's' : ''} updated`);
  return parts;
}

/**
 * Renders every member of the MessageResponse union. Used by both the global
 * command bar and the agent detail composer.
 */
export function MessageResponseView({
  response,
  onUseProposedAgent,
}: {
  response: MessageResponse;
  onUseProposedAgent?: (manifest: unknown) => void;
}) {
  if (isListAgents(response)) {
    return (
      <div className="composer" data-intent="list_agents">
        <div className="msg-reply">
          {response.agents.length === 0
            ? 'No agents configured.'
            : response.agents.map((a) => (
                <div key={a.id}>
                  {a.icon} <Link to={`/agents/${a.id}`}>{a.name}</Link> — {a.status}
                  {a.current_focus ? ` · ${a.current_focus}` : ''}
                </div>
              ))}
        </div>
      </div>
    );
  }

  if (isCreateAgent(response)) {
    return (
      <div className="composer" data-intent="create_agent">
        <div className="msg-reply">{response.response ?? 'Hermes proposed a new agent.'}</div>
        {response.proposed_agent != null && onUseProposedAgent && (
          <div>
            <Button variant="accent" size="sm" onClick={() => onUseProposedAgent(response.proposed_agent)}>
              Review proposed agent
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isMediaUpdate(response)) {
    return (
      <div className="composer" data-intent="media_update">
        <div className="msg-reply">{response.response}</div>
        <div className="exec-meta">
          <span>deterministic fast path</span>
        </div>
      </div>
    );
  }

  if (isDryRun(response)) {
    return (
      <div className="composer" data-intent="dry_run">
        <div className="msg-reply">
          Dry run: this message {response.would_execute_model ? 'would invoke a model' : 'would not invoke a model'}.
          Nothing was executed.
        </div>
      </div>
    );
  }

  if (isAgentExecution(response)) {
    const mutations = mutationSummary(response.structured_result);
    return (
      <div className="composer" data-intent="agent_execution">
        {!response.success && (
          <div className="confirm-banner" role="alert">
            <strong>Execution failed</strong>
            {response.error ?? 'The agent run did not complete.'}
          </div>
        )}
        <div className="msg-reply">{response.reply}</div>
        {response.structured_result.requires_confirmation && (
          <div className="confirm-banner" role="alert">
            <strong>Confirmation required</strong>
            <span>
              The agent proposed changes that need your explicit go-ahead
              {mutations.length > 0 ? ` (${mutations.join(', ')})` : ''}. Reply to the agent to confirm or refine.
            </span>
          </div>
        )}
        <div className="exec-meta">
          <Badge tone={response.success ? 'ok' : 'danger'} mono>
            {response.status}
          </Badge>
          {mutations.length > 0 && <span>{mutations.join(' · ')}</span>}
          {response.model_selected && <span>model {response.model_selected.id}</span>}
          <span>{response.routing_reason}</span>
          <span>{formatDuration(response.duration_ms)}</span>
          <span className="mono">task {response.task_id.slice(0, 8)}</span>
        </div>
      </div>
    );
  }

  if (isUnrouted(response)) {
    return (
      <div className="composer" data-intent="unrouted">
        <div className="msg-reply">{response.response}</div>
      </div>
    );
  }

  return (
    <div className="msg-reply" data-intent="unknown">
      Received a response the dashboard does not recognize yet.
    </div>
  );
}
