export declare enum UserRole {
    USER = "user",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    phone: string;
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
