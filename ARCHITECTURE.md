# MAIDAR System Architecture

## Overview

MAIDAR is an enterprise-grade Human Risk Intelligence Platform built for organizations in the UAE and Middle East region. The platform provides scenario-aware phishing simulations, deterministic risk scoring, and comprehensive security awareness training.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                          │
│                    (Nginx / AWS ALB)                          │
└─────────┬───────────────────────────────────────────────┬───┘
          │                                                 │
    ┌─────▼─────┐                                   ┌──────▼──────┐
    │  Frontend  │                                   │   Backend   │
    │  Next.js   │◄──────── API Calls ──────────────│   FastAPI   │
    │   (SSR)    │                                   │   (Python)  │
    └───────────┘                                    └──────┬──────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────┐
                    │                                        │            │
              ┌─────▼──────┐                          ┌─────▼─────┐ ┌───▼────┐
              │ PostgreSQL  │                          │   Redis   │ │ SMTP   │
              │  Database   │                          │   Cache   │ │ Server │
              └────────────┘                          └───────────┘ └────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **ORM**: SQLAlchemy 2.0
- **Database Driver**: psycopg3
- **Authentication**: JWT with bcrypt
- **Validation**: Pydantic v2
- **API Docs**: OpenAPI/Swagger

### Database
- **Primary**: PostgreSQL 15
- **Cache**: Redis 7
- **Data Isolation**: Multi-tenant with tenant_id

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

## Core Components

### 1. Multi-Tenant Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Tenant Isolation                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │          │
│  ├──────────┤  ├──────────┤  ├──────────┤          │
│  │ Users    │  │ Users    │  │ Users    │          │
│  │ Employees│  │ Employees│  │ Employees│          │
│  │ Scenarios│  │ Scenarios│  │ Scenarios│          │
│  │ Sims     │  │ Sims     │  │ Sims     │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                       │
│  All queries filtered by tenant_id                   │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
- Row-level security with tenant_id on all tables
- Automatic tenant filtering in ORM queries
- Tenant subdomain routing
- Isolated data residency per region

### 2. Risk Scoring Engine

```
Input Factors          Risk Engine          Output
─────────────         ─────────────        ────────
Age Range      ───┐
Department     ───┤
Seniority      ───┤
Previous Clicks ───┤──► Deterministic  ──► Risk Score (0-100)
Previous Opens  ───┤    Algorithm         ├─► Risk Band (CRITICAL/HIGH/MEDIUM/LOW)
Training        ───┘    (No ML)           └─► Confidence Score
```

**Algorithm**:
- Base Score: Demographic factors (30%)
- Historical Behavior: Click/open history (40%)
- Training Status: Completion percentage (30%)
- Deterministic: Same inputs = same outputs
- No machine learning (explainable)

### 3. Authentication & Authorization

#### RBAC System

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ has many
       ▼
┌─────────────┐
│    Roles    │
└──────┬──────┘
       │ has many
       ▼
┌─────────────┐
│ Permissions │
└─────────────┘
```

**Built-in Roles**:
- `PLATFORM_SUPER_ADMIN`: Full system access
- `TENANT_ADMIN`: Full tenant access
- `ANALYST`: Read-only access

**Custom Roles**:
- Tenant admins can create custom roles
- Fine-grained permissions (e.g., `employees:read`, `scenarios:write`)
- Role assignment per user

#### JWT Authentication

```
1. User Login
   └─► POST /api/v1/auth/login
       └─► Verify credentials (bcrypt)
           └─► Generate JWT token
               └─► Return access_token + user info

2. Authenticated Request
   └─► Authorization: Bearer <token>
       └─► Verify JWT signature
           └─► Extract user_id + tenant_id
               └─► Check permissions
                   └─► Process request
```

### 4. Simulation Workflow

```
1. Create Scenario
   ├─► Manually authored OR
   └─► AI-generated (Claude API)

2. Launch Simulation
   ├─► Select employees
   ├─► Select scenario
   └─► Schedule (immediate or future)

3. Email Delivery
   ├─► Generate tracking ID per employee
   ├─► Send phishing email with tracking pixel
   └─► Track: open, click, submit, report

4. Real-time Tracking
   ├─► Email opened (tracking pixel loaded)
   ├─► Link clicked (redirect to awareness page)
   ├─► Credentials submitted (fake form)
   └─► Email reported (reporting button)

5. Results & Analytics
   ├─► Calculate risk scores
   ├─► Generate reports
   └─► Update training recommendations
```

### 5. Email Tracking System

```
Email Sent
   │
   ├─► Tracking Pixel: /api/v1/email/track/open/{id}
   │   └─► Records: opened_at, status = "OPENED"
   │
   ├─► Phishing Link: /api/v1/email/track/click/{id}
   │   └─► Records: clicked_at, status = "CLICKED"
   │   └─► Redirects to awareness page
   │
   └─► Credential Form: /api/v1/email/track/credential-submit/{id}
       └─► Records: submitted_at, status = "SUBMITTED"
       └─► Does NOT store actual credentials
```

### 6. Notification System

```
Event Triggers          Notification Service          Delivery
─────────────          ────────────────────         ─────────
Simulation Launched ──┐
High Risk Detected  ──┤
Employee Clicked    ──┼──► Create Notification ──┐
Sim Complete        ──┤                          ├──► In-App
System Alert        ──┘                          ├──► Email
                                                  └──► WebSocket (future)
```

### 7. Data Export Pipeline

```
Export Request
   │
   ├─► Format: CSV
   │   └─► Generate CSV with csv.DictWriter
   │
   ├─► Format: Excel
   │   └─► Generate XLSX with openpyxl
   │       └─► Formatted headers, auto-width columns
   │
   └─► Format: PDF
       └─► Generate PDF with reportlab
           └─► Professional tables, charts, branding
```

## Database Schema

### Core Tables

```sql
-- Multi-tenancy
tenants (id, name, subdomain, license_tier, ...)

-- Users & Auth
users (id, tenant_id, email, password_hash, role, ...)
roles (id, tenant_id, name, is_system_role, ...)
permissions (id, name, resource, action, ...)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id)

-- Employees
employees (id, tenant_id, email, full_name, department, ...)
risk_scores (id, tenant_id, employee_id, risk_score, risk_band, ...)

-- Scenarios & Simulations
scenarios (id, tenant_id, name, category, email_subject, ...)
simulations (id, tenant_id, scenario_id, name, status, ...)
simulation_results (id, simulation_id, employee_id, status, opened_at, clicked_at, ...)

-- Notifications & Audit
notifications (id, tenant_id, user_id, type, title, message, ...)
audit_logs (id, tenant_id, user_id, action, resource_type, ...)
```

### Indexes

All tenant_id foreign keys are indexed for fast filtering.
Composite indexes on frequently queried combinations.

## Security Architecture

### Layers of Security

1. **Network Layer**
   - Nginx reverse proxy
   - Rate limiting (60 requests/min per IP)
   - DDoS protection
   - SSL/TLS encryption

2. **Application Layer**
   - JWT authentication
   - RBAC authorization
   - CSRF protection
   - Input validation (Pydantic)
   - SQL injection prevention (ORM)
   - XSS protection (sanitization)

3. **Data Layer**
   - Tenant isolation (row-level security)
   - Password hashing (bcrypt)
   - Encrypted secrets (K8s secrets)
   - Audit logging (all actions)

4. **Compliance**
   - UAE data residency
   - GDPR-ready
   - Audit trail (immutable logs)
   - Cryptographic verification

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: (restrictive policy)
```

## Scalability

### Horizontal Scaling

- **Frontend**: Stateless Next.js instances (K8s HPA: 2-5 replicas)
- **Backend**: Stateless FastAPI instances (K8s HPA: 3-10 replicas)
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis cluster for high availability

### Performance Optimizations

- Database connection pooling
- Redis caching (frequently accessed data)
- Lazy loading (frontend)
- Pagination (all list endpoints)
- Async operations (email sending, file processing)

## Monitoring & Observability

### Metrics (Prometheus)

- Request rate, error rate, duration (RED metrics)
- Database query performance
- Cache hit/miss ratio
- Simulation success/failure rate
- Risk score distribution

### Logging (ELK)

- Structured JSON logs
- Request/response logging
- Error tracking with stack traces
- Security event logging
- Audit trail (compliance)

### Alerts

- Service health (up/down)
- High error rate (>5% 5xx responses)
- Slow queries (>1s average)
- Resource usage (CPU/memory >80%)
- Security events (brute force attempts)

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups (pg_dump)
- **Redis**: RDB snapshots every 6 hours
- **Files**: Volume snapshots (K8s)
- **Retention**: 30 days

### Recovery Procedures

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours
- **High Availability**: Multi-AZ deployment
- **Failover**: Automated K8s pod recreation

## Future Enhancements

1. **WebSocket Support**: Real-time notifications and live updates
2. **Machine Learning**: Advanced phishing detection and trend analysis
3. **Mobile App**: Native iOS/Android apps
4. **Advanced Analytics**: Predictive risk modeling
5. **Integrations**: SIEM, SOAR, ticketing systems
6. **Multi-language**: Arabic UI translation

## Contact

For architecture questions:
- Architecture Team: architecture@maidar.ai
- Documentation: https://docs.maidar.ai
