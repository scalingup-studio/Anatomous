import React from "react";
import { UpgradePrompt } from "../../components/UpgradePrompt.jsx";
import { useAuth } from "../../api/AuthContext.jsx";

function Tabs({ value, onChange }) {
  const items = [
    { key: "current", label: "Current Plan" },
    { key: "upgrade", label: "Upgrade Options" },
  ];
  return (
    <div role="tablist" aria-label="Subscriptions navigation" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          role="tab"
          aria-selected={value === t.key}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: value === t.key ? "var(--primary)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: value === t.key ? 600 : 400,
            borderBottom: value === t.key ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function SubscriptionsPage() {
  const [tab, setTab] = React.useState("current");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Subscriptions</h1>
      </div>

      {/* Helpful banner */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ color:'var(--muted)', fontSize:13 }}>Manage your plan, view what’s included, and upgrade any time. You can switch between monthly and annual billing on the Upgrade tab.</div>
        <a className="btn ghost" href="/privacy" target="_blank" rel="noreferrer">Billing FAQ</a>
      </div>

      <Tabs value={tab} onChange={setTab} />

      {tab === "current" && <CurrentPlan />}
      {tab === "upgrade" && <UpgradeOptions />}
    </div>
  );
}

function Badge({ children, tone = "secondary" }) {
  return (
    <span className={`btn ${tone} small`} style={{ pointerEvents:'none' }}>{children}</span>
  );
}

function CurrentPlan() {
  const { user } = useAuth();
  // Mock of the active plan; replace with API later
  const active = {
    name: "Starter (Free)",
    tier: "Active",
    renewal: "2025-12-31",
    limits: { familyUsed: 0, familyMax: 0, uploadsUsed: 0, uploadsMax: 3, goalsUsed: 0, goalsMax: 10, notesUsed: 0, notesMax: 3 },
    features: [
      "Manual Health Data Entry",
      "10 AI Messages/month",
      "Secure Data Backup",
    ],
  };
  
  const [upgradePromptOpen, setUpgradePromptOpen] = React.useState(false);
  const [upgradeFeature, setUpgradeFeature] = React.useState(null);

  return (
    <div className="card" style={{ display:'grid', gap:12, maxWidth: 920 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>{active.name}</div>
          <div style={{ color:'var(--muted)', fontSize:12 }}>Renews on {active.renewal}</div>
        </div>
        <Badge>{active.tier}</Badge>
      </div>

      <div className="card" style={{ 
        background: document.documentElement.classList.contains('light-theme') 
          ? 'rgba(249, 250, 251, 0.6)' 
          : 'rgba(0,0,0,.25)' 
      }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Included features</div>
        <ul style={{ margin:0, paddingLeft:18 }}>
          {active.features.map((f, i) => (<li key={i}>✅ {f}</li>))}
        </ul>
      </div>

      <div className="card">
        <div style={{ fontWeight:600, marginBottom:8 }}>Active limits</div>
        <div style={{ display:'grid', gap:8 }}>
          {active.limits.uploadsMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Document & Lab Uploads</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.uploadsUsed}/{active.limits.uploadsMax === Infinity ? '∞' : active.limits.uploadsMax} used
                </div>
                {active.limits.uploadsMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${(active.limits.uploadsUsed/active.limits.uploadsMax)*100}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.goalsMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Custom Goals</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.goalsUsed}/{active.limits.goalsMax === Infinity ? '∞' : active.limits.goalsMax} used
                </div>
                {active.limits.goalsMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${(active.limits.goalsUsed/active.limits.goalsMax)*100}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.notesMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Notes</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.notesUsed}/{active.limits.notesMax === Infinity ? '∞' : active.limits.notesMax} used
                </div>
                {active.limits.notesMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${(active.limits.notesUsed/active.limits.notesMax)*100}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.familyMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Family profiles</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>{active.limits.familyUsed}/{active.limits.familyMax}</div>
                <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                  <div style={{ width:`${(active.limits.familyUsed/active.limits.familyMax)*100}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn outline">Manage billing</button>
        <button className="btn primary" onClick={() => {
          const tabs = document.querySelector('[role="tablist"]');
          if (tabs) {
            const upgradeTab = Array.from(tabs.querySelectorAll('button')).find(btn => btn.textContent === 'Upgrade Options');
            if (upgradeTab) upgradeTab.click();
          }
        }}>Upgrade</button>
      </div>
      
      {/* Feature Gating Examples */}
      <div className="card" style={{ maxWidth: 920, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Feature Access Examples</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          When you try to access features not included in your current plan, you'll see upgrade prompts like these:
        </p>
        
        <div style={{ display: 'grid', gap: 12 }}>
          {/* AI Risk Forecasts Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('aiRiskForecasts');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>AI Risk Forecasts</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 AI Risk Forecasts are not available on the Free plan.
              <br />
              Upgrade to <strong>Core</strong> to unlock intelligent health forecasting based on your data.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 See Upgrade Prompt
              </button>
            </div>
          </div>
          
          {/* Early Alerts Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('earlyAlerts');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>📈</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Early Alerts</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 Early Alerts are available only on the Complete and Family plans.
              <br />
              Upgrade to <strong>Complete</strong> to receive proactive health warnings based on trend analysis.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 See Upgrade Prompt
              </button>
            </div>
          </div>
          
          {/* Reports Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('reportsPdf');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🧾</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Reports (PDF Export)</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 PDF Reports are not included in your current plan.
              <br />
              Upgrade to <strong>Core</strong> or higher to generate exportable reports of your health insights.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 See Upgrade Prompt
              </button>
            </div>
          </div>
          
          {/* Family Sharing Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('familySharing');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>👨‍👧</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Family Sharing</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 Family Sharing is only available on the Family Plan.
              <br />
              Upgrade to <strong>Family</strong> to manage up to 2 users under one shared health dashboard.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 See Upgrade Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <UpgradePrompt 
        open={upgradePromptOpen} 
        onClose={() => setUpgradePromptOpen(false)} 
        feature={upgradeFeature}
        user={user}
      />
    </div>
  );
}

function UpgradeOptions() {
  const [period, setPeriod] = React.useState("monthly");
  const [hoveredRow, setHoveredRow] = React.useState(null);
  const monthly = period === "monthly";
  const plans = [
    { 
      key:'starter', 
      name:'Starter', 
      subtitle:'Free', 
      priceMonthly:0, 
      priceYearly:0, 
      features:['Manual Health Data Entry','10 AI Messages/month','Secure Data Backup'], 
      gated:['AI Risk Forecasts','Early Alerts','Reports','CSV Export','Document Uploads','Custom Goals','Goal History','Notes (3+)','Chat History','Share with Providers','Family Sharing'], 
      ribbon:'Free Tier',
      recommended:false,
      savings:null
    },
    { 
      key:'core', 
      name:'Core', 
      subtitle:'Most Popular', 
      priceMonthly:9, 
      priceYearly:90, 
      features:['Everything in Starter','50 AI Messages/month','AI Risk Forecasts','Reports (PDF)','3 Document Uploads/month','Up to 10 Custom Goals','90-day Goal History','Up to 30 Notes','30-day Chat History'], 
      gated:['Early Alerts','CSV Export','Unlimited Uploads','Unlimited Goals','Unlimited Notes','Full Chat History','Share with Providers','Family Sharing'], 
      ribbon:'Most popular',
      recommended:true,
      savings:monthly ? null : 'Save $18/year'
    },
    { 
      key:'complete', 
      name:'Complete', 
      subtitle:'Best Value', 
      priceMonthly:19, 
      priceYearly:190, 
      features:['Everything in Core','Unlimited AI Messages','Early Alerts','CSV Data Export','Unlimited Document Uploads','Unlimited Custom Goals','Unlimited Goal History','Unlimited Notes','Full Chat History','Share with Providers'], 
      gated:['Family Sharing'], 
      ribbon:'Best value',
      recommended:false,
      savings:monthly ? null : 'Save $38/year'
    },
    { 
      key:'family', 
      name:'Family', 
      subtitle:'For Families', 
      priceMonthly:29, 
      priceYearly:290, 
      features:['Everything in Complete','Family Sharing (1 linked user)'], 
      gated:[], 
      ribbon:null,
      recommended:false,
      savings:monthly ? null : 'Save $58/year'
    },
  ];

  // Feature matrix (show everything in one place, as is common in pricing pages)
  const featureMatrix = [
    { label: 'Manual Health Data Entry', keys: { starter:true, core:true, complete:true, family:true } },
    { label: 'AI Messages per Month', keys: { starter:'10', core:'50', complete:'Unlimited', family:'Unlimited' } },
    { label: 'AI-Driven Risk Forecasts', keys: { starter:false, core:true, complete:true, family:true } },
    { label: 'Early Alerts', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Reports (PDF Export)', keys: { starter:false, core:true, complete:true, family:true } },
    { label: 'CSV Data Export', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Document & Lab Uploads', keys: { starter:false, core:'3/month', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Custom Goals', keys: { starter:false, core:'Up to 10', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Goal History', keys: { starter:false, core:'90-day history', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Notes', keys: { starter:'Up to 3', core:'Up to 30', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Chat History Access', keys: { starter:'None', core:'30-day history', complete:'Full history', family:'Full history' } },
    { label: 'Share with Providers', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Family Sharing (Users)', keys: { starter:false, core:false, complete:false, family:'1 linked user' } },
    { label: 'Secure Data Backup', keys: { starter:true, core:true, complete:true, family:true } },
  ];

  return (
    <div className="card" style={{ display:'grid', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:600 }}>Choose your plan</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--muted)' }}>Billing:</span>
          <div className="btn-group" style={{ gap:0 }}>
            <button className={`btn small ${monthly ? 'primary' : 'outline'}`} onClick={()=>setPeriod('monthly')}>Monthly</button>
            <button className={`btn small ${!monthly ? 'primary' : 'outline'}`} onClick={()=>setPeriod('yearly')}>Annual</button>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16 }}>
        {plans.map(p => {
          const isFree = p.key === 'starter';
          const price = monthly ? p.priceMonthly : p.priceYearly;
          const pricePerMonth = monthly ? price : Math.round(price / 12);
          const isLightTheme = document.documentElement.classList.contains('light-theme');
          
          return (
            <div 
              key={p.key} 
              className="card" 
              style={{ 
                display:'flex',
                flexDirection:'column',
                gap:12, 
                position:'relative',
                border: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: p.recommended 
                  ? (isLightTheme ? 'rgba(0, 186, 206, 0.08)' : 'rgba(0, 186, 206, 0.05)')
                  : (isLightTheme ? 'rgba(249, 250, 251, 0.8)' : 'rgba(17,17,17,.85)'),
                transition: 'all 0.2s',
                cursor: 'pointer',
                height: '100%'
              }}
              onMouseEnter={(e) => {
                if (!p.recommended) {
                  e.currentTarget.style.border = '1px solid var(--primary)';
                  e.currentTarget.style.background = isLightTheme 
                    ? 'rgba(0, 186, 206, 0.1)' 
                    : 'rgba(0, 186, 206, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!p.recommended) {
                  e.currentTarget.style.border = '1px solid var(--border)';
                  e.currentTarget.style.background = isLightTheme 
                    ? 'rgba(249, 250, 251, 0.8)' 
                    : 'rgba(17,17,17,.85)';
                }
              }}
            >
              {p.ribbon && (
                <div style={{ position:'absolute', top:12, right:12 }}>
                  <Badge tone={p.ribbon==='Free Tier' ? 'secondary' : p.ribbon==='Most popular' ? 'success' : 'primary'}>
                    {p.ribbon}
                  </Badge>
                </div>
              )}
              
              {p.recommended && (
                <div style={{
                  position:'absolute',
                  top:0,
                  left:0,
                  right:0,
                  height:4,
                  background: 'linear-gradient(90deg, var(--primary), rgba(0, 186, 206, 0.5))',
                  borderRadius: '8px 8px 0 0'
                }} />
              )}
              
              <div style={{ display:'flex', flexDirection:'column', gap:4, paddingTop: p.ribbon ? 8 : 0, flexShrink: 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:20 }}>{p.name}</div>
                  {p.recommended && (
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding: '2px 6px', 
                      background: 'var(--primary)', 
                      color: 'var(--bg)', 
                      borderRadius: 4 
                    }}>
                      RECOMMENDED
                    </span>
                  )}
                </div>
                {p.subtitle && (
                  <div style={{ fontSize:12, color: isLightTheme ? '#4b5563' : 'var(--muted)', fontWeight: 500 }}>{p.subtitle}</div>
                )}
              </div>
              
              <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink: 0, minHeight: 80 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:32, fontWeight:800 }}>
                    {isFree ? '$0' : `$${price}`}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize:14, color:'var(--muted)' }}>
                      {monthly ? '/mo' : '/yr'}
                    </span>
                  )}
                </div>
                {!isFree && !monthly && (
                  <div style={{ fontSize:12, color:'var(--muted)' }}>
                    ${pricePerMonth}/mo billed annually
                  </div>
                )}
                {p.savings && (
                  <div style={{ 
                    fontSize:11, 
                    fontWeight:600, 
                    color:'var(--success)', 
                    padding: '4px 8px', 
                    background: 'rgba(0, 195, 122, 0.1)', 
                    borderRadius: 4,
                    width: 'fit-content'
                  }}>
                    💰 {p.savings}
                  </div>
                )}
              </div>
              
              <div style={{ display:'flex', flexDirection:'column', gap:8, flex: 1 }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:8, fontSize:13 }}>What's included</div>
                  <ul style={{ margin:0, paddingLeft:20, display:'grid', gap:6, fontSize:13, lineHeight:1.6 }}>
                    {p.features.map((f,i)=>(
                      <li key={i} style={{ color:'var(--text)', display:'flex', alignItems:'start', gap:6 }}>
                        <span style={{ color:'var(--success)', flexShrink:0, marginTop:2 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {p.gated?.length > 0 && (
                  <div style={{ opacity:0.7, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontWeight:600, marginBottom:8, fontSize:13, color:'var(--muted)' }}>Not included</div>
                    <ul style={{ margin:0, paddingLeft:20, display:'grid', gap:6, fontSize:12, lineHeight:1.6 }}>
                      {p.gated.slice(0, 3).map((f,i)=>(
                        <li key={i} style={{ color:'var(--muted)', display:'flex', alignItems:'start', gap:6 }}>
                          <span style={{ color:'var(--muted)', flexShrink:0, marginTop:2 }}>✗</span>
                          <span>{f}</span>
                        </li>
                      ))}
                      {p.gated.length > 3 && (
                        <li style={{ color:'var(--muted)', fontSize:11 }}>
                          +{p.gated.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8, flexShrink: 0, marginTop: 'auto' }}>
                <button 
                  className={`btn ${isFree ? 'outline' : p.recommended ? 'primary' : 'primary'}`}
                  style={{ 
                    width: '100%',
                    fontWeight: p.recommended ? 600 : 500
                  }}
                >
                  {isFree ? 'Current Plan' : monthly ? 'Upgrade Now' : 'Upgrade Annually'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      { !monthly && (
        <div className="card" style={{ 
          display:'flex', 
          alignItems:'center', 
          gap:12,
          padding: 16,
          background: 'rgba(0, 186, 206, 0.1)',
          border: '1px solid rgba(0, 186, 206, 0.2)'
        }}>
          <div style={{ 
            fontSize: 24,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)',
            borderRadius: '50%',
            flexShrink: 0
          }}>
            💰
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight:600, marginBottom:4, fontSize:14 }}>Save up to 17% with Annual billing</div>
            <div style={{ color:'var(--muted)', fontSize:13, lineHeight:1.5 }}>
              Annual billing shows total yearly price; you typically save 2 months vs monthly billing.
            </div>
          </div>
        </div>
      )}

      {/* Full feature comparison */}
      <div className="card" style={{ 
        overflowX:'auto', 
        marginTop: 8,
        WebkitOverflowScrolling: 'touch',
        minWidth: 0
      }}>
        <div style={{ 
          fontWeight:700, 
          marginBottom:16, 
          fontSize:18,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>📊</span>
          <span>Full Feature Comparison</span>
        </div>
        <div style={{ 
          display:'grid', 
          gridTemplateColumns:`1.4fr repeat(${plans.length}, 1fr)`, 
          alignItems:'stretch', 
          gap:1,
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          minWidth: '600px' // Minimum width to enable horizontal scroll on mobile
        }}>
          {(() => {
            const isLightTheme = document.documentElement.classList.contains('light-theme');
            return (
              <>
                {/* Header row */}
                <div style={{ 
                  padding:'14px 16px', 
                  fontWeight:600, 
                  background: isLightTheme ? 'rgba(241, 243, 245, 0.8)' : 'rgba(0,0,0,.3)',
                  fontSize: 13
                }}>
                  Features
                </div>
                {plans.map(p => (
                  <div 
                    key={p.key} 
                    style={{ 
                      padding:'14px 16px', 
                      fontWeight:600, 
                      textAlign:'center',
                      background: p.recommended 
                        ? (isLightTheme ? 'rgba(0, 186, 206, 0.12)' : 'rgba(0, 186, 206, 0.1)')
                        : (isLightTheme ? 'rgba(241, 243, 245, 0.8)' : 'rgba(0,0,0,.3)'),
                      fontSize: 13,
                      borderLeft: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRight: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)'
                    }}
                  >
                    {p.name === 'Starter (Free)' ? 'Starter' : p.name}
                  </div>
                ))}
                {/* Rows */}
                {featureMatrix.map((row, idx) => {
                  const isHovered = hoveredRow === idx;
                  const getRowBackground = (isEven, isRecommended) => {
                    if (isHovered) {
                      return isLightTheme 
                        ? 'rgba(0, 186, 206, 0.15)' 
                        : 'rgba(0, 186, 206, 0.12)';
                    }
                    if (isRecommended) {
                      return isEven 
                        ? (isLightTheme ? 'rgba(0, 186, 206, 0.1)' : 'rgba(0, 186, 206, 0.08)')
                        : (isLightTheme ? 'rgba(0, 186, 206, 0.06)' : 'rgba(0, 186, 206, 0.05)');
                    }
                    return isEven 
                      ? (isLightTheme ? 'rgba(249, 250, 251, 0.6)' : 'rgba(0,0,0,.15)')
                      : (isLightTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0,0,0,.05)');
                  };
                  
                  return (
                    <React.Fragment key={idx}>
                      <div 
                        style={{ 
                          padding:'12px 16px', 
                          background: getRowBackground(idx % 2 === 0, false),
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredRow(idx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {row.label}{row.suffix || ''}
                      </div>
                      {plans.map(p => (
                        <div 
                          key={p.key+idx} 
                          style={{ 
                            padding:'12px 16px', 
                            textAlign:'center',
                            background: getRowBackground(idx % 2 === 0, p.recommended),
                            fontSize: 13,
                            borderLeft: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                            borderRight: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          {typeof row.keys[p.key] === 'boolean' ? (
                            row.keys[p.key] ? (
                              <span style={{ fontSize: 16 }}>✓</span>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>—</span>
                            )
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{row.keys[p.key]}</span>
                          )}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}


