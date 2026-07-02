import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

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
  block(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.usersService.block(id, dto.reason);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un utilisateur' })
  unblock(@Param('id') id: string) {
    return this.usersService.unblock(id);
  }

  @Post('admins')
  @ApiOperation({ summary: 'Créer un nouvel administrateur (réservé aux admins déjà authentifiés)' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
  }
}
