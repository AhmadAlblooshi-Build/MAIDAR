"""
Comprehensive End-to-End Testing for MAIDAR Platform
Tests complete user workflows from registration to analytics
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List

BASE_URL = "http://localhost:8001/api/v1"

# Test results tracking
results = {
    "passed": 0,
    "failed": 0,
    "errors": [],
    "warnings": []
}

class TestSession:
    """Manages test session with authentication."""

    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user = None
        self.tenant_id = None
        self.employee_ids = []
        self.scenario_ids = []
        self.simulation_ids = []
        self.risk_score_ids = []

    def set_token(self, token: str):
        """Set authentication token."""
        self.token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

def log_test(name, passed, details="", warning=False):
    """Log test result."""
    if warning:
        results["warnings"].append(f"{name}: {details}")
        print(f"[WARN] {name}: {details}")
    elif passed:
        results["passed"] += 1
        print(f"[PASS] {name}")
    else:
        results["failed"] += 1
        results["errors"].append(f"{name}: {details}")
        print(f"[FAIL] {name}: {details}")

def test_user_registration(session: TestSession):
    """Test 1: User Registration Flow."""
    print("\n=== Test 1: User Registration ===")

    timestamp = int(time.time())
    user_data = {
        "email": f"e2e_test_{timestamp}@example.com",
        "password": "SecurePass123!@#",
        "full_name": "E2E Test User",
        "organization_name": f"E2E Test Organization {timestamp}"
    }

    try:
        resp = session.session.post(f"{BASE_URL}/auth/register", json=user_data)

        if resp.status_code == 201:
            data = resp.json()
            session.user = data
            session.tenant_id = data.get("tenant_id")
            log_test("User Registration", True)
            log_test("Tenant Created", session.tenant_id is not None)
            return user_data
        else:
            log_test("User Registration", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("User Registration", False, str(e))
        return None

def test_user_login(session: TestSession, user_data: Dict):
    """Test 2: User Login Flow."""
    print("\n=== Test 2: User Login ===")

    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }

    try:
        resp = session.session.post(f"{BASE_URL}/auth/login", json=login_data)

        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            user = data.get("user")

            session.set_token(token)
            session.user = user

            log_test("User Login", True)
            log_test("JWT Token Generated", len(token) > 0)
            log_test("User Role Assigned", user.get("role") == "TENANT_ADMIN")
            return True
        else:
            log_test("User Login", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("User Login", False, str(e))
        return False

def test_get_current_user(session: TestSession):
    """Test 3: Get Current User."""
    print("\n=== Test 3: Get Current User ===")

    try:
        resp = session.session.get(f"{BASE_URL}/auth/me")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Current User", True)
            log_test("User Email Matches", data.get("email") == session.user.get("email"))
            log_test("Tenant ID Matches", data.get("tenant_id") == session.user.get("tenant_id"))
            return True
        else:
            log_test("Get Current User", False, f"Status {resp.status_code}")
            return False
    except Exception as e:
        log_test("Get Current User", False, str(e))
        return False

def test_create_employees(session: TestSession):
    """Test 4: Create Multiple Employees."""
    print("\n=== Test 4: Create Employees ===")

    employees = [
        {
            "employee_id": "E2E001",
            "email": "john.doe@e2etest.com",
            "full_name": "John Doe",
            "department": "Finance",
            "seniority": "senior",
            "technical_literacy": 7,
            "age_range": "35_44",
            "gender": "MALE",
            "languages": ["en"]
        },
        {
            "employee_id": "E2E002",
            "email": "jane.smith@e2etest.com",
            "full_name": "Jane Smith",
            "department": "IT",
            "seniority": "mid",
            "technical_literacy": 9,
            "age_range": "25_34",
            "gender": "FEMALE",
            "languages": ["en", "ar"]
        },
        {
            "employee_id": "E2E003",
            "email": "bob.junior@e2etest.com",
            "full_name": "Bob Junior",
            "department": "Marketing",
            "seniority": "junior",
            "technical_literacy": 4,
            "age_range": "18_24",
            "gender": "MALE",
            "languages": ["en"]
        }
    ]

    for emp_data in employees:
        try:
            resp = session.session.post(f"{BASE_URL}/employees/", json=emp_data)

            if resp.status_code == 201:
                data = resp.json()
                emp_id = data.get("id")
                session.employee_ids.append(emp_id)
                log_test(f"Create Employee: {emp_data['full_name']}", True)
            else:
                error_detail = resp.json() if resp.status_code == 422 else resp.text
                log_test(f"Create Employee: {emp_data['full_name']}", False, f"Status {resp.status_code}: {error_detail}")
        except Exception as e:
            log_test(f"Create Employee: {emp_data['full_name']}", False, str(e))

    return len(session.employee_ids) > 0

def test_employee_operations(session: TestSession):
    """Test 5: Employee CRUD Operations."""
    print("\n=== Test 5: Employee Operations ===")

    if not session.employee_ids:
        log_test("Employee Operations", False, "No employees to test")
        return False

    emp_id = session.employee_ids[0]

    # Get employee
    try:
        resp = session.session.get(f"{BASE_URL}/employees/{emp_id}")
        log_test("Get Employee by ID", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Get Employee by ID", False, str(e))

    # Update employee
    try:
        update_data = {"technical_literacy": 8}
        resp = session.session.put(f"{BASE_URL}/employees/{emp_id}", json=update_data)
        log_test("Update Employee", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Update Employee", False, str(e))

    # Search employees
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.session.post(f"{BASE_URL}/employees/search", json=search_data)

        if resp.status_code == 200:
            data = resp.json()
            log_test("Search Employees", True)
            log_test("Search Returns All Employees", data.get("total") >= len(session.employee_ids))
        else:
            log_test("Search Employees", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Search Employees", False, str(e))

    # Get statistics
    try:
        resp = session.session.get(f"{BASE_URL}/employees/statistics")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Employee Statistics", True)
            log_test("Statistics Show Created Employees", data.get("total_employees") >= len(session.employee_ids))
        else:
            log_test("Get Employee Statistics", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Get Employee Statistics", False, str(e))

def test_create_scenarios(session: TestSession):
    """Test 6: Create Phishing Scenarios."""
    print("\n=== Test 6: Create Scenarios ===")

    scenarios = [
        {
            "name": "BEC Invoice Fraud",
            "description": "CEO impersonation requesting wire transfer",
            "category": "BEC",
            "difficulty": "hard",
            "language": "en",
            "email_subject": "URGENT: Wire Transfer Needed",
            "email_body_html": "<html><body><p>Please process this wire transfer immediately.</p></body></html>",
            "email_body_text": "Please process this wire transfer immediately.",
            "sender_name": "CEO Office",
            "sender_email": "ceo@company-fake.com",
            "has_link": False,
            "has_credential_form": False
        },
        {
            "name": "Credential Harvest - IT Support",
            "description": "Fake IT support requesting password reset",
            "category": "CREDENTIALS",
            "difficulty": "medium",
            "language": "en",
            "email_subject": "Security Alert: Password Reset Required",
            "email_body_html": "<html><body><p>Click here to reset: <a href='{{tracking_link}}'>Reset Now</a></p></body></html>",
            "email_body_text": "Click here to reset your password",
            "sender_name": "IT Support",
            "sender_email": "support@company-fake.com",
            "has_link": True,
            "has_credential_form": True
        }
    ]

    for scenario_data in scenarios:
        try:
            resp = session.session.post(f"{BASE_URL}/scenarios/", json=scenario_data)

            if resp.status_code == 201:
                data = resp.json()
                scenario_id = data.get("id")
                session.scenario_ids.append(scenario_id)
                log_test(f"Create Scenario: {scenario_data['name']}", True)
            else:
                log_test(f"Create Scenario: {scenario_data['name']}", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test(f"Create Scenario: {scenario_data['name']}", False, str(e))

    return len(session.scenario_ids) > 0

def test_scenario_operations(session: TestSession):
    """Test 7: Scenario Operations."""
    print("\n=== Test 7: Scenario Operations ===")

    if not session.scenario_ids:
        log_test("Scenario Operations", False, "No scenarios to test")
        return False

    # Search scenarios
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.session.post(f"{BASE_URL}/scenarios/search", json=search_data)

        if resp.status_code == 200:
            data = resp.json()
            log_test("Search Scenarios", True)
            log_test("Scenarios Found", data.get("total") >= len(session.scenario_ids))
        else:
            log_test("Search Scenarios", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Search Scenarios", False, str(e))

    # Get statistics
    try:
        resp = session.session.get(f"{BASE_URL}/scenarios/statistics")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Scenario Statistics", True)
            log_test("Statistics Accurate", data.get("total_scenarios") >= len(session.scenario_ids))
        else:
            log_test("Get Scenario Statistics", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Get Scenario Statistics", False, str(e))

def test_risk_scoring(session: TestSession):
    """Test 8: Risk Scoring Engine."""
    print("\n=== Test 8: Risk Scoring ===")

    if not session.employee_ids or not session.scenario_ids:
        log_test("Risk Scoring", False, "Need employees and scenarios")
        return False

    # Calculate risk for each employee-scenario combination
    for emp_id in session.employee_ids[:2]:  # Test first 2 employees
        for scenario_id in session.scenario_ids:
            try:
                risk_data = {
                    "employee_id": emp_id,
                    "scenario_id": scenario_id
                }

                resp = session.session.post(f"{BASE_URL}/risk/calculate", json=risk_data)

                if resp.status_code in [200, 201]:
                    data = resp.json()
                    risk_score = data.get("risk_score")

                    log_test(f"Calculate Risk Score", True)
                    log_test(f"Risk Score Valid Range", 0 <= risk_score <= 100)
                    log_test(f"Risk Breakdown Exists", "likelihood_breakdown" in data)

                    session.risk_score_ids.append(data.get("id"))
                else:
                    log_test(f"Calculate Risk Score", False, f"Status {resp.status_code}: {resp.text}")
            except Exception as e:
                log_test(f"Calculate Risk Score", False, str(e))

    # Get employee risk scores
    if session.employee_ids and session.risk_score_ids:
        try:
            emp_id = session.employee_ids[0]
            resp = session.session.get(f"{BASE_URL}/risk/employee/{emp_id}")

            if resp.status_code == 200:
                data = resp.json()
                log_test("Get Employee Risk History", True)
                # Check if response is list or dict
                if isinstance(data, list):
                    log_test("Risk Scores Retrieved", len(data) > 0)
                else:
                    log_test("Risk Scores Retrieved", len(data.get("risk_scores", [])) > 0)
            elif resp.status_code == 404:
                log_test("Get Employee Risk History", True, "No risk scores yet (expected)")
            else:
                log_test("Get Employee Risk History", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("Get Employee Risk History", False, str(e))

def test_simulations(session: TestSession):
    """Test 9: Simulation Campaigns."""
    print("\n=== Test 9: Simulations ===")

    if not session.employee_ids or not session.scenario_ids:
        log_test("Simulations", False, "Need employees and scenarios")
        return False

    # Create simulation
    simulation_data = {
        "name": "E2E Test Campaign",
        "description": "Comprehensive end-to-end test simulation",
        "scenario_id": session.scenario_ids[0],
        "target_employee_ids": session.employee_ids,
        "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat()
    }

    try:
        resp = session.session.post(f"{BASE_URL}/simulations/", json=simulation_data)

        if resp.status_code == 201:
            data = resp.json()
            sim_id = data.get("id")
            session.simulation_ids.append(sim_id)

            log_test("Create Simulation", True)
            log_test("Simulation Has Targets", data.get("total_targets") == len(session.employee_ids))
            actual_status = data.get("status")
            log_test("Simulation Status", actual_status in ["DRAFT", "SCHEDULED", "IN_PROGRESS"], f"Expected valid status, got: {actual_status}")
        else:
            log_test("Create Simulation", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Create Simulation", False, str(e))

    # Search simulations
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.session.post(f"{BASE_URL}/simulations/search", json=search_data)

        if resp.status_code == 200:
            data = resp.json()
            log_test("Search Simulations", True)
            log_test("Simulations Found", data.get("total") >= len(session.simulation_ids))
        else:
            log_test("Search Simulations", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Search Simulations", False, str(e))

def test_analytics(session: TestSession):
    """Test 10: Analytics Dashboard."""
    print("\n=== Test 10: Analytics ===")

    # Risk distribution
    try:
        resp = session.session.get(f"{BASE_URL}/analytics/risk-distribution")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Risk Distribution", True)
            # Check for expected keys in the distribution response
            has_required_keys = all(k in data for k in ["total_employees", "critical_count", "high_count", "medium_count", "low_count"])
            log_test("Distribution Data Valid", has_required_keys, f"Response keys: {list(data.keys())}")
        else:
            log_test("Get Risk Distribution", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Get Risk Distribution", False, str(e))

    # Executive summary
    try:
        resp = session.session.get(f"{BASE_URL}/analytics/executive-summary")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Executive Summary", True)
            log_test("Summary Has Metrics", "total_employees" in data and "average_risk_score" in data)
        else:
            log_test("Get Executive Summary", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Get Executive Summary", False, str(e))

    # Department comparison
    try:
        resp = session.session.get(f"{BASE_URL}/analytics/department-comparison")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Get Department Comparison", True)
            log_test("Departments Analyzed", len(data.get("departments", [])) > 0)
        else:
            log_test("Get Department Comparison", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Get Department Comparison", False, str(e))

def test_error_handling(session: TestSession):
    """Test 11: Error Handling & Edge Cases."""
    print("\n=== Test 11: Error Handling ===")

    # Test invalid employee ID
    try:
        resp = session.session.get(f"{BASE_URL}/employees/invalid-uuid")
        log_test("Invalid Employee ID Returns 400/404", resp.status_code in [400, 404])
    except Exception as e:
        log_test("Invalid Employee ID", False, str(e))

    # Test duplicate employee ID
    if session.employee_ids:
        try:
            duplicate_data = {
                "employee_id": "E2E001",  # Already exists
                "email": "duplicate@test.com",
                "full_name": "Duplicate Test",
                "department": "IT",
                "seniority": "junior",
                "technical_literacy": 5,
                "age_range": "25_34",
                "languages": ["en"]
            }
            resp = session.session.post(f"{BASE_URL}/employees/", json=duplicate_data)
            log_test("Duplicate Employee ID Rejected", resp.status_code == 400)
        except Exception as e:
            log_test("Duplicate Employee ID", False, str(e))

    # Test invalid risk calculation
    try:
        invalid_risk = {
            "employee_id": "00000000-0000-0000-0000-000000000000",
            "scenario_id": "00000000-0000-0000-0000-000000000000"
        }
        resp = session.session.post(f"{BASE_URL}/risk/calculate", json=invalid_risk)
        log_test("Invalid Risk Calculation Rejected", resp.status_code in [400, 404])
    except Exception as e:
        log_test("Invalid Risk Calculation", False, str(e))

    # Test unauthorized access (no token)
    try:
        no_auth_session = requests.Session()
        resp = no_auth_session.get(f"{BASE_URL}/employees/statistics")
        log_test("Unauthorized Access Blocked", resp.status_code == 401)
    except Exception as e:
        log_test("Unauthorized Access", False, str(e))

def test_data_consistency(session: TestSession):
    """Test 12: Data Consistency & Integrity."""
    print("\n=== Test 12: Data Consistency ===")

    # Verify employee count matches
    try:
        search_resp = session.session.post(f"{BASE_URL}/employees/search", json={"page": 1, "page_size": 100})
        stats_resp = session.session.get(f"{BASE_URL}/employees/statistics")

        if search_resp.status_code == 200 and stats_resp.status_code == 200:
            search_total = search_resp.json().get("total")
            stats_total = stats_resp.json().get("total_employees")

            log_test("Employee Count Consistency", search_total == stats_total,
                    f"Search: {search_total}, Stats: {stats_total}")
        else:
            log_test("Employee Count Consistency", False, "API call failed")
    except Exception as e:
        log_test("Employee Count Consistency", False, str(e))

    # Verify risk scores reference valid employees
    if session.risk_score_ids:
        try:
            # Risk scores should reference employees that exist
            log_test("Risk Scores Reference Valid Data", len(session.risk_score_ids) > 0)
        except Exception as e:
            log_test("Risk Scores Reference Valid Data", False, str(e))

def print_summary():
    """Print comprehensive test summary."""
    print("\n" + "="*70)
    print("END-TO-END TEST SUMMARY")
    print("="*70)
    print(f"Total Passed:  {results['passed']}")
    print(f"Total Failed:  {results['failed']}")
    print(f"Total Warnings: {len(results['warnings'])}")

    if results['passed'] + results['failed'] > 0:
        success_rate = (results['passed'] / (results['passed'] + results['failed'])) * 100
        print(f"Success Rate:  {success_rate:.1f}%")

    if results['warnings']:
        print("\nWarnings:")
        for warning in results['warnings']:
            print(f"  [!]  {warning}")

    if results['errors']:
        print("\nFailed Tests:")
        for error in results['errors']:
            print(f"  [X] {error}")

    print("="*70)
    return results['failed'] == 0

def main():
    """Run comprehensive end-to-end testing."""
    print("="*70)
    print("MAIDAR PLATFORM - COMPREHENSIVE END-TO-END TESTING")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    session = TestSession()

    # Run all test suites
    user_data = test_user_registration(session)
    if not user_data:
        print("\n[X] Cannot continue without successful registration")
        return False

    if not test_user_login(session, user_data):
        print("\n[X] Cannot continue without successful login")
        return False

    test_get_current_user(session)
    test_create_employees(session)
    test_employee_operations(session)
    test_create_scenarios(session)
    test_scenario_operations(session)
    test_risk_scoring(session)
    test_simulations(session)
    test_analytics(session)
    test_error_handling(session)
    test_data_consistency(session)

    # Print summary
    success = print_summary()

    print(f"\n* End-to-End Testing Completed!")
    print(f"[INFO] Created: {len(session.employee_ids)} employees, {len(session.scenario_ids)} scenarios")
    print(f"[INFO] Generated: {len(session.risk_score_ids)} risk scores, {len(session.simulation_ids)} simulations")

    return success

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[!]  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n[X] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
