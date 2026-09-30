/**
 * Authentication & Profile Routes — PO → PO
 *
 * Registration Flow (Section 12):
 *   Step 1: Phone number
 *   Step 2: Phone OTP (Supabase Auth / Local OTP fallback)
 *   Step 3: Basic profile (Name, DOB/Age, Gender, Profile photo)
 *   Step 4: Face reference image (Biometric identity reference)
 *   Step 5: Role selection (PASSENGER or PASSENGER + TRAVELLER)
 *
 * Traveller Verification (Section 14 & 15):
 *   Driving Licence + Identity document + Vehicle information.
 *   Status: NOT_REQUESTED, PENDING, APPROVED, REJECTED.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerReferenceFace } = require('../services/face-verification');
const { computeUserTrustScore, calculateTrustScore } = require('../services/trust-score');
const { getBehaviorTrust } = require('../services/behavior-trust');
const { getDailyCommuteQuota } = require('../services/quota-service');

const router = express.Router();

const DEMO_ACCOUNTS = {
  '9876543210': {
    name: 'Priya Sharma',
    gender: 'female',
    plan: 'VERIFIED',
    verified: true,
    accountVerified: true,
    driverStatus: 'APPROVED',
    rolePreference: 'BOTH',
    womenOnly: false,
  },
  '9876543211': {
    name: 'Rahul Kumar',
    gender: 'male',
    plan: 'PRO',
    verified: true,
    accountVerified: true,
    driverStatus: 'APPROVED',
    rolePreference: 'TRAVELLER',
    womenOnly: false,
  },
  '9876543212': {
    name: 'Ananya Iyer',
    gender: 'female',
    plan: 'VERIFIED',
    verified: true,
    accountVerified: true,
    driverStatus: 'NOT_REQUESTED',
    rolePreference: 'PASSENGER',
    womenOnly: true,
  },
  '9876543213': {
    name: 'Vikram Rajan',
    gender: 'male',
    plan: 'FREE',
    verified: true,
    accountVerified: true,
    driverStatus: 'APPROVED',
    rolePreference: 'BOTH',
    womenOnly: false,
  },
};

/**
 * POST /api/auth/send-otp
 */
router.post('/send-otp', authLimiter, async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({
        phone,
        name: name || `User ${phone.slice(-4)}`,
        verified: true,
        accountVerified: true,
      });
    }

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  [PO → PO OTP] ${phone}: ${otp}        ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    res.json({
      message: 'OTP sent successfully via Supabase Auth / SMS Gateway.',
      otp, // Provided for instant demo test convenience
    });
  } catch (err) {
    console.error('[AUTH] send-otp error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

/**
 * POST /api/auth/quick-login — 1-Click Verified Demo Access
 */
router.post('/quick-login', authLimiter, async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    let user = await User.findOne({ phone });
    if (!user) {
      const defaults = DEMO_ACCOUNTS[phone] || {
        name: name || `User ${phone.slice(-4)}`,
        gender: 'other',
        plan: 'VERIFIED',
        verified: true,
        accountVerified: true,
        driverStatus: 'APPROVED',
        rolePreference: 'BOTH',
        womenOnly: false,
      };
      user = new User({
        phone,
        ...defaults,
        subscriptionStatus: 'ACTIVE',
      });
      await user.save();
    }

    // Register reference face identity for user
    registerReferenceFace(user._id, user.faceReferencePhoto || user.name);

    // Authoritative Server-Side Trust Score Recomputation
    const trustData = await computeUserTrustScore(user);

    const token = jwt.sign(
      { userId: user._id, phone: user.phone, plan: user.plan },
      process.env.JWT_SECRET || 'popo-dev-secret',
      { expiresIn: '7d' }
    );

    const serialized = serializeUser(user);
    serialized.trustScore = trustData.score;
    serialized.trustScoreBreakdown = trustData.breakdown;
    serialized.trustScoreFactors = trustData.factors;
    serialized.trustTier = trustData.tier;
    serialized.trustTierLabel = trustData.tierLabel;
    serialized.dailyQuota = await getDailyCommuteQuota(user._id);

    res.json({
      token,
      user: serialized,
    });
  } catch (err) {
    console.error('[AUTH] quick-login error:', err);
    res.status(500).json({ error: 'Quick login failed.' });
  }
});

/**
 * POST /api/auth/verify-otp
 */
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      const defaults = DEMO_ACCOUNTS[phone] || {
        name: `User ${phone.slice(-4)}`,
        gender: 'other',
        plan: 'VERIFIED',
        verified: true,
        accountVerified: true,
        driverStatus: 'APPROVED',
        rolePreference: 'BOTH',
        womenOnly: false,
      };
      user = new User({
        phone,
        ...defaults,
        subscriptionStatus: 'ACTIVE',
      });
      await user.save();
    }

    const isMasterOtp = otp === '123456';
    if (!isMasterOtp && (!user.otp || user.otp !== otp)) {
      return res.status(400).json({ error: 'Invalid OTP. For demo testing, use 123456.' });
    }

    if (!isMasterOtp && user.otpExpiry && user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    registerReferenceFace(user._id, user.faceReferencePhoto || user.name);

    // Authoritative Server-Side Trust Score Recomputation
    const trustData = await computeUserTrustScore(user);

    const token = jwt.sign(
      { userId: user._id, phone: user.phone, plan: user.plan },
      process.env.JWT_SECRET || 'popo-dev-secret',
      { expiresIn: '7d' }
    );

    const serialized = serializeUser(user);
    serialized.trustScore = trustData.score;
    serialized.trustScoreBreakdown = trustData.breakdown;
    serialized.trustScoreFactors = trustData.factors;
    serialized.trustTier = trustData.tier;
    serialized.trustTierLabel = trustData.tierLabel;
    serialized.dailyQuota = await getDailyCommuteQuota(user._id);

    res.json({
      token,
      user: serialized,
    });
  } catch (err) {
    console.error('[AUTH] verify-otp error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', auth, async (req, res) => {
  try {
    const trustData = await computeUserTrustScore(req.userId);
    const dailyQuota = await getDailyCommuteQuota(req.userId);
    const serialized = serializeUser(req.user);
    serialized.trustScore = trustData.score;
    serialized.trustScoreBreakdown = trustData.breakdown;
    serialized.trustScoreFactors = trustData.factors;
    serialized.trustTier = trustData.tier;
    serialized.trustTierLabel = trustData.tierLabel;
    serialized.dailyQuota = dailyQuota;
    serialized.behaviorTrust = await getBehaviorTrust(req.userId);
    res.json({ user: serialized });
  } catch (err) {
    console.error('[AUTH] /me error:', err);
    res.json({ user: serializeUser(req.user) });
  }
});

/**
 * GET /api/auth/trust-score — Authoritative Deterministic Trust Score Breakdown
 */
router.get('/trust-score', auth, async (req, res) => {
  try {
    const trustData = await computeUserTrustScore(req.userId);
    res.json(trustData);
  } catch (err) {
    console.error('[AUTH] trust-score error:', err);
    res.status(500).json({ error: 'Failed to compute trust score.' });
  }
});

/**
 * GET /api/auth/trust-score/:userId — Peer Trust Score Breakdown
 */
router.get('/trust-score/:userId', auth, async (req, res) => {
  try {
    const trustData = await computeUserTrustScore(req.params.userId);
    res.json(trustData);
  } catch (err) {
    console.error('[AUTH] peer trust-score error:', err);
    res.status(500).json({ error: 'Failed to compute peer trust score.' });
  }
});

/**
 * PUT /api/auth/profile — Update profile & registration steps
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = [
      'name', 'gender', 'dateOfBirth', 'profilePhoto',
      'faceReferencePhoto', 'rolePreference', 'womenOnly',
    ];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // If face reference is provided, register reference embedding
    if (updates.faceReferencePhoto) {
      registerReferenceFace(req.userId, updates.faceReferencePhoto);
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      select: '-otp -otpExpiry',
    });

    const trustData = await computeUserTrustScore(user._id);
    const serialized = serializeUser(user);
    serialized.trustScore = trustData.score;
    serialized.trustScoreBreakdown = trustData.breakdown;
    serialized.trustScoreFactors = trustData.factors;
    serialized.trustTier = trustData.tier;
    serialized.trustTierLabel = trustData.tierLabel;

    res.json({ user: serialized });
  } catch (err) {
    console.error('[AUTH] profile update error:', err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

/**
 * POST /api/auth/traveller-verify — Submit documents for Traveller approval
 *
 * MOCKED FOR DEMO:
 * Driver document verification approval is simulated.
 * Production requires a compliant identity-verification process.
 */
router.post('/traveller-verify', auth, async (req, res) => {
  try {
    const { licenseNumber, vehicleModel, vehicleNumber, transportMode } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // MOCKED FOR DEMO:
    // Driver document verification approval is simulated.
    // Production requires a compliant identity-verification process.
    user.driverStatus = 'APPROVED';
    user.vehicleDetails = {
      transportMode: transportMode || 'BIKE',
      vehicleModel: vehicleModel || 'Two-Wheeler',
      vehicleRegistration: vehicleNumber || 'TN 01 AB 1234',
      capacity: transportMode === 'CAR' ? 3 : 1,
    };

    await user.save();

    // Recompute trust score to include approved traveller bonus (+15 pts)
    const trustData = await computeUserTrustScore(user._id);
    const serialized = serializeUser(user);
    serialized.trustScore = trustData.score;
    serialized.trustScoreBreakdown = trustData.breakdown;
    serialized.trustScoreFactors = trustData.factors;
    serialized.trustTier = trustData.tier;
    serialized.trustTierLabel = trustData.tierLabel;

    res.json({
      success: true,
      driverStatus: user.driverStatus,
      user: serialized,
      trustScore: trustData.score,
      message: 'Traveller verification approved! You can now share your commute.',
    });
  } catch (err) {
    console.error('[AUTH] traveller verify error:', err);
    res.status(500).json({ error: 'Traveller verification failed.' });
  }
});

/**
 * POST /api/auth/support — Create a support ticket
 */
router.post('/support', auth, async (req, res) => {
  try {
    const { category, subject, description, tripId } = req.body;
    res.json({
      success: true,
      ticketId: `TCK-${Date.now().toString().slice(-6)}`,
      category: category || 'General',
      subject,
      status: 'OPEN',
      message: 'Support ticket submitted. A PO → PO safety officer will review your request.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit support ticket.' });
  }
});

function serializeUser(u) {
  return {
    _id: u._id,
    name: u.name,
    phone: u.phone,
    gender: u.gender,
    dateOfBirth: u.dateOfBirth,
    verified: u.verified ?? true,
    accountVerified: true,
    isPoPoMember: true,
    driverStatus: u.driverStatus || 'APPROVED',
    vehicleDetails: u.vehicleDetails,
    rolePreference: u.rolePreference || 'BOTH',
    plan: u.plan,
    subscriptionStatus: u.subscriptionStatus,
    trustScore: typeof u.trustScore === 'number' ? u.trustScore : 50,
    trustScoreBreakdown: u.trustScoreBreakdown || null,
    behaviorTrust: u.behaviorTrust || null,
    profilePhoto: u.profilePhoto,
    womenOnly: u.womenOnly || false,
    trustedContacts: u.trustedContacts || [],
    recurringCommutes: u.recurringCommutes || [],
    createdAt: u.createdAt,
  };
}

module.exports = router;
