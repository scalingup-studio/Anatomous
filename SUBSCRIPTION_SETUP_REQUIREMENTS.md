# 📋 Що потрібно налаштувати для коректної роботи підписок

## ✅ Вже реалізовано

1. ✅ Stripe Checkout flow (створення сесії, redirect, success/cancel сторінки)
2. ✅ Feature gating утиліти (`subscriptionUtils.js`)
3. ✅ Upgrade prompts для недоступних функцій
4. ✅ API endpoints для перевірки лімітів та оновлення usage
5. ✅ Відображення поточної підписки та лімітів

## ⚠️ Що потрібно додати/налаштувати

### 1. 🔒 Перевірка лімітів перед діями

**Проблема:** API `POST /subscription/check-limits` існує, але не використовується перед діями користувача.

**Потрібно додати перевірку перед:**

#### 1.1 AI Messages (useOpenAI.js)
```javascript
// Перед відправкою повідомлення в useOpenAI.js
const checkResult = await SubscriptionApi.checkLimits('ai_message', 1);
if (!checkResult.allowed) {
  // Показати UpgradePrompt
  return;
}
```

#### 1.2 File Uploads (Insights.jsx, Profile.jsx)
```javascript
// Перед завантаженням файлу
const checkResult = await SubscriptionApi.checkLimits('upload', 1);
if (!checkResult.allowed) {
  showNotification("Upload limit reached. Please upgrade your plan.", "error");
  // Або показати UpgradePrompt
  return;
}
```

#### 1.3 Notes Creation (Notes.jsx, NotesTab.jsx)
```javascript
// Перед створенням нотатки
const checkResult = await SubscriptionApi.checkLimits('create_note', 1);
if (!checkResult.allowed) {
  showNotification("Note limit reached. Please upgrade your plan.", "error");
  return;
}
```

#### 1.4 Goals Creation (Goals.jsx, ActiveGoalsTab.jsx)
```javascript
// Перед створенням цілі
const checkResult = await SubscriptionApi.checkLimits('create_goal', 1);
if (!checkResult.allowed) {
  showNotification("Goal limit reached. Please upgrade your plan.", "error");
  return;
}
```

### 2. 📊 Оновлення usage після дій

**Проблема:** API `POST /subscription/update-usage` існує, але не викликається після успішних дій.

**Потрібно додати після успішних операцій:**

#### 2.1 Після AI Message
```javascript
// В useOpenAI.js після успішної відповіді
await PaymentApi.updateUsage('ai_message', 1, 1);
```

#### 2.2 Після File Upload
```javascript
// В Insights.jsx після успішного upload
await PaymentApi.updateUsage('upload_document', 1, 1);
```

#### 2.3 Після створення Note
```javascript
// В Notes.jsx після успішного створення
await PaymentApi.updateUsage('create_note', 1, 1);
```

#### 2.4 Після створення Goal
```javascript
// В Goals.jsx після успішного створення
await PaymentApi.updateUsage('create_goal', 1, 1);
```

### 3. 🚫 Feature Gating для функцій

**Потрібно додати перевірку доступу до функцій:**

#### 3.1 Reports (PDF Export)
```javascript
// В Reports.jsx перед генерацією PDF
import { hasFeatureAccess } from '../../utils/subscriptionUtils';
if (!hasFeatureAccess(user, 'reportsPdf')) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('reportsPdf');
  return;
}
```

#### 3.2 CSV Export
```javascript
// Перед експортом CSV
if (!hasFeatureAccess(user, 'csvExport')) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('csvExport');
  return;
}
```

#### 3.3 AI Risk Forecasts
```javascript
// Перед показом AI Risk Forecasts
if (!hasFeatureAccess(user, 'aiRiskForecasts')) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('aiRiskForecasts');
  return;
}
```

#### 3.4 Early Alerts
```javascript
// Перед показом Early Alerts
if (!hasFeatureAccess(user, 'earlyAlerts')) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('earlyAlerts');
  return;
}
```

#### 3.5 Share with Providers
```javascript
// Перед відправкою звіту провайдеру
if (!hasFeatureAccess(user, 'shareWithProviders')) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('shareWithProviders');
  return;
}
```

### 4. 🔄 Автоматичне оновлення підписки після webhook

**Проблема:** Після webhook підписка оновлюється на бекенді, але фронтенд може не знати про це.

**Рішення 1: Polling на сторінці підписок**
```javascript
// В CurrentPlan компоненті
React.useEffect(() => {
  const interval = setInterval(() => {
    loadSubscription();
  }, 30000); // Перевіряти кожні 30 секунд
  
  return () => clearInterval(interval);
}, []);
```

**Рішення 2: Оновлення при поверненні на сторінку**
```javascript
// В CurrentPlan компоненті
React.useEffect(() => {
  const handleFocus = () => {
    loadSubscription();
    if (refreshAuth) refreshAuth();
  };
  
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, []);
```

**Рішення 3: WebSocket або Server-Sent Events (складніше, але краще)**

### 5. 📱 Відображення поточного usage

**Потрібно показувати поточне використання:**

#### 5.1 AI Messages Counter
```javascript
// В Insights.jsx або ChatComponent
const subscription = await SubscriptionApi.getMySubscription();
const aiMessagesUsed = subscription?.usage?.ai_messages_used || 0;
const aiMessagesLimit = subscription?.usage?.ai_messages_limit || 10;

// Показати: "5/50 AI messages used this month"
```

#### 5.2 Uploads Counter
```javascript
// В Insights.jsx на вкладці Uploads
const uploadsUsed = subscription?.usage?.uploads_used || 0;
const uploadsLimit = subscription?.usage?.uploads_limit || 0;

// Показати: "2/3 uploads used this month"
```

#### 5.3 Notes Counter
```javascript
// В Notes.jsx
const notesUsed = subscription?.usage?.notes_used || 0;
const notesLimit = subscription?.usage?.notes_limit || 3;

// Показати: "2/3 notes used"
```

#### 5.4 Goals Counter
```javascript
// В Goals.jsx
const goalsUsed = subscription?.usage?.goals_used || 0;
const goalsLimit = subscription?.usage?.goals_limit || 0;

// Показати: "5/10 goals used"
```

### 6. 🔐 Backend Requirements

**Переконайтеся, що бекенд:**

#### 6.1 Stripe Webhook
- ✅ Налаштований endpoint `/stripe-webhook`
- ✅ Верифікує Stripe signature
- ✅ Обробляє події:
  - `checkout.session.completed` - активація підписки
  - `customer.subscription.updated` - оновлення підписки
  - `customer.subscription.deleted` - скасування підписки
  - `invoice.payment_succeeded` - успішний платіж
  - `invoice.payment_failed` - невдалий платіж

#### 6.2 Usage Tracking
- ✅ Відстежує використання для кожного користувача
- ✅ Скидає лічильники на початку нового періоду (місяць/рік)
- ✅ Повертає актуальні дані в `GET /my_subscription`

#### 6.3 Check Limits API
- ✅ `POST /subscription/check-limits` перевіряє:
  - Поточне використання
  - Ліміти плану
  - Повертає `{ allowed: true/false, reason: "..." }`

#### 6.4 Update Usage API
- ✅ `POST /subscription/update-usage` оновлює:
  - Лічильник використання
  - Збільшує/зменшує залежно від `increment` параметра

### 7. 🎨 UI/UX Покращення

#### 7.1 Показувати ліміти в UI
- Додати індикатори прогресу (progress bars)
- Показувати "X/Y used" для кожного ліміту
- Додати попередження при наближенні до ліміту (80%, 90%)

#### 7.2 Disable кнопки при досягненні ліміту
```javascript
// Приклад для AI Messages
const canSendMessage = aiMessagesUsed < aiMessagesLimit;
<button disabled={!canSendMessage || loading}>
  {!canSendMessage ? 'Limit Reached' : 'Send'}
</button>
```

#### 7.3 Показувати upgrade prompt при досягненні ліміту
```javascript
if (!canSendMessage) {
  setUpgradePromptOpen(true);
  setUpgradeFeature('aiMessages');
}
```

## 📝 Чеклист для реалізації

### Фронтенд
- [ ] Додати перевірку `checkLimits` перед AI messages
- [ ] Додати перевірку `checkLimits` перед file uploads
- [ ] Додати перевірку `checkLimits` перед створенням notes
- [ ] Додати перевірку `checkLimits` перед створенням goals
- [ ] Додати `updateUsage` після AI messages
- [ ] Додати `updateUsage` після file uploads
- [ ] Додати `updateUsage` після створення notes
- [ ] Додати `updateUsage` після створення goals
- [ ] Додати feature gating для Reports (PDF)
- [ ] Додати feature gating для CSV Export
- [ ] Додати feature gating для AI Risk Forecasts
- [ ] Додати feature gating для Early Alerts
- [ ] Додати feature gating для Share with Providers
- [ ] Додати відображення usage counters
- [ ] Додати автоматичне оновлення підписки (polling або focus event)

### Бекенд
- [ ] Переконатися, що webhook правильно оновлює підписки
- [ ] Переконатися, що usage tracking працює
- [ ] Переконатися, що check-limits API працює коректно
- [ ] Переконатися, що update-usage API працює коректно
- [ ] Переконатися, що лічильники скидаються на початку періоду

## 🔗 Корисні посилання

- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)
- [Usage-based Billing](https://stripe.com/docs/billing/subscriptions/usage-based)

