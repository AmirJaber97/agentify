import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ProjectsPage } from './ProjectsPage';

describe('ProjectsPage', () => {
  it('renders one card per alias with blocked projects first', async () => {
    renderWithProviders(<ProjectsPage />);

    const cards = await screen.findAllByRole('article');
    // 3 aliases in fixtures: Cortex (blocked, 2 rows), Atlas, Forge
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText('Cortex')).toBeInTheDocument();

    // latest summary per alias, not the older one
    expect(within(cards[0]!).getByText(/integration testing/)).toBeInTheDocument();
    expect(within(cards[0]!).queryByText(/Pivoted to hardening/)).not.toBeInTheDocument();
  });

  it('surfaces blockers and attention-next-session', async () => {
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText(/Staging credentials still not issued/)).toBeInTheDocument();
    expect(screen.getByText(/run the staging smoke suite first/)).toBeInTheDocument();
  });

  it('answers "what should I resume" in the strip', async () => {
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText(/■ Blocked/)).toBeInTheDocument();
    expect(screen.getByText(/▶ Resume/)).toBeInTheDocument();
  });
});
