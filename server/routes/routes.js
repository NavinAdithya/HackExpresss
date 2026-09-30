/**
 * Routes API — PO → PO Dijkstra Routing & Navigation Endpoints
 */

const express = require('express');
const router = express.Router();
const { calculateDijkstraRoute, NETWORK_NODES } = require('../services/dijkstra-routing');
const { calculateRoute } = require('../services/route-service');

/**
 * GET /api/routes/nodes
 * Returns all available road network nodes and their locations
 */
router.get('/nodes', (req, res) => {
  res.json({
    success: true,
    nodes: Object.values(NETWORK_NODES),
  });
});

/**
 * GET /api/routes/dijkstra
 * Query params: ?origin=80.1804,13.0324&destination=80.2476,12.9895
 */
router.get('/dijkstra', (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters. Usage: ?origin=lng,lat&destination=lng,lat',
      });
    }

    const originCoords = origin.split(',').map((v) => parseFloat(v.trim()));
    const destCoords = destination.split(',').map((v) => parseFloat(v.trim()));

    if (
      originCoords.length !== 2 ||
      destCoords.length !== 2 ||
      originCoords.some(isNaN) ||
      destCoords.some(isNaN)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Must be numeric [lng, lat].',
      });
    }

    const route = calculateDijkstraRoute(originCoords, destCoords);

    res.json({
      success: true,
      algorithm: 'dijkstra',
      route,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/routes/dijkstra
 * Body: { origin: [lng, lat], destination: [lng, lat] }
 */
router.post('/dijkstra', (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination || !Array.isArray(origin) || !Array.isArray(destination)) {
      return res.status(400).json({
        success: false,
        error: 'Body must contain origin: [lng, lat] and destination: [lng, lat]',
      });
    }

    const route = calculateDijkstraRoute(origin, destination);

    res.json({
      success: true,
      algorithm: 'dijkstra',
      route,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/routes/calculate
 * General route endpoint supporting OSRM with seamless Dijkstra fallback
 */
router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination, algorithm } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Body must contain origin: [lng, lat] and destination: [lng, lat]',
      });
    }

    const route = await calculateRoute(origin, destination, { algorithm });

    res.json({
      success: true,
      route,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
