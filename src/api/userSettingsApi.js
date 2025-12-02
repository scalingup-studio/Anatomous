import { authRequest } from "./apiClient";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "./apiConfig";

export const UserSettingsApi = {
  // GET /user_settings - Query all user_settings records
  getAll: () => authRequest(ENDPOINTS.userSettings.getAll),

  // GET /user_settings/{user_id} - Get user_settings record for user
  getByUserId: (user_id) => authRequest(ENDPOINTS.userSettings.getById(user_id)),

  // POST /user_settings - Add user_settings record
  create: (data) => authRequest(ENDPOINTS.userSettings.create, {
    method: "POST",
    body: data,
  }),

  // PATCH /user_settings/{user_id} - Edit user_settings record
  update: (user_id, data) => authRequest(ENDPOINTS.userSettings.update(user_id), {
    method: "PATCH",
    body: data,
  }),

  // DELETE /user_settings/{user_id} - Delete user_settings record
  delete: (user_id) => authRequest(ENDPOINTS.userSettings.remove(user_id), {
    method: "DELETE",
  }),

  // ✅ ONBOARDING METHOD
  // POST /onboarding/{step} - Save data for specific onboarding step
  saveOnboardingStep: (step, data) => authRequest(CUSTOM_ENDPOINTS.onboarding.step(step), {
    method: "POST",
    body: data,
  }),

  // 🔔 AI / privacy preferences (Update user settings: privacy #42)
  // POST /update_settings with { ai_preferences: { ... } }
  updateAiPreferences: (preferences) => authRequest(CUSTOM_ENDPOINTS.accountSettings.updateSettings, {
    method: "POST",
    body: (() => {
      const payload = { ai_preferences: preferences };
      try {
        console.log(
          "🛡️ [UserSettingsApi.updateAiPreferences] payload:",
          JSON.stringify(payload, null, 2)
        );
      } catch {}
      return payload;
    })(),
  }),

  // GET /get_ai_preferences
  getAiPreferences: () => authRequest(CUSTOM_ENDPOINTS.accountSettings.getAiPreferences, {
    method: "GET",
  }),
};