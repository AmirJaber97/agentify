import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { DerivedAgentManifest } from '@shared/types';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { CreateAgentPage } from './CreateAgentPage';

const manifest: DerivedAgentManifest = {
  id: 'places',
  name: 'Places',
  description: 'Track cafés.',
  icon: '📍',
  category: 'life',
  enabled: true,
  system_instructions: 'You are the Places agent.',
  privacy_class: 'PERSONAL',
  model_policy: 'CHEAP_FAST',
  allowed_tools: [],
  memory_namespace: 'agent:places',
  triggers: [],
  schedules: [],
  permissions: {},
  ui_metadata: {},
  state_schema: {},
};

describe('create-agent flow', () => {
  it('derives a manifest, allows edits, and posts the edited manifest', async () => {
    const created = vi.fn();
    server.use(
      http.post('/api/agents/derive', () => HttpResponse.json(manifest)),
      http.post('/api/agents', async ({ request }) => {
        const body = (await request.json()) as DerivedAgentManifest;
        created(body);
        return HttpResponse.json({ ...manifest, ...body, status: 'IDLE', created_at: '', updated_at: '', last_activity_at: null });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<CreateAgentPage />);

    await user.type(screen.getByLabelText('Agent description'), 'Track the cafés I visit');
    await user.click(screen.getByRole('button', { name: 'Propose configuration' }));

    const nameInput = await screen.findByLabelText('Name');
    expect(nameInput).toHaveValue('Places');

    await user.clear(nameInput);
    await user.type(nameInput, 'Cafés');
    await user.click(screen.getByRole('button', { name: /Create/ }));

    expect(created).toHaveBeenCalledOnce();
    expect(created.mock.calls[0]![0].name).toBe('Cafés');
    expect(created.mock.calls[0]![0].id).toBe('places');
  });

  it('requires explicit approval when the manifest carries permissions', async () => {
    server.use(
      http.post('/api/agents/derive', () => HttpResponse.json({ ...manifest, permissions: { filesystem: 'rw' } })),
    );
    const user = userEvent.setup();
    renderWithProviders(<CreateAgentPage />);

    await user.type(screen.getByLabelText('Agent description'), 'An agent with power');
    await user.click(screen.getByRole('button', { name: 'Propose configuration' }));

    const createButton = await screen.findByRole('button', { name: /Create/ });
    expect(createButton).toBeDisabled();

    await user.click(screen.getByLabelText(/I have reviewed them and approve/));
    expect(createButton).toBeEnabled();
  });

  it('shows derive failures', async () => {
    server.use(http.post('/api/agents/derive', () => HttpResponse.json({ detail: { error: 'paos_unreachable' } }, { status: 502 })));
    const user = userEvent.setup();
    renderWithProviders(<CreateAgentPage />);

    await user.type(screen.getByLabelText('Agent description'), 'anything');
    await user.click(screen.getByRole('button', { name: 'Propose configuration' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Personal Agent OS is unreachable');
  });
});
