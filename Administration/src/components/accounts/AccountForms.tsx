import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { toE164 } from '@/lib/format';
import { DEFAULT_COUNTRY_CODE } from '@/lib/config';
import { VEHICLE_TYPE } from '@/lib/labels';
import type { Driver, User, VehicleType } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';

type CreateKind = 'user' | 'driver' | 'admin';

const CREATE_COPY: Record<CreateKind, { title: string; description: string; endpoint: string; done: string }> = {
  user: {
    title: 'Nouveau client',
    description: 'Le client pourra se connecter immédiatement avec ce numéro et ce mot de passe.',
    endpoint: '/admin/users',
    done: 'Client créé',
  },
  driver: {
    title: 'Nouveau capitaine',
    description: 'Le capitaine pourra se connecter à l\'application Capitaine dès maintenant.',
    endpoint: '/admin/drivers',
    done: 'Capitaine créé',
  },
  admin: {
    title: 'Nouvel administrateur',
    description: 'Accès complet au back-office. Ne créez des comptes admin que pour des personnes de confiance.',
    endpoint: '/admin/users/admins',
    done: 'Administrateur créé',
  },
};

function randomPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (b) => chars[b % chars.length]).join('');
}

export function CreateAccountDialog({ kind, open, onClose }: { kind: CreateKind; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const copy = CREATE_COPY[kind];

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhone(''); setName(''); setEmail(''); setPassword(randomPassword());
    setVehicleType('sedan'); setVehicleModel(''); setVehiclePlate(''); setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { phone: toE164(phone, countryCode), name: name.trim(), password };
      if (kind === 'user' && email.trim()) body.email = email.trim();
      if (kind === 'driver') {
        body.vehicleType = vehicleType;
        if (vehicleModel.trim()) body.vehicleModel = vehicleModel.trim();
        if (vehiclePlate.trim()) body.vehiclePlate = vehiclePlate.trim().toUpperCase();
      }
      const { data } = await api.post<User | Driver>(copy.endpoint, body);
      return data;
    },
    onSuccess: (created) => {
      toast.success(copy.done, { description: `Mot de passe initial : ${password}`, duration: 15_000 });
      qc.invalidateQueries({ queryKey: [kind === 'driver' ? 'drivers' : kind === 'admin' ? 'admins' : 'users'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      onClose();
      if (kind !== 'admin') navigate(kind === 'driver' ? `/capitaines/${created.id}` : `/clients/${created.id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !name.trim()) return setError('Nom et téléphone sont obligatoires');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères');
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={copy.title} description={copy.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="create-account" loading={mutation.isPending}>Créer</Button>
        </>
      }>
      <form id="create-account" onSubmit={submit} className="space-y-4">
        <Field label="Nom complet">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex. Mohamed Lemine" maxLength={80} />
        </Field>
        <Field label="Téléphone" hint="Le numéro sert d'identifiant de connexion.">
          <PhoneInput countryCode={countryCode} onCountryCodeChange={setCountryCode} value={phone} onChange={setPhone} />
        </Field>
        {kind === 'user' && (
          <Field label="Email (facultatif)">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@exemple.com" />
          </Field>
        )}
        {kind === 'driver' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type de véhicule">
              <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
                {Object.entries(VEHICLE_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Modèle">
              <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Toyota Corolla" maxLength={60} />
            </Field>
            <Field label="Plaque">
              <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="1234 AB 00" maxLength={20} />
            </Field>
          </div>
        )}
        <Field label="Mot de passe initial" hint="À transmettre à la personne. Elle pourra le changer via « mot de passe oublié ».">
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
            <Button variant="outline" size="icon" onClick={() => setPassword(randomPassword())} aria-label="Générer"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-red-500/10">{error}</p>}
      </form>
    </Modal>
  );
}

export function EditUserDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => { if (open) { setName(user.name ?? ''); setEmail(user.email ?? ''); } }, [open, user]);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/admin/users/${user.id}`, {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Profil mis à jour');
      qc.invalidateQueries({ queryKey: ['user', user.id] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Modifier le profil" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <p className="text-xs text-slate-500">Le numéro de téléphone sert d'identifiant et ne peut pas être modifié.</p>
      </div>
    </Modal>
  );
}

export function EditDriverDialog({ driver, open, onClose }: { driver: Driver; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', vehicleType: 'sedan' as VehicleType, vehicleModel: '', vehiclePlate: '' });
  useEffect(() => {
    if (open) setForm({
      name: driver.name ?? '',
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel ?? '',
      vehiclePlate: driver.vehiclePlate ?? '',
    });
  }, [open, driver]);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/admin/drivers/${driver.id}`, {
      name: form.name.trim() || undefined,
      vehicleType: form.vehicleType,
      vehicleModel: form.vehicleModel.trim() || undefined,
      vehiclePlate: form.vehiclePlate.trim().toUpperCase() || undefined,
    }),
    onSuccess: () => {
      toast.success('Capitaine mis à jour');
      qc.invalidateQueries({ queryKey: ['driver', driver.id] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Modifier le capitaine"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom"><Input value={form.name} onChange={set('name')} maxLength={80} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            <Select value={form.vehicleType} onChange={set('vehicleType')}>
              {Object.entries(VEHICLE_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Modèle"><Input value={form.vehicleModel} onChange={set('vehicleModel')} maxLength={60} /></Field>
          <Field label="Plaque"><Input value={form.vehiclePlate} onChange={set('vehiclePlate')} maxLength={20} /></Field>
        </div>
      </div>
    </Modal>
  );
}
