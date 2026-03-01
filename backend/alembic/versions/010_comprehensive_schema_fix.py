"""Comprehensive schema fix - add all missing columns

Revision ID: 010
Revises: 009
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    """Add all missing columns to match model definitions."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # ===================================================================
    # SCENARIOS TABLE - Add template fields
    # ===================================================================
    scenario_columns = [col['name'] for col in inspector.get_columns('scenarios')]

    if 'body_template' not in scenario_columns:
        op.add_column('scenarios', sa.Column('body_template', sa.Text(), nullable=True))
        print("✓ Added scenarios.body_template")

    if 'subject_template' not in scenario_columns:
        op.add_column('scenarios', sa.Column('subject_template', sa.Text(), nullable=True))
        print("✓ Added scenarios.subject_template")

    if 'created_by' not in scenario_columns:
        op.add_column('scenarios', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key('fk_scenarios_created_by', 'scenarios', 'users', ['created_by'], ['id'])
        print("✓ Added scenarios.created_by")

    # ===================================================================
    # SIMULATION_RESULTS TABLE - Add tracking fields
    # ===================================================================
    result_columns = [col['name'] for col in inspector.get_columns('simulation_results')]

    if 'tenant_id' not in result_columns:
        # First check if table has any rows
        result = conn.execute(sa.text("SELECT COUNT(*) FROM simulation_results")).scalar()
        if result > 0:
            print(f"⚠️  WARNING: simulation_results has {result} rows - tenant_id will be nullable")
            op.add_column('simulation_results', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
        else:
            print("✓ simulation_results is empty - adding tenant_id as NOT NULL")
            op.add_column('simulation_results', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False))

        op.create_foreign_key('fk_simulation_results_tenant_id', 'simulation_results', 'tenants', ['tenant_id'], ['id'], ondelete='CASCADE')
        op.create_index('ix_simulation_results_tenant_id', 'simulation_results', ['tenant_id'])
        print("✓ Added simulation_results.tenant_id")

    if 'email_sent_at' not in result_columns:
        op.add_column('simulation_results', sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True))
        print("✓ Added simulation_results.email_sent_at")

    if 'email_delivered' not in result_columns:
        op.add_column('simulation_results', sa.Column('email_delivered', sa.Boolean(), nullable=True, server_default='false'))
        print("✓ Added simulation_results.email_delivered")

    if 'interactions' not in result_columns:
        op.add_column('simulation_results', sa.Column('interactions', postgresql.JSONB(), nullable=True, server_default='[]'))
        print("✓ Added simulation_results.interactions")

    if 'fell_for_simulation' not in result_columns:
        op.add_column('simulation_results', sa.Column('fell_for_simulation', sa.Boolean(), nullable=True, server_default='false'))
        op.create_index('ix_simulation_results_fell_for_simulation', 'simulation_results', ['fell_for_simulation'])
        print("✓ Added simulation_results.fell_for_simulation")

    if 'reported_as_phishing' not in result_columns:
        op.add_column('simulation_results', sa.Column('reported_as_phishing', sa.Boolean(), nullable=True, server_default='false'))
        print("✓ Added simulation_results.reported_as_phishing")

    if 'time_to_first_interaction' not in result_columns:
        op.add_column('simulation_results', sa.Column('time_to_first_interaction', sa.Interval(), nullable=True))
        print("✓ Added simulation_results.time_to_first_interaction")

    print("\n✓ Comprehensive schema fix completed!")


def downgrade():
    """Revert all changes."""
    # Scenarios
    op.drop_column('scenarios', 'created_by')
    op.drop_column('scenarios', 'subject_template')
    op.drop_column('scenarios', 'body_template')

    # Simulation Results
    op.drop_column('simulation_results', 'time_to_first_interaction')
    op.drop_column('simulation_results', 'reported_as_phishing')
    op.drop_column('simulation_results', 'fell_for_simulation')
    op.drop_column('simulation_results', 'interactions')
    op.drop_column('simulation_results', 'email_delivered')
    op.drop_column('simulation_results', 'email_sent_at')
    op.drop_column('simulation_results', 'tenant_id')
