import { authRequest } from "./apiClient";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "./apiConfig";

export const OnboardingApi = {
  /**
   * Save personal information step
   * Updates user table with basic profile data
   */
  async savePersonalInfo(data) {
    try {
      const payload = {
        user_id: data.userId || data.user_id,
        step: "personal",
        data_json: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email || '',
          phone_number: data.phoneNumber || '',
          dob: data.dateOfBirth,
          gender: data.genderIdentity,
          sex_of_birth: data.sexAtBirth || '',
          height: data.height ? parseInt(data.height) : null,
          height_type: (data.height_type ?? data.heightUnit ?? '') || '',
          weight: data.weight ? parseInt(data.weight) : null,
          weight_type: (data.weight_type ?? data.weightUnit ?? '') || '',
          zip_code: data.zipCode || null
        }
      };

      
      // Debug: show what would be sent to profiles/{user_id}
      try {
        const apiBase = ENDPOINTS.profiles.getById('').replace(/\/profiles\/$/, '/profiles'); // derive base
        const profileUrl = `${apiBase}/${payload.user_id}`;
        const profilePayload = {
          first_name: payload.data_json.first_name,
          last_name: payload.data_json.last_name,
          dob: payload.data_json.dob,
          sex_of_birth: payload.data_json.sex_of_birth || '',
          phone_number: payload.data_json.phone_number || '',
          zip_code: payload.data_json.zip_code || '',
          height_cm: payload.data_json.height ?? null,
          height_type: payload.data_json.height_type || '',
          weight_kg: payload.data_json.weight ?? null,
          weight_type: payload.data_json.weight_type || ''
        };
      } catch (e) {
        // swallow debug errors
      }
      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.personal, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      // Additionally patch profiles/{user_id} with explicit unit fields as requested
      try {
        const profilePatchUrl = ENDPOINTS.profiles.update(payload.user_id);
        const patchBody = {
          height_type: payload.data_json.height_type || '',
          weight_type: payload.data_json.weight_type || ''
        };
        await authRequest(profilePatchUrl, {
          method: "PATCH",
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: patchBody
        });
      } catch (e) {
        console.warn('⚠️ Failed to PATCH profile units (will continue):', e?.message || e);
      }
      return res?.result ?? res;
    } catch (error) {
      console.error('Error saving personal info:', error);
      throw error;
    }
  },

  /**
   * Save health snapshot step
   * Updates user_settings table with health_snapshot JSON
   */
  async saveHealthSnapshot(data) {
    try {
      // Ensure arrays are properly formatted
      const ensureArray = (arr) => {
        if (!arr) return [];
        if (Array.isArray(arr)) return arr.filter(item => item && item.trim());
        if (typeof arr === 'string') return arr.split(',').map(item => item.trim()).filter(item => item.length > 0);
        return [];
      };
      
      const payload = {
        step: "health_snapshot",
        data_json: {
          health_snapshot: {
            health_conditions: ensureArray(data.healthConditions),
            medications: ensureArray(data.medications),
            allergies: ensureArray(data.allergies),
          }
        }
      };

      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.healthSnapshot, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error saving health snapshot:', error);
      throw error;
    }
  },

  /**
   * Save lifestyle & habits step
   * Updates user_settings table with lifestyle JSON
   */
  async saveLifestyle(data) {
    try {
      const payload = {
        user_id: data.userId || data.user_id,
        step: "lifestyle",
        data_json: {
          lifestyle: {
            habits: data.lifestyleHabits || [],
            preferences: {
              // Additional lifestyle preferences can be added here
            }
          }
        }
      };

      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.lifestyle, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error saving lifestyle:', error);
      throw error;
    }
  },

  /**
   * Save health goals step
   * Creates entries in goals table
   */
  async saveHealthGoals(data) {
    try {
      // Get selected health goals (array of goal titles)
      const selectedGoals = Array.isArray(data.healthGoals) ? data.healthGoals : [];
      
      // Default target date (+90 days from now)
      const defaultTargetDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetDate = data.targetDate || defaultTargetDate;
      const visibilityScope = data.goalVisibility || "private";
      
      // Create an array of goal objects - one for each selected goal
      const goalsDataArray = selectedGoals.map((goalTitle) => {
        // Use goalNotes as description if provided, otherwise use a default description based on the goal title
        const description = data.goalNotes || `Goal: ${goalTitle}`;
        
        return {
          title: goalTitle,
          description: description,
          status: "on track",
          target_date: targetDate,
          visibility_scope: visibilityScope,
        };
      });

      // If no goals selected but there's a goalNotes or otherGoal, create a single goal
      if (goalsDataArray.length === 0 && (data.goalNotes || data.otherGoal)) {
        goalsDataArray.push({
          title: data.otherGoal || "Health Goals",
          description: data.goalNotes || "General wellness and balance",
          status: "on track",
          target_date: targetDate,
          visibility_scope: visibilityScope,
        });
      }

      // If still no goals, create a default one
      if (goalsDataArray.length === 0) {
        goalsDataArray.push({
          title: "Health Goals",
          description: "General wellness and balance",
          status: "on track",
          target_date: targetDate,
          visibility_scope: visibilityScope,
        });
      }

      const payload = {
        user_id: data.userId || data.user_id,
        step: "health_goals",
        data_json: goalsDataArray
      };
      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.healthGoals, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error saving health goals:', error);
      throw error;
    }
  },

  /**
   * Save privacy settings step
   * Updates user_settings table with privacy JSON
   */
  async savePrivacySettings(data) {
    try {
      const payload = {
        user_id: data.userId || data.user_id,
        step: "privacy",
        data_json: {
          privacy: {
            data_visibility: data.dataVisibility,
            email_nudges: data.emailNudges,
            wearable_sync: data.wearableSync,
            preferences: {
              // Additional privacy preferences can be added here
            }
          }
        }
      };

      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.privacy, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      throw error;
    }
  },

  /**
   * Complete onboarding process
   * Marks onboarding as completed and updates user_settings
   */
  async completeOnboarding(data) {
    try {
      const payload = {
        user_id: data.userId || data.user_id,
        data_json: {
          onboarding: {
            completed: true,
            completed_at: new Date().toISOString(),
            steps_completed: data.stepsCompleted || [],
            preferences: {
              // Additional onboarding preferences
            }
          }
        }
      };

      
      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.complete, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  },

  /**
   * Generic step saver - can be used for any step
   */
  async saveStep(stepId, data) {
    try {
      const endpoint = CUSTOM_ENDPOINTS.onboarding.step(stepId);
      
      
      const res = await authRequest(endpoint, {
        method: "POST",
        body: data,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error(`Error saving step ${stepId}:`, error);
      throw error;
    }
  },

  /**
   * Get current onboarding progress by calling welcome API
   */
  async getProgress(userId) {
    try {
      const payload = {
        user_id: userId,
        data_json: {}
      };


      const res = await authRequest(CUSTOM_ENDPOINTS.onboarding.step('welcome'), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload,
      });
      
      return res?.result ?? res;
    } catch (error) {
      console.error('Error getting onboarding progress via welcome API:', error);
      throw error;
    }
  }

};
