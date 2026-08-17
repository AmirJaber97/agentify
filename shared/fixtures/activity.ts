import type { Activity, PaosEvent } from '../types';
import { hoursAgo, daysAgo, minutesAgo } from './time';

export const fixtureActivity: Activity[] = [
  { id: 40, agent_id: 'projects', message: 'Started digest of Cortex blockers', level: 'info', metadata: { event_type: 'task.started' }, created_at: minutesAgo(4) },
  { id: 39, agent_id: 'projects', message: 'Ingested Cortex session summary — still blocked on staging credentials', level: 'warning', metadata: { event_type: 'project.summary_ingested' }, created_at: hoursAgo(3) },
  { id: 38, agent_id: 'health', message: 'Recorded pull day workout (62 min)', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: hoursAgo(20) },
  { id: 37, agent_id: 'media', message: 'The Expanse S3 — watched episode 7', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: hoursAgo(26) },
  { id: 36, agent_id: 'projects', message: 'Ingested Atlas session summary — moved forward', level: 'info', metadata: { event_type: 'project.summary_ingested' }, created_at: hoursAgo(28) },
  { id: 35, agent_id: 'apartment', message: 'Shortlisted HAY Mags Soft for the sofa decision', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: hoursAgo(49) },
  { id: 34, agent_id: 'coffee', message: 'Logged Kavarna Marks — flat white, excellent, will revisit', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: daysAgo(2) },
  { id: 33, agent_id: null, message: 'Model fallback: local-qwen unavailable, routed to cloud-fast', level: 'warning', metadata: { event_type: 'model.run_completed' }, created_at: daysAgo(2) },
  { id: 32, agent_id: 'projects', message: 'Digest run failed: model timeout after 120s', level: 'error', metadata: { event_type: 'task.failed' }, created_at: daysAgo(2) },
  { id: 31, agent_id: 'health', message: 'Weekly measurement logged: 78.0 kg', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: daysAgo(1) },
  { id: 30, agent_id: 'apartment', message: 'Washing machine purchased — Bosch Serie 6', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: daysAgo(4) },
  { id: 29, agent_id: 'media', message: 'Paused Severance at S2E4', level: 'info', metadata: { event_type: 'media.paused' }, created_at: daysAgo(9) },
  { id: 28, agent_id: null, message: 'Agent "Coffee" created from natural-language description', level: 'info', metadata: { event_type: 'agent.created' }, created_at: daysAgo(14) },
  { id: 27, agent_id: 'health', message: 'Squat PR: 3x5 @ 110kg', level: 'info', metadata: { event_type: 'agent.state_updated' }, created_at: daysAgo(2) },
  { id: 26, agent_id: 'projects', message: 'Ingested Forge session summary — paused until next month', level: 'info', metadata: { event_type: 'project.summary_ingested' }, created_at: daysAgo(6) },
];

export const fixtureEvents: PaosEvent[] = fixtureActivity.map((a) => ({
  id: a.id,
  agent_id: a.agent_id,
  type: String((a.metadata as Record<string, unknown> | null)?.['event_type'] ?? 'activity.created'),
  summary: a.message,
  payload: {},
  privacy_class: 'PERSONAL',
  created_at: a.created_at,
}));
