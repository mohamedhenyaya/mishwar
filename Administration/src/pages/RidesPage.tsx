import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { dayEndIso, dayStartIso, int } from '@/lib/format';
import { RIDE_STATUS } from '@/lib/labels';
import type { Paginated, Ride } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { rideColumns } from '@/components/rides/RidesTable';
import { RideDrawer } from '@/components/rides/RideDrawer';

const LIMIT = 25;

export default function RidesPage() {
  const { values, page, set } = useUrlFilters({ status: '', from: '', to: '' });
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['rides', 'list', values, page],
    queryFn: async () => (await api.get<Paginated<Ride>>('/admin/rides', {
      params: {
        page, limit: LIMIT,
        status: values.status || undefined,
        from: values.from ? dayStartIso(values.from) : undefined,
        to: values.to ? dayEndIso(values.to) : undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });

  const hasFilters = values.status || values.from || values.to;

  return (
    <>
      <PageHeader title="Courses" description={query.data ? `${int(query.data.total)} course${query.data.total > 1 ? 's' : ''}` : 'Toutes les courses de la plateforme'} />
      <Toolbar>
        <Select className="sm:w-52" value={values.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Tous les statuts</option>
          {Object.entries(RIDE_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" className="sm:w-40" value={values.from} max={values.to || undefined} onChange={(e) => set({ from: e.target.value })} aria-label="Du" />
          <span className="text-slate-400">→</span>
          <Input type="date" className="sm:w-40" value={values.to} min={values.from || undefined} onChange={(e) => set({ to: e.target.value })} aria-label="Au" />
        </div>
        {hasFilters && <Button variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => set({ status: '', from: '', to: '' })}>Réinitialiser</Button>}
      </Toolbar>
      <DataTable
        columns={rideColumns()}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(r) => setOpenId(r.id)}
        empty={<EmptyState title="Aucune course" description={hasFilters ? 'Aucune course ne correspond à ces filtres.' : undefined} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <RideDrawer rideId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
