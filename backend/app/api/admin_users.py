"""
Admin Users API - Super Admin user management
"""

from typing import List, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.database import get_db
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.dependencies import get_current_super_admin as require_super_admin
from app.core.security import get_password_hash as hash_password
from app.core.audit_logger import audit_logger

router = APIRouter()


# Pydantic schemas
class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    tenant_id: UUID
    role: UserRole = Field(default=UserRole.TENANT_ADMIN)
    require_mfa: bool = False


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    tenant_id: Optional[str]
    tenant_name: Optional[str]
    role: str
    is_active: bool
    email_verified: bool
    last_login: Optional[datetime]
    created_at: datetime
    mfa_enabled: bool = False

    @field_validator('id', 'tenant_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings."""
        if v is None:
            return None
        return str(v) if isinstance(v, UUID) else v

    class Config:
        from_attributes = True


class AdminUserSearchRequest(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    search: Optional[str] = None
    tenant_id: Optional[UUID] = None
    status: Optional[str] = None  # active, suspended


class AdminUserSearchResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.post("/", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    user_data: AdminUserCreate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new admin user for a tenant."""

    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_data.email}' already exists"
        )

    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == user_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # Create user with temporary password
    user = User(
        email=user_data.email,
        password_hash=hash_password("ChangeMe123!"),  # Temporary password
        full_name=user_data.full_name,
        tenant_id=user_data.tenant_id,
        role=user_data.role,
        is_active=True,
        email_verified=False
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ADMIN_USER_CREATED",
        user_id=current_user.id,
        tenant_id=None,  # Super admin action
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "full_name": user.full_name,
            "tenant_id": str(user_data.tenant_id),
            "tenant_name": tenant.name,
            "role": user.role
        },
        status="success"
    )

    # Build response
    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant.name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=user_data.require_mfa
    )

    return response


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_admin_user(
    user_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get a specific admin user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=False
    )

    return response


@router.put("/{user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    user_id: UUID,
    user_data: AdminUserUpdate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Update an admin user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ADMIN_USER_UPDATED",
        user_id=current_user.id,
        tenant_id=None,  # Super admin action
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "updated_fields": list(update_data.keys())
        },
        status="success"
    )

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=False
    )

    return response


@router.post("/search", response_model=AdminUserSearchResponse)
async def search_admin_users(
    search_params: AdminUserSearchRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Search admin users with filters and pagination."""
    query = db.query(User).filter(
        or_(
            User.role == UserRole.TENANT_ADMIN,
            User.role == UserRole.ANALYST
        )
    )

    # Apply search filter
    if search_params.search:
        search_term = f"%{search_params.search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )

    # Apply tenant filter
    if search_params.tenant_id:
        query = query.filter(User.tenant_id == search_params.tenant_id)

    # Apply status filter
    if search_params.status == "active":
        query = query.filter(User.is_active == True)
    elif search_params.status == "suspended":
        query = query.filter(User.is_active == False)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (search_params.page - 1) * search_params.page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(search_params.page_size).all()

    # Build responses with tenant names
    user_responses = []
    for user in users:
        # Build response dict manually to handle UUID conversion
        response_dict = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "tenant_name": None,
            "role": user.role,
            "is_active": user.is_active,
            "email_verified": user.email_verified,
            "last_login": user.last_login,
            "created_at": user.created_at,
            "mfa_enabled": False
        }

        # Get tenant name
        if user.tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
            if tenant:
                response_dict["tenant_name"] = tenant.name

        user_responses.append(AdminUserResponse(**response_dict))

    return AdminUserSearchResponse(
        users=user_responses,
        total=total,
        page=search_params.page,
        page_size=search_params.page_size,
        total_pages=(total + search_params.page_size - 1) // search_params.page_size
    )


@router.post("/{user_id}/suspend", response_model=AdminUserResponse)
async def suspend_admin_user(
    user_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Suspend an admin user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ADMIN_USER_SUSPENDED",
        user_id=current_user.id,
        tenant_id=None,  # Super admin action
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "full_name": user.full_name
        },
        status="success"
    )

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=False
    )

    return response


@router.post("/{user_id}/activate", response_model=AdminUserResponse)
async def activate_admin_user(
    user_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Activate a suspended admin user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = True
    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ADMIN_USER_ACTIVATED",
        user_id=current_user.id,
        tenant_id=None,  # Super admin action
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "full_name": user.full_name
        },
        status="success"
    )

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=False
    )

    return response


@router.put("/{user_id}/reassign-tenant", response_model=AdminUserResponse)
async def reassign_tenant(
    user_id: UUID,
    new_tenant_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Reassign an admin user to a different tenant."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Verify new tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == new_tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    old_tenant_id = user.tenant_id
    user.tenant_id = new_tenant_id
    db.commit()
    db.refresh(user)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ADMIN_USER_TENANT_REASSIGNED",
        user_id=current_user.id,
        tenant_id=None,  # Super admin action
        resource_type="user",
        resource_id=user.id,
        details={
            "email": user.email,
            "old_tenant_id": str(old_tenant_id) if old_tenant_id else None,
            "new_tenant_id": str(new_tenant_id),
            "new_tenant_name": tenant.name
        },
        status="success"
    )

    # Construct response with tenant_name included
    response = AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=tenant.name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        mfa_enabled=False
    )

    return response
