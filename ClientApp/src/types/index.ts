// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { mode: 'register' };
  Login: undefined;
  Home: undefined;
  Booking: { destination?: string; startLatitude?: number; startLongitude?: number };
  Match: { rideId: string; price?: number | null };
  Trip: { rideId: string };
  Rating: { rideId: string; driver: PublicDriver | null; price: number | null };
  Profile: undefined;
};

// ─── Course en temps réel (réponses de l'API /rides) ─────────────────────────

export type RideStatus = 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface PublicDriver {
  id: string;
  name: string | null;
  phone: string;
  photoUrl: string | null;
  rating: number;
  totalRides: number;
  vehicleType: VehicleType;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PublicUser {
  id: string;
  name: string | null;
  phone: string;
  photoUrl: string | null;
  rating: number;
  totalRides: number;
}

// Les colonnes decimal Postgres arrivent en string
export interface RideDetails {
  id: string;
  status: RideStatus;
  startLatitude: number | string;
  startLongitude: number | string;
  destinationName: string;
  endLatitude: number | string | null;
  endLongitude: number | string | null;
  price: number | string | null;          // prix final, fixé à la fin de la course
  estimatedPrice: number | string | null; // tarif au km calculé à la création (destination connue)
  isOpenTrip: boolean;
  cancelledBy: 'user' | 'driver' | 'system' | 'admin' | null;
  startedAt: string | null;
  createdAt: string;
  driver: PublicDriver | null;
  user: PublicUser;
}

// Relevé du compteur d'un trajet ouvert (événement ride:meter)
export interface MeterReading {
  rideId: string;
  distanceKm: number;
  stoppedMinutes: number;
  price: number;
}

// GET /rides/tariff
export interface Tariff {
  currency: string;
  minimumFare: number;
  perKm: number;
  perStopMinute: number;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: 'Berline',
  suv:   'SUV',
  van:   'Van',
  moto:  'Moto',
};

// Prix affiché : prix final s'il existe, sinon tarif calculé à la création
export function ridePrice(ride: Pick<RideDetails, 'price' | 'estimatedPrice'>): number | null {
  const value = ride.price ?? ride.estimatedPrice;
  return value != null ? Math.round(Number(value)) : null;
}

// ─── Domain ───────────────────────────────────────────────────────────────────

export type VehicleType = 'sedan' | 'suv' | 'van' | 'moto';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Driver {
  id: string;
  name: string;
  coordinate: Coordinates;
  vehicleType: VehicleType;
  rating: number;
  isAvailable: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Ride {
  id: string;
  userId: string;
  driverId: string;
  origin: Coordinates;
  destination: Coordinates;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  price?: number;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
