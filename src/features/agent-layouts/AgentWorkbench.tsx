import { useMemo, useState } from 'react';
import type { Agent, AgentState } from '@shared/types';
import { discoverDatasets } from '@/lib/dataset';
import { storedViewConfig } from '@/lib/viewConfig';
import { DatasetWorkbench } from '@/components/workbench/DatasetWorkbench';
import { GenericStateView } from './GenericStateView';
import clsx from 'clsx';

/**
 * The primary DATA experience for an agent: discovers tabular datasets in
 * structured_data and renders each as an interactive workbench. Entirely
 * schema-driven — a new agent that stores an array of objects gets a table
 * automatically, with no code change here.
 */
export function AgentWorkbench({ agent, state }: { agent: Agent; state: AgentState }) {
  const datasets = useMemo(() => discoverDatasets(state), [state]);
  const [active, setActive] = useState(0);

  if (datasets.length === 0) {
    // No tabular collections — fall back to the readable current-state view.
    return <GenericStateView state={state} />;
  }

  const canEdit = agent.enabled !== false;
  const activeDataset = datasets[Math.min(active, datasets.length - 1)]!;

  return (
    <div className="agent-workbench">
      {datasets.length > 1 && (
        <div className="agent-workbench__tabs" role="tablist" aria-label="Datasets">
          {datasets.map((d, i) => {
            const label = storedViewConfig(agent, d.path)?.label ?? d.label;
            return (
              <button
                key={d.path}
                role="tab"
                aria-selected={i === active}
                className={clsx('agent-workbench__tab', i === active && 'agent-workbench__tab--active')}
                onClick={() => setActive(i)}
              >
                {label} <span className="agent-workbench__tab-count mono">{d.rows.length}</span>
              </button>
            );
          })}
        </div>
      )}
      <DatasetWorkbench key={`${agent.id}:${activeDataset.path}`} agent={agent} dataset={activeDataset} canEdit={canEdit} />
    </div>
  );
}
