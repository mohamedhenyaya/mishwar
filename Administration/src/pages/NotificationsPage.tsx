import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Megaphone, Search, Send, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { fullDateTime, int } from '@/lib/format';
import type { Driver, NotificationRecord, Paginated, User } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Target = 'all' | 'all_users' | 'all_drivers' | 'specific_users' | 'specific_drivers';

const TARGETS: { value: Target; label: string; hint: string }[] = [
  { value: 'all', label: 'Tout le monde', hint: 'Clients et capitaines' },
  { value: 'all_users', label: 'Tous les clients', hint: 'Diffusion' },
  { value: 'all_drivers', label: 'Tous les capitaines', hint: 'Diffusion' },
  { value: 'specific_users', label: 'Clients choisis', hint: 'Sélection' },
  { value: 'specific_drivers', label: 'Capitaines choisis', hint: 'Sélection' },
];

interface Picked { id: string; name: string | null; phone: string }

function RecipientPicker({ kind, picked, onChange }: { kind: 'user' | 'driver'; picked: Picked[]; onChange: (p: Picked[]) => void }) {
  const [input, setInput] = useState('');
  const search = useDebounced(input.trim(), 250);
  const results = useQuery({
    queryKey: ['notif-picker', kind, search],
    queryFn: async () => (await api.get<Paginated<User | Driver>>(kind === 'driver' ? '/admin/drivers' : '/admin/users', {
      params: { search, limit: 6, ...(kind === 'user' ? { role: 'user' } : {}) },
    })).data,
    enabled: search.length >= 2,
  });

  return (
    <div className="space-y-2">
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {picked.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-accent-50 py-1 pl-2.5 pr-1 text-xs text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
              {p.name || p.phone}
              <button type="button" onClick={() => onChange(picked.filter((x) => x.id !== p.id))} className="rounded-full p-0.5 hover:bg-accent-100 dark:hover:bg-accent-500/20"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <Input leading={<Search className="h-4 w-4" />} placeholder="Rechercher par nom ou téléphone" value={input} onChange={(e) => setInput(e.target.value)} />
      {search.length >= 2 && (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 dark:divide-white/[0.05] dark:border-white/[0.06]">
          {results.data?.data.length === 0 && <li className="p-3 text-center text-xs text-slate-500">Aucun résultat</li>}
          {results.data?.data.map((a) => {
            const selected = picked.some((p) => p.id === a.id);
            return (
              <li key={a.id}>
                <button type="button" disabled={selected} onClick={() => { onChange([...picked, { id: a.id, name: a.name, phone: a.phone }]); setInput(''); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-white/[0.03]">
                  <Avatar name={a.name} photoUrl={a.photoUrl} seed={a.id} size={26} />
                  <span className="flex-1 truncate">{a.name || 'Sans nom'}</span>
                  <span className="text-xs text-slate-500">{a.phone}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Une diffusion crée une ligne par destinataire : on regroupe les envois identiques
function groupSent(rows: NotificationRecord[]) {
  const groups = new Map<string, { first: NotificationRecord; users: number; drivers: number }>();
  for (const r of rows) {
    const key = `${r.title}|${r.body}|${r.createdAt.slice(0, 16)}`;
    const g = groups.get(key) ?? { first: r, users: 0, drivers: 0 };
    if (r.recipientType === 'driver') g.drivers++; else g.users++;
    groups.set(key, g);
  }
  return [...groups.values()];
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Target>('all_users');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [page, setPage] = useState(1);

  const history = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => (await api.get<Paginated<NotificationRecord>>('/admin/notifications', { params: { page, limit: 100 } })).data,
    placeholderData: keepPreviousData,
  });
  const grouped = useMemo(() => groupSent(history.data?.data ?? []), [history.data]);

  const specific = target === 'specific_users' || target === 'specific_drivers';
  const canSend = title.trim() && body.trim() && (!specific || picked.length > 0);

  const send = useMutation({
    mutationFn: async () => (await api.post<{ sent: number }>('/admin/notifications', {
      targetType: target,
      targetIds: specific ? picked.map((p) => p.id) : undefined,
      title: title.trim(),
      body: body.trim(),
    })).data,
    onSuccess: ({ sent }) => {
      toast.success(sent ? `Notification envoyée à ${int(sent)} destinataire${sent > 1 ? 's' : ''}` : 'Aucun destinataire actif');
      setTitle(''); setBody(''); setPicked([]); setConfirming(false);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirming(false); },
  });

  const targetLabel = TARGETS.find((t) => t.value === target)!.label;

  return (
    <>
      <PageHeader title="Notifications" description="Envoyez un message dans l'application aux clients et capitaines" />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card title="Nouveau message">
          <div className="space-y-4">
            <div>
              <label className="label">Destinataires</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TARGETS.map((t) => (
                  <button key={t.value} type="button" onClick={() => { setTarget(t.value); setPicked([]); }}
                    className={clsx('rounded-xl border px-3 py-2 text-left transition',
                      target === t.value ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5')}>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-[11px] text-slate-500">{t.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            {specific && <RecipientPicker kind={target === 'specific_drivers' ? 'driver' : 'user'} picked={picked} onChange={setPicked} />}
            <Field label="Titre"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. Maintenance prévue ce soir" /></Field>
            <Field label="Message" hint={`${body.length} caractères`}>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Le service sera interrompu de 23h à minuit…" />
            </Field>

            {(title || body) && (
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/[0.04]">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Aperçu</p>
                <div className="flex gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-[#1B1B2B]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white"><Megaphone className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{title || 'Titre'}</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{body || 'Message'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button icon={<Send className="h-4 w-4" />} disabled={!canSend} onClick={() => setConfirming(true)}>Envoyer</Button>
            </div>
          </div>
        </Card>

        <Card title="Historique des envois" bodyClassName="p-0">
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {history.isLoading && <li className="p-6 text-center text-sm text-slate-500">Chargement…</li>}
            {!history.isLoading && grouped.length === 0 && <li className="p-10 text-center text-sm text-slate-500">Aucune notification envoyée</li>}
            {grouped.map(({ first, users, drivers }) => (
              <li key={first.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{first.title}</p>
                  <span className="shrink-0 text-xs text-slate-400">{fullDateTime(first.createdAt)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{first.body}</p>
                <div className="mt-2 flex gap-1.5">
                  {users > 0 && <Badge>{int(users)} client{users > 1 ? 's' : ''}</Badge>}
                  {drivers > 0 && <Badge tone="blue">{int(drivers)} capitaine{drivers > 1 ? 's' : ''}</Badge>}
                </div>
              </li>
            ))}
          </ul>
          {history.data && history.data.total > 100 && (
            <Pagination page={page} limit={100} total={history.data.total} fetching={history.isFetching} onChange={setPage} />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => send.mutate()}
        loading={send.isPending}
        tone="primary"
        title="Envoyer cette notification ?"
        description={specific ? `${picked.length} destinataire(s) sélectionné(s).` : `Destinataires : ${targetLabel}. Un envoi ne peut pas être annulé.`}
        confirmLabel="Envoyer"
      />
    </>
  );
}
