/**
 * Authentication Routes
 *
 * POST /api/auth/send-otp    → Send OTP (mocked: printed to console)
 * POST /api/auth/verify-otp  → Verify OTP, return JWT
 * GET  /api/auth/me           → Get current user
 * PUT  /api/auth/profile      → Update profile
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /api/auth/send-otp
 * MOCKED FOR DEMO: OTP is printed to server console instead of sending SMS.
 */
router.post('/send-otp', authLimiter, async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({
        phone,
        name: name || `User ${phone.slice(-4)}`,
      });
    }

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // MOCKED FOR DEMO:
    // OTP SMS delivery is simulated by printing the generated OTP to the server console.
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  [MOCKED OTP] ${phone}: ${otp}        ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    res.json({
      message: 'OTP sent successfully.',
      // In dev mode, include OTP in response for easy testing
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) {
    console.error('[AUTH] send-otp error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
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

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please request OTP first.' });
    }

    const isMasterOtp = process.env.NODE_ENV === 'development' && otp === '123456';
    if (!isMasterOtp && (!user.otp || user.otp !== otp)) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, plan: user.plan },
      process.env.JWT_SECRET || 'popo-dev-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        verified: user.verified,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        trustScore: user.trustScore,
        profilePhoto: user.profilePhoto,
      },
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
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      gender: req.user.gender,
      verified: req.user.verified,
      verifiedOnly: req.user.verifiedOnly,
      womenOnly: req.user.womenOnly,
      trustScore: req.user.trustScore,
      plan: req.user.plan,
      subscriptionStatus: req.user.subscriptionStatus,
      subscriptionStart: req.user.subscriptionStart,
      subscriptionEnd: req.user.subscriptionEnd,
      profilePhoto: req.user.profilePhoto,
      trustedContacts: req.user.trustedContacts,
      recurringCommutes: req.user.recurringCommutes,
      createdAt: req.user.createdAt,
    },
  });
});

/**
 * PUT /api/auth/profile
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'gender', 'profilePhoto', 'verifiedOnly', 'womenOnly'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      select: '-otp -otpExpiry',
    });

    res.json({ user });
  } catch (err) {
    console.error('[AUTH] profile update error:', err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

module.exports = router;
