import { EntityManager } from 'typeorm';
import { Driver } from '../../modules/drivers/entities/driver.entity';
import { User } from '../../modules/users/entities/user.entity';

interface BlockableAccount {
  id:            string;
  isActive:      boolean;
  blockedReason: string | null;
  blockedAt?:    Date | null;
  blockedUntil:  Date | null;
  deletedAt:     Date | null;
}

// Fin de blocage calculée au moment du blocage (null = définitif)
export function blockedUntilFrom(durationMinutes?: number): Date | null {
  return durationMinutes ? new Date(Date.now() + durationMinutes * 60_000) : null;
}

// Blocage temporaire arrivé à échéance : le compte est réactivé tout de suite (sans attendre
// le passage périodique). Retourne true si le compte est encore bloqué.
export async function stillBlocked(
  manager: EntityManager,
  entity: typeof User | typeof Driver,
  account: BlockableAccount,
): Promise<boolean> {
  if (account.isActive) return false;
  if (account.deletedAt || !account.blockedUntil || account.blockedUntil > new Date()) return true;
  await manager.getRepository<BlockableAccount>(entity).update(account.id, {
    isActive: true, blockedReason: null, blockedAt: null, blockedUntil: null,
  });
  account.isActive = true;
  return false;
}

// Passage périodique : réactive tous les comptes dont le blocage temporaire est terminé
export async function releaseExpiredBlocks(manager: EntityManager): Promise<void> {
  for (const table of ['users', 'drivers']) {
    await manager.query(
      `UPDATE ${table} SET "isActive" = true, "blockedReason" = NULL, "blockedAt" = NULL, "blockedUntil" = NULL
       WHERE "isActive" = false AND "deletedAt" IS NULL AND "blockedUntil" IS NOT NULL AND "blockedUntil" <= timezone('UTC', now())`,
    );
  }
}

// Message affiché à la personne bloquée (connexion, requête refusée)
export function blockedMessage(account: Pick<BlockableAccount, 'blockedReason' | 'blockedUntil'>): string {
  const until = account.blockedUntil
    ? `jusqu’au ${account.blockedUntil.toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })}`
    : 'définitivement';
  return `Compte bloqué ${until}${account.blockedReason ? ` : ${account.blockedReason}` : ''}`;
}
