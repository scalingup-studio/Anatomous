# Apple Sign-In Integration Guide

## Дані, які потрібні для налаштування Apple Sign-In

### ✅ Вже надано:
- **Client ID (Service ID)**: `com.anatomous.healthyapp.web`
- **Redirect URI**: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`

### 📋 Додаткові дані, які потрібні для бекенду (Xano):

1. **Apple Team ID**
   - Знаходиться в Apple Developer Account → Membership
   - Формат: `ABC123DEF4` (10 символів)

2. **Key ID**
   - Створюється в Apple Developer → Certificates, Identifiers & Profiles → Keys
   - Потрібно створити новий ключ з "Sign in with Apple" capability
   - Формат: `XYZ123ABC4` (10 символів)

3. **Private Key (.p8 файл)**
   - Завантажується після створення ключа в Apple Developer
   - ⚠️ **ВАЖЛИВО**: Завантажується тільки один раз! Збережіть безпечно.
   - Використовується для створення JWT Client Secret

4. **Apple Developer Account**
   - Активний Apple Developer Program membership ($99/рік)

---

## Налаштування в Apple Developer Console

### Крок 1: Створити Service ID (якщо ще не створено)
1. Перейти в [Apple Developer Console](https://developer.apple.com/account/)
2. Certificates, Identifiers & Profiles → Identifiers
3. Створити новий Identifier типу "Services IDs"
4. Identifier: `com.anatomous.healthyapp.web`
5. Увімкнути "Sign in with Apple"
6. Налаштувати Domains and Subdomains:
   - Primary App ID: `com.anatomous.healthyapp` (або ваш Bundle ID)
   - Return URLs: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`

### Крок 2: Створити Key для Sign in with Apple
1. Certificates, Identifiers & Profiles → Keys
2. Натиснути "+" для створення нового ключа
3. Назва: "Anatomous Apple Sign-In Key"
4. Увімкнути "Sign in with Apple"
5. Продовжити → Register
6. **Завантажити .p8 файл** (тільки один раз!)
7. Записати **Key ID**

### Крок 3: Отримати Team ID
1. Membership → Team ID (10 символів)

---

## Налаштування на бекенді (Xano)

### Ендпоінт 1: `/auth/apple` (GET)
**Призначення**: Генерує URL для авторизації через Apple

**Відповідь**:
```json
{
  "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=RANDOM_SECURE_STRING"
}
```

**Параметри URL** (ВАЖЛИВО: точний формат):
- `client_id`: `com.anatomous.healthyapp.web`
- `redirect_uri`: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`
- `response_type`: `code id_token` (URL encoded як `code%20id_token`)
- `scope`: `name email` (ВАЖЛИВО: порядок `name email`, не `email name`)
- `response_mode`: `form_post` (обов'язково для web)
- `state`: випадковий безпечний рядок (рекомендовано для безпеки)

**Приклад правильно сформованого URL**:
```
https://appleid.apple.com/auth/authorize?
client_id=com.anatomous.healthyapp.web
&redirect_uri=https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
&response_type=code%20id_token
&scope=name%20email
&response_mode=form_post
&state=RANDOM_SECURE_STRING
```

### Ендпоінт 2: `/auth/callback/apple` (POST)
**Призначення**: Обробляє callback від Apple після авторизації

**Вхідні дані від Apple** (через POST form-data):
- `code`: Authorization code
- `id_token`: JWT токен з даними користувача
- `user`: JSON з ім'ям (тільки при першому вході)
  ```json
  {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
  ```
- `state`: (опціонально)

**Що має робити бекенд**:

1. **Валідація `id_token`**:
   - Перевірити підпис через Apple public keys
   - Перевірити `iss` (має бути `https://appleid.apple.com`)
   - Перевірити `aud` (має бути `com.anatomous.healthyapp.web`)
   - Перевірити `exp` (не прострочений)

2. **Обмін `code` на токени** (Production):
   - Викликати `https://appleid.apple.com/auth/token`
   - POST з параметрами:
     - `client_id`: `com.anatomous.healthyapp.web`
     - `client_secret`: JWT, створений з вашим private key
     - `code`: отриманий code
     - `grant_type`: `authorization_code`
     - `redirect_uri`: той самий redirect_uri

3. **Створення/оновлення користувача**:
   - Витягти `email` з `id_token` (поле `email`)
   - Витягти `sub` (Apple User ID) з `id_token`
   - Перевірити, чи існує користувач з таким `email` або `apple_id`
   - Якщо ні → створити нового користувача
   - Якщо так → оновити `last_active_at`
   - Якщо є `user.name` → зберегти `firstName` та `lastName`

4. **Генерація власних токенів**:
   - Створити JWT `access_token` для вашого API
   - Створити `refresh_token`
   - Встановити `refresh_token` в httpOnly cookie

5. **Редірект на фронтенд**:
   ```
   Location: https://your-frontend-domain.com/#/auth/callback/apple
   ```
   Або якщо використовуєте той самий домен:
   ```
   Location: https://xu6p-ejbd-2ew4.n7e.xano.io/#/auth/callback/apple
   ```

---

## Створення Client Secret (JWT) для обміну code на токени

**Формула JWT Client Secret**:
```
Header: {
  "alg": "ES256",
  "kid": "YOUR_KEY_ID"
}

Payload: {
  "iss": "YOUR_TEAM_ID",
  "iat": current_timestamp,
  "exp": current_timestamp + 3600,
  "aud": "https://appleid.apple.com",
  "sub": "com.anatomous.healthyapp.web"
}

Signature: ES256 signature using your private key (.p8)
```

**Приклад реалізації** (Node.js):
```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

function generateAppleClientSecret() {
  const teamId = 'YOUR_TEAM_ID';
  const keyId = 'YOUR_KEY_ID';
  const clientId = 'com.anatomous.healthyapp.web';
  const privateKey = fs.readFileSync('path/to/AuthKey_XYZ123ABC4.p8');

  const token = jwt.sign(
    {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 година
      aud: 'https://appleid.apple.com',
      sub: clientId
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId
      }
    }
  );

  return token;
}
```

---

## Тестування

### 1. Перевірка URL генерації
```bash
curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
# Має повернути: { "url": "https://appleid.apple.com/auth/authorize?..." }
```

### 2. Тестовий вхід
1. Відкрити URL з `/auth/apple`
2. Увійти через Apple ID
3. Перевірити, що редірект на `/auth/callback/apple` працює
4. Перевірити, що користувач створюється/оновлюється в базі
5. Перевірити, що `refresh_token` cookie встановлюється
6. Перевірити, що редірект на фронтенд працює

---

## Важливі примітки

1. **Email від Apple**:
   - При першому вході Apple може надати реальний email
   - При наступних входах може надати "private relay email" (якщо користувач увімкнув Hide My Email)
   - Зберігайте `sub` (Apple User ID) як унікальний ідентифікатор

2. **User name**:
   - `user.name` приходить **тільки при першому вході**
   - При наступних входах Apple не надсилає ім'я
   - Зберігайте ім'я в базі при першому вході

3. **CORS**:
   - Переконайтеся, що CORS налаштований для вашого фронтенд домену
   - Cookies мають мати `SameSite=None; Secure`

4. **Production vs Development**:
   - Для Production потрібен реальний Apple Developer Account
   - Для Development можна використовувати тестовий Apple ID

---

## Чеклист для запуску

- [ ] Створено Service ID в Apple Developer Console
- [ ] Налаштовано Return URLs
- [ ] Створено Key для Sign in with Apple
- [ ] Завантажено та збережено .p8 файл
- [ ] Записано Team ID та Key ID
- [ ] Налаштовано ендпоінт `/auth/apple` на Xano
- [ ] Налаштовано ендпоінт `/auth/callback/apple` на Xano
- [ ] Реалізовано генерацію Client Secret (JWT)
- [ ] Реалізовано обмін code на токени
- [ ] Реалізовано створення/оновлення користувача
- [ ] Реалізовано встановлення refresh_token cookie
- [ ] Реалізовано редірект на фронтенд
- [ ] Протестовано повний flow

---

## Підтримка

Якщо виникнуть проблеми:
1. Перевірте логи на Xano
2. Перевірте налаштування в Apple Developer Console
3. Перевірте, що всі URL точно співпадають
4. Перевірте валідацію `id_token`
5. Перевірте CORS налаштування

