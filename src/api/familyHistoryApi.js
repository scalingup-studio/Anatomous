import { request, authRequest } from "./apiClient";
import { API_BASE } from "./apiConfig";

// Family History API wrapper per provided spec
// - GET    /family_history/{user_id}            (public)
// - POST   /family_history                      (public)
// - PATCH  /family_history/{family_history_id}  (auth)
// - DELETE /family_history/{family_history_id}  (auth)

export const FamilyHistoryApi = {
  async listByUser(userId) {
    if (!userId) throw new Error("userId is required");
    const url = `${API_BASE}/family_history/${encodeURIComponent(userId)}`;
    return await request(url, { method: "GET" });
  },

  async create(payload) {
    const url = `${API_BASE}/family_history`;
    return await request(url, { method: "POST", body: payload });
  },

  async update(familyHistoryId, payload) {
    if (familyHistoryId == null) throw new Error("familyHistoryId is required");
    const url = `${API_BASE}/family_history/${encodeURIComponent(familyHistoryId)}`;
    return await authRequest(url, { method: "PATCH", body: payload });
  },

  async remove(familyHistoryId) {
    if (familyHistoryId == null) throw new Error("familyHistoryId is required");
    const url = `${API_BASE}/family_history/${encodeURIComponent(familyHistoryId)}`;
    return await authRequest(url, { method: "DELETE" });
  },
};

export default FamilyHistoryApi;


