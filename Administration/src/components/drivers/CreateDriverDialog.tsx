import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { toDataUrl } from '@/lib/files';
import { toE164 } from '@/lib/format';
import { DEFAULT_COUNTRY_CODE } from '@/lib/config';
import { FUEL_TYPE } from '@/lib/labels';
import type { Driver } from '@/lib/types';
import {
  DOSSIER_PIECES, DossierPiece, MIN_VEHICLE_YEAR, VEHICLE_MAKES, formatPlate, isValidNni, isValidPlate,
} from '@/lib/vehicles';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';

function randomPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (b) => chars[b % chars.length]).join('');
}

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

// Une pièce : aperçu de l'image choisie sur l'ordinateur
function PieceInput({ label, hint, file, onChange }: { label: string; hint: string; file: File | null; onChange: (f: File | null) => void }) {
  // Aperçu en data URL (rien à libérer, robuste au mode strict de React)
  const [preview, setPreview] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    let current = true;
    setUnreadable(false);
    setPreview(null);
    if (file) toDataUrl(file).then((url) => { if (current) setPreview(url); }).catch(() => undefined);
    return () => { current = false; };
  }, [file]);

  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-2.5 hover:border-accent-300 dark:border-white/10">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
        {preview && !unreadable
          ? <img src={preview} alt="" className="h-full w-full object-cover" onError={() => setUnreadable(true)} />
          : <ImagePlus className="h-5 w-5 text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-slate-500">{file ? file.name : hint}</p>
      </div>
      <span className="text-xs font-semibold text-accent-600 dark:text-accent-300">{file ? 'Changer' : 'Choisir'}</span>
      <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

// Nouveau capitaine : mêmes informations et pièces que l'inscription dans l'application Capitaine.
// Le compte est créé en attente ; les pièces sont envoyées ensuite puis le dossier s'approuve depuis sa fiche.
export function CreateDriverDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(randomPassword());
  const [identity, setIdentity] = useState({ firstName: '', lastName: '', nni: '' });
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', fuel: '', plate: '' });
  const [files, setFiles] = useState<Partial<Record<DossierPiece, File>>>({});
  const [insuranceEnd, setInsuranceEnd] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhone(''); setPassword(randomPassword());
    setIdentity({ firstName: '', lastName: '', nni: '' });
    setVehicle({ make: '', model: '', year: '', fuel: '', plate: '' });
    setFiles({}); setInsuranceEnd(''); setProgress(null); setError(null);
  }, [open]);

  const year = Number(vehicle.year);
  const missing = [
    !identity.firstName.trim() && 'prénom',
    !identity.lastName.trim() && 'nom',
    !isValidNni(identity.nni) && 'NNI (10 chiffres)',
    !phone.trim() && 'téléphone',
    password.length < 6 && 'mot de passe (6 caractères minimum)',
    !vehicle.make.trim() && 'marque',
    !vehicle.model.trim() && 'modèle',
    !(vehicle.year.length === 4 && year >= MIN_VEHICLE_YEAR && year <= new Date().getFullYear() + 1) && 'année',
    !vehicle.fuel && 'énergie',
    !isValidPlate(vehicle.plate) && 'immatriculation (1234 AB 12)',
    ...DOSSIER_PIECES.filter((p) => !files[p.key]).map((p) => p.label.toLowerCase()),
    !(insuranceEnd && insuranceEnd >= tomorrow()) && 'date de fin d’assurance',
  ].filter(Boolean) as string[];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (missing.length) return setError(`À compléter : ${missing.join(', ')}`);

    let driver: Driver;
    setProgress('Création du compte…');
    try {
      driver = (await api.post<Driver>('/admin/drivers', {
        phone: toE164(phone, countryCode), password,
        firstName: identity.firstName.trim(), lastName: identity.lastName.trim(), nni: identity.nni,
        vehicleMake: vehicle.make.trim(), vehicleModel: vehicle.model.trim(), vehicleYear: year,
        vehicleFuel: vehicle.fuel, vehiclePlate: vehicle.plate,
      })).data;
    } catch (err) {
      setProgress(null);
      return setError(errorMessage(err));
    }

    // Pièces envoyées une à une : un échec n'annule pas le compte (à renvoyer depuis sa fiche ou l'app)
    const failed: string[] = [];
    for (const [index, piece] of DOSSIER_PIECES.entries()) {
      setProgress(`Envoi des pièces (${index + 1}/${DOSSIER_PIECES.length})…`);
      const form = new FormData();
      form.append('photo', files[piece.key]!);
      if (piece.key !== 'PROFILE_PHOTO') form.append('type', piece.key);
      if (piece.key === 'INSURANCE') form.append('expiresAt', insuranceEnd);
      try {
        await api.post(piece.key === 'PROFILE_PHOTO' ? `/admin/drivers/${driver.id}/photo` : `/admin/vehicles/drivers/${driver.id}/documents`, form);
      } catch {
        failed.push(piece.label);
      }
    }

    setProgress(null);
    toast.success('Capitaine créé — dossier à approuver', { description: `Mot de passe initial : ${password}`, duration: 15_000 });
    if (failed.length) toast.error(`Pièces non envoyées : ${failed.join(', ')}`, { duration: 15_000 });
    qc.invalidateQueries({ queryKey: ['drivers'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
    onClose();
    navigate(`/capitaines/${driver.id}`);
  };

  const setId = (k: keyof typeof identity) => (e: { target: { value: string } }) =>
    setIdentity((i) => ({ ...i, [k]: k === 'nni' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value }));
  const models = VEHICLE_MAKES[vehicle.make.trim()] ?? [];

  return (
    <Modal open={open} onClose={progress ? () => undefined : onClose} size="lg" title="Nouveau capitaine"
      description="Mêmes informations et pièces que l’inscription dans l’application Capitaine. Le compte reste en attente jusqu’à l’approbation de son dossier."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={!!progress}>Annuler</Button>
          <Button type="submit" form="create-driver" loading={!!progress}>{progress ?? 'Créer le capitaine'}</Button>
        </>
      }>
      <form id="create-driver" onSubmit={submit} className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Identité et connexion</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Prénom"><Input value={identity.firstName} onChange={setId('firstName')} maxLength={40} placeholder="Comme sur la carte" autoFocus /></Field>
            <Field label="Nom"><Input value={identity.lastName} onChange={setId('lastName')} maxLength={40} placeholder="Comme sur la carte" /></Field>
            <Field label="NNI"><Input value={identity.nni} onChange={setId('nni')} inputMode="numeric" placeholder="10 chiffres" className="font-mono" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Téléphone" hint="Identifiant de connexion à l’application.">
              <PhoneInput countryCode={countryCode} onCountryCodeChange={setCountryCode} value={phone} onChange={setPhone} />
            </Field>
            <Field label="Mot de passe initial" hint="À transmettre au capitaine.">
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
                <Button variant="outline" size="icon" onClick={() => setPassword(randomPassword())} aria-label="Générer"><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Véhicule</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Marque" hint="Choisissez ou saisissez une autre marque.">
              <Input list="driver-makes" value={vehicle.make} onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))} maxLength={40} placeholder="ex. Toyota" />
              <datalist id="driver-makes">{Object.keys(VEHICLE_MAKES).map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="Modèle">
              <Input list="driver-models" value={vehicle.model} onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))} maxLength={60} placeholder="ex. Corolla" />
              <datalist id="driver-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="Année">
              <Input value={vehicle.year} onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))} inputMode="numeric" placeholder="ex. 2018" />
            </Field>
            <Field label="Énergie">
              <Select value={vehicle.fuel} onChange={(e) => setVehicle((v) => ({ ...v, fuel: e.target.value }))}>
                <option value="">Choisir…</option>
                {Object.entries(FUEL_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Immatriculation" className="sm:col-span-2">
              <Input value={vehicle.plate} onChange={(e) => setVehicle((v) => ({ ...v, plate: formatPlate(e.target.value) }))} placeholder="1234 AB 12" maxLength={10} className="font-mono tracking-wider" />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pièces du dossier</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOSSIER_PIECES.map((p) => (
              <PieceInput key={p.key} label={p.label} hint={p.hint} file={files[p.key] ?? null}
                onChange={(f) => setFiles((current) => ({ ...current, [p.key]: f ?? undefined }))} />
            ))}
          </div>
          <Field label="Fin de validité de l’assurance" hint="Le compte reste actif jusqu’à cette date.">
            <Input type="date" min={tomorrow()} value={insuranceEnd} onChange={(e) => setInsuranceEnd(e.target.value)} className="sm:w-56" />
          </Field>
        </section>

        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-red-500/10">{error}</p>}
      </form>
    </Modal>
  );
}
