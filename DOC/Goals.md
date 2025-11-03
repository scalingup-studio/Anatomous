На основі наданих ендпоінтів для модуля Goals & Notes, ось детальна бізнес-логіка та специфікація для кожного ендпоінта:

## 🎯 **Goals Management Endpoints**

### **POST /goals** - Створення цілі
**Призначення**: Додавання нової цілі користувача

**Request Body**:
```json
{
  "title": "Run 5km without stopping",
  "description": "Improve cardiovascular health through running",
  "status": "on track",
  "target_date": "2024-03-31",
  "type": "fitness",
  "visibility_scope": "private"
}
```

**Business Logic**:
1. Валідація обов'язкових полів
2. Створення запису в таблиці `goals`
3. Встановлення статусу "on track" за замовчуванням

**Response**:
```json
{
  "result": {
    "id": "goal_uuid",
    "title": "Run 5km without stopping",
    "status": "on track",
    "target_date": "2024-03-31",
    "type": "fitness"
  },
  "success": "true"
}
```

---

### **GET /goals/get/goals** - Отримання всіх цілей користувача
**Призначення**: Отримання списку всіх цілей користувача

**Parameters**: none

**Business Logic**:
1. Запит всіх записів з `goals` для конкретного user_id
2. Фільтрація не видалених записів
3. Сортування за датою створення

**Response**:
```json
{
  "result": [
    {
      id: 69db832b-b80d-41cc-9e23-65fc6131dbf3,
      created_at: 1761474338198,
      user_id: ca5a99b0-84c8-42d1-bcbf-7a8e2eaf03fa,
      title: Test,
      description: new test goal,
      status: on track,
      target_date: 2025-10-18,
      visibility_scope: public,
      updated_at: 0,
      type: Habit test
    }
  ],
  "success": "true"
}
```

---

### **PATCH /goals/{goal_id}** - Оновлення цілі
**Призначення**: Редагування існуючої цілі

**Request Body**:
```json
{
  "goals_id": "uuid (required)",
  "title": "Run 10km without stopping",
  "status": "completed",
  "target_date": "2024-04-30",
  "description": "Updated goal description"
}
```

**Business Logic**:
1. Пошук цілі за ID
2. Перевірка прав доступу (чи належить ціль користувачу)
3. Оновлення полів
4. Встановлення `updated_at` timestamp

**Response**:
```json
{
  "result": {
    id: e6ea75a1-2bb8-424c-bf58-1b0f778f6b89,
    created_at: 1761224685631,
    user_id: ca5a99b0-84c8-42d1-bcbf-7a8e2eaf03fa,
    title: Health Goals,
    description: test test,
    status: on track,
    target_date: 2025-10-26,
    visibility_scope: private,
    updated_at: 0,
    type: 
  },
  "success": "true"
}
```

---

### **DELETE /goals/{goal_id}** - Видалення цілі
**Призначення**: Видалення цілі користувача

**Request Body**:
```json
{
  "goal_id": "uuid (required)"
}
```

**Business Logic**:
1. Перевірка що ціль належить користувачу
2. Повне видалення


**Response**:
```json
{
  "success": "true"
}
```

---

## 📊 **Goal Progress Endpoints**

### **POST /goal/progress** - Додавання прогресу
**Призначення**: Додавання запису про прогрес до цілі

**Request Body**:
```json
{
  "goal_id": "uuid (required)",
  "value": "5",
  "unit": "km",
  "date": "2024-01-15"
}
```

**Business Logic**:
1. Перевірка що ціль існує та належить користувачу
2. Створення запису в `goal_progress` таблиці
3. Валідація значення прогресу

**Response**:
```json
{
  "result": {
    "id": "progress_uuid",
    "goal_id": "goal_uuid",
    "date": "2024-01-15",
    "value": 5,
    "unit": "km"
  },
  "success": "true"
}
```

---

### **GET /goal/get/progress** - Отримання прогресу за період
**Призначення**: Отримання історії прогресу з фільтрацією за періодом

**Query Parameters**:
```
goal_id: uuid (query, required)
range: string (query, required) - "7d" | "30d"
mode: string (query, optional) - "average" | "total"
```

**Business Logic**:
1. Запит записів прогресу для конкретної цілі
2. Фільтрація за діапазоном дат (7/30 днів)
3. Сортування за датою
4. Обчислення середнього/сумарного значення

**Response**:
```json
{
  result: [
{
   id: bff06611-82b6-4121-8152-41c87149d158,
   created_at: 1761476871521,
   goal_id: 41a9358e-2198-4de3-97e8-7e8b7210916c,
   date: 2025-10-26,
   value: 2,
   user_id: ca5a99b0-84c8-42d1-bcbf-7a8e2eaf03fa,
   unit:
},
{
   id: 08f710c9-3dcc-4bbe-a309-859b3dd5a6c0,
   created_at: 1761476877493,
   goal_id: 41a9358e-2198-4de3-97e8-7e8b7210916c,
   date: 2025-10-26,
   value: 2,
   user_id: ca5a99b0-84c8-42d1-bcbf-7a8e2eaf03fa,
   unit:
}],
   calculateProgress: {
   total: 4,
   average: 2,
   count: 2},
   success: true
}
```

---

### **DELETE /goal/progress{goal_progress_id}** - Видалення прогресу
**Призначення**: Видалення запису прогресу

**Request Body**:
```json
{
  "goal_progress_id": "uuid (required)"
}
```

**Response**:
```json
{
  "success": "true"
}
```

---

## 🔄 **Goals History & Readd Endpoints**

### **GET /goals/get/history** - Фільтрація цілей за статусом
**Призначення**: Отримання цілей з фільтрацією за статусом та періодом

**Query Parameters**:
```
status: string (required) - "Completed" | "Archived"
start_date: string (optional)
end_date: string (optional)
```

**Business Logic**:
```javascript
function getGoalsHistoryByPeriod(goals, startDate, endDate) {
  return goals.filter(goal => {
    if (goal.status !== 'Completed' && goal.status !== 'Archived') return false;
    if (!goal.completed_at) return false;
    
    const completedAt = new Date(goal.completed_at);
    if (startDate && completedAt < new Date(startDate)) return false;
    if (endDate && completedAt > new Date(endDate)) return false;
    
    return true;
  }).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
}
```

**Response**:
```json
{
  "result": [
    {
      "id": "goal_uuid",
      "title": "Run 5km without stopping",
      "status": "Completed",
      "completed_at": "2024-01-10T00:00:00Z",
      "type": "fitness",
      description: test test,
      visibility_scope: private,
      updated_at: 0,
      user_id:
    }
  ],
  "success": "true",
  sort_goals_list: [
{
   id: e6ea75a1-2bb8-424c-bf58-1b0f778f6b89,
   created_at: 1761224685631,
   user_id: ca5a99b0-84c8-42d1-bcbf-7a8e2eaf03fa,
   title: Health Goals,
   description: test test,
   status: archived,
   target_date: 2025-10-26,
   visibility_scope: private,
   updated_at: 0,
   type:
},

```

---

### **POST /goals/readd** - Повторне додавання цілі
**Призначення**: Копіювання завершеної цілі з новим ID та датою

**Request Body**:
```json
{
  "goal_id": "uuid (required)"
}
```

**Business Logic**:
1. Отримання оригінальної цілі
2. Перевірка що ціль належить користувачу
3. Створення нової цілі з тими ж полями (title, type, description)
4. Встановлення нового ID, created_at та статусу "on track"

**Response**:
```json
{
  "result": {
    "id": "new_goal_uuid",
    "title": "Run 5km without stopping",
    "status": "on track",
    "created_at": "2024-01-20T10:00:00Z"
  },
  "success": "true"
}
```

---

## 📝 **Notes Management Endpoints**

### **POST /notes** - Створення нотатки
**Призначення**: Додавання нової нотатки або запису в журнал

**Request Body**:
```json
{
  "text": "Feeling great after morning run. Energy levels high throughout the day.",
  "mood_tag": "energetic"
}
```

**Response**:
```json
{
  "result": {
    "id": "note_uuid",
    "text": "Feeling great after morning run...",
    "mood_tag": "energetic",
    "created_at": "2024-01-15T14:30:00Z"
  },
  "success": "true"
}
```

---

### **GET /notes** - Фільтрація нотаток
**Призначення**: Отримання нотаток з фільтрацією за датою та настроєм

**Query Parameters**:
```
start_date: string (optional)
end_date: string (optional) 
mood_tag: string (optional)
```

**Response**:
```json
{
  "result": [
    {
      "id": "note_uuid",
      "text": "Feeling great after morning run...",
      "mood_tag": "energetic",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ],
  "success": "true"
}
```

---

### **PATCH /notes/note{note_id}** - Оновлення нотатки
**Призначення**: Редагування існуючої нотатки

**Request Body**:
```json
{
  "text": "Updated note text with more details...",
  "mood_tag": "calm"
}
```

### **GET /notes/get/note** - Отримання конкретної нотатки
**Призначення**: Отримання деталей конкретної нотатки

**Query Parameters**:
```
note_id: uuid (query, required)
```

---

## 🔧 **Додаткові функції обробки даних**

### **Фільтрація та сортування прогресу:**
```javascript
function filterAndSortProgress(progressList, range) {
  const days = range === "30d" ? 30 : 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - days);

  return progressList
    .filter(entry => new Date(entry.date) >= cutoffDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
```

### **Розрахунок прогресу:**
```javascript
function calculateProgress(progressList, mode) {
  if (!progressList?.length) return { total: 0, average: 0, count: 0 };
  
  const total = progressList.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  const count = progressList.length;
  const average = total / count;

  return mode === "total" ? { total, average, count } : { total, average, count };
}
```

Ця структура забезпечує повний функціонал для управління цілями, прогресом та нотатками відповідно до вимог MVP, включаючи всі необхідні операції CRUD, фільтрацію та аналітику даних.
