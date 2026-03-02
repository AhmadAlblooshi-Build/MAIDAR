"""Make simulation_result status nullable (legacy field)

Revision ID: 011
Revises: 010
Create Date: 2026-03-02 13:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    """Make status column nullable in simulation_results (it's a legacy field)."""
    # Remove NOT NULL constraint from status column
    op.alter_column('simulation_results', 'status',
                    existing_type=sa.String(length=20),
                    nullable=True,
                    existing_nullable=False)


def downgrade():
    """Restore NOT NULL constraint on status column."""
    # Set default value for any NULL status
    op.execute("UPDATE simulation_results SET status = 'PENDING' WHERE status IS NULL")

    # Re-add NOT NULL constraint
    op.alter_column('simulation_results', 'status',
                    existing_type=sa.String(length=20),
                    nullable=False,
                    existing_nullable=True)
