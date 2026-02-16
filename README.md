# Anatomous MVP - Health Intelligence Platform

## 📋 Overview

Anatomous is an innovative health monitoring platform with a focus on user privacy and data control. The platform combines AI analytics, comprehensive health monitoring, and an intuitive interface to provide personalized insights.

**Motto:** *"Autonomy Over Your Anatomy"*  
**Tagline:** *"Take control of your health data, insights, and decisions — on your terms."*

---

## 🏗️ System Architecture

### **Frontend (React)**
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + custom design system
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Charts**: Chart.js/Recharts
- **PWA**: Progressive Web App functionality

### **Backend (Xano)**
- **Platform**: Xano No-Code Backend
- **Database**: PostgreSQL
- **Authentication**: JWT Tokens
- **API**: RESTful endpoints
- **File Storage**: Built-in Xano storage

### **Infrastructure**
- **Frontend Hosting**: Vercel/Netlify
- **Backend Hosting**: Xano Cloud
- **CDN**: Cloudflare
- **CI/CD**: GitHub Actions

---

## 🎨 Design System

### **Color Palette**
```css
/* Primary Colors */
--primary-aqua: #00BACE;    /* CTA buttons, active states */
--primary-blue: #004CD7;     /* Logo, headings */

/* Base UI */
--background: #000000;       /* Page background */
--surface: #111111;          /* Card backgrounds */
--divider: #222222;          /* Borders */

/* Text Colors */
--text-primary: #FFFFFF;     /* Headlines, body text */
--text-secondary: #CCCCCC;   /* Subheadings */
--text-disabled: #777777;    /* Placeholder text */

/* Semantic Colors */
--success: #00C37A;          /* Positive trends */
--warning: #F5A623;          /* Warnings */
--error: #FF4C4C;            /* Errors */
--info: #5BC0DE;             /* Info banners */
```

### **Typography**
- **Primary Font**: Inter/Manrope/DM Sans
- **Text Sizes**:
  - Headline: 24-36px
  - Subhead: 18-22px
  - Body: 14-16px
  - Caption: 12px

---

## 📱 Core Modules

### **1. Landing Page** (`/`)
- Hero section with core messaging
- Features/Benefits showcase
- Pricing structure (5 tiers)
- Trust & Privacy information
- Waitlist registration via Brevo

### **2. Onboarding** (`/onboarding`)
7-step process:
1. Welcome
2. Personal Info
3. Health Snapshot
4. Lifestyle & Habits
5. Health Goals
6. Privacy Settings
7. Review & Finish

### **3. Main Dashboard** (`/dashboard`)
- Welcome banner
- Quick Snapshot cards
- Data visualization
- Today's Action Plan
- Recent Activity feed

### **4. Navigation Structure**
- **🧠 Overview** - daily overview
- **📊 Insights** - AI analytics & trends
- **📁 Health Data** - medical data
- **🎯 Goals** - goals & progress
- **📄 Reports** - reports & export
- **👤 Profile** - user profile
- **💳 Subscription** - subscription management
- **⚙️ Settings** - settings

---

## 🔗 Integrations & Services

### **Communications**
- **📧 SendGrid** - transactional emails (onboarding, password reset)
- **📬 Brevo** - marketing emails & waitlist collection
- **💬 Crisp** - live chat & help center

### **Analytics & Monitoring**
- **📊 Umami** - privacy-focused analytics
- **🐛 LogSnag** - error tracking & event logging
- **🔍 Sentry** - frontend error monitoring

### **AI & Data Processing**
- **🧠 OpenAI GPT-4** - insight generation
- **📈 Custom ML models** - trend forecasting

### **Security & Compliance**
- **HIPAA-conscious** design
- **JWT tokens** with short expiration
- **End-to-end encryption** for sensitive data
- **BAA compliance** through Xano

---

## 🚀 MVP Functionality

### **Core Features**
- ✅ Registration & authentication
- ✅ 7-step onboarding process
- ✅ Medical data input
- ✅ AI insights via GPT-4
- ✅ Trend visualization
- ✅ Goal management
- ✅ File uploads
- ✅ Report generation
- ✅ Notification system

### **Pricing Tiers**
1. **Starter** - Free forever
2. **Core** - AI health insights
3. **Complete** - Trends, export, alerts
4. **Family** - Up to 4 profiles
5. **Family Max** - Up to 5 profiles + priority support

---

## 🔐 Security & Privacy

### **Security Principles**
- User data never sold
- User controls data visibility
- End-to-end encryption
- Regular security audits

### **Compliance**
- HIPAA-conscious design
- GDPR compliance
- BAA with Xano for health data

### **Trust Center**
- Transparent privacy policies
- Clear terms of service
- "Us vs. Them" comparison table

---

## 🛠️ Technical Stack

### **Frontend Dependencies**
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "redux-toolkit": "^1.9.0",
  "react-router-dom": "^6.0.0",
  "axios": "^1.4.0",
  "tailwindcss": "^3.3.0",
  "recharts": "^2.8.0",
  "react-hook-form": "^7.45.0"
}
```

### **Backend (Xano)**
- Automatic scaling
- Built-in PostgreSQL database
- API endpoint management
- Encrypted file storage

---

## 📊 Monitoring & Analytics

### **Tracking Events**
- Registration & onboarding
- AI feature usage
- File uploads
- Report generation
- System errors

### **Performance Metrics**
- Page load times
- API response times
- User engagement rates
- Error frequency

---

## Environment variables

- **VITE_API_BASE_URL**  
  - **Приклад**: `https://xu6p-ejbd-2ew4.n7e.xano.io`  
  - **Призначення**: базовий домен Xano. На фронтенді з нього збираються всі групові API‑бази (auth, reports, subscriptions, payments, notifications тощо) в `src/api/apiConfig.js` через `API_BASE_URL` з `src/api/configEnv.js`.
  - **Важливо**: не додавайте `/api:...` у значення. Суфікси `api:5PA_dIPO`, `api:HBbbpjK5` і т.п. підставляються у коді автоматично.

- **VITE_BASE_PATH** (опціонально, використовується в `vite.config.js` як `process.env.VITE_BASE_PATH`)  
  - **За замовчуванням**: `/`  
  - **Призначення**: змінює `base` в Vite для випадків, коли фронтенд хоститься не з кореня домену (наприклад, GitHub Pages під `/Anatomous/`).  
  - **Приклад**: `VITE_BASE_PATH=/Anatomous/`

> Усі `.env`, `.env.*` файли ігноруються Git через оновлений `.gitignore` і мають зберігатися лише локально або в CI/секрет‑менеджері.

## 🚀 Build & deploy

- **Development (локальний запуск)**  

```bash
# Clone repository
git clone [repository-url]
cd anatamous-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

- **Production build**  

```bash
# Build optimized production bundle
npm run build
```

- **Результат**  
  - Продакшн‑бандл збирається в директорію `dist/` (один `index.html`, CSS/JS‑асети в `dist/assets`).
  - Вміст `dist/` призначений для деплою як **статичний сайт** (наприклад, на **S3 + CloudFront**, Vercel, Netlify тощо).
  - Для CloudFront, який віддає сайт з кореня домену (наприклад, `https://app.yourdomain.com/`), **нічого додатково міняти не потрібно** — `base` у `vite.config.js` вже дорівнює `/` за замовчуванням.
  - Для хостингу в підкаталозі (наприклад, GitHub Pages під `/Anatomous/`) задайте `VITE_BASE_PATH=/Anatomous/` на етапі білду, щоб шляхи до статичних ресурсів були коректні.

## Інтеграція з Xano

- **Очікуваний VITE_API_BASE_URL**  
  - Dev / prod‑значення мають вказувати на Xano‑інстанс, наприклад:  
    - Dev: `https://xu6p-ejbd-2ew4.n7e.xano.io`  
    - Prod: `https://api.yourdomain.xano.io` (умовно)  
  - Усі конкретні API‑групи (auth, reports, subscriptions, payments, notifications, account, account_settings) формуються в `src/api/apiConfig.js` на основі цього домену.

- **Frontend callback / redirect URLs (для налаштування в Xano / OAuth / Stripe)**  
  - Додатково враховуйте, що додаток використовує `HashRouter`, тому шляхи мають виглядати як `https://yourdomain.com/#/route`.

  - **Google OAuth**  
    - Callback: `https://yourdomain.com/#/auth/callback/google`  
    - Success (альтернативний маршрут того ж компонента): `https://yourdomain.com/#/auth/success`

  - **Apple OAuth**  
    - Callback: `https://yourdomain.com/#/auth/callback/apple`

  - **Reset password (email‑link із Xano)**  
    - Landing page: `https://yourdomain.com/#/reset-password`  
    - В `AuthApi.requestPasswordReset` цей URL за замовчуванням генерується як `<origin> + "#/reset-password"` і може бути перевизначений опцією `opts.url`.

  - **Stripe Checkout (subscriptions)**  
    - Success URL:  
      - Dev: `http://localhost:5173/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}`  
      - Prod: `https://yourdomain.com/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}`  
    - Cancel URL:  
      - Dev: `http://localhost:5173/#/dashboard/subscriptions/checkout/cancel`  
      - Prod: `https://yourdomain.com/#/dashboard/subscriptions/checkout/cancel`

  - **Shared reports (public viewer з токеном від Xano)**  
    - Viewer: `https://yourdomain.com/#/shared-reports/{token}`

> Всі ці URL мають бути внесені у відповідні налаштування Xano (OAuth, Stripe webhooks / success / cancel, email‑шаблони) для коректної роботи редіректів.

## 🔮 Roadmap

### **Phase 1 (MVP)**
- ✅ Core functionality
- ✅ AI integration
- ✅ Notification system

### **Phase 2 (Q2 2025)**
- Wearable device integration
- Enhanced AI diagnostics
- Mobile app (React Native)

### **Phase 3 (Q4 2025)**
- Telemedicine integrations
- Social features
- International localization

---

## 👥 Team & Contacts

**Anatomous LLC**
- **Email**: support@anatomous.com
- **Help Center**: Via Crisp chat
- **Trust Center**: `/trust` for security details

---

## 📄 License & Documentation

- **Terms of Service**: [Link]
- **Privacy Policy**: [Link]
- **Trust & Compliance**: [Link]

---

**Status:** 🚀 Active MVP Development  
**Version:** 1.0.0  
**Last Updated:** September 2025  
**Confidential:** Anatomous LLC

---

# API Endpoints Documentation

## 🔐 Base Information

- **Base URL**: `https://xu6p-ejbd-2ew4.n7e.xano.io/api:5PA_dIPO`
- **Version**: 0.0.1
- **Authentication**: Bearer Token

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users & Profile](#users--profile)
3. [Health Data](#health-data)
4. [Medical History](#medical-history)
5. [Goals & Progress](#goals--progress)
6. [AI Insights & Analytics](#ai-insights--analytics)
7. [Alerts](#alerts)
8. [Files & Uploads](#files--uploads)
9. [Onboarding](#onboarding)
10. [Notes](#notes)

---

## 🔐 Authentication

### **POST /auth/signup** - User Registration
**Purpose**: Create new user account
```javascript
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

// Response
{
  "new_User": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "subscription_plan": "core",
    "subscription_status": "active"
  },
  "new_profile": {
    "user_id": "uuid",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### **POST /auth/login** - User Login
**Purpose**: User authentication
```javascript
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { /* user data */ }
}
```

### **POST /auth/logout** - User Logout
**Purpose**: End user session

### **GET /auth/check-auth** - Authentication Check
**Purpose**: Validate JWT token
```bash
Headers: Authorization: Bearer {token}
```

### **POST /auth/refresh** - Token Refresh
**Purpose**: Get new access token
```javascript
{
  "refresh_token": "refresh_token_value"
}
```

### **OAuth Endpoints**
- `GET /auth/google` - Google OAuth initialization
- `GET /auth/callback/google` - Google OAuth callback
- `GET /auth/callback/apple` - Apple OAuth callback

---

## 👤 Users & Profile

### **GET /users/{user_id}** - Get User Data
**Purpose**: Retrieve user information
```javascript
// Response
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "subscription_plan": "core",
  "subscription_status": "active"
}
```

### **GET /profiles/{user_id}** - Get User Profile
**Purpose**: Retrieve user profile details
```javascript
// Response
{
  "first_name": "John",
  "last_name": "Doe",
  "dob": "1990-01-01",
  "gender": "male",
  "height_cm": 180,
  "weight_kg": 75,
  "profile_photo": { /* photo data */ }
}
```

### **PATCH /profiles/{user_id}** - Update Profile
**Purpose**: Edit user profile
```javascript
// Request
{
  "first_name": "John",
  "last_name": "Smith",
  "weight_kg": 72
}
```

### **POST /user_settings** - Create User Settings
**Purpose**: Save user settings
```javascript
{
  "user_id": "uuid",
  "health_snapshot": {
    "blood_type": "A+",
    "emergency_contact": "..."
  },
  "privacy": {
    "share_health_data": false
  }
}
```

---

## 📊 Health Data

### **GET /health_data/{user_id}** - Get Health Data
**Purpose**: Retrieve latest medical metrics

### **POST /health_data** - Add Health Data
**Purpose**: Record new medical metrics
```javascript
{
  "user_id": "uuid",
  "date": "2024-01-20",
  "heart_rate": 72,
  "blood_pressure_systolic": 120,
  "blood_pressure_diastolic": 80,
  "weekly_activity_minutes": 150
}
```

### **PATCH /health_data/{user_id}** - Update Health Data
**Purpose**: Edit existing medical records

---

## 🏥 Medical History

### **POST /user-health-summary**
**Add all health_history, medical_condition, allergies, family_history, medications, sensitivities, surgical_history, vaccinations to one table
**Request Body**:
```json
{
  "sections": "medications",
  "medical_condition": {},
  "allergies": {"0":"ggggg", "1":"bhhhhhh"},
  "family_history": {},
  "medications": {"0": "65656"},
  "sensitivities": {},
  "surgical_history": {},
  "vaccinations": {}
}
```

### **GET get/user-health-summary**
** Get health summary data
---

### **POST /health_history_summary** - Complete Medical History
**Purpose**: Get all user medical records
```javascript
// Request
{
  "user_id": "uuid"
}

// Response
{
  "user_medical_condition": { /* data */ },
  "user_allergies": { /* data */ },
  "user_family_history": { /* data */ },
  "user_medications": { /* data */ },
  "user_sensitivities": { /* data */ },
  "user_surgical_history": { /* data */ },
  "user_vaccinations": { /* data */ }
}
```

### **Medical Conditions**
- `POST /medical_conditions` - Add condition
- `GET /medical_conditions/{user_id}` - Get conditions
- `PATCH /medical_conditions/{user_id}` - Update condition

### **Allergies**
- `POST /allergies` - Add allergy
- `GET /allergies/{user_id}` - Get allergies

### **Medications**
- `POST /medications` - Add medication
- `GET /medications/{user_id}` - Get medications
- `DELETE /medications/{user_id}` - Delete medication

### **Family History**
- `POST /family_history` - Add family history
- `GET /family_history/{user_id}` - Get family history

### **Surgical History**
- `POST /surgical_history` - Add surgery
- `GET /surgical_history/{user_id}` - Get surgical history

### **Vaccinations**
- `POST /vaccinations` - Add vaccination
- `GET /vaccinations/{user_id}` - Get vaccinations

---

## 🎯 Goals & Progress

### **POST /goals** - Create Goal
**Purpose**: Add new health goal
```javascript
{
  "title": "Lose weight",
  "description": "Lose 5kg in 3 months",
  "status": "on track",
  "target_date": "2024-03-20",
  "type": "fitness"
}
```

### **GET /goals/get/goals** - Get Goals
**Purpose**: Retrieve all user goals

### **PATCH /goals/{goal_id}** - Update Goal
**Purpose**: Edit existing goal

### **DELETE /goals/{goal_id}** - Delete Goal
**Purpose**: Remove user goal

### **Goal Progress**
- `POST /goal/progress` - Add progress
- `GET /goal/get/progress` - Get progress
- `DELETE /goal/delete/progress` - Delete progress

### **Goal History**
- `GET /goals/get/history` - Filter goals by status
- `POST /goals/readd` - Re-add completed goal

---

## 🧠 AI Insights & Analytics

### **POST /generate-insight** - Generate AI Insights
**Purpose**: Create personalized insights based on user data
```javascript
{
  "query": "How to improve sleep?",
  "metrics": { /* user metrics */ }
}
```

### **POST /metrics/trends** - Get Trends
**Purpose**: Analyze historical data and trends
```javascript
{
  "type_metric": "heart_rate",
  "period": "7d",
  "start_date": "2024-01-01",
  "end_date": "2024-01-07"
}
```

### **POST /metrics/forecast** - Get Forecast
**Purpose**: Generate AI-based predictions
```javascript
{
  "type_metric": "heart_rate"
}
```

### **GET /insights_recent** - Get Recent Insights
**Purpose**: Retrieve latest AI insights
```bash
Query params: ?user_id={user_id}&type_metric={metric_type}
```

---

## 🚨 Alerts

### **POST /check-threshold** - Check Threshold Values
**Purpose**: Analyze metrics and generate alerts
```javascript
{
  "metrics": [
    {
      "metric_type": "blood_pressure_diastolic",
      "value": "85",
      "last_metric_date": "2024-01-15T08:30:00Z"
    }
  ]
}
```

### **GET /get-comprehensive-alerts** - Get Alerts
**Purpose**: Retrieve all active user alerts
```bash
Query params: ?user_id={user_id}
```

### **POST /comprehensive-alerts** - Comprehensive Analysis
**Purpose**: Deep data analysis for alert creation

---

## 📁 Files & Uploads

### **POST /upload/attachment_file** - Upload File
**Purpose**: Upload medical documents
```bash
Content-Type: multipart/form-data

Form data:
- file: binary (required)
- user_id: string (required)
- category: "Labs"|"Radiology"|"Medical"
- file_name: string (required)
```

### **GET /upload/get_files** - Get Files
**Purpose**: Retrieve list of all user files
```bash
Query params: ?user_id={user_id}
```

### **POST /upload/avatar** - Upload Avatar
**Purpose**: Upload profile photo
```bash
Content-Type: multipart/form-data

Form data:
- image: binary (required)
- category: "profile"
```

### **GET /upload/download_file** - Download File
**Purpose**: Download specific file
```bash
Query params: ?file_id={file_id}&user_id={user_id}
```

---

## 🚀 Onboarding

### **POST /onboarding/{step}** - Onboarding Step
**Purpose**: Save onboarding progress
```javascript
{
  "user_id": "uuid",
  "data_json": {
    "step1_completed": true,
    "health_goals": ["fitness", "sleep"],
    "medical_conditions_added": true
  }
}
```

**Available Steps:**
- `personal` - Personal Information
- `health_snapshot` - Health
- `lifestyle` - Lifestyle
- `health_goals` - Health Goals
- `privacy` - Privacy
- `welcome` - Welcome

---

## 📝 Notes

### **POST /notes** - Create Note
**Purpose**: Add new note or journal entry
```javascript
{
  "text": "Feeling great today",
  "mood_tag": "happy"
}
```

### **GET /notes** - Get Notes
**Purpose**: Filter notes by date and mood
```bash
Query params: ?user_id={user_id}&start_date={date}&end_date={date}&mood_tag={tag}
```

### **PATCH /notes/note{note_id}** - Update Note
**Purpose**: Edit existing note

### **GET /notes/note{user_id}** - Get Specific Note
**Purpose**: Retrieve details of specific note

---

## ⚠️ Error Handling

### **Standard Error Structure:**
```javascript
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

### **HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🔐 Authentication for Endpoints

### **Endpoints Requiring Authentication:**
- `GET /allergies/{user_id}`
- `POST /metrics/forecast`
- `POST /upload/avatar`
- `GET /reports/*`
- `GET /upload/get_avatar`

### **Authorization Header:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💡 Frontend Recommendations (React)

### **1. Data Caching**
```javascript
// Profile data - 5-10 minutes
// Medical data - 2-5 minutes
// Static data - until changes
```

### **2. Error Handling**
```javascript
// On 429 (Rate Limit) - wait 30 seconds
// On 500 - retry after 10 seconds (max 3 attempts)
```

### **3. Offline Work**
```javascript
// Store health_data and goals locally
// Sync when network available
```

### **4. Request Optimization**
```javascript
// Use /health_history_summary instead of separate requests
// Group requests for similar data
```

---

## 🎯 Usage Examples for Frontend

### **Adding New Medical Data:**
```javascript
1. POST /health_data - add data
2. POST /check-threshold - check thresholds
3. GET /get-comprehensive-alerts - get updated alerts
```

### **Creating New Goal:**
```javascript
1. POST /goals - create goal
2. POST /goal/progress - add progress
3. GET /goals/{user_id} - get updated goal list
```

### **Getting Data for Home Page:**
```javascript
// User profile
GET /profiles/{user_id}

// Latest health data
GET /health_data/{user_id}

// Active alerts
GET /get-comprehensive-alerts?user_id={user_id}

// Current goals
GET /goals/{user_id}
```

---

**Last Documentation Update:** January 2024 📋

---

# Updated: 09/25/2025 - Tools & Integrations

These tools are selected to support **notifications**, **error tracking**, **analytics**, and **customer support** in a **HIPAA-conscious MVP environment**. All integrations should be modular, lightweight, and security-aware.

---

## ✅ Pre-Launch Implementation Required

### 📬 **Brevo – Waitlist Email Collection**
- Use Brevo's **Form Builder** to create a **Waitlist Signup Form** (fields: Name, Email)
- Embed the form on the **landing page** using HTML snippet
- Submissions will populate a contact list in Brevo
- No API connection needed at this stage

### 📬 **SendGrid – Transactional Emails**
- Used for **onboarding emails**, **password resets**, **intake confirmations**, and **system alerts**
- Connect via **Xano backend API**
- Authenticate via **API Key** and configure **verified sender domain**
- Emails must **not include PHI**

### 📊 **Umami – Privacy-Focused Analytics**
- Lightweight analytics tool for **tracking site and app usage** without handling PII or PHI
- Track: landing page visits, button interactions, feature usage trends
- Privacy-friendly alternative to Google Analytics

### 🐛 **LogSnag – Logging & Error Tracking**
- Used to monitor **backend errors**, **user activity**, and **critical system events**
- Integrate with **Xano** to log login errors, form submission failures, PDF export events

### 💬 **Crisp – Support Chat + Help Center**
- Embed Crisp widget in frontend for live chat support
- Include Crisp's **Knowledge Base** for articles and self-service
- Ensure chat transcripts avoid storing PHI

---

## 🧠 Developer Integration Notes

- ⚠️ No PHI should pass through these services unless covered by a BAA
- All integrations must use secure endpoints (HTTPS) and authenticated API keys
- Modular implementation required
- Dashboard toggles should be included to enable/disable analytics or chat as needed

---

**Confidential - Anatomous LLC**
