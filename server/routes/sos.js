/**
 * SOS Routes
 *
 * POST /api/sos/activate       → Activate SOS alert
 * GET  /api/sos/trip/:tripId   → Get SOS status for a trip
 * PUT  /api/sos/:id/resolve    → Resolve an SOS alert
 */

const express = require('express');
const SOSAlert = require('../models/SOSAlert');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { computeUserTrustScore } = require('../services/trust-score');

const router = express.Router();

/**
 * POST /api/sos/activate — Activate SOS
 */
router.post('/activate', auth, async (req, res) => {
  try {
    const { tripId, lat, lng } = req.body;

    if (!tripId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Trip ID and location required.' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (trip.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'SOS can only be activated during an active trip.' });
    }

    const alert = await SOSAlert.create({
      tripId,
      userId: req.userId,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });

    // MOCKED FOR DEMO:
    // Production implementation would integrate verified emergency/telecom services.
    const user = await User.findById(req.userId);
    console.log(`\n🚨🚨🚨 SOS ALERT ACTIVATED 🚨🚨🚨`);
    console.log(`User: ${user.name} (${user.phone})`);
    console.log(`Location: ${lat}, ${lng}`);
    console.log(`Trip: ${tripId}`);
    console.log(`Time: ${new Date().toISOString()}`);

    // Mock: notify trusted contacts
    if (user.trustedContacts?.length > 0) {
      console.log(`\n[MOCKED] Notifying trusted contacts:`);
      user.trustedContacts.forEach((c) => {
        console.log(`  → ${c.name}: ${c.phone}`);
        // MOCKED FOR DEMO: Would send SMS/push notification
      });
    }

    // Mock: notify authorities
    console.log(`[MOCKED] Notifying local authorities...`);
    console.log(`🚨🚨🚨 END SOS ALERT LOG 🚨🚨🚨\n`);

    // Recompute authoritative trust score for alert trigger
    await computeUserTrustScore(req.userId);

    res.status(201).json({
      alert,
      message: 'SOS alert activated. Emergency contacts notified.',
    });
  } catch (err) {
    console.error('[SOS] activate error:', err);
    res.status(500).json({ error: 'Failed to activate SOS.' });
  }
});

/**
 * GET /api/sos/trip/:tripId — Get SOS status
 */
router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ tripId: req.params.tripId })
      .sort({ createdAt: -1 });

    res.json({ alerts, active: alerts.some((a) => a.status === 'ACTIVE') });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SOS status.' });
  }
});

/**
 * PUT /api/sos/:id/resolve — Resolve SOS
 */
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await SOSAlert.findByIdAndUpdate(
      req.params.id,
      { status: req.body.falseAlarm ? 'FALSE_ALARM' : 'RESOLVED' },
      { new: true }
    );

    if (alert?.userId) {
      await computeUserTrustScore(alert.userId);
    }

    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve SOS.' });
  }
});

module.exports = router;
