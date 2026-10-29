import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { WalletService } from './wallet.service';
import { WalletRequestsService } from './wallet-requests.service';
import { AdjustWalletDto } from './dto/adjust-wallet.dto';
import { WalletTransactionsQueryDto } from './dto/wallet-transactions-query.dto';
import { AdminWalletRequestsQueryDto } from './dto/admin-wallet-requests-query.dto';
import { ReviewWalletRequestDto } from './dto/review-wallet-request.dto';
import { RejectWalletRequestDto } from './dto/reject-wallet-request.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-wallet')
@ApiBearerAuth()
@Controller('admin/wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletRequestsService: WalletRequestsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('adjust')
  @ApiOperation({
    summary: 'Créditer ou débiter le solde d\'un user ou d\'un driver',
    description: 'Montant positif = ajout de crédit (recharge). Montant négatif = débit/correction manuelle. Chaque ajustement est tracé dans le ledger de transactions.',
  })
  async adjust(@CurrentUser() admin: JwtPayload, @Body() dto: AdjustWalletDto) {
    const tx = await this.walletService.adjust(dto.ownerType, dto.ownerId, dto.amount, dto.note, admin.sub);
    await this.auditLogService.log(admin.sub, 'wallet.adjust', dto.ownerType, dto.ownerId, { amount: dto.amount, note: dto.note });
    return tx;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique complet des transactions (tous comptes), filtrable par type/compte' })
  getTransactions(@Query() query: WalletTransactionsQueryDto) {
    const { ownerType, ownerId, type, ...pagination } = query;
    return this.walletService.getTransactionsForAdmin({ ownerType, ownerId, type }, pagination);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Liste des demandes de recharge/retrait, filtrable par statut/type' })
  getRequests(@Query() query: AdminWalletRequestsQueryDto) {
    return this.walletRequestsService.findAllForAdmin(query);
  }

  @Patch('requests/:id/approve')
  @ApiOperation({ summary: 'Approuver une demande de recharge/retrait (applique le mouvement sur le wallet)' })
  async approveRequest(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewWalletRequestDto,
  ) {
    const request = await this.walletRequestsService.approve(id, admin.sub, dto);
    await this.auditLogService.log(admin.sub, 'wallet.request.approve', 'WalletRequest', id);
    return request;
  }

  @Patch('requests/:id/reject')
  @ApiOperation({ summary: 'Rejeter une demande de recharge/retrait (aucun mouvement sur le wallet)' })
  async rejectRequest(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RejectWalletRequestDto,
  ) {
    const request = await this.walletRequestsService.reject(id, admin.sub, dto);
    await this.auditLogService.log(admin.sub, 'wallet.request.reject', 'WalletRequest', id, { reviewNote: dto.reviewNote });
    return request;
  }
}
