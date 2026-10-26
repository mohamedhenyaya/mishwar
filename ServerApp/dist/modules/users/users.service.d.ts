import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    findById(id: string): Promise<User>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    setPhoto(id: string, photoUrl: string): Promise<User>;
    incrementTotalRides(id: string): Promise<void>;
    addRating(id: string, rating: number): Promise<void>;
}
