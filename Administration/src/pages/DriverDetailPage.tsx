import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ban, CircleDollarSign, MapPin, Percent, Phone, Route, Star, Wallet } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { date, fullDateTime, int, money, num, relative } from '@/lib/format';
import { DRIVER_STATUS, RIDE_STATUS, VEHICLE_TYPE } from '@/lib/labels';
import type { DriverStats, Paginated, Vehicle } from '@/lib/types';
import { Card, DefinitionList, PageHeader, PageLoader, StatCard, Tabs } from '@/components/ui/Misc';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Table';
import { AccountActions } from '@/components/accounts/AccountActions';
import { EditDriverDialog } from '@/components/accounts/AccountForms';
import { VehicleCard } from '@/components/drivers/VehicleCard';
import { OwnerRidesTable } from '@/components/rides/RidesTable';
import { TransactionsTable } from '@/components/wallet/TransactionsTable';
import { DriverAccountBadge } from './ClientsPage';

export default function DriverDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'rides' | 'wallet'>('rides');
  const [editing, setEditing] = useState(false);
  // Même requête que la carte « Dossier du capitaine » (partagée par le cache)
  const vehicle = useQuery({
    queryKey: ['vehicles', 'driver', id],
    queryFn: async () => (await api.get<Paginated<Vehicle>>('/admin/vehicles', { params: { driverId: id, limit: 1 } })).data.data[0] ?? null,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => (await api.get<DriverStats>(`/admin/drivers/${id}`)).data,
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <EmptyState title="Capitaine introuvable" description={errorMessage(error)} />;

  const { driver } = data;
  const deleted = !!driver.deletedAt;
  const hasPosition = driver.latitude !== null && driver.longitude !== null;

  return (
    <>
      <PageHeader
        back={{ to: '/capitaines', label: 'Capitaines' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={driver.name} photoUrl={driver.photoUrl} seed={driver.id} size={48} />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate">{driver.name || 'Sans nom'}</span>
                {deleted ? <Badge>Supprimé</Badge> : <DriverAccountBadge driver={driver} approval={vehicle.data?.status} />}
                {!deleted && <StatusBadge map={DRIVER_STATUS} value={driver.status} />}
              </span>
              <span className="mt-0.5 block text-sm font-normal text-slate-500">
                {deleted ? 'Compte anonymisé' : `${driver.phone} · ${driver.vehicleModel || VEHICLE_TYPE[driver.vehicleType]} ${driver.vehiclePlate ? `· ${driver.vehiclePlate}` : ''}`}
              </span>
            </span>
          </span>
        }
        actions={!deleted && (
          <AccountActions kind="driver" account={driver} variant="buttons" onEdit={() => setEditing(true)} onDeleted={() => navigate('/capitaines')} />
        )}
      />

      {!driver.isActive && !deleted && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Capitaine bloqué depuis le {fullDateTime(driver.blockedAt)} · {driver.blockedUntil ? `jusqu’au ${fullDateTime(driver.blockedUntil)}` : 'définitivement'}</p>
            <p className="mt-0.5 opacity-80">{driver.blockedReason || 'Aucun motif renseigné'}</p>
          </div>
        </div>
      )}
      {driver.isActive && data.balance < 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Solde négatif de <b>{money(data.balance)}</b> : le capitaine doit recharger son compte pour couvrir les commissions dues.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solde prépayé" value={money(data.balance)} icon={<Wallet className="h-5 w-5" />} tone={data.balance < 0 ? 'red' : 'green'} />
        <StatCard label="Courses" value={int(data.totalRides)} hint={`${int(data.ridesByStatus.COMPLETED ?? 0)} terminées · ${int(data.ridesByStatus.CANCELLED ?? 0)} annulées`} icon={<Route className="h-5 w-5" />} />
        <StatCard label="Gains (courses terminées)" value={money(data.totalEarned)} icon={<CircleDollarSign className="h-5 w-5" />} tone="violet" />
        <StatCard label="Commission versée" value={money(data.totalCommissionPaid)} icon={<Percent className="h-5 w-5" />} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card title="Informations">
            <DefinitionList items={[
              { label: 'Téléphone', value: deleted ? '—' : <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="h-3.5 w-3.5" />{driver.phone}</a> },
              { label: 'Note', value: <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{num(driver.rating).toFixed(2)} ({int(driver.ratingCount)})</span> },
              { label: 'Inscrit le', value: date(driver.createdAt) },
            ]} />
          </Card>
          <Card title="Dernière position">
            {hasPosition ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent-500" />{num(driver.latitude).toFixed(5)}, {num(driver.longitude).toFixed(5)}</p>
                <p className="text-slate-500">Mise à jour {relative(driver.lastLocationUpdate)}</p>
                <div className="flex gap-3 pt-1">
                  <a className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300" target="_blank" rel="noreferrer"
                    href={`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`}>Google Maps</a>
                  <Link className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300" to={`/carte?focus=${driver.id}`}>Voir sur la carte</Link>
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">Aucune position reçue</p>}
          </Card>
          <Card title="Courses par statut">
            {Object.keys(data.ridesByStatus).length === 0 ? <p className="text-sm text-slate-500">Aucune course</p> : (
              <ul className="space-y-2 text-sm">
                {Object.entries(data.ridesByStatus).map(([s, n]) => (
                  <li key={s} className="flex items-center justify-between"><span className="text-slate-500">{RIDE_STATUS[s]?.label ?? s}</span><span className="font-medium">{int(n)}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <div className="mb-4">
            <VehicleCard driverId={driver.id} photoUrl={driver.photoUrl} readOnly={deleted} />
          </div>
          <div className="mb-3">
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'rides', label: 'Courses' },
              { value: 'wallet', label: 'Transactions' },
            ]} />
          </div>
          {tab === 'rides' && <OwnerRidesTable driverId={driver.id} />}
          {tab === 'wallet' && <TransactionsTable ownerType="driver" ownerId={driver.id} />}
        </div>
      </div>

      <EditDriverDialog driver={driver} open={editing} onClose={() => setEditing(false)} />
    </>
  );
}
