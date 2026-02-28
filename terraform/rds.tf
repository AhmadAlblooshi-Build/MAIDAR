#
# MAIDAR Platform - RDS PostgreSQL Configuration
#

# ============================================================================
# DB Subnet Group
# ============================================================================

resource "aws_db_subnet_group" "main" {
  name_prefix = "${local.name_prefix}-db-"
  description = "Database subnet group for MAIDAR"
  subnet_ids  = aws_subnet.database[*].id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-subnet-group"
    }
  )
}

# ============================================================================
# DB Parameter Group
# ============================================================================

resource "aws_db_parameter_group" "postgres" {
  name_prefix = "${local.name_prefix}-postgres-"
  family      = "postgres15"
  description = "Custom parameter group for MAIDAR PostgreSQL"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "mod" # Log all data-modifying statements
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres-params"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# RDS Master Instance
# ============================================================================

resource "aws_db_instance" "master" {
  identifier = "${local.name_prefix}-postgres"

  # Engine
  engine               = "postgres"
  engine_version       = "15.7"
  instance_class       = var.db_instance_class
  db_name              = var.db_name
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Storage
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  iops                  = 3000

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 5432

  # High Availability
  multi_az               = var.db_multi_az
  availability_zone      = var.db_multi_az ? null : local.azs[0]

  # Backup
  backup_retention_period   = var.db_backup_retention_days
  backup_window             = "03:00-04:00" # UTC
  maintenance_window        = "sun:04:00-sun:05:00" # UTC
  delete_automated_backups  = false
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-postgres-final-snapshot-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  copy_tags_to_snapshot     = true

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn             = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_retention_period = 7 # days

  # Deletion Protection
  deletion_protection = true

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres-master"
      Role = "master"
    }
  )

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [
      password, # Managed via Secrets Manager after initial creation
    ]
  }
}

# ============================================================================
# RDS Read Replica (Optional)
# ============================================================================

resource "aws_db_instance" "read_replica" {
  count = var.enable_read_replica ? 1 : 0

  identifier          = "${local.name_prefix}-postgres-replica"
  replicate_source_db = aws_db_instance.master.identifier

  # Instance
  instance_class = var.db_instance_class

  # Storage (inherited from master but can be adjusted)
  storage_type          = "gp3"
  max_allocated_storage = var.db_max_allocated_storage
  iops                  = 3000

  # Network
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  availability_zone = local.azs[1] # Different AZ from master

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval             = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn             = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Backup (replicas don't have backup retention)
  skip_final_snapshot = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres-replica"
      Role = "read-replica"
    }
  )
}

# ============================================================================
# IAM Role for Enhanced Monitoring
# ============================================================================

resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name_prefix = "${local.name_prefix}-rds-monitoring-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-monitoring-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================================================
# CloudWatch Alarms
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU usage is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.master.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "${local.name_prefix}-rds-memory-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 1073741824 # 1 GB in bytes
  alarm_description   = "Database freeable memory is too low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.master.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${local.name_prefix}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240 # 10 GB in bytes
  alarm_description   = "Database free storage is too low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.master.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${local.name_prefix}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 180 # 90% of max_connections (200)
  alarm_description   = "Database connection count is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.master.id
  }

  tags = local.common_tags
}
