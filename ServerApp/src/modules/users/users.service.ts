import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
<<<<<<< HEAD
import { nextAverage } from '../../common/utils/public-profile.util';
=======
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { Ride } from '../rides/entities/ride.entity';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.userRepo.update(id, dto);
    return this.findById(id);
  }

<<<<<<< HEAD
  async setPhoto(id: string, photoUrl: string): Promise<User> {
    await this.userRepo.update(id, { photoUrl });
    return this.findById(id);
  }

  async incrementTotalRides(id: string): Promise<void> {
    await this.userRepo.increment({ id }, 'totalRides', 1);
  }

  async addRating(id: string, rating: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepo.update(id, {
      rating:      nextAverage(user.rating, user.ratingCount, rating),
      ratingCount: user.ratingCount + 1,
    });
  }
}
=======
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepo.find({ where: { id: In(ids) } });
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllPaginated(query: AdminUsersQueryDto): Promise<PaginatedResult<User>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
    }
    if (query.search) {
      qb.andWhere('(user.name ILIKE :s OR user.phone ILIKE :s)', { s: `%${query.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getStats(id: string) {
    const user = await this.findById(id);
    const rideRepo = this.userRepo.manager.getRepository(Ride);

    const statusCounts = await rideRepo
      .createQueryBuilder('ride')
      .select('ride.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ride.userId = :id', { id })
      .groupBy('ride.status')
      .getRawMany();

    const ridesByStatus: Record<string, number> = {};
    let totalRides = 0;
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      ridesByStatus[row.status] = count;
      totalRides += count;
    }

    return { user, totalRides, ridesByStatus, balance: Number(user.balance) };
  }

  async block(id: string, reason?: string): Promise<User> {
    await this.findById(id);
    await this.userRepo.update(id, {
      isActive:      false,
      blockedReason: reason ?? null,
      blockedAt:     new Date(),
    });
    return this.findById(id);
  }

  async unblock(id: string): Promise<User> {
    await this.findById(id);
    await this.userRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null });
    return this.findById(id);
  }

  async createAdmin(dto: CreateAdminDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Un compte avec ce numéro existe déjà');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.userRepo.create({
      phone: dto.phone,
      name:  dto.name,
      passwordHash,
      role:  UserRole.ADMIN,
    });
    return this.userRepo.save(admin);
  }
}
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
