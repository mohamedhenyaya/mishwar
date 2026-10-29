import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search, Star } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useSearchInput, useUrlFilters } from '@/lib/hooks';
import { int, money, num, relative } from '@/lib/format';
import { DRIVER_STATUS, VEHICLE_TYPE } from '@/lib/labels';
import type { Driver, Paginated } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { AccountActions } from '@/components/accounts/AccountActions';
import { CreateAccountDialog } from '@/components/accounts/AccountForms';
import { AccountStatusBadge } from './ClientsPage';

const LIMIT = 20;

export default function DriversPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { values, page, set } = useUrlFilters({ search: '', status: '', isActive: '' });
  const [searchInput, setSearchInput] = useSearchInput(values.search, (search) => set({ search }));

  const query = useQuery({
    queryKey: ['drivers', 'list', values, page],
    queryFn: async () => (await api.get<Paginated<Driver>>('/admin/drivers', {
      params: {
        page, limit: LIMIT,
        search: values.search || undefined, status: values.status || undefined, isActive: values.isActive || undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const columns: Column<Driver>[] = [
    {
      key: 'driver', header: 'Capitaine', cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={d.name} photoUrl={d.photoUrl} seed={d.id} />
            {d.status !== 'OFFLINE' && (
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#13131F] ${d.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-accent-500'}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{d.name || 'Sans nom'}</p>
            <p className="truncate text-xs text-slate-500">{d.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle', header: 'Véhicule', hideOnMobile: true, cell: (d) => (
        <div className="min-w-0">
          <p className="truncate">{d.vehicleModel || VEHICLE_TYPE[d.vehicleType]}</p>
          <p className="truncate font-mono text-xs text-slate-500">{d.vehiclePlate || '—'}</p>
        </div>
      ),
    },
    {
      key: 'presence', header: 'Disponibilité', cell: (d) => (
        <div>
          <StatusBadge map={DRIVER_STATUS} value={d.status} />
          {d.lastLocationUpdate && <p className="mt-0.5 text-[11px] text-slate-400">GPS {relative(d.lastLocationUpdate)}</p>}
        </div>
      ),
    },
    { key: 'rides', header: 'Courses', cell: (d) => int(d.totalRides) },
    {
      key: 'rating', header: 'Note', hideOnMobile: true, cell: (d) => (
        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{num(d.rating).toFixed(1)}
          <span className="text-xs text-slate-400">({d.ratingCount})</span></span>
      ),
    },
    { key: 'balance', header: 'Solde', cell: (d) => <span className={num(d.balance) < 0 ? 'font-medium text-danger' : 'font-medium'}>{money(d.balance)}</span> },
    { key: 'account', header: 'Compte', cell: (d) => <AccountStatusBadge isActive={d.isActive} blockedReason={d.blockedReason} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (d) => <AccountActions kind="driver" account={d} /> },
  ];

  return (
    <>
      <PageHeader
        title="Capitaines"
        description={query.data ? `${int(query.data.total)} capitaine${query.data.total > 1 ? 's' : ''}` : 'Chauffeurs partenaires'}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouveau capitaine</Button>}
      />
      <Toolbar>
        <div className="sm:w-80">
          <Input leading={<Search className="h-4 w-4" />} placeholder="Nom, téléphone ou plaque" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select className="sm:w-44" value={values.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Toute disponibilité</option>
          <option value="ONLINE">En ligne</option>
          <option value="BUSY">En course</option>
          <option value="OFFLINE">Hors ligne</option>
        </Select>
        <Select className="sm:w-40" value={values.isActive} onChange={(e) => set({ isActive: e.target.value })}>
          <option value="">Tous les comptes</option>
          <option value="true">Actifs</option>
          <option value="false">Bloqués</option>
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(d) => navigate(`/capitaines/${d.id}`)}
        empty={<EmptyState title="Aucun capitaine" description={values.search ? `Aucun résultat pour « ${values.search} ».` : 'Ajoutez votre premier capitaine.'} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <CreateAccountDialog kind="driver" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
