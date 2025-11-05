import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS, API_BASE } from "./apiConfig";

export const InsightApi = {
  /**
   * Generate a new insight based on health metrics
   * POST /generate-insight
   * Based on AI_INSIGTH.md documentation
   */
  async generateInsight(data) {
    try {
      const requestData = {
        query: data.query || '',
        metrics: data.metrics || [], // Always send metrics array
        // Xano endpoint expects body.data_range (note: not date_range)
        data_range: data.data_range || data.date_range || 'all'
      };

      const response = await authRequest(`${API_BASE}/generate-insight`, {
        method: "POST",
        body: requestData,
      });
      
      return response;
    } catch (error) {
      console.error('Error generating insight:', error);
      throw error;
    }
  },

  /**
   * Get recent insights for a specific metric
   * GET /insights_recent
   * Based on AI_INSIGTH.md documentation
   */
  async getRecentInsights(typeMetric) {
    try {
      const params = new URLSearchParams({ type_metric: typeMetric });
      const response = await authRequest(`${API_BASE}/insights_recent?${params}`, {
        method: "GET",
      });
      
      return response;
    } catch (error) {
      console.error('Error getting recent insights:', error);
      throw error;
    }
  },
};