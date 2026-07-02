import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { RidesService } from './rides.service';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @Roles('user')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(user.sub, dto);
  }

  @Get('my')
  @Roles('user')
  myRides(@CurrentUser() user: JwtPayload) {
    return this.ridesService.findByUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.findByIdForParticipant(id, user);
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
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ridesService.cancelRide(id, user.sub);
  }
}
