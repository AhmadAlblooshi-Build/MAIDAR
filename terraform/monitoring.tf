#
# MAIDAR Platform - Monitoring and Alerting
#

# ============================================================================
# SNS Topic for Alerts
# ============================================================================

resource "aws_sns_topic" "alerts" {
  name_prefix       = "${local.name_prefix}-alerts-"
  display_name      = "MAIDAR Production Alerts"
  kms_master_key_id = aws_kms_key.sns.id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alerts"
    }
  )
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_sns_email
}

# ============================================================================
# KMS Key for SNS Encryption
# ============================================================================

resource "aws_kms_key" "sns" {
  description             = "KMS key for SNS topic encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch to use the key"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-sns-kms"
    }
  )
}

resource "aws_kms_alias" "sns" {
  name          = "alias/${local.name_prefix}-sns"
  target_key_id = aws_kms_key.sns.key_id
}

# ============================================================================
# CloudWatch Dashboard
# ============================================================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }],
            [".", "FreeableMemory", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseMemoryUsagePercentage", { stat = "Average" }],
            [".", "Evictions", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ElastiCache Metrics"
        }
      }
    ]
  })
}

# ============================================================================
# CloudWatch Log Metric Filters
# ============================================================================

# Error rate metric
resource "aws_cloudwatch_log_metric_filter" "error_rate" {
  name           = "${local.name_prefix}-error-rate"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "[time, request_id, level = ERROR*, ...]"

  metric_transformation {
    name      = "ErrorRate"
    namespace = "MAIDAR"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${local.name_prefix}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorRate"
  namespace           = "MAIDAR"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Application error rate is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# ============================================================================
# Budget Alerts
# ============================================================================

resource "aws_budgets_budget" "monthly_cost" {
  name              = "${local.name_prefix}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = "1000" # $1000/month
  limit_unit        = "USD"
  time_period_start = "2026-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alarm_sns_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alarm_sns_email]
  }
}
