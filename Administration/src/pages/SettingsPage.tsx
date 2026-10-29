import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, Save } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { fullDateTime, money, num } from '@/lib/format';
import { CURRENCY } from '@/lib/config';
import type { PlatformSettings } from '@/lib/types';
import { Card, PageHeader, PageLoader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Form = { pricePerKm: string; minimumFare: string; commissionPercent: string; perStopMinuteRate: string };

const FIELDS: { key: keyof Form; label: string; unit: string; hint: string }[] = [
  { key: 'pricePerKm', label: 'Prix par kilomètre', unit: CURRENCY, hint: 'Appliqué à la distance estimée ou parcourue.' },
  { key: 'minimumFare', label: 'Course minimum', unit: CURRENCY, hint: 'Prix plancher, quelle que soit la distance.' },
  { key: 'perStopMinuteRate', label: 'Minute d\'arrêt', unit: CURRENCY, hint: 'Trajets ouverts : facturé par minute à l\'arrêt.' },
  { key: 'commissionPercent', label: 'Commission plateforme', unit: '%', hint: 'Déduite du solde du capitaine à chaque course terminée.' },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [simKm, setSimKm] = useState('8');

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<PlatformSettings>('/admin/settings')).data,
  });

  useEffect(() => {
    if (data) setForm({
      pricePerKm: String(num(data.pricePerKm)), minimumFare: String(num(data.minimumFare)),
      commissionPercent: String(num(data.commissionPercent)), perStopMinuteRate: String(num(data.perStopMinuteRate)),
    });
  }, [data]);

  const parsed = form && Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v.replace(',', '.'))])) as Record<keyof Form, number>;
  const invalid = !parsed || Object.values(parsed).some((v) => !Number.isFinite(v) || v < 0) || (parsed?.commissionPercent ?? 0) > 100;
  const changed = data && parsed ? FIELDS.filter((f) => parsed[f.key] !== num(data[f.key])) : [];

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', Object.fromEntries(changed.map((f) => [f.key, parsed![f.key]]))),
    onSuccess: () => {
      toast.success('Tarifs mis à jour — appliqués aux prochaines courses');
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirming(false); },
  });

  if (isLoading || !form || !data) return <PageLoader />;

  const km = Number(simKm.replace(',', '.')) || 0;
  const simulate = (s: { pricePerKm: number; minimumFare: number; commissionPercent: number }) => {
    const fare = Math.max(s.minimumFare, km * s.pricePerKm);
    return { fare, commission: (fare * s.commissionPercent) / 100 };
  };
  const before = simulate({ pricePerKm: num(data.pricePerKm), minimumFare: num(data.minimumFare), commissionPercent: num(data.commissionPercent) });
  const after = parsed && !invalid ? simulate(parsed) : before;

  const submit = (e: FormEvent) => { e.preventDefault(); if (!invalid && changed.length) setConfirming(true); };

  return (
    <>
      <PageHeader title="Tarifs & commission" description={`Dernière modification : ${fullDateTime(data.updatedAt)}`} />
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Grille tarifaire">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const isChanged = changed.some((c) => c.key === f.key);
                return (
                  <Field key={f.key} label={f.label} hint={isChanged ? `Actuel : ${num(data[f.key])} ${f.unit}` : f.hint}>
                    <div className="relative">
                      <Input inputMode="decimal" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className={`pr-14 ${isChanged ? '!border-accent-400' : ''}`} />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{f.unit}</span>
                    </div>
                  </Field>
                );
              })}
            </div>
            {invalid && <p className="text-sm text-danger">Valeurs invalides : nombres positifs uniquement, commission ≤ 100 %.</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              {changed.length > 0 && <Button variant="ghost" onClick={() => setForm({
                pricePerKm: String(num(data.pricePerKm)), minimumFare: String(num(data.minimumFare)),
                commissionPercent: String(num(data.commissionPercent)), perStopMinuteRate: String(num(data.perStopMinuteRate)),
              })}>Annuler les modifications</Button>}
              <Button type="submit" icon={<Save className="h-4 w-4" />} disabled={invalid || changed.length === 0}>Enregistrer</Button>
            </div>
          </form>
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4" /> Simulateur</span>}>
          <Field label="Distance de la course (km)">
            <Input inputMode="decimal" value={simKm} onChange={(e) => setSimKm(e.target.value)} />
          </Field>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
              <p className="text-xs text-slate-500">Actuellement</p>
              <p className="mt-1 text-lg font-semibold">{money(before.fare)}</p>
              <p className="text-xs text-slate-500">commission {money(before.commission)}</p>
            </div>
            <div className="rounded-xl bg-accent-50 p-3 dark:bg-accent-500/10">
              <p className="text-xs text-accent-700 dark:text-accent-300">Avec les nouveaux tarifs</p>
              <p className="mt-1 text-lg font-semibold">{money(after.fare)}</p>
              <p className="text-xs text-slate-500">commission {money(after.commission)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Estimation hors remises et hors minutes d'arrêt. Les courses déjà créées gardent leur tarif estimé.</p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => save.mutate()}
        loading={save.isPending}
        tone="primary"
        title="Appliquer les nouveaux tarifs ?"
        description="Les changements s'appliquent immédiatement à toutes les nouvelles courses."
        confirmLabel="Appliquer"
      >
        <ul className="space-y-1.5 text-sm">
          {changed.map((f) => (
            <li key={f.key} className="flex justify-between gap-3">
              <span className="text-slate-500">{f.label}</span>
              <span><s className="text-slate-400">{num(data[f.key])}</s> → <b>{parsed?.[f.key]}</b> {f.unit}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </>
  );
}
