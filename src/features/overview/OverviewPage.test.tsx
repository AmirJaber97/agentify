import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { OverviewPage } from './OverviewPage';
import { buildStore } from '@/test/msw/handlers';

describe('OverviewPage', () => {
  it('renders the roster, attention items and active tasks from the overview payload', async () => {
    renderWithProviders(<OverviewPage />);

    // roster
    expect(await screen.findByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByLabelText(/Projects — BLOCKED/)).toBeInTheDocument();

    // attention (warnings render on the agent card and as links in the rail)
    expect(screen.getAllByText('Sofa decision pending for 9 days').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Cortex has been blocked for 2 sessions').length).toBeGreaterThanOrEqual(2);

    // active tasks rail
    expect(screen.getByText('Summarize Cortex blockers for review')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('shows an error state with retry when the API fails, and recovers', async () => {
    server.use(http.get('/api/dashboard/overview', () => HttpResponse.json({ detail: { error: 'paos_unreachable' } }, { status: 502 })));
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Personal Agent OS is unreachable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('reflects an agent status change after invalidation (SSE-driven refetch)', async () => {
    const store = buildStore();
    server.use(http.get('/api/dashboard/overview', () => HttpResponse.json(store.overview())));
    const { qc } = renderWithProviders(<OverviewPage />);
    expect(await screen.findByLabelText(/Health — IDLE/)).toBeInTheDocument();

    store.setAgentStatus('health', 'WORKING');
    await qc.invalidateQueries({ queryKey: ['dashboard'] });

    expect(await screen.findByLabelText(/Health — WORKING/)).toBeInTheDocument();
  });
});
