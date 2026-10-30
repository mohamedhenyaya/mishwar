import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';
import { blockedMessage, stillBlocked } from '../../../common/utils/account-block.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Accès refusé pour ce rôle');
    }

    // Un access token reste valide jusqu'à son expiration : pour les routes d'administration,
    // on revérifie en base qu'un admin bloqué, supprimé ou rétrogradé perd l'accès immédiatement
    if (user.role === UserRole.ADMIN) {
      const admin = await this.dataSource.getRepository(User).findOne({
        where: { id: user.sub },
        select: { id: true, role: true, isActive: true, blockedReason: true, blockedUntil: true, deletedAt: true },
      });
      if (!admin || admin.role !== UserRole.ADMIN || admin.deletedAt) {
        throw new UnauthorizedException('Compte administrateur désactivé');
      }
      if (await stillBlocked(this.dataSource.manager, User, admin)) {
        throw new UnauthorizedException(blockedMessage(admin));
      }
    }
    return true;
  }
}
