import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CouponType } from '../entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Code unique du coupon' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 10, description: 'Pourcentage (0-100) pour PERCENT, montant fixe pour FIXED' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Plafond de remise (applicable uniquement au type PERCENT)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Montant minimum de la course pour que le coupon soit applicable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minRideAmount?: number;

  @ApiPropertyOptional({ description: 'Nombre total d\'utilisations autorisées, illimité si non renseigné' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Nombre d\'utilisations autorisées par utilisateur, illimité si non renseigné' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerUser?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  validTo: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
