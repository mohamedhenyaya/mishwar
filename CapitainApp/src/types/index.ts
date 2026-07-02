// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome:    undefined;
  Auth:       { mode: 'register' };
  Login:      undefined;
  Home:       undefined;
  Historique: undefined;
  Parametres: undefined;
  MonCompte:  undefined;
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
