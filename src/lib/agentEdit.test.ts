import { describe, expect, it } from 'vitest';
import type { AgentExecutionResponse, MessageResponse } from '@shared/types';
import { buildEditInstruction, interpretEditResponse, type FieldEdit } from './agentEdit';

const edit = (over: Partial<FieldEdit>): FieldEdit => ({
  datasetLabel: 'Items',
  recordLabel: 'Severance',
  fieldKey: 'status',
  fieldLabel: 'Status',
  newValue: 'paused',
  kind: 'enum',
  ...over,
});

describe('buildEditInstruction', () => {
  it('uses fast-path-friendly phrasing for status/rating/episode', () => {
    expect(buildEditInstruction(edit({}))).toBe('Update "Severance": set its status to paused.');
    expect(buildEditInstruction(edit({ fieldKey: 'rating', fieldLabel: 'Rating', newValue: '8', kind: 'number' }))).toContain('set the rating to 8');
    expect(buildEditInstruction(edit({ fieldKey: 'episode', fieldLabel: 'Episode', newValue: '5', kind: 'number' }))).toContain('set the current episode to 5');
  });

  it('quotes free text and translates booleans', () => {
    expect(buildEditInstruction(edit({ fieldKey: 'thoughts', fieldLabel: 'Thoughts', newValue: 'great', kind: 'longtext' }))).toBe('Update "Severance": set Thoughts to "great".');
    expect(buildEditInstruction(edit({ fieldKey: 'revisit', fieldLabel: 'Revisit', newValue: 'true', kind: 'boolean' }))).toContain('set Revisit to yes');
  });
});

const sr = (over: Record<string, unknown> = {}) => ({
  reply: 'Done.',
  state_updates: [],
  facts_to_add: [],
  facts_to_remove: [],
  tasks_to_create: [],
  tasks_to_update: [],
  events: [],
  requires_confirmation: false,
  ...over,
});

const exec = (over: Partial<AgentExecutionResponse>): MessageResponse =>
  ({
    intent: 'agent_execution',
    task_id: 't1',
    status: 'SUCCEEDED',
    reply: 'Done.',
    structured_result: sr(),
    policy: 'CHEAP_FAST',
    routing_reason: 'x',
    duration_ms: 1,
    success: true,
    ...over,
  } as AgentExecutionResponse);

describe('interpretEditResponse', () => {
  it('accepts media/health fast-path updates', () => {
    expect(interpretEditResponse({ intent: 'media_update', response: 'Updated' } as MessageResponse).ok).toBe(true);
    expect(interpretEditResponse({ intent: 'health_update', response: 'Updated' } as MessageResponse).ok).toBe(true);
  });

  it('accepts a successful execution', () => {
    expect(interpretEditResponse(exec({})).ok).toBe(true);
  });

  it('flags requires_confirmation without claiming success', () => {
    const out = interpretEditResponse(exec({ structured_result: sr({ reply: 'Confirm?', requires_confirmation: true }) }));
    expect(out.ok).toBe(false);
    expect(out).toMatchObject({ needsConfirmation: true });
  });

  it('reports failure and unrouted honestly', () => {
    expect(interpretEditResponse(exec({ success: false, error: 'boom' })).ok).toBe(false);
    expect(interpretEditResponse({ intent: 'unrouted', response: 'nope' } as MessageResponse).ok).toBe(false);
  });
});
