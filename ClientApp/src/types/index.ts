// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { mode: 'register' };
  Login: undefined;
  Home: undefined;
  Booking: { destination?: string; startLatitude?: number; startLongitude?: number };
  Match: { rideId: string };
};

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
