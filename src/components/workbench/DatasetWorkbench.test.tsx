import { describe, expect, it, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Agent } from '@shared/types';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { fixtureAgents, fixtureStates } from '@shared/fixtures/index';
import { discoverDatasets } from '@/lib/dataset';
import { DatasetWorkbench } from './DatasetWorkbench';

const mediaAgent = fixtureAgents.find((a) => a.id === 'media') as Agent;
const mediaDataset = () => discoverDatasets(fixtureStates.media)[0]!;

describe('DatasetWorkbench (Media)', () => {
  it('auto-generates a table from structured_data with schema-aware columns', () => {
    renderWithProviders(<DatasetWorkbench agent={mediaAgent} dataset={mediaDataset()} canEdit />);
    expect(screen.getByText('The Expanse')).toBeInTheDocument();
    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByText(/9 records/)).toBeInTheDocument();
  });

  it('filters rows via a status quick filter derived from the data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DatasetWorkbench agent={mediaAgent} dataset={mediaDataset()} canEdit />);
    // "planned" chip exists because it's a real value of the status enum
    await user.click(screen.getByRole('button', { name: 'planned', pressed: false }));
    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.queryByText('The Expanse')).not.toBeInTheDocument();
  });

  it('opens a row drawer and sends a precise edit instruction to the agent', async () => {
    const seen: string[] = [];
    server.use(
      http.post('/api/agents/media/message', async ({ request }) => {
        const body = (await request.json()) as { message: string };
        seen.push(body.message);
        return HttpResponse.json({ intent: 'media_update', response: 'Updated Media', execution: 'deterministic_fast_path' });
      }),
      http.get('/api/agents/media', () => HttpResponse.json(mediaAgent)),
      http.get('/api/agents/media/state', () => HttpResponse.json(fixtureStates.media)),
    );

    const user = userEvent.setup();
    renderWithProviders(<DatasetWorkbench agent={mediaAgent} dataset={mediaDataset()} canEdit />);

    await user.click(screen.getByText('The Expanse'));
    const drawer = await screen.findByRole('dialog', { name: /The Expanse details/ });

    // Edit the Status field
    const statusRow = within(drawer)
      .getAllByText('Status')
      .map((el) => el.closest('.wb-field'))
      .find(Boolean) as HTMLElement;
    await user.click(within(statusRow).getByRole('button', { name: 'Edit Status' }));
    await user.selectOptions(within(statusRow).getByRole('combobox'), 'paused');
    await user.click(within(statusRow).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(seen).toContain('Update "The Expanse": set its status to paused.'));
  });

  it('persists column visibility to ui_metadata via PATCH on Configure → Save', async () => {
    let patched: unknown = null;
    server.use(
      http.patch('/api/agents/media', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(mediaAgent);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<DatasetWorkbench agent={mediaAgent} dataset={mediaDataset()} canEdit />);

    await user.click(screen.getByRole('button', { name: 'Configure' }));
    const dialog = await screen.findByRole('dialog', { name: /Configure view/ });
    // Hide the "Reaction" column (uncheck its visibility checkbox)
    await user.click(within(dialog).getByRole('checkbox', { name: /Reaction/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save view' }));

    await waitFor(() => expect(patched).not.toBeNull());
    const ui = (patched as { ui_metadata: any }).ui_metadata;
    expect(ui.agentify.views['structured_data.items'].hidden_columns).toContain('reaction');
  });
});
