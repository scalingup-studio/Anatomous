# Налаштування ендпоінту `/auth/apple` на Xano

## ❌ Проблема: 404 Not Found

Якщо при кліку на "Sign in with Apple" ви отримуєте:
```
GET https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
Status Code: 404 Not Found
```

Це означає, що ендпоінт не створений на Xano.

---

## ✅ Рішення: Створити ендпоінт на Xano

### Крок 1: Відкрити Xano

1. Увійдіть в [Xano](https://xano.com)
2. Відкрийте ваш проект
3. Перейдіть до API Group: `HBbbpjK5` (або знайдіть ваш Auth API Group)

### Крок 2: Створити новий ендпоінт

1. Натисніть **"+ Add Endpoint"** або **"Create Endpoint"**
2. Налаштуйте:
   - **Method**: `GET`
   - **Path**: `/auth/apple`
   - **Name**: `Get Apple Auth URL` (або будь-яка назва)

### Крок 3: Додати логіку (Function)

1. У розділі **"Function"** або **"Logic"** додайте нову функцію
2. Назва: `generateAppleAuthUrl`

### Крок 4: Код функції

**Варіант 1: Використовуючи Xano Variables (Environment Variables)**

Спочатку створіть Variables в Xano:
- `APPLE_CLIENT_ID` = `com.anatomous.healthyapp.web`
- `APPLE_REDIRECT_URI` = `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`

Потім у функції:

```javascript
// 1. Отримати значення з Variables
const clientId = variables.APPLE_CLIENT_ID;
const redirectUri = variables.APPLE_REDIRECT_URI;

// 2. Згенерувати випадковий state (для безпеки)
function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const state = generateRandomState();

// 3. Сформувати URL
const baseUrl = 'https://appleid.apple.com/auth/authorize';
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code id_token',
  scope: 'name email',
  response_mode: 'form_post',
  state: state
});

const appleAuthUrl = `${baseUrl}?${params.toString()}`;

// 4. Повернути результат
return {
  url: appleAuthUrl
};
```

**Варіант 2: Хардкод значень (для тестування)**

```javascript
// 1. Параметри
const clientId = 'com.anatomous.healthyapp.web';
const redirectUri = 'https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple';

// 2. Згенерувати state
function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const state = generateRandomState();

// 3. Сформувати URL
const appleAuthUrl = 
  'https://appleid.apple.com/auth/authorize?' +
  'client_id=' + encodeURIComponent(clientId) + '&' +
  'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
  'response_type=' + encodeURIComponent('code id_token') + '&' +
  'scope=' + encodeURIComponent('name email') + '&' +
  'response_mode=form_post&' +
  'state=' + encodeURIComponent(state);

// 4. Повернути результат
return {
  url: appleAuthUrl
};
```

### Крок 5: Налаштувати Response

1. У розділі **"Response"** або **"Output"**
2. Встановіть **Content-Type**: `application/json`
3. Переконайтеся, що повертається об'єкт: `{ url: "..." }`

### Крок 6: Зберегти та протестувати

1. Натисніть **"Save"** або **"Deploy"**
2. Протестуйте ендпоінт:
   ```bash
   curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
   ```
3. Очікуваний результат:
   ```json
   {
     "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&redirect_uri=..."
   }
   ```

---

## 🔍 Альтернативний спосіб: Використання Xano UI

Якщо Xano має візуальний редактор:

1. **Endpoint Settings**:
   - Method: `GET`
   - Path: `/auth/apple`

2. **Add Function** → **Custom Code**:
   - Вставте код з Варіанту 1 або 2 вище

3. **Response Format**:
   - Type: `JSON`
   - Structure: `{ url: string }`

---

## ✅ Перевірка після створення

### 1. Тест через curl:
```bash
curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
```

### 2. Тест через браузер:
Відкрийте в браузері:
```
https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
```

### 3. Тест через фронтенд:
1. Відкрийте консоль браузера (F12)
2. Натисніть "Log in with Apple"
3. Перевірте:
   - ✅ Має з'явитися: `🍎 Starting Apple login...`
   - ✅ Потім: `🍎 Redirecting to Apple: https://appleid.apple.com/auth/authorize?...`
   - ❌ Якщо помилка 404 → ендпоінт ще не створений

---

## 🐛 Типові проблеми

### Проблема 1: "Function not found"
**Рішення**: Переконайтеся, що функція `generateAppleAuthUrl` створена та підключена до ендпоінту

### Проблема 2: "Variables not found"
**Рішення**: 
- Або створіть Variables в Xano
- Або використайте Варіант 2 (хардкод значень)

### Проблема 3: "Invalid URL format"
**Рішення**: Перевірте, що всі параметри правильно URL encoded через `encodeURIComponent()`

### Проблема 4: "CORS error"
**Рішення**: Налаштуйте CORS в Xano для вашого фронтенд домену

---

## 📝 Примітки

1. **State параметр**: Рекомендовано генерувати випадковий state для кожного запиту для захисту від CSRF
2. **URL Encoding**: Всі параметри мають бути правильно закодовані
3. **Scope порядок**: Має бути саме `name email` (не `email name`)
4. **Response format**: Бекенд має повертати саме `{ url: "..." }`, інакше фронтенд не зможе отримати URL

---

## 🎯 Після створення ендпоінту

Після успішного створення ендпоінту:
1. ✅ GET `/auth/apple` повертає `{ url: "..." }`
2. ✅ Фронтенд отримує URL
3. ✅ Відкривається Apple authorization page
4. ✅ Після авторизації Apple надсилає POST на `/auth/callback/apple`

**Наступний крок**: Створити ендпоінт `POST /auth/callback/apple` для обробки callback від Apple.

