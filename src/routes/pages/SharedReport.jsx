import React from "react";
import { useParams, Link } from "react-router-dom";
import { ReportsApi } from "../../api/reportsApi";

export default function SharedReportPage() {
  const { token } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await ReportsApi.sharedByToken(token);
        if (!mounted) return;
        setData(res || {});
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Unable to load shared report");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const fileUrl = data?.file_url || data?.report?.file_url || data?.result;
  const title = data?.title || data?.report?.title || "Shared Report";
  const expiresAt = data?.expires_at || data?.share?.expires_at;

  return (
    <div style={{ maxWidth: 920, margin: "24px auto", padding: 16 }}>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <Link to="/" className="btn small outline">Back</Link>
        </div>
        {expiresAt ? (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Expires: {new Date(expiresAt).toLocaleString()}</div>
        ) : null}
      </div>

      {loading && (
        <div className="card" style={{ padding: 16 }}>Loading…</div>
      )}

      {error && (
        <div className="card" style={{ padding: 16, color: "var(--error)" }}>{error}</div>
      )}

      {!loading && !error && (
        <div className="card" style={{ padding: 16 }}>
          {fileUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn outline" href={fileUrl} target="_blank" rel="noreferrer">Open file</a>
                <a className="btn" href={fileUrl} download>Download</a>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <iframe title="shared-report" src={fileUrl} style={{ width: "100%", height: 640, border: 0 }} />
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>No file available for this shared report.</div>
          )}
        </div>
      )}
    </div>
  );
}


