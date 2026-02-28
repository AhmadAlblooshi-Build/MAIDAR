# Infrastructure as Code - MAIDAR Platform

**Complete AWS infrastructure deployment with Terraform**

---

## Overview

This document explains how to deploy and manage MAIDAR's AWS infrastructure using Terraform. The infrastructure includes:

- ✅ **VPC** - Multi-AZ networking with public, private, and database subnets
- ✅ **RDS PostgreSQL** - Multi-AZ database with automated backups and read replicas
- ✅ **ElastiCache Redis** - Multi-node Redis cluster for Celery and caching
- ✅ **ECS Fargate** - Containerized services (backend, celery-worker, celery-beat)
- ✅ **Application Load Balancer** - HTTPS with automatic SSL/TLS
- ✅ **CloudFront CDN** - Global content delivery with edge caching
- ✅ **Route53** - DNS management with health checks
- ✅ **WAF** - Web application firewall with managed rules
- ✅ **S3** - Encrypted buckets for backups, uploads, and logs
- ✅ **Secrets Manager** - Secure credential storage with rotation
- ✅ **CloudWatch** - Comprehensive monitoring and alerting
- ✅ **IAM** - Least-privilege roles and policies

**Estimated Monthly Cost:**
- Production: ~$800-1,200/month
- Staging: ~$300-400/month

---

## Prerequisites

### 1. Install Terraform

```bash
# macOS
brew install terraform

# Windows (with Chocolatey)
choco install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip
unzip terraform_1.7.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

### 2. Install AWS CLI

```bash
# macOS
brew install awscli

# Windows
# Download from: https://aws.amazon.com/cli/

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### 3. AWS Account Setup

You need an AWS account with:
- Administrative IAM permissions
- Credit card on file
- Service quotas increased (if deploying to new account)

---

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform/

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive
```

### 2. Create Terraform State Backend

Before deploying infrastructure, create S3 bucket and DynamoDB table for state:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket maidar-terraform-state \
  --region me-south-1 \
  --create-bucket-configuration LocationConstraint=me-south-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket maidar-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket maidar-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name maidar-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region me-south-1
```

### 3. Plan Deployment

```bash
# Set database password
export TF_VAR_db_password="STRONG_PASSWORD_HERE"

# Plan production deployment
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=production.tfplan

# Review the plan
terraform show production.tfplan
```

### 4. Deploy Infrastructure

```bash
# Apply the plan
terraform apply production.tfplan

# This will take 15-30 minutes to complete
```

### 5. Save Outputs

```bash
# Save outputs to file
terraform output -json > outputs.json

# View specific output
terraform output alb_dns_name
terraform output rds_endpoint
terraform output redis_primary_endpoint
```

---

## Directory Structure

```
terraform/
├── main.tf                    # Main configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── vpc.tf                     # VPC and networking
├── security_groups.tf         # Security groups
├── rds.tf                     # RDS PostgreSQL
├── elasticache.tf             # Redis cluster
├── ecs.tf                     # ECS Fargate services
├── alb.tf                     # Application Load Balancer
├── s3.tf                      # S3 buckets
├── secrets.tf                 # Secrets Manager
├── iam.tf                     # IAM roles and policies
├── cloudfront.tf              # CloudFront CDN
├── route53.tf                 # DNS configuration
├── waf.tf                     # Web Application Firewall
├── monitoring.tf              # CloudWatch and SNS
└── environments/
    ├── production/
    │   └── terraform.tfvars   # Production variables
    └── staging/
        └── terraform.tfvars   # Staging variables
```

---

## Configuration

### Environment Variables

Set these before deploying:

```bash
# Required
export TF_VAR_db_password="STRONG_DATABASE_PASSWORD"
export TF_VAR_owner_email="devops@company.com"
export TF_VAR_alarm_sns_email="alerts@company.com"

# Optional
export TF_VAR_domain_name="maidar.com"
export TF_VAR_aws_region="me-south-1"
```

### Variable Files

Edit `terraform/environments/production/terraform.tfvars`:

```hcl
# General
environment  = "production"
aws_region   = "me-south-1"
owner_email  = "devops@company.com"
domain_name  = "maidar.com"

# RDS
db_instance_class = "db.t4g.large"
db_multi_az       = true

# ECS
backend_desired_count = 3

# Features
enable_waf          = true
enable_cloudfront   = true
enable_read_replica = true
```

---

## Deployment Workflows

### Production Deployment

```bash
# 1. Plan
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=production.tfplan

# 2. Review (ALWAYS review!)
terraform show production.tfplan

# 3. Apply
terraform apply production.tfplan

# 4. Save outputs
terraform output -json > production-outputs.json
```

### Staging Deployment

```bash
# Use staging configuration (smaller/cheaper resources)
terraform plan \
  -var-file="environments/staging/terraform.tfvars" \
  -out=staging.tfplan

terraform apply staging.tfplan
```

### Infrastructure Update

```bash
# Update code (e.g., change instance size)
vim environments/production/terraform.tfvars

# Plan changes
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=update.tfplan

# Review what will change
terraform show update.tfplan

# Apply changes
terraform apply update.tfplan
```

---

## Post-Deployment Steps

### 1. Update DNS Nameservers

After deployment, update your domain's nameservers:

```bash
# Get Route53 nameservers
terraform output route53_name_servers

# Update nameservers at your domain registrar:
# ns-123.awsdns-12.com
# ns-456.awsdns-34.net
# ns-789.awsdns-56.org
# ns-012.awsdns-78.co.uk
```

### 2. Update Secrets

Replace placeholder secrets in AWS Secrets Manager:

```bash
# Get secret ARNs
terraform output | grep secret_

# Update Sentry DSN
aws secretsmanager put-secret-value \
  --secret-id maidar-production-sentry-dsn-XXXXX \
  --secret-string "https://your-sentry-dsn@sentry.io/project-id"

# Update SendGrid API key
aws secretsmanager put-secret-value \
  --secret-id maidar-production-sendgrid-key-XXXXX \
  --secret-string "SG.XXXXXXXXXXXXXXXXXXXXXX"

# Update Claude API key
aws secretsmanager put-secret-value \
  --secret-id maidar-production-claude-key-XXXXX \
  --secret-string "sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXX"
```

### 3. Deploy Application

```bash
# Build and push Docker image
docker build -t maidar/backend:latest -f backend/Dockerfile .
docker push maidar/backend:latest

# Force ECS service update
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-backend \
  --force-new-deployment

# Monitor deployment
aws ecs wait services-stable \
  --cluster maidar-production-cluster \
  --services maidar-production-backend
```

### 4. Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test health endpoint
curl https://api.maidar.com/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-28T10:30:00Z",
#   "version": "1.0.0"
# }

# Check CloudWatch dashboard
echo "Dashboard URL: https://console.aws.amazon.com/cloudwatch/home?region=me-south-1#dashboards:name=maidar-production-dashboard"
```

---

## Common Operations

### Scale Services

```bash
# Scale backend to 5 instances
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-backend \
  --desired-count 5

# Scale Celery workers to 4 instances
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-celery-worker \
  --desired-count 4
```

### Update Docker Image

```bash
# Update task definition with new image
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-backend \
  --force-new-deployment

# Monitor deployment
watch 'aws ecs describe-services \
  --cluster maidar-production-cluster \
  --services maidar-production-backend \
  | jq ".services[0].deployments"'
```

### Database Backup

```bash
# Manual backup (in addition to automated backups)
aws rds create-db-snapshot \
  --db-instance-identifier maidar-production-postgres \
  --db-snapshot-identifier maidar-manual-backup-$(date +%Y%m%d-%H%M%S)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier maidar-production-postgres
```

### Restore from Backup

```bash
# Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier maidar-production-postgres-restored \
  --db-snapshot-identifier maidar-production-postgres-2026-02-28 \
  --db-instance-class db.t4g.large

# Update connection string in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id maidar-production-db-password-XXXXX \
  --secret-string "NEW_CONNECTION_STRING"

# Restart ECS services to pick up new connection
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-backend \
  --force-new-deployment
```

---

## Monitoring and Alerts

### View Metrics

```bash
# CloudWatch Dashboard
open "https://console.aws.amazon.com/cloudwatch/home?region=me-south-1#dashboards:name=maidar-production-dashboard"

# ECS Cluster Metrics
aws ecs describe-services \
  --cluster maidar-production-cluster \
  --services maidar-production-backend \
  | jq '.services[0] | {runningCount, desiredCount, deployments}'

# RDS Metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=maidar-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### View Logs

```bash
# Backend logs
aws logs tail /ecs/maidar-production/backend --follow

# Celery worker logs
aws logs tail /ecs/maidar-production/celery-worker --follow

# Celery beat logs
aws logs tail /ecs/maidar-production/celery-beat --follow

# ALB access logs
aws s3 ls s3://maidar-production-alb-logs/ --recursive | tail
```

---

## Troubleshooting

### Issue: Terraform State Lock

**Symptoms:**
```
Error: Error locking state: Error acquiring the state lock
```

**Solution:**
```bash
# Force unlock (ONLY if you're sure no other Terraform is running)
terraform force-unlock <LOCK_ID>

# Or delete the lock from DynamoDB
aws dynamodb delete-item \
  --table-name maidar-terraform-locks \
  --key '{"LockID": {"S": "maidar-terraform-state/production/terraform.tfstate-md5"}}'
```

### Issue: ECS Service Won't Start

**Symptoms:**
- Tasks keep stopping
- Service shows 0 running tasks

**Solution:**
```bash
# Check task failures
aws ecs describe-tasks \
  --cluster maidar-production-cluster \
  --tasks $(aws ecs list-tasks --cluster maidar-production-cluster --service-name maidar-production-backend --query 'taskArns[0]' --output text) \
  | jq '.tasks[0].stoppedReason'

# Common issues:
# 1. Secrets not accessible
# 2. Docker image pull failed
# 3. Health check failing
# 4. Insufficient memory/CPU

# Fix: Update task definition or check logs
aws logs tail /ecs/maidar-production/backend --since 10m
```

### Issue: Database Connection Timeout

**Symptoms:**
```
psycopg.OperationalError: timeout expired
```

**Solution:**
```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw rds_security_group_id) \
  | jq '.SecurityGroups[0].IpPermissions'

# Verify ECS tasks can reach RDS
# 1. Exec into running task
aws ecs execute-command \
  --cluster maidar-production-cluster \
  --task <TASK_ID> \
  --container backend \
  --interactive \
  --command "/bin/bash"

# 2. Test connection
nc -zv maidar-production-postgres.xxxxx.me-south-1.rds.amazonaws.com 5432
```

### Issue: High Costs

**Symptoms:**
- AWS bill higher than expected

**Solution:**
```bash
# Check cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Common cost optimizations:
# 1. Reduce RDS instance size (db.t4g.large → db.t4g.medium)
# 2. Disable CloudFront if not needed
# 3. Reduce ECS task count
# 4. Use Savings Plans or Reserved Instances
```

---

## Security Best Practices

### 1. Rotate Secrets Regularly

```bash
# Rotate database password (triggers Lambda rotation)
aws secretsmanager rotate-secret \
  --secret-id maidar-production-db-password-XXXXX

# Manually rotate JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)
aws secretsmanager put-secret-value \
  --secret-id maidar-production-jwt-secret-XXXXX \
  --secret-string "$NEW_JWT_SECRET"

# Restart services to pick up new secret
aws ecs update-service \
  --cluster maidar-production-cluster \
  --service maidar-production-backend \
  --force-new-deployment
```

### 2. Enable MFA on AWS Account

```bash
# Enable MFA on root account
# https://console.aws.amazon.com/iam/home#/security_credentials

# Enforce MFA on IAM users
# Add policy: aws:MultiFactorAuthPresent
```

### 3. Review Security Groups

```bash
# List all security groups
terraform state list | grep aws_security_group

# Review ingress rules
terraform state show aws_security_group.alb | grep ingress
```

### 4. Enable AWS Config

```bash
# Enable Config for compliance monitoring
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::ACCOUNT_ID:role/config-role \
  --recording-group allSupported=true,includeGlobalResourceTypes=true
```

---

## Disaster Recovery

### Backup Verification

```bash
# List RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier maidar-production-postgres \
  | jq '.DBSnapshots[] | {SnapshotIdentifier, SnapshotCreateTime, Status}'

# List S3 backup files
aws s3 ls s3://maidar-production-backups/ --recursive

# Test restore (to temporary instance)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier maidar-test-restore \
  --db-snapshot-identifier maidar-production-postgres-latest
```

### Regional Failover

```bash
# If me-south-1 region fails, deploy to eu-central-1 DR region

# 1. Update Terraform workspace
terraform workspace new dr

# 2. Deploy DR infrastructure
terraform apply -var-file="environments/production/terraform.tfvars" -var="aws_region=eu-central-1"

# 3. Restore from S3 backup in DR region
aws s3 cp s3://maidar-production-backups-dr/latest.sql.gz ./

# 4. Update DNS to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://dns-failover.json
```

---

## Cost Estimation

### Production Environment

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **RDS PostgreSQL** | db.t4g.large, Multi-AZ | ~$200 |
| **ElastiCache Redis** | 2x cache.t4g.medium | ~$80 |
| **ECS Fargate** | 3 backend + 2 worker + 1 beat | ~$250 |
| **ALB** | 1 load balancer | ~$25 |
| **NAT Gateway** | 3x NAT gateways | ~$100 |
| **S3** | 100 GB storage | ~$3 |
| **CloudFront** | 1 TB transfer | ~$85 |
| **Route53** | 1 hosted zone | ~$1 |
| **Data Transfer** | Outbound | ~$50 |
| **CloudWatch** | Logs and metrics | ~$30 |
| **WAF** | Web ACL + rules | ~$10 |
| **Secrets Manager** | 5 secrets | ~$2 |
| **Total** | | **~$836/month** |

### Staging Environment

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **RDS PostgreSQL** | db.t4g.medium, Single-AZ | ~$70 |
| **ElastiCache Redis** | 1x cache.t4g.small | ~$20 |
| **ECS Fargate** | 1 backend + 1 worker + 1 beat | ~$80 |
| **ALB** | 1 load balancer | ~$25 |
| **NAT Gateway** | 3x NAT gateways | ~$100 |
| **Others** | | ~$20 |
| **Total** | | **~$315/month** |

### Cost Optimization Tips

1. **Use Savings Plans:** Save up to 72% on ECS Fargate
2. **Use Reserved Instances:** Save up to 69% on RDS
3. **Right-size resources:** Monitor usage and adjust
4. **Delete unused resources:** Staging during off-hours
5. **Use lifecycle policies:** Archive old S3 data to Glacier

---

## Terraform Commands Reference

```bash
# Initialize
terraform init

# Validate
terraform validate

# Format
terraform fmt -recursive

# Plan
terraform plan -out=plan.tfplan

# Apply
terraform apply plan.tfplan

# Destroy (BE CAREFUL!)
terraform destroy -var-file="environments/staging/terraform.tfvars"

# Show state
terraform state list
terraform state show <resource>

# Import existing resource
terraform import aws_instance.example i-abcd1234

# Refresh state
terraform refresh

# Output values
terraform output
terraform output -json
terraform output alb_dns_name

# Workspace management
terraform workspace list
terraform workspace new production
terraform workspace select production
```

---

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)

---

**Last Updated:** 2026-02-28
**Document Owner:** DevOps Team
**Infrastructure Version:** 1.0.0
