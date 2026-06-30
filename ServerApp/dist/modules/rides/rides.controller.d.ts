import { CreateRideDto } from './dto/create-ride.dto';
import { RidesService } from './rides.service';
interface JwtUser {
    sub: string;
    phone: string;
    role: string;
}
export declare class RidesController {
    private readonly ridesService;
    constructor(ridesService: RidesService);
    create(user: JwtUser, dto: CreateRideDto): Promise<import("./entities/ride.entity").Ride>;
    myRides(user: JwtUser): Promise<import("./entities/ride.entity").Ride[]>;
}
export {};
