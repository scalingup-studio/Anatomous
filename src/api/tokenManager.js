/**
 * Centralized Token Manager
 * Supports metadata-based expiration (from backend)
 * Prevents race conditions and duplicate refresh requests
 */

import { CUSTOM_ENDPOINTS } from "./apiConfig";

class TokenManager {
    constructor() {
        this.refreshPromise = null;
        this.authToken = null;
        this.tokenExpiryTimer = null;
        this.expirationTimeMs = null; // <-- store backend-provided expiration
    }


    /**
     * Get current auth token from memory or localStorage
     */
    getToken() {
        if (this.authToken) return this.authToken;

        try {
            const stored = localStorage.getItem('authData');
            if (stored) {
                const { token, expiration } = JSON.parse(stored);
                this.authToken = token;
                this.expirationTimeMs = expiration;
                return token;
            }
        } catch (error) {
            console.error('Failed to get token from localStorage:', error);
        }

        return null;
    }

    /**
     * Store auth token (with optional metadata)
     * @param {string} token - The JWT token
     * @param {object} metadata - Optional metadata ({ exp: <ms_timestamp> })
     */
    setToken(token, metadata = {}) {
        if (!token) {
            this.clearToken();
            return;
        }

        try {
            this.authToken = token;
            this.expirationTimeMs = metadata.exp || null;

            // Persist token and expiration in localStorage
            localStorage.setItem(
                'authData',
                JSON.stringify({ token, expiration: this.expirationTimeMs })
            );

            // Schedule refresh if we know expiration time
            if (this.expirationTimeMs) {
                this.scheduleTokenRefreshByMetadata(this.expirationTimeMs);
            } else {
                console.warn('⚠️ No expiration metadata provided — refresh scheduling disabled.');
            }
        } catch (error) {
            console.error('Failed to store token:', error);
        }
    }

    /**
     * Clear auth token from memory and storage
     */
    clearToken() {
        this.authToken = null;
        this.refreshPromise = null;
        this.expirationTimeMs = null;

        if (this.tokenExpiryTimer) {
            clearTimeout(this.tokenExpiryTimer);
            this.tokenExpiryTimer = null;
        }

        try {
            localStorage.removeItem('authData');
        } catch (error) {
            console.error('Failed to clear token:', error);
        }
    }

    /**
     * Check if token is expired using metadata (milliseconds)
     */
    isTokenExpired() {
        if (!this.expirationTimeMs) return true;

        const now = Date.now();
        return now >= this.expirationTimeMs;
    }

    /**
     * Get time until token expires (ms)
     */
    getTimeUntilExpiry() {
        if (!this.expirationTimeMs) return 0;

        const now = Date.now();
        return Math.max(this.expirationTimeMs - now, 0);
    }

    /**
     * Schedule token refresh based on backend metadata (ms)
     */
    scheduleTokenRefreshByMetadata(expirationTimeMs) {
        // Clear existing timer
        if (this.tokenExpiryTimer) {
            clearTimeout(this.tokenExpiryTimer);
            this.tokenExpiryTimer = null;
        }

        const now = Date.now();
        const timeUntilExpiry = expirationTimeMs - now;

        if (timeUntilExpiry <= 0) {
            console.warn('Token already expired, not scheduling refresh.');
            return;
        }

        // Refresh 5 minutes before expiry, or at 80% of lifetime
        const refreshTime = Math.min(
            Math.max(timeUntilExpiry * 0.8, 60000), // at least 1 minute
            timeUntilExpiry - 5 * 60 * 1000         // or 5 mins before expiry
        );

        // SECURITY: Commented to prevent token information leakage
        // console.log(`🕐 Scheduling refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);

        this.tokenExpiryTimer = setTimeout(() => {
            // SECURITY: Commented to prevent token information leakage
            // console.log('🔄 Auto-refreshing token (metadata mode)...');
            this.refreshToken()
                .catch(error => {
                    console.error('Auto-refresh failed:', error);
                    // handled by auth context
                });
        }, refreshTime);
    }

    /**
     * Refresh token logic (same as before)
     * Ensures only one refresh happens at a time
     */
    async refreshToken() {
        // If refresh is already in progress, return the existing promise
        if (this.refreshPromise) {
            // SECURITY: Commented to prevent token information leakage
            // console.log('⏳ Refresh already in progress, waiting...');
            return this.refreshPromise;
        }

        // SECURITY: Commented to prevent token information leakage
        // console.log('🔄 Starting token refresh...');

        this.refreshPromise = this._performRefresh()
            .finally(() => {
                // Clear the promise after completion (success or failure)
                this.refreshPromise = null;
            });

        return this.refreshPromise;
    }

    /**
     * Internal method to perform the actual refresh
     */
    async _performRefresh() {
        try {
            // Get user agent and IP for security logging
            const user_agent = navigator.userAgent;
            let ip_address = 'unknown';

            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ip_address = ipData.ip;
            } catch (ipError) {
                console.warn('Could not get IP address:', ipError);
            }

            // Call refresh endpoint (cookie is sent automatically)
            const response = await fetch(CUSTOM_ENDPOINTS.auth.refreshToken, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important: sends HTTP-only cookie
                body: JSON.stringify({
                    user_agent,
                    ip_address,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Refresh failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // 🔍 DEBUG: Сира відповідь від API
            console.log('🔍 [DEBUG] Сира відповідь від API /auth/refresh:', {
                hasAuthToken: !!data.authToken,
                hasUser: !!data.user,
                userEmail: data.user?.email,
                userKeys: data.user ? Object.keys(data.user) : [],
                // Показуємо структуру без чутливих даних
                responseKeys: Object.keys(data),
            });

            if (!data.authToken) {
                throw new Error('No authToken in refresh response');
            }

            // Store new token and metadata
            this.setToken(data.authToken, { exp: data.authTokenExpiresAt });

            // SECURITY: Commented to prevent token information leakage
            // console.log('✅ Token refreshed successfully');

            return {
                authToken: data.authToken,
                user: data.user || null,
            };
        } catch (error) {
            console.error('❌ Token refresh failed:', error);

            // Clear token on refresh failure
            this.clearToken();

            throw error;
        }
    }

    /**
     * Ensure valid token or refresh if expired
     */
    async ensureValidToken() {
        const token = this.getToken();

        if (!token) {
            throw new Error('No token available');
        }

        // If token is expired, refresh it
        if (this.isTokenExpired()) {
            // SECURITY: Commented to prevent token information leakage
            // console.log('Token expired, refreshing...');
            const result = await this.refreshToken();
            return result.authToken;
        }

        // If token expires in less than 1 minute, refresh it
        const timeUntilExpiry = this.getTimeUntilExpiry();
        if (timeUntilExpiry < 60000) {
            // SECURITY: Commented to prevent token information leakage
            // console.log('Token expiring soon, refreshing...');
            const result = await this.refreshToken();
            return result.authToken;
        }

        return token;
    }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export class for testing
export { TokenManager };
