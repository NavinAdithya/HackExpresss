const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/popo';

  try {
    console.log(`[DB] Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[DB] Local MongoDB not reachable (${err.message}).`);
    console.log(`[DB] Activating in-memory mock store for local hackathon demo...`);
    const { setupInMemoryFallback } = require('./in-memory-db');
    setupInMemoryFallback();
  }
};

module.exports = connectDB;
