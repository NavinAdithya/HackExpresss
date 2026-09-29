/**
 * Matching Engine — Pure deterministic scoring.
 *
 * Architecture:
 *   Candidate retrieval (DB)
 *     ↓
 *   Safety hard filter (trust-safety.js)
 *     ↓
 *   Eligibility filter
 *     ↓
 *   PURE DETERMINISTIC SCORER ← this file
 *     ↓
 *   PRO priority adjustment
 *     ↓
 *   Rank
 *     ↓
 *   Gemini explanation
 *
 * The scoring functions in this file are PURE:
 * - No MongoDB calls
 * - No Redis calls
 * - No Gemini calls
 * - No OSRM calls
 * - No network side effects
 * - Fully unit-testable
 */

const RIDE_CONFIG = require('../config/ride');
const { calculateRouteOverlap } = require('./route-service');

/**
 * Compute time compatibility between two trips.
 * PURE FUNCTION.
 *
 * @param {Date|string} timeA - Departure time A
 * @param {number} windowA - Flexibility in minutes
 * @param {Date|string} timeB - Departure time B
 * @param {number} windowB - Flexibility in minutes
 * @returns {number} Compatibility score (0–100)
 */
function computeTimeCompatibility(timeA, windowA, timeB, windowB) {
  const tA = new Date(timeA).getTime();
  const tB = new Date(timeB).getTime();
  const wA = (windowA || 30) * 60 * 1000; // to ms
  const wB = (windowB || 30) * 60 * 1000;

  // Windows
  const startA = tA - wA;
  const endA = tA + wA;
  const startB = tB - wB;
  const endB = tB + wB;

  // Overlap
  const overlapStart = Math.max(startA, startB);
  const overlapEnd = Math.min(endA, endB);

  if (overlapStart >= overlapEnd) return 0; // No overlap

  const overlap = overlapEnd - overlapStart;
  const maxWindow = Math.max(endA - startA, endB - startB);

  return Math.round((overlap / maxWindow) * 100);
}

/**
 * Compute budget compatibility.
 * PURE FUNCTION.
 *
 * @param {{ min: number, max: number }} budgetA
 * @param {{ min: number, max: number }} budgetB
 * @returns {{ compatible: boolean, score: number }}
 */
function computeBudgetCompatibility(budgetA, budgetB) {
  const overlapMin = Math.max(budgetA.min || 0, budgetB.min || 0);
  const overlapMax = Math.min(budgetA.max || 500, budgetB.max || 500);

  if (overlapMin > overlapMax) {
    return { compatible: false, score: 0 };
  }

  const totalRange = Math.max(budgetA.max || 500, budgetB.max || 500) - Math.min(budgetA.min || 0, budgetB.min || 0);
  const overlap = overlapMax - overlapMin;

  return {
    compatible: true,
    score: totalRange > 0 ? Math.round((overlap / totalRange) * 100) : 100,
  };
}

/**
 * Compute capacity compatibility.
 * PURE FUNCTION.
 *
 * @param {number} seatsOffered - Seats available (driver)
 * @param {number} seatsNeeded - Seats needed (passenger)
 * @returns {{ compatible: boolean, score: number }}
 */
function computeCapacityCompatibility(seatsOffered, seatsNeeded) {
  const compatible = seatsOffered >= seatsNeeded;
  return {
    compatible,
    score: compatible ? 100 : 0,
  };
}

/**
 * Compute the final deterministic match score.
 * PURE FUNCTION — no DB, no API, no side effects.
 *
 * @param {Object} data - Pre-computed compatibility data
 * @returns {Object} Scored result with dimension breakdowns
 */
function scoreMatch(data) {
  const { routeOverlap, timeCompatibility, budgetCompatibility, capacityCompatibility } = data;

  const w = RIDE_CONFIG.matchingWeights;

  const routeScore = routeOverlap;
  const timeScore = timeCompatibility;
  const budgetScore = budgetCompatibility.compatible ? budgetCompatibility.score : 0;
  const capacityScore = capacityCompatibility.compatible ? 100 : 0;

  // Weighted composite
  const finalScore =
    routeScore * w.route +
    timeScore * w.time +
    budgetScore * w.budget +
    capacityScore * w.capacity;

  return {
    routeScore: Math.round(routeScore),
    timeScore: Math.round(timeScore),
    budgetScore: Math.round(budgetScore),
    capacityScore: Math.round(capacityScore),
    finalScore: Math.round(finalScore * 100) / 100,
    budgetCompatible: budgetCompatibility.compatible,
    capacityCompatible: capacityCompatibility.compatible,
  };
}

/**
 * Apply PRO priority adjustment to ranked matches.
 * PRO MUST NEVER BYPASS SAFETY — this runs AFTER all filters.
 * PURE FUNCTION.
 *
 * @param {Array} rankedMatches - Already scored and safety-filtered matches
 * @param {Object} usersMap - userId → user object
 * @returns {Array} Re-ranked matches
 */
function applyProPriority(rankedMatches, usersMap) {
  return rankedMatches
    .map((match) => ({
      ...match,
      proBoost: usersMap[match.userId]?.plan === 'PRO' ? RIDE_CONFIG.proPriorityBonus : 0,
      adjustedScore: match.finalScore + (usersMap[match.userId]?.plan === 'PRO' ? RIDE_CONFIG.proPriorityBonus : 0),
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}

/**
 * Full matching pipeline orchestrator.
 * This is the ONLY function that touches external dependencies (DB, Gemini).
 * It calls pure functions for the actual scoring.
 */
async function findMatches(trip, tripUser, candidateTrips, candidateUsers, geminiService) {
  const { applySafetyFilter } = require('./trust-safety');

  // Step 1: Prepare candidates with user data
  const candidates = candidateTrips.map((ct) => ({
    trip: ct,
    user: candidateUsers.find((u) => u._id.toString() === ct.userId.toString()),
  })).filter((c) => c.user); // Remove orphaned trips

  // Step 2: SAFETY HARD FILTER — remove before scoring
  const safeCandidates = applySafetyFilter(trip, tripUser, candidates);

  // Step 3: Eligibility filter (basic role matching)
  const eligible = safeCandidates.filter(({ trip: ct }) => {
    // Driver must match with passenger and vice versa
    if (trip.role === 'driver' && ct.role !== 'passenger') return false;
    if (trip.role === 'passenger' && ct.role !== 'driver') return false;
    return true;
  });

  // Step 4: PURE DETERMINISTIC SCORING
  const scored = eligible.map(({ trip: ct, user: cu }) => {
    // Compute route overlap from pre-calculated OSRM routes
    const routeOverlap = calculateRouteOverlap(
      trip.route?.coordinates || [],
      ct.route?.coordinates || [],
      RIDE_CONFIG.routeBufferMeters
    );

    const timeCompatibility = computeTimeCompatibility(
      trip.departureTime,
      trip.timeWindow,
      ct.departureTime,
      ct.timeWindow
    );

    const budgetCompatibility = computeBudgetCompatibility(
      { min: trip.budgetMin, max: trip.budgetMax },
      { min: ct.budgetMin, max: ct.budgetMax }
    );

    // For capacity: driver's seats vs passenger's needs
    const driverTrip = trip.role === 'driver' ? trip : ct;
    const passengerTrip = trip.role === 'passenger' ? trip : ct;
    const capacityCompatibility = computeCapacityCompatibility(
      driverTrip.seatCount,
      passengerTrip.seatCount
    );

    const scores = scoreMatch({
      routeOverlap,
      timeCompatibility,
      budgetCompatibility,
      capacityCompatibility,
    });

    return {
      tripId: ct._id,
      userId: cu._id,
      userName: cu.name,
      userGender: cu.gender,
      userVerified: cu.verified,
      userTrustScore: cu.trustScore,
      userPlan: cu.plan,
      userPhoto: cu.profilePhoto,
      candidateTrip: ct,
      ...scores,
    };
  });

  // Step 5: PRO PRIORITY ADJUSTMENT (after safety)
  const usersMap = {};
  candidateUsers.forEach((u) => {
    usersMap[u._id.toString()] = u;
  });
  const ranked = applyProPriority(scored, usersMap);

  // Step 6: Gemini explanations (for top results)
  const topResults = ranked.slice(0, 5);
  for (const match of topResults) {
    try {
      const explanation = await geminiService.generateMatchExplanation({
        routeOverlap: match.routeScore,
        timeCompatibility: match.timeScore,
        capacityCompatible: match.capacityCompatible,
        budgetCompatible: match.budgetCompatible,
        finalScore: match.finalScore,
      });
      match.explanation = explanation.explanation;
    } catch (err) {
      match.explanation = `${match.routeScore}% route overlap with ${match.timeScore}% timing compatibility.`;
    }
  }

  return topResults;
}

module.exports = {
  computeTimeCompatibility,
  computeBudgetCompatibility,
  computeCapacityCompatibility,
  scoreMatch,
  applyProPriority,
  findMatches,
};
