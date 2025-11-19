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
    // expect { success: true, sorted_list: [...] }
    if (Array.isArray(res)) return res;
    return res?.sorted_list || [];
  },

  async create({ text, mood_tag, date }) {
    const payload = { text, mood_tag, date };
    const res = await authRequest(CUSTOM_ENDPOINTS.notes.create, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
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


