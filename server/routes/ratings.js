/**
 * Rating Routes
 *
 * POST /api/ratings          → Submit a rating after trip completion
 * GET  /api/ratings/user/:id → Get ratings for a user
 */

const express = require('express');
const Rating = require('../models/Rating');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { auth } = require('../middleware/auth');
const { computeUserTrustScore } = require('../services/trust-score');

const router = express.Router();

/**
 * POST /api/ratings — Submit a rating
 */
router.post('/', auth, async (req, res) => {
  try {
    const { tripId, rating, comment } = req.body;

    if (!tripId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Trip ID and rating (1–5) required.' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (trip.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only rate completed trips.' });
    }

    // Determine who is being rated
    const isOwner = trip.userId.toString() === req.userId.toString();
    const isMatchedUser = trip.matchedUserId?.toString() === req.userId.toString();

    if (!isOwner && !isMatchedUser) {
      return res.status(403).json({ error: 'You are not part of this trip.' });
    }

    const ratedUserId = isOwner ? trip.matchedUserId : trip.userId;

    // Check for duplicate
    const existing = await Rating.findOne({ rater: req.userId, trip: tripId });
    if (existing) {
      return res.status(400).json({ error: 'You have already rated this trip.' });
    }

    const ratingDoc = await Rating.create({
      rater: req.userId,
      ratedUser: ratedUserId,
      trip: tripId,
      rating,
      comment: comment || '',
    });

    // Recompute authoritative trust score for rated user from actual activity
    const trustData = await computeUserTrustScore(ratedUserId);

    res.status(201).json({
      rating: ratingDoc,
      newTrustScore: trustData.score,
      trustScoreBreakdown: trustData.breakdown,
      trustScoreFactors: trustData.factors,
    });
  } catch (err) {
    console.error('[RATINGS] create error:', err);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
});

/**
 * GET /api/ratings/user/:id — Get ratings for a user
 */
router.get('/user/:id', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedUser: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('rater', 'name profilePhoto');

    const avg = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({ ratings, average: avg, count: ratings.length });
  } catch (err) {
    console.error('[RATINGS] get error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings.' });
  }
});

module.exports = router;
