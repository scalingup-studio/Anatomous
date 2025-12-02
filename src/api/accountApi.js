import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

/**
 * Account API
 * Integrates account & security endpoints:
 * - revoke session tokens
 * - update credentials (email/password/MFA)
 * - deactivate / delete account
 * - delete all user data
 * - verify MFA code
 */
export const AccountApi = {
  /**
   * POST /refresh_tokens/revoke
   * Revoke a specific refresh token/session.
   * @param {object} payload - Optional payload (e.g. { refresh_token_id }).
   * If payload is empty, backend may revoke current session.
   */
  async revokeToken(payload = {}) {
    console.log(
      "🔐 [AccountApi.revokeToken] payload:",
      JSON.stringify(payload, null, 2)
    );
    return authRequest(CUSTOM_ENDPOINTS.account.revokeToken, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /update_credentials
   * Update email, password and/or MFA settings.
   * Body:
   * {
   *   new_email?: string,
   *   new_password?: string,
   *   current_password: string,
   *   mfa_enabled?: boolean
   * }
   */
  async updateCredentials(payload) {
    console.log(
      "🔐 [AccountApi.updateCredentials] payload:",
      JSON.stringify(
        {
          ...payload,
          // never log raw passwords
          current_password: payload?.current_password ? "***" : undefined,
          new_password: payload?.new_password ? "***" : undefined,
        },
        null,
        2
      )
    );
    return authRequest(CUSTOM_ENDPOINTS.account.updateCredentials, {
      method: "PUT",
      body: payload,
    });
  },

  /**
   * POST /auth/verify_mfa_code
   * Verify MFA code after login when mfa_required = true.
   * Body:
   * {
   *   email: string,
   *   code: string
   * }
   */
  async verifyMfaCode(payload) {
    // Debug: показуємо повний payload включно з кодом (для розробки)
    try {
      console.log(
        "🔐 [AccountApi.verifyMfaCode] payload:",
        JSON.stringify(payload, null, 2)
      );
    } catch {}
    return authRequest(CUSTOM_ENDPOINTS.account.verifyMfaCode, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * PUT /deactivate_account
   * Temporarily deactivate current account.
   * Body: { confirm_deactivation: true }
   */
  async deactivateAccount() {
    const body = { confirm_deactivation: true };
    console.log(
      "🛑 [AccountApi.deactivateAccount] payload:",
      JSON.stringify(body, null, 2)
    );
    return authRequest(CUSTOM_ENDPOINTS.accountSecurity.deactivateAccount, {
      method: "PUT",
      body,
    });
  },

  /**
   * DELETE /delete_account
   * Permanently delete account and all data.
   * Body: { confirmation: "delete" }
   */
  async deleteAccount() {
    const body = { confirmation: "delete" };
    console.log(
      "🗑️ [AccountApi.deleteAccount] payload:",
      JSON.stringify(body, null, 2)
    );
    return authRequest(CUSTOM_ENDPOINTS.accountSecurity.deleteAccount, {
      method: "DELETE",
      body,
    });
  },

  /**
   * DELETE /delete_user_data
   * Delete all user data but keep account (GDPR-style).
   * Body: { confirmation: "delete" }
   */
  async deleteUserData() {
    const body = { confirmation: "delete" };
    console.log(
      "🗑️ [AccountApi.deleteUserData] payload:",
      JSON.stringify(body, null, 2)
    );
    return authRequest(CUSTOM_ENDPOINTS.accountSecurity.deleteUserData, {
      method: "DELETE",
      body,
    });
  },
};

export default AccountApi;


