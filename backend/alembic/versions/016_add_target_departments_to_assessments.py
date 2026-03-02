"""add_target_departments_to_assessments

Revision ID: 016
Revises: 015
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    """Add target_departments JSONB column to assessments table."""

    # Add target_departments column (stores array of department names for departmental targeting)
    op.add_column(
        'assessments',
        sa.Column('target_departments', postgresql.JSONB, nullable=True)
    )


def downgrade():
    """Remove target_departments column from assessments table."""

    op.drop_column('assessments', 'target_departments')
