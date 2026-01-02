import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import { OnboardingIncompleteModal } from "../../components/OnboardingIncompleteModal";
import { getUserPlan, PLAN_TIERS } from "../../utils/subscriptionUtils.js";
import { SubscriptionApi } from "../../api/subscriptionApi.js";
import { HealthApi } from "../../api/healthApi.js";
import { GoalsApi } from "../../api/goalsApi.js";
import { InsightApi } from "../../api/insightApi.js";
import { TrendsApi } from "../../api/trendsApi.js";
import { ComprehensiveAlertsApi } from "../../api/comprehensiveAlertsApi.js";

export default function DashboardHome(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLight } = useTheme();
  const userData = getUser();
  const userName = userData.firstName;
  const isNewOrIncomplete = userData.onboardingCompleted === false;
  
  const [onboardingModalOpen, setOnboardingModalOpen] = React.useState(false);
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState(null);
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = React.useState({
    riskScore: { label: 'Calculating...', color: '#e7b416', value: 0 },
    latestInsight: "Loading insights...",
    vitals: { hr: null, bp: null, sleep: null },
    suggestedGoal: null,
    areas: [
      { key:'Lifestyle', value: 0, color:'#00bace' },
      { key:'Vitals', value: 0, color:'#4caf50' },
      { key:'Labs', value: 0, color:'#ff9800' },
      { key:'Nutrition', value: 0, color:'#9c27b0' },
      { key:'Sleep', value: 0, color:'#2196f3' },
    ],
    trend: [],
    actions: [],
    activity: [],
    loading: true
  });

  const toggleAction = (id) => {
    setDashboardData(prev => ({
      ...prev,
      actions: prev.actions.map(a => a.id === id ? { ...a, done: !a.done } : a)
    }));
  };

  // Check onboarding status only after login (not on every navigation)
  React.useEffect(() => {
    async function checkOnboardingStatus() {
      if (onboardingChecked) return; // Only check once
      
      // Check if we should show modal (only after login, not on every navigation)
      const shouldShowModal = localStorage.getItem('showOnboardingModalAfterLogin') === 'true';
      
      if (!shouldShowModal) {
        setOnboardingChecked(true);
        return;
      }
      
      try {
        // Get user ID from various sources
        let userId = null;
        
        // Try from useAuth user
        if (user?.id) {
          userId = user.id;
        } else {
          // Try to get user from localStorage
          try {
            const userFromStorage = localStorage.getItem('user');
            if (userFromStorage) {
              const parsedUser = JSON.parse(userFromStorage);
              if (parsedUser?.id) {
                userId = parsedUser.id;
              }
            }
          } catch (e) {
            console.warn('Failed to parse user from localStorage:', e);
          }
        }
        
        if (!userId) {
          setOnboardingChecked(true);
          // Clear flag if no user ID
          try {
            localStorage.removeItem('showOnboardingModalAfterLogin');
          } catch {}
          return;
        }

        await checkOnboarding(userId);
        setOnboardingChecked(true);
      } catch (error) {
        setOnboardingChecked(true);
        // Clear flag on error
        try {
          localStorage.removeItem('showOnboardingModalAfterLogin');
        } catch {}
      }
    }

    async function checkOnboarding(userId) {
      // Import OnboardingApi dynamically
      const { OnboardingApi } = await import('../../api/onboardingApi.js');
      
      const onboardingProgress = await OnboardingApi.getProgress(userId);
      const progress = onboardingProgress?.save_onboarding;
      
      // Check if onboarding is incomplete (progress < 100% or not completed)
      const isIncomplete = !progress?.completed && 
        (!progress?.progress?.percentage || progress.progress.percentage < 100);
      
      if (isIncomplete) {
        setOnboardingModalOpen(true);
      } else {
        // Clear flag if onboarding is complete
        try {
          localStorage.removeItem('showOnboardingModalAfterLogin');
        } catch {}
      }
    }

    checkOnboardingStatus();
  }, [user, onboardingChecked]);

  function handleOnboardingContinue(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Close modal immediately
    setOnboardingModalOpen(false);
    
    // Clear flag so modal won't show again on navigation
    try {
      localStorage.removeItem('showOnboardingModalAfterLogin');
    } catch {}
    
    // Use force=true parameter to bypass OnboardingGuard check
    // This allows access to onboarding even if hasCompletedOnboarding() returns true
    
    // Navigate with force parameter to bypass guard
    navigate("/onboarding?force=true", { replace: true });
    
    // SECURITY: Commented to prevent navigation information leakage
    // console.log('✅ Navigation triggered to /onboarding?force=true');
  }

  function handleOnboardingSkip() {
    setOnboardingModalOpen(false);
    // Clear flag so modal won't show again on navigation
    try {
      localStorage.removeItem('showOnboardingModalAfterLogin');
    } catch {}
  }

  const tips = [
    'Stay consistent: meaningful trends appear within 30 days.',
    'Add your latest lab report to improve recommendations.',
    'Small wins compound: a 10-minute walk still counts.',
  ];

  // Load subscription data to get current plan
  React.useEffect(() => {
    async function loadSubscription() {
      try {
        const data = await SubscriptionApi.getMySubscription();
        
        // Нова структура API: { result: { subscription: {...}, usage: {...}, plan_features: {...} } }
        // Стара структура: { result: { subscription: {...} } } або { subscription: {...} }
        const subscriptionData = data?.result?.subscription || 
                                data?.result || 
                                data?.subscription ||
                                data;
        
        if (subscriptionData?.plan_name) {
          // Normalize plan name to lowercase to match PLAN_TIERS
          const planName = subscriptionData.plan_name.toLowerCase();
          setCurrentPlan(planName);
        } else {
          // Fallback to user object from AuthContext if no plan_name in subscription
          const userPlan = getUserPlan(user);
          setCurrentPlan(userPlan);
        }
      } catch (error) {
        console.error("Failed to load subscription in Home:", error);
        // Fallback to user object from AuthContext
        const userPlan = getUserPlan(user);
        setCurrentPlan(userPlan);
      }
    }
    
    loadSubscription();
  }, [user]);

  // Load dashboard data from APIs
  React.useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) {
        setDashboardData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setDashboardData(prev => ({ ...prev, loading: true }));

        // Load data in parallel
        const [
          healthDataResponse,
          goalsResponse,
          insightsResponse,
          alertsResponse
        ] = await Promise.allSettled([
          HealthApi.getByUserId(user.id, { sort_date: 'desc' }),
          GoalsApi.listGoals({ limit: 5 }),
          InsightApi.getInsightUser(),
          ComprehensiveAlertsApi.fetchComprehensiveAlerts(user.id)
        ]);

        // Process health data for vitals
        let vitals = { hr: null, bp: null, sleep: null };
        let healthDataArray = [];
        
        if (healthDataResponse.status === 'fulfilled') {
          const healthData = healthDataResponse.value;
          healthDataArray = healthData?.result || healthData?.health_data || (Array.isArray(healthData) ? healthData : []);
          
          if (healthDataArray.length > 0) {
            const latest = healthDataArray[0];
            vitals = {
              hr: latest.heart_rate || null,
              bp: latest.blood_pressure_systolic && latest.blood_pressure_diastolic 
                ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}` 
                : null,
              sleep: latest.sleep_duration || null
            };
          }
        }

        // Process goals for suggested goal and actions
        let suggestedGoal = null;
        let actions = [];
        
        if (goalsResponse.status === 'fulfilled') {
          const goalsData = goalsResponse.value;
          const goals = goalsData?.result || goalsData?.goals || (Array.isArray(goalsData) ? goalsData : []);
          
          if (goals.length > 0) {
            // Get first active goal as suggested
            const activeGoal = goals.find(g => g.status === 'active' || !g.status) || goals[0];
            if (activeGoal) {
              suggestedGoal = activeGoal.goal_name || activeGoal.name || activeGoal.description || "Complete your health goal";
            }
            
            // Convert goals to actions
            actions = goals.slice(0, 3).map((goal, idx) => ({
              id: goal.id || goal.goal_id || idx + 1,
              text: goal.goal_name || goal.name || goal.description || `Goal ${idx + 1}`,
              done: goal.status === 'completed' || false
            }));
          }
        }

        // Process insights for latest insight
        // getInsightUser() returns list of chats, not insights
        let latestInsight = "No insights available yet. Start tracking your health data to get personalized insights.";
        
        if (insightsResponse.status === 'fulfilled') {
          const insightsData = insightsResponse.value;
          // getInsightUser returns { result: [...] } where each item is a chat with: id, title, created_at, last_message_at
          const chats = insightsData?.result || (Array.isArray(insightsData) ? insightsData : []);
          
          if (chats.length > 0) {
            // Get the most recent chat (sorted by last_message_at or created_at)
            const latestChat = chats.sort((a, b) => {
              const timeA = a.last_message_at || a.created_at || 0;
              const timeB = b.last_message_at || b.created_at || 0;
              return timeB - timeA; // Newest first
            })[0];
            
            // Use chat title as insight, or try to get description
            if (latestChat.title) {
              latestInsight = latestChat.title;
            } else if (latestChat.description) {
              latestInsight = latestChat.description;
            } else {
              latestInsight = "You have active health insights. Click to view details.";
            }
          }
        }

        // Process alerts for risk score
        let riskScore = { label: 'Low Risk', color: '#4caf50', value: 0 };
        
        if (alertsResponse.status === 'fulfilled') {
          const alertsData = alertsResponse.value;
          const alerts = alertsData?.result || alertsData?.alerts || (Array.isArray(alertsData) ? alertsData : []);
          
          // Calculate risk score based on active alerts
          const activeAlerts = alerts.filter(a => a.status === 'active' || !a.status);
          const highPriorityAlerts = activeAlerts.filter(a => a.severity === 'high' || a.priority === 'high');
          
          if (highPriorityAlerts.length > 0) {
            riskScore = { label: 'High Risk', color: '#f44336', value: Math.min(90, 50 + highPriorityAlerts.length * 10) };
          } else if (activeAlerts.length > 0) {
            riskScore = { label: 'Moderate Risk', color: '#e7b416', value: Math.min(70, 30 + activeAlerts.length * 5) };
          } else {
            riskScore = { label: 'Low Risk', color: '#4caf50', value: 20 };
          }
        }

        // Calculate focus areas from health data
        const areas = [
          { key:'Lifestyle', value: 0, color:'#00bace' },
          { key:'Vitals', value: 0, color:'#4caf50' },
          { key:'Labs', value: 0, color:'#ff9800' },
          { key:'Nutrition', value: 0, color:'#9c27b0' },
          { key:'Sleep', value: 0, color:'#2196f3' },
        ];

        if (healthDataArray.length > 0) {
          // Calculate percentages based on data availability
          const hasActivity = healthDataArray.some(d => d.weekly_activity_minutes > 0);
          const hasVitals = healthDataArray.some(d => d.heart_rate > 0 || d.blood_pressure_systolic > 0);
          const hasLabs = healthDataArray.some(d => d.fasting_glucose > 0 || d.body_temperature > 0);
          const hasNutrition = healthDataArray.some(d => d.hydration_liters > 0);
          const hasSleep = healthDataArray.some(d => d.sleep_duration > 0);

          areas[0].value = hasActivity ? 30 : 0; // Lifestyle
          areas[1].value = hasVitals ? 25 : 0; // Vitals
          areas[2].value = hasLabs ? 20 : 0; // Labs
          areas[3].value = hasNutrition ? 15 : 0; // Nutrition
          areas[4].value = hasSleep ? 10 : 0; // Sleep
        }

        // Load health trend data
        let trend = [];
        try {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 84); // 12 weeks ago
          
          const trendResponse = await TrendsApi.getTrends({
            typeMetric: 'heart_rate',
            period: 'week',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });

          const trendData = trendResponse?.result || trendResponse?.data || [];
          if (Array.isArray(trendData) && trendData.length > 0) {
            trend = trendData.slice(-12).map(item => {
              const value = item.daily_value || item.weekly_value || item.monthly_value || item.value || 0;
              return Math.min(100, Math.max(0, value));
            });
          }
        } catch (error) {
          console.error("Failed to load trend data:", error);
        }

        // Generate recent activity from various sources
        const activity = [];
        
        // Add insight activity (from chats)
        if (insightsResponse.status === 'fulfilled') {
          const insightsData = insightsResponse.value;
          const chats = insightsData?.result || (Array.isArray(insightsData) ? insightsData : []);
          if (chats.length > 0) {
            const latestChat = chats.sort((a, b) => {
              const timeA = a.last_message_at || a.created_at || 0;
              const timeB = b.last_message_at || b.created_at || 0;
              return timeB - timeA;
            })[0];
            const date = new Date(latestChat.last_message_at || latestChat.created_at || Date.now());
            const timeAgo = getTimeAgo(date);
            const chatTitle = latestChat.title || 'AI Insight';
            activity.push({ id: 1, time: timeAgo, text: `AI Insight: ${chatTitle}` });
          }
        }

        // Add health data activity
        if (healthDataArray.length > 0) {
          const recentHealth = healthDataArray[0];
          const date = new Date(recentHealth.date || recentHealth.created_at || Date.now());
          const timeAgo = getTimeAgo(date);
          activity.push({ id: 2, time: timeAgo, text: 'Health data updated' });
        }

        // Add goals activity
        if (goalsResponse.status === 'fulfilled') {
          const goalsData = goalsResponse.value;
          const goals = goalsData?.result || goalsData?.goals || (Array.isArray(goalsData) ? goalsData : []);
          if (goals.length > 0) {
            const recentGoal = goals.sort((a, b) => {
              const timeA = a.created_at || a.updated_at || 0;
              const timeB = b.created_at || b.updated_at || 0;
              return timeB - timeA;
            })[0];
            const date = new Date(recentGoal.created_at || recentGoal.updated_at || Date.now());
            const timeAgo = getTimeAgo(date);
            const goalName = recentGoal.goal_name || recentGoal.name || 'Goal';
            activity.push({ id: 3, time: timeAgo, text: `Goal: ${goalName}` });
          }
        }
        
        // Sort activity by time (newest first)
        activity.sort((a, b) => {
          // Simple sort by id (which represents order) - newest first
          return b.id - a.id;
        });

        // Update state with all loaded data
        setDashboardData({
          riskScore,
          latestInsight,
          vitals,
          suggestedGoal,
          areas,
          trend: trend.length > 0 ? trend : [48, 52, 55, 50, 58, 64, 62, 66, 69, 71, 70, 72], // Fallback
          actions: actions.length > 0 ? actions : [
            { id: 1, text: 'Add your first health data entry', done: false },
            { id: 2, text: 'Create a health goal', done: false },
            { id: 3, text: 'Generate your first AI insight', done: false },
          ],
          activity: activity.length > 0 ? activity : [
            { id: 1, time: '—', text: 'No recent activity' }
          ],
          loading: false
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    }

    loadDashboardData();
  }, [user?.id]);

  // Helper function to format time ago
  function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }

  // Determine current plan: use subscription data if available, otherwise fallback to user object
  const userPlan = currentPlan || getUserPlan(user);
  const isFreePlan = userPlan === PLAN_TIERS.STARTER;

  return (
    <div className="home-page-container" style={{ display:'grid', gap:16 }}>
      <style>{`
        /* Responsive font sizes for Home page */
        @media (max-width: 768px) {
          .home-welcome-title {
            font-size: 16px !important;
          }
          .home-card-title {
            font-size: 14px !important;
          }
          .home-card-text {
            font-size: 13px !important;
          }
          .home-chart-title {
            font-size: 14px !important;
          }
          .home-chart-legend {
            font-size: 11px !important;
          }
          .home-tip-text {
            font-size: 11px !important;
          }
          .home-action-text {
            font-size: 13px !important;
          }
          .home-activity-time {
            font-size: 11px !important;
          }
          .upgrade-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .upgrade-banner .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .home-page-container {
            padding: 0 12px !important;
          }
        }
        @media (max-width: 480px) {
          .home-welcome-title {
            font-size: 15px !important;
          }
          .home-card-title {
            font-size: 13px !important;
          }
          .home-card-text {
            font-size: 12px !important;
          }
          .home-chart-title {
            font-size: 13px !important;
          }
          .home-chart-legend {
            font-size: 10px !important;
          }
          .home-tip-text {
            font-size: 10px !important;
          }
          .home-action-text {
            font-size: 12px !important;
          }
          .home-activity-time {
            font-size: 10px !important;
          }
          .upgrade-banner {
            padding: 14px 16px !important;
          }
          .upgrade-banner > div:first-child {
            min-width: 100% !important;
          }
          .home-page-container {
            padding: 0 8px !important;
          }
        }
      `}</style>
      {/* Upgrade Banner for Free Plan */}
      {isFreePlan && (
        <div 
          className="card upgrade-banner" 
          style={{ 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'space-between', 
            gap:16,
            background: isLight ? 'rgba(254, 243, 199, 0.6)' : 'rgba(245, 166, 35, 0.1)',
            border: isLight ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(245, 166, 35, 0.3)',
            padding: '16px 20px',
            flexWrap: 'wrap'
          }} 
          aria-label="Upgrade banner"
        >
          <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth: '280px' }}>
            <div style={{ 
              fontSize: 24,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isLight ? 'rgba(254, 243, 199, 0.8)' : 'rgba(245, 166, 35, 0.2)',
              borderRadius: '50%',
              flexShrink: 0,
              border: isLight ? '1px solid rgba(251, 191, 36, 0.3)' : 'none'
            }}>
              ⚠️
            </div>
            <div style={{ flex:1 }}>
              <div style={{ 
                fontWeight:600, 
                marginBottom:6, 
                fontSize:14,
                color: isLight ? '#111827' : 'var(--text)',
                lineHeight: 1.4
              }}>
                You're on the Free plan. Upgrade to Core for more insights, saved chats, and goals.
              </div>
              <div style={{ 
                color: isLight ? '#6b7280' : 'var(--muted)', 
                fontSize:12, 
                lineHeight:1.5 
              }}>
                Unlock AI risk forecasts, PDF reports, custom goals, and more with Core plan.
              </div>
            </div>
          </div>
          <Link 
            className="btn primary" 
            to="/dashboard/subscriptions?tab=upgrade"
            onClick={() => {
              // Track upgrade banner click
              if (window.gtag) {
                window.gtag('event', 'upgrade_banner_click', {
                  'event_category': 'subscription',
                  'event_label': 'home_dashboard',
                  'value': 1
                });
              }
            }}
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* 1) Welcome banner */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }} aria-label="Welcome banner">
        <div>
          <div className="home-welcome-title" style={{ fontSize:18, fontWeight:700 }}>Welcome back{userName ? `, ${userName}` : ''}.</div>
          <div className="home-card-text" style={{ color:'var(--muted)', marginTop:4 }}>Here's where you stand today.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isNewOrIncomplete && <Link className="btn primary" to="/onboarding">Complete onboarding</Link>}
          <button className="btn ghost" title="Quick guidance for new users">Onboarding tips</button>
          <button className="btn outline" title="Latest features and fixes">What’s new</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }} aria-label="Quick actions">
        <span className="home-card-title" style={{ fontWeight:600 }}>Quick actions:</span>
        <Link className="btn outline small" to="/dashboard/reports" title="Create or download a report">Open Reports</Link>
        <Link className="btn outline small" to="/dashboard/profile" title="Review and edit your health data">Edit Health Data</Link>
        <Link className="btn outline small" to="/dashboard/goals" title="Add or update goals">Manage Goals</Link>
        <div className="home-tip-text" style={{ marginLeft:'auto', color:'var(--muted)', fontSize:12 }}>Use these to get value fast</div>
      </div>

      {/* 2) Snapshot cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:12 }}>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Personal Risk Score</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:999, background: dashboardData.riskScore.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#111', fontWeight:800, fontSize:'clamp(14px, 2.5vw, 18px)' }}>{dashboardData.riskScore.value}</div>
            <div className="home-card-text" style={{ color:'var(--muted)' }}>{dashboardData.riskScore.label}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">View Insights</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Latest AI Insight</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>
            {dashboardData.loading ? 'Loading...' : dashboardData.latestInsight}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">Explore Suggestion</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Vitals Summary</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>
            {dashboardData.loading ? 'Loading...' : (
              <>
                {dashboardData.vitals.hr ? `HR: ${dashboardData.vitals.hr} bpm` : 'HR: —'}
                {dashboardData.vitals.bp ? ` | BP: ${dashboardData.vitals.bp}` : ' | BP: —'}
                {dashboardData.vitals.sleep ? ` | Sleep: ${dashboardData.vitals.sleep}h` : ' | Sleep: —'}
                {!dashboardData.vitals.hr && !dashboardData.vitals.bp && !dashboardData.vitals.sleep && 'No vitals data yet'}
              </>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/profile?tab=health_data">See Health Data</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Suggested Goal</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>
            {dashboardData.loading ? 'Loading...' : (dashboardData.suggestedGoal || 'Create your first health goal')}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/goals">Manage Goals</Link>
          </div>
        </div>
      </div>

      {/* 3) Data Visualization */}
      <div className="card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, alignItems:'center' }}>
        {/* Ring chart approximation */}
        <div style={{ display:'grid', gap:10 }}>
          <div className="home-chart-title" style={{ fontWeight:600 }}>Focus Areas</div>
          <div style={{ position:'relative', width:'clamp(140px, 20vw, 180px)', height:'clamp(140px, 20vw, 180px)', alignSelf:'center', margin:'0 auto' }}>
            {renderRing(dashboardData.areas, isLight)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:6 }}>
            {dashboardData.areas.map(a => (
              <div key={a.key} className="home-chart-legend" style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)', fontSize:12 }}>
                <span style={{ width:10, height:10, background:a.color, borderRadius:2, flexShrink:0 }} />
                <span>{a.key} — {a.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend mini chart */}
        <div style={{ display:'grid', gap:10 }}>
          <div className="home-chart-title" style={{ fontWeight:600 }}>Health Trend (last 12 weeks)</div>
          <div style={{ display:'flex', alignItems:'flex-end', height:'clamp(80px, 15vw, 120px)', gap:4 }}>
            {dashboardData.trend.length > 0 ? dashboardData.trend.map((v,i)=> (
              <div key={i} style={{ 
                width:'clamp(12px, 2vw, 18px)', 
                height: Math.max(6, (v/100)*110), 
                background: isLight ? '#00bace' : 'var(--primary)', 
                opacity: isLight ? 0.9 : 0.85, 
                borderRadius:4,
                transition: 'all 0.2s ease'
              }} />
            )) : (
              <div style={{ color:'var(--muted)', fontSize:12 }}>No trend data available</div>
            )}
          </div>
          <div className="home-tip-text" style={{ color:'var(--muted)', fontSize:12 }}>Tip: values are normalized to 0–100 for display.</div>
        </div>
      </div>

      {/* 4) Today action plan & 5) Recent activity */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Today's Action Plan</div>
          <div style={{ display:'grid', gap:6 }}>
            {dashboardData.loading ? (
              <div style={{ color:'var(--muted)', fontSize:14 }}>Loading actions...</div>
            ) : dashboardData.actions.length > 0 ? (
              dashboardData.actions.map(a => (
                <label key={a.id} className="checkbox" style={{ alignItems:'flex-start' }}>
                  <input type="checkbox" checked={a.done} onChange={()=>toggleAction(a.id)} />
                  <span className="home-action-text" style={{ textDecoration: a.done ? 'line-through' : 'none', fontSize:14 }}>{a.text}</span>
                </label>
              ))
            ) : (
              <div style={{ color:'var(--muted)', fontSize:14 }}>No actions yet. Create goals to see your action plan.</div>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn primary" to="/dashboard/goals">Manage Goals</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Recent Activity</div>
          <div style={{ display:'grid', gap:6 }}>
            {dashboardData.loading ? (
              <div style={{ color:'var(--muted)', fontSize:14 }}>Loading activity...</div>
            ) : (
              dashboardData.activity.map(item => (
                <div key={item.id} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', padding:'6px 0' }}>
                  <div className="home-action-text" style={{ fontSize:14 }}>{item.text}</div>
                  <div className="home-activity-time" style={{ color:'var(--muted)', fontSize:12 }}>{item.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6) Tips */}
      <div className="card" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {tips.map((t,i)=> (
          <div key={i} className="btn ghost home-tip-text" style={{ pointerEvents:'none', fontSize:12 }}>{t}</div>
        ))}
        <div style={{ marginLeft:'auto' }} />
        <Link className="btn outline" to="/dashboard/insights">Explore dashboard</Link>
      </div>

      {/* Onboarding Incomplete Modal */}
      <OnboardingIncompleteModal
        open={onboardingModalOpen}
        onContinue={handleOnboardingContinue}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
}

function getUser(){
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { firstName:'', onboardingCompleted:true };
    const u = JSON.parse(raw);
    return {
      firstName: u.first_name || u.firstName || u.name?.split(' ')?.[0] || '',
      onboardingCompleted: u.onboarding_completed ?? u.completed ?? true,
    };
  } catch { return { firstName:'', onboardingCompleted:true }; }
}

// Render a simple ring chart with stacked arcs (CSS only approximation)
function renderRing(segments, isLight = false){
  const total = segments.reduce((s,a)=>s+a.value,0) || 1;
  let acc = 0;
  const innerBg = isLight ? 'rgba(249, 250, 251, 0.95)' : 'rgba(17,17,17,.85)';
  const innerTextColor = isLight ? '#111827' : 'var(--muted)';
  const innerBorder = isLight ? '#e5e7eb' : 'var(--border)';
  
  return (
    <div style={{ position:'absolute', inset:0 }}>
      {segments.map((s, i) => {
        const start = (acc/total)*360; acc += s.value; const end = (acc/total)*360;
        const conic = `conic-gradient(${s.color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`;
        return <div key={i} style={{ position:'absolute', inset:0, borderRadius:'50%', background: conic }} />
      })}
      <div style={{ 
        position:'absolute', 
        inset:20, 
        borderRadius:'50%', 
        background: innerBg, 
        border:`1px solid ${innerBorder}`, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        color: innerTextColor,
        fontWeight: 600,
        fontSize: '14px'
      }}>Focus</div>
    </div>
  );
}


