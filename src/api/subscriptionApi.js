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
   * GET /plans
   * Отримує список доступних тарифних планів для сторінки оновлення
   */
  getPlans: async () => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.plans, {
      method: "GET",
    });
  },

  /**
   * GET /family/members
   * Отримує список членів сімейної підписки
   * @param {object} options - Опції запиту
   * @param {string} options.status - Фільтр за статусом (active, pending, inactive)
   * @param {boolean} options.include_profiles - Включити деталі профілю (за замовчуванням true)
   * @param {number} options.page - Номер сторінки (за замовчуванням 1)
   * @param {number} options.per_page - Кількість записів на сторінці (макс 100, за замовчуванням 20)
   */
  getFamilyMembers: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.include_profiles !== undefined) params.append("include_profiles", options.include_profiles);
    if (options.page) params.append("page", options.page);
    if (options.per_page) params.append("per_page", options.per_page);
    
    const url = `${CUSTOM_ENDPOINTS.subscription.familyMembers}${params.toString() ? `?${params.toString()}` : ''}`;
    return authRequest(url, {
      method: "GET",
    });
  },

  /**
   * POST /family/members
   * Додає нового члена до сімейної підписки
   * @param {object} memberData - Дані нового члена сім'ї
   * @param {string} memberData.family_member_name - Відображуване ім'я (обов'язково)
   * @param {string} memberData.first_name - Ім'я
   * @param {string} memberData.last_name - Прізвище
   * @param {string} memberData.dob - Дата народження (YYYY-MM-DD)
   * @param {string} memberData.sex_of_birth - Стать (male, female, other)
   * @param {number} memberData.height_cm - Зріст в см
   * @param {number} memberData.weight_kg - Вага в кг
   * @param {string} memberData.role - Роль (member, child, за замовчуванням member)
   * @param {string} memberData.access_level - Рівень доступу (full, limited, view_only, за замовчуванням full)
   */
  addFamilyMember: async (memberData) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.familyMembers, {
      method: "POST",
      body: memberData,
    });
  },

  /**
   * PUT /family/members/{family_member_id}
   * Оновлює інформацію про члена сім'ї
   * @param {number} familyMemberId - ID члена сім'ї
   * @param {object} memberData - Оновлені дані члена сім'ї
   */
  updateFamilyMember: async (familyMemberId, memberData) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.familyMemberById(familyMemberId), {
      method: "PUT",
      body: memberData,
    });
  },

  /**
   * DELETE /family/members/{family_member_id}
   * Видаляє члена з сімейної підписки
   * @param {number} familyMemberId - ID члена сім'ї для видалення
   */
  removeFamilyMember: async (familyMemberId) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.familyMemberById(familyMemberId), {
      method: "DELETE",
    });
  },

  /**
   * POST /remove_family_member
   * Видаляє члена з сімейної підписки (альтернативний метод)
   * @param {number} familyMemberId - ID члена сім'ї для видалення
   */
  removeFamilyMemberPost: async (familyMemberId) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.removeFamilyMember, {
      method: "POST",
      body: { family_member_id: familyMemberId },
    });
  },

  /**
   * POST /switch_family_member
   * Перемикає активного члена сім'ї для введення та перегляду даних
   * @param {number} familyMemberId - ID члена сім'ї для перемикання (або ID основного акаунту)
   */
  switchFamilyMember: async (familyMemberId) => {
    return authRequest(CUSTOM_ENDPOINTS.subscription.switchFamilyMember, {
      method: "POST",
      body: { family_member_id: familyMemberId },
    });
  },

};

export default SubscriptionApi;

