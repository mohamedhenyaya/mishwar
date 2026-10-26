import { Driver } from '../../modules/drivers/entities/driver.entity';
import { User } from '../../modules/users/entities/user.entity';

// Informations partagées avec l'autre participant d'une course.
// Les colonnes decimal arrivent en string depuis Postgres → conversion explicite.

export interface PublicDriver {
  id:           string;
  name:         string | null;
  phone:        string;
  photoUrl:     string | null;
  rating:       number;
  totalRides:   number;
  vehicleType:  string;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  latitude:     number | null;
  longitude:    number | null;
}

export interface PublicUser {
  id:         string;
  name:       string | null;
  phone:      string;
  photoUrl:   string | null;
  rating:     number;
  totalRides: number;
}

const toNumber = (v: unknown): number | null => (v == null ? null : Number(v));

export function toPublicDriver(d: Driver): PublicDriver {
  return {
    id:           d.id,
    name:         d.name ?? null,
    phone:        d.phone,
    photoUrl:     d.photoUrl ?? null,
    rating:       Number(d.rating),
    totalRides:   d.totalRides,
    vehicleType:  d.vehicleType,
    vehicleModel: d.vehicleModel ?? null,
    vehiclePlate: d.vehiclePlate ?? null,
    latitude:     toNumber(d.latitude),
    longitude:    toNumber(d.longitude),
  };
}

export function toPublicUser(u: User): PublicUser {
  return {
    id:         u.id,
    name:       u.name ?? null,
    phone:      u.phone,
    photoUrl:   u.photoUrl ?? null,
    rating:     Number(u.rating),
    totalRides: u.totalRides,
  };
}

// Nouvelle moyenne après une note supplémentaire (la note par défaut 5.0 ne compte pas)
export function nextAverage(current: number, count: number, rating: number): number {
  const avg = count === 0 ? rating : (Number(current) * count + rating) / (count + 1);
  return Math.round(avg * 100) / 100;
}
