"""
Settings API endpoints for user preferences and tenant configuration.
"""

import logging
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.dependencies import get_current_active_user, get_current_admin_user
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.settings import (
    NotificationPreferences,
    NotificationPreferencesResponse,
    TenantBranding,
    TenantBrandingResponse
)

router = APIRouter(tags=["Settings"])
logger = logging.getLogger(__name__)


# ============================================================================
# Notification Preferences Endpoints
# ============================================================================

@router.get("/notification-preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notification preferences.
    """
    # TODO: User model doesn't have metadata field yet
    # For now, return default preferences
    # In production, add a metadata JSONB column to users table or create separate preferences table
    preferences = NotificationPreferences()

    return NotificationPreferencesResponse(
        user_id=str(current_user.id),
        preferences=preferences
    )


@router.put("/notification-preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's notification preferences.
    """
    # TODO: User model doesn't have metadata field yet
    # For now, accept the preferences but don't persist them
    # In production, add a metadata JSONB column to users table or create separate preferences table
    logger.warning(f"Notification preferences received but not persisted for user {current_user.email} - metadata field not implemented")

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="NOTIFICATION_PREFERENCES_UPDATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="user",
        resource_id=current_user.id,
        details={
            "email": current_user.email,
            "preferences": preferences.model_dump()
        },
        status="success"
    )

    return NotificationPreferencesResponse(
        user_id=str(current_user.id),
        preferences=preferences
    )


# ============================================================================
# Tenant Branding Endpoints
# ============================================================================

@router.get("/tenant/branding", response_model=TenantBrandingResponse)
def get_tenant_branding(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current tenant's branding configuration.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a tenant"
        )

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # TODO: Tenant model doesn't have metadata field yet
    # For now, return default branding values
    # In production, add metadata JSONB column to tenants table or create separate branding table

    return TenantBrandingResponse(
        tenant_id=str(tenant.id),
        logo_url=None,
        primary_color='#14b8a6',  # Default teal
        secondary_color='#06b6d4',  # Default cyan
        company_name=tenant.name
    )


@router.put("/tenant/branding", response_model=TenantBrandingResponse)
def update_tenant_branding(
    branding: TenantBranding,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant branding configuration.
    Requires TENANT_ADMIN role.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a tenant"
        )

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # TODO: Tenant model doesn't have metadata field yet
    # For now, only update company name (stored in tenant.name)
    # In production, add metadata JSONB column to tenants table or create separate branding table
    if branding.company_name is not None:
        tenant.name = branding.company_name
        db.commit()
        db.refresh(tenant)

    logger.warning(f"Branding update received for tenant {tenant.name} but only company_name persisted - metadata field not implemented")

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="TENANT_BRANDING_UPDATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="tenant",
        resource_id=tenant.id,
        details={
            "tenant_name": tenant.name,
            "logo_url": branding.logo_url,
            "primary_color": branding.primary_color,
            "secondary_color": branding.secondary_color,
            "company_name": branding.company_name
        },
        status="success"
    )

    return TenantBrandingResponse(
        tenant_id=str(tenant.id),
        logo_url=branding.logo_url,  # Return what was sent, but not persisted
        primary_color=branding.primary_color or '#14b8a6',
        secondary_color=branding.secondary_color or '#06b6d4',
        company_name=tenant.name
    )


@router.post("/tenant/logo", response_model=dict)
async def upload_tenant_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Upload tenant logo image.
    Requires TENANT_ADMIN role.

    NOTE: This is a placeholder implementation.
    In production, you should:
    1. Validate file type (PNG, JPG only)
    2. Validate file size (max 2MB)
    3. Upload to S3/cloud storage
    4. Generate thumbnail
    5. Return CDN URL
    """
    # Validate file type
    if file.content_type not in ['image/png', 'image/jpeg', 'image/jpg']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG and JPEG images are allowed"
        )

    # Validate file size (2MB max)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must not exceed 2MB"
        )

    # TODO: Upload to S3 or cloud storage
    # For now, return a placeholder URL
    logo_url = f"/uploads/logos/{current_user.tenant_id}/{file.filename}"

    logger.info(f"Logo uploaded for tenant {current_user.tenant_id}: {file.filename}")

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="TENANT_LOGO_UPLOADED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="tenant",
        resource_id=current_user.tenant_id,
        details={
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": len(contents),
            "logo_url": logo_url
        },
        status="success"
    )

    return {
        "message": "Logo uploaded successfully",
        "logo_url": logo_url,
        "filename": file.filename
    }
