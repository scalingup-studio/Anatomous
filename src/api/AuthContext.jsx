import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthApi } from "./authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false); // Track if this is a new user (signup)

  // ✅ We move refreshAuth to useCallback for link stability
  const refreshAuth = useCallback(async () => {
    if (refreshLoading) return null;

    setRefreshLoading(true);
    try {
      // console.log('🔄 Manually refreshing auth token...');
      const refreshRes = await AuthApi.refreshToken();
      // console.log('🔄 Manually refreshing auth token... completed, token = ', JSON.stringify(refreshRes))
      if (refreshRes?.authToken) {
        // console.log('✅ Manual refresh successful');
        setAuthToken(refreshRes.authToken);
        setUser(refreshRes.user ?? null);
        try {
          localStorage.setItem('authToken', refreshRes.authToken);
          if (refreshRes.user) localStorage.setItem('user', JSON.stringify(refreshRes.user));
        } catch {}
        setIsNewUser(false); // Manual refresh means existing user
        return refreshRes.authToken;
      }

      console.log('❌ Refresh returned no token');
      return null;
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
      // On failed refresh, clear auth state
      setAuthToken(null);
      setUser(null);
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } catch {}
      return null;
    } finally {
      setRefreshLoading(false);
    }
  }, [refreshLoading]);

  useEffect(() => {
    async function initAuth() {
      // Skip any auth bootstrap on public shared report route
      try {
        const href = typeof window !== 'undefined' ? (window.location.hash || window.location.pathname || '') : '';
        if (href.includes('/shared-reports/')) {
          setLoading(false);
          return;
        }
      } catch {}
      try {
        // 1) Try localStorage token first and use it if still valid
        const storedToken = (() => { try { return localStorage.getItem('authToken') || null; } catch { return null; } })();
        const storedUser = (() => { try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();

        if (storedToken) {
          try {
            const parts = storedToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const expMs = (payload?.exp || 0) * 1000;
              const now = Date.now();
              if (expMs > now + 15_000) { // consider valid if >15s left
                setAuthToken(storedToken);
                setUser(storedUser ?? null);
                setIsNewUser(false);
                setLoading(false);
                console.log('✅ Restored valid session from storage without re-login');
                return;
              }
            }
          } catch {}
        }

        console.log('🔄 Attempting auto-authentication with refresh token...');
        const refreshRes = await AuthApi.refreshToken();
        console.log('✅ Auto-authentication successful:', refreshRes);

        if (refreshRes?.authToken) {
          setAuthToken(refreshRes.authToken);
          setUser(refreshRes.user ?? null);
          try {
            localStorage.setItem('authToken', refreshRes.authToken);
            if (refreshRes.user) localStorage.setItem('user', JSON.stringify(refreshRes.user));
          } catch {}
          setIsNewUser(false);
          console.log('🔄 Auto-authentication successful - existing user will go to dashboard');
        } else {
          console.log('ℹ️ No valid session found');
          setAuthToken(null);
          setUser(null);
          setIsNewUser(false);
          try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); } catch {}
        }
      } catch (error) {
        if (error.message?.includes('expired') || error.message?.includes('Invalid')) {
          console.log('🔄 Refresh token expired or invalid, clearing session');
          await AuthApi.logout().catch(() => {});
        } else {
          console.log('ℹ️ Auto-authentication failed:', error.message);
        }
        setAuthToken(null);
        setUser(null);
        try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); } catch {}
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // ✅ Function to automatically renew the token before expiration
  useEffect(() => {
    if (!authToken) return;

   // Function to calculate time to update
    const calculateRefreshTime = () => {
      try {
        // Check if token has valid JWT structure (header.payload.signature)
        const parts = authToken.split('.');
        if (parts.length !== 3) {
          console.log('📝 Token is not a standard JWT, using default refresh time');
          return 10 * 60 * 1000; // 10 minutes default
        }
        
       // Parse the JWT token to get the expiration time
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if exp exists in payload
        if (!payload.exp) {
          console.log('📝 Token does not have expiration time, using default refresh time');
          return 10 * 60 * 1000; // 10 minutes default
        }
        
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry <= 0) {
          console.log('📝 Token already expired, using default refresh time');
          return 10 * 60 * 1000; // 10 minutes default
        }
        
       // Update 10 minutes before the end, but no less than 1 minute later
        const refreshTime = Math.max(
          60 * 1000, // Мінімум 1 хвилина
          timeUntilExpiry - (10 * 60 * 1000)// 10 minutes to go
        );
        
        console.log(`🕒 Token expires at: ${new Date(expiresAt).toLocaleTimeString()}`);
        console.log(`🕒 Will refresh in: ${Math.round(refreshTime / 1000 / 60)} minutes`);
        
        return refreshTime;
      } catch (error) {
        // Silent fail - using default refresh time
        // If the token could not be parsed, we use the default value
        return 10 * 60 * 1000; // 10 minutes
      }
    };

    const refreshTime = calculateRefreshTime();

    const refreshTimer = setTimeout(async () => {
      try {
        console.log('🔄 Auto-refreshing token before expiration...');
        const newTokens = await refreshAuth();
        if (newTokens) {
          console.log('✅ Token auto-refreshed successfully');
        }
      } catch (error) {
        console.log('🔴 Auto-refresh failed:', error.message);
        // We don't clear the state here - the user can still use the current token
        // until it actually expires
      }
    }, refreshTime);

    return () => {
      console.log('🧹 Cleaning up auto-refresh timer');
      clearTimeout(refreshTimer);
    };
  }, [authToken, refreshAuth]); // ✅ Now refreshAuth is a stable link

  async function login(email, password) {
    try {
      const res = await AuthApi.login({ email, password });
      setAuthToken(res.authToken);
      setUser(res.user ?? null);
      try {
        localStorage.setItem('authToken', res.authToken);
        if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
        // Store decoded expiry for awareness (optional)
        try {
          const parts = res.authToken?.split?.('.') || [];
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload?.exp) localStorage.setItem('authTokenExpiresAt', String(payload.exp * 1000));
          }
        } catch {}
        // Set flag to show onboarding modal after login
        localStorage.setItem('showOnboardingModalAfterLogin', 'true');
      } catch {}
      setIsNewUser(false); // This is a login, not a signup
      
      console.log('🔐 User logged in successfully - will redirect directly to dashboard');
      console.log('🎯 Login redirect: Dashboard (no onboarding check)');
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  }

  async function signup(email, password, userData = {}) {
    try {
      console.log('📝 Starting signup process...');
      const res = await AuthApi.signup({ email, password, ...userData });
      console.log('📝 AuthApi.signup response:', res);

      // Some backends return tokens on signup, others don't
      if (res?.authToken) {
        setAuthToken(res.authToken);
        setUser(res.user ?? null);
        try {
          localStorage.setItem('authToken', res.authToken);
          if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
        } catch {}
      } else {
        // No token returned: perform immediate login to obtain authToken
        console.log('📝 Signup returned no token, performing auto-login...');
        const loginRes = await AuthApi.login({ email, password });
        setAuthToken(loginRes.authToken);
        setUser(loginRes.user ?? res?.new_User ?? null);
        try {
          localStorage.setItem('authToken', loginRes.authToken);
          if (loginRes.user || res?.new_User) {
            localStorage.setItem('user', JSON.stringify(loginRes.user ?? res?.new_User));
          }
        } catch {}
      }

      // Mark as new user to route to onboarding
      setIsNewUser(true);

      console.log('📝 New user signed up successfully - will redirect to onboarding');
      console.log('🎯 Signup redirect: Onboarding (new user)');
      console.log('📝 isNewUser set to:', true);
      
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthToken(null);
      setUser(null);
      setIsNewUser(false);
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } catch {}
    }
  }

  // ✅ Added a function to complete onboarding
  async function completeOnboarding(status = "completed") {
    try {
      console.log('🎯 Completing onboarding with status:', status);
      
     // Update the user's state with both old and new structure
      setUser(prev => ({
        ...prev,
        onboarding_completed: true,
        completed: true,
        onboarding_status: status,
        save_onboarding: {
          ...prev.save_onboarding,
          onboarding_completed: true,
          current_step: "completed",
          progress: {
            ...prev.save_onboarding?.progress,
            percentage: 100
          },
          completed_at: new Date().toISOString()
        }
      }));
      
      // Mark as no longer a new user
      setIsNewUser(false);
      
      // Here you can add an API call to update on the server if needed
// await AuthApi.updateOnboardingStatus({ onboarding_completed: true });
      
      console.log('✅ Onboarding marked as completed in AuthContext');
      return { success: true };
    } catch (error) {
      console.error("Error completing onboarding:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Added a function to load onboarding data from API
  async function loadOnboardingData() {
    try {
      console.log('📊 Loading onboarding data from API...');
      
      // Import OnboardingApi dynamically to avoid circular dependency
      const { OnboardingApi } = await import('./onboardingApi.js');
      
      if (!user?.id) {
        console.log('⚠️ No user ID available for loading onboarding data');
        return { success: false, error: 'No user ID' };
      }
      
      const onboardingData = await OnboardingApi.getProgress(user.id);
      console.log('📊 Onboarding data loaded:', onboardingData);
      
      // Update user state with onboarding data
      setUser(prev => ({
        ...prev,
        save_onboarding: onboardingData?.save_onboarding || prev.save_onboarding
      }));
      
      return { success: true, data: onboardingData };
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Added a function to reset onboarding status (for testing)
  async function resetOnboarding() {
    try {
      console.log('🔄 Resetting onboarding status...');
      
     // Update the user's state with both old and new structure
      setUser(prev => ({
        ...prev,
        onboarding_completed: false,
        completed: false,
        onboarding_status: "not_started",
        save_onboarding: {
          ...prev.save_onboarding,
          onboarding_completed: false,
          current_step: "personal",
          progress: {
            ...prev.save_onboarding?.progress,
            percentage: 0
          }
        }
      }));
      
      console.log('✅ Onboarding status reset in AuthContext');
      return { success: true };
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!authToken && !!user;
  };

  // ✅ Added a function to check onboarding status
  const hasCompletedOnboarding = () => {
    if (!user) {
      console.log('🔍 hasCompletedOnboarding check: No user, returning false');
      return false;
    }
    
    console.log('🔍 hasCompletedOnboarding check - Current state:', {
      isNewUser,
      user: user ? {
        id: user.id,
        email: user.email,
        completed: user.completed,
        onboarding_completed: user.onboarding_completed
      } : null
    });
    
    // If this is a new user (signup), always redirect to onboarding
    if (isNewUser) {
      console.log('🔍 hasCompletedOnboarding check: New user from signup, returning false');
      return false;
    }
    
    // Check actual onboarding status from user object
    // Check both old and new field names for compatibility
    const onboardingCompleted = user.onboarding_completed ?? user.completed ?? 
                                 user.save_onboarding?.onboarding_completed ?? 
                                 user.save_onboarding?.completed ?? false;
    
    console.log('🔍 hasCompletedOnboarding check: Existing user, onboarding_completed =', onboardingCompleted);
    return onboardingCompleted;
  };

  // ✅ Added a function to check if the token will expire soon
  const isTokenExpiringSoon = () => {
    if (!authToken) return false;
    
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
     // We assume that the token will expire soon if there are less than 15 minutes left
      return timeUntilExpiry < (15 * 60 * 1000);
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // If the check fails, we assume it will expire
    }
  };

  const value = {
    // State
    authToken,
    user,
    loading,
    refreshLoading,
    isNewUser,

    // Functions
    login,
    signup,
    logout,
    refreshAuth,
    isAuthenticated,
    completeOnboarding,
    resetOnboarding,
    loadOnboardingData,
    hasCompletedOnboarding, 
    isTokenExpiringSoon, 

    // Setters (for manual updates if needed)
    setAuthToken,
    setUser,
    setIsNewUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}