/**
 * Plan configuration — features and entitlements.
 * Backend is authoritative for feature access.
 */

const PLAN_CONFIG = {
  FREE: {
    price: 0,
    interval: null,
    label: 'FREE',
    tagline: 'Move together.',
    description: 'Core community mobility.',
    icon: null,
    cta: 'GET STARTED',
    features: [
      'community_matching',
      'ai_route_matching',
      'women_only_pools',
      'sos_safety',
      'live_trip_safety',
      'basic_impact_tracking',
      'trusted_contacts',
    ],
    featureLabels: {
      community_matching: 'Verified community',
      ai_route_matching: 'AI route matching',
      women_only_pools: 'Women-only pools',
      sos_safety: 'SOS & live trip safety',
      live_trip_safety: 'Live location sharing',
      basic_impact_tracking: 'Basic impact tracking',
      trusted_contacts: 'Trusted contacts',
    },
  },
  VERIFIED: {
    price: 49,
    interval: 'month',
    label: '🛡️ VERIFIED',
    tagline: 'Move with trust.',
    description: 'Identity, trust and recurring mobility.',
    icon: '🛡️',
    cta: 'BECOME VERIFIED',
    features: [
      // All FREE features
      'community_matching',
      'ai_route_matching',
      'women_only_pools',
      'sos_safety',
      'live_trip_safety',
      'basic_impact_tracking',
      'trusted_contacts',
      // VERIFIED additions
      'enhanced_verification',
      'trust_score',
      'recurring_commute',
      'trusted_circles',
      'advanced_commute_analytics',
    ],
    featureLabels: {
      enhanced_verification: 'Enhanced identity verification',
      trust_score: 'Trust Score',
      recurring_commute: 'Recurring commute',
      trusted_circles: 'Trusted circles',
      advanced_commute_analytics: 'Advanced commute analytics',
    },
  },
  PRO: {
    price: 99,
    interval: 'month',
    label: '⚡ PRO',
    tagline: 'Move intelligently.',
    description: 'Advanced optimization, prediction and priority intelligence.',
    icon: '⚡',
    cta: 'GO PRO',
    features: [
      // All VERIFIED features
      'community_matching',
      'ai_route_matching',
      'women_only_pools',
      'sos_safety',
      'live_trip_safety',
      'basic_impact_tracking',
      'trusted_contacts',
      'enhanced_verification',
      'trust_score',
      'recurring_commute',
      'trusted_circles',
      'advanced_commute_analytics',
      // PRO additions
      'ai_pool_rebalance',
      'predictive_demand',
      'smart_pool_lock',
      'priority_matching',
      'advanced_impact_analytics',
      'priority_support',
    ],
    featureLabels: {
      ai_pool_rebalance: 'AI Pool Rebalance',
      predictive_demand: 'Predictive demand',
      smart_pool_lock: 'Smart Pool Lock',
      priority_matching: 'Priority matching',
      advanced_impact_analytics: 'Advanced impact analytics',
      priority_support: 'Priority support',
    },
  },
};

/**
 * Check if a plan has a specific feature.
 */
function hasFeature(plan, feature) {
  return PLAN_CONFIG[plan]?.features.includes(feature) ?? false;
}

/**
 * Get the minimum plan required for a feature.
 */
function getMinPlanForFeature(feature) {
  if (PLAN_CONFIG.FREE.features.includes(feature)) return 'FREE';
  if (PLAN_CONFIG.VERIFIED.features.includes(feature)) return 'VERIFIED';
  if (PLAN_CONFIG.PRO.features.includes(feature)) return 'PRO';
  return null;
}

/**
 * Throw error if plan lacks feature.
 */
function requireFeature(plan, feature) {
  if (!hasFeature(plan, feature)) {
    const minPlan = getMinPlanForFeature(feature);
    const err = new Error(`This feature requires the ${minPlan} plan.`);
    err.statusCode = 403;
    err.requiredPlan = minPlan;
    throw err;
  }
}

module.exports = { PLAN_CONFIG, hasFeature, getMinPlanForFeature, requireFeature };
