/**
 * Trusted Contacts & Tracking Routes
 *
 * PUT  /api/contacts                    → Update trusted contacts
 * GET  /api/contacts                    → Get trusted contacts
 * POST /api/contacts/share/:tripId      → Generate share link
 * GET  /api/tracking/:token             → Public tracking (no auth)
 */

const express = require('express');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { auth, optionalAuth } = require('../middleware/auth');
const { getRedis } = require('../config/redis');

const router = express.Router();

/**
 * PUT /api/contacts — Update trusted contacts
 */
router.put('/', auth, async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts must be an array.' });
    }

    // Validate contacts
    for (const c of contacts) {
      if (!c.name || !c.phone) {
        return res.status(400).json({ error: 'Each contact needs name and phone.' });
      }
    }

    req.user.trustedContacts = contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      circle: c.circle || 'General',
    }));

    await req.user.save();

    res.json({ contacts: req.user.trustedContacts });
  } catch (err) {
    console.error('[CONTACTS] update error:', err);
    res.status(500).json({ error: 'Failed to update contacts.' });
  }
});

/**
 * GET /api/contacts — Get trusted contacts
 */
router.get('/', auth, async (req, res) => {
  res.json({ contacts: req.user.trustedContacts || [] });
});

/**
 * POST /api/contacts/share/:tripId — Share trip with contacts
 */
router.post('/share/:tripId', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (!trip.sharedTrackingToken) {
      const { v4: uuidv4 } = require('uuid');
      trip.sharedTrackingToken = uuidv4();
      await trip.save();
    }

    const trackingUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/track/${trip.sharedTrackingToken}`;

    // MOCKED FOR DEMO:
    // Production would send SMS/push to trusted contacts
    const user = await User.findById(req.userId);
    console.log(`\n📍 Trip shared by ${user.name}:`);
    console.log(`   Tracking URL: ${trackingUrl}`);
    if (user.trustedContacts?.length > 0) {
      console.log(`   [MOCKED] SMS sent to:`);
      user.trustedContacts.forEach((c) => {
        console.log(`     → ${c.name} (${c.phone})`);
      });
    }

    res.json({
      trackingToken: trip.sharedTrackingToken,
      trackingUrl,
      message: 'Trip shared with trusted contacts.',
    });
  } catch (err) {
    console.error('[CONTACTS] share error:', err);
    res.status(500).json({ error: 'Failed to share trip.' });
  }
});

/**
 * GET /api/tracking/:token — Public trip tracking (no auth required)
 */
router.get('/tracking/:token', async (req, res) => {
  try {
    const trip = await Trip.findOne({ sharedTrackingToken: req.params.token })
      .populate('userId', 'name profilePhoto')
      .populate('matchedUserId', 'name profilePhoto');

    if (!trip) {
      return res.status(404).json({ error: 'Tracking link not found or expired.' });
    }

    // Get latest location from Redis
    const redis = getRedis();
    let location = null;
    try {
      const locStr = await redis.get(`location:${trip._id}:${trip.userId}`);
      if (locStr) location = JSON.parse(locStr);
    } catch (e) {
      // Location not available
    }

    res.json({
      trip: {
        status: trip.status,
        origin: trip.origin,
        destination: trip.destination,
        route: trip.route,
        departureTime: trip.departureTime,
        user: trip.userId,
        matchedUser: trip.matchedUserId,
      },
      location,
    });
  } catch (err) {
    console.error('[TRACKING] get error:', err);
    res.status(500).json({ error: 'Tracking failed.' });
  }
});

module.exports = router;
