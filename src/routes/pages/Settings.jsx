import React from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
import { useNotifications } from "../../api/NotificationContext.jsx";
import useOpenAI from "../../hooks/useOpenAI.js";
import { ThemeToggle } from "../../components/ThemeToggle.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import { NotificationsApi } from "../../api/notificationsApi.js";
import { useAuth } from "../../api/AuthContext.jsx";
import { AccountApi } from "../../api/accountApi.js";
import { UserSettingsApi } from "../../api/userSettingsApi.js";

export default function DashboardSettings(){
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const validTabs = ["notifications", "privacy", "account"];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "notifications";

  const [activeTab, setActiveTab] = React.useState(initialTab);
  const { showSuccess } = useNotifications();

  // Синхронізація таба з URL при зміні
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", newTab);
    setSearchParams(newSearchParams, { replace: true });
  };

  // Оновлення локального стану, якщо tab змінено зовні через URL
  React.useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
            onClick={() => handleTabChange(t.id)}
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

      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'privacy' && <PrivacyTab />}
      {activeTab === 'account' && <AccountTab />}
    </div>
  );
}

function NotificationsTab(){
  const { user } = useAuth();
  const { showNotification, showError, showSuccess } = useNotifications();
  const [summary, setSummary] = React.useState('weekly');
  const [alerts, setAlerts] = React.useState(true);
  const [insights, setInsights] = React.useState(true);
  const [product, setProduct] = React.useState(true);
  const [snooze, setSnooze] = React.useState('off');
  const [channels, setChannels] = React.useState({ email:true, sms:false, inapp:true });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  // Map backend summary_email_frequency -> local value
  const mapSummaryFromApi = (freq) => {
    if (!freq || freq === 'none') return 'off';
    if (['daily','weekly','monthly'].includes(freq)) return freq;
    return 'weekly';
  };

  // Map local value -> backend summary_email_frequency
  const mapSummaryToApi = (value) => {
    if (!value || value === 'off') return 'none';
    return value;
  };

  // Map muted_until -> snooze value
  const mapSnoozeFromApi = (muted_until) => {
    if (!muted_until) return 'off';
    const mutedAt = new Date(muted_until);
    if (Number.isNaN(mutedAt.getTime())) return 'off';
    const diffMs = mutedAt.getTime() - Date.now();
    if (diffMs <= 0) return 'off';
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    if (diffMs <= oneHour + 5 * 60 * 1000) return '1h';
    if (diffMs <= oneDay + 30 * 60 * 1000) return '24h';
    return '7d';
  };

  const computeMutedUntilFromSnooze = (value) => {
    if (!value || value === 'off') return null;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    let delta = 0;
    if (value === '1h') delta = oneHour;
    else if (value === '24h') delta = oneDay;
    else if (value === '7d') delta = 7 * oneDay;
    if (!delta) return null;
    // Backend expects numeric timestamptz (ms since epoch)
    return now + delta;
  };

  // Load preferences on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        setLoading(true);
        const prefs = await NotificationsApi.getPreferences();
        console.log("🔔 Loaded notification preferences:", prefs);

        if (!prefs || prefs.error) {
          // If no preferences exist yet, keep defaults
          if (prefs?.error) {
            console.warn("Notification preferences not found:", prefs.error);
          }
          return;
        }

        if (!isMounted) return;

        setSummary(mapSummaryFromApi(prefs.summary_email_frequency));
        setAlerts(prefs.health_alerts_enabled !== false);
        setInsights(prefs.ai_insight_enabled !== false);
        setProduct(prefs.product_updates_enabled !== false);
        setSnooze(mapSnoozeFromApi(prefs.muted_until));
        setChannels({
          // API returns channel_email (bool) for email channel
          email: prefs.channel_email !== false,
          // SMS / in-app channels можуть конфігуруватися окремо, залишаємо локально
          sms: false,
          inapp: true,
        });
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
        showNotification(
          error?.message || "Failed to load notification preferences. Using defaults.",
          "error"
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [showNotification]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        summary_email_frequency: mapSummaryToApi(summary),
        health_alerts_enabled: !!alerts,
        ai_insight_enabled: !!insights,
        product_updates_enabled: !!product,
        muted_until: computeMutedUntilFromSnooze(snooze),
        // API очікує email_enabled (bool) для каналу email
        email_enabled: !!channels.email,
      };

      console.log("🔔 Updating notification preferences with payload:", payload);

      const updated = await NotificationsApi.updatePreferences(payload);
      console.log("✅ Notification preferences updated:", updated);

      showSuccess("Notification settings saved");
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      showError(
        error?.message || "Failed to save notification settings. Please try again.",
        6000
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestInsight = async () => {
    if (!user?.id) {
      showError("User ID is required to send a test notification.");
      return;
    }
    try {
      setTesting(true);
      await NotificationsApi.sendAiInsightNotification({
        user_id: user.id,
        subject: "Test AI Insight",
        message: "This is a test AI Insight notification from your settings page.",
      });
      showSuccess("Test AI Insight notification sent (if enabled in your preferences).");
    } catch (error) {
      console.error("Failed to send test AI Insight notification:", error);
      showError(error?.message || "Failed to send test AI Insight notification.");
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestHealthAlert = async () => {
    if (!user?.id) {
      showError("User ID is required to send a test notification.");
      return;
    }
    try {
      setTesting(true);
      await NotificationsApi.sendHealthAlertNotification({
        user_id: user.id,
        subject: "Test Health Alert",
        message: "This is a test Health Alert notification from your settings page.",
      });
      showSuccess("Test health alert notification sent (if enabled in your preferences).");
    } catch (error) {
      console.error("Failed to send test health alert notification:", error);
      showError(error?.message || "Failed to send test health alert notification.");
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestProductUpdate = async () => {
    if (!user?.id) {
      showError("User ID is required to send a test notification.");
      return;
    }
    try {
      setTesting(true);
      await NotificationsApi.sendProductUpdateNotification({
        user_id: user.id,
        subject: "Test Product Update",
        message: "This is a test Product Update notification from your settings page.",
      });
      showSuccess("Test product update notification sent (if enabled in your preferences).");
    } catch (error) {
      console.error("Failed to send test product update notification:", error);
      showError(error?.message || "Failed to send test product update notification.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop:0 }}>Notifications</h3>
      <p style={{ marginTop:4, color:'var(--muted)', fontSize:12 }}>
        Choose how and when we contact you. These settings control summary emails and alerts.
      </p>

      {loading && (
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>
          Loading your notification preferences...
        </div>
      )}

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
        <label className="checkbox">
          <input
            type="checkbox"
            checked={alerts}
            onChange={(e)=>setAlerts(e.target.checked)}
          />{" "}
          <span>Health alert notifications</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={insights}
            onChange={(e)=>setInsights(e.target.checked)}
          />{" "}
          <span>New AI insight availability</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={product}
            onChange={(e)=>setProduct(e.target.checked)}
          />{" "}
          <span>Product updates &amp; announcements</span>
        </label>
      </div>

      <div style={{ height:12 }} />

      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ fontSize:12, color:'var(--muted)' }}>Channels:</div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={channels.email}
            onChange={(e)=>setChannels(s=>({...s,email:e.target.checked}))}
          />{" "}
          <span>Email</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={channels.sms}
            onChange={(e)=>setChannels(s=>({...s,sms:e.target.checked}))}
          />{" "}
          <span>SMS</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={channels.inapp}
            onChange={(e)=>setChannels(s=>({...s,inapp:e.target.checked}))}
          />{" "}
          <span>In‑app</span>
        </label>
      </div>

      <div style={{ height:16 }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <button
          className="btn primary"
          style={{ width:160 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

     
      </div>
    </div>
  );
}

function PrivacyTab(){
  const { isLight } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [dataVisibility, setDataVisibility] = React.useState('show_all');
  const [aiOptIn, setAiOptIn] = React.useState(true);
  const [retention, setRetention] = React.useState('12m');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmType, setConfirmType] = React.useState('download');
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  
  // AI processing preferences
  const [aiHealthHistory, setAiHealthHistory] = React.useState(true);
  const [aiHealthData, setAiHealthData] = React.useState(true);
  const [aiMedicalRecords, setAiMedicalRecords] = React.useState(true);
  const [aiNotes, setAiNotes] = React.useState(true);
  const [aiGoals, setAiGoals] = React.useState(true);
  // Останні сирі налаштування з /get_ai_preferences (для мерджа при update_settings)
  const [lastApiPrefs, setLastApiPrefs] = React.useState(null);

  // Map API data_visibility -> local
  const mapVisibilityFromApi = (value) => {
    if (value === 'hide_some') return 'hide_some';
    if (value === 'show_min') return 'show_min';
    return 'show_all';
  };

  const mapVisibilityToApi = (value) => {
    if (value === 'hide_some') return 'hide_some';
    if (value === 'show_min') return 'show_min';
    return 'show_all';
  };

  const mapRetentionFromApi = (value) => {
    if (['6m', '24m', 'none'].includes(value)) return value;
    return '12m';
  };

  const mapRetentionToApi = (value) => {
    if (['6m', '12m', '24m', 'none'].includes(value)) return value;
    return '12m';
  };

  // Helper to apply preferences from API response to local state
  const applyAiPreferences = (raw) => {
    if (!raw || typeof raw !== "object") return;

    const prefs = raw.ai_preferences || raw.result?.ai_preferences || raw.result || raw;
    if (!prefs || typeof prefs !== "object") return;

    // Зберігаємо останні prefs для подальших мерджів при оновленні
    setLastApiPrefs(prefs);

    setDataVisibility(mapVisibilityFromApi(prefs.data_visibility));
    setRetention(mapRetentionFromApi(prefs.data_retention));

    const hh = prefs.health_history_enabled !== false;
    const vm = prefs.vital_metrics_enabled !== false;
    const mr = prefs.medical_record_uploads_enabled !== false;
    const nt = prefs.notes_enabled !== false;
    const gl = prefs.goals_enabled !== false;

    setAiHealthHistory(hh);
    setAiHealthData(vm);
    setAiMedicalRecords(mr);
    setAiNotes(nt);
    setAiGoals(gl);

    // aiOptIn вважаємо true, якщо хоча б один тип даних дозволений
    setAiOptIn(hh || vm || mr || nt || gl);
  };

  // Load AI preferences on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        setLoading(true);
        const res = await UserSettingsApi.getAiPreferences();
        console.log("🛡️ Loaded AI preferences:", res);
        if (!isMounted) return;
        applyAiPreferences(res);
      } catch (error) {
        console.error("Failed to load AI preferences:", error);
        showError(error?.message || "Failed to load privacy preferences.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Only attempt to load if we have a user
    if (user?.id) {
      loadPreferences();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, showError]);

  const handleSavePrivacy = async () => {
    try {
      setSaving(true);

      const baseEnabled = !!aiOptIn;

      // Починаємо з останніх prefs з бекенда, щоб не втрачати поля,
      // які наразі не редагуються на фронті
      const merged = {
        ...(lastApiPrefs || {}),
      };

      // Перезаписуємо значення на основі поточного стану UI
      merged.health_history_enabled = baseEnabled && aiHealthHistory;
      merged.vital_metrics_enabled = baseEnabled && aiHealthData;
      merged.medical_record_uploads_enabled = baseEnabled && aiMedicalRecords;
      merged.notes_enabled = baseEnabled && aiNotes;
      merged.goals_enabled = baseEnabled && aiGoals;
      merged.data_visibility = mapVisibilityToApi(dataVisibility);
      merged.data_retention = mapRetentionToApi(retention);

      const prefs = merged;

      console.log("🛡️ Updating AI preferences with payload:", prefs);
      const res = await UserSettingsApi.updateAiPreferences(prefs);
      console.log("✅ AI preferences updated:", res);
      // Локально оновлюємо lastApiPrefs, не перезавантажуючи з бекенда
      setLastApiPrefs(prefs);
      showSuccess("Privacy preferences updated");
    } catch (error) {
      console.error("Failed to update AI preferences:", error);
      showError(error?.message || "Failed to save privacy preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibilityOnly = async () => {
    try {
      // Мерджимо тільки visibility/retention в останні prefs
      const merged = {
        ...(lastApiPrefs || {}),
      };
      merged.data_visibility = mapVisibilityToApi(dataVisibility);
      merged.data_retention = mapRetentionToApi(retention);

      console.log("🛡️ Updating visibility/retention only with merged payload:", merged);
      await UserSettingsApi.updateAiPreferences(merged);
      // Локально оновлюємо lastApiPrefs
      setLastApiPrefs(merged);
      showSuccess("Visibility preferences updated");
    } catch (error) {
      console.error("Failed to update visibility preferences:", error);
      showError(error?.message || "Failed to save visibility preferences.");
    }
  };

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
              <option value="show_all">Show all in app</option>
              <option value="hide_some">Hide sensitive vitals</option>
              <option value="show_min">Minimal display</option>
            </select>
          </div>

          <div className="form-field">
            <label>Data retention</label>
            <select value={retention} onChange={(e)=>setRetention(e.target.value)}>
              <option value="6m">6 months</option>
              <option value="12m">12 months</option>
              <option value="24m">24 months</option>
              <option value="none">Keep until I delete</option>
            </select>
          </div>

          <label className="checkbox" style={{ gridColumn:'1 / -1' }}><input type="checkbox" checked={aiOptIn} onChange={(e)=>setAiOptIn(e.target.checked)} /> <span>Allow AI processing for insights</span></label>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
          <button
            className="btn outline"
            type="button"
            onClick={handleSaveVisibilityOnly}
          >
            Save visibility
          </button>
        </div>
      </div>

      {/* AI Processing Preferences */}
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>AI Processing Preferences</h3>
        <p style={{ marginTop:4, marginBottom:16, color:'var(--muted)', fontSize:12, lineHeight:1.5 }}>
        Data processing preferences determine which types of information may be used by the AI engine to generate insights. Your preferences control what the AI can analyze. Disabling an item may limit the depth or personalization of insights.
        </p>
        <div style={{ display:'grid', gap:12 }}>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiHealthHistory} 
              onChange={(e)=>setAiHealthHistory(e.target.checked)} 
            /> 
            <span>Health history (conditions, medications, allergies)</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiHealthData} 
              onChange={(e)=>setAiHealthData(e.target.checked)} 
            /> 
            <span>Health data & vital metrics (e.g., heart rate, sleep, activity)</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiMedicalRecords} 
              onChange={(e)=>setAiMedicalRecords(e.target.checked)} 
            /> 
            <span>Medical record uploads (de-identified before processing)</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiNotes} 
              onChange={(e)=>setAiNotes(e.target.checked)} 
            /> 
            <span>Notes & journal entries</span>
          </label>
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={aiGoals} 
              onChange={(e)=>setAiGoals(e.target.checked)} 
            /> 
            <span>Goals & progress entries</span>
          </label>
        </div>
        <button
          className="btn primary"
          style={{ width:180 , marginTop:16 }}
          onClick={handleSavePrivacy}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </div>
      {/* Data management block */}
      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Data management</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn outline" onClick={()=>{ setConfirmType('download'); setConfirmOpen(true); }}>Download my data</button>
          <button className="btn danger" onClick={()=>{ 
            setConfirmType('delete'); 
            setDeleteConfirmText('');
            setConfirmOpen(true); 
          }}>Delete my data</button>
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

      <Modal open={confirmOpen} title={confirmType === 'delete' ? 'Delete your data' : 'Download your data'} onClose={()=>{
        setConfirmOpen(false);
        setDeleteConfirmText('');
      }}>
        {confirmType === 'delete' ? (
          <div>
            <p style={{ marginBottom: 12 }}>Deleting your data is permanent and cannot be undone. Please type <strong>delete</strong> to confirm.</p>
            <input 
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type delete"
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                marginBottom: 12,
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--bg)',
                color: 'var(--text)'
              }} 
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn ghost" onClick={()=>{
                setConfirmOpen(false);
                setDeleteConfirmText('');
              }}>Cancel</button>
              <button 
                className="btn danger" 
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                onClick={async ()=>{ 
                  try {
                    await AccountApi.deleteUserData();
                    showSuccess('All user data deleted permanently');
                  } catch (error) {
                    console.error("Failed to delete user data:", error);
                    showError('Failed to delete data. Please try again.');
                  } finally {
                    setConfirmOpen(false); 
                    setDeleteConfirmText('');
                  }
                }}
                style={{
                  opacity: deleteConfirmText.toLowerCase() !== 'delete' ? 0.5 : 1,
                  cursor: deleteConfirmText.toLowerCase() !== 'delete' ? 'not-allowed' : 'pointer'
                }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>We will prepare a downloadable archive of your data and notify you when it's ready.</p>
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
  const { user, setUser, logout } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [email, setEmail] = React.useState(user?.email || "");
  const [newPassword, setNewPassword] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [mfa, setMfa] = React.useState(!!user?.mfa_enabled);
  const [saving, setSaving] = React.useState(false);
  const [devices] = React.useState([
    // TODO: replace with real sessions list when backend endpoint is available
    { id:"current", name:"Current device", last:"Just now" },
  ]);
  const [dangerOpen, setDangerOpen] = React.useState(false);
  const [dangerType, setDangerType] = React.useState('deactivate');
  const [dangerLoading, setDangerLoading] = React.useState(false);

  const handleUpdateCredentials = async () => {
    if (!currentPassword || currentPassword.length < 1) {
      showError("Please enter your current password to update account settings.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      showError("New password must be at least 8 characters long.");
      return;
    }

    // Backend очікує поля new_email / new_password навіть, якщо вони не змінюються (null)
    const payload = {
      new_email: email && email !== user?.email ? email : null,
      new_password: newPassword ? newPassword : null,
      current_password: currentPassword,
      mfa_enabled: !!mfa,
    };

    try {
      setSaving(true);
      const res = await AccountApi.updateCredentials(payload);
      console.log("✅ update_credentials response:", res);

      const success = res?.success !== false;
      const message =
        res?.message || (success ? "Credentials updated successfully." : "Failed to update credentials.");

      if (!success) {
        throw new Error(message);
      }

      // Update user in AuthContext if email or MFA changed
      setUser((prev) => ({
        ...prev,
        email: email || prev?.email,
        mfa_enabled: mfa,
      }));

      showSuccess(message);
      onSaved && onSaved();
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("Failed to update credentials:", error);
      showError(error?.message || "Failed to update credentials. Please check your current password.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (device) => {
    try {
      // In this UI we don't have real token IDs yet, so we call revoke without payload.
      console.log("🔐 Revoking session for device:", device);
      await AccountApi.revokeToken({});
      showSuccess("Session revoked. You may need to log in again on that device.");
      onAction && onAction("Session revoked");
    } catch (error) {
      console.error("Failed to revoke session:", error);
      showError(error?.message || "Failed to revoke session.");
    }
  };

  const handleDangerAction = async () => {
    try {
      setDangerLoading(true);
      if (dangerType === "delete") {
        const res = await AccountApi.deleteAccount();
        console.log("🗑️ delete_account response:", res);
        showSuccess(res?.message || "Account deleted permanently.");
        onAction && onAction("Account deletion requested");
        await logout();
      } else {
        const res = await AccountApi.deactivateAccount();
        console.log("🛑 deactivate_account response:", res);
        showSuccess(res?.message || "Account deactivated temporarily.");
        onAction && onAction("Account deactivation requested");
        await logout();
      }
      setDangerOpen(false);
    } catch (error) {
      console.error("Danger zone action failed:", error);
      showError(error?.message || "Failed to complete account action.");
    } finally {
      setDangerLoading(false);
    }
  };

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Inputs block */}
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop:0 }}>Account & Login</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-field">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e)=>setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>
        <div className="form-field" style={{ marginTop:8 }}>
          <label>Current password<span style={{ color:'var(--danger)' }}> *</span></label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e)=>setCurrentPassword(e.target.value)}
            placeholder="Required to update email or password"
          />
        </div>
        <div style={{ height:8 }} />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={mfa}
            onChange={(e)=>setMfa(e.target.checked)}
          />{" "}
          <span>Enable multi‑factor authentication (MFA)</span>
        </label>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <button
            className="btn primary"
            onClick={handleUpdateCredentials}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
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
              <button
                className="btn ghost small"
                onClick={()=>handleRevokeSession(d)}
              >
                Revoke
              </button>
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
              <button
                className="btn danger"
                disabled={dangerLoading}
                onClick={handleDangerAction}
              >
                {dangerLoading ? "Processing..." : "Delete permanently"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>Your account will be temporarily deactivated. You can reactivate anytime by logging in.</p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn ghost" onClick={()=>setDangerOpen(false)}>Cancel</button>
              <button
                className="btn outline"
                disabled={dangerLoading}
                onClick={handleDangerAction}
              >
                {dangerLoading ? "Processing..." : "Deactivate"}
              </button>
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


