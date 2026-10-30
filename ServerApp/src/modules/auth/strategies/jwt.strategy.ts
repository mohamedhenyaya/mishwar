import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity';
import { User } from '../../users/entities/user.entity';
import { blockedMessage, stillBlocked } from '../../../common/utils/account-block.util';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly dataSource: DataSource) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'vtc-dev-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) throw new UnauthorizedException('Token invalide');

    // Un access token reste valide jusqu'à son expiration : on revérifie le compte à chaque
    // requête pour qu'un capitaine ou client bloqué (ou supprimé) perde l'accès immédiatement.
    // Les admins sont revérifiés dans RolesGuard (rôle compris).
    const entity = payload.role === 'driver' ? Driver : payload.role === 'user' ? User : null;
    if (entity) {
      const account = await this.dataSource.getRepository<Driver | User>(entity).findOne({
        where: { id: payload.sub },
        select: { id: true, isActive: true, blockedReason: true, blockedUntil: true, deletedAt: true },
      });
      if (!account || account.deletedAt) throw new UnauthorizedException('Compte supprimé');
      if (await stillBlocked(this.dataSource.manager, entity, account)) {
        throw new UnauthorizedException(blockedMessage(account));
      }
    }
    return payload;
  }
}