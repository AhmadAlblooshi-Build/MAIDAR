"""Create super admin user on Railway startup if it doesn't exist."""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Add app to path
sys.path.insert(0, '/app')

from app.models.user import User
from app.models.tenant import Tenant
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_if_not_exists():
    """Create super admin user if it doesn't exist."""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set, skipping admin creation")
        return

    # Convert to psycopg format if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Check if any super admin exists
        existing_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()

        if existing_admin:
            print(f"✓ Super admin already exists: {existing_admin.email}")
            return

        # Create default tenant
        tenant = db.query(Tenant).filter(Tenant.subdomain == "admin").first()
        if not tenant:
            tenant = Tenant(
                name="Admin Organization",
                subdomain="admin",
                is_active=True
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"✓ Created admin tenant: {tenant.name}")

        # Create super admin user
        admin_user = User(
            email="admin@maidar.io",
            full_name="Super Administrator",
            hashed_password=pwd_context.hash("Welldone1@"),
            role="SUPER_ADMIN",
            is_active=True,
            tenant_id=tenant.id
        )

        db.add(admin_user)
        db.commit()
        print(f"✓ Created super admin user: {admin_user.email}")
        print(f"  Email: admin@maidar.io")
        print(f"  Password: Welldone1@")

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_if_not_exists()
