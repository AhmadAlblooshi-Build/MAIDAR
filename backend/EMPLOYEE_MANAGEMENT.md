# Employee Management System

Complete employee management system with CRUD operations, CSV import, search/filter, and statistics.

## Features

✅ **Create, Read, Update, Delete** (CRUD) employees
✅ **Bulk CSV Import** - Upload hundreds of employees at once
✅ **Advanced Search & Filter** - Find employees by any criteria
✅ **Statistics Dashboard** - Department, seniority, age distribution
✅ **Multi-tenant Isolation** - Complete data separation
✅ **Role-Based Access** - Admin-only modifications
✅ **Soft Delete** - Maintains data integrity (UAE PDPL right to erasure)
✅ **Validation** - Comprehensive input validation
✅ **Pagination** - Handle thousands of employees efficiently

---

## API Endpoints

Base URL: `/api/v1/employees`

### 1. Create Employee

**POST** `/api/v1/employees/`

Create a single employee.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "employee_id": "EMP001",
  "email": "john.doe@company.com",
  "full_name": "John Doe",
  "age_range": "35_44",
  "gender": "male",
  "languages": ["en", "ar"],
  "technical_literacy": 7,
  "seniority": "senior",
  "department": "IT",
  "job_title": "Software Engineer"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenant_id": "tenant-uuid",
  "employee_id": "EMP001",
  "email": "john.doe@company.com",
  "full_name": "John Doe",
  "age_range": "35_44",
  "gender": "male",
  "languages": ["en", "ar"],
  "technical_literacy": 7,
  "seniority": "senior",
  "department": "IT",
  "job_title": "Software Engineer",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "is_deleted": false
}
```

---

### 2. Get Employee

**GET** `/api/v1/employees/{employee_id}`

Get employee by ID (UUID or employee_id).

**Requires:** Authentication

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "tenant_id": "tenant-uuid",
  "employee_id": "EMP001",
  "email": "john.doe@company.com",
  "full_name": "John Doe",
  "age_range": "35_44",
  "gender": "male",
  "languages": ["en", "ar"],
  "technical_literacy": 7,
  "seniority": "senior",
  "department": "IT",
  "job_title": "Software Engineer",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "is_deleted": false
}
```

---

### 3. Update Employee

**PUT** `/api/v1/employees/{employee_id}`

Update employee (all fields optional).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "technical_literacy": 8,
  "department": "Engineering",
  "job_title": "Senior Software Engineer"
}
```

**Response:** `200 OK` (updated employee)

---

### 4. Delete Employee

**DELETE** `/api/v1/employees/{employee_id}`

Soft delete employee (UAE PDPL compliance).

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Response:** `204 No Content`

---

### 5. Search Employees

**POST** `/api/v1/employees/search`

Advanced search and filter with pagination.

**Requires:** Authentication

**Request Body:**
```json
{
  "query": "john",
  "age_range": "35_44",
  "seniority": "senior",
  "department": "IT",
  "min_technical_literacy": 5,
  "max_technical_literacy": 10,
  "page": 1,
  "page_size": 50,
  "sort_by": "full_name",
  "sort_order": "asc"
}
```

**Response:** `200 OK`
```json
{
  "total": 125,
  "page": 1,
  "page_size": 50,
  "employees": [
    {
      "id": "uuid",
      "employee_id": "EMP001",
      "full_name": "John Doe",
      ...
    },
    ...
  ]
}
```

**Search Features:**
- **Text Search** (`query`): Searches in full_name, email, department, employee_id
- **Filters**: age_range, gender, seniority, department, technical_literacy range
- **Sorting**: Any field, ascending or descending
- **Pagination**: Page number and size

---

### 6. Bulk Import (JSON)

**POST** `/api/v1/employees/bulk-import`

Import multiple employees from JSON array.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request Body:**
```json
{
  "employees": [
    {
      "employee_id": "EMP001",
      "email": "john.doe@company.com",
      "full_name": "John Doe",
      "age_range": "35_44",
      "gender": "male",
      "languages": ["en", "ar"],
      "technical_literacy": 7,
      "seniority": "senior",
      "department": "IT",
      "job_title": "Software Engineer"
    },
    ...
  ]
}
```

**Response:** `200 OK`
```json
{
  "total_processed": 100,
  "successful": 95,
  "failed": 5,
  "errors": [
    {
      "row": 23,
      "employee_id": "EMP023",
      "error": "Employee ID already exists"
    },
    ...
  ]
}
```

---

### 7. CSV Upload

**POST** `/api/v1/employees/upload-csv`

Upload CSV file to bulk import employees.

**Requires:** TENANT_ADMIN or PLATFORM_SUPER_ADMIN

**Request:** `multipart/form-data`
- Field: `file`
- Type: CSV file

**CSV Format:**
```csv
employee_id,email,full_name,age_range,gender,languages,technical_literacy,seniority,department,job_title
EMP001,john@company.com,John Doe,35_44,male,"en,ar",7,senior,IT,Software Engineer
EMP002,jane@company.com,Jane Smith,25_34,female,"en",8,mid,IT,Developer
```

**Response:** `200 OK`
```json
{
  "total_processed": 100,
  "successful": 98,
  "failed": 2,
  "errors": [
    {
      "row": 45,
      "employee_id": "EMP045",
      "error": "Email already exists"
    }
  ]
}
```

**Download Sample CSV:** `backend/sample_employees.csv`

---

### 8. Get Statistics

**GET** `/api/v1/employees/statistics`

Get employee statistics and distributions.

**Requires:** Authentication

**Response:** `200 OK`
```json
{
  "total_employees": 250,
  "by_seniority": {
    "junior": 50,
    "mid": 80,
    "senior": 70,
    "executive": 30,
    "c_level": 20
  },
  "by_age_range": {
    "18_24": 30,
    "25_34": 90,
    "35_44": 80,
    "45_54": 40,
    "55_plus": 10
  },
  "by_department": {
    "IT": 100,
    "Finance": 50,
    "HR": 30,
    "Marketing": 40,
    "Operations": 30
  },
  "by_gender": {
    "male": 140,
    "female": 110
  },
  "avg_technical_literacy": 6.5,
  "avg_risk_score": null
}
```

---

## Data Validation

### Required Fields
- `employee_id` - Unique identifier (1-100 chars)
- `email` - Valid email address (RFC 5322)
- `full_name` - 1-255 characters
- `age_range` - One of: `18_24`, `25_34`, `35_44`, `45_54`, `55_plus`
- `languages` - Array of language codes (at least one)
- `technical_literacy` - Integer 0-10
- `seniority` - One of: `junior`, `mid`, `senior`, `executive`, `c_level`
- `department` - 1-100 characters

### Optional Fields
- `gender` - One of: `male`, `female`, `other`
- `job_title` - Up to 255 characters

### Automatic Validation
- Email format validation
- Unique employee_id per tenant
- Unique email per tenant
- Age range enum validation
- Gender enum validation
- Seniority enum validation
- Technical literacy range (0-10)
- Language array normalization (lowercase)

---

## CSV Import Guide

### Step 1: Prepare CSV File

Use the provided template: `backend/sample_employees.csv`

**CSV Rules:**
- First row must be header
- Languages must be comma-separated in quotes: `"en,ar,fr"`
- Gender is optional (leave empty if unknown)
- Job title is optional

**Example:**
```csv
employee_id,email,full_name,age_range,gender,languages,technical_literacy,seniority,department,job_title
EMP001,john@company.com,John Doe,35_44,male,"en,ar",7,senior,IT,Software Engineer
EMP002,jane@company.com,Jane Smith,25_34,female,"en",8,mid,IT,Developer
EMP003,ahmed@company.com,Ahmed Ali,45_54,male,"ar,en",5,executive,Finance,CFO
```

### Step 2: Upload via API

**cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/employees/upload-csv \
  -H "Authorization: Bearer <token>" \
  -F "file=@employees.csv"
```

**Python:**
```python
import requests

url = "http://localhost:8000/api/v1/employees/upload-csv"
headers = {"Authorization": f"Bearer {token}"}
files = {"file": open("employees.csv", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())
```

### Step 3: Review Results

Response shows:
- Total processed
- Successful imports
- Failed imports with error details

**Fix errors and re-upload failed rows**

---

## Search & Filter Examples

### Search by Name
```json
POST /api/v1/employees/search
{
  "query": "john",
  "page": 1,
  "page_size": 50
}
```

### Filter by Seniority and Department
```json
{
  "seniority": "senior",
  "department": "IT",
  "page": 1,
  "page_size": 50
}
```

### Filter by Technical Literacy Range
```json
{
  "min_technical_literacy": 7,
  "max_technical_literacy": 10,
  "page": 1,
  "page_size": 50
}
```

### Sort by Name
```json
{
  "sort_by": "full_name",
  "sort_order": "asc",
  "page": 1,
  "page_size": 50
}
```

### Complex Filter
```json
{
  "query": "engineer",
  "age_range": "35_44",
  "seniority": "senior",
  "department": "IT",
  "min_technical_literacy": 6,
  "sort_by": "technical_literacy",
  "sort_order": "desc",
  "page": 1,
  "page_size": 20
}
```

---

## Frontend Integration

### Create Employee Form
```javascript
const createEmployee = async (employeeData) => {
  const response = await fetch('http://localhost:8000/api/v1/employees/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(employeeData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return await response.json();
};
```

### CSV Upload
```javascript
const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:8000/api/v1/employees/upload-csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
};
```

### Search Employees
```javascript
const searchEmployees = async (filters) => {
  const response = await fetch('http://localhost:8000/api/v1/employees/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(filters)
  });

  return await response.json();
};

// Usage
const results = await searchEmployees({
  query: 'john',
  seniority: 'senior',
  page: 1,
  page_size: 50
});
```

---

## UAE PDPL Compliance

### Data Minimization
Only collects risk-relevant employee attributes:
- Age range (not exact age)
- Gender (optional)
- Languages
- Technical literacy
- Seniority
- Department
- Job title

**No sensitive data:** No SSN, passport numbers, salary, personal addresses

### Right to Erasure
Soft delete implementation:
- `DELETE /api/v1/employees/{id}` sets `is_deleted=true`
- Employee data remains for historical risk analysis
- Can be permanently deleted if required

### Tenant Isolation
- Complete data separation between organizations
- Row-level security enforced
- Users can only access their tenant's employees

### Audit Trail
All employee operations logged:
- Who created/updated/deleted
- When the action occurred
- What data was changed

---

## Performance Considerations

### Pagination
- Default page size: 50
- Maximum page size: 500
- Use pagination for large datasets

### Indexing
Database indexes on:
- `tenant_id` - Fast tenant isolation
- `employee_id` - Quick lookups
- `email` - Uniqueness checks
- `is_deleted` - Filter active employees
- `created_at` - Sorting by date

### Bulk Import Optimization
- Batch database inserts
- Transaction management
- Validation before insert
- Rollback on critical errors

---

## Error Handling

### Common Errors

**400 Bad Request**
- Invalid field values
- Validation errors
- Duplicate employee_id or email

**401 Unauthorized**
- Missing or invalid token

**403 Forbidden**
- Insufficient permissions (not admin)
- Accessing different tenant's data

**404 Not Found**
- Employee doesn't exist

**500 Internal Server Error**
- Database connection issues
- Unexpected errors

### Error Response Format
```json
{
  "detail": "Employee with ID 'EMP001' already exists"
}
```

---

## Testing

### Manual Testing with cURL

**Create Employee:**
```bash
curl -X POST http://localhost:8000/api/v1/employees/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "email": "john@example.com",
    "full_name": "John Doe",
    "age_range": "35_44",
    "gender": "male",
    "languages": ["en"],
    "technical_literacy": 7,
    "seniority": "senior",
    "department": "IT"
  }'
```

**Search Employees:**
```bash
curl -X POST http://localhost:8000/api/v1/employees/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type": "application/json" \
  -d '{
    "page": 1,
    "page_size": 50
  }'
```

**Upload CSV:**
```bash
curl -X POST http://localhost:8000/api/v1/employees/upload-csv \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample_employees.csv"
```

---

## Next Steps

After employee management is complete:

1. **Risk Scoring Integration**
   - Calculate risk scores for all employees
   - Bulk risk calculation endpoints
   - Risk score history tracking

2. **Simulation Management**
   - Create phishing simulations
   - Assign employees to simulations
   - Track simulation results

3. **Analytics Dashboard**
   - Risk distribution charts
   - Department risk analysis
   - Trend analysis over time

---

## Support

- **API Documentation:** http://localhost:8000/docs
- **Sample CSV:** `backend/sample_employees.csv`
- **Quick Start:** See `AUTH_QUICK_START.md` for authentication setup
