/**
 * Route Service — OSRM integration.
 * Calculates real routes using the public OSRM API.
 * Includes caching via Redis (or in-memory fallback).
 */

const { getRedis } = require('../config/redis');

const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';
const CACHE_TTL = 3600; // 1 hour

/**
 * Calculate route between two points using OSRM.
 * @param {[number, number]} origin - [lng, lat]
 * @param {[number, number]} destination - [lng, lat]
 * @returns {{ geometry, distance, duration }}
 */
async function calculateRoute(origin, destination) {
  const cacheKey = `route:${origin.join(',')}-${destination.join(',')}`;
  const redis = getRedis();

  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Cache miss or error — continue to API
  }

  const url =
    `${OSRM_URL}/route/v1/driving/` +
    `${origin[0]},${origin[1]};${destination[0]},${destination[1]}` +
    `?geometries=geojson&overview=full`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`OSRM returned ${res.status}`);
    }

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found by OSRM');
    }

    const route = data.routes[0];
    const result = {
      geometry: route.geometry, // GeoJSON LineString
      distance: route.distance, // meters
      duration: route.duration, // seconds
    };

    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (e) {
      // Cache write failure is non-fatal
    }

    return result;
  } catch (err) {
    clearTimeout(timeout);
    console.error('[ROUTE] OSRM error:', err.message);
    throw new Error('Route calculation failed. Please try again.');
  }
}

/**
 * Calculate route overlap between two GeoJSON LineString routes.
 * Uses point-sampling approach: sample points along routeA,
 * measure how many fall within a buffer distance of routeB.
 *
 * PURE FUNCTION — no side effects.
 *
 * @param {number[][]} coordsA - [[lng,lat], ...] from route A
 * @param {number[][]} coordsB - [[lng,lat], ...] from route B
 * @param {number} bufferMeters - corridor buffer in meters
 * @returns {number} overlap percentage (0–100)
 */
function calculateRouteOverlap(coordsA, coordsB, bufferMeters = 500) {
  if (!coordsA?.length || !coordsB?.length) return 0;

  // Sample points along route A (every ~200m equivalent, or every nth coordinate)
  const sampleStep = Math.max(1, Math.floor(coordsA.length / 50));
  const samples = [];
  for (let i = 0; i < coordsA.length; i += sampleStep) {
    samples.push(coordsA[i]);
  }
  if (samples.length === 0) return 0;

  let withinBuffer = 0;

  for (const point of samples) {
    // Check if point is within bufferMeters of any segment in routeB
    let minDist = Infinity;
    for (let j = 0; j < coordsB.length - 1; j++) {
      const dist = pointToSegmentDistance(point, coordsB[j], coordsB[j + 1]);
      if (dist < minDist) minDist = dist;
      if (minDist <= bufferMeters) break; // Early exit
    }
    if (minDist <= bufferMeters) withinBuffer++;
  }

  return Math.round((withinBuffer / samples.length) * 100);
}

/**
 * Haversine distance between two [lng, lat] points in meters.
 * PURE FUNCTION.
 */
function haversineDistance(a, b) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Minimum distance from a point to a line segment (in meters).
 * All inputs are [lng, lat].
 * PURE FUNCTION.
 */
function pointToSegmentDistance(point, segA, segB) {
  const d1 = haversineDistance(point, segA);
  const d2 = haversineDistance(point, segB);
  const segLen = haversineDistance(segA, segB);

  if (segLen === 0) return d1;

  // Project point onto segment (approximate for short segments)
  const t = Math.max(0, Math.min(1, dotProduct(point, segA, segB) / (segLen * segLen)));

  const projLng = segA[0] + t * (segB[0] - segA[0]);
  const projLat = segA[1] + t * (segB[1] - segA[1]);

  return haversineDistance(point, [projLng, projLat]);
}

/**
 * Dot product helper for projection.
 */
function dotProduct(point, segA, segB) {
  // Convert to approximate meters for dot product
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad((segA[1] + segB[1]) / 2));

  const px = (point[0] - segA[0]) * cosLat;
  const py = point[1] - segA[1];
  const sx = (segB[0] - segA[0]) * cosLat;
  const sy = segB[1] - segA[1];

  return (px * sx + py * sy) * R * R * (Math.PI / 180) * (Math.PI / 180);
}

module.exports = {
  calculateRoute,
  calculateRouteOverlap,
  haversineDistance,
  pointToSegmentDistance,
};
