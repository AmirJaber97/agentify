import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Agent,
  AgentCreate,
  AgentExecutionResponse,
  AgentPatch,
  ArchiveResponse,
  DerivedAgentManifest,
  MessageResponse,
} from '@shared/types';
import { api, LONG_TIMEOUT_MS } from './client';
import { keys } from './queryKeys';

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api<MessageResponse>('/api/message', {
        method: 'POST',
        body: { message, dry_run: false, require_model: false },
        timeoutMs: LONG_TIMEOUT_MS,
      }),
    onSuccess: () => {
      // Message routing can mutate anything; SSE narrows it, this is the floor.
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      void qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useSendAgentMessage(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api<MessageResponse>(`/api/agents/${encodeURIComponent(agentId)}/message`, {
        method: 'POST',
        body: { message, dry_run: false, require_model: false },
        timeoutMs: LONG_TIMEOUT_MS,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.activity });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useRunAgent(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: string) =>
      api<AgentExecutionResponse>(`/api/agents/${encodeURIComponent(agentId)}/run`, {
        method: 'POST',
        // async_run stays false: v1 rejects true with a 422.
        body: { task, task_category: 'general', require_model: true, async_run: false },
        timeoutMs: LONG_TIMEOUT_MS,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.tasks });
      void qc.invalidateQueries({ queryKey: keys.activity });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function usePatchAgent(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: AgentPatch) =>
      api<Agent>(`/api/agents/${encodeURIComponent(agentId)}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.agents });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useArchiveAgent(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<ArchiveResponse>(`/api/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.agents });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

/**
 * Persist a structured-data edit by sending a precise instruction to the owning
 * agent (the only write channel PAOS v1 offers). Returns the raw response so the
 * caller can honestly report success/failure; canonical state is refetched on
 * settle rather than optimistically mutated.
 */
export function useAgentDatasetEdit(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instruction: string) =>
      api<MessageResponse>(`/api/agents/${encodeURIComponent(agentId)}/message`, {
        method: 'POST',
        body: { message: instruction, dry_run: false, require_model: false },
        timeoutMs: LONG_TIMEOUT_MS,
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.activity });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

/**
 * Update an agent's ui_metadata (view configuration). Deterministic and
 * reliable — PATCH accepts ui_metadata. The caller supplies a complete
 * ui_metadata object built with buildUiMetadataPatch (preserves other keys).
 */
export function useUpdateAgentUiMetadata(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ui_metadata: Record<string, unknown>) =>
      api<Agent>(`/api/agents/${encodeURIComponent(agentId)}`, { method: 'PATCH', body: { ui_metadata } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agent(agentId) });
      void qc.invalidateQueries({ queryKey: keys.agents });
    },
  });
}

export function useDeriveAgent() {
  return useMutation({
    mutationFn: (message: string) =>
      api<DerivedAgentManifest>('/api/agents/derive', {
        method: 'POST',
        body: { message, dry_run: false, require_model: false },
        timeoutMs: LONG_TIMEOUT_MS,
      }),
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (manifest: AgentCreate) => api<Agent>('/api/agents', { method: 'POST', body: manifest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.agents });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}
