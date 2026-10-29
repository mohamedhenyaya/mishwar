import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import type { Party } from '@/lib/types';

export function partyLink(type: 'user' | 'driver', id: string) {
  return type === 'driver' ? `/capitaines/${id}` : `/clients/${id}`;
}

// Personne référencée (client, capitaine, admin) : avatar + nom + téléphone, cliquable
export function PartyCell({ party, fallbackId, type, compact }: {
  party?: Party | null; fallbackId?: string | null; type?: 'user' | 'driver'; compact?: boolean;
}) {
  if (!party) {
    return fallbackId
      ? <span className="font-mono text-xs text-slate-400">{fallbackId.slice(0, 8)} · introuvable</span>
      : <span className="text-slate-400">—</span>;
  }
  const deleted = party.phone.startsWith('deleted:');
  return (
    <Link to={partyLink(type ?? party.type, party.id)} className="group inline-flex min-w-0 items-center gap-2.5">
      <Avatar name={party.name} photoUrl={party.photoUrl} seed={party.id} size={compact ? 26 : 32} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium group-hover:text-accent-600 dark:group-hover:text-accent-300">
          {party.name || 'Sans nom'}
        </span>
        {!compact && (
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{deleted ? 'Compte supprimé' : party.phone}</span>
        )}
      </span>
    </Link>
  );
}
