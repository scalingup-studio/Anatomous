import { authRequest, request } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

export const ReportsApi = {
  async list({ type = 'all' } = {}) {
    // Only pass type per requirement; no date filters
    const params = new URLSearchParams();
    params.set("type", type || 'all');
    // Backend requires user_id
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const userId = parsed?.id || parsed?.user?.id;
        if (userId) params.set("user_id", String(userId));
      }
    } catch {}
    const url = `${CUSTOM_ENDPOINTS.reports.list}?${params.toString()}`;
    return await authRequest(url, { method: "GET" });
  },

  async listWithDate({ start_date, end_date, type = 'all' } = {}) {
    // Full listing with optional date filters (for Download tab)
    const params = new URLSearchParams();
    if (start_date) params.set("start_date", start_date);
    if (end_date) params.set("end_date", end_date);
    // Some backends require user_id when date filters are used
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const userId = parsed?.id || parsed?.user?.id;
        if (userId) params.set("user_id", String(userId));
      }
    } catch {}
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
      // Optional explicit dates for custom ranges
      start_date: payload.start_date || undefined,
      end_date: payload.end_date || undefined,
      insights: !!(payload.insights ?? payload.sections?.insights),
      vitals: !!(payload.vitals ?? payload.sections?.vitals),
      labs: !!(payload.labs ?? payload.sections?.labs),
      goals: !!(payload.goals ?? payload.sections?.goals),
      output_format: resolvedFormat,
    };

    try { console.log('📤 ReportsApi.generate payload:', body); } catch {}

    // Choose endpoint based on layout
    const layoutLower = String(body.layout || 'detailed').toLowerCase();
    const endpoint = layoutLower === 'simple'
      ? CUSTOM_ENDPOINTS.reports.generateSimple
      : CUSTOM_ENDPOINTS.reports.generateDetailed;

    // Strategy: 1) JSON (per docs). If 400 filename -> 2) JSON + ?filename. If still fails -> 3) multipart + ?filename
    try {
      return await authRequest(endpoint, { method: 'POST', body });
    } catch (err1) {
      const needsFilename = (err1?.status === 400) && (
        err1?.data?.code === 'ERROR_CODE_INPUT_ERROR' || String(err1?.message || '').toLowerCase().includes('filename')
      );
      if (!needsFilename) throw err1;

      // Retry JSON with filename in query
      const params1 = new URLSearchParams();
      params1.set('filename', body.filename);
      const url1 = `${endpoint}?${params1.toString()}`;
      try {
        return await authRequest(url1, { method: 'POST', body });
      } catch (err2) {
        const stillNeeds = (err2?.status === 400) && (
          err2?.data?.code === 'ERROR_CODE_INPUT_ERROR' || String(err2?.message || '').toLowerCase().includes('filename')
        );
        if (!stillNeeds) throw err2;

        // Final fallback: multipart + query
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v !== undefined && v !== null) form.append(k, String(v));
        });
        return await authRequest(url1, { method: 'POST', body: form });
      }
    }
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
    const objectUrl = URL.createObjectURL(blob);
    // Open in new tab instead of forcing download
    window.open(objectUrl, '_blank', 'noopener');
    // Revoke after short delay to allow tab to load the blob
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return { success: true, filename: inferredName };
  },

  async downloadFileUrl(fileUrl, suggestedName = 'report') {
    if (!fileUrl) throw new Error('No file_url provided');
    window.open(fileUrl, '_blank', 'noopener');
    return { success: true, filename: suggestedName };
  },

  async share(payload) {
    // Spec: create or update share link for a report (auth required)
    const body = { ...payload };
    return await authRequest(CUSTOM_ENDPOINTS.reports.share, {
      method: "POST",
      body,
    });
  },

  async updateShare(shareId, payload) {
    return await authRequest(CUSTOM_ENDPOINTS.reports.updateShare(shareId), {
      method: "PATCH",
      body: payload,
    });
  },

  async sendShareEmail({ share_id, recipient_email, subject, custom_message, include_file_link }) {
    return await authRequest(CUSTOM_ENDPOINTS.reports.shareEmailSend, {
      method: "POST",
      body: { share_id, recipient_email, subject, custom_message, include_file_link },
    });
  },

  async revokeShare(shareId) {
    return await authRequest(CUSTOM_ENDPOINTS.reports.revokeShare(shareId), {
      method: "PATCH",
      body: {},
    });
  },

  async sharedByToken(token) {
    // Public endpoint; do NOT trigger auth refresh on this page
    const url = CUSTOM_ENDPOINTS.reports.sharedByToken(token);
    return await request(url, { method: "GET" });
  },
};

export default ReportsApi;


