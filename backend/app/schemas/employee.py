"""
Employee schemas (Pydantic models for request/response validation).
"""

from typing import Optional, List
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class EmployeeBase(BaseModel):
    """Base employee schema with common fields."""
    employee_id: str = Field(..., min_length=1, max_length=100, description="Unique employee identifier")
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    age_range: str = Field(..., description="Age range: 18_24, 25_34, 35_44, 45_54, 55_plus")
    gender: Optional[str] = Field(None, description="Gender: male, female, other")
    languages: List[str] = Field(default_factory=list, description="List of language codes (en, ar, etc.)")
    technical_literacy: int = Field(..., ge=0, le=10, description="Technical literacy score (0-10)")
    seniority: str = Field(..., description="Seniority level: junior, mid, senior, executive, c_level")
    department: str = Field(..., min_length=1, max_length=100)
    job_title: Optional[str] = Field(None, max_length=255)

    @field_validator('age_range')
    @classmethod
    def validate_age_range(cls, v):
        """Validate age range."""
        valid_ranges = ['18_24', '25_34', '35_44', '45_54', '55_plus']
        if v not in valid_ranges:
            raise ValueError(f"Age range must be one of: {', '.join(valid_ranges)}")
        return v

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        """Validate gender."""
        if v is None:
            return v
        valid_genders = ['male', 'female', 'other']
        if v.lower() not in valid_genders:
            raise ValueError(f"Gender must be one of: {', '.join(valid_genders)}")
        return v.lower()

    @field_validator('seniority')
    @classmethod
    def validate_seniority(cls, v):
        """Validate seniority level."""
        valid_levels = ['junior', 'mid', 'senior', 'executive', 'c_level']
        if v.lower() not in valid_levels:
            raise ValueError(f"Seniority must be one of: {', '.join(valid_levels)}")
        return v.lower()

    @field_validator('languages')
    @classmethod
    def validate_languages(cls, v):
        """Validate and normalize language codes."""
        if not v:
            return []  # Allow empty list (will use platform default)
        # Normalize to lowercase
        return [lang.lower() for lang in v]


class EmployeeCreate(EmployeeBase):
    """Schema for creating a new employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating an employee (all fields optional)."""
    employee_id: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    age_range: Optional[str] = None
    gender: Optional[str] = None
    languages: Optional[List[str]] = None
    technical_literacy: Optional[int] = Field(None, ge=0, le=10)
    seniority: Optional[str] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    job_title: Optional[str] = Field(None, max_length=255)

    @field_validator('age_range')
    @classmethod
    def validate_age_range(cls, v):
        """Validate age range."""
        if v is None:
            return v
        valid_ranges = ['18_24', '25_34', '35_44', '45_54', '55_plus']
        if v not in valid_ranges:
            raise ValueError(f"Age range must be one of: {', '.join(valid_ranges)}")
        return v

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        """Validate gender."""
        if v is None:
            return v
        valid_genders = ['male', 'female', 'other']
        if v.lower() not in valid_genders:
            raise ValueError(f"Gender must be one of: {', '.join(valid_genders)}")
        return v.lower()

    @field_validator('seniority')
    @classmethod
    def validate_seniority(cls, v):
        """Validate seniority level."""
        if v is None:
            return v
        valid_levels = ['junior', 'mid', 'senior', 'executive', 'c_level']
        if v.lower() not in valid_levels:
            raise ValueError(f"Seniority must be one of: {', '.join(valid_levels)}")
        return v.lower()

    @field_validator('languages')
    @classmethod
    def validate_languages(cls, v):
        """Validate and normalize language codes."""
        if v is None:
            return v
        if not v:
            raise ValueError("At least one language must be provided")
        return [lang.lower() for lang in v]


class EmployeeResponse(EmployeeBase):
    """Schema for employee response."""
    id: str
    tenant_id: str
    risk_score: Optional[float] = Field(None, description="Risk score (0-10 scale)")
    risk_band: Optional[str] = Field(None, description="Risk band: low, medium, high, critical")
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    """Schema for paginated employee list response."""
    total: int
    page: int
    page_size: int
    employees: List[EmployeeResponse]


class EmployeeBulkImportRequest(BaseModel):
    """Schema for bulk employee import (CSV)."""
    employees: List[EmployeeCreate]


class EmployeeBulkImportResponse(BaseModel):
    """Schema for bulk import response."""
    total_processed: int
    successful: int
    failed: int
    errors: List[dict] = Field(default_factory=list, description="List of errors with row numbers")


class EmployeeSearchRequest(BaseModel):
    """Schema for employee search/filter request."""
    query: Optional[str] = Field(None, description="Search query (name, email, department)")
    age_range: Optional[str] = None
    gender: Optional[str] = None
    seniority: Optional[str] = None
    department: Optional[str] = None
    min_technical_literacy: Optional[int] = Field(None, ge=0, le=10)
    max_technical_literacy: Optional[int] = Field(None, ge=0, le=10)
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=500)
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", description="Sort order: asc or desc")

    @field_validator('sort_order')
    @classmethod
    def validate_sort_order(cls, v):
        """Validate sort order."""
        if v.lower() not in ['asc', 'desc']:
            raise ValueError("Sort order must be 'asc' or 'desc'")
        return v.lower()


class EmployeeStatistics(BaseModel):
    """Schema for employee statistics."""
    total_count: int
    total_employees: int  # Deprecated, use total_count
    by_seniority: dict
    by_age_range: dict
    by_department: dict
    by_gender: dict
    avg_technical_literacy: float
    avg_risk_score: Optional[float] = None
    high_risk_count: Optional[int] = None
