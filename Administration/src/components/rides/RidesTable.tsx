import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { RIDE_CLASS, RIDE_STATUS } from '@/lib/labels';
import type { Paginated, Ride } from '@/lib/types';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { RideDrawer } from './RideDrawer';

export function rideColumns(opts: { hideUser?: boolean; hideDriver?: boolean } = {}): Column<Ride>[] {
  return [
    { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap text-slate-500">{dateTime(r.createdAt)}</span> },
    ...(!opts.hideUser ? [{ key: 'user', header: 'Client', cell: (r: Ride) => <PartyCell party={r.user} fallbackId={r.userId} type="user" /> }] : []),
    ...(!opts.hideDriver ? [{
      key: 'driver', header: 'Capitaine', cell: (r: Ride) =>
        r.driverId ? <PartyCell party={r.driver} fallbackId={r.driverId} type="driver" /> : <span className="text-slate-400">—</span>,
    }] : []),
    {
      key: 'dest', header: 'Destination', hideOnMobile: true, cell: (r) => (
        <span className="block max-w-[220px] truncate text-slate-600 dark:text-slate-300">
          {r.isOpenTrip ? 'Trajet ouvert' : r.destinationName || '—'}
        </span>
      ),
    },
    { key: 'class', header: 'Classe', hideOnMobile: true, cell: (r) => <span className="text-slate-500">{RIDE_CLASS[r.vehicleType] ?? r.vehicleType}</span> },
    { key: 'status', header: 'Statut', cell: (r) => <StatusBadge map={RIDE_STATUS} value={r.status} /> },
    {
      key: 'price', header: 'Prix', className: 'text-right', cell: (r) => (
        <span className="font-medium">{r.price ? money(r.price) : r.estimatedPrice ? <span className="text-slate-400">~{money(r.estimatedPrice)}</span> : '—'}</span>
      ),
    },
  ];
}

// Courses d'un client ou d'un capitaine (fiches détail)
export function OwnerRidesTable({ userId, driverId }: { userId?: string; driverId?: string }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['rides', 'owner', userId ?? driverId, page],
    queryFn: async () => (await api.get<Paginated<Ride>>('/admin/rides', { params: { userId, driverId, page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <DataTable
        columns={rideColumns({ hideUser: !!userId, hideDriver: !!driverId })}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(r) => setOpenId(r.id)}
        empty={<EmptyState title="Aucune course" />}
        footer={query.data && query.data.total > 10 && (
          <Pagination page={page} limit={10} total={query.data.total} fetching={query.isFetching} onChange={setPage} />
        )}
      />
      <RideDrawer rideId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
