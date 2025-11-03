import { authRequest, request } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

export const ReportsApi = {
  async list({ start_date, end_date, type = 'all' } = {}) {
    // Provide sensible defaults if dates are missing
    const today = new Date();
    const toISO = (d) => d.toISOString().split('T')[0];
    const defaultEnd = toISO(today);
    const defaultStart = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));

    const params = new URLSearchParams();
    params.set("start_date", start_date || defaultStart);
    params.set("end_date", end_date || defaultEnd);
    params.set("type", type || 'all');
    const url = `${CUSTOM_ENDPOINTS.reports.list}?${params.toString()}`;
    return await authRequest(url, { method: "GET" });
  },

  async generate(payload) {
    // Backend requires filename even if not in public spec
    const resolvedFormat = payload.output_format || 'pdf';
    const resolvedTitle = payload.report_title || 'Full Health Summary';
    const safeTitle = String(resolvedTitle).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    const defaultFilename = `${safeTitle || 'Report'}_${new Date().toISOString().split('T')[0]}.${resolvedFormat}`;

    const body = {
      report_title: resolvedTitle,
      filename: payload.filename || defaultFilename,
      auto_generate: Boolean(payload.auto_generate),
      layout: payload.layout || 'detailed',
      date_range: payload.date_range || 'all',
      insights: !!(payload.insights ?? payload.sections?.insights),
      vitals: !!(payload.vitals ?? payload.sections?.vitals),
      labs: !!(payload.labs ?? payload.sections?.labs),
      goals: !!(payload.goals ?? payload.sections?.goals),
      output_format: resolvedFormat,
    };

    try { console.log('📤 ReportsApi.generate payload:', body); } catch {}

    return await authRequest(CUSTOM_ENDPOINTS.reports.generate, {
      method: "POST",
      body,
    });
  },

  async download(report_id, opts = {}) {
    const params = new URLSearchParams();
    params.set('report_id', report_id);
    if (opts.format) params.set('format', opts.format);
    const url = `${CUSTOM_ENDPOINTS.reports.download}?${params.toString()}`;

    // Attach auth token manually to support blob response
    const headers = {};
    try {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {}

    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);

    // Try to infer filename from Content-Disposition
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const inferredName = decodeURIComponent(match?.[1] || match?.[2] || 'report');

    const blob = await res.blob();
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = inferredName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return { success: true };
  },

  async share(payload) {
    // Share endpoint is public per spec
    return await request(CUSTOM_ENDPOINTS.reports.share, {
      method: "POST",
      body: payload,
    });
  },

  async sharedByToken() {
    return await authRequest(CUSTOM_ENDPOINTS.reports.sharedByToken, { method: "GET" });
  },
};

export default ReportsApi;


