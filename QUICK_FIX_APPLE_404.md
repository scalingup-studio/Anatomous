# ⚡ Швидке виправлення: 404 на /auth/apple

## ❌ Проблема

```
GET https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
Status: 404 Not Found
Error: Unable to locate request
```

## ✅ Рішення: Створити ендпоінт на Xano (5 хвилин)

### Крок 1: Відкрити Xano
1. Увійдіть в [Xano Dashboard](https://xano.com)
2. Відкрийте ваш проект
3. Знайдіть API Group: `HBbbpjK5` (Auth API)

### Крок 2: Створити ендпоінт
1. Натисніть **"+ Add Endpoint"** або **"Create"**
2. Налаштуйте:
   - **Method**: `GET`
   - **Path**: `/auth/apple`
   - **Name**: `Get Apple Auth URL`

### Крок 3: Додати код (скопіюйте весь блок)

У розділі **Function** або **Logic** вставте цей код:

```javascript
// Параметри Apple Sign-In
const clientId = 'com.anatomous.healthyapp.web';
const redirectUri = 'https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/callback/apple';

// Генерація випадкового state (для безпеки)
function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const state = generateRandomState();

// Формування URL для Apple
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

// Повернути результат
return {
  url: appleAuthUrl
};
```

### Крок 4: Зберегти
1. Натисніть **"Save"** або **"Deploy"**
2. Дочекайтеся, поки ендпоінт активується

### Крок 5: Протестувати
Відкрийте в браузері або через curl:
```bash
curl https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple
```

**Очікуваний результат**:
```json
{
  "url": "https://appleid.apple.com/auth/authorize?client_id=com.anatomous.healthyapp.web&redirect_uri=..."
}
```

---

## ✅ Після створення ендпоінту

1. Оновіть сторінку з логіном
2. Натисніть "Log in with Apple"
3. Має відкритися Apple authorization page ✅

---

## 🐛 Якщо все ще не працює

### Перевірка 1: Ендпоінт створений?
- Перевірте в Xano, що ендпоінт `/auth/apple` існує
- Метод має бути `GET`

### Перевірка 2: Правильний API Group?
- Переконайтеся, що ендпоінт створений в API Group `HBbbpjK5`
- URL має бути: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/apple`

### Перевірка 3: Формат відповіді?
- Ендпоінт має повертати: `{ url: "..." }`
- Не `{ data: { url: "..." } }` або інший формат

### Перевірка 4: CORS?
- Якщо CORS помилка → налаштуйте CORS в Xano для вашого домену

---

## 📝 Примітки

- **State**: Генерується випадковий рядок для безпеки (захист від CSRF)
- **Scope**: Порядок `name email` (не `email name`)
- **Response mode**: `form_post` (Apple надсилає POST, не GET)

---

## 🎯 Наступний крок

Після створення `/auth/apple`, потрібно буде створити:
- `POST /auth/callback/apple` - для обробки callback від Apple

Але спочатку переконайтеся, що `/auth/apple` працює! ✅

