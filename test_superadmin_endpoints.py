"""
Comprehensive test for super admin and RBAC protected endpoints.
Tests all endpoints that require elevated permissions.
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional

BASE_URL = "http://localhost:8001/api/v1"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

class SuperAdminTester:
    def __init__(self):
        self.super_token = None
        self.tenant_token = None
        self.tenant_id = None
        self.user_id = None
        self.tenant_admin_id = None
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.failures = []

    def setup_auth(self):
        """Get authentication tokens."""
        print("\n[Setup] Authenticating as super admin...")

        # Login as super admin
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "superadmin@maidar.platform",
            "password": "SuperAdmin123!"
        })

        if response.status_code == 200:
            self.super_token = response.json()["access_token"]
            print(f"[Setup] {Colors.GREEN}Super admin authentication successful!{Colors.END}")
        else:
            print(f"[Setup] {Colors.RED}Super admin login failed: {response.status_code}{Colors.END}")
            print(f"[Setup] Response: {response.text}")
            return False

        # Also login as tenant admin for comparison tests
        print("\n[Setup] Creating tenant admin for comparison tests...")
        timestamp = int(time.time())
        tenant_email = f"tenant_{timestamp}@example.com"

        reg_response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": tenant_email,
            "password": "TenantPass123!",
            "full_name": "Tenant Admin User",
            "organization_name": f"Test Org {timestamp}"
        })

        if reg_response.status_code == 201:
            print(f"[Setup] Tenant admin registered")

        time.sleep(1)
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": tenant_email,
            "password": "TenantPass123!"
        })

        if login_response.status_code == 200:
            self.tenant_token = login_response.json()["access_token"]
            self.tenant_id = login_response.json()["user"]["tenant_id"]
            self.tenant_admin_id = login_response.json()["user"]["id"]
            print(f"[Setup] {Colors.GREEN}Tenant admin authentication successful{Colors.END}")
        else:
            print(f"[Setup] {Colors.YELLOW}Tenant admin login failed (using existing){Colors.END}")

        return True

    def test(self, name: str, method: str, endpoint: str, expected_status: int = 200,
             json_data: Optional[Dict] = None, token: Optional[str] = None,
             skip_reason: Optional[str] = None) -> Optional[Dict]:
        """Test an API endpoint."""

        if skip_reason:
            print(f"{Colors.YELLOW}[SKIP]{Colors.END} {name} - {skip_reason}")
            self.skipped += 1
            return None

        url = f"{BASE_URL}{endpoint}"
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, json=json_data, headers=headers)
            elif method == "PUT":
                response = requests.put(url, json=json_data, headers=headers)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Accept both exact match and 2xx success
            if response.status_code == expected_status or (200 <= response.status_code < 300 and 200 <= expected_status < 300):
                print(f"{Colors.GREEN}[PASS]{Colors.END} {name}")
                self.passed += 1
                return response.json() if response.content else None
            else:
                error_msg = f"Status {response.status_code}"
                if response.content:
                    try:
                        error_data = response.json()
                        error_msg += f": {json.dumps(error_data)[:150]}"
                    except:
                        error_msg += f": {response.text[:150]}"
                print(f"{Colors.RED}[FAIL]{Colors.END} {name} - {error_msg}")
                self.failed += 1
                self.failures.append(f"{name}: {error_msg}")
                return None

        except Exception as e:
            print(f"{Colors.RED}[FAIL]{Colors.END} {name} - Exception: {str(e)[:150]}")
            self.failed += 1
            self.failures.append(f"{name}: {str(e)[:150]}")
            return None

    def print_section(self, title: str):
        """Print a section header."""
        print(f"\n{'='*80}")
        print(f"{title}")
        print(f"{'='*80}\n")

    def run_all_tests(self):
        """Run all super admin endpoint tests."""

        print(f"\n{'='*80}")
        print(f"TESTING SUPER ADMIN & RBAC PROTECTED ENDPOINTS")
        print(f"{'='*80}")
        print(f"Target: {BASE_URL}")
        print(f"Time: {datetime.now()}")

        if not self.setup_auth():
            print(f"\n{Colors.RED}Setup failed - cannot proceed with tests{Colors.END}")
            return

        # ===== TENANT MANAGEMENT ENDPOINTS =====
        self.print_section("TESTING TENANT MANAGEMENT ENDPOINTS (Super Admin Only)")

        # Search tenants
        search_result = self.test(
            "POST /tenants/search - Search tenants",
            "POST", "/tenants/search",
            json_data={"query": "", "page": 1, "page_size": 10},
            token=self.super_token,
            expected_status=200
        )

        # Verify tenant admin CANNOT search tenants
        self.test(
            "POST /tenants/search - Verify tenant admin blocked",
            "POST", "/tenants/search",
            json_data={"query": "", "page": 1, "page_size": 10},
            token=self.tenant_token,
            expected_status=403
        )

        # Create tenant
        timestamp = int(time.time())
        tenant_data = {
            "name": f"Test Tenant {timestamp}",
            "domain": f"test{timestamp}.example.com",
            "subdomain": f"test{timestamp}",
            "license_tier": "ENTERPRISE",
            "seats_total": 100
        }
        new_tenant = self.test(
            "POST /tenants/ - Create tenant",
            "POST", "/tenants/",
            json_data=tenant_data,
            token=self.super_token,
            expected_status=201
        )

        new_tenant_id = new_tenant.get("id") if new_tenant else None

        if new_tenant_id:
            # Get tenant details
            self.test(
                "GET /tenants/{id} - Get tenant details",
                "GET", f"/tenants/{new_tenant_id}",
                token=self.super_token,
                expected_status=200
            )

            # Update tenant
            self.test(
                "PUT /tenants/{id} - Update tenant",
                "PUT", f"/tenants/{new_tenant_id}",
                json_data={"name": f"Updated Tenant {timestamp}"},
                token=self.super_token,
                expected_status=200
            )

            # Suspend tenant
            self.test(
                "POST /tenants/{id}/suspend - Suspend tenant",
                "POST", f"/tenants/{new_tenant_id}/suspend",
                token=self.super_token,
                expected_status=200
            )

            # Activate tenant
            self.test(
                "POST /tenants/{id}/activate - Activate tenant",
                "POST", f"/tenants/{new_tenant_id}/activate",
                token=self.super_token,
                expected_status=200
            )

            # Delete tenant
            self.test(
                "DELETE /tenants/{id} - Delete tenant",
                "DELETE", f"/tenants/{new_tenant_id}",
                token=self.super_token,
                expected_status=200
            )
        else:
            print(f"{Colors.YELLOW}[SKIP] Tenant CRUD tests - tenant not created{Colors.END}")
            self.skipped += 5

        # ===== ADMIN USER MANAGEMENT =====
        self.print_section("TESTING ADMIN USER MANAGEMENT ENDPOINTS (Super Admin Only)")

        if self.tenant_admin_id:
            # Get admin user
            self.test(
                "GET /admin-users/{id} - Get admin user details",
                "GET", f"/admin-users/{self.tenant_admin_id}",
                token=self.super_token,
                expected_status=200
            )

            # Update admin user
            self.test(
                "PUT /admin-users/{id} - Update admin user",
                "PUT", f"/admin-users/{self.tenant_admin_id}",
                json_data={"full_name": "Updated Admin Name"},
                token=self.super_token,
                expected_status=200
            )

            # Verify tenant admin CANNOT access other users
            self.test(
                "GET /admin-users/{id} - Verify tenant admin blocked",
                "GET", f"/admin-users/{self.tenant_admin_id}",
                token=self.tenant_token,
                expected_status=403
            )
        else:
            print(f"{Colors.YELLOW}[SKIP] Admin user tests - no user ID{Colors.END}")
            self.skipped += 3

        # Search admin users
        self.test(
            "POST /admin-users/search - Search admin users",
            "POST", "/admin-users/search",
            json_data={"query": "test", "page": 1, "page_size": 10},
            token=self.super_token,
            expected_status=200
        )

        # Create admin user (requires tenant_id)
        if self.tenant_id:
            admin_user_data = {
                "email": f"newadmin_{timestamp}@example.com",
                "password": "AdminPass123!",
                "full_name": "New Admin User",
                "role": "TENANT_ADMIN",
                "tenant_id": self.tenant_id
            }
            new_admin = self.test(
                "POST /admin-users/ - Create admin user",
                "POST", "/admin-users/",
                json_data=admin_user_data,
                token=self.super_token,
                expected_status=201
            )

            new_admin_id = new_admin.get("id") if new_admin else None

            if new_admin_id:
                # Suspend user
                self.test(
                    "POST /admin-users/{id}/suspend - Suspend admin user",
                    "POST", f"/admin-users/{new_admin_id}/suspend",
                    token=self.super_token,
                    expected_status=200
                )

                # Activate user
                self.test(
                    "POST /admin-users/{id}/activate - Activate admin user",
                    "POST", f"/admin-users/{new_admin_id}/activate",
                    token=self.super_token,
                    expected_status=200
                )

                # Reassign tenant (if we have another tenant)
                if new_tenant_id:
                    self.test(
                        "PUT /admin-users/{id}/reassign-tenant - Reassign tenant",
                        "PUT", f"/admin-users/{new_admin_id}/reassign-tenant",
                        json_data={"new_tenant_id": new_tenant_id},
                        token=self.super_token,
                        expected_status=200
                    )
                else:
                    self.skipped += 1
            else:
                self.skipped += 3
        else:
            self.skipped += 4

        # ===== RBAC ENDPOINTS =====
        self.print_section("TESTING RBAC ENDPOINTS (Permission Protected)")

        # List permissions (super admin should have access)
        self.test(
            "GET /rbac/permissions - List all permissions (super admin)",
            "GET", "/rbac/permissions",
            token=self.super_token,
            expected_status=200
        )

        # Verify tenant admin without permission is blocked
        self.test(
            "GET /rbac/permissions - Verify blocked without permission",
            "GET", "/rbac/permissions",
            token=self.tenant_token,
            expected_status=403
        )

        # List roles (super admin)
        roles_result = self.test(
            "GET /rbac/roles - List all roles (super admin)",
            "GET", "/rbac/roles",
            token=self.super_token,
            expected_status=200
        )

        # Create role (super admin)
        role_data = {
            "name": f"Test Role {timestamp}",
            "description": "Test role for super admin testing",
            "permissions": ["employees:read", "scenarios:read", "roles:read"]
        }
        role_result = self.test(
            "POST /rbac/roles - Create role (super admin)",
            "POST", "/rbac/roles",
            json_data=role_data,
            token=self.super_token,
            expected_status=201
        )

        role_id = role_result.get("id") if role_result else None

        if role_id:
            # Get specific role
            self.test(
                "GET /rbac/roles/{id} - Get specific role",
                "GET", f"/rbac/roles/{role_id}",
                token=self.super_token,
                expected_status=200
            )

            # Update role
            self.test(
                "PUT /rbac/roles/{id} - Update role",
                "PUT", f"/rbac/roles/{role_id}",
                json_data={"description": "Updated role description"},
                token=self.super_token,
                expected_status=200
            )

            # Assign role to tenant admin
            if self.tenant_admin_id:
                self.test(
                    "POST /rbac/roles/{id}/assign - Assign role to user",
                    "POST", f"/rbac/roles/{role_id}/assign",
                    json_data={"user_id": self.tenant_admin_id},
                    token=self.super_token,
                    expected_status=200
                )

                # Get user permissions
                self.test(
                    "GET /rbac/users/{id}/permissions - Get user permissions",
                    "GET", f"/rbac/users/{self.tenant_admin_id}/permissions",
                    token=self.super_token,
                    expected_status=200
                )

                # Re-login as tenant admin to get new token with permissions
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": f"tenant_{timestamp}@example.com",
                    "password": "TenantPass123!"
                })
                if login_response.status_code == 200:
                    new_tenant_token = login_response.json()["access_token"]

                    # Now tenant admin should be able to list roles
                    self.test(
                        "GET /rbac/roles - List roles with granted permission",
                        "GET", "/rbac/roles",
                        token=new_tenant_token,
                        expected_status=200
                    )

                # Remove user from role
                self.test(
                    "DELETE /rbac/roles/{id}/users/{user_id} - Remove user from role",
                    "DELETE", f"/rbac/roles/{role_id}/users/{self.tenant_admin_id}",
                    token=self.super_token,
                    expected_status=200
                )
            else:
                self.skipped += 4

            # Delete role
            self.test(
                "DELETE /rbac/roles/{id} - Delete role",
                "DELETE", f"/rbac/roles/{role_id}",
                token=self.super_token,
                expected_status=200
            )
        else:
            self.skipped += 7

        # ===== AUDIT LOG ENDPOINTS =====
        self.print_section("TESTING AUDIT LOG ENDPOINTS (Super Admin Only)")

        # Search audit logs
        logs_result = self.test(
            "POST /audit-logs/search - Search audit logs (super admin)",
            "POST", "/audit-logs/search",
            json_data={"page": 1, "page_size": 10},
            token=self.super_token,
            expected_status=200
        )

        # Verify tenant admin blocked
        self.test(
            "POST /audit-logs/search - Verify tenant admin blocked",
            "POST", "/audit-logs/search",
            json_data={"page": 1, "page_size": 10},
            token=self.tenant_token,
            expected_status=403
        )

        log_id = None
        if logs_result and logs_result.get("logs"):
            log_id = logs_result["logs"][0]["id"]

        if log_id:
            # Get specific audit log
            self.test(
                "GET /audit-logs/{id} - Get audit log details",
                "GET", f"/audit-logs/{log_id}",
                token=self.super_token,
                expected_status=200
            )
        else:
            self.skipped += 1

        # ===== PRINT SUMMARY =====
        self.print_summary()

    def print_summary(self):
        """Print test summary."""
        print(f"\n{'='*80}")
        print(f"SUPER ADMIN & RBAC ENDPOINTS TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Passed: {Colors.GREEN}{self.passed}{Colors.END}")
        print(f"Total Failed: {Colors.RED}{self.failed}{Colors.END}")
        print(f"Total Skipped: {Colors.YELLOW}{self.skipped}{Colors.END}")

        if self.failures:
            print(f"\n{Colors.RED}Failed Tests:{Colors.END}")
            for failure in self.failures:
                print(f"  - {failure}")

        print(f"{'='*80}\n")

        success_rate = (self.passed / (self.passed + self.failed) * 100) if (self.passed + self.failed) > 0 else 0
        print(f"{Colors.BOLD}Success Rate: {Colors.GREEN}{success_rate:.1f}%{Colors.END}{Colors.BOLD} ({self.passed}/{self.passed + self.failed} tests){Colors.END}")


if __name__ == "__main__":
    tester = SuperAdminTester()
    tester.run_all_tests()
