import React from "react";
import { useParams, Link } from "react-router-dom";
import { ReportsApi } from "../../api/reportsApi";
import "../OnboardingLayout.css";

export default function SharedReportPage() {
  const { token } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);
  const [viewerUrl, setViewerUrl] = React.useState("");
  const handleCopyResult = React.useCallback(async () => {
    const value = data?.result;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {}
  }, [data]);

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
  const resultUrl = typeof data?.result === 'string' ? data.result : '';

  // When we get a fileUrl, try to fetch as Blob to bypass X-Frame-Options on remote hosts
  React.useEffect(() => {
    let revokedUrl = "";
    let cancelled = false;
    async function prepareViewerUrl() {
      if (!fileUrl) {
        setViewerUrl("");
        return;
      }
      // Default to direct URL first
      setViewerUrl(fileUrl);
      try {
        const res = await fetch(fileUrl, { method: 'GET', credentials: 'omit' });
        // If we cannot read due to CORS, this will still be ok for .blob() in many cases, but might throw
        if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
        const blob = await res.blob();
        // Only switch to blob URL if it is a PDF
        const isPdf = (blob.type || '').toLowerCase().includes('pdf');
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        revokedUrl = objectUrl;
        setViewerUrl(isPdf ? objectUrl : fileUrl);
      } catch (_) {
        // Fallbacks if remote disallows embedding or CORS blocks reading
        // 1) Try local proxy which strips X-Frame-Options
        const origin = window.location.origin.replace(/\/$/, '');
        const candidate = `${origin}/api/pdf/proxy?url=${encodeURIComponent(fileUrl)}`;
        setViewerUrl(candidate);
      }
    }
    prepareViewerUrl();
    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [fileUrl]);

  return (
    <>
    <div
      style={{
        maxWidth: 1100,
        width: "100%",
        margin: "0 auto",
        padding: 16,
        minHeight: "calc(100vh - 80px)",
        paddingBottom: 96
      }}
    >
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
      
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
            
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  height: "calc(100vh - 180px)",
                  maxHeight: "calc(100vh - 120px)"
                }}
              >
                <iframe title="shared-report" src={viewerUrl || fileUrl} style={{ width: "100%", height: "100%", border: 0 }} />
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>No file available for this shared report.</div>
          )}
        </div>
      )}
    </div>
    {/* Full-width fixed footer */}
    <footer className="onboarding-footer" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', marginTop: 0 }}>
      <div className="footer-content">
        <div className="footer-left">
          <span>© 2025 Anatomous</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
        </div>
        <div className="footer-right">
          <a href="https://crisp.chat" target="_blank" rel="noopener noreferrer">Need Help?</a>
        </div>
      </div>
    </footer>
    </>
  );
}


