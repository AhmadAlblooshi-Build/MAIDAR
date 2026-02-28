"""
Session management schemas.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class SessionResponse(BaseModel):
    """Schema for session information."""
    id: str
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    last_activity: datetime
    expires_at: datetime
    is_active: bool
    created_at: datetime
    is_current: bool = Field(default=False, description="Whether this is the current session")

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    """Schema for list of sessions."""
    total: int
    active_sessions: int
    sessions: List[SessionResponse]


class TerminateSessionRequest(BaseModel):
    """Request to terminate a specific session."""
    session_id: str = Field(..., description="UUID of session to terminate")


class TerminateSessionResponse(BaseModel):
    """Response after terminating a session."""
    success: bool
    message: str
    session_id: str


class TerminateAllSessionsResponse(BaseModel):
    """Response after terminating all sessions."""
    success: bool
    message: str
    terminated_count: int
