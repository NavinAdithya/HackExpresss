const mongoose = require('mongoose');
const SAFETY_CONFIG = require('../config/safety');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    profilePhoto: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    dateOfBirth: { type: String, default: '' },
    faceReferencePhoto: { type: String, default: '' },
    accountVerified: { type: Boolean, default: true },
    verified: { type: Boolean, default: true }, // Legacy alias
    verifiedOnly: { type: Boolean, default: true },
    womenOnly: { type: Boolean, default: false },
    rolePreference: {
      type: String,
      enum: ['PASSENGER', 'TRAVELLER', 'BOTH'],
      default: 'BOTH',
    },
    trustScore: {
      type: Number,
      default: SAFETY_CONFIG.trustScoreDefault,
      min: SAFETY_CONFIG.trustScoreMin,
      max: SAFETY_CONFIG.trustScoreMax,
    },
    trustScoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Traveller Verification Status (Section 14)
    driverStatus: {
      type: String,
      enum: ['NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_REQUESTED',
    },
    vehicleDetails: {
      transportMode: { type: String, enum: ['BIKE', 'CAR'], default: 'BIKE' },
      vehicleModel: { type: String, default: '' },
      vehicleRegistration: { type: String, default: '' },
      capacity: { type: Number, default: 1 },
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

    // Daily ride tracking (server-enforced: max 2)
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
        departureTime: String,
      },
    ],

    // Smart Pool Lock (PRO feature)
    lockedPoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },

    // OTP
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
