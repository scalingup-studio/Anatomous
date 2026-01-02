import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

export const ComprehensiveAlertsApi = {
  /**
   * Create or update a comprehensive alert based on user metrics
   * @param {Object} data - The request payload
   * @param {string} data.user_id - User ID
   * @param {Array} data.alerts_item_list - List of alerts to process
   * @param {string|Date} [data.last_metric_date] - Optional last metric update date
   */
  async createComprehensiveAlert(data) {
    try {
        const requestData = {
            user_id: data.user_id,
            metrics: data.metrics || [],
          };

      const response = await authRequest(CUSTOM_ENDPOINTS.comprehensiveAlerts.comprehensiveAlerts, {
        method: "POST",
        body: requestData,
      });

      return response;
    } catch (error) {
      console.error("❌ Error creating comprehensive alert:", error);
      throw error;
    }
  },

  /**
   * Fetch all comprehensive alerts for a specific user
   * @param {string} userId - The user ID (optional, backend filters by auth.id)
   */
  async fetchComprehensiveAlerts(userId) {
    try {
      const response = await authRequest(CUSTOM_ENDPOINTS.comprehensiveAlerts.getComprehensiveAlerts, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response;
    } catch (error) {
      console.error("❌ Error fetching comprehensive alerts:", error);
      throw error;
    }
  },

//   /**
//    * Resolve or deactivate a comprehensive alert
//    * @param {string} alertId - The ID of the alert to resolve
//    */
//   async resolveComprehensiveAlert(alertId) {
//     try {
//       const response = await authRequest(
//         `${CUSTOM_ENDPOINTS.comprehensiveAlerts.comprehensiveAlerts}/${alertId}/resolve`,
//         { method: "PATCH" }
//       );

//       return response;
//     } catch (error) {
//       console.error("❌ Error resolving comprehensive alert:", error);
//       throw error;
//     }
//   },
};
