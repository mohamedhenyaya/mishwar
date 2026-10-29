import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Plus, Search, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useDebounced, useUrlFilters } from '@/lib/hooks';
import { dateTime, money } from '@/lib/format';
import { OWNER_TYPE, WALLET_REQUEST_STATUS, WALLET_REQUEST_TYPE, WALLET_TX_TYPE } from '@/lib/labels';
import type { Driver, OwnerType, Paginated, User, WalletRequest, WalletTxType } from '@/lib/types';
import { PageHeader, Tabs, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdjustBalanceDialog, AccountRef } from '@/components/accounts/AccountDialogs';
import { TransactionsTable } from '@/components/wallet/TransactionsTable';
import { useOverview } from '@/components/layout/Layout';

const LIMIT = 20;

function RequestsTab() {
  const qc = useQueryClient();
  const { values, page, set } = useUrlFilters({ status: 'PENDING', type: '' });
  const [reviewing, setReviewing] = useState<{ req: WalletRequest; action: 'approve' | 'reject' } | null>(null);

  const query = useQuery({
    queryKey: ['wallet-requests', values, page],
    queryFn: async () => (await api.get<Paginated<WalletRequest>>('/admin/wallet/requests', {
      params: { page, limit: LIMIT, status: values.status === 'ALL' ? undefined : values.status, type: values.type || undefined },
    })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const review = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note: string }) =>
      api.patch(`/admin/wallet/requests/${id}/${action}`, { reviewNote: note || undefined }),
    onSuccess: (_, v) => {
      toast.success(v.action === 'approve' ? 'Demande approuvée — solde mis à jour' : 'Demande rejetée');
      setReviewing(null);
      qc.invalidateQueries({ queryKey: ['wallet-requests'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      // Une autre personne a pu traiter la demande entre-temps
      qc.invalidateQueries({ queryKey: ['wallet-requests'] });
    },
  });

  const columns: Column<WalletRequest>[] = [
    { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap text-slate-500">{dateTime(r.createdAt)}</span> },
    {
      key: 'owner', header: 'Demandeur', cell: (r) => (
        <div className="flex items-center gap-2">
          <PartyCell party={r.owner} fallbackId={r.ownerId} type={r.ownerType} />
          <Badge className="hidden xl:inline-flex">{OWNER_TYPE[r.ownerType]}</Badge>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone={r.type === 'TOPUP' ? 'green' : 'amber'}>{WALLET_REQUEST_TYPE[r.type]}</Badge> },
    { key: 'amount', header: 'Montant', cell: (r) => <span className="font-semibold">{money(r.amount)}</span> },
    {
      key: 'method', header: 'Moyen / référence', hideOnMobile: true, cell: (r) => (
        <div><p className="capitalize">{r.method}</p>{r.reference && <p className="font-mono text-xs text-slate-500">{r.reference}</p>}</div>
      ),
    },
    {
      key: 'status', header: 'Statut', cell: (r) => (
        <div>
          <StatusBadge map={WALLET_REQUEST_STATUS} value={r.status} />
          {r.reviewNote && <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-400" title={r.reviewNote}>{r.reviewNote}</p>}
        </div>
      ),
    },
    {
      key: 'actions', header: '', className: 'text-right', cell: (r) => r.status === 'PENDING' && (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" icon={<X className="h-3.5 w-3.5" />} onClick={() => setReviewing({ req: r, action: 'reject' })}>Rejeter</Button>
          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setReviewing({ req: r, action: 'approve' })}>Approuver</Button>
        </div>
      ),
    },
  ];

  const r = reviewing?.req;
  return (
    <>
      <Toolbar>
        <Select className="sm:w-44" value={values.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="PENDING">À traiter</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
          <option value="ALL">Toutes</option>
        </Select>
        <Select className="sm:w-40" value={values.type} onChange={(e) => set({ type: e.target.value })}>
          <option value="">Recharges et retraits</option>
          <option value="TOPUP">Recharges</option>
          <option value="WITHDRAWAL">Retraits</option>
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        empty={<EmptyState title={values.status === 'PENDING' ? 'Aucune demande en attente' : 'Aucune demande'} description={values.status === 'PENDING' ? 'Tout est traité 🎉' : undefined} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      {r && (
        <ConfirmDialog
          open
          onClose={() => setReviewing(null)}
          onConfirm={(note) => review.mutate({ id: r.id, action: reviewing.action, note })}
          loading={review.isPending}
          tone={reviewing.action === 'approve' ? 'success' : 'danger'}
          title={reviewing.action === 'approve'
            ? `${r.type === 'TOPUP' ? 'Créditer' : 'Débiter'} ${money(r.amount)} ?`
            : 'Rejeter cette demande ?'}
          description={reviewing.action === 'approve'
            ? `${WALLET_REQUEST_TYPE[r.type]} de ${r.owner?.name || r.owner?.phone || 'ce compte'} via ${r.method}${r.reference ? ` (réf. ${r.reference})` : ''}. Vérifiez la réception des fonds avant d'approuver.`
            : 'Aucun mouvement ne sera appliqué au solde. Le motif est visible par le demandeur.'}
          confirmLabel={reviewing.action === 'approve' ? 'Approuver' : 'Rejeter'}
          reason={reviewing.action === 'approve'
            ? { label: 'Note interne', placeholder: 'Ex. reçu vérifié' }
            : { label: 'Motif du rejet', required: true, suggestions: ['Paiement non reçu', 'Référence introuvable', 'Montant incorrect', 'Solde insuffisant'] }}
        />
      )}
    </>
  );
}

function AccountPicker({ open, onClose, onPick }: {
  open: boolean; onClose: () => void; onPick: (kind: OwnerType, account: AccountRef) => void;
}) {
  const [kind, setKind] = useState<OwnerType>('user');
  const [input, setInput] = useState('');
  const search = useDebounced(input.trim(), 250);

  const results = useQuery({
    queryKey: ['picker', kind, search],
    queryFn: async () => (await api.get<Paginated<User | Driver>>(kind === 'driver' ? '/admin/drivers' : '/admin/users', {
      params: { search: search || undefined, limit: 8 },
    })).data,
    enabled: open,
  });

  return (
    <Modal open={open} onClose={onClose} title="Ajuster un solde" description="Choisissez le compte à créditer ou débiter.">
      <div className="space-y-3">
        <Tabs value={kind} onChange={setKind} tabs={[{ value: 'user', label: 'Client / admin' }, { value: 'driver', label: 'Capitaine' }]} />
        <Input leading={<Search className="h-4 w-4" />} autoFocus placeholder="Nom, téléphone…" value={input} onChange={(e) => setInput(e.target.value)} />
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 dark:divide-white/[0.05] dark:border-white/[0.06]">
          {results.data?.data.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Aucun compte</li>}
          {results.data?.data.map((a) => (
            <li key={a.id}>
              <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]" onClick={() => onPick(kind, a)}>
                <Avatar name={a.name} photoUrl={a.photoUrl} seed={a.id} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name || 'Sans nom'}</span>
                  <span className="block text-xs text-slate-500">{a.phone}</span>
                </span>
                {'role' in a && a.role === 'admin' && <Badge tone="violet">Admin</Badge>}
                <span className="text-sm font-medium">{money(a.balance)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function TransactionsTab() {
  const [type, setType] = useState<WalletTxType | ''>('');
  const [ownerType, setOwnerType] = useState<OwnerType | ''>('');
  return (
    <>
      <Toolbar>
        <Select className="sm:w-48" value={type} onChange={(e) => setType(e.target.value as WalletTxType | '')}>
          <option value="">Tous les types</option>
          {Object.entries(WALLET_TX_TYPE).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <Select className="sm:w-44" value={ownerType} onChange={(e) => setOwnerType(e.target.value as OwnerType | '')}>
          <option value="">Tous les comptes</option>
          <option value="user">Clients / admins</option>
          <option value="driver">Capitaines</option>
        </Select>
      </Toolbar>
      <TransactionsTable key={`${type}-${ownerType}`} type={type} ownerType={ownerType || undefined} limit={LIMIT} showOwner />
    </>
  );
}

export default function WalletPage() {
  const [tab, setTab] = useState<'requests' | 'transactions'>('requests');
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState<{ kind: OwnerType; account: AccountRef } | null>(null);
  const { data: overview } = useOverview();

  return (
    <>
      <PageHeader
        title="Portefeuilles"
        description="Recharges, retraits, commissions et ajustements manuels"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setPicking(true)}>Ajuster un solde</Button>}
      />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'requests', label: 'Demandes', count: overview?.pending.walletRequests },
          { value: 'transactions', label: 'Historique des transactions' },
        ]} />
      </div>
      {tab === 'requests' ? <RequestsTab /> : <TransactionsTab />}

      <AccountPicker open={picking} onClose={() => setPicking(false)} onPick={(kind, account) => { setPicking(false); setTarget({ kind, account }); }} />
      {target && <AdjustBalanceDialog kind={target.kind} account={target.account} open onClose={() => setTarget(null)} />}
    </>
  );
}
