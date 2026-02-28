"""Phase 2: Enterprise features - MFA, sessions, audit logging, metadata

Revision ID: 004
Revises: 003
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add enterprise features for Phase 2."""

    # Add metadata JSONB columns to users table
    op.add_column('users', sa.Column('metadata', postgresql.JSONB, nullable=True))
    op.add_column('users', sa.Column('notification_preferences', postgresql.JSONB, nullable=True))

    # Add metadata and branding JSONB columns to tenants table
    op.add_column('tenants', sa.Column('metadata', postgresql.JSONB, nullable=True))
    op.add_column('tenants', sa.Column('branding', postgresql.JSONB, nullable=True))

    # Add MFA columns to users table
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('mfa_secret', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('mfa_backup_codes', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('users', sa.Column('mfa_enabled_at', sa.DateTime(), nullable=True))

    # Create sessions table for session management
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_token', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('device_name', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('last_activity', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()'), onupdate=sa.text('NOW()')),
    )

    # Note: audit_logs table already has status and error_message from migration 003
    # Create additional composite indexes for audit_logs (for performance)
    op.create_index('idx_audit_logs_tenant_created', 'audit_logs', ['tenant_id', 'created_at'])
    op.create_index('idx_audit_logs_user_created', 'audit_logs', ['user_id', 'created_at'])

    # Create api_keys table for API key management
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False, unique=True),
        sa.Column('key_prefix', sa.String(length=10), nullable=False),
        sa.Column('scopes', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()'), onupdate=sa.text('NOW()')),
    )

    # Add indexes
    op.create_index('idx_sessions_user_id', 'sessions', ['user_id'])
    op.create_index('idx_sessions_expires_at', 'sessions', ['expires_at'])
    op.create_index('idx_api_keys_tenant_id', 'api_keys', ['tenant_id'])


def downgrade() -> None:
    """Remove enterprise features."""

    # Drop tables
    op.drop_table('api_keys')
    op.drop_table('sessions')

    # Drop indexes we added to audit_logs
    op.drop_index('idx_audit_logs_user_created', table_name='audit_logs')
    op.drop_index('idx_audit_logs_tenant_created', table_name='audit_logs')

    # Note: status and error_message columns are from migration 003, not removed here

    # Remove MFA columns from users
    op.drop_column('users', 'mfa_enabled')
    op.drop_column('users', 'mfa_secret')
    op.drop_column('users', 'mfa_backup_codes')
    op.drop_column('users', 'mfa_enabled_at')

    # Remove metadata columns
    op.drop_column('users', 'metadata')
    op.drop_column('users', 'notification_preferences')
    op.drop_column('tenants', 'metadata')
    op.drop_column('tenants', 'branding')
