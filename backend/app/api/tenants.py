"""
Tenants API - Super Admin tenant management
"""

from typing import List, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.config.database import get_db
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.risk_score import RiskScore
from app.core.dependencies import get_current_super_admin as require_super_admin

router = APIRouter()


# Pydantic schemas
class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: str = Field(..., min_length=1, max_length=255)
    license_tier: str = Field(default="Professional")
    seats_total: int = Field(default=100, ge=1)
    country_code: str = Field(default="UAE")
    data_residency_region: str = Field(default="UAE")


class TenantCreate(TenantBase):
    subdomain: str = Field(..., min_length=1, max_length=100)
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    domain: Optional[str] = Field(None, min_length=1, max_length=255)
    license_tier: Optional[str] = None
    seats_total: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    domain: str
    subdomain: str
    license_tier: str
    seats_total: int
    seats_used: int
    provisioned_date: datetime
    country_code: str
    data_residency_region: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    admin_count: int = 0
    employee_count: int = 0
    avg_risk_score: float = 0.0

    class Config:
        from_attributes = True


class TenantSearchRequest(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    search: Optional[str] = None
    status: Optional[str] = None  # active, suspended


class TenantSearchResponse(BaseModel):
    tenants: List[TenantResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Helper function
def build_tenant_response(tenant: Tenant, db: Session) -> TenantResponse:
    """Helper to build TenantResponse with computed fields."""
    admin_count = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.role == UserRole.TENANT_ADMIN
    ).count()
    employee_count = db.query(Employee).filter(Employee.tenant_id == tenant.id).count()
    avg_risk = db.query(func.avg(RiskScore.risk_score)).filter(
        RiskScore.tenant_id == tenant.id
    ).scalar()

    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        domain=tenant.domain,
        subdomain=tenant.subdomain,
        license_tier=tenant.license_tier,
        seats_total=tenant.seats_total,
        seats_used=tenant.seats_used,
        provisioned_date=tenant.provisioned_date,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        admin_count=admin_count,
        employee_count=employee_count,
        avg_risk_score=float(avg_risk) if avg_risk else 0.0,
        country_code=tenant.country_code,
        data_residency_region=tenant.data_residency_region
    )


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Create a new tenant organization."""

    # Check if subdomain already exists
    existing = db.query(Tenant).filter(Tenant.subdomain == tenant_data.subdomain).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subdomain '{tenant_data.subdomain}' already exists"
        )

    # Create tenant
    tenant = Tenant(
        name=tenant_data.name,
        domain=tenant_data.domain,
        subdomain=tenant_data.subdomain,
        license_tier=tenant_data.license_tier,
        seats_total=tenant_data.seats_total,
        country_code=tenant_data.country_code,
        data_residency_region=tenant_data.data_residency_region,
        provisioned_date=datetime.utcnow()
    )

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Create admin user if provided
    if tenant_data.admin_name and tenant_data.admin_email:
        from app.core.security import get_password_hash as hash_password
        admin_user = User(
            tenant_id=tenant.id,
            email=tenant_data.admin_email,
            password_hash=hash_password("ChangeMe123!"),  # Temporary password
            full_name=tenant_data.admin_name,
            role=UserRole.TENANT_ADMIN,
            is_active=True,
            email_verified=False
        )
        db.add(admin_user)
        db.commit()

    # Add computed fields
    return build_tenant_response(tenant, db)


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get a specific tenant by ID."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Add computed fields
    response = TenantResponse.model_validate(tenant)
    response.admin_count = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.role == UserRole.TENANT_ADMIN
    ).count()
    response.employee_count = db.query(Employee).filter(Employee.tenant_id == tenant.id).count()

    # Calculate average risk score
    avg_risk = db.query(func.avg(RiskScore.risk_score)).filter(
        RiskScore.tenant_id == tenant.id
    ).scalar()
    response.avg_risk_score = float(avg_risk) if avg_risk else 0.0

    return response


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Update a tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Update fields
    update_data = tenant_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)

    # Add computed fields
    return build_tenant_response(tenant, db)


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Delete a tenant (soft delete)."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Soft delete
    tenant.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/search", response_model=TenantSearchResponse)
async def search_tenants(
    search_params: TenantSearchRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Search tenants with filters and pagination."""
    query = db.query(Tenant).filter(Tenant.deleted_at.is_(None))

    # Apply search filter
    if search_params.search:
        search_term = f"%{search_params.search}%"
        query = query.filter(
            or_(
                Tenant.name.ilike(search_term),
                Tenant.domain.ilike(search_term),
                Tenant.subdomain.ilike(search_term)
            )
        )

    # Apply status filter
    if search_params.status == "active":
        query = query.filter(Tenant.is_active == True)
    elif search_params.status == "suspended":
        query = query.filter(Tenant.is_active == False)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (search_params.page - 1) * search_params.page_size
    tenants = query.order_by(Tenant.created_at.desc()).offset(offset).limit(search_params.page_size).all()

    # Add computed fields for each tenant
    tenant_responses = []
    for tenant in tenants:
        tenant_responses.append(build_tenant_response(tenant, db))

    return TenantSearchResponse(
        tenants=tenant_responses,
        total=total,
        page=search_params.page,
        page_size=search_params.page_size,
        total_pages=(total + search_params.page_size - 1) // search_params.page_size
    )


@router.post("/{tenant_id}/suspend", response_model=TenantResponse)
async def suspend_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Suspend a tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.is_active = False
    db.commit()
    db.refresh(tenant)

    return build_tenant_response(tenant, db)


@router.post("/{tenant_id}/activate", response_model=TenantResponse)
async def activate_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Activate a suspended tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.is_active = True
    db.commit()
    db.refresh(tenant)

    return build_tenant_response(tenant, db)
