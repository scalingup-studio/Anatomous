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
      // chat_id should be null for new chats, or integer for existing chats
      let chatIdValue = null;
      if (data.chat_id !== null && data.chat_id !== undefined) {
        // Convert to integer if it's a string or number
        chatIdValue = typeof data.chat_id === 'string' ? parseInt(data.chat_id, 10) : data.chat_id;
        // If conversion failed, use 0 as default
        if (isNaN(chatIdValue)) {
          chatIdValue = 0;
        }
      }
      
      const requestData = {
        query: data.query || '',
        // metrics should be an object per spec; gracefully handle arrays/undefined
        metrics: (data && typeof data.metrics === 'object' && !Array.isArray(data.metrics)) ? data.metrics : {},
        // chat_id: null for new chats, or integer for existing chats
        chat_id: chatIdValue,
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
   * Get all AI insights/chats for the current user
   * GET /get-insight-user
   * Returns list of all chats for the user
   */
  async getInsightUser() {
    try {
      const url = `${API_BASE}/get-insight-user`;
      
      console.log('📤 get-insight-user URL:', url);

      const response = await authRequest(url, {
        method: "GET",
      });
      
      console.log('✅ get-insight-user response received:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting insight user:', error);
      throw error;
    }
  },

  /**
   * Get previous queries/insights for a specific chat
   * GET /get-insight?chat_id=...
   * Based on user requirements
   */
  async getInsight(chatId) {
    try {
      // chat_id is required (integer, default 0)
      const chatIdToUse = chatId || 0;
      const params = new URLSearchParams({ chat_id: String(chatIdToUse) });
      const url = `${API_BASE}/get-insight?${params}`;
      
      console.log('📤 get-insight URL:', url);
      console.log('📤 get-insight chat_id:', chatIdToUse);

      const response = await authRequest(url, {
        method: "GET",
      });
      
      console.log('✅ get-insight response received:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting insight:', error);
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