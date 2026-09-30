/**
 * Community Routes — mobility groups (colleges, offices, regular routes…)
 *
 * GET    /api/communities              → all communities grouped by category (+ my membership)
 * POST   /api/communities              → create a community (creator auto-joins)
 * GET    /api/communities/:id          → community page: counts, popular routes, seats
 * POST   /api/communities/:id/join     → join
 * DELETE /api/communities/:id/leave    → leave
 *
 * Privacy: anyone signed in can see a community's name and aggregate numbers.
 * The people list (who has seats, on which route) is visible to MEMBERS only.
 */

const express = require('express');
const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const DailyCommute = require('../models/DailyCommute');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { CATEGORIES } = require('../models/Community');
const {
  slugify, refreshMemberCount, isMember, memberUsers, getCommunitiesForUsers,
} = require('../services/community-service');
const {
  occurrenceOn, tripRolesFor, findCommuteMatches, OPEN_TRIP_STATUSES,
} = require('../services/commute-service');
const { getBehaviorTrust, toTrustLite } = require('../services/behavior-trust');

const router = express.Router();

const HOUR = 60 * 60 * 1000;
const ACTIVE_JOURNEY_STATUSES = ['CONFIRMED', 'ACCEPTED', 'VERIFYING', 'READY_TO_START', 'IN_PROGRESS'];

const serializeCommunity = (c, isMemberFlag) => ({
  _id: String(c._id),
  name: c.name,
  slug: c.slug,
  category: c.category,
  description: c.description || '',
  memberCount: c.memberCount || 0,
  isMember: !!isMemberFlag,
});

/** GET /api/communities */
router.get('/', auth, async (req, res) => {
  try {
    const [communities, mine] = await Promise.all([
      Community.find({}),
      CommunityMember.find({ userId: req.userId }),
    ]);
    const mineIds = new Set(mine.map((m) => String(m.communityId)));

    const grouped = {};
    CATEGORIES.forEach((cat) => { grouped[cat] = []; });
    communities
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
      .forEach((c) => {
        (grouped[c.category] || grouped.OTHER).push(serializeCommunity(c, mineIds.has(String(c._id))));
      });

    res.json({
      categories: CATEGORIES,
      communities: grouped,
      mine: communities.filter((c) => mineIds.has(String(c._id))).map((c) => serializeCommunity(c, true)),
    });
  } catch (err) {
    console.error('[COMMUNITIES] list error:', err);
    res.status(500).json({ error: 'Failed to load communities.' });
  }
});

/** POST /api/communities */
router.post('/', auth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const category = req.body?.category;
    const description = String(req.body?.description || '').trim().slice(0, 240);
    if (name.length < 3 || name.length > 80) {
      return res.status(400).json({ error: 'Community name must be 3–80 characters.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Choose a valid category.' });
    }
    const slug = slugify(name);
    if (!slug) return res.status(400).json({ error: 'Community name is not valid.' });

    const dup = await Community.findOne({ slug });
    if (dup) return res.status(409).json({ error: 'A community with this name already exists.', communityId: String(dup._id) });

    const community = new Community({ name, slug, category, description, createdBy: req.userId, memberCount: 0 });
    await community.save();
    const member = new CommunityMember({ communityId: community._id, userId: req.userId });
    await member.save();
    await refreshMemberCount(community._id);

    const fresh = await Community.findById(community._id);
    res.status(201).json({ community: serializeCommunity(fresh, true) });
  } catch (err) {
    console.error('[COMMUNITIES] create error:', err);
    res.status(500).json({ error: 'Failed to create community.' });
  }
});

/** POST /api/communities/:id/join */
router.post('/:id/join', auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found.' });

    if (!(await isMember(community._id, req.userId))) {
      try {
        await new CommunityMember({ communityId: community._id, userId: req.userId }).save();
      } catch (e) {
        if (e.code !== 11000) throw e; // concurrent double-join → already a member
      }
      await refreshMemberCount(community._id);
    }
    const fresh = await Community.findById(community._id);
    res.json({ community: serializeCommunity(fresh, true) });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Community not found.' });
    console.error('[COMMUNITIES] join error:', err);
    res.status(500).json({ error: 'Failed to join community.' });
  }
});

/** DELETE /api/communities/:id/leave */
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found.' });

    const existing = await CommunityMember.findOne({ communityId: community._id, userId: req.userId });
    if (existing) {
      await CommunityMember.deleteMany({ communityId: community._id, userId: req.userId });
      await refreshMemberCount(community._id);
    }
    const fresh = await Community.findById(community._id);
    res.json({ community: serializeCommunity(fresh, false) });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Community not found.' });
    console.error('[COMMUNITIES] leave error:', err);
    res.status(500).json({ error: 'Failed to leave community.' });
  }
});

/** GET /api/communities/:id */
router.get('/:id', auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found.' });

    const viewerIsMember = await isMember(community._id, req.userId);
    const { ids: memberIds, users } = await memberUsers(community._id);
    const userById = {};
    users.forEach((u) => { userById[String(u._id)] = u; });

    const now = new Date();

    // Members' saved commutes → who travels today, who offers seats, popular routes.
    const commutes = memberIds.length
      ? await DailyCommute.find({ userId: { $in: memberIds }, active: true })
      : [];

    const regularCommuters = new Set();
    const routeCounts = new Map();
    const seatRows = [];
    const activeToday = new Set();

    commutes.forEach((c) => {
      regularCommuters.add(String(c.userId));
      const key = `${c.origin.address} → ${c.destination.address}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);

      const occ = occurrenceOn(c, now);
      if (!occ.active) return;
      activeToday.add(String(c.userId));
      if (tripRolesFor(c).includes('driver')) {
        seatRows.push({
          userId: String(c.userId), source: 'COMMUTE', targetKind: 'COMMUTE', targetId: String(c._id),
          from: c.origin.address, to: c.destination.address,
          departure: occ.departure.toISOString(),
          seatsAvailable: c.availableSeats, transportMode: c.transportMode,
        });
      }
    });

    // Members' open, user-published driver trips in the next 12h (skip users already listed via a commute).
    const listedViaCommute = new Set(seatRows.map((r) => r.userId));
    const openTrips = memberIds.length
      ? await Trip.find({
          userId: { $in: memberIds },
          role: 'driver',
          status: { $in: OPEN_TRIP_STATUSES },
          departureTime: { $gte: new Date(now.getTime() - 1 * HOUR), $lte: new Date(now.getTime() + 12 * HOUR) },
        }).limit(100)
      : [];
    openTrips.forEach((t) => {
      if (listedViaCommute.has(String(t.userId))) return;
      activeToday.add(String(t.userId));
      seatRows.push({
        userId: String(t.userId), source: 'TRIP', targetKind: 'TRIP', targetId: String(t._id),
        from: t.origin.address, to: t.destination.address,
        departure: new Date(t.departureTime).toISOString(),
        seatsAvailable: t.seatCount, transportMode: t.transportMode,
      });
    });

    // Journeys underway today (each journey has two trip docs → count distinct match ids).
    const journeyTrips = memberIds.length
      ? await Trip.find({
          userId: { $in: memberIds },
          status: { $in: ACTIVE_JOURNEY_STATUSES },
          departureTime: { $gte: new Date(now.getTime() - 12 * HOUR), $lte: new Date(now.getTime() + 12 * HOUR) },
        }).limit(200)
      : [];
    const activeJourneys = new Set(journeyTrips.map((t) => String(t.matchId || t._id))).size;

    const availableSeats = seatRows.reduce((sum, r) => sum + (r.seatsAvailable || 0), 0);
    const popularRoutes = [...routeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([route, commuters]) => ({ route, commuters }));

    const summary = {
      community: serializeCommunity(community, viewerIsMember),
      stats: {
        members: community.memberCount || memberIds.length,
        regularCommuters: regularCommuters.size,
        travellingToday: activeToday.size,
        availableSeats,
        activeJourneys,
      },
      popularRoutes,
    };

    if (!viewerIsMember) {
      return res.json({ ...summary, restricted: true, seats: [], compatible: [] });
    }

    // Seat listing (exclude the viewer's own rows), enriched with trust.
    const others = seatRows.filter((r) => r.userId !== String(req.userId));
    const seats = [];
    for (const r of others) {
      const u = userById[r.userId];
      if (!u) continue;
      seats.push({
        ...r,
        name: u.name,
        photo: u.profilePhoto || '',
        trust: toTrustLite(await getBehaviorTrust(u)),
      });
    }
    seats.sort((a, b) => new Date(a.departure) - new Date(b.departure));

    // Community-restricted compatibility against the viewer's own commute for today.
    let compatible = [];
    const viewer = await User.findById(req.userId);
    const myCommutes = await DailyCommute.find({ userId: req.userId, active: true });
    const todays = myCommutes
      .map((c) => ({ c, occ: occurrenceOn(c, now) }))
      .filter((x) => x.occ.active)
      .sort((a, b) => a.occ.departure - b.occ.departure);
    if (todays.length > 0 && memberIds.length > 1) {
      const result = await findCommuteMatches(todays[0].c, viewer, {
        date: now, limit: 6, restrictToUserIds: memberIds.filter((id) => id !== String(req.userId)),
      });
      compatible = result.matches.map((m) => ({ ...m, commuteId: String(todays[0].c._id) }));
    }

    res.json({ ...summary, restricted: false, seats, compatible });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Community not found.' });
    console.error('[COMMUNITIES] detail error:', err);
    res.status(500).json({ error: 'Failed to load community.' });
  }
});

module.exports = router;
