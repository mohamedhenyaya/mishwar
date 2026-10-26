import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponType } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AdminCouponsQueryDto } from './dto/admin-coupons-query.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionRepo: Repository<CouponRedemption>,
  ) {}

  // ── CRUD admin ────────────────────────────────────────────────────────

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponRepo.create({
      ...dto,
      validFrom: new Date(dto.validFrom),
      validTo: new Date(dto.validTo),
    });
    return this.couponRepo.save(coupon);
  }

  async findAllForAdmin(query: AdminCouponsQueryDto): Promise<PaginatedResult<Coupon>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.couponRepo.createQueryBuilder('c').orderBy('c.createdAt', 'DESC');
    if (query.isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive: query.isActive === 'true' });
    if (query.code) qb.andWhere('c.code = :code', { code: query.code });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async findByIdForAdmin(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon introuvable');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findByIdForAdmin(id);
    Object.assign(coupon, {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : coupon.validFrom,
      validTo: dto.validTo ? new Date(dto.validTo) : coupon.validTo,
    });
    return this.couponRepo.save(coupon);
  }

  // Désactive le coupon plutôt que de le supprimer, pour ne jamais casser l'historique des rédemptions
  async remove(id: string): Promise<Coupon> {
    const coupon = await this.findByIdForAdmin(id);
    coupon.isActive = false;
    return this.couponRepo.save(coupon);
  }

  // ── Calcul de la remise ──────────────────────────────────────────────

  computeDiscount(coupon: Coupon, rideAmount: number): number {
    let raw: number;
    if (coupon.type === CouponType.PERCENT) {
      raw = rideAmount * (Number(coupon.value) / 100);
      if (coupon.maxDiscount != null) raw = Math.min(raw, Number(coupon.maxDiscount));
    } else {
      raw = Number(coupon.value);
    }
    raw = Math.min(raw, rideAmount);
    return Math.round(raw * 100) / 100;
  }

  // ── Validation ────────────────────────────────────────────────────────

  async validateCouponForUser(
    code: string,
    userId: string,
    rideAmount: number,
  ): Promise<{ coupon: Coupon; discountAmount: number }> {
    const coupon = await this.couponRepo.findOne({ where: { code } });
    if (!coupon) throw new NotFoundException('Coupon introuvable');

    if (!coupon.isActive) throw new BadRequestException('Ce coupon n\'est plus valide');

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      throw new BadRequestException('Ce coupon n\'est plus valide');
    }

    if (coupon.minRideAmount != null && rideAmount < Number(coupon.minRideAmount)) {
      throw new BadRequestException(
        `Ce coupon nécessite un montant de course minimum de ${Number(coupon.minRideAmount)}`,
      );
    }

    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Ce coupon a atteint sa limite d\'utilisation');
    }

    if (coupon.usageLimitPerUser != null) {
      const userUsageCount = await this.redemptionRepo.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.usageLimitPerUser) {
        throw new BadRequestException('Vous avez déjà utilisé ce coupon le nombre maximum de fois autorisé');
      }
    }

    const discountAmount = this.computeDiscount(coupon, rideAmount);
    return { coupon, discountAmount };
  }

  async previewValidation(
    dto: ValidateCouponDto,
    userId: string,
  ): Promise<{ valid: true; discountAmount: number; code: string }> {
    const { coupon, discountAmount } = await this.validateCouponForUser(dto.code, userId, dto.rideAmount);
    return { valid: true, discountAmount, code: coupon.code };
  }

  // ── Rédemption (appelée par RidesModule à la complétion d'une course) ──

  async redeem(
    code: string,
    userId: string,
    rideId: string | null,
    rideAmount: number,
  ): Promise<{ discountAmount: number }> {
    const { coupon, discountAmount } = await this.validateCouponForUser(code, userId, rideAmount);

    await this.couponRepo.manager.transaction(async (manager) => {
      await manager.getRepository(Coupon).update(coupon.id, { usedCount: coupon.usedCount + 1 });

      const redemption = manager.getRepository(CouponRedemption).create({
        couponId: coupon.id,
        userId,
        rideId,
        discountAmount,
      });
      await manager.getRepository(CouponRedemption).save(redemption);
    });

    return { discountAmount };
  }

  // ── Historique des rédemptions de l'utilisateur connecté ───────────────

  async getMyRedemptions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<CouponRedemption>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.redemptionRepo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .orderBy('r.createdAt', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
