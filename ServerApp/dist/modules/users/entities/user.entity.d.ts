export declare enum UserRole {
    USER = "user",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    phone: string;
    name: string;
    email: string;
    photoUrl: string;
    rating: number;
    ratingCount: number;
    totalRides: number;
    role: UserRole;
    passwordHash: string;
    isActive: boolean;
    blockedReason: string | null;
    blockedAt: Date | null;
    balance: number;
    rating: number;
    ratingCount: number;
    createdAt: Date;
    updatedAt: Date;
}
