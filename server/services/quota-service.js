/**
 * PO → PO — Authoritative Server-Side Commute Quota Engine
 *
 * SPECIFICATION COMPLIANCE:
 * - Daily ride limit must NEVER be incremented merely because the user:
 *   - clicks Share My Commute
 *   - creates a TravellerCommute
 *   - performs a search
 *   - receives no passenger match
 *   - receives no suitable passenger
 *   - has a pending/unconfirmed request
 *
 * STATUS RULES:
 * - CREATED                       → 0
 * - SEARCHING                     → 0
 * - NO_MATCH                      → 0
 * - EXPIRED                       → 0
 * - PENDING                       → 0
 * - CANCELLED_BEFORE_CONFIRMATION → 0
 * - CANCELLED (before start)      → 0 (Releases reserved quota)
 * - CONFIRMED                     → 1
 * - ACCEPTED                      → 1
 * - VERIFYING                     → 1
 * - READY_TO_START                → 1
 * - IN_PROGRESS                   → 1
 * - COMPLETED                     → 1
 *
 * AUTHORITATIVE RULE:
 * - Maximum 2 confirmed shared commutes per user per calendar day.
 * - Exposes: usedRideCount, remainingRideCount, quotaResetAt.
 * - Explicitly distinguishes:
 *   search attempts, commute publications, passenger matches, confirmed rides, completed rides.
 */

const Trip = require('../models/Trip');
const Match = require('../models/Match');
const RIDE_CONFIG = require('../config/ride');

const QUOTA_CONFIG = {
  maxRidesPerDay: RIDE_CONFIG.maxRidesPerDay || 2,

  // Statuses that consume daily quota (established passenger relationship)
  quotaConsumingStatuses: [
    'CONFIRMED',
    'ACCEPTED',
    'VERIFYING',
    'READY_TO_START',
    'IN_PROGRESS',
    'COMPLETED',
  ],

  // Statuses that DO NOT consume daily quota
  nonConsumingStatuses: [
    'CREATED',
    'SEARCHING',
    'POSTED',
    'NO_MATCH',
    'EXPIRED',
    'PENDING',
    'CANCELLED',
    'CANCELLED_BEFORE_CONFIRMATION',
    'IDENTITY_MISMATCH',
  ],
};

/**
 * Returns calendar day boundaries [startOfDay, endOfDay, resetAt]
 */
function getCalendarDayBounds(date = new Date()) {
  const d = new Date(date);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const resetAt = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return { startOfDay, endOfDay, resetAt };
}

/**
 * Pure evaluation function.
 * Given a list of trips and a user ID, deterministically computes the daily quota.
 *
 * @param {Array} trips - Array of trip documents/objects
 * @param {string} userId - User ID to evaluate
 * @param {Date} [referenceDate] - Date to evaluate against (defaults to now)
 * @returns {Object} Quota evaluation result
 */
function calculateQuotaFromTripList(trips = [], userId, referenceDate = new Date()) {
  const userIdStr = userId ? userId.toString() : '';
  const { startOfDay, endOfDay, resetAt } = getCalendarDayBounds(referenceDate);

  // Filter trips for this user on this calendar day
  const userTrips = trips.filter((t) => {
    const isUser = (t.userId?.toString() === userIdStr) || (t.matchedUserId?.toString() === userIdStr);
    if (!isUser) return false;

    // Check date against createdAt or departureTime
    const tripDate = t.createdAt ? new Date(t.createdAt) : (t.departureTime ? new Date(t.departureTime) : null);
    if (!tripDate || isNaN(tripDate.getTime())) return true;
    return tripDate >= startOfDay && tripDate <= endOfDay;
  });

  // Track different concepts separately:
  let searchAttempts = 0;
  let commutePublications = 0;
  let passengerMatches = 0;
  let confirmedRides = 0;
  let completedRides = 0;
  let cancelledBeforeStart = 0;

  // Deduplicate by matchId or paired trip IDs to avoid counting paired records twice
  const processedRides = new Set();

  for (const trip of userTrips) {
    const rideKey = trip.matchId
      ? trip.matchId.toString()
      : (trip.matchedTripId ? [trip._id.toString(), trip.matchedTripId.toString()].sort().join('_') : trip._id.toString());

    const status = (trip.status || 'POSTED').toUpperCase();

    // 1. Commute Publications (Posted commutes looking for partners)
    if (trip.userId?.toString() === userIdStr) {
      commutePublications += 1;
      searchAttempts += 1;
    }

    // 2. Passenger matches
    if (trip.matchedUserId) {
      passengerMatches += 1;
    }

    // Deduplicate paired ride records for quota counting
    if (processedRides.has(rideKey)) {
      continue;
    }
    processedRides.add(rideKey);

    // 3. Status Rules:
    if (status === 'COMPLETED') {
      completedRides += 1;
    } else if (['CONFIRMED', 'ACCEPTED', 'VERIFYING', 'READY_TO_START', 'IN_PROGRESS'].includes(status)) {
      confirmedRides += 1;
    } else if (status === 'CANCELLED') {
      // If cancelled before trip started (startedAt is null), quota is released
      if (!trip.startedAt) {
        cancelledBeforeStart += 1;
      } else {
        // Cancelled during trip
        completedRides += 1;
      }
    }
  }

  const maxRides = QUOTA_CONFIG.maxRidesPerDay;
  const usedRideCount = confirmedRides + completedRides;
  const remainingRideCount = Math.max(0, maxRides - usedRideCount);
  const canConfirmRide = remainingRideCount > 0;

  return {
    maxRidesPerDay: maxRides,
    usedRideCount,
    remainingRideCount,
    canConfirmRide,
    quotaResetAt: resetAt.toISOString(),
    metrics: {
      searchAttempts,
      commutePublications,
      passengerMatches,
      confirmedRides,
      completedRides,
      cancelledBeforeStart,
    },
    statusRules: {
      CREATED: 0,
      SEARCHING: 0,
      NO_MATCH: 0,
      EXPIRED: 0,
      PENDING: 0,
      CANCELLED_BEFORE_CONFIRMATION: 0,
      CONFIRMED: 1,
      IN_PROGRESS: 1,
      COMPLETED: 1,
    },
  };
}

/**
 * Authoritative Server-Side Query:
 * Derives the user's daily commute quota from actual database records.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Authoritative daily quota object
 */
async function getDailyCommuteQuota(userId) {
  if (!userId) {
    const { resetAt } = getCalendarDayBounds();
    return {
      maxRidesPerDay: QUOTA_CONFIG.maxRidesPerDay,
      usedRideCount: 0,
      remainingRideCount: QUOTA_CONFIG.maxRidesPerDay,
      canConfirmRide: true,
      quotaResetAt: resetAt.toISOString(),
      metrics: {
        searchAttempts: 0,
        commutePublications: 0,
        passengerMatches: 0,
        confirmedRides: 0,
        completedRides: 0,
        cancelledBeforeStart: 0,
      },
    };
  }

  try {
    const userIdStr = userId.toString();
    const { startOfDay, endOfDay, resetAt } = getCalendarDayBounds();

    // Query all trips created or scheduled for today involving this user
    const trips = await Trip.find({
      $or: [{ userId: userIdStr }, { matchedUserId: userIdStr }],
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { departureTime: { $gte: startOfDay, $lte: endOfDay } },
      ],
    });

    return calculateQuotaFromTripList(trips, userIdStr);
  } catch (err) {
    console.error('[QUOTA] getDailyCommuteQuota error:', err);
    const { resetAt } = getCalendarDayBounds();
    return {
      maxRidesPerDay: QUOTA_CONFIG.maxRidesPerDay,
      usedRideCount: 0,
      remainingRideCount: QUOTA_CONFIG.maxRidesPerDay,
      canConfirmRide: true,
      quotaResetAt: resetAt.toISOString(),
      metrics: {
        searchAttempts: 0,
        commutePublications: 0,
        passengerMatches: 0,
        confirmedRides: 0,
        completedRides: 0,
        cancelledBeforeStart: 0,
      },
    };
  }
}

/**
 * Validates that both parties have available daily ride quota before confirming a ride.
 *
 * @param {string} userAId - First user ID
 * @param {string} userBId - Second user ID
 * @returns {Promise<{ allowed: boolean, reason?: string, quotaA: Object, quotaB: Object }>}
 */
async function validateRideConfirmationQuota(userAId, userBId) {
  const quotaA = await getDailyCommuteQuota(userAId);
  const quotaB = await getDailyCommuteQuota(userBId);

  if (quotaA.remainingRideCount <= 0) {
    return {
      allowed: false,
      reason: 'You have already reached your limit of 2 confirmed shared commutes for today.',
      quotaA,
      quotaB,
    };
  }

  if (quotaB.remainingRideCount <= 0) {
    return {
      allowed: false,
      reason: 'The other commuter has already reached their limit of 2 confirmed shared commutes for today.',
      quotaA,
      quotaB,
    };
  }

  return {
    allowed: true,
    quotaA,
    quotaB,
  };
}

module.exports = {
  QUOTA_CONFIG,
  getCalendarDayBounds,
  calculateQuotaFromTripList,
  getDailyCommuteQuota,
  validateRideConfirmationQuota,
};
