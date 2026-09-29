/**
 * Match Routes — PO → PO Bidirectional Matching
 *
 * Implements:
 * - 4 Match Types (EXACT_DESTINATION, NEARBY_DESTINATION, ROUTE_CORRIDOR, ACCEPTABLE_DETOUR)
 * - Smart Search Fallback (Never "No rides found", shows nearby alternatives)
 * - Women-Only Hard Filter
 * - Detour and Cost Breakdown
 */

const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Match = require('../models/Match');
const { auth } = require('../middleware/auth');
const { findMatches } = require('../services/matching-engine');
const { calculateFare } = require('../services/fare-calculator');
const { validateRideConfirmationQuota, getDailyCommuteQuota } = require('../services/quota-service');
const geminiService = require('../services/gemini-service');

const router = express.Router();

/**
 * POST /api/matches/find/:tripId — Find matching commuters
 */
router.post('/find/:tripId', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ error: 'Commute not found.' });
    if (trip.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const oppositeRole = trip.role === 'driver' ? 'passenger' : 'driver';

    // Candidate query: opposite role commutes
    let candidateTrips = await Trip.find({
      _id: { $ne: trip._id },
      userId: { $ne: req.userId },
      role: oppositeRole,
      status: { $in: ['POSTED', 'OPEN', 'CREATED', 'SEARCHING'] },
    }).limit(50);

    // Fallback if none found: expand search across all opposite role commutes
    if (candidateTrips.length === 0) {
      candidateTrips = await Trip.find({
        _id: { $ne: trip._id },
        userId: { $ne: req.userId },
        role: oppositeRole,
      }).limit(50);
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

    // Enrich with shared cost breakdown & create pending Match records (0 quota consumed)
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const distance = trip.routeDistance || result.candidateTrip?.routeDistance || 8000;
        const fare = calculateFare(distance, 0, 2);

        let matchDoc = null;
        if (result.candidateTrip?._id) {
          matchDoc = await Match.findOne({
            $or: [
              { tripA: trip._id, tripB: result.candidateTrip._id },
              { tripA: result.candidateTrip._id, tripB: trip._id },
            ],
          });

          if (!matchDoc) {
            matchDoc = new Match({
              tripA: trip._id,
              tripB: result.candidateTrip._id,
              userA: trip.userId,
              userB: result.candidateTrip.userId,
              routeScore: result.routeScore || 80,
              timeScore: result.timeScore || 80,
              budgetScore: result.budgetScore || 80,
              capacityScore: result.capacityScore || 100,
              finalScore: result.finalScore || 80,
              explanation: result.explanation || '',
              status: 'PENDING',
            });
            await matchDoc.save();
          }
        }

        return {
          ...result,
          matchId: matchDoc ? matchDoc._id.toString() : (result.candidateTrip?._id?.toString() || ''),
          estimatedContribution: fare.sharedCostPerPerson,
          platformFee: fare.platformFee,
          passengerTotal: fare.passengerTotal,
        };
      })
    );

    const hasExact = enrichedResults.some((m) => m.matchType === 'EXACT_DESTINATION');
    const fallbackMessage = hasExact
      ? 'Exact destination match found!'
      : enrichedResults.length > 0
      ? 'No exact destination matches. We found commuters travelling nearby.'
      : 'Scanning for active commuters along your route corridor...';

    // Authoritative daily commute quota
    const quota = await getDailyCommuteQuota(req.userId);

    res.json({
      matches: enrichedResults,
      hasExactMatch: hasExact,
      message: fallbackMessage,
      dailyQuota: quota,
    });
  } catch (err) {
    console.error('[MATCHES] find error:', err);
    res.status(500).json({ error: 'Failed to find matches.' });
  }
});

/**
 * PUT /api/matches/:id/accept — Confirm a shared commute (Consumes daily quota)
 */
router.put('/:id/accept', auth, async (req, res) => {
  try {
    let match = await Match.findById(req.params.id);

    // Support candidate trip ID lookup if matchId was a tripId
    if (!match) {
      const candidateTrip = await Trip.findById(req.params.id);
      if (candidateTrip) {
        match = await Match.findOne({
          $or: [
            { tripA: candidateTrip._id },
            { tripB: candidateTrip._id },
          ],
        });

        if (!match) {
          const userTrip = await Trip.findOne({
            userId: req.userId,
            status: { $in: ['POSTED', 'OPEN', 'CREATED', 'SEARCHING'] },
          }).sort({ createdAt: -1 });

          if (userTrip) {
            match = new Match({
              tripA: userTrip._id,
              tripB: candidateTrip._id,
              userA: userTrip.userId,
              userB: candidateTrip.userId,
              routeScore: 85,
              timeScore: 90,
              budgetScore: 90,
              capacityScore: 100,
              finalScore: 88,
              status: 'PENDING',
            });
            await match.save();
          }
        }
      }
    }

    if (!match) return res.status(404).json({ error: 'Match not found.' });

    const isUserA = match.userA.toString() === req.userId.toString();
    const isUserB = match.userB.toString() === req.userId.toString();

    if (!isUserA && !isUserB) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // CRITICAL: Validate daily ride quota for BOTH commuters before confirmation
    const quotaValidation = await validateRideConfirmationQuota(match.userA, match.userB);
    if (!quotaValidation.allowed) {
      return res.status(429).json({
        error: 'DAILY_QUOTA_REACHED',
        message: quotaValidation.reason,
        quotaA: quotaValidation.quotaA,
        quotaB: quotaValidation.quotaB,
      });
    }

    if (isUserA) match.userAAccepted = true;
    if (isUserB) match.userBAccepted = true;

    // In PO → PO: Once confirmed, establish the passenger relationship
    // Transitions to CONFIRMED (which counts as 1 against daily quota)
    match.userAAccepted = true;
    match.userBAccepted = true;
    match.status = 'CONFIRMED';

    const tripA = await Trip.findById(match.tripA);
    const tripB = await Trip.findById(match.tripB);

    if (tripA && tripB) {
      tripA.status = 'CONFIRMED';
      tripA.matchedTripId = tripB._id;
      tripA.matchedUserId = tripB.userId;
      tripA.matchId = match._id;
      await tripA.save();

      tripB.status = 'CONFIRMED';
      tripB.matchedTripId = tripA._id;
      tripB.matchedUserId = tripA.userId;
      tripB.matchId = match._id;
      await tripB.save();
    }

    await match.save();

    // Fetch updated authoritative daily quota after confirmation
    const updatedQuota = await getDailyCommuteQuota(req.userId);

    res.json({
      match,
      status: match.status,
      tripA,
      tripB,
      dailyQuota: updatedQuota,
      message: 'Shared commute confirmed! Your daily commute allowance is now 1 used, 1 remaining.',
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

    res.json({ match });
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
      status: { $ne: 'DECLINED' },
    })
      .populate('userA', 'name phone profilePhoto trustScore plan')
      .populate('userB', 'name phone profilePhoto trustScore plan');

    res.json({ matches });
  } catch (err) {
    console.error('[MATCHES] get error:', err);
    res.status(500).json({ error: 'Failed to fetch matches.' });
  }
});

module.exports = router;
