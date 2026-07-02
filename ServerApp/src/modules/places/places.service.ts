import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

const GOOGLE_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const BIAS_RADIUS_METERS = 20_000;

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
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
}
