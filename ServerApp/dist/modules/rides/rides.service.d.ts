import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { PublicDriver, PublicUser } from '../../common/utils/public-profile.util';
export type RideDetails = Ride & {
    driver: PublicDriver | null;
    user: PublicUser;
};
export declare class RidesService {
    private readonly rideRepo;
    private readonly geolocationGateway;
    private readonly driversService;
    private readonly usersService;
    private readonly config;
    private readonly logger;
    constructor(rideRepo: Repository<Ride>, geolocationGateway: GeolocationGateway, driversService: DriversService, usersService: UsersService, config: ConfigService);
    createRide(userId: string, dto: CreateRideDto): Promise<Ride>;
    findById(id: string): Promise<Ride | null>;
    findByUser(userId: string): Promise<Ride[]>;
    findByIdForParticipant(id: string, jwt: JwtPayload): Promise<RideDetails>;
    findActive(jwt: JwtPayload): Promise<RideDetails | null>;
    private withParticipants;
    acceptRide(rideId: string, driverId: string): Promise<RideDetails>;
    rejectRide(rideId: string, driverId: string): Promise<void>;
    arriveRide(rideId: string, driverId: string): Promise<Ride>;
    startRide(rideId: string, driverId: string): Promise<Ride>;
    completeRide(rideId: string, driverId: string, dto: CompleteRideDto): Promise<Ride>;
    cancelRide(rideId: string, userId: string): Promise<void>;
    cancelRideByDriver(rideId: string, driverId: string): Promise<void>;
    rateRide(rideId: string, jwt: JwtPayload, rating: number): Promise<void>;
    private scheduleRideTimeout;
}
