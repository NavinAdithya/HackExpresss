/**
 * PO → PO — Ride & Trip Security Configuration
 * Source of truth for limits, security parameters, penalties, match quality, and state machine.
 */

const RIDE_CONFIG = {
  // Daily ride cap — server-enforced: Max 2 rides per user per calendar day
  maxRidesPerDay: 2,

  // Trip Start Security Config
  tripSecurity: {
    tripStartOtpLength: 6,
    tripStartOtpExpiryMinutes: 5,
    maxOtpAttempts: 5,
    pickupStartRadiusKm: 0.5, // 500m geofence around pickup point
  },

  // No-show penalty
  pickupGraceMinutes: 10,
  noShowPenaltyType: 'percentage',
  noShowPenaltyValue: 10, // 10% of shared fuel contribution

  // P2P Existing-Commute Cost Sharing
  fuelRatePerKm: 8.0, // ₹ per km
  platformFee: 3.0, // ₹3 PO → PO service fee (displayed separately)
  defaultTolls: 0,

  // Pure Deterministic Matching Weights (Section 47)
  matchingWeights: {
    route: 0.35,        // 35% Route overlap
    pickup: 0.20,       // 20% Pickup proximity
    destination: 0.20,  // 20% Destination proximity
    time: 0.15,         // 15% Timing compatibility
    transport: 0.05,    // 5% Transport compatibility
    budget: 0.05,       // 5% Cost compatibility
  },

  proPriorityBonus: 3, // Ranking boost applied ONLY after safety hard filters
  defaultTimeWindowMinutes: 30,
  maxDetourKm: 4.0, // Maximum acceptable detour in km for fallback
  nearbyDestinationRadiusKm: 3.5, // Maximum radius for nearby destination match
  routeBufferMeters: 500, // corridor buffer for route overlap

  // Centralized Deterministic Match Quality Thresholds (Requirement 2)
  matchQuality: {
    minimumViableScore: 40, // Below this is NEVER shown in normal results
    fallbackMaxDetourKm: 4.0,
    fallbackMaxDestinationGapKm: 3.5,
    tiers: [
      { min: 90, max: 100, label: 'Excellent match', key: 'EXCELLENT', color: '#22C55E' },
      { min: 80, max: 89, label: 'Strong match', key: 'STRONG', color: '#10B981' },
      { min: 60, max: 79, label: 'Compatible commute', key: 'COMPATIBLE', color: '#F63B03' },
      { min: 40, max: 59, label: 'Weak compatibility', key: 'WEAK', color: '#F59E0B' },
      { min: 0, max: 39, label: 'Not suitable', key: 'NOT_SUITABLE', color: '#EF4444' },
    ],
  },

  // Authoritative Trip State Machine (Requirement 11)
  tripStates: {
    // Progressive flow states
    SEARCHING: 'SEARCHING',
    MATCH_FOUND: 'MATCH_FOUND',
    BOOKING_REQUESTED: 'BOOKING_REQUESTED',
    CONFIRMED: 'CONFIRMED',
    IDENTITY_VERIFICATION: 'IDENTITY_VERIFICATION',
    PICKUP_VERIFICATION: 'PICKUP_VERIFICATION',
    READY_TO_START: 'READY_TO_START',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',

    // Failure / terminal states
    IDENTITY_MISMATCH: 'IDENTITY_MISMATCH',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
    PICKUP_TOO_FAR: 'PICKUP_TOO_FAR',
    LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
    CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
  },
};

/**
 * Returns deterministic quality tier for a score
 */
function getMatchQuality(score) {
  const rounded = Math.round(score);
  for (const tier of RIDE_CONFIG.matchQuality.tiers) {
    if (rounded >= tier.min && rounded <= tier.max) {
      return tier;
    }
  }
  return RIDE_CONFIG.matchQuality.tiers[RIDE_CONFIG.matchQuality.tiers.length - 1];
}

module.exports = {
  ...RIDE_CONFIG,
  getMatchQuality,
};
