import React from "react";

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
  // Mock of the active plan; replace with API later
  const active = {
    name: "Core",
    tier: "Pro+ Active",
    renewal: "2025-12-31",
    limits: { familyUsed: 1, familyMax: 3 },
    features: [
      "AI insights",
      "Vitals & labs tracking",
      "Reports export (PDF)",
      "Goals & notes",
    ],
  };

  return (
    <div className="card" style={{ display:'grid', gap:12, maxWidth: 920 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>{active.name}</div>
          <div style={{ color:'var(--muted)', fontSize:12 }}>Renews on {active.renewal}</div>
        </div>
        <Badge>{active.tier}</Badge>
      </div>

      <div className="card" style={{ background:'rgba(0,0,0,.25)' }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Included features</div>
        <ul style={{ margin:0, paddingLeft:18 }}>
          {active.features.map((f, i) => (<li key={i}>✅ {f}</li>))}
        </ul>
      </div>

      <div className="card">
        <div style={{ fontWeight:600, marginBottom:8 }}>Active limits</div>
        <div style={{ display:'grid', gap:8 }}>
          <div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Family profiles</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className="btn outline small" style={{ pointerEvents:'none' }}>{active.limits.familyUsed}/{active.limits.familyMax}</div>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                <div style={{ width:`${(active.limits.familyUsed/active.limits.familyMax)*100}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
              </div>
            </div>
          </div>
          <div className="btn outline small" style={{ width:'fit-content', pointerEvents:'none' }}>Exports: Unlimited</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn outline">Manage billing</button>
        <button className="btn primary">Upgrade</button>
      </div>
    </div>
  );
}

function UpgradeOptions() {
  const [period, setPeriod] = React.useState("monthly");
  const monthly = period === "monthly";
  const plans = [
    { key:'free', name:'Free', priceMonthly:0, priceYearly:0, features:['Basic tracking','Limited insights'], gated:['Reports','Advanced insights'], ribbon:'Free Tier' },
    { key:'core', name:'Core', priceMonthly:9, priceYearly:90, features:['AI insights','Reports (PDF)','Goals'], gated:['Family profiles'], ribbon:'Most popular' },
    { key:'complete', name:'Complete', priceMonthly:19, priceYearly:190, features:['Everything in Core','Labs import','Data export CSV'], gated:['Family add-ons'], ribbon:'Best value' },
    { key:'family', name:'Family', priceMonthly:29, priceYearly:290, features:['Complete for 3 profiles','Shared reports'], gated:['Extra profiles'] },
  ];

  // Feature matrix (show everything in one place, as is common in pricing pages)
  const featureMatrix = [
    { label: 'AI insights', keys: { free:false, core:true, complete:true, family:true } },
    { label: 'Reports (PDF export)', keys: { free:false, core:true, complete:true, family:true } },
    { label: 'CSV data export', keys: { free:false, core:false, complete:true, family:true } },
    { label: 'Labs import', keys: { free:false, core:false, complete:true, family:true } },
    { label: 'Goals & notes', keys: { free:false, core:true, complete:true, family:true } },
    { label: 'Family profiles included', suffix:' (count)', keys: { free:'—', core:'—', complete:'—', family:'3' } },
    { label: 'Share reports with providers', keys: { free:false, core:true, complete:true, family:true } },
    { label: 'Priority support', keys: { free:false, core:false, complete:true, family:true } },
    { label: 'Advanced insights', keys: { free:false, core:false, complete:true, family:true } },
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12 }}>
        {plans.map(p => (
          <div key={p.key} className="card" style={{ display:'grid', gap:8, position:'relative' }}>
            {p.ribbon && (
              <div style={{ position:'absolute', top:8, right:8 }}><Badge tone={p.ribbon==='Free Tier' ? 'secondary' : 'success'}>{p.ribbon}</Badge></div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700 }}>{p.name}</div>
            </div>
            <div style={{ fontSize:26, fontWeight:800 }}>
              {p.key === 'free' ? '$0' : `$${monthly ? p.priceMonthly : p.priceYearly}`}<span style={{ fontSize:12, color:'var(--muted)' }}>{p.key === 'free' ? '' : monthly ? '/mo' : '/yr'}</span>
            </div>
            <div>
              <div style={{ fontWeight:600, marginBottom:6 }}>Includes</div>
              <ul style={{ margin:0, paddingLeft:18 }}>
                {p.features.map((f,i)=>(<li key={i}>✅ {f}</li>))}
              </ul>
            </div>
            {p.gated?.length > 0 && (
              <div style={{ opacity:.6 }}>
                <div style={{ fontWeight:600, marginTop:6, marginBottom:6 }}>Locked</div>
                <ul style={{ margin:0, paddingLeft:18 }}>
                  {p.gated.map((f,i)=>(<li key={i}>🔒 {f}</li>))}
                </ul>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className={`btn ${p.key==='free' ? 'secondary' : 'primary'}`}>{p.key==='free' ? 'Stay on Free' : monthly ? 'Upgrade (mo)' : 'Upgrade (yr)'}</button>
            </div>
          </div>
        ))}
      </div>

      { !monthly && (
        <div className="card" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:600 }}>Tip:</span>
          <span style={{ color:'var(--muted)', fontSize:13 }}>Annual billing shows total yearly price; you typically save 2 months vs monthly.</span>
        </div>
      )}

      {/* Full feature comparison */}
      <div className="card" style={{ overflowX:'auto' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Full Feature Comparison</div>
        <div style={{ display:'grid', gridTemplateColumns:`1.4fr repeat(${plans.length}, 1fr)`, alignItems:'stretch', gap:1 }}>
          {/* Header row */}
          <div style={{ padding:'10px 12px', fontWeight:600 }}>Features</div>
          {plans.map(p => (
            <div key={p.key} style={{ padding:'10px 12px', fontWeight:600, textAlign:'center' }}>{p.name}</div>
          ))}
          {/* Rows */}
          {featureMatrix.map((row, idx) => (
            <React.Fragment key={idx}>
              <div style={{ padding:'10px 12px', background:'rgba(0,0,0,.15)' }}>{row.label}{row.suffix || ''}</div>
              {plans.map(p => (
                <div key={p.key+idx} style={{ padding:'10px 12px', textAlign:'center' }}>
                  {typeof row.keys[p.key] === 'boolean' ? (
                    row.keys[p.key] ? '✅' : '—'
                  ) : (
                    row.keys[p.key]
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}


