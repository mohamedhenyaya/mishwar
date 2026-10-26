import { UsersService } from './users.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: JwtPayload): Promise<import("./entities/user.entity").User>;
    updateMe(user: JwtPayload, dto: UpdateUserDto): Promise<import("./entities/user.entity").User>;
    uploadPhoto(user: JwtPayload, file?: Express.Multer.File): Promise<import("./entities/user.entity").User>;
}
