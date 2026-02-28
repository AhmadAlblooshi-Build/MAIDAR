#
# MAIDAR Platform - Production Environment Configuration
#

# General
environment  = "production"
aws_region   = "me-south-1"
owner_email  = "devops@company.com"
domain_name  = "maidar.com"

# Network
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
database_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

# RDS
db_instance_class         = "db.t4g.large"
db_name                   = "maidar"
db_username               = "postgres"
# db_password             = "CHANGEME" # Set via environment variable TF_VAR_db_password
db_allocated_storage      = 100
db_max_allocated_storage  = 500
db_backup_retention_days  = 30
db_multi_az               = true

# ElastiCache
redis_node_type              = "cache.t4g.medium"
redis_num_cache_nodes        = 2
redis_parameter_group_family = "redis7"

# ECS
ecs_task_cpu                = 2048
ecs_task_memory             = 4096
backend_desired_count       = 3
celery_worker_desired_count = 2
celery_beat_desired_count   = 1

# Docker Images
backend_image       = "maidar/backend:latest"
celery_worker_image = "maidar/backend:latest"

# Auto Scaling
backend_autoscaling_min_capacity = 2
backend_autoscaling_max_capacity = 10
backend_autoscaling_target_cpu   = 70
backend_autoscaling_target_memory = 80

# CloudFront
cloudfront_price_class = "PriceClass_All"
# cloudfront_ssl_certificate_arn = "" # Optional: Use existing certificate

# Monitoring
enable_enhanced_monitoring = true
alarm_sns_email           = "alerts@company.com"

# Backup
backup_retention_days = 30
backup_schedule       = "cron(0 */6 * * ? *)" # Every 6 hours

# Security
allowed_cidr_blocks = ["0.0.0.0/0"]
enable_waf          = true
enable_shield       = false # $3000/month

# Feature Flags
enable_cloudfront    = true
enable_read_replica  = true
enable_redis_cluster = false
