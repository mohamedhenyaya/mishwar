import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { WalletService } from './wallet.service';
import { WalletOwnerType } from './entities/wallet-transaction.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'driver')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Solde du compte connecté (user ou driver)' })
  async getMyBalance(@CurrentUser() jwt: JwtPayload) {
    const ownerType = jwt.role === 'driver' ? WalletOwnerType.DRIVER : WalletOwnerType.USER;
    const balance = await this.walletService.getBalance(ownerType, jwt.sub);
    return { balance };
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Historique des transactions du compte connecté' })
  getMyTransactions(@CurrentUser() jwt: JwtPayload, @Query() pagination: PaginationQueryDto) {
    const ownerType = jwt.role === 'driver' ? WalletOwnerType.DRIVER : WalletOwnerType.USER;
    return this.walletService.getTransactions({ ownerType, ownerId: jwt.sub }, pagination);
  }
}
