# MAIDAR API Documentation

## Base URL

```
Production: https://api.maidar.ai/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

All API requests (except `/auth/login` and `/auth/register`) require authentication using JWT tokens.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Get Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "TENANT_ADMIN"
  }
}
```

## API Endpoints

### Authentication

#### Register New Tenant
```http
POST /auth/register
```

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "full_name": "Admin User",
  "organization_name": "Acme Corp"
}
```

#### Login
```http
POST /auth/login
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer <token>
```

**Request:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!"
}
```

### Employees

#### List Employees
```http
POST /employees/search
Authorization: Bearer <token>
```

**Request:**
```json
{
  "page": 1,
  "page_size": 50,
  "query": "john",
  "department": "Engineering",
  "risk_band": "HIGH",
  "sort_by": "risk_score",
  "sort_order": "desc"
}
```

**Response:**
```json
{
  "total": 150,
  "page": 1,
  "page_size": 50,
  "employees": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "full_name": "John Doe",
      "department": "Engineering",
      "job_title": "Senior Developer",
      "seniority_level": "senior",
      "risk_score": 75,
      "risk_band": "HIGH",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Create Employee
```http
POST /employees/
Authorization: Bearer <token>
```

**Request:**
```json
{
  "email": "new.employee@example.com",
  "full_name": "New Employee",
  "department": "HR",
  "job_title": "HR Manager",
  "seniority_level": "mid",
  "age_range": "35_44"
}
```

#### Bulk Upload Employees
```http
POST /employees/upload-csv
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <employees.csv>
```

**CSV Format:**
```csv
email,full_name,department,job_title,seniority_level,age_range
employee1@example.com,Employee One,IT,Developer,junior,25_34
employee2@example.com,Employee Two,Finance,Analyst,mid,35_44
```

### Scenarios

#### List Scenarios
```http
POST /scenarios/search
Authorization: Bearer <token>
```

**Request:**
```json
{
  "page": 1,
  "page_size": 20,
  "query": "password",
  "category": "CREDENTIALS",
  "difficulty": "medium",
  "is_active": true
}
```

#### Create Scenario
```http
POST /scenarios/
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "IT Security Alert",
  "description": "Password expiration notification",
  "category": "CREDENTIALS",
  "language": "en",
  "difficulty": "medium",
  "email_subject": "Action Required: Password Expiration",
  "email_body_html": "<html>...</html>",
  "email_body_text": "Your password expires in 24 hours...",
  "sender_name": "IT Security Team",
  "sender_email": "security@company.com",
  "has_link": true,
  "has_attachment": false,
  "has_credential_form": true
}
```

#### AI Generate Scenario
```http
POST /scenarios/generate-ai?context_type=it_alert&target_segment=finance&personalization_level=department&tone=urgent&language=en&auto_save=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "IT Security Alert - Password Expiration",
  "description": "Tests user response to urgent IT security notifications",
  "category": "CREDENTIALS",
  "difficulty": "medium",
  "email_subject": "URGENT: Your password expires in 24 hours",
  "email_body_html": "<html>...</html>",
  "email_body_text": "Dear Team Member...",
  "sender_name": "IT Security Team",
  "sender_email": "security@company-it.com",
  "has_link": true,
  "has_credential_form": true,
  "created_at": "2024-01-20T15:45:00Z"
}
```

### Simulations

#### Launch Simulation
```http
POST /simulations/{simulation_id}/launch
Authorization: Bearer <token>
```

**Request:**
```json
{
  "employee_ids": ["uuid1", "uuid2", "uuid3"],
  "schedule_at": "2024-02-01T09:00:00Z"
}
```

#### Get Simulation Results
```http
GET /simulations/{simulation_id}/results?page=1&page_size=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "results": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "John Doe",
      "status": "CLICKED",
      "delivered_at": "2024-02-01T09:05:00Z",
      "opened_at": "2024-02-01T09:15:00Z",
      "clicked_at": "2024-02-01T09:20:00Z",
      "submitted_at": null,
      "reported_at": null,
      "score_change": -10
    }
  ]
}
```

### Analytics

#### Get Risk Distribution
```http
GET /analytics/risk-distribution
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_employees": 500,
  "by_band": {
    "CRITICAL": 25,
    "HIGH": 75,
    "MEDIUM": 200,
    "LOW": 150,
    "UNSCORED": 50
  },
  "average_score": 45.5,
  "trend": "improving"
}
```

#### Export Data
```http
POST /analytics/export
Authorization: Bearer <token>
```

**Request:**
```json
{
  "export_type": "employees",
  "format": "excel"
}
```

**Response:**
Binary file download (CSV/Excel/PDF)

### RBAC Management

#### List Permissions
```http
GET /rbac/permissions
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "employees:read",
    "resource": "employees",
    "action": "read",
    "description": "View employees",
    "is_super_admin_only": false
  }
]
```

#### Create Custom Role
```http
POST /rbac/roles
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "HR Manager",
  "description": "Human Resources management role",
  "permission_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### Assign Role to Users
```http
POST /rbac/roles/{role_id}/assign
Authorization: Bearer <token>
```

**Request:**
```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

### Notifications

#### List Notifications
```http
GET /notifications/?page=1&page_size=20&unread_only=false
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "SIMULATION_LAUNCHED",
      "priority": "MEDIUM",
      "title": "Simulation Launched",
      "message": "Your simulation has been launched to 100 employees",
      "action_url": "/tenant-admin/simulations/uuid",
      "action_label": "View Results",
      "is_read": false,
      "created_at": "2024-02-01T10:00:00Z"
    }
  ],
  "total": 15,
  "unread_count": 5
}
```

#### Mark as Read
```http
PUT /notifications/{notification_id}/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
PUT /notifications/mark-all-read
Authorization: Bearer <token>
```

### Email Tracking

#### Track Email Open
```http
GET /email/track/open/{tracking_id}
```
Returns 1x1 transparent GIF pixel

#### Track Link Click
```http
GET /email/track/click/{tracking_id}
```
Redirects to phishing awareness page

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Missing required permission: employees:write"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "detail": "An unexpected error occurred"
}
```

## Rate Limiting

- **Global**: 60 requests per minute per IP
- **Authentication**: 5 requests per minute per IP
- **Heavy operations**: 10 requests per minute per user

## Pagination

All list endpoints support pagination:

```json
{
  "page": 1,
  "page_size": 50,
  "total": 500,
  "total_pages": 10
}
```

**Limits**:
- Minimum page_size: 1
- Maximum page_size: 100
- Default page_size: 20

## Filtering & Sorting

Most list endpoints support filtering:

```json
{
  "query": "search term",
  "filters": {
    "department": "Engineering",
    "is_active": true
  },
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

## API Versioning

Current version: **v1**

Base path: `/api/v1/`

Future versions will maintain backward compatibility.

## Interactive Documentation

Visit https://api.maidar.ai/docs for interactive Swagger UI documentation.

## SDKs & Client Libraries

Coming soon:
- Python SDK
- JavaScript/TypeScript SDK
- Go SDK

## Support

- API Status: https://status.maidar.ai
- Documentation: https://docs.maidar.ai
- Support: support@maidar.ai
