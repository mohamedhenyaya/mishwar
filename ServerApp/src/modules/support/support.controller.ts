import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { MyTicketsQueryDto } from './dto/my-tickets-query.dto';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Créer un ticket de support (avec le premier message)' })
  create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(jwt, dto);
  }

  @Get('my')
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Lister mes tickets de support' })
  findMine(@CurrentUser() jwt: JwtPayload, @Query() query: MyTicketsQueryDto) {
    return this.supportService.findMyTickets(jwt, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un ticket (propriétaire ou admin) avec ses messages' })
  findOne(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    return this.supportService.findByIdForParticipant(id, jwt);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Ajouter un message à un ticket (propriétaire ou admin)' })
  addMessage(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(id, jwt, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Fermer un ticket (propriétaire ou admin)' })
  close(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    return this.supportService.closeTicket(id, jwt);
  }
}
