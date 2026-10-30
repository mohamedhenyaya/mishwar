import { requireOptionalNativeModule } from 'expo';

export interface RideOfferScreen {
  rideId:      string;
  title:       string;
  body:        string;
  openUrl:     string;
  acceptUrl:   string;
  acceptLabel: string;
  rejectLabel: string;
  timeoutMs:   number;
}

interface IncomingRideNative {
  configure(apiBaseUrl: string, token: string | null): void;
  show(offer: RideOfferScreen): void;
  cancel(rideId: string): void;
  releaseLockScreen(): void;
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): void;
}

// null dans Expo Go et sur iOS : module natif absent (build Android uniquement)
export default requireOptionalNativeModule<IncomingRideNative>('IncomingRide');
