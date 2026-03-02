"""convert_assessment_enums_to_varchar

Revision ID: 015
Revises: 014
Create Date: 2026-03-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    """Convert assessment enum columns to varchar."""

    # Alter assessments table columns
    op.execute('ALTER TABLE assessments ALTER COLUMN target_audience TYPE VARCHAR(50) USING target_audience::text')
    op.execute('ALTER TABLE assessments ALTER COLUMN status TYPE VARCHAR(20) USING status::text')

    # Alter assessment_questions table columns
    op.execute('ALTER TABLE assessment_questions ALTER COLUMN question_type TYPE VARCHAR(50) USING question_type::text')

    # Alter assessment_results table columns
    op.execute('ALTER TABLE assessment_results ALTER COLUMN status TYPE VARCHAR(20) USING status::text')

    # Drop the enum types (they're no longer needed)
    op.execute('DROP TYPE IF EXISTS targetaudience')
    op.execute('DROP TYPE IF EXISTS assessmentstatus')
    op.execute('DROP TYPE IF EXISTS questiontype')
    op.execute('DROP TYPE IF EXISTS assessmentresultstatus')


def downgrade():
    """Revert varchar columns back to enums."""

    # Recreate enum types
    op.execute("CREATE TYPE targetaudience AS ENUM ('global', 'departmental', 'risk', 'newhires')")
    op.execute("CREATE TYPE assessmentstatus AS ENUM ('draft', 'active', 'completed', 'archived')")
    op.execute("CREATE TYPE questiontype AS ENUM ('multiple_choice', 'true_false', 'scenario_based', 'short_text')")
    op.execute("CREATE TYPE assessmentresultstatus AS ENUM ('in_progress', 'completed', 'abandoned')")

    # Convert columns back to enums
    op.execute('ALTER TABLE assessments ALTER COLUMN target_audience TYPE targetaudience USING target_audience::targetaudience')
    op.execute('ALTER TABLE assessments ALTER COLUMN status TYPE assessmentstatus USING status::assessmentstatus')
    op.execute('ALTER TABLE assessment_questions ALTER COLUMN question_type TYPE questiontype USING question_type::questiontype')
    op.execute('ALTER TABLE assessment_results ALTER COLUMN status TYPE assessmentresultstatus USING status::assessmentresultstatus')
