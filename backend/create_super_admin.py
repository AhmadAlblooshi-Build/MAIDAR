"""Create a super admin user for testing."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_super_admin():
    """Create a platform super admin user."""
    db = SessionLocal()

    try:
        # Check if super admin already exists
        existing = db.query(User).filter(
            User.email == "admin@platform.com"
        ).first()

        if existing:
            print(f"[INFO] Super admin already exists: {existing.email}")
            print(f"       Role: {existing.role}")
            return True

        # Create super admin user
        super_admin = User(
            email="admin@platform.com",
            password_hash=get_password_hash("admin123"),
            full_name="Platform Super Admin",
            role=UserRole.PLATFORM_SUPER_ADMIN,
            is_active=True,
            email_verified=True,
            tenant_id=None  # Super admin has no tenant
        )

        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)

        print(f"[SUCCESS] Super admin created!")
        print(f"          Email: admin@platform.com")
        print(f"          Password: admin123")
        print(f"          Role: {super_admin.role}")
        print(f"          ID: {super_admin.id}")

        return True

    except Exception as e:
        print(f"[ERROR] Failed to create super admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_super_admin()
    sys.exit(0 if success else 1)
