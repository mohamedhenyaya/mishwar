import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (config: ConfigService): JwtModuleOptions => ({
  secret:      config.get<string>('JWT_SECRET', 'vtc-dev-secret'),
  signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
});