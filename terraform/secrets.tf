#
# MAIDAR Platform - Secrets Manager
#

# ============================================================================
# KMS Key for Secrets Encryption
# ============================================================================

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-secrets-kms"
    }
  )
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${local.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ============================================================================
# Database Password Secret
# ============================================================================

resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "${local.name_prefix}-db-password-"
  description             = "Database master password"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password

  lifecycle {
    ignore_changes = [secret_string] # Managed via rotation after initial creation
  }
}

# ============================================================================
# JWT Secret Key
# ============================================================================

resource "aws_secretsmanager_secret" "jwt_secret" {
  name_prefix             = "${local.name_prefix}-jwt-secret-"
  description             = "JWT secret key for token signing"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-jwt-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# ============================================================================
# Sentry DSN
# ============================================================================

resource "aws_secretsmanager_secret" "sentry_dsn" {
  name_prefix             = "${local.name_prefix}-sentry-dsn-"
  description             = "Sentry DSN for error tracking"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-sentry-dsn"
    }
  )
}

resource "aws_secretsmanager_secret_version" "sentry_dsn" {
  secret_id     = aws_secretsmanager_secret.sentry_dsn.id
  secret_string = "PLACEHOLDER" # Update manually after Sentry setup

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# SendGrid API Key
# ============================================================================

resource "aws_secretsmanager_secret" "sendgrid_api_key" {
  name_prefix             = "${local.name_prefix}-sendgrid-key-"
  description             = "SendGrid API key for email sending"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-sendgrid-api-key"
    }
  )
}

resource "aws_secretsmanager_secret_version" "sendgrid_api_key" {
  secret_id     = aws_secretsmanager_secret.sendgrid_api_key.id
  secret_string = "PLACEHOLDER" # Update manually after SendGrid setup

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# Claude API Key
# ============================================================================

resource "aws_secretsmanager_secret" "claude_api_key" {
  name_prefix             = "${local.name_prefix}-claude-key-"
  description             = "Anthropic Claude API key"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-claude-api-key"
    }
  )
}

resource "aws_secretsmanager_secret_version" "claude_api_key" {
  secret_id     = aws_secretsmanager_secret.claude_api_key.id
  secret_string = "PLACEHOLDER" # Update manually after Anthropic API setup

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# Automatic Rotation Configuration (for database password)
# ============================================================================

resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_password.arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# ============================================================================
# Lambda Function for Password Rotation
# ============================================================================

resource "aws_lambda_function" "rotate_db_password" {
  filename      = "lambda/rotate_db_password.zip"
  function_name = "${local.name_prefix}-rotate-db-password"
  role          = aws_iam_role.lambda_rotation.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_rotation.id]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rotate-db-password"
    }
  )
}

# ============================================================================
# Lambda IAM Role
# ============================================================================

resource "aws_iam_role" "lambda_rotation" {
  name_prefix = "${local.name_prefix}-lambda-rotation-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-lambda-rotation-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_basic" {
  role       = aws_iam_role.lambda_rotation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_rotation_secrets" {
  name_prefix = "${local.name_prefix}-lambda-secrets-"
  role        = aws_iam_role.lambda_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.db_password.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_rotation_rds" {
  name_prefix = "${local.name_prefix}-lambda-rds-"
  role        = aws_iam_role.lambda_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:ModifyDBInstance"
        ]
        Resource = aws_db_instance.master.arn
      }
    ]
  })
}

# ============================================================================
# Lambda Security Group
# ============================================================================

resource "aws_security_group" "lambda_rotation" {
  name_prefix = "${local.name_prefix}-lambda-rotation-"
  description = "Security group for Lambda rotation function"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-lambda-rotation-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow Lambda to access RDS
resource "aws_security_group_rule" "rds_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.lambda_rotation.id
  description              = "PostgreSQL from Lambda rotation"
}

# ============================================================================
# Lambda Permission for Secrets Manager
# ============================================================================

resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowExecutionFromSecretsManager"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotate_db_password.function_name
  principal     = "secretsmanager.amazonaws.com"
}
