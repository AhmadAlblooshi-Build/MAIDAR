"""Fix employee table schema to match model

Revision ID: 007
Revises: 006
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing employee columns and rename seniority_level."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Get current columns
    columns = [col['name'] for col in inspector.get_columns('employees')]

    # Add employee_id if missing
    if 'employee_id' not in columns:
        op.add_column('employees', sa.Column('employee_id', sa.String(100), nullable=True))
        print("✓ Added employees.employee_id")

    # Add gender if missing
    if 'gender' not in columns:
        op.add_column('employees', sa.Column('gender', sa.String(20), nullable=True))
        print("✓ Added employees.gender")

    # Add languages if missing
    if 'languages' not in columns:
        op.add_column('employees', sa.Column('languages', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'))
        print("✓ Added employees.languages")

    # Add technical_literacy if missing
    if 'technical_literacy' not in columns:
        op.add_column('employees', sa.Column('technical_literacy', sa.Integer(), nullable=True, server_default='5'))
        print("✓ Added employees.technical_literacy")

    # Rename seniority_level to seniority if it exists
    if 'seniority_level' in columns and 'seniority' not in columns:
        op.alter_column('employees', 'seniority_level', new_column_name='seniority')
        print("✓ Renamed employees.seniority_level to seniority")


def downgrade():
    """Revert employee changes."""
    op.drop_column('employees', 'employee_id')
    op.drop_column('employees', 'gender')
    op.drop_column('employees', 'languages')
    op.drop_column('employees', 'technical_literacy')
    op.alter_column('employees', 'seniority', new_column_name='seniority_level')
