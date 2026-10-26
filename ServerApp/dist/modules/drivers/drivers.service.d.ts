import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { Driver, DriverStatus, VehicleType } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
export interface NearbyDriverResult {
    id: string;
    name: string;
    phone: string;
    status: DriverStatus;
    vehicleType: string;
    rating: number;
    latitude: number;
    longitude: number;
    distanceMeters: number;
}
export declare class DriversService {
    private readonly driverRepo;
    private readonly geolocationGateway;
    constructor(driverRepo: Repository<Driver>, geolocationGateway: GeolocationGateway);
    findNearby(dto: NearbyDriversDto, vehicleTypes?: VehicleType[]): Promise<NearbyDriverResult[]>;
    updateLocation(id: string, dto: UpdateLocationDto): Promise<void>;
    readonly statusChanges: Subject<{
        driverId: string;
        status: DriverStatus;
    }>;
    updateStatus(id: string, status: DriverStatus): Promise<Driver>;
    findById(id: string): Promise<Driver>;
    incrementTotalRides(id: string): Promise<void>;
    updateProfile(id: string, dto: UpdateDriverDto & {
        photoUrl?: string;
    }): Promise<Driver>;
    addRating(id: string, rating: number): Promise<void>;
}
