import { Repository } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
export declare class RidesService {
    private readonly rideRepo;
    private readonly geolocationGateway;
    private readonly logger;
    constructor(rideRepo: Repository<Ride>, geolocationGateway: GeolocationGateway);
    createRide(userId: string, dto: CreateRideDto): Promise<Ride>;
    findById(id: string): Promise<Ride | null>;
    findByUser(userId: string): Promise<Ride[]>;
}
