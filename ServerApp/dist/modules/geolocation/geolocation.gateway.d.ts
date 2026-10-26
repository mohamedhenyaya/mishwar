import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Driver } from '../drivers/entities/driver.entity';
import { Repository } from 'typeorm';
import { Ride } from '../rides/entities/ride.entity';
type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled';
export declare class GeolocationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly driversService;
    private readonly jwtService;
    private readonly rideRepo;
    server: Server;
    private readonly logger;
    private readonly connectedDrivers;
    private readonly driverActiveRide;
    private readonly meters;
    constructor(driversService: DriversService, jwtService: JwtService, rideRepo: Repository<Ride>);
    handleConnection(client: Socket): Promise<void>;
    afterInit(): void;
    handleDisconnect(client: Socket): void;
    private markOfflineIfGone;
    private restoreActiveRide;
    private startMeter;
    private stopMeter;
    private addMeterDistance;
    private emitMeter;
    handleDriverRegister(client: Socket): void;
    handleDriverPosition(data: {
        latitude: number;
        longitude: number;
    }, client: Socket): Promise<void>;
    handleUserLocation(data: {
        latitude: number;
        longitude: number;
    }, client: Socket): Promise<void>;
    notifyNearbyDrivers(ride: Ride): Promise<string[]>;
    notifyRideAccepted(ride: Ride, driver: Driver): Promise<void>;
    notifyRideArrived(ride: Ride): void;
    notifyRideStarted(ride: Ride): void;
    notifyRideCompleted(ride: Ride): void;
    notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void;
    notifyRideUnavailable(driverId: string, rideId: string): void;
    releaseDriver(driverId: string): void;
}
export {};
