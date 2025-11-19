# 🔧 Backend Fix Required: Subscription API Error

## ❌ Проблема

При виклику `GET /my_subscription` бекенд повертає помилку 500:

```
Unable to locate var: subscription.goals_limit
```

## 🔍 Причина

На бекенді (Xano) в API endpoint `/my_subscription` намагається отримати доступ до поля `subscription.goals_limit`, якого не існує в об'єкті `subscription`.

## ✅ Рішення

### Варіант 1: Додати поле в базу даних/API response

Переконайтеся, що API `/my_subscription` повертає всі необхідні поля:

```json
{
  "subscription": {
    "goals_limit": 0,  // ← Додати це поле
    "goals_used": 0,   // ← Додати це поле
    "notes_limit": 3,
    "notes_used": 0,
    "uploads_limit": 0,
    "uploads_used": 0,
    "ai_messages_limit": 10,
    "ai_messages_used": 0,
    // ... інші поля
  }
}
```

### Варіант 2: Використати fallback значення в Xano

В Xano API endpoint, замість прямого доступу до `subscription.goals_limit`, використайте:

```
subscription.goals_limit ?? 0
```

Або перевірте наявність поля перед використанням.

### Варіант 3: Оновити структуру response

Переконайтеся, що структура response містить всі необхідні поля в об'єкті `usage`:

```json
{
  "subscription_status": "active",
  "current_plan": "starter",
  "usage": {
    "goals_limit": 0,      // ← Додати
    "goals_used": 0,       // ← Додати
    "notes_limit": 3,
    "notes_used": 0,
    "uploads_limit": 0,
    "uploads_used": 0,
    "ai_messages_limit": 10,
    "ai_messages_used": 0
  },
  "available_features": [...],
  "next_billing_date": "..."
}
```

## 📋 Чеклист полів, які мають бути в response

### Обов'язкові поля в `usage`:
- ✅ `goals_limit` (number) - ліміт цілей для плану
- ✅ `goals_used` (number) - використано цілей
- ✅ `notes_limit` (number) - ліміт нотаток для плану
- ✅ `notes_used` (number) - використано нотаток
- ✅ `uploads_limit` (number) - ліміт завантажень для плану
- ✅ `uploads_used` (number) - використано завантажень
- ✅ `ai_messages_limit` (number) - ліміт AI повідомлень для плану
- ✅ `ai_messages_used` (number) - використано AI повідомлень

### Опціональні поля:
- `family_members_limit` (number) - для Family плану
- `family_members_used` (number) - для Family плану

## 🔄 Тимчасове рішення (Frontend)

На фронтенді додано обробку помилок:
- При помилці 500 показується попередження
- Використовуються fallback значення
- UI продовжує працювати з базовими даними

Але для повної функціональності потрібно виправити бекенд.

## 🧪 Тестування

Після виправлення бекенду перевірте:

1. `GET /my_subscription` повертає 200 (не 500)
2. Response містить всі необхідні поля
3. Значення полів коректні для поточного плану користувача
4. Ліміти відповідають плану (starter, core, complete, family)

## 📝 Приклад коректного response

```json
{
  "subscription_status": "active",
  "current_plan": "starter",
  "subscription_details": {
    "plan_name": "Starter",
    "plan_tier": "starter"
  },
  "usage": {
    "goals_limit": 0,
    "goals_used": 0,
    "notes_limit": 3,
    "notes_used": 1,
    "uploads_limit": 0,
    "uploads_used": 0,
    "ai_messages_limit": 10,
    "ai_messages_used": 3
  },
  "available_features": [
    "manual_health_data_entry",
    "ai_message",
    "secure_data_backup"
  ],
  "next_billing_date": null
}
```

