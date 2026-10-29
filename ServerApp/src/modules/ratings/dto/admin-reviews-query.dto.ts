import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  // Lit la valeur brute : la conversion implicite transformerait la chaîne "false" en true
  @Transform(({ obj }) => (obj.isHidden === 'true' || obj.isHidden === true ? true : obj.isHidden === 'false' || obj.isHidden === false ? false : obj.isHidden))
  @IsBoolean()
  isHidden?: boolean;
}
