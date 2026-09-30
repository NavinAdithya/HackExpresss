/**
 * PO → PO — Behavioural Trust (5-parameter, 1–10)
 *
 * "Trust" answers: how has this person behaved on previous shared journeys?
 * It is deliberately separate from identity verification ("who is this person?")
 * and from the legacy 0–100 safety/eligibility score in trust-score.js.
 *
 * Parameters (each rated 1–10 by the other participant of a completed journey):
 *   reliability, safety, respect, routeCommitment, communication
 *
 * Per-parameter score = average of all received ratings for that parameter.
 * Overall            = average of the five parameter averages.
 *
 * The summary is cached on User.behaviorTrust and recomputed WRITE-side
 * (when a rating is accepted or a journey completes), so profile / match /
 * community reads are O(1) and never scan the ratings collection.
 */

const Rating = require('../models/Rating');
const User = require('../models/User');
const Trip = require('../models/Trip');

const TRUST_PARAMS = ['reliability', 'safety', 'respect', 'routeCommitment', 'communication'];

const TRUST_LABELS = {
  reliability: 'Reliability',
  safety: 'Safety',
  respect: 'Respect',
  routeCommitment: 'Route Commitment',
  communication: 'Communication',
};

const TRUST_CONFIG = {
  minScore: 1,
  maxScore: 10,
  // Fewer ratings than this → score is shown, but flagged as limited history and never "High Trust".
  minRatingsForLevel: 5,
  levels: [
    { min: 8.5, key: 'HIGH', label: 'High Trust' },
    { min: 7.0, key: 'GOOD', label: 'Good Trust' },
    { min: 5.0, key: 'FAIR', label: 'Fair' },
    { min: 0, key: 'LOW', label: 'Low Trust' },
  ],
};

const round1 = (n) => Math.round(n * 10) / 10;

function isValidScore(v) {
  return Number.isInteger(v) && v >= TRUST_CONFIG.minScore && v <= TRUST_CONFIG.maxScore;
}

/** True when a rating document carries all five valid 1–10 parameters. */
function hasAllParams(r) {
  return !!r && TRUST_PARAMS.every((p) => isValidScore(Number(r[p])));
}

/** Trip rating = mean of the five parameters (1 decimal). PURE. */
function tripRatingOverall(scores) {
  const sum = TRUST_PARAMS.reduce((acc, p) => acc + Number(scores[p]), 0);
  return round1(sum / TRUST_PARAMS.length);
}

/** Map an overall + rating count to a level. PURE. */
function classifyTrust(overall, count) {
  if (count === 0) return { status: 'NEW_USER', level: 'NEW', label: 'New User', limitedHistory: false };
  if (count < TRUST_CONFIG.minRatingsForLevel) {
    return { status: 'LIMITED', level: 'BUILDING', label: 'Limited history', limitedHistory: true };
  }
  const lvl = TRUST_CONFIG.levels.find((l) => overall >= l.min);
  return { status: 'ESTABLISHED', level: lvl.key, label: lvl.label, limitedHistory: false };
}

/**
 * Compute a trust summary from an array of rating-like objects. PURE.
 * Ratings missing any of the five parameters (legacy star ratings) are ignored.
 */
function computeBehaviorTrust(ratings = []) {
  const valid = ratings.filter(hasAllParams);
  const count = valid.length;

  if (count === 0) {
    return {
      count: 0,
      overall: null,
      parameters: null,
      ...classifyTrust(null, 0),
      calculatedAt: new Date().toISOString(),
    };
  }

  const avg = {};
  for (const p of TRUST_PARAMS) {
    avg[p] = valid.reduce((acc, r) => acc + Number(r[p]), 0) / count;
  }
  // Overall uses the unrounded parameter averages (e.g. 9.36 → 9.4).
  const overallRaw = TRUST_PARAMS.reduce((acc, p) => acc + avg[p], 0) / TRUST_PARAMS.length;
  const overall = round1(overallRaw);

  const parameters = {};
  for (const p of TRUST_PARAMS) parameters[p] = round1(avg[p]);

  return {
    count,
    overall,
    parameters,
    ...classifyTrust(overall, count),
    calculatedAt: new Date().toISOString(),
  };
}

/** Public, minimal shape used in match cards / community lists. PURE. */
function toTrustLite(summary) {
  if (!summary || !summary.count) {
    return { status: 'NEW_USER', level: 'NEW', label: 'New User', overall: null, count: 0, limitedHistory: false };
  }
  return {
    status: summary.status,
    level: summary.level,
    label: summary.label,
    overall: summary.overall,
    count: summary.count,
    limitedHistory: !!summary.limitedHistory,
  };
}

/**
 * Recompute and persist a user's cached behavioural trust summary.
 * Aggregation runs over ONE user's received ratings, and only on writes.
 */
async function refreshBehaviorTrust(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const received = await Rating.find({ ratedUser: String(user._id) });
  const summary = computeBehaviorTrust(Array.isArray(received) ? received : []);

  let completedJourneys = 0;
  try {
    completedJourneys = await Trip.countDocuments({
      userId: String(user._id),
      status: 'COMPLETED',
      matchedUserId: { $ne: null },
    });
  } catch (e) {
    /* non-fatal — journeys count is informational */
  }
  summary.completedJourneys = completedJourneys;

  user.behaviorTrust = summary;
  if (typeof user.markModified === 'function') user.markModified('behaviorTrust');
  await user.save();
  return summary;
}

/** Cached summary for a user doc; computes once if the cache was never populated. */
async function getBehaviorTrust(userOrId) {
  const user = userOrId && userOrId._id ? userOrId : await User.findById(userOrId);
  if (!user) return computeBehaviorTrust([]);
  if (user.behaviorTrust && typeof user.behaviorTrust === 'object') return user.behaviorTrust;
  return (await refreshBehaviorTrust(user._id)) || computeBehaviorTrust([]);
}

module.exports = {
  TRUST_PARAMS,
  TRUST_LABELS,
  TRUST_CONFIG,
  isValidScore,
  hasAllParams,
  tripRatingOverall,
  classifyTrust,
  computeBehaviorTrust,
  toTrustLite,
  refreshBehaviorTrust,
  getBehaviorTrust,
};
