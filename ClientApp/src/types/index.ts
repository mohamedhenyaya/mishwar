// ─── Navigation ──────────────────────────────────────────────────────────────
// "Home/Trips/Ranking/Profile" vivent dans une barre d'onglets (voir
// navigation/MainTabs.tsx) ; les autres écrans restent des Stack.Screen
// classiques empilés par-dessus.

import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Home: undefined;
  Trips: undefined;
  Ranking: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { mode: 'register' };
  Login: undefined;
<<<<<<< HEAD
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
  price: number | string | null;
  isOpenTrip: boolean;
  cancelledBy: 'rider' | 'driver' | 'system' | null;
  startedAt: string | null;
  distanceMeters: number;
  createdAt: string;
  driver: PublicDriver | null;
  user: PublicUser;
}

// Relevé du compteur d'un trajet ouvert (événement ride:meter)
export interface MeterReading {
  rideId: string;
  distanceKm: number;
  durationMin: number;
  price: number;
}

// GET /rides/tariff
export interface Tariff {
  currency: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: 'Berline',
  suv:   'SUV',
  van:   'Van',
  moto:  'Moto',
=======
  Main: undefined;
  Match: { rideId: string; isOpenTrip?: boolean; estimatedPrice?: number };
  Favorites: undefined;
  Support: undefined;
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// ─── Domain ───────────────────────────────────────────────────────────────────

export type VehicleType = 'sedan' | 'suv' | 'van' | 'moto';
export type RideVehicleClass = 'economy' | 'comfort' | 'premium';

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

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  rating: number;
  ratingCount: number;
}

export type RideStatus = 'SCHEDULED' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Ride {
  id: string;
  status: RideStatus;
  destinationName: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number | null;
  endLongitude: number | null;
  vehicleType: RideVehicleClass;
  price: number | null;
  discountAmount: number | null;
  couponCode: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

export interface FavoritePlace {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  currentUser: { rank: number; points: number } | null;
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
