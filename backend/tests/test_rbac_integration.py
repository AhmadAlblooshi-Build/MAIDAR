"""
Integration tests for RBAC system.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.permission import Permission, Role
from app.models.user import User

client = TestClient(app)


def test_list_permissions(admin_token, db: Session):
    """Test listing all permissions."""
    response = client.get(
        "/api/v1/rbac/permissions",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]
    assert "resource" in data[0]
    assert "action" in data[0]


def test_list_roles(admin_token, db: Session):
    """Test listing all roles."""
    response = client.get(
        "/api/v1/rbac/roles",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3  # System roles


def test_create_custom_role(admin_token, db: Session):
    """Test creating a custom role."""
    # Get some permissions first
    perms_response = client.get(
        "/api/v1/rbac/permissions",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    permissions = perms_response.json()
    perm_ids = [p["id"] for p in permissions[:3]]

    # Create role
    response = client.post(
        "/api/v1/rbac/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Test Role",
            "description": "Test role for integration testing",
            "permission_ids": perm_ids
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Role"
    assert data["is_system_role"] == False
    assert data["permission_count"] == 3


def test_update_role(admin_token, db: Session):
    """Test updating a custom role."""
    # Create role first
    perms_response = client.get(
        "/api/v1/rbac/permissions",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    permissions = perms_response.json()
    perm_ids = [p["id"] for p in permissions[:2]]

    create_response = client.post(
        "/api/v1/rbac/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Updatable Role",
            "description": "Original description",
            "permission_ids": perm_ids
        }
    )
    role_id = create_response.json()["id"]

    # Update role
    response = client.put(
        f"/api/v1/rbac/roles/{role_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Updated Role",
            "description": "Updated description"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Role"
    assert data["description"] == "Updated description"


def test_cannot_update_system_role(admin_token, db: Session):
    """Test that system roles cannot be updated."""
    # Get a system role
    roles_response = client.get(
        "/api/v1/rbac/roles",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    roles = roles_response.json()
    system_role = next((r for r in roles if r["is_system_role"]), None)

    if system_role:
        response = client.put(
            f"/api/v1/rbac/roles/{system_role['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Hacked System Role"}
        )
        assert response.status_code == 400


def test_delete_role(admin_token, db: Session):
    """Test deleting a custom role."""
    # Create role first
    create_response = client.post(
        "/api/v1/rbac/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Deletable Role",
            "description": "Will be deleted",
            "permission_ids": []
        }
    )
    role_id = create_response.json()["id"]

    # Delete role
    response = client.delete(
        f"/api/v1/rbac/roles/{role_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 204

    # Verify deleted
    get_response = client.get(
        f"/api/v1/rbac/roles/{role_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert get_response.status_code == 404


def test_permission_check_functionality(admin_token, admin_user, db: Session):
    """Test that permission checking works correctly."""
    from app.core.permissions import check_permission
    from app.models.user import User, UserRole

    # Use the admin_user fixture
    user = admin_user

    # Test that admin has permission
    has_perm = check_permission(user, "employees:read")
    assert has_perm == True  # Admin should have all permissions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
