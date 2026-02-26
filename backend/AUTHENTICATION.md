# MAIDAR Authentication System

Complete authentication system with email verification, password reset, and role-based access control (RBAC).

## Features

### Core Authentication
- **User Registration** with email verification
- **Login** with JWT token generation
- **Email Verification** (6-digit code or link)
- **Password Reset** flow
- **Change Password** for authenticated users
- **Rate Limiting** to prevent abuse

### Security Features
- ✅ **Password Hashing** with bcrypt (cost factor 12)
- ✅ **JWT Tokens** with configurable expiration (default: 30 minutes)
- ✅ **Email Verification** (24-hour expiration)
- ✅ **Password Reset Tokens** (1-hour expiration)
- ✅ **Rate Limiting**:
  - Login: 5 attempts per 5 minutes per IP
  - Password Reset: 3 attempts per hour per IP
- ✅ **Password Strength Requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 digit
- ✅ **HTTPS/TLS Required** for production

### Role-Based Access Control (RBAC)
Three user roles with hierarchical permissions:

1. **PLATFORM_SUPER_ADMIN**
   - Global administrator
   - Access to all tenants
   - First user automatically gets this role

2. **TENANT_ADMIN**
   - Organization administrator
   - Full access within their tenant
   - Can manage users, employees, simulations

3. **ANALYST**
   - Read-only access
   - Can view risk scores and analytics
   - Cannot modify data

### Multi-Tenancy
- Complete tenant isolation
- Row-level security
- Organization-specific data residency

## API Endpoints

Base URL: `/api/v1/auth`

### 1. Register User

**POST** `/api/v1/auth/register`

Register a new user with email verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "organization_name": "Acme Corp"  // Creates new tenant (optional)
  // OR
  "tenant_id": "uuid-here"  // Join existing tenant (optional)
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "TENANT_ADMIN",
  "tenant_id": "tenant-uuid",
  "is_active": true
}
```

**Behavior:**
- If `organization_name` provided: Creates new tenant, user becomes `TENANT_ADMIN`
- If `tenant_id` provided: Joins existing tenant as `ANALYST`
- If neither: First user becomes `PLATFORM_SUPER_ADMIN`
- Sends verification email with 6-digit code

---

### 2. Login

**POST** `/api/v1/auth/login`

Login with email and password to receive JWT token.

**Rate Limited:** 5 attempts per 5 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "TENANT_ADMIN",
    "tenant_id": "tenant-uuid",
    "is_active": true
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account inactive
- `429 Too Many Requests`: Rate limit exceeded

---

### 3. Verify Email

**POST** `/api/v1/auth/verify-email`

Verify email address using token (from email link) or code (6-digit).

**Request Body:**
```json
{
  "token": "jwt-token-from-email",
  "code": "123456"  // Optional: 6-digit code
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

**Behavior:**
- Token must be valid and not expired (24 hours)
- If code provided, validates it matches stored code
- Marks user as email_verified
- Sends welcome email

---

### 4. Resend Verification

**POST** `/api/v1/auth/resend-verification`

Resend verification email with new code.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a verification code has been sent"
}
```

---

### 5. Forgot Password

**POST** `/api/v1/auth/forgot-password`

Request password reset email.

**Rate Limited:** 3 attempts per hour per IP

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Behavior:**
- Always returns success (prevents email enumeration)
- Sends password reset email with token (1-hour expiration)

---

### 6. Reset Password

**POST** `/api/v1/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "jwt-token-from-email",
  "new_password": "NewSecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- `400 Bad Request`: Invalid/expired token or weak password

---

### 7. Get Current User

**GET** `/api/v1/auth/me`

Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "TENANT_ADMIN",
  "tenant_id": "tenant-uuid",
  "is_active": true
}
```

---

### 8. Change Password

**POST** `/api/v1/auth/change-password`

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldPass123",
  "new_password": "NewSecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

---

## Authentication Flow

### New User Registration
```
1. User submits registration form
   POST /api/v1/auth/register

2. Backend creates user with email_verified=false

3. Backend generates 6-digit verification code

4. Backend sends verification email

5. User receives email with:
   - 6-digit code
   - Verification link with token

6. User verifies email (two options):
   a) Click link in email → auto-verify
   b) Enter 6-digit code in app
   POST /api/v1/auth/verify-email

7. Backend marks email_verified=true

8. Backend sends welcome email

9. User can now login
```

### Login Flow
```
1. User submits login credentials
   POST /api/v1/auth/login

2. Backend verifies email & password

3. Backend checks if user is active

4. Backend generates JWT access token

5. Backend returns token + user profile

6. Frontend stores token (localStorage/sessionStorage)

7. Frontend includes token in Authorization header:
   Authorization: Bearer <token>

8. Backend validates token on protected routes
```

### Password Reset Flow
```
1. User clicks "Forgot Password"
   POST /api/v1/auth/forgot-password

2. Backend generates reset token (1-hour expiration)

3. Backend sends password reset email

4. User clicks link in email

5. Frontend shows reset password form

6. User submits new password
   POST /api/v1/auth/reset-password

7. Backend validates token

8. Backend updates password hash

9. User can login with new password
```

---

## Security Best Practices

### Backend (Implemented)
✅ Password hashing with bcrypt (cost factor 12)
✅ JWT tokens with expiration
✅ Rate limiting on authentication endpoints
✅ HTTPS/TLS enforcement (production)
✅ Email verification required
✅ Password strength validation
✅ Token type validation (verification vs reset)
✅ Secure token generation with secrets module
✅ CORS configuration

### Frontend (To Implement)
- Store tokens securely (httpOnly cookies preferred)
- Never log tokens or sensitive data
- Implement token refresh before expiration
- Clear tokens on logout
- Handle 401 responses (redirect to login)
- Implement CSRF protection
- Use HTTPS only

---

## Testing

### Run Authentication Tests
```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/test_auth.py -v

# Run with coverage
pytest tests/test_auth.py --cov=app.core.security --cov=app.api.auth
```

### Manual Testing with cURL

**1. Register User**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "full_name": "Test User",
    "organization_name": "Test Org"
  }'
```

**2. Login**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**3. Get Current User (with token)**
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <your_token_here>"
```

---

## Email Configuration

### Development Mode
Leave SMTP settings empty in `.env`:
```env
SMTP_SERVER=
SMTP_USERNAME=
SMTP_PASSWORD=
```

Emails will be logged to console instead of sent.

### Production Mode (Gmail Example)
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=MAIDAR
```

**Note:** For Gmail, generate an "App Password" at:
https://myaccount.google.com/apppasswords

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ANALYST',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_code_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

### User Roles Enum
```sql
CREATE TYPE user_role AS ENUM (
    'PLATFORM_SUPER_ADMIN',
    'TENANT_ADMIN',
    'ANALYST'
);
```

---

## UAE PDPL Compliance

The authentication system complies with UAE Federal Decree-Law No. 45 of 2021:

✅ **Data Minimization**: Only collect essential user data
✅ **Purpose Limitation**: Data used only for authentication
✅ **Encryption**: Passwords hashed with bcrypt, tokens encrypted
✅ **Access Control**: Role-based permissions
✅ **Audit Logging**: All authentication events logged
✅ **Data Residency**: Deployed in UAE region
✅ **Right to Erasure**: User deletion removes all data
✅ **Security Measures**: TLS, rate limiting, strong passwords

---

## Troubleshooting

### "Could not validate credentials"
- Token expired (default 30 minutes)
- Token invalid or tampered
- User account deactivated

**Solution:** Login again to get new token

### "Email not verified"
- User hasn't verified email yet

**Solution:** Resend verification email

### "Too many login attempts"
- Rate limit exceeded (5 attempts per 5 minutes)

**Solution:** Wait 5 minutes and try again

### Verification email not received
- Check spam folder
- SMTP not configured (check logs for email content)
- Invalid email address

**Solution:** Resend verification email

---

## Next Steps

1. ✅ **Phase 1: Authentication** (COMPLETED)
   - User registration with email verification
   - Login with JWT tokens
   - Password reset flow
   - RBAC implementation
   - Rate limiting

2. **Phase 2: Employee Management** (NEXT)
   - Bulk CSV import
   - CRUD endpoints
   - Data validation

3. **Phase 3: Simulation Engine**
   - Simulation management
   - Email tracking
   - Results processing

4. **Phase 4: Analytics & Reporting**
   - Risk dashboards
   - PDF export
   - Time-series analytics

5. **Phase 5: Frontend**
   - React/Next.js UI
   - Integration with backend APIs

---

## Support

For questions or issues:
- Check logs: `/var/log/maidar/` (production)
- Debug mode: Set `DEBUG=True` in `.env`
- Run tests: `pytest tests/test_auth.py -v`
