// Runtime narrowing for the MessageResponse union.
// NOTE: `intent` alone is NOT a sufficient discriminator — DryRunExecutionResponse
// also carries intent "agent_execution" (its only other field is would_execute_model).
import type {
  MessageResponse,
  AgentExecutionResponse,
  DryRunExecutionResponse,
  ListAgentsMessageResponse,
  CreateAgentMessageResponse,
  UnroutedMessageResponse,
  MediaUpdateResponse,
  HealthUpdateResponse,
} from './types';

export function isAgentExecution(r: MessageResponse): r is AgentExecutionResponse {
  return r.intent === 'agent_execution' && 'task_id' in r;
}

export function isDryRun(r: MessageResponse): r is DryRunExecutionResponse {
  return r.intent === 'agent_execution' && 'would_execute_model' in r;
}

export function isListAgents(r: MessageResponse): r is ListAgentsMessageResponse {
  return r.intent === 'list_agents';
}

export function isCreateAgent(r: MessageResponse): r is CreateAgentMessageResponse {
  return r.intent === 'create_agent';
}

export function isUnrouted(r: MessageResponse): r is UnroutedMessageResponse {
  return r.intent === 'unrouted';
}

export function isMediaUpdate(r: MessageResponse): r is MediaUpdateResponse {
  return r.intent === 'media_update';
}

export function isHealthUpdate(r: MessageResponse): r is HealthUpdateResponse {
  return r.intent === 'health_update';
}
