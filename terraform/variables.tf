#
# MAIDAR Platform - Terraform Variables
#

# ============================================================================
# General Configuration
# ============================================================================

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "me-south-1" # UAE (Middle East - Bahrain)
}

variable "owner_email" {
  description = "Email of infrastructure owner"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "maidar.com"
}

# ============================================================================
# Network Configuration
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# ============================================================================
# RDS Configuration
# ============================================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.large" # 2 vCPU, 8 GB RAM
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "maidar"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB (for autoscaling)"
  type        = number
  default     = 500
}

variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "db_multi_az" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

# ============================================================================
# ElastiCache Configuration
# ============================================================================

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.medium" # 2 vCPU, 3.09 GB RAM
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

# ============================================================================
# ECS Configuration
# ============================================================================

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 2048 # 2 vCPU
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 4096 # 4 GB
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 3
}

variable "celery_worker_desired_count" {
  description = "Desired number of Celery worker tasks"
  type        = number
  default     = 2
}

variable "celery_beat_desired_count" {
  description = "Desired number of Celery beat tasks"
  type        = number
  default     = 1
}

variable "backend_image" {
  description = "Docker image for backend"
  type        = string
  default     = "maidar/backend:latest"
}

variable "celery_worker_image" {
  description = "Docker image for Celery worker"
  type        = string
  default     = "maidar/backend:latest"
}

# ============================================================================
# Auto Scaling Configuration
# ============================================================================

variable "backend_autoscaling_min_capacity" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 2
}

variable "backend_autoscaling_max_capacity" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 10
}

variable "backend_autoscaling_target_cpu" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 70
}

variable "backend_autoscaling_target_memory" {
  description = "Target memory utilization percentage"
  type        = number
  default     = 80
}

# ============================================================================
# CloudFront Configuration
# ============================================================================

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_All"
}

variable "cloudfront_ssl_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
  default     = ""
}

# ============================================================================
# Monitoring Configuration
# ============================================================================

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced RDS monitoring"
  type        = bool
  default     = true
}

variable "alarm_sns_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
}

# ============================================================================
# Backup Configuration
# ============================================================================

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 */6 * * ? *)" # Every 6 hours
}

# ============================================================================
# Security Configuration
# ============================================================================

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Open to public (use WAF for protection)
}

variable "enable_waf" {
  description = "Enable WAF protection"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced (DDoS protection)"
  type        = bool
  default     = false # Costs $3,000/month
}

# ============================================================================
# Feature Flags
# ============================================================================

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "enable_read_replica" {
  description = "Enable RDS read replica"
  type        = bool
  default     = true
}

variable "enable_redis_cluster" {
  description = "Enable Redis cluster mode"
  type        = bool
  default     = false
}
