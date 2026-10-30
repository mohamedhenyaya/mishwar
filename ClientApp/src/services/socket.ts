import { io, Socket } from 'socket.io-client';
import { Coordinates, Driver, MeterReading, PublicDriver } from '../types';

import { SOCKET_URL as _URL } from '../config/constants';
const SOCKET_URL = _URL;

// ─── Event names (keep in sync with NestJS gateway) ──────────────────────────

const EVENTS = {
  DRIVERS_UPDATE: 'drivers:update',
  DRIVER_POSITION: 'driver:position',
  USER_LOCATION: 'user:location',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_ARRIVED: 'ride:arrived',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_UNAVAILABLE: 'ride:unavailable',
  RIDE_CANCELLED: 'ride:cancelled',
} as const;

// ─── Payload types ────────────────────────────────────────────────────────────

export type RideAcceptedDriver = PublicDriver;

export interface RideAcceptedPayload {
  rideId: string;
  driverId: string;
  eta: number;
  driver: RideAcceptedDriver;
}

export interface DriverPositionPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Événements de course écoutés via subscribe()
export interface RideEvents {
  'ride:accepted':   RideAcceptedPayload;
  'ride:arrived':    { rideId: string; arrivedAt: string };
  'ride:started':    { rideId: string; startedAt: string };
  'ride:completed':  { rideId: string; price: number | string | null; completedAt: string };
  'ride:cancelled':  { rideId: string; reason?: string };
  'driver:position': DriverPositionPayload;
  'ride:meter':      MeterReading;
  'driver:status':   { driverId: string; status: 'ONLINE' | 'OFFLINE' | 'BUSY' };
}

// ─── Singleton service ────────────────────────────────────────────────────────

interface Subscription {
  event:   string;
  handler: (...args: any[]) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private authToken: string | undefined;
  private readonly subscriptions = new Set<Subscription>();

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(authToken?: string): void {
    // Même jeton → on garde le socket (connecté ou en cours de connexion).
    // Jeton différent → nouveau socket, sinon le serveur ne nous place pas dans la room user:<id>.
    if (this.socket && this.authToken === authToken) return;
    this.socket?.disconnect();
    this.authToken = authToken;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
      auth: authToken ? { token: authToken } : undefined,
    });
    for (const sub of this.subscriptions) this.socket.on(sub.event, sub.handler);

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
    this.authToken = undefined;
  }

  // ── Emitters ──────────────────────────────────────────────────────────────

  emitUserLocation(coords: Coordinates): void {
    this.socket?.emit(EVENTS.USER_LOCATION, coords);
  }

  // ── Abonnement ciblé : ne retire que ce handler (plusieurs écrans peuvent écouter le même événement).
  // Conservé dans `subscriptions` : rattaché à chaque nouveau socket (connexion tardive, changement de jeton).

  subscribe<E extends keyof RideEvents>(event: E, cb: (payload: RideEvents[E]) => void): () => void {
    const sub: Subscription = { event: event as string, handler: cb as (...args: any[]) => void };
    this.subscriptions.add(sub);
    this.socket?.on(sub.event, sub.handler);
    return () => {
      this.subscriptions.delete(sub);
      this.socket?.off(sub.event, sub.handler);
    };
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
