import { authRequest } from "./apiClient";
import { ENDPOINTS } from "./apiConfig";

export const HealthApi = {
  /**
   * Get all health data
   */
  async getAll() {
    try {
      const response = await authRequest(ENDPOINTS.healthData.getAll);
      return response;
    } catch (error) {
      console.error('Error fetching all health data:', error);
      throw error;
    }
  },

  /**
   * Get health data by user ID with optional filter parameters
   * @param {string} user_id - User ID
   * @param {Object} filterParams - Optional filter parameters
   * @param {string} filterParams.start_date - Start date filter (YYYY-MM-DD)
   * @param {string} filterParams.end_date - End date filter (YYYY-MM-DD)
   * @param {number} filterParams.heart_rate_min - Minimum heart rate
   * @param {number} filterParams.heart_rate_max - Maximum heart rate
   * @param {number} filterParams.bp_systolic_min - Minimum systolic blood pressure
   * @param {number} filterParams.bp_systolic_max - Maximum systolic blood pressure
   * @param {number} filterParams.bp_diastolic_min - Minimum diastolic blood pressure
   * @param {number} filterParams.bp_diastolic_max - Maximum diastolic blood pressure
   * @param {number} filterParams.activity_minutes_min - Minimum activity minutes
   * @param {number} filterParams.activity_minutes_max - Maximum activity minutes
   * @param {number} filterParams.activity_level_min - Minimum activity level
   * @param {number} filterParams.activity_level_max - Maximum activity level
   * @param {number} filterParams.bmi_min - Minimum BMI
   * @param {number} filterParams.bmi_max - Maximum BMI
   * @param {number} filterParams.temperature_min - Minimum temperature
   * @param {number} filterParams.temperature_max - Maximum temperature
   * @param {number} filterParams.glucose_min - Minimum glucose
   * @param {number} filterParams.glucose_max - Maximum glucose
   * @param {string} filterParams.sort_by - Sort column name
   * @param {string} filterParams.sort_order - Sort order ('asc' or 'desc')
   */
  async getByUserId(user_id, filterParams = {}) {
    try {
      // Build query string from filter parameters
      const queryParams = new URLSearchParams();
      
      // Helper to append only when value present
      const appendIfPresent = (key, value) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'string' && value.trim() === '') return;
        queryParams.append(key, value);
      };

      appendIfPresent('start_date', filterParams.start_date);
      appendIfPresent('end_date', filterParams.end_date);
      appendIfPresent('heart_rate_min', filterParams.heart_rate_min);
      appendIfPresent('heart_rate_max', filterParams.heart_rate_max);
      appendIfPresent('bp_systolic_min', filterParams.bp_systolic_min);
      appendIfPresent('bp_systolic_max', filterParams.bp_systolic_max);
      appendIfPresent('bp_diastolic_min', filterParams.bp_diastolic_min);
      appendIfPresent('bp_diastolic_max', filterParams.bp_diastolic_max);
      appendIfPresent('activity_minutes_min', filterParams.activity_minutes_min);
      appendIfPresent('activity_minutes_max', filterParams.activity_minutes_max);
      appendIfPresent('activity_level_min', filterParams.activity_level_min);
      appendIfPresent('activity_level_max', filterParams.activity_level_max);
      appendIfPresent('bmi_min', filterParams.bmi_min);
      appendIfPresent('bmi_max', filterParams.bmi_max);
      appendIfPresent('temperature_min', filterParams.temperature_min);
      appendIfPresent('temperature_max', filterParams.temperature_max);
      appendIfPresent('glucose_min', filterParams.glucose_min);
      appendIfPresent('glucose_max', filterParams.glucose_max);
      appendIfPresent('sort_date', filterParams.sort_date);
      appendIfPresent('sort_heart_rate', filterParams.sort_heart_rate);
      appendIfPresent('sort_blood_pressure', filterParams.sort_blood_pressure);
      appendIfPresent('sort_activity', filterParams.sort_activity);
      appendIfPresent('sort_bmi', filterParams.sort_bmi);
      appendIfPresent('sort_temperature', filterParams.sort_temperature);
      appendIfPresent('sort_glucose', filterParams.sort_glucose);
      // Don't send sort_by and sort_order - only use specific sort_* parameters
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${ENDPOINTS.healthData.getAll}/${user_id}?${queryString}`
        : `${ENDPOINTS.healthData.getAll}/${user_id}`;
      
      const response = await authRequest(url);
      return response;
    } catch (error) {
      console.error('Error fetching health data by user ID:', error);
      throw error;
    }
  },

  /**
   * Create new health data record
   */
  async create(data) {
    try {
      console.log('📝 Health data create payload:', data);
      console.log('📝 Health data create payload (JSON):', JSON.stringify(data, null, 2));
      const response = await authRequest(ENDPOINTS.healthData.create, {
        method: "POST",
        body: data,
      });
      return response;
    } catch (error) {
      console.error('Error creating health data:', error);
      throw error;
    }
  },

  /**
   * Update specific health data record by health_data_id
   * @param {string} user_id - User ID to include in URL
   * @param {string} health_data_id - Health data ID to update
   * @param {Object} data - Health data fields to update
   * 
   * @example
   * // Update health data for user with specific health_data_id
   * await HealthApi.updateRecord("51e43fdb-b975-4f99-90e9-8793024ae622", "c1e4b33c-5a6c-f66c-9020-d5793f9dde9e", {
   *   date: "1984-12-10",
   *   heart_rate: 62585865,
   *   blood_pressure_systolic: 15982,
   *   blood_pressure_diastolic: -48939256,
   *   weekly_activity_minutes: -11923139.205127731,
   *   activity_level: -17688024,
   *   visibility_scope: "private",
   *   hydration_liters: -12463869.491033956,
   *   pulse_oximetry: -52757245,
   *   respiratory_rate: -3833992,
   *   body_weight_trend: "reprehen",
   *   body_mass_index: 1462399.419555992,
   *   fasting_glucose: -7295863.15483503,
   *   body_temperature: 89632521.1517317
   * });
   */
  async updateRecord(user_id, health_data_id, data) {
    try {
      console.log('🏥 Updating health data record:', health_data_id, 'for user:', user_id);
      console.log('📝 Health data to update:', data);
      
      const payload = {
        health_data_id: health_data_id,
        ...data
      };
      console.log('📝 Health data update payload (with id):', payload);
      console.log('📝 Health data update payload (JSON):', JSON.stringify(payload, null, 2));
      
      const response = await authRequest(`${ENDPOINTS.healthData.getAll}/${user_id}`, {
        method: "PATCH",
        body: payload,
      });
      
      console.log('✅ Health data record updated successfully:', response);
      return response;
    } catch (error) {
      console.error('Error updating health data record:', error);
      throw error;
    }
  },

  /**
   * Update health data (legacy method - use updateRecord for better control)
   * @param {string} user_id - User ID to include in URL
   * @param {Object} data - Health data object containing health_data_id and other fields
   */
  async update(user_id, data) {
    try {
      console.log('🏥 Updating health data for user:', user_id);
      console.log('📝 Health data to update:', data);
      
      // Ensure health_data_id is included in the payload
      const payload = {
        ...data,
        health_data_id: data.health_data_id || data.id
      };
      
      const response = await authRequest(`${ENDPOINTS.healthData.getAll}/${user_id}`, {
        method: "PATCH",
        body: payload,
      });
      
      console.log('✅ Health data updated successfully:', response);
      return response;
    } catch (error) {
      console.error('Error updating health data:', error);
      throw error;
    }
  },

  /**
   * Delete specific health data record by health_data_id
   * @param {string} user_id - User ID to include in URL
   * @param {string} health_data_id - Health data ID to delete
   */
  async deleteRecord(user_id, health_data_id) {
    try {
      console.log('🗑️ Deleting health data record:', health_data_id, 'for user:', user_id);
      
      const response = await authRequest(`${ENDPOINTS.healthData.getAll}/${user_id}`, {
        method: "DELETE",
        body: { id: health_data_id },
      });
      
      console.log('✅ Health data record deleted successfully:', response);
      return response;
    } catch (error) {
      console.error('Error deleting health data record:', error);
      throw error;
    }
  },

  /**
   * Delete health data (legacy method - use deleteRecord for better control)
   */
  async delete(user_id) {
    try {
      const response = await authRequest(ENDPOINTS.healthData.remove(user_id), {
        method: "DELETE",
      });
      return response;
    } catch (error) {
      console.error('Error deleting health data:', error);
      throw error;
    }
  },
};