export declare enum RideStatus {
    SCHEDULED = "SCHEDULED",
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    ARRIVED = "ARRIVED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export type RideCancelledBy = 'rider' | 'driver' | 'system';
export declare const ACTIVE_RIDE_STATUSES: RideStatus[];
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
    isOpenTrip: boolean;
    startedAt: Date | null;
    distanceMeters: number;
    cancelledBy: RideCancelledBy | null;
    driverRating: number | null;
    userRating: number | null;
    createdAt: Date;
    updatedAt: Date;
}
