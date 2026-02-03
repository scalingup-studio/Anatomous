# ✅ Чеклист: Що потрібно для успішного "Log in with Apple"

## 📊 Поточний статус

### ✅ Що вже готово (Фронтенд):

- [x] Кнопка "Log in with Apple" в `Login.jsx`
- [x] Функція `handleAppleLogin()` - обробка кліку
- [x] `AuthApi.getAppleAuthUrl()` - виклик бекенду
- [x] Компонент `OAuthCallbackApple.jsx` - обробка callback
- [x] Роут `/auth/callback/apple` в `main.jsx`
- [x] Інтеграція з `AuthContext` - збереження токенів
- [x] Логіка визначення нового/існуючого користувача
- [x] Редірект на `/onboarding` або `/dashboard`

### ❌ Що потрібно зробити (Бекенд Xano):

- [ ] **1. Створити ендпоінт `GET /auth/apple`**
- [ ] **2. Створити ендпоінт `POST /auth/callback/apple`**
- [ ] **3. Налаштувати Apple Developer Console**
- [ ] **4. Налаштувати Environment Variables в Xano**

---

## 🔧 Крок 1: Створити ендпоінт `GET /auth/apple`

### Статус: ❌ НЕ СТВОРЕНО (404 помилка)

### Що робити:

1. **Відкрити Xano** → ваш проект → API Group `HBbbpjK5`
2. **Створити ендпоінт**:
   - Method: `GET`
   - Path: `/auth/apple`
   - Name: `Get Apple Auth URL`

3. **Додати код** (у Function):
```javascript
const clientId = 'com.anatomous.healthyapp.web';
const redirectUri = 'https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple';

function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const state = generateRandomState();
const baseUrl = 'https://appleid.apple.com/auth/authorize';
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code id_token',
  scope: 'name email',
  response_mode: 'form_post',
  state: state
});

return {
  url: `${baseUrl}?${params.toString()}`
};
```

4. **Протестувати**:
```bash
curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
```

**Очікуваний результат**:
```json
{
  "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&..."
}
```

---

## 🔧 Крок 2: Створити ендпоінт `POST /auth/callback/apple`

### Статус: ❌ НЕ СТВОРЕНО

### Що робити:

1. **Створити ендпоінт**:
   - Method: `POST` (ВАЖЛИВО: не GET!)
   - Path: `/auth/callback/apple`
   - Name: `Apple OAuth Callback`

2. **Логіка обробки** (спрощений варіант):

```javascript
// 1. Отримати дані від Apple
const code = request.body.code;
const idToken = request.body.id_token;
const userJson = request.body.user; // може бути null

// 2. Декодувати id_token (JWT)
// Розділити JWT на частини
const parts = idToken.split('.');
const payload = JSON.parse(base64Decode(parts[1]));

// Отримати дані
const appleUserId = payload.sub; // Apple User ID
const email = payload.email; // Email користувача

// 3. Декодувати user JSON (якщо є - тільки при першому вході)
let firstName = null;
let lastName = null;
if (userJson) {
  const userData = JSON.parse(userJson);
  firstName = userData.name?.firstName || null;
  lastName = userData.name?.lastName || null;
}

// 4. Перевірити/створити користувача в базі
let user = await db.query(
  'SELECT * FROM users WHERE apple_id = ? OR email = ?',
  [appleUserId, email]
);

if (!user) {
  // Створити нового користувача
  user = await db.insert('users', {
    apple_id: appleUserId,
    email: email,
    first_name: firstName,
    last_name: lastName,
    created_at: new Date(),
    last_active_at: new Date(),
  });
} else {
  // Оновити існуючого
  await db.update('users', user.id, {
    last_active_at: new Date(),
    ...(firstName && { first_name: firstName }),
    ...(lastName && { last_name: lastName }),
  });
}

// 5. Генерувати власні JWT токени
const accessToken = generateJWT({
  user_id: user.id,
  email: user.email,
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 година
});

const refreshToken = generateRandomToken();

// 6. Зберегти refresh_token в базі
await db.insert('refresh_tokens', {
  user_id: user.id,
  token: refreshToken,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
});

// 7. Встановити refresh_token в httpOnly cookie
response.setCookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60, // 30 днів
  path: '/',
});

// 8. Редірект на фронтенд
const frontendUrl = 'https://your-frontend-domain.com/#/auth/callback/apple';
// Або якщо фронтенд на тому ж домені:
// const frontendUrl = 'https://xu6p-ejbd-2ew4.n7e.xano.io/#/auth/callback/apple';

response.redirect(frontendUrl);
```

**Примітка**: Це спрощений варіант. Для production також потрібно:
- Обміняти `code` на Apple токени через Apple Token API
- Валідувати `id_token` через Apple public keys
- Генерувати Client Secret (JWT) для обміну code

---

## 🔧 Крок 3: Налаштування Apple Developer Console

### Статус: ⚠️ ПЕРЕВІРИТИ

### Що перевірити:

1. **Service ID**:
   - [ ] Створено: `com.anatomous.healthyapp.web`
   - [ ] Увімкнено "Sign in with Apple"
   - [ ] Налаштовано Return URLs:
     ```
     https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
     ```

2. **Key для Sign in with Apple**:
   - [ ] Створено ключ з "Sign in with Apple" capability
   - [ ] Завантажено .p8 файл (збережено безпечно)
   - [ ] Записано Key ID

3. **Team ID**:
   - [ ] Записано Team ID з Membership

---

## 🔧 Крок 4: Environment Variables в Xano (опціонально)

### Статус: ⚠️ РЕКОМЕНДОВАНО

### Що створити:

У Xano Variables (Environment Variables):

- `APPLE_CLIENT_ID` = `com.anatomous.healthyapp.web`
- `APPLE_REDIRECT_URI` = `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`
- `APPLE_TEAM_ID` = ваш Team ID
- `APPLE_KEY_ID` = ваш Key ID
- `APPLE_PRIVATE_KEY` = вміст .p8 файлу

Потім у коді використовувати:
```javascript
const clientId = variables.APPLE_CLIENT_ID;
const redirectUri = variables.APPLE_REDIRECT_URI;
```

---

## 📋 Повний чеклист для запуску

### Фронтенд (готово ✅):
- [x] Кнопка Apple в Login.jsx
- [x] Обробка кліку
- [x] Виклик бекенду
- [x] Callback компонент
- [x] Роут для callback
- [x] Інтеграція з AuthContext

### Бекенд (потрібно зробити ❌):
- [ ] Ендпоінт `GET /auth/apple` - генерує URL
- [ ] Ендпоінт `POST /auth/callback/apple` - обробляє callback
- [ ] Логіка обробки `id_token`
- [ ] Логіка обробки `user` JSON
- [ ] Логіка створення/оновлення користувача
- [ ] Логіка генерації JWT токенів
- [ ] Логіка встановлення cookie
- [ ] Логіка редіректу на фронтенд

### Apple Developer Console (перевірити ⚠️):
- [ ] Service ID налаштовано
- [ ] Return URLs налаштовано
- [ ] Key створено
- [ ] Team ID та Key ID записані

### Тестування:
- [ ] `GET /auth/apple` повертає URL
- [ ] Кнопка відкриває Apple authorization page
- [ ] Після авторизації редірект на `/auth/callback/apple`
- [ ] Користувач створюється/оновлюється в базі
- [ ] Токени встановлюються
- [ ] Редірект на фронтенд працює
- [ ] Фронтенд отримує токени
- [ ] Користувач залогінений

---

## 🎯 Пріоритетність

### 🔴 КРИТИЧНО (без цього не працює):
1. **Створити `GET /auth/apple`** - без цього кнопка не працює (404)
2. **Створити `POST /auth/callback/apple`** - без цього callback не обробляється

### 🟡 ВАЖЛИВО (для production):
3. Налаштувати Apple Developer Console
4. Реалізувати обмін `code` на токени
5. Валідація `id_token`

### 🟢 ОПЦІОНАЛЬНО (для кращої безпеки):
6. Environment Variables
7. State validation
8. Rate limiting

---

## 🚀 Швидкий старт (мінімальний варіант)

Для того, щоб кнопка працювала **зараз**:

1. **Створіть `GET /auth/apple`** на Xano (5 хвилин)
2. Протестуйте - кнопка має відкрити Apple authorization page
3. Після цього створіть `POST /auth/callback/apple` для обробки callback

---

## 📝 Примітки

- **Фронтенд готовий на 100%** - всі компоненти створені та налаштовані
- **Проблема тільки в бекенді** - ендпоінти не створені
- **Після створення ендпоінтів** все має працювати автоматично

---

## 🆘 Якщо щось не працює

1. Перевірте, що ендпоінт створений в правильному API Group (`HBbbpjK5`)
2. Перевірте, що метод правильний (`GET` для `/auth/apple`, `POST` для callback)
3. Перевірте формат відповіді: `{ url: "..." }`
4. Перевірте CORS налаштування в Xano
5. Перевірте логи в консолі браузера (F12)

