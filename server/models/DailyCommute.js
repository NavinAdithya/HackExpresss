const mongoose = require('mongoose');

const placeSchema = {
  address: { type: String, required: true, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
};

/**
 * A user's saved recurring journey ("Every weekday 8:15, Porur → Ramapuram").
 *
 * Route geometry is computed ONCE when the commute is saved (or its endpoints change),
 * so daily matching never has to call the routing provider again.
 * Vehicle details are NOT duplicated here — they live on User.vehicleDetails.
 */
const dailyCommuteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: '', trim: true, maxlength: 60 },

    origin: placeSchema,
    destination: placeSchema,

    route: {
      type: { type: String, enum: ['LineString'], default: 'LineString' },
      coordinates: { type: [[Number]], default: [] },
    },
    routeDistance: { type: Number, default: 0 }, // meters
    routeDuration: { type: Number, default: 0 }, // seconds

    departureTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // local HH:MM
    arrivalTime: { type: String, default: '', match: /^(|([01]\d|2[0-3]):[0-5]\d)$/ }, // optional preference
    days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
    timezoneOffsetMin: { type: Number, default: 330 }, // minutes ahead of UTC (IST default)
    timeWindow: { type: Number, default: 20, min: 5, max: 90 }, // ± minutes of flexibility

    role: { type: String, enum: ['PASSENGER', 'TRAVELLER', 'BOTH'], default: 'PASSENGER' },
    transportMode: { type: String, enum: ['BIKE', 'CAR'], default: 'CAR' },
    availableSeats: { type: Number, default: 0, min: 0, max: 8 },
    requiredSeats: { type: Number, default: 1, min: 1, max: 4 },

    autoMatchEnabled: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dailyCommuteSchema.index({ active: 1, autoMatchEnabled: 1 });

module.exports = mongoose.model('DailyCommute', dailyCommuteSchema);
