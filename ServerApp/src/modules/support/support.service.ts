import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  SupportTicket,
  TicketParticipantType,
  TicketStatus,
} from './entities/support-ticket.entity';
import { MessageSenderType, SupportTicketMessage } from './entities/support-ticket-message.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { MyTicketsQueryDto } from './dto/my-tickets-query.dto';
import { AdminTicketsQueryDto } from './dto/admin-tickets-query.dto';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
import { loadParties, PartySummary } from '../../common/utils/admin-parties.util';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage)
    private readonly messageRepo: Repository<SupportTicketMessage>,
    private readonly geolocationGateway: GeolocationGateway,
  ) {}

  async createTicket(jwt: JwtPayload, dto: CreateTicketDto): Promise<SupportTicket> {
    const requesterType = jwt.role as TicketParticipantType;

    const ticket = this.ticketRepo.create({
      requesterType,
      requesterId: jwt.sub,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority,
      relatedRideId: dto.relatedRideId ?? null,
    });
    await this.ticketRepo.save(ticket);

    const message = this.messageRepo.create({
      ticketId: ticket.id,
      senderType: jwt.role as MessageSenderType,
      senderId: jwt.sub,
      message: dto.message,
    });
    await this.messageRepo.save(message);

    return ticket;
  }

  async findMyTickets(
    jwt: JwtPayload,
    query: MyTicketsQueryDto,
  ): Promise<PaginatedResult<SupportTicket>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.ticketRepo.findAndCount({
      where: {
        requesterType: jwt.role as TicketParticipantType,
        requesterId: jwt.sub,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findByIdForParticipant(
    id: string,
    jwt: JwtPayload,
  ): Promise<{ ticket: SupportTicket; messages: SupportTicketMessage[]; requester?: PartySummary | null }> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket non trouvé');

    this.assertAccess(ticket, jwt);

    const messages = await this.messageRepo.find({
      where: { ticketId: id },
      order: { createdAt: 'ASC' },
    });

    if (jwt.role !== 'admin') return { ticket, messages };

    // Back-office : identité du demandeur affichée en tête de la conversation
    const party = await loadParties(this.ticketRepo.manager, [{ type: ticket.requesterType, id: ticket.requesterId }]);
    return { ticket, messages, requester: party(ticket.requesterType, ticket.requesterId) };
  }

  async addMessage(
    id: string,
    jwt: JwtPayload,
    dto: AddMessageDto,
  ): Promise<SupportTicketMessage> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket non trouvé');

    this.assertAccess(ticket, jwt);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException('Ce ticket est fermé');
    }

    const message = this.messageRepo.create({
      ticketId: id,
      senderType: jwt.role as MessageSenderType,
      senderId: jwt.sub,
      message: dto.message,
    });
    await this.messageRepo.save(message);

    if (jwt.role === 'admin' && ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepo.save(ticket);
    }

    if (jwt.role === 'admin') {
      this.geolocationGateway.notifyCustom(
        `${ticket.requesterType}:${ticket.requesterId}`,
        'support:message',
        { ticketId: ticket.id, message: dto.message },
      );
    }

    return message;
  }

  async closeTicket(id: string, jwt: JwtPayload): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket non trouvé');

    this.assertAccess(ticket, jwt);

    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();
    return this.ticketRepo.save(ticket);
  }

  async findAllForAdmin(
    query: AdminTicketsQueryDto,
  ): Promise<PaginatedResult<SupportTicket & { requester: PartySummary | null }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.ticketRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.category) qb.andWhere('t.category = :category', { category: query.category });

    const [tickets, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const party = await loadParties(
      this.ticketRepo.manager,
      tickets.map((t) => ({ type: t.requesterType, id: t.requesterId })),
    );
    const data = tickets.map((t) => ({ ...t, requester: party(t.requesterType, t.requesterId) }));
    return { data, total, page, limit };
  }

  async updateStatusByAdmin(id: string, dto: UpdateTicketStatusDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket non trouvé');

    if (dto.status) {
      ticket.status = dto.status;
      if (dto.status === TicketStatus.CLOSED) ticket.closedAt = new Date();
    }
    if (dto.priority) ticket.priority = dto.priority;

    return this.ticketRepo.save(ticket);
  }

  private assertAccess(ticket: SupportTicket, jwt: JwtPayload): void {
    if (jwt.role === 'admin') return;
    if (ticket.requesterType === (jwt.role as TicketParticipantType) && ticket.requesterId === jwt.sub) {
      return;
    }
    throw new ForbiddenException('Accès refusé à ce ticket');
  }
}
