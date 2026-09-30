/**
 * Matching Engine — Pure deterministic scoring & 4 Match Types
 *
 * Architecture:
 *   Candidate retrieval (DB)
 *     ↓
 *   Safety hard filter (trust-safety.js — Women-only, etc.)
 *     ↓
 *   Traveller approval filter (Only approved travellers can share commute)
 *     ↓
 *   PURE DETERMINISTIC SCORER (35% Route, 20% Pickup, 20% Dest, 15% Time, 5% Transport, 5% Cost)
 *     ↓
 *   Match Type Classification (EXACT_DESTINATION, NEARBY_DESTINATION, ROUTE_CORRIDOR, ACCEPTABLE_DETOUR)
 *     ↓
 *   PRO priority adjustment (boost applied ONLY after safety)
 *     ↓
 *   Gemini explanation
 *
 * The scoring functions in this file are PURE:
 * - No DB / network calls inside pure scoring
 * - Fully deterministic & unit-testable
 */

const RIDE_CONFIG = require('../config/ride');
const { getMatchQuality } = require('../config/ride');
const { calculateRouteOverlap } = require('./route-service');

/**
 * Compute haversine distance in kilometers between two [lng, lat] points.
 * PURE FUNCTION.
 */
function haversineDistanceKm(coordsA, coordsB) {
  if (!coordsA || !coordsB) return 999;
  const [lng1, lat1] = coordsA;
  const [lng2, lat2] = coordsB;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Compute time compatibility between two trips.
 * PURE FUNCTION.
 */
function computeTimeCompatibility(timeA, windowA, timeB, windowB) {
  const tA = new Date(timeA).getTime();
  const tB = new Date(timeB).getTime();
  const wA = (windowA || 30) * 60 * 1000;
  const wB = (windowB || 30) * 60 * 1000;

  const startA = tA - wA;
  const endA = tA + wA;
  const startB = tB - wB;
  const endB = tB + wB;

  const overlapStart = Math.max(startA, startB);
  const overlapEnd = Math.min(endA, endB);

  if (overlapStart >= overlapEnd) return 0;

  const overlap = overlapEnd - overlapStart;
  const maxWindow = Math.max(endA - startA, endB - startB);

  return Math.round((overlap / maxWindow) * 100);
}

/**
 * Compute budget compatibility.
 * PURE FUNCTION.
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
 */
function computeCapacityCompatibility(seatsOffered, seatsNeeded) {
  const compatible = seatsOffered >= seatsNeeded;
  return {
    compatible,
    score: compatible ? 100 : 0,
  };
}

/**
 * Classify match into one of the 4 official match types.
 * PURE FUNCTION.
 *
 * 1. EXACT_DESTINATION
 * 2. NEARBY_DESTINATION
 * 3. ROUTE_CORRIDOR
 * 4. ACCEPTABLE_DETOUR
 */
function classifyMatchType(destinationDistanceKm, routeOverlap, detourKm) {
  if (destinationDistanceKm <= 0.4) {
    return 'EXACT_DESTINATION';
  }
  if (destinationDistanceKm <= (RIDE_CONFIG.nearbyDestinationRadiusKm || 3.0)) {
    return 'NEARBY_DESTINATION';
  }
  if (routeOverlap >= 50) {
    return 'ROUTE_CORRIDOR';
  }
  if (detourKm <= (RIDE_CONFIG.maxDetourKm || 5.0)) {
    return 'ACCEPTABLE_DETOUR';
  }
  return 'NEARBY_DESTINATION';
}

/**
 * Compute the final deterministic match score using Section 47 weights:
 * - Route overlap: 35%
 * - Pickup proximity: 20%
 * - Destination proximity: 20%
 * - Timing: 15%
 * - Transport: 5%
 * - Cost compatibility: 5%
 *
 * Safety is NOT SCORED (it is a hard filter).
 * PURE FUNCTION.
 */
function scoreMatch(data) {
  const {
    routeOverlap = 0,
    pickupDistanceKm = 0,
    destinationDistanceKm = 0,
    timeCompatibility = 0,
    budgetCompatibility = { compatible: true, score: 100 },
    capacityCompatibility = { compatible: true, score: 100 },
    transportCompatible = true,
  } = data;

  const w = RIDE_CONFIG.matchingWeights;

  // Proximity scores invert distance (0 km = 100%, 5 km = 0%)
  const pickupScore = Math.max(0, Math.round((1 - Math.min(pickupDistanceKm, 5) / 5) * 100));
  const destinationScore = Math.max(0, Math.round((1 - Math.min(destinationDistanceKm, 5) / 5) * 100));
  const routeScore = Math.max(0, Math.min(100, Math.round(routeOverlap)));
  const timeScore = Math.max(0, Math.min(100, Math.round(timeCompatibility)));
  const transportScore = transportCompatible ? 100 : 0;
  const budgetScore = budgetCompatibility.compatible ? budgetCompatibility.score : 0;
  const capacityScore = capacityCompatibility.compatible ? 100 : 0;

  // Weighted score
  const finalScore = Math.round((
    routeScore * w.route +
    pickupScore * w.pickup +
    destinationScore * w.destination +
    timeScore * w.time +
    transportScore * w.transport +
    budgetScore * w.budget
  ) * 100) / 100;

  const detourKm = Math.round((pickupDistanceKm + destinationDistanceKm * 0.5) * 100) / 100;
  const matchType = classifyMatchType(destinationDistanceKm, routeOverlap, detourKm);
  const quality = getMatchQuality(finalScore);

  return {
    routeScore,
    pickupScore,
    destinationScore,
    timeScore,
    transportScore,
    budgetScore,
    capacityScore,
    finalScore,
    qualityTier: quality.key,
    qualityLabel: quality.label,
    qualityColor: quality.color,
    pickupDistanceKm,
    destinationDistanceKm,
    detourKm,
    matchType,
    budgetCompatible: budgetCompatibility.compatible,
    capacityCompatible: capacityCompatibility.compatible,
  };
}

/**
 * Apply PRO priority adjustment to ranked matches.
 * PRO MUST NEVER BYPASS SAFETY — this runs AFTER all filters.
 * PURE FUNCTION.
 */
function applyProPriority(rankedMatches, usersMap) {
  return rankedMatches
    .map((match) => {
      const isPro = usersMap[match.userId]?.plan === 'PRO';
      const proBoost = isPro ? RIDE_CONFIG.proPriorityBonus : 0;
      return {
        ...match,
        proBoost,
        adjustedScore: Math.round((match.finalScore + proBoost) * 100) / 100,
      };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}


/**
 * Score one (trip, candidate) pair with the deterministic Section 47 scorer.
 * Shared by the on-demand match search and the Daily Commute matcher so both
 * use exactly the same route / time / pickup / destination / cost logic.
 * PURE FUNCTION.
 */
function scorePair(trip, ct) {
  const routeOverlap = calculateRouteOverlap(
    trip.route?.coordinates || [],
    ct.route?.coordinates || [],
    RIDE_CONFIG.routeBufferMeters
  );

  const tripOriginCoords = trip.origin?.location?.coordinates || [0, 0];
  const ctOriginCoords = ct.origin?.location?.coordinates || [0, 0];
  const tripDestCoords = trip.destination?.location?.coordinates || [0, 0];
  const ctDestCoords = ct.destination?.location?.coordinates || [0, 0];

  const pickupDistanceKm = haversineDistanceKm(tripOriginCoords, ctOriginCoords);
  const destinationDistanceKm = haversineDistanceKm(tripDestCoords, ctDestCoords);

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

  const driverTrip = trip.role === 'driver' ? trip : ct;
  const passengerTrip = trip.role === 'passenger' ? trip : ct;
  const capacityCompatibility = computeCapacityCompatibility(
    driverTrip.seatCount,
    passengerTrip.seatCount
  );

  const scores = scoreMatch({
    routeOverlap,
    pickupDistanceKm,
    destinationDistanceKm,
    timeCompatibility,
    budgetCompatibility,
    capacityCompatibility,
    transportCompatible: true,
  });

  const departureDeltaMin = Math.round(
    (new Date(ct.departureTime).getTime() - new Date(trip.departureTime).getTime()) / 60000
  );

  return {
    ...scores,
    departureDeltaMin,
    detourMin: estimateDetourMinutes(scores.detourKm),
  };
}

/** Rough city-traffic conversion of detour distance to minutes (~25 km/h). PURE. */
function estimateDetourMinutes(detourKm) {
  return Math.max(0, Math.round((detourKm || 0) * (60 / RIDE_CONFIG.rankingSignals.cityAvgSpeedKmh)));
}

/**
 * Trust + community ranking signals. PURE FUNCTION.
 *
 * context = {
 *   trustByUser:   { [userId]: { overall, count, ... } }   // behavioural trust (1–10)
 *   sharedByUser:  { [userId]: [{ id, name, category }] }  // communities shared with the searcher
 * }
 *
 * - Trust adjusts rank by up to +maxBoost / -maxPenalty points, scaled by how many ratings back it up.
 *   A user with no ratings gets exactly 0 — being new is neither rewarded nor punished.
 * - Sharing a community adds a flat communityBoost.
 * - Neither can make an unviable route/time match viable.
 */
function applyRankingSignals(rankedMatches, context = {}) {
  const cfg = RIDE_CONFIG.rankingSignals;
  const trustByUser = context.trustByUser || {};
  const sharedByUser = context.sharedByUser || {};

  return rankedMatches
    .map((m) => {
      const uid = String(m.userId);
      const trust = trustByUser[uid];
      let trustAdjustment = 0;
      if (trust && trust.count > 0 && typeof trust.overall === 'number') {
        const confidence = Math.min(trust.count, cfg.fullConfidenceAtRatings) / cfg.fullConfidenceAtRatings;
        const raw = (trust.overall - cfg.neutralTrust) * cfg.pointsPerTrustPoint;
        trustAdjustment = Math.max(-cfg.maxTrustPenalty, Math.min(cfg.maxTrustBoost, raw)) * confidence;
      }
      const shared = sharedByUser[uid] || [];
      const communityBoost = shared.length > 0 ? cfg.communityBoost : 0;

      const base = m.adjustedScore ?? m.finalScore;
      return {
        ...m,
        userTrust: trust || { status: 'NEW_USER', level: 'NEW', label: 'New User', overall: null, count: 0 },
        sharedCommunities: shared,
        trustAdjustment: Math.round(trustAdjustment * 100) / 100,
        communityBoost,
        adjustedScore: Math.round((base + trustAdjustment + communityBoost) * 100) / 100,
      };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}

/**
 * Human-readable "why was this person recommended" list. PURE FUNCTION.
 */
function buildMatchReasons(match, context = {}) {
  const reasons = [];
  reasons.push(`${match.routeScore}% route compatibility`);

  const delta = match.departureDeltaMin;
  if (typeof delta === 'number') {
    if (Math.abs(delta) <= 2) reasons.push('Leaves at almost the same time');
    else reasons.push(`Leaves ${Math.abs(delta)} min ${delta < 0 ? 'earlier' : 'later'}`);
  }

  reasons.push(
    match.pickupDistanceKm <= 0.5
      ? 'Pickup within 500 m'
      : `Pickup ${match.pickupDistanceKm} km apart`
  );
  reasons.push(match.detourMin > 0 ? `+${match.detourMin} min detour` : 'No extra detour');

  const seats = match.candidateTrip?.role === 'driver' ? match.candidateTrip.seatCount : null;
  if (seats) reasons.push(`${seats} seat${seats === 1 ? '' : 's'} available`);

  if (match.sharedCommunities?.length) {
    reasons.push(`Same community: ${match.sharedCommunities.map((c) => c.name).join(', ')}`);
  }

  const t = match.userTrust;
  if (t && t.count > 0) {
    reasons.push(
      t.limitedHistory
        ? `Trust ${t.overall}/10 (limited history)`
        : `Trust ${t.overall}/10 from ${t.count} rated journeys`
    );
  } else {
    reasons.push('New member — no ratings yet');
  }
  return reasons;
}

/**
 * Full matching pipeline orchestrator.
 */
async function findMatches(trip, tripUser, candidateTrips, candidateUsers, geminiService, options = {}) {
  const { applySafetyFilter } = require('./trust-safety');

  // Step 1: Prepare candidates with user data
  const candidates = candidateTrips
    .map((ct) => ({
      trip: ct,
      user: candidateUsers.find((u) => u._id.toString() === ct.userId.toString()),
    }))
    .filter((c) => c.user);

  // Step 2: SAFETY HARD FILTER — women-only, etc.
  const safeCandidates = applySafetyFilter(trip, tripUser, candidates);

  // Step 3: Eligibility & role compatibility
  const eligible = safeCandidates.filter(({ trip: ct }) => {
    if (trip.role === 'driver' && ct.role !== 'passenger') return false;
    if (trip.role === 'passenger' && ct.role !== 'driver') return false;
    return true;
  });

  // Step 4: PURE DETERMINISTIC SCORING
  const scored = eligible.map(({ trip: ct, user: cu }) => {
    const scores = scorePair(trip, ct);

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
  const proRanked = applyProPriority(scored, usersMap);

  // Step 5b: TRUST + COMMUNITY ranking signals (after safety, after scoring).
  // These only re-order candidates that already passed every gate; they can never
  // rescue a candidate below the minimum-viable route/time score (Step 6 uses finalScore).
  const ranked = applyRankingSignals(proRanked, options.context);

  // Step 6: Honest Match Filtering (Requirement 2)
  // Never show results below the minimum viable threshold (40%) in normal results.
  const minViable = RIDE_CONFIG.matchQuality?.minimumViableScore || 40;
  const viable = ranked.filter((m) => m.finalScore >= minViable);

  let candidatesToShow = [];
  let isFallback = false;

  if (viable.length > 0) {
    candidatesToShow = viable;
  } else {
    // Only provide fallback nearby/corridor commuters when candidates strictly satisfy fallback thresholds:
    // Detour <= 4.0 km and Destination gap <= 3.5 km
    const maxDetour = RIDE_CONFIG.matchQuality?.fallbackMaxDetourKm || 4.0;
    const maxGap = RIDE_CONFIG.matchQuality?.fallbackMaxDestinationGapKm || 3.5;
    const fallbackEligible = ranked.filter((m) => m.detourKm <= maxDetour && m.destinationDistanceKm <= maxGap);

    if (fallbackEligible.length > 0) {
      candidatesToShow = fallbackEligible;
      isFallback = true;
    }
  }

  // Step 7: Gemini explanations for top honest results
  const topResults = candidatesToShow.slice(0, options.limit || 5);
  for (const match of topResults) {
    match.isFallbackMatch = isFallback;
    match.reasons = buildMatchReasons(match, options.context);
    if (geminiService && typeof geminiService.generateMatchExplanation === 'function') {
      try {
        const explanation = await geminiService.generateMatchExplanation({
          routeOverlap: match.routeScore,
          timeCompatibility: match.timeScore,
          destinationDistanceKm: match.destinationDistanceKm,
          finalScore: match.finalScore,
          matchType: match.matchType,
          detourKm: match.detourKm,
          qualityLabel: match.qualityLabel,
        });
        match.explanation = explanation.explanation;
      } catch (err) {
        match.explanation = `${match.qualityLabel}: ${match.routeScore}% route overlap with ${match.detourKm} km estimated detour.`;
      }
    } else {
      match.explanation = `${match.qualityLabel}: ${match.routeScore}% route overlap with ${match.detourKm} km estimated detour.`;
    }
  }

  return topResults;
}

module.exports = {
  haversineDistanceKm,
  computeTimeCompatibility,
  computeBudgetCompatibility,
  computeCapacityCompatibility,
  classifyMatchType,
  scoreMatch,
  applyProPriority,
  scorePair,
  estimateDetourMinutes,
  applyRankingSignals,
  buildMatchReasons,
  findMatches,
};
