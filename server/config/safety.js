/**
 * Safety configuration — centralized safety behaviour.
 * All safety-related constants and flags live here.
 * Do NOT scatter gender/safety logic throughout the codebase.
 */

const SAFETY_CONFIG = {
  // Hard gates — these REMOVE candidates before scoring
  verifiedOnlyIsHardGate: true,
  womenOnlyIsHardGate: true,

  // Feature defaults
  femaleTripSharingDefault: true,
  sosEnabled: true,

  // SOS configuration
  sosHoldDurationMs: 2000, // hold for 2 seconds to activate

  // Face verification
  faceVerificationRequired: true,

  // Trust score
  trustScoreDefault: 50,
  trustScoreMin: 0,
  trustScoreMax: 100,
  ratingImpactOnTrust: 2, // each rating point adjusts trust by ±2
};

module.exports = SAFETY_CONFIG;
