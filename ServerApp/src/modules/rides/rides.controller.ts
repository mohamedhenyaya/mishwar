import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
<<<<<<< HEAD
import { RateRideDto } from './dto/rate-ride.dto';
=======
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { DriverCancelRideDto } from './dto/driver-cancel-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
import { RidesService } from './rides.service';
import { TARIFF } from './utils/pricing.util';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @Roles('user')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(user.sub, dto);
  }

  @Post('estimate')
  @Roles('user')
  estimate(@Body() dto: EstimateRideDto) {
    return this.ridesService.estimateRide(dto);
  }

  @Post('scheduled')
  @Roles('user')
  createScheduled(@CurrentUser() user: JwtPayload, @Body() dto: CreateScheduledRideDto) {
    return this.ridesService.createScheduledRide(user.sub, dto);
  }

  @Get('scheduled/my')
  @Roles('user')
  myScheduledRides(@CurrentUser() user: JwtPayload) {
    return this.ridesService.findScheduledByUser(user.sub);
  }

  @Patch('scheduled/:id')
  @Roles('user')
  updateScheduled(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledRideDto,
  ) {
    return this.ridesService.updateScheduledRide(id, user.sub, dto);
  }

  @Delete('scheduled/:id')
  @Roles('user')
  cancelScheduled(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.cancelScheduledRide(id, user.sub);
  }

  @Get('my')
  @Roles('user')
  myRides(@CurrentUser() user: JwtPayload) {
    return this.ridesService.findByUser(user.sub);
  }

<<<<<<< HEAD
  // Déclarés avant :id pour ne pas être capturés comme identifiant
  @Get('tariff')
  tariff() {
    return TARIFF;
  }

  @Get('active')
  active(@CurrentUser() user: JwtPayload) {
    return this.ridesService.findActive(user);
=======
  @Get('leaderboard')
  @Roles('user')
  leaderboard(@CurrentUser() user: JwtPayload, @Query() dto: LeaderboardQueryDto) {
    return this.ridesService.getLeaderboard(dto.period, user.sub);
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.findByIdForParticipant(id, user);
  }

  @Get(':id/receipt')
  receipt(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.getReceipt(id, user);
  }

  @Post(':id/accept')
  @Roles('driver')
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.acceptRide(id, user.sub);
  }

  @Post(':id/reject')
  @Roles('driver')
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.rejectRide(id, user.sub);
  }

  @Post(':id/arrive')
  @Roles('driver')
  arrive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.arriveRide(id, user.sub);
  }

  @Post(':id/rate')
  rate(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RateRideDto) {
    return this.ridesService.rateRide(id, user, dto.rating);
  }

  @Post(':id/start')
  @Roles('driver')
  start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.startRide(id, user.sub);
  }

  @Post(':id/complete')
  @Roles('driver')
  complete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CompleteRideDto,
  ) {
    return this.ridesService.completeRide(id, user.sub, dto);
  }

  @Post(':id/cancel')
  @Roles('user')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CancelRideDto) {
    return this.ridesService.cancelRide(id, user.sub, dto.reason);
  }

  @Post(':id/driver-cancel')
  @Roles('driver')
  driverCancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DriverCancelRideDto,
  ) {
    return this.ridesService.driverCancelRide(id, user.sub, dto);
  }

  @Post(':id/driver-cancel')
  @Roles('driver')
  driverCancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.cancelRideByDriver(id, user.sub);
  }
}
