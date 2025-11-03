import { AuthApi } from "./authApi";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
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

// ✅ Експортована функція authRequest
export const authRequest = async (url, options = {}, retry = true) => {
  const isFormData = options?.body instanceof FormData;
  const config = {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    credentials: "include",
    ...options,
  };

  // Додаємо токен з localStorage до заголовків
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    config.headers["Authorization"] = `Bearer ${authToken}`;
  }

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
            // Повторюємо запит з новим токеном
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                "Authorization": `Bearer ${newAuthToken}`
              }
            };
            authRequest(url, retryConfig, false)
              .then(resolve)
              .catch(reject);
          });
        });
      }

      isRefreshing = true;

      try {
        console.log("🔄 Token expired, attempting refresh...");
        const refreshRes = await AuthApi.refreshToken();
        
        if (refreshRes?.authToken) {
          console.log("✅ Token refresh successful");
          
          // Сповіщаємо всі очікуючі запити
          onRefreshed(refreshRes.authToken);
          
          // Повторюємо поточний запит з новим токеном
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              "Authorization": `Bearer ${refreshRes.authToken}`
            }
          };
          
          return authRequest(url, retryConfig, false);
        } else {
          throw new Error("No authToken received from refresh");
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        
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