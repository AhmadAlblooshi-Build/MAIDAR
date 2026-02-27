"""
Audit Logs API - Super Admin audit trail access
"""

from typing import List, Optional
from datetime import datetime
from uuid import UUID
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.config.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.tenant import Tenant
from app.core.dependencies import get_current_super_admin as require_super_admin

router = APIRouter()


# Pydantic schemas
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor: Optional[str] = "system"
    actor_role: Optional[str] = "SYSTEM"
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    tenant_name: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    status: str = "success"
    severity: str = "low"
    details: str = ""
    hash: str

    class Config:
        from_attributes = True


class AuditLogSearchRequest(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    search: Optional[str] = None
    action_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tenant_id: Optional[UUID] = None


class AuditLogSearchResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def calculate_severity(action: str) -> str:
    """Calculate severity level based on action type."""
    if any(x in action.lower() for x in ['delete', 'suspend', 'terminate', 'failed']):
        return "critical" if "failed" in action.lower() else "high"
    elif any(x in action.lower() for x in ['create', 'launch', 'export']):
        return "medium"
    return "low"


def calculate_status(action: str) -> str:
    """Determine status based on action."""
    if "failed" in action.lower():
        return "failed"
    elif "warning" in action.lower():
        return "warning"
    return "success"


def generate_hash(log_id: str, timestamp: datetime, action: str) -> str:
    """Generate cryptographic hash for audit log integrity."""
    data = f"{log_id}:{timestamp.isoformat()}:{action}"
    return hashlib.sha256(data.encode()).hexdigest()


@router.post("/search", response_model=AuditLogSearchResponse)
async def search_audit_logs(
    search_params: AuditLogSearchRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Search audit logs with filters and pagination."""
    query = db.query(AuditLog)

    # Apply search filter
    if search_params.search:
        search_term = f"%{search_params.search}%"
        query = query.join(AuditLog.user, isouter=True).filter(
            or_(
                AuditLog.action.ilike(search_term),
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )

    # Apply action type filter
    if search_params.action_type:
        query = query.filter(AuditLog.action.ilike(f"%{search_params.action_type}%"))

    # Apply date range filter
    if search_params.start_date:
        query = query.filter(AuditLog.created_at >= search_params.start_date)
    if search_params.end_date:
        query = query.filter(AuditLog.created_at <= search_params.end_date)

    # Apply tenant filter
    if search_params.tenant_id:
        query = query.filter(AuditLog.tenant_id == search_params.tenant_id)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (search_params.page - 1) * search_params.page_size
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(search_params.page_size).all()

    # Build responses
    log_responses = []
    for log in logs:
        # Get user info
        actor = "system"
        actor_role = "SYSTEM"
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                actor = user.email
                actor_role = user.role

        # Get tenant name
        tenant_name = None
        if log.tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == log.tenant_id).first()
            if tenant:
                tenant_name = tenant.name

        # Build details string
        details_str = ""
        if log.details:
            if isinstance(log.details, dict):
                details_str = "; ".join([f"{k}: {v}" for k, v in log.details.items()])
            else:
                details_str = str(log.details)

        response = AuditLogResponse(
            id=str(log.id),
            timestamp=log.created_at,
            actor=actor,
            actor_role=actor_role,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=str(log.resource_id) if log.resource_id else None,
            tenant_name=tenant_name,
            ip_address=str(log.ip_address) if log.ip_address else None,
            user_agent=log.user_agent,
            status=calculate_status(log.action),
            severity=calculate_severity(log.action),
            details=details_str,
            hash=generate_hash(str(log.id), log.created_at, log.action)
        )

        # Apply severity filter (post-query since it's calculated)
        if search_params.severity and response.severity != search_params.severity:
            continue

        # Apply status filter (post-query since it's calculated)
        if search_params.status and response.status != search_params.status:
            continue

        log_responses.append(response)

    return AuditLogSearchResponse(
        logs=log_responses,
        total=total,
        page=search_params.page,
        page_size=search_params.page_size,
        total_pages=(total + search_params.page_size - 1) // search_params.page_size
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Get a specific audit log entry by ID."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found")

    # Get user info
    actor = "system"
    actor_role = "SYSTEM"
    if log.user_id:
        user = db.query(User).filter(User.id == log.user_id).first()
        if user:
            actor = user.email
            actor_role = user.role

    # Get tenant name
    tenant_name = None
    if log.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == log.tenant_id).first()
        if tenant:
            tenant_name = tenant.name

    # Build details string
    details_str = ""
    if log.details:
        if isinstance(log.details, dict):
            details_str = "; ".join([f"{k}: {v}" for k, v in log.details.items()])
        else:
            details_str = str(log.details)

    return AuditLogResponse(
        id=str(log.id),
        timestamp=log.created_at,
        actor=actor,
        actor_role=actor_role,
        action=log.action,
        resource_type=log.resource_type,
        resource_id=str(log.resource_id) if log.resource_id else None,
        tenant_name=tenant_name,
        ip_address=str(log.ip_address) if log.ip_address else None,
        user_agent=log.user_agent,
        status=calculate_status(log.action),
        severity=calculate_severity(log.action),
        details=details_str,
        hash=generate_hash(str(log.id), log.created_at, log.action)
    )
