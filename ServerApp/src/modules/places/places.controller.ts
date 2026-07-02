import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('autocomplete')
  @ApiOperation({ summary: 'Suggestions de lieux pendant la frappe (Google Places Autocomplete)' })
  autocomplete(@Query() dto: AutocompleteQueryDto) {
    return this.placesService.autocomplete(dto.input, dto.lat, dto.lng);
  }
}
