export declare enum RideStatus {
    SCHEDULED = "SCHEDULED",
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    ARRIVED = "ARRIVED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export type RideCancelledBy = 'user' | 'driver' | 'system';
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
    estimatedPrice: number | null;
    traveledDistanceKm: number;
    stoppedSeconds: number;
    lastMeterLatitude: number | null;
    lastMeterLongitude: number | null;
    lastMeterAt: Date | null;
    livePrice: number | null;
    ratingForDriver: number | null;
    ratingForRider: number | null;
    scheduledAt: Date | null;
    couponCode: string | null;
    discountAmount: number | null;
    cancelledBy: RideCancelledBy | null;
    cancelReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
