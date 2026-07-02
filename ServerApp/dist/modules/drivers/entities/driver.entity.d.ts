export declare enum DriverStatus {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
    BUSY = "BUSY"
}
export declare enum VehicleType {
    SEDAN = "sedan",
    SUV = "suv",
    VAN = "van",
    MOTO = "moto"
}
export declare class Driver {
    id: string;
    phone: string;
    name: string;
    passwordHash: string;
    status: DriverStatus;
    vehicleType: VehicleType;
    vehicleModel: string;
    vehiclePlate: string;
    rating: number;
    totalRides: number;
    latitude: number | null;
    longitude: number | null;
    lastLocationUpdate: Date | null;
    isActive: boolean;
    blockedReason: string | null;
    blockedAt: Date | null;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}
