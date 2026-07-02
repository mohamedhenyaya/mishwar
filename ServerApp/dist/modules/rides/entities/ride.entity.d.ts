export declare enum RideStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum RideVehicleClass {
    ECONOMY = "economy",
    COMFORT = "comfort",
    PREMIUM = "premium"
}
export declare class Ride {
    id: string;
    userId: string;
    driverId: string | null;
    startLatitude: number;
    startLongitude: number;
    destinationName: string;
    endLatitude: number | null;
    endLongitude: number | null;
    vehicleType: RideVehicleClass;
    status: RideStatus;
    notifiedDriverIds: string[];
    rejectedDriverIds: string[];
    price: number | null;
    createdAt: Date;
    updatedAt: Date;
}
