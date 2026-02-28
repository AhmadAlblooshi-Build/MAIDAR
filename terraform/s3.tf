#
# MAIDAR Platform - S3 Buckets
#

# ============================================================================
# S3 Bucket for Database Backups
# ============================================================================

resource "aws_s3_bucket" "backups" {
  bucket_prefix = "${local.name_prefix}-backups-"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backups"
      Type = "backups"
    }
  )
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555 # 7 years (UAE compliance)
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Replication to DR region
resource "aws_s3_bucket_replication_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  role   = aws_iam_role.s3_replication.arn

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_dr.arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [aws_s3_bucket_versioning.backups]
}

# ============================================================================
# S3 Bucket for DR Region Backups
# ============================================================================

resource "aws_s3_bucket" "backups_dr" {
  provider      = aws.dr
  bucket_prefix = "${local.name_prefix}-backups-dr-"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backups-dr"
      Type = "backups-dr"
    }
  )
}

resource "aws_s3_bucket_versioning" "backups_dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.backups_dr.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups_dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.backups_dr.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups_dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.backups_dr.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# S3 Bucket for User Uploads
# ============================================================================

resource "aws_s3_bucket" "uploads" {
  bucket_prefix = "${local.name_prefix}-uploads-"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-uploads"
      Type = "uploads"
    }
  )
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "delete-old-uploads"
    status = "Enabled"

    expiration {
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# KMS Key for S3 Encryption
# ============================================================================

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-s3-kms"
    }
  )
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# ============================================================================
# IAM Role for S3 Replication
# ============================================================================

resource "aws_iam_role" "s3_replication" {
  name_prefix = "${local.name_prefix}-s3-replication-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-s3-replication-role"
    }
  )
}

resource "aws_iam_role_policy" "s3_replication" {
  name_prefix = "${local.name_prefix}-s3-replication-"
  role        = aws_iam_role.s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.backups.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Resource = "${aws_s3_bucket.backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.backups_dr.arn}/*"
      }
    ]
  })
}

# ============================================================================
# AWS Provider for DR Region
# ============================================================================

provider "aws" {
  alias  = "dr"
  region = "eu-central-1" # DR region

  default_tags {
    tags = {
      Project     = "MAIDAR"
      Environment = "${var.environment}-dr"
      ManagedBy   = "Terraform"
      Region      = "dr"
    }
  }
}
