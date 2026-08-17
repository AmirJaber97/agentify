import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { AgentExecutionResponse, MessageResponse } from '@shared/types';
import { renderWithProviders } from '@/test/render';
import { MessageResponseView } from './MessageResponseView';

const execution: AgentExecutionResponse = {
  intent: 'agent_execution',
  task_id: 'abcd1234-0000',
  status: 'SUCCEEDED',
  reply: 'Workout logged.',
  structured_result: {
    reply: 'Workout logged.',
    state_updates: [{ path: 'x', value: 1 }],
    facts_to_add: [],
    facts_to_remove: [],
    tasks_to_create: [],
    tasks_to_update: [],
    events: [],
    requires_confirmation: false,
  },
  model_selected: { id: 'local-qwen', provider: 'custom', model: 'qwen3:8b', base_url: null, capabilities: [], privacy_allowed: [], cost_class: 'local', latency_class: 'fast', enabled: true, priority: 1, metadata: {} },
  policy: 'LOCAL_ONLY',
  routing_reason: 'local_only',
  duration_ms: 900,
  success: true,
  error: null,
};

describe('MessageResponseView union rendering', () => {
  it('renders a real execution with model and mutation metadata', () => {
    renderWithProviders(<MessageResponseView response={execution} />);
    expect(screen.getByText('Workout logged.')).toBeInTheDocument();
    expect(screen.getByText('model local-qwen')).toBeInTheDocument();
    expect(screen.getByText('1 state update')).toBeInTheDocument();
  });

  it('disambiguates dry-run from execution despite the shared intent', () => {
    const dryRun = { intent: 'agent_execution', would_execute_model: true } as MessageResponse;
    const { container } = renderWithProviders(<MessageResponseView response={dryRun} />);
    expect(container.querySelector('[data-intent="dry_run"]')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was executed/)).toBeInTheDocument();
  });

  it('surfaces requires_confirmation as a banner instead of auto-confirming', () => {
    const needsConfirm: AgentExecutionResponse = {
      ...execution,
      structured_result: { ...execution.structured_result, requires_confirmation: true },
    };
    renderWithProviders(<MessageResponseView response={needsConfirm} />);
    expect(screen.getByText('Confirmation required')).toBeInTheDocument();
  });

  it('renders media fast-path updates', () => {
    const media = {
      intent: 'media_update',
      execution: 'deterministic_fast_path',
      response: 'Updated Media: Severance is paused',
    } as MessageResponse;
    renderWithProviders(<MessageResponseView response={media} />);
    expect(screen.getByText('Updated Media: Severance is paused')).toBeInTheDocument();
  });

  it('renders unrouted responses', () => {
    const unrouted = { intent: 'unrouted', response: 'Could not route.' } as MessageResponse;
    renderWithProviders(<MessageResponseView response={unrouted} />);
    expect(screen.getByText('Could not route.')).toBeInTheDocument();
  });

  it('renders failed executions with the error', () => {
    const failed: AgentExecutionResponse = { ...execution, success: false, status: 'FAILED', error: 'model timeout' };
    renderWithProviders(<MessageResponseView response={failed} />);
    expect(screen.getByText('Execution failed')).toBeInTheDocument();
    expect(screen.getByText('model timeout')).toBeInTheDocument();
  });
});
