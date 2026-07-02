import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { Notification, NotificationRecipientType } from './entities/notification.entity';
import { SendNotificationDto, NotificationTargetType } from './dto/send-notification.dto';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly geolocationGateway: GeolocationGateway,
  ) {}

  async send(dto: SendNotificationDto, adminId: string): Promise<{ sent: number }> {
    const recipients = await this.resolveRecipients(dto);
    if (recipients.length === 0) return { sent: 0 };

    const rows = recipients.map((r) =>
      this.notificationRepo.create({
        recipientType:    r.type,
        recipientId:      r.id,
        title:            dto.title,
        body:             dto.body,
        createdByAdminId: adminId,
      }),
    );
    await this.notificationRepo.save(rows);

    for (const r of recipients) {
      this.geolocationGateway.notifyCustom(`${r.type}:${r.id}`, 'notification:new', {
        title:     dto.title,
        body:      dto.body,
        createdAt: new Date().toISOString(),
      });
    }

    return { sent: recipients.length };
  }

  private async resolveRecipients(
    dto: SendNotificationDto,
  ): Promise<{ type: NotificationRecipientType; id: string }[]> {
    switch (dto.targetType) {
      case NotificationTargetType.SPECIFIC_USERS:
        return (dto.targetIds ?? []).map((id) => ({ type: NotificationRecipientType.USER, id }));

      case NotificationTargetType.SPECIFIC_DRIVERS:
        return (dto.targetIds ?? []).map((id) => ({ type: NotificationRecipientType.DRIVER, id }));

      case NotificationTargetType.ALL_USERS: {
        const users = await this.userRepo.find({ select: ['id'] });
        return users.map((u) => ({ type: NotificationRecipientType.USER, id: u.id }));
      }

      case NotificationTargetType.ALL_DRIVERS: {
        const drivers = await this.driverRepo.find({ select: ['id'] });
        return drivers.map((d) => ({ type: NotificationRecipientType.DRIVER, id: d.id }));
      }

      case NotificationTargetType.ALL: {
        const [users, drivers] = await Promise.all([
          this.userRepo.find({ select: ['id'] }),
          this.driverRepo.find({ select: ['id'] }),
        ]);
        return [
          ...users.map((u) => ({ type: NotificationRecipientType.USER, id: u.id })),
          ...drivers.map((d) => ({ type: NotificationRecipientType.DRIVER, id: d.id })),
        ];
      }

      default:
        return [];
    }
  }

  async findForRecipient(
    recipientType: NotificationRecipientType,
    recipientId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Notification>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.notificationRepo.findAndCount({
      where: { recipientType, recipientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async markRead(
    id: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<void> {
    const result = await this.notificationRepo.update(
      { id, recipientType, recipientId },
      { isRead: true },
    );
    if (!result.affected) throw new NotFoundException('Notification non trouvée');
  }

  async findAllSent(pagination: PaginationQueryDto): Promise<PaginatedResult<Notification>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.notificationRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
