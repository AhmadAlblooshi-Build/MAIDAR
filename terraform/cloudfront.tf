#
# MAIDAR Platform - CloudFront CDN
#

# ============================================================================
# CloudFront Distribution
# ============================================================================

resource "aws_cloudfront_distribution" "main" {
  count = var.enable_cloudfront ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "MAIDAR CDN distribution"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = [var.domain_name, "www.${var.domain_name}"]

  # Origin - ALB
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-CloudFront-Secret"
      value = random_password.cloudfront_secret.result
    }
  }

  # Default cache behavior
  default_cache_behavior {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto", "Host"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0 # Don't cache dynamic content
  }

  # Cache static assets
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = false
      headers      = []

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400  # 1 day
    max_ttl     = 31536000 # 1 year
  }

  # Cache images
  ordered_cache_behavior {
    path_pattern           = "*.{jpg,jpeg,png,gif,ico,svg,webp}"
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = false
      headers      = []

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = var.cloudfront_ssl_certificate_arn != "" ? var.cloudfront_ssl_certificate_arn : aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Logging
  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs[0].bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false
  }

  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/500.html"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-cdn"
    }
  )
}

# ============================================================================
# CloudFront Secret Header
# ============================================================================

resource "random_password" "cloudfront_secret" {
  length  = 32
  special = false
}

# ============================================================================
# S3 Bucket for CloudFront Logs
# ============================================================================

resource "aws_s3_bucket" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0

  bucket_prefix = "${local.name_prefix}-cf-logs-"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-cloudfront-logs"
    }
  )
}

resource "aws_s3_bucket_ownership_controls" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.cloudfront_logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.cloudfront_logs[0].id
  acl    = "log-delivery-write"

  depends_on = [aws_s3_bucket_ownership_controls.cloudfront_logs]
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.cloudfront_logs[0].id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.cloudfront_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# CloudWatch Alarms
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  count = var.enable_cloudfront ? 1 : 0

  alarm_name          = "${local.name_prefix}-cloudfront-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5 # percent
  alarm_description   = "CloudFront 5xx error rate is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main[0].id
  }

  tags = local.common_tags
}
