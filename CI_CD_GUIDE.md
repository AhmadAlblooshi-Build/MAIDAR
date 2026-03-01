# CI/CD Pipeline Guide - MAIDAR

**Automated deployment pipeline with GitHub Actions**

---

## Overview

The MAIDAR CI/CD pipeline provides:
- ✅ Automated testing on every commit
- ✅ Code quality checks (linting, formatting, security)
- ✅ Docker image building
- ✅ Automated deployment to staging/production
- ✅ Rollback capabilities
- ✅ Security scanning

---

## Pipeline Stages

### Stage 1: Code Quality & Linting
**Runs on:** Every push and PR

- **Black** - Code formatting check
- **Flake8** - Linting (PEP 8 compliance)
- **isort** - Import sorting check
- **MyPy** - Type checking (optional)

### Stage 2: Security Scanning
**Runs on:** Every push and PR

- **Bandit** - Security linter (finds common security issues)
- **Safety** - Dependency vulnerability checker

### Stage 3: Backend Tests
**Runs on:** Every push and PR

- Sets up PostgreSQL and Redis services
- Runs database migrations
- Executes pytest (unit + integration tests)
- Generates coverage reports
- Uploads to Codecov

### Stage 4: Frontend Build & Tests
**Runs on:** Every push and PR

- Installs dependencies
- Runs ESLint
- Builds Next.js application
- Runs Playwright E2E tests

### Stage 5: Build Docker Images
**Runs on:** Push to main/develop branches

- Builds backend and frontend Docker images
- Pushes to Docker Hub
- Uses layer caching for faster builds

### Stage 6: Deploy to Staging
**Runs on:** Push to develop branch

- Deploys to AWS ECS staging environment
- Runs smoke tests
- Sends Slack notification

### Stage 7: Deploy to Production
**Runs on:** Push to main branch (with manual approval)

- Creates database backup
- Deploys to AWS ECS production
- Runs smoke tests
- Creates GitHub release
- Sends Slack notification

### Stage 8: Rollback
**Runs on:** Manual trigger

- Reverts to previous task definition
- Sends alert notification

---

## Setup Instructions

### 1. GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
# Docker Hub
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Slack Notifications (optional)
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# GitHub Token (auto-provided)
GITHUB_TOKEN=<automatically provided>
```

### 2. GitHub Environments

Create environments for deployment approvals:

```bash
# Settings → Environments → New environment

1. staging
   - No protection rules needed
   - URL: https://staging.maidar.com

2. production
   - Required reviewers: Add team members
   - Wait timer: 5 minutes (optional)
   - URL: https://app.maidar.com
```

### 3. Docker Hub Setup

```bash
# 1. Create Docker Hub account
# 2. Create repositories
docker login
docker tag maidar/backend:latest youruser/maidar-backend:latest
docker push youruser/maidar-backend:latest
```

### 4. AWS ECS Setup

The pipeline assumes you have:
- ECS Cluster: `maidar-staging` and `maidar-production`
- ECS Service: `maidar-backend-staging` and `maidar-backend-production`
- Task Definition configured

(See Terraform section for infrastructure setup)

---

## Local Testing

### Test Linting
```bash
cd backend

# Run Black
black --check .

# Run Flake8
flake8 app/ --max-line-length=120

# Run isort
isort --check-only app/

# Run MyPy
mypy app/ --ignore-missing-imports
```

### Test Security
```bash
cd backend

# Run Bandit
bandit -r app/

# Run Safety
safety check
```

### Test Backend
```bash
cd backend

# Start services
docker-compose up -d postgres redis

# Run tests
pytest tests/ -v --cov=app
```

### Test Frontend
```bash
cd frontend

# Run linting
npm run lint

# Build
npm run build

# Run E2E tests
npx playwright test
```

---

## Docker Usage

### Build Images Locally
```bash
# Backend
docker build -t maidar-backend:latest ./backend

# Frontend
docker build -t maidar-frontend:latest ./frontend
```

### Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Services
- Backend API: http://localhost:8001
- Frontend: http://localhost:3000
- Flower (Celery): http://localhost:5555
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Deployment Process

### Automatic Deployment (Staging)

```bash
# 1. Push to develop branch
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop

# 2. GitHub Actions automatically:
#    - Runs all tests
#    - Builds Docker images
#    - Deploys to staging
#    - Runs smoke tests

# 3. Verify staging
curl https://staging-api.maidar.com/health
```

### Manual Deployment (Production)

```bash
# 1. Merge to main branch
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions:
#    - Runs all tests
#    - Builds Docker images
#    - Waits for manual approval

# 3. Approve deployment
#    - Go to GitHub Actions
#    - Click on workflow run
#    - Review and approve deployment

# 4. Pipeline automatically:
#    - Creates database backup
#    - Deploys to production
#    - Runs smoke tests
#    - Creates GitHub release
```

---

## Rollback Procedure

### Option 1: GitHub Actions Workflow

```bash
# 1. Go to GitHub Actions
# 2. Click "Run workflow"
# 3. Select "Rollback Production"
# 4. Confirm
```

### Option 2: Manual AWS CLI

```bash
# Get previous task definition
aws ecs describe-services \
  --cluster maidar-production \
  --services maidar-backend-production \
  --query 'services[0].deployments[1].taskDefinition'

# Update service
aws ecs update-service \
  --cluster maidar-production \
  --service maidar-backend-production \
  --task-definition <previous-task-def>
```

### Option 3: Database Rollback

```bash
# List backups
aws rds describe-db-snapshots \
  --db-instance-identifier maidar-production

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier maidar-production-restored \
  --db-snapshot-identifier maidar-backup-YYYYMMDD-HHMMSS
```

---

## Troubleshooting

### Tests Failing

```bash
# Check test logs
# In GitHub Actions → Click on failed job → View logs

# Run tests locally
cd backend
pytest tests/ -v

# Check coverage
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### Docker Build Failing

```bash
# Test build locally
docker build -t test-backend ./backend

# Check for large files
du -sh backend/*

# Verify .dockerignore
cat backend/.dockerignore
```

### Deployment Failing

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster maidar-production \
  --services maidar-backend-production

# Check CloudWatch logs
aws logs tail /ecs/maidar-backend-production --follow

# Check task definition
aws ecs describe-task-definition \
  --task-definition maidar-backend-production
```

### Database Migration Issues

```bash
# Connect to production database
aws rds describe-db-instances --db-instance-identifier maidar-production

# Check migration status
alembic current

# Run migrations manually
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

---

## Monitoring

### GitHub Actions Dashboard

View pipeline status:
```
https://github.com/YOUR_ORG/maidar/actions
```

### Codecov Dashboard

View coverage reports:
```
https://codecov.io/gh/YOUR_ORG/maidar
```

### Slack Notifications

Configure Slack webhook for real-time alerts:
- Build failures
- Deployment completions
- Test results

---

## Best Practices

### Branch Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/your-feature
```

### Commit Messages

Use conventional commits:
```bash
feat: add MFA support
fix: resolve session timeout issue
docs: update API documentation
test: add integration tests
refactor: improve risk engine performance
```

### PR Process

1. Create feature branch
2. Make changes
3. Run tests locally
4. Create pull request
5. Wait for CI checks to pass
6. Get code review
7. Merge to develop
8. Test on staging
9. Merge to main
10. Deploy to production

---

## Performance Optimization

### Cache Docker Layers

Already configured in pipeline:
```yaml
cache-from: type=registry,ref=maidar/backend:buildcache
cache-to: type=registry,ref=maidar/backend:buildcache,mode=max
```

### Parallel Jobs

Tests run in parallel:
- Lint
- Security
- Backend Tests
- Frontend Tests

### Skip CI

To skip CI for documentation changes:
```bash
git commit -m "docs: update README [skip ci]"
```

---

## Security

### Secret Scanning

GitHub automatically scans for:
- API keys
- Passwords
- Private keys
- Tokens

### Dependency Updates

Use Dependabot:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

---

## Cost Optimization

### GitHub Actions Minutes

Free tier: 2,000 minutes/month

Optimize:
- Use caching
- Skip unnecessary jobs
- Use self-hosted runners (optional)

### Docker Hub

Free tier: Unlimited public repos

Consider:
- Amazon ECR for private images
- GitHub Container Registry

---

## Metrics

Track these metrics:
- **Build time:** Target < 10 minutes
- **Test coverage:** Target > 80%
- **Deployment frequency:** Daily to staging
- **Mean time to recovery:** Target < 1 hour
- **Change failure rate:** Target < 15%

---

## Next Steps

1. **Setup GitHub Secrets** - Add all required secrets
2. **Test Pipeline** - Create test PR
3. **Configure Environments** - Add protection rules
4. **Setup Notifications** - Configure Slack webhook
5. **Monitor First Deployment** - Watch pipeline execute

---

**Pipeline Status:** ✅ Ready for use

Push your first commit and watch the magic happen! 🚀
