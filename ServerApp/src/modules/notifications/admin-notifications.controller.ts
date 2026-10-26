import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('admin-notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Envoyer une notification à un/des utilisateur(s) ou chauffeur(s) précis, ou en diffusion (tous les users, tous les drivers, ou tout le monde)',
    description: 'Persistée par destinataire (traçable côté dashboard) et poussée en temps réel via WebSocket (événement "notification:new") aux destinataires connectés.',
  })
  send(@CurrentUser() admin: JwtPayload, @Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto, admin.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Historique de toutes les notifications envoyées (toutes cibles confondues)' })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.notificationsService.findAllSent(pagination);
  }
}
