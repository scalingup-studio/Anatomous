import React from "react";
import DatePicker from "../../components/DatePicker.jsx";
import { ReportsApi } from "../../api/reportsApi";
import { useAuth } from "../../api/AuthContext.jsx";
import { hasFeatureAccess } from "../../utils/subscriptionUtils.js";
import { UpgradePrompt } from "../../components/UpgradePrompt.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";

export default function DashboardReports() {
  const [activeTab, setActiveTab] = React.useState("download");

  const tabs = [
    { id: "download", label: "Download Reports" },
    { id: "share", label: "Share with Provider" },
    { id: "export", label: "Export Settings" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Reports</h1>
      </div>

      {/* Sub-tabs */}
      <style>{`
        .reports-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          margin-bottom: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .reports-tabs::-webkit-scrollbar {
          display: none;
        }
        .reports-tabs button {
          white-space: nowrap;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .reports-tabs {
            gap: 6px;
          }
          .reports-tabs button {
            padding: 6px 12px !important;
            font-size: 13px !important;
          }
        }
        @media (max-width: 480px) {
          .reports-tabs button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      <div className="reports-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              color: activeTab === tab.id ? "var(--primary)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "download" && <DownloadReportsTab />}
      {activeTab === "share" && <ShareWithProviderTab />}
      {activeTab === "export" && <ExportSettingsTab />}
    </div>
  );
}

function DownloadReportsTab() {
  const { isLight } = useTheme();
  const [reports, setReports] = React.useState([]);
  const [type, setType] = React.useState("all");
  const todayStr = new Date().toISOString().split('T')[0];
  const last30Str = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  const [start, setStart] = React.useState(last30Str);
  const [end, setEnd] = React.useState(todayStr);
  const [loading, setLoading] = React.useState(false);

  const loadReports = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await ReportsApi.listWithDate({ start_date: start, end_date: end, type });
      setReports(res.sort_result || res.all_reports_list || []);
    } catch (e) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [start, end, type]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Quick date range presets
  const setQuickRange = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    setStart(startDate.toISOString().split('T')[0]);
    setEnd(endDate.toISOString().split('T')[0]);
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Download Reports</h3>
      
      {/* Filters row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 12, 
        marginTop: 8, 
        marginBottom: 12,
        alignItems: "end"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Report Type</label>
          <select 
            value={type} 
            onChange={(e)=>setType(e.target.value)} 
            style={{ 
              padding: "8px 12px", 
              background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", 
              border: "1px solid var(--border)", 
              borderRadius: 8, 
              color: "var(--text)", 
              fontSize: 13,
              width: "100%"
            }}
          >
            <option value="all">All</option>
            <option value="summary">Full Health Summary</option>
            <option value="vitals">Vitals</option>
          </select>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Start date</label>
          <DatePicker 
            value={start} 
            onChange={(val)=>{
              setStart(val);
              // If end date is before new start date, clear end date
              if (end && val && end < val) {
                setEnd('');
              }
            }}
            maxDate={end || undefined}
          />
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>End date</label>
          <DatePicker 
            value={end} 
            onChange={(val)=>setEnd(val)}
            minDate={start || undefined}
          />
        </div>
        
        <button 
          className="btn outline" 
          onClick={loadReports} 
          disabled={loading}
          style={{ 
            height: "fit-content", 
            alignSelf: "end",
            minHeight: "40px",
            whiteSpace: "nowrap"
          }}
        >
          {loading ? 'Loading...' : 'Filter'}
        </button>
      </div>

      {reports.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px 20px", 
          color: "var(--muted)",
          fontSize: 14
        }}>
          {loading ? "Loading reports..." : "No reports found for selected filters"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reports.map((r, idx) => (
            <div 
              key={(r.id ?? r.report_id ?? r.file_url ?? r.title ?? 'row') + '_' + idx} 
              className="card" 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                padding: 12,
                gap: 12,
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: "200px" }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 8, 
                  background: "rgba(0,186,206,0.15)", 
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title || r.name || "Report"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.date || r.created_at ? (
                      <span>📅 {r.date || r.created_at}</span>
                    ) : null}
                    {r.size ? (
                      <span>💾 {r.size} KB</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  className="btn outline small"
                  onClick={() => {
                    if (r.file_url) {
                      const dateStr = r.date || new Date().toISOString().split('T')[0];
                      const suggested = `${(r.title || 'Report').replace(/\s+/g,'_')}_${dateStr}.pdf`;
                      ReportsApi.downloadFileUrl(r.file_url, suggested);
                      return;
                    }
                    const reportId = r.report_id ?? r.id;
                    if (reportId) {
                      ReportsApi.download(reportId);
                    }
                  }}
                  disabled={!r.file_url && !r.report_id && !r.id}
                  title={!r.file_url && !r.report_id && !r.id ? 'No file available' : 'Download'}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareWithProviderTab() {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const [reports, setReports] = React.useState([]);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [share, setShare] = React.useState(null);
  const [shareUrl, setShareUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [upgradePromptOpen, setUpgradePromptOpen] = React.useState(false);
  const [upgradeFeature, setUpgradeFeature] = React.useState(null);

  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [customMessage, setCustomMessage] = React.useState("");
  const [includeFileLink, setIncludeFileLink] = React.useState(false);

  const loadReports = React.useCallback(async () => {
    try {
      const res = await ReportsApi.list();
      const items = res.sort_result || res.all_reports_list || res.items || res || [];
      setReports(Array.isArray(items) ? items : []);
      if (Array.isArray(items) && items.length) {
        setSelectedIdx(0);
        setTitle(items[0].title || items[0].name || "");
      }
    } catch (e) {
      setReports([]);
    }
  }, []);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Keep title synced with current selected report
  React.useEffect(() => {
    const r = reports[selectedIdx];
    if (r) setTitle(r.title || r.name || "");
  }, [reports, selectedIdx]);

  const handleCreateOrUpdateShare = async () => {
    // Check if user has access to Share with Providers
    if (!hasFeatureAccess(user, 'shareWithProviders')) {
      setUpgradeFeature('shareWithProviders');
      setUpgradePromptOpen(true);
      return;
    }
    
    const selected = reports[selectedIdx];
    const selectedReportId = selected?.report_id ?? selected?.id;
    if (!selectedReportId) {
      setStatus("Selected report has no id to share. Generate a new report first.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const payload = {
        report_id: String(selectedReportId),
        title: title || undefined,
        expiration_date: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        is_visible: Boolean(isVisible),
        // Some backends require this var to exist during share creation
        report_share_url: shareUrl || "",
      };
      const res = await ReportsApi.share(payload);
      const s = res?.share || res || {};
      const normalized = {
        ...s,
        id: s?.id ?? s?.share_id ?? s?.shareId,
        share_url: s?.share_url ?? s?.url ?? s?.shareUrl,
      };
      setShare(normalized);
      setShareUrl(normalized.share_url || "");
      setStatus("Share link created/updated.");
    } catch (e) {
      setStatus(e?.message || "Failed to create/update share.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = shareUrl || share?.share_url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied to clipboard.");
    } catch {
      setStatus("Failed to copy link.");
    }
  };

  const handleSendEmail = async () => {
    if (!share?.id) {
      setStatus("Create a share link first.");
      return;
    }
    if (!recipientEmail || !recipientEmail.trim()) {
      setStatus("Please enter a recipient email address.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await ReportsApi.sendShareEmail({
        share_id: share.id,
        recipient_email: recipientEmail.trim(),
        subject: subject?.trim() || "Health Report Shared With You",
        custom_message: customMessage?.trim() || "",
        include_file_link: includeFileLink,
      });
      setStatus(res?.message || "Email sent successfully.");
      // Clear form after successful send
      setRecipientEmail("");
      setSubject("");
      setCustomMessage("");
    } catch (e) {
      const errorMessage = e?.message || "Failed to send email.";
      const errorCode = e?.code || e?.response?.code;
      // Check if it's a duplicate error
      if (errorMessage.includes("Duplicate") || errorMessage.includes("duplicate") || errorCode === "ERROR_FATAL") {
        setStatus("This email has already been sent for this share link. Please use a different email address or create a new share link.");
      } else {
        setStatus(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginTop: 0 }}>Share with Provider</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Report to Share</label>
          <select
            value={String(selectedIdx)}
            onChange={(e)=>{
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              const r = reports[idx];
              if (r) setTitle(r.title || r.name || "");
            }}
            style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
          >
            {reports.length === 0 ? (
              <option value="" disabled>No reports found</option>
            ) : (
              reports.map((r, i) => {
                const title = r.title || r.name || `Report ${i+1}`;
                const date = r.date ? ` — ${r.date}` : '';
                const size = typeof r.size === 'number' && r.size > 0 ? ` — ${r.size} KB` : '';
                return (
                  <option key={(r.report_id ?? r.id ?? r.file_url ?? r.title ?? 'row') + '_' + i} value={String(i)}>
                    {title}{date}{size}
                  </option>
                );
              })
            )}
          </select>
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="Full Health Summary"
            style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
          />
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Expires (Optional)</label>
            <div style={{ position: "relative" }}>
              <DatePicker
                value={expiresAt ? expiresAt.split('T')[0] : ''}
                onChange={(val)=>{
                  // If time was set, preserve it; otherwise set to end of day
                  if (expiresAt && expiresAt.includes('T')) {
                    const time = expiresAt.split('T')[1];
                    setExpiresAt(val ? `${val}T${time}` : '');
                  } else {
                    setExpiresAt(val ? `${val}T23:59:59` : '');
                  }
                }}
                placeholder="Select expiration date"
              />
            </div>
          
          </div>
          <div style={{ display: "flex", alignItems: "center", minHeight: 44}}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
              <input type="checkbox" checked={isVisible} onChange={(e)=>setIsVisible(e.target.checked)} />
              <span>Visible</span>
            </label>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button 
            className="btn primary" 
            onClick={handleCreateOrUpdateShare} 
            disabled={loading}
            style={{ flex: 1, minWidth: "150px" }}
          >
            {loading ? 'Saving…' : 'Create/Update Link'}
          </button>
          <button 
            className="btn outline" 
            onClick={handleCopyLink} 
            disabled={!shareUrl && !share?.share_url}
            style={{ minWidth: "120px" }}
          >
            Copy Link
          </button>
        </div>

        {shareUrl || share?.share_url ? (
          <div style={{ 
            padding: 12, 
            background: "rgba(0,186,206,0.1)", 
            border: "1px solid var(--border)", 
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Share URL:</div>
            <div style={{ 
              fontSize: 13, 
              color: "var(--text)", 
              wordBreak: 'break-all',
              padding: 8,
              background: "rgba(17,17,17,.5)",
              borderRadius: 6,
              fontFamily: "monospace"
            }}>
              {shareUrl || share?.share_url}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Send via Email</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Recipient Email *</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e)=>setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Subject (Optional)</label>
              <input
                type="text"
                value={subject}
                onChange={(e)=>setSubject(e.target.value)}
                placeholder="Subject (optional)"
                style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Custom Message (Optional)</label>
              <textarea
                value={customMessage}
                onChange={(e)=>setCustomMessage(e.target.value)}
                placeholder="Custom message (optional)"
                rows={3}
                style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }}
              />
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
              <input type="checkbox" checked={includeFileLink} onChange={(e)=>setIncludeFileLink(e.target.checked)} />
              <span>Include file link</span>
            </label>
            <button 
              className="btn primary" 
              onClick={handleSendEmail} 
              disabled={loading || !recipientEmail || !share?.id}
              style={{ width: "100%", minHeight: "40px" }}
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>

        {status ? (
          <div style={{ 
            fontSize: 13, 
            padding: 10, 
            borderRadius: 8,
            background: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') 
              ? 'rgba(255, 59, 48, 0.1)' 
              : 'rgba(0, 186, 206, 0.1)',
            border: `1px solid ${status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') 
              ? 'var(--error)' 
              : 'var(--primary)'}`,
            color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') 
              ? 'var(--error)' 
              : 'var(--text)'
          }}>
            {status}
          </div>
        ) : null}
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

function ExportSettingsTab() {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const [layout, setLayout] = React.useState("detailed");
  const [dateRange, setDateRange] = React.useState("all"); // 'all' | '30'
  const [sections, setSections] = React.useState({ insights: false, vitals: true, labs: true, goals: true });
  const [autoGenerate, setAutoGenerate] = React.useState(false);
  const [title, setTitle] = React.useState("Full Health Summary");
  const [format, setFormat] = React.useState("pdf");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [upgradePromptOpen, setUpgradePromptOpen] = React.useState(false);
  const [upgradeFeature, setUpgradeFeature] = React.useState(null);

  const computedFilename = React.useMemo(() => {
    const safeTitle = String(title || 'Report').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const date = new Date().toISOString().split('T')[0];
    return `${safeTitle || 'Report'}_${date}.${format}`;
  }, [title, format]);

  const handleGenerate = async () => {
    // Check if user has access to PDF Reports
    if (!hasFeatureAccess(user, 'reportsPdf')) {
      setUpgradeFeature('reportsPdf');
      setUpgradePromptOpen(true);
      return;
    }
    
    try {
      setMessage("");
      setLoading(true);
      await ReportsApi.generate({
        report_title: title,
        filename: computedFilename,
        auto_generate: autoGenerate,
        layout,
        // API expects 'all' or '30'
        date_range: dateRange === '30' ? '30' : 'all',
        // Flat flags (per doc)
        insights: !!sections.insights,
        vitals: !!sections.vitals,
        labs: !!sections.labs,
        goals: !!sections.goals,
        output_format: format,
      });
      // Optional: could reload list in Download tab, but keeping local here
      setMessage('Report generation started successfully. You will see it in the list shortly.');
    } catch (e) {
      setMessage(e?.message || 'Failed to start report generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginTop: 0 }}>Export Settings</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Report Title</label>
          <input
            type="text"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="Full Health Summary"
            style={{ width: "100%", padding: "8px 12px", background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, alignItems: "start" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 10, fontWeight: 500 }}>Layout</label>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <button 
                  onClick={()=>setLayout("simple")}
                  onMouseEnter={(e) => {
                    if (layout !== "simple") {
                      e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
                      e.currentTarget.style.borderColor = "var(--primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (layout !== "simple") {
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }
                  }}
                  style={{ 
                    width: "100%",
                    padding: "10px 16px",
                    background: "transparent",
                    border: layout === "simple" ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: layout === "simple" ? 500 : 400,
                    cursor: "pointer",
                    boxShadow: layout === "simple" ? "0 2px 8px rgba(0, 186, 206, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.2s ease",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>Simple</span>
                  <div 
                    style={{ 
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      cursor: "help"
                    }}
                    onMouseEnter={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) {
                        tooltip.style.display = 'block';
                        tooltip.style.visibility = 'visible';
                        tooltip.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) {
                        tooltip.style.display = 'none';
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div className="tooltip" style={{
                      display: "none",
                      visibility: "hidden",
                      opacity: 0,
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "8px 12px",
                      background: "rgba(17, 17, 17, 0.98)",
                      color: "var(--text)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      borderRadius: 6,
                      maxWidth: "200px",
                      width: "max-content",
                      zIndex: 10000,
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                      pointerEvents: "none",
                      transition: "opacity 0.2s ease",
                      textAlign: "center"
                    }}>
                      Overview report with key insights and summaries
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid rgba(17, 17, 17, 0.98)"
                      }}></div>
                    </div>
                  </div>
                </button>
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                <button 
                  onClick={()=>setLayout("detailed")}
                  onMouseEnter={(e) => {
                    if (layout !== "detailed") {
                      e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
                      e.currentTarget.style.borderColor = "var(--primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (layout !== "detailed") {
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }
                  }}
                  style={{ 
                    width: "100%",
                    padding: "10px 16px",
                    background: "transparent",
                    border: layout === "detailed" ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: layout === "detailed" ? 500 : 400,
                    cursor: "pointer",
                    boxShadow: layout === "detailed" ? "0 2px 8px rgba(0, 186, 206, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.2s ease",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>Detailed</span>
                  <div 
                    style={{ 
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      cursor: "help"
                    }}
                    onMouseEnter={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) {
                        tooltip.style.display = 'block';
                        tooltip.style.visibility = 'visible';
                        tooltip.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) {
                        tooltip.style.display = 'none';
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div className="tooltip" style={{
                      display: "none",
                      visibility: "hidden",
                      opacity: 0,
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "8px 12px",
                      background: "rgba(17, 17, 17, 0.98)",
                      color: "var(--text)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      borderRadius: 6,
                      maxWidth: "200px",
                      width: "max-content",
                      zIndex: 10000,
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                      pointerEvents: "none",
                      transition: "opacity 0.2s ease",
                      textAlign: "center"
                    }}>
                      Full analytics report including comparisons, metrics, and AI-generated commentary
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid rgba(17, 17, 17, 0.98)"
                      }}></div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 10, fontWeight: 500 }}>Date Range</label>
            <select
              value={dateRange}
              onChange={(e)=>setDateRange(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "10px 12px", 
                background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)", 
                border: "1px solid var(--border)", 
                borderRadius: 8, 
                color: "var(--text)", 
                fontSize: 13, 
                height: "37px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 186, 206, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
              }}
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>Output Format</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={()=>setFormat("pdf")}
              style={{ 
                flex: 1,
                padding: "8px 12px",
                background: "transparent",
                border: format === "pdf" ? "1px solid var(--primary)" : "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                boxShadow: format === "pdf" ? "0 2px 8px rgba(0, 186, 206, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.2)",
                transition: "box-shadow 0.2s, border-color 0.2s"
              }}
            >
              PDF
            </button>
            <button 
              onClick={()=>setFormat("csv")}
              style={{ 
                flex: 1,
                padding: "8px 12px",
                background: "transparent",
                border: format === "csv" ? "1px solid var(--primary)" : "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                boxShadow: format === "csv" ? "0 2px 8px rgba(0, 186, 206, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.2)",
                transition: "box-shadow 0.2s, border-color 0.2s"
              }}
            >
              CSV
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Sections to Include</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn ghost small" 
                onClick={()=>setSections({ insights:true, vitals:true, labs:true, goals:true })}
                style={{ fontSize: 11 }}
              >
                Select all
              </button>
              <button 
                className="btn ghost small" 
                onClick={()=>setSections({ insights:false, vitals:false, labs:false, goals:false })}
                style={{ fontSize: 11 }}
              >
                None
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={sections.vitals} onChange={(e)=>setSections(s=>({...s,vitals:e.target.checked}))} />
              <span>Vitals</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={sections.labs} onChange={(e)=>setSections(s=>({...s,labs:e.target.checked}))} />
              <span>Labs</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={sections.goals} onChange={(e)=>setSections(s=>({...s,goals:e.target.checked}))} />
              <span>Goals</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={sections.insights} onChange={(e)=>setSections(s=>({...s,insights:e.target.checked}))} />
              <span>Insights</span>
            </label>
          </div>
        </div>

        <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={autoGenerate} onChange={(e)=>setAutoGenerate(e.target.checked)} />
            <span>Auto-generate after new analysis</span>
          </label>
        </div>

        {message && (
          <div style={{ 
            fontSize: 13, 
            padding: 10, 
            borderRadius: 8,
            background: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'rgba(255, 59, 48, 0.1)' 
              : 'rgba(0, 186, 206, 0.1)',
            border: `1px solid ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'var(--error)' 
              : 'var(--primary)'}`,
            color: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'var(--error)' 
              : 'var(--text)'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button 
            className="btn primary" 
            onClick={handleGenerate} 
            disabled={loading || !title.trim()}
            style={{ width: "100%", minHeight: "40px" }}
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
            You can download it from the list after it's ready
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


