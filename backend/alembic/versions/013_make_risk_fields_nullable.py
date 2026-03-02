"""make_risk_fields_nullable

Revision ID: e957db31b9dd
Revises: 012
Create Date: 2026-03-02 22:42:29.081232

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make risk_score and risk_band nullable in employees table
    # These are calculated fields that may not be available on creation
    op.alter_column('employees', 'risk_score',
                    existing_type=sa.Integer(),
                    nullable=True)
    op.alter_column('employees', 'risk_band',
                    existing_type=sa.String(length=20),
                    nullable=True)


def downgrade() -> None:
    # Revert risk fields to NOT NULL
    op.alter_column('employees', 'risk_score',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('employees', 'risk_band',
                    existing_type=sa.String(length=20),
                    nullable=False)
