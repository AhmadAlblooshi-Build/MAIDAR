"""Notification database model."""

from enum import Enum

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


class NotificationType(str, Enum):
    """Types of notifications."""
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"
    SIMULATION_COMPLETE = "SIMULATION_COMPLETE"
    SIMULATION_LAUNCHED = "SIMULATION_LAUNCHED"
    HIGH_RISK_DETECTED = "HIGH_RISK_DETECTED"
    EMPLOYEE_CLICKED = "EMPLOYEE_CLICKED"
    EMPLOYEE_REPORTED = "EMPLOYEE_REPORTED"
    SYSTEM_ALERT = "SYSTEM_ALERT"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Notification(Base, UUIDMixin, TimestampMixin):
    """
    Notifications for users - in-app and email.

    Supports real-time WebSocket delivery and persistent storage.
    """

    __tablename__ = 'notifications'

    # Tenant isolation
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)

    # Recipient
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Notification content
    type = Column(String(50), nullable=False, index=True)  # NotificationType enum value
    priority = Column(String(20), nullable=False, default="MEDIUM", index=True)  # NotificationPriority enum value
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Optional extra data (JSON)
    extra_data = Column(JSONB, nullable=True)  # Store related IDs, links, etc.

    # Action link (optional)
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)  # e.g., "View Results", "Take Action"

    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Email delivery
    email_sent = Column(Boolean, default=False, nullable=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="notifications")
    user = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification {self.type} for user {self.user_id}>"

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "type": self.type,
            "priority": self.priority,
            "title": self.title,
            "message": self.message,
            "extra_data": self.extra_data,
            "action_url": self.action_url,
            "action_label": self.action_label,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
