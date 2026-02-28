#
# MAIDAR Platform - IAM Roles and Policies
#

# ============================================================================
# ECS Task Execution Role
# ============================================================================

resource "aws_iam_role" "ecs_task_execution" {
  name_prefix = "${local.name_prefix}-ecs-execution-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-ecs-execution-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name_prefix = "${local.name_prefix}-ecs-secrets-"
  role        = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.sentry_dsn.arn,
          aws_secretsmanager_secret.sendgrid_api_key.arn,
          aws_secretsmanager_secret.claude_api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

# ============================================================================
# ECS Task Role (for application permissions)
# ============================================================================

resource "aws_iam_role" "ecs_task" {
  name_prefix = "${local.name_prefix}-ecs-task-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-ecs-task-role"
    }
  )
}

# S3 access for backups and user uploads
resource "aws_iam_role_policy" "ecs_task_s3" {
  name_prefix = "${local.name_prefix}-ecs-s3-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.backups.arn}/*",
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.uploads.arn}/*",
          aws_s3_bucket.uploads.arn
        ]
      }
    ]
  })
}

# SES access for email sending
resource "aws_iam_role_policy" "ecs_task_ses" {
  name_prefix = "${local.name_prefix}-ecs-ses-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Logs access
resource "aws_iam_role_policy" "ecs_task_logs" {
  name_prefix = "${local.name_prefix}-ecs-logs-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${local.name_prefix}/*"
      }
    ]
  })
}

# Secrets Manager access (for rotating credentials)
resource "aws_iam_role_policy" "ecs_task_secrets" {
  name_prefix = "${local.name_prefix}-ecs-secrets-access-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.sentry_dsn.arn,
          aws_secretsmanager_secret.sendgrid_api_key.arn,
          aws_secretsmanager_secret.claude_api_key.arn
        ]
      }
    ]
  })
}

# ============================================================================
# ECS Service Auto Scaling Role
# ============================================================================

resource "aws_iam_role" "ecs_autoscaling" {
  name_prefix = "${local.name_prefix}-ecs-autoscaling-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "application-autoscaling.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-ecs-autoscaling-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "ecs_autoscaling" {
  role       = aws_iam_role.ecs_autoscaling.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceAutoscaleRole"
}

# ============================================================================
# CloudWatch Events Role (for scheduled tasks)
# ============================================================================

resource "aws_iam_role" "cloudwatch_events" {
  name_prefix = "${local.name_prefix}-events-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-events-role"
    }
  )
}

resource "aws_iam_role_policy" "cloudwatch_events_ecs" {
  name_prefix = "${local.name_prefix}-events-ecs-"
  role        = aws_iam_role.cloudwatch_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.ecs_task_execution.arn,
          aws_iam_role.ecs_task.arn
        ]
      }
    ]
  })
}

# ============================================================================
# CodeDeploy Role (for blue/green deployments)
# ============================================================================

resource "aws_iam_role" "codedeploy" {
  name_prefix = "${local.name_prefix}-codedeploy-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-codedeploy-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}
