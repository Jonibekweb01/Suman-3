import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Button } from './controls';
import { EmptyState, Skeleton } from './feedback';
import { IconChevronLeft, IconChevronRight } from './icons';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Tailwind width/alignment classes applied to both header and cells. */
  className?: string;
  /** Columns that can be dropped on narrow screens without losing meaning. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

const HIDE_CLASSES = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

/**
 * Generic table with loading, empty and pagination states.
 *
 * Every list screen in the admin renders through this so the row height,
 * hover affordance, sticky header and page controls are identical everywhere —
 * an admin who learns one list has learned all of them.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  onRowClick,
  page,
  totalPages,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const showPagination =
    onPageChange !== undefined && page !== undefined && (totalPages ?? 0) > 1;

  return (
    <div className="card overflow-hidden">
      <div className="table-scroll">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-canvas">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted',
                    column.hideBelow && HIDE_CLASSES[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading &&
              rows.length === 0 &&
              Array.from({ length: 6 }, (_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-3', column.hideBelow && HIDE_CLASSES[column.hideBelow])}
                    >
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line transition-colors last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-canvas',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle text-sm',
                      column.hideBelow && HIDE_CLASSES[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}

      {showPagination && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[13px] text-muted">
            Page {page} of {totalPages}
            {total !== undefined && ` · ${total} total`}
          </p>

          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              leftIcon={<IconChevronLeft size={14} />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (totalPages ?? 1)}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <IconChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
