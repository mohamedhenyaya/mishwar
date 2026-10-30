import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, Not } from 'typeorm';
import { FuelType, Vehicle, VehicleApprovalStatus } from './entities/vehicle.entity';
import { Driver, VehicleType } from '../drivers/entities/driver.entity';

export interface DriverVehicleInput {
  type:         VehicleType;
  model:        string;
  plateNumber:  string;
  make?:        string | null;
  year?:        number | null;
  fuelType?:    FuelType | null;
  color?:       string | null;
  capacity?:    number | null;
}

// Un capitaine = un véhicule. Toute écriture passe par ici pour garder Driver
// (type, modèle, plaque lus par le matching et le profil public) aligné sur Vehicle.

export async function createDriverVehicle(
  manager: EntityManager,
  driverId: string,
  input: DriverVehicleInput,
  status: VehicleApprovalStatus,
): Promise<Vehicle> {
  const plateNumber = normalizePlate(input.plateNumber);
  await assertPlateFree(manager, plateNumber);

  const vehicle = await manager.getRepository(Vehicle).save(
    manager.getRepository(Vehicle).create({ ...input, plateNumber, driverId, status }),
  );
  await syncDriver(manager, vehicle);
  return vehicle;
}

// resetApproval : une modification par le capitaine renvoie le véhicule en validation
export async function updateDriverVehicle(
  manager: EntityManager,
  driverId: string,
  patch: Partial<DriverVehicleInput>,
  { resetApproval }: { resetApproval: boolean },
): Promise<Vehicle> {
  const repo = manager.getRepository(Vehicle);
  const vehicle = await repo.findOne({ where: { driverId } });
  if (!vehicle) throw new NotFoundException('Véhicule non trouvé');

  const changes: Partial<Vehicle> = { ...patch };
  if (patch.plateNumber !== undefined) {
    // Plaque inchangée (même saisie autrement, ou ancienne au format libre) : pas de revalidation
    if (compact(patch.plateNumber) === compact(vehicle.plateNumber)) {
      delete changes.plateNumber;
    } else {
      changes.plateNumber = normalizePlate(patch.plateNumber);
      await assertPlateFree(manager, changes.plateNumber, vehicle.id);
    }
  }
  const changed = (Object.keys(changes) as (keyof Vehicle)[]).some((k) => changes[k] !== vehicle[k]);
  if (!changed) return vehicle;

  if (resetApproval) {
    changes.status = VehicleApprovalStatus.PENDING;
    changes.rejectedReason = null;
  }
  await repo.update(vehicle.id, changes);
  const updated = { ...vehicle, ...changes } as Vehicle;
  await syncDriver(manager, updated);
  return updated;
}

// Immatriculation au format « 1234 AB 12 » (saisie tolérée sans espaces, en minuscules, avec tirets)
const PLATE_PATTERN = /^(\d{4})([A-Z]{2})(\d{2})$/;

function compact(plate: string): string {
  return plate.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function normalizePlate(plate: string): string {
  const match = PLATE_PATTERN.exec(compact(plate));
  if (!match) throw new BadRequestException('Immatriculation invalide : format attendu 1234 AB 12');
  return match.slice(1).join(' ');
}

async function assertPlateFree(manager: EntityManager, plateNumber: string, exceptVehicleId?: string) {
  const taken = await manager.getRepository(Vehicle).exists({
    where: { plateNumber, ...(exceptVehicleId && { id: Not(exceptVehicleId) }) },
  });
  if (taken) throw new ConflictException('Cette plaque est déjà enregistrée pour un autre capitaine');
}

async function syncDriver(manager: EntityManager, vehicle: Vehicle) {
  await manager.getRepository(Driver).update(vehicle.driverId, {
    vehicleType:  vehicle.type,
    vehicleModel: [vehicle.make, vehicle.model].filter(Boolean).join(' '),
    vehiclePlate: vehicle.plateNumber,
  });
}
