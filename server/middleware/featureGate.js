const { requireFeature } = require('../config/plan');

/**
 * Feature gate middleware — checks if user's plan includes the required feature.
 * Backend is authoritative for entitlements.
 */
function featureGate(feature) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      requireFeature(req.user.plan, feature);
      next();
    } catch (err) {
      return res.status(403).json({
        error: err.message,
        requiredPlan: err.requiredPlan,
        feature,
      });
    }
  };
}

module.exports = { featureGate };
