export declare enum AuthRole {
    USER = "user",
    DRIVER = "driver"
}
export declare class SendOtpDto {
    phone: string;
    role: AuthRole;
}
