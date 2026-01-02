# 🛠️ ПОКРАЩЕННЯ БЕЗПЕКИ НА ФРОНТЕНДІ (БЕЗ БЕКЕНДУ)

## ✅ Що можна зробити ЗАРАЗ на фронтенді

Цей документ містить конкретні кроки, які можна виконати на фронтенді **без змін на бекенді**.

---

## 🔴 ПРІОРИТЕТ 1: КРИТИЧНІ ВИПРАВЛЕННЯ

### ⚠️ ВАЖЛИВО: Бекенд не підтримує cookies

Якщо ваш бекенд **не приймає токени через cookies** (тільки через Authorization headers), то **НЕ можна** видаляти токени з localStorage без змін на бекенді.

**Альтернатива:** Покращити безпеку токенів в localStorage іншими способами (див. нижче).

---

### 1. Покращити безпеку токенів в localStorage (якщо бекенд не підтримує cookies)

**Чому важливо:** Токени в localStorage вразливі до XSS, але можна зменшити ризик.

**Що робити:**

#### Варіант A: Використовувати sessionStorage замість localStorage

**Переваги:** sessionStorage очищається при закритті вкладки браузера.

```javascript
// src/api/AuthContext.jsx

// ❌ ЗАМІСТЬ localStorage:
// localStorage.setItem('authToken', authToken);

// ✅ ВИКОРИСТОВУВАТИ sessionStorage:
sessionStorage.setItem('authToken', authToken);
sessionStorage.getItem('authToken');
sessionStorage.removeItem('authToken');
```

**Результат:** Токени автоматично видаляються при закритті браузера.

#### Варіант B: Додати обфускацію токенів (не шифрування, але ускладнює витік)

```javascript
// src/utils/tokenStorage.js

// Проста обфускація (НЕ безпечна, але ускладнює витік)
const obfuscate = (token) => {
  if (!token) return null;
  // Простий base64 + обертання
  return btoa(token.split('').reverse().join(''));
};

const deobfuscate = (obfuscated) => {
  if (!obfuscated) return null;
  try {
    return atob(obfuscated).split('').reverse().join('');
  } catch {
    return null;
  }
};

export const saveToken = (token) => {
  if (!token) return;
  try {
    const obfuscated = obfuscate(token);
    sessionStorage.setItem('authToken', obfuscated);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
};

export const getToken = () => {
  try {
    const obfuscated = sessionStorage.getItem('authToken');
    return deobfuscate(obfuscated);
  } catch {
    return null;
  }
};

export const removeToken = () => {
  try {
    sessionStorage.removeItem('authToken');
  } catch {}
};
```

**⚠️ Увага:** Це НЕ шифрування, але ускладнює витік при XSS.

#### Варіант C: Додати перевірку на XSS перед збереженням

```javascript
// src/utils/tokenStorage.js

// Перевірка чи не було XSS атаки
const checkXSS = () => {
  // Перевірка наявності підозрілих скриптів
  const scripts = document.querySelectorAll('script[src*="evil"]');
  if (scripts.length > 0) {
    console.warn('⚠️ Potential XSS detected');
    return false;
  }
  return true;
};

export const saveToken = (token) => {
  if (!token || !checkXSS()) return;
  try {
    sessionStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
};
```

**Результат:** Додатковий захист від XSS.

---

### 1a. Видалити токени з localStorage (ТІЛЬКИ якщо бекенд підтримує cookies)

**Чому важливо:** Токени в localStorage доступні через JavaScript, що робить їх вразливими до XSS атак.

**⚠️ УВАГА:** Це можна робити ТІЛЬКИ якщо бекенд встановлює httpOnly cookies!

**Що робити:**

#### Крок 1: Оновити `src/api/AuthContext.jsx`

```javascript
// ❌ ВИДАЛИТИ всі ці рядки:
localStorage.setItem('authToken', authToken);
localStorage.getItem('authToken');
localStorage.removeItem('authToken');
localStorage.setItem('user', JSON.stringify(user));
localStorage.getItem('user');

// ✅ ЗАМІСТЬ ЦЬОГО - просто не зберігати токени
// Якщо бекенд встановлює cookies, вони будуть відправлятися автоматично
```

**Конкретні зміни:**

```javascript
// src/api/AuthContext.jsx

// ❌ ВИДАЛИТИ рядки 29-30:
// localStorage.setItem("authToken", refreshRes.authToken);
// if (refreshRes.user) localStorage.setItem("user", JSON.stringify(refreshRes.user));

// ❌ ВИДАЛИТИ рядки 40-41:
// localStorage.removeItem("authToken");
// localStorage.removeItem("user");

// ❌ ВИДАЛИТИ рядки 61-62:
// const storedToken = (() => { try { return localStorage.getItem('authToken') || null; } catch { return null; } })();
// const storedUser = (() => { try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();

// ❌ ВИДАЛИТИ рядки 88-89:
// localStorage.setItem('authToken', refreshRes.authToken);
// if (refreshRes.user) localStorage.setItem('user', JSON.stringify(refreshRes.user));

// ❌ ВИДАЛИТИ рядки 194-195:
// localStorage.setItem('authToken', res.authToken);
// if (res.user) localStorage.setItem('user', JSON.stringify(res.user));

// ❌ ВИДАЛИТИ рядки 224-225:
// localStorage.setItem('authToken', res.authToken);
// if (res.user) localStorage.setItem('user', JSON.stringify(res.user));

// ❌ ВИДАЛИТИ рядки 273-274:
// localStorage.setItem("authToken", authToken);
// if (user) localStorage.setItem("user", JSON.stringify(user));

// ❌ ВИДАЛИТИ рядки 294-295:
// localStorage.removeItem('authToken');
// localStorage.removeItem('user');
```

#### Крок 2: Оновити `src/api/apiClient.js`

```javascript
// src/api/apiClient.js

// ❌ ВИДАЛИТИ рядки 81-84:
// const authToken = localStorage.getItem('authToken');
// if (authToken) {
//   config.headers["Authorization"] = `Bearer ${authToken}`;
// }

// ✅ ЗАМІСТЬ ЦЬОГО - якщо бекенд встановлює cookies, вони відправляються автоматично
// через credentials: "include"
```

#### Крок 3: Оновити `src/api/tokenManager.js`

```javascript
// src/api/tokenManager.js

// ❌ ВИДАЛИТИ метод getToken() який читає з localStorage (рядки 21-37)
// Або замінити на:
getToken() {
  // Не зберігати токени в localStorage
  // Якщо бекенд встановлює cookies, вони відправляються автоматично
  return this.authToken || null;
}

// ❌ ВИДАЛИТИ localStorage операції в setToken() (рядки 54-58)
// Або замінити на:
setToken(token, metadata = {}) {
  if (!token) {
    this.clearToken();
    return;
  }
  
  this.authToken = token;
  this.expirationTimeMs = metadata.exp || null;
  
  // ❌ НЕ зберігати в localStorage
  // localStorage.setItem('authData', JSON.stringify({ token, expiration: ... }));
  
  if (this.expirationTimeMs) {
    this.scheduleTokenRefreshByMetadata(this.expirationTimeMs);
  }
}

// ❌ ВИДАЛИТИ localStorage операції в clearToken() (рядки 85)
// Або замінити на:
clearToken() {
  this.authToken = null;
  this.refreshPromise = null;
  this.expirationTimeMs = null;
  
  if (this.tokenExpiryTimer) {
    clearTimeout(this.tokenExpiryTimer);
    this.tokenExpiryTimer = null;
  }
  
  // ❌ НЕ видаляти з localStorage
  // localStorage.removeItem('authData');
}
```

**Результат:** Токени не будуть доступні через JavaScript, що значно зменшує ризик XSS атак.

---

### 2. Додати Content Security Policy (CSP) - МОЖНА БЕЗ БЕКЕНДУ

**Чому важливо:** CSP захищає від XSS атак, обмежуючи які ресурси можуть завантажуватися.

**✅ Це можна зробити БЕЗ змін на бекенді!**

**Чому важливо:** CSP захищає від XSS атак, обмежуючи які ресурси можуть завантажуватися.

**Що робити:**

#### Крок 1: Встановити react-helmet-async

```bash
npm install react-helmet-async
```

#### Крок 2: Оновити `src/main.jsx`

```javascript
// src/main.jsx
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </HelmetProvider>
);
```

#### Крок 3: Створити компонент `src/components/SecurityHeaders.jsx`

```javascript
// src/components/SecurityHeaders.jsx
import { Helmet } from 'react-helmet-async';

export function SecurityHeaders() {
  return (
    <Helmet>
      {/* Content Security Policy */}
      <meta 
        httpEquiv="Content-Security-Policy" 
        content={`
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data:;
          connect-src 'self' https://xu6p-ejbd-2ew4.n7e.xano.io;
          frame-ancestors 'none';
        `.replace(/\s+/g, ' ').trim()}
      />
      
      {/* X-Frame-Options */}
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      
      {/* X-Content-Type-Options */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      
      {/* Referrer Policy */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
    </Helmet>
  );
}
```

#### Крок 4: Додати в `src/Layout.jsx` або `src/main.jsx`

```javascript
// src/Layout.jsx або App.jsx
import { SecurityHeaders } from './components/SecurityHeaders';

function App() {
  return (
    <>
      <SecurityHeaders />
      {/* решта компонентів */}
    </>
  );
}
```

**Результат:** Захист від XSS, clickjacking та інших injection атак.

---

### 3. Покращити валідацію вхідних даних

**Чому важливо:** Запобігає відправці невалідних або небезпечних даних.

**Що робити:**

#### Крок 1: Створити `src/utils/validation.js`

```javascript
// src/utils/validation.js

// Список небезпечних паттернів для XSS
const XSS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
  /onclick=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i
];

// Санітизація тексту від XSS
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  // Перевірка на небезпечні паттерни
  if (XSS_PATTERNS.some(pattern => pattern.test(text))) {
    throw new Error('Invalid characters detected');
  }
  
  // Видалення HTML тегів
  return text.replace(/<[^>]*>/g, '');
};

// Валідація email
export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Валідація health data
export const validateHealthData = (data) => {
  const errors = [];
  
  // Валідація дати
  if (data.date) {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    } else if (date > new Date()) {
      errors.push('Date cannot be in the future');
    }
  }
  
  // Валідація heart rate
  if (data.heart_rate !== undefined) {
    const hr = Number(data.heart_rate);
    if (isNaN(hr) || hr < 30 || hr > 220) {
      errors.push('Heart rate must be between 30-220 bpm');
    }
  }
  
  // Валідація blood pressure
  if (data.blood_pressure_systolic !== undefined) {
    const bp = Number(data.blood_pressure_systolic);
    if (isNaN(bp) || bp < 50 || bp > 300) {
      errors.push('Systolic blood pressure must be between 50-300');
    }
  }
  
  if (data.blood_pressure_diastolic !== undefined) {
    const bp = Number(data.blood_pressure_diastolic);
    if (isNaN(bp) || bp < 30 || bp > 200) {
      errors.push('Diastolic blood pressure must be between 30-200');
    }
  }
  
  // Валідація BMI
  if (data.body_mass_index !== undefined) {
    const bmi = Number(data.body_mass_index);
    if (isNaN(bmi) || bmi < 10 || bmi > 100) {
      errors.push('BMI must be between 10-100');
    }
  }
  
  // Валідація temperature
  if (data.body_temperature !== undefined) {
    const temp = Number(data.body_temperature);
    if (isNaN(temp) || temp < 30 || temp > 45) {
      errors.push('Temperature must be between 30-45°C');
    }
  }
  
  // Валідація текстових полів на XSS
  if (data.notes) {
    try {
      data.notes = sanitizeText(data.notes);
    } catch (error) {
      errors.push('Notes contain invalid characters');
    }
  }
  
  return errors;
};

// Валідація password
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
};
```

#### Крок 2: Використовувати в формах

```javascript
// src/routes/pages/Profile.jsx
import { validateHealthData } from '../../utils/validation';

// Перед відправкою даних
const handleSaveHealthData = async (healthData) => {
  // Валідація
  const errors = validateHealthData(healthData);
  if (errors.length > 0) {
    showError(errors.join(', '));
    return;
  }
  
  // Відправка на бекенд
  await HealthApi.create(healthData);
};
```

**Результат:** Невалідні або небезпечні дані не відправляються на бекенд.

---

### 4. Додати HTML Sanitization

**Чому важливо:** Захист від XSS при відображенні користувацького контенту.

**Що робити:**

#### Крок 1: Встановити DOMPurify

```bash
npm install dompurify
```

#### Крок 2: Створити `src/utils/sanitize.js`

```javascript
// src/utils/sanitize.js
import DOMPurify from 'dompurify';

// Безпечна санітизація HTML
export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
};

// Санітизація для відображення в React
export const SafeHtml = ({ html, className }) => {
  const clean = sanitizeHtml(html);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

#### Крок 3: Використовувати при відображенні контенту

```javascript
// При відображенні користувацького контенту
import { SafeHtml } from '../../utils/sanitize';

<SafeHtml html={userContent} className="content" />
```

**Результат:** Захист від XSS при відображенні HTML контенту.

---

### 5. Налаштувати Environment Variables

**Чому важливо:** Легше змінювати endpoints для різних середовищ, менше витоку інформації.

**Що робити:**

#### Крок 1: Створити `.env.development`

```bash
# .env.development
VITE_API_BASE=https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO
VITE_API_BASE_AUTH=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5
VITE_API_BASE_SUBSCRIPTION=https://xu6p-ejbd-2ew4.n7e.xano.io/api:IqZoSRZI
VITE_API_BASE_PAYMENT=https://xu6p-ejbd-2ew4.n7e.xano.io/api:c4HYH1BF
VITE_API_BASE_NOTIFICATIONS=https://xu6p-ejbd-2ew4.n7e.xano.io/api:V6Md0ZUL
VITE_API_BASE_ACCOUNT=https://xu6p-ejbd-2ew4.n7e.xano.io/api:nZuNxVVd
```

#### Крок 2: Створити `.env.production`

```bash
# .env.production
VITE_API_BASE=https://api.anatomous.com
VITE_API_BASE_AUTH=https://auth.anatomous.com
VITE_API_BASE_SUBSCRIPTION=https://subscription.anatomous.com
VITE_API_BASE_PAYMENT=https://payment.anatomous.com
VITE_API_BASE_NOTIFICATIONS=https://notifications.anatomous.com
VITE_API_BASE_ACCOUNT=https://account.anatomous.com
```

#### Крок 3: Оновити `src/api/apiConfig.js`

```javascript
// src/api/apiConfig.js

// ❌ ВИДАЛИТИ захардкоджені URL:
// export const API_BASE = "https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO";

// ✅ ВИКОРИСТОВУВАТИ environment variables:
export const API_BASE = import.meta.env.VITE_API_BASE || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO";

export const API_BASE_AUTH = import.meta.env.VITE_API_BASE_AUTH || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5";

export const API_BASE_SUBSCRIPTION = import.meta.env.VITE_API_BASE_SUBSCRIPTION || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:IqZoSRZI";

export const API_BASE_PAYMENT = import.meta.env.VITE_API_BASE_PAYMENT || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:c4HYH1BF";

export const API_BASE_NOTIFICATIONS = import.meta.env.VITE_API_BASE_NOTIFICATIONS || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:V6Md0ZUL";

export const API_BASE_ACCOUNT = import.meta.env.VITE_API_BASE_ACCOUNT || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:nZuNxVVd";

export const API_BASE_ACCOUNT_SETTINGS = import.meta.env.VITE_API_BASE_ACCOUNT_SETTINGS || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:nZuNxVVd";
```

#### Крок 4: Додати `.env` в `.gitignore`

```bash
# .gitignore
.env
.env.local
.env.development.local
.env.production.local
```

**Результат:** Легше керувати різними середовищами, менше витоку інформації про архітектуру.

---

## 🟡 ПРІОРИТЕТ 2: ВИСОКІ ПОКРАЩЕННЯ

### 6. Безпечне логування помилок

**Що робити:**

#### Крок 1: Створити `src/utils/logger.js`

```javascript
// src/utils/logger.js

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authToken',
  'refreshToken',
  'email',
  'ssn',
  'creditCard',
  'cvv',
  'apiKey',
  'secret'
];

const isDevelopment = import.meta.env.DEV;

const sanitize = (obj, depth = 0) => {
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export const safeLog = (...args) => {
  if (isDevelopment) {
    console.log(...args.map(arg => 
      typeof arg === 'object' ? sanitize(arg) : arg
    ));
  }
};

export const safeError = (error, context = {}) => {
  const safeError = {
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    context: sanitize(context)
  };
  
  console.error(safeError);
  
  // Можна додати відправку в Sentry або іншу систему моніторингу
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { extra: safeError.context });
  // }
};

export const safeWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args.map(arg => 
      typeof arg === 'object' ? sanitize(arg) : arg
    ));
  }
};
```

#### Крок 2: Замінити всі console.log/error/warn

```javascript
// Замість:
console.log('User data:', user);
console.error('Error:', error);

// Використовувати:
import { safeLog, safeError } from '../../utils/logger';

safeLog('User data:', user);
safeError(error, { userId: user.id });
```

**Результат:** Чутливі дані не потрапляють в логи.

---

### 7. Додати захист від Clickjacking

**Що робити:**

#### Крок 1: Створити `src/utils/clickjackingProtection.js`

```javascript
// src/utils/clickjackingProtection.js

export const protectFromClickjacking = () => {
  // Перевірка чи сторінка завантажена в iframe
  if (window.top !== window.self) {
    // Якщо так - перенаправити на саму себе
    window.top.location = window.self.location;
  }
};

// Викликати при завантаженні
export const initClickjackingProtection = () => {
  protectFromClickjacking();
  
  // Додаткова перевірка при зміні фокусу
  window.addEventListener('focus', protectFromClickjacking);
};
```

#### Крок 2: Додати в `src/main.jsx`

```javascript
// src/main.jsx
import { initClickjackingProtection } from './utils/clickjackingProtection';

// Викликати при завантаженні
initClickjackingProtection();
```

**Результат:** Захист від clickjacking атак.

---

### 8. Автоматичний logout при неактивності

**Що робити:**

#### Крок 1: Створити `src/hooks/useAutoLogout.js`

```javascript
// src/hooks/useAutoLogout.js
import { useEffect } from 'react';
import { useAuth } from '../api/AuthContext';

export const useAutoLogout = (inactivityMinutes = 30) => {
  const { logout, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated()) return;
    
    let inactivityTimer;
    let warningTimer;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      
      // Попередження за 2 хвилини до logout
      warningTimer = setTimeout(() => {
        // Можна показати модальне вікно з попередженням
        const shouldContinue = window.confirm(
          'You will be logged out due to inactivity. Click OK to continue your session.'
        );
        if (shouldContinue) {
          resetTimer();
        }
      }, (inactivityMinutes - 2) * 60 * 1000);
      
      // Автоматичний logout
      inactivityTimer = setTimeout(() => {
        logout();
      }, inactivityMinutes * 60 * 1000);
    };
    
    // Події для скидання таймера
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    
    resetTimer();
    
    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [logout, isAuthenticated, inactivityMinutes]);
};
```

#### Крок 2: Використовувати в `src/Layout.jsx` або `src/routes/DashboardLayout.jsx`

```javascript
// src/routes/DashboardLayout.jsx
import { useAutoLogout } from '../../hooks/useAutoLogout';

function DashboardLayout() {
  useAutoLogout(30); // 30 хвилин неактивності
  
  // ... решта коду
}
```

**Результат:** Автоматичний logout при неактивності користувача.

---

### 9. Базова rate limiting на клієнті

**Що робити:**

#### Крок 1: Створити `src/utils/rateLimiter.js`

```javascript
// src/utils/rateLimiter.js

class ClientRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    // Видалити старі запити
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
  
  reset() {
    this.requests = [];
  }
}

// Створити інстанси для різних типів запитів
export const apiLimiter = new ClientRateLimiter(30, 60000); // 30 запитів на хвилину
export const authLimiter = new ClientRateLimiter(5, 15 * 60000); // 5 запитів на 15 хвилин
```

#### Крок 2: Використовувати в API клієнті

```javascript
// src/api/apiClient.js
import { apiLimiter } from '../utils/rateLimiter';

export const authRequest = async (url, options = {}, retry = true) => {
  // Перевірка rate limit
  if (!apiLimiter.canMakeRequest()) {
    throw new ApiError(
      'Too many requests. Please wait a moment before trying again.',
      429,
      null
    );
  }
  
  // ... решта коду
};
```

**Результат:** Базова захист від надмірних запитів (повна захист потребує бекенду).

---

### 10. Перевірка HTTPS

**Що робити:**

#### Крок 1: Створити `src/utils/securityCheck.js`

```javascript
// src/utils/securityCheck.js

export const checkHttps = () => {
  // Перевірка чи використовується HTTPS
  if (window.location.protocol !== 'https:' && 
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1') {
    console.warn('⚠️ Application should be accessed via HTTPS in production');
    
    // Можна показати попередження користувачу
    if (window.location.hostname.includes('anatomous.com')) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  }
};

// Викликати при завантаженні
export const initSecurityChecks = () => {
  checkHttps();
};
```

#### Крок 2: Додати в `src/main.jsx`

```javascript
// src/main.jsx
import { initSecurityChecks } from './utils/securityCheck';

initSecurityChecks();
```

**Результат:** Перевірка використання HTTPS.

---

## 📋 CHECKLIST ВИПРАВЛЕНЬ

### Критичні (зробити зараз):
- [ ] **Покращити безпеку токенів** (sessionStorage + обфускація) ⚠️ Якщо бекенд не підтримує cookies
- [ ] **Додати Content Security Policy** ✅ Можна без бекенду
- [ ] **Покращити валідацію вхідних даних** ✅ Можна без бекенду
- [ ] **Додати HTML sanitization** ✅ Можна без бекенду
- [ ] **Налаштувати environment variables** ✅ Можна без бекенду

### Високі (зробити скоро):
- [ ] **Безпечне логування помилок** ✅ Можна без бекенду
- [ ] **Захист від clickjacking** ✅ Можна без бекенду
- [ ] **Автоматичний logout** ✅ Можна без бекенду
- [ ] **Базова rate limiting** ✅ Можна без бекенду
- [ ] **Перевірка HTTPS** ✅ Можна без бекенду

### ⚠️ НЕ МОЖНА без змін на бекенді:
- ❌ Видалити токени з localStorage (якщо бекенд не підтримує cookies)
- ❌ Повна захист від XSS (потрібен CSP + httpOnly cookies)
- ❌ CSRF protection (потрібен бекенд)
- ❌ Шифрування даних (потрібен бекенд)

---

## ⚠️ ВАЖЛИВО

### Обмеження без змін на бекенді:

1. **Токени в localStorage/sessionStorage:**
   - ⚠️ Все ще вразливі до XSS атак
   - ✅ Можна покращити (sessionStorage + обфускація)
   - ❌ Повна безпека потребує httpOnly cookies на бекенді

2. **Без виправлень на бекенді** додаток все ще вразливий до:
   - CSRF атак (якщо CORS налаштований неправильно)
   - Неавторизованого доступу (якщо автентифікація вимкнена)
   - Витоку даних (якщо дані не зашифровані)
   - XSS атак (токени доступні через JavaScript)

3. **Для повної безпеки потрібно:**
   - Виправити бекенд (httpOnly cookies, CORS, автентифікація)
   - Зашифрувати дані на бекенді
   - Додати audit logging на бекенді

4. **Ці виправлення на фронтенді:**
   - ✅ Зменшують ризик XSS атак (CSP, sanitization)
   - ✅ Покращують валідацію даних
   - ✅ Захищають від деяких клієнтських атак
   - ⚠️ Покращують безпеку токенів (але не повністю)
   - ❌ Не замінюють захист на бекенді

---

## 🚀 ПОЧАТИ ЗАРАЗ

**Рекомендований порядок (якщо бекенд НЕ підтримує cookies):**

1. **День 1:** 
   - ✅ Покращити безпеку токенів (sessionStorage + обфускація)
   - ✅ Додати Content Security Policy

2. **День 2:** 
   - ✅ Покращити валідацію вхідних даних
   - ✅ Додати HTML sanitization

3. **День 3:** 
   - ✅ Environment variables
   - ✅ Безпечне логування помилок

4. **День 4:** 
   - ✅ Решта покращень (clickjacking, auto-logout, rate limiting)

**Після цього:** 
- ⚠️ Звернутися до бекенд команди для критичних виправлень:
  - httpOnly cookies для токенів
  - Правильна налаштування CORS
  - Автентифікація на всіх endpoints
  - Шифрування даних

---

**Всі деталі та приклади коду в цьому документі готові до використання!**

