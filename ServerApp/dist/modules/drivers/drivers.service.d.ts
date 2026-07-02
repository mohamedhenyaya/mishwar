import { Repository } from 'typeorm';
import { Driver, DriverStatus, VehicleType } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
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
    updateStatus(id: string, status: DriverStatus): Promise<Driver>;
    findById(id: string): Promise<Driver>;
    incrementTotalRides(id: string): Promise<void>;
    createByAdmin(dto: CreateDriverDto): Promise<Driver>;
    updateByAdmin(id: string, dto: UpdateDriverDto): Promise<Driver>;
    block(id: string, reason?: string): Promise<Driver>;
    unblock(id: string): Promise<Driver>;
    findAllPaginated(query: AdminDriversQueryDto): Promise<PaginatedResult<Driver>>;
    getStats(id: string): Promise<{
        driver: Driver;
        totalRides: number;
        ridesByStatus: Record<string, number>;
        totalEarned: number;
        totalCommissionPaid: number;
        balance: number;
    }>;
}
