import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../api/AuthContext";
import { OnboardingIncompleteModal } from "../../components/OnboardingIncompleteModal";

export default function DashboardHome(){
  const navigate = useNavigate();
  const { user } = useAuth();
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
        console.log('ℹ️ Not showing onboarding modal - not after login');
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
          console.warn('⚠️ No user ID available for onboarding check');
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
        console.error('Error checking onboarding status:', error);
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
      
      console.log('📊 Checking onboarding progress for user:', userId);
      const onboardingProgress = await OnboardingApi.getProgress(userId);
      const progress = onboardingProgress?.save_onboarding;
      
      console.log('📊 Onboarding progress:', progress);
      
      // Check if onboarding is incomplete (progress < 100% or not completed)
      const isIncomplete = !progress?.completed && 
        (!progress?.progress?.percentage || progress.progress.percentage < 100);
      
      if (isIncomplete) {
        console.log('⚠️ Onboarding is incomplete, showing modal...');
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
    console.log('🔄 Continuing to onboarding page...');
    
    // Close modal immediately
    setOnboardingModalOpen(false);
    
    // Clear flag so modal won't show again on navigation
    try {
      localStorage.removeItem('showOnboardingModalAfterLogin');
    } catch {}
    
    // Use force=true parameter to bypass OnboardingGuard check
    // This allows access to onboarding even if hasCompletedOnboarding() returns true
    console.log('📍 Current hash before navigation:', window.location.hash);
    
    // Navigate with force parameter to bypass guard
    navigate("/onboarding?force=true", { replace: true });
    
    console.log('✅ Navigation triggered to /onboarding?force=true');
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

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* 1) Welcome banner */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }} aria-label="Welcome banner">
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>Welcome back{userName ? `, ${userName}` : ''}.</div>
          <div style={{ color:'var(--muted)', marginTop:4 }}>Here’s where you stand today.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isNewOrIncomplete && <Link className="btn primary" to="/onboarding">Complete onboarding</Link>}
          <button className="btn ghost" title="Quick guidance for new users">Onboarding tips</button>
          <button className="btn outline" title="Latest features and fixes">What’s new</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }} aria-label="Quick actions">
        <span style={{ fontWeight:600 }}>Quick actions:</span>
        <Link className="btn outline small" to="/dashboard/reports" title="Create or download a report">Open Reports</Link>
        <Link className="btn outline small" to="/dashboard/profile" title="Review and edit your health data">Edit Health Data</Link>
        <Link className="btn outline small" to="/dashboard/goals" title="Add or update goals">Manage Goals</Link>
        <div style={{ marginLeft:'auto', color:'var(--muted)', fontSize:12 }}>Use these to get value fast</div>
      </div>

      {/* 2) Snapshot cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:12 }}>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Personal Risk Score</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:999, background: riskScore.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#111', fontWeight:800 }}>{riskScore.value}</div>
            <div style={{ color:'var(--muted)' }}>{riskScore.label}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">View Insights</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Latest AI Insight</div>
          <div style={{ color:'var(--muted)' }}>{latestInsight}</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/insights">Explore Suggestion</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Vitals Summary</div>
          <div style={{ color:'var(--muted)' }}>HR: {vitals.hr} | BP: {vitals.bp} | Sleep: {vitals.sleep}h</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/profile?tab=health_data">See Health Data</Link>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Suggested Goal</div>
          <div style={{ color:'var(--muted)' }}>{suggestedGoal}</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link className="btn outline small" to="/dashboard/goals">Manage Goals</Link>
          </div>
        </div>
      </div>

      {/* 3) Data Visualization */}
      <div className="card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, alignItems:'center' }}>
        {/* Ring chart approximation */}
        <div style={{ display:'grid', gap:10 }}>
          <div style={{ fontWeight:600 }}>Focus Areas</div>
          <div style={{ position:'relative', width:180, height:180, alignSelf:'center' }}>
            {renderRing(areas)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:6 }}>
            {areas.map(a => (
              <div key={a.key} style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)' }}>
                <span style={{ width:10, height:10, background:a.color, borderRadius:2 }} />
                <span>{a.key} — {a.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend mini chart */}
        <div style={{ display:'grid', gap:10 }}>
          <div style={{ fontWeight:600 }}>Health Trend (last 12 weeks)</div>
          <div style={{ display:'flex', alignItems:'flex-end', height:120, gap:6 }}>
            {trend.map((v,i)=> (
              <div key={i} style={{ width:18, height: Math.max(6, (v/100)*110), background:'var(--primary)', opacity:0.85, borderRadius:4 }} />
            ))}
          </div>
          <div style={{ color:'var(--muted)', fontSize:12 }}>Tip: values are normalized to 0–100 for display.</div>
        </div>
      </div>

      {/* 4) Today action plan & 5) Recent activity */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Today’s Action Plan</div>
          <div style={{ display:'grid', gap:6 }}>
            {actions.map(a => (
              <label key={a.id} className="checkbox" style={{ alignItems:'flex-start' }}>
                <input type="checkbox" checked={a.done} onChange={()=>toggleAction(a.id)} />
                <span style={{ textDecoration: a.done ? 'line-through' : 'none' }}>{a.text}</span>
              </label>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn primary">Save for today</button>
          </div>
        </div>
        <div className="card" style={{ display:'grid', gap:8 }}>
          <div style={{ fontWeight:600 }}>Recent Activity</div>
          <div style={{ display:'grid', gap:6 }}>
            {activity.map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', padding:'6px 0' }}>
                <div>{item.text}</div>
                <div style={{ color:'var(--muted)', fontSize:12 }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6) Tips */}
      <div className="card" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {tips.map((t,i)=> (
          <div key={i} className="btn ghost" style={{ pointerEvents:'none' }}>{t}</div>
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
function renderRing(segments){
  const total = segments.reduce((s,a)=>s+a.value,0) || 1;
  let acc = 0;
  return (
    <div style={{ position:'absolute', inset:0 }}>
      {segments.map((s, i) => {
        const start = (acc/total)*360; acc += s.value; const end = (acc/total)*360;
        const conic = `conic-gradient(${s.color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`;
        return <div key={i} style={{ position:'absolute', inset:0, borderRadius:'50%', background: conic }} />
      })}
      <div style={{ position:'absolute', inset:20, borderRadius:'50%', background:'rgba(17,17,17,.85)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Focus</div>
    </div>
  );
}


