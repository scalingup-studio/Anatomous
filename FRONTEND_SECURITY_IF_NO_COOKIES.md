# 🔒 ПОКРАЩЕННЯ БЕЗПЕКИ КОЛИ БЕКЕНД НЕ ПІДТРИМУЄ COOKIES

## ⚠️ Ситуація: Бекенд приймає токени тільки через Authorization headers

Якщо ваш бекенд **не підтримує httpOnly cookies** і приймає токени тільки через `Authorization: Bearer <token>`, то **не можна** повністю видалити токени з localStorage.

**Але можна значно покращити безпеку!**

---

## ✅ ЩО МОЖНА ЗРОБИТИ БЕЗ ЗМІН НА БЕКЕНДІ

### 1. 🔐 Використовувати sessionStorage замість localStorage

**Чому краще:** sessionStorage автоматично очищається при закритті вкладки браузера.

**Що робити:**

```javascript
// src/utils/tokenStorage.js
// Створити новий файл для централізованого управління токенами

class TokenStorage {
  constructor() {
    this.storageKey = 'authToken';
    this.userKey = 'user';
  }
  
  // Використовувати sessionStorage замість localStorage
  setToken(token) {
    if (!token) {
      this.removeToken();
      return;
    }
    try {
      sessionStorage.setItem(this.storageKey, token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }
  
  getToken() {
    try {
      return sessionStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }
  
  removeToken() {
    try {
      sessionStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.userKey);
    } catch {}
  }
  
  setUser(user) {
    try {
      if (user) {
        sessionStorage.setItem(this.userKey, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(this.userKey);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }
  
  getUser() {
    try {
      const userStr = sessionStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export const tokenStorage = new TokenStorage();
```

**Оновити `src/api/AuthContext.jsx`:**

```javascript
// src/api/AuthContext.jsx
import { tokenStorage } from '../utils/tokenStorage';

// ❌ ЗАМІНИТИ всі localStorage на tokenStorage:
// localStorage.setItem('authToken', authToken);
// ✅ НА:
tokenStorage.setToken(authToken);

// localStorage.getItem('authToken');
// ✅ НА:
tokenStorage.getToken();

// localStorage.removeItem('authToken');
// ✅ НА:
tokenStorage.removeToken();
```

**Результат:** Токени автоматично видаляються при закритті браузера.

---

### 2. 🛡️ Додати обфускацію токенів

**Чому важливо:** Ускладнює витік токенів при XSS (не шифрування, але краще ніж нічого).

**Що робити:**

```javascript
// src/utils/tokenObfuscation.js

// Проста обфускація (НЕ безпечна, але ускладнює витік)
class TokenObfuscation {
  // Додати випадковий префікс та суфікс
  obfuscate(token) {
    if (!token) return null;
    try {
      // Додати випадковий префікс та суфікс
      const prefix = Math.random().toString(36).substring(7);
      const suffix = Math.random().toString(36).substring(7);
      const obfuscated = `${prefix}_${btoa(token)}_${suffix}`;
      return btoa(obfuscated);
    } catch {
      return token; // Fallback на оригінал
    }
  }
  
  deobfuscate(obfuscated) {
    if (!obfuscated) return null;
    try {
      const decoded = atob(obfuscated);
      // Видалити префікс та суфікс
      const parts = decoded.split('_');
      if (parts.length === 3) {
        return atob(parts[1]);
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const tokenObfuscation = new TokenObfuscation();
```

**Оновити `src/utils/tokenStorage.js`:**

```javascript
// src/utils/tokenStorage.js
import { tokenObfuscation } from './tokenObfuscation';

class TokenStorage {
  setToken(token) {
    if (!token) {
      this.removeToken();
      return;
    }
    try {
      // Обфускувати перед збереженням
      const obfuscated = tokenObfuscation.obfuscate(token);
      sessionStorage.setItem(this.storageKey, obfuscated);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }
  
  getToken() {
    try {
      const obfuscated = sessionStorage.getItem(this.storageKey);
      if (!obfuscated) return null;
      // Деобфускувати при отриманні
      return tokenObfuscation.deobfuscate(obfuscated);
    } catch {
      return null;
    }
  }
}
```

**⚠️ Увага:** Це НЕ шифрування, але ускладнює витік токенів при XSS.

---

### 3. 🔒 Додати перевірку на XSS перед збереженням

**Що робити:**

```javascript
// src/utils/xssProtection.js

export const checkXSS = () => {
  // Перевірка наявності підозрілих скриптів
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const src = script.src || '';
    const content = script.textContent || '';
    
    // Перевірка на підозрілі домени
    if (src && !src.startsWith(window.location.origin) && 
        !src.startsWith('https://xu6p-ejbd-2ew4.n7e.xano.io')) {
      console.warn('⚠️ Suspicious script detected:', src);
      return false;
    }
    
    // Перевірка на підозрілий контент
    if (content.includes('eval(') || content.includes('Function(')) {
      console.warn('⚠️ Suspicious script content detected');
      return false;
    }
  }
  
  return true;
};

export const initXSSProtection = () => {
  // Перевіряти при завантаженні
  if (!checkXSS()) {
    console.error('❌ Potential XSS detected - clearing tokens');
    sessionStorage.clear();
    localStorage.clear();
    return false;
  }
  
  // Перевіряти при зміні DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
          if (!checkXSS()) {
            console.error('❌ XSS detected - clearing tokens');
            sessionStorage.clear();
            localStorage.clear();
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return true;
};
```

**Додати в `src/main.jsx`:**

```javascript
// src/main.jsx
import { initXSSProtection } from './utils/xssProtection';

// Ініціалізувати захист від XSS
initXSSProtection();
```

---

### 4. 🚫 Автоматичне очищення токенів при підозрілій активності

**Що робити:**

```javascript
// src/utils/tokenProtection.js

class TokenProtection {
  constructor() {
    this.suspiciousActivity = false;
    this.init();
  }
  
  init() {
    // Відстежувати підозрілу активність
    this.trackSuspiciousActivity();
    
    // Автоматично очищати токени при підозрілій активності
    this.autoCleanup();
  }
  
  trackSuspiciousActivity() {
    // Відстежувати спроби доступу до токенів з невідомих місць
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (key === 'authToken' || key.includes('token')) {
        const stack = new Error().stack;
        // Перевірка чи виклик не з нашого коду
        if (stack && !stack.includes('tokenStorage') && !stack.includes('AuthContext')) {
          console.warn('⚠️ Suspicious token access detected');
          // Можна очистити токени
        }
      }
      return originalGetItem.call(this, key);
    };
  }
  
  autoCleanup() {
    // Очищати токени при виявленні підозрілої активності
    window.addEventListener('beforeunload', () => {
      // Можна додати перевірки
    });
    
    // Очищати токени при зміні URL (можлива XSS атака)
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        // Перевірити чи URL не містить підозрілих параметрів
        if (window.location.href.includes('<script') || 
            window.location.href.includes('javascript:')) {
          console.error('❌ XSS attempt detected - clearing tokens');
          sessionStorage.clear();
          localStorage.clear();
        }
        lastUrl = window.location.href;
      }
    }, 1000);
  }
}

export const tokenProtection = new TokenProtection();
```

---

### 5. 🔐 Обмежити час життя токенів на клієнті

**Що робити:**

```javascript
// src/utils/tokenStorage.js

class TokenStorage {
  constructor() {
    this.storageKey = 'authToken';
    this.expiryKey = 'authTokenExpiry';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 години
  }
  
  setToken(token, expiresIn = null) {
    if (!token) {
      this.removeToken();
      return;
    }
    try {
      sessionStorage.setItem(this.storageKey, token);
      
      // Зберігати час закінчення
      const expiry = expiresIn 
        ? Date.now() + expiresIn 
        : Date.now() + this.maxAge;
      sessionStorage.setItem(this.expiryKey, expiry.toString());
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }
  
  getToken() {
    try {
      // Перевірити чи токен не протух
      const expiry = sessionStorage.getItem(this.expiryKey);
      if (expiry && Date.now() > parseInt(expiry)) {
        console.warn('⚠️ Token expired - removing');
        this.removeToken();
        return null;
      }
      
      return sessionStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }
  
  removeToken() {
    try {
      sessionStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.expiryKey);
      sessionStorage.removeItem('user');
    } catch {}
  }
  
  isTokenExpired() {
    try {
      const expiry = sessionStorage.getItem(this.expiryKey);
      if (!expiry) return true;
      return Date.now() > parseInt(expiry);
    } catch {
      return true;
    }
  }
}
```

---

### 6. 🛡️ Додати Content Security Policy (CSP)

**Це можна зробити БЕЗ бекенду!**

```javascript
// src/components/SecurityHeaders.jsx
import { Helmet } from 'react-helmet-async';

export function SecurityHeaders() {
  return (
    <Helmet>
      <meta 
        httpEquiv="Content-Security-Policy" 
        content={`
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data:;
          connect-src 'self' https://xu6p-ejbd-2ew4.n7e.xano.io;
          frame-ancestors 'none';
        `.replace(/\s+/g, ' ').trim()}
      />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
    </Helmet>
  );
}
```

---

## 📋 ПОВНИЙ ПРИКЛАД: Безпечне зберігання токенів

```javascript
// src/utils/secureTokenStorage.js

import { tokenObfuscation } from './tokenObfuscation';

class SecureTokenStorage {
  constructor() {
    this.storageKey = 'authToken';
    this.expiryKey = 'authTokenExpiry';
    this.userKey = 'user';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 години
  }
  
  setToken(token, expiresIn = null) {
    if (!token) {
      this.removeToken();
      return;
    }
    
    try {
      // 1. Обфускувати токен
      const obfuscated = tokenObfuscation.obfuscate(token);
      
      // 2. Зберегти в sessionStorage (автоматично очищається при закритті)
      sessionStorage.setItem(this.storageKey, obfuscated);
      
      // 3. Зберегти час закінчення
      const expiry = expiresIn 
        ? Date.now() + expiresIn 
        : Date.now() + this.maxAge;
      sessionStorage.setItem(this.expiryKey, expiry.toString());
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }
  
  getToken() {
    try {
      // 1. Перевірити чи токен не протух
      if (this.isTokenExpired()) {
        this.removeToken();
        return null;
      }
      
      // 2. Отримати обфускований токен
      const obfuscated = sessionStorage.getItem(this.storageKey);
      if (!obfuscated) return null;
      
      // 3. Деобфускувати
      return tokenObfuscation.deobfuscate(obfuscated);
    } catch {
      return null;
    }
  }
  
  removeToken() {
    try {
      sessionStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.expiryKey);
      sessionStorage.removeItem(this.userKey);
    } catch {}
  }
  
  isTokenExpired() {
    try {
      const expiry = sessionStorage.getItem(this.expiryKey);
      if (!expiry) return true;
      return Date.now() > parseInt(expiry);
    } catch {
      return true;
    }
  }
  
  setUser(user) {
    try {
      if (user) {
        // Не зберігати чутливі дані
        const safeUser = {
          id: user.id,
          email: user.email,
          // Додати тільки нечутливі поля
        };
        sessionStorage.setItem(this.userKey, JSON.stringify(safeUser));
      } else {
        sessionStorage.removeItem(this.userKey);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }
  
  getUser() {
    try {
      const userStr = sessionStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export const secureTokenStorage = new SecureTokenStorage();
```

**Використання:**

```javascript
// src/api/AuthContext.jsx
import { secureTokenStorage } from '../utils/secureTokenStorage';

// Замінити всі localStorage на secureTokenStorage
secureTokenStorage.setToken(authToken);
const token = secureTokenStorage.getToken();
secureTokenStorage.removeToken();
```

---

## 📋 CHECKLIST (коли бекенд не підтримує cookies)

- [ ] ✅ Використовувати sessionStorage замість localStorage
- [ ] ✅ Додати обфускацію токенів
- [ ] ✅ Додати перевірку на XSS
- [ ] ✅ Обмежити час життя токенів
- [ ] ✅ Додати Content Security Policy
- [ ] ✅ Покращити валідацію вхідних даних
- [ ] ✅ Додати HTML sanitization
- [ ] ✅ Безпечне логування помилок
- [ ] ✅ Захист від clickjacking
- [ ] ✅ Автоматичний logout

---

## ⚠️ ВАЖЛИВО

**Ці виправлення покращують безпеку, але:**

1. **Токени все ще вразливі до XSS** (якщо XSS атака успішна, токени можуть бути викрадені)
2. **Повна безпека потребує:**
   - httpOnly cookies на бекенді
   - Правильну налаштування CORS
   - Автентифікацію на всіх endpoints

3. **Ці виправлення:**
   - ✅ Зменшують ризик витоку токенів
   - ✅ Автоматично очищають токени при закритті браузера
   - ✅ Ускладнюють витік токенів при XSS
   - ⚠️ Але не замінюють httpOnly cookies

---

## 🚀 РЕКОМЕНДАЦІЯ

**Зараз (без змін на бекенді):**
1. Використовувати sessionStorage + обфускацію
2. Додати CSP та інші захисти
3. Покращити валідацію та sanitization

**Потім (з бекендом):**
1. Додати підтримку httpOnly cookies на бекенді
2. Видалити токени з sessionStorage
3. Використовувати тільки cookies

**Це найкращий шлях до повної безпеки!**

