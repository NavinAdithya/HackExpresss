/**
 * Analytics Routes — tiered by plan
 *
 * GET /api/analytics/basic     → FREE tier analytics
 * GET /api/analytics/commute   → VERIFIED tier analytics
 * GET /api/analytics/advanced  → PRO tier analytics
 */

const express = require('express');
const Trip = require('../models/Trip');
const Rating = require('../models/Rating');
const { auth } = require('../middleware/auth');
const { featureGate } = require('../middleware/featureGate');

const router = express.Router();

/**
 * GET /api/analytics/basic — FREE tier: basic trips, savings, impact
 */
router.get('/basic', auth, async (req, res) => {
  try {
    const trips = await Trip.find({
      userId: req.userId,
      status: 'COMPLETED',
    });

    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, t) => sum + (t.routeDistance || 0), 0);
    const totalSaved = trips.reduce((sum, t) => sum + (t.fare || 0), 0);

    // Rough CO2 calculation (avg car emits 120g/km, shared ride reduces by ~50%)
    const co2SavedKg = (totalDistance / 1000) * 0.06; // 60g/km saved through sharing

    res.json({
      totalTrips,
      totalDistanceKm: Math.round(totalDistance / 1000),
      totalSaved: Math.round(totalSaved),
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
      treesEquivalent: Math.round(co2SavedKg / 21), // ~21kg CO2 per tree per year
    });
  } catch (err) {
    res.status(500).json({ error: 'Analytics failed.' });
  }
});

/**
 * GET /api/analytics/commute — VERIFIED tier: patterns, trends
 */
router.get('/commute', auth, featureGate('advanced_commute_analytics'), async (req, res) => {
  try {
    const trips = await Trip.find({
      userId: req.userId,
      status: 'COMPLETED',
    }).sort({ createdAt: -1 }).limit(100);

    // Day of week distribution
    const dayDistribution = {};
    const hourDistribution = {};

    trips.forEach((t) => {
      const day = new Date(t.departureTime).toLocaleDateString('en', { weekday: 'short' });
      const hour = new Date(t.departureTime).getHours();
      dayDistribution[day] = (dayDistribution[day] || 0) + 1;
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });

    // Monthly trend
    const monthlyTrips = {};
    trips.forEach((t) => {
      const month = new Date(t.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'short' });
      monthlyTrips[month] = (monthlyTrips[month] || 0) + 1;
    });

    // Consistency score (trips per active week)
    const weeks = new Set(trips.map((t) => {
      const d = new Date(t.createdAt);
      return `${d.getFullYear()}-W${Math.ceil((d.getDate()) / 7)}`;
    }));
    const consistency = weeks.size > 0 ? Math.round(trips.length / weeks.size * 10) / 10 : 0;

    res.json({
      dayDistribution,
      hourDistribution,
      monthlyTrips,
      consistency,
      totalTrips: trips.length,
      mostActiveDay: Object.entries(dayDistribution).sort((a, b) => b[1] - a[1])[0]?.[0],
      peakHour: Object.entries(hourDistribution).sort((a, b) => b[1] - a[1])[0]?.[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Commute analytics failed.' });
  }
});

/**
 * GET /api/analytics/advanced — PRO tier: pool efficiency, demand
 */
router.get('/advanced', auth, featureGate('advanced_impact_analytics'), async (req, res) => {
  try {
    const trips = await Trip.find({
      userId: req.userId,
      status: 'COMPLETED',
    }).sort({ createdAt: -1 }).limit(200);

    // Pool efficiency: average occupancy
    const avgOccupancy = trips.length > 0
      ? trips.reduce((sum, t) => sum + (t.seatCount || 2), 0) / trips.length
      : 0;

    // Cost optimization
    const totalFare = trips.reduce((sum, t) => sum + (t.fare || 0), 0);
    const soloEstimate = trips.reduce((sum, t) => sum + ((t.routeDistance || 0) / 1000 * 8), 0);
    const savingsPercent = soloEstimate > 0 ? Math.round((1 - totalFare / soloEstimate) * 100) : 0;

    // Route frequency (top routes)
    const routeFreq = {};
    trips.forEach((t) => {
      const key = `${t.origin?.address || 'Unknown'} → ${t.destination?.address || 'Unknown'}`;
      routeFreq[key] = (routeFreq[key] || 0) + 1;
    });
    const topRoutes = Object.entries(routeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));

    res.json({
      avgOccupancy: Math.round(avgOccupancy * 10) / 10,
      totalFare: Math.round(totalFare),
      soloEstimate: Math.round(soloEstimate),
      savingsPercent,
      topRoutes,
      poolEfficiency: Math.round(avgOccupancy / 4 * 100), // % of max capacity
    });
  } catch (err) {
    res.status(500).json({ error: 'Advanced analytics failed.' });
  }
});

module.exports = router;
