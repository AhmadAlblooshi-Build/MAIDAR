# Simulation Management System

Complete phishing simulation engine with scenario management, campaign creation, email tracking, and results processing.

## Features

✅ **Scenario Management** - Create and manage phishing scenarios
✅ **Simulation Campaigns** - Target employees with phishing emails
✅ **Email Tracking** - Track opens, clicks, and credential submissions
✅ **Results Processing** - Record and analyze employee responses
✅ **Statistics & Analytics** - Engagement metrics and risk insights
✅ **Multi-Language Support** - Scenarios in English, Arabic, etc.
✅ **Difficulty Levels** - Easy, medium, and hard scenarios
✅ **Scheduling** - Launch immediately or schedule for later
✅ **Risk Classification** - Categorize employees by engagement level

---

## Architecture

### Two Main Components

#### 1. Scenarios (Templates)
Reusable phishing email templates with:
- Email content (subject, body HTML/text)
- Sender information
- Category (BEC, CREDENTIALS, DATA, MALWARE)
- Language and difficulty
- Tracking capabilities (links, attachments, credential forms)

#### 2. Simulations (Campaigns)
Actual phishing campaigns that:
- Use a scenario template
- Target specific employees
- Track engagement (opens, clicks, submissions)
- Generate statistics and reports
- Calculate risk scores

---

## API Endpoints

### Scenario Management (6 endpoints)

#### 1. Create Scenario

**POST** `/api/v1/scenarios/`

Create a new phishing scenario template.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "name": "Fake Password Reset",
  "description": "Password reset phishing attempt",
  "category": "CREDENTIALS",
  "language": "en",
  "difficulty": "medium",
  "email_subject": "Urgent: Reset Your Password",
  "email_body_html": "<html>...</html>",
  "email_body_text": "Click here to reset...",
  "sender_name": "IT Support",
  "sender_email": "support@company-help.com",
  "has_link": true,
  "has_attachment": false,
  "has_credential_form": true,
  "tags": ["password", "urgent"],
  "is_active": true
}
```

**Response:** `201 Created`

---

#### 2. Get Scenario

**GET** `/api/v1/scenarios/{scenario_id}`

Get scenario by ID.

**Requires:** Authentication

---

#### 3. Update Scenario

**PUT** `/api/v1/scenarios/{scenario_id}`

Update scenario (all fields optional).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

---

#### 4. Delete Scenario

**DELETE** `/api/v1/scenarios/{scenario_id}`

Delete scenario (only if not used in simulations, otherwise deactivate).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

---

#### 5. Search Scenarios

**POST** `/api/v1/scenarios/search`

Search and filter scenarios.

**Request Body:**
```json
{
  "query": "password",
  "category": "CREDENTIALS",
  "language": "en",
  "difficulty": "medium",
  "is_active": true,
  "tags": ["urgent"],
  "page": 1,
  "page_size": 50,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

---

#### 6. Get Scenario Statistics

**GET** `/api/v1/scenarios/statistics`

Get scenario statistics for current tenant.

**Response:**
```json
{
  "total_scenarios": 25,
  "by_category": {
    "BEC": 8,
    "CREDENTIALS": 10,
    "DATA": 4,
    "MALWARE": 3
  },
  "by_language": {
    "en": 15,
    "ar": 10
  },
  "by_difficulty": {
    "easy": 8,
    "medium": 12,
    "hard": 5
  },
  "active_scenarios": 23,
  "with_links": 20,
  "with_attachments": 5,
  "with_credential_forms": 12
}
```

---

### Simulation Management (7 endpoints)

#### 1. Create Simulation

**POST** `/api/v1/simulations/`

Create a new simulation campaign.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "name": "Q1 2024 Security Awareness",
  "description": "Quarterly phishing simulation",
  "scenario_id": "scenario-uuid",
  "target_employee_ids": [
    "employee-uuid-1",
    "employee-uuid-2",
    "employee-uuid-3"
  ],
  "scheduled_at": null,
  "send_immediately": true,
  "track_opens": true,
  "track_clicks": true,
  "track_credentials": true
}
```

**Response:** `201 Created`
```json
{
  "id": "simulation-uuid",
  "tenant_id": "tenant-uuid",
  "name": "Q1 2024 Security Awareness",
  "description": "Quarterly phishing simulation",
  "scenario_id": "scenario-uuid",
  "scenario_name": "Fake Password Reset",
  "status": "in_progress",
  "total_targets": 3,
  "scheduled_at": null,
  "sent_at": "2024-01-15T10:00:00Z",
  "completed_at": null,
  "send_immediately": true,
  "track_opens": true,
  "track_clicks": true,
  "track_credentials": true,
  "created_by": "user-uuid",
  "created_at": "2024-01-15T09:55:00Z",
  "updated_at": "2024-01-15T09:55:00Z"
}
```

---

#### 2. Get Simulation

**GET** `/api/v1/simulations/{simulation_id}`

Get simulation by ID.

**Requires:** Authentication

---

#### 3. Update Simulation

**PUT** `/api/v1/simulations/{simulation_id}`

Update simulation (limited fields, only for draft/scheduled).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

---

#### 4. Delete/Cancel Simulation

**DELETE** `/api/v1/simulations/{simulation_id}`

Delete draft simulation or cancel running/scheduled simulation.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

---

#### 5. Search Simulations

**POST** `/api/v1/simulations/search`

Search and filter simulations.

**Request Body:**
```json
{
  "query": "Q1",
  "status": "completed",
  "scenario_id": "scenario-uuid",
  "created_by": "user-uuid",
  "page": 1,
  "page_size": 50,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

---

#### 6. Launch Simulation

**POST** `/api/v1/simulations/{simulation_id}/launch`

Launch a simulation (send emails).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "simulation_id": "simulation-uuid",
  "send_immediately": true,
  "scheduled_at": null
}
```

**Response:**
```json
{
  "simulation_id": "simulation-uuid",
  "status": "in_progress",
  "message": "Simulation launched successfully",
  "emails_to_send": 100,
  "scheduled_at": null
}
```

---

#### 7. Track Email Event

**POST** `/api/v1/simulations/{simulation_id}/track`

Track email engagement event (open, click, submit).

**Public endpoint** (no authentication required) - uses unique tracking tokens.

**Request Body:**
```json
{
  "simulation_id": "simulation-uuid",
  "employee_id": "employee-uuid",
  "event_type": "click",
  "timestamp": "2024-01-15T10:05:00Z"
}
```

**Event Types:**
- `open` - Email opened
- `click` - Link clicked
- `submit` - Credentials submitted

**Response:** `204 No Content`

---

### Results & Analytics (2 endpoints)

#### 1. Get Simulation Results

**GET** `/api/v1/simulations/{simulation_id}/results`

Get detailed results for all employees in simulation.

**Requires:** Authentication

**Query Parameters:**
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 50)

**Response:**
```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "results": [
    {
      "id": "result-uuid",
      "tenant_id": "tenant-uuid",
      "simulation_id": "simulation-uuid",
      "employee_id": "employee-uuid",
      "employee_name": "John Doe",
      "employee_email": "john@company.com",
      "email_sent": true,
      "email_sent_at": "2024-01-15T10:00:00Z",
      "email_opened": true,
      "email_opened_at": "2024-01-15T10:05:00Z",
      "link_clicked": true,
      "link_clicked_at": "2024-01-15T10:06:00Z",
      "credentials_submitted": false,
      "credentials_submitted_at": null,
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.100",
      "time_to_open": 300,
      "time_to_click": 360,
      "time_to_submit": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:06:00Z"
    }
  ]
}
```

---

#### 2. Get Simulation Statistics

**GET** `/api/v1/simulations/{simulation_id}/statistics`

Get engagement statistics and metrics.

**Requires:** Authentication

**Response:**
```json
{
  "simulation_id": "simulation-uuid",
  "simulation_name": "Q1 2024 Security Awareness",
  "total_targets": 100,
  "emails_sent": 100,
  "emails_opened": 65,
  "links_clicked": 35,
  "credentials_submitted": 12,
  "open_rate": 65.0,
  "click_rate": 35.0,
  "submission_rate": 12.0,
  "avg_time_to_open": 450.5,
  "avg_time_to_click": 780.2,
  "avg_time_to_submit": 1200.8,
  "high_risk_employees": 35,
  "medium_risk_employees": 30,
  "low_risk_employees": 35
}
```

---

## Scenario Categories

### Four Main Categories (aligned with risk engine)

#### 1. BEC (Business Email Compromise)
**Alpha = 0.70** (highest seniority impact)

Executive-targeted attacks:
- Fake CEO requests
- Wire transfer scams
- Urgent financial requests
- C-level impersonation

**Example:**
```
Subject: URGENT: Wire Transfer Needed
From: CEO <ceo@company-corp.com>

I'm in a meeting and need you to process an urgent
wire transfer immediately. Reply ASAP.
```

---

#### 2. CREDENTIALS (Credential Harvesting)
**Alpha = 0.20** (lowest seniority impact)

Password/login theft attempts:
- Fake password resets
- Account verification
- Login page clones
- Multi-factor bypass

**Example:**
```
Subject: Reset Your Password
From: IT Support <support@company-help.com>

Your password will expire in 24 hours.
Click here to reset: [link]
```

---

#### 3. DATA (Data Exfiltration)
**Alpha = 0.30**

Sensitive data theft:
- Fake file sharing
- Document requests
- Cloud storage scams
- Survey/form submissions

**Example:**
```
Subject: Share Q4 Financial Reports
From: External Auditor <audit@legit-firm.com>

Please upload the Q4 financial reports to this
secure portal: [link]
```

---

#### 4. MALWARE (Malware Delivery)
**Alpha = 0.40**

Malicious attachment/link:
- Fake invoices
- Malicious documents
- Software updates
- Package delivery notifications

**Example:**
```
Subject: Invoice #12345
From: Vendor <billing@vendor-company.com>

Please review the attached invoice and process payment.
[attachment: invoice.pdf]
```

---

## Difficulty Levels

### Easy
- Obvious red flags
- Suspicious sender domains
- Poor grammar/spelling
- Generic greetings

**Example Indicators:**
- "support@company-help123.com"
- "Dear Customer" instead of name
- Multiple typos
- Urgent threats

---

### Medium
- Believable sender
- Decent grammar
- Some personalization
- Legitimate-looking branding

**Example Indicators:**
- "support@company.net" (close to real)
- Uses employee's name
- Company logo included
- Plausible scenario

---

### Hard
- Perfect impersonation
- Correct sender domain (spoofed)
- Personalized content
- Professional formatting
- Context-aware

**Example Indicators:**
- "ceo@company.com" (actual domain, spoofed)
- References recent company events
- Perfect grammar and branding
- Highly targeted

---

## Email Tracking Implementation

### How Tracking Works

#### 1. Email Open Tracking
**Method:** Invisible 1x1 pixel image

```html
<img src="https://maidar.com/api/v1/simulations/{sim_id}/track?
  employee={emp_id}&
  event=open&
  token={unique_token}"
  width="1" height="1" />
```

When employee opens email → image loads → tracking endpoint called

---

#### 2. Link Click Tracking
**Method:** Redirect URL

```html
<a href="https://maidar.com/api/v1/simulations/{sim_id}/track?
  employee={emp_id}&
  event=click&
  token={unique_token}&
  redirect=https://fake-site.com">
  Reset Password
</a>
```

When employee clicks → tracking endpoint called → redirects to fake site

---

#### 3. Credential Submission Tracking
**Method:** Form POST to tracking endpoint

```html
<form action="https://maidar.com/api/v1/simulations/{sim_id}/track"
      method="POST">
  <input type="hidden" name="employee_id" value="{emp_id}">
  <input type="hidden" name="event_type" value="submit">
  <input type="text" name="username">
  <input type="password" name="password">
  <button>Login</button>
</form>
```

When employee submits → tracking endpoint called → shows awareness page

---

## Simulation Lifecycle

### Status Flow

```
DRAFT
  ↓ (launch immediately)
IN_PROGRESS
  ↓ (all results collected)
COMPLETED

OR

DRAFT
  ↓ (schedule for later)
SCHEDULED
  ↓ (scheduled time reached)
IN_PROGRESS
  ↓ (all results collected)
COMPLETED

OR

DRAFT/SCHEDULED/IN_PROGRESS
  ↓ (cancel)
CANCELLED
```

---

### Complete Flow Example

1. **Create Scenario** (admin)
   ```
   POST /api/v1/scenarios/
   → Scenario ID: abc-123
   ```

2. **Create Simulation** (admin)
   ```
   POST /api/v1/simulations/
   {
     "scenario_id": "abc-123",
     "target_employee_ids": ["emp-1", "emp-2"],
     "send_immediately": false
   }
   → Simulation ID: sim-456
   → Status: DRAFT
   ```

3. **Launch Simulation** (admin)
   ```
   POST /api/v1/simulations/sim-456/launch
   {
     "send_immediately": true
   }
   → Status: IN_PROGRESS
   → Emails sent to emp-1, emp-2
   ```

4. **Employee Opens Email** (emp-1)
   ```
   Pixel loads →
   POST /api/v1/simulations/sim-456/track
   {
     "employee_id": "emp-1",
     "event_type": "open"
   }
   → Result updated: email_opened = true
   ```

5. **Employee Clicks Link** (emp-1)
   ```
   Link clicked →
   POST /api/v1/simulations/sim-456/track
   {
     "employee_id": "emp-1",
     "event_type": "click"
   }
   → Result updated: link_clicked = true
   ```

6. **View Statistics** (admin)
   ```
   GET /api/v1/simulations/sim-456/statistics
   → open_rate: 50%, click_rate: 50%
   ```

7. **Complete Simulation**
   ```
   After 7 days, no more activity →
   Status automatically changes to COMPLETED
   ```

---

## Risk Classification

Based on engagement level:

### High Risk (Red)
- Clicked link OR
- Submitted credentials

**Actions:**
- Mandatory security training
- Increased monitoring
- Update risk score

---

### Medium Risk (Yellow)
- Opened email
- Did NOT click link

**Actions:**
- Recommended training
- Send awareness tips
- Monitor future behavior

---

### Low Risk (Green)
- Did NOT open email

**Actions:**
- Continue monitoring
- Recognition/praise
- Maintain vigilance

---

## Integration with Risk Engine

### Risk Score Update Flow

1. **Simulation completes**
2. **For each employee result:**
   ```python
   if credentials_submitted:
       risk_multiplier = 1.5
   elif link_clicked:
       risk_multiplier = 1.3
   elif email_opened:
       risk_multiplier = 1.1
   else:
       risk_multiplier = 0.9  # Reward

   new_risk_score = old_risk_score * risk_multiplier
   ```

3. **Save updated risk score**
4. **Trigger re-assessment if needed**

---

## Multi-Language Support

### Supported Languages

| Code | Language | Scenarios Available |
|------|----------|-------------------|
| `en` | English | ✅ Full library |
| `ar` | Arabic | ✅ Full library |
| `fr` | French | ⏳ Coming soon |
| `es` | Spanish | ⏳ Coming soon |

### Language Matching

System automatically matches scenarios to employee languages:
```
Employee languages: ["ar", "en"]
→ Can receive scenarios in Arabic or English
→ Prioritizes primary language (first in list)
```

---

## Best Practices

### Creating Effective Scenarios

1. **Start with Easy**
   - Build employee confidence
   - Establish baseline awareness

2. **Gradually Increase Difficulty**
   - Medium → Hard over 3-6 months
   - Track improvement trends

3. **Vary Categories**
   - Don't just test CREDENTIALS
   - Rotate through all 4 categories

4. **Localize Content**
   - Use local context (company events, holidays)
   - Match language and culture

5. **Make it Realistic**
   - Use actual company scenarios
   - Reference real departments
   - Timing matters (tax season, holidays)

---

### Running Simulations

1. **Target Appropriately**
   - Don't target entire company at once
   - Segment by department/seniority
   - Rotate targets fairly

2. **Schedule Wisely**
   - Avoid holidays and major events
   - Business hours for realism
   - Spread out over time

3. **Monitor Results**
   - Check statistics regularly
   - Identify trends
   - Provide feedback

4. **Follow Up**
   - Send awareness tips to clickers
   - Praise non-clickers
   - Provide targeted training

---

## Frontend Integration

### Create and Launch Simulation

```javascript
// 1. Select scenario
const scenario_id = "abc-123";

// 2. Select employees
const target_employees = ["emp-1", "emp-2", "emp-3"];

// 3. Create simulation
const simulation = await fetch('/api/v1/simulations/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Q1 Security Test",
    scenario_id: scenario_id,
    target_employee_ids: target_employees,
    send_immediately: true,
    track_opens: true,
    track_clicks: true,
    track_credentials: true
  })
});

// 4. Launch immediately
const launch = await fetch(`/api/v1/simulations/${simulation.id}/launch`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    simulation_id: simulation.id,
    send_immediately: true
  })
});

// 5. Monitor results
const stats = await fetch(`/api/v1/simulations/${simulation.id}/statistics`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Security Considerations

### Tracking Privacy

- **Anonymous to employees:** Tracking tokens are unique and non-guessable
- **No PII in URLs:** Only UUIDs, no names or emails
- **Secure storage:** All results encrypted in database
- **Access control:** Only admins can view results

### Email Safety

- **No actual malware:** All "malicious" content is simulated
- **Educational page:** After engagement, show learning content
- **No real damage:** Links lead to awareness pages, not real phishing sites
- **Opt-out available:** Comply with local regulations

### UAE PDPL Compliance

- **Consent:** Users informed about security testing
- **Purpose limitation:** Data used only for security training
- **Data minimization:** Only track necessary engagement metrics
- **Right to erasure:** Users can request result deletion
- **Audit trail:** All simulation activities logged

---

## Testing

### Manual Testing

**Create Scenario:**
```bash
curl -X POST http://localhost:8000/api/v1/scenarios/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @scenario.json
```

**Create Simulation:**
```bash
curl -X POST http://localhost:8000/api/v1/simulations/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @simulation.json
```

**Launch Simulation:**
```bash
curl -X POST http://localhost:8000/api/v1/simulations/{id}/launch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"simulation_id":"sim-123","send_immediately":true}'
```

---

## Next Steps

After simulation management:

1. **AI Scenario Generator** (Phase 3.5)
   - Use LLM to generate realistic scenarios
   - Personalize based on employee profile
   - Multi-language generation

2. **Advanced Analytics** (Phase 4)
   - Trend analysis over time
   - Department comparisons
   - Predictive risk modeling
   - PDF report generation

3. **Frontend** (Phase 5)
   - Scenario builder UI
   - Simulation dashboard
   - Results visualization
   - Employee awareness portal

---

## Support

- **API Documentation:** http://localhost:8000/docs
- **Quick Start:** See `AUTH_QUICK_START.md` for authentication
- **Employee Management:** See `EMPLOYEE_MANAGEMENT.md`
