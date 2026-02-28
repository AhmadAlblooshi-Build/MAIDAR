"""
CLI script to seed RBAC permissions and roles into the database.

Usage:
    python -m app.cli.seed_rbac
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.models.permission import Permission, Role
from app.core.permissions import DEFAULT_PERMISSIONS, DEFAULT_ROLES


def seed_permissions(db: Session):
    """Seed default permissions into database."""
    print("Seeding permissions...")

    created_count = 0
    updated_count = 0

    for perm_data in DEFAULT_PERMISSIONS:
        # Check if permission exists
        existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()

        if existing:
            # Update existing permission
            existing.description = perm_data.get("description")
            existing.resource = perm_data["resource"]
            existing.action = perm_data["action"]
            existing.is_super_admin_only = perm_data.get("is_super_admin_only", False)
            updated_count += 1
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
            created_count += 1

    db.commit()
    print(f"✓ Permissions: {created_count} created, {updated_count} updated")


def seed_roles(db: Session):
    """Seed default system roles into database."""
    print("Seeding system roles...")

    created_count = 0
    updated_count = 0

    for role_data in DEFAULT_ROLES:
        # Check if role exists
        existing = db.query(Role).filter(
            Role.name == role_data["name"],
            Role.is_system_role == True
        ).first()

        if existing:
            # Update existing role
            existing.description = role_data.get("description")
            updated_count += 1
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
            created_count += 1
            existing = role

        # Assign permissions to role
        permission_names = role_data.get("permissions", [])
        permissions = db.query(Permission).filter(
            Permission.name.in_(permission_names)
        ).all()
        existing.permissions = permissions

    db.commit()
    print(f"✓ System roles: {created_count} created, {updated_count} updated")


def main():
    """Main entry point."""
    print("\n" + "=" * 60)
    print("MAIDAR RBAC Seeding Script")
    print("=" * 60 + "\n")

    db = SessionLocal()

    try:
        seed_permissions(db)
        seed_roles(db)

        print("\n" + "=" * 60)
        print("✓ RBAC seeding completed successfully!")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"\n✗ Error seeding RBAC data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
