import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { captainSocketService, RideNewPayload } from '../services/socket';
import { apiPatch, onSignedOut } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { Coordinates } from '../types';

const LOCATION_PING_INTERVAL_MS = 10_000;

interface DriverStatusContextValue {
  isOnline: boolean;
  location: Coordinates | null;
  incomingRequest: RideNewPayload | null;
  goOnline: () => Promise<boolean>;
  goOffline: () => Promise<void>;
  dismissIncomingRequest: () => void;
  setHasActiveRide: (active: boolean) => void;
}

const DriverStatusContext = createContext<DriverStatusContextValue | null>(null);

export function useDriverStatus(): DriverStatusContextValue {
  const ctx = useContext(DriverStatusContext);
  if (!ctx) throw new Error('useDriverStatus doit être utilisé sous DriverStatusProvider');
  return ctx;
}

// Monté une fois à la racine de l'app (voir App.tsx) pour que la connexion socket,
// le ping de position et l'écoute des nouvelles courses survivent à la navigation
// entre Home et ActiveTrip. Le socket ne se connecte qu'au passage "en ligne" —
// à ce stade le chauffeur est nécessairement authentifié (le token existe déjà).
export function DriverStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<RideNewPayload | null>(null);
  const hasActiveRideRef = useRef(false);

  useEffect(() => () => { captainSocketService.disconnect(); }, []);

  // Session terminée (compte bloqué, jeton refusé) : plus de socket ni de demandes de course
  useEffect(() => onSignedOut(() => {
    captainSocketService.offRideNew();
    captainSocketService.offRideCancelled();
    captainSocketService.offRideUnavailable();
    captainSocketService.disconnect();
    setIsOnline(false);
    setIncomingRequest(null);
  }), []);

  // ── Ping de position pendant que le chauffeur est en ligne ────────────────
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        captainSocketService.updateLocation(coords);
      } catch { /* silencieux — le prochain ping réessaiera */ }
    }, LOCATION_PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOnline]);

  const goOnline = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

    const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    captainSocketService.connect(token ?? undefined);
    captainSocketService.registerDriver();
    captainSocketService.onRideNew((payload) => {
      if (hasActiveRideRef.current) return; // déjà sur une course : ignore les nouvelles demandes
      setIncomingRequest(payload);
    });
    captainSocketService.onRideCancelled(({ rideId }) => {
      setIncomingRequest((current) => (current?.rideId === rideId ? null : current));
    });
    captainSocketService.onRideUnavailable(({ rideId }) => {
      setIncomingRequest((current) => (current?.rideId === rideId ? null : current));
    });

    setLocation(coords);
    captainSocketService.updateLocation(coords);

    await apiPatch('/drivers/status', { status: 'ONLINE' });
    setIsOnline(true);
    return true;
  }, []);

  const goOffline = useCallback(async (): Promise<void> => {
    await apiPatch('/drivers/status', { status: 'OFFLINE' });
    captainSocketService.offRideNew();
    captainSocketService.offRideCancelled();
    captainSocketService.offRideUnavailable();
    captainSocketService.disconnect();
    setIsOnline(false);
    setIncomingRequest(null);
  }, []);

  const dismissIncomingRequest = useCallback(() => setIncomingRequest(null), []);
  const setHasActiveRide = useCallback((active: boolean) => { hasActiveRideRef.current = active; }, []);

  return (
    <DriverStatusContext.Provider
      value={{ isOnline, location, incomingRequest, goOnline, goOffline, dismissIncomingRequest, setHasActiveRide }}
    >
      {children}
    </DriverStatusContext.Provider>
  );
}
