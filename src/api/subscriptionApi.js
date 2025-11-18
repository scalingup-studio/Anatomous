import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

/**
 * Subscription API
 * Handles all subscription-related API calls
 */
export const SubscriptionApi = {
  /**
   * GET /my_subscription
   * Отримує поточну підписку користувача з деталями використання та інформацією про план
   */
  getMySubscription: async () => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.mySubscription, {
      method: "GET",
    });
  },

  /**
   * GET /user/plan
   * Повертає поточний план користувача та його функції
   */
  getUserPlan: async () => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.userPlan, {
      method: "GET",
    });
  },

  /**
   * POST /subscription/check-limits
   * Перевіряє, чи дозволена конкретна дія для поточного плану користувача
   * @param {string} action - Тип дії (ai_message, upload, create_note, etc.)
   * @param {number} quantity - Кількість (опціонально, за замовчуванням 1)
   */
  checkLimits: async (action, quantity = 1) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.checkLimits, {
      method: "POST",
      body: { action, quantity },
    });
  },

  /**
   * POST /subscription/update-usage
   * Оновлює лічильник використання для конкретної дії
   * Викликати ПІСЛЯ успішного виконання дії
   * @param {string} action - Тип дії (ai_message, upload, create_note, etc.)
   * @param {number} quantity - Кількість (зазвичай 1)
   * @param {string|number} increment - Збільшення (зазвичай "1" або 1, опціонально)
   */
  updateUsage: async (action, quantity = 1, increment = "1") => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.updateUsage, {
      method: "POST",
      body: { action, quantity, increment },
    });
  },

  /**
   * GET /plans
   * Отримує список доступних тарифних планів для сторінки оновлення
   */
  getPlans: async () => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.plans, {
      method: "GET",
    });
  },

  /**
   * GET /subscription/family_members
   * Отримує список членів сімейної підписки
   */
  getFamilyMembers: async () => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.familyMembers, {
      method: "GET",
    });
  },

  /**
   * POST /subscription/add_family_member
   * Додає нового члена до сімейної підписки
   * @param {string} email - Email нового члена сім'ї
   */
  addFamilyMember: async (email) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.addFamilyMember, {
      method: "POST",
      body: { email },
    });
  },

  /**
   * DELETE /subscription/remove_family_member
   * Видаляє члена з сімейної підписки
   * @param {string} memberId - ID члена сім'ї для видалення
   */
  removeFamilyMember: async (memberId) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.removeFamilyMember, {
      method: "DELETE",
      body: { member_id: memberId },
    });
  },

  /**
   * POST /payments/upgrade_subscription_post
   * Оновлює підписку користувача (через Stripe backend)
   * @param {string} planId - UUID плану з таблиці plans
   */
  upgradeSubscription: async (planId) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.upgradeSubscription, {
      method: "POST",
      body: { plan_id: planId },
    });
  },
};

export default SubscriptionApi;

