import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminReviewsController {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée et filtrable de tous les avis' })
  findAll(@Query() query: AdminReviewsQueryDto) {
    return this.ratingsService.findAllForAdmin(query);
  }

  @Patch(':id/hide')
  @ApiOperation({ summary: 'Masquer un avis (modération)' })
  async hide(@CurrentUser() admin: JwtPayload, @Param('id') id: string) {
    const review = await this.ratingsService.hideReview(id);
    await this.auditLogService.log(admin.sub, 'review.hide', 'Review', id);
    return review;
  }
}
