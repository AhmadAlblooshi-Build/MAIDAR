"""
Comprehensive audit logging service for compliance and security.

Logs all security-relevant events for 7-year retention (UAE compliance).
"""

import logging
import hashlib
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class AuditLogger:
    """Service for logging audit events to database."""

    def log_event(
        self,
        db: Session,
        action: str,
        user_id: Optional[UUID] = None,
        tenant_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None
    ) -> None:
        """
        Log an audit event.

        Args:
            db: Database session
            action: Action performed (e.g., "login", "data_export", "config_change")
            user_id: UUID of user who performed action
            tenant_id: UUID of tenant (for multi-tenant isolation)
            resource_type: Type of resource affected (e.g., "employee", "simulation")
            resource_id: UUID of specific resource
            details: Additional context as JSON
            ip_address: Client IP address
            user_agent: Client user agent string
            status: "success" or "failure"
            error_message: Error details if status is "failure"
        """
        try:
            # Import here to avoid circular dependency
            from app.models.audit_log import AuditLog

            # Generate checksum for tamper detection (required by migration)
            audit_id = uuid4()
            timestamp = datetime.utcnow()
            checksum_data = f"{audit_id}:{timestamp.isoformat()}:{action}:{user_id}:{resource_id}"
            checksum = hashlib.sha256(checksum_data.encode()).hexdigest()

            audit_log = AuditLog(
                id=audit_id,
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                error_message=error_message,
                checksum=checksum,
                created_at=timestamp
            )

            db.add(audit_log)
            db.commit()

            logger.info(
                f"Audit log created: {action} by user {user_id} "
                f"on {resource_type} {resource_id} - {status}"
            )

        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            db.rollback()
            # Don't raise - audit logging failure should not block operations


# Global audit logger instance
audit_logger = AuditLogger()
