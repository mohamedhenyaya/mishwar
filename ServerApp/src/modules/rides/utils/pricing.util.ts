import { haversineMeters } from '../../../common/utils/geo.util';
import { Driver } from '../../drivers/entities/driver.entity';
import { Ride } from '../entities/ride.entity';

<<<<<<< HEAD
const BASE_FARE_MRU = 100;
const PER_KM_MRU = 30;
const PER_MINUTE_MRU = 5; // trajet ouvert uniquement

// Exposé aux applications (GET /rides/tariff) pour afficher les tarifs
export const TARIFF = {
  currency:     'MRU',
  baseFare:     BASE_FARE_MRU,
  perKm:        PER_KM_MRU,
  perMinute:    PER_MINUTE_MRU,
} as const;

=======
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
const AVG_SPEED_KMH = 30;
const FALLBACK_ETA_MINUTES = 5;

// pricePerKm / minimumFare viennent de PlatformSettings (configurable par un admin) — plus de constantes figées ici
export function computeFare(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
  pricePerKm: number,
  minimumFare: number,
): number {
  const km = haversineMeters(startLatitude, startLongitude, endLatitude, endLongitude) / 1000;
<<<<<<< HEAD
  return Math.round(BASE_FARE_MRU + km * PER_KM_MRU);
}

export interface MeterReading {
  distanceKm:  number;
  durationMin: number;
  price:       number;
}

// Trajet ouvert : prix de base + kilomètres parcourus + minutes écoulées
export function computeOpenTripFare(distanceMeters: number, startedAt: Date, now = new Date()): MeterReading {
  const distanceKm  = distanceMeters / 1000;
  const durationMin = Math.max(0, (now.getTime() - startedAt.getTime()) / 60_000);
  return {
    distanceKm:  Math.round(distanceKm * 100) / 100,
    durationMin: Math.floor(durationMin),
    price:       Math.round(BASE_FARE_MRU + distanceKm * PER_KM_MRU + durationMin * PER_MINUTE_MRU),
  };
=======
  return Math.max(Math.round(km * pricePerKm), Math.round(minimumFare));
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
}

export function estimateEtaMinutes(driver: Driver, ride: Ride): number {
  if (driver.latitude == null || driver.longitude == null) {
    return FALLBACK_ETA_MINUTES;
  }
  const km = haversineMeters(driver.latitude, driver.longitude, ride.startLatitude, ride.startLongitude) / 1000;
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
}
