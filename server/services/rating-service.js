/**
 * Rating service — who may rate whom, and how a rating is recorded.
 *
 * Eligibility (all enforced server-side):
 *  - the trip exists and is COMPLETED, and actually started (OTP/start flow ran)
 *  - the rater is one of the two participants (owner or matched user) — never a bystander
 *  - the rated user is the OTHER participant — never yourself
 *  - one rating per rater per shared journey (journeyId), even though each side owns a Trip doc
 *  - both sides' trips must be completed and agree on the counterparty
 */

const Trip = require('../models/Trip');
const User = require('../models/User');
const Rating = require('../models/Rating');
const {
  TRUST_PARAMS, isValidScore, tripRatingOverall, refreshBehaviorTrust,
} = require('./behavior-trust');
const { computeUserTrustScore } = require('./trust-score');

const fail = (status, code, message) => ({ ok: false, status, code, message });

/** Canonical key for one shared journey (both participants' trips map to the same key). */
function journeyKeyFor(trip) {
  if (trip.matchId) return String(trip.matchId);
  return [String(trip._id), trip.matchedTripId ? String(trip.matchedTripId) : '']
    .sort()
    .join(':');
}

async function resolveRatingContext(tripId, raterId) {
  let trip;
  try {
    trip = await Trip.findById(tripId);
  } catch (e) {
    return fail(404, 'TRIP_NOT_FOUND', 'Trip not found.');
  }
  if (!trip) return fail(404, 'TRIP_NOT_FOUND', 'Trip not found.');

  const rater = String(raterId);
  const isOwner = String(trip.userId) === rater;
  const isMatched = !!trip.matchedUserId && String(trip.matchedUserId) === rater;
  if (!isOwner && !isMatched) {
    return fail(403, 'NOT_A_PARTICIPANT', 'Only participants of this shared journey can rate it.');
  }

  if (trip.status !== 'COMPLETED') {
    return fail(400, 'TRIP_NOT_COMPLETED', 'You can rate a journey only after it is completed.');
  }
  const ratedUserId = isOwner ? trip.matchedUserId : trip.userId;
  if (!ratedUserId) {
    return fail(400, 'NO_COUNTERPARTY', 'This journey has no other participant to rate.');
  }
  if (String(ratedUserId) === rater) {
    return fail(400, 'SELF_RATING', 'You cannot rate yourself.');
  }

  // The other side's trip must agree that the journey completed with these two people.
  let partner = null;
  if (trip.matchedTripId) {
    partner = await Trip.findById(trip.matchedTripId);
    if (!partner || partner.status !== 'COMPLETED') {
      return fail(400, 'PARTNER_TRIP_NOT_COMPLETED', 'The other participant has not completed this journey yet.');
    }
    // partner is the *other* side's own trip: owned by the rated user when rating from your own trip,
    // or by the rater when rating via the counterparty's trip document.
    const expectedPartnerOwner = isOwner ? ratedUserId : raterId;
    if (String(partner.userId) !== String(expectedPartnerOwner)) {
      return fail(400, 'PARTICIPANT_MISMATCH', 'Journey participants do not match.');
    }
  }

  // The journey must really have started (either side's trip records the start).
  if (!trip.startedAt && !partner?.startedAt) {
    return fail(400, 'TRIP_NOT_STARTED', 'This journey never started, so it cannot be rated.');
  }

  const journeyId = journeyKeyFor(trip);
  const dup = await Rating.findOne({ rater, journeyId });
  const legacyDup = await Rating.findOne({ rater, trip: String(trip._id) });
  if (dup || legacyDup) {
    return fail(409, 'ALREADY_RATED', 'You have already rated this journey.');
  }

  const ratedUser = await User.findById(ratedUserId);
  if (!ratedUser) return fail(404, 'USER_NOT_FOUND', 'The other participant no longer exists.');

  return { ok: true, trip, ratedUser, journeyId };
}

function parseScores(body) {
  const scores = {};
  for (const p of TRUST_PARAMS) {
    const v = Number(body?.[p]);
    if (!isValidScore(v)) {
      return { error: `${p} must be a whole number from 1 to 10.` };
    }
    scores[p] = v;
  }
  return { scores };
}

async function submitRating({ raterId, tripId, body }) {
  const { scores, error } = parseScores(body);
  if (error) return fail(400, 'INVALID_SCORES', error);

  const comment = String(body?.comment || '').trim().slice(0, 500);

  const ctx = await resolveRatingContext(tripId, raterId);
  if (!ctx.ok) return ctx;

  const overall = tripRatingOverall(scores);
  let ratingDoc;
  try {
    ratingDoc = await Rating.create({
      rater: raterId,
      ratedUser: ctx.ratedUser._id,
      trip: ctx.trip._id,
      journeyId: ctx.journeyId,
      ...scores,
      overall,
      // legacy 1–5 star mirror keeps the existing 0–100 safety score working
      rating: Math.max(1, Math.min(5, Math.round(overall / 2))),
      comment,
    });
  } catch (e) {
    if (e && e.code === 11000) return fail(409, 'ALREADY_RATED', 'You have already rated this journey.');
    throw e;
  }

  // Write-side recompute: refresh cached trust summary (and the legacy score) for the rated user.
  const trust = await refreshBehaviorTrust(ctx.ratedUser._id);
  await computeUserTrustScore(ctx.ratedUser._id);

  return { ok: true, rating: ratingDoc, overall, trust, ratedUser: ctx.ratedUser };
}

module.exports = { journeyKeyFor, resolveRatingContext, parseScores, submitRating };
