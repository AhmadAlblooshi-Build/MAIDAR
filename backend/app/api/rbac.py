"""
RBAC Management API - Roles and Permissions
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config.database import get_db
from app.models.user import User, UserRole
from app.models.permission import Permission, Role
from app.core.dependencies import get_current_admin_user, get_current_super_admin
from app.core.permissions import check_permission, get_user_permissions, DEFAULT_PERMISSIONS, DEFAULT_ROLES
from app.core.audit_logger import audit_logger

router = APIRouter(tags=["RBAC Management"])


# Pydantic schemas
class PermissionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    resource: str
    action: str
    is_super_admin_only: bool

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[str]] = None


class RoleResponse(BaseModel):
    id: str
    tenant_id: Optional[str]
    name: str
    description: Optional[str]
    is_system_role: bool
    is_active: bool
    permission_count: int
    user_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class RoleDetailResponse(RoleResponse):
    permissions: List[PermissionResponse]


class AssignRoleRequest(BaseModel):
    user_ids: List[str]


class UserPermissionsResponse(BaseModel):
    user_id: str
    email: str
    role: str
    permissions: List[str]
    custom_roles: List[RoleResponse]


# Endpoints

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all available permissions."""
    if not check_permission(current_user, "roles:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:read"
        )

    permissions = db.query(Permission).order_by(Permission.resource, Permission.action).all()

    return [
        PermissionResponse(
            id=str(p.id),
            name=p.name,
            description=p.description,
            resource=p.resource,
            action=p.action,
            is_super_admin_only=p.is_super_admin_only
        )
        for p in permissions
    ]


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all roles for the current tenant."""
    if not check_permission(current_user, "roles:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:read"
        )

    # Get system roles and tenant-specific roles
    query = db.query(Role).filter(
        or_(
            Role.is_system_role == True,
            Role.tenant_id == current_user.tenant_id
        )
    ).order_by(Role.is_system_role.desc(), Role.name)

    roles = query.all()

    return [
        RoleResponse(
            id=str(r.id),
            tenant_id=str(r.tenant_id) if r.tenant_id else None,
            name=r.name,
            description=r.description,
            is_system_role=r.is_system_role,
            is_active=r.is_active,
            permission_count=len(r.permissions),
            user_count=len(r.users),
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat()
        )
        for r in roles
    ]


@router.get("/roles/{role_id}", response_model=RoleDetailResponse)
async def get_role(
    role_id: UUID,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a role."""
    if not check_permission(current_user, "roles:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:read"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Check access (can only view system roles or own tenant's roles)
    if not role.is_system_role and role.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return RoleDetailResponse(
        id=str(role.id),
        tenant_id=str(role.tenant_id) if role.tenant_id else None,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        is_active=role.is_active,
        permission_count=len(role.permissions),
        user_count=len(role.users),
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat(),
        permissions=[
            PermissionResponse(
                id=str(p.id),
                name=p.name,
                description=p.description,
                resource=p.resource,
                action=p.action,
                is_super_admin_only=p.is_super_admin_only
            )
            for p in role.permissions
        ]
    )


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new custom role."""
    if not check_permission(current_user, "roles:write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:write"
        )

    # Check if role name already exists for this tenant
    existing = db.query(Role).filter(
        Role.name == role_data.name,
        Role.tenant_id == current_user.tenant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_data.name}' already exists"
        )

    # Create role
    role = Role(
        tenant_id=current_user.tenant_id,
        name=role_data.name,
        description=role_data.description,
        is_system_role=False,
        is_active=True
    )

    # Assign permissions
    if role_data.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_([UUID(pid) for pid in role_data.permission_ids])
        ).all()
        role.permissions = permissions

    db.add(role)
    db.commit()
    db.refresh(role)

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ROLE_CREATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="role",
        resource_id=role.id,
        details={
            "role_name": role.name,
            "permission_count": len(role.permissions)
        },
        status="success"
    )

    return RoleResponse(
        id=str(role.id),
        tenant_id=str(role.tenant_id),
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        is_active=role.is_active,
        permission_count=len(role.permissions),
        user_count=0,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat()
    )


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a custom role."""
    if not check_permission(current_user, "roles:write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:write"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Cannot update system roles
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update system roles"
        )

    # Check access
    if role.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Update fields
    if role_data.name:
        role.name = role_data.name
    if role_data.description is not None:
        role.description = role_data.description
    if role_data.is_active is not None:
        role.is_active = role_data.is_active

    # Update permissions
    if role_data.permission_ids is not None:
        permissions = db.query(Permission).filter(
            Permission.id.in_([UUID(pid) for pid in role_data.permission_ids])
        ).all()
        role.permissions = permissions

    db.commit()
    db.refresh(role)

    # Create audit log
    updated_fields = []
    if role_data.name:
        updated_fields.append("name")
    if role_data.description is not None:
        updated_fields.append("description")
    if role_data.is_active is not None:
        updated_fields.append("is_active")
    if role_data.permission_ids is not None:
        updated_fields.append("permissions")

    audit_logger.log_event(
        db=db,
        action="ROLE_UPDATED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="role",
        resource_id=role.id,
        details={
            "role_name": role.name,
            "updated_fields": updated_fields
        },
        status="success"
    )

    return RoleResponse(
        id=str(role.id),
        tenant_id=str(role.tenant_id),
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        is_active=role.is_active,
        permission_count=len(role.permissions),
        user_count=len(role.users),
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat()
    )


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a custom role."""
    if not check_permission(current_user, "roles:delete"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:delete"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Cannot delete system roles
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )

    # Check access
    if role.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Check if role is assigned to users
    if len(role.users) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role: assigned to {len(role.users)} user(s)"
        )

    role_name = role.name
    role_uuid = role.id
    db.delete(role)
    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ROLE_DELETED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="role",
        resource_id=role_uuid,
        details={
            "role_name": role_name
        },
        status="success"
    )

    return None


@router.post("/roles/{role_id}/assign", response_model=dict)
async def assign_role(
    role_id: UUID,
    request: AssignRoleRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Assign a role to users."""
    if not check_permission(current_user, "roles:assign"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:assign"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Check access
    if not role.is_system_role and role.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Get users
    users = db.query(User).filter(
        User.id.in_([UUID(uid) for uid in request.user_ids]),
        User.tenant_id == current_user.tenant_id
    ).all()

    if len(users) != len(request.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some users not found or not in your tenant"
        )

    # Assign role
    assigned_count = 0
    for user in users:
        if role not in user.roles:
            user.roles.append(role)
            assigned_count += 1

    db.commit()

    # Create audit log
    audit_logger.log_event(
        db=db,
        action="ROLE_ASSIGNED",
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        resource_type="role",
        resource_id=role.id,
        details={
            "role_name": role.name,
            "assigned_count": assigned_count,
            "user_ids": request.user_ids
        },
        status="success"
    )

    return {
        "message": f"Role '{role.name}' assigned to {assigned_count} user(s)",
        "assigned_count": assigned_count
    }


@router.delete("/roles/{role_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_role(
    role_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Unassign a role from a user."""
    if not check_permission(current_user, "roles:assign"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:assign"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if role in user.roles:
        user.roles.remove(role)
        db.commit()

        # Create audit log
        audit_logger.log_event(
            db=db,
            action="ROLE_UNASSIGNED",
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            resource_type="role",
            resource_id=role.id,
            details={
                "role_name": role.name,
                "unassigned_user_id": str(user_id),
                "unassigned_user_email": user.email
            },
            status="success"
        )

    return None


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions_endpoint(
    user_id: UUID,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all permissions for a specific user."""
    if not check_permission(current_user, "roles:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: roles:read"
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    permissions = get_user_permissions(user, db)

    return UserPermissionsResponse(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        permissions=permissions,
        custom_roles=[
            RoleResponse(
                id=str(r.id),
                tenant_id=str(r.tenant_id) if r.tenant_id else None,
                name=r.name,
                description=r.description,
                is_system_role=r.is_system_role,
                is_active=r.is_active,
                permission_count=len(r.permissions),
                user_count=len(r.users),
                created_at=r.created_at.isoformat(),
                updated_at=r.updated_at.isoformat()
            )
            for r in user.roles if r.is_active
        ]
    )

@router.post("/seed", response_model=dict)
async def seed_rbac_data(
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """
    Seed default RBAC permissions and roles into the database.

    Super Admin only endpoint.
    This should be called once when setting up the platform or when
    adding new permissions/roles.
    """
    created_permissions = 0
    updated_permissions = 0
    created_roles = 0
    updated_roles = 0

    try:
        # Seed permissions
        for perm_data in DEFAULT_PERMISSIONS:
            existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()

            if existing:
                # Update existing permission
                existing.description = perm_data.get("description")
                existing.resource = perm_data["resource"]
                existing.action = perm_data["action"]
                existing.is_super_admin_only = perm_data.get("is_super_admin_only", False)
                updated_permissions += 1
            else:
                # Create new permission
                permission = Permission(
                    name=perm_data["name"],
                    description=perm_data.get("description"),
                    resource=perm_data["resource"],
                    action=perm_data["action"],
                    is_super_admin_only=perm_data.get("is_super_admin_only", False)
                )
                db.add(permission)
                created_permissions += 1

        db.commit()

        # Seed system roles
        for role_data in DEFAULT_ROLES:
            existing = db.query(Role).filter(
                Role.name == role_data["name"],
                Role.is_system_role == True
            ).first()

            if existing:
                # Update existing role
                existing.description = role_data.get("description")
                updated_roles += 1
            else:
                # Create new role
                role = Role(
                    name=role_data["name"],
                    description=role_data.get("description"),
                    is_system_role=True,
                    is_active=True,
                    tenant_id=None  # System roles are not tenant-specific
                )
                db.add(role)
                db.flush()  # Get the role ID
                created_roles += 1
                existing = role

            # Assign permissions to role
            permission_names = role_data.get("permissions", [])
            permissions = db.query(Permission).filter(
                Permission.name.in_(permission_names)
            ).all()
            existing.permissions = permissions

        db.commit()

        # Create audit log
        audit_logger.log_event(
            db=db,
            action="RBAC_DATA_SEEDED",
            user_id=current_user.id,
            tenant_id=None,
            resource_type="system",
            resource_id=None,
            details={
                "permissions_created": created_permissions,
                "permissions_updated": updated_permissions,
                "roles_created": created_roles,
                "roles_updated": updated_roles
            },
            status="success"
        )

        return {
            "success": True,
            "message": "RBAC data seeded successfully",
            "permissions": {
                "created": created_permissions,
                "updated": updated_permissions,
                "total": created_permissions + updated_permissions
            },
            "roles": {
                "created": created_roles,
                "updated": updated_roles,
                "total": created_roles + updated_roles
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed RBAC data: {str(e)}"
        )
