/**
 * Rating Routes
 *
 * POST /api/ratings                   → rate the other participant of a completed shared journey
 *                                       (five parameters, each 1–10, plus optional comment)
 * GET  /api/ratings/eligibility/:tripId → can I rate this trip, and who?
 * GET  /api/ratings/user/:id          → ratings received by a user
 */

const express = require('express');
const Rating = require('../models/Rating');
const { auth } = require('../middleware/auth');
const { submitRating, resolveRatingContext } = require('../services/rating-service');
const { TRUST_PARAMS, computeBehaviorTrust } = require('../services/behavior-trust');

const router = express.Router();

/**
 * POST /api/ratings
 */
router.post('/', auth, async (req, res) => {
  try {
    const { tripId } = req.body || {};
    if (!tripId) return res.status(400).json({ error: 'Trip ID is required.', code: 'INVALID_SCORES' });

    const result = await submitRating({ raterId: req.userId, tripId, body: req.body });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.message, code: result.code });
    }

    res.status(201).json({
      rating: result.rating,
      tripRating: result.overall,
      ratedUser: { _id: String(result.ratedUser._id), name: result.ratedUser.name },
      trust: result.trust,
    });
  } catch (err) {
    console.error('[RATINGS] create error:', err);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
});

/**
 * GET /api/ratings/eligibility/:tripId
 */
router.get('/eligibility/:tripId', auth, async (req, res) => {
  try {
    const ctx = await resolveRatingContext(req.params.tripId, req.userId);
    if (!ctx.ok) {
      return res.json({ eligible: false, code: ctx.code, reason: ctx.message });
    }
    res.json({
      eligible: true,
      ratedUser: { _id: String(ctx.ratedUser._id), name: ctx.ratedUser.name },
      parameters: TRUST_PARAMS,
    });
  } catch (err) {
    console.error('[RATINGS] eligibility error:', err);
    res.status(500).json({ error: 'Failed to check rating eligibility.' });
  }
});

/**
 * GET /api/ratings/user/:id — ratings received by a user
 */
router.get('/user/:id', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedUser: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('rater', 'name profilePhoto');

    const summary = computeBehaviorTrust(ratings);
    const avg = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({ ratings, average: avg, count: ratings.length, trust: summary });
  } catch (err) {
    console.error('[RATINGS] get error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings.' });
  }
});

module.exports = router;
