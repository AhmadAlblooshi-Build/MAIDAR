"""
Permission and Role models for fine-grained RBAC.
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


# Association tables for many-to-many relationships
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)


class Permission(Base, UUIDMixin, TimestampMixin):
    """
    Granular permissions for RBAC.

    Permissions follow the pattern: resource:action
    Examples:
    - employees:read
    - employees:write
    - employees:delete
    - scenarios:create
    - simulations:launch
    - analytics:view
    - tenants:manage (super admin only)
    """

    __tablename__ = 'permissions'

    # Permission identifier (e.g., "employees:read")
    name = Column(String(100), nullable=False, unique=True, index=True)

    # Human-readable description
    description = Column(Text, nullable=True)

    # Resource category (employees, scenarios, simulations, etc.)
    resource = Column(String(50), nullable=False, index=True)

    # Action (read, write, delete, etc.)
    action = Column(String(50), nullable=False, index=True)

    # Is this a super admin only permission?
    is_super_admin_only = Column(Boolean, default=False, index=True)

    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

    def __repr__(self) -> str:
        return f"<Permission {self.name}>"


class Role(Base, UUIDMixin, TimestampMixin):
    """
    Custom roles with associated permissions.

    Roles can be:
    - System roles (built-in, cannot be deleted)
    - Custom tenant roles (created by tenant admins)
    """

    __tablename__ = 'roles'

    # Tenant isolation (NULL for system-wide roles)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True, index=True)

    # Role name (e.g., "Security Analyst", "HR Manager")
    name = Column(String(100), nullable=False, index=True)

    # Human-readable description
    description = Column(Text, nullable=True)

    # Is this a system role (cannot be deleted)?
    is_system_role = Column(Boolean, default=False, index=True)

    # Is this role active?
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="custom_roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("User", secondary=user_roles, back_populates="roles")

    def __repr__(self) -> str:
        return f"<Role {self.name}>"

    def has_permission(self, permission_name: str) -> bool:
        """Check if this role has a specific permission."""
        return any(p.name == permission_name for p in self.permissions)
