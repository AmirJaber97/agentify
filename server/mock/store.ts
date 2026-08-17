import type {
  Activity,
  Agent,
  AgentCard,
  AgentState,
  AgentStatus,
  DashboardOverview,
  ModelInfo,
  PaosEvent,
  ProjectSummary,
  Task,
} from '../../shared/types';
import {
  fixtureActivity,
  fixtureAgents,
  fixtureEvents,
  fixtureFocus,
  fixtureModels,
  fixtureProjects,
  fixtureStates,
  fixtureTasks,
  fixtureWarnings,
  toCard,
} from '../../shared/fixtures/index';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

// Mutable in-memory state, seeded fresh from fixtures per process.
export class MockStore {
  agents: Agent[] = clone(fixtureAgents);
  states: Record<string, AgentState> = clone(fixtureStates);
  tasks: Task[] = clone(fixtureTasks);
  activity: Activity[] = clone(fixtureActivity);
  events: PaosEvent[] = clone(fixtureEvents);
  projects: ProjectSummary[] = clone(fixtureProjects);
  models: ModelInfo[] = clone(fixtureModels);
  focus: Record<string, string> = { ...fixtureFocus };
  warnings: Record<string, string | null> = { ...fixtureWarnings };

  private nextActivityId = 100;
  private taskCounter = 100;

  getAgent(id: string): Agent | undefined {
    return this.agents.find((a) => a.id === id);
  }

  agentCards(): AgentCard[] {
    return this.agents.map((a) =>
      toCard(
        a,
        this.tasks.filter(
          (t) =>
            t.agent_id === a.id &&
            !['SUCCEEDED', 'FAILED', 'CANCELLED', 'COMPLETED'].includes(t.status),
        ).length,
        this.focus[a.id] ?? '',
        this.warnings[a.id] ?? null,
      ),
    );
  }

  setAgentStatus(id: string, status: AgentStatus): void {
    const agent = this.getAgent(id);
    if (!agent) return;
    agent.status = status;
    agent.updated_at = nowIso();
    if (status === 'WORKING') agent.last_activity_at = nowIso();
  }

  addActivity(agentId: string | null, message: string, level = 'info', eventType = 'activity.created'): Activity {
    const entry: Activity = {
      id: this.nextActivityId++,
      agent_id: agentId,
      message,
      level,
      metadata: { event_type: eventType },
      created_at: nowIso(),
    };
    this.activity.unshift(entry);
    this.events.unshift({
      id: entry.id,
      agent_id: agentId,
      type: eventType,
      summary: message,
      payload: {},
      privacy_class: 'PERSONAL',
      created_at: entry.created_at,
    });
    return entry;
  }

  createTask(agentId: string, title: string, description: string, status: Task['status']): Task {
    const task: Task = {
      id: `t-mock-${this.taskCounter++}`,
      agent_id: agentId,
      title,
      description,
      status,
      priority: 3,
      due_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: null,
    };
    this.tasks.unshift(task);
    return task;
  }

  updateTaskStatus(id: string, status: Task['status']): Task | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.status = status;
    task.updated_at = nowIso();
    if (['SUCCEEDED', 'FAILED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      task.completed_at = nowIso();
    }
    return task;
  }

  overview(): DashboardOverview {
    const cards = this.agentCards();
    const warnings: (string | Record<string, unknown>)[] = [];
    for (const [id, warning] of Object.entries(this.warnings)) {
      if (warning) warnings.push({ agent_id: id, message: warning });
    }
    const latestByAlias = new Map<string, ProjectSummary>();
    for (const p of this.projects) {
      const existing = latestByAlias.get(p.project_alias);
      if (!existing || (p.generated_at ?? '') > (existing.generated_at ?? '')) {
        latestByAlias.set(p.project_alias, p);
      }
    }
    return {
      system: {
        status: 'ok',
        service: 'personal-agent-os',
        db: '/mock/agent_os.db',
        agents_by_status: this.agents.reduce<Record<string, number>>((acc, a) => {
          const s = a.status ?? 'IDLE';
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {}),
        time: nowIso(),
      },
      agents: cards,
      running_tasks: this.tasks.filter((t) => t.status === 'RUNNING'),
      queued_tasks: this.tasks.filter((t) => t.status === 'QUEUED'),
      warnings,
      projects_needing_attention: [...latestByAlias.values()].filter(
        (p) => p.status === 'blocked' || p.needs_followup,
      ),
      recent_activity: this.activity.slice(0, 10),
      models: this.models,
    };
  }
}
