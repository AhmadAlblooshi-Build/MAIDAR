"""
Permission checking utilities and decorators for RBAC.
"""

from functools import wraps
from typing import List, Union

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user


def require_permissions(*permission_names: str):
    """
    Decorator to require specific permissions for an endpoint.

    Usage:
        @router.get("/employees")
        @require_permissions("employees:read")
        async def list_employees(current_user: User = Depends(get_current_user)):
            ...

    Multiple permissions (OR logic):
        @require_permissions("employees:read", "employees:write")

    Args:
        *permission_names: One or more permission names (user needs at least one)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            # Super admins bypass permission checks
            if current_user.role == UserRole.PLATFORM_SUPER_ADMIN:
                return await func(*args, **kwargs)

            # Check if user has at least one of the required permissions
            has_permission = any(
                current_user.has_permission(perm) for perm in permission_names
            )

            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission(s): {', '.join(permission_names)}"
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def check_permission(user: User, permission_name: str) -> bool:
    """
    Check if a user has a specific permission.

    Args:
        user: User object
        permission_name: Permission name (e.g., "employees:read")

    Returns:
        True if user has the permission, False otherwise
    """
    if user.role == UserRole.PLATFORM_SUPER_ADMIN:
        return True

    return user.has_permission(permission_name)


def get_user_permissions(user: User, db: Session) -> List[str]:
    """
    Get all permissions for a user.

    Args:
        user: User object
        db: Database session

    Returns:
        List of permission names
    """
    if user.role == UserRole.PLATFORM_SUPER_ADMIN:
        # Return all available permissions
        from app.models.permission import Permission
        all_perms = db.query(Permission).all()
        return [p.name for p in all_perms]

    return list(user.get_all_permissions())


# Default permission definitions
DEFAULT_PERMISSIONS = [
    # Employee management
    {"name": "employees:read", "resource": "employees", "action": "read", "description": "View employees"},
    {"name": "employees:write", "resource": "employees", "action": "write", "description": "Create and edit employees"},
    {"name": "employees:delete", "resource": "employees", "action": "delete", "description": "Delete employees"},
    {"name": "employees:upload", "resource": "employees", "action": "upload", "description": "Upload employee CSV files"},

    # Scenario management
    {"name": "scenarios:read", "resource": "scenarios", "action": "read", "description": "View phishing scenarios"},
    {"name": "scenarios:write", "resource": "scenarios", "action": "write", "description": "Create and edit scenarios"},
    {"name": "scenarios:delete", "resource": "scenarios", "action": "delete", "description": "Delete scenarios"},
    {"name": "scenarios:ai_generate", "resource": "scenarios", "action": "ai_generate", "description": "Generate AI scenarios"},

    # Simulation management
    {"name": "simulations:read", "resource": "simulations", "action": "read", "description": "View simulations"},
    {"name": "simulations:write", "resource": "simulations", "action": "write", "description": "Create and edit simulations"},
    {"name": "simulations:delete", "resource": "simulations", "action": "delete", "description": "Delete simulations"},
    {"name": "simulations:launch", "resource": "simulations", "action": "launch", "description": "Launch simulations"},

    # Analytics and reporting
    {"name": "analytics:view", "resource": "analytics", "action": "view", "description": "View analytics dashboards"},
    {"name": "analytics:export", "resource": "analytics", "action": "export", "description": "Export analytics reports"},

    # Risk score management
    {"name": "risk_scores:read", "resource": "risk_scores", "action": "read", "description": "View risk scores"},
    {"name": "risk_scores:recalculate", "resource": "risk_scores", "action": "recalculate", "description": "Recalculate risk scores"},

    # RBAC management (admin only)
    {"name": "roles:read", "resource": "roles", "action": "read", "description": "View roles"},
    {"name": "roles:write", "resource": "roles", "action": "write", "description": "Create and edit roles"},
    {"name": "roles:delete", "resource": "roles", "action": "delete", "description": "Delete roles"},
    {"name": "roles:assign", "resource": "roles", "action": "assign", "description": "Assign roles to users"},

    # Tenant management (super admin only)
    {"name": "tenants:read", "resource": "tenants", "action": "read", "description": "View tenants", "is_super_admin_only": True},
    {"name": "tenants:write", "resource": "tenants", "action": "write", "description": "Create and edit tenants", "is_super_admin_only": True},
    {"name": "tenants:delete", "resource": "tenants", "action": "delete", "description": "Delete tenants", "is_super_admin_only": True},
    {"name": "tenants:suspend", "resource": "tenants", "action": "suspend", "description": "Suspend tenants", "is_super_admin_only": True},

    # Audit logs (super admin and tenant admin)
    {"name": "audit_logs:read", "resource": "audit_logs", "action": "read", "description": "View audit logs"},
]

# Default role definitions
DEFAULT_ROLES = [
    {
        "name": "Security Analyst",
        "description": "Read-only access to analytics and reports",
        "is_system_role": True,
        "permissions": [
            "employees:read",
            "scenarios:read",
            "simulations:read",
            "analytics:view",
            "risk_scores:read",
        ]
    },
    {
        "name": "Security Manager",
        "description": "Full access to employees, scenarios, and simulations",
        "is_system_role": True,
        "permissions": [
            "employees:read", "employees:write", "employees:upload",
            "scenarios:read", "scenarios:write", "scenarios:ai_generate",
            "simulations:read", "simulations:write", "simulations:launch",
            "analytics:view", "analytics:export",
            "risk_scores:read", "risk_scores:recalculate",
        ]
    },
    {
        "name": "Tenant Admin",
        "description": "Full tenant administrative access",
        "is_system_role": True,
        "permissions": [
            "employees:read", "employees:write", "employees:delete", "employees:upload",
            "scenarios:read", "scenarios:write", "scenarios:delete", "scenarios:ai_generate",
            "simulations:read", "simulations:write", "simulations:delete", "simulations:launch",
            "analytics:view", "analytics:export",
            "risk_scores:read", "risk_scores:recalculate",
            "roles:read", "roles:write", "roles:delete", "roles:assign",
            "audit_logs:read",
        ]
    },
]
