#
# MAIDAR Platform - ElastiCache Redis Configuration
#

# ============================================================================
# ElastiCache Subnet Group
# ============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name_prefix = "${local.name_prefix}-redis-"
  description = "ElastiCache subnet group for MAIDAR"
  subnet_ids  = aws_subnet.private[*].id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-subnet-group"
    }
  )
}

# ============================================================================
# ElastiCache Parameter Group
# ============================================================================

resource "aws_elasticache_parameter_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  family      = var.redis_parameter_group_family
  description = "Custom parameter group for MAIDAR Redis"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru" # Evict least recently used keys when memory is full
  }

  parameter {
    name  = "timeout"
    value = "300" # Close idle connections after 5 minutes
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex" # Enable keyspace notifications for expired events
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-params"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# ElastiCache Replication Group (Redis)
# ============================================================================

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "MAIDAR Redis cluster for Celery and caching"

  # Engine
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  port                 = 6379

  # Cluster Configuration
  num_cache_clusters         = var.redis_num_cache_nodes
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled           = var.redis_num_cache_nodes > 1

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Backup
  snapshot_retention_limit = 7  # Retain snapshots for 7 days
  snapshot_window          = "03:00-04:00" # UTC
  maintenance_window       = "sun:04:00-sun:05:00" # UTC

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = false # Set to true for AUTH support

  # Auto upgrades
  auto_minor_version_upgrade = true

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-cluster"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================================================
# CloudWatch Log Groups for Redis
# ============================================================================

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${local.name_prefix}-redis/slow-log"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-slow-log"
    }
  )
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${local.name_prefix}-redis/engine-log"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-engine-log"
    }
  )
}

# ============================================================================
# CloudWatch Alarms
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU usage is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Redis memory usage is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${local.name_prefix}-redis-evictions-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "Redis is evicting too many keys"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  count = var.redis_num_cache_nodes > 1 ? 1 : 0

  alarm_name          = "${local.name_prefix}-redis-replication-lag-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 30 # seconds
  alarm_description   = "Redis replication lag is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}
