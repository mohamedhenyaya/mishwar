import { EntityManager, In } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Driver } from '../../modules/drivers/entities/driver.entity';

export type PartyType = 'user' | 'driver';

export interface PartySummary {
  id: string;
  type: PartyType;
  name: string | null;
  phone: string;
  photoUrl: string | null;
  role?: string;
}

export interface PartyRef {
  type: PartyType | string | null | undefined;
  id: string | null | undefined;
}

// Résout en deux requêtes groupées les comptes (users/drivers) référencés par une liste
// d'entités sans relation TypeORM — évite le N+1 dans les listes du back-office
export async function loadParties(
  manager: EntityManager,
  refs: PartyRef[],
): Promise<(type: PartyRef['type'], id: PartyRef['id']) => PartySummary | null> {
  const userIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const ref of refs) {
    if (!ref.id) continue;
    if (ref.type === 'driver') driverIds.add(ref.id);
    else if (ref.type === 'user' || ref.type === 'admin') userIds.add(ref.id);
  }

  const [users, drivers] = await Promise.all([
    userIds.size ? manager.getRepository(User).find({ where: { id: In([...userIds]) } }) : [],
    driverIds.size ? manager.getRepository(Driver).find({ where: { id: In([...driverIds]) } }) : [],
  ]);

  const byKey = new Map<string, PartySummary>();
  for (const u of users) {
    byKey.set(`user:${u.id}`, { id: u.id, type: 'user', name: u.name, phone: u.phone, photoUrl: u.photoUrl, role: u.role });
  }
  for (const d of drivers) {
    byKey.set(`driver:${d.id}`, { id: d.id, type: 'driver', name: d.name, phone: d.phone, photoUrl: d.photoUrl });
  }

  return (type, id) => {
    if (!id) return null;
    const normalized = type === 'driver' ? 'driver' : 'user';
    return byKey.get(`${normalized}:${id}`) ?? null;
  };
}
