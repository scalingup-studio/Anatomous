import React from "react";
import { Modal } from "../../components/Modal.jsx";
import { useNotifications } from "../../api/NotificationContext.jsx";
import useOpenAI from "../../hooks/useOpenAI.js";
import { ThemeToggle } from "../../components/ThemeToggle.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";

export default function DashboardSettings(){
  const [activeTab, setActiveTab] = React.useState("notifications");
  const { showSuccess } = useNotifications();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="dash-toolbar" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
      </div>

      {/* Tabs (match Goals styling) */}
      <div role="tablist" aria-label="Settings navigation" style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>
        {[
          { id: 'notifications', label: 'Notifications' },
          { id: 'privacy', label: 'Privacy Preferences' },
          { id: 'account', label: 'Account & Login' },
        
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            role="tab"
            aria-selected={activeTab === t.id}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: activeTab === t.id ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === t.id ? 600 : 400,
              borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'notifications' && <NotificationsTab onSaved={()=>showSuccess('Notification settings saved')} />}
      {activeTab === 'privacy' && <PrivacyTab onSaved={()=>showSuccess('Privacy preferences updated')} onAction={(msg)=>showSuccess(msg)} />}
      {activeTab === 'account' && <AccountTab onSaved={()=>showSuccess('Account settings saved')} onAction={(msg)=>showSuccess(msg)} />}
    </div>
  );
}

function NotificationsTab({ onSaved }){
  const [summary, setSummary] = React.useState('weekly');
  const [alerts, setAlerts] = React.useState(true);
  const [insights, setInsights] = React.useState(true);
  const [product, setProduct] = React.useState(false);
  const [snooze, setSnooze] = React.useState('off');
  const [channels, setChannels] = React.useState({ email:true, sms:false, inapp:true });

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop:0 }}>Notifications</h3>
      <p style={{ marginTop:4, color:'var(--muted)', fontSize:12 }}>Choose how and when we contact you.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-field">
          <label>Summary emails</label>
          <select value={summary} onChange={(e)=>setSummary(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div className="form-field">
          <label>Snooze alerts</label>
          <select value={snooze} onChange={(e)=>setSnooze(e.target.value)}>
            <option value="off">Off</option>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
          </select>
        </div>
        <label className="checkbox"><input type="checkbox" checked={alerts} onChange={(e)=>setAlerts(e.target.checked)} /> <span>Health alert notifications</span></label>
        <label className="checkbox"><input type="checkbox" checked={insights} onChange={(e)=>setInsights(e.target.checked)} /> <span>New AI insight availability</span></label>
        <label className="checkbox"><input type="checkbox" checked={product} onChange={(e)=>setProduct(e.target.checked)} /> <span>Product updates & announcements</span></label>
      </div>
      <div style={{ height:12 }} />
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ fontSize:12, color:'var(--muted)' }}>Channels:</div>
        <label className="checkbox"><input type="checkbox" checked={channels.email} onChange={(e)=>setChannels(s=>({...s,email:e.target.checked}))} /> <span>Email</span></label>
        <label className="checkbox"><input type="checkbox" checked={channels.sms} onChange={(e)=>setChannels(s=>({...s,sms:e.target.checked}))} /> <span>SMS</span></label>
        <label className="checkbox"><input type="checkbox" checked={channels.inapp} onChange={(e)=>setChannels(s=>({...s,inapp:e.target.checked}))} /> <span>In‑app</span></label>
      </div>
      <div style={{ height:16 }} />
      <button className="btn primary" style={{ width:160 }} onClick={()=>onSaved && onSaved()}>Save changes</button>
    </div>
  );
}

function PrivacyTab({ onSaved, onAction }){
  const { isLight } = useTheme();
  const [dataVisibility, setDataVisibility] = React.useState('default');
  const [aiOptIn, setAiOptIn] = React.useState(true);
  const [retention, setRetention] = React.useState('12m');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmType, setConfirmType] = React.useState('download');
  
  // AI processing preferences
  const [aiHealthHistory, setAiHealthHistory] = React.useState(true);
  const [aiHealthData, setAiHealthData] = React.useState(true);
  const [aiMedicalRecords, setAiMedicalRecords] = React.useState(true);
  const [aiNotes, setAiNotes] = React.useState(true);

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Appearance Settings */}
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>Appearance</h3>
        <p style={{ marginTop:4, marginBottom:16, color:'var(--muted)', fontSize:12, lineHeight:1.5 }}>
          Choose your preferred theme for comfort and accessibility.
        </p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '12px 0' }}>
          <div>
            <div style={{ fontWeight:600, marginBottom:4, fontSize:14 }}>Theme</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Switch between dark and light mode</div>
          </div>
          <ThemeToggle showLabel={true} size="default" />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>Privacy Preferences</h3>
        <p style={{ marginTop:4, color:'var(--muted)', fontSize:12 }}>Control visibility, retention and AI processing of your data.</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-field">
            <label>Data visibility</label>
            <select value={dataVisibility} onChange={(e)=>setDataVisibility(e.target.value)}>
              <option value="default">Show all in app</option>
              <option value="hide_vitals">Hide sensitive vitals</option>
              <option value="minimal">Minimal display</option>
            </select>
          </div>

          <div className="form-field">
            <label>Data retention</label>
            <select value={retention} onChange={(e)=>setRetention(e.target.value)}>
              <option value="6m">6 months</option>
              <option value="12m">12 months</option>
              <option value="24m">24 months</option>
              <option value="forever">Keep until I delete</option>
            </select>
          </div>

          <label className="checkbox" style={{ gridColumn:'1 / -1' }}><input type="checkbox" checked={aiOptIn} onChange={(e)=>setAiOptIn(e.target.checked)} /> <span>Allow AI processing for insights</span></label>
        </div>
      </div>

      {/* AI Processing Preferences */}
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>AI Processing Preferences</h3>
        <p style={{ marginTop:4, marginBottom:16, color:'var(--muted)', fontSize:12, lineHeight:1.5 }}>
          Data processing preferences determine which types of information may be used by the AI engine to generate insights.
        </p>
        <div style={{ display:'grid', gap:12 }}>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiHealthHistory} 
              onChange={(e)=>setAiHealthHistory(e.target.checked)} 
            /> 
            <span>Health history information</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiHealthData} 
              onChange={(e)=>setAiHealthData(e.target.checked)} 
            /> 
            <span>Health data (metrics, e.g., last 7 days)</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiMedicalRecords} 
              onChange={(e)=>setAiMedicalRecords(e.target.checked)} 
            /> 
            <span>Medical record uploads (de-identified)</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiNotes} 
              onChange={(e)=>setAiNotes(e.target.checked)} 
            /> 
            <span>Notes/journal entries</span>
          </label>
        </div>
        <button className="btn primary" style={{ width:180 , marginTop:16 }} onClick={()=>onSaved && onSaved()}>Save preferences</button>
      </div>
      {/* Data management block */}
      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Data management</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn outline" onClick={()=>{ setConfirmType('download'); setConfirmOpen(true); }}>Download my data</button>
          <button className="btn danger" onClick={()=>{ setConfirmType('delete'); setConfirmOpen(true); }}>Delete my data</button>
        </div>
      </div>
      

      {/* Policy links separate block */}
   
      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Policies & Help</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <a className="btn ghost" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          <a className="btn ghost" href="/faq" target="_blank" rel="noreferrer">Data Rights FAQ</a>
        </div>
      </div>

      <Modal open={confirmOpen} title={confirmType === 'delete' ? 'Delete your data' : 'Download your data'} onClose={()=>setConfirmOpen(false)}>
        {confirmType === 'delete' ? (
          <div>
            <p>Deleting your data is permanent and cannot be undone. Are you sure?</p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn ghost" onClick={()=>setConfirmOpen(false)}>Cancel</button>
              <button className="btn danger" onClick={()=>{ setConfirmOpen(false); onAction && onAction('Data deletion requested'); }}>Delete permanently</button>
            </div>
          </div>
        ) : (
          <div>
            <p>We will prepare a downloadable archive of your data and notify you when it’s ready.</p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn primary" onClick={()=>{ setConfirmOpen(false); onAction && onAction('Data export requested'); }}>OK</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AccountTab({ onSaved, onAction }){
  const { isLight } = useTheme();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mfa, setMfa] = React.useState(false);
  const [devices] = React.useState([
    { id:'d1', name:'Chrome on macOS', last:'Just now' },
    { id:'d2', name:'iPhone', last:'Last week' },
  ]);
  const [dangerOpen, setDangerOpen] = React.useState(false);
  const [dangerType, setDangerType] = React.useState('deactivate');

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Inputs block */}
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>Account & Login</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-field">
            <label>Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <div style={{ height:8 }} />
        <label className="checkbox"><input type="checkbox" checked={mfa} onChange={(e)=>setMfa(e.target.checked)} /> <span>Enable multi‑factor authentication (MFA)</span></label>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <button className="btn primary" onClick={()=>onSaved && onSaved()}>Save changes</button>
        </div>
     </div>

     

      {/* Devices & Sessions */}
      <div className="card" style={{ 
        background: isLight 
          ? 'rgba(241, 243, 245, 0.6)' 
          : 'rgba(0,0,0,.25)', 
        maxWidth: 720 
      }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Devices & Sessions</div>
        {devices.map(d => (
          <div key={d.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
            <div>{d.name}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{d.last}</span>
              <button className="btn ghost small" onClick={()=>onAction && onAction('Session revoked')}>Revoke</button>
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ 
        border: isLight
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : '1px solid #532323', 
        background: isLight
          ? 'rgba(254, 242, 242, 0.8)'
          : 'rgba(180,30,30,.08)', 
        marginBottom:16, 
        maxWidth: 720 
      }}>
        <div style={{ 
          fontWeight:700, 
          color: isLight ? '#dc2626' : '#c33', 
          marginBottom:8 
        }}>
          Danger Zone
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn outline" onClick={()=>{ setDangerType('deactivate'); setDangerOpen(true); }}>Deactivate account</button>
          <button className="btn danger" onClick={()=>{ setDangerType('delete'); setDangerOpen(true); }}>Delete account</button>
        </div>
      </div>

     

      <Modal open={dangerOpen} title={dangerType === 'delete' ? 'Delete account' : 'Deactivate account'} onClose={()=>setDangerOpen(false)}>
        {dangerType === 'delete' ? (
          <div>
            <p>This action will permanently delete your account and all data. Please type DELETE to confirm.</p>
            <input placeholder="Type DELETE" style={{ width:'100%', padding:'8px 12px', marginTop:8 }} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button className="btn ghost" onClick={()=>setDangerOpen(false)}>Cancel</button>
              <button className="btn danger" onClick={()=>{ setDangerOpen(false); onAction && onAction('Account deletion requested'); }}>Delete permanently</button>
            </div>
          </div>
        ) : (
          <div>
            <p>Your account will be temporarily deactivated. You can reactivate anytime by logging in.</p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn ghost" onClick={()=>setDangerOpen(false)}>Cancel</button>
              <button className="btn outline" onClick={()=>{ setDangerOpen(false); onAction && onAction('Account deactivation requested'); }}>Deactivate</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function HelpCenterTab(){
  const categories = [
    {
      id:'getting_started', title:'Getting Started', faqs:[
        { q:'How do I create an account?', a:'Go to Signup, enter your email and a strong password, then confirm via email.' },
        { q:'How do I fill out my health profile?', a:'Open Profile → Personal and Health History sections, then Save.' },
        { q:'Where do I view my insights?', a:'Insights are available in Dashboard → Insights after data is processed.' },
      ]
    },
    {
      id:'insights', title:'Understanding Insights', faqs:[
        { q:'What do the insights mean?', a:'Insights provide educational guidance based on your data; not medical advice.' },
        { q:'Are the insights medical advice?', a:'No. They are educational only. Consult a healthcare professional for medical advice.' },
        { q:'How often are insights updated?', a:'After new data uploads or when you request a refresh.' },
      ]
    },
    {
      id:'privacy', title:'Privacy & Data', faqs:[
        { q:'Can I delete my data?', a:'Yes. Settings → Privacy → Data management → Delete my data.' },
        { q:'Is my information private?', a:'We store data securely; control visibility in Settings → Privacy.' },
        { q:'How do I control what is shared?', a:'Use Data visibility and Goal visibility settings to control sharing.' },
      ]
    },
    {
      id:'billing', title:'Billing & Subscriptions', faqs:[
        { q:'What’s included in each subscription tier?', a:'Each plan lists features on the pricing page. Upgrades unlock advanced analytics.' },
        { q:'How do I upgrade or cancel my plan?', a:'Go to Billing in your account (coming soon) or contact support.' },
        { q:'Where can I find my payment history?', a:'Billing → History (coming soon).' },
      ]
    },
    {
      id:'technical', title:'Technical Support', faqs:[
        { q:'Trouble logging in?', a:'Try resetting your password or clearing browser cookies.' },
        { q:'How to reset your password?', a:'Use Forgot Password on the Login page and follow the instructions.' },
        { q:'Supported browsers and devices', a:'Latest Chrome, Safari, Firefox, Edge; modern iOS/Android browsers.' },
      ]
    },
  ];

  const [open, setOpen] = React.useState({});
  const toggle = (key) => setOpen(v => ({ ...v, [key]: !v[key] }));

  const { conversation, sendMessage, loading, clearConversation } = useOpenAI();
  const [prompt, setPrompt] = React.useState("");

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>
      {/* FAQ column */}
      <div className="card" style={{ display:'grid', gap:8 }}>
        <h3 style={{ marginTop:0 }}>Help Center</h3>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding:12 }}>
            <button className="btn ghost" onClick={()=>toggle(cat.id)} style={{ justifyContent:'space-between', display:'flex', width:'100%' }}>
              <span>{cat.title}</span>
              <span>{open[cat.id] ? '▾' : '▸'}</span>
            </button>
            {open[cat.id] && (
              <div style={{ marginTop:8, display:'grid', gap:8 }}>
                {cat.faqs.map((f, idx) => (
                  <div key={idx} className="card" style={{ padding:12 }}>
                    <div style={{ fontWeight:600 }}>{f.q}</div>
                    <div style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>{f.a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI chat column */}
      <div className="card" style={{ display:'flex', flexDirection:'column', gap:8, minHeight: 420 }}>
        <h3 style={{ marginTop:0 }}>Ask anything</h3>
        <div style={{ flex:1, overflowY:'auto', display:'grid', gap:8, paddingRight:4 }}>
          {conversation.length === 0 && (
            <div style={{ color:'var(--muted)', fontSize:13 }}>Try: "How do I export my data?" or "Where can I view my past labs?"</div>
          )}
          {conversation.map((m, i) => (
            <div key={i} className="card" style={{ background: m.role==='user' ? 'rgba(0,186,206,0.08)' : 'rgba(255,255,255,0.03)', border:'1px solid var(--border)', padding:12 }}>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{m.role === 'user' ? 'You' : 'Assistant'}</div>
              <div style={{ marginTop:4, whiteSpace:'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
        </div>
        <div className="form-row">
          <div className="form-field" style={{ flex:1 }}>
            <label>Ask your question</label>
            <input value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Type your question..." onKeyDown={(e)=>{ if(e.key==='Enter' && prompt.trim()) { sendMessage(prompt.trim()); setPrompt(''); } }} />
          </div>
          <div style={{ alignSelf:'end' }}>
            <button className="btn primary" disabled={!prompt.trim() || loading} onClick={()=>{ if(!prompt.trim()) return; sendMessage(prompt.trim()); setPrompt(''); }}>{loading ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>AI assistant uses help content for guidance. Not medical advice.</div>
          <button className="btn ghost small" onClick={clearConversation}>Clear</button>
        </div>
      </div>
    </div>
  );
}


