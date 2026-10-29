import { FormEvent, useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Power } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { date, int, money, num } from '@/lib/format';
import { CURRENCY } from '@/lib/config';
import type { Coupon, CouponType, Paginated } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

const LIMIT = 20;

function couponState(c: Coupon): { label: string; tone: 'green' | 'gray' | 'amber' | 'red' } {
  const now = Date.now();
  if (!c.isActive) return { label: 'Désactivé', tone: 'gray' };
  if (new Date(c.validTo).getTime() < now) return { label: 'Expiré', tone: 'red' };
  if (new Date(c.validFrom).getTime() > now) return { label: 'Programmé', tone: 'amber' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: 'Épuisé', tone: 'red' };
  return { label: 'Actif', tone: 'green' };
}

const toDateInput = (iso: string) => iso.slice(0, 10);

function CouponDialog({ coupon, open, onClose }: { coupon: Coupon | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const empty = { code: '', type: 'PERCENT' as CouponType, value: '', maxDiscount: '', minRideAmount: '', usageLimit: '', usageLimitPerUser: '1', validFrom: today, validTo: in30 };
  const [f, setF] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(coupon ? {
      code: coupon.code, type: coupon.type, value: String(num(coupon.value)),
      maxDiscount: coupon.maxDiscount !== null ? String(num(coupon.maxDiscount)) : '',
      minRideAmount: coupon.minRideAmount !== null ? String(num(coupon.minRideAmount)) : '',
      usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : '',
      usageLimitPerUser: coupon.usageLimitPerUser !== null ? String(coupon.usageLimitPerUser) : '',
      validFrom: toDateInput(coupon.validFrom), validTo: toDateInput(coupon.validTo),
    } : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coupon]);

  const optNum = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        code: f.code.trim().toUpperCase(),
        type: f.type,
        value: Number(f.value.replace(',', '.')),
        maxDiscount: f.type === 'PERCENT' ? optNum(f.maxDiscount) : undefined,
        minRideAmount: optNum(f.minRideAmount),
        usageLimit: optNum(f.usageLimit),
        usageLimitPerUser: optNum(f.usageLimitPerUser),
        validFrom: new Date(`${f.validFrom}T00:00:00`).toISOString(),
        validTo: new Date(`${f.validTo}T23:59:59`).toISOString(),
      };
      return coupon ? api.patch(`/admin/coupons/${coupon.id}`, body) : api.post('/admin/coupons', body);
    },
    onSuccess: () => {
      toast.success(coupon ? 'Coupon mis à jour' : 'Coupon créé');
      qc.invalidateQueries({ queryKey: ['coupons'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = Number(f.value.replace(',', '.'));
    if (!f.code.trim()) return setError('Le code est obligatoire');
    if (!Number.isFinite(value) || value <= 0) return setError('La valeur doit être positive');
    if (f.type === 'PERCENT' && value > 100) return setError('Un pourcentage ne peut pas dépasser 100');
    if (f.validTo < f.validFrom) return setError('La date de fin doit suivre la date de début');
    mutation.mutate();
  };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={coupon ? `Modifier ${coupon.code}` : 'Nouveau coupon'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" form="coupon-form" loading={mutation.isPending}>{coupon ? 'Enregistrer' : 'Créer'}</Button></>}>
      <form id="coupon-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" hint="Saisi tel quel par le client dans l'application.">
          <Input value={f.code} onChange={set('code')} className="font-mono uppercase" placeholder="BIENVENUE" autoFocus />
        </Field>
        <Field label="Type de remise">
          <Select value={f.type} onChange={set('type')}>
            <option value="PERCENT">Pourcentage</option>
            <option value="FIXED">Montant fixe</option>
          </Select>
        </Field>
        <Field label={f.type === 'PERCENT' ? 'Pourcentage (%)' : `Montant (${CURRENCY})`}>
          <Input inputMode="decimal" value={f.value} onChange={set('value')} placeholder={f.type === 'PERCENT' ? '10' : '100'} />
        </Field>
        {f.type === 'PERCENT' ? (
          <Field label={`Remise maximale (${CURRENCY})`} hint="Facultatif — plafonne la remise.">
            <Input inputMode="decimal" value={f.maxDiscount} onChange={set('maxDiscount')} placeholder="Illimitée" />
          </Field>
        ) : <div className="hidden sm:block" />}
        <Field label={`Course minimale (${CURRENCY})`}><Input inputMode="decimal" value={f.minRideAmount} onChange={set('minRideAmount')} placeholder="Aucune" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Utilisations max"><Input inputMode="numeric" value={f.usageLimit} onChange={set('usageLimit')} placeholder="∞" /></Field>
          <Field label="Par client"><Input inputMode="numeric" value={f.usageLimitPerUser} onChange={set('usageLimitPerUser')} placeholder="∞" /></Field>
        </div>
        <Field label="Valable du"><Input type="date" value={f.validFrom} onChange={set('validFrom')} /></Field>
        <Field label="Au"><Input type="date" value={f.validTo} min={f.validFrom} onChange={set('validTo')} /></Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2 dark:bg-red-500/10">{error}</p>}
      </form>
    </Modal>
  );
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const { values, page, set } = useUrlFilters({ isActive: '' });
  const [editing, setEditing] = useState<Coupon | null | 'new'>(null);

  const query = useQuery({
    queryKey: ['coupons', values, page],
    queryFn: async () => (await api.get<Paginated<Coupon>>('/admin/coupons', {
      params: { page, limit: LIMIT, isActive: values.isActive || undefined },
    })).data,
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (c: Coupon) => c.isActive ? api.delete(`/admin/coupons/${c.id}`) : api.patch(`/admin/coupons/${c.id}`, { isActive: true }),
    onSuccess: (_, c) => { toast.success(c.isActive ? 'Coupon désactivé' : 'Coupon réactivé'); qc.invalidateQueries({ queryKey: ['coupons'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Code', cell: (c) => <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold dark:bg-white/[0.06]">{c.code}</span> },
    {
      key: 'value', header: 'Remise', cell: (c) => (
        <div>
          <p className="font-medium">{c.type === 'PERCENT' ? `${num(c.value)} %` : money(c.value)}</p>
          {c.type === 'PERCENT' && c.maxDiscount !== null && <p className="text-xs text-slate-500">max {money(c.maxDiscount)}</p>}
        </div>
      ),
    },
    { key: 'min', header: 'Course min.', hideOnMobile: true, cell: (c) => c.minRideAmount !== null ? money(c.minRideAmount) : '—' },
    {
      key: 'usage', header: 'Utilisations', cell: (c) => (
        <div className="w-28">
          <p className="text-sm">{int(c.usedCount)} / {c.usageLimit ?? '∞'}</p>
          {c.usageLimit !== null && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, (c.usedCount / Math.max(1, c.usageLimit)) * 100)}%` }} />
            </div>
          )}
        </div>
      ),
    },
    { key: 'validity', header: 'Validité', hideOnMobile: true, cell: (c) => <span className="whitespace-nowrap text-slate-500">{date(c.validFrom)} → {date(c.validTo)}</span> },
    { key: 'state', header: 'État', cell: (c) => { const s = couponState(c); return <Badge tone={s.tone} dot>{s.label}</Badge>; } },
    {
      key: 'actions', header: '', className: 'text-right', cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Modifier"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => toggle.mutate(c)} aria-label={c.isActive ? 'Désactiver' : 'Réactiver'}
            className={c.isActive ? '!text-danger' : '!text-emerald-600'}><Power className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Coupons" description="Codes promotionnels utilisables par les clients"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Nouveau coupon</Button>} />
      <Toolbar>
        <Select className="sm:w-44" value={values.isActive} onChange={(e) => set({ isActive: e.target.value })}>
          <option value="">Tous</option>
          <option value="true">Activés</option>
          <option value="false">Désactivés</option>
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        empty={<EmptyState title="Aucun coupon" action={<Button size="sm" onClick={() => setEditing('new')}>Créer un coupon</Button>} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <CouponDialog coupon={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  );
}
