import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

/**
 * Notifications API
 * Handles notification preferences and test notification sending
 */
export const NotificationsApi = {
  /**
   * GET /notifications/get_notification_preferences
   * Отримати поточні налаштування сповіщень користувача
   */
  async getPreferences() {
    return authRequest(CUSTOM_ENDPOINTS.notifications.getPreferences, {
      method: "GET",
    });
  },

  /**
   * POST /notifications/update_notification_preferences
   * Оновити налаштування сповіщень
   * Приймає тільки ті поля, які потрібно змінити
   */
  async updatePreferences(payload = {}) {
    // Debug: log request payload for notification preferences
    try {
      console.log(
        "🔔 [NotificationsApi.updatePreferences] payload:",
        JSON.stringify(payload, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.notifications.updatePreferences, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * notifications/send_ai_insight
   * Надсилання AI Insight сповіщення (для адмінки/тестів)
   */
  async sendAiInsightNotification({ user_id, subject, message }) {
    const body = { user_id, subject, message };
    try {
      console.log(
        "🔔 [NotificationsApi.sendAiInsightNotification] payload:",
        JSON.stringify(body, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.notifications.sendAiInsight, {
      method: "POST",
      body,
    });
  },

  /**
   * notifications/send_health_alert
   * Надсилання Health Alert сповіщення
   */
  async sendHealthAlertNotification({ user_id, subject, message }) {
    const body = { user_id, subject, message };
    try {
      console.log(
        "🔔 [NotificationsApi.sendHealthAlertNotification] payload:",
        JSON.stringify(body, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.notifications.sendHealthAlert, {
      method: "POST",
      body,
    });
  },

  /**
   * notifications/send_product_update
   * Надсилання Product Update сповіщення
   */
  async sendProductUpdateNotification({ user_id, subject, message }) {
    const body = { user_id, subject, message };
    try {
      console.log(
        "🔔 [NotificationsApi.sendProductUpdateNotification] payload:",
        JSON.stringify(body, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.notifications.sendProductUpdate, {
      method: "POST",
      body,
    });
  },

  /**
   * notifications/send_notifications
   * Універсальний відправник сповіщень (email / SMS / in-app)
   */
  async sendUniversalNotification(payload) {
    try {
      console.log(
        "🔔 [NotificationsApi.sendUniversalNotification] payload:",
        JSON.stringify(payload, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.notifications.sendUniversal, {
      method: "POST",
      body: payload,
    });
  },
};

export default NotificationsApi;


