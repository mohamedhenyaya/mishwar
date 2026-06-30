import { Repository } from 'typeorm';
import { Driver, DriverStatus } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
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
    constructor(driverRepo: Repository<Driver>);
    findNearby(dto: NearbyDriversDto): Promise<NearbyDriverResult[]>;
    updateLocation(id: string, dto: UpdateLocationDto): Promise<void>;
    updateStatus(id: string, status: DriverStatus): Promise<Driver>;
    findById(id: string): Promise<Driver>;
}
