"""Add missing tables and fix schema

Revision ID: 005
Revises: 004_phase2_enterprise_features
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004_phase2_enterprise_features'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing tables and columns."""

    # Check and create risk_scores table if it doesn't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'risk_scores' not in inspector.get_table_names():
        op.create_table(
            'risk_scores',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('overall_score', sa.Integer(), nullable=False),
            sa.Column('phishing_susceptibility', sa.Integer(), nullable=False),
            sa.Column('awareness_level', sa.Integer(), nullable=False),
            sa.Column('training_completion', sa.Integer(), nullable=False),
            sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        print("✓ Created risk_scores table")


def downgrade():
    """Remove added tables."""
    op.drop_table('risk_scores')
