import { authRequest } from "./apiClient";
import { ENDPOINTS } from "./apiConfig";

export const CoreBodyMetricsApi = {
  /**
   * Get all core_body_metrics records for user
   * GET /core_body_metrics
   */
  async getAll() {
    try {
      const res = await authRequest(ENDPOINTS.coreBodyMetrics.getAll);
      return res?.result ?? res;
    } catch (error) {
      console.error('Error fetching core body metrics:', error);
      throw error;
    }
  },

  /**
   * Get core_body_metrics record by ID
   * GET /core_body_metrics/{core_body_metrics_id}
   */
  async getById(core_body_metrics_id) {
    try {
      const res = await authRequest(ENDPOINTS.coreBodyMetrics.getById(core_body_metrics_id));
      return res?.result ?? res;
    } catch (error) {
      console.error('Error fetching core body metrics record:', error);
      throw error;
    }
  },

  /**
   * Create new core_body_metrics record
   * POST /core_body_metrics
   */
  async create(data) {
    try {
      const res = await authRequest(ENDPOINTS.coreBodyMetrics.create, {
        method: "POST",
        body: data,
      });
      return res?.result ?? res;
    } catch (error) {
      console.error('Error creating core body metrics:', error);
      throw error;
    }
  },

  /**
   * Update core_body_metrics record
   * PATCH /core_body_metrics/{core_body_metrics_id}
   */
  async update(core_body_metrics_id, data) {
    try {
      const res = await authRequest(ENDPOINTS.coreBodyMetrics.update(core_body_metrics_id), {
        method: "PATCH",
        body: data,
      });
      return res?.result ?? res;
    } catch (error) {
      console.error('Error updating core body metrics:', error);
      throw error;
    }
  },

  /**
   * Delete core_body_metrics record
   * DELETE /core_body_metrics/{core_body_metrics_id}
   */
  async delete(core_body_metrics_id) {
    try {
      const res = await authRequest(ENDPOINTS.coreBodyMetrics.remove(core_body_metrics_id), {
        method: "DELETE",
      });
      return res?.result ?? res;
    } catch (error) {
      console.error('Error deleting core body metrics:', error);
      throw error;
    }
  },
};

