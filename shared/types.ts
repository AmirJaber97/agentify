// Friendly aliases over the generated OpenAPI types.
// This is the only import surface the app should use for API models.
import type { components } from './api-types';

export type SystemStatus = components['schemas']['SystemStatus'];
export type Agent = components['schemas']['Agent'];
export type AgentCard = components['schemas']['AgentCard'];
export type AgentState = components['schemas']['AgentState'];
export type AgentCreate = components['schemas']['AgentCreate'];
export type AgentPatch = components['schemas']['AgentPatch'];
export type DerivedAgentManifest = components['schemas']['DerivedAgentManifest'];
export type ArchiveResponse = components['schemas']['ArchiveResponse'];
export type Task = components['schemas']['Task'];
export type Activity = components['schemas']['Activity'];
export type PaosEvent = components['schemas']['Event'];
export type ModelInfo = components['schemas']['ModelInfo'];
export type DashboardOverview = components['schemas']['DashboardOverview'];
export type ProjectSummary = components['schemas']['ProjectSummary'];
export type ProjectSummaryIn = components['schemas']['ProjectSummaryIn'];
export type ProjectSummaryIngestResponse = components['schemas']['ProjectSummaryIngestResponse'];
export type MessageIn = components['schemas']['MessageIn'];
export type RunIn = components['schemas']['RunIn'];
export type StructuredResult = components['schemas']['StructuredResult'];

export type AgentStatus = components['schemas']['AgentStatus'];
export type TaskStatus = components['schemas']['TaskStatus'];
export type PrivacyClass = components['schemas']['PrivacyClass'];
export type ModelPolicy = components['schemas']['ModelPolicy'];

export type ListAgentsMessageResponse = components['schemas']['ListAgentsMessageResponse'];
export type CreateAgentMessageResponse = components['schemas']['CreateAgentMessageResponse'];
export type UnroutedMessageResponse = components['schemas']['UnroutedMessageResponse'];
export type MediaUpdateResponse = components['schemas']['MediaUpdateResponse'];
export type HealthUpdateResponse = components['schemas']['HealthUpdateResponse'];
export type AgentExecutionResponse = components['schemas']['AgentExecutionResponse'];
export type DryRunExecutionResponse = components['schemas']['DryRunExecutionResponse'];

export type MessageResponse =
  | ListAgentsMessageResponse
  | CreateAgentMessageResponse
  | UnroutedMessageResponse
  | MediaUpdateResponse
  | HealthUpdateResponse
  | AgentExecutionResponse
  | DryRunExecutionResponse;

export const AGENT_STATUSES: AgentStatus[] = [
  'IDLE',
  'WORKING',
  'WAITING',
  'BLOCKED',
  'ERROR',
  'DISABLED',
];

export const TASK_STATUSES: TaskStatus[] = [
  'QUEUED',
  'RUNNING',
  'WAITING_FOR_USER',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'OPEN',
  'COMPLETED',
];

export const PRIVACY_CLASSES: PrivacyClass[] = [
  'PUBLIC_OR_GENERAL',
  'PERSONAL',
  'PRIVATE',
  'WORK_RESTRICTED',
];

export const MODEL_POLICIES: ModelPolicy[] = [
  'LOCAL_ONLY',
  'CHEAP_FAST',
  'BALANCED',
  'DEEP_REASONING',
  'CODING',
  'CUSTOM',
];

// Stable SSE event types per API_CONTRACT.md. EventSource only delivers
// named events to explicit listeners, so the client must enumerate these.
export const SSE_EVENT_TYPES = [
  'agent.created',
  'agent.updated',
  'agent.disabled',
  'agent.status_changed',
  'agent.state_updated',
  'task.created',
  'task.started',
  'task.completed',
  'task.failed',
  'activity.created',
  'project.summary_ingested',
  'model.run_completed',
  'system.warning',
  'media.started',
  'media.paused',
  'media.completed',
  'media.dropped',
] as const;

export interface SseFrame {
  event_id?: number;
  type: string;
  agent_id?: string | null;
  created_at?: string;
  summary?: string;
  payload?: Record<string, unknown>;
  refresh?: string[];
}
