import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentReviewStatus } from '../entities/vehicle-document.entity';

export class ReviewDocumentDto {
  @ApiProperty({ enum: DocumentReviewStatus })
  @IsEnum(DocumentReviewStatus)
  status: DocumentReviewStatus;

  @ApiPropertyOptional({ example: 'Document valide et lisible' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
