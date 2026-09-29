/**
 * Match Routes
 *
 * POST /api/matches/find/:tripId → Find matches for a trip
 * PUT  /api/matches/:id/accept   → Accept a match
 * PUT  /api/matches/:id/decline  → Decline a match
 * GET  /api/matches/trip/:tripId  → Get matches for a trip
 */

const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Match = require('../models/Match');
const { auth } = require('../middleware/auth');
const { findMatches } = require('../services/matching-engine');
const geminiService = require('../services/gemini-service');

const router = express.Router();

/**
 * POST /api/matches/find/:tripId — Find matches for a trip
 */
router.post('/find/:tripId', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (trip.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Find candidate trips (opposite role, active, nearby timeframe)
    const oppositeRole = trip.role === 'driver' ? 'passenger' : 'driver';
    const timeRange = new Date(trip.departureTime);
    const timeWindowMs = (trip.timeWindow || 30) * 60 * 1000;
    const isDev = process.env.NODE_ENV === 'development';
    const windowMultiplier = isDev ? 24 : 2;

    let candidateTrips = await Trip.find({
      _id: { $ne: trip._id },
      userId: { $ne: req.userId },
      role: oppositeRole,
      status: 'POSTED',
      departureTime: {
        $gte: new Date(timeRange.getTime() - timeWindowMs * windowMultiplier),
        $lte: new Date(timeRange.getTime() + timeWindowMs * windowMultiplier),
      },
    }).limit(50);

    // Development/demo fallback: find any posted opposite role trips
    if (candidateTrips.length === 0 && isDev) {
      candidateTrips = await Trip.find({
        _id: { $ne: trip._id },
        userId: { $ne: req.userId },
        role: oppositeRole,
        status: 'POSTED',
      }).limit(50);
    }

    if (candidateTrips.length === 0) {
      return res.json({ matches: [], message: 'No rides found nearby. Try expanding your time window.' });
    }

    // Fetch candidate users
    const candidateUserIds = candidateTrips.map((t) => t.userId);
    const candidateUsers = await User.find({ _id: { $in: candidateUserIds } })
      .select('-otp -otpExpiry');

    const tripUser = await User.findById(req.userId).select('-otp -otpExpiry');

    // Run matching pipeline
    const results = await findMatches(
      trip, tripUser, candidateTrips, candidateUsers, geminiService
    );

    // Save match records
    const savedMatches = [];
    for (const result of results) {
      const existing = await Match.findOne({
        $or: [
          { tripA: trip._id, tripB: result.tripId },
          { tripA: result.tripId, tripB: trip._id },
        ],
      });

      if (existing) {
        savedMatches.push(existing);
        continue;
      }

      const match = await Match.create({
        tripA: trip._id,
        tripB: result.tripId,
        userA: req.userId,
        userB: result.userId,
        routeScore: result.routeScore,
        timeScore: result.timeScore,
        budgetScore: result.budgetScore,
        capacityScore: result.capacityScore,
        finalScore: result.adjustedScore || result.finalScore,
        explanation: result.explanation || '',
      });

      savedMatches.push(match);
    }

    // Combine match records with UI-friendly data
    const matchResults = results.map((r, i) => ({
      matchId: savedMatches[i]?._id,
      ...r,
      match: savedMatches[i],
    }));

    res.json({ matches: matchResults });
  } catch (err) {
    console.error('[MATCHES] find error:', err);
    res.status(500).json({ error: 'Matching failed. Please try again.' });
  }
});

/**
 * PUT /api/matches/:id/accept — Accept a match
 */
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found.' });

    // Verify user is part of this match
    const isUserA = match.userA.toString() === req.userId.toString();
    const isUserB = match.userB.toString() === req.userId.toString();
    if (!isUserA && !isUserB) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    match.status = 'ACCEPTED';
    await match.save();

    // Update both trips
    const tripA = await Trip.findById(match.tripA);
    const tripB = await Trip.findById(match.tripB);

    if (tripA) {
      tripA.status = 'ACCEPTED';
      tripA.matchedTripId = tripB?._id || match.tripB;
      tripA.matchedUserId = match.userB;
      tripA.matchId = match._id;
      await tripA.save();
    }

    if (tripB) {
      tripB.status = 'ACCEPTED';
      tripB.matchedTripId = tripA?._id || match.tripA;
      tripB.matchedUserId = match.userA;
      tripB.matchId = match._id;
      await tripB.save();
    }

    res.json({
      match,
      tripA,
      tripB,
      message: 'Match accepted! Proceed to face verification.',
    });
  } catch (err) {
    console.error('[MATCHES] accept error:', err);
    res.status(500).json({ error: 'Failed to accept match.' });
  }
});

/**
 * PUT /api/matches/:id/decline — Decline a match
 */
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found.' });

    match.status = 'DECLINED';
    await match.save();

    res.json({ match, message: 'Match declined.' });
  } catch (err) {
    console.error('[MATCHES] decline error:', err);
    res.status(500).json({ error: 'Failed to decline match.' });
  }
});

/**
 * GET /api/matches/trip/:tripId — Get matches for a trip
 */
router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { tripA: req.params.tripId },
        { tripB: req.params.tripId },
      ],
    })
      .sort({ finalScore: -1 })
      .populate('userA', 'name profilePhoto trustScore plan gender verified')
      .populate('userB', 'name profilePhoto trustScore plan gender verified');

    res.json({ matches });
  } catch (err) {
    console.error('[MATCHES] get error:', err);
    res.status(500).json({ error: 'Failed to fetch matches.' });
  }
});

module.exports = router;
