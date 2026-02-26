"""
Comprehensive Integration Testing for MAIDAR API
Tests all endpoints with actual HTTP requests
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001/api/v1"
session = requests.Session()

# Test results tracking
results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(name, passed, details=""):
    """Log test result."""
    if passed:
        results["passed"] += 1
        print(f"[PASS] {name}")
    else:
        results["failed"] += 1
        results["errors"].append(f"{name}: {details}")
        print(f"[FAIL] {name}: {details}")

def test_health_check():
    """Test health check endpoint."""
    try:
        resp = requests.get("http://localhost:8001/health")
        log_test("Health Check", resp.status_code == 200 and resp.json().get("status") == "healthy")
        return resp.status_code == 200
    except Exception as e:
        log_test("Health Check", False, str(e))
        return False

def test_authentication():
    """Test authentication endpoints."""
    print("\n=== Testing Authentication ===")

    global test_user_email, test_user_password, auth_token

    # Test 1: Register new user
    try:
        timestamp = int(time.time())
        register_data = {
            "email": f"test_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "organization_name": f"Test Org {timestamp}"
        }
        resp = session.post(f"{BASE_URL}/auth/register", json=register_data)

        if resp.status_code in [200, 201]:
            log_test("Register User", True)
            test_user_email = register_data["email"]
            test_user_password = register_data["password"]
        else:
            log_test("Register User", False, resp.text)
            # Use existing credentials if registration fails
            test_user_email = "test_1740582602@example.com"  # From previous run
            test_user_password = "TestPass123!"
    except Exception as e:
        log_test("Register User", False, str(e))
        test_user_email = "test_1740582602@example.com"
        test_user_password = "TestPass123!"

    # Test 2: Login
    try:
        login_data = {
            "email": test_user_email,
            "password": test_user_password
        }
        resp = session.post(f"{BASE_URL}/auth/login", json=login_data)
        log_test("Login User", resp.status_code == 200, resp.text if resp.status_code != 200 else "")

        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            auth_token = token
            log_test("JWT Token Generated", len(token) > 0)
        else:
            # Critical failure - can't continue without auth
            print("[ERROR] Authentication failed - cannot continue tests")
            return False
    except Exception as e:
        log_test("Login User", False, str(e))
        return False

    # Test 3: Get current user
    try:
        resp = session.get(f"{BASE_URL}/auth/me")
        log_test("Get Current User", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Get Current User", False, str(e))

def test_employees():
    """Test employee management endpoints."""
    print("\n=== Testing Employee Management ===")

    # Test 1: Create employee
    try:
        employee_data = {
            "employee_id": "EMP001",
            "email": "employee1@testorg.com",
            "full_name": "John Doe",
            "department": "IT",
            "seniority": "senior",
            "technical_literacy": 8,
            "age_range": "35_44",  # Using corrected enum value
            "languages": ["en"]
        }
        resp = session.post(f"{BASE_URL}/employees/", json=employee_data)
        log_test("Create Employee", resp.status_code in [200, 201], resp.text if resp.status_code not in [200, 201] else "")

        if resp.status_code in [200, 201]:
            global test_employee_id
            test_employee_id = resp.json().get("id")
    except Exception as e:
        log_test("Create Employee", False, str(e))

    # Test 2: Get employee
    try:
        if 'test_employee_id' in globals():
            resp = session.get(f"{BASE_URL}/employees/{test_employee_id}")
            log_test("Get Employee by ID", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Get Employee by ID", False, str(e))

    # Test 3: Update employee
    try:
        if 'test_employee_id' in globals():
            update_data = {"technical_literacy": 9}
            resp = session.put(f"{BASE_URL}/employees/{test_employee_id}", json=update_data)
            log_test("Update Employee", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Update Employee", False, str(e))

    # Test 4: Search employees
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.post(f"{BASE_URL}/employees/search", json=search_data)
        log_test("Search Employees", resp.status_code == 200, resp.text if resp.status_code != 200 else "")

        if resp.status_code == 200:
            data = resp.json()
            log_test("Search Returns Data", "employees" in data and len(data["employees"]) > 0)
    except Exception as e:
        log_test("Search Employees", False, str(e))

    # Test 5: Get statistics
    try:
        resp = session.get(f"{BASE_URL}/employees/statistics")
        log_test("Employee Statistics", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Employee Statistics", False, str(e))

def test_scenarios():
    """Test scenario management endpoints."""
    print("\n=== Testing Scenario Management ===")

    # Test 1: Create scenario
    try:
        scenario_data = {
            "name": "Test Phishing Scenario",
            "description": "A test phishing scenario for credential theft",
            "category": "CREDENTIALS",
            "difficulty": "medium",
            "language": "en",
            "email_subject": "Urgent: Reset your password",
            "email_body_html": "<html><body><p>Click here to reset your password: <a href='{{tracking_link}}'>Reset Now</a></p></body></html>",
            "email_body_text": "Click here to reset your password: {{tracking_link}}",
            "sender_name": "IT Support",
            "sender_email": "support@company.com",
            "has_link": True,
            "has_credential_form": True
        }
        resp = session.post(f"{BASE_URL}/scenarios/", json=scenario_data)
        log_test("Create Scenario", resp.status_code in [200, 201], resp.text if resp.status_code not in [200, 201] else "")

        if resp.status_code in [200, 201]:
            global test_scenario_id
            test_scenario_id = resp.json().get("id")
    except Exception as e:
        log_test("Create Scenario", False, str(e))

    # Test 2: Search scenarios
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.post(f"{BASE_URL}/scenarios/search", json=search_data)
        log_test("Search Scenarios", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Search Scenarios", False, str(e))

    # Test 3: Get scenario statistics
    try:
        resp = session.get(f"{BASE_URL}/scenarios/statistics")
        log_test("Scenario Statistics", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Scenario Statistics", False, str(e))

def test_risk_scoring():
    """Test risk scoring endpoints."""
    print("\n=== Testing Risk Scoring ===")

    # Test 1: Calculate risk
    try:
        if 'test_employee_id' in globals() and 'test_scenario_id' in globals():
            risk_data = {
                "employee_id": test_employee_id,
                "scenario_id": test_scenario_id
            }
            resp = session.post(f"{BASE_URL}/risk/calculate", json=risk_data)
            log_test("Calculate Risk Score", resp.status_code in [200, 201], resp.text if resp.status_code not in [200, 201] else "")

            if resp.status_code in [200, 201]:
                data = resp.json()
                log_test("Risk Score Generated", "risk_score" in data and data["risk_score"] > 0)
    except Exception as e:
        log_test("Calculate Risk Score", False, str(e))

    # Test 2: Get employee risk scores
    try:
        if 'test_employee_id' in globals():
            resp = session.get(f"{BASE_URL}/risk/employee/{test_employee_id}")
            log_test("Get Employee Risk Scores", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Get Employee Risk Scores", False, str(e))

def test_simulations():
    """Test simulation endpoints."""
    print("\n=== Testing Simulations ===")

    # Test 1: Create simulation
    try:
        if 'test_scenario_id' in globals() and 'test_employee_id' in globals():
            simulation_data = {
                "name": "Test Simulation Campaign",
                "description": "Testing simulation functionality",
                "scenario_id": test_scenario_id,
                "target_employee_ids": [test_employee_id],
                "scheduled_at": (datetime.now() + timedelta(hours=1)).isoformat()
            }
            resp = session.post(f"{BASE_URL}/simulations/", json=simulation_data)
            log_test("Create Simulation", resp.status_code in [200, 201], resp.text if resp.status_code not in [200, 201] else "")

            if resp.status_code in [200, 201]:
                global test_simulation_id
                test_simulation_id = resp.json().get("id")
    except Exception as e:
        log_test("Create Simulation", False, str(e))

    # Test 2: Search simulations
    try:
        search_data = {"page": 1, "page_size": 10}
        resp = session.post(f"{BASE_URL}/simulations/search", json=search_data)
        log_test("Search Simulations", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Search Simulations", False, str(e))

def test_analytics():
    """Test analytics endpoints."""
    print("\n=== Testing Analytics ===")

    # Test 1: Risk distribution
    try:
        resp = session.get(f"{BASE_URL}/analytics/risk-distribution")
        log_test("Risk Distribution", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Risk Distribution", False, str(e))

    # Test 2: Executive summary
    try:
        resp = session.get(f"{BASE_URL}/analytics/executive-summary")
        log_test("Executive Summary", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Executive Summary", False, str(e))

    # Test 3: Department comparison
    try:
        resp = session.get(f"{BASE_URL}/analytics/department-comparison")
        log_test("Department Comparison", resp.status_code == 200, resp.text if resp.status_code != 200 else "")
    except Exception as e:
        log_test("Department Comparison", False, str(e))

def print_summary():
    """Print test summary."""
    print("\n" + "="*60)
    print("INTEGRATION TEST SUMMARY")
    print("="*60)
    print(f"Total Passed: {results['passed']}")
    print(f"Total Failed: {results['failed']}")
    print(f"Success Rate: {results['passed']/(results['passed']+results['failed'])*100:.1f}%")

    if results['errors']:
        print("\nFailed Tests:")
        for error in results['errors']:
            print(f"  - {error}")

    print("="*60)
    return results['failed'] == 0

def main():
    """Run all integration tests."""
    print("="*60)
    print("MAIDAR API Integration Testing")
    print("="*60)

    # Test 1: Health check
    if not test_health_check():
        print("[ERROR] Backend server not responding!")
        return False

    # Test 2: Authentication
    test_authentication()

    # Test 3: Employees
    test_employees()

    # Test 4: Scenarios
    test_scenarios()

    # Test 5: Risk Scoring
    test_risk_scoring()

    # Test 6: Simulations
    test_simulations()

    # Test 7: Analytics
    test_analytics()

    # Print summary
    return print_summary()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
