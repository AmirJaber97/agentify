import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import clsx from 'clsx';
import type { ColumnMeta } from '@/lib/dataset';
import { isEmptyValue } from '@/lib/dataset';
import { EmptyState } from '@/components/ui';
import { CellValue } from './cells';

export type Row = Record<string, unknown>;

function sortKind(kind: ColumnMeta['kind']) {
  if (kind === 'number') return 'basic' as const;
  if (kind === 'date' || kind === 'datetime') return 'datetime' as const;
  return 'alphanumeric' as const;
}

function enumFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  const v = String(row.getValue(columnId) ?? '');
  return (filterValue as string[]).includes(v);
}

function boolFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown): boolean {
  if (typeof filterValue !== 'boolean') return true;
  return row.getValue(columnId) === filterValue;
}

export interface DataTableProps {
  columns: ColumnMeta[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  columnVisibility: VisibilityState;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  globalFilter: string;
  columnSizing: Record<string, number>;
  onColumnSizingChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  pinned: string[];
  onRowClick: (row: Row) => void;
}

export function DataTable(props: DataTableProps) {
  const { columns, rows, rowKey, pinned, onRowClick } = props;

  const columnDefs = useMemo<ColumnDef<Row>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        accessorFn: (row) => row[col.key],
        header: col.header,
        sortingFn: sortKind(col.kind),
        sortUndefined: 'last',
        enableSorting: col.kind !== 'object' && col.kind !== 'tags',
        filterFn: col.kind === 'boolean' ? boolFilter : enumFilter,
        cell: ({ getValue }) => <CellValue value={getValue()} kind={col.kind} />,
        meta: { kind: col.kind },
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: {
      sorting: props.sorting,
      columnVisibility: props.columnVisibility,
      columnFilters: props.columnFilters,
      globalFilter: props.globalFilter,
      columnSizing: props.columnSizing,
    },
    onSortingChange: props.onSortingChange,
    onColumnFiltersChange: props.onColumnFiltersChange,
    onColumnSizingChange: props.onColumnSizingChange as never,
    columnResizeMode: 'onChange',
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).toLowerCase().trim();
      if (!needle) return true;
      return columns.some((c) => {
        const v = row.getValue(c.key);
        if (isEmptyValue(v)) return false;
        return String(typeof v === 'object' ? JSON.stringify(v) : v)
          .toLowerCase()
          .includes(needle);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const model = table.getRowModel();
  const pinnedSet = new Set(pinned);
  const total = table.getFilteredRowModel().rows.length;
  const paginated = total > 25;

  return (
    <div className="wb">
      <div className="wb__scroll" role="region" aria-label="Data table" tabIndex={0}>
        <table className="wb__table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const kind = (header.column.columnDef.meta as { kind?: string } | undefined)?.kind;
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={clsx(pinnedSet.has(header.column.id) && 'wb__pinned', kind === 'number' && 'wb__num-col')}
                      style={{ width: header.getSize() }}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                    >
                      <button
                        type="button"
                        className="wb__th-btn"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                        title={header.column.getCanSort() ? 'Sort (shift-click to add)' : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' && <span aria-hidden="true"> ▲</span>}
                        {sorted === 'desc' && <span aria-hidden="true"> ▼</span>}
                      </button>
                      {header.column.getCanResize() && (
                        <span
                          className="wb__resizer"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          role="separator"
                          aria-orientation="vertical"
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr
                key={rowKey(row.original, row.index)}
                className="wb__row"
                tabIndex={0}
                onClick={() => onRowClick(row.original)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row.original);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const kind = (cell.column.columnDef.meta as { kind?: string } | undefined)?.kind;
                  return (
                    <td
                      key={cell.id}
                      className={clsx(pinnedSet.has(cell.column.id) && 'wb__pinned', kind === 'number' && 'wb__num-col')}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {model.rows.length === 0 && (
          <EmptyState icon="⌕" title="No matching records" hint="Adjust the search or filters above." />
        )}
      </div>

      {paginated && (
        <div className="wb__pager">
          <span className="wb__pager-info">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, total)} of {total}
          </span>
          <div className="wb__pager-btns">
            <button className="btn btn--sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              ‹ Prev
            </button>
            <button className="btn btn--sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
