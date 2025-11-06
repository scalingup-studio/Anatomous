import { request } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

// Helper function to get IP address
async function getIPAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
}

// Function to clear cookies
function clearAuthCookies() {
  if (typeof document !== 'undefined') {
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
}

// Function to get user ID from token
function getUserIdFromToken() {
  try {
    // Try to get user ID from localStorage first
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user?.id) {
        return user.id;
      }
    }
    
    // Try to get from auth_token cookie
    const authToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    if (authToken) {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      return payload.user_id || payload.sub || payload.id;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get user ID from token:', error);
    return null;
  }
}

export const AuthApi = {
  async login(data) {
    try {
      console.log('🔐 Attempting login for:', data.email);
      
      const requestData = {
        email: data.email,
        password: data.password,
        user_agent: navigator.userAgent,
        ip_address: await getIPAddress()
      };

      console.log('📤 Login request data:', { 
        email: requestData.email,
        user_agent: requestData.user_agent,
        ip_address: requestData.ip_address 
      });

      const response = await request(CUSTOM_ENDPOINTS.auth.login, { 
        method: "POST", 
        body: requestData,
        credentials: "include"
      });

      // Normalize token & user fields from backend
      const authToken = response.authToken || response.token || response.auth_token || response?.auth?.token || null;
      const user = response.user || response.me || response.profile || null;

      console.log('✅ Login successful, user:', (user && (user.email || user.id)) || 'unknown');
      return { ...response, authToken, user };
    } catch (error) {
      console.error('🔴 Login error:', error);
      // Clear cookies on login error
      clearAuthCookies();
      throw error;
    }
  },

  async logout() {
    try {
      console.log('🚪 Attempting logout...');
      await request(CUSTOM_ENDPOINTS.auth.logout, { 
        method: "POST",
        credentials: "include"
      });
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('🔴 Logout error:', error);
    } finally {
      // Always clear cookies
      clearAuthCookies();
    }
  },

  async refreshToken() {
    try {
      console.log('🔄 Attempting token refresh...');
      
      const requestData = {
        user_id: getUserIdFromToken(),
        user_agent: navigator.userAgent,
        ip_address: await getIPAddress()
      };

      const response = await request(CUSTOM_ENDPOINTS.auth.refreshToken, { 
        method: "POST",
        body: requestData,
        credentials: "include"
      });

      // Normalize token & user fields from backend
      const authToken = response.authToken || response.token || response.auth_token || response?.auth?.token || null;
      const user = response.user || response.me || response.profile || null;

      console.log('✅ Token refresh successful');
      return { ...response, authToken, user };
    } catch (error) {
      console.error('🔴 Token refresh failed:', error.message);
      
     // Automatically clear cookies on refresh error
      clearAuthCookies();
      
     // Add more information about the error
      const enhancedError = new Error(error.message || 'Token refresh failed');
      enhancedError.code = error.code;
      enhancedError.status = error.status;
      throw enhancedError;
    }
  },

  async signup(userData) {
    try {
      console.log('👤 Attempting signup for:', userData.email);
      
      const requestData = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        user_agent: navigator.userAgent,
        ip_address: await getIPAddress()
      };

      const response = await request(CUSTOM_ENDPOINTS.auth.signup, { 
        method: "POST", 
        body: requestData 
      });

      // Normalize possible token & user fields (some backends may return them)
      const authToken = response.authToken || response.token || response.auth_token || response?.auth?.token || null;
      const user = response.user || response.me || response.profile || response.new_User || null;

      console.log('✅ Signup successful');
      return { ...response, authToken, user };
    } catch (error) {
      console.error('🔴 Signup error:', error);
      throw error;
    }
  },

  async requestPasswordReset(email, opts = {}) {
    try {
      console.log('📧 Requesting password reset for:', email);
      // Build default reset URL (works for dev and GH Pages)
      let defaultUrl = 'https://scalingup-studio.github.io/Anatomous#/reset-password';
      try {
        const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        // Use hash router per app
        defaultUrl = `${origin}${base}#/reset-password`;
      } catch {}

      const url = opts.url || defaultUrl;

      const response = await request(CUSTOM_ENDPOINTS.auth.forgotPassword, {
        method: "POST",
        body: { email, url },
      });

      console.log('✅ Password reset email sent');
      return response;
    } catch (error) {
      console.error('🔴 Password reset request error:', error);
      throw error;
    }
  },

  async resetPassword({ token, new_password }) {
    try {
      console.log('🔑 Resetting password...');
      
      const response = await request(CUSTOM_ENDPOINTS.auth.resetPassword, {
        method: "POST",
        body: { token, new_password },
      });

      console.log('✅ Password reset successful');
      return response;
    } catch (error) {
      console.error('🔴 Password reset error:', error);
      throw error;
    }
  },

  async getGoogleAuthUrl() {
    try {
      console.log('🔗 Getting Google auth URL...');
      const response = await request(CUSTOM_ENDPOINTS.auth.google);
      console.log('✅ Google auth URL received');
      return response.url;
    } catch (error) {
      console.error('🔴 Google auth URL error:', error);
      throw error;
    }
  },

  async handleGoogleCallback(code) {
    try {
      console.log('🔐 Handling Google callback...');
      
      const response = await request(`${CUSTOM_ENDPOINTS.auth.googleCallback}?code=${code}`, {
        method: "GET",
        credentials: "include"
      });

      console.log('✅ Google callback successful');
      return response;
    } catch (error) {
      console.error('🔴 Google callback error:', error);
      clearAuthCookies();
      throw error;
    }
  },

  // Нова функція для перевірки статусу токена
  async validateToken() {
    try {
      console.log('🔍 Validating auth token...');
      // Можна використати простий endpoint для перевірки
      const response = await request('/auth/validate', {
        method: "GET",
        credentials: "include"
      });
      console.log('✅ Token validation successful');
      return response;
    } catch (error) {
      console.error('🔴 Token validation failed:', error);
      throw error;
    }
  },

  // New function to get the current session
  // async getCurrentSession() {
  //   try {
  //     console.log('👤 Getting current session...');
  //     const response = await request('/auth/me', {
  //       method: "GET",
  //       credentials: "include"
  //     });
  //     console.log('✅ Session data received');
  //     return response;
  //   } catch (error) {
  //     console.error('🔴 Session data error:', error);
  //     throw error;
  //   }
  // }
};

// Add utilities for working with tokens
export const TokenUtils = {
  // Parse JWT token (without validation, only for data retrieval)
  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('🔴 JWT parsing error:', error);
      return null;
    }
  },

  // Check if the token will expire soon
  isTokenExpiringSoon(token, thresholdMinutes = 5) {
    const payload = TokenUtils.parseJWT(token);
    if (!payload || !payload.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    return timeUntilExpiry < (thresholdMinutes * 60);
  },

  // Get the time until the token expires
  getTimeUntilExpiry(token) {
    const payload = TokenUtils.parseJWT(token);
    if (!payload || !payload.exp) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now;
  }
};

export default AuthApi;