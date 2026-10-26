import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { RateRideDto } from './dto/rate-ride.dto';
import { RidesService } from './rides.service';
export declare class RidesController {
    private readonly ridesService;
    constructor(ridesService: RidesService);
    create(user: JwtPayload, dto: CreateRideDto): Promise<import("./entities/ride.entity").Ride>;
    estimate(dto: EstimateRideDto): Promise<{
        distanceKm: number;
        estimatedDurationMinutes: number;
        estimatedPrice: number;
    }>;
    createScheduled(user: JwtPayload, dto: CreateScheduledRideDto): Promise<import("./entities/ride.entity").Ride>;
    myScheduledRides(user: JwtPayload): Promise<import("./entities/ride.entity").Ride[]>;
    updateScheduled(user: JwtPayload, id: string, dto: UpdateScheduledRideDto): Promise<import("./entities/ride.entity").Ride>;
    cancelScheduled(user: JwtPayload, id: string): Promise<void>;
    myRides(user: JwtPayload): Promise<import("./entities/ride.entity").Ride[]>;
    tariff(): {
        readonly currency: "MRU";
        readonly baseFare: 100;
        readonly perKm: 30;
        readonly perMinute: 5;
    };
    active(user: JwtPayload): Promise<import("./rides.service").RideDetails>;
    findOne(user: JwtPayload, id: string): Promise<import("./rides.service").RideDetails>;
    receipt(user: JwtPayload, id: string): Promise<Record<string, unknown>>;
    accept(user: JwtPayload, id: string): Promise<import("./rides.service").RideDetails>;
    reject(user: JwtPayload, id: string): Promise<void>;
    arrive(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    rate(user: JwtPayload, id: string, dto: RateRideDto): Promise<void>;
    start(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    complete(user: JwtPayload, id: string, dto: CompleteRideDto): Promise<import("./entities/ride.entity").Ride>;
    cancel(user: JwtPayload, id: string, dto: CancelRideDto): Promise<void>;
    driverCancel(user: JwtPayload, id: string, dto: DriverCancelRideDto): any;
}
