import { io, Socket } from 'socket.io-client';
import { Coordinates } from '../types';
import { SOCKET_URL } from '../config/constants';

const EVENTS = {
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
}

class CaptainSocketService {
  private socket: Socket | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

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
}

export const captainSocketService = new CaptainSocketService();
