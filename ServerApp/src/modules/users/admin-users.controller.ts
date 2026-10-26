import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des utilisateurs (riders), filtrable par actif/recherche' })
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.usersService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur + statistiques de courses' })
  getOne(@Param('id') id: string) {
    return this.usersService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le profil d\'un utilisateur' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquer un utilisateur — empêche toute connexion future' })
  async block(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: BlockUserDto) {
    const user = await this.usersService.block(id, dto.reason);
    await this.auditLogService.log(admin.sub, 'user.block', 'User', id, { reason: dto.reason });
    return user;
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un utilisateur' })
  async unblock(@CurrentUser() admin: JwtPayload, @Param('id') id: string) {
    const user = await this.usersService.unblock(id);
    await this.auditLogService.log(admin.sub, 'user.unblock', 'User', id);
    return user;
  }

  @Post('admins')
  @ApiOperation({ summary: 'Créer un nouvel administrateur (réservé aux admins déjà authentifiés)' })
  async createAdmin(@CurrentUser() admin: JwtPayload, @Body() dto: CreateAdminDto) {
    const created = await this.usersService.createAdmin(dto);
    await this.auditLogService.log(admin.sub, 'user.createAdmin', 'User', created.id, { phone: dto.phone });
    return created;
  }
}
