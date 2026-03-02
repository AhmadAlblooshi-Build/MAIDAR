"""make_job_title_nullable

Revision ID: c287718a0461
Revises: 011
Create Date: 2026-03-02 22:32:28.373214

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make job_title nullable in employees table
    op.alter_column('employees', 'job_title',
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade() -> None:
    # Revert job_title to NOT NULL
    op.alter_column('employees', 'job_title',
                    existing_type=sa.String(length=255),
                    nullable=False)
