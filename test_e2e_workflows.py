"""
End-to-End Workflow Testing
Tests complete user journeys from registration to analytics
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
        self.workflow = ""

    def set_workflow(self, workflow):
        self.workflow = workflow
        print(f"\n{'='*80}")
        print(f"E2E WORKFLOW: {workflow}")
        print('='*80)

    def log_pass(self, test_name):
        self.passed += 1
        print(f"[PASS] {test_name}")

    def log_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"[{self.workflow}] {test_name}: {error}")
        print(f"[FAIL] {test_name} - {error}")

    def summary(self):
        print("\n" + "="*80)
        print(f"E2E WORKFLOW TEST SUMMARY")
        print("="*80)
        print(f"Total Passed: {self.passed}")
        print(f"Total Failed: {self.failed}")
        if self.errors:
            print(f"\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")
        print("="*80)
        return self.failed == 0

def test_registration_to_dashboard_workflow(results):
    """Test: User Registration -> Login -> Dashboard Access"""
    results.set_workflow("User Registration -> Login -> Dashboard")

    timestamp = datetime.now().timestamp()
    email = f"e2e_user_{timestamp}@example.com"
    password = "SecurePassword123!"
    org_name = f"E2E Test Org {timestamp}"

    # Step 1: Register new account
    print("\n[Step 1] Register new tenant admin account")
    try:
        response = requests.post(
            f"{AUTH_URL}/register",
            json={
                "email": email,
                "password": password,
                "full_name": "E2E Test User",
                "role": "tenant_admin",
                "organization_name": org_name
            }
        )
        if response.status_code == 201:
            results.log_pass("User registration successful")
            user_data = response.json()
            user_id = user_data["id"]
        else:
            results.log_fail("User registration", f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.log_fail("User registration", str(e))
        return None

    # Step 2: Login with new account
    print("\n[Step 2] Login with new account")
    try:
        response = requests.post(
            f"{AUTH_URL}/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            results.log_pass("Login successful")
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
        else:
            results.log_fail("Login", f"Status {response.status_code}")
            return None
    except Exception as e:
        results.log_fail("Login", str(e))
        return None

    # Step 3: Access user profile
    print("\n[Step 3] Access user profile (dashboard data)")
    try:
        response = requests.get(f"{AUTH_URL}/me", headers=headers)
        if response.status_code == 200:
            profile = response.json()
            if profile["email"] == email and profile["role"] == "TENANT_ADMIN":
                results.log_pass("User profile accessible with correct data")
            else:
                results.log_fail("User profile", "Data mismatch")
        else:
            results.log_fail("User profile", f"Status {response.status_code}")
            return None
    except Exception as e:
        results.log_fail("User profile", str(e))
        return None

    return headers

def test_employee_management_workflow(results, headers):
    """Test: Create Employee -> Update -> Search -> Delete"""
    if not headers:
        print("\n[SKIP] Employee workflow - no auth headers")
        return

    results.set_workflow("Employee Management: Create -> Update -> Search -> Delete")

    employee_id = None

    # Step 1: Create employee
    print("\n[Step 1] Create new employee")
    try:
        response = requests.post(
            f"{BASE_URL}/employees",
            headers=headers,
            json={
                "employee_id": f"EMP{int(datetime.now().timestamp())}",
                "email": f"employee_{datetime.now().timestamp()}@company.com",
                "full_name": "John Doe",
                "age_range": "25_34",
                "technical_literacy": 7,
                "seniority": "mid",
                "department": "Engineering",
                "job_title": "Software Engineer",
                "languages": ["en"]
            }
        )
        if response.status_code in [200, 201]:
            results.log_pass("Employee created successfully")
            employee_data = response.json()
            employee_id = employee_data["id"]
        else:
            results.log_fail("Employee creation", f"Status {response.status_code}: {response.text}")
            return
    except Exception as e:
        results.log_fail("Employee creation", str(e))
        return

    # Step 2: Get employee details
    print("\n[Step 2] Get employee details")
    try:
        response = requests.get(f"{BASE_URL}/employees/{employee_id}", headers=headers)
        if response.status_code == 200:
            employee = response.json()
            if employee["full_name"] == "John Doe":
                results.log_pass("Employee details retrieved correctly")
            else:
                results.log_fail("Employee details", "Data mismatch")
        else:
            results.log_fail("Employee details", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Employee details", str(e))

    # Step 3: Update employee
    print("\n[Step 3] Update employee")
    try:
        response = requests.put(
            f"{BASE_URL}/employees/{employee_id}",
            headers=headers,
            json={"department": "Product"}
        )
        if response.status_code == 200:
            updated = response.json()
            if updated["department"] == "Product":
                results.log_pass("Employee updated successfully")
            else:
                results.log_fail("Employee update", "Update not applied")
        else:
            results.log_fail("Employee update", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Employee update", str(e))

    # Step 4: Search employees
    print("\n[Step 4] Search employees")
    try:
        response = requests.post(
            f"{BASE_URL}/employees/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            search_results = response.json()
            if search_results["total"] > 0:
                results.log_pass("Employee search successful")
            else:
                results.log_fail("Employee search", "No results found")
        else:
            results.log_fail("Employee search", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Employee search", str(e))

    # Step 5: Delete employee
    print("\n[Step 5] Soft delete employee")
    try:
        response = requests.delete(f"{BASE_URL}/employees/{employee_id}", headers=headers)
        if response.status_code in [200, 204]:
            results.log_pass("Employee deleted successfully")
        else:
            results.log_fail("Employee deletion", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Employee deletion", str(e))

def test_scenario_to_analytics_workflow(results, headers):
    """Test: Create Scenario -> Create Simulation -> View Analytics"""
    if not headers:
        print("\n[SKIP] Scenario workflow - no auth headers")
        return

    results.set_workflow("Scenario -> Simulation -> Analytics Pipeline")

    scenario_id = None

    # Step 1: Create phishing scenario
    print("\n[Step 1] Create phishing scenario")
    try:
        response = requests.post(
            f"{BASE_URL}/scenarios",
            headers=headers,
            json={
                "name": f"E2E Test Scenario {datetime.now().timestamp()}",
                "description": "End-to-end test scenario",
                "category": "credentials",
                "difficulty": "medium",
                "language": "en",
                "email_subject": "Password Reset Required",
                "email_body_html": "<p>Click here to reset your password</p>",
                "email_body_text": "Click here to reset your password",
                "sender_name": "IT Support",
                "sender_email": "support@company.com",
                "has_link": True,
                "has_attachment": False,
                "has_credential_form": True
            }
        )
        if response.status_code in [200, 201]:
            results.log_pass("Scenario created successfully")
            scenario_data = response.json()
            scenario_id = scenario_data["id"]
        else:
            results.log_fail("Scenario creation", f"Status {response.status_code}: {response.text}")
            return
    except Exception as e:
        results.log_fail("Scenario creation", str(e))
        return

    # Step 2: Get scenario details
    print("\n[Step 2] Get scenario details")
    try:
        response = requests.get(f"{BASE_URL}/scenarios/{scenario_id}", headers=headers)
        if response.status_code == 200:
            results.log_pass("Scenario details retrieved")
        else:
            results.log_fail("Scenario details", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Scenario details", str(e))

    # Step 3: Search scenarios
    print("\n[Step 3] Search scenarios")
    try:
        response = requests.post(
            f"{BASE_URL}/scenarios/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            search_results = response.json()
            if search_results["total"] > 0:
                results.log_pass("Scenario search successful")
            else:
                results.log_fail("Scenario search", "No results found")
        else:
            results.log_fail("Scenario search", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Scenario search", str(e))

    # Step 4: Check analytics (should have data from previous tests)
    print("\n[Step 4] View analytics dashboard")
    try:
        response = requests.get(f"{BASE_URL}/analytics/executive-summary", headers=headers)
        if response.status_code == 200:
            analytics = response.json()
            results.log_pass("Analytics dashboard accessible")
        else:
            results.log_fail("Analytics dashboard", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Analytics dashboard", str(e))

    # Step 5: View risk distribution
    print("\n[Step 5] View risk distribution")
    try:
        response = requests.get(f"{BASE_URL}/analytics/risk-distribution", headers=headers)
        if response.status_code == 200:
            results.log_pass("Risk distribution accessible")
        else:
            results.log_fail("Risk distribution", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Risk distribution", str(e))

    # Step 6: Delete scenario
    print("\n[Step 6] Delete scenario")
    try:
        response = requests.delete(f"{BASE_URL}/scenarios/{scenario_id}", headers=headers)
        if response.status_code in [200, 204]:
            results.log_pass("Scenario deleted successfully")
        else:
            results.log_fail("Scenario deletion", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Scenario deletion", str(e))

def test_settings_workflow(results, headers):
    """Test: View Settings -> Update Branding -> Update Preferences"""
    if not headers:
        print("\n[SKIP] Settings workflow - no auth headers")
        return

    results.set_workflow("Settings Configuration Workflow")

    # Step 1: Get current branding
    print("\n[Step 1] Get tenant branding settings")
    try:
        response = requests.get(f"{BASE_URL}/settings/tenant/branding", headers=headers)
        if response.status_code == 200:
            branding = response.json()
            results.log_pass("Branding settings retrieved")
        else:
            results.log_fail("Get branding", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Get branding", str(e))

    # Step 2: Update branding
    print("\n[Step 2] Update tenant branding")
    try:
        response = requests.put(
            f"{BASE_URL}/settings/tenant/branding",
            headers=headers,
            json={"company_name": "Updated E2E Test Company"}
        )
        if response.status_code == 200:
            results.log_pass("Branding updated successfully")
        else:
            results.log_fail("Update branding", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Update branding", str(e))

    # Step 3: Get notification preferences
    print("\n[Step 3] Get notification preferences")
    try:
        response = requests.get(f"{BASE_URL}/settings/notification-preferences", headers=headers)
        if response.status_code == 200:
            results.log_pass("Notification preferences retrieved")
        else:
            results.log_fail("Get preferences", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Get preferences", str(e))

    # Step 4: Update notification preferences
    print("\n[Step 4] Update notification preferences")
    try:
        response = requests.put(
            f"{BASE_URL}/settings/notification-preferences",
            headers=headers,
            json={
                "email_simulation_complete": True,
                "email_high_risk_detected": True,
                "email_weekly_report": False
            }
        )
        if response.status_code == 200:
            results.log_pass("Notification preferences updated")
        else:
            results.log_fail("Update preferences", f"Status {response.status_code}")
    except Exception as e:
        results.log_fail("Update preferences", str(e))

def test_all_e2e_workflows():
    results = TestResults()

    print("="*80)
    print("END-TO-END WORKFLOW TESTING")
    print("="*80)
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now()}")

    # Workflow 1: Registration to Dashboard
    headers = test_registration_to_dashboard_workflow(results)

    # Workflow 2: Employee Management
    test_employee_management_workflow(results, headers)

    # Workflow 3: Scenario to Analytics
    test_scenario_to_analytics_workflow(results, headers)

    # Workflow 4: Settings Configuration
    test_settings_workflow(results, headers)

    return results.summary()

if __name__ == "__main__":
    try:
        success = test_all_e2e_workflows()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\nCritical error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
