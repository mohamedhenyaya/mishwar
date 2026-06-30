export declare enum RideStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
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
    status: RideStatus;
    price: number | null;
    createdAt: Date;
    updatedAt: Date;
}
