# Налаштування авторизації через httpOnly Cookies

## 🎯 Мета
Приховати токен авторизації від Network вкладки браузера, використовуючи httpOnly cookies замість передачі токена в заголовках.

## 🔧 Що потрібно налаштувати на бекенді

### 1. Після успішного логіну (`POST /auth/login`)

Бекенд повинен встановити **httpOnly cookie** з токеном:

```javascript
// Приклад для Node.js/Express
res.cookie('auth_token', authToken, {
  httpOnly: true,        // ⚠️ ВАЖЛИВО: не доступний через JavaScript
  secure: true,          // Тільки через HTTPS (для production)
  sameSite: 'strict',    // Захист від CSRF
  maxAge: 24 * 60 * 60 * 1000, // 24 години (або ваш термін дії)
  path: '/'
});

// Також можна встановити refresh_token cookie
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
  path: '/'
});
```

### 2. Читання токена з cookies на бекенді

Бекенд повинен читати токен з cookies замість (або разом з) заголовком Authorization:

```javascript
// Приклад middleware для Express
function authMiddleware(req, res, next) {
  // Спочатку пробуємо з cookies (пріоритет)
  const token = req.cookies?.auth_token || 
                req.cookies?.authToken ||
                // Fallback на Authorization header для сумісності
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Валідація токена
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 3. Оновлення токена (`POST /auth/refresh`)

При оновленні токена також встановлюйте новий cookie:

```javascript
// Після успішного refresh
res.cookie('auth_token', newAuthToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
});
```

### 4. Видалення cookies при logout (`POST /auth/logout`)

```javascript
res.clearCookie('auth_token', { path: '/' });
res.clearCookie('refresh_token', { path: '/' });
```

## 📋 Налаштування CORS

Якщо фронтенд і бекенд на різних доменах, потрібно налаштувати CORS:

```javascript
// Приклад для Express
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,  // ⚠️ ВАЖЛИВО: дозволяє відправляти cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## ✅ Що вже налаштовано на фронтенді

1. **apiClient.js** - автоматично використовує cookies, якщо вони доступні
2. **credentials: "include"** - дозволяє відправляти cookies з запитами
3. **Fallback на headers** - якщо cookies не доступні, використовується Authorization header

## 🔍 Перевірка роботи

1. Після логіну перевірте в DevTools → Application → Cookies
2. Має з'явитися cookie `auth_token` з прапорцями:
   - ✅ HttpOnly
   - ✅ Secure (в production)
   - ✅ SameSite=Strict
3. В Network вкладці заголовок `Authorization` НЕ повинен з'являтися
4. Cookies автоматично відправляються з кожним запитом

## ⚠️ Важливо

- **httpOnly cookies не доступні через JavaScript** - це нормально і безпечно
- Фронтенд не може прочитати httpOnly cookie, але браузер автоматично відправляє її з запитами
- Якщо бекенд не встановлює cookies, система автоматично використає fallback на headers
- Для повного приховування токена бекенд ОБОВ'ЯЗКОВО повинен встановлювати httpOnly cookies

## 🐛 Troubleshooting

### Cookies не встановлюються
- Перевірте, чи `credentials: "include"` встановлено в запитах
- Перевірте CORS налаштування на бекенді
- Перевірте, чи використовується HTTPS (для secure cookies)

### Токен не відправляється
- Перевірте, чи бекенд читає токен з cookies
- Перевірте назву cookie (має відповідати тому, що очікує бекенд)
- Перевірте path cookie (має бути `/` або відповідати шляху API)

### 401 Unauthorized
- Перевірте, чи бекенд правильно читає токен з cookies
- Перевірте валідацію токена на бекенді
- Перевірте, чи cookie не протухла

