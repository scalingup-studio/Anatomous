# Apple Callback Format для `/auth/callback/apple`

## 📋 Формат запиту

### Ендпоінт
```
POST https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple
```

### Content-Type
```
application/json
```

### Тіло запиту (JSON)

```json
{
  "code": "AUTHORIZATION_CODE_FROM_APPLE",
  "id_token": "JWT_TOKEN_FROM_APPLE",
  "user": "{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
}
```

## 📝 Опис полів

### `code` (string, обов'язкове)
- Authorization code від Apple
- Використовується для обміну на access_token через Apple Token API
- Приклад: `"c1234567890abcdef"`

### `id_token` (string, обов'язкове)
- JWT токен від Apple
- Містить дані користувача (email, sub, exp, тощо)
- Потрібно валідувати через Apple public keys
- Приклад: `"eyJraWQiOiJlWGF1bm1...`

### `user` (string | null, опціональне)
- JSON string з ім'ям користувача
- **Приходить тільки при першому вході**
- При наступних входах може бути `null` або відсутнє
- Формат: `"{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"`

**Приклад повного об'єкта user**:
```json
{
  "name": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## 🔄 Конвертація з form-data в JSON

Apple надсилає дані через **POST form-data**, але бекенд очікує **JSON в тілі**.

### Якщо Xano автоматично конвертує:
Xano може автоматично конвертувати form-data в JSON. У такому випадку просто використовуйте:
```javascript
const code = request.body.code;
const idToken = request.body.id_token;
const userJson = request.body.user;
```

### Якщо потрібно конвертувати вручну:
```javascript
// Отримати form-data
const formData = await request.formData();

// Конвертувати в JSON об'єкт
const body = {
  code: formData.get('code'),
  id_token: formData.get('id_token'),
  user: formData.get('user') || null
};

// Використовувати body
const code = body.code;
const idToken = body.id_token;
const userJson = body.user;
```

## 📋 Приклади

### Приклад 1: Перший вхід (з user)
```json
{
  "code": "c1234567890abcdef",
  "id_token": "eyJraWQiOiJlWGF1bm1...",
  "user": "{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
}
```

### Приклад 2: Наступний вхід (без user)
```json
{
  "code": "c9876543210fedcba",
  "id_token": "eyJraWQiOiJlWGF1bm1...",
  "user": null
}
```

### Приклад 3: Без user поля
```json
{
  "code": "c9876543210fedcba",
  "id_token": "eyJraWQiOiJlWGF1bm1..."
}
```

## 🔧 Обробка на бекенді (Xano)

### Крок 1: Отримати дані
```javascript
const code = request.body.code;
const idToken = request.body.id_token;
const userJson = request.body.user; // може бути null
```

### Крок 2: Декодувати user (якщо є)
```javascript
let firstName = null;
let lastName = null;

if (userJson) {
  try {
    const userData = JSON.parse(userJson);
    firstName = userData.name?.firstName || null;
    lastName = userData.name?.lastName || null;
  } catch (e) {
    console.error('Failed to parse user JSON:', e);
  }
}
```

### Крок 3: Декодувати id_token
```javascript
// Розділити JWT на частини
const parts = idToken.split('.');
const payload = JSON.parse(base64Decode(parts[1]));

// Отримати дані
const appleUserId = payload.sub; // Apple User ID
const email = payload.email; // Email користувача
const emailVerified = payload.email_verified === 'true';
```

## ⚠️ Важливі примітки

1. **user приходить тільки при першому вході** - зберігайте ім'я в базі при першому вході
2. **id_token потрібно валідувати** - перевірте підпис через Apple public keys
3. **code потрібно обміняти на токени** - використовуйте Apple Token API
4. **user - це JSON string**, не об'єкт - потрібно парсити через `JSON.parse()`

## 🧪 Тестування

### Через curl:
```bash
curl -X POST https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_code",
    "id_token": "test_token",
    "user": "{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
  }'
```

### Через Postman:
1. Method: `POST`
2. URL: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "code": "test_code",
  "id_token": "test_token",
  "user": "{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
}
```

