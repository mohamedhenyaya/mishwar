import { RideVehicleClass } from '../entities/ride.entity';
export declare class CreateRideDto {
    startLatitude: number;
    startLongitude: number;
    destinationName?: string;
    vehicleType?: RideVehicleClass;
    isOpenTrip?: boolean;
    endLatitude?: number;
    endLongitude?: number;
}
