import { useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAgent, useAgentActivity, useAgentState, useAgentTasks } from '@/api/queries';
import { useArchiveAgent, usePatchAgent, useRunAgent } from '@/api/mutations';
import { Badge, Button, EmptyState, ErrorState, KeyValueList, Panel, Skeleton, Spinner } from '@/components/ui';
import { AgentAvatar, AgentStatusBadge, ModelPolicyBadge, PrivacyBadge, TaskStatusBadge } from '@/components/status';
import { Timeline } from '@/components/Timeline';
import { RelativeTime } from '@/components/RelativeTime';
import { JsonTree } from '@/components/JsonTree';
import { Dialog } from '@/components/Dialog';
import { toast } from '@/components/Toast';
import { formatDuration } from '@/lib/format';
import { MessageComposer } from './MessageComposer';
import { EditAgentDialog } from './EditAgentDialog';
import { getAgentLayout } from '@/features/agent-layouts/registry';

function RunPanel({ agentId }: { agentId: string }) {
  const [task, setTask] = useState('');
  const run = useRunAgent(agentId);

  return (
    <div className="composer">
      <form
        className="composer__row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!task.trim() || run.isPending) return;
          run.mutate(task.trim(), {
            onSuccess: () => setTask(''),
          });
        }}
      >
        <textarea
          className="textarea"
          placeholder="Describe a task to execute now…"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          aria-label="Task description"
          rows={2}
        />
        <Button busy={run.isPending} disabled={!task.trim()} {...{ type: 'submit' }}>
          Run
        </Button>
      </form>
      {run.isPending && (
        <div className="in-flight">
          <Spinner />
          Executing synchronously — this blocks until the agent finishes.
        </div>
      )}
      {run.isError && (
        <div className="confirm-banner" role="alert">
          <strong>Run failed</strong>
          {run.error instanceof Error ? run.error.message : 'Execution failed'}
        </div>
      )}
      {run.data && (
        <>
          <div className="msg-reply">{run.data.reply}</div>
          <div className="exec-meta">
            <Badge tone={run.data.success ? 'ok' : 'danger'} mono>
              {run.data.status}
            </Badge>
            {run.data.model_selected && <span>model {run.data.model_selected.id}</span>}
            <span>{run.data.routing_reason}</span>
            <span>{formatDuration(run.data.duration_ms)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function AgentDetailPage() {
  const { agentId = '' } = useParams();
  const agent = useAgent(agentId);
  const state = useAgentState(agentId);
  const tasks = useAgentTasks(agentId);
  const activity = useAgentActivity(agentId);
  const patchAgent = usePatchAgent(agentId);
  const archiveAgent = useArchiveAgent(agentId);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (agent.isPending) {
    return (
      <>
        <div className="agent-hero">
          <Skeleton height={56} width={56} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={22} width={220} />
            <Skeleton height={14} width={340} />
          </div>
        </div>
        <Skeleton height={200} />
      </>
    );
  }

  if (agent.isError) {
    return (
      <Panel title="Agent">
        <ErrorState error={agent.error} onRetry={() => void agent.refetch()} />
      </Panel>
    );
  }

  const a = agent.data;
  const status = a.status ?? 'IDLE';
  const enabled = a.enabled !== false;
  const Layout = getAgentLayout(a.id, a.category ?? undefined);
  const openTasks = (tasks.data ?? []).filter(
    (t) => !['SUCCEEDED', 'FAILED', 'CANCELLED', 'COMPLETED'].includes(t.status),
  );
  const doneTasks = (tasks.data ?? []).filter((t) =>
    ['SUCCEEDED', 'FAILED', 'CANCELLED', 'COMPLETED'].includes(t.status),
  );

  function toggleEnabled() {
    patchAgent.mutate(
      { enabled: !enabled },
      {
        onSuccess: () => toast(enabled ? `${a.name} disabled` : `${a.name} enabled`),
        onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
      },
    );
  }

  return (
    <>
      <div className="agent-hero">
        <AgentAvatar icon={a.icon ?? '⬡'} status={status} size="lg" />
        <div className="agent-hero__info">
          <div className="agent-hero__title">
            <h1>{a.name}</h1>
            <AgentStatusBadge status={status} />
          </div>
          <p className="agent-hero__desc">{a.description}</p>
          <div className="agent-hero__badges">
            <PrivacyBadge privacy={a.privacy_class ?? 'PERSONAL'} />
            <ModelPolicyBadge policy={a.model_policy ?? 'BALANCED'} />
            <Badge mono title="Memory namespace">
              {a.memory_namespace ?? `agent:${a.id}`}
            </Badge>
            {(a.allowed_tools ?? []).map((tool) => (
              <Badge key={String(tool)} tone="accent" mono>
                {String(tool)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="agent-hero__actions">
          <Button size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button size="sm" busy={patchAgent.isPending} onClick={toggleEnabled}>
            {enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setArchiveOpen(true)}>
            Archive
          </Button>
        </div>
      </div>

      <div className="agent-detail-grid">
        <div className="agent-detail-grid__col">
          <Panel title={`Talk to ${a.name}`}>
            <MessageComposer agentId={a.id} agentName={a.name} />
          </Panel>

          <Panel title="Current state">
            {state.isPending && <Skeleton height={120} />}
            {state.isError && <ErrorState error={state.error} onRetry={() => void state.refetch()} />}
            {state.data && <Layout state={state.data} />}
          </Panel>

          <Panel title="Run a task">
            <RunPanel agentId={a.id} />
          </Panel>

          <Panel title="Recent activity" flush>
            {activity.isPending && (
              <div style={{ padding: 16 }}>
                <Skeleton height={60} />
              </div>
            )}
            {activity.data && <Timeline items={activity.data.slice(0, 12)} showAgent={false} />}
          </Panel>
        </div>

        <div className="agent-detail-grid__col">
          <Panel title="Stable facts">
            {state.data ? (
              Object.keys(state.data.stable_facts ?? {}).length > 0 ? (
                <JsonTree data={state.data.stable_facts} />
              ) : (
                <EmptyState icon="◆" title="No stable facts" hint="Long-lived facts the agent learns will appear here." />
              )
            ) : (
              <Skeleton height={60} />
            )}
          </Panel>

          <Panel title={`Open loops (${openTasks.length})`} flush>
            {openTasks.length === 0 ? (
              <EmptyState icon="✓" title="No open tasks" />
            ) : (
              <div>
                {openTasks.map((t) => (
                  <div key={t.id} className={clsx('task-row', t.status === 'RUNNING' && 'task-row__running')}>
                    <span className="task-row__title">
                      {t.title}
                      {t.due_at && (
                        <span className="attention-item__meta">
                          {' '}
                          · due <RelativeTime iso={t.due_at} />
                        </span>
                      )}
                    </span>
                    <TaskStatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {doneTasks.length > 0 && (
            <Panel title="Recently completed" flush>
              <div>
                {doneTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="task-row">
                    <span className="task-row__title" style={{ color: 'var(--text-3)' }}>
                      {t.title}
                    </span>
                    <TaskStatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {(a.schedules ?? []).length > 0 && (
            <Panel title="Schedules">
              <JsonTree data={a.schedules} />
            </Panel>
          )}

          <Panel title="Configuration">
            <KeyValueList
              entries={[
                ['ID', <span className="mono" key="id">{a.id}</span>],
                ['Category', a.category ?? '—'],
                ['Created', <RelativeTime key="c" iso={a.created_at} />],
                ['Updated', <RelativeTime key="u" iso={a.updated_at} />],
                ['Last activity', <RelativeTime key="l" iso={a.last_activity_at} />],
              ]}
            />
          </Panel>
        </div>
      </div>

      <EditAgentDialog key={a.updated_at ?? 'edit'} agent={a} open={editOpen} onClose={() => setEditOpen(false)} />

      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={`Archive ${a.name}?`}
        footer={
          <>
            <Button onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              busy={archiveAgent.isPending}
              onClick={() =>
                archiveAgent.mutate(undefined, {
                  onSuccess: () => {
                    toast(`${a.name} archived`);
                    setArchiveOpen(false);
                  },
                  onError: (e) => toast(e instanceof Error ? e.message : 'Archive failed', 'error'),
                })
              }
            >
              Archive agent
            </Button>
          </>
        }
      >
        <p>
          Archiving disables the agent and hides it from routing. Its memory and state are kept — you can re-enable it
          later. Nothing is permanently deleted.
        </p>
      </Dialog>
    </>
  );
}
