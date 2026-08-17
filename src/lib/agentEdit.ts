// Encapsulates the ONE way Agentify can persist a structured-data edit today.
//
// PAOS v1 exposes no deterministic structured-state write endpoint (verified
// against the live contract: PATCH /agents/{id} accepts ui_metadata but not
// structured_data). The only channel that mutates domain data is
// POST /agents/{id}/message, which the owning agent validates and persists —
// deterministically for Media/Health fast-paths, model-mediated otherwise.
//
// Everything about that indirection is contained in this file so that, when
// PAOS gains a real structured-write endpoint, only this module changes.

import type { MessageResponse } from '@shared/types';
import { isAgentExecution, isHealthUpdate, isMediaUpdate, isUnrouted } from '@shared/message-response';

export interface FieldEdit {
  datasetLabel: string;
  /** Human label + value that identifies the row, e.g. "Severance". */
  recordLabel: string;
  fieldKey: string;
  fieldLabel: string;
  /** The new value as the user entered it (already coerced to string). */
  newValue: string;
  kind: 'string' | 'longtext' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum' | 'url' | 'object' | 'tags' | 'null';
}

/**
 * Build a precise, unambiguous natural-language instruction for the owning
 * agent. Phrasing favors verbs the deterministic fast-paths recognize (status,
 * rating) while staying clear enough for the model runtime to apply exactly.
 */
export function buildEditInstruction(edit: FieldEdit): string {
  const { recordLabel, fieldKey, fieldLabel, newValue, kind } = edit;
  const key = fieldKey.toLowerCase();

  if (key === 'status') return `Update "${recordLabel}": set its status to ${newValue}.`;
  if (key === 'rating') return `Update "${recordLabel}": set the rating to ${newValue}.`;
  if (key === 'episode') return `Update "${recordLabel}": set the current episode to ${newValue}.`;
  if (key === 'season') return `Update "${recordLabel}": set the current season to ${newValue}.`;

  if (kind === 'boolean') {
    return `Update "${recordLabel}": set ${fieldLabel} to ${newValue === 'true' ? 'yes' : 'no'}.`;
  }
  if (kind === 'longtext' || kind === 'string') {
    return `Update "${recordLabel}": set ${fieldLabel} to "${newValue}".`;
  }
  return `Update "${recordLabel}": set ${fieldLabel} to ${newValue}.`;
}

export type EditOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string; needsConfirmation?: boolean };

/**
 * Interpret an agent's response to an edit instruction. We never claim
 * persistence the backend didn't confirm — the caller refetches canonical
 * state and reconciles from there.
 */
export function interpretEditResponse(res: MessageResponse): EditOutcome {
  if (isMediaUpdate(res) || isHealthUpdate(res)) {
    return { ok: true, message: res.response ?? 'Saved.' };
  }
  if (isAgentExecution(res)) {
    if (res.structured_result?.requires_confirmation) {
      return { ok: false, needsConfirmation: true, message: res.reply || 'This change needs your confirmation.' };
    }
    if (res.success) return { ok: true, message: res.reply || 'Saved.' };
    return { ok: false, message: res.error || res.reply || 'The agent could not apply that change.' };
  }
  if (isUnrouted(res)) {
    return { ok: false, message: res.response || 'The agent did not understand that edit.' };
  }
  return { ok: false, message: 'Unexpected response — the change may not have been applied. Refresh to confirm.' };
}
