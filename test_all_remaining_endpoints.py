"""
Comprehensive test for ALL remaining untested endpoints
Tests scenarios, simulations, analytics, RBAC, settings, notifications, audit logs
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
        self.category = ""

    def set_category(self, category):
        self.category = category
        print(f"\n{'='*80}")
        print(f"TESTING: {category}")
        print('='*80)

    def log_pass(self, test_name):
        self.passed += 1
        print(f"[PASS] {test_name}")

    def log_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"[{self.category}] {test_name}: {error}")
        print(f"[FAIL] {test_name} - {error}")

    def summary(self):
        print("\n" + "="*80)
        print(f"COMPREHENSIVE TEST SUMMARY")
        print("="*80)
        print(f"Total Passed: {self.passed}")
        print(f"Total Failed: {self.failed}")
        if self.errors:
            print(f"\nFailed Tests ({len(self.errors)}):")
            for error in self.errors:
                print(f"  - {error}")
        print("="*80)
        return self.failed == 0

def get_auth_token():
    """Get authentication token"""
    timestamp = datetime.now().timestamp()
    email = f"test_all_{timestamp}@example.com"
    password = "SecurePassword123!"
    org_name = f"Test Org {timestamp}"

    # Register
    response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User",
            "role": "tenant_admin",
            "organization_name": org_name
        }
    )
    if response.status_code != 201:
        raise Exception(f"Registration failed: {response.text}")

    # Login
    response = requests.post(
        f"{AUTH_URL}/login",
        json={"email": email, "password": password}
    )
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.text}")

    return response.json()["access_token"]

def test_scenario_endpoints(headers, results):
    """Test all scenario endpoints"""
    results.set_category("SCENARIO ENDPOINTS")
    scenario_id = None

    # Test 1: Create scenario
    print("\n[Test 1] POST /scenarios - Create scenario")
    try:
        response = requests.post(
            f"{BASE_URL}/scenarios",
            headers=headers,
            json={
                "name": "Test Phishing Scenario",
                "description": "Test scenario for validation",
                "category": "credentials",
                "difficulty": "medium",
                "language": "en",
                "email_subject": "Password Reset Required",
                "email_body_html": "<p>Click here to reset</p>",
                "email_body_text": "Click here to reset",
                "sender_name": "IT Support",
                "sender_email": "it@company.com",
                "has_link": True,
                "has_attachment": False,
                "has_credential_form": True
            }
        )
        if response.status_code in [200, 201]:
            data = response.json()
            if "id" in data:
                scenario_id = data["id"]
                results.log_pass("Create scenario - successful")
            else:
                results.log_fail("Create scenario", f"No ID in response: {data}")
        else:
            results.log_fail("Create scenario", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Create scenario", str(e))

    # Test 2: Get scenario by ID
    if scenario_id:
        print("\n[Test 2] GET /scenarios/{id} - Get scenario")
        try:
            response = requests.get(f"{BASE_URL}/scenarios/{scenario_id}", headers=headers)
            if response.status_code == 200:
                results.log_pass("Get scenario - successful")
            else:
                results.log_fail("Get scenario", f"Status {response.status_code}")
        except Exception as e:
            results.log_fail("Get scenario", str(e))

    # Test 3: Update scenario
    if scenario_id:
        print("\n[Test 3] PUT /scenarios/{id} - Update scenario")
        try:
            response = requests.put(
                f"{BASE_URL}/scenarios/{scenario_id}",
                headers=headers,
                json={"name": "Updated Scenario Name"}
            )
            if response.status_code == 200:
                results.log_pass("Update scenario - successful")
            else:
                results.log_fail("Update scenario", f"Status {response.status_code}")
        except Exception as e:
            results.log_fail("Update scenario", str(e))

    # Test 4: Search scenarios
    print("\n[Test 4] POST /scenarios/search - Search scenarios")
    try:
        response = requests.post(
            f"{BASE_URL}/scenarios/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            results.log_pass("Search scenarios - successful")
        else:
            results.log_fail("Search scenarios", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Search scenarios", str(e))

    # Test 5: Delete scenario
    if scenario_id:
        print("\n[Test 5] DELETE /scenarios/{id} - Delete scenario")
        try:
            response = requests.delete(f"{BASE_URL}/scenarios/{scenario_id}", headers=headers)
            if response.status_code in [200, 204]:
                results.log_pass("Delete scenario - successful")
            else:
                results.log_fail("Delete scenario", f"Status {response.status_code}")
        except Exception as e:
            results.log_fail("Delete scenario", str(e))

def test_simulation_endpoints(headers, results):
    """Test simulation endpoints"""
    results.set_category("SIMULATION ENDPOINTS")

    # Test 1: Search simulations
    print("\n[Test 1] POST /simulations/search - Search simulations")
    try:
        response = requests.post(
            f"{BASE_URL}/simulations/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            results.log_pass("Search simulations - successful")
        else:
            results.log_fail("Search simulations", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Search simulations", str(e))

def test_analytics_endpoints(headers, results):
    """Test analytics endpoints"""
    results.set_category("ANALYTICS ENDPOINTS")

    # Test 1: Executive summary
    print("\n[Test 1] GET /analytics/executive-summary - Executive summary")
    try:
        response = requests.get(f"{BASE_URL}/analytics/executive-summary", headers=headers)
        if response.status_code == 200:
            results.log_pass("Executive summary - successful")
        else:
            results.log_fail("Executive summary", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Executive summary", str(e))

    # Test 2: Risk distribution
    print("\n[Test 2] GET /analytics/risk-distribution - Risk distribution")
    try:
        response = requests.get(f"{BASE_URL}/analytics/risk-distribution", headers=headers)
        if response.status_code == 200:
            results.log_pass("Risk distribution - successful")
        else:
            results.log_fail("Risk distribution", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Risk distribution", str(e))

    # Test 3: Department comparison
    print("\n[Test 3] GET /analytics/department-comparison - Department comparison")
    try:
        response = requests.get(f"{BASE_URL}/analytics/department-comparison", headers=headers)
        if response.status_code == 200:
            results.log_pass("Department comparison - successful")
        else:
            results.log_fail("Department comparison", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Department comparison", str(e))

def test_rbac_endpoints(headers, results):
    """Test RBAC endpoints"""
    results.set_category("RBAC ENDPOINTS")

    # Test 1: List permissions
    print("\n[Test 1] GET /rbac/permissions - List permissions")
    try:
        response = requests.get(f"{BASE_URL}/rbac/permissions", headers=headers)
        if response.status_code == 200:
            results.log_pass("List permissions - successful")
        else:
            results.log_fail("List permissions", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("List permissions", str(e))

    # Test 2: List roles
    print("\n[Test 2] GET /rbac/roles - List roles")
    try:
        response = requests.get(f"{BASE_URL}/rbac/roles", headers=headers)
        if response.status_code == 200:
            results.log_pass("List roles - successful")
        else:
            results.log_fail("List roles", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("List roles", str(e))

def test_settings_endpoints(headers, results):
    """Test settings endpoints"""
    results.set_category("SETTINGS ENDPOINTS")

    # Test 1: Get branding
    print("\n[Test 1] GET /settings/tenant/branding - Get branding")
    try:
        response = requests.get(f"{BASE_URL}/settings/tenant/branding", headers=headers)
        if response.status_code == 200:
            results.log_pass("Get branding - successful")
        else:
            results.log_fail("Get branding", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Get branding", str(e))

    # Test 2: Update branding
    print("\n[Test 2] PUT /settings/tenant/branding - Update branding")
    try:
        response = requests.put(
            f"{BASE_URL}/settings/tenant/branding",
            headers=headers,
            json={"company_name": "Test Company"}
        )
        if response.status_code == 200:
            results.log_pass("Update branding - successful")
        else:
            results.log_fail("Update branding", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Update branding", str(e))

    # Test 3: Notification preferences
    print("\n[Test 3] GET /settings/notification-preferences - Get preferences")
    try:
        response = requests.get(f"{BASE_URL}/settings/notification-preferences", headers=headers)
        if response.status_code == 200:
            results.log_pass("Get notification preferences - successful")
        else:
            results.log_fail("Get notification preferences", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Get notification preferences", str(e))

def test_notification_endpoints(headers, results):
    """Test notification endpoints"""
    results.set_category("NOTIFICATION ENDPOINTS")

    # Test 1: List notifications
    print("\n[Test 1] GET /notifications - List notifications")
    try:
        response = requests.get(f"{BASE_URL}/notifications", headers=headers)
        if response.status_code == 200:
            results.log_pass("List notifications - successful")
        else:
            results.log_fail("List notifications", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("List notifications", str(e))

def test_audit_log_endpoints(headers, results):
    """Test audit log endpoints"""
    results.set_category("AUDIT LOG ENDPOINTS")

    # Test 1: Search audit logs
    print("\n[Test 1] POST /audit-logs/search - Search audit logs")
    try:
        response = requests.post(
            f"{BASE_URL}/audit-logs/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            results.log_pass("Search audit logs - successful")
        else:
            results.log_fail("Search audit logs", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Search audit logs", str(e))

def test_all_endpoints():
    results = TestResults()

    print("="*80)
    print("COMPREHENSIVE ENDPOINT TESTING - ALL REMAINING ENDPOINTS")
    print("="*80)

    # Get auth token
    print("\n[Setup] Getting authentication token...")
    try:
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        print("[Setup] Authentication successful")
    except Exception as e:
        print(f"[Setup] FAILED: {e}")
        return False

    # Run all tests
    test_scenario_endpoints(headers, results)
    test_simulation_endpoints(headers, results)
    test_analytics_endpoints(headers, results)
    test_rbac_endpoints(headers, results)
    test_settings_endpoints(headers, results)
    test_notification_endpoints(headers, results)
    test_audit_log_endpoints(headers, results)

    return results.summary()

if __name__ == "__main__":
    print(f"\nComprehensive Endpoint Testing")
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now()}\n")

    try:
        success = test_all_endpoints()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\nCritical error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
