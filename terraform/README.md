# MAIDAR Platform - Terraform Infrastructure

Complete AWS infrastructure for MAIDAR phishing simulation platform.

## Quick Start

```bash
# 1. Initialize Terraform
terraform init

# 2. Set required variables
export TF_VAR_db_password="STRONG_PASSWORD"
export TF_VAR_owner_email="devops@company.com"
export TF_VAR_alarm_sns_email="alerts@company.com"

# 3. Plan deployment
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -out=production.tfplan

# 4. Review and apply
terraform apply production.tfplan
```

## Infrastructure Components

### Network
- VPC with 3 availability zones
- Public, private, and database subnets
- NAT gateways for private subnet internet access
- VPC endpoints for AWS services

### Compute
- ECS Fargate cluster
- Backend API service (3 tasks)
- Celery worker service (2 tasks)
- Celery beat scheduler (1 task)
- Auto-scaling based on CPU/memory

### Database
- RDS PostgreSQL 15.7 (Multi-AZ)
- Automated backups (30 days retention)
- Read replica (optional)
- Enhanced monitoring
- Performance Insights

### Cache
- ElastiCache Redis 7.1
- Multi-node replication
- Automatic failover
- Encryption at rest and in transit

### Load Balancing
- Application Load Balancer
- HTTPS with ACM certificate
- Health checks
- Access logs to S3

### CDN
- CloudFront distribution (optional)
- Global edge locations
- Cache optimization for static assets
- Custom SSL certificate

### DNS
- Route53 hosted zone
- A records for main domain and subdomains
- MX records for email
- SPF and DMARC records
- Health checks

### Storage
- S3 buckets:
  - Backups (encrypted, versioned)
  - DR backups (cross-region replication)
  - User uploads
  - ALB logs
  - CloudFront logs
- Lifecycle policies for cost optimization

### Security
- WAF with managed rules
- Security groups (least privilege)
- KMS encryption keys
- Secrets Manager for credentials
- IAM roles with minimal permissions

### Monitoring
- CloudWatch dashboards
- CloudWatch alarms for all resources
- SNS topics for alerts
- Log aggregation
- Cost budgets

## Directory Structure

```
terraform/
├── main.tf                 # Main configuration and providers
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── vpc.tf                  # VPC and networking
├── security_groups.tf      # Security groups
├── rds.tf                  # RDS PostgreSQL
├── elasticache.tf          # Redis cluster
├── ecs.tf                  # ECS Fargate services
├── alb.tf                  # Application Load Balancer
├── s3.tf                   # S3 buckets
├── secrets.tf              # Secrets Manager
├── iam.tf                  # IAM roles and policies
├── cloudfront.tf           # CloudFront CDN
├── route53.tf              # DNS configuration
├── waf.tf                  # Web Application Firewall
├── monitoring.tf           # CloudWatch and SNS
└── environments/
    ├── production/         # Production config
    └── staging/            # Staging config
```

## Configuration

### Required Variables

Set via environment variables:

```bash
export TF_VAR_db_password="STRONG_PASSWORD"
export TF_VAR_owner_email="devops@company.com"
export TF_VAR_alarm_sns_email="alerts@company.com"
```

### Optional Variables

Edit `environments/production/terraform.tfvars`:

```hcl
# Instance sizes
db_instance_class = "db.t4g.large"
redis_node_type   = "cache.t4g.medium"
ecs_task_cpu      = 2048
ecs_task_memory   = 4096

# Scaling
backend_desired_count = 3
backend_autoscaling_max_capacity = 10

# Features
enable_cloudfront   = true
enable_waf          = true
enable_read_replica = true
```

## Outputs

After deployment, retrieve outputs:

```bash
# All outputs
terraform output

# Specific output
terraform output alb_dns_name
terraform output rds_endpoint
terraform output redis_primary_endpoint

# JSON format
terraform output -json > outputs.json
```

## Common Operations

### Deploy

```bash
terraform plan -var-file="environments/production/terraform.tfvars" -out=plan.tfplan
terraform apply plan.tfplan
```

### Update

```bash
# Edit configuration
vim environments/production/terraform.tfvars

# Plan and apply
terraform plan -var-file="environments/production/terraform.tfvars" -out=update.tfplan
terraform apply update.tfplan
```

### Destroy (Staging Only!)

```bash
# NEVER run this on production!
terraform destroy -var-file="environments/staging/terraform.tfvars"
```

## Estimated Costs

### Production
- **Monthly:** ~$800-1,200
- **Annual:** ~$9,600-14,400

### Staging
- **Monthly:** ~$300-400
- **Annual:** ~$3,600-4,800

## Post-Deployment

### 1. Update DNS

Get nameservers and update at your registrar:

```bash
terraform output route53_name_servers
```

### 2. Update Secrets

```bash
# Sentry DSN
aws secretsmanager put-secret-value \
  --secret-id $(terraform output -raw secret_sentry_dsn_arn | cut -d: -f7) \
  --secret-string "https://your-sentry-dsn@sentry.io/project"

# SendGrid API key
aws secretsmanager put-secret-value \
  --secret-id $(terraform output -raw secret_sendgrid_api_key_arn | cut -d: -f7) \
  --secret-string "SG.XXXXXXXXXX"

# Claude API key
aws secretsmanager put-secret-value \
  --secret-id $(terraform output -raw secret_claude_api_key_arn | cut -d: -f7) \
  --secret-string "sk-ant-api03-XXXXXXXXXX"
```

### 3. Deploy Application

```bash
# Build and push Docker image
docker build -t maidar/backend:latest -f backend/Dockerfile .
docker push maidar/backend:latest

# Update ECS service
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw backend_service_name) \
  --force-new-deployment
```

### 4. Verify

```bash
# Test health endpoint
curl https://api.maidar.com/health

# Check logs
aws logs tail /ecs/maidar-production/backend --follow
```

## Troubleshooting

### State Lock

```bash
terraform force-unlock <LOCK_ID>
```

### ECS Tasks Not Starting

```bash
# Check stopped tasks
aws ecs list-tasks \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service-name $(terraform output -raw backend_service_name) \
  --desired-status STOPPED

# Describe task
aws ecs describe-tasks \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --tasks <TASK_ARN>
```

### Database Connection Issues

```bash
# Test from ECS task
aws ecs execute-command \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --task <TASK_ID> \
  --container backend \
  --interactive \
  --command "/bin/bash"

# Then test connection
nc -zv $(terraform output -raw rds_address) 5432
```

## Security

- All data encrypted at rest (KMS)
- All data encrypted in transit (TLS)
- Secrets stored in Secrets Manager
- Security groups follow least privilege
- WAF protects against common attacks
- Automated secret rotation (90 days)

## Compliance

- 7-year log retention (UAE law)
- Automated backups with 30-day retention
- Cross-region disaster recovery
- Audit trails in CloudWatch Logs

## Documentation

For detailed instructions, see:
- [INFRASTRUCTURE.md](../INFRASTRUCTURE.md) - Complete deployment guide
- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) - DR procedures
- [MONITORING_GUIDE.md](../MONITORING_GUIDE.md) - Monitoring setup

## Support

- Issues: Create GitHub issue
- Slack: #maidar-infrastructure
- Email: devops@company.com

---

**Version:** 1.0.0
**Last Updated:** 2026-02-28
