import { io, Socket } from 'socket.io-client';
import { Coordinates } from '../types';
import { SOCKET_URL } from '../config/constants';

// Événements émis / écoutés par le serveur (geolocation.gateway.ts).
// Statut en ligne et actions sur les courses passent par l'API REST.
const EVENTS = {
<<<<<<< HEAD
  DRIVER_POSITION:   'driver:position',
  RIDE_NEW:          'ride:new',
  RIDE_UNAVAILABLE:  'ride:unavailable',
  RIDE_CANCELLED:    'ride:cancelled',
  RIDE_METER:        'ride:meter',
} as const;

// Relevé du compteur d'un trajet ouvert
export interface MeterReading {
  rideId:      string;
  distanceKm:  number;
  durationMin: number;
  price:       number;
}

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
=======
  DRIVER_REGISTER: 'driver:register',
  DRIVER_POSITION: 'driver:position',
  RIDE_NEW:        'ride:new',
  RIDE_METER:      'ride:meter',
  RIDE_CANCELLED:  'ride:cancelled',
  RIDE_UNAVAILABLE:'ride:unavailable',
} as const;

export interface RideNewPayload {
  rideId:          string;
  startLatitude:   number;
  startLongitude:  number;
  destinationName: string | null;
  vehicleType:     string;
  createdAt:       string;
}

export interface RideMeterPayload {
  rideId:         string;
  distanceKm:     number;
  stoppedMinutes: number;
  price:          number;
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
}

class CaptainSocketService {
  private socket: Socket | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Le JWT est obligatoire : sans lui le serveur ne place pas le socket dans la room driver:<id>
  connect(authToken: string): void {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
      auth: { token: authToken },
    });
    this.socket.on('connect',       () => console.log('[Socket] Captain connected:', this.socket?.id));
    this.socket.on('disconnect',    (r) => console.log('[Socket] Disconnected:', r));
    this.socket.on('connect_error', (e) => console.warn('[Socket] Error:', e.message));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

<<<<<<< HEAD
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

  offRideRequest():     void { this.socket?.off(EVENTS.RIDE_NEW); }
  offMeter():           void { this.socket?.off(EVENTS.RIDE_METER); }
  offRideUnavailable(): void { this.socket?.off(EVENTS.RIDE_UNAVAILABLE); }
  offRideCancelled():   void { this.socket?.off(EVENTS.RIDE_CANCELLED); }
=======
  registerDriver():                   void { this.socket?.emit(EVENTS.DRIVER_REGISTER); }
  updateLocation(coords: Coordinates): void { this.socket?.emit(EVENTS.DRIVER_POSITION, coords); }

  onRideNew(cb: (payload: RideNewPayload) => void):       void { this.socket?.on(EVENTS.RIDE_NEW, cb); }
  onRideMeter(cb: (payload: RideMeterPayload) => void):   void { this.socket?.on(EVENTS.RIDE_METER, cb); }
  onRideCancelled(cb: (payload: { rideId: string }) => void): void { this.socket?.on(EVENTS.RIDE_CANCELLED, cb); }
  onRideUnavailable(cb: (payload: { rideId: string }) => void): void { this.socket?.on(EVENTS.RIDE_UNAVAILABLE, cb); }

  offRideNew():         void { this.socket?.off(EVENTS.RIDE_NEW); }
  offRideMeter():        void { this.socket?.off(EVENTS.RIDE_METER); }
  offRideCancelled():    void { this.socket?.off(EVENTS.RIDE_CANCELLED); }
  offRideUnavailable():  void { this.socket?.off(EVENTS.RIDE_UNAVAILABLE); }
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
}

export const captainSocketService = new CaptainSocketService();
