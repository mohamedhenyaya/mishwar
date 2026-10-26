import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { AdminRidesQueryDto } from './dto/admin-rides-query.dto';
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { DriverCancelRideDto } from './dto/driver-cancel-ride.dto';
import { LeaderboardPeriod } from './dto/leaderboard-query.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { PromotionsService } from '../promotions/promotions.service';
import { UsersService } from '../users/users.service';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PublicDriver, PublicUser } from '../../common/utils/public-profile.util';
export type RideDetails = Ride & {
    driver: PublicDriver | null;
    user: PublicUser;
};
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    points: number;
    isCurrentUser: boolean;
}
export interface LeaderboardResult {
    period: LeaderboardPeriod;
    entries: LeaderboardEntry[];
    currentUser: {
        rank: number;
        points: number;
    } | null;
}
export declare class RidesService implements OnModuleInit {
    private readonly rideRepo;
    private readonly geolocationGateway;
    private readonly driversService;
    private readonly config;
    private readonly settingsService;
    private readonly walletService;
    private readonly promotionsService;
    private readonly usersService;
    private readonly logger;
    constructor(rideRepo: Repository<Ride>, geolocationGateway: GeolocationGateway, driversService: DriversService, config: ConfigService, settingsService: SettingsService, walletService: WalletService, promotionsService: PromotionsService, usersService: UsersService);
    onModuleInit(): void;
    createRide(userId: string, dto: CreateRideDto): Promise<Ride>;
    private activatePendingRide;
    findById(id: string): Promise<Ride | null>;
    findByUser(userId: string): Promise<Ride[]>;
    findByIdForParticipant(id: string, jwt: JwtPayload): Promise<RideDetails & {
        riderName?: string;
        riderPhone?: string;
    }>;
    findActive(jwt: JwtPayload): Promise<RideDetails | null>;
    private withParticipants;
    getTariff(): Promise<{
        currency: string;
        minimumFare: number;
        perKm: number;
        perStopMinute: number;
    }>;
    acceptRide(rideId: string, driverId: string): Promise<RideDetails>;
    rejectRide(rideId: string, driverId: string): Promise<void>;
    arriveRide(rideId: string, driverId: string): Promise<Ride>;
    startRide(rideId: string, driverId: string): Promise<Ride>;
    recordMeterPing(rideId: string, latitude: number, longitude: number): Promise<{
        distanceKm: number;
        stoppedMinutes: number;
        price: number;
    } | null>;
    completeRide(rideId: string, driverId: string, dto: CompleteRideDto): Promise<Ride>;
    cancelRide(rideId: string, userId: string, reason?: string): Promise<void>;
    driverCancelRide(rideId: string, driverId: string, dto: DriverCancelRideDto): Promise<void>;
    private scheduleRideTimeout;
    estimateRide(dto: EstimateRideDto): Promise<{
        distanceKm: number;
        estimatedDurationMinutes: number;
        estimatedPrice: number;
    }>;
    getReceipt(rideId: string, jwt: JwtPayload): Promise<Record<string, unknown>>;
    createScheduledRide(userId: string, dto: CreateScheduledRideDto): Promise<Ride>;
    findScheduledByUser(userId: string): Promise<Ride[]>;
    updateScheduledRide(rideId: string, userId: string, dto: UpdateScheduledRideDto): Promise<Ride>;
    cancelScheduledRide(rideId: string, userId: string): Promise<void>;
    findScheduledForAdmin(query: PaginationQueryDto): Promise<PaginatedResult<Ride>>;
    private activateDueScheduledRides;
    findAllForAdmin(query: AdminRidesQueryDto): Promise<PaginatedResult<Ride>>;
    findByIdForAdmin(id: string): Promise<Ride>;
    getLeaderboard(period: LeaderboardPeriod, currentUserId: string): Promise<LeaderboardResult>;
}
