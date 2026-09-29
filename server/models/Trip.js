const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['driver', 'passenger'], required: true },

    // Locations (GeoJSON)
    origin: {
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    destination: {
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },

    // Route from OSRM (GeoJSON LineString)
    route: {
      type: { type: String, enum: ['LineString'], default: 'LineString' },
      coordinates: { type: [[Number]], default: [] }, // [[lng, lat], ...]
    },
    routeDistance: { type: Number, default: 0 }, // meters
    routeDuration: { type: Number, default: 0 }, // seconds

    // Schedule
    departureTime: { type: Date, required: true },
    timeWindow: { type: Number, default: 30 }, // minutes flexibility

    // Capacity & budget
    seatCount: { type: Number, default: 1, min: 1, max: 6 },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 500 },
    tolls: { type: Number, default: 0 },

    // Safety preferences
    verifiedOnly: { type: Boolean, default: false },
    womenOnly: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ['POSTED', 'MATCHED', 'ACCEPTED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'POSTED',
      index: true,
    },

    // Match linkage
    matchedTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    matchedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },

    // Fare (populated on completion)
    fare: { type: Number, default: null },
    commission: { type: Number, default: null },

    // Face verification
    faceVerificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED'],
      default: 'PENDING',
    },

    // Sharing
    sharedTrackingToken: { type: String, default: null },

    // Trip timestamps
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere indexes for spatial queries
tripSchema.index({ 'origin.location': '2dsphere' });
tripSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);
