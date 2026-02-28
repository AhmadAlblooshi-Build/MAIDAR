# MAIDAR Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Database Migrations](#database-migrations)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup and Recovery](#backup-and-recovery)

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Kubernetes 1.25+ (for K8s deployment)
- kubectl CLI tool
- PostgreSQL 15+ client
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/maidar.git
cd maidar
```

### 2. Create Environment File

Create `.env.prod` file in the root directory:

```env
# Database
POSTGRES_DB=maidar_prod
POSTGRES_USER=maidar
POSTGRES_PASSWORD=<strong-password-here>

# Redis
REDIS_PASSWORD=<strong-redis-password>

# Application
SECRET_KEY=<generate-with-openssl-rand-hex-32>
APP_ENV=production
DEBUG=false

# URLs
APP_URL=https://maidar.ai
FRONTEND_URL=https://maidar.ai
NEXT_PUBLIC_API_URL=https://api.maidar.ai

# CORS
CORS_ORIGINS=https://maidar.ai,https://www.maidar.ai

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_USE_TLS=true
FROM_EMAIL=noreply@maidar.ai
FROM_NAME=MAIDAR

# AI (Optional)
ANTHROPIC_API_KEY=<anthropic-api-key>

# Compliance
COMPLIANCE_MODE=UAE
DATA_RESIDENCY_REGION=UAE
```

## Docker Deployment

### 1. Build Images

```bash
# Build backend
cd backend
docker build -f Dockerfile.prod -t maidar/backend:latest .

# Build frontend
cd ../frontend
docker build -f Dockerfile.prod -t maidar/frontend:latest .
```

### 2. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed RBAC data
docker-compose -f docker-compose.prod.yml exec backend python -m app.cli.seed_rbac
```

### 4. Create Super Admin

```bash
docker-compose -f docker-compose.prod.yml exec backend python -c "
from app.config.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@maidar.ai',
    password_hash=get_password_hash('AdminPassword123!'),
    full_name='System Administrator',
    role=UserRole.PLATFORM_SUPER_ADMIN,
    is_active=True,
    email_verified=True
)
db.add(admin)
db.commit()
print('Super admin created successfully')
"
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace maidar-prod
```

### 2. Create Secrets

```bash
# Create secrets from .env.prod
kubectl create secret generic maidar-secrets \
  --from-env-file=.env.prod \
  -n maidar-prod
```

### 3. Deploy Application

```bash
# Apply all manifests
kubectl apply -f k8s/deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=backend -n maidar-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n maidar-prod --timeout=300s
```

### 4. Initialize Database

```bash
# Run migrations
kubectl exec -n maidar-prod $(kubectl get pods -n maidar-prod -l app=backend -o jsonpath="{.items[0].metadata.name}") -- python -m alembic upgrade head

# Seed RBAC
kubectl exec -n maidar-prod $(kubectl get pods -n maidar-prod -l app=backend -o jsonpath="{.items[0].metadata.name}") -- python -m app.cli.seed_rbac
```

### 5. Access Application

```bash
# Get ingress IP
kubectl get ingress maidar-ingress -n maidar-prod

# Update DNS records to point to ingress IP
# A record: maidar.ai -> <ingress-ip>
# A record: api.maidar.ai -> <ingress-ip>
```

## Database Migrations

### Running Migrations

```bash
# Docker
docker-compose exec backend alembic upgrade head

# Kubernetes
kubectl exec -n maidar-prod <backend-pod> -- alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "Description"
```

### Manual SQL Migrations

```bash
# Run SQL migration file
psql $DATABASE_URL -f backend/migrations/add_rbac_tables.sql
```

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

```bash
# Install cert-manager (K8s)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@maidar.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Custom SSL Certificate (Docker)

```bash
# Place certificates
mkdir -p nginx/ssl
cp your-cert.crt nginx/ssl/cert.crt
cp your-key.key nginx/ssl/key.key

# Restart nginx
docker-compose restart nginx
```

## Monitoring Setup

### Deploy Prometheus & Grafana

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus
kubectl apply -f monitoring/prometheus-deployment.yaml

# Deploy Grafana
kubectl apply -f monitoring/grafana-deployment.yaml

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3001:80
# Open http://localhost:3001 (admin/admin)
```

### Configure Alerts

```bash
# Deploy Alertmanager
kubectl apply -f monitoring/alertmanager-deployment.yaml

# Configure Slack notifications (optional)
kubectl create secret generic alertmanager-slack \
  --from-literal=webhook-url='https://hooks.slack.com/services/...' \
  -n monitoring
```

## Backup and Recovery

### Database Backup

```bash
# Automated daily backup
cat > /etc/cron.daily/maidar-backup <<'EOF'
#!/bin/bash
BACKUP_DIR=/backups/maidar
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker-compose exec -T postgres pg_dump -U maidar maidar_prod | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup Redis
docker-compose exec -T redis redis-cli --rdb /data/dump.rdb
docker cp $(docker-compose ps -q redis):/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/maidar-backup
```

### Database Restore

```bash
# Restore from backup
gunzip -c /backups/maidar/db_backup_20260227_120000.sql.gz | \
  docker-compose exec -T postgres psql -U maidar maidar_prod
```

### Volume Backup (K8s)

```bash
# Backup persistent volumes
kubectl create -f - <<EOF
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: maidar-backup-$(date +%Y%m%d)
  namespace: velero
spec:
  includedNamespaces:
  - maidar-prod
  storageLocation: default
  volumeSnapshotLocations:
  - default
EOF
```

## Troubleshooting

### Check Pod Logs

```bash
# Backend logs
kubectl logs -f -n maidar-prod -l app=backend

# Frontend logs
kubectl logs -f -n maidar-prod -l app=frontend

# Database logs
kubectl logs -f -n maidar-prod -l app=postgres
```

### Check Service Status

```bash
# All services
kubectl get all -n maidar-prod

# Describe pod
kubectl describe pod <pod-name> -n maidar-prod

# Shell into pod
kubectl exec -it <pod-name> -n maidar-prod -- /bin/bash
```

### Common Issues

**Issue**: Database connection timeout
- **Solution**: Check DATABASE_URL, verify postgres pod is running, check network policies

**Issue**: Frontend can't connect to backend
- **Solution**: Verify NEXT_PUBLIC_API_URL is set correctly, check CORS_ORIGINS, verify ingress rules

**Issue**: High memory usage
- **Solution**: Increase resource limits, optimize database queries, check for memory leaks

## Support

For production support:
- Email: support@maidar.ai
- Slack: #maidar-production
- GitHub Issues: https://github.com/your-org/maidar/issues
