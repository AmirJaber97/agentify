import type { AgentState } from '@shared/types';
import { asRecord } from '@/lib/guards';
import { humanize, inferKind, isEmptyValue } from '@/lib/dataset';
import { CellValue } from '@/components/workbench/cells';
import { EmptyState } from '@/components/ui';

/**
 * Readable render of an agent's current_state (the scalar "today" fields like
 * current_focus, goal, streak). Schema-aware and fully generic — arrays are
 * left to the workbench; this shows the at-a-glance state.
 */
export function CurrentStateCard({ state }: { state: AgentState }) {
  const current = asRecord(state.current_state);
  const entries = Object.entries(current).filter(([, v]) => !isEmptyValue(v) && !Array.isArray(v));

  if (entries.length === 0) {
    return <EmptyState icon="◔" title="No current state" hint="This agent has not recorded a current focus yet." />;
  }

  return (
    <dl className="current-state">
      {entries.map(([key, value]) => {
        const { kind } = inferKind(key, [value]);
        return (
          <div key={key} className="current-state__item">
            <dt>{humanize(key)}</dt>
            <dd>
              <CellValue value={value} kind={kind} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
