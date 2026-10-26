import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PromotionsService } from './promotions.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AdminCouponsQueryDto } from './dto/admin-coupons-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCouponsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer un coupon' })
  async create(@CurrentUser() admin: JwtPayload, @Body() dto: CreateCouponDto) {
    const coupon = await this.promotionsService.create(dto);
    await this.auditLogService.log(admin.sub, 'coupon.create', 'Coupon', coupon.id, { code: dto.code });
    return coupon;
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des coupons, filtrable par statut/code' })
  findAll(@Query() query: AdminCouponsQueryDto) {
    return this.promotionsService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un coupon' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findByIdForAdmin(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un coupon' })
  async update(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    const coupon = await this.promotionsService.update(id, dto);
    await this.auditLogService.log(admin.sub, 'coupon.update', 'Coupon', id);
    return coupon;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un coupon (ne le supprime pas, préserve l\'historique des rédemptions)' })
  async remove(@CurrentUser() admin: JwtPayload, @Param('id') id: string) {
    const coupon = await this.promotionsService.remove(id);
    await this.auditLogService.log(admin.sub, 'coupon.deactivate', 'Coupon', id);
    return coupon;
  }
}
