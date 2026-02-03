# Apple Sign-In URL Format

## ✅ Правильний формат URL для Apple Authorization

При натисканні кнопки "Sign in with Apple" має відкриватися саме цей URL:

```
https://appleid.apple.com/auth/authorize?
client_id=com.anatomous.healthyapp.web
&redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
&response_type=code%20id_token
&scope=name%20email
&response_mode=form_post
&state=RANDOM_SECURE_STRING
```

## 📋 Деталі параметрів

### 1. `client_id`
- **Значення**: `com.anatomous.healthyapp.web`
- **Тип**: Service ID з Apple Developer Console
- **URL encoding**: Так (але в цьому випадку не потрібно, бо немає спецсимволів)

### 2. `redirect_uri`
- **Значення**: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`
- **Тип**: Повний URL вашого callback ендпоінту
- **URL encoding**: Так (обов'язково через `encodeURIComponent()`)
- **ВАЖЛИВО**: Має точно співпадати з налаштуваннями в Apple Developer Console

### 3. `response_type`
- **Значення**: `code id_token`
- **URL encoded**: `code%20id_token`
- **Опис**: Отримуємо і authorization code, і id_token одночасно

### 4. `scope`
- **Значення**: `name email`
- **URL encoded**: `name%20email`
- **ВАЖЛИВО**: Порядок має бути саме `name email` (не `email name`)
- **Опис**: Запитуємо доступ до email та імені користувача

### 5. `response_mode`
- **Значення**: `form_post`
- **URL encoding**: Не потрібно
- **Опис**: Apple надсилає дані через POST form-data (не GET query)

### 6. `state`
- **Значення**: `RANDOM_SECURE_STRING`
- **URL encoding**: Так (через `encodeURIComponent()`)
- **Опис**: Випадковий рядок для захисту від CSRF атак
- **Рекомендована довжина**: 32+ символів
- **Приклад генерації**: `crypto.randomBytes(32).toString('hex')`

## 🔧 Приклад реалізації на Xano

### JavaScript код для формування URL:

```javascript
// 1. Отримати параметри
const clientId = 'com.anatomous.healthyapp.web';
const redirectUri = 'https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple';

// 2. Згенерувати state (випадковий безпечний рядок)
function generateRandomState() {
  // Приклад: використовуйте crypto або інший генератор
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const state = generateRandomState();

// 3. Сформувати URL з правильним порядком параметрів
const baseUrl = 'https://appleid.apple.com/auth/authorize';
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code id_token', // з пробілом
  scope: 'name email', // ВАЖЛИВО: порядок name email
  response_mode: 'form_post',
  state: state
});

const appleAuthUrl = `${baseUrl}?${params.toString()}`;

// 4. Повернути результат
return {
  url: appleAuthUrl
};
```

### Альтернативний спосіб (ручне формування):

```javascript
const clientId = 'com.anatomous.healthyapp.web';
const redirectUri = 'https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple';
const state = generateRandomState();

const appleAuthUrl = 
  'https://appleid.apple.com/auth/authorize?' +
  'client_id=' + encodeURIComponent(clientId) + '&' +
  'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
  'response_type=' + encodeURIComponent('code id_token') + '&' +
  'scope=' + encodeURIComponent('name email') + '&' +
  'response_mode=form_post&' +
  'state=' + encodeURIComponent(state);

return {
  url: appleAuthUrl
};
```

## ✅ Перевірка правильності URL

### 1. Відкрийте консоль браузера (F12)
### 2. Натисніть "Log in with Apple"
### 3. Перевірте лог:
```
🍎 Starting Apple login...
🍎 Redirecting to Apple: https://appleid.apple.com/auth/authorize?...
```

### 4. Перевірте URL в Network tab:
- Відкриється саме `https://appleid.apple.com/auth/authorize`
- Всі параметри присутні
- `scope=name%20email` (не `email%20name`)
- `response_mode=form_post`

## ⚠️ Типові помилки

### ❌ Помилка 1: Неправильний порядок scope
```
scope=email%20name  // ❌ НЕПРАВИЛЬНО
scope=name%20email  // ✅ ПРАВИЛЬНО
```

### ❌ Помилка 2: Відсутній response_mode
```
// ❌ Без response_mode (Apple використає query за замовчуванням)
https://appleid.apple.com/auth/authorize?client_id=...&response_type=...

// ✅ З response_mode=form_post
https://appleid.apple.com/auth/authorize?client_id=...&response_mode=form_post
```

### ❌ Помилка 3: Неправильний redirect_uri
```
// ❌ Не співпадає з Apple Developer Console
redirect_uri=https://wrong-url.com/callback

// ✅ Точне співпадіння
redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
```

### ❌ Помилка 4: Відсутній state
```
// ❌ Без state (небезпечно)
https://appleid.apple.com/auth/authorize?client_id=...&...

// ✅ З state (рекомендовано)
https://appleid.apple.com/auth/authorize?client_id=...&state=RANDOM_STRING
```

## 🎯 Результат

Після правильного формування URL:
1. Користувач натискає "Log in with Apple"
2. Відкривається саме цей URL
3. Apple показує форму авторизації
4. Після авторизації Apple надсилає POST на `redirect_uri`

