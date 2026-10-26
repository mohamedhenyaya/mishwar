import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DriverStatus } from './entities/driver.entity';
export declare class DriversController {
    private readonly driversService;
    constructor(driversService: DriversService);
    findNearby(dto: NearbyDriversDto): Promise<import("./drivers.service").NearbyDriverResult[]>;
    getProfile(user: JwtPayload): Promise<import("./entities/driver.entity").Driver>;
    updateProfile(user: JwtPayload, dto: UpdateDriverDto): Promise<import("./entities/driver.entity").Driver>;
    uploadPhoto(user: JwtPayload, file?: Express.Multer.File): Promise<import("./entities/driver.entity").Driver>;
    updateLocation(user: JwtPayload, dto: UpdateLocationDto): Promise<void>;
    updateStatus(user: JwtPayload, status: DriverStatus): Promise<import("./entities/driver.entity").Driver>;
}
