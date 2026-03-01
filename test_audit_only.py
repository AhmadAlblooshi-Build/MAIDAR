"""
Test audit logs only - separate from other tests to avoid rate limiting
"""

import requests
from datetime import datetime

BASE_URL = "http://localhost:8001/api/v1"
AUTH_URL = f"{BASE_URL}/auth"

def get_super_admin_token():
    """Get super admin token"""
    email = "test_superadmin@platform.com"
    password = "TestSuperAdmin123!"

    response = requests.post(
        f"{AUTH_URL}/login",
        json={"email": email, "password": password}
    )

    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Failed to get super admin token: {response.text}")

def test_audit_logs():
    print("="*80)
    print("TESTING AUDIT LOG ENDPOINTS")
    print("="*80)

    # Get super admin token
    print("\n[Setup] Getting super admin token...")
    try:
        token = get_super_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        print("[Setup] Super admin authentication successful")
    except Exception as e:
        print(f"[Setup] Could not get super admin token: {e}")
        return False

    # Test: Search audit logs
    print("\n[Test] POST /audit-logs/search - Search audit logs")
    try:
        response = requests.post(
            f"{BASE_URL}/audit-logs/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"[PASS] Search audit logs - returned {data.get('total', 0)} total logs")
            return True
        else:
            print(f"[FAIL] Search audit logs - Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Search audit logs - {str(e)}")
        return False

if __name__ == "__main__":
    print(f"\nAudit Log Endpoint Testing")
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now()}\n")

    success = test_audit_logs()
    exit(0 if success else 1)
