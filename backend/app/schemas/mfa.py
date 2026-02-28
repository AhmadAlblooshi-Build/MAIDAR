"""
Multi-Factor Authentication (MFA) schemas.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class MFAEnrollRequest(BaseModel):
    """Request to enroll in MFA."""
    password: str = Field(..., description="Current password for verification")


class MFAEnrollResponse(BaseModel):
    """Response containing MFA enrollment data."""
    secret: str = Field(..., description="TOTP secret key (base32 encoded)")
    qr_code_url: str = Field(..., description="QR code data URL for authenticator apps")
    backup_codes: List[str] = Field(..., description="One-time backup codes for account recovery")
    manual_entry_key: str = Field(..., description="Secret for manual entry in authenticator app")


class MFAVerifyRequest(BaseModel):
    """Request to verify MFA token and complete enrollment."""
    token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class MFAVerifyResponse(BaseModel):
    """Response after successful MFA verification."""
    success: bool
    message: str
    mfa_enabled: bool


class MFALoginRequest(BaseModel):
    """Request to complete MFA challenge during login."""
    email: str
    password: str
    mfa_token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class MFADisableRequest(BaseModel):
    """Request to disable MFA."""
    password: str = Field(..., description="Current password for verification")
    mfa_token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code from authenticator app")


class MFAStatusResponse(BaseModel):
    """MFA status for current user."""
    mfa_enabled: bool
    mfa_enabled_at: Optional[str] = None
    backup_codes_remaining: int = 0


class MFARegenerateBackupCodesRequest(BaseModel):
    """Request to regenerate backup codes."""
    password: str = Field(..., description="Current password for verification")
    mfa_token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class MFABackupCodeLoginRequest(BaseModel):
    """Request to login using backup code."""
    email: str
    password: str
    backup_code: str = Field(..., min_length=8, max_length=12, description="Backup recovery code")
