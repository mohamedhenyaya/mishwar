import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
export declare class RidesService {
    private readonly rideRepo;
    private readonly geolocationGateway;
    private readonly driversService;
    private readonly config;
    private readonly logger;
    constructor(rideRepo: Repository<Ride>, geolocationGateway: GeolocationGateway, driversService: DriversService, config: ConfigService);
    createRide(userId: string, dto: CreateRideDto): Promise<Ride>;
    findById(id: string): Promise<Ride | null>;
    findByUser(userId: string): Promise<Ride[]>;
    findByIdForParticipant(id: string, jwt: JwtPayload): Promise<Ride>;
    acceptRide(rideId: string, driverId: string): Promise<Ride>;
    rejectRide(rideId: string, driverId: string): Promise<void>;
    startRide(rideId: string, driverId: string): Promise<Ride>;
    completeRide(rideId: string, driverId: string, dto: CompleteRideDto): Promise<Ride>;
    cancelRide(rideId: string, userId: string): Promise<void>;
    private scheduleRideTimeout;
}
