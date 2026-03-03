"""
Authentication API endpoints for user registration, login, and password management.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.config.settings import settings
from app.core.dependencies import (
    get_current_user,
    get_current_active_user,
    login_rate_limiter,
    password_reset_limiter
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_verification_token,
    create_password_reset_token,
    verify_token,
    generate_verification_code
)
from app.core.audit_logger import audit_logger
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    VerifyEmail,
    ForgotPassword,
    ResetPassword,
    ChangePassword,
    UpdateProfile,
    UserResponse
)
from app.services.email import email_service

router = APIRouter(tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user.

    - If tenant_id is provided, adds user to existing tenant
    - If organization_name is provided, creates new tenant and user becomes TENANT_ADMIN
    - First user without tenant_id becomes PLATFORM_SUPER_ADMIN
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    tenant = None
    user_role = UserRole.ANALYST  # Default role

    # Handle tenant creation/assignment
    if user_data.tenant_id:
        # User joining existing tenant
        tenant = db.query(Tenant).filter(Tenant.id == user_data.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        if not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant is not active"
            )
        user_role = UserRole.ANALYST

    elif user_data.organization_name:
        # Create new tenant (first user becomes admin)
        # Generate subdomain from organization name
        subdomain = user_data.organization_name.lower().replace(" ", "-").replace("_", "-")

        # Check if subdomain already exists
        existing_tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Organization '{user_data.organization_name}' already exists"
            )

        # Create tenant
        tenant = Tenant(
            name=user_data.organization_name,
            domain=f"{subdomain}.maidar.app",  # Default domain, can be customized later
            subdomain=subdomain,
            country_code="UAE",
            data_residency_region="UAE",
            is_active=True
        )
        db.add(tenant)
        db.flush()  # Get tenant ID

        user_role = UserRole.TENANT_ADMIN
        logger.info(f"Created new tenant: {tenant.name} ({tenant.subdomain})")

    else:
        # No tenant specified - check if this is first user
        user_count = db.query(User).count()
        if user_count == 0:
            # First user becomes PLATFORM_SUPER_ADMIN
            user_role = UserRole.PLATFORM_SUPER_ADMIN
            logger.info("Creating first user as PLATFORM_SUPER_ADMIN")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either tenant_id or organization_name must be provided"
            )

    # Generate verification code
    verification_code = generate_verification_code()
    verification_expires = datetime.utcnow() + timedelta(hours=24)

    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_role,
        tenant_id=tenant.id if tenant else None,
        is_active=True,
        email_verified=False,
        verification_code=verification_code,
        verification_code_expires_at=verification_expires
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="USER_REGISTERED",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "organization_created": tenant is not None and user_role == UserRole.TENANT_ADMIN
        },
        status="success"
    )

    # Send verification email asynchronously (non-blocking)
    try:
        from app.tasks.email_tasks import send_welcome_email
        send_welcome_email.delay(
            to_email=user.email,
            full_name=user.full_name,
            verification_code=verification_code
        )
        logger.info(f"Verification email queued for {user.email}")
    except Exception as e:
        logger.error(f"Failed to queue verification email for {user.email}: {str(e)}")
        # Don't fail registration if email fails

    logger.info(f"User registered successfully: {user.email} ({user.role})")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        is_active=user.is_active
    )


@router.post("/login", response_model=Token)
def login(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Login with email and password to get JWT access token.

    Rate limited to 5 attempts per 5 minutes per IP.
    """
    # Rate limiting
    client_ip = request.client.host
    if not login_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )

    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()

    # Always verify password (even if user doesn't exist) to prevent timing attacks
    if user:
        password_valid = verify_password(credentials.password, user.password_hash)
    else:
        # Perform fake password verification to maintain consistent timing
        verify_password(credentials.password, "$2b$12$dummy.hash.to.prevent.timing.attack.detection")
        password_valid = False

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Check if email is verified (optional - can be enforced or not)
    # if not user.email_verified:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Email not verified. Please verify your email before logging in."
    #     )

    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="USER_LOGIN",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "role": user.role
        },
        status="success"
    )

    # Create access token
    access_token = create_access_token(data={"sub": user.email})

    logger.info(f"User logged in: {user.email}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
            is_active=user.is_active
        )
    )


@router.post("/verify-email", response_model=dict)
def verify_email(
    verification_data: VerifyEmail,
    db: Session = Depends(get_db)
):
    """
    Verify email address using verification token or code.

    Supports both:
    - Token-based verification (from email link)
    - Code-based verification (6-digit code)
    """
    # Verify token
    email = verify_token(verification_data.token, expected_type="email_verification")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already verified
    if user.email_verified:
        return {"message": "Email already verified"}

    # If code provided, verify it
    if verification_data.code:
        if not user.verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found for this user"
            )

        if user.verification_code_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired"
            )

        if user.verification_code != verification_data.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )

    # Mark as verified
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="EMAIL_VERIFIED",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "verification_method": "code" if verification_data.code else "token"
        },
        status="success"
    )

    # Send welcome email
    try:
        email_service.send_welcome_email(
            to_email=user.email,
            full_name=user.full_name
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")

    logger.info(f"Email verified for user: {user.email}")

    return {"message": "Email verified successfully"}


@router.post("/resend-verification", response_model=dict)
def resend_verification(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Resend verification email with new code.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification code has been sent"}

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Generate new verification code
    verification_code = generate_verification_code()
    verification_expires = datetime.utcnow() + timedelta(hours=24)

    user.verification_code = verification_code
    user.verification_code_expires_at = verification_expires
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="VERIFICATION_RESENT",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email
        },
        status="success"
    )

    # Send verification email
    try:
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={create_verification_token(user.email)}"
        email_service.send_verification_email(
            to_email=user.email,
            verification_code=verification_code,
            verification_link=verification_link
        )
        logger.info(f"Verification email resent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to resend verification email to {user.email}: {str(e)}")

    return {"message": "If the email exists, a verification code has been sent"}


@router.post("/forgot-password", response_model=dict)
def forgot_password(
    forgot_data: ForgotPassword,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Request password reset email.

    Rate limited to 3 attempts per hour per IP.
    """
    # Rate limiting
    client_ip = request.client.host
    if not password_reset_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset attempts. Please try again later."
        )

    # Find user
    user = db.query(User).filter(User.email == forgot_data.email).first()

    # Always return success (don't reveal if email exists)
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {forgot_data.email}")
        return {"message": "If the email exists, a password reset link has been sent"}

    # Generate reset token
    reset_token = create_password_reset_token(user.email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    # Send password reset email asynchronously (non-blocking)
    try:
        from app.tasks.email_tasks import send_password_reset_email as send_reset_task
        send_reset_task.delay(
            to_email=user.email,
            reset_token=reset_token
        )
        logger.info(f"Password reset email queued for {user.email}")
    except Exception as e:
        logger.error(f"Failed to queue password reset email for {user.email}: {str(e)}")

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="PASSWORD_RESET_REQUESTED",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email
        },
        status="success"
    )

    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password", response_model=dict)
def reset_password(
    reset_data: ResetPassword,
    db: Session = Depends(get_db)
):
    """
    Reset password using reset token from email.
    """
    # Verify token
    email = verify_token(reset_data.token, expected_type="password_reset")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="PASSWORD_RESET",
        user_id=user.id,
        tenant_id=user.tenant_id,
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email
        },
        status="success"
    )

    logger.info(f"Password reset successfully for user: {user.email}")

    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user's profile.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        is_active=current_user.is_active
    )


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    profile_data: UpdateProfile,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current authenticated user's profile (name and email).
    """
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use"
            )
        current_user.email = profile_data.email
        current_user.email_verified = False  # Require re-verification
        logger.info(f"User email changed from {current_user.email} to {profile_data.email}")

    # Update full name if provided
    if profile_data.full_name:
        current_user.full_name = profile_data.full_name

    db.commit()
    db.refresh(current_user)

    # Create audit log
    updated_fields = []
    if profile_data.email and profile_data.email != current_user.email:
        updated_fields.append("email")
    if profile_data.full_name:
        updated_fields.append("full_name")

    audit_logger.log_event(
        db=db,
        action="PROFILE_UPDATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="user",
        resource_id=current_user.id,
        details={
            "email": current_user.email,
            "updated_fields": updated_fields
        },
        status="success"
    )

    logger.info(f"Profile updated for user: {current_user.email}")

    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        is_active=current_user.is_active
    )


@router.post("/change-password", response_model=dict)
def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check if new password is different
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="PASSWORD_CHANGED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="user",
        resource_id=current_user.id,
        details={
            "email": current_user.email
        },
        status="success"
    )

    logger.info(f"Password changed for user: {current_user.email}")

    return {"message": "Password changed successfully"}
