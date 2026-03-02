"""add_assessment_tables

Revision ID: 014
Revises: 013
Create Date: 2026-03-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade():
    """Add assessment tables for risk assessment surveys and questionnaires."""

    # Create assessments table
    op.create_table(
        'assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),

        # Identity fields
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('priority', sa.String(100), nullable=True),
        sa.Column('description', sa.Text, nullable=True),

        # Audience targeting (validated by Pydantic schema)
        sa.Column('target_audience', sa.String(50), nullable=False, server_default='global'),

        # Settings
        sa.Column('time_limit', sa.Integer, nullable=True),
        sa.Column('randomize_questions', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('allow_pause_resume', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('anonymous_responses', sa.Boolean, nullable=False, server_default='false'),

        # Status (validated by Pydantic schema)
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('deployed_at', sa.DateTime, nullable=True),
    )

    # Create assessment_questions table
    op.create_table(
        'assessment_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False, index=True),

        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('question_type', sa.String(50), nullable=False, server_default='multiple_choice'),
        sa.Column('order_index', sa.Integer, nullable=False, server_default='0'),

        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
    )

    # Create assessment_question_responses table
    op.create_table(
        'assessment_question_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_questions.id', ondelete='CASCADE'), nullable=False, index=True),

        sa.Column('response_text', sa.Text, nullable=False),
        sa.Column('is_correct', sa.Boolean, nullable=True),
        sa.Column('order_index', sa.Integer, nullable=False, server_default='0'),
    )

    # Create assessment_results table
    op.create_table(
        'assessment_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True),

        # Status and timing (validated by Pydantic schema)
        sa.Column('status', sa.String(20), nullable=False, server_default='in_progress'),
        sa.Column('started_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('time_taken', sa.Integer, nullable=True),  # Seconds

        # Scoring
        sa.Column('score', sa.Integer, nullable=True),
        sa.Column('total_questions', sa.Integer, nullable=True),
        sa.Column('correct_answers', sa.Integer, nullable=True),
    )

    # Create assessment_answers table
    op.create_table(
        'assessment_answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('result_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_results.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('response_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_question_responses.id', ondelete='SET NULL'), nullable=True),

        # For free-text answers
        sa.Column('answer_text', sa.Text, nullable=True),

        # Grading
        sa.Column('is_correct', sa.Boolean, nullable=True),
        sa.Column('time_taken', sa.Integer, nullable=True),  # Seconds

        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
    )

    # Create indexes for performance
    op.create_index('idx_assessments_tenant_status', 'assessments', ['tenant_id', 'status'])
    op.create_index('idx_assessment_results_employee', 'assessment_results', ['employee_id', 'assessment_id'])


def downgrade():
    """Remove assessment tables."""

    # Drop indexes
    op.drop_index('idx_assessment_results_employee', table_name='assessment_results')
    op.drop_index('idx_assessments_tenant_status', table_name='assessments')

    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('assessment_answers')
    op.drop_table('assessment_results')
    op.drop_table('assessment_question_responses')
    op.drop_table('assessment_questions')
    op.drop_table('assessments')
