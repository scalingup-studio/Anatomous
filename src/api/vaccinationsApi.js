import { request, authRequest } from "./apiClient";
import { API_BASE } from "./apiConfig";

// Vaccinations API wrapper based on provided spec
// Endpoints:
// - GET    /vaccinations                     (public)
// - POST   /vaccinations                     (public per spec, but we will send auth if present)
// - GET    /vaccinations/{user_id}           (auth required)
// - PATCH  /vaccinations/{vaccinations_id}   (auth required)
// - DELETE /vaccinations/{vaccinations_id}   (auth required)

export const VaccinationsApi = {
  async listAll() {
    const url = `${API_BASE}/vaccinations`;
    return await request(url, { method: "GET" });
  },

  async listByUser(userId) {
    if (!userId) throw new Error("userId is required");
    const url = `${API_BASE}/vaccinations/${encodeURIComponent(userId)}`;
    return await authRequest(url, { method: "GET" });
  },

  async create(payload) {
    const url = `${API_BASE}/vaccinations`;
    return await request(url, { method: "POST", body: payload });
  },

  async update(vaccinationsId, payload) {
    if (!vaccinationsId && vaccinationsId !== 0) throw new Error("vaccinationsId is required");
    const url = `${API_BASE}/vaccinations/${encodeURIComponent(vaccinationsId)}`;
    return await authRequest(url, { method: "PATCH", body: payload });
  },

  async remove(vaccinationsId) {
    if (!vaccinationsId && vaccinationsId !== 0) throw new Error("vaccinationsId is required");
    const url = `${API_BASE}/vaccinations/${encodeURIComponent(vaccinationsId)}`;
    return await authRequest(url, { method: "DELETE" });
  },
};

export default VaccinationsApi;


