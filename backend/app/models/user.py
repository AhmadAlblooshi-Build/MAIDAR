"""User database model for RBAC."""

from enum import Enum

from sqlalchemy import Column, String, Boolean, ForeignKey, Enum as SQLEnum, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


class UserRole(str, Enum):
    """User roles for RBAC."""
    PLATFORM_SUPER_ADMIN = "PLATFORM_SUPER_ADMIN"  # Global admin
    TENANT_ADMIN = "TENANT_ADMIN"  # Organization admin
    ANALYST = "ANALYST"  # Read-only analyst


class User(Base, UUIDMixin, TimestampMixin):
    """
    User model for authentication and authorization.

    Implements role-based access control (RBAC) per UAE compliance.
    """

    __tablename__ = 'users'

    # Tenant isolation (nullable for PLATFORM_SUPER_ADMIN)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True, index=True)

    # Authentication
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # Bcrypt hashed

    # Profile
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="ANALYST", index=True)  # Validated by schema

    # Status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False, index=True)
    verification_code = Column(String(6), nullable=True)
    verification_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Phase 2: Multi-Factor Authentication
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)  # TOTP secret
    mfa_backup_codes = Column(ARRAY(String), nullable=True)  # Backup codes
    mfa_enabled_at = Column(DateTime(timezone=False), nullable=True)

    # Phase 2: Password Reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Phase 2: Customization
    notification_preferences = Column(JSONB, nullable=True)  # Email, SMS preferences
    custom_metadata = Column('metadata', JSONB, nullable=True)  # Additional user settings (DB column: metadata)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    created_scenarios = relationship("Scenario", back_populates="created_by_user", foreign_keys="Scenario.created_by")
    created_simulations = relationship("Simulation", back_populates="created_by_user", foreign_keys="Simulation.created_by")
    audit_logs = relationship("AuditLog", back_populates="user")
    roles = relationship("Role", secondary="user_roles", back_populates="users")
    notifications = relationship("Notification", back_populates="user")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"

    def can_access_tenant(self, tenant_id: str) -> bool:
        """Check if user can access a specific tenant."""
        if self.role == UserRole.PLATFORM_SUPER_ADMIN:
            return True
        return str(self.tenant_id) == str(tenant_id)

    def has_permission(self, permission_name: str) -> bool:
        """Check if user has a specific permission through their roles."""
        # Super admins have all permissions
        if self.role == UserRole.PLATFORM_SUPER_ADMIN:
            return True

        # Check custom role permissions
        for role in self.roles:
            if role.is_active and role.has_permission(permission_name):
                return True

        return False

    def get_all_permissions(self) -> set:
        """Get all permissions for this user."""
        if self.role == UserRole.PLATFORM_SUPER_ADMIN:
            return {"*"}  # All permissions

        permissions = set()
        for role in self.roles:
            if role.is_active:
                for perm in role.permissions:
                    permissions.add(perm.name)

        return permissions
