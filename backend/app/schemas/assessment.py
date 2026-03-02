"""
Assessment schemas for API request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

from app.models.assessment import AssessmentStatus, TargetAudience, QuestionType, AssessmentResultStatus


# ============================================================================
# Question Response Schemas
# ============================================================================

class ResponseCreate(BaseModel):
    """Schema for creating a question response option."""
    response_text: str = Field(..., min_length=1, max_length=1000)
    is_correct: Optional[bool] = None
    order_index: int = Field(default=0, ge=0)


class ResponseResponse(BaseModel):
    """Schema for question response option in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_id: UUID
    response_text: str
    is_correct: Optional[bool]
    order_index: int


# ============================================================================
# Question Schemas
# ============================================================================

class QuestionCreate(BaseModel):
    """Schema for creating an assessment question."""
    question_text: str = Field(..., min_length=1, max_length=5000)
    question_type: QuestionType = QuestionType.MULTIPLE_CHOICE
    order_index: int = Field(default=0, ge=0)
    responses: List[ResponseCreate] = Field(default_factory=list)


class QuestionResponse(BaseModel):
    """Schema for assessment question in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    question_text: str
    question_type: QuestionType
    order_index: int
    created_at: datetime
    responses: List[ResponseResponse] = []


# ============================================================================
# Assessment Schemas
# ============================================================================

class AssessmentCreate(BaseModel):
    """Schema for creating a new assessment."""
    # Identity
    title: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    priority: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None

    # Audience
    target_audience: TargetAudience = TargetAudience.GLOBAL
    target_departments: Optional[List[str]] = None  # For departmental targeting

    # Settings
    time_limit: Optional[int] = Field(None, ge=1, le=240)  # 1-240 minutes
    randomize_questions: bool = False
    allow_pause_resume: bool = False
    anonymous_responses: bool = False

    # Questions
    questions: List[QuestionCreate] = Field(default_factory=list)


class AssessmentUpdate(BaseModel):
    """Schema for updating an existing assessment."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    priority: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    target_audience: Optional[TargetAudience] = None
    target_departments: Optional[List[str]] = None
    time_limit: Optional[int] = Field(None, ge=1, le=240)
    randomize_questions: Optional[bool] = None
    allow_pause_resume: Optional[bool] = None
    anonymous_responses: Optional[bool] = None
    status: Optional[AssessmentStatus] = None


class AssessmentResponse(BaseModel):
    """Schema for assessment in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    created_by: Optional[UUID]

    # Identity
    title: str
    category: Optional[str]
    priority: Optional[str]
    description: Optional[str]

    # Audience
    target_audience: TargetAudience
    target_departments: Optional[List[str]] = None

    # Settings
    time_limit: Optional[int]
    randomize_questions: bool
    allow_pause_resume: bool
    anonymous_responses: bool

    # Status
    status: AssessmentStatus

    # Timestamps
    created_at: datetime
    updated_at: datetime
    deployed_at: Optional[datetime]

    # Relationships
    questions: List[QuestionResponse] = []


class AssessmentListItem(BaseModel):
    """Schema for assessment in list view (minimal fields)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category: Optional[str]
    priority: Optional[str]
    target_audience: TargetAudience
    status: AssessmentStatus
    created_at: datetime
    deployed_at: Optional[datetime]

    # Computed fields
    question_count: int = 0
    participant_count: int = 0


class AssessmentListResponse(BaseModel):
    """Schema for paginated assessment list response."""
    assessments: List[AssessmentListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Assessment Answer Schemas (for employee submissions)
# ============================================================================

class AnswerSubmit(BaseModel):
    """Schema for submitting an answer to a question."""
    question_id: UUID
    response_id: Optional[UUID] = None  # For multiple choice
    answer_text: Optional[str] = None  # For free text
    time_taken: Optional[int] = Field(None, ge=0)  # Seconds


class AssessmentSubmit(BaseModel):
    """Schema for submitting a completed assessment."""
    answers: List[AnswerSubmit]


class AnswerResponse(BaseModel):
    """Schema for answer in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_id: UUID
    response_id: Optional[UUID]
    answer_text: Optional[str]
    is_correct: Optional[bool]
    time_taken: Optional[int]
    created_at: datetime


class AssessmentResultResponse(BaseModel):
    """Schema for assessment result in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    employee_id: UUID
    status: AssessmentResultStatus
    started_at: datetime
    completed_at: Optional[datetime]
    time_taken: Optional[int]
    score: Optional[int]
    total_questions: Optional[int]
    correct_answers: Optional[int]
    answers: List[AnswerResponse] = []


class AssessmentResultListResponse(BaseModel):
    """Schema for paginated assessment results list."""
    results: List[AssessmentResultResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
