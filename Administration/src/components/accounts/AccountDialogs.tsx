import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, KeyRound, Minus, Plus, RefreshCw, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { api, errorMessage } from '@/lib/api';
import { fullDateTime, money, num } from '@/lib/format';
import { CURRENCY } from '@/lib/config';
import type { Decimal } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export type AccountKind = 'user' | 'driver';

export interface AccountRef {
  id: string;
  name: string | null;
  phone: string;
  balance: Decimal;
  isActive: boolean;
}

const basePath = (kind: AccountKind) => (kind === 'driver' ? '/admin/drivers' : '/admin/users');

// Après toute action sur un compte : listes, fiche, mouvements et indicateurs à jour
export function useInvalidateAccount() {
  const qc = useQueryClient();
  return (kind: AccountKind, id: string) => {
    const k = kind === 'driver' ? 'driver' : 'user';
    qc.invalidateQueries({ queryKey: [`${k}s`] });
    qc.invalidateQueries({ queryKey: [k, id] });
    qc.invalidateQueries({ queryKey: ['admins'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };
}

const BLOCK_SUGGESTIONS: Record<AccountKind, string[]> = {
  user: ['Comportement abusif envers un capitaine', 'Fraude au paiement', 'Annulations répétées', 'Demande du client'],
  driver: ['Signalements répétés de clients', 'Documents expirés', 'Conduite dangereuse', 'Solde négatif non régularisé'],
};

// Durées proposées (minutes) ; null = définitif, 'custom' = saisie libre
const BLOCK_DURATIONS: { value: string; label: string; minutes: number | null }[] = [
  { value: '15', label: '15 minutes', minutes: 15 },
  { value: '30', label: '30 minutes', minutes: 30 },
  { value: '60', label: '1 heure', minutes: 60 },
  { value: '120', label: '2 heures', minutes: 120 },
  { value: '1440', label: '24 heures', minutes: 1440 },
  { value: '2880', label: '48 heures', minutes: 2880 },
  { value: '4320', label: '72 heures', minutes: 4320 },
  { value: '10080', label: '1 semaine', minutes: 10080 },
  { value: '43200', label: '1 mois (30 jours)', minutes: 43200 },
  { value: 'permanent', label: 'Définitivement', minutes: null },
  { value: 'custom', label: 'Autre durée…', minutes: null },
];
const CUSTOM_UNITS = { minutes: 1, heures: 60, jours: 1440 } as const;

export function BlockDialog({ kind, account, open, onClose }: {
  kind: AccountKind; account: AccountRef; open: boolean; onClose: () => void;
}) {
  const invalidate = useInvalidateAccount();
  const blocking = account.isActive;
  const [duration, setDuration] = useState('1440');
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<keyof typeof CUSTOM_UNITS>('heures');
  useEffect(() => { if (open) { setDuration('1440'); setCustomValue(''); setCustomUnit('heures'); } }, [open]);

  const preset = BLOCK_DURATIONS.find((d) => d.value === duration);
  const durationMinutes = duration === 'custom'
    ? Math.round(Number(customValue) * CUSTOM_UNITS[customUnit])
    : preset?.minutes ?? null;
  const customInvalid = duration === 'custom' && !(durationMinutes && durationMinutes > 0);
  const until = durationMinutes && !customInvalid ? new Date(Date.now() + durationMinutes * 60_000) : null;

  const mutation = useMutation({
    mutationFn: (reason: string) => api.patch(
      `${basePath(kind)}/${account.id}/${blocking ? 'block' : 'unblock'}`,
      blocking ? { reason: reason || undefined, durationMinutes: durationMinutes ?? undefined } : {},
    ),
    onSuccess: () => {
      toast.success(blocking
        ? `Compte bloqué ${until ? `jusqu’au ${fullDateTime(until.toISOString())}` : 'définitivement'} — ses sessions ont été fermées`
        : 'Compte débloqué');
      invalidate(kind, account.id);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={(reason) => mutation.mutate(reason)}
      loading={mutation.isPending}
      confirmDisabled={blocking && customInvalid}
      tone={blocking ? 'danger' : 'success'}
      title={blocking ? `Bloquer ${account.name || 'ce compte'} ?` : `Débloquer ${account.name || 'ce compte'} ?`}
      description={blocking
        ? 'La personne sera déconnectée et ne pourra plus se connecter. Le motif et la durée lui sont affichés à la connexion.'
        : 'La personne pourra de nouveau se connecter et utiliser l\'application.'}
      confirmLabel={blocking ? 'Bloquer' : 'Débloquer'}
      reason={blocking ? { label: 'Motif', placeholder: 'Ex. signalements répétés', suggestions: BLOCK_SUGGESTIONS[kind] } : undefined}
    >
      {blocking && (
        <Field label="Durée du blocage" hint={until ? `Déblocage automatique le ${fullDateTime(until.toISOString())}` : duration === 'permanent' ? 'Jusqu’à un déblocage manuel' : undefined}>
          <div className="space-y-2">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {BLOCK_DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            {duration === 'custom' && (
              <div className="flex gap-2">
                <Input type="number" min={1} value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Durée" autoFocus />
                <Select className="w-32" value={customUnit} onChange={(e) => setCustomUnit(e.target.value as keyof typeof CUSTOM_UNITS)}>
                  {Object.keys(CUSTOM_UNITS).map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </div>
            )}
          </div>
        </Field>
      )}
    </ConfirmDialog>
  );
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function ResetPasswordDialog({ kind, account, open, onClose }: {
  kind: AccountKind; account: AccountRef; open: boolean; onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { if (open) { setPassword(generatePassword()); setDone(false); } }, [open]);

  const mutation = useMutation({
    mutationFn: () => api.patch(`${basePath(kind)}/${account.id}/password`, { newPassword: password }),
    onSuccess: () => { setDone(true); toast.success('Mot de passe réinitialisé'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Copié dans le presse-papiers');
    } catch {
      toast.error('Copie impossible — sélectionnez le texte manuellement');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Nouveau mot de passe"
      description={done
        ? 'Communiquez ce mot de passe à la personne par un canal sûr. Il ne sera plus affiché.'
        : `Toutes les sessions de ${account.name || account.phone} seront fermées.`}
      icon={<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15"><KeyRound className="h-4 w-4" /></div>}
      footer={done ? <Button onClick={onClose}>Terminé</Button> : (
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button loading={mutation.isPending} disabled={password.length < 6} onClick={() => mutation.mutate()}>Réinitialiser</Button>
        </>
      )}
    >
      <Field label="Mot de passe" hint={!done && '6 caractères minimum. Un mot de passe aléatoire est proposé.'}>
        <div className="flex gap-2">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} readOnly={done} className="font-mono" />
          {done ? (
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copier"><Copy className="h-4 w-4" /></Button>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setPassword(generatePassword())} aria-label="Générer"><RefreshCw className="h-4 w-4" /></Button>
          )}
        </div>
      </Field>
    </Modal>
  );
}

export function AdjustBalanceDialog({ kind, account, open, onClose }: {
  kind: AccountKind; account: AccountRef; open: boolean; onClose: () => void;
}) {
  const invalidate = useInvalidateAccount();
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setDirection('credit'); setAmount(''); setNote(''); } }, [open]);

  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0;
  const signed = direction === 'credit' ? value : -value;
  const current = num(account.balance);
  const after = Math.round((current + (valid ? signed : 0)) * 100) / 100;

  const mutation = useMutation({
    mutationFn: () => api.post('/admin/wallet/adjust', { ownerType: kind, ownerId: account.id, amount: signed, note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success(direction === 'credit' ? `${money(value)} crédités` : `${money(value)} débités`);
      invalidate(kind, account.id);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const quick = kind === 'driver' ? [500, 1000, 2000, 5000] : [100, 200, 500, 1000];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajuster le solde"
      description={`${account.name || account.phone} · solde actuel ${money(current)}`}
      icon={<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Wallet className="h-4 w-4" /></div>}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={direction === 'credit' ? 'success' : 'danger'} loading={mutation.isPending} disabled={!valid || !note.trim()} onClick={() => mutation.mutate()}>
            {direction === 'credit' ? 'Créditer' : 'Débiter'} {valid ? money(value) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['credit', 'debit'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDirection(d)}
              className={clsx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                direction === d
                  ? d === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5')}>
              {d === 'credit' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {d === 'credit' ? 'Créditer (recharge)' : 'Débiter (correction)'}
            </button>
          ))}
        </div>

        <Field label={`Montant (${CURRENCY})`}>
          <Input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className="text-lg font-semibold" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => setAmount(String(q))}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent-400 hover:text-accent-600 dark:border-white/10 dark:text-slate-300">
                {money(q)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Motif" hint="Obligatoire — visible dans l'historique des transactions et le journal d'audit.">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={direction === 'credit' ? 'Ex. recharge espèces agence Tevragh Zeina, reçu n°…' : 'Ex. correction d\'une recharge en double'} />
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/[0.03]">
          <span className="text-slate-500">Solde après opération</span>
          <span className={clsx('font-semibold', after < 0 && 'text-danger')}>{money(after)}</span>
        </div>
        {after < 0 && (
          <p className="text-xs text-danger">
            Le solde deviendra négatif.{kind === 'driver' && ' Un capitaine à solde négatif est mis hors ligne et ne reçoit plus de courses jusqu’à sa recharge.'}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function DeleteAccountDialog({ kind, account, open, onClose, onDeleted }: {
  kind: AccountKind; account: AccountRef; open: boolean; onClose: () => void; onDeleted?: () => void;
}) {
  const invalidate = useInvalidateAccount();
  const [confirm, setConfirm] = useState('');
  useEffect(() => { if (open) setConfirm(''); }, [open]);

  const mutation = useMutation({
    mutationFn: () => api.delete(`${basePath(kind)}/${account.id}`),
    onSuccess: () => {
      toast.success('Compte supprimé');
      invalidate(kind, account.id);
      onClose();
      onDeleted?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const balance = num(account.balance);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title="Supprimer définitivement ce compte ?"
      description="Nom, téléphone, email et photo sont effacés et la personne est déconnectée. L'historique des courses et des transactions est conservé de façon anonyme. Cette action est irréversible."
      confirmLabel="Supprimer le compte"
      confirmDisabled={confirm.trim().toUpperCase() !== 'SUPPRIMER'}
    >
      {balance !== 0 && (
        <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Ce compte a encore un solde de <b>{money(balance)}</b>. Pensez à le rembourser ou le régulariser avant suppression.
        </div>
      )}
      <Field label={`Tapez « SUPPRIMER » pour confirmer`}>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SUPPRIMER" />
      </Field>
    </ConfirmDialog>
  );
}
