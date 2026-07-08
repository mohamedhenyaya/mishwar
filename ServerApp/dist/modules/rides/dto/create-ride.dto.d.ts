import { RideVehicleClass } from '../entities/ride.entity';
export declare class CreateRideDto {
    startLatitude: number;
    startLongitude: number;
    destinationName?: string;
    vehicleType: RideVehicleClass;
    endLatitude?: number;
    endLongitude?: number;
    couponCode?: string;
    isOpenTrip?: boolean;
}
