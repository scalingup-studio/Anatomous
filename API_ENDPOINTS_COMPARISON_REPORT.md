# API Endpoints Comparison Report
**Date:** 2026-01-02  
**JSON Spec:** 02-01-2026.json  
**Total Endpoints in JSON:** 96  
**Total Endpoints Used in Code:** 111

---

## ✅ Додані ендпоінти до apiConfig.js

### Insights API
- ✅ `/get-insight-user` - отримання списку чатів користувача
- ✅ `/insights_recent` - отримання останніх інсайтів для метрики

### Trends API
- ✅ `/metrics/trends` - отримання трендів здоров'я
- ✅ `/metrics/forecast` - прогнозування метрик

### Goal Progress API
- ✅ `/goal/delete/progress` - видалення прогресу цілі

### Health History API
- ✅ `/get/user-health-summary` - альтернативний шлях для отримання summary

### Reports API
- ✅ `/reports/share/send-email` - відправка email зі звітом
- ✅ `/reports/share/send-email/{share_id}` - відправка email за ID
- ✅ `/reports/shares` - управління шарингами

### Upload API
- ✅ `/upload/get_avatar` - отримання аватара користувача

---

## 📊 Статистика

### Використовуються в коді (58 ендпоінтів)
Всі основні CRUD операції та кастомні ендпоінти, які використовуються в додатку.

### Не використовуються в коді (29 ендпоінтів)

#### Admin ендпоінти (не потрібні на фронтенді)
- `/admin/plans/seed-initial-data`
- `/admin/seed-plan-benefits`
- `/admin/seed-plan-features`
- `/initialize_plans`

#### Додаткові функції (можуть бути корисні в майбутньому)
- `/ai_insight_summary` - summary AI інсайтів
- `/alerts/snooze` - відкладання алертів
- `/check_query` - перевірка запиту
- `/data_export/user_data_csv` - експорт даних в CSV
- `/generate_insight_summary` - генерація summary
- `/goals_export` - експорт цілей
- `/health_data_debug_copy` - debug копія health data
- `/insights_recent` - ⚠️ **ДОДАНО** до apiConfig.js
- `/log_email_event` - логування email подій
- `/metrics/forecast` - ⚠️ **ДОДАНО** до apiConfig.js
- `/metrics/trends` - ⚠️ **ДОДАНО** до apiConfig.js
- `/notes/note/{note_id}` - отримання нотатки за ID
- `/onboarding/{step}` - динамічний onboarding step
- `/reports/shared/token` - ⚠️ **ВЖЕ ВИКОРИСТОВУЄТЬСЯ** (sharedByToken)
- `/reports/shares` - ⚠️ **ДОДАНО** до apiConfig.js
- `/reports/shares/revoke{share_id}` - ⚠️ **ВЖЕ ВИКОРИСТОВУЄТЬСЯ** (revokeShare)
- `/subscription/my-plan` - альтернативний шлях для плану
- `/summary_data` - summary дані
- `/summary_data/{summary_data_id}` - summary за ID
- `/upload/get_avatar` - ⚠️ **ДОДАНО** до apiConfig.js

### Використовуються в коді, але не в JSON (53 ендпоінти)

Це ендпоінти з інших API баз (auth, subscription, payment, notifications), які не входять до основного API spec:
- Auth API (`API_BASE_AUTH`)
- Subscription API (`API_BASE_SUBSCRIPTION`)
- Payment API (`API_BASE_PAYMENT`)
- Notifications API (`API_BASE_NOTIFICATIONS`)
- Account API (`API_BASE_ACCOUNT`)

---

## 🔄 Оновлені файли

### 1. `src/api/apiConfig.js`
Додано нові ендпоінти:
- `insights.getInsightUser`
- `insights.getRecentInsights`
- `trends.getTrends`
- `trends.getForecast`
- `goalProgress.deleteProgress`
- `healthHistory.getUserHealthSummary`
- `reports.sendEmail`
- `reports.sendEmailById`
- `reports.shares`
- `uploudFile.getAvatar`

### 2. `src/api/insightApi.js`
Оновлено для використання `CUSTOM_ENDPOINTS` замість прямих URL:
- `getInsightUser()` тепер використовує `CUSTOM_ENDPOINTS.insights.getInsightUser`
- `getRecentInsights()` тепер використовує `CUSTOM_ENDPOINTS.insights.getRecentInsights`

### 3. `src/api/trendsApi.js`
Оновлено для використання `CUSTOM_ENDPOINTS`:
- `getTrends()` тепер використовує `CUSTOM_ENDPOINTS.trends.getTrends`
- `getForecast()` тепер використовує `CUSTOM_ENDPOINTS.trends.getForecast`

### 4. `src/api/goalsApi.js`
Оновлено `deleteProgress()` для підтримки нового ендпоінту `/goal/delete/progress`

---

## 📝 Рекомендації

### Ендпоінти, які можна додати в майбутньому:
1. **`/data_export/user_data_csv`** - для GDPR експорту даних користувача
2. **`/alerts/snooze`** - для функціоналу відкладання алертів
3. **`/goals_export`** - для експорту цілей
4. **`/ai_insight_summary`** - для summary AI інсайтів

### Ендпоінти, які вже використовуються, але не в JSON:
Це нормально, оскільки вони належать до інших API груп (auth, subscription, payment).

---

## ✅ Висновок

Всі важливі ендпоінти з JSON spec, які використовуються в коді, тепер додані до `apiConfig.js`. API файли оновлені для використання централізованої конфігурації ендпоінтів.

**Статус:** ✅ Завершено



