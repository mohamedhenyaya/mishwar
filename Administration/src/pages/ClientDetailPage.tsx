import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ban, CircleDollarSign, Mail, Phone, Route, ShieldCheck, Star, Wallet } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, fullDateTime, int, money, num } from '@/lib/format';
import { RIDE_STATUS } from '@/lib/labels';
import type { UserStats } from '@/lib/types';
import { Card, DefinitionList, PageHeader, PageLoader, StatCard, Tabs } from '@/components/ui/Misc';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Table';
import { AccountActions } from '@/components/accounts/AccountActions';
import { EditUserDialog } from '@/components/accounts/AccountForms';
import { OwnerRidesTable } from '@/components/rides/RidesTable';
import { TransactionsTable } from '@/components/wallet/TransactionsTable';
import { AccountStatusBadge } from './ClientsPage';

export default function ClientDetailPage() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'rides' | 'wallet'>('rides');
  const [editing, setEditing] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await api.get<UserStats>(`/admin/users/${id}`)).data,
  });

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return <EmptyState title="Compte introuvable" description={errorMessage(error)} />;
  }

  const { user } = data;
  const isAdmin = user.role === 'admin';
  const isMe = me?.id === user.id;
  const deleted = !!user.deletedAt;
  const back = isAdmin ? { to: '/administrateurs', label: 'Administrateurs' } : { to: '/clients', label: 'Clients' };

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={user.name} photoUrl={user.photoUrl} seed={user.id} size={48} />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate">{user.name || 'Sans nom'}</span>
                {isAdmin && <Badge tone="violet"><ShieldCheck className="h-3 w-3" /> Administrateur</Badge>}
                {deleted ? <Badge tone="gray">Supprimé</Badge> : <AccountStatusBadge isActive={user.isActive} blockedReason={user.blockedReason} />}
              </span>
              <span className="mt-0.5 block text-sm font-normal text-slate-500">{deleted ? 'Compte anonymisé' : user.phone}</span>
            </span>
          </span>
        }
        actions={!deleted && (
          <AccountActions
            kind="user"
            account={user}
            variant="buttons"
            onEdit={() => setEditing(true)}
            canBlock={!isMe}
            canDelete={!isMe}
            onDeleted={() => navigate(back.to)}
          />
        )}
      />

      {!user.isActive && !deleted && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Compte bloqué depuis le {fullDateTime(user.blockedAt)}</p>
            <p className="mt-0.5 opacity-80">{user.blockedReason || 'Aucun motif renseigné'}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solde" value={money(data.balance)} icon={<Wallet className="h-5 w-5" />} tone={data.balance < 0 ? 'red' : 'green'} />
        <StatCard label="Courses" value={int(data.totalRides)} hint={`${int(data.ridesByStatus.COMPLETED ?? 0)} terminées`} icon={<Route className="h-5 w-5" />} />
        <StatCard label="Total dépensé" value={money(data.totalSpent)} icon={<CircleDollarSign className="h-5 w-5" />} tone="violet" />
        <StatCard label="Note moyenne" value={`${num(user.rating).toFixed(1)} / 5`} hint={`${int(user.ratingCount)} avis de capitaines`} icon={<Star className="h-5 w-5" />} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card title="Informations">
            <DefinitionList items={[
              { label: 'Téléphone', value: deleted ? '—' : <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="h-3.5 w-3.5" />{user.phone}</a> },
              { label: 'Email', value: user.email ? <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 hover:underline"><Mail className="h-3.5 w-3.5" />{user.email}</a> : '—' },
              { label: 'Inscrit le', value: date(user.createdAt) },
              { label: 'Dernière mise à jour', value: fullDateTime(user.updatedAt) },
              { label: 'Identifiant', value: <span className="font-mono text-xs">{user.id}</span> },
            ]} />
          </Card>
          <Card title="Courses par statut">
            {Object.keys(data.ridesByStatus).length === 0 ? <p className="text-sm text-slate-500">Aucune course</p> : (
              <ul className="space-y-2 text-sm">
                {Object.entries(data.ridesByStatus).map(([s, n]) => (
                  <li key={s} className="flex items-center justify-between">
                    <span className="text-slate-500">{RIDE_STATUS[s]?.label ?? s}</span><span className="font-medium">{int(n)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <div className="mb-3">
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'rides', label: 'Courses' }, { value: 'wallet', label: 'Transactions' }]} />
          </div>
          {tab === 'rides' ? <OwnerRidesTable userId={user.id} /> : <TransactionsTable ownerType="user" ownerId={user.id} />}
        </div>
      </div>

      <EditUserDialog user={user} open={editing} onClose={() => setEditing(false)} />
    </>
  );
}
