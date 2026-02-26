# MAIDAR Frontend-Backend Gap Analysis

## ✅ Complete UI Flow Analysis (39 Screenshots)

### **Authentication Flow** (Screens 1-8)
- **Screen 1**: Login page
- **Screen 2**: Sign up / Create account
- **Screen 3**: Verification code entry
- **Screen 4**: Email verified confirmation
- **Screen 5**: Forgot password
- **Screen 6**: Verification code (password reset)
- **Screen 7**: Reset password form
- **Screen 8**: Password reset successful

**Backend Status**: ❌ **MISSING**
- Need: User registration, login, JWT authentication
- Need: Email verification system
- Need: Password reset flow

---

### **Main Dashboard** (Screens 9.1-9.2)
**Features**:
- Human Risk Score (company average): 42.8
- Likelihood Score: 38
- Impact Score: 52
- Workforce Distribution pie chart (Low 60%, Moderate 20%, High 12%, Critical 8%)
- Risk Health Breakdown by Department (horizontal bars)
- Recent Simulations & Assessments list
- Highest risk employees table (name, dept, score, tier, factors, actions)
- Pagination

**Backend Status**: ✅ **COVERED**
- `/api/v1/analytics/overview` - company risk overview
- `/api/v1/analytics/by-department` - department breakdown
- `/api/v1/risk/scenario/{id}` - highest risk employees
- Risk scores with explainability ✅

**Missing**:
- Workforce distribution aggregation endpoint
- Recent simulations list endpoint
- Pagination helpers

---

### **Phishing Simulations** (Screens 10-16)
**Screen 10**: Simulations list
- Active Simulations count (2)
- Avg Resilience (74%)
- Risk Delta (-18.49)
- Simulation cards (status, participants, interaction rate)

**Screen 11**: Simulation detail page
- Success rate, Risk reduction
- Duration, Participants, Type
- Engagement Analytics (donut chart)
- Department Vulnerability Comparison

**Screens 12-16**: New Simulation Wizard
- **Step 1**: Target Segment selection (All Employees, Critical Risk Group, Finance, Executive)
- **Step 2**: Scenario Theme selection (Payroll Update, IT Token Sync, Admin Notice, Benefit Review)
- **Step 3**: AI Customization (Personalization, Tone, Language, Context Type)
- **Step 4**: Preview AI Content (3 variants, Save to Library, Regenerate)
- **Success**: Simulation Deployed confirmation

**Backend Status**: ⚠️ **PARTIALLY COVERED**

✅ **Have**:
- Simulation model in database
- Simulation results tracking
- Employee targeting (can query by risk score, department, seniority)
- Scenario model with categories

❌ **Missing**:
- Simulation CRUD endpoints
- Simulation launch/deploy endpoint
- Email engagement tracking (opens, clicks)
- Interaction analytics aggregation
- Simulation template library
- Variant generation storage

---

### **Employees Management** (Screens 19-27)
**Screen 19**: Employees list
- Search users
- Filter by role
- Employee table (name, email, dept & role, risk index, status)
- Pagination
- Bulk Import, Add Employee buttons

**Screen 20**: Employee detail / Workforce Risk Directory
- Risk Score gauge (84 - Critical)
- Risk Attribution spider chart (Phishing, Remote, Password, Policy, Social Eng)
- Risk Change Rate line graph over time
- Risk History Timeline (simulation results, activities)
- "Why is the score high?" factors list
- Assign Assessment, Schedule Targeted Drill buttons

**Screens 21-27**: Add/Edit Employee modals & dropdowns
- Department: Finance, Engineering, Sales, HR
- Role: Director, Manager, Individual, C-Level
- Gender: Male, Female, Other
- Language: English, Arabic

**Backend Status**: ✅ **MOSTLY COVERED**

✅ **Have**:
- Employee CRUD endpoints (`/api/v1/employees/`)
- Employee profile with all necessary fields
- Risk score calculation per employee-scenario
- Department, seniority (maps to Role), gender, languages

❌ **Missing**:
- Risk history timeline (need to track risk scores over time)
- Risk attribution spider chart data (need to break down risk by factor type)
- Risk change rate calculation (delta over time)
- "Why is the score high?" explanation generation (need to generate human-readable explanations)
- Bulk import CSV endpoint
- Employee activity/event tracking

---

### **Risk Assessment** (Screens 28-34)
**Screen 28**: Assessments list
- Assessment cards (name, status, participants, avg efficiency)
- Component Palette (drag-and-drop: Multiple Choice, True/False, Scenario Based, Short Text)
- View Sandbox button

**Screen 29**: Assessment detail
- Phase Progression (74%)
- Target Pool, Active Respondents, Sentiment Index
- Mission Completion donut chart
- Intelligence Heatmap by Dept

**Screens 30-33**: New Assessment Wizard
- **Step 1**: Identity (Title, Category, Priority, Description)
- **Step 2**: Target Audience (Global, Departmental, Risk Threshold, New Hires)
- **Step 3**: Question Architect (drag-and-drop question builder)
- **Step 4**: Deployment Strategy (time limit, randomize, pause/resume, anonymous)

**Screen 34**: Tone dropdown (Urgent, Formal, Friendly)

**Backend Status**: ❌ **MOSTLY MISSING**

✅ **Have**:
- Employee targeting (can query by dept, risk score, date joined)
- Basic questionnaire/survey structure (could extend employee model)

❌ **Missing**:
- Assessment/Survey models
- Assessment CRUD endpoints
- Question builder system
- Assessment deployment tracking
- Response collection
- Assessment results aggregation
- Sentiment analysis

**Note**: Assessment feature seems separate from core risk scoring - this is for **knowledge/awareness surveys**, not phishing simulations.

---

### **AI Scenario Lab** (Screens 35-36)
**Screen 35**: Scenario Generation Hub
- Generation Parameters:
  - Context Type (IT Alert, HQ Request, Payroll, Admin, Executive, Other)
  - Target Segment dropdown (Finance, etc.)
  - Personalization level (Generic, Department, Individual)
  - Tone (Urgent, Formal, Friendly)
  - Language (English, Arabic)
- Generate Scenario button
- Scenario Intelligence Preview panel
- Initialize Model button

**Screen 36**: Preview AI Content
- 3 variants of generated email
- Subject line, body with placeholders
- Readiness Optimization score (94%)
- Save to Library, Regenerate Variants buttons

**Backend Status**: ❌ **NOT IMPLEMENTED**

✅ **Have**:
- Scenario model structure
- Scenario categories (BEC, Credentials, Data, Malware)
- Language support

❌ **Missing**:
- LLM integration (OpenAI/Claude API)
- Prompt engineering for scenario generation
- Personalization engine
- Variant generation
- Template library storage
- Scenario testing/sandbox

**Note**: This is **Phase 4** in the original plan.

---

### **Risk Analytics / Reports** (Screen 37)
**Screen 37**: Reports page
- Risk Change Rate (-4.2 pts)
- Data Coverage (84%)
- Readiness Score (72/100)
- Training vs. Risk Incidents chart (dual-axis line graph over time)
- Vulnerability by Department (horizontal bars with +/- percentages)
- Export PDF button

**Backend Status**: ⚠️ **PARTIALLY COVERED**

✅ **Have**:
- Company risk overview
- Risk by department
- Basic analytics endpoints

❌ **Missing**:
- Time-series risk tracking (risk change over time)
- Training completion tracking
- Incident reporting/tracking
- Vulnerability trend calculation
- Report generation (PDF export)
- Advanced analytics aggregations

---

## 📊 Feature Completeness Matrix

| Feature Category | Frontend Screens | Backend Coverage | Gap | Priority |
|---|---|---|---|---|
| **Authentication** | 8 screens | 0% | 🔴 Complete auth system | P0 |
| **Dashboard** | 2 screens | 75% | 🟡 Aggregations, pagination | P1 |
| **Phishing Simulations** | 7 screens | 40% | 🔴 Simulation engine, tracking | P1 |
| **Employee Management** | 9 screens | 80% | 🟢 History, bulk import | P2 |
| **Risk Assessments** | 7 screens | 20% | 🔴 Complete assessment system | P3 |
| **AI Scenario Lab** | 2 screens | 10% | 🔴 LLM integration | P2 |
| **Analytics/Reports** | 1 screen | 50% | 🟡 Time-series, exports | P2 |

---

## 🔴 CRITICAL MISSING Backend Features

### **Priority 0 (Must Have Before Launch)**

1. **Authentication & Authorization**
   ```
   - User registration endpoint
   - Login endpoint (JWT)
   - Email verification system
   - Password reset flow
   - OAuth 2.0 support (optional)
   - Session management
   ```

2. **Simulation Management**
   ```
   - POST /api/v1/simulations/ (create simulation)
   - GET /api/v1/simulations/ (list simulations)
   - GET /api/v1/simulations/{id} (get simulation detail)
   - POST /api/v1/simulations/{id}/launch (deploy simulation)
   - GET /api/v1/simulations/{id}/results (engagement analytics)
   - PUT /api/v1/simulations/{id} (update simulation)
   ```

3. **Employee Bulk Import**
   ```
   - POST /api/v1/employees/bulk-import (CSV upload)
   - Validation & error reporting
   - Progress tracking
   ```

---

### **Priority 1 (Core Functionality)**

4. **Risk History Tracking**
   ```
   - Risk scores over time (time-series data)
   - Risk change rate calculation
   - Employee activity timeline
   - Historical risk queries
   ```

5. **Enhanced Analytics**
   ```
   - GET /api/v1/analytics/workforce-distribution
   - GET /api/v1/analytics/risk-trends (time-series)
   - GET /api/v1/analytics/top-risk-employees?limit=10
   - Pagination support for all list endpoints
   ```

6. **Simulation Engagement Tracking**
   ```
   - Email open tracking (pixel/webhook)
   - Link click tracking (redirect tracking)
   - Credential submission tracking
   - Report-as-phishing tracking
   - Real-time result aggregation
   ```

---

### **Priority 2 (Enhanced Features)**

7. **AI Scenario Generation**
   ```
   - LLM API integration (OpenAI/Claude)
   - POST /api/v1/scenarios/generate (with parameters)
   - Variant generation
   - Template library CRUD
   - Personalization engine
   ```

8. **Risk Assessment System**
   ```
   - Assessment model & CRUD endpoints
   - Question builder API
   - Assessment deployment
   - Response collection
   - Results aggregation
   ```

9. **Advanced Reporting**
   ```
   - GET /api/v1/reports/summary (executive summary)
   - GET /api/v1/reports/vulnerability-trends
   - POST /api/v1/reports/export-pdf
   - Training completion tracking
   - Incident tracking
   ```

---

### **Priority 3 (Nice to Have)**

10. **Real-time Features**
    ```
    - WebSocket support for live updates
    - Real-time simulation results
    - Live dashboard updates
    ```

11. **Advanced Integrations**
    ```
    - SCIM for user provisioning
    - SIEM integration for incident tracking
    - Slack/Teams notifications
    ```

---

## ✅ What Backend DOES Have (Well Covered)

### **Excellent Coverage**:

1. ✅ **Core Risk Scoring Engine**
   - Complete mathematical model
   - Deterministic, explainable, scenario-aware
   - Likelihood & Impact calculations
   - Full explainability breakdowns
   - All lookup tables configured

2. ✅ **Employee Profile Management**
   - CRUD operations
   - All required attributes (age, gender, languages, tech literacy, seniority, dept)
   - Soft delete (right to erasure)
   - Tenant isolation

3. ✅ **Risk Score Calculation**
   - Per employee-scenario calculation
   - Bulk calculation
   - Risk scores with full explainability
   - Risk band classification

4. ✅ **Database Schema**
   - Complete multi-tenant architecture
   - All necessary models
   - Audit logging
   - UAE compliance features

5. ✅ **Basic Analytics**
   - Company risk overview
   - Risk by department
   - Risk by seniority
   - Highest risk employees

---

## 🎯 Recommended Implementation Order

### **Phase 1: MVP (Weeks 1-2)**
**Goal**: Get basic platform working with manual simulation tracking

1. ✅ Authentication system (login, signup, JWT)
2. ✅ Employee bulk import (CSV)
3. ✅ Enhanced analytics endpoints (pagination, workforce distribution)
4. ✅ Risk history tracking (basic)
5. ✅ Simulation CRUD endpoints (without email sending)

**Outcome**: Users can log in, import employees, view risk scores, manually track simulations

---

### **Phase 2: Simulation Engine (Weeks 3-4)**
**Goal**: Automated simulation deployment and tracking

6. ✅ Email sending infrastructure (SMTP)
7. ✅ Link tracking system
8. ✅ Engagement tracking (opens, clicks, submissions)
9. ✅ Simulation results aggregation
10. ✅ Simulation deployment endpoint

**Outcome**: Full simulation workflow working end-to-end

---

### **Phase 3: AI & Advanced Features (Weeks 5-6)**
**Goal**: AI-powered scenario generation

11. ✅ LLM integration (OpenAI/Claude)
12. ✅ Scenario generation API
13. ✅ Template library
14. ✅ Advanced reporting (PDF export)

**Outcome**: AI Scenario Lab fully functional

---

### **Phase 4: Assessment System (Weeks 7-8)**
**Goal**: Knowledge assessment feature

15. ✅ Assessment models & CRUD
16. ✅ Question builder
17. ✅ Assessment deployment
18. ✅ Response collection
19. ✅ Results aggregation

**Outcome**: Complete risk assessment workflow

---

## 📝 Backend Additions Needed

### **Immediate (Before Frontend Integration)**

```python
# 1. Authentication endpoints
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
POST   /api/v1/auth/refresh-token

# 2. Enhanced employee endpoints
POST   /api/v1/employees/bulk-import
GET    /api/v1/employees/{id}/risk-history
GET    /api/v1/employees/{id}/timeline

# 3. Simulation endpoints
POST   /api/v1/simulations/
GET    /api/v1/simulations/
GET    /api/v1/simulations/{id}
POST   /api/v1/simulations/{id}/launch
GET    /api/v1/simulations/{id}/analytics
PUT    /api/v1/simulations/{id}
DELETE /api/v1/simulations/{id}

# 4. Enhanced analytics
GET    /api/v1/analytics/workforce-distribution
GET    /api/v1/analytics/risk-trends?period=30d
GET    /api/v1/analytics/top-risk?limit=10&scenario_id=
POST   /api/v1/analytics/export-pdf

# 5. Scenario generation (AI)
POST   /api/v1/ai/generate-scenario
POST   /api/v1/ai/generate-variants
GET    /api/v1/ai/templates
POST   /api/v1/ai/templates
```

---

## 🚀 Quick Start Checklist for Frontend Integration

### **Week 1: Authentication**
- [ ] Implement JWT authentication middleware
- [ ] Create user registration endpoint
- [ ] Create login endpoint
- [ ] Email verification system
- [ ] Password reset flow
- [ ] Test with Postman

### **Week 2: Core Data Endpoints**
- [ ] Add pagination to all list endpoints
- [ ] Employee bulk import (CSV parser)
- [ ] Workforce distribution aggregation
- [ ] Risk history tracking (store risk scores over time)
- [ ] Enhanced analytics endpoints

### **Week 3: Simulation System**
- [ ] Simulation CRUD endpoints
- [ ] Simulation deployment logic
- [ ] Target employee selection
- [ ] Template assignment
- [ ] Status tracking

### **Week 4: Engagement Tracking**
- [ ] SMTP email sending
- [ ] Link tracking system (unique URLs)
- [ ] Webhook for interaction events
- [ ] Results aggregation queries
- [ ] Real-time analytics

---

## 💡 Database Schema Additions Needed

```sql
-- Risk history tracking
CREATE TABLE risk_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    risk_score INTEGER NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email tracking
CREATE TABLE email_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_result_id UUID NOT NULL,
    tracking_token VARCHAR(255) UNIQUE NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip_address INET
);

-- Scenario templates
CREATE TABLE scenario_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    category scenario_category NOT NULL,
    language VARCHAR(10) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎨 Frontend Tech Stack Recommendation

Based on the Figma designs, here's the recommended stack:

```
Frontend:
- React 18 + Next.js 14 (App Router)
- TypeScript
- TailwindCSS (matches the design system)
- shadcn/ui (for components)
- Recharts (for charts - donut, line, bar, spider)
- React Query (for API data fetching)
- Zustand (for state management)
- React Hook Form + Zod (for forms)
- NextAuth.js (for authentication)

Build Tools:
- Vite or Next.js
- ESLint + Prettier
```

---

## ✅ Summary

### **What Backend Has:**
- ✅ Complete risk scoring engine (THE CORE)
- ✅ Employee management
- ✅ Basic analytics
- ✅ Database schema
- ✅ UAE compliance features
- ✅ Multi-tenant architecture
- ✅ Audit logging

### **What Backend Needs:**
- ❌ Authentication system (P0 - critical)
- ❌ Simulation management (P1 - high)
- ❌ Engagement tracking (P1 - high)
- ❌ Risk history/trends (P1 - high)
- ❌ Bulk import (P1 - high)
- ❌ AI scenario generation (P2 - medium)
- ❌ Assessment system (P3 - low)
- ❌ Advanced reporting (P2 - medium)

### **Estimated Backend Work:**
- **MVP (Core functionality)**: 2-3 weeks
- **Complete simulation system**: 4-5 weeks
- **AI integration**: 1-2 weeks
- **Assessment system**: 2-3 weeks
- **Total**: ~10-12 weeks for full feature parity

### **Frontend Work Estimate:**
- **Authentication pages**: 1 week
- **Dashboard**: 2 weeks
- **Simulations (all flows)**: 3 weeks
- **Employees**: 2 weeks
- **Assessments**: 2 weeks
- **AI Scenario Lab**: 1 week
- **Analytics**: 1 week
- **Total**: ~12-14 weeks

---

## 🎯 Recommended Next Steps

1. **Implement Authentication** (Week 1) - Critical blocker
2. **Build MVP endpoints** (Week 2) - Get basic platform working
3. **Start Frontend Development in Parallel** (Week 2+)
4. **Implement Simulation Engine** (Weeks 3-4)
5. **Add AI Integration** (Weeks 5-6)
6. **Complete Assessment System** (Weeks 7-8)

**The risk engine is solid. The foundation is strong. Now we build the layers!** 🚀
