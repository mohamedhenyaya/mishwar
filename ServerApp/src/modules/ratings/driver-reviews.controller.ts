import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { DriverReviewsQueryDto } from './dto/driver-reviews-query.dto';

@ApiTags('reviews')
@Controller('drivers')
export class DriverReviewsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Avis publics reçus par un chauffeur (paginé)' })
  getDriverReviews(@Param('id') id: string, @Query() query: DriverReviewsQueryDto) {
    return this.ratingsService.getDriverReviews(id, query);
  }
}
