# 🛠️ ПРАКТИЧНИЙ ПОСІБНИК: ВИПРАВЛЕННЯ ПРОБЛЕМ БЕЗПЕКИ

## Швидкий старт: Критичні виправлення

---

## 1. 🔐 ПЕРЕХІД НА HTTPONLY COOKIES

### Крок 1: Оновити бекенд для встановлення cookies

```javascript
// backend_node/routes/auth.js (або ваш auth endpoint)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Валідація користувача (ваша логіка)
    const user = await validateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Генерація токенів
    const authToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // ✅ Встановлення httpOnly cookies
    res.cookie('auth_token', authToken, {
      httpOnly: true,        // Не доступний через JavaScript
      secure: process.env.NODE_ENV === 'production', // Тільки HTTPS в production
      sameSite: 'strict',    // Захист від CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 години
      path: '/'
    });
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
      path: '/'
    });
    
    // Відповідь БЕЗ токенів в body (безпечніше)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        // НЕ включати чутливі дані
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  // ✅ Видалення cookies
  res.clearCookie('auth_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ success: true });
});

module.exports = router;
```

### Крок 2: Оновити middleware для читання з cookies

```javascript
// backend_node/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ✅ Читаємо токен з cookies (пріоритет) або headers (fallback)
  const token = req.cookies?.auth_token || 
                req.cookies?.authToken ||
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Спробувати refresh token
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // Генерувати новий auth token
        const newAuthToken = jwt.sign(
          { userId: decoded.userId },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        res.cookie('auth_token', newAuthToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        req.user = { userId: decoded.userId };
        return next();
      } catch (refreshError) {
        return res.status(401).json({ error: 'Session expired' });
      }
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Крок 3: Видалити localStorage з фронтенду

```javascript
// src/api/AuthContext.jsx
// ❌ ВИДАЛИТИ ВСІ ЦІ РЯДКИ:
// localStorage.setItem('authToken', authToken);
// localStorage.setItem('user', JSON.stringify(user));
// localStorage.getItem('authToken');
// localStorage.removeItem('authToken');

// ✅ ЗАМІСТЬ ЦЬОГО - просто використовувати cookies
// Cookies автоматично відправляються з запитами через credentials: "include"
```

### Крок 4: Оновити apiClient.js

```javascript
// src/api/apiClient.js
export const authRequest = async (url, options = {}, retry = true) => {
  const config = {
    mode: 'cors',
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // ✅ Важливо: відправляє cookies
    ...options,
  };

  // ❌ ВИДАЛИТИ: додавання токена в headers
  // const authToken = localStorage.getItem('authToken');
  // if (authToken) {
  //   config.headers["Authorization"] = `Bearer ${authToken}`;
  // }

  // ✅ Cookies автоматично відправляються через credentials: "include"
  
  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    let response = await fetch(url, config);
    
    if (response.status === 401 && retry) {
      // Спробувати refresh через cookies
      try {
        const refreshRes = await fetch(CUSTOM_ENDPOINTS.auth.refreshToken, {
          method: 'POST',
          credentials: 'include', // Cookies відправляються автоматично
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (refreshRes.ok) {
          // Повторити оригінальний запит
          return authRequest(url, options, false);
        }
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        throw new ApiError("Session expired", 401, null);
      }
    }
    
    // ... решта обробки
  } catch (error) {
    // ... обробка помилок
  }
};
```

---

## 2. 🔒 НАЛАШТУВАННЯ CORS

```javascript
// backend_node/server.js
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ Безпечна конфігурація CORS
const allowedOrigins = [
  'https://anatomous.com',
  'https://www.anatomous.com',
  'https://app.anatomous.com',
  process.env.FRONTEND_URL,
  // Додати dev URL тільки для development
  ...(process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3000'] 
    : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Дозволити запити без origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // ✅ Важливо для cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 години
}));

// ✅ Додаткові security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

---

## 3. 🛡️ ВКЛЮЧЕННЯ АВТЕНТИФІКАЦІЇ НА БЕКЕНДІ

```javascript
// backend_node/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  // Дозволити OPTIONS запити
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ✅ Читаємо токен з cookies або headers
  const token = req.cookies?.auth_token || 
                req.cookies?.authToken ||
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  try {
    // ✅ Валідація JWT токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Додати інформацію про користувача в request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Спробувати оновити через refresh token
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
          
          // Генерувати новий auth token
          const newAuthToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          // Встановити новий cookie
          res.cookie('auth_token', newAuthToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
          });
          
          req.user = { id: decoded.userId, email: decoded.email };
          return next();
        } catch (refreshError) {
          return res.status(401).json({ 
            error: 'Session expired',
            message: 'Please login again'
          });
        }
      }
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

// ✅ Застосувати до всіх захищених routes
// backend_node/routes/pdf.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Захистити всі routes
router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  // req.user доступний тут
  const userId = req.user.id;
  // ... ваша логіка
});
```

---

## 4. 🚫 RATE LIMITING

```bash
npm install express-rate-limit
```

```javascript
// backend_node/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// ✅ Загальний rate limit
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 100, // 100 запитів
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Rate limit для автентифікації
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // 5 спроб логіну
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
});

// ✅ Rate limit для API (на основі user ID)
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 30, // 30 запитів
  keyGenerator: (req) => {
    // Використовувати user ID якщо доступний, інакше IP
    return req.user?.id || req.ip;
  },
  message: 'Too many API requests, please slow down'
});

// ✅ Застосувати в server.js
const { generalLimiter, authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Загальний rate limit для всіх routes
app.use(generalLimiter);

// Спеціальний rate limit для auth routes
app.use('/api/auth', authLimiter);

// Rate limit для API routes
app.use('/api', apiLimiter);
```

---

## 5. ✅ ВАЛІДАЦІЯ ВХІДНИХ ДАНИХ

```bash
npm install joi
```

```javascript
// backend_node/utils/validation.js
const Joi = require('joi');

// ✅ Схема для health data
exports.healthDataSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  date: Joi.date().max('now').required(),
  heart_rate: Joi.number().integer().min(30).max(220).optional(),
  blood_pressure_systolic: Joi.number().min(50).max(300).optional(),
  blood_pressure_diastolic: Joi.number().min(30).max(200).optional(),
  weekly_activity_minutes: Joi.number().min(0).max(10080).optional(), // max = 7 days * 24h * 60min
  body_mass_index: Joi.number().min(10).max(100).optional(),
  body_temperature: Joi.number().min(30).max(45).optional(), // Celsius
  fasting_glucose: Joi.number().min(50).max(500).optional(), // mg/dL
  pulse_oximetry: Joi.number().min(0).max(100).optional(), // percentage
  respiratory_rate: Joi.number().integer().min(8).max(40).optional(), // breaths per minute
  hydration_liters: Joi.number().min(0).max(20).optional(),
  daily_step_count: Joi.number().integer().min(0).max(100000).optional(),
  mood: Joi.number().integer().min(1).max(5).optional(),
  stress_level: Joi.number().integer().min(1).max(5).optional(),
  sleep_quality: Joi.number().integer().min(1).max(5).optional(),
  visibility_scope: Joi.string().valid('private', 'shared', 'public').optional()
});

// ✅ Middleware для валідації
exports.validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Повернути всі помилки
      stripUnknown: true // Видалити невідомі поля
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    // Замінити req.body на валідовані дані
    req.body = value;
    next();
  };
};

// ✅ Використання
// backend_node/routes/health.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { healthDataSchema, validate } = require('../utils/validation');

router.post('/health_data', 
  authMiddleware,
  validate(healthDataSchema),
  async (req, res) => {
    // req.body вже валідований та очищений
    const healthData = req.body;
    // ... зберегти дані
  }
);
```

---

## 6. 📝 AUDIT LOGGING

```javascript
// backend_node/services/auditLog.js
class AuditLogService {
  static async log(req, action, resourceType, resourceId, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_id: req.user?.id || null,
      ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      action, // 'view', 'create', 'update', 'delete', 'export', 'login', 'logout'
      resource_type: resourceType, // 'health_data', 'medical_record', 'profile', etc.
      resource_id: resourceId || null,
      success: true,
      metadata: {
        endpoint: req.path,
        method: req.method,
        ...metadata
      }
    };
    
    // Зберегти в базу даних
    try {
      // Використовувати вашу БД (PostgreSQL через Xano або напряму)
      await db.query(
        'INSERT INTO audit_logs (user_id, ip_address, user_agent, action, resource_type, resource_id, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          logEntry.user_id,
          logEntry.ip_address,
          logEntry.user_agent,
          logEntry.action,
          logEntry.resource_type,
          logEntry.resource_id,
          JSON.stringify(logEntry.metadata),
          logEntry.timestamp
        ]
      );
    } catch (error) {
      console.error('Failed to save audit log:', error);
      // Не блокувати запит, але логувати помилку
    }
  }
}

module.exports = AuditLogService;

// ✅ Middleware для автоматичного логування
// backend_node/middleware/auditMiddleware.js
const AuditLogService = require('../services/auditLog');

module.exports = (action, resourceType) => {
  return async (req, res, next) => {
    // Виконати оригінальний запит
    const originalSend = res.json;
    
    res.json = function(data) {
      // Логувати після успішного виконання
      if (res.statusCode < 400) {
        const resourceId = req.params.id || req.body.id || data?.id || null;
        AuditLogService.log(req, action, resourceType, resourceId, {
          status_code: res.statusCode
        }).catch(err => console.error('Audit log error:', err));
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// ✅ Використання
// backend_node/routes/health.js
const auditMiddleware = require('../middleware/auditMiddleware');

router.get('/health_data/:id',
  authMiddleware,
  auditMiddleware('view', 'health_data'),
  async (req, res) => {
    // ... отримати дані
  }
);

router.post('/health_data',
  authMiddleware,
  validate(healthDataSchema),
  auditMiddleware('create', 'health_data'),
  async (req, res) => {
    // ... створити дані
  }
);
```

---

## 7. 🔐 ШИФРУВАННЯ ДАНИХ

```bash
npm install crypto
```

```javascript
// backend_node/utils/encryption.js
const crypto = require('crypto');

// ✅ Отримати ключ з environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex string
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

// ✅ Шифрування
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Повернути IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

// ✅ Розшифрування
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ✅ Шифрування об'єкта
function encryptObject(obj) {
  if (!obj) return null;
  const json = JSON.stringify(obj);
  return encrypt(json);
}

// ✅ Розшифрування об'єкта
function decryptObject(encryptedText) {
  if (!encryptedText) return null;
  const decrypted = decrypt(encryptedText);
  return JSON.parse(decrypted);
}

module.exports = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject
};

// ✅ Використання для чутливих полів
// backend_node/services/healthDataService.js
const { encrypt, decrypt } = require('../utils/encryption');

class HealthDataService {
  static async create(data) {
    // Шифрувати чутливі поля перед збереженням
    const encryptedData = {
      ...data,
      // Приклад: шифрувати діагнози, нотатки
      notes: data.notes ? encrypt(data.notes) : null,
      diagnosis: data.diagnosis ? encrypt(data.diagnosis) : null
    };
    
    // Зберегти в БД
    const saved = await db.query('INSERT INTO health_data ...', encryptedData);
    return saved;
  }
  
  static async getById(id, userId) {
    // Отримати з БД
    const data = await db.query('SELECT * FROM health_data WHERE id = $1 AND user_id = $2', [id, userId]);
    
    // Розшифрувати чутливі поля
    if (data.notes) data.notes = decrypt(data.notes);
    if (data.diagnosis) data.diagnosis = decrypt(data.diagnosis);
    
    return data;
  }
}
```

**Генерація ключа:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Додати в .env:**
```
ENCRYPTION_KEY=<згенерований_ключ>
```

---

## 8. 🧹 ВИДАЛЕННЯ ЧУТЛИВИХ ДАНИХ З ЛОГІВ

```javascript
// backend_node/utils/logger.js
const isDevelopment = process.env.NODE_ENV === 'development';

// ✅ Список чутливих полів
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

// ✅ Санітизація об'єкта
function sanitize(obj, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]'; // Захист від циклічних посилань
  
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
}

// ✅ Безпечний logger
const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args.map(arg => 
        typeof arg === 'object' ? sanitize(arg) : arg
      ));
    }
  },
  
  error: (error, context = {}) => {
    const safeError = {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      context: sanitize(context)
    };
    
    console.error(safeError);
    
    // Відправити в систему моніторингу (Sentry, LogRocket)
    if (process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { extra: safeError.context });
    }
  },
  
  warn: (...args) => {
    console.warn(...args.map(arg => 
      typeof arg === 'object' ? sanitize(arg) : arg
    ));
  }
};

module.exports = logger;

// ✅ Використання замість console.log
// const logger = require('./utils/logger');

// logger.log('User data:', user); // Автоматично санітизує
// logger.error(error, { userId: user.id, action: 'login' });
```

---

## 📋 CHECKLIST ВИПРАВЛЕНЬ

- [ ] Перехід на httpOnly cookies
- [ ] Видалення localStorage з фронтенду
- [ ] Налаштування CORS
- [ ] Включення автентифікації на бекенді
- [ ] Додавання rate limiting
- [ ] Валідація вхідних даних
- [ ] Audit logging
- [ ] Шифрування чутливих даних
- [ ] Санітизація логів
- [ ] Security headers
- [ ] Content Security Policy

---

## 🚀 НАСТУПНІ КРОКИ

1. **Тестування:** Протестувати всі зміни в development середовищі
2. **Code Review:** Перевірити код перед merge
3. **Security Testing:** Провести penetration testing
4. **Monitoring:** Налаштувати моніторинг безпеки
5. **Documentation:** Оновити документацію для команди

---

**Важливо:** Всі зміни потрібно тестувати ретельно перед deployment в production!

