import type { Task } from '../types';
import { hoursAgo, daysAgo, minutesAgo } from './time';

export const fixtureTasks: Task[] = [
  { id: 't-run-001', agent_id: 'projects', title: 'Summarize Cortex blockers for review', description: 'Compile the last three session summaries into a blocker digest.', status: 'RUNNING', priority: 2, due_at: null, created_at: minutesAgo(4), updated_at: minutesAgo(1), completed_at: null },
  { id: 't-q-001', agent_id: 'apartment', title: 'Compare shortlisted sofas on delivery time', description: '', status: 'QUEUED', priority: 2, due_at: null, created_at: minutesAgo(10), updated_at: minutesAgo(10), completed_at: null },
  { id: 't-open-001', agent_id: 'apartment', title: 'Decide on sofa', description: 'Muuto Outline vs HAY Mags Soft vs Söderhamn.', status: 'WAITING_FOR_USER', priority: 1, due_at: daysAgo(-2), created_at: daysAgo(9), updated_at: daysAgo(2), completed_at: null },
  { id: 't-open-002', agent_id: 'health', title: 'Log push day workout', description: 'Bench focus session due today.', status: 'OPEN', priority: 2, due_at: hoursAgo(-6), created_at: hoursAgo(5), updated_at: hoursAgo(5), completed_at: null },
  { id: 't-open-003', agent_id: 'media', title: 'Resume Severance before S3 premiere', description: '', status: 'OPEN', priority: 3, due_at: null, created_at: daysAgo(9), updated_at: daysAgo(9), completed_at: null },
  { id: 't-open-004', agent_id: 'projects', title: 'Chase staging credentials for Cortex', description: 'Blocked since last Tuesday.', status: 'OPEN', priority: 1, due_at: null, created_at: daysAgo(5), updated_at: daysAgo(1), completed_at: null },
  { id: 't-open-005', agent_id: 'coffee', title: 'Try Botanika brunch menu', description: '', status: 'OPEN', priority: 4, due_at: null, created_at: daysAgo(6), updated_at: daysAgo(6), completed_at: null },
  { id: 't-open-006', agent_id: 'apartment', title: 'Order TV console', description: 'String shelving, walnut. Confirmed choice.', status: 'OPEN', priority: 2, due_at: null, created_at: daysAgo(3), updated_at: daysAgo(3), completed_at: null },
  { id: 't-done-001', agent_id: 'health', title: 'Log pull day workout', description: '', status: 'COMPLETED', priority: 3, due_at: null, created_at: daysAgo(1), updated_at: hoursAgo(20), completed_at: hoursAgo(20) },
  { id: 't-done-002', agent_id: 'media', title: 'Rate Shōgun finale', description: '', status: 'SUCCEEDED', priority: 3, due_at: null, created_at: daysAgo(30), updated_at: daysAgo(30), completed_at: daysAgo(30) },
  { id: 't-done-003', agent_id: 'apartment', title: 'Research washing machines', description: '', status: 'SUCCEEDED', priority: 2, due_at: null, created_at: daysAgo(12), updated_at: daysAgo(10), completed_at: daysAgo(10) },
  { id: 't-fail-001', agent_id: 'projects', title: 'Auto-digest Friday summaries', description: '', status: 'FAILED', priority: 3, due_at: null, created_at: daysAgo(2), updated_at: daysAgo(2), completed_at: null },
];
