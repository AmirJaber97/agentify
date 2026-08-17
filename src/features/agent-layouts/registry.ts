import type { ComponentType } from 'react';
import type { AgentState } from '@shared/types';
import { GenericStateView } from './GenericStateView';
import { MediaLibrary } from './media/MediaLibrary';
import { HealthBoard } from './health/HealthBoard';
import { ApartmentBoard } from './apartment/ApartmentBoard';

export type AgentLayout = ComponentType<{ state: AgentState }>;

const BY_ID: Record<string, AgentLayout> = {
  media: MediaLibrary,
  health: HealthBoard,
  apartment: ApartmentBoard,
};

/**
 * Resolve the state layout for an agent. Custom layouts parse defensively and
 * individually fall back to GenericStateView when the data shape is off.
 */
export function getAgentLayout(agentId: string, _category?: string): AgentLayout {
  return BY_ID[agentId] ?? GenericStateView;
}
