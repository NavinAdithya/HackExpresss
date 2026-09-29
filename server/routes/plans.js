/**
 * Plan & Subscription Routes
 *
 * GET  /api/plans              → Get all plans
 * POST /api/plans/subscribe    → Subscribe to a plan
 * POST /api/plans/verify       → Verify payment
 * PUT  /api/plans/cancel       → Cancel subscription
 */

const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { PLAN_CONFIG, hasFeature } = require('../config/plan');
const subscriptionService = require('../services/subscription-service');

const router = express.Router();

/**
 * GET /api/plans — Get all plans with features
 */
router.get('/', async (req, res) => {
  const plans = Object.entries(PLAN_CONFIG).map(([key, plan]) => ({
    id: key,
    ...plan,
    razorpayKeyId: subscriptionService.getPublicKey(),
  }));

  res.json({ plans });
});

/**
 * POST /api/plans/subscribe — Start subscription
 */
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['VERIFIED', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose VERIFIED or PRO.' });
    }

    if (req.user.plan === plan && req.user.subscriptionStatus === 'ACTIVE') {
      return res.status(400).json({ error: 'You are already on this plan.' });
    }

    const result = await subscriptionService.createSubscription(plan, req.user);

    // If mocked, activate immediately
    if (result.mocked) {
      req.user.plan = plan;
      req.user.subscriptionStatus = 'ACTIVE';
      req.user.subscriptionId = result.subscriptionId;
      req.user.subscriptionStart = result.startDate;
      req.user.subscriptionEnd = result.endDate;
      // Verified plan also sets verified status
      if (plan === 'VERIFIED' || plan === 'PRO') {
        req.user.verified = true;
      }
      await req.user.save();
    }

    res.json({
      subscription: result,
      user: {
        plan: req.user.plan,
        subscriptionStatus: req.user.subscriptionStatus,
        verified: req.user.verified,
      },
    });
  } catch (err) {
    console.error('[PLANS] subscribe error:', err);
    res.status(500).json({ error: 'Subscription failed.' });
  }
});

/**
 * POST /api/plans/verify — Verify payment (Razorpay callback)
 */
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } = req.body;

    const verification = await subscriptionService.verifyPayment({
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    });

    if (verification.verified) {
      req.user.plan = plan;
      req.user.subscriptionStatus = 'ACTIVE';
      req.user.subscriptionId = razorpay_subscription_id;
      req.user.subscriptionStart = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      req.user.subscriptionEnd = end;
      if (plan === 'VERIFIED' || plan === 'PRO') {
        req.user.verified = true;
      }
      await req.user.save();
    }

    res.json({
      verified: verification.verified,
      user: {
        plan: req.user.plan,
        subscriptionStatus: req.user.subscriptionStatus,
      },
    });
  } catch (err) {
    console.error('[PLANS] verify error:', err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

/**
 * PUT /api/plans/cancel — Cancel subscription
 */
router.put('/cancel', auth, async (req, res) => {
  try {
    if (req.user.subscriptionStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'No active subscription to cancel.' });
    }

    req.user.subscriptionStatus = 'CANCELLED';
    // Keep plan active until subscription end date
    await req.user.save();

    res.json({
      message: 'Subscription cancelled. Access continues until the end of your billing period.',
      subscriptionEnd: req.user.subscriptionEnd,
    });
  } catch (err) {
    console.error('[PLANS] cancel error:', err);
    res.status(500).json({ error: 'Cancellation failed.' });
  }
});

/**
 * GET /api/plans/entitlements — Check feature access
 */
router.get('/entitlements', auth, async (req, res) => {
  const features = {};
  const allFeatures = [
    ...PLAN_CONFIG.FREE.features,
    ...Object.keys(PLAN_CONFIG.VERIFIED.featureLabels),
    ...Object.keys(PLAN_CONFIG.PRO.featureLabels),
  ];

  for (const feature of new Set(allFeatures)) {
    features[feature] = hasFeature(req.user.plan, feature);
  }

  res.json({
    plan: req.user.plan,
    subscriptionStatus: req.user.subscriptionStatus,
    features,
  });
});

module.exports = router;
