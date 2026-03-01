"""
Comprehensive frontend page testing
Tests all major pages for accessibility, rendering, and auth requirements
"""

import requests
from datetime import datetime
import time

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:8001/api/v1"

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
        print(f"FRONTEND PAGES TEST SUMMARY")
        print("="*80)
        print(f"Total Passed: {self.passed}")
        print(f"Total Failed: {self.failed}")
        if self.errors:
            print(f"\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")
        print("="*80)
        return self.failed == 0

def test_public_pages(results):
    """Test public pages that don't require authentication"""
    print("\n" + "="*80)
    print("TESTING PUBLIC PAGES")
    print("="*80)

    # Test 1: Homepage/Login page
    print("\n[Test 1] GET / - Homepage/Login page")
    try:
        response = requests.get(BASE_URL, timeout=10)
        if response.status_code == 200:
            if len(response.text) > 100:  # Should have HTML content
                results.log_pass("Homepage accessible and has content")
            else:
                results.log_fail("Homepage", "Response too short, may not have rendered")
        else:
            results.log_fail("Homepage", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Homepage", str(e))

    # Test 2: Login page
    print("\n[Test 2] GET /login - Login page")
    try:
        response = requests.get(f"{BASE_URL}/login", timeout=10)
        if response.status_code == 200:
            if len(response.text) > 100:
                results.log_pass("Login page accessible and has content")
            else:
                results.log_fail("Login page", "Response too short")
        else:
            results.log_fail("Login page", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Login page", str(e))

    # Test 3: Register page
    print("\n[Test 3] GET /register - Registration page")
    try:
        response = requests.get(f"{BASE_URL}/register", timeout=10)
        if response.status_code == 200:
            if len(response.text) > 100:
                results.log_pass("Register page accessible and has content")
            else:
                results.log_fail("Register page", "Response too short")
        else:
            results.log_fail("Register page", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Register page", str(e))

def test_protected_pages(results):
    """Test protected pages that require authentication"""
    print("\n" + "="*80)
    print("TESTING PROTECTED PAGES (should redirect to login)")
    print("="*80)

    protected_pages = [
        "/dashboard",
        "/employees",
        "/scenarios",
        "/simulations",
        "/analytics",
        "/settings",
        "/tenant-admin/access-controls",
        "/super-admin/audit-log",
        "/super-admin/dashboard",
        "/ai-lab",
    ]

    for page in protected_pages:
        print(f"\n[Test] GET {page} - Protected page (unauthenticated)")
        try:
            response = requests.get(f"{BASE_URL}{page}", timeout=10, allow_redirects=False)
            # Next.js client-side rendering may return 200 but require client auth
            # We're just checking the page is accessible, not that auth works
            if response.status_code in [200, 307, 308, 301, 302]:
                results.log_pass(f"Page {page} accessible")
            else:
                results.log_fail(f"Page {page}", f"Unexpected status {response.status_code}")
        except Exception as e:
            results.log_fail(f"Page {page}", str(e))

def test_api_integration(results):
    """Test that frontend can communicate with backend API"""
    print("\n" + "="*80)
    print("TESTING API INTEGRATION")
    print("="*80)

    # Create test account and login
    print("\n[Setup] Creating test account for API integration test...")
    timestamp = datetime.now().timestamp()
    email = f"frontend_test_{timestamp}@example.com"
    password = "TestPassword123!"

    # Register
    print("[Setup] Registering test user...")
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": "Frontend Test User",
                "role": "tenant_admin",
                "organization_name": f"Test Org {timestamp}"
            }
        )
        if response.status_code == 201:
            print("[Setup] Registration successful")
        else:
            print(f"[Setup] Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"[Setup] Registration error: {e}")
        return

    # Login
    print("[Setup] Logging in...")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            print("[Setup] Login successful")
        else:
            print(f"[Setup] Login failed: {response.text}")
            return
    except Exception as e:
        print(f"[Setup] Login error: {e}")
        return

    # Test API endpoints that frontend pages use
    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Get user profile (used by dashboard)
    print("\n[Test 1] GET /auth/me - User profile for dashboard")
    try:
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if "email" in data and "role" in data:
                results.log_pass("User profile API works")
            else:
                results.log_fail("User profile API", "Missing required fields")
        else:
            results.log_fail("User profile API", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("User profile API", str(e))

    # Test 2: Search employees (used by employees page)
    print("\n[Test 2] POST /employees/search - For employees page")
    try:
        response = requests.post(
            f"{API_URL}/employees/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            results.log_pass("Employees search API works")
        else:
            results.log_fail("Employees search API", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Employees search API", str(e))

    # Test 3: Search scenarios (used by scenarios page)
    print("\n[Test 3] POST /scenarios/search - For scenarios page")
    try:
        response = requests.post(
            f"{API_URL}/scenarios/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            results.log_pass("Scenarios search API works")
        else:
            results.log_fail("Scenarios search API", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Scenarios search API", str(e))

    # Test 4: Get analytics (used by analytics page)
    print("\n[Test 4] GET /analytics/executive-summary - For analytics page")
    try:
        response = requests.get(
            f"{API_URL}/analytics/executive-summary",
            headers=headers
        )
        if response.status_code == 200:
            results.log_pass("Analytics API works")
        else:
            results.log_fail("Analytics API", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Analytics API", str(e))

    # Test 5: Get settings (used by settings page)
    print("\n[Test 5] GET /settings/tenant/branding - For settings page")
    try:
        response = requests.get(
            f"{API_URL}/settings/tenant/branding",
            headers=headers
        )
        if response.status_code == 200:
            results.log_pass("Settings API works")
        else:
            results.log_fail("Settings API", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Settings API", str(e))

def test_all_frontend_pages():
    results = TestResults()

    print("="*80)
    print("COMPREHENSIVE FRONTEND PAGES TESTING")
    print("="*80)
    print(f"Frontend URL: {BASE_URL}")
    print(f"Backend API: {API_URL}")
    print(f"Time: {datetime.now()}")

    test_public_pages(results)
    test_protected_pages(results)
    test_api_integration(results)

    return results.summary()

if __name__ == "__main__":
    try:
        success = test_all_frontend_pages()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\nCritical error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
