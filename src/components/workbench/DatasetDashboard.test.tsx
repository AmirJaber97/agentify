import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fixtureStates } from '@shared/fixtures/index';
import { discoverDatasets } from '@/lib/dataset';
import { DatasetDashboard } from './DatasetDashboard';

describe('DatasetDashboard', () => {
  it('renders generated widgets from the Health daily records', () => {
    const dataset = discoverDatasets(fixtureStates.health)[0]!;
    render(<DatasetDashboard dataset={dataset} />);
    expect(screen.getByText(/records · latest/)).toBeInTheDocument();
    // trend / stat labels derived from nested fields
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    // progress + gauge from latest workout/water
    expect(screen.getByText(/Workout Main/)).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is chartable', () => {
    const dataset = { path: 'x', key: 'x', label: 'X', rows: [{ note: 'a' }, { note: 'b' }], columns: [] };
    render(<DatasetDashboard dataset={dataset} />);
    expect(screen.getByText(/Not enough to chart/)).toBeInTheDocument();
  });
});
