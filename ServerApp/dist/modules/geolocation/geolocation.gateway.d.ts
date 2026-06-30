import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Ride } from '../rides/entities/ride.entity';
export declare class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly driversService;
    server: Server;
    private readonly logger;
    private readonly connectedDrivers;
    constructor(driversService: DriversService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleDriverRegister(data: {
        driverId: string;
    }, client: Socket): void;
    handleDriverPosition(data: {
        driverId: string;
        latitude: number;
        longitude: number;
    }): Promise<void>;
    handleUserLocation(data: {
        userId?: string;
        latitude: number;
        longitude: number;
    }, client: Socket): Promise<void>;
    notifyNearbyDrivers(ride: Ride): Promise<void>;
}
