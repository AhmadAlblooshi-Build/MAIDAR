#
# MAIDAR Platform - Route53 DNS
#

# ============================================================================
# Route53 Hosted Zone
# ============================================================================

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-dns-zone"
    }
  )
}

# ============================================================================
# ACM Certificate Validation Records
# ============================================================================

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

# Trigger certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ============================================================================
# A Records
# ============================================================================

# Primary domain
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_cloudfront ? [1] : []
    content {
      name                   = aws_cloudfront_distribution.main[0].domain_name
      zone_id                = aws_cloudfront_distribution.main[0].hosted_zone_id
      evaluate_target_health = false
    }
  }

  dynamic "alias" {
    for_each = var.enable_cloudfront ? [] : [1]
    content {
      name                   = aws_lb.main.dns_name
      zone_id                = aws_lb.main.zone_id
      evaluate_target_health = true
    }
  }
}

# WWW subdomain
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  dynamic "alias" {
    for_each = var.enable_cloudfront ? [1] : []
    content {
      name                   = aws_cloudfront_distribution.main[0].domain_name
      zone_id                = aws_cloudfront_distribution.main[0].hosted_zone_id
      evaluate_target_health = false
    }
  }

  dynamic "alias" {
    for_each = var.enable_cloudfront ? [] : [1]
    content {
      name                   = aws_lb.main.dns_name
      zone_id                = aws_lb.main.zone_id
      evaluate_target_health = true
    }
  }
}

# API subdomain (direct to ALB, bypass CloudFront)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ============================================================================
# MX Records (for email)
# ============================================================================

resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mail.${var.domain_name}"
  ]
}

# ============================================================================
# TXT Records
# ============================================================================

# SPF record
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:sendgrid.net ~all"
  ]
}

# DMARC record
resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain_name}; ruf=mailto:dmarc@${var.domain_name}; fo=1"
  ]
}

# ============================================================================
# Health Check
# ============================================================================

resource "aws_route53_health_check" "api" {
  type              = "HTTPS"
  resource_path     = "/health"
  fqdn              = "api.${var.domain_name}"
  port              = 443
  failure_threshold = 3
  request_interval  = 30

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-health-check"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "health_check" {
  alarm_name          = "${local.name_prefix}-route53-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Route53 health check is failing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.api.id
  }

  tags = local.common_tags
}
