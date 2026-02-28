# Database Migrations - MAIDAR

## Overview

MAIDAR uses **Alembic** for database schema migrations, ensuring safe and versioned database changes across environments.

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.py` | Initial database schema (users, tenants, employees, scenarios, simulations) |
| `002_rbac_system.py` | RBAC system (roles, permissions) |
| `003_notifications_and_audit.py` | Notifications and basic audit |
| `004_phase2_enterprise_features.py` | **NEW** - MFA, sessions, audit logging, metadata |

## Quick Start

### Apply All Migrations (Fresh Database)

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Verify current version
alembic current
```

### Create a New Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Create empty migration (for data migrations)
alembic revision -m "description of changes"

# Edit the generated file in alembic/versions/
```

### Apply Specific Migration

```bash
# Upgrade to specific revision
alembic upgrade 004

# Downgrade to specific revision
alembic downgrade 003

# Downgrade one step
alembic downgrade -1
```

## Phase 2 Migration Details

### What's Added in Migration 004

#### 1. **User Metadata & Preferences**
```sql
ALTER TABLE users ADD COLUMN metadata JSONB;
ALTER TABLE users ADD COLUMN notification_preferences JSONB;
```

Stores:
- Custom user settings
- UI preferences
- Feature flags per user

#### 2. **Tenant Branding & Metadata**
```sql
ALTER TABLE tenants ADD COLUMN metadata JSONB;
ALTER TABLE tenants ADD COLUMN branding JSONB;
```

Stores:
- Logo URL
- Color scheme
- Custom branding
- Tenant-specific configuration

#### 3. **Multi-Factor Authentication (MFA)**
```sql
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN mfa_backup_codes VARCHAR[];
ALTER TABLE users ADD COLUMN mfa_enabled_at TIMESTAMP;
```

Enables:
- TOTP-based 2FA
- Backup codes for recovery
- MFA enforcement tracking

#### 4. **Session Management**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Features:
- Track all active sessions per user
- Device tracking
- Session timeout (30 min inactivity)
- Concurrent session limits (max 3)
- "Logout all devices" functionality

#### 5. **Comprehensive Audit Logging**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Logs:
- All authentication attempts
- All data access (employee data views)
- All configuration changes
- All permission changes
- All data exports
- Retention: 7 years (UAE compliance)

#### 6. **API Key Management**
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    scopes VARCHAR[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Enables:
- API keys for system integrations
- Scope-based permissions per key
- Key rotation & expiration
- Usage tracking per API key

## Running Migrations in Production

### Pre-Migration Checklist

- [ ] Backup database: `pg_dump maidar > backup_$(date +%Y%m%d).sql`
- [ ] Test migration on staging environment first
- [ ] Schedule maintenance window (if downtime required)
- [ ] Notify users of maintenance

### Step-by-Step Production Migration

```bash
# 1. Backup database
docker exec maidar-postgres pg_dump -U postgres maidar > backup_before_004.sql

# 2. Verify current version
cd backend
alembic current

# 3. Preview migration SQL (optional)
alembic upgrade 004 --sql > migration_004.sql
cat migration_004.sql  # Review changes

# 4. Apply migration
alembic upgrade head

# 5. Verify migration
alembic current
# Should show: 004 (head)

# 6. Test critical endpoints
curl http://localhost:8001/health
curl http://localhost:8001/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### Rollback Procedure

If something goes wrong:

```bash
# 1. Rollback migration
alembic downgrade 003

# 2. Restore from backup (if needed)
docker exec -i maidar-postgres psql -U postgres maidar < backup_before_004.sql

# 3. Investigate issue
tail -f logs/alembic.log
```

## Common Operations

### Check Current Version

```bash
alembic current
```

### View Migration History

```bash
alembic history --verbose
```

### Upgrade to Latest

```bash
alembic upgrade head
```

### Downgrade One Version

```bash
alembic downgrade -1
```

### Show SQL Without Running

```bash
alembic upgrade head --sql
```

## Troubleshooting

### "Target database is not up to date"

```bash
# Check current version
alembic current

# Check what's pending
alembic upgrade head --sql

# Apply pending migrations
alembic upgrade head
```

### "Can't locate revision identified by 'XXX'"

```bash
# Stamp database with current version
alembic stamp head

# Or stamp with specific version
alembic stamp 003
```

### "Duplicate column" Error

The column already exists in the database. Options:

1. Skip this migration (already applied manually)
2. Downgrade and reapply
3. Edit migration to check if column exists first

### Performance Issues During Migration

```bash
# Run migration during low-traffic hours
# Use --sql to generate SQL, then run manually with CONCURRENT option

alembic upgrade head --sql > migration.sql

# Edit migration.sql to add CONCURRENT
# CREATE INDEX CONCURRENTLY ...

# Run manually
psql -U postgres -d maidar -f migration.sql
```

## Best Practices

### 1. Always Test on Staging First

```bash
# On staging
alembic upgrade head

# Test all features
# Monitor for 24 hours

# Then apply to production
```

### 2. Never Edit Applied Migrations

Once a migration is applied to any environment, never edit it. Create a new migration instead.

### 3. Use Descriptive Names

```bash
# Good
alembic revision -m "add_mfa_columns_to_users"

# Bad
alembic revision -m "update"
```

### 4. Include Rollback (downgrade)

Always implement `downgrade()` function to allow rollbacks.

### 5. Data Migrations

For data changes (not schema), use:

```python
def upgrade():
    conn = op.get_bind()
    conn.execute(
        text("UPDATE users SET role = 'TENANT_ADMIN' WHERE role = 'ADMIN'")
    )
```

## Database Version Control

### Current Schema Version

```
HEAD → 004_phase2_enterprise_features (latest)
        003_notifications_and_audit
        002_rbac_system
        001_initial_schema
```

### Applying Phase 2 Migration

```bash
# Check current version
alembic current

# If on 003, upgrade to 004
alembic upgrade 004

# Verify
alembic current
# Output: 004 (head)
```

## Emergency Procedures

### Complete Database Reset (DEVELOPMENT ONLY)

```bash
# WARNING: This deletes all data!

# Drop all tables
alembic downgrade base

# Reapply all migrations
alembic upgrade head

# Seed initial data
python seed_data.py
```

### Fix Corrupted alembic_version Table

```bash
# Connect to database
docker exec -it maidar-postgres psql -U postgres -d maidar

# Check current stamped version
SELECT * FROM alembic_version;

# Update to correct version
UPDATE alembic_version SET version_num = '004';

# Verify
\q
alembic current
```

## Next Steps

1. **Apply Phase 2 migration**: `alembic upgrade head`
2. **Verify tables created**: Check audit_logs, sessions, api_keys tables exist
3. **Test new features**: MFA enrollment, session management, audit logging
4. **Monitor performance**: Check query performance on audit_logs table

For production deployment, always:
- Backup first
- Test on staging
- Schedule maintenance window
- Have rollback plan ready
