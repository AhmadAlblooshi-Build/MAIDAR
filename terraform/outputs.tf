#
# MAIDAR Platform - Terraform Outputs
#

# ============================================================================
# Network Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = aws_subnet.database[*].id
}

# ============================================================================
# Load Balancer Outputs
# ============================================================================

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

# ============================================================================
# RDS Outputs
# ============================================================================

output "rds_endpoint" {
  description = "RDS master endpoint"
  value       = aws_db_instance.master.endpoint
}

output "rds_address" {
  description = "RDS master address"
  value       = aws_db_instance.master.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.master.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.master.db_name
}

output "rds_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.enable_read_replica ? aws_db_instance.read_replica[0].endpoint : null
}

# ============================================================================
# ElastiCache Outputs
# ============================================================================

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

# ============================================================================
# ECS Outputs
# ============================================================================

output "ecs_cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "backend_service_name" {
  description = "Backend ECS service name"
  value       = aws_ecs_service.backend.name
}

output "celery_worker_service_name" {
  description = "Celery worker ECS service name"
  value       = aws_ecs_service.celery_worker.name
}

output "celery_beat_service_name" {
  description = "Celery beat ECS service name"
  value       = aws_ecs_service.celery_beat.name
}

# ============================================================================
# S3 Outputs
# ============================================================================

output "s3_backups_bucket" {
  description = "S3 backups bucket name"
  value       = aws_s3_bucket.backups.id
}

output "s3_backups_dr_bucket" {
  description = "S3 DR backups bucket name"
  value       = aws_s3_bucket.backups_dr.id
}

output "s3_uploads_bucket" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "s3_alb_logs_bucket" {
  description = "S3 ALB logs bucket name"
  value       = aws_s3_bucket.alb_logs.id
}

# ============================================================================
# Secrets Manager Outputs
# ============================================================================

output "secret_db_password_arn" {
  description = "Database password secret ARN"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "secret_jwt_secret_arn" {
  description = "JWT secret key ARN"
  value       = aws_secretsmanager_secret.jwt_secret.arn
  sensitive   = true
}

output "secret_sentry_dsn_arn" {
  description = "Sentry DSN secret ARN"
  value       = aws_secretsmanager_secret.sentry_dsn.arn
  sensitive   = true
}

output "secret_sendgrid_api_key_arn" {
  description = "SendGrid API key secret ARN"
  value       = aws_secretsmanager_secret.sendgrid_api_key.arn
  sensitive   = true
}

output "secret_claude_api_key_arn" {
  description = "Claude API key secret ARN"
  value       = aws_secretsmanager_secret.claude_api_key.arn
  sensitive   = true
}

# ============================================================================
# CloudFront Outputs
# ============================================================================

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].id : null
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].domain_name : null
}

# ============================================================================
# Route53 Outputs
# ============================================================================

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = aws_route53_zone.main.name_servers
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

# ============================================================================
# IAM Outputs
# ============================================================================

output "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

# ============================================================================
# Monitoring Outputs
# ============================================================================

output "sns_alerts_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

# ============================================================================
# Security Outputs
# ============================================================================

output "waf_web_acl_id" {
  description = "WAF web ACL ID"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].id : null
}

output "waf_web_acl_arn" {
  description = "WAF web ACL ARN"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
}

# ============================================================================
# Application URLs
# ============================================================================

output "application_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

# ============================================================================
# Connection Strings (Sensitive)
# ============================================================================

output "database_connection_string" {
  description = "Database connection string (without password)"
  value       = "postgresql://${aws_db_instance.master.username}@${aws_db_instance.master.address}:${aws_db_instance.master.port}/${aws_db_instance.master.db_name}"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
  sensitive   = true
}

# ============================================================================
# Deployment Information
# ============================================================================

output "deployment_instructions" {
  description = "Next steps for deployment"
  value = <<-EOT

    ✅ Infrastructure deployed successfully!

    Next steps:

    1. Update DNS nameservers:
       ${join("\n   ", aws_route53_zone.main.name_servers)}

    2. Update secrets in AWS Secrets Manager:
       - ${aws_secretsmanager_secret.sentry_dsn.name}
       - ${aws_secretsmanager_secret.sendgrid_api_key.name}
       - ${aws_secretsmanager_secret.claude_api_key.name}

    3. Deploy application:
       docker push ${var.backend_image}
       aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.backend.name} --force-new-deployment

    4. Verify deployment:
       curl https://api.${var.domain_name}/health

    5. Monitor:
       CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}

  EOT
}
