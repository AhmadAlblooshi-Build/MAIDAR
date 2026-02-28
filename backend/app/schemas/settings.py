"""
Settings schemas for user preferences and tenant configuration.
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field, HttpUrl


class NotificationPreferences(BaseModel):
    """Schema for notification preferences."""
    email_simulation_launched: bool = True
    email_high_risk_detected: bool = True
    email_simulation_completed: bool = True
    email_weekly_report: bool = True
    email_employee_interactions: bool = True
    inapp_desktop_notifications: bool = True
    inapp_sound_alerts: bool = False

    class Config:
        from_attributes = True


class NotificationPreferencesResponse(BaseModel):
    """Response schema for notification preferences."""
    user_id: str
    preferences: NotificationPreferences

    class Config:
        from_attributes = True


class TenantBranding(BaseModel):
    """Schema for tenant branding update."""
    logo_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)

    class Config:
        from_attributes = True


class TenantBrandingResponse(BaseModel):
    """Response schema for tenant branding."""
    tenant_id: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    company_name: str

    class Config:
        from_attributes = True
