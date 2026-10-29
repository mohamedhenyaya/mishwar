import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Send } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { dateTime, relative } from '@/lib/format';
import { OWNER_TYPE, TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from '@/lib/labels';
import type { Paginated, Party, Ticket, TicketMessage, TicketPriority, TicketStatus } from '@/lib/types';
import { PageHeader, PageLoader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { Drawer } from '@/components/ui/Modal';
import { RideDrawer } from '@/components/rides/RideDrawer';

const LIMIT = 20;

const QUICK_REPLIES = [
  'Bonjour, merci pour votre message. Nous examinons votre demande et revenons vers vous rapidement.',
  'Pouvez-vous nous préciser la date et l\'heure de la course concernée ?',
  'Votre solde a été régularisé. Merci de votre patience.',
  'Nous considérons ce problème comme résolu. N\'hésitez pas à nous recontacter si besoin.',
];

function TicketDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [rideId, setRideId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => (await api.get<{ ticket: Ticket; messages: TicketMessage[]; requester?: Party | null }>(`/support/tickets/${id}`)).data,
    enabled: !!id,
    refetchInterval: 15_000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages.length]);
  useEffect(() => setMessage(''), [id]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['ticket', id] });
    qc.invalidateQueries({ queryKey: ['tickets'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const send = useMutation({
    mutationFn: () => api.post(`/support/tickets/${id}/messages`, { message: message.trim() }),
    onSuccess: () => { setMessage(''); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: (patch: { status?: TicketStatus; priority?: TicketPriority }) => api.patch(`/admin/support/tickets/${id}/status`, patch),
    onSuccess: () => { toast.success('Ticket mis à jour'); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) send.mutate();
  };

  const t = data?.ticket;
  const closed = t?.status === 'CLOSED';

  return (
    <Drawer open={!!id} onClose={onClose} width="max-w-2xl" title={t?.subject ?? 'Ticket'}
      subtitle={t && <span className="inline-flex flex-wrap items-center gap-2"><StatusBadge map={TICKET_STATUS} value={t.status} /><Badge>{TICKET_CATEGORY[t.category]}</Badge> ouvert {relative(t.createdAt)}</span>}
      footer={t && !closed && (
        <form onSubmit={submit} className="w-full space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((q) => (
              <button key={q} type="button" onClick={() => setMessage(q)} title={q}
                className="max-w-[200px] truncate rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent-400 hover:text-accent-600 dark:border-white/10 dark:text-slate-300">{q}</button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre réponse — le demandeur est notifié en temps réel"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }} className="min-h-[60px]" />
            <Button type="submit" size="icon" className="h-11 w-11" loading={send.isPending} disabled={!message.trim()} aria-label="Envoyer"><Send className="h-4 w-4" /></Button>
          </div>
        </form>
      )}
    >
      {isLoading || !t ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{OWNER_TYPE[t.requesterType]}</p>
              <PartyCell party={data.requester} fallbackId={t.requesterId} type={t.requesterType} />
            </div>
            <div>
              <label className="label">Statut</label>
              <Select value={t.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}>
                {Object.entries(TICKET_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">Priorité</label>
              <Select value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value as TicketPriority })}>
                {Object.entries(TICKET_PRIORITY).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </div>
          </div>
          {t.relatedRideId && (
            <button onClick={() => setRideId(t.relatedRideId)} className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-300">
              Voir la course concernée ({t.relatedRideId.slice(0, 8)}) →
            </button>
          )}

          <div className="space-y-3">
            {data.messages.length === 0 && <p className="text-sm text-slate-500">Aucun message.</p>}
            {data.messages.map((m) => {
              const mine = m.senderType === 'admin';
              return (
                <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                    mine ? 'rounded-br-md bg-accent-500 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-white/[0.06]')}>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.message}</p>
                    <p className={clsx('mt-1 text-[10px]', mine ? 'text-white/70' : 'text-slate-400')}>
                      {mine ? 'Support' : OWNER_TYPE[m.senderType]} · {dateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {closed && <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-500 dark:bg-white/[0.03]">Ticket fermé — rouvrez-le (statut) pour répondre.</p>}
        </div>
      )}
      <RideDrawer rideId={rideId} onClose={() => setRideId(null)} />
    </Drawer>
  );
}

export default function SupportPage() {
  const [params, setParams] = useSearchParams();
  const { values, page, set } = useUrlFilters({ status: 'OPEN_ACTIVE', priority: '', category: '' });
  const openId = params.get('open');
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('open', id); else next.delete('open');
    setParams(next, { replace: true });
  };

  // « Actifs » = OPEN + IN_PROGRESS : l'API filtre sur un seul statut, on fusionne côté client
  const active = values.status === 'OPEN_ACTIVE';
  const query = useQuery({
    queryKey: ['tickets', values, page],
    queryFn: async () => {
      const base = { limit: LIMIT, priority: values.priority || undefined, category: values.category || undefined };
      if (!active) {
        return (await api.get<Paginated<Ticket>>('/admin/support/tickets', { params: { ...base, page, status: values.status === 'ALL' ? undefined : values.status } })).data;
      }
      const [open, inProgress] = await Promise.all([
        api.get<Paginated<Ticket>>('/admin/support/tickets', { params: { ...base, limit: 100, status: 'OPEN' } }),
        api.get<Paginated<Ticket>>('/admin/support/tickets', { params: { ...base, limit: 100, status: 'IN_PROGRESS' } }),
      ]);
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const data = [...open.data.data, ...inProgress.data.data]
        .sort((a, b) => rank[a.priority] - rank[b.priority] || +new Date(a.createdAt) - +new Date(b.createdAt));
      return { data, total: data.length, page: 1, limit: data.length || LIMIT };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const columns: Column<Ticket>[] = [
    {
      key: 'subject', header: 'Sujet', cell: (t) => (
        <div className="max-w-[320px]">
          <p className="truncate font-medium">{t.subject}</p>
          <p className="text-xs text-slate-500">{TICKET_CATEGORY[t.category]}</p>
        </div>
      ),
    },
    { key: 'requester', header: 'Demandeur', cell: (t) => <PartyCell party={t.requester} fallbackId={t.requesterId} type={t.requesterType} /> },
    { key: 'priority', header: 'Priorité', cell: (t) => <StatusBadge map={TICKET_PRIORITY} value={t.priority} dot={false} /> },
    { key: 'status', header: 'Statut', cell: (t) => <StatusBadge map={TICKET_STATUS} value={t.status} /> },
    { key: 'updated', header: 'Activité', hideOnMobile: true, cell: (t) => <span className="text-slate-500">{relative(t.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Support" description="Tickets ouverts par les clients et les capitaines" />
      <Toolbar>
        <Select className="sm:w-48" value={values.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="OPEN_ACTIVE">À traiter (ouverts + en cours)</option>
          {Object.entries(TICKET_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          <option value="ALL">Tous</option>
        </Select>
        <Select className="sm:w-40" value={values.priority} onChange={(e) => set({ priority: e.target.value })}>
          <option value="">Toute priorité</option>
          {Object.entries(TICKET_PRIORITY).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <Select className="sm:w-48" value={values.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">Toute catégorie</option>
          {Object.entries(TICKET_CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(t) => setOpen(t.id)}
        empty={<EmptyState title={active ? 'Aucun ticket à traiter' : 'Aucun ticket'} />}
        footer={!active && query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <TicketDrawer id={openId} onClose={() => setOpen(null)} />
    </>
  );
}
