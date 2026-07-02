import { io, Socket } from 'socket.io-client';
import { Coordinates, Driver } from '../types';

import { SOCKET_URL as _URL } from '../config/constants';
const SOCKET_URL = _URL;

// ─── Event names (keep in sync with NestJS gateway) ──────────────────────────

const EVENTS = {
  DRIVERS_UPDATE: 'drivers:update',
  DRIVER_POSITION: 'driver:position',
  USER_LOCATION: 'user:location',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_UNAVAILABLE: 'ride:unavailable',
  RIDE_CANCELLED: 'ride:cancelled',
} as const;

// ─── Payload types ────────────────────────────────────────────────────────────

export interface RideAcceptedDriver {
  id: string;
  name: string;
  phone: string;
  vehicleModel: string;
  vehiclePlate: string;
  rating: number;
  latitude: number | null;
  longitude: number | null;
}

export interface RideAcceptedPayload {
  rideId: string;
  driverId: string;
  eta: number;
  driver: RideAcceptedDriver;
}

// ─── Singleton service ────────────────────────────────────────────────────────

class SocketService {
  private socket: Socket | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(authToken?: string): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
      auth: authToken ? { token: authToken } : undefined,
    });

    this.socket.on('connect', () =>
      console.log('[Socket] Connected:', this.socket?.id)
    );
    this.socket.on('disconnect', (reason) =>
      console.log('[Socket] Disconnected:', reason)
    );
    this.socket.on('connect_error', (err) =>
      console.warn('[Socket] Connection error:', err.message)
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── Emitters ──────────────────────────────────────────────────────────────

  emitUserLocation(coords: Coordinates): void {
    this.socket?.emit(EVENTS.USER_LOCATION, coords);
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  onDriversUpdate(cb: (drivers: Driver[]) => void): void {
    this.socket?.on(EVENTS.DRIVERS_UPDATE, cb);
  }

  onDriverPositionUpdate(cb: (driver: Driver) => void): void {
    this.socket?.on(EVENTS.DRIVER_POSITION, cb);
  }

  onRideAccepted(cb: (payload: RideAcceptedPayload) => void): void {
    this.socket?.on(EVENTS.RIDE_ACCEPTED, cb);
  }

  onRideStarted(cb: (payload: { rideId: string; startedAt: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_STARTED, cb);
  }

  onRideCompleted(cb: (payload: { rideId: string; price: number; completedAt: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_COMPLETED, cb);
  }

  onRideUnavailable(cb: (payload: { rideId: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_UNAVAILABLE, cb);
  }

  onRideCancelled(cb: (payload: { rideId: string; reason?: string }) => void): void {
    this.socket?.on(EVENTS.RIDE_CANCELLED, cb);
  }

  // ── Cleanup helpers ───────────────────────────────────────────────────────

  offDriversUpdate(): void {
    this.socket?.off(EVENTS.DRIVERS_UPDATE);
  }

  offDriverPositionUpdate(): void {
    this.socket?.off(EVENTS.DRIVER_POSITION);
  }

  offRideAccepted(): void {
    this.socket?.off(EVENTS.RIDE_ACCEPTED);
  }

  offRideStarted(): void {
    this.socket?.off(EVENTS.RIDE_STARTED);
  }

  offRideCompleted(): void {
    this.socket?.off(EVENTS.RIDE_COMPLETED);
  }

  offRideUnavailable(): void {
    this.socket?.off(EVENTS.RIDE_UNAVAILABLE);
  }

  offRideCancelled(): void {
    this.socket?.off(EVENTS.RIDE_CANCELLED);
  }
}

export const socketService = new SocketService();
