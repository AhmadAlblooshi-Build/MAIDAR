"""
Scenario schemas (Pydantic models for phishing scenarios).
"""

from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ScenarioBase(BaseModel):
    """Base scenario schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Scenario name")
    description: str = Field(..., min_length=1, description="Scenario description")
    category: str = Field(..., description="Scenario category: BEC, CREDENTIALS, DATA, MALWARE")
    language: str = Field(..., min_length=2, max_length=10, description="Language code (en, ar, etc.)")
    difficulty: str = Field(..., description="Difficulty level: easy, medium, hard")

    # Email template
    email_subject: str = Field(..., min_length=1, max_length=255)
    email_body_html: str = Field(..., min_length=1)
    email_body_text: Optional[str] = None
    sender_name: str = Field(..., min_length=1, max_length=100)
    sender_email: str = Field(..., min_length=1, max_length=255)

    # Tracking
    has_link: bool = Field(default=False, description="Whether scenario includes tracking link")
    has_attachment: bool = Field(default=False, description="Whether scenario includes attachment")
    has_credential_form: bool = Field(default=False, description="Whether scenario has credential capture")

    # Metadata
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    is_active: bool = Field(default=True, description="Whether scenario is active")

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        """Validate scenario category."""
        valid_categories = ['BEC', 'CREDENTIALS', 'DATA', 'MALWARE']
        if v.upper() not in valid_categories:
            raise ValueError(f"Category must be one of: {', '.join(valid_categories)}")
        return v.upper()

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v):
        """Validate difficulty level."""
        valid_difficulties = ['easy', 'medium', 'hard']
        if v.lower() not in valid_difficulties:
            raise ValueError(f"Difficulty must be one of: {', '.join(valid_difficulties)}")
        return v.lower()

    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        """Validate and normalize language code."""
        return v.lower()


class ScenarioCreate(ScenarioBase):
    """Schema for creating a new scenario."""
    pass


class ScenarioUpdate(BaseModel):
    """Schema for updating a scenario (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    language: Optional[str] = Field(None, min_length=2, max_length=10)
    difficulty: Optional[str] = None
    email_subject: Optional[str] = Field(None, min_length=1, max_length=255)
    email_body_html: Optional[str] = Field(None, min_length=1)
    email_body_text: Optional[str] = None
    sender_name: Optional[str] = Field(None, min_length=1, max_length=100)
    sender_email: Optional[str] = Field(None, min_length=1, max_length=255)
    has_link: Optional[bool] = None
    has_attachment: Optional[bool] = None
    has_credential_form: Optional[bool] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v is None:
            return v
        valid_categories = ['BEC', 'CREDENTIALS', 'DATA', 'MALWARE']
        if v.upper() not in valid_categories:
            raise ValueError(f"Category must be one of: {', '.join(valid_categories)}")
        return v.upper()

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v):
        if v is None:
            return v
        valid_difficulties = ['easy', 'medium', 'hard']
        if v.lower() not in valid_difficulties:
            raise ValueError(f"Difficulty must be one of: {', '.join(valid_difficulties)}")
        return v.lower()


class ScenarioResponse(ScenarioBase):
    """Schema for scenario response."""
    id: str
    tenant_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    """Schema for paginated scenario list."""
    total: int
    page: int
    page_size: int
    scenarios: List[ScenarioResponse]


class ScenarioSearchRequest(BaseModel):
    """Schema for scenario search/filter."""
    query: Optional[str] = Field(None, description="Search query (name, description)")
    category: Optional[str] = None
    language: Optional[str] = None
    difficulty: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=500)
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", description="Sort order: asc or desc")


class ScenarioStatistics(BaseModel):
    """Schema for scenario statistics."""
    total_scenarios: int
    by_category: Dict[str, int]
    by_language: Dict[str, int]
    by_difficulty: Dict[str, int]
    active_scenarios: int
    with_links: int
    with_attachments: int
    with_credential_forms: int
