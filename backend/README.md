# MAIDAR Backend

Human Risk Intelligence Platform - Backend API

## Overview

The MAIDAR backend implements a **scenario-aware, explainable, deterministic Human Risk Scoring engine** with a RESTful API built on FastAPI.

### Core Features

- ✅ **Risk Scoring Engine**: Mathematical model calculating employee risk per scenario
- ✅ **Full Explainability**: Every score includes breakdown of likelihood and impact components
- ✅ **Scenario Awareness**: Risk varies by scenario type (BEC, Credentials, Data, Malware)
- ✅ **UAE PDPL Compliant**: Data minimization, purpose limitation, right to erasure
- ✅ **Multi-tenant Architecture**: Complete data isolation between organizations
- ✅ **Comprehensive Audit Logging**: All actions logged for compliance
- ✅ **Role-Based Access Control (RBAC)**: Platform Admin, Tenant Admin, Analyst

## Technology Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 15+ with pgcrypto (AES-256 encryption)
- **ORM**: SQLAlchemy 2.0
- **Cache**: Redis 7+
- **Language**: Python 3.11+
- **Container**: Docker + Docker Compose

## Architecture

```
backend/
├── app/
│   ├── api/              # API endpoints
│   │   ├── risk.py       # Risk scoring endpoints
│   │   ├── employees.py  # Employee management
│   │   └── analytics.py  # Analytics & dashboard
│   ├── core/             # Core business logic
│   │   └── risk_engine.py # Risk scoring algorithm (THE HEART)
│   ├── models/           # Database models (SQLAlchemy)
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic layer
│   ├── config/           # Configuration
│   │   ├── settings.py   # Environment settings
│   │   └── database.py   # DB connection
│   └── main.py           # FastAPI app initialization
├── tests/                # Unit & integration tests
├── migrations/           # Database migrations
├── requirements.txt      # Python dependencies
├── Dockerfile            # Production container
└── docker-compose.yml    # Local development stack
```

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (recommended)

### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend alembic upgrade head

# Run tests
docker-compose exec backend pytest

# Stop services
docker-compose down
```

The API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Option 2: Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials

# Initialize database
python -c "from app.config.database import init_db; init_db()"

# Or use Alembic migrations
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Database Setup

### Initialize Database (SQL)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE maidar;

# Run schema
\i migrations/001_initial_schema.sql
```

### Using Alembic Migrations

```bash
# Create a migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## API Endpoints

### Risk Scoring

```
POST   /api/v1/risk/calculate           # Calculate risk score
POST   /api/v1/risk/calculate-bulk      # Bulk calculation
GET    /api/v1/risk/employee/{id}       # Get employee risk scores
GET    /api/v1/risk/scenario/{id}       # Get scenario risk scores
```

### Employees

```
POST   /api/v1/employees/               # Create employee
GET    /api/v1/employees/{id}           # Get employee
GET    /api/v1/employees/               # List employees
PUT    /api/v1/employees/{id}           # Update employee
DELETE /api/v1/employees/{id}           # Delete employee (soft)
```

### Analytics

```
GET    /api/v1/analytics/overview       # Company risk overview
GET    /api/v1/analytics/by-department  # Risk by department
GET    /api/v1/analytics/by-seniority   # Risk by seniority
GET    /api/v1/analytics/by-age         # Risk by age group
GET    /api/v1/analytics/top-risk       # Top N highest-risk employees
```

## Testing

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
```

### Run Specific Tests

```bash
pytest tests/test_risk_engine.py
pytest tests/test_risk_engine.py::test_deterministic_calculation
```

## Risk Scoring Algorithm

### Formula

```
HumanRisk(e,s) = round(100 × L(e,s) × I(e,s))
```

### Likelihood Calculation

```
L(e,s) = 0.40×TL_risk + 0.25×Age + 0.20×LangMatch + 0.15×Gender
```

Where:
- **TL_risk** = `1 - (technical_literacy / 10)`
- **Age** = Age range modifier (36-50 = 0.45, 60+ = 0.75)
- **LangMatch** = Language match (match = 0.50, mismatch = 0.70)
- **Gender** = Gender modifier (Male = 0.50, Female = 0.55)

### Impact Calculation

```
I(e,s) = α_scenario × Seniority + (1-α_scenario) × RoleImpact
```

Where:
- **α_scenario** = Scenario-specific weight (BEC = 0.70, Credentials = 0.20)
- **Seniority** = Seniority impact (Intern = 0.20, Executive = 1.00)
- **RoleImpact** = Department-scenario specific impact (lookup table)

### Risk Bands

- **0-24**: Low
- **25-49**: Medium
- **50-74**: High
- **75-100**: Critical

## Example API Usage

### Calculate Risk Score

```bash
curl -X POST "http://localhost:8000/api/v1/risk/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid-here",
    "scenario_id": "uuid-here",
    "save_to_database": true
  }'
```

Response:
```json
{
  "employee_id": "uuid",
  "scenario_id": "uuid",
  "likelihood": 0.525,
  "impact": 0.875,
  "risk_score": 46,
  "risk_band": "MEDIUM",
  "likelihood_breakdown": {
    "tl_risk": 0.6,
    "tl_contribution": 0.24,
    "age_modifier": 0.55,
    "age_contribution": 0.1375,
    ...
  },
  "impact_breakdown": {
    "seniority_impact": 0.75,
    "role_impact": 1.0,
    "alpha": 0.70,
    ...
  },
  "algorithm_version": "v1.0"
}
```

## UAE Compliance

### Data Minimization
- ✅ Only collects risk-relevant attributes
- ✅ Age range (not full DOB)
- ✅ Optional gender
- ✅ No unnecessary personal data

### Purpose Limitation
- ✅ Data used strictly for security risk assessment
- ✅ No secondary commercial use

### Data Residency
- ✅ UAE-hosted infrastructure
- ✅ Tenant-level isolation

### Encryption
- ✅ AES-256 at rest (PostgreSQL pgcrypto)
- ✅ TLS 1.3 in transit

### Audit Logging
- ✅ All data imports logged
- ✅ All risk calculations logged
- ✅ All exports logged
- ✅ All deletions logged

### Right to Erasure
- ✅ Soft delete support
- ✅ Data export functionality
- ✅ Historical log removal option

## Security Best Practices

### Production Deployment

1. **Change all default secrets**
   ```bash
   # Generate strong SECRET_KEY
   python -c "import secrets; print(secrets.token_urlsafe(32))"

   # Generate ENCRYPTION_KEY
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Enable TLS 1.3**
   ```env
   USE_TLS=True
   TLS_VERSION=TLSv1.3
   ```

3. **Use strong database credentials**
4. **Enable PostgreSQL SSL**
5. **Configure firewall rules**
6. **Enable audit logging**
7. **Regular security updates**

## Performance Optimization

### Database Indexing
All critical queries are indexed:
- Tenant ID (for multi-tenancy)
- Employee attributes (age, seniority, department)
- Risk score (for sorting)
- Risk band (for filtering)

### Caching (Redis)
- Configuration lookups
- Frequently accessed employees
- Risk score calculations (with TTL)

### Connection Pooling
SQLAlchemy pool configured for high concurrency:
```python
pool_size=20
max_overflow=10
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
psql -U postgres -h localhost -d maidar
```

### Risk Score Calculation Errors
- Verify all employee attributes are valid
- Check technical_literacy is 0-10
- Ensure scenario exists in database
- Review audit logs for details

### Performance Issues
- Check database indexes
- Enable Redis caching
- Monitor connection pool
- Review slow query logs

## Contributing

### Code Style
- **Formatter**: Black
- **Linter**: Flake8
- **Type Checker**: mypy
- **Import Sorting**: isort

```bash
# Format code
black app/

# Lint
flake8 app/

# Type check
mypy app/

# Sort imports
isort app/
```

### Testing Requirements
- Minimum 80% code coverage
- All tests must pass
- New features require tests

## License

Proprietary - Internal Use Only

## Support

For issues or questions:
- Check documentation: `/docs`
- Review API docs: `http://localhost:8000/docs`
- Check audit logs for compliance issues
