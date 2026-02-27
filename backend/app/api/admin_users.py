"""
Admin Users API - Super Admin user management
"""

from typing import List, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.database import get_db
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.dependencies import get_current_super_admin as require_super_admin
from app.core.security import get_password_hash as hash_password

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
    last_login_at: Optional[datetime]
    created_at: datetime
    mfa_enabled: bool = False

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

    # Build response
    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant.name
    response.mfa_enabled = user_data.require_mfa

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

    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant_name

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

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant_name

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
        response = AdminUserResponse.model_validate(user)

        # Get tenant name
        if user.tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
            if tenant:
                response.tenant_name = tenant.name

        user_responses.append(response)

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

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant_name

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

    # Get tenant name
    tenant_name = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant_name

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

    user.tenant_id = new_tenant_id
    db.commit()
    db.refresh(user)

    response = AdminUserResponse.model_validate(user)
    response.tenant_name = tenant.name

    return response
