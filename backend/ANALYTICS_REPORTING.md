# Analytics & Reporting System

Advanced analytics, trend analysis, executive reporting, and data export capabilities.

## Features

✅ **Risk Trend Analysis** - Track risk score changes over time
✅ **Department Comparison** - Identify high-risk departments
✅ **Seniority Analysis** - Compare vulnerability by level
✅ **Vulnerability Heatmaps** - Category × Seniority risk matrix
✅ **Top Vulnerable Employees** - Prioritize training efforts
✅ **Risk Distribution** - Statistical analysis of risk scores
✅ **Simulation Effectiveness** - Measure campaign success
✅ **Training Effectiveness** - Track improvement after training
✅ **Executive Summaries** - Leadership-ready reports
✅ **Data Export** - CSV/JSON export for all data types
✅ **Compliance Reporting** - UAE PDPL compliance status

---

## API Endpoints

Base URL: `/api/v1/analytics`

### 1. Risk Trend Analysis

**POST** `/api/v1/analytics/risk-trends`

Analyze how risk scores have changed over time.

**Requires:** Authentication

**Request Body:**
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-03-31"
}
```

**Response:**
```json
{
  "tenant_id": "tenant-uuid",
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  },
  "overall_risk_trend": [
    {"date": "2024-01-01", "value": 55.2},
    {"date": "2024-01-02", "value": 54.8},
    {"date": "2024-01-03", "value": 54.5}
  ],
  "average_risk_score": 52.3,
  "risk_change_percentage": -5.2,
  "risk_by_category": {
    "BEC": [...],
    "CREDENTIALS": [...],
    "DATA": [...],
    "MALWARE": [...]
  },
  "risk_by_department": {
    "IT": [...],
    "Finance": [...],
    "HR": [...]
  },
  "risk_by_seniority": {
    "junior": [...],
    "mid": [...],
    "senior": [...],
    "executive": [...],
    "c_level": [...]
  }
}
```

**Use Cases:**
- Dashboard time-series charts
- Identify risk trends (improving/declining)
- Track effectiveness of security initiatives
- Monthly/quarterly reports

---

### 2. Department Comparison

**GET** `/api/v1/analytics/department-comparison`

Compare risk levels across all departments.

**Requires:** Authentication

**Response:**
```json
{
  "total_departments": 5,
  "departments": [
    {
      "department": "Finance",
      "total_employees": 25,
      "average_risk_score": 68.5,
      "high_risk_count": 12,
      "medium_risk_count": 10,
      "low_risk_count": 3,
      "recent_simulations": 3,
      "average_click_rate": 42.5,
      "average_submission_rate": 18.2,
      "risk_trend": "declining",
      "risk_rank": 1
    },
    {
      "department": "IT",
      "total_employees": 40,
      "average_risk_score": 35.2,
      "high_risk_count": 2,
      "medium_risk_count": 15,
      "low_risk_count": 23,
      "recent_simulations": 5,
      "average_click_rate": 15.3,
      "average_submission_rate": 3.5,
      "risk_trend": "improving",
      "risk_rank": 5
    }
  ],
  "highest_risk_department": "Finance",
  "lowest_risk_department": "IT",
  "average_risk_all_departments": 48.7
}
```

**Use Cases:**
- Prioritize departmental training
- Allocate security resources
- Executive dashboards
- Budget justification

---

### 3. Seniority Comparison

**GET** `/api/v1/analytics/seniority-comparison`

Compare vulnerability across seniority levels.

**Requires:** Authentication

**Response:**
```json
{
  "seniority_levels": [
    {
      "seniority": "c_level",
      "total_employees": 5,
      "average_risk_score": 72.3,
      "high_risk_count": 4,
      "average_click_rate": 45.0,
      "average_submission_rate": 20.0,
      "most_vulnerable_to": "BEC"
    },
    {
      "seniority": "junior",
      "total_employees": 50,
      "average_risk_score": 42.1,
      "high_risk_count": 8,
      "average_click_rate": 28.5,
      "average_submission_rate": 12.3,
      "most_vulnerable_to": "CREDENTIALS"
    }
  ],
  "highest_risk_seniority": "c_level",
  "lowest_risk_seniority": "junior"
}
```

**Insights:**
- C-level typically highest risk for BEC
- Junior staff typically highest risk for CREDENTIALS
- Design targeted training by seniority

---

### 4. Top Vulnerable Employees

**GET** `/api/v1/analytics/top-vulnerable?limit=10`

Get list of most vulnerable employees.

**Requires:** Authentication

**Query Parameters:**
- `limit` - Number of employees to return (default: 10)

**Response:**
```json
{
  "total_employees": 150,
  "employees": [
    {
      "employee_id": "emp-uuid",
      "employee_name": "John Doe",
      "department": "Finance",
      "seniority": "executive",
      "current_risk_score": 85.5,
      "risk_band": "CRITICAL",
      "risk_history": [
        {"date": "2024-01-01", "value": 78.0},
        {"date": "2024-02-01", "value": 82.5},
        {"date": "2024-03-01", "value": 85.5}
      ],
      "risk_trend": "declining",
      "simulations_received": 5,
      "emails_opened": 5,
      "links_clicked": 3,
      "credentials_submitted": 1,
      "open_rate": 100.0,
      "click_rate": 60.0,
      "submission_rate": 20.0,
      "most_vulnerable_category": "BEC",
      "least_vulnerable_category": "MALWARE",
      "training_recommended": true,
      "priority_level": "high"
    }
  ]
}
```

**Use Cases:**
- Prioritize 1-on-1 training
- Targeted phishing simulations
- Monitor improvement
- Intervention planning

---

### 5. Risk Distribution

**GET** `/api/v1/analytics/risk-distribution`

Get statistical distribution of risk scores.

**Requires:** Authentication

**Response:**
```json
{
  "total_employees": 200,
  "critical_count": 15,
  "high_count": 45,
  "medium_count": 80,
  "low_count": 60,
  "critical_percentage": 7.5,
  "high_percentage": 22.5,
  "medium_percentage": 40.0,
  "low_percentage": 30.0,
  "mean_risk_score": 48.3,
  "median_risk_score": 45.0,
  "std_deviation": 18.7
}
```

**Use Cases:**
- Overall security posture
- Distribution charts (pie, bar)
- Benchmarking
- Goal setting

---

### 6. Executive Summary

**GET** `/api/v1/analytics/executive-summary?start_date=2024-01-01&end_date=2024-03-31`

Generate executive summary report.

**Requires:** Authentication

**Query Parameters:**
- `start_date` - Start date (optional, defaults to 30 days ago)
- `end_date` - End date (optional, defaults to today)

**Response:**
```json
{
  "tenant_name": "Acme Corporation",
  "report_date": "2024-03-31",
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  },
  "total_employees": 200,
  "total_simulations": 12,
  "average_risk_score": 48.5,
  "risk_trend": "improving",
  "critical_risk_employees": 15,
  "high_risk_employees": 45,
  "medium_risk_employees": 80,
  "low_risk_employees": 60,
  "average_open_rate": 65.5,
  "average_click_rate": 32.8,
  "average_submission_rate": 12.4,
  "most_vulnerable_department": "Finance",
  "most_vulnerable_category": "BEC",
  "key_findings": [
    "Average risk score: 48.5/100",
    "15 employees in CRITICAL risk band",
    "32.8% click rate on phishing simulations",
    "Finance department shows highest risk"
  ],
  "immediate_actions": [
    "Provide immediate training to 15 critical-risk employees",
    "Implement targeted phishing awareness campaign",
    "Review and strengthen password policies"
  ],
  "long_term_recommendations": [
    "Implement regular quarterly phishing simulations",
    "Develop department-specific security training programs",
    "Establish security champion program in high-risk departments"
  ],
  "compliance_status": "compliant",
  "compliance_notes": [
    "All UAE PDPL requirements met",
    "Regular audits conducted"
  ]
}
```

**Use Cases:**
- Board presentations
- Leadership briefings
- Quarterly business reviews
- Budget requests

---

### 7. Data Export

**POST** `/api/v1/analytics/export`

Export data to CSV or JSON.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "export_type": "employees",
  "format": "csv",
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  },
  "include_deleted": false,
  "include_sensitive_data": false
}
```

**Export Types:**
- `employees` - Employee data
- `simulations` - Simulation campaigns
- `scenarios` - Phishing scenarios
- `risk_scores` - All risk scores
- `audit_logs` - Audit trail
- `all` - Complete data dump

**Response:**
```json
{
  "export_id": "export-uuid",
  "export_type": "employees",
  "format": "csv",
  "status": "completed",
  "download_url": "/api/v1/analytics/download/export-uuid",
  "record_count": 200,
  "file_size_bytes": 52480,
  "expires_at": "2024-04-07T00:00:00Z"
}
```

**Use Cases:**
- Data backup
- Compliance audits
- Integration with other systems
- Custom analysis in Excel/BI tools

---

## Analytics Use Cases

### 1. Monthly Security Review

**Dashboard Metrics:**
```
GET /api/v1/analytics/executive-summary
GET /api/v1/analytics/risk-distribution
GET /api/v1/analytics/department-comparison
```

**Output:** Executive dashboard showing:
- Overall risk posture
- Department comparisons
- Key findings and actions
- Trend indicators

---

### 2. Targeted Training Program

**Identify Vulnerable Employees:**
```
GET /api/v1/analytics/top-vulnerable?limit=20
GET /api/v1/analytics/seniority-comparison
```

**Output:** Training list with:
- Top 20 vulnerable employees
- Specific vulnerabilities by category
- Recommended training priority
- Department and seniority targeting

---

### 3. Quarterly Board Report

**Generate Report:**
```
GET /api/v1/analytics/executive-summary?start_date=2024-01-01&end_date=2024-03-31
POST /api/v1/analytics/risk-trends
GET /api/v1/analytics/department-comparison
```

**Output:** Board-ready presentation with:
- 90-day trend analysis
- Department risk rankings
- Key achievements
- Budget recommendations

---

### 4. Training Effectiveness Measurement

**Before/After Analysis:**
```
# Before training
POST /api/v1/analytics/risk-trends (Jan-Feb)

# After training
POST /api/v1/analytics/risk-trends (Mar-Apr)

# Compare metrics
- Risk score reduction
- Click rate improvement
- Submission rate reduction
```

**Output:** ROI analysis for training programs

---

### 5. Compliance Audit

**Export All Data:**
```
POST /api/v1/analytics/export
{
  "export_type": "all",
  "format": "csv",
  "include_deleted": true
}
```

**Output:** Complete data package for auditors

---

## Statistical Analysis

### Risk Score Distribution

**Normal Distribution Expected:**
```
Mean: ~50
Median: ~50
Std Dev: ~20

Distribution:
- Critical (80-100): ~5%
- High (60-79): ~20%
- Medium (40-59): ~50%
- Low (0-39): ~25%
```

**Warning Signs:**
- Mean > 60: Organization-wide training needed
- Critical > 10%: Immediate intervention required
- Std Dev > 25: Inconsistent security awareness

---

### Trend Analysis

**Risk Change Interpretation:**

| Change % | Meaning | Action |
|----------|---------|--------|
| < -10% | Significant improvement | Continue program |
| -5% to -10% | Good progress | Maintain efforts |
| -5% to +5% | Stable | Assess effectiveness |
| +5% to +10% | Concerning trend | Increase training |
| > +10% | Critical decline | Immediate action |

---

### Simulation Effectiveness

**Benchmark Metrics:**

| Metric | Good | Average | Needs Improvement |
|--------|------|---------|-------------------|
| Open Rate | < 40% | 40-60% | > 60% |
| Click Rate | < 20% | 20-35% | > 35% |
| Submit Rate | < 5% | 5-15% | > 15% |

**Calculation:**
```python
effectiveness_score = (
    (100 - open_rate) * 0.3 +
    (100 - click_rate) * 0.4 +
    (100 - submit_rate) * 0.3
)

Rating:
- 80-100: Excellent
- 60-79: Good
- 40-59: Average
- < 40: Poor
```

---

## Visualization Recommendations

### Dashboard Widgets

1. **Risk Trend Line Chart**
   - X-axis: Date
   - Y-axis: Average Risk Score
   - Lines: Overall, by department, by category
   - Time range selector: 7d, 30d, 90d, 1y

2. **Risk Distribution Pie Chart**
   - Segments: Critical, High, Medium, Low
   - Colors: Red, Orange, Yellow, Green
   - Center: Total employees

3. **Department Comparison Bar Chart**
   - X-axis: Departments
   - Y-axis: Average Risk Score
   - Sorted: Highest to lowest
   - Color gradient: Risk-based

4. **Vulnerability Heatmap**
   - X-axis: Scenario categories
   - Y-axis: Seniority levels
   - Colors: Green (low) to Red (high)
   - Tooltips: Exact scores

5. **Simulation Performance Table**
   - Columns: Name, Date, Targets, Open%, Click%, Submit%
   - Sortable by any column
   - Color-coded rates

---

## Integration with Risk Engine

### Risk Score Updates

After simulation completes:
```python
# Get simulation results
results = get_simulation_results(simulation_id)

# For each employee
for result in results:
    # Calculate engagement multiplier
    if result.credentials_submitted:
        multiplier = 1.5  # +50%
    elif result.link_clicked:
        multiplier = 1.3  # +30%
    elif result.email_opened:
        multiplier = 1.1  # +10%
    else:
        multiplier = 0.9  # -10% (reward)

    # Update risk score
    base_risk = calculate_base_risk(employee, scenario)
    new_risk = base_risk * multiplier

    # Save new risk score
    save_risk_score(
        employee_id=employee.id,
        scenario_id=scenario.id,
        risk_score=new_risk,
        engagement_data=result
    )

# Trigger analytics update
refresh_analytics_cache()
```

---

## Performance Optimization

### Caching Strategy

**Cache Duration:**
- Executive summary: 1 hour
- Department comparison: 30 minutes
- Risk trends: 1 hour
- Top vulnerable: 15 minutes
- Risk distribution: 30 minutes

**Cache Invalidation:**
- New simulation completed
- Risk scores updated
- Employee data changed
- Manual refresh requested

### Query Optimization

**Indexes Required:**
```sql
-- Risk scores
CREATE INDEX idx_risk_scores_tenant_date ON risk_scores(tenant_id, created_at);
CREATE INDEX idx_risk_scores_employee ON risk_scores(employee_id);

-- Simulation results
CREATE INDEX idx_sim_results_simulation ON simulation_results(simulation_id);
CREATE INDEX idx_sim_results_employee ON simulation_results(employee_id);

-- Employees
CREATE INDEX idx_employees_tenant_dept ON employees(tenant_id, department);
CREATE INDEX idx_employees_tenant_seniority ON employees(tenant_id, seniority);
```

---

## UAE PDPL Compliance Reporting

### Compliance Checklist

✅ **Data Minimization**
- Only collect risk-relevant data
- No unnecessary PII

✅ **Purpose Limitation**
- Data used only for security training
- Clear purpose documented

✅ **Access Control**
- Role-based permissions
- Audit trail of access

✅ **Data Security**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Regular security audits

✅ **Right to Access**
- Employees can request their data
- Data provided within 30 days

✅ **Right to Erasure**
- Soft delete with recovery option
- Hard delete on request

✅ **Data Retention**
- Risk scores: 2 years
- Simulation results: 1 year
- Audit logs: 3 years

✅ **Breach Notification**
- Incident response plan
- 72-hour notification requirement

---

## Frontend Integration

### React/Next.js Examples

**Fetch Risk Trends:**
```javascript
const fetchRiskTrends = async (startDate, endDate) => {
  const response = await fetch('/api/v1/analytics/risk-trends', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate
    })
  });

  return await response.json();
};

// Usage in dashboard
const RiskTrendChart = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchRiskTrends('2024-01-01', '2024-03-31')
      .then(setData);
  }, []);

  return (
    <LineChart data={data?.overall_risk_trend} />
  );
};
```

**Fetch Executive Summary:**
```javascript
const ExecutiveDashboard = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch('/api/v1/analytics/executive-summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setSummary);
  }, []);

  return (
    <div>
      <h1>{summary?.tenant_name} Security Overview</h1>
      <MetricCard
        title="Average Risk Score"
        value={summary?.average_risk_score}
        trend={summary?.risk_trend}
      />
      <KeyFindings findings={summary?.key_findings} />
      <Actions actions={summary?.immediate_actions} />
    </div>
  );
};
```

---

## Testing

### Manual Testing

**Get Risk Trends:**
```bash
curl -X POST http://localhost:8000/api/v1/analytics/risk-trends \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  }'
```

**Get Department Comparison:**
```bash
curl -X GET http://localhost:8000/api/v1/analytics/department-comparison \
  -H "Authorization: Bearer <token>"
```

**Get Executive Summary:**
```bash
curl -X GET "http://localhost:8000/api/v1/analytics/executive-summary?start_date=2024-01-01&end_date=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

---

## Next Steps

After analytics & reporting:

1. **Frontend Implementation** (Phase 5)
   - React/Next.js dashboard
   - Interactive charts (Chart.js, Recharts)
   - Data tables (TanStack Table)
   - Export functionality

2. **PDF Report Generation**
   - Use ReportLab or WeasyPrint
   - Branded templates
   - Charts embedded
   - Multi-page reports

3. **Advanced Features**
   - Predictive analytics with ML
   - Anomaly detection
   - Real-time alerting
   - Custom report builder

---

## Support

- **API Documentation:** http://localhost:8000/docs
- **Quick Start:** See `AUTH_QUICK_START.md`
- **Employee Management:** See `EMPLOYEE_MANAGEMENT.md`
- **Simulation Management:** See `SIMULATION_MANAGEMENT.md`
