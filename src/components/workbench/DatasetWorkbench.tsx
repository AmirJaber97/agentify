import { useMemo, useState } from 'react';
import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import clsx from 'clsx';
import type { Agent } from '@shared/types';
import type { Dataset } from '@/lib/dataset';
import {
  buildUiMetadataPatch,
  resolveView,
  storedViewConfig,
  type DatasetViewConfig,
  type FilterMap,
  type SavedView,
} from '@/lib/viewConfig';
import { buildEditInstruction, interpretEditResponse, type FieldEdit } from '@/lib/agentEdit';
import { useAgentDatasetEdit, useUpdateAgentUiMetadata } from '@/api/mutations';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui';
import { DataTable } from './DataTable';
import { RowDrawer } from './RowDrawer';
import { QuickFilters } from './QuickFilters';
import { ConfigureViewDialog } from './ConfigureViewDialog';
import { DatasetDashboard } from './DatasetDashboard';

function toColumnFilters(map: FilterMap): ColumnFiltersState {
  return Object.entries(map).map(([id, value]) => ({ id, value }));
}
function toFilterMap(cf: ColumnFiltersState): FilterMap {
  const out: FilterMap = {};
  for (const f of cf) out[f.id] = f.value as string[] | boolean;
  return out;
}

function rowIdentityFactory(primaryField: string | null) {
  return (row: Record<string, unknown>, index: number): string => {
    if (row.id !== undefined && row.id !== null) return `id:${String(row.id)}`;
    if (primaryField && row[primaryField]) return `pf:${String(row[primaryField])}`;
    return `i:${index}:${JSON.stringify(row).slice(0, 64)}`;
  };
}

export function DatasetWorkbench({ agent, dataset, canEdit }: { agent: Agent; dataset: Dataset; canEdit: boolean }) {
  const stored = storedViewConfig(agent, dataset.path);
  const resolved = useMemo(() => resolveView(dataset, stored), [dataset, stored]);

  const rowIdentity = rowIdentityFactory(resolved.primaryField);

  // Ephemeral interaction state (structural config lives in ui_metadata/resolved).
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => toColumnFilters(resolved.defaultFilters));
  const [sorting, setSorting] = useState<SortingState>(resolved.sort);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(resolved.columnWidths);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeView, setActiveView] = useState<string>('all');
  const [editPendingKey, setEditPendingKey] = useState<string | null>(null);
  const [clearEditToken, setClearEditToken] = useState(0);
  const [mode, setMode] = useState<'table' | 'dashboard'>('table');

  const updateUi = useUpdateAgentUiMetadata(agent.id);
  const edit = useAgentDatasetEdit(agent.id);

  const columnVisibility = useMemo<VisibilityState>(
    () => Object.fromEntries(resolved.orderedColumns.map((c) => [c.key, !resolved.hiddenColumns.has(c.key)])),
    [resolved],
  );

  const selectedRecord = useMemo(() => {
    if (!selectedKey) return null;
    const idx = dataset.rows.findIndex((r, i) => rowIdentity(r, i) === selectedKey);
    return idx >= 0 ? dataset.rows[idx]! : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, dataset.rows]);

  function persist(update: Partial<DatasetViewConfig>, onDone?: () => void) {
    const ui = buildUiMetadataPatch(agent, dataset.path, update);
    updateUi.mutate(ui, {
      onSuccess: () => {
        toast('View saved');
        onDone?.();
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not save view', 'error'),
    });
  }

  function applySavedView(v: SavedView | null) {
    setActiveView(v?.id ?? 'all');
    setGlobalFilter(v?.search ?? '');
    setColumnFilters(v?.filters ? toColumnFilters(v.filters) : []);
    setSorting(v?.sort ?? resolved.sort);
  }

  function saveCurrentAsView() {
    const name = window.prompt('Name this view (e.g. "Currently watching"):');
    if (!name?.trim()) return;
    const view: SavedView = {
      id: `v_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${resolved.savedViews.length}`,
      name: name.trim(),
      search: globalFilter || undefined,
      filters: columnFilters.length ? toFilterMap(columnFilters) : undefined,
      sort: sorting.length ? sorting : undefined,
    };
    persist({ saved_views: [...resolved.savedViews, view] }, () => setActiveView(view.id));
  }

  function deleteSavedView(id: string) {
    persist({ saved_views: resolved.savedViews.filter((v) => v.id !== id) }, () => {
      if (activeView === id) applySavedView(null);
    });
  }

  function onEditField(fe: FieldEdit) {
    const instruction = buildEditInstruction(fe);
    setEditPendingKey(fe.fieldKey);
    edit.mutate(instruction, {
      onSuccess: (res) => {
        const outcome = interpretEditResponse(res);
        if (outcome.ok) {
          toast(outcome.message || 'Saved');
          setClearEditToken((t) => t + 1);
        } else {
          toast(outcome.message, 'error');
        }
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Edit failed', 'error'),
      onSettled: () => setEditPendingKey(null),
    });
  }

  const activeFilterCount = columnFilters.length + (globalFilter ? 1 : 0);

  return (
    <div className="dataset-wb">
      <div className="dataset-wb__toolbar">
        <div className="dataset-wb__views" role="tablist" aria-label="Saved views">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'all'}
            className={clsx('dataset-wb__view', activeView === 'all' && 'dataset-wb__view--active')}
            onClick={() => applySavedView(null)}
          >
            All {dataset.label}
          </button>
          {resolved.savedViews.map((v) => (
            <span key={v.id} className={clsx('dataset-wb__view-wrap', activeView === v.id && 'dataset-wb__view--active')}>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === v.id}
                className="dataset-wb__view"
                onClick={() => applySavedView(v)}
              >
                {v.name}
              </button>
              <button
                type="button"
                className="dataset-wb__view-x"
                title="Delete view"
                aria-label={`Delete view ${v.name}`}
                onClick={() => deleteSavedView(v.id)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="dataset-wb__tools">
          <div className="view-toggle" role="group" aria-label="Table or dashboard">
            <button
              type="button"
              className={clsx('view-toggle__btn', mode === 'table' && 'view-toggle__btn--active')}
              aria-pressed={mode === 'table'}
              onClick={() => setMode('table')}
            >
              ☰ Table
            </button>
            <button
              type="button"
              className={clsx('view-toggle__btn', mode === 'dashboard' && 'view-toggle__btn--active')}
              aria-pressed={mode === 'dashboard'}
              onClick={() => setMode('dashboard')}
            >
              📊 Dashboard
            </button>
          </div>
          {mode === 'table' && (
            <>
              <input
                className="input dataset-wb__search"
                type="search"
                placeholder="Search…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                aria-label={`Search ${dataset.label}`}
              />
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" onClick={() => applySavedView(null)}>
                  Clear ({activeFilterCount})
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={saveCurrentAsView} disabled={updateUi.isPending}>
                Save view
              </Button>
              <Button size="sm" onClick={() => setConfigOpen(true)}>
                Configure
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === 'dashboard' ? (
        <DatasetDashboard dataset={dataset} />
      ) : (
        <>
          <QuickFilters columns={resolved.visibleColumns} filters={columnFilters} onChange={setColumnFilters} />

          <div className="dataset-wb__count">
            {dataset.rows.length} record{dataset.rows.length === 1 ? '' : 's'}
          </div>

          <DataTable
            columns={resolved.orderedColumns}
            rows={dataset.rows}
            rowKey={rowIdentity}
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            globalFilter={globalFilter}
            columnSizing={columnSizing}
            onColumnSizingChange={setColumnSizing}
            pinned={resolved.pinnedColumns}
            onRowClick={(row) => setSelectedKey(rowIdentity(row, dataset.rows.indexOf(row)))}
          />
        </>
      )}

      <RowDrawer
        open={selectedRecord !== null}
        onClose={() => setSelectedKey(null)}
        record={selectedRecord}
        columns={resolved.orderedColumns}
        primaryField={resolved.primaryField}
        datasetLabel={resolved.label}
        canEdit={canEdit}
        onEditField={onEditField}
        editPendingKey={editPendingKey}
        clearEditToken={clearEditToken}
      />

      <ConfigureViewDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        columns={resolved.orderedColumns}
        saving={updateUi.isPending}
        initial={{
          label: resolved.label,
          orderKeys: resolved.orderedColumns.map((c) => c.key),
          hidden: resolved.hiddenColumns,
          primaryField: resolved.primaryField,
          sort: sorting,
        }}
        onSave={(cfg) =>
          persist({ ...cfg, column_widths: columnSizing }, () => {
            if (cfg.default_sort) setSorting(cfg.default_sort);
            setConfigOpen(false);
          })
        }
        onReset={() =>
          persist(
            { label: undefined, column_order: undefined, hidden_columns: undefined, primary_field: undefined, default_sort: undefined, column_widths: undefined },
            () => setConfigOpen(false),
          )
        }
      />
    </div>
  );
}
