import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RidesService } from '../rides/rides.service';
type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled';
export declare class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly driversService;
    private readonly ridesService;
    private readonly jwtService;
    private readonly rideRepo;
    server: Server;
    private readonly logger;
    private readonly connectedDrivers;
    private readonly driverActiveRide;
    private readonly meterTimers;
    private readonly lastPositions;
    constructor(driversService: DriversService, ridesService: RidesService, jwtService: JwtService, rideRepo: Repository<Ride>);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    private markOfflineIfGone;
    private restoreActiveRide;
    handleDriverRegister(client: Socket): void;
    handleDriverPosition(data: {
        latitude: number;
        longitude: number;
    }, client: Socket): Promise<void>;
    handleUserLocation(data: {
        latitude: number;
        longitude: number;
    }, client: Socket): Promise<void>;
    private startMeter;
    private stopMeter;
    private recordMeter;
    notifyNearbyDrivers(ride: Ride): Promise<string[]>;
    notifyRideAccepted(ride: Ride, driver: Driver): Promise<void>;
    notifyRideArrived(ride: Ride): void;
    notifyRideStarted(ride: Ride): void;
    notifyRideCompleted(ride: Ride): void;
    notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void;
    notifyRideUnavailable(driverId: string, rideId: string): void;
    releaseDriver(driverId: string): void;
    notifyDriverStatus(driverId: string, status: DriverStatus): void;
    notifyCustom(room: string, event: string, payload: unknown): void;
}
export {};
