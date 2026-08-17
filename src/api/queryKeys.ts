import type { QueryClient } from '@tanstack/react-query';

export const keys = {
  dashboard: ['dashboard'] as const,
  system: ['system'] as const,
  agents: ['agents'] as const,
  agent: (id: string) => ['agent', id] as const,
  agentState: (id: string) => ['agent', id, 'state'] as const,
  agentTasks: (id: string) => ['agent', id, 'tasks'] as const,
  agentActivity: (id: string) => ['agent', id, 'activity'] as const,
  tasks: ['tasks'] as const,
  activity: ['activity'] as const,
  events: ['events'] as const,
  models: ['models'] as const,
  projects: ['projects'] as const,
  projectHistory: (alias: string) => ['projects', alias] as const,
};

const warnedHints = new Set<string>();

/**
 * Map SSE `refresh` hints from PAOS to query invalidations.
 * `agent:<id>` invalidates the ['agent', id] prefix (detail, state, tasks, activity).
 */
export function invalidateForHints(qc: QueryClient, hints: string[] | undefined): void {
  if (!hints?.length) return;
  for (const hint of hints) {
    if (hint.startsWith('agent:')) {
      const id = hint.slice('agent:'.length);
      void qc.invalidateQueries({ queryKey: keys.agent(id) });
      continue;
    }
    switch (hint) {
      case 'dashboard':
        void qc.invalidateQueries({ queryKey: keys.dashboard });
        break;
      case 'agents':
        void qc.invalidateQueries({ queryKey: keys.agents });
        break;
      case 'activity':
        void qc.invalidateQueries({ queryKey: keys.activity });
        void qc.invalidateQueries({ queryKey: keys.events });
        break;
      case 'tasks':
        void qc.invalidateQueries({ queryKey: keys.tasks });
        break;
      case 'projects':
        void qc.invalidateQueries({ queryKey: keys.projects });
        break;
      case 'models':
        void qc.invalidateQueries({ queryKey: keys.models });
        break;
      case 'system':
        void qc.invalidateQueries({ queryKey: keys.system });
        break;
      default:
        if (!warnedHints.has(hint)) {
          warnedHints.add(hint);
          console.warn(`[agentify] unknown SSE refresh hint: ${hint}`);
        }
    }
  }
}
