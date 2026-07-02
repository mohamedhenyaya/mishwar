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
  Welcome:     undefined;
  Auth:        { mode: 'register' };
  Login:       undefined;
  Main:        undefined;
  Historique:  undefined;
  Parametres:  undefined;
  MonCompte:   undefined;
  Performance: undefined;
  Recharge:    undefined;
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
