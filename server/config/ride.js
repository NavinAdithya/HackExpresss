/**
 * Ride configuration — limits, penalties, fare constants.
 */

const RIDE_CONFIG = {
  // Daily ride cap (10 for development/demo testing, 2 for production)
  maxRidesPerDay: process.env.NODE_ENV === 'development' ? 10 : 2,

  // No-show penalty
  pickupGraceMinutes: 10,
  noShowPenaltyType: 'percentage',
  noShowPenaltyValue: 10, // 10% of fare

  // Fare calculation
  fuelRatePerKm: 8, // ₹ per km
  commissionRate: 0.10, // 10% platform commission
  defaultTolls: 0,

  // Matching
  matchingWeights: {
    route: 0.40,
    time: 0.30,
    budget: 0.20,
    capacity: 0.10,
  },
  proPriorityBonus: 3, // small boost, never overrides safety
  defaultTimeWindowMinutes: 30,
  routeBufferMeters: 500, // corridor buffer for route overlap

  // Trip
  tripStatuses: ['POSTED', 'MATCHED', 'ACCEPTED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
};

module.exports = RIDE_CONFIG;
