# 🔒 РОЗПОДІЛ ВІДПОВІДАЛЬНОСТІ: ФРОНТЕНД vs БЕКЕНД

## 📋 Огляд

Цей документ чітко розділяє, що можна покращити на **фронтенді** та що **обов'язково** потрібно виправити на **бекенді** для забезпечення безпеки додатку.

---

## ✅ ЩО МОЖНА ЗРОБИТИ НА ФРОНТЕНДІ

### 1. 🔐 Видалення токенів з localStorage

**Статус:** ✅ Можна зробити на фронтенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ

**Що робити:**
```javascript
// ❌ ВИДАЛИТИ ВСІ ЦІ РЯДКИ:
localStorage.setItem('authToken', token);
localStorage.getItem('authToken');
localStorage.removeItem('authToken');
localStorage.setItem('user', JSON.stringify(user));
localStorage.getItem('user');

// ✅ ЗАМІСТЬ ЦЬОГО - просто не зберігати токени
// Cookies будуть встановлюватися бекендом автоматично
```

**Файли для змін:**
- `src/api/AuthContext.jsx` - видалити всі localStorage операції з токенами
- `src/api/apiClient.js` - видалити fallback на localStorage токени
- `src/api/tokenManager.js` - видалити localStorage операції
- `src/api/reportsApi.js` - видалити localStorage операції
- `src/api/uploadFileApi.js` - видалити localStorage операції

**Результат:** Токени не будуть доступні через JavaScript, що захищає від XSS атак.

---

### 2. 🛡️ Додавання Content Security Policy (CSP)

**Статус:** ✅ Можна додати на фронтенді (через meta tags)  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
           style-src 'self' 'unsafe-inline'; 
           img-src 'self' data: https:; 
           font-src 'self' data:; 
           connect-src 'self' https://xu6p-ejbd-2ew4.n7e.xano.io; 
           frame-ancestors 'none';">
```

**Або через React Helmet:**
```bash
npm install react-helmet-async
```

```javascript
// src/Layout.jsx
import { Helmet } from 'react-helmet-async';

<Helmet>
  <meta http-equiv="Content-Security-Policy" 
    content="default-src 'self'; script-src 'self' 'unsafe-inline'; ..." />
</Helmet>
```

**Результат:** Захист від XSS атак, clickjacking, та інших injection атак.

---

### 3. ✅ Валідація вхідних даних на клієнті

**Статус:** ✅ Можна покращити на фронтенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```javascript
// utils/validation.js
export const validateHealthData = (data) => {
  const errors = [];
  
  // Валідація дати
  if (data.date && new Date(data.date) > new Date()) {
    errors.push('Date cannot be in the future');
  }
  
  // Валідація числових значень
  if (data.heart_rate && (data.heart_rate < 30 || data.heart_rate > 220)) {
    errors.push('Heart rate must be between 30-220 bpm');
  }
  
  // Валідація email
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Захист від XSS в текстових полях
  if (data.notes && /<script|javascript:|onerror=/i.test(data.notes)) {
    errors.push('Invalid characters in notes field');
  }
  
  return errors;
};

// Використання
const errors = validateHealthData(formData);
if (errors.length > 0) {
  showError(errors.join(', '));
  return;
}
```

**Результат:** Запобігання відправці невалідних або небезпечних даних на бекенд.

---

### 4. 🔒 Sanitization HTML контенту

**Статус:** ✅ Можна додати на фронтенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```bash
npm install dompurify
```

```javascript
// utils/sanitize.js
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
};

// Використання при відображенні користувацького контенту
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeHtml(userContent) 
}} />
```

**Результат:** Захист від XSS при відображенні користувацького контенту.

---

### 5. 🚫 Rate Limiting на клієнті

**Статус:** ✅ Можна додати на фронтенді (базова захист)  
**Пріоритет:** 🟢 СЕРЕДНІЙ

**Що робити:**
```javascript
// utils/rateLimiter.js
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
}

// Використання
const apiLimiter = new ClientRateLimiter(30, 60000); // 30 запитів на хвилину

if (!apiLimiter.canMakeRequest()) {
  showError('Too many requests. Please wait a moment.');
  return;
}
```

**Результат:** Базова захист від надмірних запитів (повна захист потребує бекенду).

---

### 6. 🔐 Захист від CSRF (якщо використовуються cookies)

**Статус:** ✅ Можна додати на фронтенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```javascript
// utils/csrf.js
let csrfToken = null;

export const getCsrfToken = async () => {
  if (!csrfToken) {
    // Отримати CSRF token від бекенду
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.token;
  }
  return csrfToken;
};

// Додавати до всіх POST/PUT/DELETE запитів
const token = await getCsrfToken();
fetch(url, {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});
```

**Результат:** Захист від CSRF атак при використанні cookies.

---

### 7. 🔒 Environment Variables для API endpoints

**Статус:** ✅ Можна налаштувати на фронтенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```javascript
// src/api/apiConfig.js
// ❌ ВИДАЛИТИ захардкоджені URL
// export const API_BASE = "https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO";

// ✅ ВИКОРИСТОВУВАТИ environment variables
export const API_BASE = import.meta.env.VITE_API_BASE || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO";
export const API_BASE_AUTH = import.meta.env.VITE_API_BASE_AUTH || 
  "https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5";

// .env.development
VITE_API_BASE=https://dev-api.anatomous.com
VITE_API_BASE_AUTH=https://dev-auth.anatomous.com

// .env.production
VITE_API_BASE=https://api.anatomous.com
VITE_API_BASE_AUTH=https://auth.anatomous.com
```

**Результат:** Легше змінювати endpoints для різних середовищ, менше витоку інформації.

---

### 8. 🛡️ Захист від Clickjacking

**Статус:** ✅ Можна додати на фронтенді  
**Пріоритет:** 🟢 СЕРЕДНІЙ

**Що робити:**
```javascript
// src/utils/clickjackingProtection.js
if (window.top !== window.self) {
  // Якщо сторінка завантажена в iframe
  window.top.location = window.self.location;
}
```

**Або через meta tag:**
```html
<meta http-equiv="X-Frame-Options" content="DENY">
```

**Результат:** Захист від clickjacking атак.

---

### 9. 🔐 Автоматичний logout при неактивності

**Статус:** ✅ Можна реалізувати на фронтенді  
**Пріоритет:** 🟢 СЕРЕДНІЙ

**Що робити:**
```javascript
// hooks/useAutoLogout.js
import { useEffect } from 'react';
import { useAuth } from '../api/AuthContext';

export const useAutoLogout = (inactivityMinutes = 30) => {
  const { logout } = useAuth();
  
  useEffect(() => {
    let inactivityTimer;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
      }, inactivityMinutes * 60 * 1000);
    };
    
    // Події для скидання таймера
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });
    
    resetTimer();
    
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [logout, inactivityMinutes]);
};
```

**Результат:** Автоматичний logout при неактивності користувача.

---

### 10. 📝 Безпечне логування помилок

**Статус:** ✅ Можна реалізувати на фронтенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що робити:**
```javascript
// utils/logger.js
const SENSITIVE_FIELDS = ['password', 'token', 'authToken', 'email', 'ssn'];

const sanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    sanitized[key] = isSensitive ? '[REDACTED]' : value;
  }
  return sanitized;
};

export const safeLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args.map(arg => 
      typeof arg === 'object' ? sanitize(arg) : arg
    ));
  }
};

export const safeError = (error, context = {}) => {
  console.error({
    message: error.message,
    context: sanitize(context)
  });
};
```

**Результат:** Чутливі дані не потрапляють в логи.

---

## 🔴 ЩО ОБОВ'ЯЗКОВО ПОТРІБНО ВИПРАВИТИ НА БЕКЕНДІ

### 1. 🔐 Встановлення httpOnly Cookies

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ

**Що потрібно:**
```javascript
// backend_node/routes/auth.js
router.post('/login', async (req, res) => {
  // ... валідація користувача
  
  const authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
  
  // ✅ ВСТАНОВИТИ httpOnly cookie
  res.cookie('auth_token', authToken, {
    httpOnly: true,        // Не доступний через JavaScript
    secure: process.env.NODE_ENV === 'production', // Тільки HTTPS
    sameSite: 'strict',    // Захист від CSRF
    maxAge: 24 * 60 * 60 * 1000, // 24 години
    path: '/'
  });
  
  // ❌ НЕ відправляти токен в body
  res.json({ success: true, user: { id: user.id, email: user.email } });
});
```

**Без цього:** Токени будуть доступні через JavaScript (XSS ризик).

---

### 2. 🛡️ Налаштування CORS

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ

**Що потрібно:**
```javascript
// backend_node/server.js
const allowedOrigins = [
  'https://anatomous.com',
  'https://www.anatomous.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Важливо для cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400
}));
```

**Без цього:** Будь-який сайт може робити запити до API (CSRF ризик).

---

### 3. 🔒 Автентифікація на бекенді

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ

**Що потрібно:**
```javascript
// backend_node/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ✅ Читати токен з cookies
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ✅ Застосувати до всіх захищених routes
router.use('/api', authMiddleware);
```

**Без цього:** Будь-хто може отримати доступ до медичних даних.

---

### 4. 🚫 Rate Limiting на бекенді

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що потрібно:**
```javascript
// backend_node/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // 5 спроб логіну
  message: 'Too many login attempts',
  skipSuccessfulRequests: true
});

exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 30, // 30 запитів
  keyGenerator: (req) => req.user?.id || req.ip
});

// Застосувати
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
```

**Без цього:** Ризик DDoS та brute force атак.

---

### 5. ✅ Валідація та санітизація на бекенді

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що потрібно:**
```javascript
// backend_node/utils/validation.js
const Joi = require('joi');

const healthDataSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  date: Joi.date().max('now').required(),
  heart_rate: Joi.number().integer().min(30).max(220).optional(),
  // ... інші поля
});

// Middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
};

// Використання
router.post('/health_data', validate(healthDataSchema), async (req, res) => {
  // req.body вже валідований
});
```

**Без цього:** Ризик SQL injection, NoSQL injection, та інших атак.

---

### 6. 🔐 Шифрування даних на рівні БД

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ (для HIPAA)

**Що потрібно:**
```javascript
// backend_node/utils/encryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const key = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Використання перед збереженням в БД
const encryptedNotes = encrypt(healthData.notes);
```

**Без цього:** Медичні дані не зашифровані (порушення HIPAA).

---

### 7. 📝 Audit Logging

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🟡 ВИСОКИЙ (для HIPAA)

**Що потрібно:**
```javascript
// backend_node/services/auditLog.js
class AuditLogService {
  static async log(req, action, resourceType, resourceId) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_id: req.user?.id,
      ip_address: req.ip || req.headers['x-forwarded-for'],
      user_agent: req.headers['user-agent'],
      action, // 'view', 'create', 'update', 'delete'
      resource_type: resourceType,
      resource_id: resourceId
    };
    
    // Зберегти в БД
    await db.query('INSERT INTO audit_logs ...', logEntry);
  }
}

// Middleware
const auditMiddleware = (action, resourceType) => (req, res, next) => {
  const originalSend = res.json;
  res.json = function(data) {
    if (res.statusCode < 400) {
      AuditLogService.log(req, action, resourceType, req.params.id);
    }
    return originalSend.call(this, data);
  };
  next();
};

// Використання
router.get('/health_data/:id', 
  authMiddleware,
  auditMiddleware('view', 'health_data'),
  async (req, res) => { ... }
);
```

**Без цього:** Неможливо відстежити хто переглядав медичні дані (порушення HIPAA).

---

### 8. 🔒 Security Headers

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що потрібно:**
```javascript
// backend_node/server.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

**Без цього:** Відсутні базові security headers.

---

### 9. 🔐 CSRF Protection

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🟡 ВИСОКИЙ

**Що потрібно:**
```javascript
// backend_node/middleware/csrf.js
const csrf = require('csurf');

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Endpoint для отримання CSRF token
router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ token: req.csrfToken() });
});

// Застосувати до всіх POST/PUT/DELETE
router.post('/api/*', csrfProtection, (req, res, next) => {
  next();
});
```

**Без цього:** Ризик CSRF атак при використанні cookies.

---

### 10. 🔒 Хешування паролів

**Статус:** ❌ ОБОВ'ЯЗКОВО на бекенді  
**Пріоритет:** 🔴 КРИТИЧНИЙ

**Що потрібно:**
```javascript
// backend_node/utils/password.js
const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// При реєстрації
const hashedPassword = await hashPassword(req.body.password);
await db.query('INSERT INTO users (email, password) VALUES ($1, $2)', 
  [email, hashedPassword]);

// При логіні
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
const isValid = await comparePassword(password, user.password);
```

**Без цього:** Паролі зберігаються в plain text (критична вразливість).

---

## 🤝 ЩО ПОТРЕБУЄ СПІЛЬНОЇ РОБОТИ

### 1. 🔄 Token Refresh Flow

**Фронтенд:**
- Викликати `/auth/refresh` при 401 помилці
- Не зберігати токени в localStorage

**Бекенд:**
- Встановлювати нові cookies при refresh
- Валідувати refresh_token

---

### 2. 🔐 HTTPS Only

**Фронтенд:**
- Використовувати тільки HTTPS URLs
- Перевіряти протокол перед відправкою даних

**Бекенд:**
- Налаштувати HTTPS
- Redirect HTTP → HTTPS
- HSTS headers

---

### 3. 📊 Error Handling

**Фронтенд:**
- Не показувати детальні помилки користувачам
- Логувати помилки без чутливих даних

**Бекенд:**
- Повертати загальні повідомлення про помилки
- Не логувати чутливі дані
- Відправляти деталі тільки в development

---

## 📋 CHECKLIST

### Фронтенд (можна зробити зараз):
- [ ] Видалити localStorage токени
- [ ] Додати CSP headers
- [ ] Покращити валідацію вхідних даних
- [ ] Додати HTML sanitization
- [ ] Налаштувати environment variables
- [ ] Додати безпечне логування
- [ ] Додати захист від clickjacking
- [ ] Додати автоматичний logout

### Бекенд (обов'язково потрібно):
- [ ] Встановлювати httpOnly cookies
- [ ] Налаштувати CORS правильно
- [ ] Включити автентифікацію
- [ ] Додати rate limiting
- [ ] Валідація та санітизація
- [ ] Шифрування даних
- [ ] Audit logging
- [ ] Security headers
- [ ] CSRF protection
- [ ] Хешування паролів

---

## ⚠️ ВИСНОВОК

**Фронтенд може:**
- Покращити безпеку клієнтської частини
- Додати захист від XSS
- Покращити UX безпеки

**Бекенд ОБОВ'ЯЗКОВО повинен:**
- Захистити API endpoints
- Зашифрувати дані
- Забезпечити автентифікацію
- Логувати доступ до даних

**Без виправлень на бекенді:** Додаток не готовий для production з медичними даними.

---

**Рекомендація:** Почніть з критичних виправлень на бекенді (httpOnly cookies, CORS, автентифікація), потім покращуйте фронтенд.

