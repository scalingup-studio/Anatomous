import { authRequest } from "./apiClient.js";
import { CUSTOM_ENDPOINTS } from "./apiConfig.js";

export const NotesApi = {
  /**
   * Get list of notes with optional filter parameters
   * @param {Object} filterParams - Optional filter parameters
   * @param {string} filterParams.start_date - Start date filter (YYYY-MM-DD)
   * @param {string} filterParams.end_date - End date filter (YYYY-MM-DD)
   * @param {string} filterParams.mood_tag - Filter by mood tag
   * @param {string} filterParams.search - Keyword search for note text and mood tags
   */
  async list(filterParams = {}) {
    // Build query string from filter parameters
    const queryParams = new URLSearchParams();
    
    // Add filter parameters (only non-empty values)
    if (filterParams.start_date) queryParams.append('start_date', filterParams.start_date);
    if (filterParams.end_date) queryParams.append('end_date', filterParams.end_date);
    if (filterParams.mood_tag) queryParams.append('mood_tag', filterParams.mood_tag);
    if (filterParams.search) queryParams.append('search', filterParams.search);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${CUSTOM_ENDPOINTS.notes.list}?${queryString}`
      : CUSTOM_ENDPOINTS.notes.list;
    
    const res = await authRequest(url, {
      method: "GET",
    });
    
    // Handle different response formats
    // API might return: array, { result: [...] }, { sorted_list: [...] }, or { data: [...] }
    if (Array.isArray(res)) {
      return res;
    }
    if (res?.result && Array.isArray(res.result)) {
      return res.result;
    }
    if (res?.sorted_list && Array.isArray(res.sorted_list)) {
      return res.sorted_list;
    }
    if (res?.data && Array.isArray(res.data)) {
      return res.data;
    }
    // Fallback: return empty array if no valid format found
    console.warn('⚠️ NotesApi.list: Unexpected response format:', res);
    return [];
  },

  async create({ text, mood_tag, date }) {
    const payload = { text, mood_tag, date };
    const res = await authRequest(CUSTOM_ENDPOINTS.notes.create, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    
    // Check if response contains error in payload
    // API might return: { payload: { success: false, error: "...", message: "..." }, statement: "Throw Error" }
    if (res?.payload) {
      const payloadData = res.payload;
      if (payloadData.success === false) {
        // Extract error message from payload
        const errorMessage = payloadData.message || payloadData.error || "Failed to create note";
        throw new Error(errorMessage);
      }
    }
    
    return res;
  },

  async update(id, { text, mood_tag, date }) {
    const payload = { text, mood_tag, date };
    const res = await authRequest(CUSTOM_ENDPOINTS.notes.update(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    return res;
  },

  async getById(id) {
    const url = `${CUSTOM_ENDPOINTS.notes.getNote}?id=${encodeURIComponent(id)}`;
    const res = await authRequest(url, { method: "GET" });
    return res;
  },

  async delete(id, { user_id } = {}) {
    const res = await authRequest(CUSTOM_ENDPOINTS.notes.update(id), {
      method: "DELETE",
      body: JSON.stringify(user_id ? { user_id } : {}),
      headers: { "Content-Type": "application/json" },
    });
    return res;
  },
};


