import { CheckOtpDto } from './dto/check-otp.dto';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { AdminBootstrapDto } from './dto/admin-bootstrap.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Inscription étape 1 — envoyer OTP
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // Inscription — vérifie le code reçu avant de passer aux étapes suivantes (ne le consomme pas)
  @Post('register/check-otp')
  @HttpCode(HttpStatus.OK)
  checkRegisterOtp(@Body() dto: CheckOtpDto) {
    return this.authService.checkRegisterOtp(dto.phone, dto.code);
  }

  // Inscription étape 2 — vérifier OTP + définir le mot de passe → JWT
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto);
  }

  // Connexion — téléphone + mot de passe → JWT
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Amorçage — crée le tout premier compte admin (une seule fois, secret requis)
  @Post('admin/bootstrap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Créer le tout premier compte administrateur',
    description: 'Réservé à la mise en route de la plateforme. Nécessite ADMIN_BOOTSTRAP_SECRET et échoue si un admin existe déjà — utilisez ensuite POST /admin/users/admins en tant qu\'admin authentifié.',
  })
  bootstrapAdmin(@Body() dto: AdminBootstrapDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  // Rafraîchit le couple access/refresh token (rotation : l'ancien refresh token est révoqué)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  // Révoque tous les refresh tokens actifs de l'utilisateur connecté
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user);
  }

  // Mot de passe oublié étape 1 — envoie un OTP (réutilise sendOtp)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Mot de passe oublié étape 2 — vérifie l'OTP et définit le nouveau mot de passe
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}