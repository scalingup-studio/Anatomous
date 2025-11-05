import { authRequest } from "./apiClient";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "./apiConfig";

export const HealthHistoryApi = {
  /**
   * Get health history summary
   */
  async getHealthHistorySummary(userId) {
    try {
      return await authRequest(CUSTOM_ENDPOINTS.healthHistory.getHealthHistorySummary, {
        method: 'POST',
        body: { user_id: userId }
      });
    } catch (error) {
      console.error('Error fetching health history summary:', error);
      throw error;
    }
  },

  /**
   * Save consolidated user health summary to one table
   * Mirrors POST /user-health-summary from spec
   */
  async saveUserHealthSummary(payload) {
    try {
      return await authRequest(CUSTOM_ENDPOINTS.healthHistory.userHealthSummary, {
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      console.error('Error saving user health summary:', error);
      throw error;
    }
  },

  /**
   * Add medical condition
   */
  async addMedicalCondition(data) {
    try {
      return await authRequest(ENDPOINTS.medicalConditions.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding medical condition:', error);
      throw error;
    }
  },

  /**
   * Add medication
   */
  async addMedication(data) {
    try {
      return await authRequest(ENDPOINTS.medications.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  },

  /**
   * Add allergy
   */
  async addAllergy(data) {
    try {
      return await authRequest(ENDPOINTS.allergies.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding allergy:', error);
      throw error;
    }
  },

  /**
   * Add surgical history
   */
  async addSurgicalHistory(data) {
    try {
      return await authRequest(ENDPOINTS.surgicalHistory.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding surgical history:', error);
      throw error;
    }
  },

  /**
   * Add vaccination
   */
  async addVaccination(data) {
    try {
      return await authRequest(ENDPOINTS.vaccinations.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding vaccination:', error);
      throw error;
    }
  },

  /**
   * Update vaccination via PATCH /vaccinations/{vaccinations_id}
   */
  async updateVaccination(vaccinations_id, data) {
    try {
      const url = ENDPOINTS.vaccinations.update(vaccinations_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating vaccination:', error);
      throw error;
    }
  },

  /**
   * Add sensitivity
   */
  async addSensitivity(data) {
    try {
      return await authRequest(ENDPOINTS.sensitivities.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding sensitivity:', error);
      throw error;
    }
  },

  /**
   * Update sensitivity
   * @param {number} sensitivities_id - Sensitivity ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateSensitivity(sensitivities_id, data) {
    try {
      const url = ENDPOINTS.sensitivities.update(sensitivities_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating sensitivity:', error);
      throw error;
    }
  },

  /**
   * Add family history
   */
  async addFamilyHistory(data) {
    try {
      return await authRequest(ENDPOINTS.familyHistory.create, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('Error adding family history:', error);
      throw error;
    }
  },

  /**
   * Update medical condition
   * @param {number} medical_conditions_id - Medical condition ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateMedicalCondition(medical_conditions_id, data) {
    try {
      const url = ENDPOINTS.medicalConditions.update(medical_conditions_id);
      console.log('🔄 Updating medical condition:', { url, method: 'PATCH', body: data });
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating medical condition:', error);
      console.error('Request details:', {
        endpoint: ENDPOINTS.medicalConditions.update(medical_conditions_id),
        medical_conditions_id,
        data
      });
      throw error;
    }
  },

  /**
   * Update allergy
   * @param {number} allergies_id - Allergy ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateAllergy(allergies_id, data) {
    try {
      const url = ENDPOINTS.allergies.update(allergies_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating allergy:', error);
      throw error;
    }
  },

  /**
   * Delete medical condition
   */
  async deleteMedicalCondition(id) {
    try {
      return await authRequest(ENDPOINTS.medicalConditions.remove(id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting medical condition:', error);
      throw error;
    }
  },

  /**
   * Update medication
   * @param {number} medications_id - Medication ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateMedication(medications_id, data) {
    try {
      const url = ENDPOINTS.medications.update(medications_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  },

  /**
   * Delete allergy
   * @param {number} allergies_id - Allergy ID for the endpoint
   */
  async deleteAllergy(allergies_id) {
    try {
      return await authRequest(ENDPOINTS.allergies.remove(allergies_id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting allergy:', error);
      throw error;
    }
  },

  /**
   * Delete medication
   * @param {number} medications_id - Medication ID for the endpoint
   */
  async deleteMedication(medications_id) {
    try {
      return await authRequest(ENDPOINTS.medications.remove(medications_id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  },

  /**
   * Delete sensitivity
   * @param {number} sensitivities_id - Sensitivity ID for the endpoint
   */
  async deleteSensitivity(sensitivities_id) {
    try {
      return await authRequest(ENDPOINTS.sensitivities.remove(sensitivities_id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting sensitivity:', error);
      throw error;
    }
  },

  /**
   * Update surgical history
   * @param {number} surgical_history_id - Surgical history ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateSurgicalHistory(surgical_history_id, data) {
    try {
      const url = ENDPOINTS.surgicalHistory.update(surgical_history_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating surgical history:', error);
      throw error;
    }
  },

  /**
   * Delete surgical history
   * @param {number} surgical_history_id - Surgical history ID for the endpoint
   */
  async deleteSurgicalHistory(surgical_history_id) {
    try {
      const url = ENDPOINTS.surgicalHistory.remove(surgical_history_id);
      console.log('🗑️ Deleting surgical history:', { url, method: 'DELETE', surgical_history_id });
      const response = await authRequest(url, {
        method: 'DELETE'
      });
      console.log('✅ Surgical history deleted successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error deleting surgical history:', error);
      console.error('Request details:', {
        endpoint: ENDPOINTS.surgicalHistory.remove(surgical_history_id),
        surgical_history_id,
        errorMessage: error?.message,
        errorCode: error?.code
      });
      throw error;
    }
  },

  /**
   * Update family history
   * @param {number} family_history_id - Family history ID for the endpoint
   * @param {Object} data - Update data
   */
  async updateFamilyHistory(family_history_id, data) {
    try {
      const url = ENDPOINTS.familyHistory.update(family_history_id);
      return await authRequest(url, {
        method: 'PATCH',
        body: data
      });
    } catch (error) {
      console.error('Error updating family history:', error);
      throw error;
    }
  },

  /**
   * Delete family history
   * @param {number} family_history_id - Family history ID for the endpoint
   */
  async deleteFamilyHistory(family_history_id) {
    try {
      return await authRequest(ENDPOINTS.familyHistory.remove(family_history_id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting family history:', error);
      throw error;
    }
  },

  /**
   * Delete vaccination
   * @param {number} vaccinations_id - Vaccination ID for the endpoint
   */
  async deleteVaccination(vaccinations_id) {
    try {
      return await authRequest(ENDPOINTS.vaccinations.remove(vaccinations_id), {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting vaccination:', error);
      throw error;
    }
  }
};

/**
 * Health History (consolidated) helpers
 */
export const HealthHistoryConsolidated = {
  /**
   * PATCH /health_history/{user_id}
   * Update a consolidated health_history record for a user
   * Body example:
   * {
   *   health_history_id: number,
   *   category: 'medical_conditions' | 'medications' | 'allergies' | 'surgical_history' | 'vaccinations' | 'sensitivities' | 'family_history',
   *   last_updated: number,
   *   record_id: number,
   *   entry_date: 'YYYY-MM-DD',
   *   importance: 'low' | 'medium' | 'high',
   *   notes: string
   * }
   */
  async update(user_id, data) {
    try {
      return await authRequest(ENDPOINTS.healthHistory.update(user_id), {
        method: 'PATCH',
        body: data,
      });
    } catch (error) {
      console.error('Error updating health_history record:', error);
      throw error;
    }
  }
};