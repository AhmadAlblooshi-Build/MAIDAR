#!/usr/bin/env python3
"""Create a test user account for MAIDAR platform."""

import requests
import json

# API endpoint
BACKEND_URL = "http://localhost:8002"
REGISTER_URL = f"{BACKEND_URL}/api/v1/auth/register"

# Test user data
user_data = {
    "email": "test@test.com",
    "password": "Test1234",
    "full_name": "Test User",
    "organization_name": "Test Org"
}

print("Creating test user account...")
print(f"Email: {user_data['email']}")
print(f"Password: {user_data['password']}")
print()

try:
    response = requests.post(REGISTER_URL, json=user_data, timeout=10)

    print(f"Status Code: {response.status_code}")
    print()

    if response.status_code == 201:
        print("[SUCCESS] Account created successfully!")
        print()
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        print()
        print("=" * 60)
        print("LOGIN CREDENTIALS:")
        print("=" * 60)
        print(f"Email:    {user_data['email']}")
        print(f"Password: {user_data['password']}")
        print("=" * 60)
        print()
        print("You can now login at: http://localhost:3001")
    else:
        print("[ERROR] Failed to create account.")
        print()
        print("Response:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)

except Exception as e:
    print(f"[ERROR] {e}")
