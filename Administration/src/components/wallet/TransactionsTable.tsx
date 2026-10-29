import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api, errorMessage } from '@/lib/api';
import { dateTime, money, num } from '@/lib/format';
import { WALLET_TX_TYPE } from '@/lib/labels';
import type { OwnerType, Paginated, WalletTransaction, WalletTxType } from '@/lib/types';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';

export function TransactionsTable({ ownerType, ownerId, type, limit = 10, showOwner }: {
  ownerType?: OwnerType; ownerId?: string; type?: WalletTxType | ''; limit?: number; showOwner?: boolean;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['transactions', ownerType, ownerId, type, page, limit],
    queryFn: async () => (await api.get<Paginated<WalletTransaction>>('/admin/wallet/transactions', {
      params: { ownerType, ownerId, type: type || undefined, page, limit },
    })).data,
    placeholderData: keepPreviousData,
  });

  const columns: Column<WalletTransaction>[] = [
    { key: 'date', header: 'Date', cell: (t) => <span className="whitespace-nowrap text-slate-500">{dateTime(t.createdAt)}</span> },
    ...(showOwner ? [{ key: 'owner', header: 'Compte', cell: (t: WalletTransaction) => <PartyCell party={t.owner} fallbackId={t.ownerId} type={t.ownerType} /> }] : []),
    { key: 'type', header: 'Type', cell: (t) => <StatusBadge map={WALLET_TX_TYPE} value={t.type} dot={false} /> },
    {
      key: 'note', header: 'Motif', hideOnMobile: true, cell: (t) => (
        <div className="max-w-[280px]">
          <p className="truncate text-slate-600 dark:text-slate-300" title={t.note ?? undefined}>{t.note || '—'}</p>
          {t.admin && <p className="truncate text-xs text-slate-400">par {t.admin.name || t.admin.phone}</p>}
        </div>
      ),
    },
    {
      key: 'amount', header: 'Montant', className: 'text-right', cell: (t) => (
        <span className={clsx('font-semibold', num(t.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger')}>
          {money(t.amount, { sign: true })}
        </span>
      ),
    },
    { key: 'after', header: 'Solde après', className: 'text-right', hideOnMobile: true, cell: (t) => <span className="text-slate-500">{money(t.balanceAfter)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={query.data?.data}
      loading={query.isLoading}
      error={query.isError ? errorMessage(query.error) : null}
      onRetry={() => query.refetch()}
      empty={<EmptyState title="Aucune transaction" />}
      footer={query.data && query.data.total > limit && (
        <Pagination page={page} limit={limit} total={query.data.total} fetching={query.isFetching} onChange={setPage} />
      )}
    />
  );
}
