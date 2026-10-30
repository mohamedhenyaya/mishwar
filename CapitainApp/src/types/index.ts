// ─── Navigation ──────────────────────────────────────────────────────────────
// "Home" vit dans un vrai Drawer Navigator (voir navigation/MainDrawer.tsx) ;
// les autres écrans restent des Stack.Screen classiques empilés par-dessus.

import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type DrawerParamList = {
  Home: undefined;
};

export type RootStackParamList = {
  Language:    { next: 'Welcome' | 'Main' } | undefined; // premier lancement : choix de la langue
  Welcome:     undefined;
  Auth:        { mode: 'register' };
  Login:       undefined;
  Main:        undefined;
  Historique:  undefined;
  Parametres:  undefined;
  MonCompte:   { insufficientBalance?: boolean } | undefined;
  Performance: undefined;
  Recharge:    undefined;
  ActiveTrip:  { rideId: string };
  Profil:      undefined;
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
  cancelledBy:     'user' | 'driver' | 'system' | null;
  user:            PublicUser;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: 'Berline',
  suv:   'SUV',
  van:   'Van',
  moto:  'Moto',
};

export type HomeScreenProps = CompositeScreenProps<
  DrawerScreenProps<DrawerParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

// ─── Domain ───────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude:  number;
  longitude: number;
}

export type RideStatus = 'completed' | 'cancelled_by_client' | 'cancelled_by_driver' | 'cancelled_other' | 'ongoing';

// Ligne de GET /rides/driver/history (« Mes trajets »)
export interface RideHistoryItem {
  id:              string;
  status:          RideStatus;
  date:            string;        // ISO
  startLatitude:   number;
  startLongitude:  number;
  destinationName: string | null; // null : trajet ouvert
  isOpenTrip:      boolean;
  clientName:      string | null;
  price:           number;
  currency:        string;
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
