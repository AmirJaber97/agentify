import { useQuery } from '@tanstack/react-query';
import type {
  Activity,
  Agent,
  AgentCard,
  AgentState,
  DashboardOverview,
  ModelInfo,
  ProjectSummary,
  SystemStatus,
  Task,
} from '@shared/types';
import { api } from './client';
import { keys } from './queryKeys';

export function useOverview() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api<DashboardOverview>('/api/dashboard/overview'),
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: keys.system,
    queryFn: () => api<SystemStatus>('/api/system/status'),
    refetchInterval: 60_000,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: keys.agents,
    queryFn: () => api<AgentCard[]>('/api/agents'),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: keys.agent(id),
    queryFn: () => api<Agent>(`/api/agents/${encodeURIComponent(id)}`),
  });
}

export function useAgentState(id: string) {
  return useQuery({
    queryKey: keys.agentState(id),
    queryFn: () => api<AgentState>(`/api/agents/${encodeURIComponent(id)}/state`),
  });
}

export function useAgentTasks(id: string) {
  return useQuery({
    queryKey: keys.agentTasks(id),
    queryFn: () => api<Task[]>(`/api/agents/${encodeURIComponent(id)}/tasks`),
  });
}

export function useAgentActivity(id: string) {
  return useQuery({
    queryKey: keys.agentActivity(id),
    queryFn: () => api<Activity[]>(`/api/agents/${encodeURIComponent(id)}/activity`),
  });
}

export function useTasks() {
  return useQuery({
    queryKey: keys.tasks,
    queryFn: () => api<Task[]>('/api/tasks'),
  });
}

export function useActivity() {
  return useQuery({
    queryKey: keys.activity,
    queryFn: () => api<Activity[]>('/api/activity'),
  });
}

export function useModels() {
  return useQuery({
    queryKey: keys.models,
    queryFn: () => api<ModelInfo[]>('/api/models'),
  });
}

export function useProjectSummaries() {
  return useQuery({
    queryKey: keys.projects,
    queryFn: () => api<ProjectSummary[]>('/api/project-summaries'),
  });
}

export function useProjectHistory(alias: string | null) {
  return useQuery({
    queryKey: keys.projectHistory(alias ?? ''),
    queryFn: () => api<ProjectSummary[]>(`/api/project-summaries?project_alias=${encodeURIComponent(alias ?? '')}`),
    enabled: alias !== null,
  });
}
