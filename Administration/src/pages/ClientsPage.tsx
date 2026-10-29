import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search, Star } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useSearchInput, useUrlFilters } from '@/lib/hooks';
import { date, int, money, num } from '@/lib/format';
import type { Paginated, User } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { AccountActions } from '@/components/accounts/AccountActions';
import { CreateAccountDialog } from '@/components/accounts/AccountForms';

const LIMIT = 20;

export function AccountStatusBadge({ isActive, blockedReason }: { isActive: boolean; blockedReason?: string | null }) {
  return isActive
    ? <Badge tone="green" dot>Actif</Badge>
    : <span title={blockedReason ?? undefined}><Badge tone="red" dot>Bloqué</Badge></span>;
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { values, page, set } = useUrlFilters({ search: '', isActive: '' });
  const [searchInput, setSearchInput] = useSearchInput(values.search, (search) => set({ search }));

  const query = useQuery({
    queryKey: ['users', 'list', values, page],
    queryFn: async () => (await api.get<Paginated<User>>('/admin/users', {
      params: { role: 'user', page, limit: LIMIT, search: values.search || undefined, isActive: values.isActive || undefined },
    })).data,
    placeholderData: keepPreviousData,
  });

  const columns: Column<User>[] = [
    {
      key: 'client', header: 'Client', cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} photoUrl={u.photoUrl} seed={u.id} />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name || 'Sans nom'}</p>
            <p className="truncate text-xs text-slate-500">{u.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', hideOnMobile: true, cell: (u) => <span className="text-slate-500">{u.email || '—'}</span> },
    { key: 'rides', header: 'Courses', cell: (u) => int(u.totalRides) },
    {
      key: 'rating', header: 'Note', hideOnMobile: true, cell: (u) => (
        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{num(u.rating).toFixed(1)}
          <span className="text-xs text-slate-400">({u.ratingCount})</span></span>
      ),
    },
    { key: 'balance', header: 'Solde', cell: (u) => <span className={num(u.balance) < 0 ? 'font-medium text-danger' : 'font-medium'}>{money(u.balance)}</span> },
    { key: 'status', header: 'Statut', cell: (u) => <AccountStatusBadge isActive={u.isActive} blockedReason={u.blockedReason} /> },
    { key: 'created', header: 'Inscrit le', hideOnMobile: true, cell: (u) => <span className="text-slate-500">{date(u.createdAt)}</span> },
    { key: 'actions', header: '', className: 'w-12', cell: (u) => <AccountActions kind="user" account={u} /> },
  ];

  return (
    <>
      <PageHeader
        title="Clients"
        description={query.data ? `${int(query.data.total)} compte${query.data.total > 1 ? 's' : ''}` : 'Comptes passagers de l\'application'}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouveau client</Button>}
      />
      <Toolbar>
        <div className="sm:w-80">
          <Input leading={<Search className="h-4 w-4" />} placeholder="Nom, téléphone ou email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select className="sm:w-44" value={values.isActive} onChange={(e) => set({ isActive: e.target.value })}>
          <option value="">Tous les statuts</option>
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
        onRowClick={(u) => navigate(`/clients/${u.id}`)}
        empty={<EmptyState title="Aucun client" description={values.search ? `Aucun résultat pour « ${values.search} ».` : 'Les clients apparaîtront ici après leur inscription.'} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <CreateAccountDialog kind="user" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
