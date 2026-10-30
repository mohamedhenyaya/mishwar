import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminResetPasswordDto } from '../../common/dto/admin-reset-password.dto';
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
  @ApiOperation({ summary: 'Liste paginée des utilisateurs, filtrable par rôle/actif/recherche' })
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.usersService.findAllPaginated(query);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un compte client directement (sans passer par l\'inscription OTP)' })
  async create(@CurrentUser() admin: JwtPayload, @Body() dto: CreateUserByAdminDto) {
    const created = await this.usersService.createByAdmin(dto);
    await this.auditLogService.log(admin.sub, 'user.create', 'User', created.id, { phone: dto.phone });
    return created;
  }

  @Post('admins')
  @ApiOperation({ summary: 'Créer un nouvel administrateur (réservé aux admins déjà authentifiés)' })
  async createAdmin(@CurrentUser() admin: JwtPayload, @Body() dto: CreateAdminDto) {
    const created = await this.usersService.createAdmin(dto);
    await this.auditLogService.log(admin.sub, 'user.createAdmin', 'User', created.id, { phone: dto.phone });
    return created;
  }

  // Déclaré avant les routes ':id' pour que « me » ne soit pas pris pour un identifiant
  @Patch('me/password')
  @ApiOperation({ summary: 'Changer son propre mot de passe administrateur' })
  async changeOwnPassword(@CurrentUser() admin: JwtPayload, @Body() dto: ChangeOwnPasswordDto) {
    const result = await this.usersService.changeOwnPassword(admin.sub, dto.currentPassword, dto.newPassword);
    await this.auditLogService.log(admin.sub, 'user.changeOwnPassword', 'User', admin.sub);
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur + statistiques de courses' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le profil d\'un utilisateur' })
  async update(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    await this.auditLogService.log(admin.sub, 'user.update', 'User', id, { ...dto });
    return user;
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquer un utilisateur — empêche toute connexion future et révoque ses sessions' })
  async block(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BlockUserDto) {
    const user = await this.usersService.block(id, dto.reason, admin.sub, dto.durationMinutes);
    await this.auditLogService.log(admin.sub, 'user.block', 'User', id, { reason: dto.reason, durationMinutes: dto.durationMinutes ?? null });
    return user;
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un utilisateur' })
  async unblock(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.unblock(id);
    await this.auditLogService.log(admin.sub, 'user.unblock', 'User', id);
    return user;
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Définir un nouveau mot de passe pour un utilisateur (révoque ses sessions)' })
  async resetPassword(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    const result = await this.usersService.resetPasswordByAdmin(id, dto.newPassword);
    await this.auditLogService.log(admin.sub, 'user.resetPassword', 'User', id);
    return result;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un compte utilisateur',
    description: 'Anonymise le compte (nom, téléphone, email, photo) et le désactive. L\'historique des courses et transactions est conservé. Refusé si une course est en cours.',
  })
  async remove(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.usersService.softDelete(id, admin.sub);
    await this.auditLogService.log(admin.sub, 'user.delete', 'User', id);
    return result;
  }
}
