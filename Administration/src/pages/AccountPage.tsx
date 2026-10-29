import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date } from '@/lib/format';
import { Card, DefinitionList, PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';

export default function AccountPage() {
  const { me, refreshMe } = useAuth();
  const [name, setName] = useState(me?.name ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState<string | null>(null);

  const profile = useMutation({
    mutationFn: () => api.patch('/users/me', { name: name.trim() || undefined, email: email.trim() || undefined }),
    onSuccess: async () => { await refreshMe(); toast.success('Profil mis à jour'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const password = useMutation({
    mutationFn: () => api.patch('/admin/users/me/password', { currentPassword: pwd.current, newPassword: pwd.next }),
    onSuccess: () => { toast.success('Mot de passe modifié'); setPwd({ current: '', next: '', confirm: '' }); },
    onError: (e) => setPwdError(errorMessage(e)),
  });

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwd.next.length < 6) return setPwdError('Le nouveau mot de passe doit contenir au moins 6 caractères');
    if (pwd.next !== pwd.confirm) return setPwdError('Les deux mots de passe ne correspondent pas');
    if (pwd.next === pwd.current) return setPwdError('Le nouveau mot de passe doit être différent de l\'actuel');
    password.mutate();
  };

  if (!me) return null;

  return (
    <>
      <PageHeader title="Mon compte" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profil">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={me.name} photoUrl={me.photoUrl} seed={me.id} size={56} />
            <div>
              <p className="font-semibold">{me.name || 'Administrateur'}</p>
              <p className="text-sm text-slate-500">{me.phone}</p>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); profile.mutate(); }} className="space-y-4">
            <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <div className="flex justify-end"><Button type="submit" loading={profile.isPending}>Enregistrer</Button></div>
          </form>
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
            <DefinitionList items={[{ label: 'Administrateur depuis', value: date(me.createdAt) }]} />
          </div>
        </Card>

        <Card title="Changer de mot de passe">
          <form onSubmit={submitPassword} className="space-y-4">
            <Field label="Mot de passe actuel"><Input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></Field>
            <Field label="Nouveau mot de passe" hint="6 caractères minimum"><Input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
            <Field label="Confirmation"><Input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
            {pwdError && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-red-500/10">{pwdError}</p>}
            <div className="flex justify-end"><Button type="submit" loading={password.isPending} disabled={!pwd.current || !pwd.next}>Modifier</Button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
