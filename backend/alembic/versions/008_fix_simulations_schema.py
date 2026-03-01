"""Fix simulations table schema to match model

Revision ID: 008
Revises: 007
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing simulations columns and rename columns."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Get current columns
    columns = [col['name'] for col in inspector.get_columns('simulations')]

    # Add target_employee_ids if missing
    if 'target_employee_ids' not in columns:
        op.add_column('simulations', sa.Column('target_employee_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True, server_default='{}'))
        print("✓ Added simulations.target_employee_ids")

    # Add send_immediately if missing
    if 'send_immediately' not in columns:
        op.add_column('simulations', sa.Column('send_immediately', sa.Boolean(), nullable=True, server_default='true'))
        print("✓ Added simulations.send_immediately")

    # Add track_opens if missing
    if 'track_opens' not in columns:
        op.add_column('simulations', sa.Column('track_opens', sa.Boolean(), nullable=True, server_default='true'))
        print("✓ Added simulations.track_opens")

    # Add track_clicks if missing
    if 'track_clicks' not in columns:
        op.add_column('simulations', sa.Column('track_clicks', sa.Boolean(), nullable=True, server_default='true'))
        print("✓ Added simulations.track_clicks")

    # Add track_credentials if missing
    if 'track_credentials' not in columns:
        op.add_column('simulations', sa.Column('track_credentials', sa.Boolean(), nullable=True, server_default='true'))
        print("✓ Added simulations.track_credentials")

    # Rename launched_at to started_at if needed
    if 'launched_at' in columns and 'started_at' not in columns:
        op.alter_column('simulations', 'launched_at', new_column_name='started_at')
        print("✓ Renamed simulations.launched_at to started_at")

    # Rename created_by_user_id to created_by if needed
    if 'created_by_user_id' in columns and 'created_by' not in columns:
        op.alter_column('simulations', 'created_by_user_id', new_column_name='created_by')
        print("✓ Renamed simulations.created_by_user_id to created_by")


def downgrade():
    """Revert simulations changes."""
    op.drop_column('simulations', 'target_employee_ids')
    op.drop_column('simulations', 'send_immediately')
    op.drop_column('simulations', 'track_opens')
    op.drop_column('simulations', 'track_clicks')
    op.drop_column('simulations', 'track_credentials')
    op.alter_column('simulations', 'started_at', new_column_name='launched_at')
    op.alter_column('simulations', 'created_by', new_column_name='created_by_user_id')
