import { haversineMeters } from '../../../common/utils/geo.util';
import { Driver } from '../../drivers/entities/driver.entity';
import { Ride } from '../entities/ride.entity';

const BASE_FARE_DA = 100;
const PER_KM_DA = 30;
const AVG_SPEED_KMH = 30;
const FALLBACK_ETA_MINUTES = 5;

export function computeFare(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
): number {
  const km = haversineMeters(startLatitude, startLongitude, endLatitude, endLongitude) / 1000;
  return Math.round(BASE_FARE_DA + km * PER_KM_DA);
}

export function estimateEtaMinutes(driver: Driver, ride: Ride): number {
  if (driver.latitude == null || driver.longitude == null) {
    return FALLBACK_ETA_MINUTES;
  }
  const km = haversineMeters(driver.latitude, driver.longitude, ride.startLatitude, ride.startLongitude) / 1000;
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
}
