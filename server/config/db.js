const mongoose = require('mongoose');
const { setupInMemoryFallback } = require('./in-memory-db');

let isFallbackActive = false;

// If no MONGODB_URI or on Vercel with default localhost, activate in-memory fallback immediately
const isLocalhostUri = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1');
if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && isLocalhostUri) {
  setupInMemoryFallback();
  isFallbackActive = true;
}

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return;
  }

  // In cloud environment without a configured remote MongoDB, keep in-memory fallback
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && isLocalhostUri) {
    if (!isFallbackActive) {
      setupInMemoryFallback();
      isFallbackActive = true;
    }
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/popo';

  try {
    console.log(`[DB] Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[DB] Local MongoDB not reachable (${err.message}).`);
    console.log(`[DB] Activating in-memory mock store for local hackathon demo...`);
    if (!isFallbackActive) {
      setupInMemoryFallback();
      isFallbackActive = true;
    }
  }
};

module.exports = connectDB;
