# 🔗 URLs для Stripe Checkout Session

## ✅ Сторінки вже створені:

1. **CheckoutSuccess.jsx** - обробляє успішний платіж
2. **CheckoutCancel.jsx** - обробляє скасування
3. Роути додані в `main.jsx`

## 📋 Правильні URL для `create-checkout-session`:

### Для локальної розробки:
```json
{
  "plan_id": "77791165-c2f1-4238-94cd-57a877c0fe5a",
  "success_url": "http://localhost:5173/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "http://localhost:5173/#/dashboard/subscriptions/checkout/cancel",
  "payment_type": "subscription"
}
```

### Для production (замініть на ваш домен):
```json
{
  "plan_id": "77791165-c2f1-4238-94cd-57a877c0fe5a",
  "success_url": "https://yourdomain.com/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://yourdomain.com/#/dashboard/subscriptions/checkout/cancel",
  "payment_type": "subscription"
}
```

## ⚠️ Важливо:

1. **`{CHECKOUT_SESSION_ID}`** - це спеціальний placeholder, який Stripe автоматично замінить на реальний session ID
2. **HashRouter**: Використовується `#` в URL (не `/dashboard/...`, а `/#/dashboard/...`)
3. **success_url** має містити `?session_id={CHECKOUT_SESSION_ID}` для передачі session ID
4. **cancel_url** може бути без параметрів (але можна додати `?session_id={CHECKOUT_SESSION_ID}` якщо потрібно)

## 🔄 Як це працює:

1. Користувач клікає "Upgrade Now"
2. Фронтенд викликає `POST /create-checkout-session` з цими URL
3. Бекенд створює Stripe Checkout Session з цими URL
4. Stripe перенаправляє користувача на:
   - `success_url` (з реальним session_id) - після успішного платежу
   - `cancel_url` - якщо користувач скасував

## 📝 Приклад з коду:

В `Subscriptions.jsx` URL формуються автоматично:

```javascript
const baseUrl = window.location.origin; // http://localhost:5173 або https://yourdomain.com
const successUrl = `${baseUrl}/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${baseUrl}/#/dashboard/subscriptions/checkout/cancel`;
```

## 🎯 Що робить кожна сторінка:

### `/dashboard/subscriptions/checkout/success`
- Отримує `session_id` з URL параметрів
- Викликає `GET /checkout/success?session_id=...` для верифікації
- Оновлює підписку через `GET /my_subscription`
- Оновлює дані користувача через `refreshAuth()`
- Показує повідомлення "Payment successful!" ✅
- Автоматично redirect на `/dashboard/subscriptions` через 3 секунди

### `/dashboard/subscriptions/checkout/cancel`
- Показує повідомлення "Payment canceled" 🚫
- Показує notification "Checkout was cancelled. No charges were made."
- Кнопки для повернення на dashboard або subscriptions

## ✅ Готово до використання!

Просто використовуйте URL з `window.location.origin` або вкажіть ваш production домен.

