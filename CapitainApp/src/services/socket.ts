import { io, Socket } from 'socket.io-client';
import { Coordinates } from '../types';
import { SOCKET_URL } from '../config/constants';

// Événements émis / écoutés par le serveur (geolocation.gateway.ts).
// Statut en ligne et actions sur les courses passent par l'API REST.
const EVENTS = {
  DRIVER_REGISTER:   'driver:register',
  DRIVER_POSITION:   'driver:position',
  RIDE_NEW:          'ride:new',
  RIDE_UNAVAILABLE:  'ride:unavailable',
  RIDE_CANCELLED:    'ride:cancelled',
  RIDE_METER:        'ride:meter',
} as const;

// Relevé du compteur d'un trajet ouvert (distance parcourue + temps d'arrêt)
export interface MeterReading {
  rideId:         string;
  distanceKm:     number;
  stoppedMinutes: number;
  price:          number;
}
export type RideMeterPayload = MeterReading;

export interface RideRequestPayload {
  rideId:          string;
  startLatitude:   number;
  startLongitude:  number;
  destinationName: string;
  endLatitude:     number | null;
  endLongitude:    number | null;
  price:           number | string | null; // decimal Postgres → peut arriver en string
  isOpenTrip:      boolean;
  vehicleType:     string;
  createdAt:       string;
}

export type RideNewPayload = RideRequestPayload;

class CaptainSocketService {
  private socket: Socket | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Le JWT est obligatoire : sans lui le serveur ne place pas le socket dans la room driver:<id>
  connect(authToken?: string): void {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
      auth: authToken ? { token: authToken } : undefined,
    });
    this.socket.on('connect',       () => console.log('[Socket] Captain connected:', this.socket?.id));
    this.socket.on('disconnect',    (r) => console.log('[Socket] Disconnected:', r));
    this.socket.on('connect_error', (e) => console.warn('[Socket] Error:', e.message));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  registerDriver(): void { this.socket?.emit(EVENTS.DRIVER_REGISTER); }
  updateLocation(coords: Coordinates): void { this.socket?.emit(EVENTS.DRIVER_POSITION, coords); }

  onRideRequest(cb: (payload: RideRequestPayload) => void): void {
    this.socket?.on(EVENTS.RIDE_NEW, cb);
  }
  onRideUnavailable(cb: (payload: { rideId: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_UNAVAILABLE, cb);
  }
  onRideCancelled(cb: (payload: { rideId: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_CANCELLED, cb);
  }

  onMeter(cb: (reading: MeterReading) => void): void {
    this.socket?.on(EVENTS.RIDE_METER, cb);
  }

  // Connexion et chaque reconnexion (retour au premier plan, réseau rétabli)
  onConnect(cb: () => void): void {
    this.socket?.on('connect', cb);
  }

  // Noms utilisés par DriverStatusContext / IncomingRideModal / ActiveTripScreen
  onRideNew(cb: (payload: RideNewPayload) => void): void { this.onRideRequest(cb); }
  onRideMeter(cb: (payload: RideMeterPayload) => void): void { this.onMeter(cb); }
  offRideNew():   void { this.offRideRequest(); }
  offRideMeter(): void { this.offMeter(); }

  offRideRequest():     void { this.socket?.off(EVENTS.RIDE_NEW); }
  offMeter():           void { this.socket?.off(EVENTS.RIDE_METER); }
  offRideUnavailable(): void { this.socket?.off(EVENTS.RIDE_UNAVAILABLE); }
  offRideCancelled():   void { this.socket?.off(EVENTS.RIDE_CANCELLED); }
}

export const captainSocketService = new CaptainSocketService();
