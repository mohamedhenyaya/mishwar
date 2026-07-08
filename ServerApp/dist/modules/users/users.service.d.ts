import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    findById(id: string): Promise<User>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    findByIds(ids: string[]): Promise<User[]>;
    findAllPaginated(query: AdminUsersQueryDto): Promise<PaginatedResult<User>>;
    getStats(id: string): Promise<{
        user: User;
        totalRides: number;
        ridesByStatus: Record<string, number>;
        balance: number;
    }>;
    block(id: string, reason?: string): Promise<User>;
    unblock(id: string): Promise<User>;
    createAdmin(dto: CreateAdminDto): Promise<User>;
}
