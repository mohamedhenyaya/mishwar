import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth, NotAdminError } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { toE164 } from '@/lib/format';
import { DEFAULT_COUNTRY_CODE } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password) return setError('Saisissez votre numéro et votre mot de passe');
    setLoading(true);
    try {
      await login(toE164(phone, countryCode), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof NotAdminError ? err.message : errorMessage(err, 'Connexion impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent-500/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600">
              <svg viewBox="0 0 64 64" className="h-5 w-5"><path d="M14 46V18l18 16 18-16v28" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="text-lg font-semibold">Mishwar</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">Pilotez toute la plateforme depuis un seul endroit.</h1>
            <p className="mt-4 text-white/60">Clients, capitaines, courses en direct, portefeuilles, support et tarification — avec un journal de chaque action.</p>
          </div>
          <p className="flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="h-4 w-4" /> Accès réservé aux administrateurs</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Identifiez-vous avec votre compte administrateur.</p>

          <div className="mt-8 space-y-4">
            <Field label="Téléphone">
              <PhoneInput countryCode={countryCode} onCountryCodeChange={setCountryCode} value={phone} onChange={setPhone} autoFocus />
            </Field>
            <Field label="Mot de passe">
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" leading={<Lock className="h-4 w-4" />} className="pr-10" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600" aria-label="Afficher le mot de passe">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger dark:bg-red-500/10">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>Se connecter</Button>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Premier démarrage ? Le tout premier administrateur se crée une seule fois via <code className="rounded bg-slate-100 px-1 dark:bg-white/10">POST /auth/admin/bootstrap</code> avec <code className="rounded bg-slate-100 px-1 dark:bg-white/10">ADMIN_BOOTSTRAP_SECRET</code>. Mot de passe oublié : demandez à un autre administrateur de le réinitialiser.
          </p>
        </form>
      </div>
    </div>
  );
}
