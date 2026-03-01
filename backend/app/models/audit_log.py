"""Audit Log database model for UAE compliance."""

from enum import Enum
from datetime import datetime

from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin


class AuditAction(str, Enum):
    """Audit action types for comprehensive logging."""
    # Employee actions
    EMPLOYEE_CREATED = "EMPLOYEE_CREATED"
    EMPLOYEE_UPDATED = "EMPLOYEE_UPDATED"
    EMPLOYEE_DELETED = "EMPLOYEE_DELETED"
    EMPLOYEE_EXPORTED = "EMPLOYEE_EXPORTED"
    EMPLOYEE_VIEWED = "EMPLOYEE_VIEWED"  # Data access tracking

    # Risk scoring actions
    RISK_SCORE_CALCULATED = "RISK_SCORE_CALCULATED"

    # Simulation actions
    SIMULATION_CREATED = "SIMULATION_CREATED"
    SIMULATION_LAUNCHED = "SIMULATION_LAUNCHED"
    SIMULATION_COMPLETED = "SIMULATION_COMPLETED"

    # Authentication actions
    USER_LOGIN = "USER_LOGIN"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_LOGOUT = "USER_LOGOUT"
    MFA_ENABLED = "MFA_ENABLED"
    MFA_DISABLED = "MFA_DISABLED"
    MFA_BACKUP_CODES_REGENERATED = "MFA_BACKUP_CODES_REGENERATED"
    SESSION_CREATED = "SESSION_CREATED"
    SESSION_TERMINATED = "SESSION_TERMINATED"
    ALL_SESSIONS_TERMINATED = "ALL_SESSIONS_TERMINATED"

    # Data export actions
    DATA_EXPORTED = "DATA_EXPORTED"

    # Configuration changes
    SETTINGS_CHANGED = "SETTINGS_CHANGED"
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    ROLE_ASSIGNED = "ROLE_ASSIGNED"


class AuditLog(Base, UUIDMixin):
    """
    Audit Log model for comprehensive audit trail.

    Required by UAE Federal Decree-Law No. 45 of 2021.
    Provides immutable audit trail of all system actions.
    """

    __tablename__ = 'audit_logs'

    # Tenant isolation (nullable for platform-level actions)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)

    # Action details
    action = Column(String(50), nullable=False, index=True)  # Validated by schema
    resource_type = Column(String(50), nullable=True, index=True)  # e.g., 'employee', 'simulation'
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Additional details
    details = Column(JSONB, nullable=True)  # Flexible details storage
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)

    # Status tracking (Phase 2 enhancement)
    status = Column(String(20), nullable=False, default="success")  # success, failure
    error_message = Column(Text, nullable=True)  # Error details if status is failure

    # Security & integrity (Phase 2)
    checksum = Column(String(64), nullable=True)  # SHA-256 hash for tamper detection

    # Timestamp (immutable, no update)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.user_id} at {self.created_at}>"

    @classmethod
    def log(
        cls,
        action: AuditAction,
        tenant_id: str = None,
        user_id: str = None,
        resource_type: str = None,
        resource_id: str = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """
        Convenience method to create an audit log entry.

        Usage:
            AuditLog.log(
                action=AuditAction.EMPLOYEE_CREATED,
                tenant_id=tenant.id,
                user_id=current_user.id,
                resource_type='employee',
                resource_id=employee.id,
                details={'name': employee.full_name}
            )
        """
        return cls(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
