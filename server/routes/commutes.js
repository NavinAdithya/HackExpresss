/**
 * Daily Commute Routes
 *
 * GET    /api/commutes                 → my saved commutes
 * POST   /api/commutes                 → save a recurring commute
 * PUT    /api/commutes/:id             → edit (owner only)
 * DELETE /api/commutes/:id             → delete (owner only)
 * GET    /api/commutes/today           → today's relevant commutes + auto-matches
 * GET    /api/commutes/:id/matches     → on-demand matches for one commute (today)
 * GET    /api/commutes/requests        → pending shared-journey requests involving me
 * POST   /api/commutes/:id/request     → request a shared journey (never auto-books)
 */

const express = require('express');
const DailyCommute = require('../models/DailyCommute');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Match = require('../models/Match');
const { auth } = require('../middleware/auth');
const { calculateRoute } = require('../services/route-service');
const { applySafetyFilter } = require('../services/trust-safety');
const { scorePair } = require('../services/matching-engine');
const {
  occurrenceOn,
  tripRolesFor,
  findCommuteMatches,
  materializeTrip,
  commuteToVirtualTrip,
  OPEN_TRIP_STATUSES,
} = require('../services/commute-service');
const { getBehaviorTrust, toTrustLite } = require('../services/behavior-trust');

const router = express.Router();

const MAX_COMMUTES_PER_USER = 5;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validCoords(c) {
  return Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === 'number' && isFinite(n)) &&
    Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
}

/** Validate + normalise a create/update body. Returns { error } or { value }. */
function parseCommuteBody(body, existing) {
  const b = body || {};
  const pick = (k, fallback) => (b[k] !== undefined ? b[k] : fallback);

  const origin = pick('origin', existing && { address: existing.origin.address, coordinates: existing.origin.location.coordinates });
  const destination = pick('destination', existing && { address: existing.destination.address, coordinates: existing.destination.location.coordinates });
  if (!origin?.address || !validCoords(origin.coordinates)) return { error: 'A valid starting point is required.' };
  if (!destination?.address || !validCoords(destination.coordinates)) return { error: 'A valid destination is required.' };

  const departureTime = pick('departureTime', existing?.departureTime);
  if (!HHMM.test(departureTime || '')) return { error: 'Departure time must be HH:MM.' };
  const arrivalTime = pick('arrivalTime', existing?.arrivalTime || '') || '';
  if (arrivalTime && !HHMM.test(arrivalTime)) return { error: 'Arrival time must be HH:MM.' };

  const days = pick('days', existing?.days);
  if (!Array.isArray(days) || days.length === 0 || !days.every((d) => DAYS.includes(d))) {
    return { error: 'Choose at least one day of the week.' };
  }

  const role = pick('role', existing?.role || 'PASSENGER');
  if (!['PASSENGER', 'TRAVELLER', 'BOTH'].includes(role)) return { error: 'Invalid role.' };

  const transportMode = pick('transportMode', existing?.transportMode || 'CAR');
  if (!['BIKE', 'CAR'].includes(transportMode)) return { error: 'Transport must be BIKE or CAR.' };

  let availableSeats = 0;
  if (role === 'TRAVELLER' || role === 'BOTH') {
    availableSeats = parseInt(pick('availableSeats', existing?.availableSeats ?? 1), 10);
    const maxSeats = transportMode === 'BIKE' ? 1 : 6;
    if (!Number.isInteger(availableSeats) || availableSeats < 1 || availableSeats > maxSeats) {
      return { error: `Available seats must be between 1 and ${maxSeats}.` };
    }
  }
  let requiredSeats = 1;
  if (role === 'PASSENGER' || role === 'BOTH') {
    requiredSeats = parseInt(pick('requiredSeats', existing?.requiredSeats ?? 1), 10);
    if (!Number.isInteger(requiredSeats) || requiredSeats < 1 || requiredSeats > 4) {
      return { error: 'Required seats must be between 1 and 4.' };
    }
  }

  const timeWindow = parseInt(pick('timeWindow', existing?.timeWindow ?? 20), 10);
  if (!Number.isInteger(timeWindow) || timeWindow < 5 || timeWindow > 90) {
    return { error: 'Time flexibility must be 5–90 minutes.' };
  }
  const tz = Number(pick('timezoneOffsetMin', existing?.timezoneOffsetMin ?? 330));
  if (!Number.isFinite(tz) || Math.abs(tz) > 14 * 60) return { error: 'Invalid timezone offset.' };

  return {
    value: {
      label: String(pick('label', existing?.label || '')).slice(0, 60),
      origin, destination, departureTime, arrivalTime,
      days: DAYS.filter((d) => days.includes(d)),
      role, transportMode, availableSeats, requiredSeats, timeWindow,
      timezoneOffsetMin: tz,
      autoMatchEnabled: b.autoMatchEnabled !== undefined ? !!b.autoMatchEnabled : (existing ? existing.autoMatchEnabled : true),
      active: b.active !== undefined ? !!b.active : (existing ? existing.active : true),
    },
  };
}

function sameEndpoints(commute, origin, destination) {
  const [oLng, oLat] = commute.origin.location.coordinates;
  const [dLng, dLat] = commute.destination.location.coordinates;
  return oLng === origin.coordinates[0] && oLat === origin.coordinates[1] &&
    dLng === destination.coordinates[0] && dLat === destination.coordinates[1];
}

async function loadOwned(req, res) {
  const commute = await DailyCommute.findById(req.params.id);
  // 404 (not 403) so ids of other users' commutes aren't confirmable
  if (!commute || String(commute.userId) !== String(req.userId)) {
    res.status(404).json({ error: 'Commute not found.' });
    return null;
  }
  return commute;
}

function serializeCommute(c) {
  const o = typeof c.toObject === 'function' ? c.toObject() : c;
  return {
    _id: String(o._id),
    label: o.label,
    origin: { address: o.origin.address, coordinates: o.origin.location.coordinates },
    destination: { address: o.destination.address, coordinates: o.destination.location.coordinates },
    departureTime: o.departureTime,
    arrivalTime: o.arrivalTime || '',
    days: o.days,
    timezoneOffsetMin: o.timezoneOffsetMin,
    timeWindow: o.timeWindow,
    role: o.role,
    transportMode: o.transportMode,
    availableSeats: o.availableSeats,
    requiredSeats: o.requiredSeats,
    autoMatchEnabled: o.autoMatchEnabled,
    active: o.active,
    routeDistance: o.routeDistance,
    routeDuration: o.routeDuration,
    routeCoordinates: o.route?.coordinates || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function computeRoute(origin, destination) {
  return calculateRoute(
    [origin.coordinates[0], origin.coordinates[1]],
    [destination.coordinates[0], destination.coordinates[1]]
  );
}

/** GET /api/commutes */
router.get('/', auth, async (req, res) => {
  try {
    const commutes = await DailyCommute.find({ userId: req.userId });
    commutes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ commutes: commutes.map(serializeCommute) });
  } catch (err) {
    console.error('[COMMUTES] list error:', err);
    res.status(500).json({ error: 'Failed to load commutes.' });
  }
});

/** POST /api/commutes */
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = parseCommuteBody(req.body);
    if (error) return res.status(400).json({ error });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if ((value.role === 'TRAVELLER' || value.role === 'BOTH') &&
        user.driverStatus !== 'APPROVED' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'TRAVELLER_NOT_APPROVED',
        message: 'Traveller verification must be approved before you can offer seats on a commute.',
      });
    }

    const existingCount = await DailyCommute.countDocuments({ userId: req.userId });
    if (existingCount >= MAX_COMMUTES_PER_USER) {
      return res.status(400).json({ error: `You can save up to ${MAX_COMMUTES_PER_USER} recurring commutes.` });
    }

    let routeData;
    try {
      routeData = await computeRoute(value.origin, value.destination);
    } catch (e) {
      return res.status(502).json({ error: 'Route calculation failed. Please check the locations.' });
    }

    const commute = new DailyCommute({
      userId: req.userId,
      label: value.label,
      origin: { address: value.origin.address, location: { type: 'Point', coordinates: value.origin.coordinates } },
      destination: { address: value.destination.address, location: { type: 'Point', coordinates: value.destination.coordinates } },
      route: routeData.geometry,
      routeDistance: routeData.distance,
      routeDuration: routeData.duration,
      departureTime: value.departureTime,
      arrivalTime: value.arrivalTime,
      days: value.days,
      timezoneOffsetMin: value.timezoneOffsetMin,
      timeWindow: value.timeWindow,
      role: value.role,
      transportMode: value.transportMode,
      availableSeats: value.availableSeats,
      requiredSeats: value.requiredSeats,
      autoMatchEnabled: value.autoMatchEnabled,
      active: value.active,
    });
    await commute.save();

    res.status(201).json({ commute: serializeCommute(commute) });
  } catch (err) {
    console.error('[COMMUTES] create error:', err);
    res.status(500).json({ error: 'Failed to save commute.' });
  }
});

/** GET /api/commutes/today — must be declared before /:id routes */
router.get('/today', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const commutes = await DailyCommute.find({ userId: req.userId, active: true });
    const now = new Date();

    const today = [];
    for (const c of commutes) {
      const occ = occurrenceOn(c, now);
      if (!occ.active) continue;

      const entry = {
        commute: serializeCommute(c),
        departure: occ.departure.toISOString(),
        matches: [],
        autoMatch: c.autoMatchEnabled,
      };
      // Auto-match only runs when the user enabled it for this commute.
      if (c.autoMatchEnabled) {
        const result = await findCommuteMatches(c, user, { date: now, limit: 8 });
        entry.matches = result.matches;
      }
      today.push(entry);
    }
    today.sort((a, b) => new Date(a.departure) - new Date(b.departure));
    res.json({ date: now.toISOString(), commutes: today });
  } catch (err) {
    console.error('[COMMUTES] today error:', err);
    res.status(500).json({ error: 'Failed to load today\'s commute.' });
  }
});

/** GET /api/commutes/requests — pending shared-journey requests (incoming + outgoing) */
router.get('/requests', auth, async (req, res) => {
  try {
    const me = String(req.userId);
    const pending = await Match.find({
      $or: [{ userA: me }, { userB: me }],
      status: 'PENDING',
    }).limit(50);

    const requested = pending.filter((m) => m.requestedBy);
    const otherIds = [...new Set(requested.map((m) => (String(m.userA) === me ? String(m.userB) : String(m.userA))))];
    const users = otherIds.length ? await User.find({ _id: { $in: otherIds } }) : [];
    const userById = {};
    users.forEach((u) => { userById[String(u._id)] = u; });

    const tripIds = [...new Set(requested.flatMap((m) => [String(m.tripA), String(m.tripB)]))];
    const trips = tripIds.length ? await Trip.find({ _id: { $in: tripIds } }) : [];
    const tripById = {};
    trips.forEach((t) => { tripById[String(t._id)] = t; });

    const items = [];
    for (const m of requested) {
      const otherId = String(m.userA) === me ? String(m.userB) : String(m.userA);
      const other = userById[otherId];
      if (!other) continue;
      const theirTrip = tripById[String(m.userA) === me ? String(m.tripB) : String(m.tripA)];
      const trust = toTrustLite(await getBehaviorTrust(other));
      items.push({
        matchId: String(m._id),
        direction: String(m.requestedBy) === me ? 'OUTGOING' : 'INCOMING',
        user: { _id: otherId, name: other.name, photo: other.profilePhoto || '' },
        trust,
        from: theirTrip?.origin?.address,
        to: theirTrip?.destination?.address,
        departure: theirTrip?.departureTime,
        routeCompatibility: m.routeScore,
        createdAt: m.createdAt,
      });
    }
    res.json({ requests: items });
  } catch (err) {
    console.error('[COMMUTES] requests error:', err);
    res.status(500).json({ error: 'Failed to load requests.' });
  }
});

/** PUT /api/commutes/:id */
router.put('/:id', auth, async (req, res) => {
  try {
    const commute = await loadOwned(req, res);
    if (!commute) return;

    const { error, value } = parseCommuteBody(req.body, commute);
    if (error) return res.status(400).json({ error });

    const user = await User.findById(req.userId);
    if ((value.role === 'TRAVELLER' || value.role === 'BOTH') &&
        user.driverStatus !== 'APPROVED' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'TRAVELLER_NOT_APPROVED', message: 'Traveller verification must be approved first.' });
    }

    // Recompute geometry only when the endpoints actually moved.
    if (!sameEndpoints(commute, value.origin, value.destination)) {
      try {
        const routeData = await computeRoute(value.origin, value.destination);
        commute.route = routeData.geometry;
        commute.routeDistance = routeData.distance;
        commute.routeDuration = routeData.duration;
      } catch (e) {
        return res.status(502).json({ error: 'Route calculation failed. Please check the locations.' });
      }
    }

    commute.label = value.label;
    commute.origin = { address: value.origin.address, location: { type: 'Point', coordinates: value.origin.coordinates } };
    commute.destination = { address: value.destination.address, location: { type: 'Point', coordinates: value.destination.coordinates } };
    commute.departureTime = value.departureTime;
    commute.arrivalTime = value.arrivalTime;
    commute.days = value.days;
    commute.timezoneOffsetMin = value.timezoneOffsetMin;
    commute.timeWindow = value.timeWindow;
    commute.role = value.role;
    commute.transportMode = value.transportMode;
    commute.availableSeats = value.availableSeats;
    commute.requiredSeats = value.requiredSeats;
    commute.autoMatchEnabled = value.autoMatchEnabled;
    commute.active = value.active;
    await commute.save();

    res.json({ commute: serializeCommute(commute) });
  } catch (err) {
    console.error('[COMMUTES] update error:', err);
    res.status(500).json({ error: 'Failed to update commute.' });
  }
});

/** DELETE /api/commutes/:id */
router.delete('/:id', auth, async (req, res) => {
  try {
    const commute = await loadOwned(req, res);
    if (!commute) return;
    await DailyCommute.findByIdAndDelete(commute._id);
    res.json({ deleted: true });
  } catch (err) {
    console.error('[COMMUTES] delete error:', err);
    res.status(500).json({ error: 'Failed to delete commute.' });
  }
});

/** GET /api/commutes/:id/matches — on-demand search, works even when auto-match is off */
router.get('/:id/matches', auth, async (req, res) => {
  try {
    const commute = await loadOwned(req, res);
    if (!commute) return;
    const user = await User.findById(req.userId);
    const result = await findCommuteMatches(commute, user, { date: new Date(), limit: 10 });
    res.json({
      relevantToday: result.relevant,
      departure: result.occurrence.departure.toISOString(),
      matches: result.matches,
    });
  } catch (err) {
    console.error('[COMMUTES] matches error:', err);
    res.status(500).json({ error: 'Failed to find matches.' });
  }
});

/**
 * POST /api/commutes/:id/request
 * body: { targetKind: 'COMMUTE'|'TRIP', targetId, targetUserId, asRole: 'PASSENGER'|'TRAVELLER' }
 *
 * Creates PENDING trips + a PENDING Match with requestedBy = me.
 * The other commuter must accept via PUT /api/matches/:id/accept — this endpoint never books.
 */
router.post('/:id/request', auth, async (req, res) => {
  try {
    const commute = await loadOwned(req, res);
    if (!commute) return;

    const { targetKind, targetId, targetUserId, asRole } = req.body || {};
    if (!['COMMUTE', 'TRIP'].includes(targetKind) || !targetId || !targetUserId) {
      return res.status(400).json({ error: 'targetKind, targetId and targetUserId are required.' });
    }
    if (String(targetUserId) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot request a journey with yourself.' });
    }
    const myTripRole = asRole === 'TRAVELLER' ? 'driver' : 'passenger';
    if (!tripRolesFor(commute).includes(myTripRole)) {
      return res.status(400).json({ error: 'This commute is not set up for that role.' });
    }

    const now = new Date();
    const myOcc = occurrenceOn(commute, now);
    if (!myOcc.active) return res.status(400).json({ error: 'This commute does not run today.' });

    const me = await User.findById(req.userId);
    const other = await User.findById(targetUserId);
    if (!other) return res.status(404).json({ error: 'Commuter not found.' });

    // Resolve the counterpart's concrete trip.
    const theirTripRole = myTripRole === 'passenger' ? 'driver' : 'passenger';
    let theirTrip;
    if (targetKind === 'COMMUTE') {
      const theirCommute = await DailyCommute.findById(targetId);
      if (!theirCommute || String(theirCommute.userId) !== String(targetUserId) || !theirCommute.active) {
        return res.status(404).json({ error: 'That commute is no longer available.' });
      }
      const theirOcc = occurrenceOn(theirCommute, now);
      if (!theirOcc.active || !tripRolesFor(theirCommute).includes(theirTripRole)) {
        return res.status(409).json({ error: 'That commuter is not travelling on this route today.' });
      }
      theirTrip = await materializeTrip(theirCommute, other, theirOcc, theirTripRole);
    } else {
      theirTrip = await Trip.findById(targetId);
      if (!theirTrip || String(theirTrip.userId) !== String(targetUserId) ||
          theirTrip.role !== theirTripRole || !OPEN_TRIP_STATUSES.includes(theirTrip.status)) {
        return res.status(404).json({ error: 'That journey is no longer available.' });
      }
    }

    const myTrip = await materializeTrip(commute, me, myOcc, myTripRole);

    // Re-run safety hard-filters server-side — never trust the client's match card.
    const passesSafety = applySafetyFilter(myTrip, me, [{ trip: theirTrip, user: other }]);
    if (passesSafety.length === 0) {
      return res.status(403).json({ error: 'This commuter is not eligible for your safety preferences.' });
    }

    const driverTrip = myTripRole === 'driver' ? myTrip : theirTrip;
    const passengerTrip = myTripRole === 'passenger' ? myTrip : theirTrip;
    if ((driverTrip.seatCount || 0) < (passengerTrip.seatCount || 1)) {
      return res.status(409).json({ error: 'Not enough seats available for this journey.' });
    }

    // Existing request between these two trips?
    let match = await Match.findOne({
      $or: [
        { tripA: myTrip._id, tripB: theirTrip._id },
        { tripA: theirTrip._id, tripB: myTrip._id },
      ],
    });

    if (match) {
      if (match.status === 'CONFIRMED' || match.status === 'ACCEPTED') {
        return res.status(409).json({ error: 'This shared journey is already confirmed.', matchId: String(match._id) });
      }
      if (match.status === 'PENDING' && match.requestedBy) {
        if (String(match.requestedBy) === String(req.userId)) {
          return res.json({ match, alreadyRequested: true });
        }
        return res.status(409).json({
          error: 'They already asked to travel with you — accept their request instead.',
          matchId: String(match._id),
        });
      }
    }

    const scores = scorePair(myTrip, theirTrip);
    const fields = {
      routeScore: scores.routeScore,
      timeScore: scores.timeScore,
      budgetScore: scores.budgetScore,
      capacityScore: scores.capacityScore,
      finalScore: scores.finalScore,
      explanation: `${scores.routeScore}% route overlap, +${scores.detourMin} min detour.`,
      status: 'PENDING',
      requestedBy: req.userId,
    };

    if (match) {
      Object.assign(match, fields);
    } else {
      match = new Match({
        tripA: myTrip._id, tripB: theirTrip._id,
        userA: req.userId, userB: targetUserId,
        ...fields,
      });
    }
    await match.save();

    res.status(201).json({ match, message: 'Request sent. They will need to accept before anything is booked.' });
  } catch (err) {
    console.error('[COMMUTES] request error:', err);
    res.status(500).json({ error: 'Failed to send request.' });
  }
});

module.exports = router;
