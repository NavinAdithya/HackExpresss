const mongoose = require('mongoose');
const SAFETY_CONFIG = require('../config/safety');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    profilePhoto: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    verified: { type: Boolean, default: false },
    verifiedOnly: { type: Boolean, default: false },
    womenOnly: { type: Boolean, default: false },
    trustScore: {
      type: Number,
      default: SAFETY_CONFIG.trustScoreDefault,
      min: SAFETY_CONFIG.trustScoreMin,
      max: SAFETY_CONFIG.trustScoreMax,
    },

    // Plan & subscription
    plan: { type: String, enum: ['FREE', 'VERIFIED', 'PRO'], default: 'FREE' },
    subscriptionStatus: {
      type: String,
      enum: ['FREE', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'FREE',
    },
    subscriptionId: { type: String, default: '' },
    subscriptionStart: { type: Date, default: null },
    subscriptionEnd: { type: Date, default: null },

    // Daily ride tracking (server-enforced)
    dailyRideCount: { type: Number, default: 0 },
    dailyRideDate: { type: Date, default: null },

    // Trusted contacts (embedded for simplicity)
    trustedContacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        circle: { type: String, default: 'General' },
      },
    ],

    // Recurring commute (VERIFIED feature)
    recurringCommutes: [
      {
        label: String,
        origin: {
          address: String,
          location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] },
          },
        },
        destination: {
          address: String,
          location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] },
          },
        },
        days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
        departureTime: String, // "08:15"
      },
    ],

    // Smart Pool Lock (PRO feature)
    lockedPoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },

    // OTP (temporary, not persisted long-term)
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
