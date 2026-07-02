import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PromotionsService } from './promotions.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class CouponsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Vérifier la validité d\'un coupon pour une course (aperçu, ne consomme pas le coupon)' })
  validate(@CurrentUser() jwt: JwtPayload, @Body() dto: ValidateCouponDto) {
    return this.promotionsService.previewValidation(dto, jwt.sub);
  }

  @Get('my-redemptions')
  @ApiOperation({ summary: 'Historique des coupons utilisés par l\'utilisateur connecté' })
  getMyRedemptions(@CurrentUser() jwt: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.promotionsService.getMyRedemptions(jwt.sub, query);
  }
}
