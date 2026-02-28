# MAIDAR Platform - Quick Start Deployment Instructions

**Last Updated**: February 28, 2026

---

## 🚀 FASTEST PATH TO RUNNING SYSTEM

Follow these steps to get MAIDAR running locally in **under 5 minutes**.

---

## Prerequisites

1. **Docker Desktop** installed and running
2. **Node.js 18+** installed
3. **Python 3.10+** installed
4. **Git** installed

---

## Step 1: Start Infrastructure (2 minutes)

```bash
cd MAIDAR

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait 10 seconds for services to initialize
# Verify services are running:
docker ps
```

You should see both `postgres` and `redis` containers running.

---

## Step 2: Setup Backend Database (1 minute)

```bash
cd backend

# Install Python dependencies (if not already done)
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed RBAC permissions and roles
python -m app.cli.seed_rbac

# Create super admin user
python -m app.cli.create_super_admin
# Follow the prompts to create your admin account
```

---

## Step 3: Configure Environment (30 seconds)

### Backend Configuration

Edit `backend/.env` and add your Claude API key (if you want AI scenario generation):

```bash
# Open backend/.env and update this line:
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

> **Note**: You can get a Claude API key from https://console.anthropic.com/

If you don't have one yet, AI scenario generation will use fallback templates.

### Frontend Configuration

The `frontend/.env.local` file is already configured for local development. No changes needed.

---

## Step 4: Start Backend (30 seconds)

```bash
cd backend

# Start FastAPI backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify backend is running**:
- Open http://localhost:8000 - should see JSON response
- Open http://localhost:8000/docs - should see Swagger API documentation
- Open http://localhost:8000/health - should see `{"status": "healthy"}`

---

## Step 5: Start Frontend (30 seconds)

Open a **new terminal**:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start Next.js development server
npm run dev
```

**Verify frontend is running**:
- Open http://localhost:3000 - should see MAIDAR landing page

---

## Step 6: Login and Explore! (1 minute)

1. Go to http://localhost:3000/login

2. Login with the super admin account you created in Step 2

3. Explore the platform:
   - **Dashboard**: Overview of risk metrics
   - **Employees**: Add employees (individual or CSV upload)
   - **AI Scenario Lab**: Generate phishing scenarios with AI
   - **Simulations**: Launch simulations
   - **Analytics**: View risk trends
   - **Settings**: Update your profile

---

## 📊 Ports Overview

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

## ⚙️ Quick Commands Reference

### Start Everything
```bash
# Terminal 1: Infrastructure
docker-compose up -d postgres redis

# Terminal 2: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Stop Everything
```bash
# Stop frontend (Ctrl+C in frontend terminal)
# Stop backend (Ctrl+C in backend terminal)

# Stop infrastructure
docker-compose down
```

### View Logs
```bash
# Backend logs (in backend terminal)
# Already showing with --reload

# PostgreSQL logs
docker logs -f maidar-postgres

# Redis logs
docker logs -f maidar-redis
```

### Reset Database
```bash
cd backend

# Drop all tables
alembic downgrade base

# Recreate all tables
alembic upgrade head

# Re-seed data
python -m app.cli.seed_rbac
python -m app.cli.create_super_admin
```

---

## 🐛 Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
cd backend
pip install -r requirements.txt
```

---

**Error**: `sqlalchemy.exc.OperationalError: connection refused`

**Solution**: PostgreSQL isn't running
```bash
docker-compose up -d postgres
# Wait 10 seconds, then try again
```

---

**Error**: `alembic.util.exc.CommandError: Can't locate revision identified by 'xyz'`

**Solution**: Database migration issue
```bash
cd backend
alembic stamp head
alembic upgrade head
```

---

### Frontend won't start

**Error**: `Error: Cannot find module 'next'`

**Solution**:
```bash
cd frontend
npm install
```

---

**Error**: Frontend loads but API calls fail (Network Error)

**Solution**: Backend isn't running or wrong URL
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running:
cd backend
uvicorn app.main:app --reload
```

---

### Database Issues

**Error**: `permission denied for table X`

**Solution**: Database user permissions
```bash
# Recreate database with proper permissions
docker-compose down -v
docker-compose up -d postgres
# Wait 10 seconds
cd backend
alembic upgrade head
```

---

**Can't connect to database**

**Solution**: Check Docker and database URL
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string in backend/.env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/maidar
```

---

## 🎯 Next Steps After Setup

### 1. Add Sample Data

```bash
# Create sample employees via API
curl -X POST http://localhost:8000/api/v1/employees/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "department": "Engineering",
    "job_title": "Senior Developer",
    "seniority_level": "senior",
    "age_range": "35_44"
  }'
```

Or use the **bulk CSV upload** feature in the Employees page.

### 2. Generate AI Scenarios

1. Go to **AI Scenario Lab** page
2. Select scenario parameters:
   - Context Type: "IT Alert", "HR", "Finance", etc.
   - Target Segment: Department to target
   - Tone: "urgent", "friendly", "formal"
3. Click **Generate Scenario**
4. Save to library

### 3. Launch First Simulation

1. Go to **Simulations** page
2. Click **New Simulation**
3. Select scenario
4. Select target employees
5. Schedule or launch immediately
6. View results in real-time

---

## 🔐 Security Notes

### For Development:
- Default credentials are in `.env` files
- SMTP is disabled (emails logged to console)
- Rate limiting is enabled but lenient
- CORS allows localhost origins

### Before Production:
- ✅ Generate new SECRET_KEY and ENCRYPTION_KEY
- ✅ Use strong PostgreSQL password
- ✅ Enable HTTPS/TLS
- ✅ Configure real SMTP server
- ✅ Restrict CORS origins
- ✅ Enable monitoring (Sentry)
- ✅ Set DEBUG=False
- ✅ Use production .env file

See `DEPLOYMENT_GUIDE.md` for full production deployment instructions.

---

## 📞 Getting Help

- **API Documentation**: http://localhost:8000/docs
- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Architecture**: See `ARCHITECTURE.md`
- **API Reference**: See `API_DOCUMENTATION.md`

---

## ✅ Success Checklist

After completing setup, verify:

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Can login with super admin account
- [ ] Can view dashboard
- [ ] Can create/view employees
- [ ] Can access all menu items
- [ ] No console errors in browser

---

**🎉 Congratulations! MAIDAR is now running!**

Start building your first phishing simulation campaign! 🚀
