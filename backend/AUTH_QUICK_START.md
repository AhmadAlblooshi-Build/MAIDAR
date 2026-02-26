# Authentication Quick Start Guide

## Setup (5 minutes)

### 1. Environment Configuration
```bash
# Copy example environment file
cp .env.example .env

# Edit .env - REQUIRED settings:
# - SECRET_KEY: Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
# - DATABASE_URL: Your PostgreSQL connection string
# - FRONTEND_URL: Your frontend URL (default: http://localhost:3000)

# OPTIONAL (for production email):
# - SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
# Leave empty for development (emails logged to console)
```

### 2. Database Setup
```bash
# Install PostgreSQL (if not installed)
# Create database
createdb maidar

# Run migrations
psql -U postgres -d maidar -f migrations/001_initial_schema.sql
psql -U postgres -d maidar -f migrations/002_add_email_verification.sql
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Start Server
```bash
# Development mode (auto-reload)
python app/main.py

# Or with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## API Usage

### Base URL
```
http://localhost:8000/api/v1/auth
```

### 1. Register First User (Becomes Super Admin)
```bash
POST /auth/register

{
  "email": "admin@maidar.com",
  "password": "SecureAdmin123",
  "full_name": "Admin User"
}

Response:
{
  "id": "uuid",
  "email": "admin@maidar.com",
  "full_name": "Admin User",
  "role": "PLATFORM_SUPER_ADMIN",
  "tenant_id": null,
  "is_active": true
}
```

### 2. Register Organization (Creates Tenant + Admin)
```bash
POST /auth/register

{
  "email": "ceo@acme.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "organization_name": "Acme Corporation"
}

Response:
{
  "id": "uuid",
  "email": "ceo@acme.com",
  "full_name": "John Doe",
  "role": "TENANT_ADMIN",
  "tenant_id": "tenant-uuid",
  "is_active": true
}
```

### 3. Login
```bash
POST /auth/login

{
  "email": "admin@maidar.com",
  "password": "SecureAdmin123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@maidar.com",
    "full_name": "Admin User",
    "role": "PLATFORM_SUPER_ADMIN",
    "tenant_id": null,
    "is_active": true
  }
}

# Save the access_token for authenticated requests
```

### 4. Access Protected Endpoint
```bash
GET /auth/me
Headers:
  Authorization: Bearer <access_token>

Response:
{
  "id": "uuid",
  "email": "admin@maidar.com",
  "full_name": "Admin User",
  "role": "PLATFORM_SUPER_ADMIN",
  "tenant_id": null,
  "is_active": true
}
```

---

## Development Mode

### Email Verification (Development)
When SMTP not configured, verification emails are logged to console:

```
========== EMAIL (Development Mode) ==========
To: user@example.com
Subject: Verify Your MAIDAR Account

Verify Your MAIDAR Account

Welcome to MAIDAR - Human Risk Intelligence Platform!

Please verify your email address using this code: 123456

This code will expire in 24 hours.

=============================================
```

**Copy the 6-digit code** and use it to verify:

```bash
POST /auth/verify-email

{
  "token": "jwt-token-from-registration",
  "code": "123456"
}
```

### Skip Email Verification (Testing Only)
For testing, you can manually update the database:
```sql
UPDATE users SET email_verified = true WHERE email = 'user@example.com';
```

---

## Frontend Integration

### Login Flow
```javascript
// 1. Login
const response = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123'
  })
});

const data = await response.json();

// 2. Save token
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('user', JSON.stringify(data.user));

// 3. Use token in requests
const protectedResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

### Handle Unauthorized (401)
```javascript
// Add interceptor for 401 responses
if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

---

## Testing with Swagger UI

1. Open browser: http://localhost:8000/docs
2. Click on `/auth/register` endpoint
3. Click "Try it out"
4. Fill in request body
5. Click "Execute"
6. View response

---

## Common Issues

### "Could not validate credentials"
**Cause:** Token expired or invalid
**Solution:** Login again to get new token

### "Email already registered"
**Cause:** User already exists
**Solution:** Use different email or login with existing account

### "Too many login attempts"
**Cause:** Rate limit exceeded (5 attempts per 5 minutes)
**Solution:** Wait 5 minutes

### "Password must contain at least one digit"
**Cause:** Weak password
**Solution:** Use password with 8+ chars, 1 uppercase, 1 digit

### Database connection error
**Cause:** PostgreSQL not running or wrong DATABASE_URL
**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
# Or on Windows
sc query postgresql-x64-15

# Test connection
psql -U postgres -d maidar -c "SELECT 1;"
```

---

## Production Checklist

Before deploying to production:

- [ ] Generate strong SECRET_KEY (32+ characters)
- [ ] Change DATABASE_URL to production database
- [ ] Set DEBUG=False
- [ ] Configure SMTP settings for email
- [ ] Set FRONTEND_URL to production URL
- [ ] Enable HTTPS (USE_TLS=True)
- [ ] Set up Redis for rate limiting (replace in-memory limiter)
- [ ] Configure CORS_ORIGINS with production domain
- [ ] Set up monitoring (SENTRY_DSN)
- [ ] Review and update ACCESS_TOKEN_EXPIRE_MINUTES
- [ ] Set up backup for database
- [ ] Configure logging to file
- [ ] Set up SSL certificates
- [ ] Review firewall rules

---

## Need Help?

- **API Documentation:** http://localhost:8000/docs
- **Detailed Guide:** See `AUTHENTICATION.md`
- **Test Examples:** See `tests/test_auth.py`
- **Configuration:** See `.env.example`

---

## Quick Commands

```bash
# Start server
python app/main.py

# Run tests
pytest tests/test_auth.py -v

# Generate secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Check API health
curl http://localhost:8000/health

# Register user (cURL)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","full_name":"Test User","organization_name":"Test Org"}'

# Login (cURL)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'
```
