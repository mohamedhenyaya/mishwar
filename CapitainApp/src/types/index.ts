// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome:    undefined;
  Auth:       { mode: 'register' };
  Login:      undefined;
  Home:       undefined;
  Historique: undefined;
  Parametres: undefined;
  MonCompte:  undefined;
  Profil:     undefined;
};

// ─── Course en temps réel (réponses de l'API /rides) ─────────────────────────

export type ApiRideStatus = 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type VehicleType   = 'sedan' | 'suv' | 'van' | 'moto';

export interface PublicUser {
  id:         string;
  name:       string | null;
  phone:      string;
  photoUrl:   string | null;
  rating:     number;
  totalRides: number;
}

// Profil complet du chauffeur connecté (GET /drivers/me) — decimals Postgres en string
export interface DriverProfile {
  id:           string;
  name:         string | null;
  phone:        string;
  photoUrl:     string | null;
  status:       'ONLINE' | 'OFFLINE' | 'BUSY';
  rating:       number | string;
  totalRides:   number;
  vehicleType:  VehicleType;
  vehicleModel: string | null;
  vehiclePlate: string | null;
}

export interface RideDetails {
  id:              string;
  status:          ApiRideStatus;
  startLatitude:   number | string;
  startLongitude:  number | string;
  destinationName: string;
  endLatitude:     number | string | null;
  endLongitude:    number | string | null;
  price:           number | string | null;
  isOpenTrip:      boolean;
  cancelledBy:     'rider' | 'driver' | 'system' | null;
  user:            PublicUser;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: 'Berline',
  suv:   'SUV',
  van:   'Van',
  moto:  'Moto',
};

// ─── Domain ───────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude:  number;
  longitude: number;
}

export type RideStatus = 'completed' | 'cancelled_by_client' | 'cancelled_by_driver' | 'ongoing';

export interface RideHistoryItem {
  id:          string;
  status:      RideStatus;
  date:        string;
  originLabel: string;
  destLabel:   string;
  clientName:  string;
  price:       number;
  currency:    string;
}

export interface Captain {
  id:            string;
  name:          string;
  phone:         string;
  email?:        string;
  emailVerified: boolean;
  balance:       number;
  currency:      string;
  avatarUrl?:    string;
  rating:        number;
  totalRides:    number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data:    T;
  message: string;
  success: boolean;
}
