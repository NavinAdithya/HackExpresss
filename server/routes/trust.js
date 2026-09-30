/**
 * Trust & Profile Routes
 *
 * GET /api/trust/user/:id → public profile: identity verification + behavioural trust
 *                           + communities + recent written reviews.
 *
 * Identity ("who is this?") and trust ("how did they behave?") are returned as
 * separate blocks and never merged into one number.
 */

const express = require('express');
const User = require('../models/User');
const Rating = require('../models/Rating');
const { auth } = require('../middleware/auth');
const { getBehaviorTrust, TRUST_PARAMS, TRUST_LABELS } = require('../services/behavior-trust');
const { getCommunitiesForUsers } = require('../services/community-service');

const router = express.Router();

/** Identity verification flags derived ONLY from data we actually hold. */
function identityBlock(u) {
  return {
    phone: !!u.phone && u.accountVerified !== false,
    identity: u.accountVerified !== false,
    face: !!u.faceReferencePhoto,
    traveller: u.driverStatus === 'APPROVED',
  };
}

async function buildProfile(u) {
  const trust = await getBehaviorTrust(u);
  const communityMap = await getCommunitiesForUsers([String(u._id)]);

  const received = await Rating.find({ ratedUser: String(u._id) }).limit(50);
  const written = received
    .filter((r) => r.comment && String(r.comment).trim())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const raterIds = [...new Set(written.map((r) => String(r.rater)))];
  const raters = raterIds.length ? await User.find({ _id: { $in: raterIds } }) : [];
  const raterName = {};
  raters.forEach((r) => { raterName[String(r._id)] = String(r.name || '').split(' ')[0]; });

  return {
    user: {
      _id: String(u._id),
      name: u.name,
      photo: u.profilePhoto || '',
      memberSince: u.createdAt,
    },
    identity: identityBlock(u),
    trust: {
      ...trust,
      parameterLabels: TRUST_LABELS,
      parameterOrder: TRUST_PARAMS,
    },
    communities: communityMap[String(u._id)] || [],
    reviews: written.map((r) => ({
      comment: r.comment,
      overall: r.overall ?? null,
      rater: raterName[String(r.rater)] || 'A commuter',
      createdAt: r.createdAt,
    })),
  };
}

/** GET /api/trust/user/:id */
router.get('/user/:id', auth, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    res.json(await buildProfile(u));
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'User not found.' });
    console.error('[TRUST] profile error:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

module.exports = router;
module.exports.buildProfile = buildProfile;
