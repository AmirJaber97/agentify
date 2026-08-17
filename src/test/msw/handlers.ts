import { http, HttpResponse } from 'msw';
import { MockStore } from '../../../server/mock/store';

// Fresh store per handler-set build; tests that mutate can call buildHandlers()
// again via server.use() for isolation.
export function buildStore(): MockStore {
  return new MockStore();
}

const store = buildStore();

export const handlers = [
  http.get('/auth/session', () => HttpResponse.json({ authenticated: true, mock: true })),
  http.get('/api/dashboard/overview', () => HttpResponse.json(store.overview())),
  http.get('/api/system/status', () => HttpResponse.json(store.overview().system)),
  http.get('/api/agents', () => HttpResponse.json(store.agentCards())),
  http.get('/api/agents/:id', ({ params }) => {
    const agent = store.getAgent(String(params.id));
    return agent
      ? HttpResponse.json(agent)
      : HttpResponse.json({ detail: { error: 'agent_not_found' } }, { status: 404 });
  }),
  http.get('/api/agents/:id/state', ({ params }) =>
    HttpResponse.json(store.states[String(params.id)] ?? { detail: { error: 'agent_not_found' } }),
  ),
  http.get('/api/agents/:id/tasks', ({ params }) =>
    HttpResponse.json(store.tasks.filter((t) => t.agent_id === params.id)),
  ),
  http.get('/api/agents/:id/activity', ({ params }) =>
    HttpResponse.json(store.activity.filter((a) => a.agent_id === params.id)),
  ),
  http.get('/api/tasks', () => HttpResponse.json(store.tasks)),
  http.get('/api/activity', () => HttpResponse.json(store.activity)),
  http.get('/api/models', () => HttpResponse.json(store.models)),
  http.get('/api/project-summaries', ({ request }) => {
    const alias = new URL(request.url).searchParams.get('project_alias');
    return HttpResponse.json(alias ? store.projects.filter((p) => p.project_alias === alias) : store.projects);
  }),
];
