import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, money } from '@/lib/format';
import type { Paginated, User } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { AccountActions } from '@/components/accounts/AccountActions';
import { CreateAccountDialog } from '@/components/accounts/AccountForms';
import { AccountStatusBadge } from './ClientsPage';

const LIMIT = 50;

export default function AdminsPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admins', page],
    queryFn: async () => (await api.get<Paginated<User>>('/admin/users', { params: { role: 'admin', page, limit: LIMIT } })).data,
  });

  const activeAdmins = query.data?.data.filter((a) => a.isActive).length ?? 0;

  const columns: Column<User>[] = [
    {
      key: 'admin', header: 'Administrateur', cell: (a) => (
        <div className="flex items-center gap-3">
          <Avatar name={a.name} photoUrl={a.photoUrl} seed={a.id} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">{a.name || 'Sans nom'} {a.id === me?.id && <Badge tone="blue">Vous</Badge>}</p>
            <p className="truncate text-xs text-slate-500">{a.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Statut', cell: (a) => <AccountStatusBadge isActive={a.isActive} blockedReason={a.blockedReason} blockedUntil={a.blockedUntil} /> },
    { key: 'balance', header: 'Solde', hideOnMobile: true, cell: (a) => money(a.balance) },
    { key: 'created', header: 'Créé le', hideOnMobile: true, cell: (a) => <span className="text-slate-500">{date(a.createdAt)}</span> },
    {
      key: 'actions', header: '', className: 'w-12', cell: (a) => {
        // Le serveur refuse aussi de bloquer/supprimer soi-même ou le dernier admin actif
        const protectedAccount = a.id === me?.id || (a.isActive && activeAdmins <= 1);
        return <AccountActions kind="user" account={a} canBlock={!protectedAccount} canDelete={!protectedAccount} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Administrateurs"
        description="Personnes ayant accès à ce back-office. Chaque action est tracée dans le journal d'audit."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouvel administrateur</Button>}
      />
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-accent-100 bg-accent-50/60 p-4 text-sm text-accent-900 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Un administrateur bloqué ou supprimé perd l'accès immédiatement. La plateforme garde toujours au moins un administrateur actif.</p>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(a) => navigate(`/clients/${a.id}`)}
        empty={<EmptyState title="Aucun administrateur" />}
        footer={query.data && query.data.total > LIMIT && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={setPage} />
        )}
      />
      <CreateAccountDialog kind="admin" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
