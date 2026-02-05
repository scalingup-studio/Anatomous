# 🔍 Інструкція: Де перевірити дані користувача

## 📍 Місця, де можна перевірити дані

### 1. **Відповідь від API (найважливіше)**

**URL ендпоінту:**
```
POST https://xu6p-ejbd-2ew4.n7e.xano.io/api:HBbbpjK5/auth/refresh
```

**Де перевірити:**
- Відкрийте **DevTools браузера** (F12)
- Перейдіть на вкладку **Network**
- Відфільтруйте за `refresh`
- Після OAuth callback знайдіть запит до `/auth/refresh`
- Відкрийте вкладку **Response** - там буде сира відповідь від API

**Що шукати в відповіді:**
```json
{
  "authToken": "...",
  "user": {
    "id": "...",
    "email": "whbybs7vd2@privaterelay.appl...",  // ← ТУТ email
    "first_name": "...",
    "last_name": "...",
    // ... інші поля
  }
}
```

### 2. **Console.log в коді (додано для дебагу)**

Я додав `console.log` в наступних місцях:

#### a) `src/pages/OAuthCallbackGoogle.jsx` (рядки 32-75)
Після отримання даних від API:
```javascript
console.log('🔍 [DEBUG] refreshResult від API:', {
  hasToken: !!refreshResult.authToken,
  hasUser: !!refreshResult.user,
  userEmail: refreshResult.user?.email,
  userFullData: refreshResult.user,
});
```

#### b) `src/api/tokenManager.js` (рядки 208-223)
Сиру відповідь від API:
```javascript
console.log('🔍 [DEBUG] Сира відповідь від API /auth/refresh:', {
  hasAuthToken: !!data.authToken,
  hasUser: !!data.user,
  userEmail: data.user?.email,
  userKeys: data.user ? Object.keys(data.user) : [],
  responseKeys: Object.keys(data),
});
```

#### c) `src/routes/DashboardLayout.jsx` (рядки 441-453)
Дані, які використовуються для відображення:
```javascript
console.log('🔍 [DEBUG] Email для відображення в меню:', {
  fromUser: user?.email,
  fromProfileData: profileData?.email,
  finalEmail: emailToShow,
  userObject: user ? { id: user.id, email: user.email, keys: Object.keys(user) } : null,
  profileDataObject: profileData ? { id: profileData.id, email: profileData.email, keys: Object.keys(profileData) } : null,
});
```

### 3. **localStorage в браузері**

**Як перевірити:**
1. Відкрийте **DevTools** (F12)
2. Перейдіть на вкладку **Application** (або **Storage**)
3. Розгорніть **Local Storage**
4. Виберіть ваш домен
5. Знайдіть ключ `user` - там зберігається об'єкт користувача

**Що шукати:**
```json
{
  "id": "...",
  "email": "whbybs7vd2@privaterelay.appl...",
  "first_name": "...",
  // ... інші поля
}
```

### 4. **React DevTools**

Якщо встановлено React DevTools:
1. Відкрийте **React DevTools**
2. Знайдіть компонент `AuthProvider`
3. Перевірте state `user` - там має бути об'єкт користувача з email

### 5. **Перевірка в Network tab (детальна)**

**Повний шлях даних:**

1. **OAuth Callback** → викликає `tokenManager.refreshToken()`
2. **tokenManager** → робить POST запит до `/auth/refresh`
3. **API повертає** → `{ authToken, user: { email, ... } }`
4. **tokenManager** → повертає `{ authToken, user }`
5. **OAuthCallbackGoogle** → встановлює `setUser(refreshResult.user)`
6. **AuthContext** → зберігає в state та localStorage
7. **DashboardLayout** → читає `user` з `useAuth()` та відображає `user?.email`

## 🎯 Що перевірити

### Чи email приходить від API?
✅ Перевірте **Network tab** → запит `/auth/refresh` → Response → поле `user.email`

### Чи email зберігається правильно?
✅ Перевірте **Console** → шукайте `🔍 [DEBUG]` логи
✅ Перевірте **localStorage** → ключ `user` → поле `email`

### Чи email відображається правильно?
✅ Перевірте **Console** → шукайте `🔍 [DEBUG] Email для відображення в меню`
✅ Перевірте, чи `user?.email` не `undefined`

## 🔧 Якщо email не відображається

1. **Перевірте Network tab** - чи API повертає email?
2. **Перевірте Console** - чи є помилки?
3. **Перевірте localStorage** - чи зберігся user з email?
4. **Перевірте React DevTools** - чи є user в AuthContext?

## 📝 Примітки

- Email `whbybs7vd2@privaterelay.appl...` - це **реальний email** від Apple Private Relay
- Це **НЕ дефолтне значення**, а дані з бекенду
- Якщо email не відображається, проблема може бути:
  - API не повертає email
  - Email не зберігається в localStorage
  - Помилка в коді відображення

## 🗑️ Видалення debug логів

Після перевірки можна видалити всі `console.log` з `🔍 [DEBUG]` або закоментувати їх для майбутнього використання.

