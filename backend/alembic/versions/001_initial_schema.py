"""Initial schema - tenants, users, employees, scenarios, simulations

Revision ID: 001
Revises:
Create Date: 2026-02-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tenants table
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('subdomain', sa.String(length=100), nullable=False),
        sa.Column('country_code', sa.String(length=3), nullable=False),
        sa.Column('data_residency_region', sa.String(length=50), nullable=False),
        sa.Column('license_tier', sa.String(length=50), nullable=True),
        sa.Column('max_employees', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subdomain')
    )
    op.create_index(op.f('ix_tenants_country_code'), 'tenants', ['country_code'], unique=False)
    op.create_index(op.f('ix_tenants_is_active'), 'tenants', ['is_active'], unique=False)
    op.create_index(op.f('ix_tenants_subdomain'), 'tenants', ['subdomain'], unique=False)

    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verification_code', sa.String(length=10), nullable=True),
        sa.Column('verification_code_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('password_reset_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_tenant_id'), 'users', ['tenant_id'], unique=False)

    # Create employees table
    op.create_table('employees',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('job_title', sa.String(length=100), nullable=False),
        sa.Column('seniority_level', sa.String(length=50), nullable=False),
        sa.Column('age_range', sa.String(length=20), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('risk_band', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employees_department'), 'employees', ['department'], unique=False)
    op.create_index(op.f('ix_employees_email'), 'employees', ['email'], unique=False)
    op.create_index(op.f('ix_employees_is_active'), 'employees', ['is_active'], unique=False)
    op.create_index(op.f('ix_employees_risk_band'), 'employees', ['risk_band'], unique=False)
    op.create_index(op.f('ix_employees_tenant_id'), 'employees', ['tenant_id'], unique=False)

    # Create scenarios table
    op.create_table('scenarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('difficulty', sa.String(length=20), nullable=False),
        sa.Column('email_subject', sa.String(length=255), nullable=False),
        sa.Column('email_body_html', sa.Text(), nullable=False),
        sa.Column('email_body_text', sa.Text(), nullable=False),
        sa.Column('sender_name', sa.String(length=255), nullable=False),
        sa.Column('sender_email', sa.String(length=255), nullable=False),
        sa.Column('has_link', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('has_attachment', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_credential_form', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_template', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scenarios_category'), 'scenarios', ['category'], unique=False)
    op.create_index(op.f('ix_scenarios_difficulty'), 'scenarios', ['difficulty'], unique=False)
    op.create_index(op.f('ix_scenarios_is_active'), 'scenarios', ['is_active'], unique=False)
    op.create_index(op.f('ix_scenarios_is_template'), 'scenarios', ['is_template'], unique=False)
    op.create_index(op.f('ix_scenarios_tenant_id'), 'scenarios', ['tenant_id'], unique=False)

    # Create simulations table
    op.create_table('simulations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('launched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('target_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('opened_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('clicked_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('submitted_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reported_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_simulations_status'), 'simulations', ['status'], unique=False)
    op.create_index(op.f('ix_simulations_tenant_id'), 'simulations', ['tenant_id'], unique=False)

    # Create simulation_results table
    op.create_table('simulation_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reported_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['simulation_id'], ['simulations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_simulation_results_employee_id'), 'simulation_results', ['employee_id'], unique=False)
    op.create_index(op.f('ix_simulation_results_simulation_id'), 'simulation_results', ['simulation_id'], unique=False)
    op.create_index(op.f('ix_simulation_results_status'), 'simulation_results', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_simulation_results_status'), table_name='simulation_results')
    op.drop_index(op.f('ix_simulation_results_simulation_id'), table_name='simulation_results')
    op.drop_index(op.f('ix_simulation_results_employee_id'), table_name='simulation_results')
    op.drop_table('simulation_results')
    op.drop_index(op.f('ix_simulations_tenant_id'), table_name='simulations')
    op.drop_index(op.f('ix_simulations_status'), table_name='simulations')
    op.drop_table('simulations')
    op.drop_index(op.f('ix_scenarios_tenant_id'), table_name='scenarios')
    op.drop_index(op.f('ix_scenarios_is_template'), table_name='scenarios')
    op.drop_index(op.f('ix_scenarios_is_active'), table_name='scenarios')
    op.drop_index(op.f('ix_scenarios_difficulty'), table_name='scenarios')
    op.drop_index(op.f('ix_scenarios_category'), table_name='scenarios')
    op.drop_table('scenarios')
    op.drop_index(op.f('ix_employees_tenant_id'), table_name='employees')
    op.drop_index(op.f('ix_employees_risk_band'), table_name='employees')
    op.drop_index(op.f('ix_employees_is_active'), table_name='employees')
    op.drop_index(op.f('ix_employees_email'), table_name='employees')
    op.drop_index(op.f('ix_employees_department'), table_name='employees')
    op.drop_table('employees')
    op.drop_index(op.f('ix_users_tenant_id'), table_name='users')
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_tenants_subdomain'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_is_active'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_country_code'), table_name='tenants')
    op.drop_table('tenants')
