#
# MAIDAR Platform - Main Terraform Configuration
#
# This configuration defines the complete AWS infrastructure for MAIDAR
# phishing simulation platform.
#

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store Terraform state in S3 with DynamoDB locking
  backend "s3" {
    bucket         = "maidar-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "me-south-1"
    encrypt        = true
    dynamodb_table = "maidar-terraform-locks"
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "MAIDAR"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner_email
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local variables
locals {
  name_prefix = "maidar-${var.environment}"

  common_tags = {
    Project     = "MAIDAR"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}
