import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthApi } from "./authApi.js";
import { AccountApi } from "./accountApi.js";
import { useInactivityTimer } from "../hooks/useInactivityTimer.js";
import { tokenManager } from "./tokenManager.js";

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
      const refreshRes = await AuthApi.refreshToken();
      if (!refreshRes?.authToken) {
        return null;
      }

      setAuthToken(refreshRes.authToken);
      setUser(refreshRes.user ?? null);
      try {
        localStorage.setItem("authToken", refreshRes.authToken);
        if (refreshRes.user) localStorage.setItem("user", JSON.stringify(refreshRes.user));
      } catch {}
      setIsNewUser(false); // Manual refresh means existing user

      return refreshRes.authToken;
    } catch (error) {
      // On failed refresh, clear auth state
      setAuthToken(null);
      setUser(null);
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      } catch {}
      return null;
    } finally {
      setRefreshLoading(false);
    }
  }, [refreshLoading]);

  useEffect(() => {
    async function initAuth() {
      // Skip any auth bootstrap on public routes
      let isPublicRoute = false;
      try {
        const hash = typeof window !== 'undefined' ? (window.location.hash || '') : '';
        const pathname = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
        const publicRoutes = ['/shared-reports/', '/login', '/signup', '/forgot-password', '/reset-password', '/oauth'];
        
        // Check if we're on a public route
        // For hash-based routing, check both hash and pathname
        const hashPath = hash.startsWith('#') ? hash.substring(1) : hash;
        const currentPath = hashPath || pathname;
        
        isPublicRoute = publicRoutes.some(route => {
          // Check if route matches exactly or is at the start of the path
          const normalizedRoute = route.replace(/\/$/, ''); // Remove trailing slash for comparison
          const normalizedPath = currentPath.replace(/\/$/, '');
          return normalizedPath === normalizedRoute || 
                 normalizedPath.startsWith(normalizedRoute + '/') || 
                 normalizedPath.startsWith(normalizedRoute + '#');
        });
      } catch (error) {
        console.warn('Error checking public route:', error);
      }
      
      // Don't try to refresh token on public routes - exit early
      if (isPublicRoute) {
        setLoading(false);
        setAuthToken(null);
        setUser(null);
        return;
      }
      
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
                return;
              }
            }
          } catch {}
        }

        // Only try to refresh token if we're not on a public route
        const refreshRes = await AuthApi.refreshToken();

        if (refreshRes?.authToken) {
          setAuthToken(refreshRes.authToken);
          setUser(refreshRes.user ?? null);
          try {
            localStorage.setItem('authToken', refreshRes.authToken);
            if (refreshRes.user) localStorage.setItem('user', JSON.stringify(refreshRes.user));
          } catch {}
          setIsNewUser(false);
        } else {
          setAuthToken(null);
          setUser(null);
          setIsNewUser(false);
          try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); } catch {}
        }
      } catch (error) {
        if (error.message?.includes('expired') || error.message?.includes('Invalid')) {
          await AuthApi.logout().catch(() => {});
        }
        setAuthToken(null);
        setUser(null);
        try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); } catch {}
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, [refreshAuth]);

  // ✅ Function to automatically renew the token before expiration
  useEffect(() => {
    if (!authToken) return;

   // Function to calculate time to update
    const calculateRefreshTime = () => {
      try {
        // Check if token has valid JWT structure (header.payload.signature)
        const parts = authToken.split('.');
        if (parts.length !== 3) {
          return 10 * 60 * 1000; // 10 minutes default
        }
        
       // Parse the JWT token to get the expiration time
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if exp exists in payload
        if (!payload.exp) {
          return 10 * 60 * 1000; // 10 minutes default
        }
        
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry <= 0) {
          return 10 * 60 * 1000; // 10 minutes default
        }
        
       // Update 10 minutes before the end, but no less than 1 minute later
        const refreshTime = Math.max(
          60 * 1000, // Мінімум 1 хвилина
          timeUntilExpiry - (10 * 60 * 1000)// 10 minutes to go
        );
        
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
        await refreshAuth();
      } catch (error) {
        // We don't clear the state here - the user can still use the current token
        // until it actually expires
      }
    }, refreshTime);

    return () => {
      clearTimeout(refreshTimer);
    };
  }, [authToken, refreshAuth]); // ✅ Now refreshAuth is a stable link

  async function login(email, password) {
    try {
      const res = await AuthApi.login({ email, password });
      // MFA flow: backend can respond with mfa_required inside result wrapper
      const base = res?.result || res || {};
      if (base?.mfa_required) {
        return {
          success: false,
          mfaRequired: true,
          message: base.message || "MFA code sent to your email.",
        };
      }

      const authToken = res?.authToken;

      if (!authToken) {
        throw new Error(base?.message || "Login failed: no auth token received.");
      }

      setAuthToken(authToken);
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
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, mfaRequired: false };
    }
  }

  async function signup(email, password, userData = {}) {
    try {
      const res = await AuthApi.signup({ email, password, ...userData });

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
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify MFA code after login responded with mfa_required=true
  async function verifyMfa(email, code) {
    try {
      const res = await AccountApi.verifyMfaCode({ email, code });

      const data = res?.result || res || {};
      const authToken =
        data.authToken ||
        data.token ||
        data.auth_token ||
        data.jwt ||
        null;
      const user = data.user || data.me || data.profile || null;

      if (!authToken) {
        throw new Error(
          data.message || "MFA verification failed: no auth token received."
        );
      }

      setAuthToken(authToken);
      setUser(user ?? null);

      try {
        localStorage.setItem("authToken", authToken);
        if (user) localStorage.setItem("user", JSON.stringify(user));
      } catch {}

      setIsNewUser(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "MFA verification failed." };
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
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ Added a function to load onboarding data from API
  async function loadOnboardingData() {
    try {
      // Import OnboardingApi dynamically to avoid circular dependency
      const { OnboardingApi } = await import('./onboardingApi.js');
      
      if (!user?.id) {
        return { success: false, error: 'No user ID' };
      }
      
      const onboardingData = await OnboardingApi.getProgress(user.id);
      
      // Update user state with onboarding data
      setUser(prev => ({
        ...prev,
        save_onboarding: onboardingData?.save_onboarding || prev.save_onboarding
      }));
      
      return { success: true, data: onboardingData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ Added a function to reset onboarding status (for testing)
  async function resetOnboarding() {
    try {
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
      
      return { success: true };
    } catch (error) {
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
      return false;
    }
    
    // If this is a new user (signup), always redirect to onboarding
    if (isNewUser) {
      return false;
    }
    
    // Check actual onboarding status from user object
    // Check both old and new field names for compatibility
    const onboardingCompleted = user.onboarding_completed ?? user.completed ?? 
                                 user.save_onboarding?.onboarding_completed ?? 
                                 user.save_onboarding?.completed ?? false;
    
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
      return true; // If the check fails, we assume it will expire
    }
  };

  // ✅ Inactivity timer handler - викликається при 15 хвилинах неактивності
  // Використовуємо ref для authToken, щоб уникнути перезапуску таймера при оновленні токена
  const authTokenRef = React.useRef(authToken);
  const isUnmountingRef = React.useRef(false);
  
  React.useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  // Встановлюємо прапорець при unmount
  React.useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  const handleInactivity = useCallback(async () => {
    // Перевіряємо, чи компонент не розмонтовується
    if (isUnmountingRef.current) {
     // console.log('⏰ Inactivity timer triggered but component is unmounting');
      return;
    }

    // Перевіряємо, чи користувач все ще авторизований (використовуємо ref для актуального значення)
    if (!authTokenRef.current) {
     // console.log('⏰ Inactivity timer triggered but user already logged out');
      return;
    }

    //console.log('⏰ User inactive for 15 minutes, logging out...');
    
    try {
      // Очищаємо токен через tokenManager
      tokenManager.clearToken();
      
      // Викликаємо logout через AuthApi
      await AuthApi.logout();
    } catch (error) {
      console.error('Error during inactivity logout:', error);
    } finally {
      // Перевіряємо, чи компонент не розмонтовується перед оновленням стану
      if (isUnmountingRef.current) {
        return;
      }

      // Очищаємо стан авторизації
      setAuthToken(null);
      setUser(null);
      setIsNewUser(false);
      authTokenRef.current = null;
      
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } catch {}
      
      // Перенаправляємо на сторінку логіну
      // Використовуємо window.location для редіректу, оскільки ми в контексті
      // Використовуємо setTimeout для уникнення проблем з unmount під час redirect
      setTimeout(() => {
        try {
          const currentPath = window.location.hash || window.location.pathname || '';
          // Не перенаправляємо, якщо вже на публічних сторінках
          if (!currentPath.includes('/login') && 
              !currentPath.includes('/signup') && 
              !currentPath.includes('/shared-reports/') &&
              !currentPath.includes('/reset-password')) {
            // Використовуємо replace для уникнення додавання в історію браузера
            if (window.location.hash) {
              window.location.hash = '/login';
            } else {
              window.location.href = window.location.origin + window.location.pathname + '#/login';
            }
          }
        } catch (redirectError) {
          console.error('Error redirecting to login:', redirectError);
        }
      }, 0);
    }
  }, []); // Порожній масив залежностей, використовуємо ref для authToken

  // ✅ Відслідковування неактивності користувача (тільки для авторизованих користувачів)
  // Використовуємо useMemo для стабільного масиву подій
  const inactivityEvents = React.useMemo(() => 
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown', 'keypress'],
    []
  );
  
  useInactivityTimer(
    authToken ? handleInactivity : null, // Тільки якщо є токен
    15, // 15 хвилин
    inactivityEvents // Стабільний масив подій
  );

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
    verifyMfa,
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