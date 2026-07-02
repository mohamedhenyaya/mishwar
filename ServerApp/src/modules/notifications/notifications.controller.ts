import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { NotificationRecipientType } from './entities/notification.entity';
import { DeviceOwnerType } from './entities/device-token.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
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

  @Post('devices')
  @ApiOperation({ summary: 'Enregistrer (ou mettre à jour) le token push d’un appareil pour le compte connecté' })
  registerDevice(@CurrentUser() jwt: JwtPayload, @Body() dto: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(jwt.role as DeviceOwnerType, jwt.sub, dto);
  }

  @Delete('devices/:token')
  @ApiOperation({ summary: 'Désenregistrer le token push d’un appareil du compte connecté' })
  unregisterDevice(@CurrentUser() jwt: JwtPayload, @Param('token') token: string) {
    return this.notificationsService.unregisterDevice(jwt.sub, token);
  }

  @Get('preferences/me')
  @ApiOperation({ summary: 'Préférences de notification du compte connecté' })
  getPreferences(@CurrentUser() jwt: JwtPayload) {
    return this.notificationsService.getPreferences(jwt.role as DeviceOwnerType, jwt.sub);
  }

  @Patch('preferences/me')
  @ApiOperation({ summary: 'Mettre à jour les préférences de notification du compte connecté' })
  updatePreferences(@CurrentUser() jwt: JwtPayload, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(jwt.role as DeviceOwnerType, jwt.sub, dto);
  }
}
