import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { ReverseGeocodeQueryDto } from './dto/reverse-geocode-query.dto';
import { CreateFavoritePlaceDto } from './dto/create-favorite-place.dto';
import { UpdateFavoritePlaceDto } from './dto/update-favorite-place.dto';
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

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Adresse correspondant à des coordonnées GPS (Google Geocoding)' })
  reverseGeocode(@Query() query: ReverseGeocodeQueryDto) {
    return this.placesService.reverseGeocode(query.lat, query.lng);
  }

  @Post('favorites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Ajouter un lieu favori' })
  addFavorite(@CurrentUser() user: JwtPayload, @Body() dto: CreateFavoritePlaceDto) {
    return this.placesService.addFavorite(user.sub, dto);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Lister mes lieux favoris' })
  listFavorites(@CurrentUser() user: JwtPayload) {
    return this.placesService.listFavorites(user.sub);
  }

  @Patch('favorites/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Modifier un lieu favori' })
  updateFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFavoritePlaceDto,
  ) {
    return this.placesService.updateFavorite(id, user.sub, dto);
  }

  @Delete('favorites/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'driver')
  @ApiOperation({ summary: 'Supprimer un lieu favori' })
  removeFavorite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.placesService.removeFavorite(id, user.sub);
  }
}
