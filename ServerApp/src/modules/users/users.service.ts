import { blockedUntilFrom } from '../../common/utils/account-block.util';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { ACTIVE_RIDE_STATUSES, Ride, RideStatus } from '../rides/entities/ride.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';

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

  async setPhoto(id: string, photoUrl: string): Promise<User> {
    await this.userRepo.update(id, { photoUrl });
    return this.findById(id);
  }

  async incrementTotalRides(id: string): Promise<void> {
    await this.userRepo.increment({ id }, 'totalRides', 1);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepo.find({ where: { id: In(ids) } });
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllPaginated(query: AdminUsersQueryDto): Promise<PaginatedResult<User>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC');
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
    }
    if (query.search) {
      qb.andWhere('(user.name ILIKE :s OR user.phone ILIKE :s OR user.email ILIKE :s)', { s: `%${query.search.trim()}%` });
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

    const spentRow = await rideRepo
      .createQueryBuilder('ride')
      .select('COALESCE(SUM(ride.price), 0)', 'total')
      .where('ride.userId = :id AND ride.status = :status', { id, status: RideStatus.COMPLETED })
      .getRawOne();

    return {
      user,
      totalRides,
      ridesByStatus,
      totalSpent: parseFloat(spentRow.total),
      balance:    Number(user.balance),
    };
  }

  async createByAdmin(dto: CreateUserByAdminDto): Promise<User> {
    await this.assertPhoneFree(dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      phone: dto.phone,
      name:  dto.name,
      email: dto.email,
      passwordHash,
      role:  UserRole.USER,
    });
    return this.userRepo.save(user);
  }

  async block(id: string, reason: string | undefined, actingAdminId: string, durationMinutes?: number): Promise<User> {
    const user = await this.findById(id);
    if (id === actingAdminId) throw new BadRequestException('Vous ne pouvez pas bloquer votre propre compte');
    if (user.role === UserRole.ADMIN) await this.assertNotLastActiveAdmin(id);

    await this.userRepo.update(id, {
      isActive:      false,
      blockedReason: reason ?? null,
      blockedAt:     new Date(),
      blockedUntil:  blockedUntilFrom(durationMinutes),
    });
    await this.revokeSessions(id);
    return this.findById(id);
  }

  async unblock(id: string): Promise<User> {
    const user = await this.findById(id);
    if (user.deletedAt) throw new BadRequestException('Ce compte a été supprimé');
    await this.userRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null, blockedUntil: null });
    return this.findById(id);
  }

  async resetPasswordByAdmin(id: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (user.deletedAt) throw new BadRequestException('Ce compte a été supprimé');
    await this.userRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    await this.revokeSessions(id);
    return { message: 'Mot de passe réinitialisé' };
  }

  async changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    await this.userRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    return { message: 'Mot de passe modifié' };
  }

  // Le compte est anonymisé plutôt qu'effacé : les courses, transactions et avis qui le
  // référencent restent lisibles, et le numéro est libéré pour une future réinscription
  async softDelete(id: string, actingAdminId: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (user.deletedAt) throw new BadRequestException('Ce compte est déjà supprimé');
    if (id === actingAdminId) throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    if (user.role === UserRole.ADMIN) await this.assertNotLastActiveAdmin(id);

    const rideRepo = this.userRepo.manager.getRepository(Ride);
    const activeRide = await rideRepo.findOne({
      where: { userId: id, status: In([RideStatus.PENDING, ...ACTIVE_RIDE_STATUSES]) },
    });
    if (activeRide) {
      throw new ConflictException('Ce client a une course en cours — annulez-la avant de supprimer le compte');
    }

    await rideRepo.update(
      { userId: id, status: RideStatus.SCHEDULED },
      { status: RideStatus.CANCELLED, cancelledBy: 'admin', cancelReason: 'Compte supprimé' },
    );

    const now = new Date();
    await this.userRepo.update(id, {
      phone:         `deleted:${now.getTime()}:${user.phone}`,
      name:          'Compte supprimé',
      email:         null as unknown as string,
      photoUrl:      null as unknown as string,
      passwordHash:  null as unknown as string,
      isActive:      false,
      blockedReason: 'Compte supprimé',
      blockedAt:     user.blockedAt ?? now,
      blockedUntil:  null,
      deletedAt:     now,
    });
    await this.revokeSessions(id);
    return { message: 'Compte supprimé' };
  }

  async createAdmin(dto: CreateAdminDto): Promise<User> {
    await this.assertPhoneFree(dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.userRepo.create({
      phone: dto.phone,
      name:  dto.name,
      passwordHash,
      role:  UserRole.ADMIN,
    });
    return this.userRepo.save(admin);
  }

  private async assertPhoneFree(phone: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing) throw new ConflictException('Un compte avec ce numéro existe déjà');
  }

  // La plateforme doit toujours garder au moins un administrateur capable de se connecter
  private async assertNotLastActiveAdmin(id: string): Promise<void> {
    const otherActiveAdmins = await this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role AND user.isActive = true AND user.deletedAt IS NULL AND user.id != :id', {
        role: UserRole.ADMIN,
        id,
      })
      .getCount();
    if (otherActiveAdmins === 0) {
      throw new BadRequestException('Impossible : c\'est le dernier administrateur actif');
    }
  }

  private async revokeSessions(ownerId: string): Promise<void> {
    await this.userRepo.manager
      .getRepository(RefreshToken)
      .update({ ownerId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
