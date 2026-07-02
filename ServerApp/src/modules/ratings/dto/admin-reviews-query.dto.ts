import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ReviewParticipantType } from '../entities/review.entity';

export class AdminReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @ApiPropertyOptional({ enum: ReviewParticipantType })
  @IsOptional()
  @IsEnum(ReviewParticipantType)
  targetType?: ReviewParticipantType;

  @ApiPropertyOptional({ description: 'Filtrer sur les avis masqués/visibles' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHidden?: boolean;
}
