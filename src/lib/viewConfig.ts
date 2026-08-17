// Presentation configuration for agent datasets, stored durably in
// Agent.ui_metadata.agentify.views (survives browsers/devices). Domain data
// lives in structured_data and is never touched here — this is UI only.
//
// A stored config is always MERGED over auto-generated defaults, so a brand new
// dataset works with zero configuration and newly-added columns appear
// automatically rather than disappearing.

import type { Agent } from '@shared/types';
import { asRecord } from './guards';
import type { ColumnMeta, Dataset } from './dataset';
import { primaryFieldOf } from './dataset';

export type SortRule = { id: string; desc: boolean };
/** enum column → allowed values; boolean column → required value. */
export type FilterValue = string[] | boolean;
export type FilterMap = Record<string, FilterValue>;

export interface SavedView {
  id: string;
  name: string;
  search?: string;
  filters?: FilterMap;
  sort?: SortRule[];
  hidden_columns?: string[];
}

export interface DatasetViewConfig {
  label?: string;
  view_type?: 'table';
  hidden_columns?: string[];
  column_order?: string[];
  column_widths?: Record<string, number>;
  default_sort?: SortRule[];
  pinned_columns?: string[];
  primary_field?: string;
  default_filters?: FilterMap;
  saved_views?: SavedView[];
}

export interface AgentifyConfig {
  views?: Record<string, DatasetViewConfig>;
}

export interface ResolvedView {
  label: string;
  /** All columns in display order (respecting stored column_order). */
  orderedColumns: ColumnMeta[];
  hiddenColumns: Set<string>;
  /** Visible columns = ordered minus hidden. */
  visibleColumns: ColumnMeta[];
  columnWidths: Record<string, number>;
  sort: SortRule[];
  pinnedColumns: string[];
  primaryField: string | null;
  defaultFilters: FilterMap;
  savedViews: SavedView[];
  /** True when the user has saved any explicit config for this dataset. */
  customized: boolean;
}

export function readAgentifyConfig(agent: Agent | undefined): AgentifyConfig {
  const ui = asRecord(agent?.ui_metadata);
  const agentify = asRecord(ui.agentify);
  return { views: asRecord(agentify.views) as Record<string, DatasetViewConfig> };
}

export function storedViewConfig(agent: Agent | undefined, path: string): DatasetViewConfig | undefined {
  return readAgentifyConfig(agent).views?.[path];
}

/** A sensible default sort: newest-first on a datetime column if one exists. */
function autoSort(columns: ColumnMeta[]): SortRule[] {
  const dt =
    columns.find((c) => c.kind === 'datetime' && /updated|modified/i.test(c.key)) ??
    columns.find((c) => c.kind === 'datetime') ??
    columns.find((c) => c.kind === 'date');
  return dt ? [{ id: dt.key, desc: true }] : [];
}

/** Merge stored config over auto-defaults into a concrete resolved view. */
export function resolveView(dataset: Dataset, stored: DatasetViewConfig | undefined): ResolvedView {
  const byKey = new Map(dataset.columns.map((c) => [c.key, c]));

  // Column order: stored order first (keeping only still-present columns),
  // then any columns the stored config didn't know about (newly added).
  const orderedKeys: string[] = [];
  for (const k of stored?.column_order ?? []) if (byKey.has(k) && !orderedKeys.includes(k)) orderedKeys.push(k);
  for (const c of dataset.columns) if (!orderedKeys.includes(c.key)) orderedKeys.push(c.key);
  const orderedColumns = orderedKeys.map((k) => byKey.get(k)!).filter(Boolean);

  // Hidden: stored list, or auto-hide all-empty columns when unconfigured.
  const hiddenColumns = new Set(stored?.hidden_columns ?? orderedColumns.filter((c) => c.kind === 'null').map((c) => c.key));

  const sort = stored?.default_sort?.length ? stored.default_sort : autoSort(orderedColumns);
  const primaryField = stored?.primary_field ?? primaryFieldOf(orderedColumns);

  return {
    label: stored?.label ?? dataset.label,
    orderedColumns,
    hiddenColumns,
    visibleColumns: orderedColumns.filter((c) => !hiddenColumns.has(c.key)),
    columnWidths: stored?.column_widths ?? {},
    sort,
    pinnedColumns: stored?.pinned_columns ?? [],
    primaryField,
    defaultFilters: stored?.default_filters ?? {},
    savedViews: stored?.saved_views ?? [],
    customized: Boolean(stored && Object.keys(stored).length > 0),
  };
}

/**
 * Produce a new ui_metadata object with a dataset's view config updated,
 * preserving every other ui_metadata key (e.g. Hermes's `card_metrics`) and
 * every other dataset's config. This is the exact object sent to PATCH.
 */
export function buildUiMetadataPatch(
  agent: Agent,
  path: string,
  update: Partial<DatasetViewConfig>,
): Record<string, unknown> {
  const ui = { ...asRecord(agent.ui_metadata) };
  const agentify = { ...asRecord(ui.agentify) };
  const views = { ...asRecord(agentify.views) };
  const current = { ...asRecord(views[path]) } as DatasetViewConfig;
  views[path] = { ...current, ...update };
  agentify.views = views;
  ui.agentify = agentify;
  return ui;
}
