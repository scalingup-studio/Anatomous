/**
 * Subscription plan utilities
 * Handles plan tier checking and feature gating
 */

export const PLAN_TIERS = {
  STARTER: 'starter',
  CORE: 'core',
  COMPLETE: 'complete',
  FAMILY: 'family'
};

export const PLAN_ORDER = {
  [PLAN_TIERS.STARTER]: 0,
  [PLAN_TIERS.CORE]: 1,
  [PLAN_TIERS.COMPLETE]: 2,
  [PLAN_TIERS.FAMILY]: 3
};

/**
 * Get user's current plan tier (defaults to 'starter' if not set)
 */
export const getUserPlan = (user) => {
  if (!user) return PLAN_TIERS.STARTER;
  // Normalize possible fields from different auth / user responses
  return (
    user.subscription_tier ||       // explicit tier
    user.subscription_plan ||       // field from auth OpenAPI (core/family/complete/starter)
    user.plan_tier ||               // sometimes plan_tier
    user.plan_name ||               // or plan_name
    user.plan ||                    // generic plan
    user.tier ||                    // generic tier
    PLAN_TIERS.STARTER
  );
};

/**
 * Check if user's plan has access to a feature
 */
export const hasFeatureAccess = (user, feature) => {
  const plan = getUserPlan(user);
  
  const featureAccess = {
    // Manual Health Data Entry - all plans
    manualHealthDataEntry: true,
    
    // AI Messages per Month
    aiMessages: {
      [PLAN_TIERS.STARTER]: { limit: 10 },
      [PLAN_TIERS.CORE]: { limit: 50 },
      [PLAN_TIERS.COMPLETE]: { limit: Infinity },
      [PLAN_TIERS.FAMILY]: { limit: Infinity }
    },
    
    // AI-Driven Risk Forecasts
    aiRiskForecasts: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: true,
      [PLAN_TIERS.COMPLETE]: true,
      [PLAN_TIERS.FAMILY]: true
    },
    
    // Early Alerts
    earlyAlerts: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: false,
      [PLAN_TIERS.COMPLETE]: true,
      [PLAN_TIERS.FAMILY]: true
    },
    
    // Reports (PDF Export)
    reportsPdf: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: true,
      [PLAN_TIERS.COMPLETE]: true,
      [PLAN_TIERS.FAMILY]: true
    },
    
    // CSV Data Export
    csvExport: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: false,
      [PLAN_TIERS.COMPLETE]: true,
      [PLAN_TIERS.FAMILY]: true
    },
    
    // Document & Lab Uploads
    documentUploads: {
      [PLAN_TIERS.STARTER]: { limit: 0 },
      [PLAN_TIERS.CORE]: { limit: 3 },
      [PLAN_TIERS.COMPLETE]: { limit: Infinity },
      [PLAN_TIERS.FAMILY]: { limit: Infinity }
    },
    
    // Custom Goals
    customGoals: {
      [PLAN_TIERS.STARTER]: { limit: 0 },
      [PLAN_TIERS.CORE]: { limit: 10 },
      [PLAN_TIERS.COMPLETE]: { limit: Infinity },
      [PLAN_TIERS.FAMILY]: { limit: Infinity }
    },
    
    // Goal History
    goalHistory: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: { days: 90 },
      [PLAN_TIERS.COMPLETE]: { days: Infinity },
      [PLAN_TIERS.FAMILY]: { days: Infinity }
    },
    
    // Notes
    notes: {
      [PLAN_TIERS.STARTER]: { limit: 3 },
      [PLAN_TIERS.CORE]: { limit: 30 },
      [PLAN_TIERS.COMPLETE]: { limit: Infinity },
      [PLAN_TIERS.FAMILY]: { limit: Infinity }
    },
    
    // Chat History Access
    chatHistory: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: { days: 30 },
      [PLAN_TIERS.COMPLETE]: { days: Infinity },
      [PLAN_TIERS.FAMILY]: { days: Infinity }
    },
    
    // Share with Providers
    shareWithProviders: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: false,
      [PLAN_TIERS.COMPLETE]: true,
      [PLAN_TIERS.FAMILY]: true
    },
    
    // Family Sharing
    familySharing: {
      [PLAN_TIERS.STARTER]: false,
      [PLAN_TIERS.CORE]: false,
      [PLAN_TIERS.COMPLETE]: false,
      [PLAN_TIERS.FAMILY]: { users: 1 }
    },
    
    // Secure Data Backup - all plans
    secureDataBackup: true
  };
  
  const featureConfig = featureAccess[feature];
  if (featureConfig === undefined) return false;
  if (featureConfig === true) return true;
  if (typeof featureConfig === 'object') {
    return featureConfig[plan] !== undefined && featureConfig[plan] !== false;
  }
  return false;
};

/**
 * Get the minimum plan tier required for a feature
 */
export const getRequiredPlan = (feature) => {
  const featureRequirements = {
    aiRiskForecasts: PLAN_TIERS.CORE,
    earlyAlerts: PLAN_TIERS.COMPLETE,
    reportsPdf: PLAN_TIERS.CORE,
    csvExport: PLAN_TIERS.COMPLETE,
    shareWithProviders: PLAN_TIERS.COMPLETE,
    familySharing: PLAN_TIERS.FAMILY
  };
  
  return featureRequirements[feature] || PLAN_TIERS.STARTER;
};

/**
 * Get the next highest tier that has access to a feature
 */
export const getNextTierForFeature = (feature) => {
  const requiredPlan = getRequiredPlan(feature);
  const currentOrder = PLAN_ORDER[requiredPlan];
  
  // Find next tier
  for (const [tier, order] of Object.entries(PLAN_ORDER)) {
    if (order > currentOrder) {
      return tier;
    }
  }
  
  return requiredPlan;
};

/**
 * Get feature limit for current plan
 */
export const getFeatureLimit = (user, feature) => {
  const plan = getUserPlan(user);
  
  const limits = {
    aiMessages: {
      [PLAN_TIERS.STARTER]: 10,
      [PLAN_TIERS.CORE]: 50,
      [PLAN_TIERS.COMPLETE]: Infinity,
      [PLAN_TIERS.FAMILY]: Infinity
    },
    documentUploads: {
      [PLAN_TIERS.STARTER]: 0,
      [PLAN_TIERS.CORE]: 3,
      [PLAN_TIERS.COMPLETE]: Infinity,
      [PLAN_TIERS.FAMILY]: Infinity
    },
    customGoals: {
      [PLAN_TIERS.STARTER]: 0,
      [PLAN_TIERS.CORE]: 10,
      [PLAN_TIERS.COMPLETE]: Infinity,
      [PLAN_TIERS.FAMILY]: Infinity
    },
    notes: {
      [PLAN_TIERS.STARTER]: 3,
      [PLAN_TIERS.CORE]: 30,
      [PLAN_TIERS.COMPLETE]: Infinity,
      [PLAN_TIERS.FAMILY]: Infinity
    }
  };
  
  return limits[feature]?.[plan] ?? 0;
};

