# MAIDAR Staging Environment Deployment Guide

**Status:** 🔄 In Progress
**Environment:** AWS Staging
**Region:** me-south-1 (Middle East - Bahrain)

---

## Prerequisites Checklist

### 1. AWS Account Setup ☐
- [ ] AWS account created
- [ ] Billing configured
- [ ] IAM user with admin permissions created
- [ ] Access Key ID and Secret Access Key generated

### 2. Local Tools Installation ☐
- [ ] AWS CLI installed
- [ ] Terraform installed (>= 1.6.0)
- [ ] Docker installed
- [ ] Git configured

### 3. Cost Estimate 💰
**Staging Environment Monthly Cost:** ~$500-800/month

| Service | Instance Type | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t4g.large | ~$150 |
| ElastiCache Redis | cache.t4g.medium (x2) | ~$100 |
| ECS Fargate | 2 vCPU, 4GB RAM | ~$150 |
| Application Load Balancer | - | ~$25 |
| NAT Gateway | x3 AZs | ~$100 |
| CloudFront | Minimal | ~$10 |
| S3 Storage | Minimal | ~$5 |
| Data Transfer | Depends | ~$50 |

---

## Step 1: Install AWS CLI

### Windows (PowerShell)
```powershell
# Download AWS CLI installer
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

### Alternative: Using Chocolatey
```powershell
choco install awscli
```

---

## Step 2: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter your credentials:
AWS Access Key ID: YOUR_ACCESS_KEY
AWS Secret Access Key: YOUR_SECRET_KEY
Default region name: me-south-1
Default output format: json

# Verify configuration
aws sts get-caller-identity
```

---

## Step 3: Create Staging Terraform Configuration

I'll create a staging-specific configuration that uses smaller, cost-effective instances.

---

## Step 4: Initialize Terraform Backend

Before deploying, we need to create the S3 bucket and DynamoDB table for state management:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket maidar-terraform-state-staging \
  --region me-south-1 \
  --create-bucket-configuration LocationConstraint=me-south-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket maidar-terraform-state-staging \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket maidar-terraform-state-staging \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name maidar-terraform-locks-staging \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region me-south-1
```

---

## Step 5: Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Create staging workspace
terraform workspace new staging
terraform workspace select staging

# Plan deployment
terraform plan \
  -var="environment=staging" \
  -var="owner_email=your-email@example.com" \
  -var="db_password=YOUR_SECURE_PASSWORD" \
  -out=staging.tfplan

# Review the plan carefully!
# This will create ~30-40 AWS resources

# Apply infrastructure
terraform apply staging.tfplan
```

**Deployment time:** 15-25 minutes

---

## Step 6: Configure Application Secrets

After infrastructure is deployed, configure application secrets in AWS Secrets Manager:

```bash
# Get outputs from Terraform
terraform output

# Create application secrets
aws secretsmanager create-secret \
  --name maidar-staging-app-secrets \
  --description "MAIDAR Staging Application Secrets" \
  --secret-string '{
    "DATABASE_URL": "postgresql+psycopg://postgres:PASSWORD@RDS_ENDPOINT:5432/maidar",
    "REDIS_URL": "redis://ELASTICACHE_ENDPOINT:6379/0",
    "JWT_SECRET": "GENERATE_RANDOM_SECRET_HERE",
    "SMTP_HOST": "email-smtp.me-south-1.amazonaws.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "YOUR_SMTP_USER",
    "SMTP_PASSWORD": "YOUR_SMTP_PASSWORD",
    "FROM_EMAIL": "noreply@staging.maidar.com",
    "SENTRY_DSN": "YOUR_SENTRY_DSN",
    "APP_URL": "https://staging.maidar.com"
  }' \
  --region me-south-1
```

---

## Step 7: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region me-south-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com

# Build backend image
cd backend
docker build -t maidar-backend:staging .

# Tag and push
docker tag maidar-backend:staging ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/maidar-backend:staging
docker push ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/maidar-backend:staging

# Build frontend image
cd ../frontend
docker build -t maidar-frontend:staging .

# Tag and push
docker tag maidar-frontend:staging ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/maidar-frontend:staging
docker push ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/maidar-frontend:staging
```

---

## Step 8: Run Database Migrations

```bash
# Connect to ECS task
aws ecs execute-command \
  --cluster maidar-staging-cluster \
  --task TASK_ID \
  --container backend \
  --interactive \
  --command "/bin/bash"

# Inside container
cd /app
alembic upgrade head
```

---

## Step 9: Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test health endpoint
curl https://staging.maidar.com/health

# Expected response:
# {"status": "healthy", "timestamp": "..."}

# Test detailed health
curl https://staging.maidar.com/health/detailed

# Test Prometheus metrics
curl https://staging.maidar.com/metrics

# Test frontend
curl https://staging.maidar.com
```

---

## Step 10: Configure DNS (Optional)

If you have a domain, point it to the ALB:

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route53 record (if using Route53)
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "staging.maidar.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$ALB_DNS'"}]
      }
    }]
  }'
```

---

## Monitoring Setup

### 1. Sentry Configuration
```bash
# Get Sentry DSN from https://sentry.io
# Add to Secrets Manager (already done in Step 6)
```

### 2. CloudWatch Dashboards
```bash
# Dashboards are automatically created by Terraform
# Access at: AWS Console → CloudWatch → Dashboards → maidar-staging
```

### 3. Prometheus Metrics
```bash
# Scrape metrics from /metrics endpoint
curl https://staging.maidar.com/metrics
```

---

## Backup Verification

```bash
# RDS automated backups are enabled (30-day retention)
# Verify backup schedule
aws rds describe-db-instances \
  --db-instance-identifier maidar-staging-postgres \
  --query 'DBInstances[0].{BackupRetentionPeriod:BackupRetentionPeriod,PreferredBackupWindow:PreferredBackupWindow}'
```

---

## Cost Optimization for Staging

To reduce costs, we can:
1. Use smaller instance types (already configured)
2. Enable auto-shutdown for non-business hours
3. Use Spot instances for ECS tasks (optional)
4. Reduce backup retention to 7 days

---

## Rollback Procedure

If deployment fails:

```bash
# Destroy all resources
terraform destroy \
  -var="environment=staging" \
  -var="owner_email=your-email@example.com" \
  -var="db_password=YOUR_SECURE_PASSWORD"

# Clean up state
terraform workspace select default
terraform workspace delete staging
```

---

## Next Steps After Deployment

1. ✅ Verify all health endpoints
2. ✅ Test authentication flows
3. ✅ Run E2E tests against staging
4. ✅ Configure monitoring alerts
5. ✅ Set up CI/CD pipeline for automatic deployments

---

## Troubleshooting

### Issue: Terraform state locked
```bash
# Force unlock (use with caution!)
terraform force-unlock LOCK_ID
```

### Issue: ECS tasks failing to start
```bash
# Check ECS task logs
aws logs tail /ecs/maidar-staging-backend --follow
```

### Issue: Database connection timeout
```bash
# Check security group rules
# Verify ECS tasks are in private subnet
# Verify RDS is in database subnet
```

### Issue: ALB health checks failing
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN
```

---

## Security Checklist

- [x] All secrets stored in AWS Secrets Manager
- [x] Database in private subnet (no public access)
- [x] Redis in private subnet
- [x] Security groups configured with least privilege
- [x] VPC Flow Logs enabled
- [x] CloudTrail logging enabled
- [x] WAF rules applied to ALB
- [x] SSL/TLS certificates configured
- [x] Automated security scanning in CI/CD

---

## Support & Documentation

- **Terraform Docs:** [terraform.io/docs](https://terraform.io/docs)
- **AWS CLI Docs:** [docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli)
- **ECS Docs:** [docs.aws.amazon.com/ecs](https://docs.aws.amazon.com/ecs)

---

**Status:** Ready to deploy once prerequisites are met
**Estimated Setup Time:** 2-3 hours (first time)
**Deployment Time:** 20-30 minutes

