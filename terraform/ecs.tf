#
# MAIDAR Platform - ECS Configuration
#

# ============================================================================
# ECS Cluster
# ============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-ecs-cluster"
    }
  )
}

# ============================================================================
# CloudWatch Log Groups
# ============================================================================

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backend-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "celery_worker" {
  name              = "/ecs/${local.name_prefix}/celery-worker"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-worker-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "celery_beat" {
  name              = "/ecs/${local.name_prefix}/celery-beat"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-beat-logs"
    }
  )
}

# ============================================================================
# ECS Task Definition - Backend
# ============================================================================

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = var.backend_image

      portMappings = [
        {
          containerPort = 8001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.master.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.master.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.master.db_name
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.master.username
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "JWT_SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "SENTRY_DSN"
          valueFrom = aws_secretsmanager_secret.sentry_dsn.arn
        },
        {
          name      = "SENDGRID_API_KEY"
          valueFrom = aws_secretsmanager_secret.sendgrid_api_key.arn
        },
        {
          name      = "CLAUDE_API_KEY"
          valueFrom = aws_secretsmanager_secret.claude_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backend-task"
    }
  )
}

# ============================================================================
# ECS Task Definition - Celery Worker
# ============================================================================

resource "aws_ecs_task_definition" "celery_worker" {
  family                   = "${local.name_prefix}-celery-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name    = "celery-worker"
      image   = var.celery_worker_image
      command = ["celery", "-A", "app.core.celery_app", "worker", "--loglevel=info", "--concurrency=4"]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.master.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.master.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.master.db_name
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.master.username
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "JWT_SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "SENTRY_DSN"
          valueFrom = aws_secretsmanager_secret.sentry_dsn.arn
        },
        {
          name      = "SENDGRID_API_KEY"
          valueFrom = aws_secretsmanager_secret.sendgrid_api_key.arn
        },
        {
          name      = "CLAUDE_API_KEY"
          valueFrom = aws_secretsmanager_secret.claude_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.celery_worker.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "celery-worker"
        }
      }
    }
  ])

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-worker-task"
    }
  )
}

# ============================================================================
# ECS Task Definition - Celery Beat
# ============================================================================

resource "aws_ecs_task_definition" "celery_beat" {
  family                   = "${local.name_prefix}-celery-beat"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512  # 0.5 vCPU (beat is lightweight)
  memory                   = 1024 # 1 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name    = "celery-beat"
      image   = var.celery_worker_image
      command = ["celery", "-A", "app.core.celery_app", "beat", "--loglevel=info"]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
        }
      ]

      secrets = [
        {
          name      = "SENTRY_DSN"
          valueFrom = aws_secretsmanager_secret.sentry_dsn.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.celery_beat.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "celery-beat"
        }
      }
    }
  ])

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-beat-task"
    }
  )
}

# ============================================================================
# ECS Service - Backend
# ============================================================================

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8001
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  health_check_grace_period_seconds = 60

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backend-service"
    }
  )

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy.ecs_task_s3
  ]
}

# ============================================================================
# ECS Service - Celery Worker
# ============================================================================

resource "aws_ecs_service" "celery_worker" {
  name            = "${local.name_prefix}-celery-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.celery_worker.arn
  desired_count   = var.celery_worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_celery.id]
    assign_public_ip = false
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-worker-service"
    }
  )

  depends_on = [aws_iam_role_policy.ecs_task_s3]
}

# ============================================================================
# ECS Service - Celery Beat
# ============================================================================

resource "aws_ecs_service" "celery_beat" {
  name            = "${local.name_prefix}-celery-beat"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.celery_beat.arn
  desired_count   = var.celery_beat_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_celery.id]
    assign_public_ip = false
  }

  deployment_configuration {
    maximum_percent         = 100
    minimum_healthy_percent = 0
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-celery-beat-service"
    }
  )

  depends_on = [aws_iam_role_policy.ecs_task_s3]
}

# ============================================================================
# Auto Scaling - Backend
# ============================================================================

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.backend_autoscaling_max_capacity
  min_capacity       = var.backend_autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  role_arn           = aws_iam_role.ecs_autoscaling.arn
}

# Scale on CPU
resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${local.name_prefix}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.backend_autoscaling_target_cpu
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# Scale on Memory
resource "aws_appautoscaling_policy" "backend_memory" {
  name               = "${local.name_prefix}-backend-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.backend_autoscaling_target_memory
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}
