/**
 * PO → PO — Deterministic Trust Score Service
 *
 * SPECIFICATION COMPLIANCE:
 * - Deterministically calculated from actual PO → PO activity and stored/recomputed server-side.
 * - Score range: 0–100.
 * - Authoritative backend calculation.
 *
 * ALLOWED FACTORS:
 * 1. Account / Identity verification status (+25 pts max)
 * 2. Approved traveller status (+15 pts max)
 * 3. Completed trips count (+2 pts per completed trip, up to +20 pts max)
 * 4. Average community ratings (up to +25 pts max, scaled from 5.0 stars; new user baseline = 15 pts)
 * 5. Cancellation reliability (+15 pts max for 0 cancellations, -5 pts per cancellation)
 * 6. Safety & Conduct penalties (-15 pts per no-show, -25 pts per unresolved safety alert)
 *
 * STRICT PROHIBITIONS:
 * - NO gender
 * - NO religion
 * - NO caste
 * - NO income
 * - NO arbitrary AI judgment
 * - NO face similarity confidence as a trust metric
 * - NO match compatibility score (Trust Score and Match Compatibility are strictly separate)
 */

const User = require('../models/User');
const Trip = require('../models/Trip');
const Rating = require('../models/Rating');
const Penalty = require('../models/Penalty');
const SOSAlert = require('../models/SOSAlert');

const TRUST_CONFIG = {
  weights: {
    identityVerification: 25,
    approvedTraveller: 15,
    completedTripsMax: 20,
    pointsPerCompletedTrip: 2,
    ratingsMax: 25,
    defaultRatingsBaseline: 15, // 3.0-star equivalent for members with 0 ratings yet
    cancellationMax: 15,
    cancellationPenaltyPerEvent: 5,
    noShowPenalty: 15,
    unresolvedSafetyPenalty: 25,
  },
  minScore: 0,
  maxScore: 100,
};

/**
 * Deterministic pure calculation function.
 * Given user attributes and activity counts, returns exact score (0-100) and full breakdown.
 *
 * @param {Object} user - User document or object with { accountVerified, verified, driverStatus }
 * @param {Object} activity - { completedTripsCount, averageRating, ratingsCount, cancellationsCount, noShowsCount, unresolvedSafetyCount }
 * @returns {Object} { score, tier, tierLabel, breakdown, factors, calculatedAt }
 */
function calculateTrustScore(user = {}, activity = {}) {
  // 1. Account / Identity Verification Status (+25 max)
  const isVerified = Boolean(user.accountVerified ?? user.verified ?? false);
  const identityPts = isVerified ? TRUST_CONFIG.weights.identityVerification : 0;

  // 2. Approved Traveller Status (+15 max)
  const isApprovedTraveller = user.driverStatus === 'APPROVED';
  const travellerPts = isApprovedTraveller ? TRUST_CONFIG.weights.approvedTraveller : 0;

  // 3. Completed PO → PO Commutes (+20 max, +2 per trip)
  const completedTrips = Math.max(0, Number(activity.completedTripsCount) || 0);
  const tripsPts = Math.min(
    TRUST_CONFIG.weights.completedTripsMax,
    completedTrips * TRUST_CONFIG.weights.pointsPerCompletedTrip
  );

  // 4. Average Community Ratings (+25 max)
  const ratingsCount = Math.max(0, Number(activity.ratingsCount) || 0);
  let ratingsPts = TRUST_CONFIG.weights.defaultRatingsBaseline;
  let avgRating = null;

  if (ratingsCount > 0 && typeof activity.averageRating === 'number' && !isNaN(activity.averageRating)) {
    avgRating = Math.max(1.0, Math.min(5.0, activity.averageRating));
    ratingsPts = Math.round((avgRating / 5.0) * TRUST_CONFIG.weights.ratingsMax);
  }

  // 5. Cancellation Reliability (+15 max, -5 per cancellation)
  const cancellations = Math.max(0, Number(activity.cancellationsCount) || 0);
  const cancellationPts = Math.max(
    0,
    TRUST_CONFIG.weights.cancellationMax - (cancellations * TRUST_CONFIG.weights.cancellationPenaltyPerEvent)
  );

  // 6. Safety & Conduct Penalties (Deductions: -15 per no-show, -25 per unresolved safety alert)
  const noShows = Math.max(0, Number(activity.noShowsCount) || 0);
  const unresolvedSafety = Math.max(0, Number(activity.unresolvedSafetyCount) || 0);
  const penaltyPts = (noShows * TRUST_CONFIG.weights.noShowPenalty) +
                     (unresolvedSafety * TRUST_CONFIG.weights.unresolvedSafetyPenalty);

  // Compute total clamped deterministic score (0 - 100)
  const rawScore = (identityPts + travellerPts + tripsPts + ratingsPts + cancellationPts) - penaltyPts;
  const finalScore = Math.max(TRUST_CONFIG.minScore, Math.min(TRUST_CONFIG.maxScore, Math.round(rawScore)));

  // Tier classification
  let tier = 'BUILDING';
  let tierLabel = 'Building Trust (50–64)';
  if (finalScore >= 90) {
    tier = 'EXCELLENT';
    tierLabel = 'Exceptional Trust (90–100)';
  } else if (finalScore >= 80) {
    tier = 'HIGH';
    tierLabel = 'High Trust (80–89)';
  } else if (finalScore >= 65) {
    tier = 'ESTABLISHED';
    tierLabel = 'Established Trust (65–79)';
  } else if (finalScore < 50) {
    tier = 'NEEDS_REVIEW';
    tierLabel = 'Needs Safety Review (<50)';
  }

  const factors = [
    {
      id: 'identity_verification',
      name: 'Account & Identity Verification',
      points: identityPts,
      maxPoints: TRUST_CONFIG.weights.identityVerification,
      status: isVerified ? 'Verified' : 'Pending Verification',
      statusType: isVerified ? 'positive' : 'neutral',
      description: isVerified
        ? 'Identity and phone number verified on PO → PO'
        : 'Complete phone verification to unlock baseline trust',
    },
    {
      id: 'traveller_status',
      name: 'Approved Traveller Status',
      points: travellerPts,
      maxPoints: TRUST_CONFIG.weights.approvedTraveller,
      status: isApprovedTraveller
        ? 'Approved Traveller'
        : (user.driverStatus === 'PENDING' ? 'Verification Pending' : 'Not Registered'),
      statusType: isApprovedTraveller ? 'positive' : 'neutral',
      description: isApprovedTraveller
        ? 'Government Driving Licence & vehicle verified'
        : 'Register and verify vehicle details to earn traveller trust',
    },
    {
      id: 'completed_trips',
      name: 'Completed Commutes',
      points: tripsPts,
      maxPoints: TRUST_CONFIG.weights.completedTripsMax,
      status: `${completedTrips} completed commute${completedTrips === 1 ? '' : 's'}`,
      statusType: completedTrips > 0 ? 'positive' : 'neutral',
      description: `+${TRUST_CONFIG.weights.pointsPerCompletedTrip} pts per completed PO → PO commute (up to ${TRUST_CONFIG.weights.completedTripsMax} pts)`,
    },
    {
      id: 'ratings',
      name: 'Community Ratings',
      points: ratingsPts,
      maxPoints: TRUST_CONFIG.weights.ratingsMax,
      status: avgRating !== null
        ? `${avgRating.toFixed(1)} ★ (${ratingsCount} review${ratingsCount === 1 ? '' : 's'})`
        : 'New Member Baseline (3.0★ equiv.)',
      statusType: ratingsPts >= 20 ? 'positive' : 'neutral',
      description: avgRating !== null
        ? 'Weighted average rating from verified commute partners'
        : 'New members start with a 15/25 neutral rating baseline',
    },
    {
      id: 'cancellation_reliability',
      name: 'Commute Reliability',
      points: cancellationPts,
      maxPoints: TRUST_CONFIG.weights.cancellationMax,
      status: cancellations === 0
        ? '100% Reliable (0 cancellations)'
        : `${cancellations} cancellation${cancellations === 1 ? '' : 's'} (-${cancellations * TRUST_CONFIG.weights.cancellationPenaltyPerEvent} pts)`,
      statusType: cancellationPts >= 10 ? 'positive' : 'warning',
      description: 'Deductions for post-booking trip cancellations',
    },
    {
      id: 'conduct_penalties',
      name: 'Safety & Conduct History',
      points: penaltyPts > 0 ? -penaltyPts : 0,
      maxPoints: 0,
      status: penaltyPts === 0
        ? 'Clean Safety Record'
        : `-${penaltyPts} penalty points (${noShows} no-shows, ${unresolvedSafety} safety reports)`,
      statusType: penaltyPts === 0 ? 'positive' : 'danger',
      description: 'Strict penalties for verified no-shows or unresolved safety reports',
    },
  ];

  return {
    score: finalScore,
    tier,
    tierLabel,
    breakdown: {
      identityVerification: factors[0],
      travellerStatus: factors[1],
      completedTrips: factors[2],
      ratings: factors[3],
      cancellationReliability: factors[4],
      conductPenalties: factors[5],
    },
    factors,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch authoritative user activity from DB or in-memory store.
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Activity object
 */
async function fetchUserActivity(userId) {
  if (!userId) {
    return {
      completedTripsCount: 0,
      averageRating: null,
      ratingsCount: 0,
      cancellationsCount: 0,
      noShowsCount: 0,
      unresolvedSafetyCount: 0,
    };
  }

  try {
    const idStr = userId.toString();

    // 1. Completed trips as passenger or driver
    let completedTripsCount = 0;
    try {
      completedTripsCount = await Trip.countDocuments({
        $or: [{ userId: idStr }, { matchedUserId: idStr }],
        status: 'COMPLETED',
      });
    } catch (e) {
      console.warn('[TRUST-SCORE] Trip count error:', e.message);
    }

    // 2. Cancellations by user
    let cancellationsCount = 0;
    try {
      cancellationsCount = await Trip.countDocuments({
        userId: idStr,
        status: 'CANCELLED',
      });
    } catch (e) {
      console.warn('[TRUST-SCORE] Cancellation count error:', e.message);
    }

    // 3. No-Shows
    let noShowsCount = 0;
    try {
      const tripNoShows = await Trip.countDocuments({
        userId: idStr,
        status: 'NO_SHOW',
      });
      const penaltyNoShows = await Penalty.countDocuments({
        riderId: idStr,
        reason: 'NO_SHOW',
      });
      noShowsCount = Math.max(tripNoShows, penaltyNoShows);
    } catch (e) {
      console.warn('[TRUST-SCORE] No-show count error:', e.message);
    }

    // 4. Ratings received by user
    let ratingsCount = 0;
    let averageRating = null;
    try {
      const ratings = await Rating.find({ ratedUser: idStr });
      if (Array.isArray(ratings) && ratings.length > 0) {
        ratingsCount = ratings.length;
        const sum = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        averageRating = sum / ratingsCount;
      }
    } catch (e) {
      console.warn('[TRUST-SCORE] Rating query error:', e.message);
    }

    // 5. Active/Unresolved Safety Incidents
    let unresolvedSafetyCount = 0;
    try {
      unresolvedSafetyCount = await SOSAlert.countDocuments({
        userId: idStr,
        status: 'ACTIVE',
      });
    } catch (e) {
      console.warn('[TRUST-SCORE] SOSAlert count error:', e.message);
    }

    return {
      completedTripsCount,
      averageRating,
      ratingsCount,
      cancellationsCount,
      noShowsCount,
      unresolvedSafetyCount,
    };
  } catch (err) {
    console.error('[TRUST-SCORE] fetchUserActivity failed:', err);
    return {
      completedTripsCount: 0,
      averageRating: null,
      ratingsCount: 0,
      cancellationsCount: 0,
      noShowsCount: 0,
      unresolvedSafetyCount: 0,
    };
  }
}

/**
 * Authoritative Server-Side Trust Score Recomputation.
 * Fetches user and user activity from the database, computes the deterministic score,
 * updates the user model in the database, and returns the result.
 *
 * @param {string|Object} userIdOrUser - User ID string or User document
 * @returns {Promise<Object>} { score, tier, tierLabel, breakdown, factors, calculatedAt }
 */
async function computeUserTrustScore(userIdOrUser) {
  try {
    let user = userIdOrUser;
    let userId = user?._id || user;

    if (!user || typeof user === 'string' || !user.save) {
      user = await User.findById(userId);
    }

    if (!user) {
      // Fallback for non-existent user
      return calculateTrustScore({ accountVerified: true }, {});
    }

    const activity = await fetchUserActivity(user._id);
    const result = calculateTrustScore(user, activity);

    // Persist score & breakdown on user
    user.trustScore = result.score;
    user.trustScoreBreakdown = result;
    if (typeof user.save === 'function') {
      await user.save();
    }

    return result;
  } catch (err) {
    console.error('[TRUST-SCORE] computeUserTrustScore error:', err);
    return calculateTrustScore({ accountVerified: true }, {});
  }
}

module.exports = {
  TRUST_CONFIG,
  calculateTrustScore,
  fetchUserActivity,
  computeUserTrustScore,
};
