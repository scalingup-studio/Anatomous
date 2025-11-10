import React from "react";
import { Modal } from "./Modal.jsx";
import { getNextTierForFeature, PLAN_TIERS } from "../utils/subscriptionUtils.js";
import { useNavigate } from "react-router-dom";

/**
 * Upgrade prompt component for gated features
 * Displays when user tries to access a feature not available in their plan
 */
export function UpgradePrompt({ open, onClose, feature, user }) {
  const navigate = useNavigate();
  
  if (!open || !feature) return null;
  
  const featureConfig = {
    aiRiskForecasts: {
      name: "AI Risk Forecasts",
      description: "AI Risk Forecasts are not available on the Free plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "Intelligent health forecasting based on your data",
        "50 AI messages per month",
        "PDF report exports",
        "Up to 10 custom goals"
      ]
    },
    earlyAlerts: {
      name: "Early Alerts",
      description: "Early Alerts are available only on the Complete and Family plans.",
      nextTier: PLAN_TIERS.COMPLETE,
      nextTierName: "Complete",
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
      description: "PDF Reports are not included in your current plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "Generate exportable reports of your health insights",
        "50 AI messages per month",
        "AI-driven risk forecasts",
        "Up to 10 custom goals"
      ]
    },
    csvExport: {
      name: "CSV Data Export",
      description: "CSV Data Export is not included in your current plan.",
      nextTier: PLAN_TIERS.COMPLETE,
      nextTierName: "Complete",
      benefits: [
        "Export your health data in CSV format",
        "Unlimited AI messages",
        "Early alerts",
        "Unlimited document uploads"
      ]
    },
    shareWithProviders: {
      name: "Share with Providers",
      description: "Share with Providers is not included in your current plan.",
      nextTier: PLAN_TIERS.COMPLETE,
      nextTierName: "Complete",
      benefits: [
        "Share your health reports with healthcare providers",
        "Unlimited AI messages",
        "Early alerts",
        "CSV data export"
      ]
    },
    familySharing: {
      name: "Family Sharing",
      description: "Family Sharing is only available on the Family Plan.",
      nextTier: PLAN_TIERS.FAMILY,
      nextTierName: "Family",
      benefits: [
        "Manage up to 2 users under one shared health dashboard",
        "All Complete plan features",
        "Shared family health insights"
      ]
    },
    customGoals: {
      name: "Custom Goals",
      description: "Custom Goals are not included in your current plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "Create and track custom health goals",
        "50 AI messages per month",
        "90-day goal history",
        "PDF report exports"
      ]
    },
    goalHistory: {
      name: "Goal History",
      description: "Goal History is not included in your current plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "Access to 90-day goal history",
        "Up to 10 custom goals",
        "50 AI messages per month"
      ]
    },
    notes: {
      name: "Notes",
      description: "You've reached the limit for Notes on your current plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "Up to 30 notes",
        "50 AI messages per month",
        "Custom goals support"
      ]
    },
    documentUploads: {
      name: "Document & Lab Uploads",
      description: "You've reached the upload limit for your current plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "3 document uploads per month",
        "50 AI messages per month",
        "PDF report exports"
      ]
    },
    chatHistory: {
      name: "Chat History",
      description: "Chat History is not available on the Free plan.",
      nextTier: PLAN_TIERS.CORE,
      nextTierName: "Core",
      benefits: [
        "30-day chat history access",
        "50 AI messages per month",
        "AI-driven risk forecasts"
      ]
    }
  };
  
  const config = featureConfig[feature] || {
    name: feature,
    description: `This feature isn't included in your current plan.`,
    nextTier: getNextTierForFeature(feature),
    nextTierName: "Core",
    benefits: []
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

