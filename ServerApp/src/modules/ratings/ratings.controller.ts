import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { RateRideDto } from './dto/rate-ride.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post(':id/rate')
  @Roles('user')
  @ApiOperation({ summary: 'Le rider note le chauffeur après une course terminée' })
  rateDriver(
    @Param('id') id: string,
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: RateRideDto,
  ) {
    return this.ratingsService.rateDriver(id, jwt.sub, dto);
  }

  @Post(':id/rate-rider')
  @Roles('driver')
  @ApiOperation({ summary: 'Le chauffeur note le rider après une course terminée' })
  rateRider(
    @Param('id') id: string,
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: RateRideDto,
  ) {
    return this.ratingsService.rateRider(id, jwt.sub, dto);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Avis liés à une course (accessible aux 2 participants)' })
  getRideReviews(@Param('id') id: string, @CurrentUser() jwt: JwtPayload) {
    return this.ratingsService.getRideReviews(id, jwt);
  }
}
