"""Add missing columns to match models

Revision ID: 006
Revises: 005
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to employees and tenants tables."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Check employees table columns
    employees_columns = [col['name'] for col in inspector.get_columns('employees')]

    # Add deleted_at to employees if missing (for soft delete)
    if 'deleted_at' not in employees_columns:
        op.add_column('employees', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
        print("✓ Added employees.deleted_at column")

    # Check tenants table columns
    tenants_columns = [col['name'] for col in inspector.get_columns('tenants')]

    # Add domain to tenants if missing
    if 'domain' not in tenants_columns:
        op.add_column('tenants', sa.Column('domain', sa.String(255), nullable=True))
        print("✓ Added tenants.domain column")

    # Add seats_total to tenants if missing
    if 'seats_total' not in tenants_columns:
        op.add_column('tenants', sa.Column('seats_total', sa.Integer(), nullable=True, server_default='100'))
        print("✓ Added tenants.seats_total column")

    # Add seats_used to tenants if missing
    if 'seats_used' not in tenants_columns:
        op.add_column('tenants', sa.Column('seats_used', sa.Integer(), nullable=True, server_default='0'))
        print("✓ Added tenants.seats_used column")

    # Add provisioned_date to tenants if missing
    if 'provisioned_date' not in tenants_columns:
        op.add_column('tenants', sa.Column('provisioned_date', sa.DateTime(timezone=True), nullable=True))
        print("✓ Added tenants.provisioned_date column")

    # Add deleted_at to tenants if missing (for soft delete)
    if 'deleted_at' not in tenants_columns:
        op.add_column('tenants', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
        print("✓ Added tenants.deleted_at column")


def downgrade():
    """Remove added columns."""
    op.drop_column('employees', 'deleted_at')
    op.drop_column('tenants', 'domain')
    op.drop_column('tenants', 'seats_total')
    op.drop_column('tenants', 'seats_used')
    op.drop_column('tenants', 'provisioned_date')
    op.drop_column('tenants', 'deleted_at')
