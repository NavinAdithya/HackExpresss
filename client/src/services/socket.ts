/**
 * Socket.io client service for real-time trip tracking
 */

import { io, Socket } from 'socket.io-client';
import type { LocationUpdate } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('popo_token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected');
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Disconnected');
  });

  socket.on('connect_error', (err) => {
    console.warn('[SOCKET] Connection error:', err.message);
  });

  return socket;
}

export function joinTrip(tripId: string) {
  const s = getSocket();
  s.emit('trip:join', tripId);
}

export function leaveTrip(tripId: string) {
  const s = getSocket();
  s.emit('trip:leave', tripId);
}

export function emitLocation(tripId: string, lat: number, lng: number) {
  const s = getSocket();
  s.emit('location:update', { tripId, lat, lng });
}

export function onLocationUpdate(callback: (data: LocationUpdate) => void) {
  const s = getSocket();
  s.on('location:update', callback);
  return () => { s.off('location:update', callback); };
}

export function onTripStatusChange(callback: (data: { tripId: string; status: string }) => void) {
  const s = getSocket();
  s.on('trip:status-changed', callback);
  return () => { s.off('trip:status-changed', callback); };
}

export function onSOSAlert(callback: (data: { tripId: string; lat: number; lng: number }) => void) {
  const s = getSocket();
  s.on('sos:alert', callback);
  return () => { s.off('sos:alert', callback); };
}

export function emitSOSActivate(tripId: string, lat: number, lng: number) {
  const s = getSocket();
  s.emit('sos:activate', { tripId, lat, lng });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
