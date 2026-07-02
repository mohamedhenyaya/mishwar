import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TicketCategory, TicketPriority } from '../entities/support-ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ example: 'Problème de facturation sur ma dernière course' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ enum: TicketCategory })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'ID de la course concernée, si applicable' })
  @IsOptional()
  @IsUUID()
  relatedRideId?: string;

  @ApiProperty({ example: "J'ai été facturé deux fois pour la même course." })
  @IsString()
  @IsNotEmpty()
  message: string;
}
