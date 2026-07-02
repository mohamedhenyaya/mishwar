import { io, Socket } from 'socket.io-client';
import { Coordinates } from '../types';
import { SOCKET_URL } from '../config/constants';

const EVENTS = {
  CAPTAIN_ONLINE:    'captain:online',
  CAPTAIN_OFFLINE:   'captain:offline',
  CAPTAIN_LOCATION:  'captain:location',
  RIDE_REQUEST:      'ride:request',
  RIDE_ACCEPTED:     'ride:accepted',
  RIDE_STARTED:      'ride:started',
  RIDE_COMPLETED:    'ride:completed',
  RIDE_CANCELLED:    'ride:cancelled',
} as const;

export interface RideRequestPayload {
  rideId:      string;
  clientName:  string;
  clientPhone: string;
  origin:      Coordinates & { label: string };
  destination: Coordinates & { label: string };
  price:       number;
  distance:    number;
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

  goOnline(coords: Coordinates):  void { this.socket?.emit(EVENTS.CAPTAIN_ONLINE,   coords); }
  goOffline():                    void { this.socket?.emit(EVENTS.CAPTAIN_OFFLINE); }
  updateLocation(coords: Coordinates): void { this.socket?.emit(EVENTS.CAPTAIN_LOCATION, coords); }
  acceptRide(rideId: string):     void { this.socket?.emit(EVENTS.RIDE_ACCEPTED, { rideId }); }
  startRide(rideId: string):      void { this.socket?.emit(EVENTS.RIDE_STARTED,  { rideId }); }
  completeRide(rideId: string):   void { this.socket?.emit(EVENTS.RIDE_COMPLETED, { rideId }); }

  onRideRequest(cb: (payload: RideRequestPayload) => void): void {
    this.socket?.on(EVENTS.RIDE_REQUEST, cb);
  }
  onRideCancelled(cb: (payload: { rideId: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_CANCELLED, cb);
  }

  offRideRequest():   void { this.socket?.off(EVENTS.RIDE_REQUEST); }
  offRideCancelled(): void { this.socket?.off(EVENTS.RIDE_CANCELLED); }
}

export const captainSocketService = new CaptainSocketService();
