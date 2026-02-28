# Secrets Management Guide - MAIDAR

**Purpose:** Securely store and manage sensitive credentials in production

**⚠️ IMPORTANT:** Never commit `.env` files or secrets to version control!

---

## Overview

MAIDAR supports multiple secrets management approaches:
1. **Development:** `.env` file (local only, never commit)
2. **Production:** AWS Secrets Manager (recommended)
3. **Alternative:** Environment variables (container orchestration)

---

## 1. Development Setup (.env file)

### Create .env File
```bash
cd backend
cp .env.example .env
```

### Edit .env with Your Secrets
```bash
# Application
SECRET_KEY=your-secret-key-min-32-chars-change-in-production
ENCRYPTION_KEY=your-base64-encoded-32-byte-encryption-key

# Database
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/maidar

# Redis
REDIS_URL=redis://localhost:6379/0

# SMTP (Email)
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=MAIDAR

# Claude AI API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Generate Strong Keys
```python
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate ENCRYPTION_KEY (base64-encoded 32 bytes)
python -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

### Security Checklist
- [ ] `.env` is in `.gitignore`
- [ ] All keys are randomly generated (not default values)
- [ ] File permissions: `chmod 600 .env` (owner read/write only)
- [ ] Never share `.env` file via Slack/email/etc.

---

## 2. Production Setup (AWS Secrets Manager)

### Why AWS Secrets Manager?
- ✅ Automatic secret rotation
- ✅ Audit logging (who accessed what secret)
- ✅ Encryption at rest (AWS KMS)
- ✅ Fine-grained IAM access control
- ✅ No secrets in environment variables
- ✅ Compliance-ready (UAE data residency)

### Step 1: Create AWS Secrets Manager Secret

```bash
# Install AWS CLI
pip install awscli

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (me-south-1 for UAE)

# Create secret
aws secretsmanager create-secret \
    --name maidar/production/config \
    --description "MAIDAR production configuration" \
    --secret-string file://secrets.json \
    --region me-south-1
```

### Step 2: Create secrets.json

```json
{
  "SECRET_KEY": "your-production-secret-key-here",
  "ENCRYPTION_KEY": "your-production-encryption-key-here",
  "DATABASE_URL": "postgresql+psycopg://user:pass@rds-endpoint:5432/maidar",
  "REDIS_URL": "redis://elasticache-endpoint:6379/0",
  "SMTP_SERVER": "smtp.sendgrid.net",
  "SMTP_PORT": "587",
  "SMTP_USERNAME": "apikey",
  "SMTP_PASSWORD": "SG.production_key_here",
  "FROM_EMAIL": "noreply@maidar.com",
  "FROM_NAME": "MAIDAR",
  "ANTHROPIC_API_KEY": "sk-ant-production-key-here",
  "SENTRY_DSN": "https://production-dsn@sentry.io/project"
}
```

### Step 3: Update Application Code

Create `app/core/secrets.py`:

```python
"""
Load secrets from AWS Secrets Manager in production.
"""

import json
import os
import boto3
from botocore.exceptions import ClientError


def get_secrets():
    """
    Load secrets from AWS Secrets Manager or .env file.

    Returns:
        dict: Secret key-value pairs
    """
    # Check if running in production
    if os.getenv("ENVIRONMENT") == "production":
        return get_secrets_from_aws()
    else:
        # Development: use .env file (handled by pydantic-settings)
        return {}


def get_secrets_from_aws():
    """
    Retrieve secrets from AWS Secrets Manager.

    Returns:
        dict: Secret key-value pairs
    """
    secret_name = "maidar/production/config"
    region_name = "me-south-1"  # UAE Bahrain region

    # Create Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # Handle errors
        error_code = e.response['Error']['Code']
        if error_code == 'DecryptionFailureException':
            raise Exception("Secrets Manager can't decrypt the secret using the provided KMS key")
        elif error_code == 'InternalServiceErrorException':
            raise Exception("An error occurred on the server side")
        elif error_code == 'InvalidParameterException':
            raise Exception("You provided an invalid value for a parameter")
        elif error_code == 'InvalidRequestException':
            raise Exception("You provided a parameter value that is not valid for the current state")
        elif error_code == 'ResourceNotFoundException':
            raise Exception(f"The secret {secret_name} was not found")
        else:
            raise e
    else:
        # Decrypt secret
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            return json.loads(secret)
        else:
            # Binary secret
            import base64
            decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            return json.loads(decoded_binary_secret)


# Load secrets on module import
SECRETS = get_secrets()
```

### Step 4: Update settings.py

```python
from app.core.secrets import SECRETS

class Settings(BaseSettings):
    # Load from AWS Secrets Manager if available, otherwise from .env
    SECRET_KEY: str = SECRETS.get("SECRET_KEY") or "dev-key"
    DATABASE_URL: str = SECRETS.get("DATABASE_URL") or "postgresql://..."
    # ... repeat for all secrets
```

### Step 5: IAM Permissions

Create IAM role/policy for ECS/EC2:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:me-south-1:ACCOUNT_ID:secret:maidar/production/config-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:me-south-1:ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

### Step 6: Deploy

```bash
# Set environment variable
export ENVIRONMENT=production

# Start application (will load from AWS Secrets Manager)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

## 3. Secret Rotation

### Automatic Rotation (AWS Secrets Manager)

```bash
# Enable automatic rotation (30 days)
aws secretsmanager rotate-secret \
    --secret-id maidar/production/config \
    --rotation-lambda-arn arn:aws:lambda:me-south-1:ACCOUNT_ID:function:SecretsManagerRotation \
    --rotation-rules AutomaticallyAfterDays=30 \
    --region me-south-1
```

### Manual Rotation

```bash
# 1. Generate new secret
NEW_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# 2. Update secret in AWS
aws secretsmanager update-secret \
    --secret-id maidar/production/config \
    --secret-string "{\"SECRET_KEY\":\"$NEW_SECRET\", ...}" \
    --region me-south-1

# 3. Restart application to load new secret
# (Container orchestration will handle this)
```

### Rotation Checklist
- [ ] Test new secret in staging first
- [ ] Update secret in AWS Secrets Manager
- [ ] Rolling restart of application (zero downtime)
- [ ] Verify application still works
- [ ] Monitor error rates for 24 hours

---

## 4. Alternative: Environment Variables

For simpler deployments (Docker, Kubernetes):

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    image: maidar-backend:latest
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      # ... more secrets
    env_file:
      - .env.production  # Never commit this file!
```

```yaml
# kubernetes-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: maidar-secrets
type: Opaque
stringData:
  SECRET_KEY: "your-secret-key"
  DATABASE_URL: "postgresql://..."
  # ... more secrets
```

---

## 5. Security Best Practices

### DO ✅
- ✅ Use AWS Secrets Manager in production
- ✅ Rotate secrets every 30-90 days
- ✅ Use unique secrets per environment (dev/staging/prod)
- ✅ Restrict IAM access (principle of least privilege)
- ✅ Enable audit logging (CloudTrail)
- ✅ Use environment-specific secret names
- ✅ Set file permissions: `chmod 600 .env`

### DON'T ❌
- ❌ Never commit secrets to Git
- ❌ Never share secrets via Slack/email
- ❌ Never use default/example secrets in production
- ❌ Never log secrets (even in debug mode)
- ❌ Never hardcode secrets in source code
- ❌ Never reuse secrets across environments
- ❌ Never store secrets in plaintext on disk

---

## 6. Secrets Checklist

### Required Secrets

| Secret | Purpose | How to Generate |
|--------|---------|-----------------|
| `SECRET_KEY` | JWT token signing | `secrets.token_urlsafe(32)` |
| `ENCRYPTION_KEY` | AES-256 encryption | `base64.urlsafe_b64encode(secrets.token_bytes(32))` |
| `DATABASE_URL` | PostgreSQL connection | From RDS console |
| `REDIS_URL` | Redis connection | From ElastiCache console |
| `SMTP_PASSWORD` | Email sending | From SendGrid dashboard |
| `ANTHROPIC_API_KEY` | Claude AI API | From Anthropic console |

### Optional Secrets

| Secret | Purpose | Provider |
|--------|---------|----------|
| `SENTRY_DSN` | Error tracking | Sentry.io |
| `AWS_ACCESS_KEY_ID` | AWS SDK | IAM console |
| `AWS_SECRET_ACCESS_KEY` | AWS SDK | IAM console |

---

## 7. Emergency Procedures

### Secret Compromised

1. **Immediately rotate** the compromised secret
2. **Revoke access** for affected API keys
3. **Audit logs** to determine scope of breach
4. **Notify stakeholders** if data accessed
5. **Update incident response plan**

```bash
# Quick secret rotation
aws secretsmanager update-secret \
    --secret-id maidar/production/config \
    --secret-string file://new-secrets.json \
    --region me-south-1

# Force application restart
kubectl rollout restart deployment/maidar-backend
```

### Lost Access to Secrets

1. **Check AWS IAM permissions**
2. **Verify secret exists**: `aws secretsmanager list-secrets`
3. **Contact AWS support** if permanently lost
4. **Restore from backup** (if available)

---

## 8. Testing Secrets

### Test in Staging First

```bash
# 1. Create staging secret
aws secretsmanager create-secret \
    --name maidar/staging/config \
    --secret-string file://staging-secrets.json \
    --region me-south-1

# 2. Deploy to staging
export ENVIRONMENT=staging
python -m uvicorn app.main:app

# 3. Test all features
curl http://staging.maidar.com/health

# 4. If successful, update production
```

---

## 9. Monitoring & Alerts

### CloudTrail Alerts

Set up alerts for:
- Secret access (GetSecretValue)
- Secret modification (UpdateSecret)
- Failed access attempts (AccessDenied)

### Application Monitoring

```python
# Log secret loading (not values!)
import logging
logger = logging.getLogger(__name__)

try:
    secrets = get_secrets_from_aws()
    logger.info("Successfully loaded secrets from AWS Secrets Manager")
except Exception as e:
    logger.error(f"Failed to load secrets: {e}")
    # Fall back to .env or raise error
```

---

## 10. Cost Optimization

AWS Secrets Manager pricing (UAE region):
- $0.40 per secret per month
- $0.05 per 10,000 API calls

For MAIDAR:
- ~10 secrets = $4/month
- ~100,000 API calls/month = $0.50/month
- **Total: ~$5/month**

Much cheaper than a security breach! 💰

---

## Quick Reference

### Development
```bash
# Use .env file
cp .env.example .env
# Edit .env with secrets
python -m uvicorn app.main:app
```

### Production
```bash
# Use AWS Secrets Manager
export ENVIRONMENT=production
python -m uvicorn app.main:app
```

### Emergency Rotation
```bash
aws secretsmanager update-secret \
    --secret-id maidar/production/config \
    --secret-string file://new-secrets.json
```

---

**Remember:** Security is a process, not a product. Regularly review and update your secrets management practices!
