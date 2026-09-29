/**
 * Face Verification Service
 *
 * MOCKED FOR DEMO:
 * Production implementation would use secure liveness detection
 * + facial verification (e.g., AWS Rekognition, Google Vision,
 * or a specialized KYC provider).
 *
 * A trip cannot start (transition to IN_PROGRESS) if either
 * participant fails or skips verification.
 */

/**
 * Verify a user's face from a selfie capture.
 * @param {string} userId - The user ID
 * @param {string} imageData - Base64 encoded image (unused in mock)
 * @returns {{ verified: boolean, confidence: number, timestamp: Date }}
 */
async function verifyFace(userId, imageData) {
  // MOCKED FOR DEMO:
  // Production implementation would use secure
  // liveness detection + facial verification.

  // Simulate processing delay (1–2 seconds)
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

  return {
    verified: true,
    confidence: 0.92 + Math.random() * 0.07, // 0.92 – 0.99
    timestamp: new Date(),
    // In production: would include liveness check result,
    // face match score against stored photo, etc.
  };
}

/**
 * Check if both parties have completed face verification.
 * @param {Object} trip - The trip document
 * @param {Object} matchedTrip - The matched trip document
 * @returns {boolean}
 */
function bothPartiesVerified(trip, matchedTrip) {
  if (!matchedTrip) {
    return trip?.faceVerificationStatus === 'VERIFIED';
  }
  return (
    trip?.faceVerificationStatus === 'VERIFIED' &&
    matchedTrip?.faceVerificationStatus === 'VERIFIED'
  );
}

module.exports = { verifyFace, bothPartiesVerified };
