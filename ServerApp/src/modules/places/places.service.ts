import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoritePlace } from './entities/favorite-place.entity';
import { CreateFavoritePlaceDto } from './dto/create-favorite-place.dto';
import { UpdateFavoritePlaceDto } from './dto/update-favorite-place.dto';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

interface GooglePlacePrediction {
  placeId: string;
  text?: { text: string };
  structuredFormat?: {
    mainText?: { text: string };
    secondaryText?: { text: string };
  };
}

interface GoogleAutocompleteResponse {
  suggestions?: { placePrediction?: GooglePlacePrediction }[];
}

interface GoogleGeocodeResult {
  formatted_address: string;
  place_id: string;
}

interface GoogleGeocodeResponse {
  results?: GoogleGeocodeResult[];
}

interface GooglePlaceDetailsResponse {
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

const GOOGLE_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const BIAS_RADIUS_METERS = 20_000;

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FavoritePlace)
    private readonly favoritePlaceRepo: Repository<FavoritePlace>,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY', '');
  }

  async autocomplete(input: string, lat?: number, lng?: number): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY non configurée — autocomplete désactivé');
      return [];
    }

    const body: Record<string, unknown> = {
      input,
      languageCode: 'fr',
    };

    if (lat != null && lng != null) {
      body.locationBias = {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: BIAS_RADIUS_METERS,
        },
      };
    }

    let res: Response;
    try {
      res = await fetch(GOOGLE_AUTOCOMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      this.logger.error(`Appel Google Places échoué: ${err.message}`);
      throw new ServiceUnavailableException('Recherche de lieux indisponible');
    }

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`Google Places autocomplete a répondu ${res.status}: ${errBody}`);
      throw new ServiceUnavailableException('Recherche de lieux indisponible');
    }

    const data = (await res.json()) as GoogleAutocompleteResponse;

    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is GooglePlacePrediction => !!p)
      .map((p) => ({
        placeId:        p.placeId,
        mainText:       p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondaryText:  p.structuredFormat?.secondaryText?.text ?? '',
        description:    p.text?.text ?? '',
      }));
  }

  async placeDetails(placeId: string): Promise<{ formattedAddress: string; latitude: number; longitude: number } | null> {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY non configurée — place details désactivé');
      return null;
    }

    let res: Response;
    try {
      res = await fetch(`${GOOGLE_PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress',
        },
      });
    } catch (err: any) {
      this.logger.error(`Appel Google Place Details échoué: ${err.message}`);
      throw new ServiceUnavailableException('Détails du lieu indisponibles');
    }

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`Google Place Details a répondu ${res.status}: ${errBody}`);
      throw new ServiceUnavailableException('Détails du lieu indisponibles');
    }

    const data = (await res.json()) as GooglePlaceDetailsResponse;
    if (!data.location) return null;

    return {
      formattedAddress: data.formattedAddress ?? '',
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; placeId?: string } | null> {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY non configurée — reverse-geocode désactivé');
      return null;
    }

    const url = `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lng}&key=${this.apiKey}&language=fr`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err: any) {
      this.logger.error(`Appel Google Geocoding échoué: ${err.message}`);
      throw new ServiceUnavailableException('Géocodage inversé indisponible');
    }

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`Google Geocoding a répondu ${res.status}: ${errBody}`);
      throw new ServiceUnavailableException('Géocodage inversé indisponible');
    }

    const data = (await res.json()) as GoogleGeocodeResponse;
    const result = data.results?.[0];
    if (!result) return null;

    return {
      formattedAddress: result.formatted_address,
      placeId:          result.place_id,
    };
  }

  // ═══════════════════════════ Lieux favoris ═══════════════════════════════

  async addFavorite(ownerId: string, dto: CreateFavoritePlaceDto): Promise<FavoritePlace> {
    const favorite = this.favoritePlaceRepo.create({
      userId: ownerId,
      ...dto,
    });
    return this.favoritePlaceRepo.save(favorite);
  }

  async listFavorites(ownerId: string): Promise<FavoritePlace[]> {
    return this.favoritePlaceRepo.find({
      where: { userId: ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateFavorite(id: string, ownerId: string, dto: UpdateFavoritePlaceDto): Promise<FavoritePlace> {
    const favorite = await this.findFavoriteOrFail(id);
    if (favorite.userId !== ownerId) {
      throw new ForbiddenException('Ce lieu favori ne vous appartient pas');
    }

    Object.assign(favorite, dto);
    return this.favoritePlaceRepo.save(favorite);
  }

  async removeFavorite(id: string, ownerId: string): Promise<void> {
    const favorite = await this.findFavoriteOrFail(id);
    if (favorite.userId !== ownerId) {
      throw new ForbiddenException('Ce lieu favori ne vous appartient pas');
    }

    await this.favoritePlaceRepo.delete(id);
  }

  private async findFavoriteOrFail(id: string): Promise<FavoritePlace> {
    const favorite = await this.favoritePlaceRepo.findOne({ where: { id } });
    if (!favorite) throw new NotFoundException('Lieu favori introuvable');
    return favorite;
  }
}
