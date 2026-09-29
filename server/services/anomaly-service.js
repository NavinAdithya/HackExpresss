/**
 * Anomaly Service — Gemini-assisted trip anomaly detection.
 *
 * Uses deterministic checks first, then Gemini for advanced analysis.
 * PRO feature for advanced anomaly detection.
 */

const geminiService = require('./gemini-service');

/**
 * Basic deterministic anomaly checks.
 * PURE FUNCTION.
 */
function checkBasicAnomalies(trip, locationHistory) {
  const anomalies = [];

  if (!locationHistory || locationHistory.length === 0) {
    return anomalies;
  }

  // Check for unusual speed (> 120 km/h)
  for (let i = 1; i < locationHistory.length; i++) {
    const prev = locationHistory[i - 1];
    const curr = locationHistory[i];
    const timeDiff = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000; // seconds
    if (timeDiff <= 0) continue;

    const { haversineDistance } = require('./route-service');
    const dist = haversineDistance([prev.lng, prev.lat], [curr.lng, curr.lat]);
    const speedKmH = (dist / timeDiff) * 3.6;

    if (speedKmH > 120) {
      anomalies.push(`Unusual speed detected: ${Math.round(speedKmH)} km/h`);
    }
  }

  // Check for route deviation (simplified)
  // In production: compare live location against planned route corridor

  return anomalies;
}

/**
 * Full anomaly detection with Gemini assist (PRO feature).
 */
async function detectTripAnomalies(trip, locationHistory, userPlan) {
  const basicAnomalies = checkBasicAnomalies(trip, locationHistory);

  if (userPlan === 'PRO') {
    try {
      const aiResult = await geminiService.detectAnomalies({
        trip: {
          origin: trip.origin?.address,
          destination: trip.destination?.address,
          departureTime: trip.departureTime,
          status: trip.status,
        },
        locationCount: locationHistory?.length || 0,
        basicAnomalies,
      });

      return {
        anomalies: [...basicAnomalies, ...(aiResult.anomalies || [])],
        riskLevel: aiResult.riskLevel || 'low',
        aiAssisted: true,
      };
    } catch (err) {
      // Fallback to basic anomalies
    }
  }

  return {
    anomalies: basicAnomalies,
    riskLevel: basicAnomalies.length > 0 ? 'medium' : 'low',
    aiAssisted: false,
  };
}

module.exports = { checkBasicAnomalies, detectTripAnomalies };
