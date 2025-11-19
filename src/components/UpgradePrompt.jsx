import React from "react";
import { Modal } from "./Modal.jsx";
import { getNextTierForFeature, PLAN_TIERS, getUserPlan, getRequiredPlan, PLAN_ORDER } from "../utils/subscriptionUtils.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext.jsx";
import { SubscriptionApi } from "../api/subscriptionApi.js";

/**
 * Upgrade prompt component for gated features
 * Displays when user tries to access a feature not available in their plan
 */
export function UpgradePrompt({ open, onClose, feature, user: userProp }) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  
  // Завантажуємо поточну підписку для визначення плану
  const [currentPlan, setCurrentPlan] = React.useState(null);
  const [loadingPlan, setLoadingPlan] = React.useState(false);

  React.useEffect(() => {
    if (open && feature) {
      const loadCurrentPlan = async () => {
        try {
          setLoadingPlan(true);
          const data = await SubscriptionApi.getMySubscription();
          
          // Нова структура API: { result: { subscription: {...}, usage: {...}, plan_features: {...} } }
          const subscription = data?.result?.subscription ||
                              data?.result ||
                              data?.subscription ||
                              data;
          
          // Визначаємо поточний план
          const planName = subscription?.plan_name?.toLowerCase() ||
                          subscription?.plan_tier?.toLowerCase() ||
                          subscription?.subscription_details?.plan_name?.toLowerCase() ||
                          'starter';
          setCurrentPlan(planName);
        } catch (error) {
          console.error('Failed to load current plan:', error);
          // Fallback до плану з user об'єкта
          const userPlan = getUserPlan(user);
          setCurrentPlan(userPlan);
        } finally {
          setLoadingPlan(false);
        }
      };
      
      loadCurrentPlan();
    }
  }, [open, feature, user]);

  // Визначаємо поточний план користувача
  const userCurrentPlan = React.useMemo(() => {
    if (currentPlan) return currentPlan;
    return getUserPlan(user) || PLAN_TIERS.STARTER;
  }, [currentPlan, user]);

  // Визначаємо план, який потрібен для feature
  const getRequiredPlanForFeature = (featureKey) => {
    const requiredPlan = getRequiredPlan(featureKey);
    return requiredPlan;
  };

  // Визначаємо наступний план для upgrade (враховуючи поточний план)
  const getNextUpgradePlan = (featureKey, currentPlanTier) => {
    const requiredPlan = getRequiredPlanForFeature(featureKey);
    const currentOrder = PLAN_ORDER[currentPlanTier] || 0;
    const requiredOrder = PLAN_ORDER[requiredPlan] || 0;
    
    // Якщо поточний план вже має доступ - повертаємо requiredPlan
    if (currentOrder >= requiredOrder) {
      return requiredPlan;
    }
    
    // Інакше повертаємо мінімальний план, який має доступ
    return requiredPlan;
  };

  // Отримуємо назву плану для відображення
  const getPlanDisplayName = (planTier) => {
    const names = {
      [PLAN_TIERS.STARTER]: 'Free',
      [PLAN_TIERS.CORE]: 'Core',
      [PLAN_TIERS.COMPLETE]: 'Complete',
      [PLAN_TIERS.FAMILY]: 'Family'
    };
    return names[planTier] || planTier;
  };

  const featureConfig = {
    aiRiskForecasts: {
      name: "AI Risk Forecasts",
      getDescription: (currentPlan) => {
        if (currentPlan === PLAN_TIERS.STARTER) {
          return "AI Risk Forecasts are not available on the Free plan.";
        }
        return "AI Risk Forecasts are not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('aiRiskForecasts', currentPlan),
      benefits: [
        "Intelligent health forecasting based on your data",
        "50 AI messages per month",
        "PDF report exports",
        "Up to 10 custom goals"
      ]
    },
    earlyAlerts: {
      name: "Early Alerts",
      getDescription: (currentPlan) => {
        if (currentPlan === PLAN_TIERS.STARTER || currentPlan === PLAN_TIERS.CORE) {
          return "Early Alerts are available only on the Complete and Family plans.";
        }
        return "Early Alerts are not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('earlyAlerts', currentPlan),
      benefits: [
        "Proactive health warnings based on trend analysis",
        "Unlimited AI messages",
        "CSV data export",
        "Unlimited document uploads",
        "Share reports with providers"
      ]
    },
    reportsPdf: {
      name: "PDF Reports",
      getDescription: (currentPlan) => {
        if (currentPlan === PLAN_TIERS.STARTER) {
          return "PDF Reports are not available on the Free plan.";
        }
        return "PDF Reports are not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('reportsPdf', currentPlan),
      benefits: [
        "Generate exportable reports of your health insights",
        "50 AI messages per month",
        "AI-driven risk forecasts",
        "Up to 10 custom goals"
      ]
    },
    csvExport: {
      name: "CSV Data Export",
      getDescription: (currentPlan) => {
        return "CSV Data Export is not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('csvExport', currentPlan),
      benefits: [
        "Export your health data in CSV format",
        "Unlimited AI messages",
        "Early alerts",
        "Unlimited document uploads"
      ]
    },
    shareWithProviders: {
      name: "Share with Providers",
      getDescription: (currentPlan) => {
        return "Share with Providers is not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('shareWithProviders', currentPlan),
      benefits: [
        "Share your health reports with healthcare providers",
        "Unlimited AI messages",
        "Early alerts",
        "CSV data export"
      ]
    },
    familySharing: {
      name: "Family Sharing",
      getDescription: (currentPlan) => {
        return "Family Sharing is only available on the Family Plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('familySharing', currentPlan),
      benefits: [
        "Manage up to 2 users under one shared health dashboard",
        "All Complete plan features",
        "Shared family health insights"
      ]
    },
    customGoals: {
      name: "Custom Goals",
      getDescription: (currentPlan) => {
        return "Custom Goals are not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('customGoals', currentPlan),
      benefits: [
        "Create and track custom health goals",
        "50 AI messages per month",
        "90-day goal history",
        "PDF report exports"
      ]
    },
    goalHistory: {
      name: "Goal History",
      getDescription: (currentPlan) => {
        return "Goal History is not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('goalHistory', currentPlan),
      benefits: [
        "Access to 90-day goal history",
        "Up to 10 custom goals",
        "50 AI messages per month"
      ]
    },
    notes: {
      name: "Notes",
      getDescription: (currentPlan) => {
        return "You've reached the limit for Notes on your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('notes', currentPlan),
      benefits: [
        "Up to 30 notes",
        "50 AI messages per month",
        "Custom goals support"
      ]
    },
    documentUploads: {
      name: "Document & Lab Uploads",
      getDescription: (currentPlan) => {
        return "You've reached the upload limit for your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('documentUploads', currentPlan),
      benefits: [
        "3 document uploads per month",
        "50 AI messages per month",
        "PDF report exports"
      ]
    },
    chatHistory: {
      name: "Chat History",
      getDescription: (currentPlan) => {
        if (currentPlan === PLAN_TIERS.STARTER) {
          return "Chat History is not available on the Free plan.";
        }
        return "Chat History is not included in your current plan.";
      },
      getNextTier: (currentPlan) => getNextUpgradePlan('chatHistory', currentPlan),
      benefits: [
        "30-day chat history access",
        "50 AI messages per month",
        "AI-driven risk forecasts"
      ]
    }
  };
  
  const featureData = featureConfig[feature];
  const nextTier = featureData ? featureData.getNextTier(userCurrentPlan) : getNextUpgradePlan(feature, userCurrentPlan);
  const nextTierName = getPlanDisplayName(nextTier);
  const description = featureData ? featureData.getDescription(userCurrentPlan) : `This feature isn't included in your current plan.`;
  const featureName = featureData ? featureData.name : feature;
  const benefits = featureData ? featureData.benefits : [];
  
  const config = {
    name: featureName,
    description: description,
    nextTier: nextTier,
    nextTierName: nextTierName,
    benefits: benefits
  };
  
  const handleUpgrade = () => {
    // Track upgrade prompt click
    console.log('📊 Upgrade prompt clicked:', {
      feature: feature,
      nextTier: config.nextTierName,
      timestamp: new Date().toISOString()
    });
    
    // Analytics tracking (if available)
    if (window.gtag) {
      window.gtag('event', 'upgrade_prompt_click', {
        'event_category': 'subscription',
        'event_label': feature,
        'feature_name': config.name,
        'next_tier': config.nextTierName,
        'value': 1
      });
    }
    
    // Store in localStorage for analytics
    try {
      const upgradeClicks = JSON.parse(localStorage.getItem('upgrade_prompt_clicks') || '[]');
      upgradeClicks.push({
        feature: feature,
        featureName: config.name,
        nextTier: config.nextTierName,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('upgrade_prompt_clicks', JSON.stringify(upgradeClicks.slice(-50))); // Keep last 50
    } catch (e) {
      console.warn('Failed to track upgrade click:', e);
    }
    
    onClose();
    navigate('/dashboard/subscriptions?tab=upgrade');
  };
  
  // Track when modal opens
  React.useEffect(() => {
    if (open && feature) {
      console.log('📊 Upgrade prompt opened:', {
        feature: feature,
        featureName: config.name,
        nextTier: config.nextTierName,
        timestamp: new Date().toISOString()
      });
      
      // Analytics tracking (if available)
      if (window.gtag) {
        window.gtag('event', 'upgrade_prompt_view', {
          'event_category': 'subscription',
          'event_label': feature,
          'feature_name': config.name,
          'next_tier': config.nextTierName
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feature]);

  if (!open || !feature) {
    return null;
  }

  return (
    <Modal open={open} title="Upgrade Required" onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <p style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.6 }}>
            🚫 {config.description}
          </p>
          <p style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
            Upgrade to <strong>{config.nextTierName}</strong> to unlock {config.name} and more tools to support your health journey.
          </p>
        </div>
        
        {/* Why Upgrade? Section */}
        {config.benefits.length > 0 && (
          <div style={{ 
            padding: 16, 
            background: "rgba(0, 186, 206, 0.1)", 
            borderRadius: 8,
            border: "1px solid rgba(0, 186, 206, 0.2)"
          }}>
            <div style={{ 
              fontWeight: 600, 
              marginBottom: 12, 
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>💡</span>
              <span>Why Upgrade?</span>
            </div>
            <div style={{ 
              fontWeight: 600, 
              marginBottom: 8, 
              fontSize: 13,
              color: 'var(--muted)'
            }}>
              With {config.nextTierName}, you'll get:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
              {config.benefits.slice(0, 3).map((benefit, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>
                  <span style={{ color: 'var(--success)', marginRight: 6 }}>✓</span>
                  {benefit}
                </li>
              ))}
              {config.benefits.length > 3 && (
                <li style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  +{config.benefits.length - 3} more benefits
                </li>
              )}
            </ul>
          </div>
        )}
        
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button 
            className="btn secondary" 
            onClick={() => {
              // Track "Maybe Later" click
              console.log('📊 Upgrade prompt dismissed:', feature);
              if (window.gtag) {
                window.gtag('event', 'upgrade_prompt_dismissed', {
                  'event_category': 'subscription',
                  'event_label': feature
                });
              }
              onClose();
            }}
          >
            Maybe Later
          </button>
          <button className="btn primary" onClick={handleUpgrade}>
            🔓 Upgrade Now
          </button>
        </div>
      </div>
    </Modal>
  );
}

