#!/usr/bin/env python3
"""Comprehensive network diagnostics."""

import requests
import json
from urllib.parse import urljoin

print("="*70)
print("MAIDAR NETWORK DIAGNOSTICS")
print("="*70)

# Test configurations
BACKEND = "http://localhost:8002"
FRONTEND = "http://localhost:3001"
API_BASE = f"{BACKEND}/api/v1"

tests = []

# Test 1: Backend Health
print("\n[1] Testing Backend Health...")
try:
    r = requests.get(f"{BACKEND}/health", timeout=5)
    print(f"   Status: {r.status_code}")
    print(f"   Response: {r.json()}")
    tests.append(("Backend Health", r.status_code == 200))
except Exception as e:
    print(f"   ERROR: {e}")
    tests.append(("Backend Health", False))

# Test 2: CORS Headers
print("\n[2] Testing CORS Headers...")
try:
    r = requests.options(
        f"{API_BASE}/auth/login",
        headers={
            "Origin": "http://localhost:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        },
        timeout=5
    )
    print(f"   Status: {r.status_code}")
    print(f"   Access-Control-Allow-Origin: {r.headers.get('Access-Control-Allow-Origin')}")
    print(f"   Access-Control-Allow-Methods: {r.headers.get('Access-Control-Allow-Methods')}")
    print(f"   Access-Control-Allow-Headers: {r.headers.get('Access-Control-Allow-Headers')}")
    tests.append(("CORS Headers", r.headers.get('Access-Control-Allow-Origin') == 'http://localhost:3001'))
except Exception as e:
    print(f"   ERROR: {e}")
    tests.append(("CORS Headers", False))

# Test 3: Login Endpoint (POST)
print("\n[3] Testing Login Endpoint...")
try:
    r = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": "admin@maidar.io", "password": "Welldone1@"},
        headers={"Origin": "http://localhost:3001"},
        timeout=5
    )
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"   Token received: {data.get('access_token', 'N/A')[:50]}...")
        print(f"   User: {data.get('user', {}).get('email')}")
        tests.append(("Login Endpoint", True))
    else:
        print(f"   Error: {r.text}")
        tests.append(("Login Endpoint", False))
except Exception as e:
    print(f"   ERROR: {e}")
    tests.append(("Login Endpoint", False))

# Test 4: Frontend Accessibility
print("\n[4] Testing Frontend Accessibility...")
try:
    r = requests.get(FRONTEND, timeout=5)
    print(f"   Status: {r.status_code}")
    tests.append(("Frontend Accessible", r.status_code == 200))
except Exception as e:
    print(f"   ERROR: {e}")
    tests.append(("Frontend Accessible", False))

# Test 5: Check what API URL is in frontend HTML
print("\n[5] Checking Frontend API Configuration...")
try:
    r = requests.get(FRONTEND, timeout=5)
    html = r.text
    if 'localhost:8002' in html:
        print(f"   Found 'localhost:8002' in HTML")
        tests.append(("API URL in Frontend", True))
    else:
        print(f"   WARNING: 'localhost:8002' NOT found in HTML")
        if 'localhost:8000' in html:
            print(f"   Found 'localhost:8000' instead (WRONG!)")
        tests.append(("API URL in Frontend", False))
except Exception as e:
    print(f"   ERROR: {e}")
    tests.append(("API URL in Frontend", False))

# Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
passed = sum(1 for _, result in tests if result)
total = len(tests)
print(f"\nTests Passed: {passed}/{total}")
print()
for test_name, result in tests:
    status = "[PASS]" if result else "[FAIL]"
    print(f"  {status} {test_name}")

if passed == total:
    print("\n[SUCCESS] All tests passed! Backend is working correctly.")
    print("\nIf you're still seeing network errors in the browser:")
    print("1. Open browser DevTools (F12)")
    print("2. Go to Console tab")
    print("3. Try to login")
    print("4. Look for red error messages")
    print("5. Check the Network tab for failed requests")
else:
    print("\n[ERROR] Some tests failed. Check the output above.")

print("\n" + "="*70)
