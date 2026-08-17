import type { AgentState } from '@shared/types';
import { JsonTree } from '@/components/JsonTree';
import { EmptyState } from '@/components/ui';
import { RelativeTime } from '@/components/RelativeTime';
import { asRecord } from '@/lib/guards';

/** Fallback state renderer for agents without a custom layout. */
export function GenericStateView({ state }: { state: AgentState }) {
  const current = asRecord(state.current_state);
  const structured = asRecord(state.structured_data);
  const hasCurrent = Object.keys(current).length > 0;
  const hasStructured = Object.keys(structured).length > 0;

  if (!hasCurrent && !hasStructured) {
    return (
      <EmptyState
        icon="◌"
        title="No state yet"
        hint="This agent has not recorded any state. Message it to get started."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasCurrent && (
        <div>
          <div className="project-card__section-title" style={{ marginBottom: 6 }}>
            Current state
          </div>
          <JsonTree data={current} />
        </div>
      )}
      {hasStructured && (
        <div>
          <div className="project-card__section-title" style={{ marginBottom: 6 }}>
            Structured data
          </div>
          <JsonTree data={structured} />
        </div>
      )}
      <div className="exec-meta">
        <span>
          state updated <RelativeTime iso={state.updated_at} />
        </span>
      </div>
    </div>
  );
}
