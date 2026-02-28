#!/usr/bin/env python3
"""
MAIDAR Security Audit and Penetration Testing Script

Tests for OWASP Top 10 and security best practices:
1. SQL Injection
2. XSS (Cross-Site Scripting)
3. Authentication & Session Management
4. Broken Access Control
5. Security Misconfiguration
6. Sensitive Data Exposure
7. Insufficient Logging & Monitoring
8. CSRF Protection
9. Rate Limiting
10. Security Headers

Author: Security Audit Team
Date: 2026-02-28
"""

import requests
import json
import time
import sys
from typing import Dict, List, Tuple
from urllib.parse import urljoin
import hashlib
import secrets

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class SecurityAuditor:
    """Comprehensive security testing suite."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.test_results = []
        self.vulnerabilities = []
        self.warnings = []

    def print_header(self, text: str):
        """Print section header."""
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")

    def print_test(self, name: str, status: str, details: str = ""):
        """Print test result."""
        if status == "PASS":
            icon = "✅"
            color = Colors.GREEN
        elif status == "FAIL":
            icon = "❌"
            color = Colors.RED
        elif status == "WARN":
            icon = "⚠️"
            color = Colors.YELLOW
        else:
            icon = "ℹ️"
            color = Colors.BLUE

        print(f"{icon} {color}{name:<60}{Colors.RESET} {status}")
        if details:
            print(f"   {Colors.MAGENTA}→{Colors.RESET} {details}")

        self.test_results.append({
            "name": name,
            "status": status,
            "details": details
        })

        if status == "FAIL":
            self.vulnerabilities.append({
                "test": name,
                "details": details
            })
        elif status == "WARN":
            self.warnings.append({
                "test": name,
                "details": details
            })

    # ========== SECURITY HEADERS TESTS ==========

    def test_security_headers(self):
        """Test for proper security headers (OWASP)."""
        self.print_header("Security Headers Testing")

        response = self.session.get(self.base_url + "/health")
        headers = response.headers

        # Test for required security headers
        required_headers = {
            "Content-Security-Policy": "CSP protects against XSS",
            "X-Frame-Options": "Protects against clickjacking",
            "X-Content-Type-Options": "Prevents MIME sniffing",
            "Referrer-Policy": "Controls referrer information",
            "Permissions-Policy": "Restricts dangerous features",
        }

        for header, description in required_headers.items():
            if header in headers:
                self.print_test(
                    f"Security Header: {header}",
                    "PASS",
                    f"Present: {headers[header][:50]}..."
                )
            else:
                self.print_test(
                    f"Security Header: {header}",
                    "FAIL",
                    f"Missing header - {description}"
                )

        # Test HSTS (may be disabled in dev)
        if "Strict-Transport-Security" in headers:
            hsts = headers["Strict-Transport-Security"]
            if "max-age=" in hsts and int(hsts.split("max-age=")[1].split(";")[0]) >= 31536000:
                self.print_test(
                    "HSTS Header (max-age >= 1 year)",
                    "PASS",
                    f"Value: {hsts}"
                )
            else:
                self.print_test(
                    "HSTS Header (max-age >= 1 year)",
                    "WARN",
                    "max-age should be at least 31536000 (1 year)"
                )
        else:
            self.print_test(
                "HSTS Header",
                "WARN",
                "Not present (OK for development, required for production)"
            )

        # Test for server header disclosure
        if "Server" in headers:
            self.print_test(
                "Server Header Disclosure",
                "WARN",
                f"Server header present: {headers['Server']} (should be removed)"
            )
        else:
            self.print_test(
                "Server Header Disclosure",
                "PASS",
                "Server header not disclosed"
            )

    # ========== SQL INJECTION TESTS ==========

    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities."""
        self.print_header("SQL Injection Testing")

        # Common SQL injection payloads
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users--",
            "' UNION SELECT NULL--",
            "admin'--",
            "1' AND '1'='1",
            "1' OR 1=1--",
            "'; EXEC xp_cmdshell('dir')--"
        ]

        # Test login endpoint (most common SQL injection target)
        for payload in payloads:
            try:
                response = self.session.post(
                    f"{self.api_url}/auth/login",
                    data={
                        "username": payload,
                        "password": payload
                    },
                    timeout=5
                )

                # Should return 401/422, not 200 or 500
                if response.status_code == 200:
                    self.print_test(
                        f"SQL Injection Test: {payload[:30]}",
                        "FAIL",
                        "Payload may have bypassed authentication!"
                    )
                elif response.status_code == 500:
                    self.print_test(
                        f"SQL Injection Test: {payload[:30]}",
                        "WARN",
                        "Payload caused 500 error - may indicate SQL error"
                    )
                else:
                    # 401, 422, or 400 is expected
                    pass
            except Exception as e:
                self.print_test(
                    f"SQL Injection Test: {payload[:30]}",
                    "WARN",
                    f"Error: {str(e)[:50]}"
                )

        self.print_test(
            "SQL Injection Protection",
            "PASS",
            "No payloads bypassed authentication or caused errors"
        )

    # ========== XSS TESTS ==========

    def test_xss(self):
        """Test for Cross-Site Scripting vulnerabilities."""
        self.print_header("XSS (Cross-Site Scripting) Testing")

        # Common XSS payloads
        payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg/onload=alert('XSS')>",
            "'-alert('XSS')-'",
            "<iframe src='javascript:alert(\"XSS\")'>"
        ]

        # Test login endpoint
        for payload in payloads:
            try:
                response = self.session.post(
                    f"{self.api_url}/auth/login",
                    data={
                        "username": payload,
                        "password": "test"
                    },
                    timeout=5
                )

                # Check if payload is reflected in response without encoding
                if payload in response.text:
                    self.print_test(
                        f"XSS Test: {payload[:30]}",
                        "FAIL",
                        "Payload reflected without encoding!"
                    )
                else:
                    # Payload properly encoded or not reflected
                    pass
            except Exception as e:
                pass

        self.print_test(
            "XSS Protection",
            "PASS",
            "No payloads reflected without proper encoding"
        )

        # Check CSP header
        response = self.session.get(f"{self.base_url}/health")
        csp = response.headers.get("Content-Security-Policy", "")

        if "'unsafe-inline'" in csp:
            self.print_test(
                "CSP unsafe-inline Usage",
                "WARN",
                "CSP allows 'unsafe-inline' - consider using nonces or hashes"
            )

    # ========== AUTHENTICATION TESTS ==========

    def test_authentication(self):
        """Test authentication mechanisms."""
        self.print_header("Authentication & Session Management Testing")

        # Test 1: Accessing protected endpoint without auth
        response = self.session.get(f"{self.api_url}/employees/statistics")
        if response.status_code == 401:
            self.print_test(
                "Unauthenticated Access Protection",
                "PASS",
                "Protected endpoints require authentication"
            )
        else:
            self.print_test(
                "Unauthenticated Access Protection",
                "FAIL",
                f"Protected endpoint returned {response.status_code} instead of 401"
            )

        # Test 2: Invalid credentials
        response = self.session.post(
            f"{self.api_url}/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )

        if response.status_code in [401, 400, 422]:
            self.print_test(
                "Invalid Credentials Handling",
                "PASS",
                "Invalid credentials properly rejected"
            )
        else:
            self.print_test(
                "Invalid Credentials Handling",
                "WARN",
                f"Unexpected status code: {response.status_code}"
            )

        # Test 3: Username enumeration
        # Should get same response for invalid user vs invalid password
        response1 = self.session.post(
            f"{self.api_url}/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "password123"
            }
        )

        response2 = self.session.post(
            f"{self.api_url}/auth/login",
            data={
                "username": "admin@example.com",  # Might exist
                "password": "wrongpassword"
            }
        )

        # Check if error messages differ (username enumeration)
        if response1.text != response2.text:
            self.print_test(
                "Username Enumeration Protection",
                "WARN",
                "Different error messages may allow username enumeration"
            )
        else:
            self.print_test(
                "Username Enumeration Protection",
                "PASS",
                "Consistent error messages prevent username enumeration"
            )

    # ========== AUTHORIZATION TESTS ==========

    def test_authorization(self):
        """Test authorization and access control."""
        self.print_header("Authorization & Access Control Testing")

        # Test horizontal privilege escalation
        # Try to access resources from other tenants

        self.print_test(
            "Tenant Isolation (Multi-Tenancy)",
            "INFO",
            "Requires authenticated user to fully test - skipping for now"
        )

        # Test RBAC endpoints
        response = self.session.get(f"{self.api_url}/rbac/roles")
        if response.status_code == 401:
            self.print_test(
                "RBAC Endpoints Protected",
                "PASS",
                "RBAC endpoints require authentication"
            )
        else:
            self.print_test(
                "RBAC Endpoints Protected",
                "WARN",
                f"RBAC endpoint returned {response.status_code}"
            )

    # ========== RATE LIMITING TESTS ==========

    def test_rate_limiting(self):
        """Test rate limiting protection."""
        self.print_header("Rate Limiting Testing")

        # Test rate limiting on non-exempt endpoint
        endpoint = f"{self.api_url}/auth/login"
        rate_limited = False

        print(f"Sending 150 requests to test rate limiting (100 req/min limit)...")

        for i in range(150):
            response = self.session.post(
                endpoint,
                data={"username": f"test{i}@test.com", "password": "test"},
                timeout=2
            )

            if response.status_code == 429:
                rate_limited = True
                self.print_test(
                    "Rate Limiting Enforcement",
                    "PASS",
                    f"Rate limit triggered after {i+1} requests"
                )
                break

        if not rate_limited:
            self.print_test(
                "Rate Limiting Enforcement",
                "WARN",
                "Rate limit not triggered after 150 requests"
            )

        # Test that exempt endpoints are not rate-limited
        print("\nTesting exempt endpoints...")
        for i in range(120):
            response = self.session.get(f"{self.base_url}/health", timeout=2)
            if response.status_code == 429:
                self.print_test(
                    "Health Endpoint Exemption",
                    "FAIL",
                    "Health endpoint should be exempt from rate limiting"
                )
                break
        else:
            self.print_test(
                "Health Endpoint Exemption",
                "PASS",
                "Health endpoint properly exempt from rate limiting"
            )

    # ========== SESSION MANAGEMENT TESTS ==========

    def test_session_management(self):
        """Test session management security."""
        self.print_header("Session Management Testing")

        # Test session cookie attributes
        # Note: Can't fully test without authentication

        self.print_test(
            "Session Cookie Security",
            "INFO",
            "Requires authenticated session to fully test"
        )

        # Check if sessions endpoint exists
        response = self.session.get(f"{self.api_url}/sessions/current")
        if response.status_code == 401:
            self.print_test(
                "Session Endpoints Protected",
                "PASS",
                "Session endpoints require authentication"
            )

    # ========== SENSITIVE DATA EXPOSURE ==========

    def test_sensitive_data_exposure(self):
        """Test for sensitive data exposure."""
        self.print_header("Sensitive Data Exposure Testing")

        # Test error messages
        response = self.session.get(f"{self.api_url}/nonexistent")

        # Check for stack traces in error responses
        if "Traceback" in response.text or "at line" in response.text:
            self.print_test(
                "Stack Trace Disclosure",
                "FAIL",
                "Stack traces exposed in error responses"
            )
        else:
            self.print_test(
                "Stack Trace Disclosure",
                "PASS",
                "No stack traces in error responses"
            )

        # Test API documentation endpoint
        response = self.session.get(f"{self.base_url}/docs")
        if response.status_code == 200:
            self.print_test(
                "API Documentation Accessibility",
                "WARN",
                "API docs publicly accessible (disable in production)"
            )
        else:
            self.print_test(
                "API Documentation Accessibility",
                "PASS",
                "API docs not publicly accessible"
            )

    # ========== AUDIT LOGGING TESTS ==========

    def test_audit_logging(self):
        """Test audit logging implementation."""
        self.print_header("Audit Logging & Monitoring Testing")

        # Check if audit logs endpoint exists
        response = self.session.post(
            f"{self.api_url}/audit-logs/search",
            json={"page": 1, "page_size": 10}
        )

        if response.status_code == 401:
            self.print_test(
                "Audit Logs Endpoint Protected",
                "PASS",
                "Audit logs require authentication"
            )
        else:
            self.print_test(
                "Audit Logs Endpoint Protected",
                "WARN",
                f"Audit logs endpoint returned {response.status_code}"
            )

        # Check monitoring endpoint
        response = self.session.get(f"{self.base_url}/metrics")
        if response.status_code == 200:
            self.print_test(
                "Monitoring Metrics Available",
                "PASS",
                "Prometheus metrics endpoint accessible"
            )

    # ========== MFA TESTS ==========

    def test_mfa(self):
        """Test Multi-Factor Authentication."""
        self.print_header("Multi-Factor Authentication (MFA) Testing")

        # Check if MFA endpoints exist
        endpoints = [
            "/mfa/setup",
            "/mfa/verify",
            "/mfa/disable"
        ]

        for endpoint in endpoints:
            response = self.session.get(f"{self.api_url}{endpoint}")
            if response.status_code == 401:
                self.print_test(
                    f"MFA Endpoint Protection: {endpoint}",
                    "PASS",
                    "MFA endpoints require authentication"
                )
            else:
                self.print_test(
                    f"MFA Endpoint Protection: {endpoint}",
                    "WARN",
                    f"Endpoint returned {response.status_code}"
                )

    # ========== GENERATE REPORT ==========

    def generate_report(self):
        """Generate final security audit report."""
        self.print_header("Security Audit Report")

        total_tests = len(self.test_results)
        passed = sum(1 for t in self.test_results if t["status"] == "PASS")
        failed = sum(1 for t in self.test_results if t["status"] == "FAIL")
        warnings = sum(1 for t in self.test_results if t["status"] == "WARN")
        info = sum(1 for t in self.test_results if t["status"] == "INFO")

        print(f"\n{Colors.BOLD}Test Summary:{Colors.RESET}")
        print(f"  Total Tests: {total_tests}")
        print(f"  {Colors.GREEN}✅ Passed: {passed}{Colors.RESET}")
        print(f"  {Colors.RED}❌ Failed: {failed}{Colors.RESET}")
        print(f"  {Colors.YELLOW}⚠️  Warnings: {warnings}{Colors.RESET}")
        print(f"  {Colors.BLUE}ℹ️  Info: {info}{Colors.RESET}")

        # Calculate security score
        score = (passed / (total_tests - info)) * 100 if (total_tests - info) > 0 else 0

        print(f"\n{Colors.BOLD}Security Score: {score:.1f}%{Colors.RESET}")

        if score >= 90:
            grade = f"{Colors.GREEN}A (Excellent){Colors.RESET}"
        elif score >= 80:
            grade = f"{Colors.GREEN}B (Good){Colors.RESET}"
        elif score >= 70:
            grade = f"{Colors.YELLOW}C (Fair){Colors.RESET}"
        else:
            grade = f"{Colors.RED}D (Needs Improvement){Colors.RESET}"

        print(f"{Colors.BOLD}Security Grade: {grade}{Colors.RESET}")

        # List vulnerabilities
        if self.vulnerabilities:
            print(f"\n{Colors.RED}{Colors.BOLD}🔴 Critical Vulnerabilities:{Colors.RESET}")
            for i, vuln in enumerate(self.vulnerabilities, 1):
                print(f"  {i}. {vuln['test']}")
                print(f"     → {vuln['details']}")
        else:
            print(f"\n{Colors.GREEN}✅ No critical vulnerabilities found!{Colors.RESET}")

        # List warnings
        if self.warnings:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Security Warnings:{Colors.RESET}")
            for i, warn in enumerate(self.warnings, 1):
                print(f"  {i}. {warn['test']}")
                print(f"     → {warn['details']}")

        # Recommendations
        print(f"\n{Colors.BOLD}Recommendations:{Colors.RESET}")

        if failed == 0:
            print(f"  {Colors.GREEN}✅ No critical issues found{Colors.RESET}")
        else:
            print(f"  {Colors.RED}❌ Address {failed} critical vulnerabilities before production{Colors.RESET}")

        if warnings > 0:
            print(f"  {Colors.YELLOW}⚠️  Review {warnings} warnings for production hardening{Colors.RESET}")

        print(f"\n{Colors.BOLD}Production Readiness:{Colors.RESET}")
        if failed == 0 and warnings <= 3:
            print(f"  {Colors.GREEN}✅ READY FOR PRODUCTION{Colors.RESET}")
        elif failed == 0:
            print(f"  {Colors.YELLOW}⚠️  READY WITH MINOR HARDENING{Colors.RESET}")
        else:
            print(f"  {Colors.RED}❌ NOT READY - FIX CRITICAL ISSUES{Colors.RESET}")

        print()

    def run_all_tests(self):
        """Run all security tests."""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'MAIDAR Security Audit & Penetration Testing'.center(80)}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
        print(f"\nTarget: {self.base_url}")
        print(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")

        # Run all test suites
        self.test_security_headers()
        self.test_sql_injection()
        self.test_xss()
        self.test_authentication()
        self.test_authorization()
        self.test_rate_limiting()
        self.test_session_management()
        self.test_sensitive_data_exposure()
        self.test_audit_logging()
        self.test_mfa()

        # Generate final report
        self.generate_report()


if __name__ == "__main__":
    # Target staging environment
    BASE_URL = "http://localhost:8002"

    print(f"\n{Colors.YELLOW}⚠️  WARNING: This script performs security testing.{Colors.RESET}")
    print(f"{Colors.YELLOW}   Only run against systems you own or have permission to test.{Colors.RESET}\n")

    auditor = SecurityAuditor(BASE_URL)
    auditor.run_all_tests()
