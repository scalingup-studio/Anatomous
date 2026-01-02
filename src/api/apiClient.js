import { AuthApi } from "./authApi";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Глобальна змінна для запобігання паралельним refresh
let isRefreshing = false;
let refreshSubscribers = [];

// Функція для додавання запитів в чергу очікування
function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

// Функція для виконання всіх запитів з черги після refresh
function onRefreshed(authToken) {
  refreshSubscribers.forEach(callback => callback(authToken));
  refreshSubscribers = [];
}

/**
 * Функція для перевірки наявності токена в cookies
 * Використовується для приховування токена від Network вкладки браузера
 * httpOnly cookies автоматично відправляються браузером і не видимі в JavaScript
 * @returns {string|null} Токен з cookies або null
 */
function getTokenFromCookies() {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(cookie => 
      cookie.startsWith('auth_token=') || 
      cookie.startsWith('authToken=') ||
      cookie.startsWith('access_token=') ||
      cookie.startsWith('refresh_token=')
    );
    return authCookie ? authCookie.split('=')[1] : null;
  } catch {
    return null;
  }
}

// ✅ Експортована функція authRequest
export const authRequest = async (url, options = {}, retry = true) => {
  const isFormData = options?.body instanceof FormData;
  const config = {
    mode: 'cors',
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    credentials: "include", // Важливо: дозволяє відправляти cookies (httpOnly cookies будуть відправлені автоматично)
    ...options,
  };

  // ПРИХОВУВАННЯ ТОКЕНА: Використовуємо cookies замість headers
  // httpOnly cookies автоматично відправляються браузером і не видимі в Network вкладці
  // 
  // Логіка:
  // 1. Спочатку перевіряємо наявність токена в cookies (httpOnly cookies не доступні через JS, але відправляються автоматично)
  // 2. Якщо cookies є - НЕ додаємо токен в headers (приховано від Network)
  // 3. Якщо cookies немає - використовуємо fallback на headers (для сумісності зі старим API)
  
  // Перевіряємо, чи є httpOnly cookies (вони не доступні через document.cookie, але відправляються автоматично)
  // Якщо бекенд встановлює httpOnly cookies, вони будуть відправлені через credentials: "include"
  // Перевіряємо тільки доступні через JS cookies як індикатор
  const hasAccessibleCookie = getTokenFromCookies() !== null;
  
  // Додаємо токен в headers ТІЛЬКИ якщо:
  // 1. Немає доступних cookies (fallback для сумісності)
  // 2. Або явно вказано використовувати headers через опцію
  const useHeaderToken = options.useHeaderToken === true || (!hasAccessibleCookie && options.useHeaderToken !== false);
  
  if (useHeaderToken) {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken}`;
    }
  }
  
  // Важливо: httpOnly cookies (якщо встановлені бекендом) будуть відправлені автоматично
  // через credentials: "include" і НЕ будуть видимі в Network headers

  if (config.body && typeof config.body === "object" && !isFormData) {
    config.body = JSON.stringify(config.body);
  }


  try {
    let response = await fetch(url, config);

      // 🔄 Покращена логіка refresh token
      if (response.status === 401 && retry) {
        // Якщо вже йде процес refresh - додаємо запит в чергу
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            addRefreshSubscriber((newAuthToken) => {
              // Повторюємо запит - якщо токен в cookies, не передаємо в headers
              const retryConfig = {
                ...config,
                useHeaderToken: !getTokenFromCookies() // Використовуємо headers тільки якщо немає cookies
              };
              // Якщо все ж потрібен header token (немає cookies), додаємо його
              if (!getTokenFromCookies() && newAuthToken) {
                retryConfig.headers = {
                  ...retryConfig.headers,
                  "Authorization": `Bearer ${newAuthToken}`
                };
              }
              authRequest(url, retryConfig, false)
                .then(resolve)
                .catch(reject);
            });
          });
        }

        isRefreshing = true;

        try {
          const refreshRes = await AuthApi.refreshToken();
          
          if (refreshRes?.authToken) {
            // Сповіщаємо всі очікуючі запити
            onRefreshed(refreshRes.authToken);
            
            // Перевіряємо, чи токен встановлено в cookies після refresh
            // Якщо так, не передаємо його в headers (безпечніше)
            const hasCookieToken = getTokenFromCookies();
            const retryConfig = {
              ...config,
              useHeaderToken: !hasCookieToken // Використовуємо headers тільки якщо немає cookies
            };
            
            // Додаємо токен в headers тільки якщо його немає в cookies
            if (!hasCookieToken && refreshRes.authToken) {
              retryConfig.headers = {
                ...retryConfig.headers,
                "Authorization": `Bearer ${refreshRes.authToken}`
              };
            }
            
            return authRequest(url, retryConfig, false);
        } else {
          throw new Error("No authToken received from refresh");
        }
      } catch (refreshError) {
        // Сповіщаємо всі очікуючі запити про помилку
        refreshSubscribers.forEach(callback => callback(null));
        refreshSubscribers = [];
        
        // Очистити локальне сховище при невдалій спробі оновлення токена
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } catch {}
        
        throw new ApiError("Session expired. Please login again.", 401, null);
      } finally {
        isRefreshing = false;
      }
    }

    // Обробка відповіді
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    
    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }
    } catch (parseError) {
      console.warn("Failed to parse response:", parseError);
      data = { message: "Failed to parse response" };
    }

    // Check for success: false with error field (even if response.ok is true)
    // Check both top level and nested structures (e.g., guard_info.check_result, payload)
    const checkForError = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check top level
      if (obj.success === false && obj.error) {
        return {
          message: obj.message || obj.error || 'An error occurred',
          data: obj
        };
      }

      // Check Xano "Throw Error" payload wrapper
      if (obj.payload && typeof obj.payload === 'object') {
        const p = obj.payload;
        if (p.success === false && p.error) {
          return {
            message: p.message || p.error || obj.message || 'An error occurred',
            data: obj,
          };
        }
      }
      
      // Check nested structures like guard_info.check_result
      if (obj.guard_info && obj.guard_info.check_result) {
        const checkResult = obj.guard_info.check_result;
        if (checkResult.success === false && checkResult.error) {
          return {
            message: checkResult.message || checkResult.error || obj.message || 'An error occurred',
            data: obj
          };
        }
      }
      
      // Also check for blocked responses with guard_info
      if (obj.blocked === true && obj.guard_info && obj.guard_info.check_result) {
        const checkResult = obj.guard_info.check_result;
        if (checkResult.success === false && checkResult.error) {
          return {
            message: checkResult.message || checkResult.error || obj.message || 'An error occurred',
            data: obj
          };
        }
      }
      
      return null;
    };
    
    const errorInfo = checkForError(data);
    if (errorInfo) {
      throw new ApiError(errorInfo.message, response.status || 400, errorInfo.data);
    }

    if (!response.ok) {
      // Спеціальна обробка для 401 помилок після refresh
      if (response.status === 401 && !retry) {
        throw new ApiError("Authentication failed after token refresh", 401, data);
      }
      
      throw new ApiError(
        data?.message || `Request failed with status ${response.status}`, 
        response.status, 
        data
      );
    }

    return data ?? {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    // Мережеві помилки
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new ApiError(
        "Network error: Unable to connect to server", 
        0, 
        { networkError: true }
      );
    }
    
    throw new ApiError(error.message || "Unknown error occurred", 0, null);
  }
};

// ✅ Базова функція request (без авторизації)
export const request = async (url, options = {}) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    
    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }
    } catch (parseError) {
      console.warn("Failed to parse response:", parseError);
      data = { message: "Failed to parse response" };
    }

    // Check for success: false with error field (even if response.ok is true)
    // Check both top level and nested structures (e.g., guard_info.check_result, payload)
    const checkForError = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check top level
      if (obj.success === false && obj.error) {
        return {
          message: obj.message || obj.error || 'An error occurred',
          data: obj
        };
      }

      // Check Xano "Throw Error" payload wrapper
      if (obj.payload && typeof obj.payload === 'object') {
        const p = obj.payload;
        if (p.success === false && p.error) {
          return {
            message: p.message || p.error || obj.message || 'An error occurred',
            data: obj,
          };
        }
      }
      
      // Check nested structures like guard_info.check_result
      if (obj.guard_info && obj.guard_info.check_result) {
        const checkResult = obj.guard_info.check_result;
        if (checkResult.success === false && checkResult.error) {
          return {
            message: checkResult.message || checkResult.error || obj.message || 'An error occurred',
            data: obj
          };
        }
      }
      
      // Also check for blocked responses with guard_info
      if (obj.blocked === true && obj.guard_info && obj.guard_info.check_result) {
        const checkResult = obj.guard_info.check_result;
        if (checkResult.success === false && checkResult.error) {
          return {
            message: checkResult.message || checkResult.error || obj.message || 'An error occurred',
            data: obj
          };
        }
      }
      
      return null;
    };
    
    const errorInfo = checkForError(data);
    if (errorInfo) {
      throw new ApiError(errorInfo.message, response.status || 400, errorInfo.data);
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message || `Request failed with status ${response.status}`, 
        response.status, 
        data
      );
    }

    return data ?? {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new ApiError(
        "Network error: Unable to connect to server", 
        0, 
        { networkError: true }
      );
    }
    
    throw new ApiError(error.message || "Unknown error occurred", 0, null);
  }
};

// Додаткові утиліти для роботи з API
export const apiClient = {
  // Основні методи
  request,
  authRequest,
  
  // GET запити
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  authGet: (url, options = {}) => authRequest(url, { ...options, method: 'GET' }),
  
  // POST запити
  post: (url, data, options = {}) => request(url, { 
    ...options, 
    method: 'POST', 
    body: data 
  }),
  authPost: (url, data, options = {}) => authRequest(url, { 
    ...options, 
    method: 'POST', 
    body: data 
  }),
  
  // PUT запити
  put: (url, data, options = {}) => request(url, { 
    ...options, 
    method: 'PUT', 
    body: data 
  }),
  authPut: (url, data, options = {}) => authRequest(url, { 
    ...options, 
    method: 'PUT', 
    body: data 
  }),
  
  // DELETE запити
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
  authDelete: (url, options = {}) => authRequest(url, { ...options, method: 'DELETE' }),
  
  // PATCH запити
  patch: (url, data, options = {}) => request(url, { 
    ...options, 
    method: 'PATCH', 
    body: data 
  }),
  authPatch: (url, data, options = {}) => authRequest(url, { 
    ...options, 
    method: 'PATCH', 
    body: data 
  }),
};

// Хук для використання в React компонентах
export const useApi = () => {
  return apiClient;
};

export default apiClient;