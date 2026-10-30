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
  ACCOUNT_BLOCKED:   'account:blocked',
  FORCED_OFFLINE:    'driver:forced-offline',
  DOSSIER_UPDATED:   'driver:dossier-updated',
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

export type DossierEvent =
  | { event: 'ACCOUNT_APPROVED' }
  | { event: 'DOSSIER_REJECTED'; reason: string | null }
  | { event: 'DOCUMENT_REVIEWED'; type: string; status: 'APPROVED' | 'REJECTED'; note: string | null }
  | { event: 'UPDATED' };

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

  // Compte bloqué ou supprimé par un admin — le serveur coupe le socket juste après
  onAccountBlocked(cb: (payload: { reason: string | null }) => void): void {
    this.socket?.on(EVENTS.ACCOUNT_BLOCKED, cb);
  }

  // Solde passé sous zéro ou véhicule rejeté / renvoyé en validation : le serveur a remis
  // le capitaine hors ligne (code INSUFFICIENT_BALANCE ou VEHICLE_NOT_APPROVED)
  onForcedOffline(cb: (payload: { code: string; message: string }) => void): void {
    this.socket?.on(EVENTS.FORCED_OFFLINE, cb);
  }

  // Décision d'un admin sur le dossier : compte approuvé/refusé, pièce validée/refusée, modification.
  // Retourne la fonction de désinscription (plusieurs écrans écoutent en même temps).
  onDossierUpdated(cb: (event: DossierEvent) => void): () => void {
    this.socket?.on(EVENTS.DOSSIER_UPDATED, cb);
    return () => { this.socket?.off(EVENTS.DOSSIER_UPDATED, cb); };
  }

  offAccountEvents(): void {
    this.socket?.off(EVENTS.ACCOUNT_BLOCKED);
    this.socket?.off(EVENTS.FORCED_OFFLINE);
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
