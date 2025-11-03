import React from "react";
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
      const res = await ReportsApi.list({ start_date: start, end_date: end, type });
      setReports(res.all_reports_list || []);
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
        <input value={start} onChange={(e)=>setStart(e.target.value)} type="date" style={{ padding: "6px 10px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
        <input value={end} onChange={(e)=>setEnd(e.target.value)} type="date" style={{ padding: "6px 10px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
        <button className="btn outline" onClick={loadReports}>Filter</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reports.map((r) => (
          <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12 }}>
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
                  const reportId = r.report_id ?? r.id;
                  if (!reportId) return;
                  ReportsApi.download(reportId);
                }}
                disabled={!r.report_id && !r.id}
                title={!r.report_id && !r.id ? 'No report_id available' : 'Download'}
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
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Share with Provider</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Report to Share</label>
          <select style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
            <option>Full Health Summary</option>
            <option>Vitals Summary</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, alignItems: "center" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Expires</label>
            <input type="datetime-local" style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
            <input type="checkbox" defaultChecked />
            Visible
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ width: 120 }}>Copy Link</button>
          <button className="btn outline" style={{ flex: 1 }}>Send via Email…</button>
        </div>
      </div>
    </div>
  );
}

function ExportSettingsTab() {
  const [layout, setLayout] = React.useState("detailed");
  const [dateRange, setDateRange] = React.useState("all");
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
        date_range: dateRange,
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
            <select value={dateRange} onChange={(e)=>setDateRange(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "rgba(17,17,17,.85)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, maxHeight: 32 }}>
              <option value="all">All time</option>
              <option value="last_30">Last 30 days</option>
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


