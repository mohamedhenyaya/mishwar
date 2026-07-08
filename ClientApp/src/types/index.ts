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
  Main: undefined;
  Match: { rideId: string; isOpenTrip?: boolean; estimatedPrice?: number };
  Favorites: undefined;
  Support: undefined;
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
