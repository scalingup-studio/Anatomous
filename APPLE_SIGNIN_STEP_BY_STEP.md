# Apple Sign-In: Покрокова інструкція налаштування

## 📋 Передумови

- ✅ Apple Developer Account (активний)
- ✅ Service ID: `com.anatomous.healthyapp.web`
- ✅ Key для Sign in with Apple (з .p8 файлом)
- ✅ Team ID та Key ID
- ✅ Доступ до Xano backend

---

## 🔧 Крок 1: Налаштування Apple Developer Console

### 1.1 Перевірка Service ID

1. Перейдіть в [Apple Developer Console](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Знайдіть або створіть Service ID: `com.anatomous.healthyapp.web`
4. Перевірте, що увімкнено **"Sign in with Apple"**
5. Натисніть **"Configure"** біля "Sign in with Apple"
6. Перевірте **Return URLs**:
   ```
   https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
   ```
7. **Primary App ID**: вкажіть ваш Bundle ID (наприклад, `com.anatomous.healthyapp`)
8. Збережіть зміни

### 1.2 Перевірка Key

1. **Certificates, Identifiers & Profiles** → **Keys**
2. Знайдіть ключ для Sign in with Apple
3. Запишіть **Key ID** (10 символів)
4. Переконайтеся, що у вас є **.p8 файл** (завантажений при створенні)

### 1.3 Отримання Team ID

1. **Membership** → знайдіть **Team ID** (10 символів)
2. Запишіть його

---

## 🔧 Крок 2: Налаштування Xano - Ендпоінт `/auth/apple`

### 2.1 Створення ендпоінту

1. У Xano перейдіть до API Group: `HBbbpjK5`
2. Створіть новий ендпоінт: **GET** `/auth/apple`
3. Налаштуйте логіку:

### 2.2 Логіка ендпоінту `/auth/apple`

**Мета**: Генерувати URL для авторизації через Apple

**Параметри** (зберігаються в Xano Environment Variables):
- `APPLE_CLIENT_ID`: `com.anatomous.healthyapp.web`
- `APPLE_REDIRECT_URI`: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`
- `APPLE_TEAM_ID`: ваш Team ID
- `APPLE_KEY_ID`: ваш Key ID
- `APPLE_PRIVATE_KEY`: вміст .p8 файлу (без заголовків, тільки ключ)

**Псевдокод логіки**:
```javascript
// 1. Отримати параметри з environment variables
const clientId = process.env.APPLE_CLIENT_ID; // com.anatomous.healthyapp.web
const redirectUri = process.env.APPLE_REDIRECT_URI; // https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple

// 2. Згенерувати випадковий state для безпеки
const state = generateRandomSecureString(); // наприклад, 32-символьний рядок

// 3. Сформувати URL для Apple (ВАЖЛИВО: порядок параметрів та URL encoding)
const appleAuthUrl = `https://appleid.apple.com/auth/authorize?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=${encodeURIComponent('code id_token')}&` +
  `scope=${encodeURIComponent('name email')}&` +
  `response_mode=form_post&` +
  `state=${encodeURIComponent(state)}`;

// 4. Повернути URL
return {
  url: appleAuthUrl
};
```

**Приклад результату**:
```
https://appleid.apple.com/auth/authorize?
client_id=com.anatomous.healthyapp.web
&redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
&response_type=code%20id_token
&scope=name%20email
&response_mode=form_post
&state=RANDOM_SECURE_STRING
```

**Xano Function**:
1. Створіть Function з назвою `generateAppleAuthUrl`
2. Додайте логіку формування URL
3. Поверніть об'єкт: `{ url: "..." }`

**Результат**:
```json
{
  "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple&response_type=code%20id_token&scope=email%20name&response_mode=form_post"
```

---

## 🔧 Крок 3: Налаштування Xano - Ендпоінт `/auth/callback/apple`

### 3.1 Створення ендпоінту

1. Створіть новий ендпоінт: **POST** `/auth/callback/apple`
2. ⚠️ **ВАЖЛИВО**: Метод має бути **POST**, бо Apple надсилає дані через `form_post`

### 3.2 Логіка ендпоінту `/auth/callback/apple`

**Вхідні дані від Apple** (через POST form-data):
- `code`: Authorization code
- `id_token`: JWT токен від Apple
- `user`: JSON string з ім'ям (тільки при першому вході)
- `state`: (опціонально)

**Покрокова логіка**:

#### Крок 3.2.1: Отримати дані від Apple
```javascript
const code = request.body.code;
const idToken = request.body.id_token;
const userJson = request.body.user; // може бути null
```

#### Крок 3.2.2: Декодувати `id_token` (JWT)
```javascript
// Розділити JWT на частини
const parts = idToken.split('.');
const payload = JSON.parse(base64Decode(parts[1]));

// Отримати дані:
const appleUserId = payload.sub; // Apple User ID (унікальний)
const email = payload.email; // Email користувача
const emailVerified = payload.email_verified === 'true';
```

#### Крок 3.2.3: Декодувати `user` JSON (якщо є)
```javascript
let firstName = null;
let lastName = null;

if (userJson) {
  const userData = JSON.parse(userJson);
  firstName = userData.name?.firstName || null;
  lastName = userData.name?.lastName || null;
}
```

#### Крок 3.2.4: Обміняти `code` на Apple токени (Production)
```javascript
// Створити Client Secret (JWT)
const clientSecret = generateAppleClientSecret(
  process.env.APPLE_TEAM_ID,
  process.env.APPLE_KEY_ID,
  process.env.APPLE_CLIENT_ID,
  process.env.APPLE_PRIVATE_KEY
);

// Обміняти code на токени
const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.APPLE_REDIRECT_URI,
  }),
});

const tokens = await tokenResponse.json();
// tokens.access_token, tokens.refresh_token
```

#### Крок 3.2.5: Перевірити/створити користувача
```javascript
// Перевірити, чи існує користувач
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
    email_verified: emailVerified,
    created_at: new Date(),
    last_active_at: new Date(),
  });
} else {
  // Оновити існуючого користувача
  await db.update('users', user.id, {
    last_active_at: new Date(),
    // Оновити ім'я, якщо воно було надано
    ...(firstName && { first_name: firstName }),
    ...(lastName && { last_name: lastName }),
  });
}
```

#### Крок 3.2.6: Генерувати власні JWT токени
```javascript
// Генерувати access_token та refresh_token
const accessToken = generateJWT({
  user_id: user.id,
  email: user.email,
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 година
});

const refreshToken = generateRandomToken(); // зберігається в базі

// Зберегти refresh_token в базі
await db.insert('refresh_tokens', {
  user_id: user.id,
  token: refreshToken,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
});
```

#### Крок 3.2.7: Встановити cookie та зробити редірект
```javascript
// Встановити refresh_token в httpOnly cookie
response.setCookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60, // 30 днів
  path: '/',
});

// Редірект на фронтенд
const frontendUrl = 'https://your-frontend-domain.com/#/auth/callback/apple';
// Або якщо фронтенд на тому ж домені:
// const frontendUrl = 'https://xu6p-ejbd-2ew4.n7e.xano.io/#/auth/callback/apple';

response.redirect(frontendUrl);
```

---

## 🔧 Крок 4: Функція генерації Client Secret (JWT)

### 4.1 Створення функції в Xano

Створіть Function: `generateAppleClientSecret`

**Параметри**:
- `teamId`: Team ID
- `keyId`: Key ID
- `clientId`: Client ID
- `privateKey`: Private Key (.p8)

**Логіка** (псевдокод):
```javascript
const jwt = require('jsonwebtoken');

function generateAppleClientSecret(teamId, keyId, clientId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  
  const token = jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: now + 3600, // 1 година
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    }
  );
  
  return token;
}
```

**Примітка**: Xano може не мати вбудованої підтримки ES256. Можливо, знадобиться використати зовнішній сервіс або написати власну реалізацію.

---

## 🔧 Крок 5: Тестування

### 5.1 Тест ендпоінту `/auth/apple`

```bash
curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
```

**Очікуваний результат**:
```json
{
  "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&redirect_uri=..."
}
```

### 5.2 Тест повного flow

1. Відкрийте фронтенд
2. Натисніть "Log in with Apple"
3. Перевірте консоль браузера:
   - Має з'явитися: `🍎 Starting Apple login...`
   - Потім: `🍎 Redirecting to Apple: ...`
4. Увійдіть через Apple ID
5. Перевірте, що редірект на `/auth/callback/apple` працює
6. Перевірте, що користувач створюється/оновлюється в базі
7. Перевірте, що редірект на фронтенд працює

---

## 🔧 Крок 6: Налаштування CORS

### 6.1 У Xano

1. Перейдіть до налаштувань API Group
2. Додайте ваш фронтенд домен до **Allowed Origins**
3. Увімкніть **Credentials** (для cookies)
4. Дозвольте методи: `GET`, `POST`

---

## 🔧 Крок 7: Налаштування редіректу на фронтенд

### 7.1 Визначити URL фронтенду

Якщо фронтенд на тому ж домені, що й Xano:
```javascript
const frontendUrl = 'https://xu6p-ejbd-2ew4.n7e.xano.io/#/auth/callback/apple';
```

Якщо фронтенд на іншому домені:
```javascript
const frontendUrl = 'https://your-frontend-domain.com/#/auth/callback/apple';
```

### 7.2 Оновити редірект в `/auth/callback/apple`

Замініть `frontendUrl` на правильний URL вашого фронтенду.

---

## ✅ Чеклист перевірки

- [ ] Service ID налаштовано в Apple Developer Console
- [ ] Return URL додано в Apple Developer Console
- [ ] Key створено та .p8 файл збережено
- [ ] Team ID та Key ID записані
- [ ] Environment Variables налаштовані в Xano
- [ ] Ендпоінт `/auth/apple` створено та протестовано
- [ ] Ендпоінт `/auth/callback/apple` створено (POST)
- [ ] Функція генерації Client Secret реалізована
- [ ] Логіка обробки `id_token` реалізована
- [ ] Логіка обробки `user` JSON реалізована
- [ ] Логіка обміну `code` на токени реалізована
- [ ] Логіка створення/оновлення користувача реалізована
- [ ] Логіка генерації JWT токенів реалізована
- [ ] Логіка встановлення cookie реалізована
- [ ] Логіка редіректу на фронтенд реалізована
- [ ] CORS налаштовано
- [ ] Протестовано повний flow

---

## 🐛 Типові проблеми та рішення

### Проблема 1: "Failed to get Apple OAuth URL"
**Причина**: Ендпоінт `/auth/apple` не працює або повертає неправильний формат
**Рішення**: Перевірте логіку ендпоінту, переконайтеся, що повертається `{ url: "..." }`

### Проблема 2: CORS помилка
**Причина**: CORS не налаштовано в Xano
**Рішення**: Додайте ваш фронтенд домен до Allowed Origins

### Проблема 3: "Invalid client" від Apple
**Причина**: Неправильний `client_id` або `redirect_uri`
**Рішення**: Перевірте, що URL точно співпадає з налаштуваннями в Apple Developer Console

### Проблема 4: Cookie не встановлюється
**Причина**: Неправильні налаштування cookie або CORS
**Рішення**: Перевірте `sameSite`, `secure`, `httpOnly` параметри

### Проблема 5: "Token refresh failed" на фронтенді
**Причина**: `refresh_token` не встановлено в cookie або неправильний формат
**Рішення**: Перевірте логіку встановлення cookie в `/auth/callback/apple`

---

## 📝 Примітки

1. **`user` JSON приходить тільки при першому вході** - зберігайте ім'я при першому вході
2. **Email може бути "private relay"** - зберігайте `apple_id` (sub) як унікальний ідентифікатор
3. **Client Secret має бути згенерований правильно** - використовуйте ES256 алгоритм
4. **Редірект має бути на правильний URL** - переконайтеся, що URL фронтенду правильний

---

## 🎯 Результат

Після виконання всіх кроків:
- ✅ Користувач може натиснути "Log in with Apple"
- ✅ Відкривається Apple authorization page
- ✅ Після авторизації користувач редіректиться на бекенд
- ✅ Бекенд обробляє callback та створює/оновлює користувача
- ✅ Користувач редіректиться на фронтенд
- ✅ Фронтенд отримує токени та встановлює сесію
- ✅ Користувач залогінений та має доступ до застосунку

