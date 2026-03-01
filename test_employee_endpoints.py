"""
Comprehensive Employee Management Endpoints Testing
Tests all employee CRUD operations and bulk upload
"""

import requests
import json
import time
from datetime import datetime
import io

BASE_URL = "http://localhost:8001/api/v1"
AUTH_URL = f"{BASE_URL}/auth"
EMPLOYEE_URL = f"{BASE_URL}/employees"

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
        print(f"EMPLOYEE ENDPOINTS TEST SUMMARY")
        print("="*80)
        print(f"Total Passed: {self.passed}")
        print(f"Total Failed: {self.failed}")
        if self.errors:
            print("\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")
        print("="*80)
        return self.failed == 0

def get_auth_token():
    """Helper to get authentication token"""
    # Register a new user
    timestamp = datetime.now().timestamp()
    email = f"test_employee_{timestamp}@example.com"
    password = "SecurePassword123!"
    org_name = f"Test Employee Org {timestamp}"

    response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Test Employee User",
            "role": "tenant_admin",
            "organization_name": org_name
        }
    )

    if response.status_code != 201:
        raise Exception(f"Failed to register user: {response.text}")

    # Login to get token
    response = requests.post(
        f"{AUTH_URL}/login",
        json={"email": email, "password": password}
    )

    if response.status_code != 200:
        raise Exception(f"Failed to login: {response.text}")

    return response.json()["access_token"]

def test_employee_endpoints():
    results = TestResults()

    print("="*80)
    print("TESTING EMPLOYEE MANAGEMENT ENDPOINTS")
    print("="*80)

    # Get authentication token
    print("\n[Setup] Getting authentication token...")
    try:
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        print("[Setup] Authentication successful")
    except Exception as e:
        print(f"[Setup] Failed to authenticate: {e}")
        return False

    employee_id = None

    # Test 1: Create employee
    print("\n[Test 1] POST /employees - Create employee")
    try:
        response = requests.post(
            EMPLOYEE_URL,
            headers=headers,
            json={
                "employee_id": "EMP001",
                "email": "employee1@company.com",
                "full_name": "John Doe",
                "age_range": "25_34",
                "technical_literacy": 8,
                "seniority": "senior",
                "department": "Engineering",
                "job_title": "Senior Developer",
                "languages": ["en"]
            }
        )
        if response.status_code == 201:
            data = response.json()
            if "id" in data and data["email"] == "employee1@company.com":
                employee_id = data["id"]
                results.log_pass("Create employee - successful")
            else:
                results.log_fail("Create employee", f"Invalid response: {data}")
        else:
            results.log_fail("Create employee", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Create employee", str(e))

    if not employee_id:
        print("\n[WARNING] Cannot continue tests - no employee created")
        results.summary()
        return False

    # Test 2: Create duplicate employee (should fail)
    print("\n[Test 2] POST /employees - Duplicate email")
    try:
        response = requests.post(
            EMPLOYEE_URL,
            headers=headers,
            json={
                "employee_id": "EMP002",
                "email": "employee1@company.com",
                "full_name": "Jane Smith",
                "age_range": "25_34",
                "technical_literacy": 5,
                "seniority": "mid",
                "department": "HR"
            }
        )
        if response.status_code == 400:
            results.log_pass("Create duplicate - properly rejected")
        else:
            results.log_fail("Create duplicate", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.log_fail("Create duplicate", str(e))

    # Test 3: Get employee by ID
    print("\n[Test 3] GET /employees/{id} - Get employee details")
    try:
        response = requests.get(f"{EMPLOYEE_URL}/{employee_id}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data["id"] == employee_id and data["email"] == "employee1@company.com":
                results.log_pass("Get employee - correct data returned")
            else:
                results.log_fail("Get employee", f"Wrong data: {data}")
        else:
            results.log_fail("Get employee", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Get employee", str(e))

    # Test 4: Get non-existent employee
    print("\n[Test 4] GET /employees/{id} - Non-existent employee")
    try:
        response = requests.get(
            f"{EMPLOYEE_URL}/00000000-0000-0000-0000-000000000000",
            headers=headers
        )
        if response.status_code == 404:
            results.log_pass("Get non-existent - properly rejected")
        else:
            results.log_fail("Get non-existent", f"Expected 404, got {response.status_code}")
    except Exception as e:
        results.log_fail("Get non-existent", str(e))

    # Test 5: Update employee
    print("\n[Test 5] PUT /employees/{id} - Update employee")
    try:
        response = requests.put(
            f"{EMPLOYEE_URL}/{employee_id}",
            headers=headers,
            json={
                "full_name": "John Updated Doe",
                "job_title": "Lead Developer",
                "seniority": "senior"
            }
        )
        if response.status_code == 200:
            data = response.json()
            if data["full_name"] == "John Updated Doe" and data["job_title"] == "Lead Developer":
                results.log_pass("Update employee - successful")
            else:
                results.log_fail("Update employee", f"Update not applied: {data}")
        else:
            results.log_fail("Update employee", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Update employee", str(e))

    # Test 6: List employees
    print("\n[Test 6] POST /employees/search - List employees")
    try:
        response = requests.post(
            f"{EMPLOYEE_URL}/search",
            headers=headers,
            json={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            data = response.json()
            if "employees" in data and len(data["employees"]) > 0:
                results.log_pass("List employees - successful")
            else:
                results.log_fail("List employees", f"No employees returned: {data}")
        else:
            results.log_fail("List employees", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("List employees", str(e))

    # Test 7: Search employees
    print("\n[Test 7] POST /employees/search?search=John - Search employees")
    try:
        response = requests.post(
            f"{EMPLOYEE_URL}/search",
            headers=headers,
            json={"page": 1, "page_size": 10, "search": "John"}
        )
        if response.status_code == 200:
            data = response.json()
            if "employees" in data and len(data["employees"]) > 0:
                if any("John" in emp["full_name"] for emp in data["employees"]):
                    results.log_pass("Search employees - found matching employee")
                else:
                    results.log_fail("Search employees", "No matching employee found")
            else:
                results.log_fail("Search employees", "No results returned")
        else:
            results.log_fail("Search employees", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Search employees", str(e))

    # Test 8: Filter by department
    print("\n[Test 8] POST /employees/search?department=Engineering - Filter by department")
    try:
        response = requests.post(
            f"{EMPLOYEE_URL}/search",
            headers=headers,
            json={"page": 1, "page_size": 10, "department": "Engineering"}
        )
        if response.status_code == 200:
            data = response.json()
            if "employees" in data:
                results.log_pass("Filter by department - successful")
            else:
                results.log_fail("Filter by department", "Invalid response")
        else:
            results.log_fail("Filter by department", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Filter by department", str(e))

    # Test 9: Pagination
    print("\n[Test 9] POST /employees/search - Pagination")
    try:
        response = requests.post(
            f"{EMPLOYEE_URL}/search",
            headers=headers,
            json={"page": 1, "page_size": 5}
        )
        if response.status_code == 200:
            data = response.json()
            if "page" in data and "page_size" in data and "total" in data:
                results.log_pass("Pagination - working correctly")
            else:
                results.log_fail("Pagination", "Missing pagination fields")
        else:
            results.log_fail("Pagination", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Pagination", str(e))

    # Test 10: CSV Upload
    print("\n[Test 10] POST /employees/upload-csv - Upload employees via CSV")
    try:
        csv_content = """employee_id,email,full_name,age_range,technical_literacy,seniority,department,job_title
EMP100,csv_employee1@company.com,Alice Johnson,25_34,7,senior,Sales,Manager
EMP101,csv_employee2@company.com,Bob Williams,35_44,6,mid,Marketing,Specialist"""

        files = {
            'file': ('employees.csv', io.StringIO(csv_content), 'text/csv')
        }
        response = requests.post(
            f"{EMPLOYEE_URL}/upload-csv",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        if response.status_code == 200:
            data = response.json()
            if "successful" in data and data["successful"] >= 2:
                results.log_pass("CSV upload - successfully created employees")
            else:
                results.log_fail("CSV upload", f"Unexpected response: {data}")
        else:
            results.log_fail("CSV upload", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("CSV upload", str(e))

    # Test 11: Delete employee
    print("\n[Test 11] DELETE /employees/{id} - Delete employee")
    try:
        response = requests.delete(f"{EMPLOYEE_URL}/{employee_id}", headers=headers)
        if response.status_code == 204 or response.status_code == 200:
            results.log_pass("Delete employee - successful")
        else:
            results.log_fail("Delete employee", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.log_fail("Delete employee", str(e))

    # Test 12: Verify deletion
    print("\n[Test 12] GET /employees/{id} - Verify deleted employee not found")
    try:
        response = requests.get(f"{EMPLOYEE_URL}/{employee_id}", headers=headers)
        if response.status_code == 404:
            results.log_pass("Verify deletion - employee not found")
        else:
            results.log_fail("Verify deletion", f"Expected 404, got {response.status_code}")
    except Exception as e:
        results.log_fail("Verify deletion", str(e))

    return results.summary()

if __name__ == "__main__":
    print("\nEmployee Management Endpoints Comprehensive Test Suite")
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now()}\n")

    try:
        success = test_employee_endpoints()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\nCritical error during testing: {e}")
        exit(1)
