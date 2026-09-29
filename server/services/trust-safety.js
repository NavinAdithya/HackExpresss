/**
 * Safety & Trust Service — Hard filters and trust score management.
 *
 * Safety is a HARD FILTER, not a scoring factor.
 * Candidates that fail safety are REMOVED before scoring.
 * They are never scored, never shown, never returned.
 */

const SAFETY_CONFIG = require('../config/safety');

/**
 * Apply safety hard filters to candidates.
 * Returns only candidates that pass ALL safety gates.
 *
 * PURE FUNCTION — no DB, no Redis, no API calls.
 *
 * @param {Object} trip - The trip seeking matches
 * @param {Object} tripUser - The user who posted the trip
 * @param {Array} candidates - Array of { trip, user } objects
 * @returns {Array} Filtered candidates
 */
function applySafetyFilter(trip, tripUser, candidates) {
  return candidates.filter(({ trip: candidateTrip, user: candidateUser }) => {
    // Gate 1: Verified-only (hard gate)
    if (SAFETY_CONFIG.verifiedOnlyIsHardGate) {
      // If trip requires verified, candidate must be verified
      if (trip.verifiedOnly && !candidateUser.verified) return false;
      // If candidate requires verified, trip user must be verified
      if (candidateTrip.verifiedOnly && !tripUser.verified) return false;
    }

    // Gate 2: Women-only (hard gate)
    if (SAFETY_CONFIG.womenOnlyIsHardGate) {
      // If trip requires women-only, candidate must be female
      if (trip.womenOnly && candidateUser.gender !== 'female') return false;
      // If candidate requires women-only, trip user must be female
      if (candidateTrip.womenOnly && tripUser.gender !== 'female') return false;
    }

    return true;
  });
}

/**
 * Update trust score based on a new rating.
 * @param {number} currentScore - Current trust score
 * @param {number} rating - New rating (1–5)
 * @returns {number} Updated trust score
 */
function updateTrustScore(currentScore, rating) {
  // Rating of 3 is neutral, above 3 increases, below decreases
  const delta = (rating - 3) * SAFETY_CONFIG.ratingImpactOnTrust;
  const newScore = Math.max(
    SAFETY_CONFIG.trustScoreMin,
    Math.min(SAFETY_CONFIG.trustScoreMax, currentScore + delta)
  );
  return Math.round(newScore);
}

module.exports = { applySafetyFilter, updateTrustScore, calculateTrustScore: require('./trust-score').calculateTrustScore };
