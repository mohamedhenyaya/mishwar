import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRideDto } from './dto/create-ride.dto';
import { RidesService } from './rides.service';

interface JwtUser {
  sub: string;
  phone: string;
  role: string;
}

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(user.sub, dto);
  }

  @Get('my')
  myRides(@CurrentUser() user: JwtUser) {
    return this.ridesService.findByUser(user.sub);
  }
}