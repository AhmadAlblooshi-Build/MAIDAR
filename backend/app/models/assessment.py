"""
Assessment models for risk assessment surveys and questionnaires.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from .base import Base


class AssessmentStatus(str, enum.Enum):
    """Assessment status options."""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TargetAudience(str, enum.Enum):
    """Target audience options."""
    GLOBAL = "global"
    DEPARTMENTAL = "departmental"
    RISK = "risk"
    NEWHIRES = "newhires"


class QuestionType(str, enum.Enum):
    """Question type options."""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SCENARIO_BASED = "scenario_based"
    SHORT_TEXT = "short_text"


class AssessmentResultStatus(str, enum.Enum):
    """Assessment result status options."""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class Assessment(Base):
    """Risk assessment/survey model."""
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Identity fields
    title = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)
    priority = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Audience targeting (validated by Pydantic schema)
    target_audience = Column(String(50), nullable=False, default='global')
    target_departments = Column(JSONB, nullable=True)  # Array of department names for departmental targeting

    # Settings
    time_limit = Column(Integer, nullable=True)  # Minutes
    randomize_questions = Column(Boolean, default=False)
    allow_pause_resume = Column(Boolean, default=False)
    anonymous_responses = Column(Boolean, default=False)

    # Status (validated by Pydantic schema)
    status = Column(String(20), nullable=False, default='draft')

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deployed_at = Column(DateTime, nullable=True)

    # Relationships
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan")
    results = relationship("AssessmentResult", back_populates="assessment", cascade="all, delete-orphan")


class AssessmentQuestion(Base):
    """Assessment question model."""
    __tablename__ = "assessment_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)

    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False, default='multiple_choice')  # Validated by Pydantic schema
    order_index = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    responses = relationship("AssessmentQuestionResponse", back_populates="question", cascade="all, delete-orphan")


class AssessmentQuestionResponse(Base):
    """Assessment question response/option model."""
    __tablename__ = "assessment_question_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False, index=True)

    response_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)  # Null for non-graded questions
    order_index = Column(Integer, nullable=False, default=0)

    # Relationships
    question = relationship("AssessmentQuestion", back_populates="responses")


class AssessmentResult(Base):
    """Employee assessment result model."""
    __tablename__ = "assessment_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)

    # Status and timing (validated by Pydantic schema)
    status = Column(String(20), nullable=False, default='in_progress')
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    time_taken = Column(Integer, nullable=True)  # Seconds

    # Scoring
    score = Column(Integer, nullable=True)  # Percentage or points
    total_questions = Column(Integer, nullable=True)
    correct_answers = Column(Integer, nullable=True)

    # Relationships
    assessment = relationship("Assessment", back_populates="results")
    answers = relationship("AssessmentAnswer", back_populates="result", cascade="all, delete-orphan")


class AssessmentAnswer(Base):
    """Individual question answer model."""
    __tablename__ = "assessment_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    result_id = Column(UUID(as_uuid=True), ForeignKey("assessment_results.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False)
    response_id = Column(UUID(as_uuid=True), ForeignKey("assessment_question_responses.id", ondelete="SET NULL"), nullable=True)

    # For free-text answers
    answer_text = Column(Text, nullable=True)

    # Grading
    is_correct = Column(Boolean, nullable=True)
    time_taken = Column(Integer, nullable=True)  # Seconds for this question

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    result = relationship("AssessmentResult", back_populates="answers")
