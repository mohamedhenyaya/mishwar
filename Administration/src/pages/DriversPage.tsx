import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search, Star, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useSearchInput, useUrlFilters } from '@/lib/hooks';
import { int, money, num, relative } from '@/lib/format';
import { DOSSIER_STATUS, DRIVER_STATUS, VEHICLE_TYPE } from '@/lib/labels';
import type { Driver, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { AccountActions } from '@/components/accounts/AccountActions';
import { CreateDriverDialog } from '@/components/drivers/CreateDriverDialog';
import { DriverAccountBadge } from './ClientsPage';

const LIMIT = 20;

// Filtre « Dossier » : qui doit agir. Choix exclusifs de l'état du compte (filtre « Compte »).
const DOSSIER_FILTERS: Record<string, { label: string; hint?: string; params: Record<string, string> }> = {
  '':                { label: 'Tous', params: {} },
  TO_REVIEW:         { label: 'À traiter (par vous)', hint: 'À vous d’agir : une pièce envoyée attend sa vérification (ex. nouvelle assurance), ou le dossier est complet et le compte attend son approbation.', params: { toReview: 'true' } },
  INCOMPLETE:        { label: 'Incomplet (attente du capitaine)', hint: 'Au capitaine d’agir : identité, photo ou pièce manquante, ou pièce refusée à renvoyer depuis l’application.', params: { incomplete: 'true' } },
  REJECTED:          { label: 'Refusé', hint: 'Dossiers refusés : le capitaine doit corriger son dossier depuis l’application.', params: { vehicleStatus: 'REJECTED' } },
  INSURANCE_EXPIRED: { label: 'Assurance expirée', hint: 'Comptes approuvés sans assurance valide : ils ne peuvent plus passer en ligne tant que la nouvelle n’est pas validée.', params: { insuranceExpired: 'true' } },
};

// Colonne « Dossier » : état du compte et ce qui reste à faire
function DossierCell({ d }: { d: Driver }) {
  if (!d.vehicle) return <span className="text-slate-400">—</span>;
  const pending = d.dossier?.pendingDocuments ?? 0;
  const missing = d.vehicle.status !== 'APPROVED' ? d.dossier?.missing ?? 0 : 0;
  const until = d.dossier?.insuranceValidUntil;
  const insuranceExpired = d.vehicle.status === 'APPROVED' && (!until || new Date(until) < new Date());
  return (
    <div className="space-y-1">
      <StatusBadge map={DOSSIER_STATUS} value={d.vehicle.status} />
      {pending > 0 && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">{pending} pièce{pending > 1 ? 's' : ''} à vérifier</p>}
      {missing > 0 && <p className="text-[11px] font-medium text-slate-500">Incomplet : {missing} élément{missing > 1 ? 's' : ''} manquant{missing > 1 ? 's' : ''}</p>}
      {d.vehicle.status === 'PENDING' && !missing && !pending && <p className="text-[11px] font-medium text-accent-600 dark:text-accent-300">Prêt à approuver</p>}
      {insuranceExpired && <p className="text-[11px] font-medium text-danger">Assurance expirée</p>}
    </div>
  );
}

export default function DriversPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { values, page, set } = useUrlFilters({ search: '', status: '', account: '', vehicleStatus: '' });
  const dossierFilter = DOSSIER_FILTERS[values.vehicleStatus] ?? DOSSIER_FILTERS[''];
  const filtered = !!(values.search || values.status || values.account || values.vehicleStatus);
  const [searchInput, setSearchInput] = useSearchInput(values.search, (search) => set({ search }));

  const query = useQuery({
    queryKey: ['drivers', 'list', values, page],
    queryFn: async () => (await api.get<Paginated<Driver>>('/admin/drivers', {
      params: {
        page, limit: LIMIT,
        search: values.search || undefined, status: values.status || undefined, account: values.account || undefined,
        ...dossierFilter.params,
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
    { key: 'dossier', header: 'Dossier', cell: (d) => <DossierCell d={d} /> },
    { key: 'rides', header: 'Courses', cell: (d) => int(d.totalRides) },
    {
      key: 'rating', header: 'Note', hideOnMobile: true, cell: (d) => (
        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{num(d.rating).toFixed(1)}
          <span className="text-xs text-slate-400">({d.ratingCount})</span></span>
      ),
    },
    { key: 'balance', header: 'Solde', cell: (d) => <span className={num(d.balance) < 0 ? 'font-medium text-danger' : 'font-medium'}>{money(d.balance)}</span> },
    { key: 'account', header: 'Compte', cell: (d) => <DriverAccountBadge driver={d} approval={d.vehicle?.status} /> },
    { key: 'actions', header: '', className: 'w-12', cell: (d) => <AccountActions kind="driver" account={d} /> },
  ];

  return (
    <>
      <PageHeader
        title="Capitaines"
        description={query.data ? `${int(query.data.total)} capitaine${query.data.total > 1 ? 's' : ''}` : 'Chauffeurs partenaires'}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouveau capitaine</Button>}
      />
      {/* Filtres : chacun porte son titre ; l'explication du filtre « Dossier » s'affiche dessous */}
      <div className="mb-4 space-y-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <Field label="Recherche">
            <Input leading={<Search className="h-4 w-4" />} placeholder="Nom, téléphone, plaque ou NNI" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </Field>
          <Field label="Disponibilité">
            <Select value={values.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="">Toutes</option>
              <option value="ONLINE">En ligne</option>
              <option value="BUSY">En course</option>
              <option value="OFFLINE">Hors ligne</option>
            </Select>
          </Field>
          <Field label="Compte">
            <Select value={values.account} onChange={(e) => set({ account: e.target.value })}>
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="pending">En cours de validation</option>
              <option value="blocked">Bloqués</option>
            </Select>
          </Field>
          <Field label="Dossier">
            <Select value={values.vehicleStatus} onChange={(e) => set({ vehicleStatus: e.target.value })}>
              {Object.entries(DOSSIER_FILTERS).map(([value, f]) => <option key={value} value={value}>{f.label}</option>)}
            </Select>
          </Field>
          {filtered && (
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => { setSearchInput(''); set({ search: '', status: '', account: '', vehicleStatus: '' }); }}>
              Effacer les filtres
            </Button>
          )}
        </div>
        {dossierFilter.hint && <p className="text-xs text-slate-500">{dossierFilter.hint}</p>}
      </div>
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
      <CreateDriverDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
