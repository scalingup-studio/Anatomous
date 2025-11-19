import { authRequest, request } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

/**
 * Payment API
 * Handles all payment-related API calls through Stripe
 */
export const PaymentApi = {
  /**
   * POST /upgrade_subscription_POST
   * Поновлення або зміна тарифного плану підписки користувача
   * @param {string} planId - UUID нового тарифного плану для підписки
   */
  upgradeSubscription: async (planId) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.upgradeSubscription, {
      method: "POST",
      body: { plan_id: planId },
    });
  },

  /**
   * POST /subscription/update-usage
   * Updates usage tracking for authenticated user after they perform an action
   * @param {string} action - Тип дії (ai_message, upload_document, create_note, etc.)
   * @param {number} quantity - Кількість (зазвичай 1)
   * @param {number} increment - Чи збільшувати (1) або зменшувати (0) лічильник
   */
  updateUsage: async (action, quantity = 1, increment = 1) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.updateUsage, {
      method: "POST",
      body: { action, quantity, increment },
    });
  },

  /**
   * POST /cancel_subscription_POST
   * Скасування підписки користувача в Stripe та локально
   * @param {object} options - Опції скасування
   * @param {boolean} options.immediate - Чи скасувати підписку негайно (true) або в кінці періоду (false)
   * @param {string} options.reason - Причина скасування підписки
   */
  cancelSubscription: async (options = {}) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.cancelSubscription, {
      method: "POST",
      body: options,
    });
  },

  /**
   * POST /create-checkout-session
   * Створення Stripe Checkout Session для оплати підписки
   * @param {object} sessionData - Дані для створення сесії
   * @param {string} sessionData.plan_id - ID плану для підписки (UUID, обов'язково)
   * @param {string} sessionData.success_url - URL для переходу після успішної оплати (обов'язково)
   * @param {string} sessionData.cancel_url - URL для переходу при скасуванні оплати (обов'язково)
   * @param {string} sessionData.payment_type - Тип оплати (subscription або one_time, за замовчуванням subscription)
   */
  createCheckoutSession: async (sessionData) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.createCheckoutSession, {
      method: "POST",
      body: sessionData,
    });
  },

  /**
   * GET /checkout/success
   * Обробка успішного повернення з Stripe Checkout
   * @param {string} sessionId - ID Stripe Checkout Session (обов'язково)
   */
  checkoutSuccess: async (sessionId) => {
    const url = `${CUSTOM_ENDPOINTS.payments.checkoutSuccess}?session_id=${encodeURIComponent(sessionId)}`;
    return authRequest(url, {
      method: "GET",
    });
  },

  /**
   * GET /checkout/cancel
   * Обробка скасування платежу в Stripe Checkout
   * @param {string} sessionId - ID Stripe Checkout Session (опційний)
   */
  checkoutCancel: async (sessionId = "") => {
    const url = sessionId
      ? `${CUSTOM_ENDPOINTS.payments.checkoutCancel}?session_id=${encodeURIComponent(sessionId)}`
      : CUSTOM_ENDPOINTS.payments.checkoutCancel;
    return authRequest(url, {
      method: "GET",
    });
  },

  /**
   * POST /create-payment-intent
   * Створення платіжного наміру через Stripe для обробки платежів
   * @param {object} paymentData - Дані для створення платіжного наміру
   * @param {number} paymentData.amount - Сума платежу в мінімальних одиницях валюти (копійки для UAH, центи для USD, обов'язково)
   * @param {object} paymentData.metadata - Метадані платежу (обов'язково)
   * @param {string} paymentData.currency - Валюта платежу (за замовчуванням usd)
   * @param {string} paymentData.description - Опис платежу
   * @param {string} paymentData.plan_id - ID плану підписки (якщо це платіж за підписку)
   */
  createPaymentIntent: async (paymentData) => {
    return authRequest(CUSTOM_ENDPOINTS.payments.createPaymentIntent, {
      method: "POST",
      body: paymentData,
    });
  },

  /**
   * GET /payment/status
   * Перевірка статусу платежу/сесії
   * @param {string} sessionId - ID Stripe Checkout Session (обов'язково)
   */
  getPaymentStatus: async (sessionId) => {
    const url = `${CUSTOM_ENDPOINTS.payments.paymentStatus}?session_id=${encodeURIComponent(sessionId)}`;
    return authRequest(url, {
      method: "GET",
    });
  },

  /**
   * GET /payment_history_GET
   * Отримання історії платежів користувача
   * @param {object} options - Опції запиту
   * @param {number} options.page - Номер сторінки для пагінації (за замовчуванням 1)
   * @param {number} options.per_page - Кількість записів на сторінці (макс 100, за замовчуванням 20)
   * @param {string} options.status - Фільтр за статусом платежу (succeeded, canceled тощо)
   */
  getPaymentHistory: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.append("page", options.page);
    if (options.per_page) params.append("per_page", options.per_page);
    if (options.status) params.append("status", options.status);

    const url = `${CUSTOM_ENDPOINTS.payments.paymentHistory}${params.toString() ? `?${params.toString()}` : ''}`;
    return authRequest(url, {
      method: "GET",
    });
  },

  /**
   * GET /subscription_status_GET
   * Отримання поточного статусу підписки користувача
   */
  getSubscriptionStatus: async () => {
    return authRequest(CUSTOM_ENDPOINTS.payments.subscriptionStatus, {
      method: "GET",
    });
  },

  /**
   * POST /stripe-webhook
   * Enhanced Stripe webhook endpoint with security validation and comprehensive event processing
   * Публічний ендпоінт - Stripe викликає його без авторизації
   * @param {object} webhookData - Дані webhook від Stripe
   */
  stripeWebhook: async (webhookData) => {
    return request(CUSTOM_ENDPOINTS.payments.stripeWebhook, {
      method: "POST",
      body: webhookData,
    });
  },

  /**
   * POST /stripe_webhook_minimal_POST
   * Мінімальна версія Stripe webhook для тестування
   * Публічний ендпоінт - Stripe викликає його без авторизації
   * @param {object} webhookData - Дані webhook від Stripe
   */
  stripeWebhookMinimal: async (webhookData) => {
    return request(CUSTOM_ENDPOINTS.payments.stripeWebhookMinimal, {
      method: "POST",
      body: webhookData,
    });
  },

  /**
   * POST /webhook/stripe
   * Stripe webhook для обробки event'ів (payment success, failed, etc.)
   * Публічний ендпоінт - Stripe викликає його без авторизації
   * @param {object} webhookData - Дані webhook від Stripe
   * @param {string} webhookData.stripe_signature - Stripe-Signature header для верифікації webhook
   */
  webhookStripe: async (webhookData) => {
    return request(CUSTOM_ENDPOINTS.payments.webhookStripe, {
      method: "POST",
      body: webhookData,
    });
  },
};

export default PaymentApi;

