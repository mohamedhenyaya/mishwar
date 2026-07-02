import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { WalletService } from './wallet.service';
import { AdjustWalletDto } from './dto/adjust-wallet.dto';
import { WalletTransactionsQueryDto } from './dto/wallet-transactions-query.dto';

@ApiTags('admin-wallet')
@ApiBearerAuth()
@Controller('admin/wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('adjust')
  @ApiOperation({
    summary: 'Créditer ou débiter le solde d\'un user ou d\'un driver',
    description: 'Montant positif = ajout de crédit (recharge). Montant négatif = débit/correction manuelle. Chaque ajustement est tracé dans le ledger de transactions.',
  })
  adjust(@CurrentUser() admin: JwtPayload, @Body() dto: AdjustWalletDto) {
    return this.walletService.adjust(dto.ownerType, dto.ownerId, dto.amount, dto.note, admin.sub);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique complet des transactions (tous comptes), filtrable par type/compte' })
  getTransactions(@Query() query: WalletTransactionsQueryDto) {
    const { ownerType, ownerId, ...pagination } = query;
    return this.walletService.getTransactions({ ownerType, ownerId }, pagination);
  }
}
