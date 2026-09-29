/**
 * Socket.io handlers for real-time trip tracking.
 *
 * Events:
 * - trip:join     → Join a trip room
 * - trip:leave    → Leave a trip room
 * - location:update → Emit location update
 * - trip:status   → Trip status change notification
 */

const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');

function setupSockets(io) {
  // Auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'popo-dev-secret');
      socket.userId = decoded.userId;
      socket.userPhone = decoded.phone;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    /**
     * Join a trip room for live tracking
     */
    socket.on('trip:join', (tripId) => {
      socket.join(`trip:${tripId}`);
      console.log(`[SOCKET] ${socket.userId} joined trip:${tripId}`);

      // Notify room
      socket.to(`trip:${tripId}`).emit('trip:user-joined', {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Leave a trip room
     */
    socket.on('trip:leave', (tripId) => {
      socket.leave(`trip:${tripId}`);
      console.log(`[SOCKET] ${socket.userId} left trip:${tripId}`);
    });

    /**
     * Location update — core real-time tracking
     */
    socket.on('location:update', async (data) => {
      const { tripId, lat, lng } = data;

      if (!tripId || lat === undefined || lng === undefined) return;

      const locationData = {
        userId: socket.userId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      };

      // Store in Redis with TTL (5 minutes)
      const redis = getRedis();
      try {
        await redis.setex(
          `location:${tripId}:${socket.userId}`,
          300,
          JSON.stringify(locationData)
        );
      } catch (e) {
        // Non-fatal: tracking continues without cache
      }

      // Broadcast to trip room (excluding sender)
      socket.to(`trip:${tripId}`).emit('location:update', locationData);
    });

    /**
     * Trip status change
     */
    socket.on('trip:status-change', (data) => {
      const { tripId, status } = data;
      io.to(`trip:${tripId}`).emit('trip:status-changed', {
        tripId,
        status,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * SOS alert broadcast
     */
    socket.on('sos:activate', (data) => {
      const { tripId, lat, lng } = data;
      io.to(`trip:${tripId}`).emit('sos:alert', {
        tripId,
        userId: socket.userId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = { setupSockets };
