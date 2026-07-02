import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled';
export declare class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly driversService;
    private readonly jwtService;
    server: Server;
    private readonly logger;
    private readonly connectedDrivers;
    private readonly driverActiveRide;
    constructor(driversService: DriversService, jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
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
    notifyRideStarted(ride: Ride): Promise<void>;
    notifyRideCompleted(ride: Ride): Promise<void>;
    notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void;
    notifyRideUnavailable(driverId: string, rideId: string): void;
}
export {};
