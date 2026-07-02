import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { RidesService } from './rides.service';
export declare class RidesController {
    private readonly ridesService;
    constructor(ridesService: RidesService);
    create(user: JwtPayload, dto: CreateRideDto): Promise<import("./entities/ride.entity").Ride>;
    myRides(user: JwtPayload): Promise<import("./entities/ride.entity").Ride[]>;
    findOne(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    accept(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    reject(user: JwtPayload, id: string): Promise<void>;
    start(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    complete(user: JwtPayload, id: string, dto: CompleteRideDto): Promise<import("./entities/ride.entity").Ride>;
    cancel(user: JwtPayload, id: string): Promise<void>;
}
