import { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { int } from '@/lib/format';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  // Masquée sur petit écran
  hideOnMobile?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns, rows, loading, error, onRetry, onRowClick, empty, footer,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50/80 dark:bg-white/[0.02]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={clsx('th', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !rows?.length ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="tr">
                  {columns.map((c) => (
                    <td key={c.key} className={clsx('td', c.hideOnMobile && 'hidden md:table-cell')}>
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-white/[0.05]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm font-medium text-danger">{error}</p>
                  {onRetry && (
                    <Button variant="outline" size="sm" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
                      Réessayer
                    </Button>
                  )}
                </td>
              </tr>
            ) : !rows?.length ? (
              <tr>
                <td colSpan={columns.length}>
                  {empty ?? <EmptyState title="Aucun résultat" description="Modifiez les filtres ou la recherche." />}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx('tr', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? (e) => {
                    // Les boutons/liens de la ligne gardent leur propre comportement
                    if ((e.target as HTMLElement).closest('button,a,input,select')) return;
                    onRowClick(row);
                  } : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={clsx('td', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.cell(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function Pagination({ page, limit, total, onChange, fetching }: {
  page: number; limit: number; total: number; onChange: (page: number) => void; fetching?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-white/[0.06]">
      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {int(from)}–{int(to)} sur {int(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[64px] text-center text-xs text-slate-500">{page} / {pages}</span>
        <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, icon, action }: {
  title: string; description?: string; icon?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
