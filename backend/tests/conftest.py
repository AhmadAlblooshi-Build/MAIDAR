"""
Pytest configuration and fixtures for integration tests.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.main import app
from app.config.database import get_db, SessionLocal
from app.models.user import User
from app.models.tenant import Tenant
from app.models.permission import Permission, Role
from app.core.security import get_password_hash
from app.core.permissions import DEFAULT_PERMISSIONS, DEFAULT_ROLES

# Use the actual test database connection
# The tests will use the existing database but clean up after each test


@pytest.fixture(scope="session")
def seed_rbac_data():
    """Seed RBAC permissions and roles once per test session."""
    db = SessionLocal()
    try:
        # Seed permissions
        for perm_data in DEFAULT_PERMISSIONS:
            existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
            if not existing:
                permission = Permission(
                    name=perm_data["name"],
                    description=perm_data.get("description"),
                    resource=perm_data["resource"],
                    action=perm_data["action"],
                    is_super_admin_only=perm_data.get("is_super_admin_only", False)
                )
                db.add(permission)

        # Seed roles
        for role_data in DEFAULT_ROLES:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                role = Role(
                    name=role_data["name"],
                    description=role_data.get("description"),
                    is_system_role=role_data.get("is_system_role", False),
                    is_active=True
                )
                db.add(role)
                db.flush()

                # Add permissions to role
                for perm_name in role_data.get("permissions", []):
                    permission = db.query(Permission).filter(Permission.name == perm_name).first()
                    if permission:
                        role.permissions.append(permission)

        db.commit()
    except Exception as e:
        print(f"Error seeding RBAC data: {e}")
        db.rollback()
    finally:
        db.close()


@pytest.fixture(scope="function")
def db(seed_rbac_data):
    """Create a database session for testing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client():
    """Create a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def test_tenant(db: Session):
    """Create a unique test tenant for each test."""
    # Use UUID to ensure uniqueness
    unique_id = str(uuid.uuid4())[:8]
    tenant = Tenant(
        name=f"Test Organization {unique_id}",
        domain=f"test-{unique_id}.maidar.com",
        subdomain=f"test-{unique_id}",
        is_active=True
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    yield tenant

    # Cleanup: Delete the tenant (cascade will handle related records)
    db.delete(tenant)
    db.commit()


@pytest.fixture(scope="function")
def admin_user(db: Session, test_tenant: Tenant):
    """Create a super admin user for testing."""
    unique_id = str(uuid.uuid4())[:8]
    admin = User(
        email=f"admin-{unique_id}@test.com",
        password_hash=get_password_hash("TestAdmin123!"),
        full_name="Test Admin",
        role="PLATFORM_SUPER_ADMIN",
        tenant_id=test_tenant.id,
        is_active=True,
        email_verified=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # Store email for login
    admin._test_email = admin.email

    yield admin

    # Cleanup handled by tenant cascade delete


@pytest.fixture(scope="function")
def admin_token(client: TestClient, admin_user: User):
    """Get an admin authentication token."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": admin_user._test_email,
            "password": "TestAdmin123!"
        }
    )

    assert response.status_code == 200
    data = response.json()
    return data["access_token"]
