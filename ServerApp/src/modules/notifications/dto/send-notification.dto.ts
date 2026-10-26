import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export enum NotificationTargetType {
  SPECIFIC_USERS   = 'specific_users',
  SPECIFIC_DRIVERS = 'specific_drivers',
  ALL_USERS        = 'all_users',
  ALL_DRIVERS      = 'all_drivers',
  ALL              = 'all',
}

export class SendNotificationDto {
  @ApiProperty({
    enum: NotificationTargetType,
    description: 'Portée de la notification. "specific_users"/"specific_drivers" nécessitent targetIds.',
  })
  @IsEnum(NotificationTargetType)
  targetType: NotificationTargetType;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs des destinataires — requis uniquement pour specific_users / specific_drivers',
  })
  @ValidateIf((o) => o.targetType === NotificationTargetType.SPECIFIC_USERS || o.targetType === NotificationTargetType.SPECIFIC_DRIVERS)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  targetIds?: string[];

  @ApiProperty({ example: 'Maintenance prévue' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Le service sera interrompu ce soir de 23h à 00h pour maintenance.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
