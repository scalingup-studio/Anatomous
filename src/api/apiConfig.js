export const API_BASE = "https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO";
export const API_BASE_AUTH = "https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5";
export const API_DOMEN_DEV = "https://xu6p-ejbd-2ew4.n7e.xano.io";

// CRUD helper
function crud(table) {
  return {
    getAll: `${API_BASE}/${table}`,
    getById: (id) => `${API_BASE}/${table}/${id}`,
    create: `${API_BASE}/${table}`,
    update: (id) => `${API_BASE}/${table}/${id}`,
    remove: (id) => `${API_BASE}/${table}/${id}`,
  };
}

export const ENDPOINTS = {
  users: crud("users"),
  userSettings: crud("user_settings"),
  goals: crud("goals"),
  healthData: crud("health_data"),
  profiles: crud("profiles"),
  healthHistory: crud("health_history"),
  medicalConditions: crud("medical_conditions"),
  medications: crud("medications"),
  allergies: crud("allergies"),
  surgicalHistory: crud("surgical_history"),
  vaccinations: crud("vaccinations"),
  sensitivities: crud("sensitivities"),
  familyHistory: crud("family_history"),
};

export const CUSTOM_ENDPOINTS = {
  auth: {
    login: `${API_BASE_AUTH}/auth/login`,
    logout: `${API_BASE_AUTH}/auth/logout`,
    refreshToken: `${API_BASE_AUTH}/auth/refresh`,
    signup: `${API_BASE_AUTH}/auth/signup`,
    forgotPassword: `${API_BASE_AUTH}/auth/forgot-password`,
    resetPassword: `${API_BASE_AUTH}/auth/reset-password`,
    google: `${API_BASE_AUTH}/auth/google`,
    googleCallback: `${API_BASE_AUTH}/auth/callback/google`,
    googleSuccess: `${API_BASE_AUTH}/auth/success`,
    checkAuth: `${API_BASE_AUTH}/auth/check-auth`,
  },
  reports: {
    generate: `${API_BASE}/report/generate`, // backward compatibility
    generateSimple: `${API_BASE}/report/generate/simple`,
    generateDetailed: `${API_BASE}/report/generate/detailed`,
    list: `${API_BASE}/reports`,
    download: `${API_BASE}/reports/download`,
    share: `${API_BASE}/reports/share`,
    // Build URL with token param for public access
    sharedByToken: (token) => `${API_BASE}/reports/shared/token${token ? `?token=${encodeURIComponent(token)}` : ''}`,
    // Email send endpoint
    shareEmailSend: `${API_BASE}/reports/share/email-send`,
    // Update share info (expiration, visibility, title)
    updateShare: (shareId) => `${API_BASE}/reports/shares/${shareId}`,
    // Revoke share (set is_active=false)
    revokeShare: (shareId) => `${API_BASE}/reports/shares/revoke/${shareId}`
  },
  onboarding: {
    step: (step) => `${API_BASE}/onboarding/${step}`,
    personal: `${API_BASE}/onboarding/personal`,
    healthSnapshot: `${API_BASE}/onboarding/health_snapshot`,
    lifestyle: `${API_BASE}/onboarding/lifestyle`,
    healthGoals: `${API_BASE}/onboarding/health_goals`,
    privacy: `${API_BASE}/onboarding/privacy`,
    complete: `${API_BASE}/onboarding/complete`,
  },
  healthHistory: {
    getHealthHistorySummary: `${API_BASE}/health_history_summary`,
    userHealthSummary: `${API_BASE}/user-health-summary`
  }, 
  insights: {
    generateInsights: `${API_BASE}/generate-insight`,
    getInsight: `${API_BASE}/get-insight`
  },
  checkThreshold: {
    checkThreshold: `${API_BASE}/check-threshold`
  },
  alertsInsight: {
    getAlertsInsight: `${API_BASE}/alerts_ai/{user_id}`
  },
  comprehensiveAlerts: {
    comprehensiveAlerts: `${API_BASE}/get-comprehensive-alerts`,
  },
  uploudFile: {
    uploudFile: `${API_BASE}/upload/attachment_file`,
    avatarUpload: `${API_BASE}/upload/avatar`,
    getUserUploudFiles: `${API_BASE}/upload/get_files`,
    downloadFile: `${API_BASE}/upload/download_file`,
    deleteFile: `${API_BASE}/upload/delete_file`
  },
  goals: {
    getGoals: `${API_BASE}/goals/get/goals`,
    getHistory: `${API_BASE}/goals/get/history`,
    readd: `${API_BASE}/goals/readd`,
  },
  goalProgress: {
    create: `${API_BASE}/goal/progress`,
    getProgress: `${API_BASE}/goal/get/progress`,
    remove: (id) => `${API_BASE}/goal/progress/${id}`,
  },
  notes: {
    list: `${API_BASE}/notes`,
    create: `${API_BASE}/notes`,
    update: (id) => `${API_BASE}/notes/note/${id}`,
    getNote: `${API_BASE}/notes/get/note`,
  },
};