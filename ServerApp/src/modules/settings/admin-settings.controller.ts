import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lire la configuration tarifaire actuelle (prix/km, prix minimum, commission)' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier la configuration tarifaire — champs partiels acceptés, effectif immédiatement sur les prochaines courses' })
  async updateSettings(@CurrentUser() admin: JwtPayload, @Body() dto: UpdateSettingsDto) {
    const settings = await this.settingsService.updateSettings(dto);
    await this.auditLogService.log(admin.sub, 'settings.update', 'PlatformSettings', settings.id, dto as Record<string, unknown>);
    return settings;
  }
}
