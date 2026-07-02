import { VehicleType } from '../../drivers/entities/driver.entity';
import { RideVehicleClass } from '../entities/ride.entity';

// Règle métier provisoire — à affiner avec le produit plus tard.
// Associe la classe de réservation choisie par le client aux types de véhicules
// physiques des chauffeurs éligibles pour la notification.
export const VEHICLE_CLASS_TO_DRIVER_TYPES: Record<RideVehicleClass, VehicleType[]> = {
  [RideVehicleClass.ECONOMY]: [VehicleType.SEDAN, VehicleType.MOTO],
  [RideVehicleClass.COMFORT]: [VehicleType.SEDAN, VehicleType.SUV],
  [RideVehicleClass.PREMIUM]: [VehicleType.SUV, VehicleType.VAN],
};
