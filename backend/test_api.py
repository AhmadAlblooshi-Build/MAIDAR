"""Test the new Super Admin API endpoints."""

import requests
import json

BASE_URL = "http://localhost:8002/api/v1"

def login():
    """Login and get access token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@platform.com", "password": "admin123"}
    )
    print(f"\n1. LOGIN")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"User: {data['user']['email']} ({data['user']['role']})")
        return data['access_token']
    else:
        print(f"Error: {response.text}")
        return None

def test_tenants_search(token):
    """Test tenants search endpoint."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/tenants/search",
        json={"page": 1, "page_size": 10},
        headers=headers
    )
    print(f"\n2. TENANTS SEARCH")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_create_tenant(token):
    """Test create tenant endpoint."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/tenants/",
        json={
            "name": "Test Corporation",
            "domain": "test.com",
            "subdomain": "test",
            "license_tier": "Professional",
            "seats_total": 500,
            "admin_name": "Test Admin",
            "admin_email": "admin@test.com"
        },
        headers=headers
    )
    print(f"\n3. CREATE TENANT")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json() if response.status_code == 201 else None

def test_admin_users_search(token):
    """Test admin users search endpoint."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/admin-users/search",
        json={"page": 1, "page_size": 10},
        headers=headers
    )
    print(f"\n4. ADMIN USERS SEARCH")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_audit_logs_search(token):
    """Test audit logs search endpoint."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/audit-logs/search",
        json={"page": 1, "page_size": 10},
        headers=headers
    )
    print(f"\n5. AUDIT LOGS SEARCH")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING SUPER ADMIN API ENDPOINTS")
    print("=" * 60)

    # Login
    token = login()
    if not token:
        print("\n[ERROR] Login failed!")
        exit(1)

    # Test endpoints
    test_tenants_search(token)
    test_create_tenant(token)
    test_admin_users_search(token)
    test_audit_logs_search(token)

    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
