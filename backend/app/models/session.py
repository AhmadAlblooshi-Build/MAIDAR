"""
Session model for session management and device tracking.
"""

from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid

from app.models.base import Base


class Session(Base):
    """
    Session model for tracking user sessions across devices.

    Features:
    - Track all active sessions per user
    - Device identification (name, IP, user agent)
    - Session timeout (30 min inactivity)
    - Concurrent session limits (max 3 devices)
    - "Logout all devices" functionality
    """
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Session identification
    session_token = Column(String(255), nullable=False, unique=True, index=True)

    # Device tracking
    device_name = Column(String(255), nullable=True)  # e.g., "Chrome on MacOS", "Mobile Safari"
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)

    # Session state
    last_activity = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")

    @property
    def is_expired(self) -> bool:
        """Check if session has expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def time_until_expiry(self) -> timedelta:
        """Get time remaining until expiry."""
        return self.expires_at - datetime.utcnow()

    @property
    def is_valid(self) -> bool:
        """Check if session is valid (active and not expired)."""
        return self.is_active and not self.is_expired

    def update_activity(self, session_timeout_minutes: int = 30):
        """
        Update last activity and extend expiry.

        Args:
            session_timeout_minutes: Minutes of inactivity before expiry
        """
        self.last_activity = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(minutes=session_timeout_minutes)
        self.updated_at = datetime.utcnow()

    def terminate(self):
        """Terminate this session."""
        self.is_active = False
        self.updated_at = datetime.utcnow()

    def __repr__(self):
        return f"<Session {self.id} user={self.user_id} device={self.device_name} active={self.is_active}>"
