import React from "react";
import DatePicker from "../../components/DatePicker.jsx";
import { ReportsApi } from "../../api/reportsApi";

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
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
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
  const [reports, setReports] = React.useState([]);
  const [type, setType] = React.useState("all");
  const todayStr = new Date().toISOString().split('T')[0];
  const last30Str = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  const [start, setStart] = React.useState(last30Str);
  const [end, setEnd] = React.useState(todayStr);

  const loadReports = React.useCallback(async () => {
    try {
      const res = await ReportsApi.listWithDate({ start_date: start, end_date: end, type });
      setReports(res.sort_result || res.all_reports_list || []);
    } catch (e) {
      setReports([]);
    }
  }, [start, end, type]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Download Reports</h3>
      <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 12 }}>
        <select value={type} onChange={(e)=>setType(e.target.value)} style={{ padding: "6px 10px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
          <option value="all">All</option>
          <option value="summary">Full Health Summary</option>
          <option value="vitals">Vitals</option>
        </select>
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
        <DatePicker 
          value={end} 
          onChange={(val)=>setEnd(val)}
          minDate={start || undefined}
        />
        <button className="btn outline" onClick={loadReports}>Filter</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reports.map((r, idx) => (
          <div key={(r.id ?? r.report_id ?? r.file_url ?? r.title ?? 'row') + '_' + idx} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(0,186,206,0.15)", border: "1px solid var(--border)" }} />
              <div>
                <div style={{ fontWeight: 600 }}>{r.title || r.name || "Report"}</div>
                <div style={{ fontSize: 12, color: "var(--hint)" }}>{r.date || r.created_at}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.size ? `${r.size} KB` : ""}</span>
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
    </div>
  );
}

function ShareWithProviderTab() {
  const [reports, setReports] = React.useState([]);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [share, setShare] = React.useState(null);
  const [shareUrl, setShareUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");

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
    setLoading(true);
    setStatus("");
    try {
      const res = await ReportsApi.sendShareEmail({
        share_id: share.id,
        recipient_email: recipientEmail,
        subject: subject || undefined,
        custom_message: customMessage || undefined,
        include_file_link: includeFileLink,
        // Some templates expect explicit share URL variable
        report_share_url: shareUrl || share?.share_url,
      });
      setStatus(res?.message || "Email sent.");
    } catch (e) {
      setStatus(e?.message || "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Share with Provider</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Report to Share</label>
          <select
            value={String(selectedIdx)}
            onChange={(e)=>{
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              const r = reports[idx];
              if (r) setTitle(r.title || r.name || "");
            }}
            style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
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
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="Full Health Summary"
            style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, alignItems: "center" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Expires</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e)=>setExpiresAt(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
            />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
            <input type="checkbox" checked={isVisible} onChange={(e)=>setIsVisible(e.target.checked)} />
            Visible
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn outline" onClick={handleCreateOrUpdateShare} aria-disabled={loading}>
            {loading ? 'Saving…' : 'Create/Update Link'}
          </button>
          <button className="btn" style={{ width: 120 }} onClick={handleCopyLink} disabled={!shareUrl && !share?.share_url}>Copy Link</button>
        </div>

        {shareUrl || share?.share_url ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Share URL: <span style={{ wordBreak: 'break-all' }}>{shareUrl || share?.share_url}</span>
          </div>
        ) : null}

        <div style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Send via Email</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e)=>setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
            />
            <input
              type="text"
              value={subject}
              onChange={(e)=>setSubject(e.target.value)}
              placeholder="Subject (optional)"
              style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
            />
            <textarea
              value={customMessage}
              onChange={(e)=>setCustomMessage(e.target.value)}
              placeholder="Custom message (optional)"
              rows={3}
              style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
              <input type="checkbox" checked={includeFileLink} onChange={(e)=>setIncludeFileLink(e.target.checked)} />
              Include file link
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn outline" onClick={handleSendEmail} disabled={loading || !recipientEmail || !share?.id}>Send</button>
            </div>
          </div>
        </div>

        {status ? (
          <div style={{ fontSize: 12, color: status.toLowerCase().includes('fail') ? 'var(--error)' : 'var(--muted)' }}>{status}</div>
        ) : null}
      </div>
    </div>
  );
}

function ExportSettingsTab() {
  const [layout, setLayout] = React.useState("detailed");
  const [dateRange, setDateRange] = React.useState("all"); // 'all' | '30'
  const [sections, setSections] = React.useState({ insights: false, vitals: true, labs: true, goals: true });
  const [autoGenerate, setAutoGenerate] = React.useState(false);
  const [title, setTitle] = React.useState("Full Health Summary");
  const [format, setFormat] = React.useState("pdf");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const computedFilename = React.useMemo(() => {
    const safeTitle = String(title || 'Report').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const date = new Date().toISOString().split('T')[0];
    return `${safeTitle || 'Report'}_${date}.${format}`;
  }, [title, format]);

  const handleGenerate = async () => {
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
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Export Settings</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Report title</div>
          <input
            type="text"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="Full Health Summary"
            style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Layout</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn small ${layout === "simple" ? "primary" : "outline"}`} onClick={()=>setLayout("simple")}>Simple</button>
              <button className={`btn small ${layout === "detailed" ? "primary" : "outline"}`} onClick={()=>setLayout("detailed")}>Detailed</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Date Range</div>
            <select
              value={dateRange}
              onChange={(e)=>setDateRange(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, maxHeight: 32 }}
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Output format</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`btn small ${format === "pdf" ? "primary" : "outline"}`} onClick={()=>setFormat("pdf")}>PDF</button>
            <button className={`btn small ${format === "csv" ? "primary" : "outline"}`} onClick={()=>setFormat("csv")}>CSV</button>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Sections to include</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost small" onClick={()=>setSections({ insights:true, vitals:true, labs:true, goals:true })}>Select all</button>
              <button className="btn ghost small" onClick={()=>setSections({ insights:false, vitals:false, labs:false, goals:false })}>None</button>
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><input type="checkbox" checked={sections.vitals} onChange={(e)=>setSections(s=>({...s,vitals:e.target.checked}))} />Vitals</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><input type="checkbox" checked={sections.labs} onChange={(e)=>setSections(s=>({...s,labs:e.target.checked}))} />Labs</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><input type="checkbox" checked={sections.goals} onChange={(e)=>setSections(s=>({...s,goals:e.target.checked}))} />Goals</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><input type="checkbox" checked={sections.insights} onChange={(e)=>setSections(s=>({...s,insights:e.target.checked}))} />Insights</label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={autoGenerate} onChange={(e)=>setAutoGenerate(e.target.checked)} /> Auto-generate after new analysis
        </label>
        {message && (
          <div style={{ fontSize: 12, color: message.toLowerCase().includes('fail') ? 'var(--error)' : 'var(--muted)' }}>
            {message}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: 'center' }}>
          <button className="btn outline" onClick={handleGenerate} disabled={loading || !title.trim()}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>You can download it from the list after it’s ready</div>
        </div>
      </div>
    </div>
  );
}


