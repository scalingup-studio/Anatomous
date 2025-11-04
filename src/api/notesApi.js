import { authRequest } from "./apiClient.js";
import { CUSTOM_ENDPOINTS } from "./apiConfig.js";

export const NotesApi = {
  async list() {
    const res = await authRequest(CUSTOM_ENDPOINTS.notes.list, {
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


