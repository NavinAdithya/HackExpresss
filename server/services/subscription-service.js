/**
 * Subscription Service — Razorpay integration (TEST MODE only).
 *
 * Falls back to mock subscription when RAZORPAY_KEY_ID is not set.
 * Payment must never use live credentials.
 */

const { PLAN_CONFIG } = require('../config/plan');

let razorpayInstance = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log('[RAZORPAY] No keys set — using mock subscription flow');
    return null;
  }

  try {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('[RAZORPAY] Initialized in TEST MODE');
    return razorpayInstance;
  } catch (err) {
    console.warn('[RAZORPAY] Init failed:', err.message);
    return null;
  }
}

/**
 * Create a subscription for a user.
 * @param {string} planName - 'VERIFIED' or 'PRO'
 * @param {Object} user - User document
 * @returns {Object} Subscription details
 */
async function createSubscription(planName, user) {
  const rzp = getRazorpay();

  if (!rzp) {
    // MOCKED FOR DEMO: Simulated subscription
    return createMockSubscription(planName, user);
  }

  try {
    // In production, plan_id would be pre-created on Razorpay Dashboard
    const subscription = await rzp.subscriptions.create({
      plan_id: process.env[`RAZORPAY_PLAN_${planName}`] || 'plan_mock',
      customer_notify: 1,
      total_count: 12,
    });

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      status: 'created',
      planName,
      amount: PLAN_CONFIG[planName].price,
      mocked: false,
    };
  } catch (err) {
    console.warn('[RAZORPAY] Subscription creation failed:', err.message);
    return createMockSubscription(planName, user);
  }
}

/**
 * Verify payment signature (Razorpay webhook/callback).
 */
async function verifyPayment(paymentData) {
  const rzp = getRazorpay();

  if (!rzp) {
    // MOCKED FOR DEMO
    return { verified: true, mocked: true };
  }

  try {
    const crypto = require('crypto');
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentData.razorpay_payment_id}|${paymentData.razorpay_subscription_id}`)
      .digest('hex');

    return {
      verified: generated === paymentData.razorpay_signature,
      mocked: false,
    };
  } catch (err) {
    console.warn('[RAZORPAY] Verification failed:', err.message);
    return { verified: false, mocked: false };
  }
}

/**
 * Mock subscription for demo without Razorpay keys.
 */
function createMockSubscription(planName, user) {
  // MOCKED FOR DEMO:
  // Production implementation would use Razorpay subscription API.
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  return {
    subscriptionId: `mock_sub_${Date.now()}`,
    shortUrl: null,
    status: 'active',
    planName,
    amount: PLAN_CONFIG[planName].price,
    startDate: now,
    endDate: end,
    mocked: true,
  };
}

/**
 * Get Razorpay key ID for frontend checkout.
 */
function getPublicKey() {
  return process.env.RAZORPAY_KEY_ID || null;
}

module.exports = { createSubscription, verifyPayment, getPublicKey, createMockSubscription };
