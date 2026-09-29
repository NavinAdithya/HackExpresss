/**
 * Trip Routes
 *
 * POST   /api/trips           → Create trip (with OSRM route calculation)
 * GET    /api/trips            → List user's trips
 * GET    /api/trips/:id        → Get trip details
 * PUT    /api/trips/:id/status → Update trip status
 * DELETE /api/trips/:id        → Cancel trip
 */

const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Match = require('../models/Match');
const Penalty = require('../models/Penalty');
const { auth } = require('../middleware/auth');
const { calculateRoute } = require('../services/route-service');
const { calculateFare, calculateNoShowPenalty } = require('../services/fare-calculator');
const { verifyFace, bothPartiesVerified } = require('../services/face-verification');
const { updateTrustScore } = require('../services/trust-safety');
const RIDE_CONFIG = require('../config/ride');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * POST /api/trips — Create a new trip
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      role, origin, destination, departureTime, timeWindow,
      seatCount, budgetMin, budgetMax, tolls,
      verifiedOnly, womenOnly,
    } = req.body;

    // Validate required fields
    if (!role || !origin?.address || !origin?.coordinates || !destination?.address || !destination?.coordinates || !departureTime) {
      return res.status(400).json({ error: 'Missing required trip fields.' });
    }

    // Daily ride cap — server-enforced
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await User.findById(req.userId);

    // Reset daily count if new day
    if (!user.dailyRideDate || new Date(user.dailyRideDate) < today) {
      user.dailyRideCount = 0;
      user.dailyRideDate = today;
    }

    if (user.dailyRideCount >= RIDE_CONFIG.maxRidesPerDay) {
      return res.status(429).json({
        error: `Daily ride limit reached. You can book up to ${RIDE_CONFIG.maxRidesPerDay} rides per calendar day.`,
      });
    }

    // Calculate route via OSRM
    const originCoords = [origin.coordinates[0], origin.coordinates[1]]; // [lng, lat]
    const destCoords = [destination.coordinates[0], destination.coordinates[1]];

    let routeData;
    try {
      routeData = await calculateRoute(originCoords, destCoords);
    } catch (err) {
      return res.status(502).json({ error: 'Route calculation failed. Please try again.' });
    }

    // Create trip
    const trip = new Trip({
      userId: req.userId,
      role,
      origin: {
        address: origin.address,
        location: { type: 'Point', coordinates: originCoords },
      },
      destination: {
        address: destination.address,
        location: { type: 'Point', coordinates: destCoords },
      },
      route: routeData.geometry,
      routeDistance: routeData.distance,
      routeDuration: routeData.duration,
      departureTime: new Date(departureTime),
      timeWindow: timeWindow || RIDE_CONFIG.defaultTimeWindowMinutes,
      seatCount: seatCount || 1,
      budgetMin: budgetMin || 0,
      budgetMax: budgetMax || 500,
      tolls: tolls || 0,
      verifiedOnly: verifiedOnly || false,
      womenOnly: womenOnly || false,
    });

    await trip.save();

    // Increment daily count
    user.dailyRideCount += 1;
    await user.save();

    // Calculate estimated fare for preview
    const fareEstimate = calculateFare(
      routeData.distance,
      tolls || 0,
      seatCount || 2
    );

    res.status(201).json({
      trip,
      fareEstimate,
      route: {
        distance: routeData.distance,
        duration: routeData.duration,
      },
    });
  } catch (err) {
    console.error('[TRIPS] create error:', err);
    res.status(500).json({ error: 'Failed to create trip.' });
  }
});

/**
 * GET /api/trips — List user's trips
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, role, limit = 20 } = req.query;
    const query = { userId: req.userId };
    if (status) query.status = status;
    if (role) query.role = role;

    const trips = await Trip.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('matchedUserId', 'name phone profilePhoto trustScore plan');

    res.json({ trips });
  } catch (err) {
    console.error('[TRIPS] list error:', err);
    res.status(500).json({ error: 'Failed to fetch trips.' });
  }
});

/**
 * GET /api/trips/:id — Get trip details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('matchedUserId', 'name phone profilePhoto trustScore plan gender verified');

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    // Authorization: user must own or be matched to the trip
    if (trip.userId.toString() !== req.userId.toString() &&
        trip.matchedUserId?._id?.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Include fare breakdown if completed
    let fareBreakdown = null;
    if (trip.status === 'COMPLETED' && trip.fare) {
      fareBreakdown = calculateFare(trip.routeDistance, trip.tolls, trip.seatCount);
    }

    res.json({ trip, fareBreakdown });
  } catch (err) {
    console.error('[TRIPS] get error:', err);
    res.status(500).json({ error: 'Failed to fetch trip.' });
  }
});

/**
 * PUT /api/trips/:id/status — Update trip status
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    if (trip.userId.toString() !== req.userId.toString() &&
        trip.matchedUserId?.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Status transition validation
    const validTransitions = {
      POSTED: ['MATCHED', 'CANCELLED'],
      MATCHED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['VERIFYING', 'CANCELLED'],
      VERIFYING: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
    };

    if (!validTransitions[trip.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${trip.status} to ${status}.`,
      });
    }

    // Special handling for IN_PROGRESS — requires face verification
    if (status === 'IN_PROGRESS') {
      if (trip.matchedTripId) {
        const matchedTrip = await Trip.findById(trip.matchedTripId);
        if (!bothPartiesVerified(trip, matchedTrip)) {
          return res.status(400).json({
            error: 'Both parties must complete face verification before starting the trip.',
          });
        }
      }
      trip.startedAt = new Date();
      trip.sharedTrackingToken = uuidv4();
    }

    // Handle completion
    if (status === 'COMPLETED') {
      trip.completedAt = new Date();
      const fareBreakdown = calculateFare(trip.routeDistance, trip.tolls, trip.seatCount);
      trip.fare = fareBreakdown.poolFare;
      trip.commission = fareBreakdown.commission;

      // Also complete the matched trip
      if (trip.matchedTripId) {
        await Trip.findByIdAndUpdate(trip.matchedTripId, {
          status: 'COMPLETED',
          completedAt: new Date(),
          fare: fareBreakdown.poolFare,
          commission: fareBreakdown.commission,
        });
      }
    }

    // Handle no-show
    if (status === 'NO_SHOW') {
      const fareBreakdown = calculateFare(trip.routeDistance, trip.tolls, trip.seatCount);
      const penalty = calculateNoShowPenalty(fareBreakdown.poolFare);

      // Determine rider and driver
      const isDriver = trip.role === 'driver';
      await Penalty.create({
        tripId: trip._id,
        riderId: isDriver ? trip.matchedUserId : trip.userId,
        driverId: isDriver ? trip.userId : trip.matchedUserId,
        reason: 'NO_SHOW',
        amount: penalty.penaltyAmount,
        compensation: penalty.driverCompensation,
      });
    }

    trip.status = status;
    await trip.save();

    res.json({ trip });
  } catch (err) {
    console.error('[TRIPS] status update error:', err);
    res.status(500).json({ error: 'Failed to update trip status.' });
  }
});

/**
 * PUT /api/trips/:id/verify-face — Face verification
 */
router.put('/:id/verify-face', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (trip.userId.toString() !== req.userId.toString() &&
        trip.matchedUserId?.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await verifyFace(req.userId, req.body.imageData);

    // Update the correct trip's verification status
    if (trip.userId.toString() === req.userId.toString()) {
      trip.faceVerificationStatus = result.verified ? 'VERIFIED' : 'FAILED';
      await trip.save();
    } else if (trip.matchedTripId) {
      await Trip.findByIdAndUpdate(trip.matchedTripId, {
        faceVerificationStatus: result.verified ? 'VERIFIED' : 'FAILED',
      });
    }

    // Check if both are now verified
    let bothVerified = false;
    if (trip.matchedTripId) {
      const matchedTrip = await Trip.findById(trip.matchedTripId);
      const updatedTrip = await Trip.findById(trip._id);
      bothVerified = bothPartiesVerified(updatedTrip, matchedTrip);
    }

    res.json({
      verified: result.verified,
      confidence: result.confidence,
      bothVerified,
    });
  } catch (err) {
    console.error('[TRIPS] face verify error:', err);
    res.status(500).json({ error: 'Face verification failed.' });
  }
});

/**
 * DELETE /api/trips/:id — Cancel trip
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (trip.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (['COMPLETED', 'CANCELLED'].includes(trip.status)) {
      return res.status(400).json({ error: 'Trip is already finished.' });
    }

    // Check for late cancel penalty
    if (trip.status === 'ACCEPTED' || trip.status === 'IN_PROGRESS') {
      const fareBreakdown = calculateFare(trip.routeDistance, trip.tolls, trip.seatCount);
      const penalty = calculateNoShowPenalty(fareBreakdown.poolFare);

      if (trip.matchedUserId) {
        await Penalty.create({
          tripId: trip._id,
          riderId: trip.role === 'passenger' ? trip.userId : trip.matchedUserId,
          driverId: trip.role === 'driver' ? trip.userId : trip.matchedUserId,
          reason: 'LATE_CANCEL',
          amount: penalty.penaltyAmount,
          compensation: penalty.driverCompensation,
        });
      }
    }

    trip.status = 'CANCELLED';
    await trip.save();

    res.json({ message: 'Trip cancelled.', trip });
  } catch (err) {
    console.error('[TRIPS] cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel trip.' });
  }
});

module.exports = router;
