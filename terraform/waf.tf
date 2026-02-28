#
# MAIDAR Platform - Web Application Firewall (WAF)
#

# ============================================================================
# WAF Web ACL
# ============================================================================

resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0

  name  = "${local.name_prefix}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that may cause false positives
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-waf-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-waf-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-waf-sqli"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Rate Limiting (per IP)
  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000 # requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-waf-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Geo-blocking (optional - block specific countries)
  # Uncomment if you want to restrict access to specific countries
  # rule {
  #   name     = "GeoBlockingRule"
  #   priority = 5

  #   action {
  #     block {}
  #   }

  #   statement {
  #     geo_match_statement {
  #       country_codes = ["CN", "RU", "KP"] # Block China, Russia, North Korea
  #     }
  #   }

  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "${local.name_prefix}-waf-geo-blocking"
  #     sampled_requests_enabled   = true
  #   }
  # }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-waf"
    sampled_requests_enabled   = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-waf"
    }
  )
}

# ============================================================================
# WAF Association with ALB
# ============================================================================

resource "aws_wafv2_web_acl_association" "alb" {
  count = var.enable_waf ? 1 : 0

  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}

# ============================================================================
# WAF Logging
# ============================================================================

resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_waf ? 1 : 0

  name              = "/aws/waf/${local.name_prefix}"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-waf-logs"
    }
  )
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_waf ? 1 : 0

  resource_arn            = aws_wafv2_web_acl.main[0].arn
  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

# ============================================================================
# CloudWatch Alarms for WAF
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  count = var.enable_waf ? 1 : 0

  alarm_name          = "${local.name_prefix}-waf-high-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "WAF is blocking a high number of requests"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main[0].name
    Region = var.aws_region
    Rule   = "ALL"
  }

  tags = local.common_tags
}
