import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { fixtureAgents, fixtureFocus, fixtureWarnings, toCard } from '@shared/fixtures/index';
import { HQView } from './HQView';

const cards = fixtureAgents.map((a) => toCard(a, 0, fixtureFocus[a.id] ?? '', fixtureWarnings[a.id] ?? null));

describe('HQView', () => {
  it('renders one workstation per agent with a status-accurate label', () => {
    renderWithProviders(<HQView agents={cards} />);
    // Workstation SVGs carry the real status in their aria-label (never faked)
    expect(screen.getAllByLabelText(/Workstation, status IDLE/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Workstation, status BLOCKED/)).toBeTruthy();
    expect(screen.getByLabelText(/Workstation, status WAITING/)).toBeTruthy();
    // one pod per agent
    expect(document.querySelectorAll('.hq-ws').length).toBe(cards.length);
  });

  it('applies the disabled visual state for disabled agents', () => {
    renderWithProviders(<HQView agents={cards} />);
    const disabled = document.querySelector('.hq-ws--disabled');
    expect(disabled).toBeTruthy();
  });

  it('links each pod to the agent detail page', () => {
    renderWithProviders(<HQView agents={cards} />);
    const link = screen.getByRole('link', { name: /Media —/ });
    expect(link).toHaveAttribute('href', '/agents/media');
  });
});
