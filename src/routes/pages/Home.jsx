import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import { OnboardingIncompleteModal } from "../../components/OnboardingIncompleteModal";
import { getUserPlan, PLAN_TIERS } from "../../utils/subscriptionUtils.js";

export default function DashboardHome(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLight } = useTheme();
  const userData = getUser();
  const userName = userData.firstName;
  const isNewOrIncomplete = userData.onboardingCompleted === false;
  
  const [onboardingModalOpen, setOnboardingModalOpen] = React.useState(false);
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);

  // Snapshot mock data (replace with API later)
  const riskScore = { label: 'Moderate Risk', color: '#e7b416', value: 62 };
  const latestInsight = "Your vitamin D levels may be low based on recent trends.";
  const vitals = { hr: 72, bp: '118/74', sleep: 6.5 };
  const suggestedGoal = "Increase fiber intake this week";

  // Focus areas (ring chart style)
  const areas = [
    { key:'Lifestyle', value: 28, color:'#00bace' },
    { key:'Vitals', value: 22, color:'#4caf50' },
    { key:'Labs', value: 16, color:'#ff9800' },
    { key:'Nutrition', value: 20, color:'#9c27b0' },
    { key:'Sleep', value: 14, color:'#2196f3' },
  ];

  // Trends (simple spark bars)
  const trend = [48, 52, 55, 50, 58, 64, 62, 66, 69, 71, 70, 72];

  const [actions, setActions] = React.useState([
    { id:1, text:'Drink 80 oz of water', done:false },
    { id:2, text:'Add leafy greens to one meal', done:false },
    { id:3, text:'Review your lab result summary', done:false },
  ]);

  const toggleAction = (id) => setActions(prev => prev.map(a => a.id===id ? { ...a, done:!a.done } : a));

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

  const activity = [
    { id:1, time:'2h ago', text:'AI Insight generated: Hydration trend' },
    { id:2, time:'Yesterday', text:'Report shared with provider' },
    { id:3, time:'2 days ago', text:'Lab results uploaded' },
    { id:4, time:'3 days ago', text:'Profile updated: medications' },
  ];

  const tips = [
    'Stay consistent: meaningful trends appear within 30 days.',
    'Add your latest lab report to improve recommendations.',
    'Small wins compound: a 10-minute walk still counts.',
  ];

  const userPlan = getUserPlan(user);
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
            <div style={{ width:40, height:40, borderRadius:999, background: riskScore.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#111', fontWeight:800, fontSize:'clamp(14px, 2.5vw, 18px)' }}>{riskScore.value}</div>
            <div className="home-card-text" style={{ color:'var(--muted)' }}>{riskScore.label}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">View Insights</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Latest AI Insight</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>{latestInsight}</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">Explore Suggestion</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Vitals Summary</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>HR: {vitals.hr} | BP: {vitals.bp} | Sleep: {vitals.sleep}h</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/profile?tab=health_data">See Health Data</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Suggested Goal</div>
          <div className="home-card-text" style={{ color:'var(--muted)' }}>{suggestedGoal}</div>
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
            {renderRing(areas, isLight)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:6 }}>
            {areas.map(a => (
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
            {trend.map((v,i)=> (
              <div key={i} style={{ 
                width:'clamp(12px, 2vw, 18px)', 
                height: Math.max(6, (v/100)*110), 
                background: isLight ? '#00bace' : 'var(--primary)', 
                opacity: isLight ? 0.9 : 0.85, 
                borderRadius:4,
                transition: 'all 0.2s ease'
              }} />
            ))}
          </div>
          <div className="home-tip-text" style={{ color:'var(--muted)', fontSize:12 }}>Tip: values are normalized to 0–100 for display.</div>
        </div>
      </div>

      {/* 4) Today action plan & 5) Recent activity */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Today's Action Plan</div>
          <div style={{ display:'grid', gap:6 }}>
            {actions.map(a => (
              <label key={a.id} className="checkbox" style={{ alignItems:'flex-start' }}>
                <input type="checkbox" checked={a.done} onChange={()=>toggleAction(a.id)} />
                <span className="home-action-text" style={{ textDecoration: a.done ? 'line-through' : 'none', fontSize:14 }}>{a.text}</span>
              </label>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn primary">Save for today</button>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div className="home-card-title" style={{ fontWeight:600 }}>Recent Activity</div>
          <div style={{ display:'grid', gap:6 }}>
            {activity.map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', padding:'6px 0' }}>
                <div className="home-action-text" style={{ fontSize:14 }}>{item.text}</div>
                <div className="home-activity-time" style={{ color:'var(--muted)', fontSize:12 }}>{item.time}</div>
              </div>
            ))}
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


