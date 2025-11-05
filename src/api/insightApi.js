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
        // metrics should be an object per spec; gracefully handle arrays/undefined
        metrics: (data && typeof data.metrics === 'object' && !Array.isArray(data.metrics)) ? data.metrics : {},
        // Optional: some backends expect body.data_range; include only if provided
        ...(data?.data_range || data?.date_range ? { data_range: data.data_range || data.date_range } : {})
      };

      try { console.log('📤 generate-insight body:', requestData); } catch {}

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