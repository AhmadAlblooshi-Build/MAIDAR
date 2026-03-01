"""
Comprehensive Authentication Endpoints Testing
Tests all auth endpoints with various scenarios
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8001/api/v1"
AUTH_URL = f"{BASE_URL}/auth"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def log_pass(self, test_name):
        self.passed += 1
        print(f"[PASS] {test_name}")

    def log_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"[FAIL] {test_name} - {error}")

    def summary(self):
        print("\n" + "="*80)
        print(f"AUTHENTICATION ENDPOINTS TEST SUMMARY")
        print("="*80)
        print(f"Total Passed: {self.passed}")
        print(f"Total Failed: {self.failed}")
        if self.errors:
            print("\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")
        print("="*80)
        return self.failed == 0

def test_auth_endpoints():
    results = TestResults()
    # Use fixed timestamp to ensure consistent email across all tests in this run
    timestamp = datetime.now().timestamp()
    test_user_email = f"test_auth_{timestamp}@example.com"
    test_password = "SecurePassword123!"
    access_token = None
    refresh_token = None
    org_name = f"Test Auth Org {timestamp}"

    print("="*80)
    print("TESTING AUTHENTICATION ENDPOINTS")
    print("="*80)

    # Test 1: Register new user (Super Admin with organization)
    print("\n[Test 1] POST /auth/register - Super Admin with organization")
    try:
        response = requests.post(
            f"{AUTH_URL}/register",
            json={
                "email": test_user_email,
                "password": test_password,
                "full_name": "Test Auth User",
                "role": "super_admin",
                "organization_name": org_name
            }
        )
        if response.status_code == 201:
            data = response.json()
            if "id" in data and "email" in data and data["email"] == test_user_email:
                results.log_pass("Register super admin - user created successfully")
            else:
                results.log_fail("Register super admin", f"Invalid user data in response: {data}")
        else:
            results.log_fail("Register super admin", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Register super admin", str(e))

    # Test 2: Register duplicate user (should fail)
    print("\n[Test 2] POST /auth/register - Duplicate email")
    try:
        response = requests.post(
            f"{AUTH_URL}/register",
            json={
                "email": test_user_email,
                "password": test_password,
                "full_name": "Duplicate User",
                "role": "super_admin",
                "organization_name": "Another Test Org"
            }
        )
        if response.status_code == 400:
            results.log_pass("Register duplicate - properly rejected")
        else:
            results.log_fail("Register duplicate", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.log_fail("Register duplicate", str(e))

    # Test 3: Register with weak password
    print("\n[Test 3] POST /auth/register - Weak password")
    try:
        response = requests.post(
            f"{AUTH_URL}/register",
            json={
                "email": f"weak_{datetime.now().timestamp()}@example.com",
                "password": "123",
                "full_name": "Weak Password User",
                "role": "super_admin"
            }
        )
        if response.status_code == 422:
            results.log_pass("Register weak password - validation rejected")
        else:
            results.log_fail("Register weak password", f"Expected 422, got {response.status_code}")
    except Exception as e:
        results.log_fail("Register weak password", str(e))

    # Test 4: Login with correct credentials
    print("\n[Test 4] POST /auth/login - Valid credentials")
    try:
        response = requests.post(
            f"{AUTH_URL}/login",
            json={
                "email": test_user_email,
                "password": test_password
            }
        )
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                access_token = data["access_token"]
                refresh_token = data.get("refresh_token")
                results.log_pass("Login valid - returns access token")
            else:
                results.log_fail("Login valid", f"Missing access_token: {data}")
        else:
            results.log_fail("Login valid", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Login valid", str(e))

    # Test 5: Login with wrong password
    print("\n[Test 5] POST /auth/login - Wrong password")
    time.sleep(15)  # Wait to avoid rate limiting
    try:
        response = requests.post(
            f"{AUTH_URL}/login",
            json={
                "email": test_user_email,
                "password": "WrongPassword123!"
            }
        )
        if response.status_code == 401:
            results.log_pass("Login wrong password - properly rejected")
        else:
            results.log_fail("Login wrong password", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Login wrong password", str(e))

    # Test 6: Login with non-existent user
    print("\n[Test 6] POST /auth/login - Non-existent user")
    try:
        response = requests.post(
            f"{AUTH_URL}/login",
            json={
                "email": "nonexistent@example.com",
                "password": test_password
            }
        )
        if response.status_code == 401:
            results.log_pass("Login non-existent - properly rejected")
        else:
            results.log_fail("Login non-existent", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Login non-existent", str(e))

    if not access_token:
        print("\n[WARNING] Cannot continue tests - no access token obtained")
        results.summary()
        return False

    # Test 7: Get current user profile
    print("\n[Test 7] GET /auth/me - Get current user")
    try:
        response = requests.get(
            f"{AUTH_URL}/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("email") == test_user_email:
                results.log_pass("Get current user - returns correct profile")
            else:
                results.log_fail("Get current user", f"Wrong email: {data.get('email')}")
        else:
            results.log_fail("Get current user", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Get current user", str(e))

    # Test 8: Get current user without token
    print("\n[Test 8] GET /auth/me - No token")
    try:
        response = requests.get(f"{AUTH_URL}/me")
        if response.status_code == 401:
            results.log_pass("Get user no token - properly rejected")
        else:
            results.log_fail("Get user no token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Get user no token", str(e))

    # Test 9: Get current user with invalid token
    print("\n[Test 9] GET /auth/me - Invalid token")
    try:
        response = requests.get(
            f"{AUTH_URL}/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        if response.status_code == 401:
            results.log_pass("Get user invalid token - properly rejected")
        else:
            results.log_fail("Get user invalid token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Get user invalid token", str(e))

    # Test 10: Update user profile
    print("\n[Test 10] PUT /auth/me - Update profile")
    try:
        response = requests.put(
            f"{AUTH_URL}/me",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "full_name": "Updated Auth User Name"
            }
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("full_name") == "Updated Auth User Name":
                results.log_pass("Update profile - name updated")
            else:
                results.log_fail("Update profile", f"Name not updated: {data.get('full_name')}")
        else:
            results.log_fail("Update profile", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Update profile", str(e))

    # Test 11: Change password
    print("\n[Test 11] POST /auth/change-password - Valid change")
    new_password = "NewSecurePassword123!"
    try:
        response = requests.post(
            f"{AUTH_URL}/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": test_password,
                "new_password": new_password
            }
        )
        if response.status_code == 200:
            results.log_pass("Change password - successful")
            test_password_global = new_password  # Update for future tests
        else:
            results.log_fail("Change password", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Change password", str(e))

    # Test 12: Change password with wrong current password
    print("\n[Test 12] POST /auth/change-password - Wrong current password")
    try:
        response = requests.post(
            f"{AUTH_URL}/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "WrongCurrentPassword!",
                "new_password": "AnotherNewPassword123!"
            }
        )
        if response.status_code == 400 or response.status_code == 401:
            results.log_pass("Change password wrong - properly rejected")
        else:
            results.log_fail("Change password wrong", f"Expected 400/401, got {response.status_code}")
    except Exception as e:
        results.log_fail("Change password wrong", str(e))

    # Test 13: Verify login with new password
    print("\n[Test 13] POST /auth/login - After password change")
    try:
        response = requests.post(
            f"{AUTH_URL}/login",
            json={
                "email": test_user_email,
                "password": new_password
            }
        )
        if response.status_code == 200:
            results.log_pass("Login after password change - successful")
        else:
            results.log_fail("Login after password change", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Login after password change", str(e))

    # Test 14: Refresh token (if endpoint exists)
    if refresh_token:
        print("\n[Test 14] POST /auth/refresh - Refresh access token")
        try:
            response = requests.post(
                f"{AUTH_URL}/refresh",
                json={"refresh_token": refresh_token}
            )
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    results.log_pass("Refresh token - new token issued")
                else:
                    results.log_fail("Refresh token", f"No access_token in response: {data}")
            elif response.status_code == 404:
                print("[INFO] Refresh endpoint not implemented (404)")
            else:
                results.log_fail("Refresh token", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            results.log_fail("Refresh token", str(e))

    # Test 15: Logout
    print("\n[Test 15] POST /auth/logout - Logout user")
    try:
        response = requests.post(
            f"{AUTH_URL}/logout",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code == 200 or response.status_code == 204:
            results.log_pass("Logout - successful")
        elif response.status_code == 404:
            print("[INFO] Logout endpoint not implemented (404)")
        else:
            results.log_fail("Logout", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Logout", str(e))

    return results.summary()

if __name__ == "__main__":
    print("\nAuthentication Endpoints Comprehensive Test Suite")
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now()}\n")

    try:
        success = test_auth_endpoints()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\nCritical error during testing: {e}")
        exit(1)
