/**
 * Daily Commute service
 *
 * A DailyCommute is a *recurring template* ("Mon–Fri 08:15 Porur → Ramapuram").
 * Matching turns today's occurrence into a virtual trip and pushes it through the
 * SAME pipeline as on-demand searches (safety hard-filter → route/time/pickup/dest
 * scoring → PRO priority → trust + community signals), so the two never diverge.
 *
 * Nothing is booked automatically. A "request" creates a PENDING Match that the
 * other commuter must explicitly accept (see routes/commutes.js + routes/matches.js).
 *
 * Route geometry is stored on the commute at save time, so matching makes no
 * routing-provider calls.
 */

const DailyCommute = require('../models/DailyCommute');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Match = require('../models/Match');
const { findMatches, scorePair } = require('./matching-engine');
const { buildRankingContext } = require('./community-service');
const { getBehaviorTrust } = require('./behavior-trust');
const RIDE_CONFIG = require('../config/ride');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OPEN_TRIP_STATUSES = ['POSTED', 'OPEN', 'CREATED', 'SEARCHING'];
const HOUR = 60 * 60 * 1000;

/** Calendar parts of `date` as seen by someone `offsetMin` minutes ahead of UTC. PURE. */
function localParts(date, offsetMin) {
  const shifted = new Date(new Date(date).getTime() + offsetMin * 60000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const pad = (n) => String(n).padStart(2, '0');
  return { y, m, d, dow: shifted.getUTCDay(), dateKey: `${y}-${pad(m + 1)}-${pad(d)}` };
}

function hhmmToDate(parts, hhmm, offsetMin) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(parts.y, parts.m, parts.d, hh, mm) - offsetMin * 60000);
}

/**
 * Today's occurrence of a commute in its owner's local time. PURE.
 * @returns {{ active: boolean, dateKey: string, dayName: string, departure: Date, arrival: Date|null }}
 */
function occurrenceOn(commute, refDate = new Date()) {
  const offset = Number.isFinite(commute.timezoneOffsetMin) ? commute.timezoneOffsetMin : 330;
  const parts = localParts(refDate, offset);
  const dayName = DAY_NAMES[parts.dow];
  return {
    active: !!commute.active && (commute.days || []).includes(dayName),
    dateKey: parts.dateKey,
    dayName,
    departure: hhmmToDate(parts, commute.departureTime, offset),
    arrival: commute.arrivalTime ? hhmmToDate(parts, commute.arrivalTime, offset) : null,
  };
}

/** Trip-engine roles a commute can play. Drivers must actually offer a seat. PURE. */
function tripRolesFor(commute) {
  const roles = [];
  if (commute.role === 'PASSENGER' || commute.role === 'BOTH') roles.push('passenger');
  if ((commute.role === 'TRAVELLER' || commute.role === 'BOTH') && commute.availableSeats > 0) roles.push('driver');
  return roles;
}

/** Turn a commute occurrence into a trip-shaped object the matching engine understands. PURE. */
function commuteToVirtualTrip(commute, user, occurrence, role) {
  return {
    _id: `commute:${commute._id}:${role}`,
    userId: commute.userId,
    role,
    origin: commute.origin,
    destination: commute.destination,
    route: commute.route,
    routeDistance: commute.routeDistance,
    routeDuration: commute.routeDuration,
    departureTime: occurrence.departure,
    timeWindow: commute.timeWindow || RIDE_CONFIG.defaultTimeWindowMinutes,
    seatCount: role === 'driver' ? commute.availableSeats : commute.requiredSeats || 1,
    transportMode: commute.transportMode,
    vehicleModel: user?.vehicleDetails?.vehicleModel || '',
    budgetMin: 0,
    budgetMax: 500,
    verifiedOnly: true,
    womenOnly: !!user?.womenOnly,
    status: 'POSTED',
    __source: 'COMMUTE',
    __commuteId: String(commute._id),
  };
}

/**
 * Candidate pool for one searcher: other users' commutes active on `date` + their open trips.
 * Commutes win over trips for the same user+role (a materialised trip is just a commute instance).
 */
async function loadCandidatePool(searcherId, date, myRole, restrictToUserIds) {
  const wantRole = myRole === 'passenger' ? 'driver' : 'passenger';
  const userFilter = restrictToUserIds
    ? { $in: restrictToUserIds, $ne: searcherId }
    : { $ne: searcherId };

  const commutes = await DailyCommute.find({ userId: userFilter, active: true }).limit(200);
  const pool = [];
  const seen = new Set();
  const commuteUserIds = new Set();

  for (const c of commutes) {
    const occ = occurrenceOn(c, date);
    if (!occ.active) continue;
    if (!tripRolesFor(c).includes(wantRole)) continue;
    commuteUserIds.add(String(c.userId));
    pool.push({ commute: c, occ, wantRole });
  }

  // Open trips around the same time (real, user-published) — skip users already covered by a commute.
  const from = new Date(date.getTime() - 12 * HOUR);
  const to = new Date(date.getTime() + 12 * HOUR);
  const trips = await Trip.find({
    userId: userFilter,
    role: wantRole,
    status: { $in: OPEN_TRIP_STATUSES },
    departureTime: { $gte: from, $lte: to },
  }).limit(100);

  const tripPool = trips.filter((t) => !commuteUserIds.has(String(t.userId)) && !seen.has(String(t._id)));
  return { commutePool: pool, tripPool, wantRole };
}

/**
 * Find compatible commuters for one saved commute on `date`.
 * Uses the shared matching pipeline; returns UI-ready match cards.
 *
 * @param {object} commute  DailyCommute doc
 * @param {object} user     owner's User doc
 * @param {object} opts     { date, limit, restrictToUserIds }
 */
async function findCommuteMatches(commute, user, opts = {}) {
  const date = opts.date || new Date();
  const limit = opts.limit || 8;
  const occ = occurrenceOn(commute, date);
  if (!occ.active) return { relevant: false, occurrence: occ, matches: [] };

  const results = [];

  for (const myRole of tripRolesFor(commute)) {
    const myTrip = commuteToVirtualTrip(commute, user, occ, myRole);
    const { commutePool, tripPool } = await loadCandidatePool(
      commute.userId, date, myRole, opts.restrictToUserIds
    );

    const userIds = [
      ...commutePool.map((p) => String(p.commute.userId)),
      ...tripPool.map((t) => String(t.userId)),
    ];
    if (userIds.length === 0) continue;
    const users = await User.find({ _id: { $in: [...new Set(userIds)] } });

    // Make sure every candidate has a cached behavioural-trust summary (one-time per user).
    await Promise.all(users.map(async (u) => {
      if (!u.behaviorTrust) u.behaviorTrust = await getBehaviorTrust(u);
    }));

    const userById = {};
    users.forEach((u) => { userById[String(u._id)] = u; });

    const candidateTrips = [
      ...commutePool.map(({ commute: c, occ: o, wantRole }) =>
        commuteToVirtualTrip(c, userById[String(c.userId)], o, wantRole)),
      ...tripPool.map((t) => {
        const plain = typeof t.toObject === 'function' ? t.toObject() : { ...t };
        return { ...plain, __source: 'TRIP' };
      }),
    ].filter((t) => userById[String(t.userId)]);

    const context = await buildRankingContext(commute.userId, users);
    const found = await findMatches(myTrip, user, candidateTrips, users, null, { limit: 10, context });

    found.forEach((m) => {
      const cand = m.candidateTrip;
      results.push({
        myRole: myRole === 'passenger' ? 'PASSENGER' : 'TRAVELLER',
        theirRole: cand.role === 'driver' ? 'TRAVELLER' : 'PASSENGER',
        source: cand.__source || 'TRIP',
        targetKind: cand.__source === 'COMMUTE' ? 'COMMUTE' : 'TRIP',
        targetId: cand.__source === 'COMMUTE' ? cand.__commuteId : String(cand._id),
        userId: String(m.userId),
        name: m.userName,
        photo: m.userPhoto || '',
        verified: !!m.userVerified,
        routeCompatibility: m.routeScore,
        finalScore: m.finalScore,
        rankScore: m.adjustedScore,
        matchType: m.matchType,
        qualityLabel: m.qualityLabel,
        departure: new Date(cand.departureTime).toISOString(),
        departureDeltaMin: m.departureDeltaMin,
        detourKm: m.detourKm,
        detourMin: m.detourMin,
        pickupDistanceKm: m.pickupDistanceKm,
        destinationDistanceKm: m.destinationDistanceKm,
        seatsAvailable: cand.role === 'driver' ? cand.seatCount : null,
        seatsNeeded: cand.role === 'passenger' ? cand.seatCount : null,
        transportMode: cand.transportMode,
        vehicleModel: cand.vehicleModel || userById[String(m.userId)]?.vehicleDetails?.vehicleModel || '',
        from: cand.origin?.address,
        to: cand.destination?.address,
        trust: m.userTrust,
        sharedCommunities: m.sharedCommunities,
        reasons: m.reasons,
      });
    });
  }

  // One card per person: keep their best-ranked pairing.
  const best = new Map();
  results.sort((a, b) => b.rankScore - a.rankScore).forEach((r) => {
    if (!best.has(r.userId)) best.set(r.userId, r);
  });
  const matches = [...best.values()].slice(0, limit);

  await annotateRequestStates(commute.userId, matches, occ);
  return { relevant: true, occurrence: occ, matches };
}

/**
 * Mark each match card with an existing request/booking between the two users for this day:
 * requestState ∈ NONE | REQUESTED (by me) | INCOMING (they asked me) | CONFIRMED.
 */
async function annotateRequestStates(myUserId, matches, occ) {
  const me = String(myUserId);
  matches.forEach((m) => { m.requestState = 'NONE'; m.matchId = null; });
  if (matches.length === 0) return;

  const mine = await Match.find({
    $or: [{ userA: me }, { userB: me }],
    status: { $in: ['PENDING', 'CONFIRMED'] },
  }).limit(100);
  if (mine.length === 0) return;

  const tripIds = [...new Set(mine.flatMap((x) => [String(x.tripA), String(x.tripB)]))];
  const trips = await Trip.find({ _id: { $in: tripIds } });
  const tripById = {};
  trips.forEach((t) => { tripById[String(t._id)] = t; });

  const dayStart = occ.departure.getTime() - 12 * HOUR;
  const dayEnd = occ.departure.getTime() + 12 * HOUR;

  mine.forEach((mt) => {
    const t = tripById[String(mt.tripA)];
    if (!t) return;
    const dep = new Date(t.departureTime).getTime();
    if (dep < dayStart || dep > dayEnd) return;

    const other = String(mt.userA) === me ? String(mt.userB) : String(mt.userA);
    const card = matches.find((c) => c.userId === other);
    if (!card) return;

    card.matchId = String(mt._id);
    if (mt.status === 'CONFIRMED') card.requestState = 'CONFIRMED';
    else if (mt.requestedBy && String(mt.requestedBy) === me) card.requestState = 'REQUESTED';
    else if (mt.requestedBy) card.requestState = 'INCOMING';
  });
}

/**
 * Get-or-create the concrete Trip for one occurrence of a commute (idempotent per day+role).
 * The trip is only a listing of an already-declared journey — it consumes no daily quota.
 */
async function materializeTrip(commute, user, occ, role) {
  const existing = await Trip.findOne({
    commuteId: commute._id,
    commuteDate: occ.dateKey,
    role,
    status: { $ne: 'CANCELLED' },
  });
  if (existing) return existing;

  const trip = new Trip({
    userId: commute.userId,
    role,
    origin: commute.origin,
    destination: commute.destination,
    route: commute.route,
    routeDistance: commute.routeDistance,
    routeDuration: commute.routeDuration,
    departureTime: occ.departure,
    timeWindow: commute.timeWindow || RIDE_CONFIG.defaultTimeWindowMinutes,
    transportMode: commute.transportMode,
    vehicleModel: user?.vehicleDetails?.vehicleModel || '',
    seatCount: role === 'driver' ? Math.max(1, commute.availableSeats) : commute.requiredSeats || 1,
    verifiedOnly: true,
    womenOnly: !!user?.womenOnly,
    status: 'POSTED',
    commuteId: commute._id,
    commuteDate: occ.dateKey,
  });
  await trip.save();
  return trip;
}

module.exports = {
  DAY_NAMES,
  OPEN_TRIP_STATUSES,
  localParts,
  occurrenceOn,
  tripRolesFor,
  commuteToVirtualTrip,
  findCommuteMatches,
  materializeTrip,
  scorePair,
};
