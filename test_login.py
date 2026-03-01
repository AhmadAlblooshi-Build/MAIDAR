#!/usr/bin/env python3
"""Test login functionality."""

import requests
import json

BACKEND_URL = "http://localhost:8002"

# Test both accounts
accounts = [
    {
        "email": "admin@maidar.io",
        "password": "Welldone1@",
        "name": "Super Admin"
    },
    {
        "email": "admin@demo.com",
        "password": "Test1234",
        "name": "Tenant Admin"
    }
]

print("Testing login for both accounts...\n")
print("=" * 60)

for account in accounts:
    print(f"\nTesting: {account['name']}")
    print(f"Email: {account['email']}")
    print(f"Password: {account['password']}")
    print("-" * 60)

    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/auth/login",
            json={
                "email": account["email"],
                "password": account["password"]
            },
            timeout=10
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("[SUCCESS] Login successful!")
            print(f"Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"User: {data.get('user', {})}")
        else:
            print(f"[ERROR] Login failed!")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"[ERROR] Exception: {e}")

    print("=" * 60)

# Test health endpoint
print("\nTesting backend health...")
try:
    response = requests.get(f"{BACKEND_URL}/health", timeout=5)
    print(f"Health Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Health check failed: {e}")
