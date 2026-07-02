import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { NotificationRecipientType } from './entities/notification.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'driver')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Notifications reçues par le compte connecté (user ou driver)' })
  getMine(@CurrentUser() jwt: JwtPayload, @Query() pagination: PaginationQueryDto) {
    const type = jwt.role === 'driver' ? NotificationRecipientType.DRIVER : NotificationRecipientType.USER;
    return this.notificationsService.findForRecipient(type, jwt.sub, pagination);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markRead(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const type = jwt.role === 'driver' ? NotificationRecipientType.DRIVER : NotificationRecipientType.USER;
    return this.notificationsService.markRead(id, type, jwt.sub);
  }
}
