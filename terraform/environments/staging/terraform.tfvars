#
# MAIDAR Platform - Staging Environment Configuration
#

# General
environment  = "staging"
aws_region   = "me-south-1"
owner_email  = "devops@company.com"
domain_name  = "staging.maidar.com"

# Network
vpc_cidr             = "10.1.0.0/16"
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
database_subnet_cidrs = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

# RDS (smaller instance for staging)
db_instance_class         = "db.t4g.medium"
db_name                   = "maidar"
db_username               = "postgres"
# db_password             = "CHANGEME" # Set via environment variable TF_VAR_db_password
db_allocated_storage      = 50
db_max_allocated_storage  = 200
db_backup_retention_days  = 7
db_multi_az               = false # Single AZ for staging

# ElastiCache (smaller instance for staging)
redis_node_type              = "cache.t4g.small"
redis_num_cache_nodes        = 1
redis_parameter_group_family = "redis7"

# ECS (smaller configuration for staging)
ecs_task_cpu                = 1024
ecs_task_memory             = 2048
backend_desired_count       = 1
celery_worker_desired_count = 1
celery_beat_desired_count   = 1

# Docker Images
backend_image       = "maidar/backend:staging"
celery_worker_image = "maidar/backend:staging"

# Auto Scaling (disabled for staging)
backend_autoscaling_min_capacity = 1
backend_autoscaling_max_capacity = 3
backend_autoscaling_target_cpu   = 80
backend_autoscaling_target_memory = 85

# CloudFront (disabled for staging)
cloudfront_price_class = "PriceClass_100"

# Monitoring
enable_enhanced_monitoring = false
alarm_sns_email           = "alerts@company.com"

# Backup
backup_retention_days = 7
backup_schedule       = "cron(0 0 * * ? *)" # Daily at midnight

# Security
allowed_cidr_blocks = ["0.0.0.0/0"]
enable_waf          = false # Disabled for staging
enable_shield       = false

# Feature Flags
enable_cloudfront    = false # Direct ALB access
enable_read_replica  = false
enable_redis_cluster = false
