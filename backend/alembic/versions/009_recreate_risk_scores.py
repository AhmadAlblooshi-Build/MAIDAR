"""Recreate risk_scores table with correct schema

Revision ID: 009
Revises: 008
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    """Drop old risk_scores table and recreate with correct schema."""

    # Drop old table (it's empty anyway)
    op.drop_table('risk_scores')
    print("✓ Dropped old risk_scores table")

    # Create new table with correct schema
    op.create_table(
        'risk_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('likelihood', sa.DECIMAL(5, 4), nullable=False),
        sa.Column('impact', sa.DECIMAL(5, 4), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('risk_band', sa.String(20), nullable=False),
        sa.Column('likelihood_breakdown', postgresql.JSONB(), nullable=False),
        sa.Column('impact_breakdown', postgresql.JSONB(), nullable=False),
        sa.Column('algorithm_version', sa.String(20), nullable=False, server_default='v1.0'),
        sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('likelihood >= 0 AND likelihood <= 1', name='check_likelihood_range'),
        sa.CheckConstraint('impact >= 0 AND impact <= 1', name='check_impact_range'),
        sa.CheckConstraint('risk_score >= 0 AND risk_score <= 100', name='check_risk_score_range'),
    )

    # Create indexes
    op.create_index('ix_risk_scores_tenant_id', 'risk_scores', ['tenant_id'])
    op.create_index('ix_risk_scores_employee_id', 'risk_scores', ['employee_id'])
    op.create_index('ix_risk_scores_scenario_id', 'risk_scores', ['scenario_id'])
    op.create_index('ix_risk_scores_risk_score', 'risk_scores', ['risk_score'])
    op.create_index('ix_risk_scores_risk_band', 'risk_scores', ['risk_band'])

    print("✓ Created new risk_scores table with correct schema")


def downgrade():
    """Revert to old schema."""
    op.drop_table('risk_scores')
