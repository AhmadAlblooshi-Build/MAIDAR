#
# MAIDAR Staging Environment Configuration
#
# This configuration uses cost-optimized settings for staging
# Estimated cost: ~$400-600/month
#

# ============================================================================
# General Configuration
# ============================================================================

environment  = "staging"
aws_region   = "me-south-1" # Middle East - Bahrain
owner_email  = "devops@maidar.com" # Change this to your email
domain_name  = "staging.maidar.com"

# ============================================================================
# Network Configuration
# ============================================================================

vpc_cidr                = "10.1.0.0/16"
public_subnet_cidrs     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs    = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
database_subnet_cidrs   = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

# ============================================================================
# RDS Configuration (Cost-Optimized)
# ============================================================================

db_instance_class          = "db.t4g.medium" # 2 vCPU, 4 GB RAM (smaller than prod)
db_name                    = "maidar"
db_username                = "postgres"
# db_password               = "SET_VIA_ENVIRONMENT_VARIABLE" # Use: export TF_VAR_db_password="..."
db_allocated_storage       = 50 # 50 GB (vs 100 GB in prod)
db_max_allocated_storage   = 200 # 200 GB max (vs 500 GB in prod)
db_backup_retention_days   = 7 # 7 days (vs 30 days in prod)
db_multi_az                = false # Single AZ to save cost (set true for production-like testing)

# ============================================================================
# ElastiCache Configuration (Cost-Optimized)
# ============================================================================

redis_node_type            = "cache.t4g.small" # 2 vCPU, 1.37 GB RAM (smaller than prod)
redis_num_cache_nodes      = 1 # Single node (vs 2 in prod)
redis_parameter_group_family = "redis7"

# ============================================================================
# ECS Configuration (Cost-Optimized)
# ============================================================================

ecs_task_cpu               = 1024 # 1 vCPU (vs 2 in prod)
ecs_task_memory            = 2048 # 2 GB (vs 4 GB in prod)
ecs_desired_count          = 1 # 1 task (vs 2+ in prod)
ecs_min_capacity           = 1
ecs_max_capacity           = 3

# Backend configuration
backend_container_port     = 8000
backend_cpu                = 512 # 0.5 vCPU
backend_memory             = 1024 # 1 GB

# Frontend configuration
frontend_container_port    = 3000
frontend_cpu               = 512 # 0.5 vCPU
frontend_memory            = 1024 # 1 GB

# Celery worker configuration
celery_cpu                 = 256 # 0.25 vCPU
celery_memory              = 512 # 0.5 GB
celery_desired_count       = 1

# Celery beat configuration
celery_beat_cpu            = 256
celery_beat_memory         = 512

# ============================================================================
# Application Load Balancer
# ============================================================================

alb_deletion_protection    = false # Disabled for staging
enable_access_logs         = true

# ============================================================================
# Auto Scaling Configuration
# ============================================================================

# Scale up when CPU > 70%
scale_up_cpu_threshold     = 70
# Scale down when CPU < 30%
scale_down_cpu_threshold   = 30

# ============================================================================
# CloudWatch Configuration
# ============================================================================

log_retention_days         = 7 # 7 days (vs 30 in prod)

# ============================================================================
# S3 Configuration
# ============================================================================

s3_enable_versioning       = true
s3_lifecycle_glacier_days  = 90 # Move to Glacier after 90 days
s3_lifecycle_expiration_days = 365 # Delete after 1 year

# ============================================================================
# WAF Configuration
# ============================================================================

enable_waf                 = true
waf_rate_limit            = 1000 # Requests per 5 minutes per IP

# ============================================================================
# Monitoring Configuration
# ============================================================================

enable_cloudwatch_alarms   = true
sns_alarm_email           = "alerts-staging@maidar.com" # Change this

# CPU alarm thresholds
cpu_alarm_threshold       = 80
memory_alarm_threshold    = 80

# Database alarm thresholds
db_cpu_alarm_threshold    = 75
db_connections_alarm_threshold = 80

# ============================================================================
# Backup Configuration
# ============================================================================

enable_backup_plan        = true
backup_schedule           = "cron(0 2 * * ? *)" # Daily at 2 AM UTC
backup_retention_days     = 7

# ============================================================================
# Tags
# ============================================================================

tags = {
  Environment = "staging"
  Project     = "MAIDAR"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  AutoShutdown = "enabled" # Can be used for cost-saving automation
}
