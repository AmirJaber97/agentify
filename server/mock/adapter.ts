import { Hono } from 'hono';
import type {
  Agent,
  AgentCreate,
  AgentExecutionResponse,
  DerivedAgentManifest,
  MessageResponse,
} from '../../shared/types';
import { MockStore } from './store';
import { MockStream } from './stream';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'agent';
}

function deriveManifest(message: string): DerivedAgentManifest {
  const lower = message.toLowerCase();
  const themes: Array<[RegExp, { id: string; name: string; icon: string }]> = [
    [/caf|coffee|restaurant/, { id: 'places', name: 'Places', icon: '📍' }],
    [/book|read/, { id: 'reading', name: 'Reading', icon: '📚' }],
    [/plant|garden/, { id: 'plants', name: 'Plants', icon: '🪴' }],
    [/travel|trip/, { id: 'travel', name: 'Travel', icon: '🧭' }],
    [/car|vehicle/, { id: 'car', name: 'Car', icon: '🚗' }],
  ];
  const match = themes.find(([re]) => re.test(lower));
  const base = match?.[1] ?? { id: slugify(message.split(' ').slice(0, 3).join(' ')), name: 'New Agent', icon: '🤖' };
  return {
    id: base.id,
    name: base.name,
    description: message.trim(),
    icon: base.icon,
    category: 'life',
    enabled: true,
    system_instructions: `You are the ${base.name} agent. ${message.trim()}`,
    privacy_class: 'PERSONAL',
    model_policy: 'CHEAP_FAST',
    allowed_tools: [],
    memory_namespace: `agent:${base.id}`,
    triggers: [],
    schedules: [],
    permissions: {},
    ui_metadata: {},
    state_schema: {},
  };
}

export function mockAdapter(store: MockStore, stream: MockStream): Hono {
  const app = new Hono();

  async function executeAgent(agentId: string, text: string): Promise<AgentExecutionResponse> {
    const agent = store.getAgent(agentId);
    const name = agent?.name ?? agentId;
    store.setAgentStatus(agentId, 'WORKING');
    const task = store.createTask(agentId, text.slice(0, 60), text, 'RUNNING');
    stream.emitFrame({
      type: 'task.started',
      agent_id: agentId,
      summary: `${name} started: ${task.title}`,
      refresh: ['tasks', 'agents', `agent:${agentId}`, 'dashboard'],
    });

    await sleep(2000 + Math.random() * 3000);

    store.updateTaskStatus(task.id, 'SUCCEEDED');
    store.setAgentStatus(agentId, agent?.enabled === false ? 'DISABLED' : 'IDLE');
    const reply = `Noted. I have processed: "${text.trim()}" and updated my state accordingly.`;
    const activity = store.addActivity(agentId, `${name} completed: ${task.title}`, 'info', 'task.completed');
    stream.emitFrame({
      type: 'task.completed',
      agent_id: agentId,
      summary: activity.message,
      refresh: ['tasks', 'agents', `agent:${agentId}`, 'activity', 'dashboard'],
    });

    return {
      intent: 'agent_execution',
      task_id: task.id,
      status: 'SUCCEEDED',
      reply,
      structured_result: {
        reply,
        state_updates: [{ path: 'current_state.last_note', value: text.trim() }],
        facts_to_add: [],
        facts_to_remove: [],
        tasks_to_create: [],
        tasks_to_update: [],
        events: [],
        requires_confirmation: false,
      },
      model_selected: store.models[0] ?? null,
      policy: agent?.model_policy ?? 'BALANCED',
      routing_reason: 'mock_execution',
      duration_ms: 2400,
      success: true,
      error: null,
    };
  }

  function mediaFastPath(text: string): MessageResponse | null {
    const lower = text.toLowerCase();
    const state = store.states['media'];
    if (!state) return null;
    const library = (state.structured_data as { library?: Array<Record<string, unknown>> }).library ?? [];
    const found = library.find((e) => lower.includes(String(e.title ?? '').toLowerCase()));
    if (!found) return null;

    let action: string | null = null;
    if (/\bpause[d]?\b/.test(lower)) {
      found.status = 'paused';
      action = 'paused';
    } else if (/watched|next episode/.test(lower)) {
      found.status = 'watching';
      found.episode = Number(found.episode ?? 0) + 1;
      action = `watching — now at E${found.episode}`;
    } else if (/complet|finish/.test(lower)) {
      found.status = 'completed';
      action = 'completed';
    } else if (/drop/.test(lower)) {
      found.status = 'dropped';
      action = 'dropped';
    } else if (/resume|unpause|continue/.test(lower)) {
      found.status = 'watching';
      action = 'resumed';
    }
    const ratingMatch = lower.match(/rate\s+.*?(\d{1,2})/);
    if (ratingMatch) {
      found.rating = Number(ratingMatch[1]);
      action = action ?? `rated ${found.rating}/10`;
    }
    if (!action) return null;

    found.updated_at = nowIso();
    state.updated_at = nowIso();
    const summary = `Updated Media: ${found.title} is ${action}`;
    store.addActivity('media', summary, 'info', 'media.paused');
    stream.emitFrame({
      type: 'agent.state_updated',
      agent_id: 'media',
      summary,
      refresh: ['agent:media', 'activity', 'dashboard'],
    });
    return { intent: 'media_update', execution: 'deterministic_fast_path', response: summary, update: {} };
  }

  app.get('/system/status', (c) => c.json(store.overview().system));
  app.get('/dashboard/overview', (c) => c.json(store.overview()));
  app.get('/agents', (c) => c.json(store.agentCards()));

  app.post('/agents', async (c) => {
    const body = await c.req.json<AgentCreate>();
    if (!body.name) return c.json({ detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }] }, 422);
    const id = body.id ?? slugify(body.name);
    if (store.getAgent(id)) return c.json({ detail: { error: 'agent_exists' } }, 409);
    const agent: Agent = {
      id,
      name: body.name,
      description: body.description ?? '',
      icon: body.icon ?? '🤖',
      category: body.category ?? 'life',
      enabled: body.enabled ?? true,
      status: 'IDLE',
      system_instructions: body.system_instructions ?? '',
      privacy_class: body.privacy_class ?? 'PERSONAL',
      model_policy: body.model_policy ?? 'BALANCED',
      allowed_tools: body.allowed_tools ?? [],
      memory_namespace: body.memory_namespace ?? `agent:${id}`,
      triggers: body.triggers ?? [],
      schedules: body.schedules ?? [],
      permissions: body.permissions ?? {},
      ui_metadata: body.ui_metadata ?? {},
      state_schema: body.state_schema ?? {},
      created_at: nowIso(),
      updated_at: nowIso(),
      last_activity_at: null,
    };
    store.agents.push(agent);
    store.states[id] = { agent_id: id, stable_facts: {}, current_state: {}, structured_data: {}, updated_at: nowIso() };
    store.focus[id] = '';
    store.warnings[id] = null;
    const activity = store.addActivity(null, `Agent "${agent.name}" created`, 'info', 'agent.created');
    stream.emitFrame({ type: 'agent.created', agent_id: id, summary: activity.message, refresh: ['agents', 'activity', 'dashboard'] });
    return c.json(agent);
  });

  app.post('/agents/derive', async (c) => {
    const body = await c.req.json<{ message?: string }>();
    if (!body.message) return c.json({ detail: [{ loc: ['body', 'message'], msg: 'Field required', type: 'missing' }] }, 422);
    await sleep(1500);
    return c.json(deriveManifest(body.message));
  });

  app.get('/agents/:id', (c) => {
    const agent = store.getAgent(c.req.param('id'));
    return agent ? c.json(agent) : c.json({ detail: { error: 'agent_not_found' } }, 404);
  });

  app.patch('/agents/:id', async (c) => {
    const agent = store.getAgent(c.req.param('id'));
    if (!agent) return c.json({ detail: { error: 'agent_not_found' } }, 404);
    const patch = await c.req.json<Record<string, unknown>>();
    const allowed = new Set([
      'name', 'description', 'icon', 'category', 'enabled', 'status', 'system_instructions',
      'privacy_class', 'model_policy', 'allowed_tools', 'triggers', 'schedules',
      'permissions', 'ui_metadata', 'state_schema',
    ]);
    for (const key of Object.keys(patch)) {
      if (!allowed.has(key)) {
        return c.json({ detail: [{ loc: ['body', key], msg: 'Extra inputs are not permitted', type: 'extra_forbidden' }] }, 422);
      }
    }
    Object.assign(agent, patch);
    if (patch.enabled === false) agent.status = 'DISABLED';
    if (patch.enabled === true && agent.status === 'DISABLED') agent.status = 'IDLE';
    agent.updated_at = nowIso();
    const activity = store.addActivity(agent.id, `Agent "${agent.name}" updated`, 'info', 'agent.updated');
    stream.emitFrame({ type: 'agent.updated', agent_id: agent.id, summary: activity.message, refresh: ['agents', `agent:${agent.id}`, 'activity', 'dashboard'] });
    return c.json(agent);
  });

  app.delete('/agents/:id', (c) => {
    const agent = store.getAgent(c.req.param('id'));
    if (!agent) return c.json({ detail: { error: 'agent_not_found' } }, 404);
    agent.enabled = false;
    agent.status = 'DISABLED';
    agent.updated_at = nowIso();
    const activity = store.addActivity(agent.id, `Agent "${agent.name}" archived`, 'info', 'agent.disabled');
    stream.emitFrame({ type: 'agent.disabled', agent_id: agent.id, summary: activity.message, refresh: ['agents', `agent:${agent.id}`, 'activity', 'dashboard'] });
    return c.json({ ok: true, archived: agent.id });
  });

  app.get('/agents/:id/state', (c) => {
    const state = store.states[c.req.param('id')];
    return state ? c.json(state) : c.json({ detail: { error: 'agent_not_found' } }, 404);
  });

  app.get('/agents/:id/tasks', (c) => c.json(store.tasks.filter((t) => t.agent_id === c.req.param('id'))));
  app.get('/agents/:id/activity', (c) => c.json(store.activity.filter((a) => a.agent_id === c.req.param('id'))));

  app.post('/agents/:id/message', async (c) => {
    const id = c.req.param('id');
    if (!store.getAgent(id)) return c.json({ detail: { error: 'agent_not_found' } }, 404);
    const body = await c.req.json<{ message?: string; dry_run?: boolean }>();
    if (!body.message) return c.json({ detail: [{ loc: ['body', 'message'], msg: 'Field required', type: 'missing' }] }, 422);
    if (body.dry_run) {
      return c.json({ intent: 'agent_execution', would_execute_model: true });
    }
    if (id === 'media') {
      const fast = mediaFastPath(body.message);
      if (fast) return c.json(fast);
    }
    return c.json(await executeAgent(id, body.message));
  });

  app.post('/message', async (c) => {
    const body = await c.req.json<{ message?: string; dry_run?: boolean }>();
    if (!body.message) return c.json({ detail: [{ loc: ['body', 'message'], msg: 'Field required', type: 'missing' }] }, 422);
    const text = body.message;
    const lower = text.toLowerCase();

    if (/^(list|show)( me)? (my )?agents/.test(lower)) {
      return c.json({ intent: 'list_agents', agents: store.agentCards() });
    }
    if (/create (an |a )?agent/.test(lower)) {
      await sleep(1200);
      return c.json({
        intent: 'create_agent',
        agent: null,
        proposed_agent: deriveManifest(text),
        response: 'Here is a proposed agent configuration. Review and confirm to create it.',
      });
    }
    const fast = mediaFastPath(text);
    if (fast) return c.json(fast);

    const mentioned = store.agents.find(
      (a) => a.enabled !== false && (lower.includes(a.id) || lower.includes(a.name.toLowerCase())),
    );
    if (mentioned) {
      if (body.dry_run) return c.json({ intent: 'agent_execution', would_execute_model: true });
      return c.json(await executeAgent(mentioned.id, text));
    }
    return c.json({
      intent: 'unrouted',
      response: 'I could not route that to an agent. Try naming an agent, e.g. "Tell health I did today\'s workout."',
    });
  });

  app.post('/agents/:id/run', async (c) => {
    const id = c.req.param('id');
    if (!store.getAgent(id)) return c.json({ detail: { error: 'agent_not_found' } }, 404);
    const body = await c.req.json<{ task?: string; async_run?: boolean }>();
    if (body.async_run) {
      return c.json({ detail: [{ loc: ['body', 'async_run'], msg: 'async_run is not supported in v1', type: 'value_error' }] }, 422);
    }
    if (!body.task) return c.json({ detail: [{ loc: ['body', 'task'], msg: 'Field required', type: 'missing' }] }, 422);
    return c.json(await executeAgent(id, body.task));
  });

  app.get('/tasks', (c) => c.json(store.tasks));
  app.get('/activity', (c) => c.json(store.activity));
  app.get('/events', (c) => c.json(store.events));
  app.get('/models', (c) => c.json(store.models));

  app.get('/project-summaries', (c) => {
    const alias = c.req.query('project_alias');
    const rows = alias ? store.projects.filter((p) => p.project_alias === alias) : store.projects;
    return c.json(rows);
  });

  app.post('/project-summaries', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    if (typeof body.project_alias !== 'string') {
      return c.json({ detail: [{ loc: ['body', 'project_alias'], msg: 'Field required', type: 'missing' }] }, 422);
    }
    return c.json({ ok: true, project_alias: body.project_alias });
  });

  // SSE endpoint fed by the MockStream emitter.
  app.get('/stream', (c) => {
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('retry: 3000\n\n'));
        const onFrame = (frame: Record<string, unknown>) => {
          const payload = `id: ${frame.event_id}\nevent: ${frame.type}\ndata: ${JSON.stringify(frame)}\n\n`;
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            cleanup();
          }
        };
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('event: hb\ndata: {}\n\n'));
          } catch {
            cleanup();
          }
        }, 25_000);
        stream.on('frame', onFrame);
        cleanup = () => {
          stream.off('frame', onFrame);
          clearInterval(heartbeat);
        };
        c.req.raw.signal.addEventListener('abort', () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // already closed
          }
        });
      },
      cancel() {
        cleanup();
      },
    });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    });
  });

  return app;
}
