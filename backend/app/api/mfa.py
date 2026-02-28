"""
Multi-Factor Authentication (MFA) API endpoints.
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password
from app.core.mfa_service import mfa_service
from app.models.user import User
from app.schemas.mfa import (
    MFAEnrollRequest,
    MFAEnrollResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFADisableRequest,
    MFAStatusResponse,
    MFARegenerateBackupCodesRequest,
)

router = APIRouter(tags=["Multi-Factor Authentication"])
logger = logging.getLogger(__name__)


@router.get("/status", response_model=MFAStatusResponse)
def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get MFA status for current user.
    """
    backup_codes_remaining = 0
    if current_user.mfa_enabled and current_user.mfa_backup_codes:
        backup_codes_remaining = len(current_user.mfa_backup_codes)

    return MFAStatusResponse(
        mfa_enabled=current_user.mfa_enabled,
        mfa_enabled_at=current_user.mfa_enabled_at.isoformat() if current_user.mfa_enabled_at else None,
        backup_codes_remaining=backup_codes_remaining
    )


@router.post("/enroll", response_model=MFAEnrollResponse)
def enroll_mfa(
    request: MFAEnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enroll in MFA. Returns QR code and backup codes.

    User must verify TOTP token before MFA is fully enabled.
    """
    # Verify password
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Check if MFA already enabled
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this account"
        )

    # Generate new TOTP secret
    secret = mfa_service.generate_secret()

    # Generate QR code
    qr_code_url = mfa_service.generate_qr_code(secret, current_user.email)

    # Generate backup codes
    backup_codes = mfa_service.generate_backup_codes(count=10)

    # Store secret temporarily (not enabled until verified)
    current_user.mfa_secret = secret
    current_user.mfa_backup_codes = backup_codes
    current_user.mfa_enabled = False  # Not enabled until verified

    db.commit()

    logger.info(f"User {current_user.email} started MFA enrollment")

    return MFAEnrollResponse(
        secret=secret,
        qr_code_url=qr_code_url,
        backup_codes=backup_codes,
        manual_entry_key=secret
    )


@router.post("/verify", response_model=MFAVerifyResponse)
def verify_mfa_enrollment(
    request: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify TOTP token to complete MFA enrollment.
    """
    # Check if user has a secret
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA enrollment not started. Call /enroll first."
        )

    # Check if already enabled
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )

    # Verify token
    if not mfa_service.verify_token(current_user.mfa_secret, request.token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA token"
        )

    # Enable MFA
    current_user.mfa_enabled = True
    current_user.mfa_enabled_at = datetime.utcnow()

    db.commit()

    logger.info(f"User {current_user.email} enabled MFA")

    # Log audit event
    from app.core.audit_logger import audit_logger
    audit_logger.log_event(
        db=db,
        action="mfa_enabled",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={"email": current_user.email}
    )

    return MFAVerifyResponse(
        success=True,
        message="MFA has been successfully enabled",
        mfa_enabled=True
    )


@router.post("/disable", response_model=MFAVerifyResponse)
def disable_mfa(
    request: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable MFA for the current user.

    Requires password and current MFA token.
    """
    # Verify password
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Check if MFA is enabled
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account"
        )

    # Verify MFA token
    if not mfa_service.verify_token(current_user.mfa_secret, request.mfa_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA token"
        )

    # Disable MFA
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_backup_codes = None
    current_user.mfa_enabled_at = None

    db.commit()

    logger.warning(f"User {current_user.email} disabled MFA")

    # Log audit event
    from app.core.audit_logger import audit_logger
    audit_logger.log_event(
        db=db,
        action="mfa_disabled",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={"email": current_user.email}
    )

    return MFAVerifyResponse(
        success=True,
        message="MFA has been disabled",
        mfa_enabled=False
    )


@router.post("/regenerate-backup-codes", response_model=MFAEnrollResponse)
def regenerate_backup_codes(
    request: MFARegenerateBackupCodesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate backup codes.

    Requires password and current MFA token.
    Old backup codes will be invalidated.
    """
    # Verify password
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Check if MFA is enabled
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account"
        )

    # Verify MFA token
    if not mfa_service.verify_token(current_user.mfa_secret, request.mfa_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA token"
        )

    # Generate new backup codes
    backup_codes = mfa_service.generate_backup_codes(count=10)
    current_user.mfa_backup_codes = backup_codes

    db.commit()

    logger.info(f"User {current_user.email} regenerated MFA backup codes")

    # Log audit event
    from app.core.audit_logger import audit_logger
    audit_logger.log_event(
        db=db,
        action="mfa_backup_codes_regenerated",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={"email": current_user.email}
    )

    # Generate QR code (in case user wants to reconfigure)
    qr_code_url = mfa_service.generate_qr_code(current_user.mfa_secret, current_user.email)

    return MFAEnrollResponse(
        secret=current_user.mfa_secret,
        qr_code_url=qr_code_url,
        backup_codes=backup_codes,
        manual_entry_key=current_user.mfa_secret
    )
