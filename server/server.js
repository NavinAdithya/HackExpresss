/**
 * PO → PO — Server Entry Point
 *
 * Express + Socket.io + MongoDB + Redis
 * AI-Assisted Peer-to-Peer Ride-Sharing Platform
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { getRedis } = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { setupSockets } = require('./sockets/trip-socket');

// Routes
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const matchRoutes = require('./routes/matches');
const ratingRoutes = require('./routes/ratings');
const sosRoutes = require('./routes/sos');
const planRoutes = require('./routes/plans');
const contactRoutes = require('./routes/contacts');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // For face verification images
app.use(morgan('dev'));
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PO → PO API',
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Setup Socket.io
setupSockets(io);

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Initialize Redis (non-blocking)
  try {
    getRedis();
  } catch (e) {
    console.log('[REDIS] Starting without Redis');
  }

  server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  PO → PO API Server                      ║`);
    console.log(`║  Port: ${PORT}                               ║`);
    console.log(`║  Mode: ${process.env.NODE_ENV || 'development'}                     ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close();
  process.exit(0);
});

// Export for testing
module.exports = { app, server, io };

// Start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}
