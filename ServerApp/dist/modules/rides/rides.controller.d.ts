import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { DriverCancelRideDto } from './dto/driver-cancel-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
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
    tariff(): Promise<{
        currency: string;
        minimumFare: number;
        perKm: number;
        perStopMinute: number;
    }>;
    active(user: JwtPayload): Promise<import("./rides.service").RideDetails>;
    leaderboard(user: JwtPayload, dto: LeaderboardQueryDto): Promise<import("./rides.service").LeaderboardResult>;
    findOne(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride & {
        driver: import("../../common/utils/public-profile.util").PublicDriver | null;
        user: import("../../common/utils/public-profile.util").PublicUser;
    } & {
        riderName?: string;
        riderPhone?: string;
    }>;
    receipt(user: JwtPayload, id: string): Promise<Record<string, unknown>>;
    accept(user: JwtPayload, id: string): Promise<import("./rides.service").RideDetails>;
    reject(user: JwtPayload, id: string): Promise<void>;
    arrive(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    start(user: JwtPayload, id: string): Promise<import("./entities/ride.entity").Ride>;
    complete(user: JwtPayload, id: string, dto: CompleteRideDto): Promise<import("./entities/ride.entity").Ride>;
    cancel(user: JwtPayload, id: string, dto: CancelRideDto): Promise<void>;
    driverCancel(user: JwtPayload, id: string, dto: DriverCancelRideDto): Promise<void>;
}
